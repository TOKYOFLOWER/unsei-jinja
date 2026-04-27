// Phase 8: 九星気学 単体テスト（GAS エディタから実行 → ログ確認）

function testHonmeisho() {
  // 期待値の根拠:
  //   1900年=一白(1) を起点に毎年1減（9→1で循環）
  //   立春境界は 2/4 固定: 1月 / 2月3日以前は前年扱い
  const cases = [
    { y: 1980, m: 6,  d: 15, expected: 2, desc: '1980/6/15  → 二黒土星' },
    { y: 1981, m: 6,  d: 15, expected: 1, desc: '1981/6/15  → 一白水星' },
    { y: 1985, m: 12, d: 31, expected: 6, desc: '1985/12/31 → 六白金星' },
    { y: 1990, m: 6,  d: 15, expected: 1, desc: '1990/6/15  → 一白水星' },
    { y: 1990, m: 1,  d: 15, expected: 2, desc: '1990/1/15  (立春前→1989年扱い) → 二黒土星' },
    { y: 1995, m: 8,  d: 1,  expected: 5, desc: '1995/8/1   → 五黄土星' },
    { y: 2000, m: 6,  d: 15, expected: 9, desc: '2000/6/15  → 九紫火星' },
    { y: 2000, m: 1,  d: 5,  expected: 1, desc: '2000/1/5   (立春前→1999年扱い) → 一白水星' },
    { y: 2000, m: 2,  d: 4,  expected: 9, desc: '2000/2/4   (立春当日) → 九紫火星' },
    { y: 2000, m: 2,  d: 3,  expected: 1, desc: '2000/2/3   (立春前→1999年扱い) → 一白水星' },
    { y: 2010, m: 5,  d: 5,  expected: 8, desc: '2010/5/5   → 八白土星' },
    { y: 2025, m: 4,  d: 1,  expected: 2, desc: '2025/4/1   → 二黒土星' },
    { y: 2025, m: 1,  d: 30, expected: 3, desc: '2025/1/30  (立春前→2024年扱い) → 三碧木星' }
  ];

  let pass = 0, fail = 0;
  cases.forEach(function(c) {
    const got = calculateHonmeisho(c.y, c.m, c.d);
    if (got === c.expected) {
      Logger.log('PASS: ' + c.desc + '  got=' + got);
      pass++;
    } else {
      Logger.log('FAIL: ' + c.desc + '  got=' + got + ', expected=' + c.expected);
      fail++;
    }
  });
  Logger.log('=== testHonmeisho: ' + pass + ' passed, ' + fail + ' failed (total ' + cases.length + ') ===');
  return { pass: pass, fail: fail, total: cases.length };
}

function testGekkimei() {
  // 月命星早見表のサンプル検証
  // 寅月=2月節入り後（2/4以降）, 卯月=3月節入り後（3/6以降）, 辰月=4月節入り後（4/5以降）
  const cases = [
    { honmei: 1, m: 2, d: 15, expected: 8, desc: '一白本命・寅月(2/15) → 八白' },
    { honmei: 2, m: 2, d: 15, expected: 5, desc: '二黒本命・寅月(2/15) → 五黄' },
    { honmei: 3, m: 2, d: 15, expected: 2, desc: '三碧本命・寅月(2/15) → 二黒' },
    { honmei: 1, m: 3, d: 15, expected: 7, desc: '一白本命・卯月(3/15) → 七赤' },
    { honmei: 1, m: 4, d: 15, expected: 6, desc: '一白本命・辰月(4/15) → 六白' }
  ];
  let pass = 0, fail = 0;
  cases.forEach(function(c) {
    const got = calculateGekkimei(c.honmei, c.m, c.d);
    if (got === c.expected) { Logger.log('PASS: ' + c.desc + '  got=' + got); pass++; }
    else { Logger.log('FAIL: ' + c.desc + '  got=' + got + ', expected=' + c.expected); fail++; }
  });
  Logger.log('=== testGekkimei: ' + pass + ' passed, ' + fail + ' failed ===');
  return { pass: pass, fail: fail };
}

