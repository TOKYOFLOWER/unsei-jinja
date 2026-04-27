// Spreadsheet 操作 + 初期セットアップ
// setupSpreadsheet() を GAS エディタから一度実行すれば、
// 全シート・ヘッダー・config 初期値・mapping_actions の seed データが揃う。

const SHEET_DAILY_GENERAL  = 'daily_general';
const SHEET_DAILY_PERSONAL = 'daily_personal';
const SHEET_MAPPING        = 'mapping_actions';
const SHEET_KYUSEI_LOOKUP  = 'kyusei_lookup';
const SHEET_ACCESS_LOG     = 'access_log';
const SHEET_CONFIG         = 'config';

const SCHEMAS = {
  [SHEET_DAILY_GENERAL]: [
    'date','wareki','dayOfWeek_ja','rokuyo_name','rokuyo_reading',
    'time_morning','time_noon','time_afternoon','time_evening',
    'kanshi_full','jikkan','junishi','junishi_animal',
    'sekki_name','sekki_today','rekichu_json','context_json','shirabe_summary',
    'day_star','month_star','year_star','created_at'
  ],
  [SHEET_DAILY_PERSONAL]: [
    'date','honmeisho','headline','overall_text','love_text','work_text','money_text','health_text',
    'to_do_json','to_avoid_json','lucky_color','lucky_item','lucky_flower','best_time','warning',
    'kichi_directions_json','kyo_directions_json','relation_to_dayStar','created_at'
  ],
  [SHEET_MAPPING]: [
    'rule_id','trigger_type','trigger_value','direction','category','text','priority'
  ],
  [SHEET_KYUSEI_LOOKUP]: [
    'honmeisho','month_2to3','month_3to4','month_4to5','month_5to6','month_6to7','month_7to8',
    'month_8to9','month_9to10','month_10to11','month_11to12','month_12to1','month_1to2'
  ],
  [SHEET_ACCESS_LOG]: [
    'id','timestamp','path','honmeisho','date','ua_summary'
  ],
  [SHEET_CONFIG]: [
    'key','value','note'
  ]
};

// 数値・日付の自動変換を抑止したい列を sheet 単位で指定（プレーンテキスト @ 化）
const TEXT_FORMAT_COLS = {
  [SHEET_DAILY_GENERAL]: ['date','kanshi_full','jikkan','junishi','rekichu_json','context_json','created_at'],
  [SHEET_DAILY_PERSONAL]: ['date','to_do_json','to_avoid_json','kichi_directions_json','kyo_directions_json','created_at'],
  [SHEET_ACCESS_LOG]: ['timestamp','date'],
  [SHEET_CONFIG]: ['value']
};

const CONFIG_SEED = [
  ['daily_job_enabled', 'true', 'バッチ停止フラグ。false にすると runDailyJob が即 return する'],
  ['claude_model', 'claude-haiku-4-5-20251001', '使用する Anthropic モデル ID'],
  ['ahead_days', '3', '何日先まで先行生成するか（日数）'],
  ['operator_name', '銀座東京フラワー', 'フッター運営者表示'],
  ['contact_url', 'https://tokyoflower.jp/contact/', 'お問い合わせ URL']
];

