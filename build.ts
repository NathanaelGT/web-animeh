import Bun, { $ } from 'bun'
import path from 'path'
import fs from 'fs/promises'
import zlib from 'zlib'
import { promisify } from 'util'
import * as esbuild from 'esbuild'
import { formatNs } from 'src/server/utils/time'
import { formatBytes } from 'src/shared/utils/byte'

process.on('uncaughtException', handleError)
process.on('unhandledRejection', handleError)

const maxWidth = 90

if (process.stdout.clearLine !== undefined) {
  process.stdout.write('\x1b[1A\x1b[0G')
  process.stdout.clearLine(0)
}

log('', `\x1b[34m\x1b[7mINFO\x1b[0m\x1b[34m\x1b[0m Creating an optimized production build\x1b[0m`)

await $`rm -rf ./dist && mkdir ./dist`.quiet()

let appVersion = ''

let resolveBuildHash: (value: string) => void
const buildHashPromise = new Promise<string>(resolve => {
  resolveBuildHash = resolve
})

let resolveServerBuildHash: (value: string) => void
const serverBuildHashPromise = new Promise<string>(resolve => {
  resolveServerBuildHash = resolve
}).then(result => {
  clientBuildHashPromise.then(clientResult => {
    resolveBuildHash(hash(result + clientResult))
  })

  return result
})

let resolveClientBuildHash: (value: string) => void
const clientBuildHashPromise = new Promise<string>(resolve => {
  resolveClientBuildHash = resolve
}).then(result => {
  serverBuildHashPromise.then(serverResult => {
    resolveBuildHash(hash(result + serverResult))
  })

  return result
})

const buildStartNs = Bun.nanoseconds()

const copyDbFilesPromise = getFiles('./drizzle').then(async filePaths => {
  const promises = filePaths
    .map(filePath => {
      if (filePath.startsWith('meta') && filePath.endsWith('_snapshot.json')) {
        return
      }

      return fs
        .cp(path.join('./drizzle', filePath), path.join('./dist/db', filePath), {
          recursive: true,
        })
        .then(() => 'dist/db/' + filePath)
    })
    .filter(promise => promise !== undefined)

  return Promise.all(promises)
})

await Promise.all([
  $`NO_COLOR=1 bunx --bun vite build --outDir ./dist/public | grep kB`
    .text()
    .then(async message => {
      const promises: Promise<void>[] = []
      let jsOriginalPath: string
      let cssOriginalPath: string

      let indexHtml = (await Bun.file('./dist/public/index.html').text())
        .replaceAll(' />', '>')
        .split('\n')
        .map(line => line.trim())
        .join('')
        .replace(
          /<script type="module" crossorigin src="(.*?)"><\/script>/,
          (_, jsRelPath: string) => {
            jsOriginalPath = jsRelPath
            const identifier = '<: JS :>'

            promises.push(
              (async () => {
                const jsPath = path.join('./dist/public', jsRelPath)

                const js = (await Bun.file(jsPath).text()).trim()

                indexHtml = indexHtml.split(identifier).join(`<script type="module">${js}</script>`)

                void fs.rm(jsPath)
              })(),
            )

            return identifier
          },
        )
        .replace(/<link rel="stylesheet" crossorigin href="(.*?)">/, (_, cssRelPath: string) => {
          cssOriginalPath = cssRelPath
          const identifier = '<: CSS :>'

          promises.push(
            (async () => {
              const cssPath = path.join('./dist/public', cssRelPath)

              const css = (await Bun.file(cssPath).text()).trim()

              indexHtml = indexHtml.split(identifier).join(`<style>${css}</style>`)

              void fs.rm(cssPath)
            })(),
          )

          return identifier
        })

      await Promise.all(promises)

      const removeAssetDirPromise = getFiles('./dist/public/assets').then(async files => {
        if (files.length === 0) {
          await fs.rmdir('./dist/public/assets')
        }
      })

      resolveClientBuildHash(hash(indexHtml))

      const compressed = await promisify(zlib.gzip)(
        indexHtml.replace('$INJECT_VERSION$', await buildHashPromise),
      )

      await Promise.all([
        Bun.write('./dist/public/index.html', compressed.buffer),
        removeAssetDirPromise,
      ])

      logBuildInfo(
        'client',
        message
          .split('\n')
          .map((line): File | null => {
            line = line.trim()

            if (line === '') {
              return null
            }

            const match = line.match(
              /([a-zA-Z0-9\-_./]+) {2,}([a-zA-Z0-9. ]+) │ gzip: ([a-zA-Z0-9. ]+)/,
            )
            if (match === null) {
              return null
            }

            const [, filePath, size] = match as [string, string, string, gzip: string]

            if (filePath === 'dist/public/index.html') {
              return {
                path: filePath,
                size: formatBytes(indexHtml.length),
                br: formatBytes(compressed.length),
              }
            } else if (
              ['dist/public' + jsOriginalPath, 'dist/public' + cssOriginalPath].includes(filePath)
            ) {
              return null
            }

            return {
              path: filePath,
              size: size.toUpperCase(),
            }
          })
          .filter(file => file !== null),
      )
    }),

  // $`bun build ./src/server/index.ts --define import.meta.env.PROD=true --outdir ./dist --target bun --minify | grep KB`
  Bun.build({
    entrypoints: ['./src/server/index.ts'],
    define: {
      'import.meta.env.PROD': 'true',
    },
    target: 'bun',
    minify: true,
  })
    .then(({ outputs }) => outputs[0]!.text())
    .then(async code => {
      const result = await esbuild.build({
        bundle: true,
        minify: true,
        format: 'esm',
        platform: 'node',
        external: ['bun:sqlite'],
        allowOverwrite: true,
        legalComments: 'none',
        entryPoints: ['virtual-entry'],
        write: false,
        plugins: [
          {
            name: 'in-memory',
            setup(build) {
              // Resolve the virtual entry path
              build.onResolve({ filter: /^virtual-entry$/ }, () => ({
                path: 'virtual-entry',
                namespace: 'mem',
              }))

              // Provide the code from memory
              build.onLoad({ filter: /.*/, namespace: 'mem' }, () => ({
                contents: code,
                loader: 'js',
              }))
            },
          },
        ],
      })

      return result.outputFiles[0]!.text.trim().replace(/\r?\n/g, '\\n').slice(0, -1)
    })
    .then(async minified => {
      // const result = '// @bun\n' + minified

      const serverFiles: File[] = [{ path: 'dist/index.js', size: formatBytes(minified.length) }]

      for (const file of await copyDbFilesPromise) {
        serverFiles.push({
          path: file,
          size: formatBytes(Bun.file(file).size),
        })
      }

      logBuildInfo('server', serverFiles)

      resolveServerBuildHash(hash(minified))

      return [minified, await buildHashPromise] as const
    })
    .then(([minified, buildHash]) => {
      return Bun.build({
        entrypoints: ['/index.ts'],
        files: {
          '/index.ts': minified.replace('$INJECT_VERSION$', buildHash),
        },
        outdir: './dist',
        minify: {
          whitespace: true,
        },
        target: 'bun',
      })
    })
    .then(() => $`bun ./dist -v`.text())
    .then(version => {
      appVersion = version.trim()
    }),
])

