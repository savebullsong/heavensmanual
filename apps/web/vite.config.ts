import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

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

// 42차: 그림 지문표 (public/art-manifest.json) — 파일 내용의 짧은 해시. 게임은 그림을 '?v=지문'으로 받고,
// 서비스 워커는 그림을 앱 버전과 떼어 놓은 캐시에 둔다 (배포해도 바뀐 그림만 새로 받는다)
{
  const pub = page('./public/');
  const out: Record<string, string> = {};
  for (const dir of ['sprites', 'sprites3x', 'zones']) {
    let names: string[] = [];
    try { names = readdirSync(pub + dir); } catch { continue; }
    for (const n of names.sort()) {
      if (!/\.(png|json)$/.test(n)) continue;
      out[`${dir}/${n}`] = createHash('md5').update(readFileSync(pub + dir + '/' + n)).digest('hex').slice(0, 10);
    }
  }
  const text = JSON.stringify(out);
  let old = '';
  try { old = readFileSync(pub + 'art-manifest.json', 'utf8'); } catch { /* 처음 */ }
  if (old !== text) writeFileSync(pub + 'art-manifest.json', text);
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
