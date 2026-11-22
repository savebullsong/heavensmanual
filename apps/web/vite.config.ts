import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// SINGLE=1 이면 미리보기용 단일 HTML 파일로 묶는다
export default defineConfig({
  plugins: process.env.SINGLE ? [viteSingleFile()] : [],
  base: './', // 도메인 루트와 하위 경로 어디서든 돌아가게
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
});
