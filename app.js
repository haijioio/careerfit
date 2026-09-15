const STORAGE_KEY = "careerfit_profile_v2";
const PAGE_KEY = "careerfit_page_v2";
const AI_KEY = "careerfit_gemini_api_key_v2";
const GEMINI_MODEL = "gemini-3.8-flash";
const AI_CONFIGS_KEY = "careerfit_ai_configs_v5";
const CURRENT_AI_KEY = "careerfit_current_ai_v5";
const JD_KEY = "careerfit_jd_v5";
const RESUME_HISTORY_KEY = "careerfit_resume_history_v5";
const AI_STATUS_KEY = "careerfit_ai_status_v51";
const REBUILD_PLAN_VERSION = "v5.3";

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
        <div class="quick-item"><strong>④ 专业技能</strong><span>自己填写和维护</span></div>
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
    <section class="card"><div class="section-head"><div><h2>专业技能</h2><div class="sub">和证书一样，由你自己填写、编辑和删除。</div></div><button class="btn" onclick="openSkillModal()">＋添加技能</button></div>${profile.skills.length?`<div class="tags skill-cloud">${profile.skills.map((x,i)=>`<span class="tag">${escapeHtml(x)} <button class="tag-x" onclick="deleteSkill(${i})">×</button></span>`).join("")}</div>`:emptyBlock("还没有专业技能","点击“添加技能”手动维护你的专业技能。")}</section>
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
    <div class="actions field full"><button id="exp-polish-btn" type="button" class="btn" onclick="polishExperienceContent()">✨ AI分析并润色</button><button id="exp-source-btn" type="button" class="btn" ${hasSources?"":"disabled"} onclick="insertExperienceFromResume()">📄 从已有简历提取</button></div>
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
    <div class="actions field full"><button id="project-polish-btn" type="button" class="btn" onclick="polishProjectContent()">✨ AI分析并润色</button><button id="project-source-btn" type="button" class="btn" ${profile.sourceDocuments.length?"":"disabled"} onclick="insertProjectFromResume()">📄 从已有简历提取</button></div>
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

