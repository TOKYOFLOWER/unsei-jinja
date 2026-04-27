// フロント側の本命星計算 — GAS の kyusei.gs と同じロジック
// ローカル計算なので即時応答可能（fetch 不要）。
// 立春境界は 2/4 固定。

const HONMEISHO_NAMES = {
  1: '一白水星', 2: '二黒土星', 3: '三碧木星',
  4: '四緑木星', 5: '五黄土星', 6: '六白金星',
  7: '七赤金星', 8: '八白土星', 9: '九紫火星'
};

const FIVE_ELEMENTS = {
  1: '水', 2: '土', 3: '木', 4: '木', 5: '土',
  6: '金', 7: '金', 8: '土', 9: '火'
};

function calculateHonmeisho(birthYear, birthMonth, birthDay) {
  // 立春前は前年扱い（2/4 を境界）
  let year = birthYear;
  if (birthMonth === 1 || (birthMonth === 2 && birthDay < 4)) {
    year = birthYear - 1;
  }

  // 各桁を 1 桁になるまで足し続ける
  let sum = String(year).split('').reduce((a, b) => a + parseInt(b, 10), 0);
  while (sum > 9) {
    sum = String(sum).split('').reduce((a, b) => a + parseInt(b, 10), 0);
  }

  let honmei = 11 - sum;
  if (honmei > 9) honmei -= 9;
  if (honmei <= 0) honmei += 9;
  return honmei;
}
