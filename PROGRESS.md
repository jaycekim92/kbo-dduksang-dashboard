# 대시보드 진행 상황

> KBO 떡상픽 운영 대시보드 (kbo-dduksang-dashboard)
> 마지막 갱신: 2026-06-02

## URL

- 라이브: https://jaycekim92.github.io/kbo-dduksang-dashboard/
- 코드: https://github.com/jaycekim92/kbo-dduksang-dashboard
- 부모 시스템 (private): https://github.com/jaycekim92/kbo-dduksang-tracker

---

## 작업 이력

### 1단계 — 인프라 (2026-05-26)
- public repo `kbo-dduksang-dashboard` 생성
- GitHub Pages 활성화 (main branch / root)
- 기본 페이지: `index.html` (구조) / `app.js` (fetch+렌더) / `style.css` (다크 테마)

### 2단계 — 데이터 sync 자동화 (2026-05-26~)
- `scripts/sync_dashboard.py` 신규 (private repo)
- `ops-fetch.yml` + `slack-notify.yml` 끝에 sync 단계 추가
- 동기화 대상:
  - `data/latest.json` (오늘 풀 + OPS)
  - `data/picks/YYYY-MM-DD.json` (일별 떡상픽)
  - `data/results/YYYY-MM-DD.json` (일별 결과)
  - `data/pool_snapshots/YYYY-MM-DD.json` (일별 풀 누적)
  - `data/players/{name}.jpg` (600px 리사이즈)
  - `data/stats.json` (누적 적중률)

### 3단계 — trade_status 통합 (2026-06-02)
- `scripts/fetch_trade_status.py` 신규 (Playwright로 KBO Trade.aspx 파싱)
- `data/trade_status.json` 추가
- 풀 결정 룰 보강 → 박동원 케이스 안전망

---

## 현재 상태

### 인프라
- ✅ Pages built/success
- ✅ 최근 deploy: 2026-06-02 02:13 UTC
- ✅ 자동 deploy (main push 감지)

### 데이터 커버리지 (132개 파일)
| 항목 | 개수 | 기간 |
|---|---|---|
| picks | 28 | 4/28 ~ 6/2 |
| results | 23 | 일부 누락 (5/27·28·30·31 등) |
| pool_snapshots | 30 | 전체 일자 |
| players 사진 | 41장 | 활성 32 + 이탈 9 |
| trade_status | 60명 | 신규 (6/2~) |

### UI 컴포넌트 (구현됨)
- 시스템 상태 카드
- 누적 성적 카드 (Chart.js 시계열 자리)
- 오늘의 떡상픽 카드 (mirror repo 이미지)
- 풀 그리드 + 필터 (전체/사용자픽/자동픽/신규)
- 최근 7일 픽 + 결과 테이블
- 시스템 흐름 다이어그램 (Mermaid)
- 파일 역할 표 (details)

---

## 다음 할 일

| 우선순위 | 항목 | 비고 |
|---|---|---|
| 🔴 | **라이브 페이지 사용자 검토** | 어색한 부분 수정 — 사용자 액션 대기 |
| 🟡 | **trade_status UI 표시** | 부상자 명단 섹션 / 최근 이동 신호 |
| 🟡 | **적중률 시계열 차트** | Chart.js 데이터 binding 활성화 (현재 빈 캔버스) |
| 🟢 | **results 누락 일자 보강** | routine이 results 누락하는 패턴 분석 |
| 🟢 | **모바일 최적화** | 현재 desktop 위주 |
| 🟢 | **풀 멤버 클릭 → 상세 페이지** | 그 선수 최근 OPS 추이 + 픽 히스토리 |

---

## 한계 / 결정 이력

- **이미지 mirror**: 카드는 `kbo-dduksang-images` (별도 public repo, 슬랙 unfurl 용)
- **선수 사진 600px**: 원본은 private의 1200px, UI용으로 리사이즈
- **trade_status 일 1회 갱신**: cron drift 5h 가정, KST 05:30~10:30 사이
- **사용자 픽 명단 hardcoded** (`app.js`의 `USER_PICKS`): 동적 추출 시 `style_profile.json` 활용 가능
- **private repo 데이터 노출**: picks/results/적중률 다 public. 운영 정보 노출 OK

---

## 관련 파일 (private repo `kbo-dduksang-tracker`)

| 파일 | 역할 |
|---|---|
| `scripts/sync_dashboard.py` | 매번 ops-fetch / slack-notify 끝에 호출 |
| `.github/workflows/ops-fetch.yml` | sync 단계 포함 |
| `.github/workflows/slack-notify.yml` | sync 단계 포함 (picks push 후) |

## 관련 파일 (public repo `kbo-dduksang-dashboard`)

| 파일 | 역할 |
|---|---|
| `index.html` | 페이지 구조 |
| `app.js` | 데이터 fetch + 렌더 |
| `style.css` | 다크 테마 |
| `data/` | sync된 모든 데이터 |
