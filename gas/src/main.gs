// Web App エントリポイント — doGet ルーティング
// path クエリパラメータで分岐し、各 handler は JSON を返す。
// CORS preflight が発生しないよう GET only で運用する（TASK 17 章参照）。

function doGet(e) {
  try {
    e = e || { parameter: {} };
    const path = String(e.parameter.path || 'health').toLowerCase();
    let result;

    switch (path) {
      case 'health':  result = handleHealth(e);         break;
      case 'daily':   result = handleDaily(e);          break;
      case 'month':   result = handleMonth(e);          break;
      case 'calc':    result = handleCalcHonmeisho(e);  break;
      case 'mapping': result = handleMapping(e);        break;
      default:
        result = { error: 'unknown_path', path: path };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('doGet error: ' + (err && err.stack ? err.stack : err));
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'server_error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
