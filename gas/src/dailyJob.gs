// Phase 5: 日次バッチ — 0:00 JST トリガーで起動して 9 星 × ahead_days+1 日分のキャッシュを生成

// ============================================================
// daily_general を確実に揃える（既存ならそのまま返す）
// ============================================================
function ensureDailyGeneral(dateStr) {
  const existing = getDailyGeneral(dateStr);
  if (existing) return existing;

  // 追記する場合は必ずログ — 1日に2回以上ここを通れば重複の兆候。
  logEvent('INFO', 'ensureDailyGeneral: cache miss, appending', { date: dateStr });
  const shirabe = fetchShirabeCalendar(dateStr);
  const date = new Date(dateStr + 'T00:00:00+09:00');
  const dayStar   = calculateDayStar(date);
  const monthStar = calculateMonthStar(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const yearStar  = calculateYearStar(getAdjustedYear(date.getFullYear(), date.getMonth() + 1, date.getDate()));

  const row = {
    date: dateStr,
    wareki: pick(shirabe, 'wareki', ''),
    dayOfWeek_ja: pick(shirabe, 'day_of_week.ja', ''),
    rokuyo_name: pick(shirabe, 'rokuyo.name', ''),
    rokuyo_reading: pick(shirabe, 'rokuyo.reading', ''),
    time_morning: pick(shirabe, 'rokuyo.time_slots.morning', ''),
    time_noon: pick(shirabe, 'rokuyo.time_slots.noon', ''),
    time_afternoon: pick(shirabe, 'rokuyo.time_slots.afternoon', ''),
    time_evening: pick(shirabe, 'rokuyo.time_slots.evening', ''),
    kanshi_full: pick(shirabe, 'kanshi.full', ''),
    jikkan: pick(shirabe, 'kanshi.jikkan', ''),
    junishi: pick(shirabe, 'kanshi.junishi', ''),
    junishi_animal: pick(shirabe, 'kanshi.junishi_animal.ja', ''),
    sekki_name: pick(shirabe, 'nijushi_sekki.name', ''),
    sekki_today: !!pick(shirabe, 'nijushi_sekki.is_today', false),
    rekichu_json: JSON.stringify(shirabe.rekichu || []),
    context_json: JSON.stringify(shirabe.context || {}),
    shirabe_summary: pick(shirabe, 'summary', ''),
    day_star: dayStar,
    month_star: monthStar,
    year_star: yearStar,
    created_at: nowIso()
  };

  appendDailyGeneral(row);
  return row;
}

// ============================================================
// daily_personal を 1 件 ensure（既存ならそのまま返す、無ければ Claude 呼び出し）
// ============================================================
function ensureDailyPersonal(dateStr, honmeisho) {
  const existing = getDailyPersonal(dateStr, honmeisho);
  if (existing) return existing;

  const row = computeDailyPersonalRow(dateStr, honmeisho);
  appendDailyPersonal(row);
  return row;
}

// ============================================================
// daily_personal の行データを計算（書き込みは呼び出し側）
// runDailyJob* で 9 件まとめてバッチ書き込みするための関数
// ============================================================
function computeDailyPersonalRow(dateStr, honmeisho) {
  const general = ensureDailyGeneral(dateStr);
  const direction = computeDirectionFortune(honmeisho, general, dateStr);
  const userPrompt = buildUserPrompt(general, honmeisho, direction);

  const claudeText = callClaude(SYSTEM_PROMPT, userPrompt, { maxTokens: 1500, maxRetries: 3 });
  const parsed = safeParseJSON(claudeText);
  if (!parsed) {
    throw new Error('Failed to parse Claude response: ' + String(claudeText).substring(0, 300));
  }

  return {
    date: dateStr,
    honmeisho: honmeisho,
    headline: parsed.headline || '',
    overall_text: parsed.overall || '',
    love_text: parsed.love || '',
    work_text: parsed.work || '',
    money_text: parsed.money || '',
    health_text: parsed.health || '',
    to_do_json: JSON.stringify(parsed.to_do || []),
    to_avoid_json: JSON.stringify(parsed.to_avoid || []),
    lucky_color: parsed.lucky_color || '',
    lucky_item: parsed.lucky_item || '',
    lucky_flower: parsed.lucky_flower || '',
    best_time: parsed.best_time || '',
    warning: parsed.warning || '',
    kichi_directions_json: JSON.stringify(direction.kichi_labeled || direction.kichi),
    kyo_directions_json: JSON.stringify(direction.kyo_labeled || direction.kyo),
    relation_to_dayStar: getRelationDescription(honmeisho, Number(general.day_star)),
    created_at: nowIso()
  };
}

// ============================================================
// バッチ本体 — トリガーから呼ぶデフォルト
// ============================================================
function runDailyJob() {
  const ahead = parseInt(getConfig('ahead_days') || '3', 10);
  return runDailyJobRange(0, ahead);
}

// 6 分制限超過時に分割実行するための前半／後半（手動 or 個別トリガー設定）
function runDailyJobBatch1() {
  return runDailyJobRange(0, 1);
}

function runDailyJobBatch2() {
  return runDailyJobRange(2, 3);
}

// ============================================================
// startOffset 〜 endOffset 日後を順に処理
// 各日付について 9 星分を生成 → 1 日分まとめて setValues で書き込み
// Claude API 失敗時は 3 回までリトライ（callClaude 内蔵）。それでも駄目なら当該日付をスキップ。
// ============================================================
function runDailyJobRange(startOffset, endOffset) {
  const flag = getConfig('daily_job_enabled');
  if (flag === 'false' || flag === false) {
    Logger.log('Daily job disabled by flag');
    return { skipped: true, reason: 'disabled' };
  }

  const todayStr = jstDateString();
  const today = new Date(todayStr + 'T00:00:00+09:00');
  const stats = {
    range: { start: startOffset, end: endOffset },
    dates_done: [],
    dates_skipped: [],
    rows_written: 0,
    started_at: nowIso()
  };

  for (let offset = startOffset; offset <= endOffset; offset++) {
    const target = new Date(today);
    target.setDate(today.getDate() + offset);
    const dateStr = jstDateString(target);

    // daily_general
    let general;
    try {
      general = ensureDailyGeneral(dateStr);
    } catch (err) {
      logEvent('ERROR', 'shirabe failed, skipping date', { date: dateStr, error: String(err) });
      stats.dates_skipped.push({ date: dateStr, reason: 'shirabe', error: String(err) });
      continue;
    }

    // 9 星分: 既存は除外し、新規分のみ生成 → 一括書き込み
    const newRows = [];
    let dateAborted = false;
    for (let h = 1; h <= 9; h++) {
      if (getDailyPersonal(dateStr, h)) {
        logEvent('INFO', 'skip existing personal', { date: dateStr, honmeisho: h });
        continue;
      }
      try {
        const row = computeDailyPersonalRow(dateStr, h);
        newRows.push(row);
        logEvent('INFO', 'generated personal', {
          date: dateStr,
          honmeisho: h,
          headline: String(row.headline || '').substring(0, 30)
        });
      } catch (err) {
        logEvent('ERROR', 'Claude failed after retries, aborting date', {
          date: dateStr, honmeisho: h, error: String(err)
        });
        stats.dates_skipped.push({ date: dateStr, reason: 'claude', honmeisho: h, error: String(err) });
        dateAborted = true;
        break;
      }
      Utilities.sleep(1500); // Claude rate-limit 対策
    }

    if (newRows.length > 0) {
      try {
        appendDailyPersonalBatch(newRows);
        stats.rows_written += newRows.length;
      } catch (werr) {
        logEvent('ERROR', 'batch write failed', { date: dateStr, error: String(werr) });
        stats.dates_skipped.push({ date: dateStr, reason: 'write', error: String(werr) });
        continue;
      }
    }

    if (!dateAborted) stats.dates_done.push(dateStr);
  }

  stats.finished_at = nowIso();
  Logger.log('runDailyJobRange stats: ' + JSON.stringify(stats, null, 2));
  return stats;
}

// ============================================================
// GAS エディタから引数なしで呼べる単日 wrapper
// 6 分制限に当たった場合は対象オフセットだけ個別に再実行できる。
// 例: 2026-04-30 (今日=04-27 なら offset=3) 単独再生成 → _runDailyJobOffset3
// ============================================================
function _runDailyJobOffset0() { return runDailyJobRange(0, 0); }
function _runDailyJobOffset1() { return runDailyJobRange(1, 1); }
function _runDailyJobOffset2() { return runDailyJobRange(2, 2); }
function _runDailyJobOffset3() { return runDailyJobRange(3, 3); }

// ============================================================
// 内部ヘルパ — ドット記法で安全にネストしたフィールドを取得
// ============================================================
function pick(obj, path, fallback) {
  if (!obj) return fallback;
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length; i++) {
    if (cur == null) return fallback;
    cur = cur[parts[i]];
  }
  return cur == null ? fallback : cur;
}
