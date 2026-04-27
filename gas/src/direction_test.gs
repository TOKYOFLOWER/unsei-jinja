// Phase 8: 方位算出 単体テスト

function testPositionMap() {
  // center=5（標準）— 後天定位の基準
  // center=1 — offset=-4 で各位置の星をシフト
  let pass = 0, fail = 0;

  const m5 = getPositionMap(5);
  const expected5 = { N: 1, NE: 8, E: 3, SE: 4, C: 5, SW: 2, W: 7, NW: 6, S: 9 };
  Object.keys(expected5).forEach(function(k) {
    if (m5[k] === expected5[k]) { Logger.log('PASS: getPositionMap(5).' + k + '=' + m5[k]); pass++; }
    else { Logger.log('FAIL: getPositionMap(5).' + k + ' got=' + m5[k] + ' expected=' + expected5[k]); fail++; }
  });

  const m1 = getPositionMap(1);
  // offset=-4: 1→6, 2→7, 3→8, 4→9, 5→1, 6→2, 7→3, 8→4, 9→5
  const expected1 = { N: 6, NE: 4, E: 8, SE: 9, C: 1, SW: 7, W: 3, NW: 2, S: 5 };
  Object.keys(expected1).forEach(function(k) {
    if (m1[k] === expected1[k]) { Logger.log('PASS: getPositionMap(1).' + k + '=' + m1[k]); pass++; }
    else { Logger.log('FAIL: getPositionMap(1).' + k + ' got=' + m1[k] + ' expected=' + expected1[k]); fail++; }
  });

  Logger.log('=== testPositionMap: ' + pass + ' passed, ' + fail + ' failed ===');
  return { pass: pass, fail: fail };
}

function testGokoLocation() {
  // 五黄殺の方位 = 各 center における五黄(5) の位置
  // center=5: 中央なので 'C'（凶方位として無効）
  // center=1 (offset=-4): 5+(-4)=1 が center→5は5+4=9を中央位置に...逆向きに考え直す。
  //   実装: 各方位の標準値+offsetを計算。標準値=5になるためには std+offset=5、つまり std=5-offset=5-(-4)=9。
  //   POSITION_STANDARD で std=9 は S → よって center=1 のとき五黄は S
  // center=9 (offset=+4): std=5-4=1 → POSITION_STANDARD で std=1 は N → 五黄は N
  // center=3 (offset=-2): std=5-(-2)=7 → std=7 は W → 五黄は W
  function findGoko(center) {
    const m = getPositionMap(center);
    const keys = Object.keys(m);
    for (let i = 0; i < keys.length; i++) {
      if (m[keys[i]] === 5) return keys[i];
    }
    return null;
  }
  const cases = [
    { center: 5, expected: 'C' },
    { center: 1, expected: 'S' },
    { center: 9, expected: 'N' },
    { center: 3, expected: 'W' },
    { center: 7, expected: 'E' }
  ];
  let pass = 0, fail = 0;
  cases.forEach(function(c) {
    const got = findGoko(c.center);
    if (got === c.expected) { Logger.log('PASS: 五黄 in center=' + c.center + ' → ' + got); pass++; }
    else { Logger.log('FAIL: 五黄 in center=' + c.center + ' got=' + got + ' expected=' + c.expected); fail++; }
  });
  Logger.log('=== testGokoLocation: ' + pass + ' passed, ' + fail + ' failed ===');
  return { pass: pass, fail: fail };
}

function testJunishiOpposite() {
  const cases = [
    { jn: '子', expected: 'S'  },
    { jn: '午', expected: 'N'  },
    { jn: '丑', expected: 'SW' },
    { jn: '卯', expected: 'W'  },
    { jn: '酉', expected: 'E'  }
  ];
  let pass = 0, fail = 0;
  cases.forEach(function(c) {
    const got = junishiOppositeGroup(c.jn);
    if (got === c.expected) { Logger.log('PASS: junishiOppositeGroup(' + c.jn + ')=' + got); pass++; }
    else { Logger.log('FAIL: junishiOppositeGroup(' + c.jn + ') got=' + got + ' expected=' + c.expected); fail++; }
  });
  Logger.log('=== testJunishiOpposite: ' + pass + ' passed, ' + fail + ' failed ===');
  return { pass: pass, fail: fail };
}

function testDirection() {
  // computeDirectionFortune の最小限テスト（モック daily_general を渡す）
  // honmeisho=1（一白水星・水）、day_star=5（中央=五黄）の場合:
  //   - 五黄が中央 → goko=null（凶ではない）
  //   - 一白の位置は POSITION_STANDARD.N=1 → 本命殺=N
  //   - 本命的殺=S
  //   - 一白の友星: 水→金/木 → FIVE_ELEMENTS で {6:金,7:金,3:木,4:木} → 候補は 6,7,3,4
  //     positionMap(5) の対応: 6=NW, 7=W, 3=E, 4=SE → 吉方位候補
  //     凶方位 N/S と被らない → kichi = [NW, W, E, SE] (順序は実装依存)
  const mockGeneral = {
    date: '2025-04-27',
    day_star: 5,
    junishi: '子'
  };
  const r = computeDirectionFortune(1, mockGeneral, '2025-04-27');
  Logger.log('computeDirectionFortune sample: ' + JSON.stringify(r, null, 2));

  let pass = 0, fail = 0;
  if (r.day_star === 5) { Logger.log('PASS: day_star=5'); pass++; } else { Logger.log('FAIL: day_star'); fail++; }
  if (!r.kyo.goko)        { Logger.log('PASS: 五黄が中央なら goko=null'); pass++; } else { Logger.log('FAIL: goko should be null'); fail++; }
  if (r.kyo.honmeiSatsu === 'N') { Logger.log('PASS: 一白本命殺=N'); pass++; } else { Logger.log('FAIL: honmeiSatsu got=' + r.kyo.honmeiSatsu); fail++; }
  if (r.kyo.honmeiTekisatsu === 'S') { Logger.log('PASS: 本命的殺=S'); pass++; } else { Logger.log('FAIL: honmeiTekisatsu got=' + r.kyo.honmeiTekisatsu); fail++; }
  if (Array.isArray(r.kichi) && r.kichi.length > 0) { Logger.log('PASS: kichi has ' + r.kichi.length + ' direction(s): ' + r.kichi.join(',')); pass++; }
  else { Logger.log('FAIL: kichi empty'); fail++; }

  Logger.log('=== testDirection: ' + pass + ' passed, ' + fail + ' failed ===');
  return { pass: pass, fail: fail };
}

function testDirectionAll() {
  const r1 = testPositionMap();
  const r2 = testGokoLocation();
  const r3 = testJunishiOpposite();
  const r4 = testDirection();
  const total = r1.pass + r2.pass + r3.pass + r4.pass + r1.fail + r2.fail + r3.fail + r4.fail;
  const pass  = r1.pass + r2.pass + r3.pass + r4.pass;
  Logger.log('=== testDirectionAll: ' + pass + ' / ' + total + ' passed ===');
  return { pass: pass, fail: total - pass, total: total };
}
