// Phase 4: 24 方位の吉凶判定
// 五黄殺・暗剣殺・本命殺・本命的殺・歳破・月破・日破 を凶方位として算出し、
// 五行相生関係にある星が居る方位を吉方位とする。

const DIRECTIONS_24 = [
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

const GROUP_OPPOSITE = {
  'N': 'S', 'S': 'N',
  'E': 'W', 'W': 'E',
  'NE': 'SW', 'SW': 'NE',
  'SE': 'NW', 'NW': 'SE'
};

const GROUP_LABEL = {
  'N': '北', 'NE': '北東', 'E': '東', 'SE': '南東',
  'S': '南', 'SW': '南西', 'W': '西', 'NW': '北西'
};

const JUNISHI_TO_GROUP = {
  '子': 'N',
  '丑': 'NE', '寅': 'NE',
  '卯': 'E',
  '辰': 'SE', '巳': 'SE',
  '午': 'S',
  '未': 'SW', '申': 'SW',
  '酉': 'W',
  '戌': 'NW', '亥': 'NW'
};

const JUNISHI_OPPOSITE = {
  '子': '午', '丑': '未', '寅': '申', '卯': '酉', '辰': '戌', '巳': '亥',
  '午': '子', '未': '丑', '申': '寅', '酉': '卯', '戌': '辰', '亥': '巳'
};

function oppositeOfGroup(group) {
  return group ? GROUP_OPPOSITE[group] : null;
}

function junishiToGroup(junishi) {
  return JUNISHI_TO_GROUP[junishi] || null;
}

function junishiOppositeGroup(junishi) {
  const opp = JUNISHI_OPPOSITE[junishi];
  return opp ? junishiToGroup(opp) : null;
}

// ============================================================
// 公開: 日付文字列から吉凶方位を返す（Spreadsheet キャッシュを参照）
// ============================================================
function getDirectionFortune(honmeisho, dateString) {
  const general = getDailyGeneral(dateString);
  if (!general) return null;
  return computeDirectionFortune(honmeisho, general, dateString);
}

// ============================================================
// 純粋計算 — daily_general 行オブジェクトを直接受け取って算出
// （runDailyJob 内で daily_general 取得直後に呼ぶ）
// ============================================================
function computeDirectionFortune(honmeisho, general, dateString) {
  const dayStar = Number(general.day_star);
  const positionMap = getPositionMap(dayStar);

  // 星 → 方位 の逆引き
  const inverse = {};
  Object.keys(positionMap).forEach(function(g){ inverse[positionMap[g]] = g; });

  // 五黄殺/暗剣殺
  const gokoPos = inverse[5];
  const goko = (gokoPos && gokoPos !== 'C') ? gokoPos : null;
  const ankenSatsu = goko ? oppositeOfGroup(goko) : null;

  // 本命殺/本命的殺
  const honmeiPos = inverse[honmeisho];
  const honmeiSatsu = (honmeiPos && honmeiPos !== 'C') ? honmeiPos : null;
  const honmeiTekisatsu = honmeiSatsu ? oppositeOfGroup(honmeiSatsu) : null;

  // 歳破/月破/日破 — 干支から算出
  const dateObj = dateString
    ? new Date(dateString + 'T00:00:00+09:00')
    : new Date(general.date + 'T00:00:00+09:00');
  const adjustedYear = getAdjustedYear(dateObj.getFullYear(), dateObj.getMonth() + 1, dateObj.getDate());
  const yearJunishi = JUNISHI_NAMES[getYearJunishi(adjustedYear)];
  const setsuMonth = getSetsuMonth(dateObj.getMonth() + 1, dateObj.getDate());
  const monthJunishi = JUNISHI_NAMES[(setsuMonth + 2) % 12]; // 寅月=寅 から始まる
  const dayJunishi = String(general.junishi || '');

  const saiha = junishiOppositeGroup(yearJunishi);
  const geppa = junishiOppositeGroup(monthJunishi);
  const nippa = dayJunishi ? junishiOppositeGroup(dayJunishi) : null;

  // 凶方位セット
  const kyo = {};
  if (goko)             kyo.goko = goko;
  if (ankenSatsu)       kyo.ankenSatsu = ankenSatsu;
  if (honmeiSatsu)      kyo.honmeiSatsu = honmeiSatsu;
  if (honmeiTekisatsu)  kyo.honmeiTekisatsu = honmeiTekisatsu;
  if (saiha)            kyo.saiha = saiha;
  if (geppa)            kyo.geppa = geppa;
  if (nippa)            kyo.nippa = nippa;

  // 吉方位 — 相生関係の星が居る方位、ただし凶方位とぶつかるものは除外
  const kyoGroups = {};
  Object.keys(kyo).forEach(function(k){ kyoGroups[kyo[k]] = true; });

  const friendlyStars = getFriendlyElements(honmeisho);
  const kichi = [];
  friendlyStars.forEach(function(s) {
    const g = inverse[s];
    if (!g || g === 'C') return;
    if (kyoGroups[g]) return;
    if (kichi.indexOf(g) === -1) kichi.push(g);
  });

  const kyoLabeled = {};
  Object.keys(kyo).forEach(function(k){
    kyoLabeled[k] = { group: kyo[k], label: GROUP_LABEL[kyo[k]] || kyo[k] };
  });
  const kichiLabeled = kichi.map(function(g){ return { group: g, label: GROUP_LABEL[g] || g }; });

  return {
    day_star: dayStar,
    day_star_name: HONMEISHO_NAMES[dayStar],
    kichi: kichi,
    kichi_labeled: kichiLabeled,
    kyo: kyo,
    kyo_labeled: kyoLabeled,
    junishi: { year: yearJunishi, month: monthJunishi, day: dayJunishi },
    explanation: '本日の日盤中央星は' + HONMEISHO_NAMES[dayStar] + '。'
      + (kichi.length > 0
          ? ('吉方位: ' + kichi.map(function(g){ return GROUP_LABEL[g]; }).join('・') + '。')
          : '吉方位なし。')
      + ' 主な凶方位: ' + Object.keys(kyo).map(function(k){ return GROUP_LABEL[kyo[k]]; }).filter(Boolean).join('・') + '。'
  };
}
