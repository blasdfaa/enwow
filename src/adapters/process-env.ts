import { defineSourceAdapter } from './define'

/**
 * Create an adapter that reads from process.env (cross-platform)
 *
 * @example
 * ```ts
 * import { fromProcessEnv } from 'enwow/adapters'
 *
 * const env = await Env.create(schema, {
 *   sources: [fromProcessEnv()],
 * })
 * ```
 */
export const fromProcessEnv = defineSourceAdapter<void>(() => {
  return {
    name: 'process-env',
    async load() {
      const { env } = await import('std-env')
      return env
    },
  }
})
