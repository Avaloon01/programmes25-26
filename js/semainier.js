const DATA_URL = "/data/competences_attendus.json";
const STORAGE_KEY_MODEL = "semainier_models_v2"; // stocke le HTML modèle (avec 'semaine x')
const STORAGE_KEY_LASTWEEK = "semainier_last_week_v2";

const SUBJECT_ALIASES = [
  { sheet: "Math  ", tests: [/(\b|_)math(\b|_)/i] },
  { sheet: "Géométrie  ", tests: [/géométrie|geometrie/i] },
  { sheet: "Algèbre  ", tests: [/alg(e|è)bre/i] },
  { sheet: "Grandeurs  ", tests: [/grandeurs?/i] },
  { sheet: "Traitement de données  ", tests: [/traitement\s+de\s+donn(e|é)es/i] },
  { sheet: "Fluences", tests: [/fluence(s)?/i] },
  { sheet: "Écriture  ", tests: [/écriture|ecriture/i] },
  { sheet: "Lire", tests: [/\blire\b|lecture/i] },
  { sheet: "Parler", tests: [/parler|expression\s+orale/i] },
  { sheet: "Ecouter", tests: [/écouter|ecouter|compr(é|e)hension\s+orale/i] },
  { sheet: "Sciences", tests: [/sciences?/i] },
  { sheet: "Histoire  ", tests: [/histoire/i] },
  { sheet: "Géographie  ", tests: [/g(é|e)ographie/i] },
  { sheet: "Economie sociale", tests: [/economie\s+sociale|économie\s+sociale/i] },
  { sheet: "ECA", tests: [/\beca\b|arts?\s+(plastiques|visuels|musique)/i] },
  { sheet: "FMTTN", tests: [/\bfmttn\b|education\s+physique|gym|eps/i] },
];

let INDEX = {};  // { "Math  ": { "S1": "attendu", ... }, ... }
let MODELS = {}; // { slot: "<html avec semaine x>", ... }

const $ = (s)=>document.querySelector(s);

document.addEventListener("DOMContentLoaded", init);

async function init(){
  await loadAndIndex();

  MODELS = loadModels();

  document.querySelectorAll("#tableSemainier td.cell").forEach(td=>{
    const slot = td.dataset.slot;
    if(!MODELS[slot]) MODELS[slot] = td.innerHTML; // modèle de base (avec 'semaine x')
    td.contentEditable = "true";

    td.addEventListener("blur", ()=> {
      const week = $("#selectSemaine")?.value || null;
      const subject = detectSubject(td.innerText, td.innerHTML);
      let html = td.innerHTML;

      if(week && subject){
        const att = getAttendu(subject, week);
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

    Object.entries(programmes).forEach(([sheet, obj])=>{
      const rows = obj?.rows || [];
      rows.forEach(r=>{
        const w = String(r.Semaine||"").trim(); // ex "S1"
        const att = String(r["Attendu associé"]||"").trim();
        if(!w || !att) return;
        if(!INDEX[sheet]) INDEX[sheet] = {};
        INDEX[sheet][w] = att;
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

    const subject = detectSubject(stripTags(modelHTML), modelHTML);
    let rendered = modelHTML;

    if(subject){
      const attendu = getAttendu(subject, week);
      if(attendu){
        // Remplacer toutes les occurrences "semaine x" (insensible casse/espaces)
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

function getAttendu(sheet, week){
  return INDEX?.[sheet]?.[week] || null;
}

function replaceSemaineX(html, attendu){
  // variantes tolérées : "semaine x", "Semaine  x", "semaine  X" etc.
  // on remplace uniquement le texte "semaine x" (pas d'autres X).
  return html.replace(/\bsemaine\s*x\b/gi, sanitizeAttendu(attendu));
}

function sanitizeAttendu(att){
  // simple nettoyage si besoin ; on peut aussi wrapper :
  // return `<span class="attendu">${escapeHTML(att)}</span>`;
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
