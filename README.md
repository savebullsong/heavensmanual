# Heaven's Manual

현실·천국·지옥 세 세계를 오가는 현실 배경 2D 도트 웹 MMO. 기획 기준 문서는 「Heaven's Manual 통합 기획서 v1」입니다.

## 지금 상태: 1단계-A (입구)

- 우주새 상점: 미스 황과 유황앵무, 가상 상품 4종(브랜드 비표기), "돈이 없으면 나가서 돈을 버세요." → 나가기
- 두 번째 방문부터 식칼·야구 배트·장도리가 진열됨
- 캐릭터 만들기: 성별, 체격 3종, 피부 3종, 헤어 6종, 머리색 4종, 상의 5색, 하의 4색, 앞뒤 돌려 보기
- 수쿰빗 시험 구역: 대로 6차선(좌측통행), 중앙분리대 BTS 기둥, 횡단보도, 소이 2개, 업종명 간판 건물, 노점, 가로수
- 클릭 이동(8방향 길찾기), 걷기 애니메이션, 행인 NPC, 차량(사람이 앞에 있으면 서고 경적)
- 게임 시간 = 방콕 현재 시각. 밤에는 창문 불빛과 가로등이 켜짐 (`?hour=21` 로 미리보기)
- 방문자 기기 언어 우선(한국어·태국어·영어), 화면에서 바꾸기 가능
- 공용 규칙 코드: 카르마 백분율 → 천국/지옥 층/귀신 판정, 영격·스탯 (검증 스크립트 포함)

## 폴더 구조

```
apps/web/            웹 클라이언트 (Vite + TypeScript + PixiJS 8)
  src/main.ts        장면 전환: 상점 → 캐릭터 만들기 → 거리
  src/shop.ts        우주새 상점
  src/create.ts      캐릭터 만들기
  src/world.ts       현실 세계 (PixiJS)
  src/character.ts   실제 체형 캐릭터 도트 생성기 (72×144px)
  src/raster.ts      도트 래스터 엔진 (원통형 음영, 셀아웃 외곽선)
  src/gfx.ts         지형 조각, 건물, 소품, 차량 그리기
  src/zone.ts        존 데이터 형식, 수쿰빗 시험 구역, 길찾기
  src/clock.ts       방콕 실시간 시계와 낮밤
  src/i18n.ts        다국어 문구
packages/shared/     클라이언트와 서버가 함께 쓸 게임 규칙 (rules.ts)
tools/osm-convert/   OSM 내보내기 파일 → 존 JSON 변환기
tools/preview/       캐릭터 시트와 자동 플레이 확인 도구
```

## 실행

```
cd apps/web
npm install
npm run dev            # 개발 서버
npm run check          # 타입 검사
npm run build          # 배포용 빌드 (dist/)
npm run preview-single # 파일 하나짜리 미리보기 (dist-single/index.html)
```

규칙 검증: `node --experimental-strip-types packages/shared/src/rules.test.mjs`

## 실제 수쿰빗 지도 넣기

1. openstreetmap.org 에서 수쿰빗 구간을 화면에 맞춘 뒤 상단의 '내보내기(Export)' → '내보내기' 버튼으로 `.osm` 파일을 받습니다. (아속~프롬퐁 정도의 작은 범위)
2. `node tools/osm-convert/convert.mjs 받은파일.osm apps/web/public/zones/bkk-sukhumvit.json --id bkk-sukhumvit --tile 3`
3. 변환기는 큰길을 가로축에 맞춰 돌리고, 정부시설을 간판 없는 일반 건물로 바꾸고, 지도 가운데 가게 하나를 우주새로 정합니다. 서울 강남은 `--keep-right` (우측통행).

지도 데이터: © OpenStreetMap 기여자, ODbL. 게임 화면과 사이트에 출처를 표기해야 합니다.

## 다음: 1단계-B (현실 생존)

노동(최저임금 = 현실 시간), 편의점·약국 회복, 불량배 인간몹, 봉합자, PK와 선제공격 표시, 영구사망과 사후 판정, 사고사, 프로필과 신고, 실시간 서버(Node.js + Colyseus, 존 = 방), Supabase 저장.
