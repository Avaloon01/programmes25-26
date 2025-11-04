const DATA_URL = "/data/competences_attendus.json"; // chemin demandé
const STORAGE_KEY = "semainier_notes_v1";

const MATIERE_ALIASES = [
  { test: /fluence\s*semaine\s*x/i, key: "fluences" },
  { test: /math\s*semaine\s*x/i, key: "math" },
  { test: /grandeurs\s*semaine\s*x/i, key: "grandeurs" },
  { test: /(néerlandais|neerlandais)(\s*semaine\s*x)?/i, key: "neerlandais" },
  { test: /traitement\s+de\s+données\s*semaine\s*x/i, key: "traitement_donnees" },
  { test: /alg(e|è)bre\s*semaine\s*x/i, key: "algebre" },
  { test: /géographie\s*semaine\s*x|geographie\s*semaine\s*x/i, key: "geographie" },
  { test: /histoire\s*semaine\s*x/i, key: "histoire" },
  { test: /solides?\s+et\s+figures\s*semaine\s*x/i, key: "solides_figures" },
];

let DATA = {};        // données chargées
let notes = {};       // notes locales
const $ = sel => document.querySelector(sel);

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    DATA = await res.json();
  } catch (e) {
    console.error("Impossible de charger le JSON:", e);
    DATA = {};
  }

  const select = $("#selectSemaine");
  const weeks = Object.keys(DATA).sort((a,b)=>{
    const na = parseInt((a.match(/\d+/)||[0])[0],10);
    const nb = parseInt((b.match(/\d+/)||[0])[0],10);
    if(isNaN(na)||isNaN(nb)) return a.localeCompare(b);
    return na - nb;
  });
  if(weeks.length === 0){
    ["S1","S2","S3","S4","S5","S6","S7","S8"].forEach(w=>{
      const opt = document.createElement("option");
      opt.value = w; opt.textContent = w;
      select.appendChild(opt);
    });
  } else {
    weeks.forEach(w=>{
      const opt = document.createElement("option");
      opt.value = w; opt.textContent = w;
      select.appendChild(opt);
    });
  }

  notes = loadNotes();
  document.querySelectorAll("#tableSemainier td.cell").forEach(td=>{
    td.contentEditable = "true";
    const slot = td.getAttribute("data-slot");
    if(notes[slot]) td.innerHTML = notes[slot];

    td.addEventListener("blur", ()=>{
      notes[slot] = td.innerHTML;
      saveNotes();
    });
  });

  $("#btnApply").addEventListener("click", applyWeek);
  $("#btnClear").addEventListener("click", ()=>{
    if(confirm("Effacer toutes mes notes locales (pas le JSON) ?")){
      localStorage.removeItem(STORAGE_KEY);
      notes = {};
      location.reload();
    }
  });
  $("#btnPrint").addEventListener("click", ()=> window.print() );
});

function loadNotes(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){
    return {};
  }
}
function saveNotes(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function applyWeek(){
  const week = $("#selectSemaine").value;
  const weekData = DATA[week] || {};

  document.querySelectorAll("#tableSemainier td.cell").forEach(td=>{
    let html = notes[td.dataset.slot] || td.innerHTML;

    html = html.replace(/<div class="block-auto"[\s\S]*?<\/div>/g,"");

    const lower = html.toLowerCase();
    let blocks = "";

    MATIERE_ALIASES.forEach(({test,key})=>{
      if(test.test(lower)){
        const bloc = buildAutoBlock(weekData, key);
        if(bloc) blocks += bloc;
      }
    });

    td.innerHTML = (html.trim() + blocks);
    notes[td.dataset.slot] = td.innerHTML;
  });

  saveNotes();
}

function buildAutoBlock(weekData, key){
  const m = weekData?.[key];
  if(!m) return "";
  const titre = esc(m.titre || key);
  const comp  = esc(m.competence || "");
  const att   = esc(m.attendu || "");
  const det   = esc(m.details || "");
  return `
    <div class="block-auto">
      <div class="matiere">${titre}</div>
      ${comp ? `<div><strong>Compétence :</strong> ${comp}</div>` : ""}
      ${att ? `<div><strong>Attendu :</strong> ${att}</div>` : ""}
      ${det ? `<div>${det}</div>` : ""}
    </div>
  `;
}

function esc(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
