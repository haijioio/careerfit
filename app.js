const STORAGE_KEY = "careerfit_profile_v2";
const PAGE_KEY = "careerfit_page_v2";
const AI_KEY = "careerfit_gemini_api_key_v2";
const GEMINI_MODEL = "gemini-3.8-flash";
const AI_CONFIGS_KEY = "careerfit_ai_configs_v5";
const CURRENT_AI_KEY = "careerfit_current_ai_v5";
const JD_KEY = "careerfit_jd_v5";
const RESUME_HISTORY_KEY = "careerfit_resume_history_v5";

const blankProfile = {
  version: 2,
  updatedAt: null,
  personal: { name: "", headline: "", email: "", phone: "", location: "" },
  experiences: [],
  projects: [],
  certificates: [],
  skills: [],
  sourceDocuments: [],
  ai: { provider: "gemini", apiKey: "", lastConflicts: [] }
};

let profile = loadProfile();
let currentPage = localStorage.getItem(PAGE_KEY) || "home";

function loadProfile(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(!saved) return structuredClone(blankProfile);
    const merged = {
      ...structuredClone(blankProfile),
      ...saved,
      personal: {...blankProfile.personal, ...(saved.personal||{})},
      ai: {...blankProfile.ai, ...(saved.ai||{})},
      experiences: Array.isArray(saved.experiences)?saved.experiences:[],
      projects: Array.isArray(saved.projects)?saved.projects:[],
      certificates: Array.isArray(saved.certificates)?saved.certificates:[],
      skills: Array.isArray(saved.skills)?saved.skills:[],
      sourceDocuments: Array.isArray(saved.sourceDocuments)?saved.sourceDocuments:[]
    };
    // Migrate old profile data without forcing the old UI back.
    merged.experiences = merged.experiences.map(x => ({
      company:x.company||"", position:x.position||"", start:x.start||"", end:x.end||"", current:Boolean(x.current),
      rawWorkContent:x.rawWorkContent||x.workContent||x.summary||"", workContent:x.workContent||x.summary||"",
      sourceDocumentId:x.sourceDocumentId||""
    }));
    merged.projects = merged.projects.map(x => ({
      title:x.title||x.name||"", start:x.start||"", end:x.end||"", rawDescription:x.rawDescription||x.description||"", description:x.description||"",
      sourceDocumentId:x.sourceDocumentId||""
    }));
    merged.certificates = merged.certificates.map(x => typeof x === "string" ? x : (x.title||x.name||""));
    merged.skills = uniqueStrings(merged.skills.map(x => typeof x === "string" ? x : (x.title||x.name||"")));
    return merged;
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
function normalizeKey(v){ return String(v||"").toLowerCase().replace(/\s+/g," ").trim(); }
function uniqueStrings(items){
  const seen=new Set();
  return (items||[]).map(v=>String(v||"").trim()).filter(v=>v&&!seen.has(normalizeKey(v))&&seen.add(normalizeKey(v)));
}
function countWords(text){
  const s=String(text||"").trim();
  if(!s) return 0;
  const cjk=(s.match(/[\u3400-\u9fff]/g)||[]).length;
  const latin=s.replace(/[\u3400-\u9fff]/g," ").trim().split(/\s+/).filter(Boolean).length;
  return cjk+latin;
}
function fmtDate(value){
  if(!value) return "";
  const [y,m]=value.split("-");
  return m ? `${y}.${m}` : value;
}
function dateRange(start,end,current){
  if(!start&&!end) return "";
  return `${fmtDate(start)||"未填写"} — ${current?"至今":(fmtDate(end)||"未填写")}`;
}
function toast(message){
  const el=document.getElementById("toast"); if(!el) return;
  el.textContent=message; el.classList.add("show");
  clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove("show"),2400);
}
function setPage(page){ currentPage=page; localStorage.setItem(PAGE_KEY,page); render(); window.scrollTo({top:0,behavior:"smooth"}); }
function updateNav(){ document.querySelectorAll("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===currentPage)); }
function stats(){ return {experiences:profile.experiences.length,projects:profile.projects.length,certificates:profile.certificates.length,skills:profile.skills.length}; }
function render(){
  const app=document.getElementById("app");
  if(currentPage==="home") app.innerHTML=homePage();
  else if(currentPage==="profile") app.innerHTML=profilePage();
  else if(currentPage==="jd") app.innerHTML=jdPage();
  else if(currentPage==="resumes") app.innerHTML=resumesPage();
  else app.innerHTML=settingsPage();
  updateNav();
}
function homePage(){
  const s=stats();
  return `<section class="hero">
    <p class="eyebrow">CareerFit</p>
    <h1>先整理职业经历，<br>再让 AI 帮你写简历。</h1>
    <p class="lead">把过去的简历、工作经历和项目放进一个职业整理库。你只负责提供真实素材，CareerFit 负责定位、整理和润色。</p>
  </section>
  <div class="grid home-grid">
    <section class="card">
      <p class="eyebrow">我的职业整理库</p>
      <h2>${escapeHtml(profile.personal.name||"还没有开始整理")}</h2>
      <p class="small-note">你的职业素材统一保存在本机，后续生成简历时直接调用。</p>
      <div class="profile-summary">
        <div class="stat"><strong>${s.experiences}</strong><span>工作经历</span></div>
        <div class="stat"><strong>${s.projects}</strong><span>项目经历</span></div>
        <div class="stat"><strong>${s.certificates}</strong><span>证书</span></div>
        <div class="stat"><strong>${s.skills}</strong><span>专业技能</span></div>
      </div>
      <div class="actions"><button class="btn primary" onclick="setPage('profile')">进入职业整理库</button></div>
    </section>
    <section class="card">
      <p class="eyebrow">使用逻辑</p>
      <h2>你提供素材，AI负责整理</h2>
      <div class="quick-list">
        <div class="quick-item"><strong>① 工作经历</strong><span>公司 · 岗位 · 时间 · 工作内容</span></div>
        <div class="quick-item"><strong>② 项目经历</strong><span>项目名 · 时间 · 项目描述</span></div>
        <div class="quick-item"><strong>③ 证书</strong><span>只填写证书名称</span></div>
        <div class="quick-item"><strong>④ 专业技能</strong><span>AI 从所有简历中提取</span></div>
      </div>
    </section>
  </div>`;
}
function profilePage(){
  const s=stats();
  return `<div class="page-title"><p class="eyebrow">我的职业整理库</p><h1 style="font-size:42px">把过去的经历整理好。</h1><p class="lead">先上传你以前做过的简历。之后添加工作或项目时，可以直接从已有简历定位对应内容，再交给 AI 分析润色。</p></div>
  <section class="card import-card">
    <div class="section-head"><div><p class="eyebrow">第一步</p><h2>上传以前的简历</h2><div class="sub">支持一次上传多个 PDF / DOCX。原始文字会保存在本机，后面可以反复使用。</div></div><button class="btn primary" onclick="openResumeImportModal()">📄 上传简历</button></div>
    <div class="import-grid">
      <div class="import-step"><span>01</span><div><strong>上传</strong><p>把过去的简历一次性放进来。</p></div></div>
      <div class="import-step"><span>02</span><div><strong>定位</strong><p>填写公司、岗位、时间后，可从简历定位对应内容。</p></div></div>
      <div class="import-step"><span>03</span><div><strong>润色</strong><p>AI 根据原始内容优化表达，不编造事实。</p></div></div>
    </div>
    ${profile.sourceDocuments.length?`<div class="source-list"><strong>已上传 ${profile.sourceDocuments.length} 份简历</strong>${profile.sourceDocuments.map((d,i)=>`<div class="source-item"><span>${escapeHtml(d.name)} <small class="meta">· ${d.wordCount||0} 字</small></span><button class="icon-btn" onclick="deleteSourceDocument(${i})">×</button></div>`).join("")}</div>`:""}
  </section>

  <section class="card" style="margin-top:18px"><div class="section-head"><div><h2>工作经历</h2><div class="sub">${s.experiences} 段 · 只填写公司、岗位、时间和工作内容</div></div><button class="btn primary" onclick="openExperienceModal()">＋添加工作经历</button></div>
    <div class="experience-list">${profile.experiences.length?profile.experiences.map(experienceCard).join(""):emptyBlock("还没有工作经历","填写公司、岗位、时间后，可以直接从你上传的简历中定位内容。")}</div>
  </section>

  <section class="card" style="margin-top:18px"><div class="section-head"><div><h2>项目经历</h2><div class="sub">${s.projects} 个 · 项目名称和时间由你填写，描述可从简历提取或自己输入</div></div><button class="btn primary" onclick="openProjectModal()">＋添加项目</button></div>
    <div class="experience-list">${profile.projects.length?profile.projects.map(projectCard).join(""):emptyBlock("还没有项目经历","添加项目名称和时间，再填写或从简历中提取项目描述。")}</div>
  </section>

  <div class="two-col" style="margin-top:18px">
    <section class="card"><div class="section-head"><div><h2>证书</h2><div class="sub">只需要证书名称</div></div><button class="btn" onclick="openCertificateModal()">＋添加证书</button></div>${simpleList(profile.certificates,"certificate")}</section>
    <section class="card"><div class="section-head"><div><h2>专业技能</h2><div class="sub">AI 从所有上传的简历中提取，也可以手动补充</div></div><button class="btn" onclick="extractSkillsFromAllResumes()">✨ AI提取技能</button></div>${profile.skills.length?`<div class="tags skill-cloud">${profile.skills.map((x,i)=>`<span class="tag">${escapeHtml(x)} <button class="tag-x" onclick="deleteSkill(${i})">×</button></span>`).join("")}</div>`:emptyBlock("还没有专业技能","上传简历后点击“AI提取技能”。")}</section>
  </div>`;
}
function emptyBlock(title,sub){return `<div class="empty"><strong>${escapeHtml(title)}</strong>${escapeHtml(sub)}</div>`;}
function experienceCard(x,i){
  return `<article class="experience-item"><div class="experience-top"><div><h3>${escapeHtml(x.position||"未填写岗位")}</h3><div class="meta">${escapeHtml(x.company||"未填写公司")} · ${escapeHtml(dateRange(x.start,x.end,x.current))}</div></div><div class="actions" style="margin:0"><button class="btn" onclick="openExperienceModal(${i})">编辑</button><button class="btn danger" onclick="deleteExperience(${i})">删除</button></div></div>${x.workContent?`<div class="content-preview">${escapeHtml(x.workContent)}</div>`:`<p class="small-note">还没有工作内容。</p>`}</article>`;
}
function projectCard(x,i){
  return `<article class="experience-item"><div class="experience-top"><div><h3>${escapeHtml(x.title||"未填写项目")}</h3><div class="meta">${escapeHtml(dateRange(x.start,x.end,false))}</div></div><div class="actions" style="margin:0"><button class="btn" onclick="openProjectModal(${i})">编辑</button><button class="btn danger" onclick="deleteProject(${i})">删除</button></div></div>${x.description?`<div class="content-preview">${escapeHtml(x.description)}</div>`:`<p class="small-note">还没有项目描述。</p>`}</article>`;
}
function simpleList(items,type){
  if(!items.length)return emptyBlock("还没有内容","添加后会显示在这里。 ");
  return `<div class="quick-list">${items.map((x,i)=>`<div class="quick-item"><strong>${escapeHtml(typeof x==="string"?x:(x.title||"未命名"))}</strong><button class="icon-btn" onclick="deleteSimple('${type}',${i})">×</button></div>`).join("")}</div>`;
}
function settingsPage(){
  const configs=loadAIConfigs(), current=getCurrentAI();
  return `<div class="page-title"><p class="eyebrow">设置</p><h1 style="font-size:42px">AI 和数据设置</h1><p class="lead">你自己选择 AI、提供自己的 API。CareerFit 默认只在本机保存职业资料和 AI 配置。</p></div>
  <section class="card"><div class="section-head"><div><h2>我的 AI</h2><div class="sub">可同时配置多个 API，额度用完后手动切换，不会偷偷把数据发送给另一个 AI。</div></div><button class="btn primary" onclick="openAIConfigModal()">＋添加 AI</button></div>
  <div class="ai-list">${configs.length?configs.map(aiConfigCard).join(""):emptyBlock("还没有配置 AI","添加一个你自己拥有 API Key 的 AI 服务即可开始。")}</div></section>
  <div class="two-col" style="margin-top:18px">
    <section class="card"><h2>导出职业整理库</h2><p class="small-note">导出工作经历、项目、证书、技能和已读取的简历原文。API Key 不会进入职业资料导出。</p><button class="btn primary" onclick="exportProfile()">导出 JSON</button></section>
    <section class="card"><h2>导入职业整理库</h2><p class="small-note">恢复以前导出的 CareerFit JSON。</p><input id="import-file" class="file-input" type="file" accept=".json,application/json" onchange="importProfile(this.files[0])"></section>
    <section class="card"><h2>数据隐私</h2><p class="small-note">简历和职业资料默认保存在你的浏览器本地。只有你主动使用 AI 功能时，相关内容才会发送到你选择的第三方 API。CareerFit 本身不建立用户职业资料数据库。</p></section>
    <section class="card"><h2>当前 AI</h2><p class="small-note">${current?`当前使用：<strong>${escapeHtml(current.name)}</strong><br>${escapeHtml(current.model)}`:'尚未选择 AI'}</p></section>
  </div>`;
}

function openModal(title,body){
  document.getElementById("modal-root").innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-head"><div><p class="eyebrow">CareerFit</p><h2>${escapeHtml(title)}</h2></div><button class="icon-btn" onclick="closeModal()">×</button></div>${body}</div></div>`;
}
function closeModal(){document.getElementById("modal-root").innerHTML="";}

function openExperienceModal(index=null){
  const x=index===null?{company:"",position:"",start:"",end:"",current:false,rawWorkContent:"",workContent:""}:profile.experiences[index];
  const hasSources=profile.sourceDocuments.length>0;
  openModal(index===null?"添加工作经历":"编辑工作经历",`<form id="experience-form" onsubmit="saveExperience(event,${index===null?"null":index})" class="form-grid">
    <div class="field"><label>公司 *</label><input id="exp-company" name="company" value="${escapeHtml(x.company)}" required></div>
    <div class="field"><label>岗位 *</label><input id="exp-position" name="position" value="${escapeHtml(x.position)}" required></div>
    <div class="field"><label>开始时间</label><input id="exp-start" name="start" type="month" value="${escapeHtml(x.start)}"></div>
    <div class="field"><label>结束时间</label><input id="exp-end" name="end" type="month" value="${escapeHtml(x.end)}"></div>
    <div class="field full"><label><input name="current" type="checkbox" ${x.current?"checked":""} style="width:auto;margin-right:7px"> 目前仍在职</label></div>
    <div class="field full"><label>工作内容</label><textarea id="exp-content" name="workContent" style="min-height:210px" placeholder="可以自己输入、复制，也可以从已有简历中提取。">${escapeHtml(x.workContent||x.rawWorkContent||"")}</textarea><div class="hint">你不用自己拆分职责、成果、技能等，先把原始内容给 AI 即可。</div></div>
    <div class="actions field full"><button type="button" class="btn" ${hasSources?"":"disabled"} onclick="insertExperienceFromResume()">📄 从已有简历提取</button><button type="button" class="btn" onclick="polishExperienceContent()">✨ AI分析并润色</button></div>
    <div id="experience-ai-status" class="hint field full"></div>
    <div class="actions field full"><button type="button" class="btn" onclick="closeModal()">取消</button><button class="btn primary" type="submit">保存工作经历</button></div>
  </form>`);
}
function saveExperience(e,index){
  e.preventDefault(); const f=new FormData(e.target);
  const existing=index===null?null:profile.experiences[index];
  const x={
    company:String(f.get("company")||"").trim(),position:String(f.get("position")||"").trim(),start:String(f.get("start")||""),end:String(f.get("end")||""),current:f.get("current")==="on",
    rawWorkContent:existing?.rawWorkContent||String(f.get("workContent")||""),workContent:String(f.get("workContent")||"").trim(),sourceDocumentId:existing?.sourceDocumentId||""
  };
  if(!x.rawWorkContent)x.rawWorkContent=x.workContent;
  if(index===null)profile.experiences.push(x);else profile.experiences[index]=x;
  saveProfile();closeModal();toast(index===null?"工作经历已添加":"工作经历已保存");
}
function deleteExperience(i){if(confirm("确定删除这段工作经历吗？")){profile.experiences.splice(i,1);saveProfile();toast("已删除");}}

function openProjectModal(index=null){
  const x=index===null?{title:"",start:"",end:"",rawDescription:"",description:""}:profile.projects[index];
  openModal(index===null?"添加项目经历":"编辑项目经历",`<form onsubmit="saveProject(event,${index===null?"null":index})" class="form-grid">
    <div class="field full"><label>项目名称 *</label><input id="project-title" name="title" value="${escapeHtml(x.title)}" required></div>
    <div class="field"><label>开始时间</label><input name="start" type="month" value="${escapeHtml(x.start)}"></div>
    <div class="field"><label>结束时间</label><input name="end" type="month" value="${escapeHtml(x.end)}"></div>
    <div class="field full"><label>项目描述</label><textarea id="project-content" name="description" style="min-height:200px" placeholder="可以自己输入、复制，也可以从已有简历中提取。">${escapeHtml(x.description||x.rawDescription||"")}</textarea></div>
    <div class="actions field full"><button type="button" class="btn" ${profile.sourceDocuments.length?"":"disabled"} onclick="insertProjectFromResume()">📄 从已有简历提取</button><button type="button" class="btn" onclick="polishProjectContent()">✨ AI分析并润色</button></div>
    <div id="project-ai-status" class="hint field full"></div>
    <div class="actions field full"><button type="button" class="btn" onclick="closeModal()">取消</button><button class="btn primary" type="submit">保存项目</button></div>
  </form>`);
}
function saveProject(e,index){
  e.preventDefault(); const f=new FormData(e.target); const existing=index===null?null:profile.projects[index];
  const x={title:String(f.get("title")||"").trim(),start:String(f.get("start")||""),end:String(f.get("end")||""),rawDescription:existing?.rawDescription||String(f.get("description")||""),description:String(f.get("description")||"").trim(),sourceDocumentId:existing?.sourceDocumentId||""};
  if(!x.rawDescription)x.rawDescription=x.description;
  if(index===null)profile.projects.push(x);else profile.projects[index]=x;
  saveProfile();closeModal();toast(index===null?"项目已添加":"项目已保存");
}
function deleteProject(i){if(confirm("确定删除这个项目吗？")){profile.projects.splice(i,1);saveProfile();toast("已删除");}}

function openCertificateModal(){
  openModal("添加证书",`<form onsubmit="saveCertificate(event)" class="form-grid"><div class="field full"><label>证书名称 *</label><input name="title" placeholder="例如：CET-6" required></div><div class="actions field full"><button type="button" class="btn" onclick="closeModal()">取消</button><button class="btn primary" type="submit">保存</button></div></form>`);
}
function saveCertificate(e){e.preventDefault();const f=new FormData(e.target);const title=String(f.get("title")||"").trim();if(title)profile.certificates.push(title);saveProfile();closeModal();toast("证书已添加");}
function deleteSimple(type,i){if(!confirm("确定删除吗？"))return;if(type==="certificate")profile.certificates.splice(i,1);saveProfile();toast("已删除");}
function deleteSkill(i){profile.skills.splice(i,1);saveProfile();toast("技能已删除");}

function openResumeImportModal(){
  openModal("上传已有简历",`<div class="import-modal-copy"><p class="small-note">一次选择一份或多份 PDF / DOCX。CareerFit 会先在浏览器中提取文字。成功读取后，你可以在工作经历或项目里按公司、岗位、时间定位内容。</p><div class="field"><label>选择简历</label><input id="resume-files" class="file-input" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple></div><div id="resume-import-status" class="hint" style="margin-top:10px"></div><div id="resume-import-results" style="margin-top:12px"></div><div class="actions"><button class="btn" onclick="closeModal()">关闭</button><button class="btn primary" onclick="extractResumeFilesOnly()">读取简历</button></div></div>`);
}
async function extractResumeFilesOnly(){
  const input=document.getElementById("resume-files"),status=document.getElementById("resume-import-status"),results=document.getElementById("resume-import-results");
  if(!input?.files?.length){status.textContent="请先选择 PDF 或 DOCX。";return;}
  results.innerHTML=""; status.textContent=`正在读取 ${input.files.length} 份简历…`;
  let ok=0;
  for(const file of [...input.files]){
    try{
      const text=await extractResumeText(file);
      if(!text.trim())throw new Error("没有提取到文字，可能是图片扫描版 PDF。");
      const doc={id:crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`,name:file.name,type:file.type||"",size:file.size,text,wordCount:countWords(text),createdAt:new Date().toISOString()};
      const same=profile.sourceDocuments.findIndex(d=>d.name===doc.name&&d.size===doc.size);
      if(same>=0)profile.sourceDocuments[same]=doc;else profile.sourceDocuments.push(doc);
      ok++;
      results.insertAdjacentHTML("beforeend",`<div class="callout success-callout">✓ ${escapeHtml(file.name)} · 已读取 ${doc.wordCount} 字</div>`);
    }catch(err){results.insertAdjacentHTML("beforeend",`<div class="callout error-callout">✕ ${escapeHtml(file.name)} · ${escapeHtml(err.message||"读取失败")}</div>`);}
  }
  saveProfile(); status.textContent=ok?`成功读取 ${ok} 份。原始文字已保存在本机。`:"没有成功读取的文件。";
}
async function extractResumeText(file){
  const lower=file.name.toLowerCase();
  if(lower.endsWith(".docx")){
    await ensureMammoth();
    const result=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
    return result.value||"";
  }
  if(lower.endsWith(".pdf")){
    await ensurePdfJs();
    const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer()),disableWorker:true}).promise;
    let out="";
    for(let i=1;i<=pdf.numPages;i++){
      const page=await pdf.getPage(i); const content=await page.getTextContent();
      out+=content.items.map(item=>item.str||"").join(" ")+"\n";
    }
    return out;
  }
  throw new Error("暂不支持这种文件格式。");
}
async function ensurePdfJs(){
  if(window.pdfjsLib)return;
  const urls=["https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js","https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"];
  let last;
  for(const url of urls){try{await loadScript(url);if(window.pdfjsLib)return;}catch(e){last=e;}}
  throw new Error("PDF 阅读组件加载失败，请检查网络后重试。");
}
async function ensureMammoth(){
  if(window.mammoth)return;
  const urls=["https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js","https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js"];
  let last;
  for(const url of urls){try{await loadScript(url);if(window.mammoth)return;}catch(e){last=e;}}
  throw new Error("DOCX 阅读组件加载失败，请检查网络后重试。");
}
function loadScript(src){return new Promise((resolve,reject)=>{
  if([...document.scripts].some(s=>s.src===src&&s.dataset.loaded)){resolve();return;}
  const s=document.createElement("script");s.src=src;s.onload=()=>{s.dataset.loaded="true";resolve();};s.onerror=()=>reject(new Error(`加载失败：${src}`));document.head.appendChild(s);
});}
function deleteSourceDocument(i){if(confirm("删除这份已上传的简历原文吗？")){profile.sourceDocuments.splice(i,1);saveProfile();toast("已删除");}}

async function insertExperienceFromResume(){
  const company=document.getElementById("exp-company")?.value.trim(),position=document.getElementById("exp-position")?.value.trim(),start=document.getElementById("exp-start")?.value,end=document.getElementById("exp-end")?.value;
  const status=document.getElementById("experience-ai-status");
  if(!company||!position){status.textContent="请先填写公司和岗位。";return;}
  const key=getApiKey();if(!key){status.textContent="请先在“设置”里填写 Gemini API Key。";return;}
  const doc=await chooseSourceDocument("选择用于提取这段工作经历的简历"); if(!doc)return;
  status.textContent="正在根据公司、岗位和时间定位简历内容…";
  try{
    const result=await callGeminiJSON(`你是中文简历整理助手。请只从给定简历原文中找到与“公司、岗位、时间”最匹配的工作经历内容。不要编造，不要把其他公司的内容混进来。然后将找到的内容整理成一段适合放入职业整理库的中文“工作内容”。保留原文中的真实数字和事实，不得新增数字。输出 JSON：{"raw_found":"原文中定位到的相关内容","polished":"润色后的工作内容"}。如果找不到匹配内容，raw_found 和 polished 都返回空字符串。\n\n公司：${company}\n岗位：${position}\n开始：${start||"未填写"}\n结束：${end||"未填写"}\n\n简历原文：\n${doc.text}`);
    if(!result.polished){status.textContent="这份简历里没有找到足够明确的对应内容，请换一份简历或自己粘贴。";return;}
    document.getElementById("exp-content").value=result.polished;
    document.getElementById("exp-content").dataset.raw=result.raw_found||result.polished;
    status.textContent=`已从“${doc.name}”定位并润色。你可以继续修改后保存。`;
  }catch(err){status.textContent=`AI处理失败：${err.message}`;}
}
async function polishExperienceContent(){
  const company=document.getElementById("exp-company")?.value.trim(),position=document.getElementById("exp-position")?.value.trim(),content=document.getElementById("exp-content")?.value.trim(),status=document.getElementById("experience-ai-status");
  if(!content){status.textContent="请先输入或从简历提取工作内容。";return;}
  const key=getApiKey();if(!key){status.textContent="请先在“设置”里填写 Gemini API Key。";return;}
  status.textContent="AI 正在分析并润色…";
  try{
    const result=await callGeminiJSON(`你是中文简历内容润色助手。请润色下面的工作内容，使其更专业、清晰、有成果导向，但绝不编造任何事实、数字、客户、技能或职责。不得改变原文数字。不要增加原文没有的信息。根据公司和岗位语境组织表达。输出 JSON：{"polished":"润色后的中文工作内容"}。\n公司：${company}\n岗位：${position}\n原始工作内容：\n${content}`);
    if(result.polished)document.getElementById("exp-content").value=result.polished;
    status.textContent="AI 润色完成，请确认内容真实后再保存。";
  }catch(err){status.textContent=`AI处理失败：${err.message}`;}
}

async function insertProjectFromResume(){
  const title=document.getElementById("project-title")?.value.trim(),start=document.querySelector('#project-content')?document.querySelector('#project-content').closest('form').querySelector('[name="start"]').value:"",end=document.querySelector('#project-content')?document.querySelector('#project-content').closest('form').querySelector('[name="end"]').value:"",status=document.getElementById("project-ai-status");
  if(!title){status.textContent="请先填写项目名称。";return;}
  const key=getApiKey();if(!key){status.textContent="请先在“设置”里填写 Gemini API Key。";return;}
  const doc=await chooseSourceDocument("选择用于提取这个项目的简历");if(!doc)return;
  status.textContent="正在定位项目内容…";
  try{
    const result=await callGeminiJSON(`你是中文简历整理助手。请只从给定简历中找到与项目名称和时间最匹配的项目内容。不要编造。不要混入其他项目或工作经历。然后整理成适合职业整理库的中文项目描述。输出 JSON：{"raw_found":"原文相关内容","polished":"润色后的项目描述"}。找不到就返回空字符串。\n项目名称：${title}\n开始：${start||"未填写"}\n结束：${end||"未填写"}\n简历原文：\n${doc.text}`);
    if(!result.polished){status.textContent="没有找到足够明确的项目内容，请换一份简历或自己输入。";return;}
    document.getElementById("project-content").value=result.polished;status.textContent=`已从“${doc.name}”定位并润色。`;
  }catch(err){status.textContent=`AI处理失败：${err.message}`;}
}
async function polishProjectContent(){
  const title=document.getElementById("project-title")?.value.trim(),content=document.getElementById("project-content")?.value.trim(),status=document.getElementById("project-ai-status");
  if(!content){status.textContent="请先输入或从简历提取项目描述。";return;}
  const key=getApiKey();if(!key){status.textContent="请先在“设置”里填写 Gemini API Key。";return;}
  status.textContent="AI 正在分析并润色…";
  try{
    const result=await callGeminiJSON(`你是中文简历项目描述润色助手。请让项目描述更专业、清晰、有成果导向，但绝不编造事实或数字，不新增原文没有的信息。输出 JSON：{"polished":"润色后的中文项目描述"}。\n项目名称：${title}\n原始描述：\n${content}`);
    if(result.polished)document.getElementById("project-content").value=result.polished;status.textContent="AI 润色完成，请确认后保存。";
  }catch(err){status.textContent=`AI处理失败：${err.message}`;}
}

async function extractSkillsFromAllResumes(){
  if(!profile.sourceDocuments.length){toast("请先上传至少一份简历");return;}
  const key=getApiKey();if(!key){toast("请先在“设置”里填写 Gemini API Key");return;}
  toast("正在从所有简历提取技能…");
  try{
    const source=profile.sourceDocuments.map(d=>`===== ${d.name} =====\n${d.text}`).join("\n\n");
    const result=await callGeminiJSON(`你是职业技能提取助手。只从用户提供的简历原文中提取明确出现或明确体现的专业技能、工具、平台、软件、方法。不要推断用户没有证据的技能。去重后返回 JSON：{"skills":["技能1","技能2"]}。\n\n${source}`);
    profile.skills=uniqueStrings([...(profile.skills||[]),...(Array.isArray(result.skills)?result.skills:[])]);saveProfile();toast(`已提取 ${profile.skills.length} 项技能`);
  }catch(err){toast(`技能提取失败：${err.message}`);}
}
function chooseSourceDocument(title){
  return new Promise(resolve=>{
    if(!profile.sourceDocuments.length){resolve(null);return;}
    const options=profile.sourceDocuments.map((d,i)=>`<button type="button" class="source-choice" onclick="window.__chooseSource(${i})"><strong>${escapeHtml(d.name)}</strong><span>${d.wordCount||0} 字</span></button>`).join("");
    openModal(title,`<div class="source-choice-list">${options}</div><div class="actions"><button class="btn" onclick="window.__chooseSource(null)">取消</button></div>`);
    window.__chooseSource=(i)=>{const d=i===null?null:profile.sourceDocuments[i];closeModal();resolve(d);delete window.__chooseSource;};
  });
}

function loadAIConfigs(){
  try{return JSON.parse(localStorage.getItem(AI_CONFIGS_KEY)||"[]")}catch{return []}
}
function saveAIConfigs(items){localStorage.setItem(AI_CONFIGS_KEY,JSON.stringify(items));}
function getCurrentAI(){const id=localStorage.getItem(CURRENT_AI_KEY)||"";return loadAIConfigs().find(x=>x.id===id)||loadAIConfigs()[0]||null;}
function getApiKey(){return getCurrentAI()?.apiKey||profile.ai?.apiKey||localStorage.getItem(AI_KEY)||"";}
function aiConfigCard(c){const current=getCurrentAI()?.id===c.id;return `<article class="ai-card"><div><h3>${escapeHtml(c.name||"未命名 AI")}</h3><div class="meta">${escapeHtml(c.model||"未填写模型")} · ${escapeHtml(c.apiType||"OpenAI Compatible")}</div><div class="small-note">${current?"🟢 当前使用":"⚪ 可切换"}</div></div><div class="actions compact"><button class="btn" onclick="testAIConfig('${c.id}')">测试</button>${current?'':`<button class="btn" onclick="setCurrentAI('${c.id}')">设为当前</button>`}<button class="btn" onclick="openAIConfigModal('${c.id}')">编辑</button><button class="btn danger" onclick="deleteAIConfig('${c.id}')">删除</button></div></article>`}
function openAIConfigModal(id=null){
  const old=id?loadAIConfigs().find(x=>x.id===id):null;
  const c=old||{id:crypto.randomUUID(),name:"",apiType:"OpenAI Compatible",baseUrl:"",apiKey:"",model:""};
  openModal(id?"编辑 AI 配置":"添加 AI 配置",`<form class="form-grid" onsubmit="saveAIConfig(event,'${c.id}',${id?'true':'false'})">
    <div class="field full"><label>配置名称 *</label><input id="ai-name" value="${escapeHtml(c.name)}" placeholder="例如：智谱-主账号" required></div>
    <div class="field"><label>API 类型</label><select id="ai-type"><option ${c.apiType==='OpenAI Compatible'?'selected':''}>OpenAI Compatible</option><option ${c.apiType==='Gemini'?'selected':''}>Gemini</option><option ${c.apiType==='Anthropic'?'selected':''}>Anthropic</option><option ${c.apiType==='自定义'?'selected':''}>自定义</option></select></div>
    <div class="field"><label>API 格式</label><select id="ai-format"><option selected>OpenAI Compatible</option><option>Gemini</option><option>Anthropic</option></select></div>
    <div class="field full"><label>API Base URL *</label><input id="ai-base" value="${escapeHtml(c.baseUrl)}" placeholder="例如：https://open.bigmodel.cn/api/paas/v4" required></div>
    <div class="field full"><label>API Key *</label><input id="ai-key" type="password" value="${escapeHtml(c.apiKey)}" placeholder="只保存在当前浏览器" required></div>
    <div class="field full"><label>Model *</label><input id="ai-model" value="${escapeHtml(c.model)}" placeholder="例如：glm-4.5-flash" required></div>
    <div class="hint field full">API Key 不会进入职业整理库的普通 JSON 导出。请不要把 Key 发到聊天或截图里。</div>
    <div class="actions field full"><button type="button" class="btn" onclick="testAIConfigFromForm()">测试连接</button><button type="submit" class="btn primary">保存</button></div>
  </form>`);
  window.__aiEditingId=c.id;
}
function getAIConfigFromForm(){return {id:window.__aiEditingId,name:document.getElementById('ai-name')?.value.trim()||'',apiType:document.getElementById('ai-type')?.value||'OpenAI Compatible',apiFormat:document.getElementById('ai-format')?.value||'OpenAI Compatible',baseUrl:document.getElementById('ai-base')?.value.trim()||'',apiKey:document.getElementById('ai-key')?.value.trim()||'',model:document.getElementById('ai-model')?.value.trim()||''};}
async function testAIConfigFromForm(){try{const c=getAIConfigFromForm();await callAI(c,'只回复：连接成功');toast('✓ 连接成功');}catch(e){toast('✕ 连接失败：'+e.message);}}
function saveAIConfig(event,id,isEdit){event.preventDefault();const c=getAIConfigFromForm();if(!c.name||!c.baseUrl||!c.apiKey||!c.model)return toast('请完整填写 AI 配置');let arr=loadAIConfigs();const i=arr.findIndex(x=>x.id===id);if(i>=0)arr[i]=c;else arr.push(c);saveAIConfigs(arr);if(!localStorage.getItem(CURRENT_AI_KEY))localStorage.setItem(CURRENT_AI_KEY,c.id);closeModal();render();toast('AI 配置已保存');}
function setCurrentAI(id){if(loadAIConfigs().some(x=>x.id===id)){localStorage.setItem(CURRENT_AI_KEY,id);toast('已切换当前 AI');render();}}
function deleteAIConfig(id){const arr=loadAIConfigs(),c=arr.find(x=>x.id===id);if(!c)return;if(!confirm(`确定删除“${c.name}”吗？只删除 AI 配置，不会删除职业资料。`))return;const next=arr.filter(x=>x.id!==id);saveAIConfigs(next);if(localStorage.getItem(CURRENT_AI_KEY)===id)localStorage.setItem(CURRENT_AI_KEY,next[0]?.id||'');render();}
async function testAIConfig(id){const c=loadAIConfigs().find(x=>x.id===id);if(!c)return;try{const a=await callAI(c,'只回复：连接成功');toast('✓ '+(a||'连接成功'));}catch(e){toast('✕ 连接失败：'+e.message);}}
async function callAI(config,prompt){
  if(!config?.apiKey||!config?.baseUrl||!config?.model)throw new Error('当前 AI 配置不完整');
  const type=config.apiFormat||config.apiType||'OpenAI Compatible';
  if(type==='Gemini'){
    const base=config.baseUrl.replace(/\/+$/,'');const url=/generateContent$/.test(base)?base:`${base}/models/${config.model}:generateContent`;
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':config.apiKey},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
    const t=await r.text();if(!r.ok)throw new Error(t.slice(0,300));const d=JSON.parse(t);return d?.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||'';
  }
  const base=config.baseUrl.replace(/\/+$/,'');const url=/chat\/completions$/.test(base)?base:`${base}/chat/completions`;
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+config.apiKey},body:JSON.stringify({model:config.model,messages:[{role:'user',content:prompt}],temperature:.2})});
  const t=await r.text();if(!r.ok)throw new Error(`API ${r.status}: ${t.slice(0,300)}`);const d=JSON.parse(t);return d?.choices?.[0]?.message?.content||d?.output_text||'';
}
async function callAIJSON(prompt){const raw=await callAI(getCurrentAI(),prompt);try{return JSON.parse(raw)}catch{const cleaned=raw.replace(/^```json\s*/i,'').replace(/```$/i,'').trim();return JSON.parse(cleaned);}}
async function callGeminiJSON(prompt){return callAIJSON(prompt)}
function saveAiSettings(){toast('V5 已改为多 AI 配置，请使用“＋添加 AI”');}
async function testAiConnection(){const c=getCurrentAI();if(!c)return toast('请先添加 AI 配置');try{await callAI(c,'只回复：连接成功');toast('✓ 当前 AI 连接成功')}catch(e){toast('✕ 连接失败：'+e.message);}}


function jdPage(){const saved=(()=>{try{return JSON.parse(localStorage.getItem(JD_KEY)||'null')}catch{return null}})();return `<div class="page-title"><p class="eyebrow">JD 分析</p><h1 style="font-size:42px">把招聘 JD 复制过来。</h1><p class="lead">先分析岗位要求，再与你的职业整理库匹配。AI 不会为你虚构不存在的经历。</p></div><section class="card"><div class="form-grid"><div class="field full"><label>岗位名称（可选）</label><input id="jd-title" value="${escapeHtml(saved?.title||'')}" placeholder="例如：外贸业务员"></div><div class="field full"><label>招聘 JD *</label><textarea id="jd-text" rows="16" placeholder="把招聘网站上的完整 JD 复制到这里">${escapeHtml(saved?.jd||'')}</textarea></div></div><div class="actions"><button class="btn primary" onclick="analyzeJD()">AI 分析 JD</button></div></section>${saved?.analysis?jdResult(saved.analysis):''}`}
function jdResult(a){return `<section class="card" style="margin-top:18px"><div class="section-head"><div><h2>${escapeHtml(a.jobTitle||'岗位分析结果')}</h2><div class="sub">匹配度仅用于自我优化，不代表 ATS 通过率或录用概率。</div></div><strong class="score">${Number(a.matchScore||0)}/100</strong></div><div class="two-col"><div><h3>核心职责</h3><ul>${(a.coreResponsibilities||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul><h3>必备条件</h3><ul>${(a.mustHave||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></div><div><h3>加分项</h3><ul>${(a.niceToHave||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul><h3>关键词</h3><p>${(a.keywords||[]).map(escapeHtml).join(' · ')}</p></div></div><div class="match-box"><h3>已匹配</h3><ul>${(a.matchedFacts||[]).map(x=>`<li>🟢 ${escapeHtml(x)}</li>`).join('')}</ul><h3>当前缺失</h3><ul>${(a.missingRequirements||[]).map(x=>`<li>🔴 ${escapeHtml(x)}</li>`).join('')}</ul></div><div class="actions"><button class="btn primary" onclick="generateResumeVersions()">生成 3 版简历</button></div></section>`}
async function analyzeJD(){const title=document.getElementById('jd-title')?.value.trim()||'',jd=document.getElementById('jd-text')?.value.trim()||'';if(!jd)return toast('请先粘贴招聘 JD');if(!getCurrentAI())return toast('请先在设置里配置一个 AI');const prompt=`你是中文简历分析助手。严格禁止编造事实。分析招聘 JD，并结合职业整理库。缺失技能不得声称拥有。返回严格 JSON：{"jobTitle":"","company":"","coreResponsibilities":[],"mustHave":[],"niceToHave":[],"skills":[],"keywords":[],"matchedFacts":[],"missingRequirements":[],"matchScore":0}。匹配度只用于自我优化。\nJD：${jd}\n职业整理库：${JSON.stringify(profile)}`;try{const analysis=await callAIJSON(prompt);localStorage.setItem(JD_KEY,JSON.stringify({title,jd,analysis,createdAt:new Date().toISOString()}));render();toast('JD 分析完成')}catch(e){toast('JD 分析失败：'+e.message)}}
function resumesPage(){let h=[];try{h=JSON.parse(localStorage.getItem(RESUME_HISTORY_KEY)||'[]')}catch{}return `<div class="page-title"><p class="eyebrow">简历</p><h1 style="font-size:42px">生成、修改、保留历史版本。</h1><p class="lead">每次生成都会保存一个独立快照，后续修改职业整理库不会覆盖历史结果。</p></div><section class="card"><h2>最近生成</h2>${h.length?h.map((x,i)=>`<article class="resume-history"><div class="section-head"><div><strong>${escapeHtml(x.jobTitle||x.title||'未命名岗位')}</strong><div class="meta">${escapeHtml(new Date(x.generatedAt).toLocaleString('zh-CN'))}</div></div></div><div class="resume-tabs"><details open><summary>保守版</summary><textarea rows="12">${escapeHtml(x.versions?.conservative||'')}</textarea></details><details><summary>针对性版</summary><textarea rows="12">${escapeHtml(x.versions?.targeted||'')}</textarea></details><details><summary>关键词强化版</summary><textarea rows="12">${escapeHtml(x.versions?.keywordFocused||'')}</textarea></details></div></article>`).join(''):emptyBlock('还没有生成简历','先进入 JD 分析，分析一个岗位后生成 3 个版本。')}</section>`}
async function generateResumeVersions(){let saved;try{saved=JSON.parse(localStorage.getItem(JD_KEY)||'null')}catch{}if(!saved?.jd)return toast('请先分析 JD');if(!getCurrentAI())return toast('请先配置当前 AI');const prompt=`根据职业整理库和招聘JD生成严格真实的三个简历版本：保守版、针对性版、关键词强化版。禁止编造或改变任何公司、职位、日期、客户、技能、工具、数字、职责和成果。缺失要求不得声称拥有。只可重组、压缩和润色已有事实。返回严格 JSON：{"conservative":"","targeted":"","keywordFocused":"","whyChanged":[]}。职业整理库：${JSON.stringify(profile)}\nJD：${saved.jd}\nJD分析：${JSON.stringify(saved.analysis)}`;try{const versions=await callAIJSON(prompt);let h=[];try{h=JSON.parse(localStorage.getItem(RESUME_HISTORY_KEY)||'[]')}catch{};h.unshift({id:crypto.randomUUID(),title:saved.title,jobTitle:saved.analysis?.jobTitle||saved.title,jd:saved.jd,generatedAt:new Date().toISOString(),versions});localStorage.setItem(RESUME_HISTORY_KEY,JSON.stringify(h));setPage('resumes');toast('3 版简历生成完成')}catch(e){toast('简历生成失败：'+e.message)}}

function exportProfile(){
  const backup=structuredClone(profile);if(backup.ai)backup.ai.apiKey="";
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`careerfit-profile-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);toast("职业整理库已导出");
}
function importProfile(file){
  if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!data||!Array.isArray(data.experiences)||!Array.isArray(data.projects))throw new Error();profile={...blankProfile,...data,ai:{...blankProfile.ai,...(data.ai||{})}};saveProfile();toast("职业整理库已导入");}catch{alert("这不是有效的 CareerFit 职业整理库 JSON。")}};reader.readAsText(file);
}

// Global navigation handler.
document.addEventListener("click",event=>{const button=event.target.closest("[data-page]");if(!button)return;setPage(button.dataset.page);});
render();
