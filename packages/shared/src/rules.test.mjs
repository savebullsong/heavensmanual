// node --experimental-strip-types 로 rules.ts 를 직접 불러와 확인한다
import assert from 'node:assert/strict';
import { judge, hellFloor, evilRatio, addSoulExp, soulExpToNext, applyDeed, carHit, maxHp, isDanger, resurrectionChance, critChance } from './rules.ts';

assert.deepEqual(judge({ good: 0, evil: 0 }), { world: 'border' });
assert.deepEqual(judge({ good: 5, evil: 5 }), { world: 'border' });
assert.equal(judge({ good: 9, evil: 1 }).world, 'heaven');
assert.deepEqual(judge({ good: 100, evil: 0 }), { world: 'heaven' });
assert.equal(hellFloor(51), 1);
assert.equal(hellFloor(60), 3);
assert.equal(hellFloor(90), 11);
assert.equal(hellFloor(100), 13);
assert.deepEqual(judge({ good: 0, evil: 3 }), { world: 'hell', floor: 13 });
assert.deepEqual(judge({ good: 4, evil: 6 }), { world: 'hell', floor: 3 });
assert.equal(evilRatio({ good: 1, evil: 3 }), 75);
const up = addSoulExp(1, 0, 800);
assert.equal(up.rank, 2);
assert.equal(up.statPoints, 2);
assert.equal(addSoulExp(1, 0, 799).rank, 1);
assert.equal(soulExpToNext(10), 40095);
// 행위
let r = applyDeed({ good: 0, evil: 0 }, 'thugDown');
assert.deepEqual(r, { deeds: { good: 0.6, evil: 0 }, exp: 30 }); // 선행·악행은 ×0.2로 아주 적게 쌓인다
r = applyDeed(r.deeds, 'firstStrike');
assert.deepEqual(r.deeds, { good: 0.6, evil: 0.4 });
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
