import type { EnvCreateOptions, EnvSourceAdapter } from '../types'
import { fromFiles } from './files'
import { fromObject } from './object'
import { fromProcessEnv } from './process-env'

/**
 * Build the default list of source adapters from the legacy `Env.create`
 * options.
 *
 * This is the internal seam that lets `Env.create` always go through a single
 * adapter pipeline (`resolveAdapters`) instead of maintaining a separate
 * hand-rolled load-and-merge branch. The mapping reproduces the historical
 * behaviour exactly:
 *
 * - a `path` becomes a {@link fromFiles} adapter (lowest priority);
 * - the highest-priority tier is `process.env` via {@link fromProcessEnv},
 *   unless `envSource` replaces it ({@link fromObject}) or `ignoreProcessEnv`
 *   drops it entirely.
 *
 * Adapters are returned in priority order (lowest first); `resolveAdapters`
 * merges them left-to-right so later sources win.
 */
export function buildDefaultSources(
  path: URL | undefined,
  opts: EnvCreateOptions,
): EnvSourceAdapter[] {
  const sources: EnvSourceAdapter[] = []

  if (path) {
    sources.push(fromFiles({
      directory: path,
      nodeEnv: opts.nodeEnv,
      ignoreProcessEnv: opts.ignoreProcessEnv,
      envSource: opts.envSource,
    }))
  }

  if (!opts.ignoreProcessEnv) {
    sources.push(opts.envSource
      ? fromObject({ env: opts.envSource })
      : fromProcessEnv())
  }

  return sources
}
