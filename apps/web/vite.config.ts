import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const page = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// 36차: 관리자 그림 칸 목록은 두 곳에 있다 (게임 src/portraits.ts · 서버 api/portraits.ts).
// 서버 쪽에 없는 칸은 저장할 때 'unknown slot' 오류가 난다 — 둘이 다르면 빌드를 멈춰 배포 전에 알게 한다
{
  const list = (f: string, re: RegExp) => { const m = re.exec(readFileSync(page(f), 'utf8')); return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : []; };
  const client = list('./src/portraits.ts', /PORTRAIT_SLOTS = \[([^\]]*)\]/);
  const server = new Set(list('./api/portraits.ts', /const SLOTS = \[([^\]]*)\]/));
  const missing = client.filter((k) => !server.has(k));
  if (!client.length || missing.length) throw new Error(`api/portraits.ts SLOTS에 없는 그림 칸: ${missing.join(', ') || '(목록을 못 읽음)'}`);
}

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
