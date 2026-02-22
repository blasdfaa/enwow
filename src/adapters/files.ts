import type { LoaderOptions } from '../loader'
import type { ParseOptions } from '../parser'
import { EnvLoader } from '../loader'
import { EnvParser } from '../parser'
import { defineSourceAdapter } from './define'

/**
 * Options for the files source adapter
 */
export type FilesAdapterOptions = {
  directory: URL | string
} & LoaderOptions & ParseOptions

/**
 * Create an adapter that loads environment variables from .env files
 *
 * This wraps the built-in EnvLoader and EnvParser into the adapter interface.
 *
 * @example
 * ```ts
 * import { Env } from 'enwow'
 * import { fromFiles, fromProcessEnv } from 'enwow/adapters'
 *
 * const env = await Env.create(schema, {
 *   sources: [
 *     fromFiles({ directory: new URL('./', import.meta.url) }),
 *     fromProcessEnv(),
 *   ],
 * })
 * ```
 */
export const fromFiles = defineSourceAdapter<FilesAdapterOptions>((opts) => {
  return {
    name: 'files',
    async load() {
      const loader = new EnvLoader(opts.directory, {
        nodeEnv: opts.nodeEnv,
        files: opts.files,
      })
      const files = await loader.load()

      let envValues: Record<string, string> = {}

      for (const file of files.reverse()) {
        const parser = new EnvParser(file.contents, {
          ignoreProcessEnv: opts.ignoreProcessEnv,
          envSource: opts.envSource,
        })
        envValues = { ...envValues, ...parser.parse() }
      }

      return envValues
    },
  }
})
