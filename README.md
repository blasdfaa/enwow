# enwow

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![License][license-src]][license-href]

Cross-platform environment variables loader and validator with [Standard Schema](https://standardschema.dev/) support.

## Features

- 🚀 **Cross-platform** - Works on Node.js, Bun, and Deno
- ✅ **Standard Schema** - Compatible with Zod, Valibot, ArkType, and more
- 📁 **.env file loading** - With proper file priority support
- 🔒 **Type-safe** - Full TypeScript support with type inference
- 🪶 **Lightweight** - Minimal dependencies

## Installation

```sh
npm install enwow
# or
pnpm add enwow
# or
yarn add enwow
```

You'll also need a schema library that supports Standard Schema:

```sh
npm install zod
# or
npm install valibot
# or any other Standard Schema compatible library
```

## Quick Start

### Basic Usage

```typescript
import { Env } from 'enwow'
import { z } from 'zod'

// Define your schema
const env = await Env.create({
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('localhost'),
  DATABASE_URL: z.string().url(),
  DEBUG: z.string().optional(),
})

// Type-safe access
env.get('PORT')     // number
env.get('HOST')     // string
env.get('DATABASE_URL') // string
env.get('DEBUG')    // string | undefined
```

### With .env Files

```typescript
import { Env } from 'enwow'
import { z } from 'zod'

const env = await Env.create(new URL('./', import.meta.url), {
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('localhost'),
})

// Values from .env files are loaded and validated
```

## File Loading Priority

Files are loaded in the following order (highest priority first):

| Priority | File Name | Environment | Notes |
|----------|-----------|-------------|-------|
| 1st | `.env.[NODE_ENV].local` | Current environment | Loaded when NODE_ENV is set |
| 2nd | `.env.local` | All | Not loaded in test environment |
| 3rd | `.env.[NODE_ENV]` | Current environment | Loaded when NODE_ENV is set |
| 4th | `.env` | All | Always loaded |

`process.env` always has the highest priority and will override values from any file.

## API

### `Env.create(schema, options?)`

Create a new Env instance without loading .env files.

```typescript
const env = await Env.create({
  PORT: z.string().transform(Number),
})
```

### `Env.create(path, schema, options?)`

Create a new Env instance and load .env files from the specified directory.

```typescript
const env = await Env.create(new URL('./', import.meta.url), {
  PORT: z.string().transform(Number),
})
```

### Options

```typescript
interface EnvCreateOptions {
  // Ignore existing process.env values
  ignoreProcessEnv?: boolean

  // Override NODE_ENV for file loading
  nodeEnv?: string

  // Custom environment variables source
  envSource?: Record<string, string | undefined>
}
```

### `env.get(key)`

Get a validated environment variable value.

```typescript
const port = env.get('PORT') // Type: number
```

### `env.all()`

Get all validated environment variables as an object.

```typescript
const all = env.all() // Type: { PORT: number, HOST: string, ... }
```

### `env.has(key)`

Check if a variable is defined.

```typescript
if (env.has('DEBUG')) {
  // ...
}
```

## Error Handling

When validation fails, an `EnvValidationError` is thrown:

```typescript
import { EnvValidationError } from 'enwow'

try {
  const env = await Env.create({
    REQUIRED_VAR: z.string(),
  })
} catch (error) {
  if (error instanceof EnvValidationError) {
    console.log('Validation failed:')
    for (const issue of error.issues) {
      console.log(`  ${issue.path}: ${issue.message}`)
    }
  }
}
```

## Advanced Usage

### With Valibot

```typescript
import { Env } from 'enwow'
import * as v from 'valibot'

const env = await Env.create({
  PORT: v.pipe(v.string(), v.transform(Number), v.minValue(1), v.maxValue(65535)),
  HOST: v.optional(v.string(), 'localhost'),
})
```

### With ArkType

```typescript
import { Env } from 'enwow'
import { type } from 'arktype'

const env = await Env.create({
  PORT: type('string.integer').pipe(Number),
  HOST: type('string').default('localhost'),
})
```

### Manual Validation

```typescript
import { EnvValidator, parseEnv } from 'enwow'
import { z } from 'zod'

const validator = new EnvValidator({
  PORT: z.string().transform(Number),
})

const result = validator.validate(process.env)
```

### Direct File Parsing

```typescript
import { EnvLoader, EnvParser } from 'enwow'

const loader = new EnvLoader(new URL('./', import.meta.url))
const files = await loader.load()

for (const file of files) {
  const parser = new EnvParser(file.contents)
  const parsed = parser.parse()
  console.log(parsed)
}
```

## Contribution

<details>
  <summary>Local development</summary>

- Clone this repository
- Install the latest LTS version of [Node.js](https://nodejs.org/en/)
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable`
- Install dependencies using `pnpm install`
- Run tests using `pnpm test`

</details>

## License

[MIT](./LICENSE.md) License

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/enwow?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/enwow
[npm-downloads-src]: https://img.shields.io/npm/dm/enwow?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/enwow
[bundle-src]: https://img.shields.io/bundlephobia/minzip/enwow?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=enwow
[license-src]: https://img.shields.io/github/license/enwow/enwow.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/enwow/enwow/blob/main/LICENSE.md
