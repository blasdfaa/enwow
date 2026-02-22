import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/adapters/index.ts',
  ],
  dts: true,
  exports: true,
  publint: true,
})
