// Phase 5: Anthropic Messages API ラッパ
// 5xx / 429 は指数バックオフでリトライ（最大 3 回）。4xx 系は即時失敗。

const ANTHROPIC_BASE = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

function callClaude(systemPrompt, userPrompt, options) {
  options = options || {};
  const apiKey = getProp('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set in script properties');

  const model = getConfig('claude_model') || 'claude-haiku-4-5-20251001';

  const payload = {
    model: model,
    max_tokens: options.maxTokens || 1500,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  };

  const maxRetries = options.maxRetries != null ? options.maxRetries : 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let response;
    try {
      response = UrlFetchApp.fetch(ANTHROPIC_BASE, {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
    } catch (netErr) {
      // ネットワーク層のエラーはリトライ対象
      lastError = netErr;
      logEvent('WARN', 'Claude network error', { attempt: attempt, error: String(netErr) });
      if (attempt < maxRetries) Utilities.sleep(1000 * attempt);
      continue;
    }

    const code = response.getResponseCode();
    if (code === 200) {
      const data = JSON.parse(response.getContentText());
      if (!data || !data.content || !data.content[0] || !data.content[0].text) {
        const shape = response.getContentText().substring(0, 1000);
        logEvent('ERROR', 'Claude API unexpected shape', { body: shape });
        throw new Error('Claude API returned unexpected shape: ' + shape);
      }
      return data.content[0].text;
    }

    const fullBody = response.getContentText();
    if (code === 429 || code >= 500) {
      lastError = new Error('Claude API ' + code + ': ' + fullBody.substring(0, 500));
      logEvent('WARN', 'Claude API transient error', {
        code: code, attempt: attempt, body: fullBody.substring(0, 1000)
      });
      if (attempt < maxRetries) Utilities.sleep(1000 * attempt);
      continue;
    }

    // 4xx（429 を除く）は即時失敗 — 全文ログを残す
    logEvent('ERROR', 'Claude API permanent error', { code: code, body: fullBody.substring(0, 2000) });
    throw new Error('Claude API ' + code + ': ' + fullBody.substring(0, 500));
  }

  throw lastError || new Error('Claude API: max retries exceeded');
}
