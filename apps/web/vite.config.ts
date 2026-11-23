import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

const page = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: process.env.SINGLE ? [viteSingleFile()] : [],
  base: './', // 도메인 루트와 하위 경로 어디서든 돌아가게
  server: { fs: { allow: ['..', '../..'] } }, // packages/shared 규칙 코드를 함께 쓴다
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
    // 게임(index)과 관리자 페이지(admin) 두 쪽
    rollupOptions: process.env.SINGLE ? {} : { input: { main: page('./index.html'), admin: page('./admin.html') } },
  },
});
