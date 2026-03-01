// API-based configuration and job management
const API_BASE = '/api/';

// HTMX event listener
document.body.addEventListener('htmx:afterRequest', function(evt) {
  if (evt.detail.requestConfig.path.includes("/apply/") && evt.detail.requestConfig.path.includes("/saved-jobs/")) {
     const response = evt.detail.xhr.response;
    try {
      const data = JSON.parse(response);
      if (data.state) {
        applyState(JSON.parse(data.state));
        serializeStateToUI();
        updateAllDetailsAndSummary();
      }
    } catch (e) {
      console.error('Error parsing response:', e);
    }
  }

  if (evt.detail.requestConfig.path.includes("/delete/") && evt.detail.requestConfig.path.includes("/saved-jobs/")) {
      htmx.trigger('#saved-list', 'refreshAfterDelete');
    }

});

// Get the CSRF token from the cookie
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function updateAllDetailsAndSummary() {
  document.querySelectorAll('.choice-form').forEach(f => updateChoiceDetails(f));
}


function updateSummary() {
  // Find current selections and get values for groups
  const machineForm = Array.from(document.querySelectorAll('.choice-form')).find(f => f.dataset.groupName === 'Machine');
  const materialForm = Array.from(document.querySelectorAll('.choice-form')).find(f => f.dataset.groupName === 'Matière');
  const adherentForm = Array.from(document.querySelectorAll('.choice-form')).find(f => f.dataset.groupName === 'Tarifs adhérent pour les machines');
  const consumableForm = Array.from(document.querySelectorAll('.choice-form')).find(f => f.dataset.groupName === 'Consommable');
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
  document.getElementById('material-name').textContent = materialName;
  
  // Calculate total operating time (sum of col-tps)
  const tpsValues = Array.from(document.querySelectorAll('.col-tps')).map(i => parseFloat(i.value) || 0);
  const totalTps = tpsValues.reduce((a, b) => a + b, 0).toFixed(2);
  document.getElementById('total-tps').textContent = parseFloat(totalTps).toFixed(0);
  
  // Calculate total additional operator time (sum of col-sup)
  const supValues = Array.from(document.querySelectorAll('.col-sup')).map(i => parseFloat(i.value) || 0);
  const totalAdditionalTime = supValues.reduce((a, b) => a + b, 0).toFixed(2);
  document.getElementById('total-additional-time').textContent = parseFloat(totalAdditionalTime).toFixed(0);
  
  // Get operator time percentage for machine
  const machinePercentTimeForOperator = machineForm ? machineForm.querySelector('select[name="value"]').selectedOptions[0].dataset.pourcent_temps || 0 : 0;
  const machineName = machineForm ? machineForm.querySelector('select[name="value"]').selectedOptions[0].textContent : '';

  // Total operator time = (tps * pourcent_temps / 100) + additional time
  const finalOperatorTime = (parseFloat(totalTps * machinePercentTimeForOperator / 100) + parseFloat(totalAdditionalTime)).toFixed(2);
  document.getElementById('time-summary-pourcent-temps').textContent = parseFloat(machinePercentTimeForOperator).toFixed(0);
  document.getElementById('time-summary-machine-name').textContent = machineName;
  document.getElementById('total-operator-time').textContent = parseFloat(finalOperatorTime).toFixed(0);

  // Calculate machine cost if machine has prix and totalTps
  const machinePriceNormal = machineForm ? machineForm.querySelector('select[name="value"]').selectedOptions[0].dataset.prix_normal : 1;
  const machinePriceAdherent = machineForm ? machineForm.querySelector('select[name="value"]').selectedOptions[0].dataset.prix_adherent : 1;
  const is_adherent = adherentForm.querySelector('select[name="value"]').selectedOptions[0].value == "Oui" ? true : false;
  const machinePrice = is_adherent ? machinePriceAdherent : machinePriceNormal;
  const machineCost = (parseFloat(totalTps) * parseFloat(machinePrice)).toFixed(2);
  document.getElementById('cost-summary-total-machine-cost').textContent = machineCost;
  document.getElementById('cost-summary-machine-cost').textContent = machinePrice;
//   document.getElementById('cost-summary-machine-name').textContent = machineForm ? machineForm.querySelector('select[name="value"]').selectedOptions[0].textContent : '';
//   document.getElementById('cost-summary-is-adherent').textContent = is_adherent ? "(Tarif adhérent)" : "";
  
  // Calculate consommable cost
  const consumablePrice = consumableForm ? consumableForm.querySelector('select[name="value"]').selectedOptions[0].dataset.prix || 0 : 0;
  const consumableLifetime = consumableForm ? consumableForm.querySelector('select[name="value"]').selectedOptions[0].dataset.duree_vie_totale_minutes || 0 : 0;

  const consumableCost = (totalTps * consumablePrice / consumableLifetime).toFixed(2);
  document.getElementById('cost-summary-consumable-cost').textContent = consumableCost;
  document.getElementById('cost-summary-consumable-per-min').textContent = parseFloat(consumablePrice / consumableLifetime).toFixed(2);

  const softwareMonthlyPrice = softwareForm ? softwareForm.querySelector('select[name="value"]').selectedOptions[0].dataset.prix_mensuel || 0 : 0;
  const softwareCost = (softwareMonthlyPrice * (totalTps / (30 * 24 * 60))).toFixed(2);
  const softwareCostPerMin = (softwareMonthlyPrice / (30 * 24 * 60)).toFixed(2);
  document.getElementById('cost-summary-software-cost-per-min').textContent = softwareCostPerMin;
  document.getElementById('cost-summary-software-cost').textContent = softwareCost;

  const humanHourlyPrice = prestationForm ? prestationForm.querySelector('select[name="value"]').selectedOptions[0].dataset.taux_horaire || 0 : 0;
  document.getElementById('cost-summary-human-hourly-price').textContent = parseFloat(humanHourlyPrice).toFixed(0);
  const humanCost = (humanHourlyPrice * totalTps / 60).toFixed(2);
  document.getElementById('cost-summary-human-cost').textContent = humanCost;

  const licenseCost = licenseForm ? licenseForm.querySelector('select[name="value"]').selectedOptions[0].dataset.prix || 0 : 0;
  document.getElementById('cost-summary-license-cost').textContent = licenseCost;
  document.getElementById('cost-summary-license-name').textContent = licenseForm ? licenseForm.querySelector('select[name="value"]').selectedOptions[0].value : '';

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
  let html = `<table style="border-collapse: collapse; font-size: 0.85em; margin-top: 6px; width: 100%; color:oklch(96.8% 0.007 247.896)">`;
  html += `<tr style="background-color: oklch(26.6% 0.065 152.934);"><td style="border: 1px solid oklch(27.9% 0.041 260.031); border-bottom:3px solid oklch(27.9% 0.041 260.031); padding: 4px 6px; font-weight: bold;">Choix</td><td style="border: 1px solid oklch(27.9% 0.041 260.031); border-bottom: 3px solid oklch(27.9% 0.041 260.031); padding: 4px 6px;">${optionName}</td></tr>`;
  
  properties.forEach(prop => {
    html += `<tr><td style="border: 1px solid oklch(27.9% 0.041 260.031); padding: 4px 6px; background-color: oklch(44.8% 0.119 151.328)">${prop.key}</td><td style="border: 1px solid oklch(27.9% 0.041 260.031); padding: 4px 6px; background-color: oklch(44.8% 0.119 151.328)">${prop.value}</td></tr>`;
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
  // populateSavedList();
  updateSummary();
  serializeStateToUI();
  document.querySelectorAll('.choice-form').forEach(f => updateChoiceDetails(f));
});