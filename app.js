// 데이터 소스 — 같은 repo의 data/ 디렉토리
const DATA_BASE = './data';
const IMG_BASE = 'https://raw.githubusercontent.com/jaycekim92/kbo-dduksang-dashboard/main/data/players';
const CARD_BASE = 'https://raw.githubusercontent.com/jaycekim92/kbo-dduksang-images/main/images';

// 사용자 픽 명단 (style_profile 기반 — 추후 자동 추출 가능)
const USER_PICKS = new Set([
  '박성한','문현빈','류지혁','페라자','오스틴','박준순','최정','레이예스',
  '이우성','박건우','최형우','천성호','박민우','디아즈','김현수','김선빈',
  '박찬호','최원준','카메론','강백호','나성범','김주원','안치홍','김호령',
  '김지찬','장성우','문성주','노진혁','한준수','문보경'
]);

async function fetchJSON(path) {
  try {
    const r = await fetch(`${DATA_BASE}/${path}?t=${Date.now()}`);
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } catch (e) {
    console.error(`Fetch ${path} 실패:`, e);
    return null;
  }
}

function fmtDate(s) { return s ? s.replace(/-/g, '.') : '-'; }

async function init() {
  // 1. ops_cache 로드
  const ops = await fetchJSON('latest.json');
  const stats = await fetchJSON('stats.json');

  if (!ops) {
    document.getElementById('updated').textContent = '데이터 로드 실패';
    return;
  }

  document.getElementById('updated').textContent = `${fmtDate(ops.date)} (외부 갱신: 09:30 KST)`;

  // 2. 시스템 상태
  renderHealth(ops);

  // 3. 누적 성적
  await renderStats(stats);

  // 4. 오늘의 떡상픽
  await renderTodayPick(ops);

  // 5. 최근 이동 신호 (trade_status)
  await renderTrade();

  // 6. 풀 그리드 (trade 정보로 부상자 표시)
  renderPool(ops);

  // 7. 최근 7일
  await renderRecent();

  // 8. 적중률 시계열 차트
  await renderHitChart();

  // 9. Mermaid 렌더
  mermaid.initialize({ startOnLoad: true, theme: 'dark', themeVariables: { background: '#0d1117' }});
}

