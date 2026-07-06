// --- Modal editor with API persistence ---
let modalState = { groupId: null, keys: [], defaultKeys: new Set() };
const modal = document.getElementById('options-modal');
const modalRowTemplate = document.getElementById('modal-row-template');

async function openOptionsModal(gid) {
  modalState.groupId = String(gid);
  const form = document.querySelector(`.choice-form[data-group-id="${gid}"]`);
  const opts = await getOptionsForGroup(form) || [];
  const keys = unionKeysGeneric(opts);
  modalState.keys = keys;
  modalState.defaultKeys = new Set(
    (form && form.dataset.defaultKeys ? form.dataset.defaultKeys.split(',') : []).filter(Boolean)
  );
  renderModal(opts, keys, form);
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
  modalState = { groupId: null, keys: [], defaultKeys: new Set() };
}

function renderModal(opts, keys, form) {
  document.getElementById('modal-title').textContent = 'Éditer les options de ' + (form ? form.dataset.groupName : modalState.groupId);
  const rowsWrap = document.getElementById('modal-rows');
  rowsWrap.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'flex w-fit gap-2 p-1 mb-3 font-bold text-slate-400 text-sm uppercase tracking-wide';

  const hn = document.createElement('div');
  hn.textContent = 'Nom';
  hn.className = 'w-37.5 shrink-0 flex items-center justify-start px-3 py-1 border border-green-500 rounded text-slate-400';
  header.appendChild(hn);

  keys.forEach(k => {
    const hk = document.createElement('div');
    hk.className = 'w-37.5 shrink-0 flex items-center justify-between gap-1 px-3 py-1 rounded border border-green-500';
    const span = document.createElement('span');
    span.textContent = prettyKey(k);
    span.className = 'text-slate-400 truncate';
    hk.appendChild(span);

    if (modalState.defaultKeys.has(k)) {
      const lock = document.createElement('span');
      lock.textContent = '🔒';
      lock.title = 'Propriété par défaut : non supprimable';
      lock.className = 'text-slate-500 text-sm shrink-0';
      hk.appendChild(lock);
    } else {
      const rm = document.createElement('button');
      rm.textContent = '✕';
      rm.title = 'Retirer la propriété';
      rm.className = 'bg-transparent border-none text-red-300 cursor-pointer text-base shrink-0 transition hover:text-red-500';
      rm.addEventListener('click', () => {
        removePropertyKey(k);
      });
      hk.appendChild(rm);
    }
    header.appendChild(hk);
  });

  const filldiv = document.createElement('div');
  filldiv.className = 'p-8';
  header.appendChild(filldiv); // for fill

  rowsWrap.appendChild(header);
  (opts || []).forEach(o => rowsWrap.appendChild(buildModalRow(o, keys)));

  const foot = document.createElement('div');
  foot.className = 'mt-4';
  const addRowBtn = document.createElement('button');
  addRowBtn.textContent = '+ Ajouter une option';
  addRowBtn.className = 'px-4 py-2.5 bg-blue-600 text-white border border-blue-600 rounded-md font-medium text-sm cursor-pointer transition hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/40';
  addRowBtn.addEventListener('click', () => {
    const newRow = buildModalRow({}, modalState.keys);
    rowsWrap.insertBefore(newRow, addRowBtn.parentNode);
  });
  foot.appendChild(addRowBtn);
  rowsWrap.appendChild(foot);
}

function buildModalRow(opt, keys) {
  const row = modalRowTemplate.content.firstElementChild.cloneNode(true);

  const inpName = row.querySelector('[data-field="name"]');
  inpName.value = opt && opt.name ? opt.name : '';

  const delBtn = row.querySelector('[data-field="remove"]');
  delBtn.addEventListener('click', e => {
    e.preventDefault();
    row.remove();
  });

  keys.forEach(k => {
    const inp = document.createElement('input');
    inp.placeholder = prettyKey(k);
    inp.className = 'modal-input w-37.5 shrink-0 bg-slate-800 border border-slate-600 text-slate-200 px-3 py-2 rounded text-sm outline-none transition focus:border-blue-600 focus:ring-3 focus:ring-blue-600/10';
    inp.value = opt && opt[k] !== undefined ? String(opt[k]) : '';
    inp.dataset.key = k;
    row.insertBefore(inp, delBtn);
  });

  return row;
}

function removePropertyKey(key) {
  if (modalState.defaultKeys.has(key)) return;
  modalState.keys = modalState.keys.filter(k => k !== key);
  const current = collectModalRows();
  const form = document.querySelector(`.choice-form[data-group-id="${modalState.groupId}"]`);
  renderModal(current, modalState.keys, form);
}