const MAPPING_SEED = [
  // [rule_id, trigger_type, trigger_value, direction, category, text, priority]
  ['M001','rokuyo','大安','do','全般','重要な契約や開始事はこの日に',9],
  ['M002','rokuyo','仏滅','avoid','全般','新規事業の着手は避ける',9],
  ['M003','rokuyo','友引','avoid','全般','葬儀やお悔やみ事は控える',7],
  ['M004','rokuyo','友引','do','恋愛','友を引く日。贈り物や慶事と相性が良い',6],
  ['M005','rokuyo','先勝','do','仕事','急ぎの用事は午前中に済ませる',6],
  ['M006','rokuyo','先負','do','仕事','落ち着いた行動は午後に進めると吉',6],
  ['M007','rokuyo','赤口','avoid','全般','朝夕は控えめに、正午前後の行動が吉',6],
  ['M008','rekichu','一粒万倍日','do','金運','財布の新調・口座開設で運気上昇',9],
  ['M009','rekichu','一粒万倍日','do','仕事','新規プロジェクトの種まきに最適',8],
  ['M010','rekichu','天赦日','do','全般','何を始めても許される最上吉日',10],
  ['M011','rekichu','天赦日','do','恋愛','入籍・告白・婚約に最適',9],
  ['M012','rekichu','不成就日','avoid','全般','新規の願掛けは別日に回す',8],
  ['M013','rekichu','三隣亡','avoid','全般','建築・大型購入は控える',8],
  ['M014','rekichu','大明日','do','全般','移転・引っ越しに最適',8],
  ['M015','rekichu','寅の日','do','金運','旅行・お金の動きは吉',7],
  ['M016','rekichu','巳の日','do','金運','弁財天詣りでさらに運気上昇',7],
  ['M017','rekichu','己巳の日','do','金運','60日に一度の最上金運日',9],
  ['M018','rekichu','甲子の日','do','全般','新たな取り組みの開始日に',7],
  ['M019','rekichu','鬼宿日','do','全般','婚礼以外は何事にも吉',7],
  ['M020','rekichu','鬼宿日','avoid','恋愛','婚礼関係のみ控える',7],
  ['M021','rekichu','神吉日','do','全般','神社参拝や祈願ごとに最適',7],
  ['M022','rekichu','母倉日','do','恋愛','婚礼・入籍に天が味方する日',8],
  ['M023','rekichu','八専','avoid','全般','重要事の判断は控えめに',6],
  ['M024','rekichu','十方暮','avoid','全般','八方塞がりの傾向、慎重に動く',6],
  ['M025','rekichu','大つち','avoid','全般','土を動かす作業は控える',6],
  ['M026','rekichu','小つち','avoid','全般','土に関わる作業は別日に',6],
  ['M027','rekichu','受死日','avoid','全般','万事控えめに過ごす',7],
  ['M028','rekichu','黒日','avoid','全般','重要事は別日に回す',7],
  ['M029','rekichu','庚申','do','健康','体調管理を意識する一日',5],
  ['M030','rekichu','二の午','do','仕事','商売繁盛・稲荷参りに吉',6],
  ['M031','context','引っ越し','do','全般','大明日と天赦日の重なりが最良',7],
  ['M032','context','結婚','do','恋愛','大安・天赦日・母倉日の組み合わせが最良',8]
];

// ============================================================
// 初期セットアップ — GAS エディタから手動実行
// ============================================================
function setupSpreadsheet() {
  const ss = getSpreadsheet();
  const created = [];
  const existing = [];

  Object.keys(SCHEMAS).forEach(function(name) {
    let sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      created.push(name);
    } else {
      existing.push(name);
    }

    const headers = SCHEMAS[name];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sh.setFrozenRows(1);

    // テキスト列のフォーマットを @ にして自動変換を回避
    const textCols = TEXT_FORMAT_COLS[name] || [];
    textCols.forEach(function(colName) {
      const idx = headers.indexOf(colName);
      if (idx >= 0) {
        sh.getRange(1, idx + 1, sh.getMaxRows(), 1).setNumberFormat('@');
      }
    });
  });

  // デフォルト "Sheet1" / "シート1" は不要なので削除
  ['Sheet1', 'シート1'].forEach(function(n) {
    const s = ss.getSheetByName(n);
    if (s && Object.keys(SCHEMAS).indexOf(n) === -1) {
      try { ss.deleteSheet(s); } catch (_) {}
    }
  });

  const cfg = seedConfigIfMissing();
  const map = seedMappingActionsIfMissing();

  const result = {
    spreadsheet: ss.getName(),
    created_sheets: created,
    existing_sheets: existing,
    config_seeded: cfg.inserted,
    config_skipped: cfg.skipped,
    mapping_seeded: map.inserted,
    mapping_skipped: map.skipped
  };
  Logger.log('setupSpreadsheet result: ' + JSON.stringify(result, null, 2));
  return result;
}

function seedConfigIfMissing() {
  const sh = getSheet(SHEET_CONFIG);
  const existingKeys = readColumn(sh, 1, 2);
  let inserted = 0, skipped = 0;
  CONFIG_SEED.forEach(function(row) {
    if (existingKeys.indexOf(row[0]) === -1) {
      sh.appendRow(row);
      inserted++;
    } else {
      skipped++;
    }
  });
  return { inserted: inserted, skipped: skipped };
}

