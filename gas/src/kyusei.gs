// Phase 3: 九星気学計算ライブラリ
// 本命星・月命星・年盤/月盤/日盤の中央星・後天定位による9星配置を提供する。

const HONMEISHO_NAMES = {
  1: '一白水星', 2: '二黒土星', 3: '三碧木星',
  4: '四緑木星', 5: '五黄土星', 6: '六白金星',
  7: '七赤金星', 8: '八白土星', 9: '九紫火星'
};

const FIVE_ELEMENTS = {
  1: '水', 2: '土', 3: '木', 4: '木', 5: '土',
  6: '金', 7: '金', 8: '土', 9: '火'
};

const JUNISHI_NAMES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// 各月の節入り日（概算: 立春=2/4, 啓蟄=3/6, 清明=4/5, 立夏=5/6, 芒種=6/6, 小暑=7/7,
// 立秋=8/8, 白露=9/8, 寒露=10/8, 立冬=11/7, 大雪=12/7, 小寒=1/6）
// 厳密には年により ±1 日揺れるが MVP では固定で許容。
// TODO(human-review): shirabe.dev API の節気情報で動的補正を行うと精度が上がる。
const SETSU_DAY = [6, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7];

// 後天定位の標準位置（中央=5 のとき各方位に居る星の番号）
const POSITION_STANDARD = {
  N:  1, NE: 8, E:  3, SE: 4, C:  5,
  SW: 2, W:  7, NW: 6, S:  9
};

// 月命星早見表 — 行=本命星グループ、列=節月インデックス（寅月=0, 卯月=1, ..., 丑月=11）
const GEKKIMEI_TABLE = [
  // 一白・四緑・七赤の本命星（honmeisho % 3 === 1）
  [8, 7, 6, 5, 4, 3, 2, 1, 9, 8, 7, 6],
  // 二黒・五黄・八白（honmeisho % 3 === 2）
  [5, 4, 3, 2, 1, 9, 8, 7, 6, 5, 4, 3],
  // 三碧・六白・九紫（honmeisho % 3 === 0）
  [2, 1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 9]
];

// 年の十二支（子=0..亥=11）の 寅月（2月節入り後）における月盤中央星
const FEB_MONTH_STAR = {
  0: 8,  3: 8,  6: 8,  9: 8,    // 子・卯・午・酉
  1: 2,  4: 2,  7: 2,  10: 2,   // 丑・辰・未・戌
  2: 5,  5: 5,  8: 5,  11: 5    // 寅・巳・申・亥
};

// ============================================================
// 立春境界の調整 — 1月 / 2月 3日以前は前年扱い（境界=2/4 固定）
// ============================================================
function isBeforeRisshun(month, day) {
  return month === 1 || (month === 2 && day < 4);
}

function getAdjustedYear(year, month, day) {
  return isBeforeRisshun(month, day) ? year - 1 : year;
}

// ============================================================
// 節月インデックス（寅月=0..丑月=11）
// ============================================================
function getSetsuMonth(month, day) {
  const before = day < SETSU_DAY[month - 1];
  const offset = before ? -3 : -2;
  return ((month + offset) + 12) % 12;
}

// ============================================================
// 本命星
// ============================================================
function calculateHonmeisho(birthYear, birthMonth, birthDay) {
  const year = getAdjustedYear(birthYear, birthMonth, birthDay);

  // 各桁を 1 桁になるまで足し続ける
  let sum = String(year).split('').reduce(function(a, b){ return a + parseInt(b, 10); }, 0);
  while (sum > 9) {
    sum = String(sum).split('').reduce(function(a, b){ return a + parseInt(b, 10); }, 0);
  }

  let honmei = 11 - sum;
  if (honmei > 9) honmei -= 9;
  if (honmei <= 0) honmei += 9;
  return honmei;
}

// ============================================================
// 月命星
// ============================================================
function calculateGekkimei(honmeisho, birthMonth, birthDay) {
  const mod = honmeisho % 3;
  const row = (mod === 1) ? 0 : (mod === 2) ? 1 : 2;
  const setsuMonth = getSetsuMonth(birthMonth, birthDay);
  return GEKKIMEI_TABLE[row][setsuMonth];
}

// ============================================================
// 年の十二支
// ============================================================
function getYearJunishi(year) {
  // 1900 年 = 庚子（junishi=子=0）を基準
  return ((year - 1900) % 12 + 12) % 12;
}

// ============================================================
// 年盤の中央星
// 1900 年 = 一白水星（1）を起点に、年が進むごとに 1 ずつ減って 9→1 を循環
// ============================================================
function calculateYearStar(year) {
  // 立春境界は呼び出し側で getAdjustedYear 済を前提とするが、
  // 単独で年だけ受け取るユースケースもあるので、ここでは year をそのまま使う。
  const idx = ((1900 - year) % 9 + 9) % 9;
  return idx + 1;
}

