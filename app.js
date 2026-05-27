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
  renderStats(stats);

  // 4. 오늘의 떡상픽
  await renderTodayPick(ops);

  // 5. 풀 그리드
  renderPool(ops);

  // 6. 최근 7일
  await renderRecent();

  // 7. Mermaid 렌더
  mermaid.initialize({ startOnLoad: true, theme: 'dark', themeVariables: { background: '#0d1117' }});
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

function renderStats(stats) {
  if (!stats) {
    document.getElementById('stats').innerHTML = '<div class="stat-box"><div class="num">-</div><div class="label">데이터 없음</div></div>';
    return;
  }
  const rate = stats.total_days ? ((stats.dduksang_hits / stats.total_days) * 100).toFixed(0) : 0;
  document.getElementById('stats').innerHTML = `
    <div class="stat-box"><div class="num">${rate}%</div><div class="label">누적 적중률</div></div>
    <div class="stat-box"><div class="num">${stats.dduksang_hits}/${stats.total_days}</div><div class="label">적중/시도</div></div>
    <div class="stat-box"><div class="num">${stats.dduksang_streak || 0}</div><div class="label">연속 적중</div></div>
    <div class="stat-box"><div class="num">${stats.max_streak || stats.dduksang_streak || 0}</div><div class="label">최장 연속</div></div>
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
    });
    grid.innerHTML = items.map(p => {
      const by = String(p.birth_year || '').slice(-2);
      const cls = p.is_new ? 'is-new' : '';
      const pickType = USER_PICKS.has(p.name) ? '🟢' : '🟡';
      return `<div class="pool-item ${cls}">
        <img src="${IMG_BASE}/${encodeURIComponent(p.name)}.jpg" onerror="this.style.background='#21262d';this.style.minHeight='110px'">
        <div class="info">
          <div class="name">${pickType} ${p.name}</div>
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