function collectModalRows() {
  const rowsWrap = document.getElementById('modal-rows');
  const rows = Array.from(rowsWrap.querySelectorAll('.modal-option-row'));
  return rows.map(r => {
    const name = r.querySelector('[data-field="name"]').value;
    const obj = { name };
    modalState.keys.forEach(k => {
      const inp = r.querySelector(`input[data-key="${k}"]`);
      if (inp) obj[k] = tryParseNumber(inp.value);
    });
    return obj;
  });
}

function unionKeysGeneric(opts) {
  const s = new Set();
  (opts || []).forEach(o => {
    if (o && typeof o === 'object') {
      Object.keys(o).forEach(k => {
        if (k !== 'name') s.add(k);
      });
    }
  });
  return Array.from(s);
}

function tryParseNumber(v) {
  if (v === undefined) return v;
  const n = parseFloat(v);
  return isNaN(n) ? v : n;
}

document.getElementById('modal-add-prop').addEventListener('click', async () => {
  const v = document.getElementById('modal-new-prop').value.trim();
  if (!v) return alert('Nom de la propriuété');
  if (modalState.keys.includes(v)) return alert('Cette propriété existe déjà');
  modalState.keys.push(v);
  const rows = collectModalRows();
  const form = document.querySelector(`.choice-form[data-group-id="${modalState.groupId}"]`);
  renderModal(rows, modalState.keys, form);
  document.getElementById('modal-new-prop').value = '';
});

document.getElementById('modal-cancel').addEventListener('click', () => {
  closeModal();
});

document.getElementById('modal-save').addEventListener('click', async () => {
  const rowsWrap = document.getElementById('modal-rows');
  const rows = Array.from(rowsWrap.querySelectorAll('.modal-option-row'));
  const parsed = rows.map(r => {
    const name = r.querySelector('[data-field="name"]').value.trim();
    const obj = { name };
    modalState.keys.forEach(k => {
      const inp = r.querySelector(`input[data-key="${k}"]`);
      if (inp) {
        const v = inp.value.trim();
        if (v !== '') obj[k] = tryParseNumber(v);
      }
    });
    return obj;
  }).filter(o => o.name);

  // Save to server
  configCache[String(modalState.groupId)] = parsed;
  const success = await saveConfigurations(configCache);

  if (success) {
    const form = document.querySelector(`.choice-form[data-group-id="${modalState.groupId}"]`);
    const currentValue = form.querySelector('select[name="value"]').value;
    populateSelectFromOptions(form, parsed);
    // Restore the previously selected value
    const select = form.querySelector('select[name="value"]');
    if (select && currentValue) {
      select.value = currentValue;
    }
    closeModal();
    alert('Options saved');
  } else {
    alert('Error saving options');
  }
});

document.querySelectorAll('.edit-options').forEach(b => b.addEventListener('click', (e) => {
  openOptionsModal(b.dataset.groupId);
}));

// Click outside modal to close
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    closeModal();
  }
});

// --- API calls for config and jobs ---
async function loadConfigurations() {
  try {
    const res = await fetch(API_BASE + 'configurations/');
    if (!res.ok) throw new Error('Failed to load configurations');
    return await res.json(); // {gid: [options]}
  } catch (e) {
    console.error('Load config error:', e);
    return {};
  }
}

async function saveConfigurations(configMap) {
  try {
    const res = await fetch(API_BASE + 'configurations/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken')
      },
      body: JSON.stringify(configMap)
    });
    return res.ok;
  } catch (e) {
    console.error('Save config error:', e);
    return false;
  }
}

// In-memory cache for configurations
let configCache = {};

async function getConfigurationCache() {
  if (Object.keys(configCache).length === 0) {
    configCache = await loadConfigurations();
  }
  return configCache;
}



function extractOptionsFromSelect(form) {
  const select = form.querySelector('select[name="value"]');
  if (!select) return [];
  const options = [];
  for (const opt of select.options) {
    if (opt.value === '') continue; // skip the "-- choose --" placeholder
    const obj = { name: opt.value };
    for (const k in opt.dataset) {
      obj[k] = opt.dataset[k];
    }
    options.push(obj);
  }
  return options;
}

async function getOptionsForGroup(form) {
  const gid = String(form.dataset.groupId);
  const cache = await getConfigurationCache();
  if (cache[gid]) return cache[gid];
  return extractOptionsFromSelect(form);
}



function populateSelectFromOptions(form, opts) {
  const sel = form.querySelector('select[name="value"]');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '';
  const optPlaceholder = document.createElement('option');
  optPlaceholder.value = '';
  optPlaceholder.textContent = '-- choose --';
  sel.appendChild(optPlaceholder);
  (opts || []).forEach(o => {
    const el = document.createElement('option');
    el.value = o.name || '';
    el.textContent = o.name || '';
    Object.keys(o).forEach(k => {
      if (k === 'name') return;
      el.dataset[k] = o[k];
    });
    sel.appendChild(el);
  });
  if (cur) {
    try {
      sel.value = cur;
    } catch (e) {}
  }
}
