import { defineSourceAdapter } from './define'

/**
 * Options for the object source adapter
 */
export interface ObjectAdapterOptions {
  env: Record<string, string | undefined>
}

/**
 * Create an adapter that reads from a static object
 *
 * Useful for testing and providing fallback/default values.
 *
 * @example
 * ```ts
 * import { fromObject } from 'enwow/adapters'
 *
 * // In tests
 * const env = await Env.create(schema, {
 *   sources: [fromObject({ env: { PORT: '4000', HOST: 'localhost' } })],
 * })
 * ```
 */
export const fromObject = defineSourceAdapter<ObjectAdapterOptions>((opts) => {
  return {
    name: 'object',
    load() {
      return { ...opts.env }
    },
  }
})
