// 24 方位 SVG コンパス
// データ契約: GAS の direction.gs に合わせる
//   kichi: ['NE', 'SE'] のような group キー配列
//   kyo:   { goko: 'N', ankenSatsu: 'S', honmeiSatsu: 'E', ... }
// 同一 group に複数カテゴリが当たった場合は「凶優先」で描画する。

const COMPASS_DIRECTIONS_24 = [
  { name: '壬', deg: 345, group: 'N'  },
  { name: '子', deg: 0,   group: 'N'  },
  { name: '癸', deg: 15,  group: 'N'  },
  { name: '丑', deg: 30,  group: 'NE' },
  { name: '艮', deg: 45,  group: 'NE' },
  { name: '寅', deg: 60,  group: 'NE' },
  { name: '甲', deg: 75,  group: 'E'  },
  { name: '卯', deg: 90,  group: 'E'  },
  { name: '乙', deg: 105, group: 'E'  },
  { name: '辰', deg: 120, group: 'SE' },
  { name: '巽', deg: 135, group: 'SE' },
  { name: '巳', deg: 150, group: 'SE' },
  { name: '丙', deg: 165, group: 'S'  },
  { name: '午', deg: 180, group: 'S'  },
  { name: '丁', deg: 195, group: 'S'  },
  { name: '未', deg: 210, group: 'SW' },
  { name: '坤', deg: 225, group: 'SW' },
  { name: '申', deg: 240, group: 'SW' },
  { name: '庚', deg: 255, group: 'W'  },
  { name: '酉', deg: 270, group: 'W'  },
  { name: '辛', deg: 285, group: 'W'  },
  { name: '戌', deg: 300, group: 'NW' },
  { name: '乾', deg: 315, group: 'NW' },
  { name: '亥', deg: 330, group: 'NW' }
];

const COMPASS_GROUPS = [
  { key: 'N',  label: '北',   center: 0,   start: -22.5, end: 22.5  },
  { key: 'NE', label: '北東', center: 45,  start: 22.5,  end: 67.5  },
  { key: 'E',  label: '東',   center: 90,  start: 67.5,  end: 112.5 },
  { key: 'SE', label: '南東', center: 135, start: 112.5, end: 157.5 },
  { key: 'S',  label: '南',   center: 180, start: 157.5, end: 202.5 },
  { key: 'SW', label: '南西', center: 225, start: 202.5, end: 247.5 },
  { key: 'W',  label: '西',   center: 270, start: 247.5, end: 292.5 },
  { key: 'NW', label: '北西', center: 315, start: 292.5, end: 337.5 }
];

const COMPASS_CATEGORY_STYLE = {
  kichi:           { fill: 'rgba(201, 161, 74, 0.55)', label: '吉方位',     priority: 0 },
  goko:            { fill: 'rgba(178, 34, 34, 0.55)',  label: '五黄殺',     priority: 7 },
  ankenSatsu:      { fill: 'rgba(178, 34, 34, 0.55)',  label: '暗剣殺',     priority: 6 },
  honmeiSatsu:     { fill: 'rgba(139, 26, 26, 0.65)',  label: '本命殺',     priority: 5 },
  honmeiTekisatsu: { fill: 'rgba(139, 26, 26, 0.65)',  label: '本命的殺',   priority: 4 },
  saiha:           { fill: 'rgba(26, 26, 26, 0.30)',   label: '歳破',       priority: 3 },
  geppa:           { fill: 'rgba(26, 26, 26, 0.30)',   label: '月破',       priority: 2 },
  nippa:           { fill: 'rgba(26, 26, 26, 0.30)',   label: '日破',       priority: 1 }
};

const COMPASS_NS = 'http://www.w3.org/2000/svg';

