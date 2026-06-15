import { defineSourceAdapter } from './define'

/**
 * Options for the import.meta source adapter
 */
export interface ImportMetaAdapterOptions {
  /**
   * Only include keys starting with this prefix. The prefix is stripped from
   * the resulting keys (e.g. `VITE_PORT` becomes `PORT`).
   */
  prefix?: string

  /**
   * The `import.meta.env` object to read from.
   *
   * Defaults to `import.meta.env` when the bundler injects it (Vite, esbuild).
   * Pass it explicitly for testing or when the bundler does not expose it.
   */
  env?: Record<string, unknown>
}

/**
 * Create an adapter that reads build-time variables from `import.meta.env`
 *
 * This is the browser-friendly source: bundlers such as Vite and esbuild
 * replace `import.meta.env` with the public env at build time. Use `prefix`
 * to scope to your public variables and strip the prefix.
 *
 * @example
 * ```ts
 * import { fromImportMeta } from 'enwow/adapters'
 *
 * // import.meta.env.VITE_PORT -> PORT
 * const env = await Env.create(schema, {
 *   sources: [fromImportMeta({ prefix: 'VITE_' })],
 * })
 * ```
 */
export const fromImportMeta = defineSourceAdapter<ImportMetaAdapterOptions | void>((opts) => {
  const options = opts ?? {}

  return {
    name: 'import-meta',
    load() {
      const source = options.env ?? readImportMetaEnv()
      const { prefix } = options
      const result: Record<string, string | undefined> = {}

      for (const [key, value] of Object.entries(source)) {
        if (prefix && !key.startsWith(prefix)) {
          continue
        }
        const outKey = prefix ? key.slice(prefix.length) : key
        result[outKey] = value == null ? undefined : String(value)
      }

      return result
    },
  }
})

/**
 * Read `import.meta.env` defensively.
 *
 * Bundlers inject it; in a bare Node ESM context it is `undefined`, so we fall
 * back to an empty object instead of throwing.
 */
function readImportMetaEnv(): Record<string, unknown> {
  const env = (import.meta as { env?: Record<string, unknown> }).env
  return env != null && typeof env === 'object' ? env : {}
}
