
async function loadData(){
  const res = await fetch('./data/programmes.json');
  const all = await res.json();
  window.ALL = all;
  const tabsEl = document.getElementById('tabs');
  tabsEl.innerHTML = '';
  all.sheets.forEach((name, idx)=>{
    const b = document.createElement('button');
    b.className = 'tab' + (idx===0?' active':'');
    b.textContent = name;
    b.onclick = ()=> selectSheet(name, b);
    tabsEl.appendChild(b);
  });
  selectSheet(all.sheets[0], tabsEl.querySelector('.tab'));
  document.getElementById('q').addEventListener('input', applyFilters);
  document.getElementById('week').addEventListener('change', applyFilters);
  document.getElementById('export').addEventListener('click', exportCSV);
}

let CURRENT_SHEET = null;
function selectSheet(name, btn){
  CURRENT_SHEET = name;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderTable();
}

function getCurrentData(){
  const pack = window.ALL.programmes[CURRENT_SHEET] || {columns:[], rows:[]};
  // Ensure 'Semaine' first if present
  const cols = [...pack.columns];
  const idx = cols.indexOf('Semaine');
  if(idx>0){ cols.splice(idx,1); cols.unshift('Semaine'); }
  return {columns: cols, rows: pack.rows || []};
}

function renderTable(){
  const tbody = document.querySelector('tbody#rows');
  const thead = document.querySelector('thead#headers');
  tbody.innerHTML=''; thead.innerHTML='';
  const {columns, rows} = getCurrentData();
  // Build thead
  const trh = document.createElement('tr');
  columns.forEach(k=>{ const th=document.createElement('th'); th.textContent=k; trh.appendChild(th); });
  thead.appendChild(trh);
  // Filters
  const q = document.getElementById('q').value.trim().toLowerCase();
  const week = document.getElementById('week').value;
  // Populate week filter options once per sheet
  const weekSel = document.getElementById('week');
  if(weekSel.dataset.sheet!==CURRENT_SHEET){
    weekSel.innerHTML = '<option value="all">Toutes</option>';
    const weeks = [...new Set(rows.map(r=>r['Semaine']))].filter(w=>w!==undefined && w!=="").sort((a,b)=>Number(a)-Number(b));
    weeks.forEach(w=>{
      const opt = document.createElement('option'); opt.value = String(w); opt.textContent = 'Semaine '+w;
      weekSel.appendChild(opt);
    });
    weekSel.dataset.sheet = CURRENT_SHEET;
  }
  // Filtered rows
  const filtered = rows.filter(r=>{
    const inWeek = (week==='all' || String(r['Semaine'])===week);
    const text = Object.values(r).join(' ').toLowerCase();
    const inQ = !q || text.includes(q);
    return inWeek && inQ;
  });
  // Render rows
  filtered.forEach(r=>{
    const tr = document.createElement('tr');
    columns.forEach(k=>{
      const td = document.createElement('td');
      let val = r[k];
      if(k==='Semaine' && (val!=='' && val!==undefined)){
        td.innerHTML = '<span class="badge">S'+val+'</span>';
      } else {
        td.textContent = (val===null || val===undefined) ? '' : String(val);
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function applyFilters(){ renderTable(); }

function exportCSV(){
  const {columns, rows} = getCurrentData();
  let csv = columns.join(';')+'\n';
  rows.forEach(r=>{
    csv += columns.map(k=> String(r[k]??'').replaceAll(';',',').replaceAll('\n',' ')).join(';')+'\n';
  });
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = (CURRENT_SHEET||'export')+'.csv';
  a.click();
  URL.revokeObjectURL(url);
}

window.addEventListener('DOMContentLoaded', loadData);