function testYearStar() {
  const cases = [
    { y: 1900, expected: 1 },
    { y: 1901, expected: 9 },
    { y: 1909, expected: 1 },
    { y: 1990, expected: 1 },
    { y: 2000, expected: 9 },
    { y: 2025, expected: 2 }
  ];
  let pass = 0, fail = 0;
  cases.forEach(function(c) {
    const got = calculateYearStar(c.y);
    if (got === c.expected) { Logger.log('PASS: yearStar(' + c.y + ')=' + got); pass++; }
    else { Logger.log('FAIL: yearStar(' + c.y + ') got=' + got + ', expected=' + c.expected); fail++; }
  });
  Logger.log('=== testYearStar: ' + pass + ' passed, ' + fail + ' failed ===');
  return { pass: pass, fail: fail };
}

function testGetSetsuMonth() {
  const cases = [
    { m: 2,  d: 5,  expected: 0,  desc: '2/5  → 寅月(0)' },
    { m: 2,  d: 3,  expected: 11, desc: '2/3  → 丑月(11) 立春前' },
    { m: 1,  d: 15, expected: 11, desc: '1/15 → 丑月(11)' },
    { m: 1,  d: 5,  expected: 10, desc: '1/5  → 子月(10) 小寒前' },
    { m: 12, d: 7,  expected: 10, desc: '12/7 → 子月(10) 大雪後' },
    { m: 12, d: 6,  expected: 9,  desc: '12/6 → 亥月(9)  大雪前' },
    { m: 7,  d: 7,  expected: 5,  desc: '7/7  → 未月(5)' }
  ];
  let pass = 0, fail = 0;
  cases.forEach(function(c) {
    const got = getSetsuMonth(c.m, c.d);
    if (got === c.expected) { Logger.log('PASS: ' + c.desc + '  got=' + got); pass++; }
    else { Logger.log('FAIL: ' + c.desc + '  got=' + got + ', expected=' + c.expected); fail++; }
  });
  Logger.log('=== testGetSetsuMonth: ' + pass + ' passed, ' + fail + ' failed ===');
  return { pass: pass, fail: fail };
}

function testDayStar() {
  const cases = [
    // 検証済 (keisan.casio + 八雲院 で一致)
    { date: '2026-04-27', expected: 2, note: '陽遁中(2026-02-19から67日後)' },
    // 陽遁/陰遁境界の前後を念のため検証
    { date: '2026-02-19', expected: 7, note: '陽遁開始の甲子日' },
    { date: '2026-02-20', expected: 8, note: '陽遁2日目' },
    { date: '2025-06-24', expected: 3, note: '陰遁開始の甲子日' },
    { date: '2025-06-25', expected: 2, note: '陰遁2日目' }
  ];
  let pass = 0, fail = 0;
  cases.forEach(c => {
    const d = new Date(c.date + 'T00:00:00+09:00');
    const got = calculateDayStar(d);
    if (got === c.expected) {
      Logger.log(`PASS: ${c.date} → ${c.expected} (${c.note})`);
      pass++;
    } else {
      Logger.log(`FAIL: ${c.date} expected=${c.expected} got=${got} (${c.note})`);
      fail++;
    }
  });
  Logger.log(`=== testDayStar: ${pass} passed, ${fail} failed ===`);
  return { pass, fail };
}

function testKyuseiAll() {
  const r1 = testHonmeisho();
  const r2 = testGekkimei();
  const r3 = testYearStar();
  const r4 = testGetSetsuMonth();
  const r5 = testDayStar();
  const total = r1.pass + r2.pass + r3.pass + r4.pass + r5.pass
              + r1.fail + r2.fail + r3.fail + r4.fail + r5.fail;
  const pass  = r1.pass + r2.pass + r3.pass + r4.pass + r5.pass;
  Logger.log('=== testKyuseiAll: ' + pass + ' / ' + total + ' passed ===');
  return { pass: pass, fail: total - pass, total: total };
}
