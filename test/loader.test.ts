import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { EnvLoader, loadEnv } from '../src/loader'

describe('envLoader', () => {
  const tempDir = join(process.cwd(), 'test-temp-loader')

  beforeAll(async () => {
    await mkdir(tempDir, { recursive: true })
  })

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('file loading', () => {
    it('should load .env file', async () => {
      await writeFile(join(tempDir, '.env'), 'PORT=3000')

      const loader = new EnvLoader(tempDir)
      const files = await loader.load()

      expect(files).toHaveLength(1)
      expect(files[0].contents).toBe('PORT=3000')
    })

    it('should return empty array when no files exist', async () => {
      const emptyDir = join(tempDir, 'empty')
      await mkdir(emptyDir, { recursive: true })

      const loader = new EnvLoader(emptyDir)
      const files = await loader.load()

      expect(files).toHaveLength(0)
    })

    it('should load multiple files in priority order', async () => {
      await writeFile(join(tempDir, '.env'), 'VALUE=base')
      await writeFile(join(tempDir, '.env.local'), 'VALUE=local')

      const loader = new EnvLoader(tempDir, { nodeEnv: 'development' })
      const files = await loader.load()

      expect(files).toHaveLength(2)
      expect(files[0].contents).toBe('VALUE=local') // Higher priority
      expect(files[1].contents).toBe('VALUE=base') // Lower priority
    })
  })

  describe('file priority', () => {
    it('should respect .env.[NODE_ENV].local as highest priority', async () => {
      await writeFile(join(tempDir, '.env'), 'VALUE=1')
      await writeFile(join(tempDir, '.env.local'), 'VALUE=2')
      await writeFile(join(tempDir, '.env.development'), 'VALUE=3')
      await writeFile(join(tempDir, '.env.development.local'), 'VALUE=4')

      const loader = new EnvLoader(tempDir, { nodeEnv: 'development' })
      const files = await loader.load()

      expect(files[0].contents).toBe('VALUE=4')
    })

    it('should skip .env.local in test environment', async () => {
      await writeFile(join(tempDir, '.env'), 'VALUE=base')
      await writeFile(join(tempDir, '.env.local'), 'VALUE=local')

      const loader = new EnvLoader(tempDir, { nodeEnv: 'test' })
      const files = await loader.load()

      const fileNames = files.map(f => f.path.split('/').pop())
      expect(fileNames).not.toContain('.env.local')
    })

    it('should load .env.[NODE_ENV] when NODE_ENV is set', async () => {
      await writeFile(join(tempDir, '.env.production'), 'VALUE=production')

      const loader = new EnvLoader(tempDir, { nodeEnv: 'production' })
      const files = await loader.load()

      expect(files.some(f => f.path.endsWith('.env.production'))).toBe(true)
    })
  })

  describe('uRL support', () => {
    it('should accept URL as directory', async () => {
      await writeFile(join(tempDir, '.env'), 'PORT=3000')

      const loader = new EnvLoader(new URL(`${tempDir}/`, import.meta.url))
      const files = await loader.load()

      expect(files).toHaveLength(1)
    })
  })

  describe('custom files', () => {
    it('should load custom files when specified', async () => {
      await writeFile(join(tempDir, 'custom.env'), 'CUSTOM=value')

      const loader = new EnvLoader(tempDir, { files: ['custom.env'] })
      const files = await loader.load()

      expect(files).toHaveLength(1)
      expect(files[0].path.endsWith('custom.env')).toBe(true)
    })
  })
})

describe('loadEnv', () => {
  const tempDir = join(process.cwd(), 'test-temp-loadenv')

  beforeAll(async () => {
    await mkdir(tempDir, { recursive: true })
  })

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('should be a convenience function for EnvLoader', async () => {
    await writeFile(join(tempDir, '.env'), 'PORT=3000')

    const files = await loadEnv(tempDir)

    expect(files).toHaveLength(1)
    expect(files[0].contents).toBe('PORT=3000')
  })
})
