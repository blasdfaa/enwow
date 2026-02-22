import type { EnvCreateOptions, EnvSchema, InferEnv } from './types'
import { env } from 'std-env'
import { resolveAdapters } from './adapters/define'
import { EnvLoader } from './loader'
import { EnvParser } from './parser'
import { EnvValidator } from './validator'

/**
 * Env class for managing environment variables
 *
 * Provides type-safe access to environment variables after validation
 *
 * @example
 * ```ts
 * import { Env } from 'enwow'
 * import { z } from 'zod'
 *
 * // Create with path to load .env files
 * const env = await Env.create(new URL('./', import.meta.url), {
 *   PORT: z.string().transform(Number).default('3000'),
 *   HOST: z.string().default('localhost'),
 * })
 *
 * // Or create without path (only process.env)
 * const env = await Env.create({
 *   PORT: z.string().transform(Number),
 * })
 *
 * // Type-safe access
 * env.get('PORT') // number
 * env.get('HOST') // string
 * ```
 */
export class Env<T extends EnvSchema> {
  private readonly values: InferEnv<T>

  private constructor(values: InferEnv<T>) {
    this.values = values
  }

  /**
   * Create a new Env instance
   *
   * @param pathOrSchema - Either a URL path to load .env files from, or a schema object
   * @param schema - The schema definition (required if pathOrSchema is a URL)
   * @param options - Options for loading and validation
   * @returns A new Env instance with validated values
   *
   * @example
   * ```ts
   * // With .env file loading
   * const env = await Env.create(new URL('./', import.meta.url), {
   *   PORT: z.string().transform(Number),
   * })
   *
   * // Without .env file loading
   * const env = await Env.create({
   *   PORT: z.string().transform(Number),
   * })
   * ```
   */
  static async create<T extends EnvSchema>(
    schema: T,
    options?: EnvCreateOptions,
  ): Promise<Env<T>>
  static async create<T extends EnvSchema>(
    path: URL,
    schema: T,
    options?: EnvCreateOptions,
  ): Promise<Env<T>>
  static async create<T extends EnvSchema>(
    pathOrSchema: URL | T,
    schemaOrOptions?: T | EnvCreateOptions,
    options?: EnvCreateOptions,
  ): Promise<Env<T>> {
    let path: URL | undefined
    let schema: T
    let opts: EnvCreateOptions = {}

    if (pathOrSchema instanceof URL) {
      path = pathOrSchema
      schema = schemaOrOptions as T
      opts = options ?? {}
    }
    else {
      schema = pathOrSchema
      opts = (schemaOrOptions as EnvCreateOptions) ?? {}
    }

    if (path && opts.sources) {
      throw new TypeError(
        'Cannot use \'sources\' option together with path argument. '
        + 'Use fromFiles() adapter instead.',
      )
    }

    let envValues: Record<string, string | undefined>

    if (opts.sources) {
      envValues = await resolveAdapters(opts.sources)
    }
    else {
      envValues = {}

      if (path) {
        const loader = new EnvLoader(path, { nodeEnv: opts.nodeEnv })
        const files = await loader.load()

        // Parse files in reverse order (lowest priority first)
        // This ensures higher priority files override lower priority ones
        for (const file of files.reverse()) {
          const parser = new EnvParser(file.contents, {
            ignoreProcessEnv: opts.ignoreProcessEnv,
            envSource: opts.envSource,
          })
          const parsed = parser.parse()
          envValues = { ...envValues, ...parsed }
        }
      }

      // Merge with process.env (highest priority)
      if (!opts.ignoreProcessEnv) {
        const processEnv = opts.envSource ?? getProcessEnv()
        envValues = { ...envValues, ...processEnv }
      }
    }

    const validator = new EnvValidator(schema)
    const validated = validator.validate(envValues)

    return new Env(validated)
  }

  /**
   * Get a validated environment variable value
   * @param key - The variable name
   * @returns The validated value
   */
  get<K extends keyof T>(key: K): InferEnv<T>[K] {
    return this.values[key as keyof InferEnv<T>] as InferEnv<T>[K]
  }

  /**
   * Get all validated environment variables as an object
   */
  all(): InferEnv<T> {
    return { ...this.values }
  }

  /**
   * Check if a variable is defined
   */
  has(key: keyof T): boolean {
    return this.values[key as keyof InferEnv<T>] !== undefined
  }
}

/**
 * Get the current process environment in a cross-platform way
 */
function getProcessEnv(): Record<string, string | undefined> {
  return env
}
