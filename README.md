# Heaven's Manual

현실·천국·지옥 세 세계를 오가는 현실 배경 2D 도트 웹 MMO. 기획 기준 문서는 「Heaven's Manual 통합 기획서 v1」입니다.

## 지금 상태: 1단계-A (입구) 완료 · 1단계-B (현실 생존) 진행 중 — 11월 23일 3차 개정

### 1단계-A (입구)


- 리니지 초기 크기: 어른 키 약 40px(아이 약 28px), 3/4 시점 대각선 4방향(좌우 뒤집기), 걷기 4장면. 차는 약 30px, 건물 1층은 사람보다 높게
- 첫 장면은 우주새 상점 안 (거리와 같은 축척). 물건은 카운터 뒤, 미스 황 뒤쪽 진열장에 입체로 진열 (상자·캔·병·봉지·밧줄·헬멧·옷·신발), 무기는 카운터 뒤 벽 걸이판, 마네킹, 창 아래 의자·화분·우산꽂이
- 처음 모습은 무작위: 우비(얼굴 가려짐) · 환자복과 머리 붕대 · 남성 · 여성 · 아이 · 앵무새 옷, 드물게(3%) 광채가 일렁이는 남성·여성
- 미스 황은 처음 모습을 보고 한마디 함. 무기와 방어구는 첫 방문부터 살 수 있음
- 문으로 나가면 "…나는 누구였지." 혼잣말 뒤 이번 생의 모습(성별·체격·피부·헤어·머리색·옷·차림)과 지역(방콕 · 수쿰빗 / 서울 · 강남 준비 중)을 고름. 아이로 왔어도 거리로 나가는 몸은 어른, 광채는 남음
- 거리의 우주새 건물에는 간판이 없음. 건물을 누르면 '우주새 상점' 이름표가 뜨고 걸어 들어감
- 대화: 주요 인물은 일본 RPG식 인물 그림, 혼잣말은 이름표 없이 기울인 글씨
- 관리자 페이지 `/admin`: 주요 인물 7칸 그림 교체 (Vercel Blob)
- 시험용 주소: `?newlife` 새 영혼으로 다시 시작, `?form=raincoat|patient|man|woman|child|parrot|auraMan|auraWoman` 처음 모습 고정, `?hour=21` 시각
- 공용 규칙 코드: 카르마 판정, 행위별 점수표, 영격 곡선(800 × n^1.7), 기적 확률, 위험 상태와 차량 충돌

### 1단계-B (현실 생존) — 이번에 들어간 것

- 걷는 모습: 몸통·다리·팔이 모두 걷는 방향으로 같이 돌아감 (가까운 쪽 크게, 먼 쪽 어둡고 작게)
- 건물 깊이: 건물을 32px 세로 띠로 잘라 띠마다 앞뒤를 따로 계산. 건물 바닥 칸은 못 걸음. 캐릭터가 건물·기둥 뒤에 가려지면 그 부분만 반투명
- 간판: 그냥 '상점' 대신 칸마다 다른 이름 (예: 할머니 잡화점, 골목 약국). 한국어·태국어·영어 각각 어순에 맞게
- 내 캐릭터 표시: 발밑 금색 고리와 머리 위 화살표 (범죄 표시 중엔 빨강)
- 대상 메뉴: 사람을 누르면 말 걸기 · 살펴보기 · 강제 공격, 불량배는 공격하기. Ctrl/Shift/⌘ + 클릭 = 메뉴 없이 강제 공격. 이름 있는 가게는 들어가기·일하기
- 싸움: 체력 막대, 치명타, 쓰러짐. 불량배는 밤에 더 멀리서 덤빔. 행인을 먼저 치면 악행 + 3분간 빨간 표시, 행인은 도망치며 소리침
- 돈: 쓰러진 사람이 떨어뜨린 돈을 주움 (행인 돈을 주우면 강도 악행). 일하기 = 방콕 최저임금 하루 ฿400 ÷ 8시간 = 시급 ฿50, 현실 시간으로 지급
- 차 사고: 차는 사람 앞에서 브레이크. 그래도 치이면 체력 30% 손해, 위험 상태(25% 이하)면 사망
- 죽음: 사인 → 이번 생의 선행·악행 → 판정(천국 / 지옥 n층 / 떠도는 영혼). 천국·지옥 문은 아직 닫혀 있어 우주새에서 새 모습으로 눈뜸. 영격은 유지
- 가방: 먹기·쓰기(체력 회복), 장착·빼기(공격·방어), 권총은 총알이 있을 때만 원거리
- 알림: 선행·악행·영혼 경험치·영격 상승
- 저장: 이 기기(localStorage)에 4초마다

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
  src/world.ts       현실 세계 (PixiJS): 행인·불량배, 싸움, 돈, 일하기, 차 사고, 가려짐 반투명
  src/names.ts       거리 가게 이름 짓기 (칸마다 고정, 3개 언어)
  src/character.ts   캐릭터 도트 생성기 (32×48 칸, 처음 모습 뽑기, 광채)
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

## 다음: 1단계-B 남은 것

봉합자(범죄자를 쫓는 집행자), 편의점·약국 회복 물건, 프로필과 신고, BTS 고가 선로(기둥 위 상판), 실시간 서버(Node.js + Colyseus, 싱가포르, 존 = 방), Supabase 저장(기기 저장 → 계정 저장), 천국 보너스 변환.