function setActionBusy(buttonId, busy, text){
  const b=document.getElementById(buttonId); if(!b)return;
  if(busy){ if(!b.dataset.originalText)b.dataset.originalText=b.textContent; b.disabled=true; b.classList.add("is-loading"); b.textContent=text; }
  else { b.disabled=false; b.classList.remove("is-loading"); if(b.dataset.originalText)b.textContent=b.dataset.originalText; }
}
function setStatus(id,text,type="info"){const el=document.getElementById(id);if(!el)return;el.textContent=text;el.className=`hint field full ai-status ${type}`;}
async function insertExperienceFromResume(){
  const company=document.getElementById("exp-company")?.value.trim(),position=document.getElementById("exp-position")?.value.trim(),start=document.getElementById("exp-start")?.value,end=document.getElementById("exp-end")?.value;
  const status=document.getElementById("experience-ai-status");
  if(!company||!position){setStatus("experience-ai-status","请先填写公司和岗位。","error");return;}
  if(!getCurrentAI()){setStatus("experience-ai-status","请先在“设置”里配置一个 AI。","error");return;}
  const doc=await chooseSourceDocument("选择用于提取这段工作经历的简历"); if(!doc)return;
  setActionBusy("exp-source-btn",true,"⏳ 正在读取简历…"); setActionBusy("exp-polish-btn",true,"⏳ 请稍候…");
  setStatus("experience-ai-status",`⏳ 正在从“${doc.name}”中定位对应工作经历，请稍候，不要重复点击。`);
  try{
    const result=await callAIJSON(`你是中文简历整理助手。请只从给定简历原文中找到与“公司、岗位、时间”最匹配的工作经历内容。不要编造，不要把其他公司的内容混进来。然后将找到的内容整理成一段适合放入职业整理库的中文“工作内容”。保留原文中的真实数字和事实，不得新增数字。输出 JSON：{"raw_found":"原文中定位到的相关内容","polished":"润色后的工作内容"}。如果找不到匹配内容，raw_found 和 polished 都返回空字符串。\n\n公司：${company}\n岗位：${position}\n开始：${start||"未填写"}\n结束：${end||"未填写"}\n\n简历原文：\n${doc.text}`);
    if(!result.polished){setStatus("experience-ai-status","❌ 没有找到足够明确的对应内容，请换一份简历或自己输入。","error");return;}
    document.getElementById("exp-content").value=result.polished;
    document.getElementById("exp-content").dataset.raw=result.raw_found||result.polished;
    setStatus("experience-ai-status",`✓ 已从“${doc.name}”找到并整理相关经历。你可以继续修改后保存。`,`success`);
  }catch(err){setStatus("experience-ai-status",`❌ AI处理失败：${friendlyError(err)}`,"error");}
  finally{setActionBusy("exp-source-btn",false);setActionBusy("exp-polish-btn",false);}
}
async function polishExperienceContent(){
  const company=document.getElementById("exp-company")?.value.trim(),position=document.getElementById("exp-position")?.value.trim(),content=document.getElementById("exp-content")?.value.trim();
  if(!content){setStatus("experience-ai-status","请先输入或从简历提取工作内容。","error");return;}
  if(!getCurrentAI()){setStatus("experience-ai-status","请先在“设置”里配置一个 AI。","error");return;}
  setActionBusy("exp-polish-btn",true,"⏳ AI正在分析并润色…");setActionBusy("exp-source-btn",true,"⏳ 请稍候…");
  setStatus("experience-ai-status","⏳ AI正在分析并润色，请稍候，不要重复点击。请稍等几秒。","info");
  try{
    const result=await callAIJSON(`你是中文简历内容润色助手。请润色下面的工作内容，使其更专业、清晰、有成果导向，但绝不编造任何事实、数字、客户、技能或职责。不得改变原文数字。不要增加原文没有的信息。根据公司和岗位语境组织表达。输出 JSON：{"polished":"润色后的中文工作内容"}。\n公司：${company}\n岗位：${position}\n原始工作内容：\n${content}`);
    if(result.polished)document.getElementById("exp-content").value=result.polished;
    setStatus("experience-ai-status","✓ AI分析并润色完成，请确认内容真实后再保存。","success");
  }catch(err){setStatus("experience-ai-status",`❌ AI处理失败：${friendlyError(err)}`,"error");}
  finally{setActionBusy("exp-polish-btn",false);setActionBusy("exp-source-btn",false);}
}
async function insertProjectFromResume(){
  const title=document.getElementById("project-title")?.value.trim(),form=document.getElementById("project-content")?.closest("form"),start=form?.querySelector('[name="start"]')?.value||"",end=form?.querySelector('[name="end"]')?.value||"",status=document.getElementById("project-ai-status");
  if(!title){setStatus("project-ai-status","请先填写项目名称。","error");return;}
  if(!getCurrentAI()){setStatus("project-ai-status","请先在“设置”里配置一个 AI。","error");return;}
  const doc=await chooseSourceDocument("选择用于提取这个项目的简历");if(!doc)return;
  setActionBusy("project-source-btn",true,"⏳ 正在读取简历…");setActionBusy("project-polish-btn",true,"⏳ 请稍候…");setStatus("project-ai-status",`⏳ 正在从“${doc.name}”中定位项目内容，请稍候，不要重复点击。`);
  try{
    const result=await callAIJSON(`你是中文简历整理助手。请只从给定简历中找到与项目名称和时间最匹配的项目内容。不要编造。不要混入其他项目或工作经历。然后整理成适合职业整理库的中文项目描述。输出 JSON：{"raw_found":"原文相关内容","polished":"润色后的项目描述"}。找不到就返回空字符串。\n项目名称：${title}\n开始：${start||"未填写"}\n结束：${end||"未填写"}\n简历原文：\n${doc.text}`);
    if(!result.polished){setStatus("project-ai-status","❌ 没有找到足够明确的项目内容，请换一份简历或自己输入。","error");return;}
    document.getElementById("project-content").value=result.polished;setStatus("project-ai-status",`✓ 已从“${doc.name}”找到并整理项目内容。`,`success`);
  }catch(err){setStatus("project-ai-status",`❌ AI处理失败：${friendlyError(err)}`,"error");}
  finally{setActionBusy("project-source-btn",false);setActionBusy("project-polish-btn",false);}
}
async function polishProjectContent(){
  const title=document.getElementById("project-title")?.value.trim(),content=document.getElementById("project-content")?.value.trim();
  if(!content){setStatus("project-ai-status","请先输入或从简历提取项目描述。","error");return;}
  if(!getCurrentAI()){setStatus("project-ai-status","请先在“设置”里配置一个 AI。","error");return;}
  setActionBusy("project-polish-btn",true,"⏳ AI正在分析并润色…");setActionBusy("project-source-btn",true,"⏳ 请稍候…");setStatus("project-ai-status","⏳ AI正在分析并润色，请稍候，不要重复点击。请稍等几秒。","info");
  try{const result=await callAIJSON(`你是中文简历项目描述润色助手。请让项目描述更专业、清晰、有成果导向，但绝不编造事实或数字，不新增原文没有的信息。输出 JSON：{"polished":"润色后的中文项目描述"}。\n项目名称：${title}\n原始描述：\n${content}`);if(result.polished)document.getElementById("project-content").value=result.polished;setStatus("project-ai-status","✓ AI分析并润色完成，请确认后保存。","success");}
  catch(err){setStatus("project-ai-status",`❌ AI处理失败：${friendlyError(err)}`,"error");}
  finally{setActionBusy("project-polish-btn",false);setActionBusy("project-source-btn",false);}
}
function openSkillModal(){openModal("添加专业技能",`<form onsubmit="saveSkill(event)" class="form-grid"><div class="field full"><label>专业技能 *</label><input name="skill" placeholder="例如：Excel" required></div><div class="actions field full"><button type="button" class="btn" onclick="closeModal()">取消</button><button class="btn primary" type="submit">保存技能</button></div></form>`);}
function saveSkill(e){e.preventDefault();const f=new FormData(e.target),skill=String(f.get("skill")||"").trim();if(!skill)return;profile.skills=uniqueStrings([...(profile.skills||[]),skill]);saveProfile();closeModal();toast("技能已添加");}
function chooseSourceDocument(title){
  return new Promise(resolve=>{
    if(!profile.sourceDocuments.length){resolve(null);return;}
    const options=profile.sourceDocuments.map((d,i)=>`<button type="button" class="source-choice" onclick="window.__chooseSource(${i})"><strong>${escapeHtml(d.name)}</strong><span>${d.wordCount||0} 字</span></button>`).join("");
    openModal(title,`<div class="source-choice-list">${options}</div><div class="actions"><button class="btn" onclick="window.__chooseSource(null)">取消</button></div>`);
    window.__chooseSource=(i)=>{const d=i===null?null:profile.sourceDocuments[i];closeModal();resolve(d);delete window.__chooseSource;};
  });
}

