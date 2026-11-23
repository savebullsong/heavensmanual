// 캐릭터 변형을 한 장의 시트로 뽑아 확인하는 도구
// node --experimental-strip-types tools/preview/preview.mjs out.json
import { writeFileSync } from 'node:fs';
import { characterPixels, parrotPixels, arrivalLook, SPRITE_W, SPRITE_H } from '../../apps/web/src/character.ts';

let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const looks = [
  { sex: 'f', build: 0, skin: 0, hair: 3, hairColor: 0, top: 0, bottom: 0 },
  { sex: 'f', build: 1, skin: 1, hair: 2, hairColor: 1, top: 1, bottom: 1 },
  { sex: 'f', build: 2, skin: 2, hair: 4, hairColor: 2, top: 2, bottom: 2 },
  { sex: 'm', build: 0, skin: 0, hair: 0, hairColor: 0, top: 3, bottom: 0 },
  { sex: 'm', build: 1, skin: 1, hair: 1, hairColor: 3, top: 4, bottom: 3 },
  { sex: 'm', build: 2, skin: 2, hair: 5, hairColor: 0, top: 0, bottom: 1 },
  { sex: 'f', build: 1, skin: 0, hair: 3, hairColor: 3, top: 0, bottom: 0, outfit: 'apron' },
  arrivalLook('raincoat', rnd), arrivalLook('patient', rnd), arrivalLook('child', rnd), arrivalLook('parrot', rnd),
];
const rows = [];
rows.push(looks.map((l) => characterPixels(l, 'front', 0)));
rows.push(looks.map((l) => characterPixels(l, 'back', 0)));
rows.push([0, 1, 2, 3].map((fr) => characterPixels(looks[0], 'front', fr)).concat([0, 1, 2, 3].map((fr) => characterPixels(looks[4], 'back', fr))));
writeFileSync(process.argv[2], JSON.stringify({ W: SPRITE_W, H: SPRITE_H, rows, parrot: [parrotPixels(false), parrotPixels(true)], PW: 16, PH: 18 }));
