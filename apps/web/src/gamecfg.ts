/**
 * 50차 관리자가 고치는 게임 설정 — 서버(game_config)에서 읽어 오고, 없거나 못 읽으면 기본값.
 * drops: 층마다 물건이 떨어질 확률 · 템브라 파편 확률 · 노전 배수 · 괴물별 노전 폭 · 보상 물건 무게(0이면 뺌, 없던 것은 더함)
 * bank : 현실 은행 연 금리(태국 · 한국, %) — 한 달에 한 번 관리자가 바꾼다
 */
import { fetchConfig } from './net.ts';

export interface FloorDrop {
  /** 보통 괴물이 물건을 떨어뜨릴 확률 (0~1) */ item?: number;
  /** 사나운 괴물 */ elite?: number;
  /** 템브라 파편 (보통 괴물) */ shard?: number;
  /** 템브라 파편 (층주) */ shardBoss?: number;
  /** 노전 배수 */ cashMul?: number;
  /** 괴물 키마다 노전 폭 [최소, 최대] (층 배수 · 사나움 배수는 그 위에 곱한다) */ cash?: Record<string, [number, number]>;
  /** 보상 물건 무게: 물건 키 → 무게 (0이면 빼고, 목록에 없던 것은 더한다) */ items?: Record<string, number>;
}
export interface DropCfg { floors?: Record<string, FloorDrop>; /** 필드 보스 파편 하나하나가 떨어질 확률 */ fbShard?: number }
export interface BankCfg { /** 태국 연 금리 % */ th?: number; /** 한국 연 금리 % */ kr?: number; /** 적용한 달 (YYYY-MM) */ month?: string }

import { DROP_DEFAULT, BANK_DEFAULT } from './cfgdefaults.ts';
export { DROP_DEFAULT, BANK_DEFAULT };

let drops: DropCfg = {};
let bank: BankCfg = {};

export function dropCfg(f: number) {
  const c = drops.floors?.[String(f)] ?? {};
  return {
    item: num(c.item, DROP_DEFAULT.item), elite: num(c.elite, DROP_DEFAULT.elite),
    shard: num(c.shard, DROP_DEFAULT.shard), shardBoss: num(c.shardBoss, DROP_DEFAULT.shardBoss),
    cashMul: num(c.cashMul, DROP_DEFAULT.cashMul), cash: c.cash ?? {}, items: c.items ?? {},
  };
}
export function fbShardRate() { return num(drops.fbShard, DROP_DEFAULT.fbShard); }
export function bankRates() { return { th: num(bank.th, BANK_DEFAULT.th), kr: num(bank.kr, BANK_DEFAULT.kr) }; }
function num(v: unknown, d: number) { return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d; }

/** 처음 한 번, 그 뒤 10분마다 다시 읽는다 */
export async function loadGameCfg() {
  const [d, b] = await Promise.all([fetchConfig('drops'), fetchConfig('bank')]);
  if (d && typeof d === 'object') drops = d as DropCfg;
  if (b && typeof b === 'object') bank = b as BankCfg;
}
export function startGameCfg() {
  void loadGameCfg();
  setInterval(() => void loadGameCfg(), 10 * 60 * 1000);
}