function loadAIConfigs(){try{const arr=JSON.parse(localStorage.getItem(AI_CONFIGS_KEY)||"[]");return Array.isArray(arr)?arr.map(normalizeAIConfig):[]}catch{return []}}
function saveAIConfigs(items){localStorage.setItem(AI_CONFIGS_KEY,JSON.stringify(items));}
function getCurrentAI(){const id=localStorage.getItem(CURRENT_AI_KEY)||"";return loadAIConfigs().find(x=>x.id===id)||loadAIConfigs()[0]||null;}
function getApiKey(){return getCurrentAI()?.apiKey||profile.ai?.apiKey||localStorage.getItem(AI_KEY)||"";}
function getAIStatuses(){try{return JSON.parse(localStorage.getItem(AI_STATUS_KEY)||"{}")}catch{return {}}}
function saveAIStatuses(x){localStorage.setItem(AI_STATUS_KEY,JSON.stringify(x));}
function friendlyError(err){let m=String(err?.message||err||"未知错误");if(/401|invalid.*key|invalid.*token|unauthor/i.test(m))return "API Key 无效或已过期，请检查设置。";if(/402|quota|balance|credit|limit/i.test(m))return "API 额度可能不足，请检查账户余额或切换其他 AI。";if(/Failed to fetch|NetworkError|网络/i.test(m))return "网络连接异常，请检查网络后重试。";if(/timeout|超时/i.test(m))return "AI 响应超时，请稍后重试。";return m.slice(0,220);}
function inferProvider(c){const name=`${c.name||""} ${c.apiType||""}`.toLowerCase();if(/智谱|zhipu|bigmodel|glm/.test(name))return "智谱";if(/deepseek/.test(name))return "DeepSeek";if(/openai/.test(name))return "OpenAI";if(/gemini|google/.test(name))return "Gemini";if(/anthropic|claude/.test(name))return "Anthropic";return c.provider||"OpenAI Compatible";}
function defaultBaseUrl(provider){return {"智谱":"https://open.bigmodel.cn/api/paas/v4/","DeepSeek":"https://api.deepseek.com/","OpenAI":"https://api.openai.com/v1/","Gemini":"https://generativelanguage.googleapis.com/v1beta","Anthropic":"https://api.anthropic.com/v1"}[provider]||"";}
function normalizeAIConfig(c){const provider=c.provider||inferProvider(c);const base=c.baseUrl||defaultBaseUrl(provider);const type=provider==="Gemini"?"Gemini":provider==="Anthropic"?"Anthropic":"OpenAI Compatible";return {...c,provider,apiType:c.apiType||type,apiFormat:c.apiFormat||type,baseUrl:base};}
function aiConfigCard(c){const current=getCurrentAI()?.id===c.id,statuses=getAIStatuses(),st=statuses[c.id]||"untested",label=st==="success"?"🟢":st==="error"?"🔴":st==="testing"?"🟡":"⚪";return `<article class="ai-card"><div><h3>${escapeHtml(c.name||"未命名 AI")} <span class="status-dot" title="连接状态">${label}</span></h3><div class="meta">${escapeHtml(c.model||"未填写模型")} · ${escapeHtml(c.provider||c.apiType||"OpenAI Compatible")}</div><div class="small-note">${current?'<span class="current-badge">当前使用</span>':'可切换'}</div>${st==="success"?'<div class="status-text success">连接成功</div>':st==="error"?'<div class="status-text error">连接失败</div>':st==="testing"?'<div class="status-text pending">正在测试…</div>':''}</div><div class="actions compact"><button class="btn" ${st==="testing"?'disabled':''} onclick="testAIConfig('${c.id}')">${st==="testing"?'⏳ 测试中…':'测试'}</button>${current?'':`<button class="btn" onclick="setCurrentAI('${c.id}')">设为当前</button>`}<button class="btn" onclick="openAIConfigModal('${c.id}')">编辑</button><button class="btn danger" onclick="deleteAIConfig('${c.id}')">删除</button></div></article>`}
function openAIConfigModal(id=null){
  const old=id?loadAIConfigs().find(x=>x.id===id):null;const c=normalizeAIConfig(old||{id:crypto.randomUUID(),name:"",provider:"智谱",apiType:"OpenAI Compatible",apiFormat:"OpenAI Compatible",baseUrl:"",apiKey:"",model:""});
  openModal(id?"编辑 AI 配置":"添加 AI 配置",`<form class="form-grid" onsubmit="saveAIConfig(event,'${c.id}',${id?'true':'false'})">
    <div class="field full"><label>AI 名称 *</label><input id="ai-name" value="${escapeHtml(c.name)}" placeholder="例如：智谱 GLM" required></div>
    <div class="field full"><label>AI 服务商</label><select id="ai-provider" onchange="syncAIProviderDefaults()"><option ${c.provider==='智谱'?'selected':''}>智谱</option><option ${c.provider==='DeepSeek'?'selected':''}>DeepSeek</option><option ${c.provider==='OpenAI'?'selected':''}>OpenAI</option><option ${c.provider==='Gemini'?'selected':''}>Gemini</option><option ${c.provider==='Anthropic'?'selected':''}>Anthropic</option><option ${c.provider==='OpenAI Compatible'?'selected':''}>OpenAI Compatible</option><option ${c.provider==='自定义'?'selected':''}>自定义</option></select></div>
    <div class="field full"><label>API Key *</label><input id="ai-key" type="password" value="${escapeHtml(c.apiKey)}" placeholder="只保存在当前浏览器" required></div>
    <div class="field full"><label>Model *</label><input id="ai-model" value="${escapeHtml(c.model)}" placeholder="例如：glm-4.5-flash" required></div>
    <div id="ai-advanced" class="field full ${['自定义','OpenAI Compatible'].includes(c.provider)?'':'hidden'}"><label>Base URL${c.provider==='自定义'?' *':''}</label><input id="ai-base" value="${escapeHtml(c.baseUrl)}" placeholder="已知服务商会自动填写"></div>
    <div class="hint field full">已知服务商会自动使用对应接口地址；只有自定义/OpenAI Compatible 才需要你自己填写 Base URL。API Key 只保存在当前浏览器，不会进入职业资料 JSON 导出。</div>
    <div class="actions field full"><button type="button" class="btn" onclick="closeModal()">取消</button><button type="submit" class="btn primary">保存</button></div>
  </form>`);window.__aiEditingId=c.id;
}
function syncAIProviderDefaults(){const p=document.getElementById('ai-provider')?.value,base=document.getElementById('ai-base'),adv=document.getElementById('ai-advanced');if(!base||!adv)return;const known=defaultBaseUrl(p);if(known)base.value=known;adv.classList.toggle('hidden',!['自定义','OpenAI Compatible'].includes(p));base.required=p==='自定义';}
function getAIConfigFromForm(){const provider=document.getElementById('ai-provider')?.value||'智谱';const base=document.getElementById('ai-base')?.value.trim()||defaultBaseUrl(provider);const type=provider==='Gemini'?'Gemini':provider==='Anthropic'?'Anthropic':'OpenAI Compatible';return {id:window.__aiEditingId,name:document.getElementById('ai-name')?.value.trim()||'',provider,apiType:type,apiFormat:type,baseUrl:base,apiKey:document.getElementById('ai-key')?.value.trim()||'',model:document.getElementById('ai-model')?.value.trim()||''};}
function saveAIConfig(event,id,isEdit){event.preventDefault();const c=getAIConfigFromForm();if(!c.name||!c.apiKey||!c.model||(!c.baseUrl&&c.provider==='自定义'))return toast('请填写 AI 名称、API Key 和 Model');let arr=loadAIConfigs().map(normalizeAIConfig);const i=arr.findIndex(x=>x.id===id);if(i>=0)arr[i]=c;else arr.push(c);saveAIConfigs(arr);const statuses=getAIStatuses();statuses[c.id]='untested';saveAIStatuses(statuses);if(!localStorage.getItem(CURRENT_AI_KEY))localStorage.setItem(CURRENT_AI_KEY,c.id);closeModal();render();toast('AI 配置已保存，请测试连接');}
function setCurrentAI(id){const c=loadAIConfigs().find(x=>x.id===id);if(!c)return;const st=getAIStatuses()[id]||"untested";if(st!=="success"){toast('请先测试连接成功后再设为当前 AI');return;}localStorage.setItem(CURRENT_AI_KEY,id);toast('已切换当前 AI');render();}
function deleteAIConfig(id){const arr=loadAIConfigs(),c=arr.find(x=>x.id===id);if(!c)return;if(!confirm(`确定删除“${c.name}”吗？只删除 AI 配置，不会删除职业资料。`))return;const next=arr.filter(x=>x.id!==id);saveAIConfigs(next);const statuses=getAIStatuses();delete statuses[id];saveAIStatuses(statuses);if(localStorage.getItem(CURRENT_AI_KEY)===id)localStorage.setItem(CURRENT_AI_KEY,next[0]?.id||'');render();}
async function testAIConfig(id){const c=normalizeAIConfig(loadAIConfigs().find(x=>x.id===id));if(!c)return;const statuses=getAIStatuses();statuses[id]='testing';saveAIStatuses(statuses);render();try{await callAI(c,'只回复：连接成功');const s=getAIStatuses();s[id]='success';saveAIStatuses(s);render();toast('✓ 连接成功');}catch(e){const s=getAIStatuses();s[id]='error';saveAIStatuses(s);render();toast('✕ 连接失败：'+friendlyError(e));}}
async function callAI(config,prompt,images=[]){
  config=normalizeAIConfig(config);if(!config?.apiKey||!config?.baseUrl||!config?.model)throw new Error('当前 AI 配置不完整');
  const type=config.apiFormat||config.apiType||'OpenAI Compatible';
  if(type==='Gemini'){
    const base=config.baseUrl.replace(/\/+$/,'');const url=/generateContent$/.test(base)?base:`${base}/models/${config.model}:generateContent`;
    const parts=[{text:prompt},...(images||[]).map(x=>({inlineData:{mimeType:x.mimeType,data:x.data}}))];
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':config.apiKey},body:JSON.stringify({contents:[{parts}]})});
    const t=await r.text();if(!r.ok)throw new Error(`API ${r.status}: ${t.slice(0,300)}`);const d=JSON.parse(t);return d?.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||'';
  }
  if(type==='Anthropic'){
    const base=config.baseUrl.replace(/\/+$/,'');const url=/messages$/.test(base)?base:`${base}/messages`;
    const content=[{type:'text',text:prompt},...(images||[]).map(x=>({type:'image',source:{type:'base64',media_type:x.mimeType,data:x.data}}))];
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-api-key':config.apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:config.model,max_tokens:4096,messages:[{role:'user',content}]})});
    const t=await r.text();if(!r.ok)throw new Error(`API ${r.status}: ${t.slice(0,300)}`);const d=JSON.parse(t);return d?.content?.map(x=>x.text||'').join('')||'';
  }
  const base=config.baseUrl.replace(/\/+$/,'');const url=/chat\/completions$/.test(base)?base:`${base}/chat/completions`;const content=images?.length?[{type:'text',text:prompt},...(images.map(x=>({type:'image_url',image_url:{url:`data:${x.mimeType};base64,${x.data}`}})))] : prompt;
  let r;try{r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+config.apiKey},body:JSON.stringify({model:config.model,messages:[{role:'user',content}],temperature:.2,max_tokens:12000})});}catch(e){throw new Error(`网络请求失败：${e?.message||e}`);}
  const t=await r.text();if(!r.ok)throw new Error(`API ${r.status}: ${t.slice(0,500)}`);let d;try{d=JSON.parse(t)}catch{throw new Error(`API 返回内容不是有效 JSON：${t.slice(0,300)}`);}const out=d?.choices?.[0]?.message?.content||d?.output_text||'';if(!String(out).trim())throw new Error('AI 返回为空，请检查模型、接口或响应格式');return out;
}
function parseAIJSON(raw){const text=String(raw||'').trim();if(!text)throw new Error('AI 返回为空');try{return JSON.parse(text)}catch{}const fenced=text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();try{return JSON.parse(fenced)}catch{}const start=Math.min(...[text.indexOf('{'),text.indexOf('[')].filter(x=>x>=0));const end=Math.max(text.lastIndexOf('}'),text.lastIndexOf(']'));if(start>=0&&end>start){try{return JSON.parse(text.slice(start,end+1))}catch{}}throw new Error('AI 返回内容无法解析为 JSON');}
async function callAIJSON(prompt){return parseAIJSON(await callAI(getCurrentAI(),prompt));}
async function callGeminiJSON(prompt){return callAIJSON(prompt)}