async function renderTrade() {
  const trade = await fetchJSON('trade_status.json');
  if (!trade) {
    document.getElementById('trade-summary').innerHTML = '<div style="color:#8b949e">데이터 없음</div>';
    return;
  }
  // 상태별 카운트
  const counts = {};
  Object.values(trade.status).forEach(s => { counts[s.status] = (counts[s.status]||0) + 1; });
  const labels = {
    injured: '🤕 부상자', injured_long: '🏥 장기재활',
    released: '🔴 방출/웨이버', military: '🪖 군보류',
    registered: '🟢 1군 등록', transferred: '⚡ 트레이드'
  };
  const summary = Object.entries(counts).map(([k,v]) =>
    `<div class="trade-chip"><span class="num">${v}</span><span class="lbl">${labels[k]||k}</span></div>`
  ).join('');
  document.getElementById('trade-summary').innerHTML = summary;

  // 최근 7일 표
  const cutoff = new Date(Date.now() - 7*86400000).toISOString().slice(0,10);
  const recent = trade.rows.filter(r => r.date >= cutoff && r.item !== '등번호 변경').slice(0, 30);
  const tbody = document.querySelector('#trade-table tbody');
  tbody.innerHTML = recent.length ? recent.map(r => {
    const itemCls = r.item.includes('부상') || r.item.includes('재활') ? 'injured' :
                    r.item.includes('웨이버') || r.item.includes('자유계약') ? 'released' :
                    r.item.includes('추가 등록') ? 'registered' : '';
    return `<tr class="${itemCls}">
      <td>${fmtDate(r.date)}</td>
      <td>${r.item}</td>
      <td>${r.team}</td>
      <td>${r.name} <span class="pos">(${r.position})</span></td>
      <td>${r.note || '-'}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="5" style="text-align:center;color:#8b949e">최근 7일 이동 없음</td></tr>';
}

async function renderHitChart() {
  // 최근 30일 results — 미확정 포함 (회색 점)
  const dates = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0,10));
  }
  const results = await Promise.all(dates.map(d => fetchJSON(`results/${d}.json`)));
  const points = [];
  let hits = 0, confirmed = 0;
  for (let i = 0; i < dates.length; i++) {
    const r = results[i];
    if (!r || !r.dduksang) continue;
    const h = r.dduksang.hit;
    const isUnknown = h === null || h === undefined;
    if (!isUnknown) {
      confirmed++;
      if (h === true) hits++;
    }
    points.push({
      x: dates[i],
      y: confirmed ? (hits / confirmed * 100) : 0,
      hit: h,
      isUnknown,
      name: r.dduksang.name,
    });
  }
  if (points.length === 0) return;
  // 기존 차트 인스턴스 destroy (중복 방지)
  const canvas = document.getElementById('hitChart');
  if (canvas.__chart) canvas.__chart.destroy();
  const ctx = canvas.getContext('2d');
  canvas.__chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: points.map(p => p.x.slice(5)),
      datasets: [{
        label: '누적 적중률 (% — 확정분만)',
        data: points.map(p => p.y),
        borderColor: '#58a6ff',
        backgroundColor: 'rgba(88, 166, 255, 0.1)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: points.map(p =>
          p.isUnknown ? '#6e7681' : (p.hit ? '#3fb950' : '#f85149')
        ),
        pointBorderColor: points.map(p =>
          p.isUnknown ? '#6e7681' : (p.hit ? '#3fb950' : '#f85149')
        ),
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#e6edf3' } },
        tooltip: {
          callbacks: {
            label: (c) => {
              const p = points[c.dataIndex];
              const mark = p.isUnknown ? '⏰ 미확정' : (p.hit ? '✅ 적중' : '❌ 미스');
              return `${p.name} ${mark} (누적 ${c.parsed.y.toFixed(0)}%)`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' } },
        y: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' }, min: 0, max: 100 }
      }
    }
  });
}

function renderHealth(ops) {
  const today = new Date().toISOString().slice(0,10);
  const isFresh = ops.date === today;
  const items = [
    { name: 'ops-fetch (09:30)', value: isFresh ? '✅ 정상' : '⚠️ 어제 데이터', cls: isFresh ? 'ok' : 'warn' },
    { name: '풀 사이즈', value: `${ops.pool_size}명`, cls: 'ok' },
    { name: 'routine 봇 (11:00)', value: '⏰ 대기', cls: 'ok' },
    { name: '슬랙 발송', value: '⏰ 대기', cls: 'ok' },
  ];
  document.getElementById('health').innerHTML = items.map(i =>
    `<div class="health-item"><div class="name">${i.name}</div><div class="value ${i.cls}">${i.value}</div></div>`
  ).join('');
}

async function renderStats(stats) {
  if (!stats) {
    document.getElementById('stats').innerHTML = '<div class="stat-box"><div class="num">-</div><div class="label">데이터 없음</div></div>';
    return;
  }
  // results 받아 미확정 카운트
  let unknown = 0, miss = 0;
  const dates = [];
  for (let i = 60; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0,10));
  }
  const allResults = await Promise.all(dates.map(d => fetchJSON(`results/${d}.json`)));
  for (const r of allResults) {
    if (!r || !r.dduksang) continue;
    const h = r.dduksang.hit;
    if (h === null || h === undefined) unknown++;
    else if (h === false) miss++;
  }
  const rate = stats.total_days ? ((stats.dduksang_hits / stats.total_days) * 100).toFixed(0) : 0;
  document.getElementById('stats').innerHTML = `
    <div class="stat-box"><div class="num">${rate}%</div><div class="label">누적 적중률</div></div>
    <div class="stat-box"><div class="num">${stats.dduksang_hits}/${stats.total_days}</div><div class="label">적중/시도</div></div>
    <div class="stat-box"><div class="num">${stats.dduksang_streak || 0}</div><div class="label">현재 연속</div></div>
    <div class="stat-box"><div class="num" style="color:#8b949e">${unknown}</div><div class="label">미확정<br/><span style="font-size:10px">박스스코어 페치 실패</span></div></div>
  `;
}

async function renderTodayPick(ops) {
  const pick = await fetchJSON(`picks/${ops.date}.json`);
  const el = document.getElementById('today-pick');
  if (!pick) {
    el.innerHTML = '<div style="color:#8b949e">오늘 떡상픽 아직 생성 안 됨 (11:00 KST 예정)</div>';
    return;
  }
  const d = pick.dduksang;
  const by = String(d.birth_year || '').slice(-2);
  el.innerHTML = `
    <img src="${CARD_BASE}/${pick.date}.jpg" onerror="this.style.display='none'">
    <div class="pick-info">
      <div class="name">${d.name}</div>
      <div class="meta">${d.team} · ${by}년 ${d.chinese} · ${d.zodiac} · OPS ${d.ops}</div>
      <div class="reason">${pick.day_pillar || ''}</div>
      <div class="reason" style="margin-top:8px;color:#8b949e;font-size:13px">${(d.reason || '').slice(0, 200)}${d.reason && d.reason.length > 200 ? '...' : ''}</div>
    </div>
  `;
}

function renderPool(ops) {
  const grid = document.getElementById('pool-grid');
  document.getElementById('pool-count').textContent = `(${ops.pool_size}명)`;

  const render = (filter) => {
    const items = ops.pool.filter(p => {
      if (filter === 'all') return true;
      if (filter === 'user') return USER_PICKS.has(p.name);
      if (filter === 'auto') return !USER_PICKS.has(p.name);
      if (filter === 'new') return p.is_new;
      if (filter === 'injured') return p.status === 'injured';
    });
    grid.innerHTML = items.map(p => {
      const by = String(p.birth_year || '').slice(-2);
      const classes = [];
      if (p.is_new) classes.push('is-new');
      if (p.status === 'injured') classes.push('is-injured');
      if (!p.in_hermes) classes.push('is-preserved');
      const pickType = USER_PICKS.has(p.name) ? '🟢' : '🟡';
      const statusBadge = p.status === 'injured' ? '<span class="badge injured">🤕 부상</span>' :
                          !p.in_hermes ? '<span class="badge preserved">⏸ 보존</span>' : '';
      return `<div class="pool-item ${classes.join(' ')}" title="${p.status_reason || ''}">
        <img src="${IMG_BASE}/${encodeURIComponent(p.name)}.jpg" onerror="this.style.background='#21262d';this.style.minHeight='110px'">
        <div class="info">
          <div class="name">${pickType} ${p.name} ${statusBadge}</div>
          <div class="meta">${p.team} · ${by}년 ${p.chinese}</div>
          <div class="ops">OPS ${p.ops?.toFixed(3) || '-'}</div>
        </div>
      </div>`;
    }).join('');
  };

  render('all');
  document.querySelectorAll('.filters button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filters button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render(btn.dataset.filter);
    });
  });
}

async function renderRecent() {
  const tbody = document.querySelector('#recent-table tbody');
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0,10);
    const pick = await fetchJSON(`picks/${date}.json`);
    if (!pick) continue;
    const result = await fetchJSON(`results/${date}.json`);
    const hit = result?.dduksang?.hit;
    const hits = result?.dduksang?.hits ?? '-';
    const ab = result?.dduksang?.ab ?? '-';
    const status = result ? (hit ? '<span class="hit">✅ 적중</span>' : '<span class="miss">❌ 불발</span>') : '<span style="color:#8b949e">⏰ 대기</span>';
    rows.push(`<tr>
      <td>${fmtDate(date)}</td>
      <td><strong>${pick.dduksang.name}</strong></td>
      <td>${pick.dduksang.team}</td>
      <td>${pick.dduksang.ops?.toFixed(3)}</td>
      <td>${ab === '-' ? '-' : `${ab}타수 ${hits}안타`}</td>
      <td>${status}</td>
    </tr>`);
  }
  tbody.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="6" style="text-align:center;color:#8b949e">데이터 없음</td></tr>';
}

init();
