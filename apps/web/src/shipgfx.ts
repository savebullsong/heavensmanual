// 24차: 환생의 우주왕복선 — 천국 환생의 테라스와 지옥 로비에 하나씩. 환생할 때 걸어가 타고 떠난다.
// 천국: 상아빛 연료 탱크 · 흰 궤도선 · 금빛 발사탑, 발밑은 구름. 지옥: 녹슨 연료 탱크(이음매가 달아오름) · 그을린 궤도선 · 쇠사슬 감긴 검은 발사탑, 발밑은 유황 연기.
// 2배 크기 캔버스로 그리고 게임에서는 반으로 줄여 쓴다 (도트처럼 또렷하게).
export interface ShipPic { back: HTMLCanvasElement; stack: HTMLCanvasElement; front: HTMLCanvasElement; ax: number; ay: number; door: number }

const cache = new Map<string, ShipPic>();
export function shuttleCanvas(hell: boolean): ShipPic {
  const key = hell ? 'h' : 'v';
  const hit = cache.get(key);
  if (hit) return hit;
  const S = 2, W = 300 * S, H = 360 * S;
  // 세 장: 뒤(발사대·발사탑, 남는다) · 가운데(탱크·추진기·궤도선, 떠오른다) · 앞(발밑 구름·연기, 남는다)
  const mk = () => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx2 = cv.getContext('2d')!; cx2.scale(S, S); return [cv, cx2] as const; };
  const [back, gb] = mk(), [stack, gs] = mk(), [front, gf] = mk();
  let g = gb;
  const cx = 150, base = 330; // 발사대 가운데 · 바닥
  const pal = hell
    ? { tank: ['#a0522a', '#7a3a1e', '#4a200e'], band: '#1e100a', seam: '#ff7a2a', srb: ['#c8bca4', '#9a8e78', '#5e5444'], orb: ['#4a4644', '#2e2a28', '#181414'], trim: '#a8281e', tile: '#0e0a0a', tower: '#1a1614', towerHi: '#3a2e28', pad: ['#2a2220', '#1a1412'], glow: '#ff8a2a' }
    : { tank: ['#f6efe0', '#e4d8c0', '#bfb092'], band: '#c9a23e', seam: '#fff6d8', srb: ['#ffffff', '#e8e6e0', '#b8b4aa'], orb: ['#ffffff', '#eae8e2', '#bcb8b0'], trim: '#c9a23e', tile: '#2a2a30', tower: '#c9a23e', towerHi: '#f2d27a', pad: ['#e8e0d0', '#cfc6b4'], glow: '#fff2c8' };
  // 원기둥: 왼쪽 위에서 빛 (밝음 → 보통 → 그늘)
  const cyl = (x: number, y0: number, y1: number, w: number, col: string[]) => {
    const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    gr.addColorStop(0, col[1]); gr.addColorStop(0.28, col[0]); gr.addColorStop(0.65, col[1]); gr.addColorStop(1, col[2]);
    g.fillStyle = gr; g.fillRect(Math.round(x - w / 2), Math.round(y0), Math.round(w), Math.round(y1 - y0));
  };
  const nose = (x: number, y: number, w: number, h: number, col: string[]) => {
    const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    gr.addColorStop(0, col[1]); gr.addColorStop(0.3, col[0]); gr.addColorStop(1, col[2]);
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - w / 2, y); g.quadraticCurveTo(x - w / 2, y - h * 0.7, x, y - h); g.quadraticCurveTo(x + w / 2, y - h * 0.7, x + w / 2, y); g.closePath(); g.fill();
  };
  // 1) 발사대: 마름모 바닥 판 + 화염 도랑
  g.fillStyle = pal.pad[1];
  g.beginPath(); g.moveTo(cx - 140, base - 10); g.lineTo(cx, base - 80); g.lineTo(cx + 140, base - 10); g.lineTo(cx, base + 60); g.closePath(); g.fill();
  g.fillStyle = pal.pad[0];
  g.beginPath(); g.moveTo(cx - 132, base - 12); g.lineTo(cx, base - 76); g.lineTo(cx + 132, base - 12); g.lineTo(cx, base + 52); g.closePath(); g.fill();
  g.fillStyle = hell ? '#0a0606' : '#b8ae9a';
  g.beginPath(); g.moveTo(cx - 40, base - 14); g.lineTo(cx, base - 34); g.lineTo(cx + 40, base - 14); g.lineTo(cx, base + 6); g.closePath(); g.fill();
  if (hell) { g.fillStyle = 'rgba(255,120,40,0.55)'; g.beginPath(); g.ellipse(cx, base - 14, 26, 9, 0, 0, Math.PI * 2); g.fill(); }
  // 2) 발사탑 (오른쪽 뒤): 격자 기둥과 궤도선으로 뻗은 팔
  const tx = cx + 78, ttop = base - 280;
  g.fillStyle = pal.tower; g.fillRect(tx - 12, ttop, 3, base - 40 - ttop); g.fillRect(tx + 9, ttop, 3, base - 40 - ttop);
  g.strokeStyle = pal.tower; g.lineWidth = 1.4;
  for (let y = ttop; y < base - 44; y += 14) { g.beginPath(); g.moveTo(tx - 10, y); g.lineTo(tx + 10, y + 14); g.moveTo(tx + 10, y); g.lineTo(tx - 10, y + 14); g.stroke(); g.fillRect(tx - 12, y, 24, 2); }
  g.fillStyle = pal.towerHi; g.fillRect(tx - 13, ttop - 6, 26, 6);
  g.fillStyle = pal.tower; g.fillRect(cx + 16, base - 196, tx - cx - 18, 5); g.fillRect(cx + 16, base - 120, tx - cx - 18, 4);
  if (hell) {
    g.strokeStyle = '#4a4440'; g.lineWidth = 1.5;
    for (const y of [ttop + 30, ttop + 90, ttop + 160]) { g.beginPath(); g.moveTo(tx - 12, y); g.quadraticCurveTo(tx - 30, y + 26, tx - 12, y + 50); g.stroke(); }
    g.fillStyle = '#ff5a2a'; for (const y of [ttop + 4, ttop + 120]) g.fillRect(tx + 12, y, 4, 4);
  } else {
    g.fillStyle = '#fff6d8'; g.fillRect(tx - 2, ttop - 14, 4, 8);
  }
  // 3) 연료 탱크 (가운데 큰 기둥)
  g = gs;
  cyl(cx, base - 250, base - 36, 46, pal.tank);
  nose(cx, base - 250, 46, 34, pal.tank);
  g.fillStyle = pal.band; g.fillRect(cx - 23, base - 182, 46, 3); g.fillRect(cx - 23, base - 96, 46, 3);
  if (hell) { g.fillStyle = pal.seam; for (let y = base - 240; y < base - 40; y += 22) g.fillRect(cx - 16 + ((y / 22) % 2) * 18, y, 10, 1); }
  // 4) 보조 추진기 둘 (양옆)
  for (const sx of [-34, 34]) {
    cyl(cx + sx, base - 214, base - 30, 16, pal.srb);
    nose(cx + sx, base - 214, 16, 20, pal.srb);
    g.fillStyle = pal.srb[2]; g.fillRect(cx + sx - 8, base - 150, 16, 2); g.fillRect(cx + sx - 8, base - 90, 16, 2);
    g.fillStyle = hell ? '#2a2420' : '#8a8478'; g.beginPath(); g.moveTo(cx + sx - 8, base - 30); g.lineTo(cx + sx + 8, base - 30); g.lineTo(cx + sx + 10, base - 20); g.lineTo(cx + sx - 10, base - 20); g.closePath(); g.fill();
  }
  // 5) 궤도선 (앞): 세로로 선 몸통 · 검은 코 · 삼각 날개 · 꼬리 날개 · 창
  const ob0 = base - 212, ob1 = base - 56;
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(cx - 15, ob0 + 10, 32, ob1 - ob0);
  // 날개 (아래쪽 넓게)
  g.fillStyle = pal.orb[1];
  g.beginPath(); g.moveTo(cx - 14, ob0 + 70); g.lineTo(cx - 52, ob1 - 6); g.lineTo(cx - 14, ob1); g.closePath(); g.fill();
  g.fillStyle = pal.orb[2];
  g.beginPath(); g.moveTo(cx + 14, ob0 + 70); g.lineTo(cx + 52, ob1 - 6); g.lineTo(cx + 14, ob1); g.closePath(); g.fill();
  g.fillStyle = pal.tile; g.fillRect(cx - 52, ob1 - 8, 38, 3); g.fillRect(cx + 14, ob1 - 8, 38, 3);
  cyl(cx, ob0, ob1, 28, pal.orb);
  nose(cx, ob0, 28, 22, [pal.tile, pal.tile, '#000000']);
  g.fillStyle = pal.tile; g.fillRect(cx - 14, ob0, 28, 8);
  g.fillStyle = hell ? '#ff8a4a' : '#3a4a6a'; for (const k of [-8, -2, 4]) g.fillRect(cx + k, ob0 + 12, 4, 5); // 조종석 창
  g.fillStyle = pal.trim; g.fillRect(cx - 14, ob0 + 40, 28, 3); g.fillRect(cx - 1, ob0 + 46, 2, ob1 - ob0 - 60);
  // 꼬리 날개 (밑으로) + 엔진 셋
  g.fillStyle = pal.orb[1]; g.beginPath(); g.moveTo(cx - 3, ob1); g.lineTo(cx + 3, ob1); g.lineTo(cx + 2, ob1 + 18); g.lineTo(cx - 2, ob1 + 18); g.closePath(); g.fill();
  g.fillStyle = hell ? '#1a1414' : '#6a6660'; for (const k of [-9, 0, 9]) { g.beginPath(); g.ellipse(cx + k, ob1 + 4, 4, 3, 0, 0, Math.PI * 2); g.fill(); }
  // 문 (타는 곳): 궤도선 아래쪽 왼편, 발사탑 팔이 닿는 자리에 작은 빛
  g.fillStyle = pal.glow; g.fillRect(cx - 6, ob1 - 34, 8, 12);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(cx - 6, ob1 - 34, 8, 2);
  // 6) 발밑: 천국은 구름 덩이, 지옥은 유황 연기
  g = gf;
  for (let k = 0; k < 9; k++) {
    const x = cx - 110 + k * 27 + Math.sin(k * 2.1) * 8, y = base - 4 + Math.cos(k * 1.7) * 8, r = 18 + (k % 3) * 6;
    g.fillStyle = hell ? 'rgba(90,70,40,0.55)' : 'rgba(255,255,255,0.85)';
    g.beginPath(); g.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2); g.fill();
    if (!hell) { g.fillStyle = 'rgba(210,214,228,0.7)'; g.beginPath(); g.ellipse(x, y + r * 0.2, r, r * 0.35, 0, 0, Math.PI); g.fill(); }
  }
  const pic = { back, stack, front, ax: cx / 300, ay: base / 360, door: base - (ob1 - 28) };
  cache.set(key, pic);
  return pic;
}

/** 엔진 불꽃 (발사할 때 궤도선·추진기 밑): 프레임마다 다시 그린다 */
export function flameCanvas(hell: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 120; c.height = 160;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(60, 30, 4, 60, 70, 80);
  if (hell) { gr.addColorStop(0, '#fff2c8'); gr.addColorStop(0.25, '#ff9a3a'); gr.addColorStop(0.6, 'rgba(200,40,20,0.75)'); gr.addColorStop(1, 'rgba(60,10,6,0)'); }
  else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, '#fff2c8'); gr.addColorStop(0.6, 'rgba(255,210,120,0.7)'); gr.addColorStop(1, 'rgba(255,240,220,0)'); }
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(30, 10); g.quadraticCurveTo(10, 90, 60, 158); g.quadraticCurveTo(110, 90, 90, 10); g.closePath(); g.fill();
  return c;
}
