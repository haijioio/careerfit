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
  certificates: []
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
          <button class="btn" onclick="openImportTextModal()">Add with AI later</button>
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
      <p class="lead">Keep the full truth of your career here. Future resumes will be generated from this profile rather than inventing new facts.</p>
    </div>
    <section class="card">
      <div class="section-head"><div><h2>Personal Information</h2><div class="sub">Used for your resume header.</div></div><button class="btn" onclick="openPersonalModal()">Edit</button></div>
      <div class="two-col">
        <div><strong>${escapeHtml(profile.personal.name || "Not added")}</strong><div class="meta">${escapeHtml(profile.personal.headline || "")}</div></div>
        <div class="meta">${escapeHtml([profile.personal.email,profile.personal.phone,profile.personal.location].filter(Boolean).join(" · ") || "Contact details not added")}</div>
      </div>
    </section>

    <section class="card" style="margin-top:18px">
      <div class="section-head"><div><h2>Work Experience</h2><div class="sub">${s.experiences} saved</div></div><button class="btn primary" onclick="openExperienceModal()">+ Add Experience</button></div>
      <div class="experience-list">${profile.experiences.length ? profile.experiences.map(experienceCard).join("") : emptyBlock("No work experience yet.","Add your first job, internship, or freelance role.")}</div>
    </section>

    <div class="two-col" style="margin-top:18px">
      <section class="card">
        <div class="section-head"><div><h2>Achievements</h2><div class="sub">${s.achievements} saved</div></div><button class="btn" onclick="openSimpleItemModal('achievement')">+ Add</button></div>
        ${simpleList(profile.achievements,"achievement")}
      </section>
      <section class="card">
        <div class="section-head"><div><h2>Skills</h2><div class="sub">${s.skills} saved</div></div><button class="btn" onclick="openSimpleItemModal('skill')">+ Add</button></div>
        ${simpleList(profile.skills,"skill")}
      </section>
      <section class="card">
        <div class="section-head"><div><h2>Projects</h2><div class="sub">${s.projects} saved</div></div><button class="btn" onclick="openSimpleItemModal('project')">+ Add</button></div>
        ${simpleList(profile.projects,"project")}
      </section>
      <section class="card">
        <div class="section-head"><div><h2>Education</h2><div class="sub">${s.education} saved</div></div><button class="btn" onclick="openSimpleItemModal('education')">+ Add</button></div>
        ${simpleList(profile.education,"education")}
      </section>
      <section class="card">
        <div class="section-head"><div><h2>Certificates</h2><div class="sub">${s.certificates} saved</div></div><button class="btn" onclick="openSimpleItemModal('certificate')">+ Add</button></div>
        ${simpleList(profile.certificates,"certificate")}
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
  const x=index===null?{company:"",position:"",start:"",end:"",current:false,summary:"",responsibilities:"",achievements:"",skills:"",tools:"",products:"",industry:""}:profile.experiences[index];
  openModal(index===null?"Add Work Experience":"Edit Work Experience",`<form onsubmit="saveExperience(event,${index===null?"null":index})" class="form-grid">
    <div class="field"><label>Company *</label><input name="company" value="${escapeHtml(x.company)}" required></div>
    <div class="field"><label>Position *</label><input name="position" value="${escapeHtml(x.position)}" required></div>
    <div class="field"><label>Start date</label><input name="start" type="month" value="${escapeHtml(x.start)}"></div>
    <div class="field"><label>End date</label><input name="end" type="month" value="${escapeHtml(x.end)}"></div>
    <div class="field full"><label><input name="current" type="checkbox" ${x.current?"checked":""} style="width:auto;margin-right:7px"> I currently work here</label></div>
    <div class="field full"><label>Role summary</label><textarea name="summary" placeholder="A short overview of what you did.">${escapeHtml(x.summary)}</textarea></div>
    <div class="field full"><label>Responsibilities</label><textarea name="responsibilities" placeholder="One responsibility per line">${escapeHtml(x.responsibilities)}</textarea></div>
    <div class="field full"><label>Achievements / measurable results</label><textarea name="achievements" placeholder="One achievement per line. Keep numbers and facts exactly as they are.">${escapeHtml(x.achievements)}</textarea></div>
    <div class="field"><label>Skills</label><textarea name="skills" placeholder="e.g. Foreign Trade, Negotiation">${escapeHtml(x.skills)}</textarea></div>
    <div class="field"><label>Tools / Platforms</label><textarea name="tools" placeholder="e.g. Alibaba, Facebook">${escapeHtml(x.tools)}</textarea></div>
    <div class="field"><label>Products / Services</label><textarea name="products">${escapeHtml(x.products)}</textarea></div>
    <div class="field"><label>Industry</label><input name="industry" value="${escapeHtml(x.industry)}"></div>
    <div class="actions field full"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" type="submit">Save Experience</button></div>
  </form>`);
}
function saveExperience(e,index){
  e.preventDefault(); const f=new FormData(e.target);
  const x=Object.fromEntries(f.entries()); x.current=f.get("current")==="on";
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
function openImportTextModal(){
  openModal("Tell AI About Your Experience",`<p class="small-note">This is the AI import entry point. In the next phase, you will be able to paste a long description of your career and have AI automatically split it into companies, projects, skills, achievements, and other structured fields.</p><textarea placeholder="Example: I joined ABC Company in 2024..."></textarea><div class="actions"><button class="btn" onclick="closeModal()">Close</button></div>`);
}
function startTailor(){
  const jd=document.getElementById("home-jd")?.value.trim();
  if(!jd){toast("Paste a job description first.");return;}
  toast("Tailoring will be connected in Phase 2.");
}
render();
