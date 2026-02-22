import type { EnvSourceAdapter } from '../types'

/**
 * Factory function type for creating source adapters with options
 */
export type SourceAdapterFactory<OptionsT> = (opts: OptionsT) => EnvSourceAdapter

/**
 * Define a custom source adapter factory with type safety
 *
 * This is an identity function that provides type inference for adapter factories.
 * It follows the same pattern as `defineConfig` / `defineDriver` from unstorage.
 *
 * @param factory - Function that takes options and returns an adapter definition
 *
 * @example
 * ```ts
 * import { defineSourceAdapter } from 'enwow/adapters'
 *
 * const vault = defineSourceAdapter<{ token: string; url: string }>((opts) => {
 *   return {
 *     name: 'vault',
 *     async load() {
 *       const response = await fetch(opts.url, {
 *         headers: { 'X-Vault-Token': opts.token },
 *       })
 *       const { data } = await response.json()
 *       return data.data
 *     },
 *   }
 * })
 *
 * // Usage:
 * const env = await Env.create(schema, {
 *   sources: [vault({ token: 'my-token', url: 'https://vault.example.com' })],
 * })
 * ```
 */
export function defineSourceAdapter<OptionsT = any>(
  factory: SourceAdapterFactory<OptionsT>,
): SourceAdapterFactory<OptionsT> {
  return factory
}

/**
 * Resolve an array of adapters into a merged environment object.
 * Sources are merged left-to-right: later sources override earlier ones.
 */
export async function resolveAdapters(adapters: EnvSourceAdapter[]): Promise<Record<string, string | undefined>> {
  let result: Record<string, string | undefined> = {}

  for (const adapter of adapters) {
    const values = await adapter.load()
    result = { ...result, ...values }
  }

  return result
}
