import { artUrl } from './art.ts';
// 미리 구운 우주새 상점 안 (tools/sprite3d/shop.py): 방(낮·밤), 카운터, 앵무새 두 장면, 매달린 등
import { Rectangle, Texture } from 'pixi.js';

export interface ShopPiece { tex: Texture; x: number; y: number; w: number; h: number }
export interface ShopKit { day: ShopPiece; night: ShopPiece; counter: ShopPiece; parrot: [ShopPiece, ShopPiece]; lamp: ShopPiece }

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}

export const shopKitReady: Promise<ShopKit | null> = (async () => {
  try {
    const meta: Record<string, number[]> = await fetch(await artUrl('sprites/shop.json')).then((r) => r.json());
    const piece = async (name: string): Promise<ShopPiece> => {
      const im = await loadImg(await artUrl(`sprites/${name}.png`));
      const tex = Texture.from(im);
      tex.source.scaleMode = 'nearest';
      const [x, y, w, h] = meta[name];
      return { tex, x, y, w, h };
    };
    const [day, night, counter, p0, p1, lamp] = await Promise.all(['shop-room-day', 'shop-room-night', 'shop-counter', 'shop-parrot-0', 'shop-parrot-1', 'shop-lamp'].map(piece));
    return { day, night, counter, parrot: [p0, p1], lamp };
  } catch {
    return null;
  }
})();

/** 카운터 그림을 32px 세로 띠로 자른다 (띠마다 사람과 앞뒤를 따로 맞춘다) */
export function counterStrips(c: ShopPiece): { tex: Texture; x: number; y: number; sx: number }[] {
  const out: { tex: Texture; x: number; y: number; sx: number }[] = [];
  for (let u = 0; u < c.w; u += 32) {
    const w = Math.min(32, c.w - u);
    out.push({ tex: new Texture({ source: c.tex.source, frame: new Rectangle(u, 0, w, c.h) }), x: c.x + u, y: c.y, sx: c.x + u + w / 2 });
  }
  return out;
}
