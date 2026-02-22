import { describe, expect, it } from 'vitest'
import { EnvParser, parseEnv } from '../src/parser'

describe('envParser', () => {
  describe('basic parsing', () => {
    it('should parse simple key-value pairs', () => {
      const parser = new EnvParser('PORT=3000\nHOST=localhost')
      const result = parser.parse()

      expect(result).toEqual({
        PORT: '3000',
        HOST: 'localhost',
      })
    })

    it('should handle empty lines', () => {
      const parser = new EnvParser('PORT=3000\n\n\nHOST=localhost')
      const result = parser.parse()

      expect(result).toEqual({
        PORT: '3000',
        HOST: 'localhost',
      })
    })

    it('should handle comments', () => {
      const parser = new EnvParser(`
# This is a comment
PORT=3000
# Another comment
HOST=localhost
`)
      const result = parser.parse()

      expect(result).toEqual({
        PORT: '3000',
        HOST: 'localhost',
      })
    })

    it('should handle inline comments', () => {
      const parser = new EnvParser('PORT=3000 # This is a comment')
      const result = parser.parse()

      expect(result).toEqual({
        PORT: '3000',
      })
    })

    it('should handle empty values', () => {
      const parser = new EnvParser('EMPTY=\nFILLED=value')
      const result = parser.parse()

      expect(result).toEqual({
        EMPTY: '',
        FILLED: 'value',
      })
    })
  })

  describe('quoted values', () => {
    it('should handle double-quoted values', () => {
      const parser = new EnvParser('MESSAGE="Hello World"')
      const result = parser.parse()

      expect(result).toEqual({
        MESSAGE: 'Hello World',
      })
    })

    it('should handle single-quoted values', () => {
      const parser = new EnvParser('MESSAGE=\'Hello World\'')
      const result = parser.parse()

      expect(result).toEqual({
        MESSAGE: 'Hello World',
      })
    })

    it('should handle multi-line values', () => {
      const parser = new EnvParser(`PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z
-----END RSA PRIVATE KEY-----"`)
      const result = parser.parse()

      expect(result.PRIVATE_KEY).toContain('-----BEGIN RSA PRIVATE KEY-----')
      expect(result.PRIVATE_KEY).toContain('-----END RSA PRIVATE KEY-----')
    })

    it('should preserve special characters in quoted values', () => {
      const parser = new EnvParser('SPECIAL="value with # hash and $ dollar"')
      const result = parser.parse()

      expect(result).toEqual({
        SPECIAL: 'value with # hash and $ dollar',
      })
    })
  })

  describe('interpolation', () => {
    it('should interpolate $VAR syntax', () => {
      const parser = new EnvParser('BASE=/app\nPATH=$BASE/path')
      const result = parser.parse()

      expect(result).toEqual({
        BASE: '/app',
        PATH: '/app/path',
      })
    })

    it('should interpolate ${VAR} syntax', () => {
      const parser = new EnvParser('BASE=/app\nPATH=${BASE}/path')
      const result = parser.parse()

      expect(result).toEqual({
        BASE: '/app',
        PATH: '/app/path',
      })
    })

    it('should use process.env for interpolation when available', () => {
      process.env.TEST_VAR = 'from_process'
      const parser = new EnvParser('PATH=$TEST_VAR/path')
      const result = parser.parse()

      expect(result).toEqual({
        PATH: 'from_process/path',
      })
      delete process.env.TEST_VAR
    })

    it('should ignore process.env when ignoreProcessEnv is true', () => {
      process.env.TEST_VAR = 'from_process'
      const parser = new EnvParser('PATH=$TEST_VAR/path', { ignoreProcessEnv: true })
      const result = parser.parse()

      expect(result).toEqual({
        PATH: '/path',
      })
      delete process.env.TEST_VAR
    })

    it('should not interpolate inside single quotes', () => {
      const parser = new EnvParser('PATH=\'$VAR\'')
      const result = parser.parse()

      expect(result).toEqual({
        PATH: '$VAR',
      })
    })
  })

  describe('edge cases', () => {
    it('should handle lines without equals sign', () => {
      const parser = new EnvParser('PORT=3000\nINVALID_LINE\nHOST=localhost')
      const result = parser.parse()

      expect(result).toEqual({
        PORT: '3000',
        HOST: 'localhost',
      })
    })

    it('should handle equals sign in value', () => {
      const parser = new EnvParser('URL=http://example.com?key=value')
      const result = parser.parse()

      expect(result).toEqual({
        URL: 'http://example.com?key=value',
      })
    })

    it('should handle Windows line endings', () => {
      const parser = new EnvParser('PORT=3000\r\nHOST=localhost')
      const result = parser.parse()

      expect(result).toEqual({
        PORT: '3000',
        HOST: 'localhost',
      })
    })

    it('should trim whitespace around keys and values', () => {
      const parser = new EnvParser('  PORT  =  3000  ')
      const result = parser.parse()

      expect(result).toEqual({
        PORT: '3000',
      })
    })
  })
})

describe('parseEnv', () => {
  it('should be a convenience function for EnvParser', () => {
    const result = parseEnv('PORT=3000')
    expect(result).toEqual({ PORT: '3000' })
  })
})
