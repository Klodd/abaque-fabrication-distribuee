// API-based configuration and job management
const API_BASE = '/api/';

// HTMX event listener
document.body.addEventListener('htmx:afterRequest', function(evt) {
  serializeStateToUI();
  document.querySelectorAll('.choice-form').forEach(f => updateChoiceDetails(f));
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configMap)
    });
    return res.ok;
  } catch (e) {
    console.error('Save config error:', e);
    return false;
  }
}

async function loadSavedJobs() {
  try {
    const res = await fetch(API_BASE + 'saved-jobs/');
    if (!res.ok) throw new Error('Failed to load jobs');
    return await res.json(); // [{id, name, state_json, created_at}, ...]
  } catch (e) {
    console.error('Load jobs error:', e);
    return [];
  }
}

async function saveNewJob(name, stateId, state) {
  try {
    const res = await fetch(API_BASE + 'saved-jobs/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, state_id: stateId, state })
    });
    return res.ok ? await res.json() : null;
  } catch (e) {
    console.error('Save job error:', e);
    return null;
  }
}

async function deleteJob(jobId) {
  try {
    const res = await fetch(API_BASE + `saved-jobs/${jobId}/delete/`, { method: 'DELETE' });
    return res.ok;
  } catch (e) {
    console.error('Delete job error:', e);
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
  for (let i = 1; i < select.options.length; i++) {
    const opt = select.options[i];
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

// --- Modal editor with API persistence ---
let modalState = { groupId: null, keys: [] };
const modal = document.createElement('div');
modal.id = 'options-modal';
modal.style.display = 'none';
modal.style.position = 'fixed';
modal.style.left = 0;
modal.style.top = 0;
modal.style.right = 0;
modal.style.bottom = 0;
modal.style.background = 'rgba(0,0,0,0.6)';
modal.style.backdropFilter = 'blur(4px)';
modal.style.zIndex = 9999;
modal.style.display = 'flex';
modal.style.alignItems = 'center';
modal.style.justifyContent = 'center';
modal.innerHTML = `
  <div style="position:relative;width:90%;max-width:900px;background:linear-gradient(to bottom, rgb(30, 41, 59), rgb(15, 23, 42));border:1px solid rgba(148, 163, 184, 0.3);padding:24px;border-radius:12px;box-shadow:0 20px 25px rgba(0, 0, 0, 0.5);">
    <h3 id="modal-title" style="font-size:1.25rem;font-weight:bold;color:rgb(226, 232, 240);margin-bottom:20px;">Edit Options</h3>
    <div style="margin-bottom:16px;padding:12px;background:rgba(148, 163, 184, 0.1);border-radius:8px;border:1px solid rgba(148, 163, 184, 0.2);">
      <label style="display:flex;align-items:center;gap:8px;">
        <input id="modal-new-prop" placeholder="property_name" style="flex:1;background:rgb(51, 65, 85);border:1px solid rgb(71, 85, 99);color:rgb(226, 232, 240);padding:8px 12px;border-radius:6px;font-size:0.875rem;" />
        <button id="modal-add-prop" style="padding:8px 16px;background:rgb(71, 85, 99);color:rgb(226, 232, 240);border:1px solid rgb(71, 85, 99);border-radius:6px;font-weight:500;cursor:pointer;transition:all 0.2s;font-size:0.875rem;">Add Property</button>
      </label>
    </div>
    <div id="modal-rows" style="max-height:50vh;overflow-y:auto;margin-bottom:16px;padding-right:8px;"></div>
    <div style="display:flex;justify-content:flex-end;gap:12px;padding-top:16px;border-top:1px solid rgba(148, 163, 184, 0.2);">
      <button id="modal-cancel" style="padding:10px 20px;background:rgb(71, 85, 99);color:rgb(226, 232, 240);border:1px solid rgb(71, 85, 99);border-radius:6px;font-weight:500;cursor:pointer;transition:all 0.2s;font-size:0.875rem;">Cancel</button>
      <button id="modal-save" style="padding:10px 20px;background:rgb(37, 99, 235);color:rgb(255, 255, 255);border:1px solid rgb(37, 99, 235);border-radius:6px;font-weight:500;cursor:pointer;transition:all 0.2s;font-size:0.875rem;box-shadow:0 4px 6px rgba(37, 99, 235, 0.3);">Save Changes</button>
    </div>
  </div>`;
modal.style.display = 'none';
document.body.appendChild(modal);

// Add hover effects to modal buttons
setTimeout(() => {
  const saveBtn = document.getElementById('modal-save');
  const cancelBtn = document.getElementById('modal-cancel');
  const addPropBtn = document.getElementById('modal-add-prop');
  
  if (saveBtn) {
    saveBtn.addEventListener('mouseover', () => {
      saveBtn.style.background = 'rgb(29, 78, 216)';
      saveBtn.style.boxShadow = '0 8px 12px rgba(37, 99, 235, 0.4)';
    });
    saveBtn.addEventListener('mouseout', () => {
      saveBtn.style.background = 'rgb(37, 99, 235)';
      saveBtn.style.boxShadow = '0 4px 6px rgba(37, 99, 235, 0.3)';
    });
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('mouseover', () => {
      cancelBtn.style.background = 'rgb(51, 65, 85)';
      cancelBtn.style.borderColor = 'rgb(100, 116, 139)';
    });
    cancelBtn.addEventListener('mouseout', () => {
      cancelBtn.style.background = 'rgb(71, 85, 99)';
      cancelBtn.style.borderColor = 'rgb(71, 85, 99)';
    });
  }
  
  if (addPropBtn) {
    addPropBtn.addEventListener('mouseover', () => {
      addPropBtn.style.background = 'rgb(55, 75, 90)';
      addPropBtn.style.borderColor = 'rgb(100, 116, 139)';
    });
    addPropBtn.addEventListener('mouseout', () => {
      addPropBtn.style.background = 'rgb(71, 85, 99)';
      addPropBtn.style.borderColor = 'rgb(71, 85, 99)';
    });
  }
}, 0);

async function openOptionsModal(gid) {
  modalState.groupId = String(gid);
  const form = document.querySelector(`.choice-form[data-group-id="${gid}"]`);
  const opts = await getOptionsForGroup(form) || [];
  const keys = unionKeysGeneric(opts);
  modalState.keys = keys;
  renderModal(opts, keys, form);
  modal.style.display = 'flex';
}

function closeModal() {
  modal.style.display = 'none';
  modalState = { groupId: null, keys: [] };
}

function renderModal(opts, keys, form) {
  document.getElementById('modal-title').textContent = 'Edit options for ' + (form ? form.dataset.groupName : modalState.groupId);
  const rowsWrap = document.getElementById('modal-rows');
  rowsWrap.innerHTML = '';
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.fontWeight = 'bold';
  header.style.gap = '8px';
  header.style.padding = '12px';
  header.style.background = 'rgba(100, 116, 139, 0.2)';
  header.style.borderRadius = '6px';
  header.style.marginBottom = '12px';
  header.style.color = 'rgb(148, 163, 184)';
  header.style.fontSize = '0.875rem';
  header.style.textTransform = 'uppercase';
  header.style.letterSpacing = '0.05em';
  
  const hn = document.createElement('div');
  hn.textContent = 'Name';
  hn.style.flex = '1';
  header.appendChild(hn);
  
  keys.forEach(k => {
    const hk = document.createElement('div');
    hk.style.flex = '1';
    hk.style.display = 'flex';
    hk.style.alignItems = 'center';
    hk.style.justifyContent = 'space-between';
    const span = document.createElement('span');
    span.textContent = prettyKey(k);
    hk.appendChild(span);
    const rm = document.createElement('button');
    rm.textContent = '✕';
    rm.title = 'Remove property';
    rm.style.background = 'transparent';
    rm.style.border = 'none';
    rm.style.color = 'rgb(239, 68, 68)';
    rm.style.cursor = 'pointer';
    rm.style.fontSize = '1rem';
    rm.style.padding = '0';
    rm.style.marginLeft = '4px';
    rm.style.transition = 'color 0.2s';
    rm.addEventListener('click', () => {
      removePropertyKey(k);
    });
    rm.addEventListener('mouseover', () => { rm.style.color = 'rgb(255, 87, 87)' });
    rm.addEventListener('mouseout', () => { rm.style.color = 'rgb(239, 68, 68)' });
    hk.appendChild(rm);
    header.appendChild(hk);
  });
  
  rowsWrap.appendChild(header);
  (opts || []).forEach(o => rowsWrap.appendChild(buildModalRow(o, keys)));
  
  const foot = document.createElement('div');
  foot.style.marginTop = '16px';
  const addRowBtn = document.createElement('button');
  addRowBtn.textContent = '+ Add option';
  addRowBtn.style.padding = '10px 16px';
  addRowBtn.style.background = 'rgb(37, 99, 235)';
  addRowBtn.style.color = 'rgb(255, 255, 255)';
  addRowBtn.style.border = '1px solid rgb(37, 99, 235)';
  addRowBtn.style.borderRadius = '6px';
  addRowBtn.style.fontWeight = '500';
  addRowBtn.style.cursor = 'pointer';
  addRowBtn.style.fontSize = '0.875rem';
  addRowBtn.style.transition = 'all 0.2s';
  addRowBtn.addEventListener('mouseover', () => {
    addRowBtn.style.background = 'rgb(29, 78, 216)';
    addRowBtn.style.boxShadow = '0 4px 6px rgba(37, 99, 235, 0.4)';
  });
  addRowBtn.addEventListener('mouseout', () => {
    addRowBtn.style.background = 'rgb(37, 99, 235)';
    addRowBtn.style.boxShadow = 'none';
  });
  addRowBtn.addEventListener('click', () => {
    rowsWrap.appendChild(buildModalRow({}, modalState.keys));
  });
  foot.appendChild(addRowBtn);
  rowsWrap.appendChild(foot);
}

function buildModalRow(opt, keys) {
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.gap = '8px';
  row.style.marginBottom = '8px';
  row.style.padding = '12px';
  row.style.background = 'rgba(51, 65, 85, 0.5)';
  row.style.border = '1px solid rgba(148, 163, 184, 0.2)';
  row.style.borderRadius = '6px';
  row.style.alignItems = 'center';
  row.style.transition = 'all 0.2s';
  
  row.addEventListener('mouseover', () => {
    row.style.background = 'rgba(51, 65, 85, 0.8)';
    row.style.borderColor = 'rgba(148, 163, 184, 0.4)';
  });
  row.addEventListener('mouseout', () => {
    row.style.background = 'rgba(51, 65, 85, 0.5)';
    row.style.borderColor = 'rgba(148, 163, 184, 0.2)';
  });
  
  const inpName = document.createElement('input');
  inpName.placeholder = 'Name';
  inpName.style.flex = '1';
  inpName.style.background = 'rgb(30, 41, 59)';
  inpName.style.border = '1px solid rgb(71, 85, 99)';
  inpName.style.color = 'rgb(226, 232, 240)';
  inpName.style.padding = '8px 12px';
  inpName.style.borderRadius = '5px';
  inpName.style.fontSize = '0.875rem';
  inpName.style.outline = 'none';
  inpName.style.transition = 'all 0.2s';
  inpName.value = opt && opt.name ? opt.name : '';
  
  inpName.addEventListener('focus', () => {
    inpName.style.borderColor = 'rgb(37, 99, 235)';
    inpName.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
  });
  inpName.addEventListener('blur', () => {
    inpName.style.borderColor = 'rgb(71, 85, 99)';
    inpName.style.boxShadow = 'none';
  });
  
  row.appendChild(inpName);
  keys.forEach(k => {
    const inp = document.createElement('input');
    inp.placeholder = prettyKey(k);
    inp.style.flex = '1';
    inp.style.background = 'rgb(30, 41, 59)';
    inp.style.border = '1px solid rgb(71, 85, 99)';
    inp.style.color = 'rgb(226, 232, 240)';
    inp.style.padding = '8px 12px';
    inp.style.borderRadius = '5px';
    inp.style.fontSize = '0.875rem';
    inp.style.outline = 'none';
    inp.style.transition = 'all 0.2s';
    inp.value = opt && opt[k] !== undefined ? String(opt[k]) : '';
    inp.dataset.key = k;
    
    inp.addEventListener('focus', () => {
      inp.style.borderColor = 'rgb(37, 99, 235)';
      inp.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
    });
    inp.addEventListener('blur', () => {
      inp.style.borderColor = 'rgb(71, 85, 99)';
      inp.style.boxShadow = 'none';
    });
    
    row.appendChild(inp);
  });
  
  const del = document.createElement('button');
  del.textContent = 'Delete';
  del.style.padding = '8px 12px';
  del.style.background = 'rgba(239, 68, 68, 0.1)';
  del.style.color = 'rgb(239, 68, 68)';
  del.style.border = '1px solid rgba(239, 68, 68, 0.3)';
  del.style.borderRadius = '5px';
  del.style.fontWeight = '500';
  del.style.cursor = 'pointer';
  del.style.fontSize = '0.75rem';
  del.style.transition = 'all 0.2s';
  del.style.whiteSpace = 'nowrap';
  
  del.addEventListener('mouseover', () => {
    del.style.background = 'rgba(239, 68, 68, 0.2)';
    del.style.borderColor = 'rgba(239, 68, 68, 0.6)';
  });
  del.addEventListener('mouseout', () => {
    del.style.background = 'rgba(239, 68, 68, 0.1)';
    del.style.borderColor = 'rgba(239, 68, 68, 0.3)';
  });
  
  del.addEventListener('click', e => {
    e.preventDefault();
    row.remove();
  });
  row.appendChild(del);
  return row;
}

function removePropertyKey(key) {
  modalState.keys = modalState.keys.filter(k => k !== key);
  const rowsWrap = document.getElementById('modal-rows');
  const rows = Array.from(rowsWrap.querySelectorAll('div')).filter((n, i) => i !== 0 && n.querySelectorAll('input').length > 0);
  const current = rows.map(r => {
    const name = r.querySelector('input[placeholder="Name"]').value;
    const obj = { name };
    modalState.keys.forEach(k => {
      const inp = r.querySelector(`input[data-key="${k}"]`);
      if (inp) obj[k] = tryParseNumber(inp.value);
    });
    return obj;
  });
  const form = document.querySelector(`.choice-form[data-group-id="${modalState.groupId}"]`);
  renderModal(current, modalState.keys, form);
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
  if (!v) return alert('Enter property name');
  if (modalState.keys.includes(v)) return alert('Property already present');
  modalState.keys.push(v);
  const rowsWrap = document.getElementById('modal-rows');
  const rows = Array.from(rowsWrap.querySelectorAll('div')).filter((n, i) => i !== 0 && n.querySelectorAll('input').length > 0).map(r => {
    const name = r.querySelector('input[placeholder="Name"]').value;
    const obj = { name };
    modalState.keys.forEach(k => {
      const inp = r.querySelector(`input[data-key="${k}"]`);
      if (inp) obj[k] = tryParseNumber(inp.value);
    });
    return obj;
  });
  const form = document.querySelector(`.choice-form[data-group-id="${modalState.groupId}"]`);
  renderModal(rows, modalState.keys, form);
  document.getElementById('modal-new-prop').value = '';
});

document.getElementById('modal-cancel').addEventListener('click', () => {
  closeModal();
});

document.getElementById('modal-save').addEventListener('click', async () => {
  const rowsWrap = document.getElementById('modal-rows');
  const rows = Array.from(rowsWrap.querySelectorAll('div')).filter((n, i) => i !== 0 && n.querySelectorAll('input').length > 0);
  const parsed = rows.map(r => {
    const name = r.querySelector('input[placeholder="Name"]').value.trim();
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
    populateSelectFromOptions(form, parsed);
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

// --- Saved jobs management (API-based) ---
async function populateSavedList() {
  const wrap = document.getElementById('saved-list');
  const jobs = await loadSavedJobs();
  if (!wrap) return;
  if (jobs.length === 0) {
    wrap.innerHTML = '<div style="color:#666">No saved jobs</div>';
    return;
  }
  wrap.innerHTML = '';
  jobs.slice().reverse().forEach(j => {
    const el = document.createElement('div');
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'space-between';
    el.style.marginBottom = '6px';
    const left = document.createElement('div');
    left.textContent = j.name + ' — ' + new Date(j.created_at).toLocaleString();
    left.style.flex = '1';
    const btns = document.createElement('div');
    const load = document.createElement('button');
    load.textContent = 'Load';
    load.addEventListener('click', () => {
      applyState(j.state_json);
      serializeStateToUI();
      updateAllDetailsAndSummary();
    });
    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.style.marginLeft = '6px';
    del.addEventListener('click', async () => {
      const ok = await deleteJob(j.id);
      if (ok) populateSavedList();
    });
    const exp = document.createElement('button');
    exp.textContent = 'Export';
    exp.style.marginLeft = '6px';
    exp.addEventListener('click', () => {
      exportJobs([j]);
    });
    btns.appendChild(load);
    btns.appendChild(del);
    btns.appendChild(exp);
    el.appendChild(left);
    el.appendChild(btns);
    wrap.appendChild(el);
  });
}

function exportJobs(list) {
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'saved_jobs.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

document.getElementById('save-job').addEventListener('click', async (e) => {
  e.preventDefault();
  const name = document.getElementById('save-name').value.trim() || 'Job ' + new Date().toLocaleString();
  const id = serializeStateToUI();
  const state = buildState();
  const job = await saveNewJob(name, id, state);
  if (job) {
    document.getElementById('save-name').value = '';
    populateSavedList();
    alert('Saved');
  } else {
    alert('Error saving job');
  }
});

function updateAllDetailsAndSummary() {
  document.querySelectorAll('.choice-form').forEach(f => updateChoiceDetails(f));
}

// Table handling (unchanged)
function updateLineNumbers() {
  const rows = document.querySelectorAll('#data-table tbody tr');
  rows.forEach((r, i) => r.querySelector('.ln').textContent = i + 1);
}

function addRow(qty = '', tps = '', sup = 0) {
  const tbody = document.querySelector('#data-table tbody');
  const tr = document.createElement('tr');
  tr.innerHTML = `<td class="ln"></td><td><input class="col-qty" value="${escapeHtml(qty)}"/></td><td><input class="col-tps" value="${escapeHtml(tps)}"/></td><td><input class="col-sup" value="${escapeHtml(sup)}"/></td><td><button class="del-row">Supprimer la ligne</button></td>`;
  tbody.appendChild(tr);
  attachRowHandlers(tr);
  updateLineNumbers();
  updateSummary();
  serializeStateToUI();
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
}

function attachRowHandlers(tr) {
  tr.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => {
    updateSummary();
    serializeStateToUI();
  }));
  tr.querySelector('.del-row').addEventListener('click', (e) => {
    e.preventDefault();
    tr.remove();
    updateLineNumbers();
    updateSummary();
    serializeStateToUI();
  });
}

document.getElementById('add-row').addEventListener('click', function (e) {
  e.preventDefault();
  addRow();
});

document.querySelectorAll('#data-table tbody tr').forEach(tr => attachRowHandlers(tr));
updateLineNumbers();

function updateSummary() {
  // Find current selections and get values for groups
  const machineForm = Array.from(document.querySelectorAll('.choice-form')).find(f => f.dataset.groupName === 'Machine');
  const materialForm = Array.from(document.querySelectorAll('.choice-form')).find(f => f.dataset.groupName === 'Matière');
  const adherentForm = Array.from(document.querySelectorAll('.choice-form')).find(f => f.dataset.groupName === 'Tarifs adhérent pour les machines');
  const consommableForm = Array.from(document.querySelectorAll('.choice-form')).find(f => f.dataset.groupName === 'Consommable');
  const softwareForm = Array.from(document.querySelectorAll('.choice-form')).find(f => f.dataset.groupName === 'Logiciel de modélisation');
  const prestationForm = Array.from(document.querySelectorAll('.choice-form')).find(f => f.dataset.groupName === 'Type de prestation');
  const licenseForm = Array.from(document.querySelectorAll('.choice-form')).find(f => f.dataset.groupName === 'Type de licence');
  const majorationForm = Array.from(document.querySelectorAll('.choice-form')).find(f => f.dataset.groupName === 'Majoration pour urgence, déplacements...');
  const contribitionForm = Array.from(document.querySelectorAll('.choice-form')).find(f => f.dataset.groupName === 'Contribution au projet asso');

  // Calculate total material (sum of col-qty) * prix
  const qtyValues = Array.from(document.querySelectorAll('.col-qty')).map(i => parseFloat(i.value) || 0);
  const totalQty = qtyValues.reduce((a, b) => a + b, 0);
  
  const materialPrice = materialForm ? materialForm.querySelector('select[name="value"]').selectedOptions[0].dataset.prix : 0;
  const materialName = materialForm ? materialForm.querySelector('select[name="value"]').selectedOptions[0].textContent : '';

  const materialCost = (totalQty * materialPrice).toFixed(2);
  document.getElementById('total-material').textContent = totalQty;
  document.getElementById('cost-summary-total-material-cost').textContent = materialCost;
//   document.getElementById('cost-summary-material-cost').textContent = materialPrice;
//   document.getElementById('cost-summary-material-name').textContent = materialName;
  
  // Calculate total operating time (sum of col-tps)
  const tpsValues = Array.from(document.querySelectorAll('.col-tps')).map(i => parseFloat(i.value) || 0);
  const totalTps = tpsValues.reduce((a, b) => a + b, 0).toFixed(2);
  document.getElementById('total-tps').textContent = totalTps;
  
  // Calculate total additional operator time (sum of col-sup)
  const supValues = Array.from(document.querySelectorAll('.col-sup')).map(i => parseFloat(i.value) || 0);
  const totalAdditionalTime = supValues.reduce((a, b) => a + b, 0).toFixed(2);
  document.getElementById('total-additional-time').textContent = totalAdditionalTime;
  
  // Get operator time percentage for machine
  const machinePercentTimeForOperator = machineForm ? machineForm.querySelector('select[name="value"]').selectedOptions[0].dataset.pourcent_temps || 0 : 0;
  const machineName = machineForm ? machineForm.querySelector('select[name="value"]').selectedOptions[0].textContent : '';

  // Total operator time = (tps * pourcent_temps / 100) + additional time
  const finalOperatorTime = (parseFloat(totalTps * machinePercentTimeForOperator / 100) + parseFloat(totalAdditionalTime)).toFixed(2);
// document.getElementById('time-summary-pourcent-temps').textContent = machinePercentTimeForOperator;
// document.getElementById('time-summary-machine-name').textContent = machineName;
  document.getElementById('total-operator-time').textContent = finalOperatorTime;

  // Calculate machine cost if machine has prix and totalTps
  const machinePriceNormal = machineForm ? machineForm.querySelector('select[name="value"]').selectedOptions[0].dataset.prix_normal : 1;
  const machinePriceAdherent = machineForm ? machineForm.querySelector('select[name="value"]').selectedOptions[0].dataset.prix_adherent : 1;
  const is_adherent = adherentForm.querySelector('select[name="value"]').selectedOptions[0].value == "Oui" ? true : false;
  const machinePrice = is_adherent ? machinePriceAdherent : machinePriceNormal;
  const machineCost = (parseFloat(totalTps) * parseFloat(machinePrice)).toFixed(2);
  document.getElementById('cost-summary-total-machine-cost').textContent = machineCost;
//   document.getElementById('cost-summary-machine-cost').textContent = machinePrice;
//   document.getElementById('cost-summary-machine-name').textContent = machineForm ? machineForm.querySelector('select[name="value"]').selectedOptions[0].textContent : '';
//   document.getElementById('cost-summary-is-adherent').textContent = is_adherent ? "(Tarif adhérent)" : "";
  
  // Calculate consommable cost
  const consumablePrice = consommableForm ? consommableForm.querySelector('select[name="value"]').selectedOptions[0].dataset.prix || 0 : 0;
  const consumableLifetime = consommableForm ? consommableForm.querySelector('select[name="value"]').selectedOptions[0].dataset.duree_vie_totale_minutes || 0 : 0;

  const consumableCost = (totalTps * consumablePrice / consumableLifetime).toFixed(2);
  document.getElementById('cost-summary-consommable-cost').textContent = consumableCost;

  const softwareMonthlyPrice = softwareForm ? softwareForm.querySelector('select[name="value"]').selectedOptions[0].dataset.prix_mensuel || 0 : 0;
  const softwareCost = (softwareMonthlyPrice * (totalTps / (30 * 24 * 60))).toFixed(2);
  document.getElementById('cost-summary-software-cost').textContent = softwareCost;

  const humanHourlyPrice = prestationForm ? prestationForm.querySelector('select[name="value"]').selectedOptions[0].dataset.taux_horaire || 0 : 0;
//   document.getElementById('cost-summary-human-hourly-price').textContent = humanHourlyPrice;
  const humanCost = (humanHourlyPrice * totalTps / 60).toFixed(2);
  document.getElementById('cost-summary-human-cost').textContent = humanCost;

  const licenseCost = licenseForm ? licenseForm.querySelector('select[name="value"]').selectedOptions[0].dataset.prix || 0 : 0;
  document.getElementById('cost-summary-license-cost').textContent = licenseCost;

  const grossCost = (parseFloat(materialCost) + parseFloat(machineCost) + parseFloat(consumableCost) + parseFloat(softwareCost) + parseFloat(humanCost) + parseFloat(licenseCost)).toFixed(2);

  const majorationRate = majorationForm ? majorationForm.querySelector('select[name="value"]').selectedOptions[0].dataset.majoration_coef || 0 : 0;
  document.getElementById('cost-summary-majoration-cost').textContent = (parseFloat(majorationRate) * parseFloat(humanCost)).toFixed(2);
//   document.getElementById('cost-summary-before-majoration-human-cost').textContent = humanCost;

  const additionalContribution = contribitionForm ? contribitionForm.querySelector('select[name="value"]').selectedOptions[0].dataset.pourcentage_contribution || 0 : 0;
  document.getElementById('cost-summary-asso-contribution').textContent = (parseFloat(additionalContribution) * parseFloat(grossCost)).toFixed(2);
  
  // FINAL COST
  const finalCost = (parseFloat(grossCost) - parseFloat(humanCost) + parseFloat(majorationRate) * parseFloat(humanCost) + parseFloat(additionalContribution) * parseFloat(grossCost)).toFixed(2);
  const numberOfCopies = parseInt(document.getElementById('number-of-copies').value) || 1;
  document.getElementById('cost-summary-final-cost-unit').textContent = finalCost;
  document.getElementById('cost-summary-final-cost').textContent = (parseFloat(finalCost) * numberOfCopies).toFixed(2);
}

function prettyKey(k) {
  return k.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function updateChoiceDetails(form) {
  if (!form) return;
  const gid = form.dataset.groupId;
  const detailsEl = document.getElementById('details-' + gid);
  if (!detailsEl) return;
  const sel = form.querySelector('select[name="value"]');
  if (!sel) {
    detailsEl.innerHTML = '';
    return;
  }
  const opt = sel.selectedOptions && sel.selectedOptions[0];
  if (!opt || !opt.value) {
    detailsEl.innerHTML = '';
    return;
  }
  
  const optionName = opt.value;
  const ds = opt.dataset || {};
  const properties = [];
  for (const k in ds) {
    if (!Object.prototype.hasOwnProperty.call(ds, k)) continue;
    const v = ds[k];
    if (v === undefined || v === null || String(v).trim() === '') continue;
    properties.push({ key: prettyKey(k), value: v });
  }
  
  // Build table HTML
  let html = `<table style="border-collapse: collapse; font-size: 0.85em; margin-top: 6px; width: 100%;">`;
  html += `<tr style="background-color: #f0f0f0;"><td style="border: 1px solid #ddd; padding: 4px 6px; font-weight: bold;">Choix</td><td style="border: 1px solid #ddd; padding: 4px 6px; font-weight: bold;">${optionName}</td></tr>`;
  
  properties.forEach(prop => {
    html += `<tr><td style="border: 1px solid #ddd; padding: 4px 6px;">${prop.key}</td><td style="border: 1px solid #ddd; padding: 4px 6px;">${prop.value}</td></tr>`;
  });
  
  html += `</table>`;
  detailsEl.innerHTML = html;
}

// State serialization (unchanged)
function buildState() {
  const choices = {};
  document.querySelectorAll('.choice-form').forEach(f => {
    const id = f.dataset.groupId;
    const val = f.querySelector('select[name="value"]').value;
    choices[id] = val;
  });
  const rows = Array.from(document.querySelectorAll('#data-table tbody tr')).map(tr => ({
    qty: tr.querySelector('.col-qty').value,
    tps: tr.querySelector('.col-tps').value,
    sup: tr.querySelector('.col-sup').value
  }));
  const numberOfCopies = document.getElementById('number-of-copies').value;
  return { choices, rows, numberOfCopies };
}

function base64UrlEncode(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function serializeStateToUI() {
  const state = buildState();
  const s = JSON.stringify(state);
  const id = base64UrlEncode(s);
  return id;
}

function applyState(obj) {
  if (!obj) return;
  Object.keys(obj.choices || {}).forEach(id => {
    const form = document.querySelector(`.choice-form[data-group-id="${id}"]`);
    if (form) {
      const sel = form.querySelector('select[name="value"]');
      if (sel) sel.value = obj.choices[id];
      if (sel) sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  const tbody = document.querySelector('#data-table tbody');
  tbody.innerHTML = '';
  (obj.rows || []).forEach(r => addRow(r.qty, r.tps, r.sup));
  if ((obj.rows || []).length === 0) addRow();
  if (obj.numberOfCopies) {
    document.getElementById('number-of-copies').value = obj.numberOfCopies;
  }
  updateSummary();
}

document.querySelectorAll('.choice-form select').forEach(s => s.addEventListener('change', (e) => {
  const f = s.closest('.choice-form');
  serializeStateToUI();
  updateChoiceDetails(f);
  updateSummary();
}));

document.getElementById('number-of-copies').addEventListener('change', () => {
  serializeStateToUI();
  updateSummary();
});

// Initialization on load
window.addEventListener('load', async () => {
  populateSavedList();
  updateSummary();
  serializeStateToUI();
  document.querySelectorAll('.choice-form').forEach(f => updateChoiceDetails(f));
});