// ============================================================
// 月盤の中央星
// 年の十二支ごとに 寅月（2月節入り後）の中央星が決まり、節月が進むごとに 1 ずつ減る
// ============================================================
function calculateMonthStar(year, month, day) {
  const adjustedYear = getAdjustedYear(year, month, day);
  const yj = getYearJunishi(adjustedYear);
  const base = FEB_MONTH_STAR[yj];
  const setsuMonth = getSetsuMonth(month, day);
  let star = base - setsuMonth;
  while (star <= 0) star += 9;
  return star;
}

// ============================================================
// 日盤の中央星
// 至点（夏至/冬至）直後の最初の甲子日で陽遁⇄陰遁が切り替わる。
// 下元(1984-2043)では 陽遁甲子=七赤(7)、陰遁甲子=三碧(3) から開始。
//
// ⚠️ 年1回の保守: DAY_STAR_PHASES テーブルは 2029-02-03 まで。
// 2029年以降の計算が必要になる前に延長すること（README 参照）。
// ============================================================
const DAY_STAR_PHASES = [
  { startDate: '2024-06-29', startStar: 3, direction: -1 }, // 陰遁
  { startDate: '2024-12-26', startStar: 7, direction:  1 }, // 陽遁
  { startDate: '2025-06-24', startStar: 3, direction: -1 }, // 陰遁
  { startDate: '2026-02-19', startStar: 7, direction:  1 }, // 陽遁 ★検証済(2026-04-27=2)
  { startDate: '2026-08-18', startStar: 3, direction: -1 }, // 陰遁
  { startDate: '2027-02-14', startStar: 7, direction:  1 }, // 陽遁
  { startDate: '2027-08-13', startStar: 3, direction: -1 }, // 陰遁
  { startDate: '2028-02-09', startStar: 7, direction:  1 }, // 陽遁
  { startDate: '2028-08-07', startStar: 3, direction: -1 }, // 陰遁
  { startDate: '2029-02-03', startStar: 7, direction:  1 }  // 陽遁
];

function calculateDayStar(date) {
  const dateStr = jstDateString(date);

  if (dateStr < DAY_STAR_PHASES[0].startDate) {
    Logger.log('WARN: calculateDayStar called for date before phase table: ' + dateStr);
  }
  if (dateStr > DAY_STAR_PHASES[DAY_STAR_PHASES.length - 1].startDate) {
    Logger.log('WARN: calculateDayStar may be inaccurate, extend DAY_STAR_PHASES table');
  }

  // 直近の phase を探す（startDate <= dateStr の最後）
  let activePhase = DAY_STAR_PHASES[0];
  for (const phase of DAY_STAR_PHASES) {
    if (phase.startDate <= dateStr) {
      activePhase = phase;
    } else {
      break;
    }
  }

  const startDate = new Date(activePhase.startDate + 'T00:00:00+09:00');
  const targetDate = (date instanceof Date) ? date : new Date(dateStr + 'T00:00:00+09:00');
  const days = Math.floor((targetDate - startDate) / (1000 * 60 * 60 * 24));

  let star = activePhase.startStar - 1 + (activePhase.direction * days);
  star = ((star % 9) + 9) % 9 + 1;
  return star;
}

// ============================================================
// 後天定位による9星配置 — 中央星 center のときの各方位の星
// ============================================================
function getPositionMap(center) {
  const offset = center - 5;
  const map = {};
  Object.keys(POSITION_STANDARD).forEach(function(dir) {
    let star = POSITION_STANDARD[dir] + offset;
    while (star > 9) star -= 9;
    while (star < 1) star += 9;
    map[dir] = star;
  });
  return map;
}

// ============================================================
// 五行相生/相剋に基づく関係説明
// ============================================================
function getRelationDescription(honmeisho, otherStar) {
  if (honmeisho === otherStar) return '比和（同じ五行で力が合わさる）';
  const me = FIVE_ELEMENTS[honmeisho];
  const other = FIVE_ELEMENTS[otherStar];
  const SHENG = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  const KE    = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
  if (SHENG[me] === other) return '相生（私が他を生み出し力を分け与える）';
  if (SHENG[other] === me) return '相生（他から生み出され力をもらう）';
  if (KE[me] === other)    return '相剋（私が他を剋して負担をかける）';
  if (KE[other] === me)    return '相剋（他から剋されて圧を受ける）';
  return '中立';
}

// ============================================================
// 五行相生関係にある星のリスト（吉方位の候補）
// ============================================================
function getFriendlyElements(honmeisho) {
  const myElement = FIVE_ELEMENTS[honmeisho];
  const FRIEND = {
    '木': ['水', '火'],
    '火': ['木', '土'],
    '土': ['火', '金'],
    '金': ['土', '水'],
    '水': ['金', '木']
  };
  const friendly = FRIEND[myElement];
  const result = [];
  for (let i = 1; i <= 9; i++) {
    if (i === honmeisho) continue;
    if (i === 5) continue; // 五黄は別扱い（吉方位候補に含めない）
    if (friendly.indexOf(FIVE_ELEMENTS[i]) >= 0) result.push(i);
  }
  return result;
}
