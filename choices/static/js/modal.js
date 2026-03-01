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
  hn.style.display = 'flex';
  hn.style.alignItems = 'center';
  hn.style.justifyContent = 'space-between';
  header.appendChild(hn);
  
  keys.forEach(k => {
    const hk = document.createElement('div');
    hk.style.flex = '1';
    hk.style.display = 'flex';
    hk.style.alignItems = 'center';
    hk.style.width = '200px';
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

    const filldiv = document.createElement('div');
    filldiv.style.padding = '32px';
    filldiv.textContent = '';


    header.appendChild(filldiv); // for fill

  
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
  del.textContent = 'Retirer';
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