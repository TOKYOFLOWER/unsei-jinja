// GAS Web App との通信 — GET only（CORS preflight 回避）

async function fetchDaily(date, honmeisho) {
  const url = new URL(CONFIG.GAS_URL);
  url.searchParams.set('path', 'daily');
  url.searchParams.set('date', date);
  if (honmeisho != null) url.searchParams.set('honmeisho', String(honmeisho));

  const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    throw new Error('HTTP ' + res.status);
  }
  const data = await res.json();
  if (data && data.error) {
    throw new Error(data.error + (data.message ? ': ' + data.message : ''));
  }
  return data;
}

async function fetchHealth() {
  const url = new URL(CONFIG.GAS_URL);
  url.searchParams.set('path', 'health');
  const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

async function fetchMonth(yyyymm, honmeisho) {
  const url = new URL(CONFIG.GAS_URL);
  url.searchParams.set('path', 'month');
  url.searchParams.set('yyyymm', yyyymm);
  if (honmeisho != null) url.searchParams.set('honmeisho', String(honmeisho));

  const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  if (data && data.error) throw new Error(data.error + (data.message ? ': ' + data.message : ''));
  return data;
}

async function fetchMapping(triggerType, triggerValue) {
  const url = new URL(CONFIG.GAS_URL);
  url.searchParams.set('path', 'mapping');
  url.searchParams.set('trigger_type', triggerType);
  url.searchParams.set('trigger_value', triggerValue);

  const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  if (data && data.error) throw new Error(data.error + (data.message ? ': ' + data.message : ''));
  return data;
}
