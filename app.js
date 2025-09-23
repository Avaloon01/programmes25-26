
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

function renderTable(){
  const tbody = document.querySelector('tbody#rows');
  tbody.innerHTML='';
  const rows = window.ALL.programmes[CURRENT_SHEET]||[];
  const q = document.getElementById('q').value.trim().toLowerCase();
  const week = document.getElementById('week').value;
  const filtered = rows.filter(r=>{
    const inWeek = (week==='all' || String(r['Semaine'])===week);
    const text = Object.values(r).join(' ').toLowerCase();
    const inQ = !q || text.includes(q);
    return inWeek && inQ;
  });
  filtered.forEach(r=>{
    const tr = document.createElement('tr');
    const cols = Object.keys(r);
    ['Semaine','Objectif','Activité','Activité / Objectif','Trace écrite','Fait/Monument','Personnage Belge','Personnage du Monde'].forEach(k=>{
      if(cols.includes(k)){
        const td = document.createElement('td');
        if(k==='Semaine'){
          td.innerHTML = '<span class="badge">S'+r[k]+'</span>';
        } else {
          td.textContent = r[k];
        }
        tr.appendChild(td);
      }
    });
    tbody.appendChild(tr);
  });
  // Build thead dynamically
  const thead = document.querySelector('thead#headers');
  thead.innerHTML='';
  const sample = window.ALL.programmes[CURRENT_SHEET]?.[0] || {};
  const wanted = ['Semaine','Objectif','Activité','Activité / Objectif','Trace écrite','Fait/Monument','Personnage Belge','Personnage du Monde'];
  const cols = wanted.filter(k=> Object.keys(sample).includes(k));
  const trh = document.createElement('tr');
  cols.forEach(k=>{
    const th = document.createElement('th'); th.textContent = k;
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  // Populate week filter options
  const weekSel = document.getElementById('week');
  if(weekSel.dataset.sheet!==CURRENT_SHEET){
    weekSel.innerHTML = '<option value="all">Toutes</option>';
    const weeks = [...new Set((window.ALL.programmes[CURRENT_SHEET]||[]).map(r=>r['Semaine']))].sort((a,b)=>Number(a)-Number(b));
    weeks.forEach(w=>{
      const opt = document.createElement('option'); opt.value = String(w); opt.textContent = 'Semaine '+w;
      weekSel.appendChild(opt);
    });
    weekSel.dataset.sheet = CURRENT_SHEET;
  }
}

function applyFilters(){ renderTable(); }

function exportCSV(){
  const rows = window.ALL.programmes[CURRENT_SHEET]||[];
  let cols = new Set();
  rows.forEach(r=> Object.keys(r).forEach(k=> cols.add(k)));
  cols = Array.from(cols);
  let csv = cols.join(';')+'\n';
  rows.forEach(r=>{
    csv += cols.map(k=> String(r[k]??'').replaceAll(';',',')).join(';')+'\n';
  });
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = (CURRENT_SHEET||'export')+'.csv';
  a.click();
  URL.revokeObjectURL(url);
}

window.addEventListener('DOMContentLoaded', loadData);