function compassPointAt(cx, cy, r, deg) {
  // deg=0 を北 (上) として、時計回り
  const rad = (deg - 90) * Math.PI / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function compassSectorPath(cx, cy, rOuter, rInner, startDeg, endDeg) {
  const [ox1, oy1] = compassPointAt(cx, cy, rOuter, startDeg);
  const [ox2, oy2] = compassPointAt(cx, cy, rOuter, endDeg);
  const [ix1, iy1] = compassPointAt(cx, cy, rInner, startDeg);
  const [ix2, iy2] = compassPointAt(cx, cy, rInner, endDeg);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return 'M ' + ox1 + ' ' + oy1
    + ' A ' + rOuter + ' ' + rOuter + ' 0 ' + largeArc + ' 1 ' + ox2 + ' ' + oy2
    + ' L ' + ix2 + ' ' + iy2
    + ' A ' + rInner + ' ' + rInner + ' 0 ' + largeArc + ' 0 ' + ix1 + ' ' + iy1
    + ' Z';
}

// kichi / kyo の各要素は文字列 'NE' か、オブジェクト { group: 'NE', label: '北東' } の
// どちらの形式でも受け取れるよう正規化する。
function normalizeGroupKey(v) {
  if (!v) return null;
  if (typeof v === 'string') return v;
  return v.group || null;
}

function classifyCompassGroups(kichi, kyo) {
  // 各 group に対し最も優先度の高いカテゴリを採用
  const result = {};
  function consider(raw, cat) {
    const group = normalizeGroupKey(raw);
    if (!group) return;
    const cur = result[group];
    const pNew = COMPASS_CATEGORY_STYLE[cat].priority;
    if (!cur || pNew > COMPASS_CATEGORY_STYLE[cur].priority) {
      result[group] = cat;
    }
  }
  Object.keys(kyo || {}).forEach(function(cat) {
    consider(kyo[cat], cat);
  });
  (kichi || []).forEach(function(item) {
    consider(item, 'kichi');
  });
  return result;
}

function buildCompass(opts) {
  const size = opts.size || 380;
  const cx = size / 2;
  const cy = size / 2;
  const rText = size / 2 - 4;
  const rOuter = size / 2 - 26;
  const rInner = rOuter - 78;
  const dayStar = opts.dayStar;
  const honmeisho = opts.honmeisho;
  const groupClass = classifyCompassGroups(opts.kichi || [], opts.kyo || {});

  const svg = document.createElementNS(COMPASS_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
  svg.setAttribute('class', 'compass-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', '24方位コンパス');

  // 外周円 (薄い和紙背景)
  const outerCircle = document.createElementNS(COMPASS_NS, 'circle');
  outerCircle.setAttribute('cx', cx);
  outerCircle.setAttribute('cy', cy);
  outerCircle.setAttribute('r', rOuter);
  outerCircle.setAttribute('fill', '#FFFDF5');
  outerCircle.setAttribute('stroke', '#B22222');
  outerCircle.setAttribute('stroke-width', '2');
  svg.appendChild(outerCircle);

  // セクター塗り
  COMPASS_GROUPS.forEach(function(g) {
    const cat = groupClass[g.key];
    if (!cat) return;
    const path = document.createElementNS(COMPASS_NS, 'path');
    path.setAttribute('d', compassSectorPath(cx, cy, rOuter, rInner, g.start, g.end));
    path.setAttribute('fill', COMPASS_CATEGORY_STYLE[cat].fill);
    path.setAttribute('stroke', 'none');
    path.setAttribute('class', 'compass-sector compass-sector-' + cat);
    const title = document.createElementNS(COMPASS_NS, 'title');
    title.textContent = g.label + ' — ' + COMPASS_CATEGORY_STYLE[cat].label;
    path.appendChild(title);
    svg.appendChild(path);
  });

  // 24 細線 (方位境界 = 7.5 + 15k)
  for (let k = 0; k < 24; k++) {
    const deg = 7.5 + 15 * k;
    const [x1, y1] = compassPointAt(cx, cy, rInner, deg);
    const [x2, y2] = compassPointAt(cx, cy, rOuter, deg);
    const line = document.createElementNS(COMPASS_NS, 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#B22222');
    line.setAttribute('stroke-opacity', '0.45');
    line.setAttribute('stroke-width', '0.7');
    svg.appendChild(line);
  }

  // 8 太線 (group 境界 = 22.5 + 45k) — 中央から outer まで
  for (let k = 0; k < 8; k++) {
    const deg = 22.5 + 45 * k;
    const [x2, y2] = compassPointAt(cx, cy, rOuter, deg);
    const line = document.createElementNS(COMPASS_NS, 'line');
    line.setAttribute('x1', cx); line.setAttribute('y1', cy);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#B22222');
    line.setAttribute('stroke-width', '1.6');
    svg.appendChild(line);
  }

  // 内端円 (中央エリアと sector を区切る)
  const innerCircle = document.createElementNS(COMPASS_NS, 'circle');
  innerCircle.setAttribute('cx', cx);
  innerCircle.setAttribute('cy', cy);
  innerCircle.setAttribute('r', rInner);
  innerCircle.setAttribute('fill', '#FFF8E7');
  innerCircle.setAttribute('stroke', '#C9A14A');
  innerCircle.setAttribute('stroke-width', '1');
  svg.appendChild(innerCircle);

  // 24 漢字 (外周より少し外側)
  COMPASS_DIRECTIONS_24.forEach(function(dir) {
    const [tx, ty] = compassPointAt(cx, cy, rOuter + 14, dir.deg);
    const t = document.createElementNS(COMPASS_NS, 'text');
    t.setAttribute('x', tx);
    t.setAttribute('y', ty);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central');
    t.setAttribute('class', 'compass-label');
    t.textContent = dir.name;
    svg.appendChild(t);
  });

  // 8 方位の和名 (北/北東... を内端円の少し内側に配置)
  COMPASS_GROUPS.forEach(function(g) {
    const [tx, ty] = compassPointAt(cx, cy, rInner + 14, g.center);
    const t = document.createElementNS(COMPASS_NS, 'text');
    t.setAttribute('x', tx);
    t.setAttribute('y', ty);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central');
    t.setAttribute('class', 'compass-group-label');
    t.textContent = g.label;
    svg.appendChild(t);
  });

  // 中央: 日盤中央 / 本命星
  const labelTop = document.createElementNS(COMPASS_NS, 'text');
  labelTop.setAttribute('x', cx);
  labelTop.setAttribute('y', cy - 22);
  labelTop.setAttribute('text-anchor', 'middle');
  labelTop.setAttribute('class', 'compass-center-sub');
  labelTop.textContent = '日盤中央';
  svg.appendChild(labelTop);

  const labelMain = document.createElementNS(COMPASS_NS, 'text');
  labelMain.setAttribute('x', cx);
  labelMain.setAttribute('y', cy);
  labelMain.setAttribute('text-anchor', 'middle');
  labelMain.setAttribute('class', 'compass-center-main');
  // 注: HONMEISHO_NAMES は kyusei.js で `const` 宣言されており、window には乗らないが
  // 同じ document 内の後続スクリプトからは識別子で参照可能。
  const namesAvailable = (typeof HONMEISHO_NAMES !== 'undefined');
  labelMain.textContent = (namesAvailable && HONMEISHO_NAMES[dayStar]) || ('星' + (dayStar || '?'));
  svg.appendChild(labelMain);

  if (honmeisho) {
    const labelHonmei = document.createElementNS(COMPASS_NS, 'text');
    labelHonmei.setAttribute('x', cx);
    labelHonmei.setAttribute('y', cy + 24);
    labelHonmei.setAttribute('text-anchor', 'middle');
    labelHonmei.setAttribute('class', 'compass-center-honmei');
    labelHonmei.textContent = '本命: ' + ((namesAvailable && HONMEISHO_NAMES[honmeisho]) || ('星' + honmeisho));
    svg.appendChild(labelHonmei);
  }

  return svg;
}

function renderCompass(container, opts) {
  while (container.firstChild) container.removeChild(container.firstChild);
  container.appendChild(buildCompass(opts));
}