type File = {
  path: string
  size: string
  br?: string
}

function log(...messages: string[]) {
  process.stdout.write(messages.join('\n') + '\n')
}

function logBuildInfo(level: 'client' | 'server', files: File[]) {
  const elapsedNs = Bun.nanoseconds() - buildStartNs

  const messages = ['']

  for (const file of files) {
    const sizeText = file.br ? ` raw: ${file.size} ... ${file.br}` : ' ' + file.size
    const dots = fill(1, file.path, sizeText)

    const fileName = path.basename(file.path)
    const fileDir = file.path.slice(0, -fileName.length)

    messages.push(`\x1b[90m${fileDir}\x1b[37m${fileName} \x1b[90m${dots}${sizeText}`)
  }

  messages.push(
    `\x1b[90m${level}: \x1b[37mBuild completed \x1b[90min \x1b[37m${formatNs(elapsedNs)}\x1b[0m`,
  )

  log(...messages)
}

function fill(minus: string | number = 0, ...args: string[]) {
  if (typeof minus === 'string') {
    minus = minus.length
  }

  for (const arg of args) {
    minus += arg.length
  }

  const columns = process.stdout.columns ? Math.min(process.stdout.columns, maxWidth) : 30

  return '.'.repeat(Math.max(columns - minus, 2))
}

async function handleError(e: any) {
  const message =
    'stderr' in e
      ? String(e.stderr)
      : e instanceof Error
        ? e.message
        : typeof e === 'string' && e
          ? e
          : 'An error occurred'

  log(`\n\x1b[31m\x1b[7mERROR\x1b[0m\x1b[31m\x1b[0m ${message}\x1b[0m\n`)

  console.error(e)

  process.exit(1)
}

function getFiles(fromDirectory: string) {
  return Array.fromAsync(new Bun.Glob('**').scan(fromDirectory))
}

function hash(content: string) {
  return (
    new Bun.CryptoHasher('sha256')
      .update(content)
      .digest('base64')
      // URL-safe
      .replaceAll('+', '_')
      .replaceAll('=', '.')
      .replaceAll('/', '*')
  )
}

log(
  `\n${appVersion}\n`,
  '\x1b[32m\x1b[7mSUCCESS\x1b[0m\x1b[32m\x1b[0m ' +
    `Optimized production build created in [\x1b[1m${formatNs(Bun.nanoseconds())}\x1b[0m]\n`,
)

if (Bun.file('./build.after.ts').size) {
  // @ts-ignore
  await import('./build.after.ts')
}

process.exit(0)