function jdPage(){const saved=(()=>{try{return JSON.parse(localStorage.getItem(JD_KEY)||'null')}catch{return null}})();return `<div class="page-title"><p class="eyebrow">JD 分析</p><h1 style="font-size:42px">把招聘 JD 放进来。</h1><p class="lead">能复制就直接粘贴；不能复制的招聘网站，也可以上传 JD 截图，让 AI 识别后再分析。</p></div><section class="card"><div class="form-grid"><div class="field full"><label>岗位名称（可选）</label><input id="jd-title" value="${escapeHtml(saved?.title||'')}" placeholder="例如：外贸业务员"></div><div class="field full"><label>招聘 JD</label><textarea id="jd-text" rows="14" placeholder="把招聘网站上的完整 JD 复制到这里">${escapeHtml(saved?.jd||'')}</textarea></div><div class="field full"><label>或者上传 JD 截图</label><input id="jd-images" class="file-input" type="file" accept="image/png,image/jpeg,image/webp" multiple onchange="showJdImageNames(this.files)"><div id="jd-image-names" class="hint">支持多张截图。识别后的文字会保存到本机，之后分析不会重复上传图片。</div></div></div><div class="actions"><button id="jd-ocr-btn" class="btn" onclick="recognizeJDScreenshots()">📷 AI识别截图</button><button id="jd-analyze-btn" class="btn primary" onclick="analyzeJD()">AI 分析 JD</button></div><div id="jd-status" class="hint ai-status"></div></section>${saved?.analysis?jdResult(saved.analysis):''}`}
function showJdImageNames(files){const el=document.getElementById('jd-image-names');if(el)el.textContent=files?.length?`已选择 ${files.length} 张截图：${[...files].map(x=>x.name).join('、')}`:'支持多张截图。识别后的文字会保存到本机，之后分析不会重复上传图片。';}
async function fileToImageData(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{const m=String(r.result).match(/^data:([^;]+);base64,(.*)$/);m?resolve({mimeType:m[1],data:m[2]}):reject(new Error('图片读取失败'));};r.onerror=()=>reject(new Error('图片读取失败'));r.readAsDataURL(file);});}
async function recognizeJDScreenshots(){const input=document.getElementById('jd-images'),status=document.getElementById('jd-status');if(!input?.files?.length)return toast('请先选择 JD 截图');if(!getCurrentAI())return toast('请先在设置里配置一个 AI');setActionBusy('jd-ocr-btn',true,'⏳ AI正在识别…');setActionBusy('jd-analyze-btn',true,'⏳ 请稍候…');setStatus('jd-status',`⏳ 正在读取 ${input.files.length} 张 JD 截图，请稍候，不要重复点击。`);try{const images=[];for(const f of [...input.files])images.push(await fileToImageData(f));const text=await callAI(getCurrentAI(),`请完整、准确地识别这些招聘 JD 截图中的文字。保持原有顺序和段落结构。不要总结，不要改写，不要补充不存在的内容。只返回识别到的 JD 原文。`,images);if(!text.trim())throw new Error('没有识别到有效文字');document.getElementById('jd-text').value=text.trim();const title=document.getElementById('jd-title')?.value.trim()||'';localStorage.setItem(JD_KEY,JSON.stringify({title,jd:text.trim(),analysis:null,createdAt:new Date().toISOString(),source:'image'}));setStatus('jd-status','✓ JD 截图识别完成。请检查识别文字，确认无误后再点击“AI 分析 JD”。','success');}catch(e){setStatus('jd-status',`❌ 截图识别失败：${friendlyError(e)}`,'error');}finally{setActionBusy('jd-ocr-btn',false);setActionBusy('jd-analyze-btn',false);}}
function levelBadge(level){
  const v=String(level||'').toLowerCase();
  if(v.includes('high')||v.includes('高度')||v.includes('strong')||v.includes('高')) return '<span class="fit-badge high">🟢 高度匹配</span>';
  if(v.includes('partial')||v.includes('部分')||v.includes('medium')||v.includes('中')) return '<span class="fit-badge medium">🟡 部分匹配</span>';
  return '<span class="fit-badge low">🔴 当前缺口</span>';
}
function renderRebuildPlan(plan){
  if(!plan)return '';
  const reqs=Array.isArray(plan.requirements)?plan.requirements:[];
  const strategies=Array.isArray(plan.restructureStrategy)?plan.restructureStrategy:[];
  const order=Array.isArray(plan.priorityOrder)?plan.priorityOrder:[];
  return `<div class="rebuild-plan">
    <div class="section-head"><div><p class="eyebrow">简历重构方案</p><h3>先证明“为什么适合”，再开始写简历</h3></div><span class="plan-badge">${escapeHtml(REBUILD_PLAN_VERSION)}</span></div>
    ${reqs.length?`<div class="requirement-map">${reqs.map((r,i)=>`<article class="requirement-item"><div class="requirement-head"><strong>${escapeHtml(r.requirement||`岗位要求 ${i+1}`)}</strong>${levelBadge(r.matchLevel||r.level)}</div><div class="meta">优先级：${escapeHtml(String(r.priority||'中'))}</div>${Array.isArray(r.evidence)&&r.evidence.length?`<ul>${r.evidence.slice(0,4).map(e=>`<li>✓ ${escapeHtml(typeof e==='string'?e:(e.fact||e.source||''))}</li>`).join('')}</ul>`:'<p class="small-note">暂无职业库真实证据。</p>'}${r.action?`<p class="plan-action">重构动作：${escapeHtml(r.action)}</p>`:''}</article>`).join('')}</div>`:''}
    ${order.length?`<div class="plan-section"><h3>简历重点排序</h3><ol>${order.slice(0,8).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ol></div>`:''}
    ${strategies.length?`<div class="plan-section"><h3>本次重构策略</h3><ul>${strategies.slice(0,8).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></div>`:''}
    ${Array.isArray(plan.gaps)&&plan.gaps.length?`<div class="plan-section gap-section"><h3>明确缺口</h3><ul>${plan.gaps.slice(0,8).map(x=>`<li>🔴 ${escapeHtml(x)}</li>`).join('')}</ul><div class="hint">这些能力不会因为 JD 有要求就被强行写进简历。</div></div>`:''}
  </div>`;
}
function jdResult(a){return `<section class="card" style="margin-top:18px"><div class="section-head"><div><h2>${escapeHtml(a.jobTitle||'岗位分析结果')}</h2><div class="sub">匹配度仅用于自我优化，不代表 ATS 通过率或录用概率。</div></div><strong class="score">${Number(a.matchScore||0)}/100</strong></div><div class="two-col"><div><h3>核心职责</h3><ul>${(a.coreResponsibilities||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul><h3>必备条件</h3><ul>${(a.mustHave||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></div><div><h3>加分项</h3><ul>${(a.niceToHave||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul><h3>关键词</h3><p>${(a.keywords||[]).map(escapeHtml).join(' · ')}</p></div></div><div class="match-box"><h3>匹配证据</h3><ul>${(a.matchedFacts||[]).map(x=>`<li>🟢 ${escapeHtml(x)}</li>`).join('')}</ul><h3>当前缺口</h3><ul>${(a.missingRequirements||[]).map(x=>`<li>🔴 ${escapeHtml(x)}</li>`).join('')}</ul></div>${renderRebuildPlan(a.rebuildPlan||a.restructurePlan)}<div class="actions"><button id="resume-generate-btn" class="btn primary" onclick="generateResumeVersions()">开始按此方案重构简历</button></div><div class="hint ai-status resume-generation-status"></div></section>`}

async function analyzeJD(){
  const title=document.getElementById('jd-title')?.value.trim()||'',jd=document.getElementById('jd-text')?.value.trim()||'',status=document.getElementById('jd-status');
  if(!jd)return toast('请先粘贴 JD 或先识别 JD 截图');
  if(!getCurrentAI())return toast('请先在设置里配置一个 AI');
  setActionBusy('jd-analyze-btn',true,'⏳ AI正在深度分析…');setActionBusy('jd-ocr-btn',true,'⏳ 请稍候…');
  setStatus('jd-status','⏳ 正在分析岗位重点，并建立“JD要求 → 真实经历证据”的匹配关系。');
  const prompt=`你是 CareerFit 的“岗位匹配与简历重构分析器”。你的任务不是简单提取关键词，而是判断：这个岗位到底想找什么人，以及用户现有真实经历中哪些内容最能证明其适合。\n\n严格事实规则：\n1. 只能使用职业整理库和其中的真实来源事实。\n2. 如果职业库没有某项能力，必须标记为缺口，不得推断用户拥有。\n3. 不得把一家公司做过的事情归到另一家公司。\n4. 不得修改任何真实数字、日期、公司、职位、客户、工具或成果。\n5. “高度匹配”代表存在足够真实证据，不代表录用概率。\n6. 对 JD 要求按重要程度排序，核心职责/明确任职要求优先于普通关键词。\n\n请返回严格 JSON：{"jobTitle":"","company":"","coreResponsibilities":[],"mustHave":[],"niceToHave":[],"skills":[],"keywords":[],"matchedFacts":[],"missingRequirements":[],"matchScore":0,"rebuildPlan":{"requirements":[{"requirement":"岗位核心要求","priority":"高/中/低","matchLevel":"高度匹配/部分匹配/当前缺口","evidence":[{"fact":"职业库中的真实证据","source":"经历来源"}],"action":"简历应该如何强化/弱化/不写"}],"priorityOrder":[],"restructureStrategy":[],"gaps":[]}}。requirements 最多8项；每个 requirement 都必须有证据或明确说明无证据。priorityOrder 写出生成 Targeted 简历时应该优先展示的经历/能力顺序。restructureStrategy 写出5-8条具体重构动作，例如“将最相关项目置于工作经历前”“把真实的客户需求分析从外贸经历中提炼为可迁移的业务能力”，但不能创造经历。\n\n招聘 JD：${jd}\n\n职业整理库：${JSON.stringify(profile)}`;
  try{
    const analysis=await callAIJSON(prompt);
    analysis.rebuildPlan=analysis.rebuildPlan||analysis.restructurePlan||{requirements:[],priorityOrder:[],restructureStrategy:[],gaps:[]};
    localStorage.setItem(JD_KEY,JSON.stringify({title,jd,analysis,createdAt:new Date().toISOString(),rebuildPlanVersion:REBUILD_PLAN_VERSION}));
    render();toast('✓ JD 深度分析完成，已生成简历重构方案');
  }catch(e){setStatus('jd-status',`❌ JD 分析失败：${friendlyError(e)}`,'error');}
  finally{setActionBusy('jd-analyze-btn',false);setActionBusy('jd-ocr-btn',false);}
}

function resumesPage(){
  let h=[];try{h=JSON.parse(localStorage.getItem(RESUME_HISTORY_KEY)||'[]')}catch{}
  return `<div class="page-title"><p class="eyebrow">简历</p><h1 style="font-size:42px">不是润色，而是重构。</h1><p class="lead">CareerFit 会围绕目标 JD 重新决定哪些经历最值得展示，并在真实事实边界内重排、重写和强化。</p></div><section class="card"><h2>最近生成</h2>${h.length?h.map((x,i)=>`<article class="resume-history"><div class="section-head"><div><strong>${escapeHtml(x.jobTitle||x.title||'未命名岗位')}</strong><div class="meta">${escapeHtml(new Date(x.generatedAt).toLocaleString('zh-CN'))}${x.status==='partial'?' · 部分完成':''}</div></div></div>${x.rebuildPlan?.restructureStrategy?.length?`<div class="match-box"><h3>本次重构方向</h3><ul>${x.rebuildPlan.restructureStrategy.slice(0,8).map(y=>`<li>• ${escapeHtml(y)}</li>`).join('')}</ul></div>`:''}${x.status==='partial'?'<div class="status-text error">本次生成未全部完成，已保留成功版本。回到 JD 分析页可重新生成。</div>':''}<div class="resume-tabs">${x.versions?.conservative?`<details open><summary>Conservative · 保守版</summary><textarea rows="16">${escapeHtml(x.versions.conservative)}</textarea></details>`:''}${x.versions?.targeted?`<details><summary>Targeted · 针对性重构版 ⭐</summary><textarea rows="18">${escapeHtml(x.versions.targeted)}</textarea></details>`:''}${x.versions?.keywordFocused?`<details><summary>Keyword Focused · 关键词强化版</summary><textarea rows="16">${escapeHtml(x.versions.keywordFocused)}</textarea></details>`:''}</div>${x.whyChanged?.length?`<div class="match-box"><h3>为什么这样修改</h3><ul>${x.whyChanged.map(y=>`<li>• ${escapeHtml(y)}</li>`).join('')}</ul></div>`:''}</article>`).join(''):emptyBlock('还没有生成简历','先进入 JD 分析，分析一个岗位后生成 3 个版本。')}</section>`
}
function compactCareerEvidence(){
  const p=profile;
  return {
    personal:p.personal,
    experiences:(p.experiences||[]).map((x,i)=>({id:`experience_${i+1}`,company:x.company,position:x.position,start:x.start,end:x.end,current:x.current,content:x.workContent||x.rawWorkContent||''})),
    projects:(p.projects||[]).map((x,i)=>({id:`project_${i+1}`,title:x.title,start:x.start,end:x.end,description:x.description||x.rawDescription||''})),
    certificates:p.certificates||[],skills:p.skills||[]
  };
}
async function ensureRebuildPlan(saved,ai){
  if(saved.analysis?.rebuildPlan?.requirements?.length)return saved.analysis.rebuildPlan;
  const prompt=`你是 CareerFit 的简历重构策略分析器。根据 JD 和职业整理库，建立“岗位要求 → 真实证据 → 简历动作”的重构方案。只允许使用职业整理库真实事实，缺失能力必须标记为缺口。返回严格 JSON：{"requirements":[{"requirement":"","priority":"高/中/低","matchLevel":"高度匹配/部分匹配/当前缺口","evidence":[{"fact":"","source":""}],"action":""}],"priorityOrder":[],"restructureStrategy":[],"gaps":[]}.\nJD：${saved.jd}\n职业整理库：${JSON.stringify(compactCareerEvidence())}\n已有JD分析：${JSON.stringify(saved.analysis||{})}`;
  const plan=await callAIJSON(prompt);
  saved.analysis=saved.analysis||{};saved.analysis.rebuildPlan=plan;localStorage.setItem(JD_KEY,JSON.stringify(saved));return plan;
}
function markAIStatus(config,status){if(!config?.id)return;const s=getAIStatuses();s[config.id]=status;saveAIStatuses(s);}
async function callTrackedAI(config,prompt,images=[]){try{const out=await callAI(config,prompt,images);markAIStatus(config,'success');return out}catch(e){markAIStatus(config,'error');throw e;}}
async function generateResumeVersions(){
  let saved;try{saved=JSON.parse(localStorage.getItem(JD_KEY)||'null')}catch{}
  if(!saved?.jd)return toast('请先分析 JD');
  const ai=getCurrentAI();if(!ai)return toast('请先配置当前 AI');
  const statuses=getAIStatuses();if(statuses[ai.id]!=='success')return toast('当前 AI 尚未测试成功，请先到设置里测试连接');
  const btn=document.getElementById('resume-generate-btn');
  const status=btn?.closest('.card')?.querySelector('.resume-generation-status');
  if(btn){btn.disabled=true;btn.classList.add('is-loading');btn.textContent='⏳ 正在重构…';}
  const update=(html)=>{if(status){status.innerHTML=html;status.className='hint ai-status resume-generation-status';}};
  let plan;
  try{
    update('⏳ 正在确认岗位要求与真实经历的匹配证据…');
    plan=await ensureRebuildPlan(saved,ai);
    update('✓ 已完成岗位→证据匹配<br>⏳ 正在生成 Conservative（保守版）<br>○ Targeted（针对性重构版）<br>○ Keyword Focused（关键词强化版）');
  }catch(e){update(`❌ 重构方案生成失败：${escapeHtml(friendlyError(e))}`);toast('重构方案生成失败：'+friendlyError(e));if(btn){btn.disabled=false;btn.classList.remove('is-loading');btn.textContent='开始按此方案重构简历';}return;}
  const baseContext=`职业整理库（唯一事实来源）：${JSON.stringify(compactCareerEvidence())}\n\n招聘 JD：${saved.jd}\n\nJD 深度分析：${JSON.stringify(saved.analysis||{})}\n\n简历重构方案：${JSON.stringify(plan)}`;
  const rules='你必须把这份简历当成“岗位匹配证明材料”来重构，而不是简单润色。严格禁止编造或改变任何公司、职位、日期、客户、技能、工具、数字、职责和成果；不得把不同公司的经历混在一起；不得把 JD 中的要求自动当成用户拥有的能力。可以重新排序、合并同一来源中的真实事实、拆分过长内容、压缩低相关内容、强化高相关内容、调整个人简介和技能顺序，并使用 JD 中与真实证据对应的表达。最终简历必须让招聘方清楚看到“为什么这个人适合该岗位”。如果 JD 要求某项能力但职业库没有证据，宁可不写。数字必须原样保留。不要解释，不要 JSON，不要 Markdown 代码围栏。';
  const versions={};
  let history=[];try{history=JSON.parse(localStorage.getItem(RESUME_HISTORY_KEY)||'[]')}catch{}
  const item={id:crypto.randomUUID(),title:saved.title,jobTitle:saved.analysis?.jobTitle||saved.title,jd:saved.jd,generatedAt:new Date().toISOString(),versions:{},whyChanged:[],rebuildPlan:plan,status:'generating'};
  history.unshift(item);localStorage.setItem(RESUME_HISTORY_KEY,JSON.stringify(history));
  const saveProgress=()=>{const idx=history.findIndex(x=>x.id===item.id);if(idx>=0){history[idx]=item;localStorage.setItem(RESUME_HISTORY_KEY,JSON.stringify(history));}};
  const jobs=[
    ['conservative','Conservative（保守版）','保持原经历结构和事实密度较高，只做岗位相关性排序与表达优化。不要大幅删减。'],
    ['targeted','Targeted（针对性重构版）','这是主力版本。根据重构方案重新组织整份简历：最相关的项目/经历前置；高匹配证据强化；低相关内容压缩；个人简介、核心技能、工作/项目经历均围绕岗位核心能力重新组织。允许大幅重构，但所有内容必须有真实证据。'],
    ['keywordFocused','Keyword Focused（关键词强化版）','在 Targeted 的结构基础上，最大化覆盖 JD 中有真实证据支撑的核心关键词和能力表达；无证据关键词绝不硬塞。']
  ];
  try{
    for(let i=0;i<jobs.length;i++){
      const [key,label,style]=jobs[i];
      update(`✓ 已完成 JD → 证据匹配<br>${i>0?'✓ 已完成 '+jobs[i-1][1]+'<br>':''}⏳ 正在生成 ${label}…<br>${i<1?'○':'✓'} Targeted（针对性重构版）<br>${i<2?'○':'✓'} Keyword Focused（关键词强化版）`);
      try{
        versions[key]=(await callTrackedAI(ai,`你是资深 AI 产品经理招聘方向的简历重构专家。${rules}\n\n当前版本：${label}\n生成策略：${style}\n\n${baseContext}\n\n请输出一份完整、可直接投递的中文简历正文。Targeted 版本尤其要让“岗位要求→我的真实证据”关系清晰。不要为了完整而平均展示所有经历。`)).trim();
        if(!versions[key])throw new Error('AI 返回为空');
        item.versions[key]=versions[key];saveProgress();
      }catch(e){
        item.status='partial';saveProgress();
        const reason=friendlyError(e);update(`❌ ${label}生成失败：${escapeHtml(reason)}<br>已保留此前成功生成的版本。<br><button class="btn" onclick="generateResumeVersions()">重新生成失败版本</button>`);toast(`${label}生成失败：${reason}`);return;
      }
    }
    update('✓ 3 个版本均已生成<br>⏳ 正在生成“为什么这样修改”与事实校验…');
    try{
      const why=await callAIJSON(`根据下面的 JD、重构方案和职业库，解释本次 Targeted 简历为什么这样重构。每条都必须对应真实证据。返回严格 JSON 数组，最多8条，内容包括：哪些经历被前置、哪些内容被强化、哪些内容被弱化、哪些 JD 要求没有写入以及原因。\nJD：${saved.jd}\n重构方案：${JSON.stringify(plan)}\n职业库：${JSON.stringify(compactCareerEvidence())}`);
      item.whyChanged=Array.isArray(why)?why:(Array.isArray(why?.whyChanged)?why.whyChanged:[]);
    }catch(e){item.whyChanged=[];}
    item.versions={...versions};item.status='completed';saveProgress();
    update('✓ 3 版简历重构完成<br>已保存到「简历」页面。');
    setPage('resumes');setTimeout(()=>toast('✓ 3 版针对性简历已生成，已保存到“简历”页面'),50);
  }finally{
    if(btn){btn.disabled=false;btn.classList.remove('is-loading');btn.textContent='开始按此方案重构简历';}
  }
}

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
