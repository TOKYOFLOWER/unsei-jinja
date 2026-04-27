// direction.html — 吉方位コンパスページ

(function() {
  function todayJSTString() {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return jst.toISOString().slice(0, 10);
  }

  const GROUP_LABELS = {
    N: '北', NE: '北東', E: '東', SE: '南東',
    S: '南', SW: '南西', W: '西', NW: '北西'
  };

  const KYO_ORDER = [
    ['goko', '五黄殺'],
    ['ankenSatsu', '暗剣殺'],
    ['honmeiSatsu', '本命殺'],
    ['honmeiTekisatsu', '本命的殺'],
    ['saiha', '歳破'],
    ['geppa', '月破'],
    ['nippa', '日破']
  ];

  // API は { group: 'NE', label: '北東' } のオブジェクト形式で返すが、
  // 旧形式 (素の 'NE') にも一応耐えられるよう両対応で抽出する。
  function labelOf(v) {
    if (v == null) return '';
    if (typeof v === 'string') return GROUP_LABELS[v] || v;
    return v.label || GROUP_LABELS[v.group] || v.group || '';
  }

  function setStatus(html) {
    const card = document.getElementById('compassCard');
    const status = document.getElementById('statusCard');
    document.getElementById('statusMessage').innerHTML = html;
    card.hidden = true;
    status.hidden = false;
  }

  function renderLegend() {
    const ul = document.getElementById('compassLegend');
    ul.innerHTML = '';
    const order = ['kichi', 'goko', 'ankenSatsu', 'honmeiSatsu', 'honmeiTekisatsu', 'saiha', 'geppa', 'nippa'];
    order.forEach(function(cat) {
      const style = COMPASS_CATEGORY_STYLE[cat];
      const li = document.createElement('li');
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.backgroundColor = style.fill;
      const label = document.createElement('span');
      label.textContent = style.label;
      li.appendChild(swatch);
      li.appendChild(label);
      ul.appendChild(li);
    });
  }

  function renderSummary(kichi, kyo) {
    const dl = document.getElementById('compassSummary');
    dl.innerHTML = '';

    function row(term, value, isEmpty) {
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      dd.textContent = value;
      if (isEmpty) dd.classList.add('is-empty');
      dl.appendChild(dt);
      dl.appendChild(dd);
    }

    if (kichi && kichi.length > 0) {
      row('吉方位', kichi.map(labelOf).join('・'));
    } else {
      row('吉方位', 'なし', true);
    }

    KYO_ORDER.forEach(function(pair) {
      const key = pair[0], label = pair[1];
      const v = kyo && kyo[key];
      if (v) row(label, labelOf(v));
    });
  }

  function buildGuide(dayStarName, kichi) {
    if (!kichi || kichi.length === 0) {
      return '本日の日盤中央星は' + dayStarName + 'です。残念ながら大きな吉方位は立ちにくい一日。'
        + '無理な遠出は控え、近場で穏やかに過ごすことをおすすめします。';
    }
    const labels = kichi.map(labelOf).filter(Boolean);
    return '本日の日盤中央星は' + dayStarName + 'です。'
      + '最も運気の追い風が吹くのは「' + labels[0] + '」方位'
      + (labels.length > 1 ? '、続いて「' + labels.slice(1).join('・') + '」' : '')
      + '。短時間でもこの方角へ足を伸ばすと、ささやかな運気の上昇が期待できます。';
  }

  async function load(honmeisho) {
    const date = todayJSTString();
    setStatus('読込中…');

    try {
      const data = await fetchDaily(date, honmeisho);
      if (!data || !data.general || !data.personal) {
        setStatus('データを取得できませんでした。');
        return;
      }

      // ヘッダー日付
      const todayLabel = document.getElementById('todayDate');
      todayLabel.textContent =
        (data.general.wareki || '') + (data.general.dayOfWeek_ja ? '（' + data.general.dayOfWeek_ja + '）' : '');

      // タイトル — kyusei.js の HONMEISHO_NAMES は const 宣言で window には乗らないので直接参照
      const honmeiName = data.honmeisho_name || HONMEISHO_NAMES[honmeisho] || '';
      document.getElementById('honmeiTitle').textContent = honmeiName + 'のあなたの本日の方位';

      const dayStar = Number(data.general.day_star);
      const kichi = data.personal.kichi_directions || [];
      const kyo = data.personal.kyo_directions || {};

      // コンパス描画
      renderCompass(document.getElementById('compass'), {
        size: 380,
        dayStar: dayStar,
        honmeisho: honmeisho,
        kichi: kichi,
        kyo: kyo
      });

      // ガイド文 / 凡例 / 早見表
      const dayStarName = HONMEISHO_NAMES[dayStar] || ('星' + dayStar);
      document.getElementById('compassGuide').textContent = buildGuide(dayStarName, kichi);
      renderLegend();
      renderSummary(kichi, kyo);

      // 表示切替
      document.getElementById('compassCard').hidden = false;
      document.getElementById('statusCard').hidden = true;

      if (window.trackEvent) trackEvent('view_direction', { honmeisho: honmeisho });
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

  function init() {
    const h = getHonmeisho();
    if (!h) {
      setStatus('本命星が未設定です。<br><a href="./setup.html" style="color:var(--color-shu); text-decoration:underline;">本命星を設定する →</a>');
      return;
    }
    load(h);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
