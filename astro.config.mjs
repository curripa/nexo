import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://curripa.github.io',
  base: '/nexo/',
  output: 'static',
  integrations: [tailwind()],
  server: { host: true }
});