function seedMappingActionsIfMissing() {
  const sh = getSheet(SHEET_MAPPING);
  const existingIds = readColumn(sh, 1, 2);
  let inserted = 0, skipped = 0;
  MAPPING_SEED.forEach(function(row) {
    if (existingIds.indexOf(row[0]) === -1) {
      sh.appendRow(row);
      inserted++;
    } else {
      skipped++;
    }
  });
  return { inserted: inserted, skipped: skipped };
}

// ============================================================
// 内部ヘルパ
// ============================================================
function getSheet(name) {
  const sh = getSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Sheet not found: ' + name + ' (run setupSpreadsheet first)');
  return sh;
}

function readColumn(sheet, col, startRow) {
  const last = sheet.getLastRow();
  if (last < startRow) return [];
  return sheet.getRange(startRow, col, last - startRow + 1, 1)
    .getValues()
    .map(function(r){ return r[0]; });
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach(function(h, i){ obj[h] = row[i]; });
  return obj;
}

function objectToRow(headers, obj) {
  return headers.map(function(h){ return obj[h] !== undefined && obj[h] !== null ? obj[h] : ''; });
}

// セル値とキーの正規化 — Date は yyyy-MM-dd（JST）に揃える。
// @ フォーマットを設定していても appendRow が ISO 日付文字列を Date 型に
// 自動変換してしまうケースがあり、String() 比較だと一致しないため。
function normalizeKey(v) {
  if (v == null) return '';
  if (v instanceof Date) {
    return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  }
  return String(v).trim();
}

function findRowByKey(sheetName, keyCols, keyValues) {
  const sh = getSheet(sheetName);
  const headers = SCHEMAS[sheetName];
  const last = sh.getLastRow();
  if (last < 2) return null;
  const values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  const idx = keyCols.map(function(k){ return headers.indexOf(k); });
  for (let i = 0; i < values.length; i++) {
    let match = true;
    for (let j = 0; j < idx.length; j++) {
      if (normalizeKey(values[i][idx[j]]) !== normalizeKey(keyValues[j])) { match = false; break; }
    }
    if (match) return rowToObject(headers, values[i]);
  }
  return null;
}

function appendObjectRow(sheetName, rowObj) {
  const sh = getSheet(sheetName);
  const headers = SCHEMAS[sheetName];
  sh.appendRow(objectToRow(headers, rowObj));
}

// ============================================================
// 公開 CRUD（後続 Phase で使用）
// ============================================================
function getConfig(key) {
  const sh = getSheet(SHEET_CONFIG);
  const last = sh.getLastRow();
  if (last < 2) return null;
  const values = sh.getRange(2, 1, last - 1, 2).getValues();
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === key) return values[i][1];
  }
  return null;
}

function appendAccessLog(entry) {
  try {
    const sh = getSheet(SHEET_ACCESS_LOG);
    const id = sh.getLastRow(); // header=row1 のため次の id は lastRow と一致
    sh.appendRow([
      id,
      nowIso(),
      entry.path || '',
      entry.honmeisho != null ? entry.honmeisho : '',
      entry.date || '',
      entry.ua_summary || ''
    ]);
  } catch (err) {
    // ログ失敗は本処理を止めない
    Logger.log('appendAccessLog failed: ' + err);
  }
}

function getDailyGeneral(dateString) {
  return findRowByKey(SHEET_DAILY_GENERAL, ['date'], [dateString]);
}

function appendDailyGeneral(rowObj) {
  appendObjectRow(SHEET_DAILY_GENERAL, rowObj);
}

function getDailyPersonal(dateString, honmeisho) {
  return findRowByKey(SHEET_DAILY_PERSONAL, ['date','honmeisho'], [dateString, Number(honmeisho)]);
}

function appendDailyPersonal(rowObj) {
  appendObjectRow(SHEET_DAILY_PERSONAL, rowObj);
}

// 1 日分（最大 9 行）をまとめて setValues で書き込む。Spreadsheet API 呼び出しを 9→1 に削減。
function appendDailyPersonalBatch(rowObjs) {
  if (!rowObjs || rowObjs.length === 0) return;
  const sh = getSheet(SHEET_DAILY_PERSONAL);
  const headers = SCHEMAS[SHEET_DAILY_PERSONAL];
  const values = rowObjs.map(function(o){ return objectToRow(headers, o); });
  const startRow = sh.getLastRow() + 1;
  sh.getRange(startRow, 1, values.length, headers.length).setValues(values);
}

