// FORM v2.0A.4 - theme and settings add-on. Does not modify FORM fitness records.
(function () {
'use strict';
const PREF_KEY='form-ui-preferences-v1';
const THEMES={
 gold:{name:'Gold',light:'#FFE69A',main:'#E8B84F',dark:'#B8860B',bg:'#14100B',card:'#241E14',border:'#56452B'},
 emerald:{name:'Emerald',light:'#91F5D0',main:'#10B981',dark:'#047857',bg:'#0D1916',card:'#182923',border:'#345C4D'},
 purple:{name:'Purple',light:'#E2B8FF',main:'#A855F7',dark:'#6821A8',bg:'#171020',card:'#271B32',border:'#58416B'},
 blue:{name:'Ocean Blue',light:'#9EE6FF',main:'#38BDF8',dark:'#0284C7',bg:'#101923',card:'#1A2937',border:'#38546A'},
 rose:{name:'Rose',light:'#FFB4D4',main:'#F472B6',dark:'#BE185D',bg:'#1C1018',card:'#301C29',border:'#654058'},
 champagne:{name:'Champagne',light:'#FFF0C6',main:'#E3C990',dark:'#A68B58',bg:'#191611',card:'#2B261D',border:'#64543D'},
 mono:{name:'Monochrome',light:'#F5F5F5',main:'#BDBDBD',dark:'#737373',bg:'#121212',card:'#242424',border:'#515151'}
};
let prefs={theme:'emerald',density:'spacious'};
try{const x=JSON.parse(localStorage.getItem(PREF_KEY)||'{}');if(THEMES[x.theme])prefs.theme=x.theme;if(['spacious','compact'].includes(x.density))prefs.density=x.density}catch{}
function savePrefs(){try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}catch{alert('Could not save appearance settings on this device.')}}
const oldHome=home,oldCoach=coach,oldRender=render;
home=function(){return `<div class="actions" style="justify-content:flex-end;margin:0 0 8px"><button class="button secondary small" onclick="go('settings')" aria-label="Open FORM settings">⚙ Settings</button></div>`+oldHome()};
coach=function(){return oldCoach().replace(/<div class="card spaced"><h2>Your data<\/h2>[\s\S]*?<\/div><\/div>$/,'')};
function settingsView(){
 const options=Object.entries(THEMES).map(([id,t])=>`<button type="button" class="form-theme-choice ${prefs.theme===id?'chosen':''}" onclick="formChooseTheme('${id}')" aria-pressed="${prefs.theme===id}"><span class="form-theme-swatch" style="background:linear-gradient(135deg,${t.light},${t.main} 55%,${t.dark})"></span><span>${esc(t.name)}</span>${prefs.theme===id?'<span aria-hidden="true">✓</span>':''}</button>`).join('');
 return `<div class="row" style="margin-bottom:15px"><h1>Settings</h1><button class="button secondary small" onclick="go('home')">← Home</button></div>
 <div class="card"><h2>Appearance</h2><p class="muted tiny">Choose a gradient theme. Changes apply immediately and are saved on this device.</p><div class="form-theme-grid">${options}</div>
 <h3 style="margin-top:20px">Workout card spacing</h3><label for="formCardDensity">Layout</label><select id="formCardDensity" onchange="formSetDensity(this.value)"><option value="spacious" ${prefs.density==='spacious'?'selected':''}>Spacious</option><option value="compact" ${prefs.density==='compact'?'selected':''}>Compact</option></select></div>
 <div class="card"><h2>Data management</h2><p class="muted tiny">Backup and restore your training records and check-ins. Imports replace existing app records, so export first.</p><div class="actions"><button class="button" onclick="exportData()">Export backup</button><button class="button secondary" onclick="importForm()">Import backup</button></div>
 ${typeof window.formExportPrivatePhotos==='function'?'<div class="actions"><button class="button secondary" onclick="formExportPrivatePhotos()">Export private photos</button><button class="button secondary" onclick="formImportPrivatePhotos()">Restore private photos</button></div>':''}
 <p class="muted tiny">Standard backup photo handling depends on whether the Private Photos update is installed. Treat all backup files as sensitive.</p></div>
 <div class="card"><h2>About FORM</h2><p class="muted tiny">Appearance preferences are stored separately on this device. Your workout, nutrition, and check-in records are unchanged by theme switching.</p></div>
 <div class="card"><h2>Danger zone</h2><p class="muted tiny">Reset permanently deletes locally saved FORM fitness records. Keep a backup first.</p><button class="button danger" onclick="resetData()">Reset all FORM data</button></div>`;
}
render=function(){if(page==='settings'){nav();$('app').innerHTML=settingsView();return}oldRender()};
window.formChooseTheme=function(id){if(!THEMES[id])return;prefs.theme=id;savePrefs();applyTheme();render()};
window.formSetDensity=function(v){if(!['compact','spacious'].includes(v))return;prefs.density=v;savePrefs();applyTheme()};
function applyTheme(){
 const t=THEMES[prefs.theme];let style=document.getElementById('form-settings-theme');if(!style){style=document.createElement('style');style.id='form-settings-theme';document.head.appendChild(style)}
 style.textContent=`:root{background:${t.bg}!important;color:#F5F5F1!important}body{background:${t.bg}!important}.card,dialog{background:${t.card}!important;border-color:${t.border}!important}.button:not(.secondary):not(.danger),.tabs button.selected{background:linear-gradient(135deg,${t.light},${t.main} 55%,${t.dark})!important;color:#111!important}.button.secondary{background:${t.card}!important;color:${t.light}!important;border:1px solid ${t.border}!important}.metric,.nav button.active,.pill,.brand span{color:${t.main}!important}.progress>div{background:linear-gradient(90deg,${t.dark},${t.light})!important}.nav{background:${t.bg}!important;border-color:${t.border}!important}.tag,.pill{background:${t.card}!important}.notice{background:${t.card}!important;border-color:${t.main}!important}.item{border-color:${t.border}!important}input,select,textarea{background:${t.bg}!important;border-color:${t.border}!important;color:#f5f5f1!important}.form-theme-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.form-theme-choice{display:flex;align-items:center;gap:8px;min-height:58px;padding:9px;background:${t.bg};border:1px solid ${t.border};border-radius:12px;color:#f5f5f1;text-align:left}.form-theme-choice.chosen{outline:2px solid ${t.main}}.form-theme-swatch{width:35px;height:35px;flex:none;border-radius:9px}.workout-card{border-color:${t.border}!important;background:${t.card}!important}.workout-card-heading{color:#f5f5f1!important}body.form-density-compact .workout-card{padding:9px!important;margin-bottom:8px!important}body.form-density-compact .card{padding:12px!important;margin-bottom:9px!important}`;
 document.body.classList.toggle('form-density-compact',prefs.density==='compact');
 const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',t.bg);
}
applyTheme();
render();
})();
