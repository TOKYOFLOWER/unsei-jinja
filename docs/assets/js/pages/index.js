// index.html ページ固有のロジック
// - localStorage 確認 → 未設定なら本命星設定モーダル起動
// - 設定済なら fetchDaily → メインカード描画
// - 失敗時はステータスカードに「データ準備中」を表示

(function() {
  // ============================================================
  // JST の今日 (yyyy-MM-dd)
  // ============================================================
  function todayJSTString() {
    const now = new Date();
    // UTC 基準で JST(+09:00) に補正
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return jst.toISOString().slice(0, 10);
  }

  // ============================================================
  // モーダル — 本命星設定
  // ============================================================
  function openSetupModal() {
    const modal = document.getElementById('setupModal');
    populateBirthSelects();
    bindSetupHandlers();
    modal.hidden = false;

    // 既に保存済の生年月日があればプリセット
    const birth = getBirth();
    if (birth) {
      document.getElementById('birthYear').value = birth.year;
      document.getElementById('birthMonth').value = birth.month;
      document.getElementById('birthDay').value = birth.day;
      updateHonmeiPreview();
    }
  }

  function closeSetupModal() {
    document.getElementById('setupModal').hidden = true;
  }

  function populateBirthSelects() {
    const yearSel = document.getElementById('birthYear');
    const monthSel = document.getElementById('birthMonth');
    const daySel = document.getElementById('birthDay');
    const currentYear = new Date().getFullYear();

    // 既に populate 済なら skip
    if (yearSel.options.length > 1) return;

    yearSel.appendChild(new Option('年', ''));
    for (let y = currentYear; y >= 1925; y--) {
      yearSel.appendChild(new Option(y + '年', y));
    }
    monthSel.appendChild(new Option('月', ''));
    for (let m = 1; m <= 12; m++) {
      monthSel.appendChild(new Option(m + '月', m));
    }
    daySel.appendChild(new Option('日', ''));
    for (let d = 1; d <= 31; d++) {
      daySel.appendChild(new Option(d + '日', d));
    }
  }

  function bindSetupHandlers() {
    const yearSel = document.getElementById('birthYear');
    const monthSel = document.getElementById('birthMonth');
    const daySel = document.getElementById('birthDay');
    const saveBtn = document.getElementById('saveHonmei');
    const skipBtn = document.getElementById('skipHonmei');

    if (saveBtn.dataset.bound === '1') return;
    saveBtn.dataset.bound = '1';

    [yearSel, monthSel, daySel].forEach(el => el.addEventListener('change', updateHonmeiPreview));

    saveBtn.addEventListener('click', () => {
      const h = parseInt(saveBtn.dataset.honmeisho, 10);
      const y = parseInt(saveBtn.dataset.year, 10);
      const m = parseInt(saveBtn.dataset.month, 10);
      const d = parseInt(saveBtn.dataset.day, 10);
      saveHonmeisho(h);
      saveBirth(y, m, d);
      if (window.trackEvent) trackEvent('setup_complete', { honmeisho: h });
      closeSetupModal();
      loadDaily(h);
    });

    skipBtn.addEventListener('click', () => {
      saveHonmeisho(1); // 仮置き: 一白水星
      closeSetupModal();
      loadDaily(1);
    });
  }

  function updateHonmeiPreview() {
    const y = parseInt(document.getElementById('birthYear').value, 10);
    const m = parseInt(document.getElementById('birthMonth').value, 10);
    const d = parseInt(document.getElementById('birthDay').value, 10);
    const preview = document.getElementById('honmeiPreview');
    const saveBtn = document.getElementById('saveHonmei');

    if (y && m && d) {
      const h = calculateHonmeisho(y, m, d);
      preview.innerHTML =
        '<span class="result">あなたの本命星は<strong>' + HONMEISHO_NAMES[h] + '</strong>です</span>';
      saveBtn.disabled = false;
      saveBtn.dataset.honmeisho = h;
      saveBtn.dataset.year = y;
      saveBtn.dataset.month = m;
      saveBtn.dataset.day = d;
    } else {
      preview.innerHTML = '<span class="placeholder">↑ 入力すると本命星が表示されます</span>';
      saveBtn.disabled = true;
    }
  }

  // ============================================================
  // 今日の運勢 — fetch + 描画
  // ============================================================
  async function loadDaily(honmeisho) {
    const date = todayJSTString();
    setStatus('読込中…');

    try {
      const data = await fetchDaily(date, honmeisho);
      renderDaily(data);
      touchLastSeen();
    } catch (err) {
      console.error('fetchDaily failed', err);
      setStatus(
        '<strong>データ準備中です。</strong><br>' +
        '少し時間をおいて再度お試しください。<br>' +
        '<small style="color:#999">（' + (err.message || err) + '）</small>'
      );
    }
  }

  function setStatus(html) {
    const card = document.getElementById('mainCard');
    const status = document.getElementById('statusCard');
    const msg = document.getElementById('statusMessage');
    msg.innerHTML = html;
    card.hidden = true;
    status.hidden = false;
  }

  function renderDaily(data) {
    if (!data || !data.personal || !data.general) {
      setStatus('データを取得できませんでした。');
      return;
    }

    // ヘッダーの日付
    const todayLabel = document.getElementById('todayDate');
    todayLabel.textContent =
      (data.general.wareki || '') + (data.general.dayOfWeek_ja ? '（' + data.general.dayOfWeek_ja + '）' : '');

    // 本命星タイトル
    document.getElementById('honmeiTitle').textContent =
      (data.honmeisho_name || '') + 'のあなたの本日の運勢';
    document.getElementById('headline').textContent = data.personal.headline || '';
    document.getElementById('overallText').textContent = data.personal.overall_text || '';

    // 時間帯マーク
    setMark('timeMorning', data.general.time_morning);
    setMark('timeNoon', data.general.time_noon);
    setMark('timeAfternoon', data.general.time_afternoon);
    setMark('timeEvening', data.general.time_evening);

    fillList('todoList', data.personal.to_do);
    fillList('avoidList', data.personal.to_avoid);

    document.getElementById('luckyColor').textContent = data.personal.lucky_color || '—';
    document.getElementById('luckyItem').textContent = data.personal.lucky_item || '—';
    document.getElementById('luckyFlower').textContent = data.personal.lucky_flower || '—';

    // メインカードを表示、ステータスカードを隠す
    document.getElementById('mainCard').hidden = false;
    document.getElementById('statusCard').hidden = true;
  }

  function setMark(elemId, val) {
    const el = document.getElementById(elemId);
    el.textContent = val || '—';
    el.classList.remove('mark-kichi', 'mark-kyou');
    if (val === '吉') el.classList.add('mark-kichi');
    else if (val === '凶') el.classList.add('mark-kyou');
  }

  function fillList(id, items) {
    const ul = document.getElementById(id);
    ul.innerHTML = '';
    if (!items || items.length === 0) {
      const li = document.createElement('li');
      li.textContent = '—';
      ul.appendChild(li);
      return;
    }
    items.forEach(it => {
      const li = document.createElement('li');
      li.textContent = String(it);
      ul.appendChild(li);
    });
  }

  // ============================================================
  // 起動
  // ============================================================
  function init() {
    const h = getHonmeisho();
    if (!h) {
      openSetupModal();
    } else {
      loadDaily(h);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