function getMappingActionsByTrigger(triggerType, triggerValue) {
  const sh = getSheet(SHEET_MAPPING);
  const headers = SCHEMAS[SHEET_MAPPING];
  const last = sh.getLastRow();
  if (last < 2) return [];
  const values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  const result = [];
  for (let i = 0; i < values.length; i++) {
    const row = rowToObject(headers, values[i]);
    if (row.trigger_type === triggerType && row.trigger_value === triggerValue) {
      result.push(row);
    }
  }
  return result;
}

// ============================================================
// 削除ヘルパ — 古いキャッシュを削除して再生成させたいときに使う
// 行番号がずれないよう下から順に削除する
// ============================================================
function deleteDailyGeneralByDate(dateStr) {
  const sh = getSheet(SHEET_DAILY_GENERAL);
  const headers = SCHEMAS[SHEET_DAILY_GENERAL];
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const dateColIdx = headers.indexOf('date');
  const values = sh.getRange(2, dateColIdx + 1, last - 1, 1).getValues();
  let deleted = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    if (String(values[i][0]) === dateStr) {
      sh.deleteRow(i + 2); // +2: ヘッダー行 + 0-indexed offset
      deleted++;
    }
  }
  Logger.log('deleteDailyGeneralByDate(' + dateStr + '): deleted ' + deleted + ' row(s)');
  return deleted;
}

function deleteDailyPersonalByDate(dateStr, honmeisho) {
  const sh = getSheet(SHEET_DAILY_PERSONAL);
  const headers = SCHEMAS[SHEET_DAILY_PERSONAL];
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const dateColIdx = headers.indexOf('date');
  const honmeiColIdx = headers.indexOf('honmeisho');
  const values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  let deleted = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    if (String(values[i][dateColIdx]) !== dateStr) continue;
    if (honmeisho != null && Number(values[i][honmeiColIdx]) !== Number(honmeisho)) continue;
    sh.deleteRow(i + 2);
    deleted++;
  }
  const target = honmeisho != null ? honmeisho : 'all';
  Logger.log('deleteDailyPersonalByDate(' + dateStr + ', ' + target + '): deleted ' + deleted + ' row(s)');
  return deleted;
}

function _resetDate_0427() {
  deleteDailyGeneralByDate('2026-04-27');
  deleteDailyPersonalByDate('2026-04-27');
  Logger.log('Reset complete for 2026-04-27');
}

// ============================================================
// 重複行クリーンアップ
// 主キーで重複する行を検出し、created_at が最も新しい1行だけを残して他を削除する
// ============================================================
function dedupeDailyGeneral() {
  return _dedupeBySheet(SHEET_DAILY_GENERAL, ['date']);
}

function dedupeDailyPersonal() {
  return _dedupeBySheet(SHEET_DAILY_PERSONAL, ['date', 'honmeisho']);
}

function _dedupeBySheet(sheetName, keyCols) {
  const sh = getSheet(sheetName);
  const headers = SCHEMAS[sheetName];
  const last = sh.getLastRow();
  if (last < 2) return { kept: 0, removed: 0 };

  const values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  const keyIdx = keyCols.map(function(k){ return headers.indexOf(k); });
  const createdIdx = headers.indexOf('created_at');

  // キー → [{ rowNum, created }, ...]
  const groups = {};
  values.forEach(function(row, i) {
    const key = keyIdx.map(function(ki){ return normalizeKey(row[ki]); }).join('|');
    if (!groups[key]) groups[key] = [];
    groups[key].push({
      rowNum: i + 2, // ヘッダー行 + 0-indexed
      created: createdIdx >= 0 ? String(row[createdIdx]) : ''
    });
  });

  // 各グループ: created_at 降順で最新を残し、他を削除候補に
  const toDelete = [];
  let kept = 0;
  Object.keys(groups).forEach(function(k) {
    const grp = groups[k];
    if (grp.length === 1) { kept++; return; }
    grp.sort(function(a, b){ return b.created.localeCompare(a.created); });
    kept++;
    for (let i = 1; i < grp.length; i++) toDelete.push(grp[i].rowNum);
  });

  // 行番号がずれないよう降順で削除
  toDelete.sort(function(a, b){ return b - a; });
  toDelete.forEach(function(rowNum){ sh.deleteRow(rowNum); });

  const result = { kept: kept, removed: toDelete.length };
  Logger.log('dedupe(' + sheetName + '): ' + JSON.stringify(result));
  return result;
}
