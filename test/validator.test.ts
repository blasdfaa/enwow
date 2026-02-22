import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { EnvValidationError, EnvValidator, createValidator } from '../src'

describe('EnvValidator', () => {
  describe('basic validation', () => {
    it('should validate simple string schema', () => {
      const validator = new EnvValidator({
        HOST: z.string(),
      })

      const result = validator.validate({ HOST: 'localhost' })

      expect(result).toEqual({ HOST: 'localhost' })
    })

    it('should validate number transformation', () => {
      const validator = new EnvValidator({
        PORT: z.string().transform(Number),
      })

      const result = validator.validate({ PORT: '3000' })

      expect(result).toEqual({ PORT: 3000 })
    })

    it('should validate with default values', () => {
      const validator = new EnvValidator({
        HOST: z.string().default('localhost'),
      })

      const result = validator.validate({})

      expect(result).toEqual({ HOST: 'localhost' })
    })

    it('should validate optional values', () => {
      const validator = new EnvValidator({
        DEBUG: z.string().optional(),
      })

      const result = validator.validate({})

      expect(result).toEqual({ DEBUG: undefined })
    })
  })

  describe('complex schemas', () => {
    it('should validate enum values', () => {
      const validator = new EnvValidator({
        NODE_ENV: z.enum(['development', 'production', 'test']),
      })

      expect(validator.validate({ NODE_ENV: 'development' })).toEqual({ NODE_ENV: 'development' })
      expect(validator.validate({ NODE_ENV: 'production' })).toEqual({ NODE_ENV: 'production' })

      expect(() => validator.validate({ NODE_ENV: 'invalid' })).toThrow(EnvValidationError)
    })

    it('should validate URL format', () => {
      const validator = new EnvValidator({
        DATABASE_URL: z.string().url(),
      })

      expect(validator.validate({ DATABASE_URL: 'https://example.com' })).toEqual({
        DATABASE_URL: 'https://example.com',
      })

      expect(() => validator.validate({ DATABASE_URL: 'not-a-url' })).toThrow(EnvValidationError)
    })

    it('should validate with refinements', () => {
      const validator = new EnvValidator({
        PORT: z.string().transform(Number).refine(n => n > 0 && n < 65536, {
          message: 'Port must be between 0 and 65536',
        }),
      })

      expect(validator.validate({ PORT: '3000' })).toEqual({ PORT: 3000 })
      expect(() => validator.validate({ PORT: '70000' })).toThrow(EnvValidationError)
    })
  })

  describe('error handling', () => {
    it('should throw EnvValidationError on failure', () => {
      const validator = new EnvValidator({
        REQUIRED: z.string(),
      })

      expect(() => validator.validate({})).toThrow(EnvValidationError)
    })

    it('should include variable name in error', () => {
      const validator = new EnvValidator({
        MISSING_VAR: z.string(),
      })

      try {
        validator.validate({})
        expect.fail('Should have thrown')
      }
      catch (error) {
        expect(error).toBeInstanceOf(EnvValidationError)
        const err = error as EnvValidationError
        expect(err.issues).toHaveLength(1)
        expect(err.issues[0].path).toBe('MISSING_VAR')
      }
    })

    it('should collect multiple errors', () => {
      const validator = new EnvValidator({
        VAR1: z.string(),
        VAR2: z.string(),
      })

      try {
        validator.validate({})
        expect.fail('Should have thrown')
      }
      catch (error) {
        expect(error).toBeInstanceOf(EnvValidationError)
        const err = error as EnvValidationError
        expect(err.issues).toHaveLength(2)
      }
    })
  })

  describe('async schema handling', () => {
    it('should throw error for async schemas', () => {
      const asyncSchema = z.string().refine(
        async () => true,
        { message: 'Async refinement' },
      )

      const validator = new EnvValidator({
        ASYNC_VAR: asyncSchema,
      })

      expect(() => validator.validate({ ASYNC_VAR: 'value' })).toThrow(
        'Async validation is not supported',
      )
    })
  })
})

describe('createValidator', () => {
  it('should be a convenience function for creating validators', () => {
    const validator = createValidator({
      PORT: z.string(),
    })

    const result = validator.validate({ PORT: '3000' })
    expect(result).toEqual({ PORT: '3000' })
  })
})
