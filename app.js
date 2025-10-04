// app.js — version semaines "S1…S34" + JSON colonnes uniformes

async function loadData(){
  const DATA_URL = window.APP_DATA_URL || './data/programmes.json';
  const res = await fetch(DATA_URL, { cache: 'no-store' });
  const all = await res.json();
  window.ALL = all;

  const tabsEl = document.getElementById('tabs');
  tabsEl.innerHTML = '';
  (all.sheets || []).forEach((name, idx)=>{
    const b = document.createElement('button');
    b.className = 'tab' + (idx===0 ? ' active' : '');
    b.textContent = name;
    b.onclick = ()=> selectSheet(name, b);
    tabsEl.appendChild(b);
  });

  selectSheet(all.sheets?.[0], tabsEl.querySelector('.tab'));
  document.getElementById('q').addEventListener('input', applyFilters);
  document.getElementById('week').addEventListener('change', applyFilters);
  document.getElementById('export').addEventListener('click', exportCSV);
}

let CURRENT_SHEET = null;

function selectSheet(name, btn){
  CURRENT_SHEET = name;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  if(btn) btn.classList.add('active');
  // force rechamp des semaines quand on change d’onglet
  const weekSel = document.getElementById('week');
  weekSel.dataset.sheet = '';
  renderTable();
}

function getCurrentData(){
  const pack = (window.ALL?.programmes?.[CURRENT_SHEET]) || {columns:[], rows:[]};
  // Assurer "Semaine" en première position si présent
  const cols = Array.isArray(pack.columns) ? [...pack.columns] : [];
  const idx = cols.indexOf('Semaine');
  if(idx > 0){ cols.splice(idx,1); cols.unshift('Semaine'); }
  return {columns: cols, rows: Array.isArray(pack.rows) ? pack.rows : []};
}

// Utilitaire : extrait le numéro de semaine (S1 → 1, "1" → 1)
const numWeek = (w)=> {
  const n = parseInt(String(w ?? '').replace(/\D/g,''), 10);
  return Number.isFinite(n) ? n : 0;
};

function renderTable(){
  const tbody = document.querySelector('tbody#rows');
  const thead = document.querySelector('thead#headers');
  tbody.innerHTML=''; thead.innerHTML='';

  const {columns, rows} = getCurrentData();

  // Thead
  const trh = document.createElement('tr');
  columns.forEach(k=>{
    const th=document.createElement('th');
    th.textContent=k;
    trh.appendChild(th);
  });
  thead.appendChild(trh);

  // Alimente/rafraîchit le sélecteur de semaines (une fois par sheet)
  const weekSel = document.getElementById('week');
  if(weekSel.dataset.sheet !== CURRENT_SHEET){
    weekSel.innerHTML = '<option value="all">Toutes</option>';
    const weeks = [...new Set(rows.map(r=>r['Semaine']).filter(Boolean))]
      .sort((a,b)=> numWeek(a)-numWeek(b));
    weeks.forEach(w=>{
      const opt = document.createElement('option');
      opt.value = String(w);                 // valeur brute : "S1" / "1"
      opt.textContent = String(w);           // affichage identique (pas de "SS1")
      weekSel.appendChild(opt);
    });
    weekSel.dataset.sheet = CURRENT_SHEET;
  }

  // Filtres
  const q = document.getElementById('q').value.trim().toLowerCase();
  const week = document.getElementById('week').value;

  const filtered = rows.filter(r=>{
    const inWeek = (week==='all' || String(r['Semaine'])===week);
    const hay = Object.values(r).map(v=>String(v ?? '')).join(' ').toLowerCase();
    const inQ = !q || hay.includes(q);
    return inWeek && inQ;
  });

  // Lignes
  if(filtered.length === 0){
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = columns.length;
    td.style.opacity = '.7';
    td.textContent = 'Aucun résultat avec ces critères.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  filtered.forEach(r=>{
    const tr = document.createElement('tr');
    columns.forEach(k=>{
      const td = document.createElement('td');
      let val = r[k];
      if(k==='Semaine' && val!=null && val!==''){
        // N’affiche QUE la valeur telle qu’elle est dans le JSON (S1 / 1)
        const span = document.createElement('span');
        span.className = 'badge';
        span.textContent = String(val);
        td.appendChild(span);
      }else{
        td.textContent = (val==null ? '' : String(val));
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function applyFilters(){ renderTable(); }

function exportCSV(){
  const {columns, rows} = getCurrentData();
  // Reproduit les filtres actuels dans l’export
  const q = document.getElementById('q').value.trim().toLowerCase();
  const week = document.getElementById('week').value;
  const filtered = rows.filter(r=>{
    const inWeek = (week==='all' || String(r['Semaine'])===week);
    const hay = Object.values(r).map(v=>String(v ?? '')).join(' ').toLowerCase();
    const inQ = !q || hay.includes(q);
    return inWeek && inQ;
  });

  let csv = columns.join(';')+'\n';
  filtered.forEach(r=>{
    csv += columns.map(k=> String(r[k] ?? '').replaceAll(';',',').replaceAll('\n',' ')).join(';')+'\n';
  });

  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = (CURRENT_SHEET || 'export') + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

window.addEventListener('DOMContentLoaded', loadData);
