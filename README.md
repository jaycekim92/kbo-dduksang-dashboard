# KBO 떡상픽 운영 대시보드

[👉 라이브 페이지](https://jaycekim92.github.io/kbo-dduksang-dashboard/)

private [kbo-dduksang-tracker](https://github.com/jaycekim92/kbo-dduksang-tracker)에서 동작하는 KBO 안타예측 자동화 봇의 운영 상태를 실시간으로 보여주는 페이지.

## 내용
- 📊 시스템 상태 (ops-fetch / refresh-players / routine / slack)
- 📈 누적 적중률 + 일별 시계열
- 🎯 오늘의 떡상픽 (카드 미리보기)
- 👥 오늘의 풀 (사이즈 가변, AVG≥.275 OR OPS≥.780 기준)
- 📋 최근 7일 픽 + 결과
- 🔄 시스템 흐름 (Mermaid)
- 📁 파일 역할 매핑

## 데이터 동기화

매일 09:30 KST `kbo-dduksang-tracker`의 ops-fetch.yml이 `data/`로 mirror push:
- `latest.json` — 오늘 풀 + OPS
- `stats.json` — 누적 적중률
- `picks/YYYY-MM-DD.json` — 일별 떡상픽
- `results/YYYY-MM-DD.json` — 일별 결과
- `players/[name].jpg` — 선수 사진 (UI용 작은 사이즈)
