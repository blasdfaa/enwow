import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { Env } from '../src'
import { fromImportMeta } from '../src/adapters'

describe('fromImportMeta', () => {
  it('reads from a provided env object', async () => {
    const adapter = fromImportMeta({ env: { PORT: '3000', HOST: 'localhost' } })

    expect(adapter.name).toBe('import-meta')
    expect(await adapter.load()).toEqual({ PORT: '3000', HOST: 'localhost' })
  })

  it('filters by prefix and strips it', async () => {
    const adapter = fromImportMeta({
      prefix: 'VITE_',
      env: { VITE_PORT: '3000', VITE_HOST: 'localhost', SECRET: 'nope' },
    })

    expect(await adapter.load()).toEqual({ PORT: '3000', HOST: 'localhost' })
  })

  it('coerces non-string values to strings and drops null/undefined', async () => {
    const adapter = fromImportMeta({
      env: { PORT: 3000, DEBUG: true, EMPTY: null },
    })

    const result = await adapter.load()
    expect(result).toEqual({ PORT: '3000', DEBUG: 'true', EMPTY: undefined })
  })

  it('reads the bundler-injected import.meta.env when no env is passed', async () => {
    // Vitest runs on Vite, which injects import.meta.env (MODE, BASE_URL, ...).
    const adapter = fromImportMeta()
    const result = await adapter.load()

    expect(typeof result).toBe('object')
    expect(result.MODE).toBeDefined()
  })

  it('treats an explicit empty env as no variables', async () => {
    const adapter = fromImportMeta({ env: {} })

    expect(await adapter.load()).toEqual({})
  })

  it('works as an explicit source for Env.create', async () => {
    const env = await Env.create({
      PORT: z.string().transform(Number),
      HOST: z.string(),
    }, {
      sources: [fromImportMeta({ prefix: 'VITE_', env: { VITE_PORT: '4000', VITE_HOST: 'app' } })],
    })

    expect(env.get('PORT')).toBe(4000)
    expect(env.get('HOST')).toBe('app')
  })
})
