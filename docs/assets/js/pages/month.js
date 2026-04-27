// month.html — 月カレンダー

(function() {
  const REKICHU_ICONS = {
    '一粒万倍日': { glyph: '米', cls: '' },
    '天赦日':     { glyph: '☆', cls: 'star' },
    '大明日':     { glyph: '明', cls: '' },
    '不成就日':   { glyph: '×', cls: 'cross' },
    '受死日':     { glyph: '受', cls: 'cross' },
    '黒日':       { glyph: '黒', cls: 'cross' },
    '寅の日':     { glyph: '寅', cls: '' },
    '巳の日':     { glyph: '巳', cls: '' },
    '三隣亡':     { glyph: '隣', cls: 'cross' }
  };

  function todayJSTString() {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return jst.toISOString().slice(0, 10);
  }

  function pad2(n) { return ('0' + n).slice(-2); }

  function rokuyoBadgeClass(name) {
    if (name === '大安') return 'badge badge-taian';
    if (name === '仏滅') return 'badge badge-butsumetsu';
    if (name === '友引') return 'badge badge-tomobiki';
    return 'badge badge-default';
  }

  function isGlowDay(rekichuNames, rokuyo) {
    // 重複吉日: 天赦日 + 大安 + 一粒万倍日 のいずれか2つ以上重なる日
    let hits = 0;
    if (rekichuNames.indexOf('天赦日') !== -1) hits++;
    if (rekichuNames.indexOf('一粒万倍日') !== -1) hits++;
    if (rokuyo === '大安') hits++;
    return hits >= 2;
  }

  function renderCell(date, day, today) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';

    const wd = date.getUTCDay();
    if (wd === 0) cell.classList.add('is-sun');
    if (wd === 6) cell.classList.add('is-sat');
    if (day && day.date === today) cell.classList.add('is-today');

    const num = document.createElement('div');
    num.className = 'day-num';
    num.textContent = String(date.getUTCDate());
    cell.appendChild(num);

    if (!day || !day.available) {
      cell.classList.add('is-unavailable');
      const empty = document.createElement('div');
      empty.className = 'empty-mark';
      empty.textContent = '—';
      cell.appendChild(empty);
      return cell;
    }

    if (day.rokuyo) {
      const badge = document.createElement('span');
      badge.className = rokuyoBadgeClass(day.rokuyo);
      badge.textContent = day.rokuyo;
      cell.appendChild(badge);
    }

    const rekichuNames = day.rekichu || [];
    if (rekichuNames.length > 0) {
      const row = document.createElement('div');
      row.className = 'rekichu-row';
      rekichuNames.forEach(function(name) {
        const def = REKICHU_ICONS[name];
        if (!def) return;
        const icon = document.createElement('span');
        icon.className = 'rekichu-icon' + (def.cls ? ' ' + def.cls : '');
        icon.textContent = def.glyph;
        icon.title = name;
        row.appendChild(icon);
      });
      if (row.children.length > 0) cell.appendChild(row);
    }

    if (day.score) {
      const stars = document.createElement('div');
      stars.className = 'score-stars';
      stars.textContent = '★'.repeat(day.score) + '☆'.repeat(5 - day.score);
      cell.appendChild(stars);
    }

    if (isGlowDay(rekichuNames, day.rokuyo)) {
      cell.classList.add('is-glow');
    }

    return cell;
  }

  function buildGrid(year, month, days) {
    const grid = document.getElementById('monthGrid');
    grid.innerHTML = '';

    // 月初の曜日を取得 (UTC ベースで計算)
    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const firstWeekday = firstDay.getUTCDay();  // 0=日
    const daysInMonth = new Date(year, month, 0).getDate();

    const today = todayJSTString();
    const dayMap = {};
    days.forEach(function(d) { dayMap[d.date] = d; });

    // 前空きセル
    for (let i = 0; i < firstWeekday; i++) {
      const e = document.createElement('div');
      e.className = 'day-cell is-empty';
      grid.appendChild(e);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = year + '-' + pad2(month) + '-' + pad2(d);
      const date = new Date(Date.UTC(year, month - 1, d));
      const dayData = dayMap[dateStr];
      grid.appendChild(renderCell(date, dayData, today));
    }

    // 後空きセル — 7 の倍数になるまで
    const total = firstWeekday + daysInMonth;
    const tail = (7 - (total % 7)) % 7;
    for (let i = 0; i < tail; i++) {
      const e = document.createElement('div');
      e.className = 'day-cell is-empty';
      grid.appendChild(e);
    }
  }

  let currentYear, currentMonth;

  async function load(year, month) {
    currentYear = year;
    currentMonth = month;

    document.getElementById('monthTitle').textContent = year + '年 ' + month + '月';
    document.getElementById('monthStatus').textContent = '読込中…';
    document.getElementById('monthGrid').innerHTML = '';

    const honmeisho = getHonmeisho();
    const yyyymm = year + '-' + pad2(month);

    try {
      const data = await fetchMonth(yyyymm, honmeisho);
      buildGrid(year, month, data.days || []);
      const availableCount = (data.days || []).filter(function(d){ return d.available; }).length;
      const total = (data.days || []).length;
      if (availableCount === 0) {
        document.getElementById('monthStatus').textContent =
          'この月の暦データはまだ準備中です。順次生成されます。';
      } else if (availableCount < total) {
        document.getElementById('monthStatus').textContent =
          total + '日中 ' + availableCount + '日のデータが揃っています（残りは準備中）。';
      } else {
        document.getElementById('monthStatus').textContent = '';
      }
      if (window.trackEvent) trackEvent('view_month', { yyyymm: yyyymm, honmeisho: honmeisho });
    } catch (err) {
      console.error('fetchMonth failed', err);
      document.getElementById('monthStatus').innerHTML =
        '<strong>データ準備中です。</strong><br>' +
        '<small style="color:#999">（' + (err.message || err) + '）</small>';
    }
  }

  function shiftMonth(delta) {
    let y = currentYear, m = currentMonth + delta;
    while (m < 1)  { m += 12; y -= 1; }
    while (m > 12) { m -= 12; y += 1; }
    load(y, m);
  }

  document.getElementById('prevMonth').addEventListener('click', function() { shiftMonth(-1); });
  document.getElementById('nextMonth').addEventListener('click', function() { shiftMonth(1); });

  // 初期表示: 今月
  const today = new Date();
  const jst = new Date(today.getTime() + 9 * 60 * 60 * 1000);
  load(jst.getUTCFullYear(), jst.getUTCMonth() + 1);
})();
