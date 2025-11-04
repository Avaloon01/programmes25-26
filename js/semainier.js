const DATA_URL = "/data/competences_attendus.json";
const STORAGE_KEY_MODEL = "semainier_models_v2_2";   // stocke le HTML modèle (avec 'semaine x')
const STORAGE_KEY_LASTWEEK = "semainier_last_week_v2_2";

const SUBJECT_ALIASES = [
  { sheet: "Math", tests: [/(\b|_)math(\b|_)/i] },
  { sheet: "Géométrie", tests: [/géométrie|geometrie/i] },
  { sheet: "Algèbre", tests: [/alg(e|è)bre/i] },
  { sheet: "Grandeurs", tests: [/grandeurs?/i] },
  { sheet: "Traitement de données", tests: [/traitement\s+de\s+donn(e|é)es/i] },
  { sheet: "Fluences", tests: [/fluence(s)?/i] },
  { sheet: "Écriture", tests: [/écriture|ecriture/i] },
  { sheet: "Lire", tests: [/\blire\b|lecture/i] },
  { sheet: "Parler", tests: [/parler|expression\s+orale/i] },
  { sheet: "Ecouter", tests: [/écouter|ecouter|compr(é|e)hension\s+orale/i] },
  { sheet: "Sciences", tests: [/sciences?/i] },
  { sheet: "Histoire", tests: [/histoire/i] },
  { sheet: "Géographie", tests: [/g(é|e)ographie/i] },
  { sheet: "Economie sociale", tests: [/economie\s+sociale|économie\s+sociale/i] },
  { sheet: "ECA", tests: [/\beca\b|arts?\s+(plastiques|visuels|musique)/i] },
  { sheet: "FMTTN", tests: [/\bfmttn\b|education\s+physique|gym|eps/i] },
];

let INDEX = {};   // { "Math  ": { "S1": "attendu", ... }, "Math": {...}, "math": {...} }
let MODELS = {};  // { slot: "<html modèle>", ... }

const $ = (s)=>document.querySelector(s);

document.addEventListener("DOMContentLoaded", init);

async function init(){
  await loadAndIndex();

  MODELS = loadModels();

  document.querySelectorAll("#tableSemainier td.cell").forEach(td=>{
    const slot = td.dataset.slot;
    if(!MODELS[slot]) MODELS[slot] = td.innerHTML; 
    td.contentEditable = "true";

    td.addEventListener("blur", ()=> {
      const week = $("#selectSemaine")?.value || null;
      const subjectKeyGuess = detectSubject(td.innerText, td.innerHTML);
      let html = td.innerHTML;

      if(week && subjectKeyGuess){
        const sheetKey = normalizeSheetKey(subjectKeyGuess);
        const att = getAttendu(sheetKey, week);
        if(att){
          const attEsc = escapeReg(att);
          html = html.replace(new RegExp(attEsc, "gi"), "semaine x");
        }
      }

      MODELS[slot] = html;
      saveModels();
    });
  });

  const sel = $("#selectSemaine");
  if(sel){
    const last = localStorage.getItem(STORAGE_KEY_LASTWEEK);
    for(let i=1;i<=35;i++){
      const opt = document.createElement("option");
      opt.value = "S"+i; opt.textContent = "S"+i;
      sel.appendChild(opt);
    }
    sel.value = last || "S1";
  }

  $("#btnApply")?.addEventListener("click", applyWeek);
  $("#btnClear")?.addEventListener("click", ()=>{
    if(confirm("Effacer mes notes/modèles locaux ?")){
      localStorage.removeItem(STORAGE_KEY_MODEL);
      MODELS = {};
      location.reload();
    }
  });
  $("#btnPrint")?.addEventListener("click", ()=>window.print());

  applyWeek();
}

async function loadAndIndex(){
  try{
    const res = await fetch(DATA_URL, { cache: "no-store" });
    const json = await res.json();
    const programmes = json?.programmes || {};

    Object.entries(programmes).forEach(([rawSheetKey, obj])=>{
      const rows = obj?.rows || [];
      rows.forEach(r=>{
        const w = String(r.Semaine||"").trim(); 
        const att = String(r["Attendu associé"] || r["Attendu"] || "").trim(); 
        if(!w || !att) return;

        const sheetTrim = rawSheetKey.trim();
        const sheetLower = sheetTrim.toLowerCase();

        if(!INDEX[rawSheetKey]) INDEX[rawSheetKey] = {};
        if(!INDEX[sheetTrim])   INDEX[sheetTrim]   = {};
        if(!INDEX[sheetLower])  INDEX[sheetLower]  = {};

        INDEX[rawSheetKey][w] = att;
        INDEX[sheetTrim][w]   = att;
        INDEX[sheetLower][w]  = att;
      });
    });
  }catch(e){
    console.error("Erreur chargement/indexation JSON:", e);
  }
}

function applyWeek(){
  const week = $("#selectSemaine")?.value || "S1";
  localStorage.setItem(STORAGE_KEY_LASTWEEK, week);

  document.querySelectorAll("#tableSemainier td.cell").forEach(td=>{
    const slot = td.dataset.slot;
    const modelHTML = MODELS[slot] || td.innerHTML;

    const subjectGuess = detectSubject(stripTags(modelHTML), modelHTML);
    let rendered = modelHTML;

    if(subjectGuess){
      const sheetKey = normalizeSheetKey(subjectGuess);
      const attendu = getAttendu(sheetKey, week);
      if(attendu){
        rendered = replaceSemaineX(rendered, attendu);
      }
    }

    td.innerHTML = rendered;
  });
}

function detectSubject(txt, html){
  const source = (txt || html || "").toLowerCase();
  for(const {sheet, tests} of SUBJECT_ALIASES){
    for(const re of tests){
      if(re.test(source)) return sheet;
    }
  }
  return null;
}

function normalizeSheetKey(sheetGuess){
  if(INDEX[sheetGuess]) return sheetGuess;
  const t = sheetGuess.trim();
  if(INDEX[t]) return t;
  const l = t.toLowerCase();
  if(INDEX[l]) return l;

  const allKeys = Object.keys(INDEX);
  const found = allKeys.find(k => k.trim().toLowerCase() === l);
  return found || sheetGuess;
}

function getAttendu(sheetKey, week){
  return INDEX?.[sheetKey]?.[week] || null;
}
function replaceSemaineX(html, attendu){
  return html.replace(/\bsemaine\s*x\b/gi, sanitizeAttendu(attendu));
}

function sanitizeAttendu(att){
  return escapeHTML(att);
}
function loadModels(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY_MODEL);
    return raw ? JSON.parse(raw) : {};
  }catch(_){ return {}; }
}
function saveModels(){
  localStorage.setItem(STORAGE_KEY_MODEL, JSON.stringify(MODELS));
}

function stripTags(s){ return String(s||"").replace(/<[^>]*>/g," "); }
function escapeHTML(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function escapeReg(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
