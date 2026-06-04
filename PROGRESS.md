# 대시보드 진행 상황

> KBO 떡상픽 운영 대시보드 (kbo-dduksang-dashboard)
> 마지막 갱신: 2026-06-04

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

### 4단계 — 미확정(null) 처리 정합성 + 배포 인증 (2026-06-04)
- 라이브 검토 → "미확정(`hit=null`) 처리가 화면마다 달랐던" 신뢰 문제 수정 (`app.js`):
  - 최근 7일 테이블: `hit=null`을 ⏰미확정으로 분리 (기존엔 ❌불발로 오표시)
  - 누적 적중률 분모를 전체일수 → **확정분(전체−미확정)**으로 교체 → 차트와 정합 (33%→50%)
  - 시스템 상태: 오늘 픽 파일 존재 여부로 routine/슬랙 상태 동적 판정 (하드코딩 ⏰대기 제거)
- 배포 인증: HTTPS 토큰 무효 → **SSH(ed25519) 전환 완료**. 이후 재인증 없이 push 가능.

---

## 현재 상태

### 인프라
- ✅ Pages built/success
- ✅ 최근 deploy: 2026-06-04 (app.js 미확정 처리 수정 반영)
- ✅ 자동 deploy (main push 감지)
- ✅ push 인증: SSH(remote=git@github.com) — 무암호 ed25519

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

## 발견점 (검토 2026-06-02)

### 🟢 잘 작동
- Pages built/success — 매번 push 후 자동 deploy (5-30초)
- sync_dashboard.py 매일 자동 동기화 정상 (commit 누적)
- trade_status.json 첫 도입일에 정상 통합 (60명 상태 추출)
- 박준순 status=injured 자동 표시 (Trade 5/26 부상자 명단)

### 🟡 개선 필요
- **results 5일 누락** (5/3·5/27·5/28·5/30·5/31 등): picks는 존재하지만 results 없음
  - 가능성: 휴식일 / routine이 결과 기록 실패 / 또는 의도된 스킵
  - 영향: 최근 7일 테이블의 "결과" 컬럼이 "⏰ 대기"로 표시됨
  - 조치 필요: routine 로그 분석 또는 routine 보강
- **사진 잔존**: 부상/이탈 멤버 9명 사진이 `data/players/`에 남음 (노진혁·문보경·한준수·문성주·데일·박찬호 등)
  - 영향: UI엔 안 보임 (latest.json의 pool만 렌더)
  - 의도된 동작: 복귀 시 재사용 → 그대로 유지
- **pool_snapshots 사이즈 차이**: 5/26 이전 4KB → 5/26부터 10KB
  - 원인: 동적 풀 전환 시점. 이전엔 29명+baseline, 이후 32명+diff+띠/별자리
  - 정상 — 호환성 유지됨

### 🟢 신규 활용 가능
- **trade_status UI 표시**: 부상자 명단 / 최근 이동 신호 별도 섹션 추가하면 운영 가시성 ↑
- **stats 시계열**: 캔버스 자리만 잡혀있고 Chart.js 데이터 binding 미구현. 적중률 추이 그래프 가치 큼
- **풀 변동 history**: pool_snapshots 30일치 누적 → 선수별 진입/이탈 timeline 가능

---

## 다음 할 일

| 우선순위 | 항목 | 비고 |
|---|---|---|
| ✅ | ~~trade_status UI 표시~~ | 완료 (2026-06-02) — 최근 이동 신호 섹션 + 부상자 필터 |
| ✅ | ~~적중률 시계열 차트~~ | 완료 (2026-06-02) — Chart.js 30일 누적 + 일별 점 |
| ✅ | ~~라이브 페이지 검토 + 미확정 처리 수정~~ | 완료 (2026-06-04) — null→미확정 분리, 적중률 분모 확정분, 상태판 동적화 |
| 🟡 | **stats.json hits 백필 정합** | `stats.json` hits가 results 실제 true 수보다 1 적음 → 헤드라인(50%) vs 차트 자체집계(55%) 잔차. **tracker routine** 쪽 수정 필요 (대시보드 코드로는 못 잡음) |
| 🟡 | **results 누락 자동 백필** | 5일 누락 (5/8·12·16·17·19) — hermes `game/list.json` 응답 구조 다름. 박스스코어 endpoint 추가 추적 필요 |
| 🟢 | **결장(0타수) 처리 룰** | 6/2 심우준 "0타수"인데 ❌불발 표시. 결장은 미스 아닌 별도 상태로 정의 필요 |
| 🟢 | **이동 신호 섹션 의미 정리** | 헤더는 "최근 이동 신호"인데 칩은 전체 누적상태 카운트(부상자 30 등) — 의미 불일치 |
| 🟢 | **모바일 최적화** | 현재 desktop 위주 |
| 🟢 | **풀 멤버 클릭 → 상세 페이지** | 그 선수 최근 OPS 추이 + 픽 히스토리 |
| 🟢 | **사용자 픽 명단 동적 추출** | `app.js`의 USER_PICKS hardcoded → style_profile.json 활용 |

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
