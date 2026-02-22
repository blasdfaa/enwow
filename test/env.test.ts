import { mkdir, readdir, rm, unlink, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { Env, EnvValidationError } from '../src'

describe('env', () => {
  const tempDir = join(process.cwd(), 'test-temp-env')

  beforeAll(async () => {
    await mkdir(tempDir, { recursive: true })
  })

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('env.create without path', () => {
    it('should create env from process.env', async () => {
      process.env.TEST_PORT = '3000'

      const env = await Env.create({
        TEST_PORT: z.string().transform(Number),
      })

      expect(env.get('TEST_PORT')).toBe(3000)
      delete process.env.TEST_PORT
    })

    it('should use default values', async () => {
      const env = await Env.create({
        HOST: z.string().default('localhost'),
      })

      expect(env.get('HOST')).toBe('localhost')
    })

    it('should validate and transform values', async () => {
      const env = await Env.create({
        PORT: z.string().transform(Number).default('3000'),
        DEBUG: z.string().optional(),
      })

      expect(env.get('PORT')).toBe(3000)
      expect(env.get('DEBUG')).toBeUndefined()
    })

    it('should throw on validation error', async () => {
      await expect(
        Env.create({
          REQUIRED_VAR: z.string(),
        }),
      ).rejects.toThrow(EnvValidationError)
    })
  })

  describe('env.create with path', () => {
    afterEach(async () => {
      const files = await readdir(tempDir)
      await Promise.all(files.map(f => unlink(join(tempDir, f))))
    })

    it('should load .env file', async () => {
      await writeFile(join(tempDir, '.env'), 'FROM_FILE=file_value')

      const env = await Env.create(new URL(`${tempDir}/`, import.meta.url), {
        FROM_FILE: z.string(),
      })

      expect(env.get('FROM_FILE')).toBe('file_value')
    })

    it('should prioritize process.env over .env file', async () => {
      await writeFile(join(tempDir, '.env'), 'OVERRIDE=file_value')
      process.env.OVERRIDE = 'process_value'

      const env = await Env.create(new URL(`${tempDir}/`, import.meta.url), {
        OVERRIDE: z.string(),
      })

      expect(env.get('OVERRIDE')).toBe('process_value')
      delete process.env.OVERRIDE
    })

    it('should load .env.local', async () => {
      await writeFile(join(tempDir, '.env'), 'VALUE=base')
      await writeFile(join(tempDir, '.env.local'), 'VALUE=local')

      const env = await Env.create(new URL(`${tempDir}/`, import.meta.url), {
        VALUE: z.string(),
      }, { nodeEnv: 'development' })

      expect(env.get('VALUE')).toBe('local')
    })

    it('should load .env.[NODE_ENV] files', async () => {
      await writeFile(join(tempDir, '.env'), 'VALUE=base')
      await writeFile(join(tempDir, '.env.development'), 'VALUE=development')

      const env = await Env.create(new URL(`${tempDir}/`, import.meta.url), {
        VALUE: z.string(),
      }, { nodeEnv: 'development' })

      expect(env.get('VALUE')).toBe('development')
    })

    it('should load .env.[NODE_ENV].local with highest priority', async () => {
      await writeFile(join(tempDir, '.env'), 'VALUE=base')
      await writeFile(join(tempDir, '.env.development'), 'VALUE=development')
      await writeFile(join(tempDir, '.env.development.local'), 'VALUE=development_local')

      const env = await Env.create(new URL(`${tempDir}/`, import.meta.url), {
        VALUE: z.string(),
      }, { nodeEnv: 'development' })

      expect(env.get('VALUE')).toBe('development_local')
    })

    it('should skip .env.local in test environment', async () => {
      await writeFile(join(tempDir, '.env'), 'VALUE=base')
      await writeFile(join(tempDir, '.env.local'), 'VALUE=local')
      await writeFile(join(tempDir, '.env.test'), 'VALUE=test')

      const env = await Env.create(new URL(`${tempDir}/`, import.meta.url), {
        VALUE: z.string(),
      }, { nodeEnv: 'test' })

      // .env.local should be skipped in test env
      expect(env.get('VALUE')).toBe('test')
    })
  })

  describe('env methods', () => {
    it('should get value with get()', async () => {
      const env = await Env.create({
        PORT: z.string().transform(Number).default('3000'),
      })

      expect(env.get('PORT')).toBe(3000)
    })

    it('should return all values with all()', async () => {
      const env = await Env.create({
        PORT: z.string().default('3000'),
        HOST: z.string().default('localhost'),
      })

      const all = env.all()
      expect(all).toEqual({
        PORT: '3000',
        HOST: 'localhost',
      })
    })

    it('should check existence with has()', async () => {
      const env = await Env.create({
        DEFINED: z.string().default('value'),
        UNDEFINED: z.string().optional(),
      })

      expect(env.has('DEFINED')).toBe(true)
      expect(env.has('UNDEFINED')).toBe(false)
    })
  })

  describe('options', () => {
    it('should use custom envSource', async () => {
      const env = await Env.create({
        CUSTOM: z.string(),
      }, {
        envSource: { CUSTOM: 'custom_value' },
      })

      expect(env.get('CUSTOM')).toBe('custom_value')
    })

    it('should ignore process.env with ignoreProcessEnv', async () => {
      process.env.IGNORED = 'process_value'

      const env = await Env.create({
        IGNORED: z.string().default('default_value'),
      }, {
        ignoreProcessEnv: true,
      })

      expect(env.get('IGNORED')).toBe('default_value')
      delete process.env.IGNORED
    })
  })
})
