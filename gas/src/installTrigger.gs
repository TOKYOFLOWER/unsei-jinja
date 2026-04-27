// Phase 5: 0:00 JST 日次トリガーの設定／解除（GAS エディタから手動実行）

function installDailyTrigger() {
  // 既存の runDailyJob トリガーは一度全て削除
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'runDailyJob') ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger('runDailyJob')
    .timeBased()
    .atHour(0)
    .everyDays(1)
    .inTimezone('Asia/Tokyo')
    .create();

  Logger.log('Daily trigger installed for 0:00 JST');
}

function uninstallDailyTrigger() {
  let count = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'runDailyJob') {
      ScriptApp.deleteTrigger(t);
      count++;
    }
  });
  Logger.log('Removed ' + count + ' runDailyJob trigger(s)');
}

function listTriggers() {
  const list = ScriptApp.getProjectTriggers().map(function(t) {
    return {
      handler: t.getHandlerFunction(),
      type: String(t.getEventType()),
      source: String(t.getTriggerSource())
    };
  });
  Logger.log('Triggers: ' + JSON.stringify(list, null, 2));
  return list;
}
