// Phase 5: shirabe.dev カレンダー API ラッパ
// Free 枠は X-API-Key 不要。Properties に SHIRABE_API_KEY が設定されていればヘッダ付与。

const SHIRABE_BASE = 'https://shirabe.dev/api/v1/calendar';

function fetchShirabeCalendar(dateString) {
  const url = SHIRABE_BASE + '/' + dateString;
  const apiKey = getProp('SHIRABE_API_KEY');
  const headers = {};
  if (apiKey) headers['X-API-Key'] = apiKey;

  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: headers,
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  if (code !== 200) {
    throw new Error('shirabe API failed (' + code + '): ' + response.getContentText().substring(0, 500));
  }

  return JSON.parse(response.getContentText());
}
