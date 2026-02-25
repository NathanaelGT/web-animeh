import fs from 'fs/promises'
import path from 'path'
import Bun, { $ } from 'bun'
import packageJson from 'package.json'
import { formatNs } from 'src/server/utils/time'
import { formatBytes } from 'src/shared/utils/byte'
import { ucFirst } from 'src/shared/utils/string.ts'

process.on('uncaughtException', handleError)
process.on('unhandledRejection', handleError)

const maxWidth = 90

if (process.stdout.clearLine !== undefined) {
  process.stdout.write('\x1b[1A\x1b[0G')
  process.stdout.clearLine(0)
}

const { info } = await import('info.ts')

const skipUglify = process.env.npm_lifecycle_script === packageJson.scripts.preview
const buildType = skipUglify ? 'preview' : 'optimized production'

log(
  '',
  `\x1b[34m\x1b[7mINFO\x1b[0m\x1b[34m\x1b[0m Creating ${skipUglify ? 'a' : 'an'} ${buildType} build\x1b[0m`,
)

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

const uglify = async (js: string, hashDefineName: string, post = (result: string) => result) => {
  if (skipUglify) {
    return js.replace(hashDefineName, '"preview-' + (await buildHashPromise) + '"')
  }

  const process = Bun.spawn(
    [
      'node_modules/uglify-js/bin/uglifyjs',
      '--toplevel',
      '-c',
      'passes=2',
      '-d',
      hashDefineName + '="' + (await buildHashPromise) + '"',
    ],
    {
      stdin: 'pipe',
      stdout: 'pipe',
    },
  )

  await process.stdin.write(js)
  await process.stdin.end()

  const result = await process.stdout.text()

  return post(result)
}

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

                void fs.rm(jsPath)

                // html ga signifikan
                // css, tailwind generate berdasarkan jsx
                // jadi yang pentingnya cuma js
                resolveClientBuildHash(hash(js))

                const result = await uglify(js, 'import.meta.env.HASH', result => {
                  const searchTerm = '</script>'
                  const replacement = '<\\/script>'
                  const lastIndex = result.lastIndexOf(searchTerm)

                  return (
                    result.slice(0, lastIndex) +
                    replacement +
                    result.slice(lastIndex + searchTerm.length)
                  )
                })

                indexHtml = indexHtml
                  .split(identifier)
                  .join(`<script type="module">${result}</script>`)
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

      const compressed = Bun.gzipSync(indexHtml, {
        library: 'libdeflate',
        level: 12,
      })

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
                comp: formatBytes(compressed.length),
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

  Bun.build({
    entrypoints: ['./src/server/index.ts', './src/server/faststart.ts'],
    define: {
      'import.meta.env.PROD': 'true',
      'Bun.env.PROD': 'true',
      ...Object.entries(info).reduce(
        (acc, [key, value]) => {
          acc[`Bun.env.${key}`] =
            typeof value === 'string'
              ? JSON.stringify(value)
              : typeof value === 'boolean'
                ? value
                  ? 'true'
                  : 'false'
                : String(value)
          return acc
        },
        {} as Record<string, string>,
      ),
    },
    target: 'bun',
    minify: true,
  })
    .then(async ({ outputs }) => {
      const outputTextPromises = outputs.map(output => output.text())

      type Script = {
        path: string
        content: string
      }

      let scripts = [] as unknown as [Script, ...Script[]]

      for (let i = 0; i < outputs.length; i++) {
        scripts.push({
          path: path.join('dist', outputs[i]!.path),
          content: await outputTextPromises[i]!,
        })
      }

      resolveServerBuildHash(hash(scripts[0].content))

      scripts = (await Promise.all(
        scripts.map(script => {
          return new Promise<Script>(async resolve => {
            resolve({
              path: script.path,
              content: await uglify(script.content, 'Bun.env.HASH'),
            })
          })
        }),
      )) as typeof scripts

      scripts[0].content = scripts[0].content
        // source:  sql`foo ${sql.raw("bar")} baz`
        // build:   P`foo ${P.raw("bar")} baz`
        // replace: P`foo bar baz`
        .replace(/(\w)`([^`]+)\${\1\.raw\((['"])((?:\\.|(?!\3).)*)\3\)}([^`]+)`/g, '$1`$2$4$5`')
        .replace('`\n			CREATE TABLE IF NOT EXISTS', '`CREATE TABLE IF NOT EXISTS')
        .replace(
          '\n				id SERIAL PRIMARY KEY,\n				hash text NOT NULL,\n				created_at numeric\n			)\n		`',
          'id SERIAL PRIMARY KEY,hash text NOT NULL,created_at numeric)`',
        )

      const writePromises = scripts.map(script => Bun.write(script.path, script.content))

      const serverFiles = scripts.map(script => ({
        path: script.path,
        size: formatBytes(script.content.length),
      }))

      for (const file of await copyDbFilesPromise) {
        serverFiles.push({
          path: file,
          size: formatBytes(Bun.file(file).size),
        })
      }

      logBuildInfo('server', serverFiles)

      return [await $`bun ./dist -v`.text(), writePromises] as const
    })
    .then(([version, promises]) => {
      appVersion = version.trim()

      return Promise.all(promises)
    }),
])

type File = {
  path: string
  size: string
  comp?: string
}

function log(...messages: string[]) {
  process.stdout.write(messages.join('\n') + '\n')
}

function logBuildInfo(level: 'client' | 'server', files: File[]) {
  const elapsedNs = Bun.nanoseconds() - buildStartNs

  const messages = ['']

  for (const file of files) {
    const sizeText = file.comp ? ` raw: ${file.size} ... ${file.comp}` : ' ' + file.size
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
  return Bun.hash.xxHash3(content).toString(36)
}

log(
  `\n${appVersion}\n`,
  [
    '\x1b[32m\x1b[7mSUCCESS\x1b[0m\x1b[32m\x1b[0m ',
    ucFirst(buildType),
    ' build created in [\x1b[1m',
    formatNs(Bun.nanoseconds()),
    '\x1b[0m]\n',
  ].join(''),
)

if (Bun.file('./build.after.ts').size) {
  // @ts-ignore
  await import('./build.after.ts')
}

process.exit(0)
