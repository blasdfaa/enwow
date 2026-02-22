import type { LoadedEnvFile } from './types'
import { basename, join } from 'pathe'
import { env, runtime } from 'std-env'

export interface LoaderOptions {
  /**
   * The NODE_ENV value to use for determining which files to load
   * Defaults to process.env.NODE_ENV
   */
  nodeEnv?: string

  /**
   * Files to load (override default file resolution)
   */
  files?: string[]
}

/**
 * Environment file loader
 *
 * Loads .env files from a directory with the following priority (highest first):
 * 1. .env.[NODE_ENV].local - Loaded when NODE_ENV is set
 * 2. .env.local - Loaded in all environments except test
 * 3. .env.[NODE_ENV] - Loaded when NODE_ENV is set
 * 4. .env - Loaded in all environments
 *
 * @example
 * ```ts
 * import { EnvLoader } from 'enwow'
 *
 * const loader = new EnvLoader(new URL('./', import.meta.url))
 * const files = await loader.load()
 *
 * for (const file of files) {
 *   console.log(file.path, file.contents)
 * }
 * ```
 */
export class EnvLoader {
  private readonly directory: string
  private readonly options: LoaderOptions

  /**
   * Create a new EnvLoader
   * @param directory - The directory to load .env files from (as URL or string path)
   * @param options - Loader options
   */
  constructor(directory: URL | string, options: LoaderOptions = {}) {
    this.directory = directory instanceof URL
      ? directory.pathname
      : directory
    this.options = options
  }

  /**
   * Load all .env files and return their contents
   * Files are returned in priority order (highest priority first)
   */
  async load(): Promise<LoadedEnvFile[]> {
    const files = await this.getFileNames()
    const results: LoadedEnvFile[] = []

    for (const fileName of files) {
      const filePath = join(this.directory, fileName)

      try {
        const contents = await this.readFile(filePath)
        if (contents !== null) {
          results.push({ path: filePath, contents })
        }
      }
      catch {
        // File doesn't exist or can't be read, skip
      }
    }

    return results
  }

  /**
   * Get the list of .env file names to load, in priority order
   */
  private async getFileNames(): Promise<string[]> {
    if (this.options.files) {
      return this.options.files.map(f => basename(f))
    }

    const nodeEnv = this.options.nodeEnv ?? await this.getNodeEnv()
    const files: string[] = []

    // 1. .env.[NODE_ENV].local (highest priority)
    if (nodeEnv) {
      files.push(`.env.${nodeEnv}.local`)
    }

    // 2. .env.local (not in test environment)
    const isTest = nodeEnv === 'test' || nodeEnv === 'testing'
    if (!isTest) {
      files.push('.env.local')
    }

    // 3. .env.[NODE_ENV]
    if (nodeEnv) {
      files.push(`.env.${nodeEnv}`)
    }

    // 4. .env (lowest priority)
    files.push('.env')

    return files
  }

  private async getNodeEnv(): Promise<string | undefined> {
    return env.NODE_ENV
  }

  /**
   * Read a file contents in a cross-platform way
   */
  private async readFile(path: string): Promise<string | null> {
    if (runtime === 'bun') {
      const file = Bun.file(path)
      const exists = await file.exists()
      if (!exists)
        return null
      return file.text()
    }

    if (runtime === 'deno') {
      try {
        return await Deno.readTextFile(path)
      }
      catch {
        return null
      }
    }

    const { readFile } = await import('node:fs/promises')
    try {
      return await readFile(path, 'utf-8')
    }
    catch {
      return null
    }
  }
}

/**
 * Convenience function to load .env files from a directory
 */
export async function loadEnv(directory: URL | string, options?: LoaderOptions): Promise<LoadedEnvFile[]> {
  const loader = new EnvLoader(directory, options)
  return loader.load()
}
