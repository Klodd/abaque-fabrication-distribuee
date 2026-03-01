// Table handling (unchanged)
function updateLineNumbers() {
  const rows = document.querySelectorAll('#data-table tbody tr');
  rows.forEach((r, i) => r.querySelector('.ln').textContent = i + 1);
}

function addRow(qty = '', tps = '', sup = 0) {
  const tbody = document.querySelector('#data-table tbody');
  const tr = document.createElement('tr');
  tr.classList.add('border-b');
  tr.classList.add('border-slate-500/15');
  tr.classList.add('transition-all');
  tr.classList.add('hover:bg-blue-500/10');
  tr.innerHTML = `<td class="ln p-3 text-slate-500 font-mono"></td><td class="p-3"><input class="col-qty w-full bg-slate-700/80 border border-slate-500/20 text-slate-100 p-2 rounded transition focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-slate-400" value="${escapeHtml(qty)}"/></td><td class="p-3"><input class="col-tps w-full bg-slate-700/80 border border-slate-500/20 text-slate-100 p-2 rounded transition focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-slate-400" value="${escapeHtml(tps)}"/></td><td class="p-3"><input class="col-sup w-full bg-slate-700/80 border border-slate-500/20 text-slate-100 p-2 rounded transition focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-slate-400" value="${escapeHtml(sup)}"/></td><td class="p-3"><button class="del-row px-3 py-1 bg-red-500/15 text-red-500 border border-red-500/30 rounded font-medium text-sm hover:bg-red-500/25 hover:border-red-500/60 transition">Retirer</button></td>`;

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