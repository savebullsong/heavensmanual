// 29차: 우리가 그리는 2D 캔버스는 모두 메모리 쪽에 둔다 (willReadFrequently).
// 건물 가림 판정·사람 색 입히기·층 얼룩처럼 다 그린 그림을 다시 읽을 때(getImageData), 그래픽 카드 쪽 캔버스면
// 읽을 때마다 그래픽 카드가 멈춘다(GPU stall due to ReadPixels) — 고층 건물이 빽빽한 곳에서 크게 버벅이던 까닭 중 하나.
// 게임 화면(WebGL)은 그대로 그래픽 카드로 그린다
const orig = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, opts?: Record<string, unknown>) {
  if (type === '2d') opts = { willReadFrequently: true, ...(opts ?? {}) };
  return (orig as (t: string, o?: unknown) => RenderingContext | null).call(this, type, opts);
} as typeof orig;
export {};
