# Heaven's Manual

현실·천국·지옥 세 세계를 오가는 현실 배경 2D 도트 웹 MMO. 기획 기준 문서는 「Heaven's Manual 통합 기획서 v1」입니다.

## 지금 상태: 1단계-A (입구) — 11월 23일 개정

- 첫 장면은 우주새 상점 안. 거리와 같은 축척(타일 64×32, 사람 72×144)의 등각 방이며, 확대한 그림은 없음
- 미스 황을 눌러 말을 검. 주요 인물은 일본 RPG식으로 인물 그림을 크게 세우고, 일반 NPC는 글상자만 씀
- 상품: 소비품(감자칩·초콜릿·콜라·물·밧줄·붕대), 무기(쇠파이프·장도리·식칼·삽·야구 배트·손도끼·단검·장검·권총·권총탄), 방어구(헬멧·보호 재킷·방호 조끼·작업 장갑·작업 바지·정강이 보호대·안전화). 무기와 방어구는 두 번째 방문부터
- 처음 들어온 사람은 몸이 없는 영혼(회색, 반투명). 문으로 나가려 하면 앵무새가 말을 하고, 몸을 고르면 현실로 나감 (카르마 0 귀신의 환생과 같은 장면)
- 거리의 우주새 건물에는 간판이 없음. 건물을 누르거나 마우스를 올리면 '우주새 상점' 이름표가 뜨고, 걸어 들어감
- 관리자 페이지 `/admin`: 주요 인물 7칸(미스 황·황색날개·황혼·앵무새·루엔·파샤르·염소대왕)의 그림을 올리고 되돌림. 그림은 Vercel Blob에 저장
- 수쿰빗 실제 지도(나나–아속–프롬퐁), 행인, 차량 경적, 방콕 실시간 낮밤(`?hour=21`), 기기 언어 우선(한국어·태국어·영어)
- 공용 규칙 코드: 카르마 판정, 행위별 점수표, 영격 곡선(800 × n^1.7), 기적 확률, 위험 상태와 차량 충돌

## 폴더 구조

```
apps/web/            웹 클라이언트 (Vite + TypeScript + PixiJS 8)
  src/main.ts        장면 전환과 대화 흐름: 상점 → (앵무새·몸 고르기) → 거리
  src/shoproom.ts    우주새 상점 안 (등각 방, 미스 황·앵무새·문)
  src/shopgfx.ts     상점 벽·바닥·진열대·카운터 그리기
  src/dialog.ts      대화창 (주요 인물 그림 + 타자 효과 + 선택지)
  src/portraits.ts   인물 그림 칸과 기본 그림, 관리자가 바꾼 그림 불러오기
  src/items.ts       상품 목록과 32×32 아이콘
  src/lookpanel.ts   외형 고르기 창 (게임 화면의 캐릭터가 바로 바뀜)
  src/admin.ts       관리자 페이지 (admin.html)
  src/world.ts       현실 세계 (PixiJS)
  src/character.ts   실제 체형 캐릭터 도트 생성기 (72×144px)
  src/raster.ts      도트 래스터 엔진 (원통형 음영, 셀아웃 외곽선)
  src/gfx.ts         지형 조각, 건물, 소품, 차량 그리기
  src/zone.ts        존 데이터 형식, 수쿰빗 시험 구역, 길찾기
  src/clock.ts       방콕 실시간 시계와 낮밤
  src/i18n.ts        다국어 문구
  api/portraits.ts   인물 그림 API (Vercel 함수, 비밀번호 = 환경변수 ADMIN_PASSWORD)
  public/portraits/  기본 인물 그림
  test/              API 확인
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
API 확인: `cd apps/web && node --experimental-test-module-mocks --experimental-strip-types --test test/portraits.test.mjs`

관리자 페이지가 그림을 저장하려면 Vercel 프로젝트에 Blob 저장소를 연결하고(환경변수 `BLOB_READ_WRITE_TOKEN`), 환경변수 `ADMIN_PASSWORD`를 넣어야 합니다.

## 실제 수쿰빗 지도 넣기

1. openstreetmap.org 에서 수쿰빗 구간을 화면에 맞춘 뒤 상단의 '내보내기(Export)' → '내보내기' 버튼으로 `.osm` 파일을 받습니다. (아속~프롬퐁 정도의 작은 범위)
2. `node tools/osm-convert/convert.mjs 받은파일.osm apps/web/public/zones/bkk-sukhumvit.json --id bkk-sukhumvit --tile 3`
3. 변환기는 큰길을 가로축에 맞춰 돌리고, 정부시설을 간판 없는 일반 건물로 바꾸고, 지도 가운데 가게 하나를 우주새로 정합니다. 서울 강남은 `--keep-right` (우측통행).

지도 데이터: © OpenStreetMap 기여자, ODbL. 게임 화면과 사이트에 출처를 표기해야 합니다.

## 다음: 1단계-B (현실 생존)

노동(최저임금 = 현실 시간), 편의점·약국 회복, 불량배 인간몹, 봉합자, PK와 선제공격 표시, 영구사망과 사후 판정, 사고사(체력 25% 이하 위험 상태에서 차에 치이면 사망), 프로필과 신고, 실시간 서버(Node.js + Colyseus, 존 = 방), Supabase 저장.
