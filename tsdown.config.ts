import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/adapters/index.ts',
    'src/adapters/node.ts',
  ],
  dts: true,
  exports: true,
  publint: true,
})
