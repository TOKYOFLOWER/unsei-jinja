// Phase 5: Claude プロンプト構築

const SYSTEM_PROMPT = [
  'あなたは日本の暦と九星気学に通じた、温かみのある運勢解説者です。',
  '以下のデータをもとに、対象者の今日の運勢を日本語で解説してください。',
  '',
  '【トーン】',
  '- 神秘的すぎず、現代の生活感に寄り添う',
  '- 励ましと具体性のバランスを取る',
  '- 「〜でしょう」「〜してみてください」など丁寧で柔らかい語尾',
  '- 占い断定的な表現は避け、「〜と良いとされています」「〜の傾向があります」を使う',
  '',
  '【出力形式】',
  '必ず以下の JSON 形式のみで返答してください。前置きや説明文・コードフェンスは一切不要です。',
  '',
  '{',
  '  "headline": "30字以内の今日のひとこと",',
  '  "overall": "全体運（120-180字）",',
  '  "love": "恋愛運（80-120字）",',
  '  "work": "仕事運（80-120字）",',
  '  "money": "金運（80-120字）",',
  '  "health": "健康運（80-120字）",',
  '  "to_do": ["やるべきこと1", "やるべきこと2", "やるべきこと3"],',
  '  "to_avoid": ["やらない方がいいこと1", "やらない方がいいこと2"],',
  '  "lucky_color": "ラッキーカラー（例: 朱色）",',
  '  "lucky_item": "ラッキーアイテム（例: 万年筆）",',
  '  "lucky_flower": "ラッキーな花（季節を考慮）",',
  '  "best_time": "勝負時間帯（例: 11時〜13時）",',
  '  "warning": "注意事項（凶方位・凶行動を含めて30-60字）"',
  '}'
].join('\n');

function buildUserPrompt(dailyGeneral, honmeisho, directionFortune) {
  const honmeiName = HONMEISHO_NAMES[honmeisho];
  const dayStarName = HONMEISHO_NAMES[Number(dailyGeneral.day_star)];
  const rekichu = parseFieldJSON(dailyGeneral.rekichu_json, []);
  const rekichuStr = (rekichu && rekichu.length > 0)
    ? rekichu.map(function(r){ return r.name + (r.type ? '(' + r.type + ')' : ''); }).join('、')
    : 'なし';

  const kichiStr = (directionFortune.kichi_labeled || [])
    .map(function(k){ return k.label; })
    .join('・') || 'なし';

  const kyoLabels = Object.keys(directionFortune.kyo_labeled || {})
    .map(function(k){ return directionFortune.kyo_labeled[k].label; })
    .filter(Boolean);
  const kyoStr = kyoLabels.length > 0 ? kyoLabels.join('・') : 'なし';

  return [
    '【対象者の本命星】',
    honmeiName,
    '',
    '【本日の暦】',
    '- 日付: ' + dailyGeneral.date + '（' + dailyGeneral.dayOfWeek_ja + '・' + dailyGeneral.wareki + '）',
    '- 六曜: ' + dailyGeneral.rokuyo_name + '（' + dailyGeneral.rokuyo_reading + '）',
    '- 時間帯吉凶: 朝=' + dailyGeneral.time_morning
      + ' / 正午=' + dailyGeneral.time_noon
      + ' / 午後=' + dailyGeneral.time_afternoon
      + ' / 夕=' + dailyGeneral.time_evening,
    '- 干支: ' + dailyGeneral.kanshi_full + '（動物: ' + (dailyGeneral.junishi_animal || '') + '）',
    '- 二十四節気: ' + dailyGeneral.sekki_name + (dailyGeneral.sekki_today ? '（本日）' : ''),
    '- 暦注: ' + rekichuStr,
    '',
    '【九星気学】',
    '- 日盤の中央星: ' + dayStarName,
    '- 本命星と日盤の関係: ' + getRelationDescription(honmeisho, Number(dailyGeneral.day_star)),
    '- 吉方位: ' + kichiStr,
    '- 主な凶方位: ' + kyoStr,
    '',
    '【shirabe.dev サマリ】',
    String(dailyGeneral.shirabe_summary || ''),
    '',
    '上記をもとに、システムプロンプトの形式で出力してください。',
    'JSON 以外の文字（前置き・コードフェンス ```json など）は絶対に含めないでください。'
  ].join('\n');
}
