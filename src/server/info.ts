import os from 'os'
import fs from 'fs'
import path from 'path'
import { mode } from '~s/env'
import { format } from '~/shared/utils/date'

export const version = once('version', () => {
  const packageJsonPath = path.join(import.meta.dir, '../../package.json')
  const packageJsonRaw = fs.readFileSync(packageJsonPath, 'utf-8')
  const version = packageJsonRaw.match(/"version": *"(.*)"/)?.[1]

  return version || 'unknown'
})

export const buildNumber = once('buildNumber', () => {
  try {
    const gitPath = path.join(import.meta.dir, '../../.git/')

    const rev = fs.readFileSync(gitPath + 'HEAD', 'utf-8')
    if (rev.indexOf(':') === -1) {
      return rev.substring(0, 7)
    }

    const refPath = gitPath + rev.substring(5).trim()

    return fs.readFileSync(refPath, 'utf-8').substring(0, 7)
  } catch {
    return 'unknown'
  }
})

export const build = once('build', () => {
  const currentMode = mode()

  if (currentMode !== 'production') {
    return currentMode
  }

  return `build ${buildNumber()}`
})

export const compiled = once('compiled', () => {
  const compiledAt = format(new Date())
  const compiledBy = gitUsername() || os.userInfo().username

  return `Compiled at ${compiledAt} by ${compiledBy}`
})

export const serverType = once('serverType', () => {
  return (
    {
      development: 'Dev Server',
      test: 'Test Server',
      production: 'Server',
    } satisfies {
      [Key in ReturnType<typeof mode>]: string
    }
  )[mode()]
})

function gitUsername() {
  try {
    const { stdout } = Bun.spawnSync({
      cmd: ['git', 'config', '--global', 'user.name'],
      stdout: 'pipe',
    })

    return stdout.toString().trim()
  } catch {
    //
  }
}

const globalForCache = globalThis as unknown as {
  cache: Map<string, any>
}

globalForCache.cache ??= new Map<string, any>()

// selama dev, macro engga dicache sama bun, jadi ini untuk mempercepat dev server
function once<T>(identifier: string, callback: () => T): () => T {
  return () => {
    if (globalForCache.cache.has(identifier)) {
      return globalForCache.cache.get(identifier) as T
    }

    const result = callback()

    globalForCache.cache.set(identifier, result)

    return result
  }
}
