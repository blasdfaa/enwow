import type { StandardSchemaV1 } from '@standard-schema/spec'

/**
 * Extract the output type from a Standard Schema
 */
export type SchemaOutput<T> = T extends StandardSchemaV1<infer _Input, infer Output> ? Output : never

/**
 * Extract the input type from a Standard Schema
 */
export type SchemaInput<T> = T extends StandardSchemaV1<infer Input, infer _Output> ? Input : never

/**
 * A schema that conforms to Standard Schema specification
 */
export type Schema<T = unknown> = StandardSchemaV1<T>

/**
 * Record of schemas for environment variables
 */
export type EnvSchema = Record<string, Schema>

/**
 * Infer the validated output type from a schema record
 */
export type InferEnv<T extends EnvSchema> = {
  [K in keyof T]: SchemaOutput<T[K]>
}

/**
 * Options for Env.create()
 */
export interface EnvCreateOptions {
  /**
   * Ignore existing process.env values
   * @default false
   */
  ignoreProcessEnv?: boolean

  /**
   * Override the NODE_ENV value for file loading
   * Useful for testing
   */
  nodeEnv?: string

  /**
   * Custom environment variables source
   * Useful for testing or custom sources
   */
  envSource?: Record<string, string | undefined>

  /**
   * Custom source adapters for loading environment variables.
   * Sources are merged left-to-right: later sources override earlier ones.
   *
   * Cannot be used together with the `path` argument in `Env.create(path, schema)`.
   *
   * @example
   * ```ts
   * import { fromFiles, fromProcessEnv, fromJSON } from 'enwow/adapters'
   *
   * const env = await Env.create(schema, {
   *   sources: [
   *     fromFiles({ directory: new URL('./', import.meta.url) }),
   *     fromJSON({ path: './config/env.json' }),
   *     fromProcessEnv(),
   *   ],
   * })
   * ```
   */
  sources?: EnvSourceAdapter[]
}

/**
 * Environment variable validation issue
 */
export interface EnvIssue {
  /**
   * The path to the variable (usually the variable name)
   */
  path?: string

  /**
   * The error message
   */
  message: string
}

/**
 * Result of loading .env files
 */
export interface LoadedEnvFile {
  /**
   * Path to the loaded file
   */
  path: string

  /**
   * Raw contents of the file
   */
  contents: string
}

/**
 * Parsed environment variables
 */
export type ParsedEnv = Record<string, string>

/**
 * Adapter interface for loading environment variables from any source
 *
 * Use `defineSourceAdapter` from `enwow/adapters` to create custom adapter factories.
 *
 * @example
 * ```ts
 * import { defineSourceAdapter } from 'enwow/adapters'
 *
 * const myAdapter = defineSourceAdapter<{ url: string }>((opts) => {
 *   return {
 *     name: 'my-source',
 *     async load() {
 *       const response = await fetch(opts.url)
 *       return response.json()
 *     },
 *   }
 * })
 * ```
 */
export interface EnvSourceAdapter {
  /** Adapter name (used in error messages and debugging) */
  name: string
  /** Load environment variables from this source */
  load: () => Record<string, string | undefined> | Promise<Record<string, string | undefined>>
}
