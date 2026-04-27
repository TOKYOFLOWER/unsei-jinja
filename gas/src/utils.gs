// 共通ユーティリティ — タイムゾーン処理、Properties、Spreadsheet 取得、ロギング

const TZ = 'Asia/Tokyo';
const APP_VERSION = '1.0.0';

function jstNow() {
  return new Date();
}

function jstDateString(d) {
  return Utilities.formatDate(d || new Date(), TZ, 'yyyy-MM-dd');
}

function nowIso() {
  return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function getProp(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function getSpreadsheet() {
  const id = getProp('SPREADSHEET_ID');
  if (!id) {
    throw new Error('SPREADSHEET_ID is not set in script properties');
  }
  return SpreadsheetApp.openById(id);
}

function logEvent(level, msg, meta) {
  Logger.log('[' + level + '] ' + msg + ' ' + JSON.stringify(meta || {}));
}

// Claude のレスポンスや外部 JSON の前後に余計な文字が混じっていても、
// ```json fence、前置き文、末尾の説明文を除去してから JSON.parse を試みる。
function safeParseJSON(text) {
  if (text == null) return null;
  let s = String(text).trim();

  // ```json ... ``` あるいは ``` ... ``` を剥がす
  s = s.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');

  // そのまま試す
  try { return JSON.parse(s); } catch (_) {}

  // 最初の { から最後の } までを抜き出して再試行
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = s.substring(start, end + 1);
    try { return JSON.parse(candidate); } catch (_) {}
  }

  return null;
}

// セルに格納された JSON 文字列を安全に parse。失敗時は fallback。
function parseFieldJSON(s, fallback) {
  if (s == null || s === '') return fallback;
  try { return JSON.parse(s); } catch (_) { return fallback; }
}
