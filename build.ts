import Bun, { $ } from 'bun'
import path from 'path'
import fs from 'fs/promises'
import zlib from 'zlib'
import { promisify } from 'util'
import { formatNs } from 'src/server/utils/time'
import { formatBytes } from 'src/shared/utils/byte'

process.on('uncaughtException', handleError)
process.on('unhandledRejection', handleError)

const maxWidth = 90

process.stdout.write('\x1b[1A\x1b[0G')
process.stdout.clearLine(0)

log('', `\x1b[34m\x1b[7mINFO\x1b[0m\x1b[34m\x1b[0m Creating an optimized production build\x1b[0m`)

await $`rm -rf ./dist && mkdir ./dist`.quiet()

let appVersion = ''
let resolveBuildNumber: (value: string) => void
const buildNumberPromise = new Promise<string>(resolve => {
  resolveBuildNumber = resolve
})

const buildStartNs = Bun.nanoseconds()

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

                const js = (await Bun.file(jsPath).text())
                  .trim()
                  .replace('$INJECT_VERSION$', await buildNumberPromise)

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

      const compress = promisify(zlib.brotliCompress)

      await Promise.all(promises)

      const removeAssetDirPromise = getFiles('./dist/public/assets').then(async files => {
        if (files.length === 0) {
          await fs.rmdir('./dist/public/assets')
        }
      })

      const buffer = Buffer.from(indexHtml, 'utf-8')
      const compressed = await compress(buffer)

      await Promise.all([Bun.write('./dist/public/index.html', compressed), removeAssetDirPromise])

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

  $`bun build ./src/server/index.ts --define import.meta.env.PROD=true --outdir ./dist --target bun --minify | grep KB`
    .text()
    .then(async message => {
      return [
        message,
        await $`./node_modules/.bin/esbuild --bundle --minify --format=esm --platform=node --external:bun:sqlite --allow-overwrite --legal-comments=none ./dist/index.js`.text(),
      ] as const
    })
    .then(async ([message, minified]) => {
      const result = '// @bun\n' + minified.trim().replace(/\r?\n/g, '\\n').slice(0, -1)

      await Bun.write('./dist/index.js', result)

      logBuildInfo(
        'server',
        message
          .replace(/ .\/index\.js {2}[0-9.]+ .B/, ` dist/index.js  ${formatBytes(result.length)}`)
          .split('\n')
          .map((line): File | null => {
            const trimmedLine = line.trim()

            if (trimmedLine === '') {
              return null
            }

            const match = trimmedLine.match(/([a-zA-Z0-9\-_./]+) {2,}([a-zA-Z0-9. ]+)/)
            if (match === null) {
              return null
            }

            const [, path, size] = match as [string, string, string]

            return {
              path,
              size,
            }
          })
          .filter(file => file !== null),
      )

      await $`bun ./dist -v`.text().then(version => {
        appVersion = version.trim()

        resolveBuildNumber(
          appVersion.slice(appVersion.indexOf('build ') + 'build '.length, appVersion.indexOf(')')),
        )
      })
    }),

  getFiles('./drizzle').then(async filePaths => {
    const promises = filePaths
      .map(filePath => {
        if (filePath.startsWith('meta') && filePath.endsWith('_snapshot.json')) {
          return
        }

        return fs.cp(path.join('./drizzle', filePath), path.join('./dist/db', filePath), {
          recursive: true,
        })
      })
      .filter(promise => promise !== undefined)

    return Promise.all(promises)
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
    const compressedText = file.br ? ` br: ${file.br.padStart(9, ' ')} ...` : ''
    const sizeText = (' ' + file.size).padStart(10, '.')
    const dots = fill(1, file.path, sizeText, compressedText)

    const fileName = path.basename(file.path)
    const fileDir = file.path.slice(0, -fileName.length)

    messages.push(
      `\x1b[90m${fileDir}\x1b[37m${fileName} \x1b[90m${dots}${compressedText}${sizeText}`,
    )
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

log(
  `\n${appVersion}\n`,
  '\x1b[32m\x1b[7mSUCCESS\x1b[0m\x1b[32m\x1b[0m ' +
    `Optimized production build created in [\x1b[1m${formatNs(Bun.nanoseconds())}\x1b[0m]\n`,
)

process.exit(0)
