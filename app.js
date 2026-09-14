const STORAGE_KEY = "careerfit_profile_v1";
const PAGE_KEY = "careerfit_page_v1";

const blankProfile = {
  version: 1,
  updatedAt: null,
  personal: { name: "", headline: "", email: "", phone: "", location: "" },
  experiences: [],
  achievements: [],
  skills: [],
  projects: [],
  education: [],
  certificates: [],
  sourceDocuments: []
};

let profile = loadProfile();
let currentPage = localStorage.getItem(PAGE_KEY) || "home";

function loadProfile(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? {...blankProfile, ...saved} : structuredClone(blankProfile);
  }catch(e){ return structuredClone(blankProfile); }
}
function saveProfile(){
  profile.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  render();
}
function escapeHtml(value=""){
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function splitLines(value=""){
  return value.split(/\n|,/).map(s=>s.trim()).filter(Boolean);
}
function fmtDate(value){
  if(!value) return "";
  const [y,m] = value.split("-");
  return m ? `${m}/${y}` : value;
}
function dateRange(start,end,current){
  if(!start && !end) return "";
  return `${fmtDate(start) || "Unknown"} – ${current ? "Present" : (fmtDate(end) || "Unknown")}`;
}
function toast(message){
  const el=document.getElementById("toast");
  el.textContent=message; el.classList.add("show");
  clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove("show"),2200);
}
function setPage(page){
  currentPage=page; localStorage.setItem(PAGE_KEY,page); render();
  window.scrollTo({top:0,behavior:"smooth"});
}
function updateNav(){
  document.querySelectorAll("[data-page]").forEach(b=>{
    b.classList.toggle("active", b.dataset.page===currentPage);
  });
}
function stats(){
  return {
    experiences: profile.experiences.length,
    achievements: profile.achievements.length,
    skills: profile.skills.length,
    projects: profile.projects.length,
    education: profile.education.length,
    certificates: profile.certificates.length
  };
}
function render(){
  const app=document.getElementById("app");
  if(currentPage==="home") app.innerHTML=homePage();
  else if(currentPage==="profile") app.innerHTML=profilePage();
  else app.innerHTML=settingsPage();
  updateNav();
}
function homePage(){
  const s=stats();
  const has=profile.experiences.length || profile.skills.length || profile.projects.length;
  return `
    <section class="hero">
      <p class="eyebrow">AI career workspace</p>
      <h1>Your career experience,<br>tailored for every opportunity.</h1>
      <p class="lead">Build your Career Profile once. Later, paste any job description and CareerFit will use your real experience to create a resume tailored to that role.</p>
    </section>
    <div class="grid home-grid">
      <section class="card">
        <p class="eyebrow">My Career Profile</p>
        <h2>${escapeHtml(profile.personal.name || "Your professional story")}</h2>
        <p class="small-note">${escapeHtml(profile.personal.headline || "Your long-term career database starts here.")}</p>
        <div class="profile-summary">
          <div class="stat"><strong>${s.experiences}</strong><span>Experiences</span></div>
          <div class="stat"><strong>${s.achievements}</strong><span>Achievements</span></div>
          <div class="stat"><strong>${s.skills}</strong><span>Skills</span></div>
          <div class="stat"><strong>${s.projects}</strong><span>Projects</span></div>
        </div>
        <div class="actions">
          <button class="btn primary" onclick="setPage('profile')">Manage Career Profile</button>
          <button class="btn" onclick="setPage('profile')">Build Career Profile</button>
        </div>
      </section>
      <section class="card">
        <p class="eyebrow">Target Job</p>
        <h2>Paste a job description</h2>
        <p class="small-note">The AI tailoring workspace will be connected in the next phase.</p>
        <textarea id="home-jd" placeholder="Paste the job description here..."></textarea>
        <div class="actions">
          <button class="btn primary" onclick="startTailor()">✨ Tailor My Resume</button>
        </div>
        <div class="callout" style="margin-top:16px">V1 is building the Career Profile foundation first. Your data stays in this browser and is not sent anywhere by this version.</div>
      </section>
    </div>
    <section class="card" style="margin-top:18px">
      <div class="section-head"><div><h2>How CareerFit works</h2><div class="sub">One profile → multiple tailored resumes</div></div></div>
      <div class="quick-list">
        <div class="quick-item"><strong>01 · Build your profile</strong><span>Store all real experience</span></div>
        <div class="quick-item"><strong>02 · Paste a job description</strong><span>AI extracts what matters</span></div>
        <div class="quick-item"><strong>03 · Match your experience</strong><span>See strengths and gaps</span></div>
        <div class="quick-item"><strong>04 · Generate 3 resume versions</strong><span>Conservative · Targeted · Keyword Focused</span></div>
      </div>
    </section>`;
}
function profilePage(){
  const s=stats();
  return `
    <div class="page-title">
      <p class="eyebrow">My Career Profile</p>
      <h1 style="font-size:42px">Your professional story.</h1>
      <p class="lead">You only need to provide the raw material. CareerFit can organize the details later, so you don't have to fill dozens of fields yourself.</p>
    </div>

    <section class="card import-card">
      <div class="section-head">
        <div><p class="eyebrow">Start with what you already have</p><h2>Import your existing resumes</h2><div class="sub">Upload multiple PDF or DOCX resumes, then review the AI-organized profile before using it for tailoring.</div></div>
        <button class="btn primary" onclick="openResumeImportModal()">✨ Import Resumes</button>
      </div>
      <div class="import-grid">
        <div class="import-step"><span>01</span><div><strong>Upload</strong><p>Drop in old resumes or select multiple files.</p></div></div>
        <div class="import-step"><span>02</span><div><strong>Analyze</strong><p>CareerFit will extract and organize your real experience.</p></div></div>
        <div class="import-step"><span>03</span><div><strong>Review</strong><p>Confirm the facts before they become your career profile.</p></div></div>
      </div>
      ${profile.sourceDocuments?.length ? `<div class="source-list"><strong>${profile.sourceDocuments.length} source resume${profile.sourceDocuments.length>1?'s':''} saved</strong>${profile.sourceDocuments.map((d,i)=>`<div class="source-item"><span>${escapeHtml(d.name)}</span><button class="icon-btn" onclick="deleteSourceDocument(${i})">×</button></div>`).join('')}</div>` : ''}
    </section>

    <section class="card" style="margin-top:18px">
      <div class="section-head"><div><h2>Work Experience</h2><div class="sub">${s.experiences} saved · only the basics are required</div></div><button class="btn primary" onclick="openExperienceModal()">+ Add Experience</button></div>
      <div class="experience-list">${profile.experiences.length ? profile.experiences.map(experienceCard).join("") : emptyBlock("No work experience yet.","Add company, position, dates, and your work content. CareerFit can organize the rest.")}</div>
    </section>

    <div class="two-col" style="margin-top:18px">
      <section class="card">
        <div class="section-head"><div><h2>Certificates</h2><div class="sub">${s.certificates} saved</div></div><button class="btn" onclick="openSimpleItemModal('certificate')">+ Add</button></div>
        ${simpleList(profile.certificates,"certificate")}
      </section>
      <section class="card">
        <div class="section-head"><div><h2>Projects</h2><div class="sub">${s.projects} saved</div></div><button class="btn" onclick="openSimpleItemModal('project')">+ Add</button></div>
        ${simpleList(profile.projects,"project")}
      </section>
      <section class="card">
        <div class="section-head"><div><h2>Professional Skills</h2><div class="sub">${s.skills} saved · AI can extract these from your materials</div></div><button class="btn" onclick="openSimpleItemModal('skill')">+ Add</button></div>
        ${simpleList(profile.skills,"skill")}
      </section>
      <section class="card">
        <div class="section-head"><div><h2>Achievements</h2><div class="sub">${s.achievements} saved · AI-organized</div></div><button class="btn" onclick="openSimpleItemModal('achievement')">+ Add</button></div>
        ${simpleList(profile.achievements,"achievement")}
      </section>
    </div>`;
}
function emptyBlock(title,sub){return `<div class="empty"><strong>${title}</strong>${sub}</div>`}
function experienceCard(x,i){
  const tags=[...splitLines(x.skills),...splitLines(x.tools)].slice(0,8);
  return `<article class="experience-item">
    <div class="experience-top">
      <div><h3>${escapeHtml(x.position || "Untitled position")}</h3><div class="meta">${escapeHtml(x.company || "Company not added")} · ${escapeHtml(dateRange(x.start,x.end,x.current))}</div></div>
      <div class="actions" style="margin:0"><button class="btn" onclick="openExperienceModal(${i})">Edit</button><button class="btn danger" onclick="deleteExperience(${i})">Delete</button></div>
    </div>
    ${x.summary ? `<p class="small-note" style="margin:13px 0 0">${escapeHtml(x.summary)}</p>` : ""}
    ${tags.length ? `<div class="tags">${tags.map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
  </article>`;
}
function simpleList(items,type){
  if(!items.length) return emptyBlock("Nothing added yet.","You can build this section gradually.");
  return `<div class="quick-list">${items.map((x,i)=>{
    const text=typeof x==="string"?x:(x.title||x.name||x.school||x.text||"Untitled");
    const sub=typeof x==="string"?"":(x.description||x.degree||x.issuer||"");
    return `<div class="quick-item"><div><strong>${escapeHtml(text)}</strong>${sub?`<div class="meta">${escapeHtml(sub)}</div>`:""}</div><button class="icon-btn" onclick="deleteSimple('${type}',${i})">×</button></div>`;
  }).join("")}</div>`;
}
function settingsPage(){
  return `<div class="page-title"><p class="eyebrow">Settings</p><h1 style="font-size:42px">Your data, your control.</h1><p class="lead">CareerFit V1 stores your Career Profile in this browser.</p></div>
    <div class="two-col">
      <section class="card"><h2>Export Profile</h2><p class="small-note">Download a backup of your Career Profile. You can move it to another browser or computer later.</p><button class="btn primary" onclick="exportProfile()">Export My Profile</button></section>
      <section class="card"><h2>Import Profile</h2><p class="small-note">Restore a previously exported CareerFit profile JSON file.</p><input id="import-file" class="file-input" type="file" accept=".json,application/json" onchange="importProfile(this.files[0])"></section>
      <section class="card"><h2>Privacy</h2><p class="small-note">In this V1, profile data is stored locally in your browser. AI, cloud sync, accounts, and server storage will be added only in later phases.</p></section>
      <section class="card"><h2>About CareerFit</h2><p class="small-note">One career profile. A resume for every opportunity.</p><div class="divider"></div><p class="small-note">Version 1 · Career Profile foundation</p></section>
    </div>`;
}
function openModal(title,body){
  document.getElementById("modal-root").innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-head"><div><p class="eyebrow">CareerFit</p><h2>${title}</h2></div><button class="icon-btn" onclick="closeModal()">×</button></div>${body}</div></div>`;
}
function closeModal(){document.getElementById("modal-root").innerHTML=""}
function openPersonalModal(){
  const p=profile.personal;
  openModal("Personal Information",`<form onsubmit="savePersonal(event)" class="form-grid">
    <div class="field"><label>Full name</label><input name="name" value="${escapeHtml(p.name)}" required></div>
    <div class="field"><label>Professional headline</label><input name="headline" value="${escapeHtml(p.headline)}" placeholder="e.g. Overseas Sales Representative"></div>
    <div class="field"><label>Email</label><input name="email" type="email" value="${escapeHtml(p.email)}"></div>
    <div class="field"><label>Phone</label><input name="phone" value="${escapeHtml(p.phone)}"></div>
    <div class="field full"><label>Location</label><input name="location" value="${escapeHtml(p.location)}" placeholder="City, Country"></div>
    <div class="actions field full"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" type="submit">Save</button></div>
  </form>`);
}
function savePersonal(e){
  e.preventDefault(); const f=new FormData(e.target);
  profile.personal=Object.fromEntries(f.entries()); saveProfile(); closeModal(); toast("Personal information saved.");
}
function openExperienceModal(index=null){
  const x=index===null?{company:"",position:"",start:"",end:"",current:false,workContent:""}:profile.experiences[index];
  openModal(index===null?"Add Work Experience":"Edit Work Experience",`<form onsubmit="saveExperience(event,${index===null?"null":index})" class="form-grid">
    <div class="field"><label>Company *</label><input name="company" value="${escapeHtml(x.company)}" required></div>
    <div class="field"><label>Position *</label><input name="position" value="${escapeHtml(x.position)}" required></div>
    <div class="field"><label>Start date</label><input name="start" type="month" value="${escapeHtml(x.start)}"></div>
    <div class="field"><label>End date</label><input name="end" type="month" value="${escapeHtml(x.end)}"></div>
    <div class="field full"><label><input name="current" type="checkbox" ${x.current?"checked":""} style="width:auto;margin-right:7px"> I currently work here</label></div>
    <div class="field full"><label>Work Content</label><textarea name="workContent" style="min-height:220px" placeholder="Write naturally. Don't worry about separating responsibilities, achievements, skills, tools, clients, products, or metrics. CareerFit will organize them later.">${escapeHtml(x.workContent || x.summary || "")}</textarea><div class="hint">Just tell the story as you remember it. Keep real numbers and facts exactly as they are.</div></div>
    <div class="actions field full"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" type="submit">Save Experience</button></div>
  </form>`);
}
function saveExperience(e,index){
  e.preventDefault(); const f=new FormData(e.target);
  const x=Object.fromEntries(f.entries()); x.current=f.get("current")==="on";
  x.workContent=x.workContent||"";
  if(index===null) profile.experiences.push(x); else profile.experiences[index]=x;
  saveProfile(); closeModal(); toast(index===null?"Experience added.":"Experience updated.");
}
function deleteExperience(i){
  if(confirm("Delete this work experience?")){profile.experiences.splice(i,1);saveProfile();toast("Experience deleted.");}
}
function openSimpleItemModal(type){
  const names={achievement:"Achievement",skill:"Skill",project:"Project",education:"Education",certificate:"Certificate"};
  const label=names[type];
  openModal(`Add ${label}`,`<form onsubmit="saveSimple(event,'${type}')" class="form-grid">
    <div class="field full"><label>${type==="skill"?"Skill name":type==="education"?"School / University":type==="certificate"?"Certificate name":type==="project"?"Project name":"Achievement"}</label><input name="title" required></div>
    <div class="field full"><label>${type==="education"?"Degree / Major":type==="certificate"?"Issuer":type==="project"?"Description":"Details (optional)"}</label><textarea name="description"></textarea></div>
    <div class="actions field full"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" type="submit">Add</button></div>
  </form>`);
}
function saveSimple(e,type){
  e.preventDefault();const f=new FormData(e.target);
  const obj={title:f.get("title"),description:f.get("description")};
  if(type==="skill") profile.skills.push(obj.title);
  else if(type==="achievement") profile.achievements.push(obj);
  else if(type==="project") profile.projects.push(obj);
  else if(type==="education") profile.education.push(obj);
  else profile.certificates.push(obj);
  saveProfile();closeModal();toast(`${type[0].toUpperCase()+type.slice(1)} added.`);
}
function deleteSimple(type,i){
  if(!confirm("Delete this item?"))return;
  const map={achievement:"achievements",skill:"skills",project:"projects",education:"education",certificate:"certificates"};
  profile[map[type]].splice(i,1);saveProfile();toast("Item deleted.");
}
function exportProfile(){
  const blob=new Blob([JSON.stringify(profile,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`careerfit-profile-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);
  toast("Profile exported.");
}
function importProfile(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const data=JSON.parse(reader.result);
      if(!data || !Array.isArray(data.experiences)) throw new Error("Invalid profile");
      profile={...blankProfile,...data};saveProfile();toast("Profile imported.");
    }catch(e){alert("This file is not a valid CareerFit profile.");}
  };reader.readAsText(file);
}
function openResumeImportModal(){
  openModal("Import Existing Resumes",`<div class="import-modal-copy"><p class="small-note">Upload as many old resumes as you want. PDF and DOCX are supported. CareerFit will keep the original source text so AI-organized information can always be traced back to your source.</p><div class="field"><label>Select resumes</label><input id="resume-files" class="file-input" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple></div><div id="resume-import-status" class="hint" style="margin-top:10px"></div><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="processResumeFiles()">Analyze / Organize</button></div></div>`);
}
async function processResumeFiles(){
  const input=document.getElementById("resume-files"); const status=document.getElementById("resume-import-status");
  if(!input?.files?.length){status.textContent="Please select at least one PDF or DOCX resume.";return;}
  const files=[...input.files]; status.textContent=`Reading ${files.length} resume${files.length>1?'s':''}…`;
  const docs=[];
  try{
    for(const file of files){
      const text=await extractResumeText(file);
      docs.push({name:file.name,type:file.type||"",size:file.size,text,createdAt:new Date().toISOString()});
    }
    profile.sourceDocuments=[...(profile.sourceDocuments||[]),...docs];
    saveProfile();
    status.textContent=`${docs.length} resume${docs.length>1?'s':''} imported. AI organization is ready for the next AI-processing phase.`;
    toast("Resumes imported and saved.");
  }catch(err){status.textContent="One or more files could not be read. Please try again.";}
}
async function extractResumeText(file){
  if(file.name.toLowerCase().endsWith(".docx")){
    if(!window.mammoth) await loadScript("https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js");
    const result=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
    return result.value||"";
  }
  if(file.name.toLowerCase().endsWith(".pdf")){
    if(!window.pdfjsLib) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js","module");
    const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    let out="";
    for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const c=await page.getTextContent();out+=c.items.map(x=>x.str).join(" ")+"\n";}
    return out;
  }
  return await file.text();
}
function loadScript(src,type){return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;if(type)s.type=type;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
function deleteSourceDocument(i){if(confirm("Remove this imported resume source?")){profile.sourceDocuments.splice(i,1);saveProfile();toast("Source removed.");}}

function openImportTextModal(){
  openModal("Tell AI About Your Experience",`<p class="small-note">This is the AI import entry point. In the next phase, you will be able to paste a long description of your career and have AI automatically split it into companies, projects, skills, achievements, and other structured fields.</p><textarea placeholder="Example: I joined ABC Company in 2024..."></textarea><div class="actions"><button class="btn" onclick="closeModal()">Close</button></div>`);
}
// Global navigation handler. Event delegation keeps navigation working even after page content is re-rendered.
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-page]");
  if (!button) return;
  setPage(button.dataset.page);
});

function startTailor(){
  const jd=document.getElementById("home-jd")?.value.trim();
  if(!jd){toast("Paste a job description first.");return;}
  toast("Tailoring will be connected in Phase 2.");
}
render();
