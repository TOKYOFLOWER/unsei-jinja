// 各 path のハンドラ
// すべて GET only で運用（CORS preflight 回避のため）

// ============================================================
// /health — 動作確認用
// ============================================================
function handleHealth(e) {
  appendAccessLog({ path: 'health' });
  return {
    status: 'ok',
    time: nowIso(),
    version: APP_VERSION
  };
}

// ============================================================
// /daily?date=YYYY-MM-DD&honmeisho=N
//   honmeisho 省略時: daily_general のみ返す
//   honmeisho あり: daily_general + daily_personal を結合
//   キャッシュなければ on-the-fly で生成（バッチで作る前提なので通常はヒットする）
// ============================================================
function handleDaily(e) {
  const dateStr = (e && e.parameter && e.parameter.date) || jstDateString();
  const honmeishoRaw = e && e.parameter ? e.parameter.honmeisho : null;
  const honmeisho = honmeishoRaw ? Number(honmeishoRaw) : null;

  appendAccessLog({ path: 'daily', date: dateStr, honmeisho: honmeisho });

  if (honmeisho != null && (!Number.isFinite(honmeisho) || honmeisho < 1 || honmeisho > 9)) {
    return { error: 'invalid_honmeisho', value: honmeishoRaw };
  }

  let general;
  try {
    general = getDailyGeneral(dateStr) || ensureDailyGeneral(dateStr);
  } catch (err) {
    return { error: 'fetch_general_failed', message: String(err) };
  }

  const generalOut = Object.assign({}, general, {
    rekichu: parseFieldJSON(general.rekichu_json, []),
    context: parseFieldJSON(general.context_json, {})
  });

  if (honmeisho == null) {
    return { date: dateStr, general: generalOut };
  }

  let personal;
  try {
    personal = getDailyPersonal(dateStr, honmeisho) || ensureDailyPersonal(dateStr, honmeisho);
  } catch (err) {
    return { error: 'fetch_personal_failed', message: String(err) };
  }

  const personalOut = Object.assign({}, personal, {
    to_do: parseFieldJSON(personal.to_do_json, []),
    to_avoid: parseFieldJSON(personal.to_avoid_json, []),
    kichi_directions: parseFieldJSON(personal.kichi_directions_json, []),
    kyo_directions: parseFieldJSON(personal.kyo_directions_json, {})
  });

  return {
    date: dateStr,
    honmeisho: honmeisho,
    honmeisho_name: HONMEISHO_NAMES[honmeisho],
    general: generalOut,
    personal: personalOut
  };
}

// ============================================================
// /month?yyyymm=YYYY-MM&honmeisho=N
//   月カレンダー用サマリ（30日先まで or その月）
// ============================================================
function handleMonth(e) {
  const yyyymmRaw = e && e.parameter ? e.parameter.yyyymm : null;
  const honmeishoRaw = e && e.parameter ? e.parameter.honmeisho : null;
  const honmeisho = honmeishoRaw ? Number(honmeishoRaw) : null;

  appendAccessLog({ path: 'month', date: yyyymmRaw, honmeisho: honmeisho });

  if (!yyyymmRaw || !/^\d{4}-?\d{2}$/.test(yyyymmRaw)) {
    return { error: 'invalid_yyyymm', value: yyyymmRaw };
  }
  const ym = yyyymmRaw.replace('-', '');
  const year = Number(ym.substring(0, 4));
  const month = Number(ym.substring(4, 6));
  if (month < 1 || month > 12) return { error: 'invalid_month' };
  if (honmeisho != null && (honmeisho < 1 || honmeisho > 9)) {
    return { error: 'invalid_honmeisho', value: honmeishoRaw };
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = year + '-' + ('0' + month).slice(-2) + '-' + ('0' + d).slice(-2);
    const general = getDailyGeneral(dateStr);
    if (!general) {
      days.push({ date: dateStr, available: false });
      continue;
    }
    const item = {
      date: dateStr,
      available: true,
      rokuyo: general.rokuyo_name,
      sekki: general.sekki_today ? general.sekki_name : null,
      kanshi: general.kanshi_full,
      day_star: Number(general.day_star),
      rekichu: parseFieldJSON(general.rekichu_json, []).map(function(r){ return r.name; })
    };
    if (honmeisho) {
      const personal = getDailyPersonal(dateStr, honmeisho);
      if (personal) {
        item.headline = personal.headline;
        item.score = scoreDay(general);
      }
    }
    days.push(item);
  }
  return { yyyymm: ym, year: year, month: month, honmeisho: honmeisho, days: days };
}

// 月カレンダー上の 5 段階★スコア（六曜と暦注の組合せから簡易算出）
function scoreDay(general) {
  let s = 3;
  if (general.rokuyo_name === '大安') s += 1;
  if (general.rokuyo_name === '仏滅') s -= 1;
  const rekichu = parseFieldJSON(general.rekichu_json, []);
  rekichu.forEach(function(r) {
    if (r.name === '天赦日' || r.name === '一粒万倍日' || r.name === '大明日') s += 1;
    if (r.name === '不成就日' || r.name === '受死日' || r.name === '黒日') s -= 1;
  });
  return Math.max(1, Math.min(5, s));
}

// ============================================================
// /calc?birthYear=YYYY&birthMonth=M&birthDay=D
//   本命星と月命星をフロント向けに算出して返す
// ============================================================
function handleCalcHonmeisho(e) {
  const p = (e && e.parameter) || {};
  const y = Number(p.birthYear);
  const m = Number(p.birthMonth);
  const d = Number(p.birthDay);

  appendAccessLog({ path: 'calc' });

  if (!y || !m || !d) return { error: 'missing_params', required: ['birthYear', 'birthMonth', 'birthDay'] };
  if (y < 1900 || y > 2100) return { error: 'year_out_of_range', value: y };
  if (m < 1 || m > 12) return { error: 'invalid_month', value: m };
  if (d < 1 || d > 31) return { error: 'invalid_day', value: d };

  const honmeisho = calculateHonmeisho(y, m, d);
  const gekkimei = calculateGekkimei(honmeisho, m, d);
  return {
    honmeisho: honmeisho,
    honmeisho_name: HONMEISHO_NAMES[honmeisho],
    element: FIVE_ELEMENTS[honmeisho],
    gekkimei: gekkimei,
    gekkimei_name: HONMEISHO_NAMES[gekkimei]
  };
}

// ============================================================
// /mapping?trigger_type=rokuyo&trigger_value=大安
//   mapping_actions シートから条件に合致するルールを返す
// ============================================================
function handleMapping(e) {
  const p = (e && e.parameter) || {};
  const triggerType = p.trigger_type;
  const triggerValue = p.trigger_value;

  appendAccessLog({ path: 'mapping' });

  if (!triggerType || !triggerValue) {
    return { error: 'missing_params', required: ['trigger_type', 'trigger_value'] };
  }

  const rules = getMappingActionsByTrigger(triggerType, triggerValue);
  return { trigger_type: triggerType, trigger_value: triggerValue, rules: rules };
}
