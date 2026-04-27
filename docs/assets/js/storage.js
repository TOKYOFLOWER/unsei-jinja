// localStorage ヘルパ — 本命星と生年月日を端末に保存
// プライバシー配慮: 生年月日は本命星算出のためだけに保持し、外部送信しない。

const STORAGE_KEYS = {
  HONMEISHO: 'unsei_honmeisho',
  BIRTH_YEAR: 'unsei_birth_year',
  BIRTH_MONTH: 'unsei_birth_month',
  BIRTH_DAY: 'unsei_birth_day',
  LAST_SEEN: 'unsei_last_seen'
};

function saveHonmeisho(num) {
  localStorage.setItem(STORAGE_KEYS.HONMEISHO, String(num));
}

function getHonmeisho() {
  const v = localStorage.getItem(STORAGE_KEYS.HONMEISHO);
  return v ? parseInt(v, 10) : null;
}

function saveBirth(y, m, d) {
  localStorage.setItem(STORAGE_KEYS.BIRTH_YEAR, String(y));
  localStorage.setItem(STORAGE_KEYS.BIRTH_MONTH, String(m));
  localStorage.setItem(STORAGE_KEYS.BIRTH_DAY, String(d));
}

function getBirth() {
  const y = localStorage.getItem(STORAGE_KEYS.BIRTH_YEAR);
  const m = localStorage.getItem(STORAGE_KEYS.BIRTH_MONTH);
  const d = localStorage.getItem(STORAGE_KEYS.BIRTH_DAY);
  if (!y || !m || !d) return null;
  return { year: parseInt(y, 10), month: parseInt(m, 10), day: parseInt(d, 10) };
}

function touchLastSeen() {
  localStorage.setItem(STORAGE_KEYS.LAST_SEEN, new Date().toISOString());
}

function clearAll() {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
}
