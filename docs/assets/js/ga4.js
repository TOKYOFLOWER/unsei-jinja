// GA4 — gtag.js を非同期読込し、anonymize_ip を有効化

(function() {
  if (!window.CONFIG || !CONFIG.GA4_ID) return;
  // file:// 環境では送信しない（ローカル開発時のノイズ防止）
  if (location.protocol === 'file:') return;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + CONFIG.GA4_ID;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', CONFIG.GA4_ID, { anonymize_ip: true });
})();

function trackEvent(name, params) {
  if (window.gtag) window.gtag('event', name, params || {});
}
