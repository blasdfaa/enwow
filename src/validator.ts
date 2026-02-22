import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { EnvSchema, InferEnv } from './types'
import { EnvValidationError } from './errors'

/**
 * Validator for environment variables using Standard Schema
 *
 * @example
 * ```ts
 * import { EnvValidator } from 'enwow'
 * import { z } from 'zod'
 *
 * const validator = new EnvValidator({
 *   PORT: z.string().transform(Number),
 *   HOST: z.string().default('localhost'),
 * })
 *
 * const result = validator.validate(process.env)
 * // result is typed as { PORT: number, HOST: string }
 * ```
 */
export class EnvValidator<T extends EnvSchema> {
  private readonly schema: T

  constructor(schema: T) {
    this.schema = schema
  }

  /**
   * Validate environment variables against the schema
   * @param env - The environment variables to validate
   * @returns The validated and transformed environment variables
   * @throws EnvValidationError if validation fails
   */
  validate(env: Record<string, string | undefined>): InferEnv<T> {
    const result: Record<string, unknown> = {}
    const issues: Array<{ path: string, message: string }> = []

    for (const [key, schema] of Object.entries(this.schema)) {
      const value = env[key]
      const validationResult = this.validateValue(schema, value, key)

      if (validationResult.success) {
        result[key] = validationResult.value
      }
      else {
        issues.push(...validationResult.issues)
      }
    }

    if (issues.length > 0) {
      throw new EnvValidationError(issues)
    }

    return result as InferEnv<T>
  }

  /**
   * Validate a single value against its schema
   */
  private validateValue(
    schema: StandardSchemaV1,
    value: unknown,
    key: string,
  ): { success: true, value: unknown } | { success: false, issues: Array<{ path: string, message: string }> } {
    const result = schema['~standard'].validate(value)

    // Check if it's a promise (async schema)
    if (result instanceof Promise) {
      throw new TypeError(
        `Async validation is not supported. The schema for "${key}" appears to be async. `
        + 'Please use synchronous schemas only.',
      )
    }

    if (result.issues === undefined) {
      return { success: true, value: result.value }
    }

    const issues = result.issues.map(issue => ({
      path: key,
      message: issue.message,
    }))

    return { success: false, issues }
  }
}

/**
 * Create a validator for environment variables
 * @param schema - The schema definition
 * @returns A validator instance
 */
export function createValidator<T extends EnvSchema>(schema: T): EnvValidator<T> {
  return new EnvValidator(schema)
}
