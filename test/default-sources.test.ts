import { describe, expect, it } from 'vitest'
import { buildDefaultSources } from '../src/adapters/default'

describe('buildDefaultSources', () => {
  const path = new URL('file:///tmp/app/')

  it('maps no path + no options to a single process.env source', () => {
    const sources = buildDefaultSources(undefined, {})

    expect(sources.map(s => s.name)).toEqual(['process-env'])
  })

  it('maps a path to a files source plus the process.env tier', () => {
    const sources = buildDefaultSources(path, {})

    expect(sources.map(s => s.name)).toEqual(['files', 'process-env'])
  })

  it('replaces the process.env tier with an object source when envSource is set', () => {
    const sources = buildDefaultSources(undefined, { envSource: { A: '1' } })

    expect(sources.map(s => s.name)).toEqual(['object'])
  })

  it('drops the process.env tier entirely when ignoreProcessEnv is true', () => {
    expect(buildDefaultSources(undefined, { ignoreProcessEnv: true })).toEqual([])
    expect(buildDefaultSources(path, { ignoreProcessEnv: true }).map(s => s.name)).toEqual(['files'])
  })
})
