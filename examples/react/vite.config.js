import { defineConfig } from 'vite';
import koreanCode from 'korean-code/vite';

export default defineConfig({
  plugins: [koreanCode()],
});
