// node --experimental-strip-types 로 rules.ts 를 직접 불러와 확인한다
import assert from 'node:assert/strict';
import { judge, hellDepth, hellNeed, evilRatio, addSoulExp, soulExpToNext, applyDeed, carHit, maxHp, isDanger, resurrectionChance, critChance } from './rules.ts';

assert.deepEqual(judge({ good: 0, evil: 0 }), { world: 'border' });
assert.deepEqual(judge({ good: 5, evil: 5 }), { world: 'border' });
assert.equal(judge({ good: 9, evil: 1 }).world, 'heaven');
assert.deepEqual(judge({ good: 100, evil: 0 }), { world: 'heaven' });
// 25차: 1~3층은 쉽고, 4층부터는 한 생에 큰 악행을 많이 쌓아야
assert.equal(hellDepth({ good: 0, evil: 1 }), 1);
assert.equal(hellDepth({ good: 0, evil: 3 }), 2);
assert.equal(hellDepth({ good: 1, evil: 6 }), 3);
assert.equal(hellDepth({ good: 0, evil: 19 }), 3);
assert.equal(hellDepth({ good: 0, evil: 20 }), 4);
assert.equal(hellDepth({ good: 10, evil: 20 }), 3); // 비율 66%: 4층(70%)에 못 미친다
assert.equal(hellDepth({ good: 0, evil: 469 }), 13);
assert.equal(hellNeed(8).e, 81);
assert.deepEqual(judge({ good: 0, evil: 3 }), { world: 'hell', floor: 2 });
assert.deepEqual(judge({ good: 4, evil: 6 }), { world: 'hell', floor: 3 });
assert.equal(evilRatio({ good: 1, evil: 3 }), 75);
const up = addSoulExp(1, 0, 800);
assert.equal(up.rank, 2);
assert.equal(up.statPoints, 2);
assert.equal(addSoulExp(1, 0, 799).rank, 1);
assert.equal(soulExpToNext(10), 40095);
// 행위
let r = applyDeed({ good: 0, evil: 0 }, 'thugDown');
assert.deepEqual(r, { deeds: { good: 0, evil: 0 }, exp: 30 }); // 29차: 적대 NPC 처치는 경험치만 (선행 아님)
r = applyDeed(r.deeds, 'helpNpc');
assert.deepEqual(r, { deeds: { good: 0.6, evil: 0 }, exp: 40 }); // 선행·악행은 ×0.2로 아주 적게 쌓인다
r = applyDeed(r.deeds, 'firstStrike');
assert.deepEqual(r.deeds, { good: 0.6, evil: 0.4 });
// 29차: 사후 판정은 이번 생의 누적량만 — 선행 1000 · 악행 1001이면 지옥
assert.equal(judge({ good: 1000, evil: 1001 }).world, 'hell');
assert.equal(judge({ good: 1001, evil: 1000 }).world, 'heaven');
assert.equal(applyDeed({ good: 0, evil: 0 }, 'hellMonster', { floor: 7 }).exp, 70);
assert.deepEqual(applyDeed({ good: 1, evil: 1 }, 'labor').deeds, { good: 1, evil: 1 });
// 사고사: 위험 상태가 아니면 살아남고 위험 상태로 떨어진다, 위험 상태에서 치이면 사망
const M = maxHp(0);
assert.equal(M, 1000);
let h = carHit(1000, M);
assert.deepEqual(h, { hp: 700, dead: false });
h = carHit(260, M);
assert.equal(h.dead, false);
assert.ok(isDanger(h.hp, M));
assert.deepEqual(carHit(250, M), { hp: 0, dead: true });
assert.equal(resurrectionChance(0), 2);
assert.equal(resurrectionChance(99), 25);
assert.equal(critChance(99), 30);
console.log('rules: all checks passed');
