# Context

Domain glossary for `enwow`. One term, one definition. Keep it short.

## Terms

**Source adapter**
A concrete thing that loads environment variables from one place (`.env` files, `process.env`, a JSON file, a secret manager, …). Satisfies the `EnvSourceAdapter` interface: a `name` and a `load()` returning a flat key/value record. See `src/adapters/`.

**Default sources**
The list of source adapters `Env.create` builds when the caller does not pass an explicit `sources` option. Derived from the legacy options (`path`, `nodeEnv`, `ignoreProcessEnv`, `envSource`): a `fromFiles` adapter for the path, plus a highest-priority `process.env` tier (or its `fromObject` replacement, or nothing). Built by `buildDefaultSources` in `src/adapters/default.ts`.

**Adapter pipeline**
The single load path: a list of source adapters resolved left-to-right by `resolveAdapters`, where later sources override earlier ones. Both explicit `sources` and default sources flow through it.

**Intake**
Everything that happens before validation: turning options into an adapter pipeline, resolving it, and producing a flat env record for the validator.

**Isomorphic adapter**
A source adapter that runs in any runtime, including the browser: it touches no filesystem and no `process.env`. Exported from `enwow/adapters` (`fromObject`, `fromImportMeta`, plus `defineSourceAdapter`/`resolveAdapters`).

**Node adapter**
A source adapter that needs a server runtime (Node/Bun/Deno) — filesystem or `process.env`. Exported from the separate `enwow/adapters/node` entry (`fromFiles`, `fromJSON`, `fromProcessEnv`) so browser bundles never pull in Node APIs.

**Build-time source**
A source whose values a bundler substitutes at build time, exposed via `import.meta.env` (Vite, esbuild). Read by `fromImportMeta`, the main browser intake. Contrast with runtime sources (a fetched config, an injected global) and server sources (files, `process.env`).
