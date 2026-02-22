import { mkdir, rm, unlink, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { Env, EnvValidationError } from '../src'
import { defineSourceAdapter, fromFiles, fromJSON, fromObject, fromProcessEnv, resolveAdapters } from '../src/adapters'

describe('adapters', () => {
  const tempDir = join(process.cwd(), 'test-temp-adapters')

  beforeAll(async () => {
    await mkdir(tempDir, { recursive: true })
  })

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('defineSourceAdapter', () => {
    it('should return a factory function', () => {
      const factory = defineSourceAdapter<{ prefix: string }>((opts) => {
        return {
          name: 'test',
          load: () => ({ [`${opts.prefix}_KEY`]: 'value' }),
        }
      })

      expect(typeof factory).toBe('function')

      const adapter = factory({ prefix: 'MY' })
      expect(adapter.name).toBe('test')
      expect(adapter.load()).toEqual({ MY_KEY: 'value' })
    })

    it('should support async load function', async () => {
      const factory = defineSourceAdapter<{ value: string }>((opts) => {
        return {
          name: 'async-test',
          async load() {
            return { KEY: opts.value }
          },
        }
      })

      const adapter = factory({ value: 'hello' })
      expect(adapter.name).toBe('async-test')
      expect(await adapter.load()).toEqual({ KEY: 'hello' })
    })
  })

  describe('fromObject', () => {
    it('should return provided values', async () => {
      const adapter = fromObject({ env: { PORT: '3000', HOST: 'localhost' } })

      expect(adapter.name).toBe('object')
      expect(await adapter.load()).toEqual({ PORT: '3000', HOST: 'localhost' })
    })

    it('should return a copy of the object', async () => {
      const source = { PORT: '3000' }
      const adapter = fromObject({ env: source })

      const result = await adapter.load()
      result.PORT = '4000'

      expect(await adapter.load()).toEqual({ PORT: '3000' })
    })
  })

  describe('fromProcessEnv', () => {
    it('should return process.env values', async () => {
      process.env.ADAPTER_TEST_VAR = 'test_value'

      const adapter = fromProcessEnv()
      const result = await adapter.load()

      expect(adapter.name).toBe('process-env')
      expect(result.ADAPTER_TEST_VAR).toBe('test_value')

      delete process.env.ADAPTER_TEST_VAR
    })
  })

  describe('fromFiles', () => {
    afterEach(async () => {
      const { readdir } = await import('node:fs/promises')
      const files = await readdir(tempDir)
      await Promise.all(files.map(f => unlink(join(tempDir, f))))
    })

    it('should load .env files from directory', async () => {
      await writeFile(join(tempDir, '.env'), 'FILE_VAR=from_file')

      const adapter = fromFiles({ directory: tempDir })
      const result = await adapter.load()

      expect(adapter.name).toBe('files')
      expect(result.FILE_VAR).toBe('from_file')
    })

    it('should respect file priority', async () => {
      await writeFile(join(tempDir, '.env'), 'VALUE=base')
      await writeFile(join(tempDir, '.env.development'), 'VALUE=development')

      const adapter = fromFiles({ directory: tempDir, nodeEnv: 'development' })
      const result = await adapter.load()

      expect(result.VALUE).toBe('development')
    })

    it('should return empty object when no files exist', async () => {
      const adapter = fromFiles({ directory: join(tempDir, 'nonexistent') })
      const result = await adapter.load()

      expect(result).toEqual({})
    })
  })

  describe('fromJSON', () => {
    afterEach(async () => {
      const { readdir } = await import('node:fs/promises')
      const files = await readdir(tempDir)
      await Promise.all(files.map(f => unlink(join(tempDir, f))))
    })

    it('should load values from JSON file', async () => {
      const jsonPath = join(tempDir, 'env.json')
      await writeFile(jsonPath, JSON.stringify({ PORT: '3000', HOST: 'localhost' }))

      const adapter = fromJSON({ path: jsonPath })
      const result = await adapter.load()

      expect(adapter.name).toBe('json')
      expect(result).toEqual({ PORT: '3000', HOST: 'localhost' })
    })

    it('should convert non-string values to strings', async () => {
      const jsonPath = join(tempDir, 'env.json')
      await writeFile(jsonPath, JSON.stringify({ PORT: 3000, DEBUG: true }))

      const adapter = fromJSON({ path: jsonPath })
      const result = await adapter.load()

      expect(result).toEqual({ PORT: '3000', DEBUG: 'true' })
    })

    it('should handle null values as undefined', async () => {
      const jsonPath = join(tempDir, 'env.json')
      await writeFile(jsonPath, JSON.stringify({ KEY: null }))

      const adapter = fromJSON({ path: jsonPath })
      const result = await adapter.load()

      expect(result.KEY).toBeUndefined()
    })

    it('should return empty object when file does not exist', async () => {
      const adapter = fromJSON({ path: join(tempDir, 'nonexistent.json') })
      const result = await adapter.load()

      expect(result).toEqual({})
    })

    it('should throw on invalid JSON structure (array)', async () => {
      const jsonPath = join(tempDir, 'env.json')
      await writeFile(jsonPath, JSON.stringify([1, 2, 3]))

      const adapter = fromJSON({ path: jsonPath })
      await expect(adapter.load()).rejects.toThrow(TypeError)
    })
  })

  describe('resolveAdapters', () => {
    it('should merge sources left-to-right', async () => {
      const result = await resolveAdapters([
        fromObject({ env: { PORT: '3000', HOST: 'localhost' } }),
        fromObject({ env: { PORT: '4000' } }),
      ])

      expect(result).toEqual({ PORT: '4000', HOST: 'localhost' })
    })

    it('should handle empty adapter list', async () => {
      const result = await resolveAdapters([])
      expect(result).toEqual({})
    })

    it('should handle single adapter', async () => {
      const result = await resolveAdapters([
        fromObject({ env: { PORT: '3000' } }),
      ])

      expect(result).toEqual({ PORT: '3000' })
    })

    it('should merge multiple adapters in order', async () => {
      const result = await resolveAdapters([
        fromObject({ env: { A: '1', B: '2', C: '3' } }),
        fromObject({ env: { B: '20' } }),
        fromObject({ env: { C: '30' } }),
      ])

      expect(result).toEqual({ A: '1', B: '20', C: '30' })
    })
  })

  describe('env.create with sources', () => {
    it('should create env from adapter sources', async () => {
      const env = await Env.create({
        PORT: z.string().transform(Number),
        HOST: z.string(),
      }, {
        sources: [
          fromObject({ env: { PORT: '3000', HOST: 'localhost' } }),
        ],
      })

      expect(env.get('PORT')).toBe(3000)
      expect(env.get('HOST')).toBe('localhost')
    })

    it('should respect source priority (last wins)', async () => {
      const env = await Env.create({
        PORT: z.string().transform(Number),
      }, {
        sources: [
          fromObject({ env: { PORT: '3000' } }),
          fromObject({ env: { PORT: '4000' } }),
        ],
      })

      expect(env.get('PORT')).toBe(4000)
    })

    it('should throw on validation error with sources', async () => {
      await expect(
        Env.create({
          REQUIRED_VAR: z.string(),
        }, {
          sources: [fromObject({ env: {} })],
        }),
      ).rejects.toThrow(EnvValidationError)
    })

    it('should throw when combining path and sources', async () => {
      await expect(
        Env.create(new URL(`${tempDir}/`, import.meta.url), {
          PORT: z.string(),
        }, {
          sources: [fromObject({ env: { PORT: '3000' } })],
        }),
      ).rejects.toThrow(TypeError)
    })

    it('should work with fromFiles adapter', async () => {
      await writeFile(join(tempDir, '.env'), 'FROM_ADAPTER=adapter_value')

      const env = await Env.create({
        FROM_ADAPTER: z.string(),
      }, {
        sources: [
          fromFiles({ directory: tempDir }),
        ],
      })

      expect(env.get('FROM_ADAPTER')).toBe('adapter_value')

      await unlink(join(tempDir, '.env'))
    })

    it('should work with mixed adapters', async () => {
      const jsonPath = join(tempDir, 'env.json')
      await writeFile(join(tempDir, '.env'), 'FILE_VAR=from_file\nSHARED=file')
      await writeFile(jsonPath, JSON.stringify({ JSON_VAR: 'from_json', SHARED: 'json' }))

      const env = await Env.create({
        FILE_VAR: z.string(),
        JSON_VAR: z.string(),
        SHARED: z.string(),
      }, {
        sources: [
          fromFiles({ directory: tempDir }),
          fromJSON({ path: jsonPath }),
        ],
      })

      expect(env.get('FILE_VAR')).toBe('from_file')
      expect(env.get('JSON_VAR')).toBe('from_json')
      expect(env.get('SHARED')).toBe('json')

      await unlink(join(tempDir, '.env'))
      await unlink(jsonPath)
    })

    it('should work with defineSourceAdapter', async () => {
      const custom = defineSourceAdapter<{ value: string }>((opts) => {
        return {
          name: 'custom',
          load: () => ({ CUSTOM: opts.value }),
        }
      })

      const env = await Env.create({
        CUSTOM: z.string(),
      }, {
        sources: [custom({ value: 'custom_value' })],
      })

      expect(env.get('CUSTOM')).toBe('custom_value')
    })

    it('should work with async defineSourceAdapter', async () => {
      const asyncFactory = defineSourceAdapter<{ value: string }>((opts) => {
        return {
          name: 'async-custom',
          async load() {
            return { ASYNC_VAR: opts.value }
          },
        }
      })

      const env = await Env.create({
        ASYNC_VAR: z.string(),
      }, {
        sources: [asyncFactory({ value: 'async_value' })],
      })

      expect(env.get('ASYNC_VAR')).toBe('async_value')
    })
  })
})
