// setup.html — 本命星確認・変更ページ

(function() {
  const elCurrentStar = document.getElementById('currentStar');
  const elCurrentBirth = document.getElementById('currentBirth');
  const elSetupForm = document.getElementById('setupForm');
  const elDefaultActions = document.getElementById('defaultActions');

  const yearSel = document.getElementById('birthYear');
  const monthSel = document.getElementById('birthMonth');
  const daySel = document.getElementById('birthDay');
  const preview = document.getElementById('honmeiPreview');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const changeBtn = document.getElementById('changeBtn');
  const clearBtn = document.getElementById('clearBtn');

  function refreshCurrent() {
    const h = getHonmeisho();
    const birth = getBirth();
    if (h) {
      elCurrentStar.textContent = HONMEISHO_NAMES[h] || ('本命星 ' + h);
    } else {
      elCurrentStar.textContent = '未設定';
    }
    if (birth) {
      elCurrentBirth.textContent = birth.year + '年' + birth.month + '月' + birth.day + '日生まれ';
    } else {
      elCurrentBirth.textContent = '';
    }
  }

  function populateBirthSelects() {
    if (yearSel.options.length > 1) return;
    const currentYear = new Date().getFullYear();
    yearSel.appendChild(new Option('年', ''));
    for (let y = currentYear; y >= 1925; y--) {
      yearSel.appendChild(new Option(y + '年', y));
    }
    monthSel.appendChild(new Option('月', ''));
    for (let m = 1; m <= 12; m++) {
      monthSel.appendChild(new Option(m + '月', m));
    }
    daySel.appendChild(new Option('日', ''));
    for (let d = 1; d <= 31; d++) {
      daySel.appendChild(new Option(d + '日', d));
    }
  }

  function presetFromStorage() {
    const birth = getBirth();
    if (!birth) return;
    yearSel.value = birth.year;
    monthSel.value = birth.month;
    daySel.value = birth.day;
    updatePreview();
  }

  function updatePreview() {
    const y = parseInt(yearSel.value, 10);
    const m = parseInt(monthSel.value, 10);
    const d = parseInt(daySel.value, 10);
    if (y && m && d) {
      const h = calculateHonmeisho(y, m, d);
      preview.innerHTML =
        '<span class="result">あなたの本命星は<strong>' + HONMEISHO_NAMES[h] + '</strong>です</span>';
      saveBtn.disabled = false;
      saveBtn.dataset.honmeisho = h;
      saveBtn.dataset.year = y;
      saveBtn.dataset.month = m;
      saveBtn.dataset.day = d;
    } else {
      preview.innerHTML = '<span class="placeholder">↑ 入力すると本命星が表示されます</span>';
      saveBtn.disabled = true;
    }
  }

  function showForm() {
    elSetupForm.hidden = false;
    elDefaultActions.hidden = true;
  }

  function hideForm() {
    elSetupForm.hidden = true;
    elDefaultActions.hidden = false;
  }

  changeBtn.addEventListener('click', () => {
    populateBirthSelects();
    presetFromStorage();
    showForm();
  });

  cancelBtn.addEventListener('click', hideForm);

  [yearSel, monthSel, daySel].forEach(el => el.addEventListener('change', updatePreview));

  saveBtn.addEventListener('click', () => {
    const h = parseInt(saveBtn.dataset.honmeisho, 10);
    const y = parseInt(saveBtn.dataset.year, 10);
    const m = parseInt(saveBtn.dataset.month, 10);
    const d = parseInt(saveBtn.dataset.day, 10);
    saveHonmeisho(h);
    saveBirth(y, m, d);
    if (window.trackEvent) trackEvent('change_honmeisho', { honmeisho: h });
    refreshCurrent();
    hideForm();
  });

  clearBtn.addEventListener('click', () => {
    if (!confirm('すべての設定をクリアします。よろしいですか？\n（生年月日・本命星の保存データを削除します）')) return;
    clearAll();
    if (window.trackEvent) trackEvent('clear_settings');
    refreshCurrent();
    hideForm();
  });

  // 初期表示: 未設定なら直接フォームを開く
  refreshCurrent();
  populateBirthSelects();
  if (!getHonmeisho()) {
    presetFromStorage();
    showForm();
  }
})();
