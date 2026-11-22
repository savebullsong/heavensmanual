// node --experimental-strip-types 로 rules.ts 를 직접 불러와 확인한다
import assert from 'node:assert/strict';
import { judge, hellFloor, evilRatio, addSoulExp } from './rules.ts';

assert.deepEqual(judge({ good: 0, evil: 0 }), { world: 'ghost' });
assert.deepEqual(judge({ good: 5, evil: 5 }), { world: 'ghost' });
assert.equal(judge({ good: 9, evil: 1 }).world, 'heaven');
assert.equal(judge({ good: 100, evil: 0 }).bonusSoulExp, 100);
assert.equal(hellFloor(51), 1);
assert.equal(hellFloor(60), 3);
assert.equal(hellFloor(90), 11);
assert.equal(hellFloor(100), 13);
assert.deepEqual(judge({ good: 0, evil: 3 }), { world: 'hell', floor: 13 });
assert.deepEqual(judge({ good: 4, evil: 6 }), { world: 'hell', floor: 3 });
assert.equal(evilRatio({ good: 1, evil: 3 }), 75);
const up = addSoulExp(1, 0, 1000);
assert.equal(up.rank, 2);
assert.equal(up.statPoints, 2);
console.log('rules: all checks passed');
