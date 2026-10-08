const STORAGE_KEY = "careerfit_profile_v2";
const PAGE_KEY = "careerfit_page_v2";
const AI_KEY = "careerfit_gemini_api_key_v2";
const GEMINI_MODEL = "gemini-3.8-flash";
const AI_CONFIGS_KEY = "careerfit_ai_configs_v5";
const CURRENT_AI_KEY = "careerfit_current_ai_v5";
const JD_KEY = "careerfit_jd_v5";
const RESUME_HISTORY_KEY = "careerfit_resume_history_v5";
const AI_STATUS_KEY = "careerfit_ai_status_v51";
const REBUILD_PLAN_VERSION = "v6.0";
const EVIDENCE_KEY = "careerfit_evidence_v6";
const EVIDENCE_GAP_KEY = "careerfit_evidence_gaps_v6";

const blankProfile = {
  version: 2,
  updatedAt: null,
  personal: { name: "", headline: "", email: "", phone: "", location: "" },
  experiences: [],
  projects: [],
  certificates: [],
  skills: [],
  sourceDocuments: [],
  evidenceBank: [],
  mdDocuments: [],
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
      sourceDocuments: Array.isArray(saved.sourceDocuments)?saved.sourceDocuments:[],
      evidenceBank: Array.isArray(saved.evidenceBank)?saved.evidenceBank:[],
      mdDocuments: Array.isArray(saved.mdDocuments)?saved.mdDocuments:[]
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
function safeAIText(value){
  if(value===null||value===undefined)return "";
  if(typeof value==='string'||typeof value==='number'||typeof value==='boolean')return escapeHtml(String(value));
  if(Array.isArray(value))return value.map(safeAIText).filter(Boolean).join(" · ");
  if(typeof value==='object'){
    const preferred=['fact','source','change','reason','action','requirement','capability','evidence','text','label','name'];
    const parts=[];
    preferred.forEach(k=>{if(value[k]!==undefined&&value[k]!==null&&String(value[k]).trim()!=='')parts.push(`${escapeHtml(k)}：${safeAIText(value[k])}`)});
    if(parts.length)return parts.join('；');
    return Object.values(value).map(safeAIText).filter(Boolean).join('；');
  }
  return escapeHtml(String(value));
}
function evidenceText(value){
  if(typeof value==='string')return value;
  if(!value||typeof value!=='object')return String(value||'');
  return [value.fact,value.source].filter(Boolean).join('｜');
}

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
function stats(){ return {experiences:profile.experiences.length,projects:profile.projects.length,certificates:profile.certificates.length,skills:profile.skills.length,evidence:(profile.evidenceBank||[]).length,gaps:loadEvidenceGaps().length}; }
function render(){
  const app=document.getElementById("app");
  if(currentPage==="home") app.innerHTML=homePage();
  else if(currentPage==="profile") app.innerHTML=profilePage();
  else if(currentPage==="evidence") app.innerHTML=evidencePage();
  else if(currentPage==="jd") app.innerHTML=jdPage();
  else if(currentPage==="resumes") app.innerHTML=resumesPage();
  else app.innerHTML=settingsPage();
  updateNav();
  hydrateResumeFrames();
}
function homePage(){
  const s=stats();
  return `<section class="hero">
    <p class="eyebrow">CareerFit V6</p>
    <h1>把你真正做过的事，<br>沉淀成长期职业资产。</h1>
    <p class="lead">上传简历，让 AI 挖掘证据并追问缺口；也可以导入你以前和其他 AI 聊过职业经历的 Markdown。最终统一沉淀进职业证据库，再用于 JD 匹配和简历重构。</p>
  </section>
  <div class="grid home-grid">
    <section class="card">
      <p class="eyebrow">我的职业资产</p><h2>${escapeHtml(profile.personal.name||"还没有开始整理")}</h2>
      <div class="profile-summary">
        <div class="stat"><strong>${s.experiences}</strong><span>工作经历</span></div><div class="stat"><strong>${s.projects}</strong><span>项目经历</span></div><div class="stat"><strong>${s.evidence}</strong><span>职业证据</span></div><div class="stat"><strong>${s.gaps}</strong><span>待完善</span></div>
      </div>
      <div class="actions"><button class="btn primary" onclick="setPage('profile')">进入职业资产</button><button class="btn" onclick="setPage('evidence')">查看证据库</button></div>
    </section>
    <section class="card"><p class="eyebrow">V6 核心闭环</p><h2>不是替你编简历，而是帮你把经历挖深。</h2>
      <div class="quick-list"><div class="quick-item"><strong>① 上传简历</strong><span>AI 提取真实事实和证据链</span></div><div class="quick-item"><strong>② 导入职业 Markdown</strong><span>接入你过去和其他 AI 聊过的内容</span></div><div class="quick-item"><strong>③ 发现缺口</strong><span>AI 找到重要但证据不足的能力</span></div><div class="quick-item"><strong>④ 追问补全</strong><span>文字 / 语音回答，确认后沉淀职业资产</span></div></div>
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
    <div class="v6-import-panel"><div><strong>或者，接入你以前和 AI 聊过的职业内容</strong><p class="small-note">支持 Markdown。CareerFit 会区分“用户真实陈述”和“AI 的总结/建议”，只把可追溯的用户事实作为候选职业证据。</p></div><button class="btn" onclick="openMarkdownImportModal()">📝 导入职业 Markdown</button></div>
    <div class="actions"><button class="btn" onclick="mineAllCareerEvidence()">🧠 AI 挖掘职业证据</button><button class="btn primary" onclick="setPage('evidence')">查看证据与追问</button></div>
    <div id="profile-evidence-status" class="hint"></div>
  </section>

  <section class="card" style="margin-top:18px"><div class="section-head"><div><h2>工作经历</h2><div class="sub">${s.experiences} 段 · 原始经历只是起点，V6 会继续挖掘证据链</div></div><button class="btn primary" onclick="openExperienceModal()">＋添加工作经历</button></div>
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

function loadEvidenceGaps(){try{return JSON.parse(localStorage.getItem(EVIDENCE_GAP_KEY)||'[]')}catch{return []}}
function saveEvidenceGaps(gaps){localStorage.setItem(EVIDENCE_GAP_KEY,JSON.stringify(gaps||[]))}
function loadEvidence(){return Array.isArray(profile.evidenceBank)?profile.evidenceBank:[]}
function evidenceStrengthBadge(v){const x=String(v||'B').toUpperCase();return `<span class="fit-badge ${x==='S'?'high':x==='A'?'high':x==='B'?'medium':'low'}">${escapeHtml(x)} 证据</span>`}
function evidencePage(){
  const ev=loadEvidence(), gaps=loadEvidenceGaps();
  return `<div class="page-title"><p class="eyebrow">职业证据库</p><h1 style="font-size:42px">把“我做过”变成可追溯的证据。</h1><p class="lead">每条证据都尽量保留来源、场景、行为、结果和事实边界。AI只能整理你提供的事实，不能替你创造事实。</p></div>
  <div class="two-col"><section class="card"><div class="section-head"><div><h2>证据资产</h2><div class="sub">${ev.length} 条候选/已确认证据</div></div><button class="btn" onclick="mineAllCareerEvidence()">重新挖掘</button></div>${ev.length?`<div class="evidence-list">${ev.map((e,i)=>`<article class="evidence-card"><div class="section-head"><div><strong>${escapeHtml(e.title||e.capability||'职业证据')}</strong><div class="meta">${escapeHtml(e.sourceName||e.source||'来源未知')} · ${e.confirmed?'已确认':'待确认'} ${evidenceStrengthBadge(e.strength)}</div></div></div><p>${escapeHtml(e.scenario||e.context||e.fact||'')}</p>${e.behavior?`<p><strong>行为：</strong>${escapeHtml(e.behavior)}</p>`:''}${e.method?`<p><strong>方法/判断：</strong>${escapeHtml(e.method)}</p>`:''}${e.result?`<p><strong>结果：</strong>${escapeHtml(e.result)}</p>`:''}${e.boundary?`<p class="small-note"><strong>事实边界：</strong>${escapeHtml(e.boundary)}</p>`:''}<div class="actions compact">${e.confirmed?'':`<button class="btn primary" onclick="confirmEvidence('${e.id}')">确认加入</button>`}<button class="btn" onclick="editEvidence('${e.id}')">编辑</button><button class="btn" onclick="deleteEvidence('${e.id}')">删除</button></div></article>`).join('')}</div>`:emptyBlock('还没有职业证据','先上传简历或导入职业 Markdown，再点击 AI 挖掘。')}</section>
  <section class="card"><div class="section-head"><div><h2>待完善证据</h2><div class="sub">AI 只问能明显增加证据价值的问题。</div></div></div>${gaps.length?gaps.map((g,i)=>`<article class="gap-card"><div class="meta">${escapeHtml(g.capability||g.requirement||'待完善能力')}</div><h3>${escapeHtml(g.question||'需要补充一段真实经历')}</h3>${g.why?`<p>${escapeHtml(g.why)}</p>`:''}<div class="actions"><button class="btn primary" onclick="openEvidenceAnswerModal('${g.id}')">🎙️ 回答</button><button class="btn" onclick="skipEvidenceGap('${g.id}')">暂不回答</button></div></article>`).join(''):'<div class="empty"><strong>目前没有待完善问题</strong><p>当 AI 发现重要证据链缺失时，会把最有价值的问题放在这里。</p></div>'}</section></div>`;
}
function confirmEvidence(id){const e=profile.evidenceBank.find(x=>x.id===id);if(!e)return;e.confirmed=true;e.confirmedAt=new Date().toISOString();saveProfile();toast('✓ 已加入职业资产')}
function deleteEvidence(id){if(!confirm('删除这条职业证据吗？'))return;profile.evidenceBank=profile.evidenceBank.filter(x=>x.id!==id);saveProfile();}
function editEvidence(id){const e=profile.evidenceBank.find(x=>x.id===id);if(!e)return;openModal('编辑职业证据',`<form class="form-grid" onsubmit="saveEvidenceEdit(event,'${id}')"><div class="field full"><label>标题/能力</label><input name="title" value="${escapeHtml(e.title||e.capability||'')}"></div><div class="field full"><label>场景</label><textarea name="scenario">${escapeHtml(e.scenario||'')}</textarea></div><div class="field full"><label>实际行为</label><textarea name="behavior">${escapeHtml(e.behavior||'')}</textarea></div><div class="field full"><label>方法 / 判断</label><textarea name="method">${escapeHtml(e.method||'')}</textarea></div><div class="field full"><label>结果</label><textarea name="result">${escapeHtml(e.result||'')}</textarea></div><div class="field full"><label>事实边界</label><textarea name="boundary">${escapeHtml(e.boundary||'')}</textarea></div><div class="actions field full"><button type="button" class="btn" onclick="closeModal()">取消</button><button class="btn primary">保存</button></div></form>`)}
function saveEvidenceEdit(ev,id){ev.preventDefault();const e=profile.evidenceBank.find(x=>x.id===id);if(!e)return;const f=new FormData(ev.target);['title','scenario','behavior','method','result','boundary'].forEach(k=>e[k]=String(f.get(k)||'').trim());saveProfile();closeModal();toast('证据已更新')}
function skipEvidenceGap(id){saveEvidenceGaps(loadEvidenceGaps().filter(x=>x.id!==id));render();toast('已暂时跳过')}
function openEvidenceAnswerModal(id){const g=loadEvidenceGaps().find(x=>x.id===id);if(!g)return;openModal('补充职业证据',`<div class="field"><label>为什么问这个问题</label><p class="small-note">${escapeHtml(g.why||'为了补全重要证据链。')}</p></div><div class="field"><label>问题</label><div class="callout">${escapeHtml(g.question||'请讲一个具体案例。')}</div></div><div class="field"><label>你的回答</label><textarea id="evidence-answer" style="min-height:220px" placeholder="可以直接输入，也可以用下面的语音输入。"></textarea></div><div class="actions"><button class="btn" type="button" onclick="startEvidenceVoice()">🎙️ 语音输入</button><button class="btn primary" type="button" onclick="submitEvidenceAnswer('${id}')">AI整理并预览</button></div><div id="evidence-answer-status" class="hint"></div>`)}
let evidenceRecognition=null;
function startEvidenceVoice(){const T=window.SpeechRecognition||window.webkitSpeechRecognition;if(!T)return toast('当前浏览器不支持语音识别，可以直接打字。');const area=document.getElementById('evidence-answer');evidenceRecognition=new T();evidenceRecognition.lang='zh-CN';evidenceRecognition.interimResults=true;evidenceRecognition.continuous=false;evidenceRecognition.onresult=e=>{let out='';for(let i=0;i<e.results.length;i++)out+=e.results[i][0].transcript;area.value=(area.value?area.value+' ':'')+out};evidenceRecognition.onerror=()=>toast('语音识别失败，请改用文字输入');evidenceRecognition.start();toast('🎙️ 正在听，请开始说');}
async function submitEvidenceAnswer(id){const g=loadEvidenceGaps().find(x=>x.id===id),answer=document.getElementById('evidence-answer')?.value.trim(),status=document.getElementById('evidence-answer-status');if(!g||!answer)return toast('请先输入回答');const ai=getCurrentAI();if(!ai)return toast('请先配置当前 AI');if(status)status.textContent='⏳ AI正在整理新增证据…';try{const prompt=`你是 CareerFit 的职业证据整理器。用户正在回答一个证据缺口问题。只能提取用户回答中明确提供的事实，不得补全、不做因果推断、不创造数字。返回严格 JSON：{"candidate":{"title":"","capability":"","scenario":"","behavior":"","method":"","result":"","boundary":"","strength":"S/A/B/C"}}。问题：${g.question}\n缺口原因：${g.why||''}\n用户回答：${answer}`;const out=await callTrackedAI(ai,prompt);const data=parseAIJSON(out)?.candidate;if(!data)throw new Error('AI没有返回可用证据');openModal('确认新增职业证据',`<div class="callout success-callout">AI整理出的内容只能来自你的回答，请确认后才会写入职业资产。</div><div class="evidence-preview"><p><strong>${escapeHtml(data.title||data.capability||'新增证据')}</strong></p><p>${escapeHtml(data.scenario||'')}</p>${data.behavior?`<p><strong>行为：</strong>${escapeHtml(data.behavior)}</p>`:''}${data.method?`<p><strong>方法/判断：</strong>${escapeHtml(data.method)}</p>`:''}${data.result?`<p><strong>结果：</strong>${escapeHtml(data.result)}</p>`:''}<p class="small-note">事实边界：${escapeHtml(data.boundary||'以用户回答为准')}</p><div class="actions"><button class="btn" onclick="closeModal()">修改/取消</button><button class="btn primary" onclick='acceptEvidenceCandidate(decodeURIComponent("${encodeURIComponent(JSON.stringify(data))}"),"${id}")'>✓ 确认加入</button></div></div>`)}catch(e){if(status)status.textContent='❌ '+friendlyError(e);}}
function acceptEvidenceCandidate(json,id){try{const data=JSON.parse(json);profile.evidenceBank.push({id:crypto.randomUUID(),...data,confirmed:true,source:'用户补充回答',sourceName:'CareerFit 追问',createdAt:new Date().toISOString()});saveProfile();saveEvidenceGaps(loadEvidenceGaps().filter(x=>x.id!==id));closeModal();toast('✓ 新证据已沉淀');}catch(e){toast('保存失败')}}
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


function openMarkdownImportModal(){openModal('导入职业 Markdown',`<div class="import-modal-copy"><p class="small-note">导入你以前和 ChatGPT、Claude、Gemini 等 AI 聊过职业经历、工作复盘、项目复盘的 Markdown。CareerFit 会尽量区分“用户说过的事实”和“AI 的分析/建议”。</p><div class="field"><label>选择 Markdown 文件</label><input id="md-files" class="file-input" type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" multiple></div><div id="md-import-status" class="hint"></div><div id="md-import-results"></div><div class="actions"><button class="btn" onclick="closeModal()">关闭</button><button class="btn primary" onclick="importMarkdownFiles()">导入并解析</button></div></div>`)}
async function importMarkdownFiles(){const input=document.getElementById('md-files'),status=document.getElementById('md-import-status'),results=document.getElementById('md-import-results');if(!input?.files?.length)return toast('请选择 Markdown 文件');const ai=getCurrentAI();if(!ai)return toast('请先在设置里配置当前 AI');status.textContent='⏳ 正在读取并解析职业对话…';let added=0;for(const file of [...input.files]){try{const text=await file.text();if(!text.trim())throw new Error('文件为空');const prompt=`你是 CareerFit 的职业证据导入器。下面是一份用户从其他 AI 平台导出的职业/事业 Markdown 对话。你的任务是只提取用户自己明确陈述、描述或确认的职业事实。AI的评价、推测、建议、润色版本、假设案例、职业判断不能作为事实。不要编造任何信息。对每条事实建立候选证据，并尽量形成 evidence chain。返回严格 JSON：{"candidates":[{"title":"","capability":"","scenario":"","behavior":"","method":"","result":"","boundary":"","strength":"S/A/B/C","sourceQuote":""}]}。Markdown：\n${text.slice(0,100000)}`;const out=await callTrackedAI(ai,prompt);const data=parseAIJSON(out);const candidates=Array.isArray(data?.candidates)?data.candidates:[];const doc={id:crypto.randomUUID(),name:file.name,size:file.size,text,createdAt:new Date().toISOString(),candidateCount:candidates.length};profile.mdDocuments.push(doc);candidates.forEach(c=>profile.evidenceBank.push({id:crypto.randomUUID(),...c,confirmed:false,source:'Markdown职业对话',sourceName:file.name,createdAt:new Date().toISOString()}));added+=candidates.length;results.insertAdjacentHTML('beforeend',`<div class="callout success-callout">✓ ${escapeHtml(file.name)} · 发现 ${candidates.length} 条候选证据，请到职业证据库确认。</div>`)}catch(e){results.insertAdjacentHTML('beforeend',`<div class="callout error-callout">✕ ${escapeHtml(file.name)} · ${escapeHtml(friendlyError(e))}</div>`)}}saveProfile();status.textContent=`完成：新增 ${added} 条候选证据。`;}
async function mineAllCareerEvidence(){const status=document.getElementById('profile-evidence-status');const ai=getCurrentAI();if(!ai)return toast('请先在设置里配置并测试一个当前 AI');const sources=(profile.sourceDocuments||[]).map(d=>`【简历：${d.name}】\n${d.text}`).join('\n\n');const md=(profile.mdDocuments||[]).map(d=>`【历史职业对话：${d.name}】\n${d.text}`).join('\n\n');const raw=(sources+'\n'+md).trim();if(!raw)return toast('请先上传简历或导入职业 Markdown');if(status)status.textContent='⏳ AI正在挖掘职业证据，并检查证据链完整度…';try{const prompt=`你是 CareerFit V6 的职业证据分析师。不要写简历。请从下面的职业材料中提取用户明确做过的事情，建立候选 Evidence。必须区分用户事实和 AI/文档中的推断；只记录可追溯事实。对每条证据输出场景、实际行为、方法/判断、结果、数据（如有）、事实边界、可迁移能力、证据强度。若证据链缺失，不要编造，而是为最重要的缺口生成一个高价值追问。返回严格 JSON：{"candidates":[{"title":"","capability":"","scenario":"","behavior":"","method":"","result":"","boundary":"","strength":"S/A/B/C","sourceName":"","sourceQuote":""}],"gaps":[{"capability":"","question":"","why":"","evidenceIds":[]}]}。材料：\n${raw.slice(0,140000)}`;const out=await callTrackedAI(ai,prompt);const data=parseAIJSON(out);const existing=new Set(loadEvidence().map(e=>normalizeKey((e.title||'')+'|'+(e.sourceQuote||e.fact||''))));for(const c of (data.candidates||[])){const key=normalizeKey((c.title||'')+'|'+(c.sourceQuote||c.fact||''));if(!existing.has(key)){profile.evidenceBank.push({id:crypto.randomUUID(),...c,confirmed:false,createdAt:new Date().toISOString()});existing.add(key)}}saveEvidenceGaps((data.gaps||[]).map(g=>({...g,id:crypto.randomUUID()})));saveProfile();if(status)status.textContent=`✓ 挖掘完成：当前共有 ${profile.evidenceBank.length} 条职业证据，${loadEvidenceGaps().length} 个待完善问题。`;setPage('evidence');}catch(e){if(status)status.textContent='❌ '+friendlyError(e);toast('证据挖掘失败：'+friendlyError(e));}}
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
  if(ok && getCurrentAI() && getAIStatuses()[getCurrentAI().id]==='success'){ closeModal(); setPage('profile'); setTimeout(()=>mineAllCareerEvidence(),80); }
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
    ${reqs.length?`<div class="requirement-map">${reqs.map((r,i)=>`<article class="requirement-item"><div class="requirement-head"><strong>${safeAIText(r.requirement||`岗位要求 ${i+1}`)}</strong>${levelBadge(r.matchLevel||r.level)}</div><div class="meta">优先级：${safeAIText(r.priority||'中')}</div>${Array.isArray(r.evidence)&&r.evidence.length?`<ul>${r.evidence.slice(0,4).map(e=>`<li>✓ ${safeAIText(evidenceText(e))}</li>`).join('')}</ul>`:'<p class="small-note">暂无职业库真实证据。</p>'}${r.action?`<p class="plan-action">重构动作：${safeAIText(r.action)}</p>`:''}</article>`).join('')}</div>`:''}
    ${order.length?`<div class="plan-section"><h3>简历重点排序</h3><ol>${order.slice(0,8).map(x=>`<li>${safeAIText(x)}</li>`).join('')}</ol></div>`:''}
    ${strategies.length?`<div class="plan-section"><h3>本次重构策略</h3><ul>${strategies.slice(0,8).map(x=>`<li>${safeAIText(x)}</li>`).join('')}</ul></div>`:''}
    ${Array.isArray(plan.gaps)&&plan.gaps.length?`<div class="plan-section gap-section"><h3>明确缺口</h3><ul>${plan.gaps.slice(0,8).map(x=>`<li>🔴 ${safeAIText(x)}</li>`).join('')}</ul><div class="hint">这些能力不会因为 JD 有要求就被强行写进简历。</div></div>`:''}
  </div>`;
}
function jdResult(a){return `<section class="card" style="margin-top:18px"><div class="section-head"><div><h2>${safeAIText(a.jobTitle||'岗位分析结果')}</h2><div class="sub">匹配度仅用于自我优化，不代表 ATS 通过率或录用概率。</div></div><strong class="score">${Number(a.matchScore||0)}/100</strong></div><div class="two-col"><div><h3>核心职责</h3><ul>${(a.coreResponsibilities||[]).map(x=>`<li>${safeAIText(x)}</li>`).join('')}</ul><h3>必备条件</h3><ul>${(a.mustHave||[]).map(x=>`<li>${safeAIText(x)}</li>`).join('')}</ul></div><div><h3>加分项</h3><ul>${(a.niceToHave||[]).map(x=>`<li>${safeAIText(x)}</li>`).join('')}</ul><h3>关键词</h3><p>${(a.keywords||[]).map(safeAIText).join(' · ')}</p></div></div><div class="match-box"><h3>匹配证据</h3><ul>${(a.matchedFacts||[]).map(x=>`<li>🟢 ${safeAIText(evidenceText(x))}</li>`).join('')}</ul><h3>当前缺口</h3><ul>${(a.missingRequirements||[]).map(x=>`<li>🔴 ${safeAIText(x)}</li>`).join('')}</ul></div>${renderRebuildPlan(a.rebuildPlan||a.restructurePlan)}<div class="actions"><button id="resume-generate-btn" class="btn primary" onclick="generateResumeVersions()">开始按此方案重构简历</button></div><div class="hint ai-status resume-generation-status"></div></section>`}

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

function resumeEscapeText(text){return escapeHtml(String(text||''));}
function fixedEducation(){
  if(Array.isArray(profile.education)&&profile.education.length)return profile.education;
  const docs=profile.sourceDocuments||[];
  for(const d of docs){
    const t=String(d.text||'');
    const m=t.match(/教育背景\s*([\s\S]*?)(?=工作经历|项目经历|综合评价|专业技能|证书|$)/i);
    if(m){
      const lines=m[1].split(/\n+/).map(x=>x.trim()).filter(Boolean);
      if(lines.length)return lines.slice(0,4).map(x=>({school:x.replace(/^[-•·]\s*/,''),degree:'',start:'',end:'',raw:x}));
    }
  }
  return [];
}
function normalizeStructuredResume(raw){
  const r=raw&&typeof raw==='object'?raw:{};
  const allowedExp=profile.experiences||[], allowedProj=profile.projects||[];
  const findExp=(x)=>allowedExp.find(e=>normalizeKey(e.company)===normalizeKey(x?.company)&&(!x?.position||normalizeKey(e.position)===normalizeKey(x.position)))||allowedExp.find(e=>normalizeKey(e.company)===normalizeKey(x?.company));
  const findProj=(x)=>allowedProj.find(e=>normalizeKey(e.title)===normalizeKey(x?.title));
  const experiences=(Array.isArray(r.experiences)?r.experiences:[]).map(x=>{const src=findExp(x);if(!src)return null;return {company:src.company,position:src.position,date:dateRange(src.start,src.end,src.current),bullets:Array.isArray(x.bullets)?x.bullets.map(v=>String(v||'').trim()).filter(Boolean).slice(0,6):[]};}).filter(Boolean);
  const projects=(Array.isArray(r.projects)?r.projects:[]).map(x=>{const src=findProj(x);if(!src)return null;return {title:src.title,date:dateRange(src.start,src.end,false),bullets:Array.isArray(x.bullets)?x.bullets.map(v=>String(v||'').trim()).filter(Boolean).slice(0,5):[]};}).filter(Boolean);
  return {
    personal:structuredClone(profile.personal||{}),
    summary:String(r.summary||'').trim(),
    education:fixedEducation(),
    projects,
    experiences,
    skills:uniqueStrings(Array.isArray(r.skills)?r.skills:[]).filter(skill=>profile.skills.some(s=>normalizeKey(s)===normalizeKey(skill)||normalizeKey(skill).includes(normalizeKey(s))||normalizeKey(s).includes(normalizeKey(skill)))).slice(0,14),
    certificates:[...(profile.certificates||[])],
    version:'structured-v5.5'
  };
}
function resumePlainText(r){
  const p=r.personal||{};const lines=[[p.name,p.headline].filter(Boolean).join(' · '), [p.email,p.phone,p.location].filter(Boolean).join(' | '),'', '综合评价',r.summary||''];
  if(r.projects?.length){lines.push('','项目经历');r.projects.forEach(x=>{lines.push(`${x.title}  ${x.date}`,...(x.bullets||[]).map(b=>'• '+b));});}
  if(r.experiences?.length){lines.push('','工作经历');r.experiences.forEach(x=>{lines.push(`${x.company}  ${x.position}  ${x.date}`,...(x.bullets||[]).map(b=>'• '+b));});}
  if(r.education?.length){lines.push('','教育背景');r.education.forEach(x=>lines.push(x.raw||[x.school,x.degree,x.start&&x.end?`${x.start}—${x.end}`:''].filter(Boolean).join(' | ')));}
  if(r.skills?.length)lines.push('','专业技能',r.skills.join(' · '));
  if(r.certificates?.length)lines.push('','证书',r.certificates.join(' · '));
  return lines.filter((x,i)=>x||i===0).join('\n');
}
// 生成结果使用内置的主模板快照，不再通过 resume-template.html URL 读取，避免浏览器缓存/旧 Service Worker 把“主模板”误当成生成结果。
const EMBEDDED_RESUME_TEMPLATE_B64 = 'PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9InpoLUNOIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xIj4KPHRpdGxlPuiOq+almuasoyDCtyBBSeS6p+WTgee7j+eQhiDCtyDnroDljoY8L3RpdGxlPgo8c2NyaXB0IHNyYz0iaHR0cHM6Ly9jZG5qcy5jbG91ZGZsYXJlLmNvbS9hamF4L2xpYnMvaHRtbDJwZGYuanMvMC4xMC4xL2h0bWwycGRmLmJ1bmRsZS5taW4uanMiPjwvc2NyaXB0Pgo8c3R5bGU+CkBwYWdlIHsgc2l6ZTogQTQ7IG1hcmdpbjogMDsgfQoqIHsgbWFyZ2luOiAwOyBwYWRkaW5nOiAwOyBib3gtc2l6aW5nOiBib3JkZXItYm94OyB9Cmh0bWwsIGJvZHkgewogIGJhY2tncm91bmQ6ICNlZWYxZjU7CiAgZm9udC1mYW1pbHk6ICJQaW5nRmFuZyBTQyIsIk1pY3Jvc29mdCBZYUhlaSIsIkhpcmFnaW5vIFNhbnMgR0IiLCJTb3VyY2UgSGFuIFNhbnMgU0MiLCJIZWx2ZXRpY2EgTmV1ZSIsQXJpYWwsc2Fucy1zZXJpZjsKICAtd2Via2l0LWZvbnQtc21vb3RoaW5nOiBhbnRpYWxpYXNlZDsKICBjb2xvcjogIzMzMzsKICBwYWRkaW5nLXRvcDogNTRweDsKfQovKiAtLS0tLS0tLS0tIOW3peWFt+agjyAtLS0tLS0tLS0tICovCi50b29sYmFyIHsKICBwb3NpdGlvbjogZml4ZWQ7IHRvcDogMDsgbGVmdDogMDsgcmlnaHQ6IDA7IHotaW5kZXg6IDk5OTsKICBkaXNwbGF5OiBmbGV4OyBmbGV4LXdyYXA6IHdyYXA7IGFsaWduLWl0ZW1zOiBjZW50ZXI7CiAgZ2FwOiA2cHg7IHBhZGRpbmc6IDlweCAxNnB4OwogIGJhY2tncm91bmQ6IHJnYmEoMjU1LDI1NSwyNTUsLjk2KTsKICBiYWNrZHJvcC1maWx0ZXI6IGJsdXIoMTBweCk7CiAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNlMmU4ZjA7CiAgYm94LXNoYWRvdzogMCAycHggMTJweCByZ2JhKDE4LDM4LDYzLC4wNyk7Cn0KLnRiLXNlcCB7IHdpZHRoOiAxcHg7IGhlaWdodDogMjBweDsgYmFja2dyb3VuZDogI2UyZThmMDsgbWFyZ2luOiAwIDNweDsgfQoudGItYnRuIHsKICB3aWR0aDogMzBweDsgaGVpZ2h0OiAzMHB4OwogIGJvcmRlcjogMXB4IHNvbGlkIHRyYW5zcGFyZW50OyBib3JkZXItcmFkaXVzOiA2cHg7CiAgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7IGN1cnNvcjogcG9pbnRlcjsKICBkaXNwbGF5OiBpbmxpbmUtZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsganVzdGlmeS1jb250ZW50OiBjZW50ZXI7CiAgZm9udC1mYW1pbHk6IGluaGVyaXQ7IGZvbnQtc2l6ZTogMTMuNXB4OyBjb2xvcjogIzMzNDc1YjsKICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kIC4xMnMsIGJvcmRlci1jb2xvciAuMTJzLCBjb2xvciAuMTJzOwp9Ci50Yi1idG46aG92ZXIgeyBiYWNrZ3JvdW5kOiAjZWVmM2Y4OyB9Ci50Yi1idG46YWN0aXZlIHsgYmFja2dyb3VuZDogI2UyZWNmNTsgfQoudGItYnRuLmFjdGl2ZSB7IGJhY2tncm91bmQ6ICNlM2VkZjc7IGJvcmRlci1jb2xvcjogI2M1ZDllYTsgY29sb3I6ICMxZDRlN2M7IH0KLnRiLXNlbGVjdCB7CiAgaGVpZ2h0OiAzMHB4OyBib3JkZXI6IDFweCBzb2xpZCAjZGJlM2VjOyBib3JkZXItcmFkaXVzOiA2cHg7CiAgYmFja2dyb3VuZDogI2ZmZjsgY29sb3I6ICMzMzQ3NWI7CiAgZm9udC1mYW1pbHk6IGluaGVyaXQ7IGZvbnQtc2l6ZTogMTIuNXB4OwogIHBhZGRpbmc6IDAgNnB4OyBjdXJzb3I6IHBvaW50ZXI7IG91dGxpbmU6IG5vbmU7Cn0KLnRiLXNlbGVjdDpob3ZlciB7IGJvcmRlci1jb2xvcjogI2I5Y2RlMDsgfQoudGItc2VsZWN0OmZvY3VzIHsgYm9yZGVyLWNvbG9yOiAjN2JhN2NkOyBib3gtc2hhZG93OiAwIDAgMCAycHggcmdiYSg0NywxMTAsMTY4LC4xMik7IH0KLnRiLWNvbG9yIHsKICB3aWR0aDogMzBweDsgaGVpZ2h0OiAzMHB4OwogIGJvcmRlcjogMXB4IHNvbGlkICNkYmUzZWM7IGJvcmRlci1yYWRpdXM6IDZweDsKICBiYWNrZ3JvdW5kOiAjZmZmOyBjdXJzb3I6IHBvaW50ZXI7IHBhZGRpbmc6IDJweDsKfQoudGItY29sb3I6Oi13ZWJraXQtY29sb3Itc3dhdGNoLXdyYXBwZXIgeyBwYWRkaW5nOiAwOyB9Ci50Yi1jb2xvcjo6LXdlYmtpdC1jb2xvci1zd2F0Y2ggeyBib3JkZXI6IG5vbmU7IGJvcmRlci1yYWRpdXM6IDRweDsgfQoudGItY2hlY2sgewogIGRpc3BsYXk6IGlubGluZS1mbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBnYXA6IDVweDsKICBmb250LXNpemU6IDEyLjVweDsgY29sb3I6ICM0YTVjNmU7IGN1cnNvcjogcG9pbnRlcjsKICBwYWRkaW5nOiAwIDhweDsgaGVpZ2h0OiAzMHB4OyBib3JkZXItcmFkaXVzOiA2cHg7CiAgdXNlci1zZWxlY3Q6IG5vbmU7Cn0KLnRiLWNoZWNrOmhvdmVyIHsgYmFja2dyb3VuZDogI2VlZjNmODsgfQoudGItY2hlY2sgaW5wdXQgeyBjdXJzb3I6IHBvaW50ZXI7IGFjY2VudC1jb2xvcjogIzJmNmVhODsgfQoudGItZXhwb3J0IHsKICBmb250LWZhbWlseTogaW5oZXJpdDsgZm9udC1zaXplOiAxM3B4OyBmb250LXdlaWdodDogNjAwOwogIGNvbG9yOiAjZmZmOyBiYWNrZ3JvdW5kOiBsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLCMyZjZlYTgsIzFkNGU3Yyk7CiAgYm9yZGVyOiBub25lOyBwYWRkaW5nOiAwIDIwcHg7IGhlaWdodDogMzBweDsKICBib3JkZXItcmFkaXVzOiA3cHg7IGN1cnNvcjogcG9pbnRlcjsgbGV0dGVyLXNwYWNpbmc6IC41cHg7CiAgYm94LXNoYWRvdzogMCAzcHggMTBweCByZ2JhKDI5LDc4LDEyNCwuMjYpOwogIHRyYW5zaXRpb246IHRyYW5zZm9ybSAuMTVzLCBib3gtc2hhZG93IC4xNXMsIG9wYWNpdHkgLjE1czsKfQoudGItZXhwb3J0OmhvdmVyIHsgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKC0xcHgpOyBib3gtc2hhZG93OiAwIDVweCAxNHB4IHJnYmEoMjksNzgsMTI0LC4zNCk7IH0KLnRiLWV4cG9ydDpkaXNhYmxlZCB7IG9wYWNpdHk6IC42OyBjdXJzb3I6IHdhaXQ7IHRyYW5zZm9ybTogbm9uZTsgfQovKiAtLS0tLS0tLS0tIEE0IC0tLS0tLS0tLS0gKi8KLnBhZ2UgewogIHdpZHRoOiAyMTBtbTsgaGVpZ2h0OiAyOTdtbTsKICBwYWRkaW5nOiAzNnB4IDQwcHggMzJweDsKICBiYWNrZ3JvdW5kOiAjZmZmOyBtYXJnaW46IDE2cHggYXV0byAyNHB4OwogIG92ZXJmbG93OiBoaWRkZW47IHBvc2l0aW9uOiByZWxhdGl2ZTsKICBmb250LXNpemU6IDEzcHg7IGxpbmUtaGVpZ2h0OiAxLjY7IGNvbG9yOiAjMzMzOwogIGJveC1zaGFkb3c6IDAgNnB4IDMycHggcmdiYSgxOCwzOCw2MywuMTMpOwp9Ci5jb250ZW50IHsgd2lkdGg6IDEwMCU7IG91dGxpbmU6IG5vbmU7IH0KLmhlYWRlciB7IGRpc3BsYXk6IGZsZXg7IGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjsgYWxpZ24taXRlbXM6IGZsZXgtc3RhcnQ7IGdhcDogMjRweDsgbWFyZ2luLWJvdHRvbTogMS4xZW07IH0KLmhlYWQtbWFpbiB7IGZsZXg6IDEgMSBhdXRvOyBtaW4td2lkdGg6IDA7IH0KLm5hbWUgeyBmb250LXNpemU6IDIuMDVlbTsgZm9udC13ZWlnaHQ6IDcwMDsgY29sb3I6ICMxNDMyNGY7IGxldHRlci1zcGFjaW5nOiAzcHg7IGxpbmUtaGVpZ2h0OiAxLjI7IH0KLm1ldGEgeyBtYXJnaW4tdG9wOiAuNDVlbTsgZm9udC1zaXplOiAuOTJlbTsgY29sb3I6ICM1YTZiN2Q7IGRpc3BsYXk6IGZsZXg7IGZsZXgtd3JhcDogd3JhcDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgZ2FwOiAwIDEwcHg7IGxldHRlci1zcGFjaW5nOiAuMnB4OyB9Ci5tZXRhIC5zZXAgeyBjb2xvcjogI2M4ZDJkYzsgfQovKiAtLS0tLS0tLS0tIOivgeS7tueFpyAtLS0tLS0tLS0tICovCi5waG90by1ib3ggewogIHBvc2l0aW9uOiByZWxhdGl2ZTsgd2lkdGg6IDkwcHg7IGhlaWdodDogMTIwcHg7CiAgZmxleDogMCAwIGF1dG87IGJvcmRlcjogMXB4IHNvbGlkICNkM2RiZTQ7IGJvcmRlci1yYWRpdXM6IDNweDsKICBvdmVyZmxvdzogaGlkZGVuOyBiYWNrZ3JvdW5kOiAjZjVmOGZiOyBjdXJzb3I6IHBvaW50ZXI7CiAgdXNlci1zZWxlY3Q6IG5vbmU7IC13ZWJraXQtdXNlci1zZWxlY3Q6IG5vbmU7IHRvdWNoLWFjdGlvbjogbm9uZTsKfQoucGhvdG8tYm94LmVtcHR5IHsgYm9yZGVyLXN0eWxlOiBkYXNoZWQ7IGJvcmRlci1jb2xvcjogI2I5YzZkNDsgfQoucGhvdG8tYm94Lmhhcy1waG90byB7IGN1cnNvcjogZ3JhYjsgfQoucGhvdG8tYm94Lmhhcy1waG90bzphY3RpdmUgeyBjdXJzb3I6IGdyYWJiaW5nOyB9Ci5waG90by1ib3ggY2FudmFzIHsgd2lkdGg6IDEwMCU7IGhlaWdodDogMTAwJTsgZGlzcGxheTogbm9uZTsgfQoucGhvdG8tYm94Lmhhcy1waG90byBjYW52YXMgeyBkaXNwbGF5OiBibG9jazsgfQoucGhvdG8tZW1wdHkgewogIHBvc2l0aW9uOiBhYnNvbHV0ZTsgaW5zZXQ6IDA7CiAgZGlzcGxheTogZmxleDsgZmxleC1kaXJlY3Rpb246IGNvbHVtbjsgYWxpZ24taXRlbXM6IGNlbnRlcjsganVzdGlmeS1jb250ZW50OiBjZW50ZXI7CiAgZ2FwOiA1cHg7IGNvbG9yOiAjOTNhM2I1OyBmb250LXNpemU6IDEwLjVweDsgbGluZS1oZWlnaHQ6IDEuMzU7CiAgdGV4dC1hbGlnbjogY2VudGVyOyBwb2ludGVyLWV2ZW50czogbm9uZTsKfQoucGhvdG8tYm94Lmhhcy1waG90byAucGhvdG8tZW1wdHkgeyBkaXNwbGF5OiBub25lOyB9Ci5waG90by10b29scyB7CiAgcG9zaXRpb246IGFic29sdXRlOyBsZWZ0OiAwOyByaWdodDogMDsgYm90dG9tOiAwOwogIGRpc3BsYXk6IGZsZXg7IGJhY2tncm91bmQ6IHJnYmEoMjAsNTAsNzksLjgyKTsKICBvcGFjaXR5OiAwOyB0cmFuc2l0aW9uOiBvcGFjaXR5IC4xOHM7Cn0KLnBob3RvLWJveDpob3ZlciAucGhvdG8tdG9vbHMgeyBvcGFjaXR5OiAxOyB9Ci5waG90by10b29scyBidXR0b24gewogIGZsZXg6IDEgMSAwOyBib3JkZXI6IG5vbmU7IGJhY2tncm91bmQ6IHRyYW5zcGFyZW50OyBjb2xvcjogI2ZmZjsKICBmb250LWZhbWlseTogaW5oZXJpdDsgZm9udC1zaXplOiAxMC41cHg7IHBhZGRpbmc6IDRweCAwOwogIGN1cnNvcjogcG9pbnRlcjsgbGV0dGVyLXNwYWNpbmc6IC41cHg7Cn0KLnBob3RvLXRvb2xzIGJ1dHRvbjpob3ZlciB7IGJhY2tncm91bmQ6IHJnYmEoMjU1LDI1NSwyNTUsLjIpOyB9Ci8qIC0tLS0tLS0tLS0g56ug6IqCIC0tLS0tLS0tLS0gKi8KLnNlYyB7IG1hcmdpbi1ib3R0b206IDEuMDVlbTsgfQouc2VjOmxhc3QtY2hpbGQgeyBtYXJnaW4tYm90dG9tOiAwOyB9Ci5zZWMtdGl0bGUgewogIGRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGdhcDogLjVlbTsKICBmb250LXNpemU6IDEuMWVtOyBmb250LXdlaWdodDogNzAwOyBjb2xvcjogIzFkNGU3YzsKICBsZXR0ZXItc3BhY2luZzogLjA2ZW07IG1hcmdpbi1ib3R0b206IC41ZW07Cn0KLnNlYy10aXRsZTo6YmVmb3JlIHsKICBjb250ZW50OiAnJzsgZmxleDogMCAwIGF1dG87IHdpZHRoOiA0cHg7IGhlaWdodDogMS4wMmVtOwogIGJvcmRlci1yYWRpdXM6IDJweDsgYmFja2dyb3VuZDogbGluZWFyLWdyYWRpZW50KDE4MGRlZywjM2Y4MWJkLCMxZDRlN2MpOwp9Ci5zZWMtdGl0bGU6OmFmdGVyIHsKICBjb250ZW50OiAnJzsgZmxleDogMSAxIGF1dG87IGhlaWdodDogMXB4OwogIGJhY2tncm91bmQ6IGxpbmVhci1ncmFkaWVudCg5MGRlZywjY2ZkY2VhLHJnYmEoMjA3LDIyMCwyMzQsMCkpOwp9Ci5lbnRyeSB7IG1hcmdpbi1ib3R0b206IC41NWVtOyB9Ci5lbnRyeTpsYXN0LWNoaWxkIHsgbWFyZ2luLWJvdHRvbTogMDsgfQouZW50cnktaGVhZCB7IGRpc3BsYXk6IGZsZXg7IGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjsgYWxpZ24taXRlbXM6IGJhc2VsaW5lOyBnYXA6IDE0cHg7IH0KLmhlYWQtbGVmdCB7IGRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBiYXNlbGluZTsgZ2FwOiAxMHB4OyBmbGV4LXdyYXA6IHdyYXA7IG1pbi13aWR0aDogMDsgfQoub3JnIHsgZm9udC13ZWlnaHQ6IDcwMDsgY29sb3I6ICMxYTJmNDU7IGZvbnQtc2l6ZTogMS4wMmVtOyBsZXR0ZXItc3BhY2luZzogLjJweDsgfQoucm9sZSB7IGNvbG9yOiAjNWE2YjdkOyBmb250LXNpemU6IC45NWVtOyB9Ci5kYXRlIHsgY29sb3I6ICM3YjhhOTk7IGZvbnQtc2l6ZTogLjllbTsgd2hpdGUtc3BhY2U6IG5vd3JhcDsgZm9udC12YXJpYW50LW51bWVyaWM6IHRhYnVsYXItbnVtczsgZmxleDogMCAwIGF1dG87IH0KLmJ1bGxldHMgeyBsaXN0LXN0eWxlOiBub25lOyBtYXJnaW4tdG9wOiAuMjZlbTsgfQouYnVsbGV0cyBsaSB7CiAgcG9zaXRpb246IHJlbGF0aXZlOyBwYWRkaW5nLWxlZnQ6IDEuMDVlbTsgbWFyZ2luLWJvdHRvbTogLjE0ZW07CiAgY29sb3I6ICMzZDRiNTk7IHRleHQtYWxpZ246IGp1c3RpZnk7Cn0KLmJ1bGxldHMgbGk6bGFzdC1jaGlsZCB7IG1hcmdpbi1ib3R0b206IDA7IH0KLmJ1bGxldHMgbGk6OmJlZm9yZSB7CiAgY29udGVudDogJyc7IHBvc2l0aW9uOiBhYnNvbHV0ZTsgbGVmdDogLjNlbTsgdG9wOiAuNjJlbTsKICB3aWR0aDogNHB4OyBoZWlnaHQ6IDRweDsgYm9yZGVyLXJhZGl1czogNTAlOyBiYWNrZ3JvdW5kOiAjOGFhN2M0Owp9Ci5wbGFpbiB7IGNvbG9yOiAjM2Q0YjU5OyB0ZXh0LWFsaWduOiBqdXN0aWZ5OyB9Ci8qIC0tLS0tLS0tLS0g5a+85Ye6IC8g5omT5Y2wIC0tLS0tLS0tLS0gKi8KLnBhZ2UuZXhwb3J0aW5nIC5waG90by10b29scywKLnBhZ2UuZXhwb3J0aW5nIC5waG90by1lbXB0eSB7IGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDsgfQoucGFnZSB7IGJyZWFrLWFmdGVyOiBhdm9pZC1wYWdlOyBwYWdlLWJyZWFrLWFmdGVyOiBhdm9pZDsgYnJlYWstaW5zaWRlOiBhdm9pZDsgcGFnZS1icmVhay1pbnNpZGU6IGF2b2lkOyB9CkBtZWRpYSBwcmludCB7IGh0bWwsIGJvZHkgeyB3aWR0aDogMjEwbW07IG1pbi1oZWlnaHQ6IDI5N21tOyB9IC5wYWdlIHsgaGVpZ2h0OiAyOTYuOG1tOyBtaW4taGVpZ2h0OiAyOTYuOG1tOyBvdmVyZmxvdzogaGlkZGVuOyB9IH0KQG1lZGlhIHByaW50IHsKICBib2R5IHsgYmFja2dyb3VuZDogI2ZmZjsgcGFkZGluZy10b3A6IDAgIWltcG9ydGFudDsgfQogIC50b29sYmFyIHsgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50OyB9CiAgLnBhZ2UgeyBtYXJnaW46IDA7IGJveC1zaGFkb3c6IG5vbmU7IGhlaWdodDogMjk2LjltbTsgYnJlYWstYWZ0ZXI6IGF2b2lkICFpbXBvcnRhbnQ7IHBhZ2UtYnJlYWstYWZ0ZXI6IGF2b2lkICFpbXBvcnRhbnQ7IH0KICAucGhvdG8tdG9vbHMsIC5waG90by1lbXB0eSB7IGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDsgfQp9Cjwvc3R5bGU+CjwvaGVhZD4KPGJvZHk+Cgo8IS0tID09PT09PT09PT09PT09PT09PT09IOW3peWFt+agjyA9PT09PT09PT09PT09PT09PT09PSAtLT4KPGRpdiBjbGFzcz0idG9vbGJhciIgaWQ9InRvb2xiYXIiPgoKICA8c2VsZWN0IGNsYXNzPSJ0Yi1zZWxlY3QiIGlkPSJmb250RmFtaWx5U2VsIiB0aXRsZT0i5a2X5L2TIiBzdHlsZT0id2lkdGg6MTE4cHgiPgogICAgPG9wdGlvbiB2YWx1ZT0iIj7pu5jorqTlrZfkvZM8L29wdGlvbj4KICAgIDxvcHRpb24gdmFsdWU9IlBpbmdGYW5nIFNDIj7oi7nmlrk8L29wdGlvbj4KICAgIDxvcHRpb24gdmFsdWU9Ik1pY3Jvc29mdCBZYUhlaSI+5b6u6L2v6ZuF6buRPC9vcHRpb24+CiAgICA8b3B0aW9uIHZhbHVlPSJTaW1IZWkiPum7keS9kzwvb3B0aW9uPgogICAgPG9wdGlvbiB2YWx1ZT0iU2ltU3VuIj7lrovkvZM8L29wdGlvbj4KICAgIDxvcHRpb24gdmFsdWU9IkthaVRpIj7mpbfkvZM8L29wdGlvbj4KICAgIDxvcHRpb24gdmFsdWU9IlNvdXJjZSBIYW4gU2FucyBTQyI+5oCd5rqQ6buR5L2TPC9vcHRpb24+CiAgICA8b3B0aW9uIHZhbHVlPSJBcmlhbCI+QXJpYWw8L29wdGlvbj4KICAgIDxvcHRpb24gdmFsdWU9IlRpbWVzIE5ldyBSb21hbiI+VGltZXM8L29wdGlvbj4KICAgIDxvcHRpb24gdmFsdWU9Ikdlb3JnaWEiPkdlb3JnaWE8L29wdGlvbj4KICA8L3NlbGVjdD4KCiAgPHNlbGVjdCBjbGFzcz0idGItc2VsZWN0IiBpZD0iZm9udFNpemVTZWwiIHRpdGxlPSLlrZflj7ciIHN0eWxlPSJ3aWR0aDo3NnB4Ij4KICAgIDxvcHRpb24gdmFsdWU9ImF1dG8iPuiHquWKqDwvb3B0aW9uPgogICAgPG9wdGlvbiB2YWx1ZT0iMTAiPjEwPC9vcHRpb24+CiAgICA8b3B0aW9uIHZhbHVlPSIxMSI+MTE8L29wdGlvbj4KICAgIDxvcHRpb24gdmFsdWU9IjEyIj4xMjwvb3B0aW9uPgogICAgPG9wdGlvbiB2YWx1ZT0iMTMiPjEzPC9vcHRpb24+CiAgICA8b3B0aW9uIHZhbHVlPSIxNCI+MTQ8L29wdGlvbj4KICAgIDxvcHRpb24gdmFsdWU9IjE1Ij4xNTwvb3B0aW9uPgogICAgPG9wdGlvbiB2YWx1ZT0iMTYiPjE2PC9vcHRpb24+CiAgICA8b3B0aW9uIHZhbHVlPSIxOCI+MTg8L29wdGlvbj4KICAgIDxvcHRpb24gdmFsdWU9IjIwIj4yMDwvb3B0aW9uPgogICAgPG9wdGlvbiB2YWx1ZT0iMjIiPjIyPC9vcHRpb24+CiAgICA8b3B0aW9uIHZhbHVlPSIyNCI+MjQ8L29wdGlvbj4KICA8L3NlbGVjdD4KCiAgPHNwYW4gY2xhc3M9InRiLXNlcCI+PC9zcGFuPgoKICA8YnV0dG9uIGNsYXNzPSJ0Yi1idG4iIHR5cGU9ImJ1dHRvbiIgZGF0YS1jbWQ9ImJvbGQiIHRpdGxlPSLliqDnspcg4oyYQiI+PGI+QjwvYj48L2J1dHRvbj4KICA8YnV0dG9uIGNsYXNzPSJ0Yi1idG4iIHR5cGU9ImJ1dHRvbiIgZGF0YS1jbWQ9Iml0YWxpYyIgdGl0bGU9IuaWnOS9kyDijJhJIj48aT5JPC9pPjwvYnV0dG9uPgogIDxidXR0b24gY2xhc3M9InRiLWJ0biIgdHlwZT0iYnV0dG9uIiBkYXRhLWNtZD0idW5kZXJsaW5lIiB0aXRsZT0i5LiL5YiS57q/IOKMmFUiPjx1PlU8L3U+PC9idXR0b24+CgogIDxzcGFuIGNsYXNzPSJ0Yi1zZXAiPjwvc3Bhbj4KCiAgPGlucHV0IGNsYXNzPSJ0Yi1jb2xvciIgdHlwZT0iY29sb3IiIGlkPSJmb250Q29sb3IiIHZhbHVlPSIjMzMzMzMzIiB0aXRsZT0i5paH5a2X6aKc6ImyIj4KICA8aW5wdXQgY2xhc3M9InRiLWNvbG9yIiB0eXBlPSJjb2xvciIgaWQ9ImhsQ29sb3IiIHZhbHVlPSIjZmZmMmE4IiB0aXRsZT0i6auY5Lqu6IOM5pmvIj4KCiAgPHNwYW4gY2xhc3M9InRiLXNlcCI+PC9zcGFuPgoKICA8IS0tIOWvuem9kOaMiemSriAtLT4KICA8YnV0dG9uIGNsYXNzPSJ0Yi1idG4iIHR5cGU9ImJ1dHRvbiIgZGF0YS1jbWQ9Imp1c3RpZnlMZWZ0IiB0aXRsZT0i5bem5a+56b2QIj4KICAgIDxzdmcgd2lkdGg9IjE1IiBoZWlnaHQ9IjE1IiB2aWV3Qm94PSIwIDAgMTYgMTYiIGZpbGw9ImN1cnJlbnRDb2xvciI+PHJlY3QgeD0iMSIgeT0iMi41IiB3aWR0aD0iMTQiIGhlaWdodD0iMS41IiByeD0iLjc1Ii8+PHJlY3QgeD0iMSIgeT0iNiIgd2lkdGg9IjkiIGhlaWdodD0iMS41IiByeD0iLjc1Ii8+PHJlY3QgeD0iMSIgeT0iOS41IiB3aWR0aD0iMTQiIGhlaWdodD0iMS41IiByeD0iLjc1Ii8+PHJlY3QgeD0iMSIgeT0iMTMiIHdpZHRoPSI5IiBoZWlnaHQ9IjEuNSIgcng9Ii43NSIvPjwvc3ZnPgogIDwvYnV0dG9uPgogIDxidXR0b24gY2xhc3M9InRiLWJ0biIgdHlwZT0iYnV0dG9uIiBkYXRhLWNtZD0ianVzdGlmeUNlbnRlciIgdGl0bGU9IuWxheS4rSI+CiAgICA8c3ZnIHdpZHRoPSIxNSIgaGVpZ2h0PSIxNSIgdmlld0JveD0iMCAwIDE2IDE2IiBmaWxsPSJjdXJyZW50Q29sb3IiPjxyZWN0IHg9IjEiIHk9IjIuNSIgd2lkdGg9IjE0IiBoZWlnaHQ9IjEuNSIgcng9Ii43NSIvPjxyZWN0IHg9IjMuNSIgeT0iNiIgd2lkdGg9IjkiIGhlaWdodD0iMS41IiByeD0iLjc1Ii8+PHJlY3QgeD0iMSIgeT0iOS41IiB3aWR0aD0iMTQiIGhlaWdodD0iMS41IiByeD0iLjc1Ii8+PHJlY3QgeD0iMy41IiB5PSIxMyIgd2lkdGg9IjkiIGhlaWdodD0iMS41IiByeD0iLjc1Ii8+PC9zdmc+CiAgPC9idXR0b24+CiAgPGJ1dHRvbiBjbGFzcz0idGItYnRuIiB0eXBlPSJidXR0b24iIGRhdGEtY21kPSJqdXN0aWZ5UmlnaHQiIHRpdGxlPSLlj7Plr7npvZAiPgogICAgPHN2ZyB3aWR0aD0iMTUiIGhlaWdodD0iMTUiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iY3VycmVudENvbG9yIj48cmVjdCB4PSIxIiB5PSIyLjUiIHdpZHRoPSIxNCIgaGVpZ2h0PSIxLjUiIHJ4PSIuNzUiLz48cmVjdCB4PSI2IiB5PSI2IiB3aWR0aD0iOSIgaGVpZ2h0PSIxLjUiIHJ4PSIuNzUiLz48cmVjdCB4PSIxIiB5PSI5LjUiIHdpZHRoPSIxNCIgaGVpZ2h0PSIxLjUiIHJ4PSIuNzUiLz48cmVjdCB4PSI2IiB5PSIxMyIgd2lkdGg9IjkiIGhlaWdodD0iMS41IiByeD0iLjc1Ii8+PC9zdmc+CiAgPC9idXR0b24+CiAgPGJ1dHRvbiBjbGFzcz0idGItYnRuIiB0eXBlPSJidXR0b24iIGRhdGEtY21kPSJqdXN0aWZ5RnVsbCIgdGl0bGU9IuS4pOerr+Wvuem9kCI+CiAgICA8c3ZnIHdpZHRoPSIxNSIgaGVpZ2h0PSIxNSIgdmlld0JveD0iMCAwIDE2IDE2IiBmaWxsPSJjdXJyZW50Q29sb3IiPjxyZWN0IHg9IjEiIHk9IjIuNSIgd2lkdGg9IjE0IiBoZWlnaHQ9IjEuNSIgcng9Ii43NSIvPjxyZWN0IHg9IjEiIHk9IjYiIHdpZHRoPSIxNCIgaGVpZ2h0PSIxLjUiIHJ4PSIuNzUiLz48cmVjdCB4PSIxIiB5PSI5LjUiIHdpZHRoPSIxNCIgaGVpZ2h0PSIxLjUiIHJ4PSIuNzUiLz48cmVjdCB4PSIxIiB5PSIxMyIgd2lkdGg9IjE0IiBoZWlnaHQ9IjEuNSIgcng9Ii43NSIvPjwvc3ZnPgogIDwvYnV0dG9uPgoKICA8c3BhbiBjbGFzcz0idGItc2VwIj48L3NwYW4+CgogIDxzZWxlY3QgY2xhc3M9InRiLXNlbGVjdCIgaWQ9ImxpbmVIZWlnaHRTZWwiIHRpdGxlPSLooYzot50iIHN0eWxlPSJ3aWR0aDo5NnB4Ij4KICAgIDxvcHRpb24gdmFsdWU9IjEuNCI+6KGM6LedIDEuNDwvb3B0aW9uPgogICAgPG9wdGlvbiB2YWx1ZT0iMS42IiBzZWxlY3RlZD7ooYzot50gMS42PC9vcHRpb24+CiAgICA8b3B0aW9uIHZhbHVlPSIxLjgiPuihjOi3nSAxLjg8L29wdGlvbj4KICAgIDxvcHRpb24gdmFsdWU9IjIuMCI+6KGM6LedIDIuMDwvb3B0aW9uPgogIDwvc2VsZWN0PgoKICA8c3BhbiBjbGFzcz0idGItc2VwIj48L3NwYW4+CgogIDwhLS0g5riF6Zmk5qC85byPIC0tPgogIDxidXR0b24gY2xhc3M9InRiLWJ0biIgdHlwZT0iYnV0dG9uIiBpZD0iY2xlYXJGb3JtYXRCdG4iIHRpdGxlPSLmuIXpmaTpgInkuK3lhoXlrrnnmoTmoLzlvI8iPgogICAgPHN2ZyB3aWR0aD0iMTUiIGhlaWdodD0iMTUiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPgogICAgICA8cGF0aCBkPSJNOS41IDIuNSAyLjUgOS41YTEuNSAxLjUgMCAwIDAgMCAyLjFsMS45IDEuOWExLjUgMS41IDAgMCAwIDIuMSAwbDctN2ExLjUgMS41IDAgMCAwIDAtMi4xbC0xLjktMS45YTEuNSAxLjUgMCAwIDAtMi4xIDB6Ii8+CiAgICAgIDxwYXRoIGQ9Ik02IDZsNCA0Ii8+CiAgICAgIDxwYXRoIGQ9Ik03LjUgMTMuNWg3Ii8+CiAgICA8L3N2Zz4KICA8L2J1dHRvbj4KCiAgPGJ1dHRvbiBjbGFzcz0idGItYnRuIiB0eXBlPSJidXR0b24iIGlkPSJ1bmRvQnRuIiB0aXRsZT0i5pKk6ZSAIOKMmFoiPgogICAgPHN2ZyB3aWR0aD0iMTUiIGhlaWdodD0iMTUiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS42IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0zIDYuNWg2LjVhMy41IDMuNSAwIDAgMSAwIDdINyIvPjxwYXRoIGQ9Ik01LjUgNCAzIDYuNSA1LjUgOSIvPjwvc3ZnPgogIDwvYnV0dG9uPgogIDxidXR0b24gY2xhc3M9InRiLWJ0biIgdHlwZT0iYnV0dG9uIiBpZD0icmVkb0J0biIgdGl0bGU9IumHjeWBmiDijJjih6daIj4KICAgIDxzdmcgd2lkdGg9IjE1IiBoZWlnaHQ9IjE1IiB2aWV3Qm94PSIwIDAgMTYgMTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTMgNi41SDYuNWEzLjUgMy41IDAgMCAwIDAgN0g5Ii8+PHBhdGggZD0iTTEwLjUgNCAxMyA2LjUgMTAuNSA5Ii8+PC9zdmc+CiAgPC9idXR0b24+CgogIDxzcGFuIGNsYXNzPSJ0Yi1zZXAiPjwvc3Bhbj4KCiAgPGxhYmVsIGNsYXNzPSJ0Yi1jaGVjayIgdGl0bGU9IuWLvumAieWQjuiHquWKqOiwg+aVtOWtl+WPt+Whq+a7oeS4gOmhte+8m+aJi+WKqOaUueWtl+WPt+S8muiHquWKqOWPlua2iCI+CiAgICA8aW5wdXQgdHlwZT0iY2hlY2tib3giIGlkPSJhdXRvRml0VG9nZ2xlIiBjaGVja2VkPiDoh6rliqjpk7rmu6EKICA8L2xhYmVsPgoKICA8YnV0dG9uIGNsYXNzPSJ0Yi1leHBvcnQiIHR5cGU9ImJ1dHRvbiIgaWQ9ImV4cG9ydEJ0biI+5a+85Ye6IFBERjwvYnV0dG9uPgo8L2Rpdj4KCjwhLS0gPT09PT09PT09PT09PT09PT09PT0gQTQg566A5Y6GID09PT09PT09PT09PT09PT09PT09IC0tPgo8ZGl2IGNsYXNzPSJwYWdlIiBpZD0icGFnZSI+CiAgPGRpdiBjbGFzcz0iY29udGVudCIgaWQ9ImNvbnRlbnQiIGNvbnRlbnRlZGl0YWJsZT0idHJ1ZSIgc3BlbGxjaGVjaz0iZmFsc2UiPgoKICAgIDxoZWFkZXIgY2xhc3M9ImhlYWRlciI+CiAgICAgIDxkaXYgY2xhc3M9ImhlYWQtbWFpbiI+CiAgICAgICAgPGgxIGNsYXNzPSJuYW1lIj7ojqvmpZrmrKM8L2gxPgogICAgICAgIDxkaXYgY2xhc3M9Im1ldGEiPgogICAgICAgICAgPHNwYW4+MjAwMi4xMTwvc3Bhbj4KICAgICAgICAgIDxzcGFuIGNsYXNzPSJzZXAiPnw8L3NwYW4+CiAgICAgICAgICA8c3Bhbj4xNTgxMjgwMDI5NDwvc3Bhbj4KICAgICAgICAgIDxzcGFuIGNsYXNzPSJzZXAiPnw8L3NwYW4+CiAgICAgICAgICA8c3Bhbj5tb2NodXhpbjhAMTYzLmNvbTwvc3Bhbj4KICAgICAgICA8L2Rpdj4KICAgICAgPC9kaXY+CgogICAgICA8ZGl2IGNsYXNzPSJwaG90by1ib3ggZW1wdHkiIGlkPSJwaG90b0JveCIgY29udGVudGVkaXRhYmxlPSJmYWxzZSI+CiAgICAgICAgPGNhbnZhcyBpZD0icGhvdG9DYW52YXMiIHdpZHRoPSIxODAiIGhlaWdodD0iMjQwIj48L2NhbnZhcz4KICAgICAgICA8ZGl2IGNsYXNzPSJwaG90by1lbXB0eSI+CiAgICAgICAgICA8c3ZnIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjIyIiBoZWlnaHQ9IjIyIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CiAgICAgICAgICAgIDxyZWN0IHg9IjMiIHk9IjQiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxNiIgcng9IjIiLz4KICAgICAgICAgICAgPGNpcmNsZSBjeD0iOC41IiBjeT0iOS41IiByPSIxLjgiLz4KICAgICAgICAgICAgPHBhdGggZD0iTTIxIDE2bC01LTUtNiA2LTMtMy00IDQiLz4KICAgICAgICAgIDwvc3ZnPgogICAgICAgICAgPHNwYW4+54K55Ye75LiK5LygPGJyPuivgeS7tueFpzwvc3Bhbj4KICAgICAgICA8L2Rpdj4KICAgICAgICA8ZGl2IGNsYXNzPSJwaG90by10b29scyIgaWQ9InBob3RvVG9vbHMiPgogICAgICAgICAgPGJ1dHRvbiB0eXBlPSJidXR0b24iIGRhdGEtYWN0PSJyZXBsYWNlIj7mm7TmjaI8L2J1dHRvbj4KICAgICAgICAgIDxidXR0b24gdHlwZT0iYnV0dG9uIiBkYXRhLWFjdD0iZGVsZXRlIj7liKDpmaQ8L2J1dHRvbj4KICAgICAgICA8L2Rpdj4KICAgICAgPC9kaXY+CiAgICA8L2hlYWRlcj4KCiAgICA8c2VjdGlvbiBjbGFzcz0ic2VjIj4KICAgICAgPGgyIGNsYXNzPSJzZWMtdGl0bGUiPuaVmeiCsuiDjOaZrzwvaDI+CiAgICAgIDxkaXYgY2xhc3M9ImVudHJ5Ij4KICAgICAgICA8ZGl2IGNsYXNzPSJlbnRyeS1oZWFkIj4KICAgICAgICAgIDxkaXYgY2xhc3M9ImhlYWQtbGVmdCI+CiAgICAgICAgICAgIDxzcGFuIGNsYXNzPSJvcmciPuW5v+W3nuWfjuW4gueQhuW3peWtpumZojwvc3Bhbj4KICAgICAgICAgICAgPHNwYW4gY2xhc3M9InJvbGUiPue7j+a1jue7n+iuoeWtpiDCtyDmnKznp5E8L3NwYW4+CiAgICAgICAgICA8L2Rpdj4KICAgICAgICAgIDxzcGFuIGNsYXNzPSJkYXRlIj4yMDIwLjA5IC0gMjAyNC4wNjwvc3Bhbj4KICAgICAgICA8L2Rpdj4KICAgICAgPC9kaXY+CiAgICA8L3NlY3Rpb24+CgogICAgPHNlY3Rpb24gY2xhc3M9InNlYyI+CiAgICAgIDxoMiBjbGFzcz0ic2VjLXRpdGxlIj7nu7zlkIjor4Tku7c8L2gyPgogICAgICA8ZGl2IGNsYXNzPSJwbGFpbiI+QUkg5Y6f55Sf5Lqn5ZOB5p6E5bu66ICF77yM5LiT5rOo5LqOIEFJIOS6p+WTgeS7jiAw4oaSMSDni6znq4vokL3lnLDkuI4gVmliZUNvZGluZyDlrp7ot7XjgILlhbflpIflhajmoIjlvIDlj5Hog73lipvvvIzmm77ni6znq4vlrozmiJAgQ2FyZWVyRml0IOS4jiBNWTFNIOS4pOWkp+S6p+WTgeeahOWFqOeUn+WRveWRqOacn+euoeeQhu+8jOa2teeblumcgOaxguaLhuino+OAgeS6pOS6kuiuvuiuoeOAgUFJIOi+heWKqee8lueggeWPiiBQV0Eg6YOo572y44CC5pOF6ZW/5bCG5aSn5qih5Z6L6IO95Yqb5Lqn5ZOB5YyW77yM6K6+6K6h5aSaIEFJIFByb3ZpZGVyIOaOpeWFpeacuuWItuWPiuW8guW4uOWkhOeQhua1geeoi+OAguaLpeacieaVsOaNrumpseWKqOWGs+etluiDjOaZr++8jOiDvemAmui/h+WumumHjyAvIOWumuaAp+WIhuaekOeyvuWHhuivhuWIq+eUqOaIt+eXm+eCueW5tuS8mOWMluS6p+WTgemXreeOr++8jOWFt+Wkh+aegeW8uueahOaJp+ihjOWKm+S4juaKgOacr+i+ueeVjOiupOefpeOAgjwvZGl2PgogICAgPC9zZWN0aW9uPgoKICAgIDxzZWN0aW9uIGNsYXNzPSJzZWMiPgogICAgICA8aDIgY2xhc3M9InNlYy10aXRsZSI+6aG555uu57uP5Y6GPC9oMj4KCiAgICAgIDxkaXYgY2xhc3M9ImVudHJ5Ij4KICAgICAgICA8ZGl2IGNsYXNzPSJlbnRyeS1oZWFkIj4KICAgICAgICAgIDxkaXYgY2xhc3M9ImhlYWQtbGVmdCI+CiAgICAgICAgICAgIDxzcGFuIGNsYXNzPSJvcmciPkNhcmVlckZpdDwvc3Bhbj4KICAgICAgICAgICAgPHNwYW4gY2xhc3M9InJvbGUiPkFJIOeugOWOhumHjeaehOS6p+WTgSDCtyDni6znq4vlvIDlj5E8L3NwYW4+CiAgICAgICAgICA8L2Rpdj4KICAgICAgICAgIDxzcGFuIGNsYXNzPSJkYXRlIj4yMDI2LjA5PC9zcGFuPgogICAgICAgIDwvZGl2PgogICAgICAgIDx1bCBjbGFzcz0iYnVsbGV0cyI+CiAgICAgICAgICA8bGk+54us56uL5a6M5oiQIEFJIOeugOWOhumHjeaehOS6p+WTgSAwLTEg6JC95Zyw77yM5pCt5bu644CM6IGM5Lia57uP5Y6GIOKGkiBKRCDliIbmnpAg4oaSIOiDveWKm+WMuemFjSDihpIg566A5Y6G6YeN5p6E44CN5a6M5pW05rWB56iL77yM6Kej5Yaz6Leo6KGM5Lia6IO95Yqb6K+G5Yir55eb54K5PC9saT4KICAgICAgICAgIDxsaT7ln7rkuo4gVmliZUNvZGluZyAvIEFJIOi+heWKqeW8gOWPkeaooeW8j++8jOWunueOsCBQREYgLyBET0NYIOino+aekOOAgUpEIOaIquWbvuivhuWIq+WPiuWkmueJiOacrOeugOWOhueUn+aIkO+8jOmrmOaViOWujOaIkOS7o+eggeWunueOsOS4juWKn+iDvemqjOivgTwvbGk+CiAgICAgICAgICA8bGk+6K6+6K6h5aSaIEFJIFByb3ZpZGVyIOaOpeWFpeacuuWItu+8jOaUr+aMgeeUqOaIt+iHquS4u+mFjee9ruOAgea1i+ivleWPiuWIh+aNoiBBSSBBUEnvvIzlsIblpKfmqKHlnovog73lipvovazljJbkuLrlj6/kuqTku5jjgIHlj6/mvJTnpLrnmoTkuqflk4Hlip/og708L2xpPgogICAgICAgICAgPGxpPumSiOWvuSBBSSDkuqTkupLkuK3nmoTnrYnlvoXml6Dlj43ppojjgIHph43lpI3or7fmsYLlj4rnlJ/miJDlpLHotKXpl67popjvvIzorr7orqEgTG9hZGluZyDnirbmgIHjgIHplJnor6/lj43ppojlj4rlsYDpg6jph43or5XmnLrliLbvvIzmj5DljYfkuqflk4HnqLPlrprmgKfkuI7nlKjmiLfkvZPpqow8L2xpPgogICAgICAgICAgPGxpPuaMgee7rei/reS7o+eJiOacrO+8jOWujOaIkCBHaXRIdWIgUGFnZXMg6YOo572y77yM5a6e546w5LuO6ZyA5rGC5a6a5LmJ5Yiw5LiK57q/6Zet546v55qE5b+r6YCf5Lqn5ZOB6L+t5LujPC9saT4KICAgICAgICA8L3VsPgogICAgICA8L2Rpdj4KCiAgICAgIDxkaXYgY2xhc3M9ImVudHJ5Ij4KICAgICAgICA8ZGl2IGNsYXNzPSJlbnRyeS1oZWFkIj4KICAgICAgICAgIDxkaXYgY2xhc3M9ImhlYWQtbGVmdCI+CiAgICAgICAgICAgIDxzcGFuIGNsYXNzPSJvcmciPk1ZMU08L3NwYW4+CiAgICAgICAgICAgIDxzcGFuIGNsYXNzPSJyb2xlIj7kuKrkurrlh4DotYTkuqfov73ouKogUFdBIMK3IOeLrOeri+W8gOWPkTwvc3Bhbj4KICAgICAgICAgIDwvZGl2PgogICAgICAgICAgPHNwYW4gY2xhc3M9ImRhdGUiPjIwMjYuMDk8L3NwYW4+CiAgICAgICAgPC9kaXY+CiAgICAgICAgPHVsIGNsYXNzPSJidWxsZXRzIj4KICAgICAgICAgIDxsaT7pkojlr7nkvKDnu5/orrDotKblt6Xlhbfnl5vngrnvvIzni6znq4vorr7orqHlubblvIDlj5HkuKrkurrlh4DotYTkuqfov73ouKogUFdB77yM5bu656uL4oCc6LWE5Lqn6K6w5b2VIOKAlCDmnIjluqbmm7TmlrAg4oCUIOi2i+WKv+i/vei4qiDigJQg55uu5qCH6L6+5oiQ4oCd5Lqn5ZOB6Zet546vPC9saT4KICAgICAgICAgIDxsaT7pgJrov4cgVmliZUNvZGluZyArIEFJIOi+heWKqeWujOaIkOS7o+eggeeUn+aIkOOAgUJ1ZyDmjpLmn6Xlj4ogMyDova7kuqflk4Hov63ku6PvvIzorr7orqHigJzliIbnsbvlu7bnu63jgIHph5Hpop3ph43nva7igJ3mnLrliLbpmY3kvY7nlKjmiLflvZXlhaXmiJDmnKw8L2xpPgogICAgICAgICAgPGxpPuWunueOsCBQQyAvIGlQaG9uZSDlpJrnq6/mlK/mjIHjgIHkuK3oi7HmlofliIfmjaLlj4rnlJ/nianor4bliKvop6PplIHlip/og73vvIzmiJDlip/pg6jnvbLkuo4gR2l0SHViIFBhZ2Vz77yM5a6M5oiQIDDihpIxIOS6p+WTgeS4iue6v+iQveWcsDwvbGk+CiAgICAgICAgPC91bD4KICAgICAgPC9kaXY+CiAgICA8L3NlY3Rpb24+CgogICAgPHNlY3Rpb24gY2xhc3M9InNlYyI+CiAgICAgIDxoMiBjbGFzcz0ic2VjLXRpdGxlIj7lt6XkvZznu4/ljoY8L2gyPgoKICAgICAgPGRpdiBjbGFzcz0iZW50cnkiPgogICAgICAgIDxkaXYgY2xhc3M9ImVudHJ5LWhlYWQiPgogICAgICAgICAgPGRpdiBjbGFzcz0iaGVhZC1sZWZ0Ij4KICAgICAgICAgICAgPHNwYW4gY2xhc3M9Im9yZyI+5rex5Zyz5biC6ZW/6Z+z55S15a2Q5pyJ6ZmQ5YWs5Y+4PC9zcGFuPgogICAgICAgICAgICA8c3BhbiBjbGFzcz0icm9sZSI+5aSW6LS45Lia5Yqh5ZGYPC9zcGFuPgogICAgICAgICAgPC9kaXY+CiAgICAgICAgICA8c3BhbiBjbGFzcz0iZGF0ZSI+MjAyNi4wNCAtIDIwMjYuMDc8L3NwYW4+CiAgICAgICAgPC9kaXY+CiAgICAgICAgPHVsIGNsYXNzPSJidWxsZXRzIj4KICAgICAgICAgIDxsaT7pgJrov4foh6rkuLvlvIDlj5HlrqLmiLflj4rkuozmrKHmv4DmtLvnrZbnlaXvvIzmiJDlip/kv4PmiJDorqLljZXlubblrp7njrAgNTAlIOeahOivouebmOi9rOWMlueOh++8jOS9k+eOsOS4u+WKqOWei+WuouaIt+iOt+WPluS4jumrmOaJp+ihjOWKm+iQveWcsOiDveWKmzwvbGk+CiAgICAgICAgPC91bD4KICAgICAgPC9kaXY+CgogICAgICA8ZGl2IGNsYXNzPSJlbnRyeSI+CiAgICAgICAgPGRpdiBjbGFzcz0iZW50cnktaGVhZCI+CiAgICAgICAgICA8ZGl2IGNsYXNzPSJoZWFkLWxlZnQiPgogICAgICAgICAgICA8c3BhbiBjbGFzcz0ib3JnIj7lub/kuJzpooboiKrljIXoo4XlvanljbDmnInpmZDlhazlj7g8L3NwYW4+CiAgICAgICAgICAgIDxzcGFuIGNsYXNzPSJyb2xlIj7lpJbotLjkuJrliqHlkZg8L3NwYW4+CiAgICAgICAgICA8L2Rpdj4KICAgICAgICAgIDxzcGFuIGNsYXNzPSJkYXRlIj4yMDI0LjA0IC0gMjAyNi4wMzwvc3Bhbj4KICAgICAgICA8L2Rpdj4KICAgICAgICA8dWwgY2xhc3M9ImJ1bGxldHMiPgogICAgICAgICAgPGxpPuW/q+mAn+WTjeW6lOWuouaIt+mcgOaxgu+8jOivouebmOi9rOWMlueOh+i+viA3MCXvvJvpgJrov4flrqLmiLflhbPns7vnu7TmiqTlrp7njrDogIHlrqLmiLflpI3otK3njocgNDAlIOS7peS4iu+8jOWFt+Wkh+aVj+mUkOeahOWuouaIt+WcuuaZr+iQveWcsOS4jueXm+eCueaMluaOmOiDveWKmzwvbGk+CiAgICAgICAgICA8bGk+5YWo56iL6Lef6L+b6K6i5Y2V5YWo5rWB56iL77yI6K+i5Lu344CB5oql5Lu344CB5qih5Z6L5Zu+5Yi25L2c44CB5omT5qC344CB55Sf5Lqn44CB5Y+R6LSn77yJ77yM56Gu5L+d5oyJ5pe25Lqk5LuY77yM5bGV546w5aSN5p2C5Lia5Yqh5rWB56iL566h55CG5LiO6Leo6YOo6Zeo5Y2P6LCD5omn6KGM5YqbPC9saT4KICAgICAgICAgIDxsaT7ku47pm7bmkK3lu7rlubbov5DokKXlm73pmYXnq5nlupfpk7rvvIzlrozmiJAgMTAwMCDmnaHkuqflk4HkuIrmnrblj4rkuLvlm74gLyDor6bmg4XpobXkvJjljJbvvIzlhbflpIfku44gMCDliLAgMSDmkK3lu7rkuJrliqHkvZPns7vlj4rlhoXlrrnov5DokKXnmoTpl63njq/og73lips8L2xpPgogICAgICAgIDwvdWw+CiAgICAgIDwvZGl2PgoKICAgICAgPGRpdiBjbGFzcz0iZW50cnkiPgogICAgICAgIDxkaXYgY2xhc3M9ImVudHJ5LWhlYWQiPgogICAgICAgICAgPGRpdiBjbGFzcz0iaGVhZC1sZWZ0Ij4KICAgICAgICAgICAgPHNwYW4gY2xhc3M9Im9yZyI+5bm/5bee5piT5a+f5biC5Zy656CU56m25pyJ6ZmQ5YWs5Y+4PC9zcGFuPgogICAgICAgICAgICA8c3BhbiBjbGFzcz0icm9sZSI+5pWw5o2u5YiG5p6Q5a6e5Lmg55SfPC9zcGFuPgogICAgICAgICAgPC9kaXY+CiAgICAgICAgICA8c3BhbiBjbGFzcz0iZGF0ZSI+MjAyMy4xMiAtIDIwMjQuMDM8L3NwYW4+CiAgICAgICAgPC9kaXY+CiAgICAgICAgPHVsIGNsYXNzPSJidWxsZXRzIj4KICAgICAgICAgIDxsaT7miafooYwgMTAwMDAg5p2h5raI6LS56ICF5pWw5o2u55qE5a6a6YeP5LiO5a6a5oCn5YiG5p6Q77yM57K+5YeG6K+G5Yir5LiN5ZCM55So5oi3576k5L2T6ZyA5rGC54m55b6B77yM5Li65Lqn5ZOB5a6a5L2N5LiO5rS75Yqo562W5YiS5o+Q5L6b5pWw5o2u6amx5Yqo55qE5Yaz562W5pSv5oyBPC9saT4KICAgICAgICAgIDxsaT7ni6znq4vlrozmiJAgNTAwMCDmnaHmlbDmja7muIXmtJfjgIHmoIfms6jlj4rliIbmnpDvvIzmj5DngrzovazljJbop4Tlvovlubbmj5Dlh7rkvJjljJbmlrnlkJHvvIzlhbflpIfln7rkuo7mlbDmja7lj43ppojkvJjljJbkuqflk4HkvZPpqoznmoTog73lips8L2xpPgogICAgICAgICAgPGxpPuebkeaOp+aguOW/g+aMh+agh+azouWKqOaDheWGteW5tumihOitpuW8guW4uO+8jOmAmui/h+aVsOaNruWkjeebmOaKpeWRiuaMgee7reS8mOWMluS4muWKoea1geeoi++8jOS9k+eOsOS4peiwqOeahOaVsOaNrumXreeOr+aAnee7tDwvbGk+CiAgICAgICAgPC91bD4KICAgICAgPC9kaXY+CiAgICA8L3NlY3Rpb24+CgogICAgPHNlY3Rpb24gY2xhc3M9InNlYyI+CiAgICAgIDxoMiBjbGFzcz0ic2VjLXRpdGxlIj7or4HkuabmioDog708L2gyPgogICAgICA8ZGl2IGNsYXNzPSJwbGFpbiI+5aSn5a2m6Iux6K+t5YWt57qn6K+B5Lmm44CB5aSn5a2m6Iux6K+t5Zub57qn6K+B5Lmm44CB6K6h566X5py66ICD6K+V5LqM57qn6K+B5Lmm77ybVmliZSBDb2RpbmfjgIFGaWdtYeOAgVNQU1M8L2Rpdj4KICAgIDwvc2VjdGlvbj4KCiAgPC9kaXY+CjwvZGl2PgoKPGlucHV0IHR5cGU9ImZpbGUiIGlkPSJwaG90b0lucHV0IiBhY2NlcHQ9ImltYWdlLyoiIGhpZGRlbj4KCjxzY3JpcHQ+CihmdW5jdGlvbiAoKSB7CiAgJ3VzZSBzdHJpY3QnOwoKICB0cnkgeyBkb2N1bWVudC5leGVjQ29tbWFuZCgnc3R5bGVXaXRoQ1NTJywgZmFsc2UsIHRydWUpOyB9IGNhdGNoIChlKSB7fQoKICBjb25zdCBwYWdlRWwgICAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGFnZScpOwogIGNvbnN0IGNvbnRlbnRFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb250ZW50Jyk7CiAgY29uc3QgdG9vbGJhciAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Rvb2xiYXInKTsKCiAgLyogPT09PT09PT09PSDnspjotLTmmbrog73lpITnkIbvvIjoh6rliqjnu5nml6XmnJ/lpZfmoLflvI/vvIkgPT09PT09PT09PSAqLwogIGNvbnRlbnRFbC5hZGRFdmVudExpc3RlbmVyKCdwYXN0ZScsIGZ1bmN0aW9uIChlKSB7CiAgICBlLnByZXZlbnREZWZhdWx0KCk7CiAgICBsZXQgdGV4dCA9ICcnOwogICAgaWYgKGUuY2xpcGJvYXJkRGF0YSAmJiBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSkgewogICAgICB0ZXh0ID0gZS5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQvcGxhaW4nKSB8fCAnJzsKICAgIH0gZWxzZSBpZiAod2luZG93LmNsaXBib2FyZERhdGEpIHsKICAgICAgdGV4dCA9IHdpbmRvdy5jbGlwYm9hcmREYXRhLmdldERhdGEoJ1RleHQnKSB8fCAnJzsKICAgIH0KICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xyXG4vZywgJ1xuJykucmVwbGFjZSgvXHIvZywgJ1xuJyk7CgogICAgLy8g6L2s5LmJIEhUTUwg54m55q6K5a2X56ymCiAgICBsZXQgZXNjYXBlZFRleHQgPSB0ZXh0LnJlcGxhY2UoLyYvZywgJyZhbXA7JykucmVwbGFjZSgvPC9nLCAnJmx0OycpLnJlcGxhY2UoLz4vZywgJyZndDsnKTsKCiAgICAvLyDoh6rliqjor4bliKvml6XmnJ/moLzlvI/vvIjlpoIgMjAyMy4xMCAtIDIwMjQuMDTvvInlubblpZfnlKjnroDljobnmoQgZGF0ZSDmoLflvI8KICAgIGNvbnN0IGRhdGVSZWdleCA9IC8oXGR7NH1cLlxkezJ9XHMqWy3igJTigJN+XVxzKlxkezR9XC5cZHsyfSkvZzsKICAgIGxldCBodG1sVGV4dCA9IGVzY2FwZWRUZXh0LnJlcGxhY2UoZGF0ZVJlZ2V4LCAnPHNwYW4gY2xhc3M9ImRhdGUiPiQxPC9zcGFuPicpOwoKICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKCdpbnNlcnRIVE1MJywgZmFsc2UsIGh0bWxUZXh0KTsKICAgIGlmIChhdXRvRml0RW5hYmxlZCkgc2NoZWR1bGVGaXQoKTsKICB9KTsKCiAgLyog5ouW5ou95Lmf5by65Yi257qv5paH5pys5bm26Ieq5Yqo6K+G5Yir5pel5pyfICovCiAgY29udGVudEVsLmFkZEV2ZW50TGlzdGVuZXIoJ2Ryb3AnLCBmdW5jdGlvbiAoZSkgewogICAgY29uc3QgZHQgPSBlLmRhdGFUcmFuc2ZlcjsKICAgIGlmICghZHQpIHJldHVybjsKICAgIGUucHJldmVudERlZmF1bHQoKTsKICAgIGxldCB0ZXh0ID0gZHQuZ2V0RGF0YSgndGV4dC9wbGFpbicpIHx8ICcnOwogICAgdGV4dCA9IHRleHQucmVwbGFjZSgvXHJcbi9nLCAnXG4nKS5yZXBsYWNlKC9cci9nLCAnXG4nKTsKICAgIGxldCBlc2NhcGVkVGV4dCA9IHRleHQucmVwbGFjZSgvJi9nLCAnJmFtcDsnKS5yZXBsYWNlKC88L2csICcmbHQ7JykucmVwbGFjZSgvPi9nLCAnJmd0OycpOwogICAgY29uc3QgZGF0ZVJlZ2V4ID0gLyhcZHs0fVwuXGR7Mn1ccypbLeKAlOKAk35dXHMqXGR7NH1cLlxkezJ9KS9nOwogICAgbGV0IGh0bWxUZXh0ID0gZXNjYXBlZFRleHQucmVwbGFjZShkYXRlUmVnZXgsICc8c3BhbiBjbGFzcz0iZGF0ZSI+JDE8L3NwYW4+Jyk7CiAgICBkb2N1bWVudC5leGVjQ29tbWFuZCgnaW5zZXJ0SFRNTCcsIGZhbHNlLCBodG1sVGV4dCk7CiAgICBpZiAoYXV0b0ZpdEVuYWJsZWQpIHNjaGVkdWxlRml0KCk7CiAgfSk7CgogIC8qID09PT09PT09PT0g5bel5YW35qCP6auY5bqm6Ieq6YCC5bqUID09PT09PT09PT0gKi8KICBmdW5jdGlvbiBhZGp1c3RCb2R5UGFkZGluZygpIHsKICAgIGRvY3VtZW50LmJvZHkuc3R5bGUucGFkZGluZ1RvcCA9IHRvb2xiYXIub2Zmc2V0SGVpZ2h0ICsgJ3B4JzsKICB9CiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGFkanVzdEJvZHlQYWRkaW5nKTsKCiAgLyogPT09PT09PT09PSDpgInljLrkv53lrZggPT09PT09PT09PSAqLwogIGxldCBzYXZlZFJhbmdlID0gbnVsbDsKICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdzZWxlY3Rpb25jaGFuZ2UnLCBmdW5jdGlvbiAoKSB7CiAgICBjb25zdCBzZWwgPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKCk7CiAgICBpZiAoc2VsLnJhbmdlQ291bnQgPiAwKSB7CiAgICAgIGNvbnN0IHIgPSBzZWwuZ2V0UmFuZ2VBdCgwKTsKICAgICAgaWYgKGNvbnRlbnRFbC5jb250YWlucyhyLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKSkgc2F2ZWRSYW5nZSA9IHIuY2xvbmVSYW5nZSgpOwogICAgfQogICAgdXBkYXRlVG9vbGJhclN0YXRlKCk7CiAgfSk7CiAgZnVuY3Rpb24gcmVzdG9yZVNlbGVjdGlvbigpIHsKICAgIGlmICghc2F2ZWRSYW5nZSkgcmV0dXJuIGZhbHNlOwogICAgY29uc3Qgc2VsID0gd2luZG93LmdldFNlbGVjdGlvbigpOwogICAgc2VsLnJlbW92ZUFsbFJhbmdlcygpOwogICAgdHJ5IHsgc2VsLmFkZFJhbmdlKHNhdmVkUmFuZ2UpOyByZXR1cm4gdHJ1ZTsgfSBjYXRjaCAoZSkgeyByZXR1cm4gZmFsc2U7IH0KICB9CiAgZnVuY3Rpb24gZ2V0QmxvY2sobm9kZSkgewogICAgaWYgKCFub2RlKSByZXR1cm4gbnVsbDsKICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAzKSBub2RlID0gbm9kZS5wYXJlbnROb2RlOwogICAgd2hpbGUgKG5vZGUgJiYgbm9kZSAhPT0gY29udGVudEVsKSB7CiAgICAgIGlmICgvXihQfExJfERJVnxIMXxIMnxIM3xINHxTRUNUSU9OfEJMT0NLUVVPVEV8VUx8T0wpJC8udGVzdChub2RlLm5vZGVOYW1lKSkgcmV0dXJuIG5vZGU7CiAgICAgIG5vZGUgPSBub2RlLnBhcmVudE5vZGU7CiAgICB9CiAgICByZXR1cm4gbnVsbDsKICB9CgogIHRvb2xiYXIuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgZnVuY3Rpb24gKGUpIHsKICAgIGlmIChlLnRhcmdldC5jbG9zZXN0KCdidXR0b24nKSkgZS5wcmV2ZW50RGVmYXVsdCgpOwogIH0pOwoKICAvKiA9PT09PT09PT09IOWvuem9kOWKn+iDve+8iOebtOaOpeS/ruaUueagt+W8j++8jOWFvOWuuSBmbGV4IOW4g+WxgO+8iSA9PT09PT09PT09ICovCiAgZnVuY3Rpb24gYXBwbHlBbGlnbm1lbnQoYWxpZ24pIHsKICAgIGlmICghc2F2ZWRSYW5nZSkgcmV0dXJuOwogICAgY29uc3Qgc2VsID0gd2luZG93LmdldFNlbGVjdGlvbigpOwogICAgc2VsLnJlbW92ZUFsbFJhbmdlcygpOwogICAgc2VsLmFkZFJhbmdlKHNhdmVkUmFuZ2UpOwoKICAgIGxldCBibG9ja3MgPSBuZXcgU2V0KCk7CiAgICBjb25zdCByYW5nZSA9IHNlbC5nZXRSYW5nZUF0KDApOwoKICAgIGlmICghcmFuZ2UuY29sbGFwc2VkKSB7CiAgICAgIGNvbnN0IHdhbGtlciA9IGRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIoY29udGVudEVsLCBOb2RlRmlsdGVyLlNIT1dfRUxFTUVOVCk7CiAgICAgIGxldCBuOwogICAgICB3aGlsZSAoKG4gPSB3YWxrZXIubmV4dE5vZGUoKSkpIHsKICAgICAgICB0cnkgewogICAgICAgICAgaWYgKHJhbmdlLmludGVyc2VjdHNOb2RlKG4pKSB7CiAgICAgICAgICAgIGNvbnN0IGRpc3BsYXkgPSBnZXRDb21wdXRlZFN0eWxlKG4pLmRpc3BsYXk7CiAgICAgICAgICAgIGlmICgvXihQfExJfERJVnxIMXxIMnxIM3xINHxTRUNUSU9OfEJMT0NLUVVPVEV8VUx8T0wpJC8udGVzdChuLm5vZGVOYW1lKSB8fCBkaXNwbGF5LmluY2x1ZGVzKCdmbGV4JykpIHsKICAgICAgICAgICAgICBibG9ja3MuYWRkKG4pOwogICAgICAgICAgICB9CiAgICAgICAgICB9CiAgICAgICAgfSBjYXRjaChlKSB7fQogICAgICB9CiAgICB9CgogICAgaWYgKGJsb2Nrcy5zaXplID09PSAwKSB7CiAgICAgIGxldCBiID0gZ2V0QmxvY2socmFuZ2Uuc3RhcnRDb250YWluZXIpOwogICAgICBpZiAoYikgYmxvY2tzLmFkZChiKTsKICAgIH0KCiAgICBpZiAoYmxvY2tzLnNpemUgPT09IDApIHsKICAgICAgYmxvY2tzLmFkZChjb250ZW50RWwpOwogICAgfQoKICAgIGJsb2Nrcy5mb3JFYWNoKGIgPT4gewogICAgICBiLnN0eWxlLnRleHRBbGlnbiA9IGFsaWduOwogICAgICAvLyDlpoLmnpzov5nmmK/kuKogZmxleCDlrrnlmajvvIjmr5TlpoLlhazlj7jlkI3lkozml6XmnJ/nmoTmjpLniYjvvInvvIzov5jopoHosIPmlbQganVzdGlmeS1jb250ZW50CiAgICAgIGNvbnN0IGRpc3BsYXkgPSBnZXRDb21wdXRlZFN0eWxlKGIpLmRpc3BsYXk7CiAgICAgIGlmIChkaXNwbGF5LmluY2x1ZGVzKCdmbGV4JykpIHsKICAgICAgICBpZiAoYWxpZ24gPT09ICdsZWZ0JykgYi5zdHlsZS5qdXN0aWZ5Q29udGVudCA9ICdmbGV4LXN0YXJ0JzsKICAgICAgICBpZiAoYWxpZ24gPT09ICdjZW50ZXInKSBiLnN0eWxlLmp1c3RpZnlDb250ZW50ID0gJ2NlbnRlcic7CiAgICAgICAgaWYgKGFsaWduID09PSAncmlnaHQnKSBiLnN0eWxlLmp1c3RpZnlDb250ZW50ID0gJ2ZsZXgtZW5kJzsKICAgICAgICBpZiAoYWxpZ24gPT09ICdqdXN0aWZ5JykgYi5zdHlsZS5qdXN0aWZ5Q29udGVudCA9ICdzcGFjZS1iZXR3ZWVuJzsKICAgICAgfQogICAgfSk7CgogICAgY29udGVudEVsLmZvY3VzKCk7CiAgICBzY2hlZHVsZUZpdCgpOwogIH0KCiAgLyogPT09PT09PT09PSDlt6XlhbfmoI/ngrnlh7vkuovku7YgPT09PT09PT09PSAqLwogIHRvb2xiYXIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkgewogICAgY29uc3QgYnRuID0gZS50YXJnZXQuY2xvc2VzdCgnYnV0dG9uW2RhdGEtY21kXScpOwogICAgaWYgKCFidG4pIHJldHVybjsKICAgIAogICAgY29uc3QgY21kID0gYnRuLmRhdGFzZXQuY21kOwogICAgaWYgKFsnanVzdGlmeUxlZnQnLCAnanVzdGlmeUNlbnRlcicsICdqdXN0aWZ5UmlnaHQnLCAnanVzdGlmeUZ1bGwnXS5pbmNsdWRlcyhjbWQpKSB7CiAgICAgICBjb25zdCBhbGlnbk1hcCA9IHsKICAgICAgICAgJ2p1c3RpZnlMZWZ0JzogJ2xlZnQnLAogICAgICAgICAnanVzdGlmeUNlbnRlcic6ICdjZW50ZXInLAogICAgICAgICAnanVzdGlmeVJpZ2h0JzogJ3JpZ2h0JywKICAgICAgICAgJ2p1c3RpZnlGdWxsJzogJ2p1c3RpZnknCiAgICAgICB9OwogICAgICAgYXBwbHlBbGlnbm1lbnQoYWxpZ25NYXBbY21kXSk7CiAgICAgICByZXR1cm47CiAgICB9CiAgICAKICAgIHJlc3RvcmVTZWxlY3Rpb24oKTsKICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKGNtZCwgZmFsc2UsIG51bGwpOwogICAgY29udGVudEVsLmZvY3VzKCk7CiAgICB1cGRhdGVUb29sYmFyU3RhdGUoKTsKICAgIHNjaGVkdWxlRml0KCk7CiAgfSk7CgogIC8qID09PT09PT09PT0g5pKk6ZSAIC8g6YeN5YGaID09PT09PT09PT0gKi8KICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndW5kb0J0bicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKCkgewogICAgY29udGVudEVsLmZvY3VzKCk7CiAgICBkb2N1bWVudC5leGVjQ29tbWFuZCgndW5kbycsIGZhbHNlLCBudWxsKTsKICAgIHNjaGVkdWxlRml0KCk7CiAgfSk7CiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JlZG9CdG4nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uICgpIHsKICAgIGNvbnRlbnRFbC5mb2N1cygpOwogICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ3JlZG8nLCBmYWxzZSwgbnVsbCk7CiAgICBzY2hlZHVsZUZpdCgpOwogIH0pOwoKICAvKiA9PT09PT09PT09IOWtl+S9kyA9PT09PT09PT09ICovCiAgY29uc3QgZm9udEZhbWlseVNlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmb250RmFtaWx5U2VsJyk7CiAgZm9udEZhbWlseVNlbC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7CiAgICBjb25zdCBmb250ID0gdGhpcy52YWx1ZTsKICAgIGlmICghZm9udCkgcmV0dXJuOwogICAgaWYgKHNhdmVkUmFuZ2UgJiYgIXNhdmVkUmFuZ2UuY29sbGFwc2VkKSB7CiAgICAgIHJlc3RvcmVTZWxlY3Rpb24oKTsKICAgICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2ZvbnROYW1lJywgZmFsc2UsIGZvbnQpOwogICAgfSBlbHNlIGlmIChzYXZlZFJhbmdlKSB7CiAgICAgIGNvbnN0IGJsb2NrID0gZ2V0QmxvY2soc2F2ZWRSYW5nZS5zdGFydENvbnRhaW5lcik7CiAgICAgIGlmIChibG9jaykgYmxvY2suc3R5bGUuZm9udEZhbWlseSA9IGZvbnQ7CiAgICAgIGVsc2UgY29udGVudEVsLnN0eWxlLmZvbnRGYW1pbHkgPSBmb250OwogICAgfSBlbHNlIHsKICAgICAgY29udGVudEVsLnN0eWxlLmZvbnRGYW1pbHkgPSBmb250OwogICAgfQogICAgY29udGVudEVsLmZvY3VzKCk7CiAgICBzY2hlZHVsZUZpdCgpOwogIH0pOwoKICAvKiA9PT09PT09PT09IOWtl+WPtyA9PT09PT09PT09ICovCiAgY29uc3QgZm9udFNpemVTZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZm9udFNpemVTZWwnKTsKICBmdW5jdGlvbiBhcHBseUZvbnRTaXplKHB4KSB7CiAgICBpZiAoc2F2ZWRSYW5nZSAmJiAhc2F2ZWRSYW5nZS5jb2xsYXBzZWQpIHsKICAgICAgcmVzdG9yZVNlbGVjdGlvbigpOwogICAgICBjb25zdCBzZWwgPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKCk7CiAgICAgIGlmICghc2VsLnJhbmdlQ291bnQpIHJldHVybjsKICAgICAgY29uc3QgcmFuZ2UgPSBzZWwuZ2V0UmFuZ2VBdCgwKTsKICAgICAgY29uc3Qgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTsKICAgICAgc3Bhbi5zdHlsZS5mb250U2l6ZSA9IHB4ICsgJ3B4JzsKICAgICAgdHJ5IHsgcmFuZ2Uuc3Vycm91bmRDb250ZW50cyhzcGFuKTsgfQogICAgICBjYXRjaCAoZXJyKSB7CiAgICAgICAgdHJ5IHsKICAgICAgICAgIGNvbnN0IGZyYWcgPSByYW5nZS5leHRyYWN0Q29udGVudHMoKTsKICAgICAgICAgIHNwYW4uYXBwZW5kQ2hpbGQoZnJhZyk7CiAgICAgICAgICByYW5nZS5pbnNlcnROb2RlKHNwYW4pOwogICAgICAgIH0gY2F0Y2ggKGVycjIpIHsgcmV0dXJuOyB9CiAgICAgIH0KICAgICAgc2VsLnJlbW92ZUFsbFJhbmdlcygpOwogICAgICBjb25zdCByID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKTsKICAgICAgci5zZWxlY3ROb2RlQ29udGVudHMoc3Bhbik7CiAgICAgIHNlbC5hZGRSYW5nZShyKTsKICAgICAgc2F2ZWRSYW5nZSA9IHIuY2xvbmVSYW5nZSgpOwogICAgfSBlbHNlIGlmIChzYXZlZFJhbmdlKSB7CiAgICAgIGNvbnN0IGJsb2NrID0gZ2V0QmxvY2soc2F2ZWRSYW5nZS5zdGFydENvbnRhaW5lcik7CiAgICAgIGlmIChibG9jaykgYmxvY2suc3R5bGUuZm9udFNpemUgPSBweCArICdweCc7CiAgICAgIGVsc2UgY29udGVudEVsLnN0eWxlLmZvbnRTaXplID0gcHggKyAncHgnOwogICAgfSBlbHNlIHsKICAgICAgY29udGVudEVsLnN0eWxlLmZvbnRTaXplID0gcHggKyAncHgnOwogICAgfQogIH0KICBmb250U2l6ZVNlbC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7CiAgICBjb25zdCB2ID0gdGhpcy52YWx1ZTsKICAgIGlmICh2ID09PSAnYXV0bycpIHsKICAgICAgYXV0b0ZpdEVuYWJsZWQgPSB0cnVlOwogICAgICBhdXRvRml0VG9nZ2xlLmNoZWNrZWQgPSB0cnVlOwogICAgICBhdXRvRml0KCk7CiAgICAgIHJldHVybjsKICAgIH0KICAgIGF1dG9GaXRFbmFibGVkID0gZmFsc2U7CiAgICBhdXRvRml0VG9nZ2xlLmNoZWNrZWQgPSBmYWxzZTsKICAgIGFwcGx5Rm9udFNpemUocGFyc2VGbG9hdCh2KSk7CiAgICBjb250ZW50RWwuZm9jdXMoKTsKICAgIHNjaGVkdWxlRml0KCk7CiAgfSk7CgogIC8qID09PT09PT09PT0g6aKc6ImyIC8g6auY5LquID09PT09PT09PT0gKi8KICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZm9udENvbG9yJykuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCBmdW5jdGlvbiAoKSB7CiAgICByZXN0b3JlU2VsZWN0aW9uKCk7CiAgICBkb2N1bWVudC5leGVjQ29tbWFuZCgnZm9yZUNvbG9yJywgZmFsc2UsIHRoaXMudmFsdWUpOwogICAgY29udGVudEVsLmZvY3VzKCk7CiAgfSk7CiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2hsQ29sb3InKS5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIGZ1bmN0aW9uICgpIHsKICAgIHJlc3RvcmVTZWxlY3Rpb24oKTsKICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKCdoaWxpdGVDb2xvcicsIGZhbHNlLCB0aGlzLnZhbHVlKTsKICAgIGNvbnRlbnRFbC5mb2N1cygpOwogIH0pOwoKICAvKiA9PT09PT09PT09IOihjOi3ne+8iOWFqOWxgO+8iSA9PT09PT09PT09ICovCiAgY29uc3QgbGluZUhlaWdodFNlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsaW5lSGVpZ2h0U2VsJyk7CiAgbGluZUhlaWdodFNlbC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7CiAgICBjb250ZW50RWwuc3R5bGUubGluZUhlaWdodCA9IHRoaXMudmFsdWU7CiAgICBpZiAoYXV0b0ZpdEVuYWJsZWQpIHNldFRpbWVvdXQoYXV0b0ZpdCwgNDApOwogIH0pOwoKICAvKiA9PT09PT09PT09IOa4hemZpOmAieS4reWGheWuueagvOW8jyA9PT09PT09PT09ICovCiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NsZWFyRm9ybWF0QnRuJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoKSB7CiAgICBpZiAoIXNhdmVkUmFuZ2UgfHwgc2F2ZWRSYW5nZS5jb2xsYXBzZWQpIHsKICAgICAgYWxlcnQoJ+ivt+WFiOmAieS4reimgea4hemZpOagvOW8j+eahOWGheWuuScpOwogICAgICByZXR1cm47CiAgICB9CiAgICByZXN0b3JlU2VsZWN0aW9uKCk7CiAgICBjb25zdCBzZWwgPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKCk7CiAgICBpZiAoIXNlbC5yYW5nZUNvdW50KSByZXR1cm47CiAgICBjb25zdCByYW5nZSA9IHNlbC5nZXRSYW5nZUF0KDApOwoKICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKCdyZW1vdmVGb3JtYXQnLCBmYWxzZSwgbnVsbCk7CgogICAgY29uc3Qgd2Fsa2VyID0gZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcihjb250ZW50RWwsIE5vZGVGaWx0ZXIuU0hPV19FTEVNRU5UKTsKICAgIGNvbnN0IHRvQ2xlYXIgPSBbXTsKICAgIGxldCBuOwogICAgd2hpbGUgKChuID0gd2Fsa2VyLm5leHROb2RlKCkpKSB7CiAgICAgIHRyeSB7IGlmIChyYW5nZS5pbnRlcnNlY3RzTm9kZShuKSkgdG9DbGVhci5wdXNoKG4pOyB9IGNhdGNoIChlKSB7fQogICAgfQogICAgdG9DbGVhci5mb3JFYWNoKGZ1bmN0aW9uIChlbCkgewogICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoJ3N0eWxlJyk7CiAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZSgnY2xhc3MnKTsKICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKCdjb2xvcicpOwogICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoJ2ZhY2UnKTsKICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKCdzaXplJyk7CiAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZSgnYWxpZ24nKTsKICAgIH0pOwoKICAgIHRvQ2xlYXIuZm9yRWFjaChmdW5jdGlvbiAoZWwpIHsKICAgICAgaWYgKGVsLnRhZ05hbWUgPT09ICdTUEFOJyAmJiAhZWwuZ2V0QXR0cmlidXRlKCdzdHlsZScpICYmICFlbC5nZXRBdHRyaWJ1dGUoJ2NsYXNzJykpIHsKICAgICAgICBjb25zdCBwYXJlbnQgPSBlbC5wYXJlbnROb2RlOwogICAgICAgIGlmICghcGFyZW50KSByZXR1cm47CiAgICAgICAgd2hpbGUgKGVsLmZpcnN0Q2hpbGQpIHBhcmVudC5pbnNlcnRCZWZvcmUoZWwuZmlyc3RDaGlsZCwgZWwpOwogICAgICAgIHBhcmVudC5yZW1vdmVDaGlsZChlbCk7CiAgICAgIH0KICAgIH0pOwoKICAgIGNvbnRlbnRFbC5mb2N1cygpOwogICAgaWYgKGF1dG9GaXRFbmFibGVkKSBzY2hlZHVsZUZpdCgpOwogIH0pOwoKICAvKiA9PT09PT09PT09IOW3peWFt+agj+aMiemSriBhY3RpdmUg54q25oCBID09PT09PT09PT0gKi8KICBjb25zdCBzdGF0ZUNtZHMgPSBbJ2JvbGQnLCdpdGFsaWMnLCd1bmRlcmxpbmUnXTsKICBmdW5jdGlvbiB1cGRhdGVUb29sYmFyU3RhdGUoKSB7CiAgICBzdGF0ZUNtZHMuZm9yRWFjaChmdW5jdGlvbiAoY21kKSB7CiAgICAgIGNvbnN0IGJ0biA9IHRvb2xiYXIucXVlcnlTZWxlY3RvcignYnV0dG9uW2RhdGEtY21kPSInICsgY21kICsgJyJdJyk7CiAgICAgIGlmICghYnRuKSByZXR1cm47CiAgICAgIGxldCBvbiA9IGZhbHNlOwogICAgICB0cnkgeyBvbiA9IGRvY3VtZW50LnF1ZXJ5Q29tbWFuZFN0YXRlKGNtZCk7IH0gY2F0Y2ggKGUpIHt9CiAgICAgIGJ0bi5jbGFzc0xpc3QudG9nZ2xlKCdhY3RpdmUnLCBvbik7CiAgICB9KTsKICAgIAogICAgLy8g5omL5Yqo5pu05paw5a+56b2Q5oyJ6ZKu55qE6auY5Lqu54q25oCBCiAgICBjb25zdCBhbGlnbkJ0bnMgPSB0b29sYmFyLnF1ZXJ5U2VsZWN0b3JBbGwoJ2J1dHRvbltkYXRhLWNtZF49Imp1c3RpZnkiXScpOwogICAgaWYgKGFsaWduQnRucy5sZW5ndGgpIHsKICAgICAgbGV0IGFsaWduID0gJ2xlZnQnOwogICAgICBpZiAoc2F2ZWRSYW5nZSkgewogICAgICAgIGxldCBiID0gZ2V0QmxvY2soc2F2ZWRSYW5nZS5zdGFydENvbnRhaW5lcik7CiAgICAgICAgaWYgKGIpIHsKICAgICAgICAgIGNvbnN0IGNzID0gZ2V0Q29tcHV0ZWRTdHlsZShiKTsKICAgICAgICAgIGlmIChjcy50ZXh0QWxpZ24gPT09ICdjZW50ZXInKSBhbGlnbiA9ICdjZW50ZXInOwogICAgICAgICAgaWYgKGNzLnRleHRBbGlnbiA9PT0gJ3JpZ2h0JykgYWxpZ24gPSAncmlnaHQnOwogICAgICAgICAgaWYgKGNzLnRleHRBbGlnbiA9PT0gJ2p1c3RpZnknKSBhbGlnbiA9ICdqdXN0aWZ5JzsKICAgICAgICB9CiAgICAgIH0KICAgICAgYWxpZ25CdG5zLmZvckVhY2goYnRuID0+IHsKICAgICAgICBjb25zdCBjbWQgPSBidG4uZGF0YXNldC5jbWQ7CiAgICAgICAgbGV0IHRhcmdldEFsaWduID0gJ2xlZnQnOwogICAgICAgIGlmIChjbWQgPT09ICdqdXN0aWZ5Q2VudGVyJykgdGFyZ2V0QWxpZ24gPSAnY2VudGVyJzsKICAgICAgICBpZiAoY21kID09PSAnanVzdGlmeVJpZ2h0JykgdGFyZ2V0QWxpZ24gPSAncmlnaHQnOwogICAgICAgIGlmIChjbWQgPT09ICdqdXN0aWZ5RnVsbCcpIHRhcmdldEFsaWduID0gJ2p1c3RpZnknOwogICAgICAgIGJ0bi5jbGFzc0xpc3QudG9nZ2xlKCdhY3RpdmUnLCBhbGlnbiA9PT0gdGFyZ2V0QWxpZ24pOwogICAgICB9KTsKICAgIH0KICB9CgogIC8qID09PT09PT09PT0g6Ieq5Yqo6ZO65ruhID09PT09PT09PT0gKi8KICBsZXQgYXV0b0ZpdEVuYWJsZWQgPSB0cnVlOwogIGNvbnN0IGF1dG9GaXRUb2dnbGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXV0b0ZpdFRvZ2dsZScpOwoKICBmdW5jdGlvbiBhdXRvRml0KCkgewogICAgaWYgKCFhdXRvRml0RW5hYmxlZCkgcmV0dXJuOwogICAgY29uc3QgY3MgICAgPSBnZXRDb21wdXRlZFN0eWxlKHBhZ2VFbCk7CiAgICBjb25zdCBhdmFpbCA9IHBhZ2VFbC5jbGllbnRIZWlnaHQgLSBwYXJzZUZsb2F0KGNzLnBhZGRpbmdUb3ApIC0gcGFyc2VGbG9hdChjcy5wYWRkaW5nQm90dG9tKTsKICAgIGNvbnN0IE1JTiA9IDEwLjQsIE1BWCA9IDEzLjg7CiAgICBsZXQgbG8gPSBNSU4sIGhpID0gTUFYLCBiZXN0ID0gTUlOOwogICAgZm9yIChsZXQgaSA9IDA7IGkgPCAxMjsgaSsrKSB7CiAgICAgIGNvbnN0IG1pZCA9IChsbyArIGhpKSAvIDI7CiAgICAgIGNvbnRlbnRFbC5zdHlsZS5mb250U2l6ZSA9IG1pZCArICdweCc7CiAgICAgIGNvbnN0IGggPSBjb250ZW50RWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0OwogICAgICBpZiAoaCA8PSBhdmFpbCAtIDIpIHsgYmVzdCA9IG1pZDsgbG8gPSBtaWQ7IH0KICAgICAgZWxzZSAgICAgICAgICAgICAgICB7IGhpID0gbWlkOyB9CiAgICB9CiAgICBjb250ZW50RWwuc3R5bGUuZm9udFNpemUgPSBiZXN0LnRvRml4ZWQoMikgKyAncHgnOwogIH0KCiAgbGV0IGZpdFRpbWVyID0gbnVsbDsKICBmdW5jdGlvbiBzY2hlZHVsZUZpdCgpIHsKICAgIGlmICghYXV0b0ZpdEVuYWJsZWQpIHJldHVybjsKICAgIGNsZWFyVGltZW91dChmaXRUaW1lcik7CiAgICBmaXRUaW1lciA9IHNldFRpbWVvdXQoYXV0b0ZpdCwgMzIwKTsKICB9CgogIGNvbnRlbnRFbC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIGZ1bmN0aW9uICgpIHsKICAgIGlmIChhdXRvRml0RW5hYmxlZCkgc2NoZWR1bGVGaXQoKTsKICB9KTsKCiAgYXV0b0ZpdFRvZ2dsZS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7CiAgICBhdXRvRml0RW5hYmxlZCA9IHRoaXMuY2hlY2tlZDsKICAgIGlmIChhdXRvRml0RW5hYmxlZCkgewogICAgICBmb250U2l6ZVNlbC52YWx1ZSA9ICdhdXRvJzsKICAgICAgYXV0b0ZpdCgpOwogICAgfQogIH0pOwoKICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgZnVuY3Rpb24gKCkgewogICAgaWYgKGF1dG9GaXRFbmFibGVkKSBhdXRvRml0KCk7CiAgfSk7CgogIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24gKCkgewogICAgYWRqdXN0Qm9keVBhZGRpbmcoKTsKICAgIGF1dG9GaXQoKTsKICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkgeyBhZGp1c3RCb2R5UGFkZGluZygpOyBhdXRvRml0KCk7IH0sIDE1MCk7CiAgfSk7CiAgaWYgKGRvY3VtZW50LmZvbnRzICYmIGRvY3VtZW50LmZvbnRzLnJlYWR5KSB7CiAgICBkb2N1bWVudC5mb250cy5yZWFkeS50aGVuKGZ1bmN0aW9uICgpIHsgYWRqdXN0Qm9keVBhZGRpbmcoKTsgYXV0b0ZpdCgpOyB9KTsKICB9CgogIC8qID09PT09PT09PT0g6K+B5Lu254WnID09PT09PT09PT0gKi8KICBjb25zdCBDVyA9IDkwLCBDSCA9IDEyMCwgRFBSID0gMjsKICBjb25zdCBwaG90b0JveCAgICA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwaG90b0JveCcpOwogIGNvbnN0IHBob3RvQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Bob3RvQ2FudmFzJyk7CiAgY29uc3QgcGhvdG9JbnB1dCAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGhvdG9JbnB1dCcpOwogIGNvbnN0IHBob3RvVG9vbHMgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Bob3RvVG9vbHMnKTsKICBjb25zdCBjdHggICAgICAgICA9IHBob3RvQ2FudmFzLmdldENvbnRleHQoJzJkJyk7CiAgY29uc3QgcHN0YXRlID0geyBpbWc6IG51bGwsIHpvb206IDEsIG9mZnNldFg6IDAsIG9mZnNldFk6IDAgfTsKCiAgZnVuY3Rpb24gYmFzZVNjYWxlKGltZykgeyByZXR1cm4gTWF0aC5tYXgoQ1cgLyBpbWcubmF0dXJhbFdpZHRoLCBDSCAvIGltZy5uYXR1cmFsSGVpZ2h0KTsgfQogIGZ1bmN0aW9uIGNsYW1wT2Zmc2V0cygpIHsKICAgIGlmICghcHN0YXRlLmltZykgcmV0dXJuOwogICAgY29uc3QgcyAgPSBiYXNlU2NhbGUocHN0YXRlLmltZykgKiBwc3RhdGUuem9vbTsKICAgIGNvbnN0IGR3ID0gcHN0YXRlLmltZy5uYXR1cmFsV2lkdGggKiBzOwogICAgY29uc3QgZGggPSBwc3RhdGUuaW1nLm5hdHVyYWxIZWlnaHQgKiBzOwogICAgY29uc3QgbWF4WCA9IE1hdGgubWF4KDAsIChkdyAtIENXKSAvIDIpOwogICAgY29uc3QgbWF4WSA9IE1hdGgubWF4KDAsIChkaCAtIENIKSAvIDIpOwogICAgcHN0YXRlLm9mZnNldFggPSBNYXRoLm1pbihtYXhYLCBNYXRoLm1heCgtbWF4WCwgcHN0YXRlLm9mZnNldFgpKTsKICAgIHBzdGF0ZS5vZmZzZXRZID0gTWF0aC5taW4obWF4WSwgTWF0aC5tYXgoLW1heFksIHBzdGF0ZS5vZmZzZXRZKSk7CiAgfQogIGZ1bmN0aW9uIGRyYXdQaG90bygpIHsKICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgcGhvdG9DYW52YXMud2lkdGgsIHBob3RvQ2FudmFzLmhlaWdodCk7CiAgICBpZiAoIXBzdGF0ZS5pbWcpIHJldHVybjsKICAgIGNvbnN0IGltZyA9IHBzdGF0ZS5pbWc7CiAgICBjb25zdCBzICAgPSBiYXNlU2NhbGUoaW1nKSAqIHBzdGF0ZS56b29tOwogICAgY29uc3QgZHcgID0gaW1nLm5hdHVyYWxXaWR0aCAqIHM7CiAgICBjb25zdCBkaCAgPSBpbWcubmF0dXJhbEhlaWdodCAqIHM7CiAgICBjb25zdCBkeCAgPSAoQ1cgLSBkdykgLyAyICsgcHN0YXRlLm9mZnNldFg7CiAgICBjb25zdCBkeSAgPSAoQ0ggLSBkaCkgLyAyICsgcHN0YXRlLm9mZnNldFk7CiAgICBjdHguaW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gdHJ1ZTsKICAgIGN0eC5pbWFnZVNtb290aGluZ1F1YWxpdHkgPSAnaGlnaCc7CiAgICBjdHguZHJhd0ltYWdlKGltZywgZHggKiBEUFIsIGR5ICogRFBSLCBkdyAqIERQUiwgZGggKiBEUFIpOwogIH0KICBmdW5jdGlvbiByZXNldFBob3RvKCkgewogICAgcHN0YXRlLmltZyA9IG51bGw7IHBzdGF0ZS56b29tID0gMTsgcHN0YXRlLm9mZnNldFggPSAwOyBwc3RhdGUub2Zmc2V0WSA9IDA7CiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHBob3RvQ2FudmFzLndpZHRoLCBwaG90b0NhbnZhcy5oZWlnaHQpOwogICAgcGhvdG9Cb3guY2xhc3NMaXN0LmFkZCgnZW1wdHknKTsKICAgIHBob3RvQm94LmNsYXNzTGlzdC5yZW1vdmUoJ2hhcy1waG90bycpOwogIH0KICBmdW5jdGlvbiBsb2FkUGhvdG8oZmlsZSkgewogICAgaWYgKCFmaWxlIHx8ICEvXmltYWdlXC8vLnRlc3QoZmlsZS50eXBlKSkgcmV0dXJuOwogICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTsKICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiAoZXYpIHsKICAgICAgY29uc3QgaW1nID0gbmV3IEltYWdlKCk7CiAgICAgIGltZy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7CiAgICAgICAgcHN0YXRlLmltZyA9IGltZzsgcHN0YXRlLnpvb20gPSAxOyBwc3RhdGUub2Zmc2V0WCA9IDA7IHBzdGF0ZS5vZmZzZXRZID0gMDsKICAgICAgICBwaG90b0JveC5jbGFzc0xpc3QucmVtb3ZlKCdlbXB0eScpOwogICAgICAgIHBob3RvQm94LmNsYXNzTGlzdC5hZGQoJ2hhcy1waG90bycpOwogICAgICAgIGNsYW1wT2Zmc2V0cygpOyBkcmF3UGhvdG8oKTsKICAgICAgfTsKICAgICAgaW1nLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7IGFsZXJ0KCflm77niYfor7vlj5blpLHotKXvvIzor7fmjaLkuIDlvKDor5Xor5UnKTsgfTsKICAgICAgaW1nLnNyYyA9IGV2LnRhcmdldC5yZXN1bHQ7CiAgICB9OwogICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwoZmlsZSk7CiAgfQogIHBob3RvSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24gKGUpIHsKICAgIGNvbnN0IGZpbGUgPSBlLnRhcmdldC5maWxlcyAmJiBlLnRhcmdldC5maWxlc1swXTsKICAgIGlmIChmaWxlKSBsb2FkUGhvdG8oZmlsZSk7CiAgICBwaG90b0lucHV0LnZhbHVlID0gJyc7CiAgfSk7CiAgcGhvdG9Ub29scy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7CiAgICBjb25zdCBidG4gPSBlLnRhcmdldC5jbG9zZXN0KCdidXR0b24nKTsKICAgIGlmICghYnRuKSByZXR1cm47CiAgICBlLnN0b3BQcm9wYWdhdGlvbigpOwogICAgaWYgKGJ0bi5kYXRhc2V0LmFjdCA9PT0gJ3JlcGxhY2UnKSBwaG90b0lucHV0LmNsaWNrKCk7CiAgICBpZiAoYnRuLmRhdGFzZXQuYWN0ID09PSAnZGVsZXRlJykgIHJlc2V0UGhvdG8oKTsKICB9KTsKICBsZXQgZHJhZ2dpbmcgPSBmYWxzZSwgc3RhcnRYID0gMCwgc3RhcnRZID0gMCwgc3RhcnRPZmZYID0gMCwgc3RhcnRPZmZZID0gMDsKICBwaG90b0JveC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVyZG93bicsIGZ1bmN0aW9uIChlKSB7CiAgICBpZiAoZS50YXJnZXQuY2xvc2VzdCgnLnBob3RvLXRvb2xzJykpIHJldHVybjsKICAgIGlmICghcHN0YXRlLmltZykgcmV0dXJuOwogICAgZHJhZ2dpbmcgPSB0cnVlOwogICAgc3RhcnRYID0gZS5jbGllbnRYOyBzdGFydFkgPSBlLmNsaWVudFk7CiAgICBzdGFydE9mZlggPSBwc3RhdGUub2Zmc2V0WDsgc3RhcnRPZmZZID0gcHN0YXRlLm9mZnNldFk7CiAgICBpZiAocGhvdG9Cb3guc2V0UG9pbnRlckNhcHR1cmUpIHBob3RvQm94LnNldFBvaW50ZXJDYXB0dXJlKGUucG9pbnRlcklkKTsKICAgIGUucHJldmVudERlZmF1bHQoKTsKICB9KTsKICBwaG90b0JveC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVybW92ZScsIGZ1bmN0aW9uIChlKSB7CiAgICBpZiAoIWRyYWdnaW5nKSByZXR1cm47CiAgICBwc3RhdGUub2Zmc2V0WCA9IHN0YXJ0T2ZmWCArIChlLmNsaWVudFggLSBzdGFydFgpOwogICAgcHN0YXRlLm9mZnNldFkgPSBzdGFydE9mZlkgKyAoZS5jbGllbnRZIC0gc3RhcnRZKTsKICAgIGNsYW1wT2Zmc2V0cygpOyBkcmF3UGhvdG8oKTsKICAgIGUucHJldmVudERlZmF1bHQoKTsKICB9KTsKICBmdW5jdGlvbiBlbmREcmFnKGUpIHsKICAgIGlmICghZHJhZ2dpbmcpIHJldHVybjsKICAgIGRyYWdnaW5nID0gZmFsc2U7CiAgICBpZiAocGhvdG9Cb3gucmVsZWFzZVBvaW50ZXJDYXB0dXJlICYmIGUucG9pbnRlcklkICE9IG51bGwpIHsKICAgICAgdHJ5IHsgcGhvdG9Cb3gucmVsZWFzZVBvaW50ZXJDYXB0dXJlKGUucG9pbnRlcklkKTsgfSBjYXRjaCAoZXJyKSB7fQogICAgfQogIH0KICBwaG90b0JveC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVydXAnLCBlbmREcmFnKTsKICBwaG90b0JveC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVyY2FuY2VsJywgZW5kRHJhZyk7CiAgcGhvdG9Cb3guYWRkRXZlbnRMaXN0ZW5lcignd2hlZWwnLCBmdW5jdGlvbiAoZSkgewogICAgaWYgKCFwc3RhdGUuaW1nKSByZXR1cm47CiAgICBlLnByZXZlbnREZWZhdWx0KCk7CiAgICBjb25zdCBmYWN0b3IgPSBlLmRlbHRhWSA8IDAgPyAxLjA4IDogMSAvIDEuMDg7CiAgICBwc3RhdGUuem9vbSA9IE1hdGgubWluKDYsIE1hdGgubWF4KDEsIHBzdGF0ZS56b29tICogZmFjdG9yKSk7CiAgICBjbGFtcE9mZnNldHMoKTsgZHJhd1Bob3RvKCk7CiAgfSwgeyBwYXNzaXZlOiBmYWxzZSB9KTsKICBwaG90b0JveC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7CiAgICBpZiAoZS50YXJnZXQuY2xvc2VzdCgnLnBob3RvLXRvb2xzJykpIHJldHVybjsKICAgIGlmICghcHN0YXRlLmltZykgcGhvdG9JbnB1dC5jbGljaygpOwogIH0pOwoKICAvKiA9PT09PT09PT09IOWvvOWHuiBQREYgPT09PT09PT09PSAqLwogIGNvbnN0IGV4cG9ydEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdleHBvcnRCdG4nKTsKICBleHBvcnRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBhc3luYyBmdW5jdGlvbiAoKSB7CiAgICBpZiAodHlwZW9mIGh0bWwycGRmID09PSAndW5kZWZpbmVkJykgeyB3aW5kb3cucHJpbnQoKTsgcmV0dXJuOyB9CiAgICBjb25zdCBvbGRUZXh0ID0gZXhwb3J0QnRuLnRleHRDb250ZW50OwogICAgZXhwb3J0QnRuLmRpc2FibGVkID0gdHJ1ZTsKICAgIGV4cG9ydEJ0bi50ZXh0Q29udGVudCA9ICfnlJ/miJDkuK3igKYnOwogICAgcGFnZUVsLmNsYXNzTGlzdC5hZGQoJ2V4cG9ydGluZycpOwogICAgY29uc3QgcHJldlNoYWRvdyA9IHBhZ2VFbC5zdHlsZS5ib3hTaGFkb3c7CiAgICBjb25zdCBwcmV2TWFyZ2luID0gcGFnZUVsLnN0eWxlLm1hcmdpbjsKICAgIHBhZ2VFbC5zdHlsZS5ib3hTaGFkb3cgPSAnbm9uZSc7CiAgICBwYWdlRWwuc3R5bGUubWFyZ2luID0gJzAnOwogICAgY29uc3Qgb3B0ID0gewogICAgICBtYXJnaW46IDAsCiAgICAgIGZpbGVuYW1lOiAn6I6r5qWa5qyjLUFJ5Lqn5ZOB57uP55CGLeeugOWOhi5wZGYnLAogICAgICBpbWFnZTogeyB0eXBlOiAnanBlZycsIHF1YWxpdHk6IDAuOTkgfSwKICAgICAgaHRtbDJjYW52YXM6IHsKICAgICAgICBzY2FsZTogMywgdXNlQ09SUzogdHJ1ZSwgYWxsb3dUYWludDogZmFsc2UsCiAgICAgICAgYmFja2dyb3VuZENvbG9yOiAnI2ZmZmZmZicsIHNjcm9sbFg6IDAsIHNjcm9sbFk6IDAsCiAgICAgICAgd2luZG93V2lkdGg6IHBhZ2VFbC5zY3JvbGxXaWR0aCwgd2luZG93SGVpZ2h0OiBwYWdlRWwuc2Nyb2xsSGVpZ2h0CiAgICAgIH0sCiAgICAgIGpzUERGOiB7IHVuaXQ6ICdtbScsIGZvcm1hdDogJ2E0Jywgb3JpZW50YXRpb246ICdwb3J0cmFpdCcgfSwKICAgICAgcGFnZWJyZWFrOiB7IG1vZGU6IFsnY3NzJ10gfQogICAgfTsKICAgIHRyeSB7CiAgICAgIGF3YWl0IGh0bWwycGRmKCkuc2V0KG9wdCkuZnJvbShwYWdlRWwpLnNhdmUoKTsKICAgIH0gY2F0Y2ggKGVycikgewogICAgICBjb25zb2xlLmVycm9yKGVycik7CiAgICAgIGFsZXJ0KCflr7zlh7rlpLHotKXvvIzor7fph43or5XvvIjmiJbkvb/nlKjmtY/op4jlmajmiZPljbDlj6blrZjkuLogUERG77yJJyk7CiAgICB9IGZpbmFsbHkgewogICAgICBwYWdlRWwuY2xhc3NMaXN0LnJlbW92ZSgnZXhwb3J0aW5nJyk7CiAgICAgIHBhZ2VFbC5zdHlsZS5ib3hTaGFkb3cgPSBwcmV2U2hhZG93OwogICAgICBwYWdlRWwuc3R5bGUubWFyZ2luID0gcHJldk1hcmdpbjsKICAgICAgZXhwb3J0QnRuLmRpc2FibGVkID0gZmFsc2U7CiAgICAgIGV4cG9ydEJ0bi50ZXh0Q29udGVudCA9IG9sZFRleHQ7CiAgICB9CiAgfSk7Cgp9KSgpOwo8L3NjcmlwdD4KPC9ib2R5Pgo8L2h0bWw+';
let templateSourcePromise = null;
async function getResumeTemplateSource(){
  if(!templateSourcePromise){
    templateSourcePromise=Promise.resolve(atob(EMBEDDED_RESUME_TEMPLATE_B64));
  }
  return templateSourcePromise;
}
function setTemplateSection(section,title,entries){
  const titleEl=section.querySelector('.sec-title');
  if(titleEl)titleEl.textContent=title;
  const first=section.querySelector('.entry');
  const entriesWrap=section;
  entriesWrap.querySelectorAll('.entry').forEach((el,i)=>{if(i>0)el.remove();});
  if(!entries?.length){section.remove();return;}
  const base=first;
  if(!base)return;
  const apply=(el,x)=>{
    const org=el.querySelector('.org'),role=el.querySelector('.role'),date=el.querySelector('.date'),ul=el.querySelector('.bullets');
    if(org)org.textContent=x.company||x.title||'';
    if(role)role.textContent=x.position||'';
    if(date)date.textContent=x.date||'';
    if(ul){ul.innerHTML='';(x.bullets||[]).forEach(b=>{const li=document.createElement('li');li.textContent=String(b||'');ul.appendChild(li);});}
  };
  apply(base,entries[0]);
  for(let i=1;i<entries.length;i++){const el=base.cloneNode(true);apply(el,entries[i]);entriesWrap.appendChild(el);}
}
function buildResumeTemplateHtml(template,r){
  const doc=new DOMParser().parseFromString(template,'text/html');
  const p=r.personal||{};
  const name=doc.querySelector('.name'); if(name)name.textContent=p.name||'';
  const meta=doc.querySelector('.header .meta');
  if(meta){meta.innerHTML='';const vals=[p.birth||'2002.11',p.phone,p.email].filter(Boolean);vals.forEach((v,i)=>{if(i){const sep=document.createElement('span');sep.className='sep';sep.textContent='|';meta.appendChild(sep);}const span=document.createElement('span');span.textContent=v;meta.appendChild(span);});}
  const sections=[...doc.querySelectorAll('.content > .sec')];
  const findSection=t=>sections.find(sec=>sec.querySelector('.sec-title')?.textContent.trim()===t);
  const edu=findSection('教育背景');
  if(edu){const e=r.education?.[0]||{};const org=edu.querySelector('.org'),role=edu.querySelector('.role'),date=edu.querySelector('.date');if(org)org.textContent=e.school||e.raw||'';if(role)role.textContent=e.degree||'';if(date)date.textContent=e.start&&e.end?`${e.start} - ${e.end}`:'';}
  const summary=findSection('综合评价'); if(summary){const el=summary.querySelector('.plain');if(el)el.textContent=r.summary||'';if(!r.summary)summary.remove();}
  const projects=findSection('项目经历');
  if(projects)setTemplateSection(projects,'项目经历',(r.projects||[]).map(x=>({title:x.title,date:x.date,bullets:x.bullets})));
  const works=findSection('工作经历');
  if(works)setTemplateSection(works,'工作经历',(r.experiences||[]).map(x=>({company:x.company,position:x.position,date:x.date,bullets:x.bullets})));
  const skills=findSection('证书技能');
  if(skills){const el=skills.querySelector('.plain');const parts=[...(r.certificates||[]),...(r.skills||[])];if(el)el.textContent=parts.join('；');}
  const content=doc.querySelector('#content');if(content){content.setAttribute('data-careerfit-generated','true');content.setAttribute('data-careerfit-source','CareerFit-generated-resume');}
  const body=doc.body;if(body){body.setAttribute('data-careerfit-generated','true');body.setAttribute('data-careerfit-version',r.__versionKey||'generated');body.setAttribute('data-careerfit-job',r.__jobTitle||'');}
  const title=doc.querySelector('title');if(title)title.textContent=`${r.__jobTitle||p.name||'CareerFit'} · ${r.__versionKey==='keywordFocused'?'关键词强化':'针对性重构'}`;
  return '<!DOCTYPE html>\n'+doc.documentElement.outerHTML;
}
async function adaptResumeToTemplate(r){const template=await getResumeTemplateSource();return buildResumeTemplateHtml(template,r);}
function renderResumePaper(r){
  return `<div class="template-placeholder"><p class="small-note">正在加载你的原始 HTML 简历模板…</p></div>`;
}
function hydrateResumeFrames(){
  document.querySelectorAll('.resume-template-frame').forEach(frame=>{
    if(frame.dataset.hydrated==='1')return;
    const item=loadResumeHistory().find(x=>x.id===frame.dataset.historyId),r=item?.versions?.[frame.dataset.versionKey];
    if(!r)return;
    frame.dataset.hydrated='1';
    // 永远根据当前结构化简历重新生成 HTML，避免旧 templateHtml / 浏览器缓存把原始模板带回来。
    adaptResumeToTemplate(r).then(html=>{
      r.templateHtml=html;
      const h=loadResumeHistory();
      const it=h.find(x=>x.id===item.id);
      if(it?.versions?.[frame.dataset.versionKey]){
        it.versions[frame.dataset.versionKey].templateHtml=html;
        localStorage.setItem(RESUME_HISTORY_KEY,JSON.stringify(h));
      }
      frame.srcdoc=html;
    }).catch(e=>{frame.replaceWith(Object.assign(document.createElement('div'),{className:'status-text error',textContent:'模板加载失败：'+friendlyError(e)}));});
  });
}
function openResumeEditModal(historyId,key){
  const h=loadResumeHistory();const item=h.find(x=>x.id===historyId);const r=item?.versions?.[key];if(!item||!r)return;
  const bulletRows=(r.experiences||[]).map((x,i)=>`<div class="field full"><label>${resumeEscapeText(x.company)} · ${resumeEscapeText(x.position)}</label><textarea id="re-${i}" rows="5">${resumeEscapeText((x.bullets||[]).join('\n'))}</textarea></div>`).join('');
  openModal('编辑简历',`<form onsubmit="saveResumeEdit(event,'${historyId}','${key}')" class="form-grid"><div class="field full"><label>综合评价</label><textarea id="re-summary" rows="6">${resumeEscapeText(r.summary)}</textarea></div>${bulletRows}<div class="hint field full">个人信息、教育背景、证书和项目筛选结果由 CareerFit 锁定；这里主要编辑综合评价和工作经历表达。</div><div class="actions field full"><button type="button" class="btn" onclick="closeModal()">取消</button><button class="btn primary">保存修改</button></div></form>`);
}
function loadResumeHistory(){try{return JSON.parse(localStorage.getItem(RESUME_HISTORY_KEY)||'[]')}catch{return[]}}
function saveResumeEdit(e,id,key){e.preventDefault();const h=loadResumeHistory(),item=h.find(x=>x.id===id),r=item?.versions?.[key];if(!r)return; r.summary=document.getElementById('re-summary')?.value.trim()||'';(r.experiences||[]).forEach((x,i)=>{const el=document.getElementById(`re-${i}`);if(el)x.bullets=el.value.split(/\n+/).map(v=>v.trim()).filter(Boolean);});item.versions[key]=normalizeStructuredResume(r); item.versions[key].__versionKey=key; item.versions[key].__jobTitle=item.jobTitle||item.title||''; adaptResumeToTemplate(item.versions[key]).then(html=>{item.versions[key].templateHtml=html;localStorage.setItem(RESUME_HISTORY_KEY,JSON.stringify(h));closeModal();render();toast('简历已保存修改');}).catch(e=>toast('保存模板失败：'+friendlyError(e)));}
function copyResume(id,key){const item=loadResumeHistory().find(x=>x.id===id);const r=item?.versions?.[key];if(!r)return;navigator.clipboard?.writeText(resumePlainText(r)).then(()=>toast('已复制简历纯文本')).catch(()=>toast('复制失败，请检查浏览器权限'));}
function openGeneratedResumeHtml(id,key){
  const item=loadResumeHistory().find(x=>x.id===id),r=item?.versions?.[key];
  if(!r)return;
  // 先同步打开空白窗口，再异步写入“已经生成的 HTML”。这样绝不会把主模板 URL 当成结果打开，也不会被异步 popup blocker 吃掉。
  const w=window.open('about:blank','_blank');
  if(!w)return toast('浏览器阻止了新窗口，请允许弹窗');
  w.document.open();
  w.document.write('<!doctype html><title>CareerFit 正在生成…</title><body style="font-family:system-ui;padding:24px">正在打开生成后的简历…</body>');
  w.document.close();
  const payload={...r,__versionKey:key,__jobTitle:item.jobTitle||item.title||''};
  adaptResumeToTemplate(payload).then(html=>{
    const h=loadResumeHistory(),it=h.find(x=>x.id===id);
    if(it?.versions?.[key]){it.versions[key].templateHtml=html;localStorage.setItem(RESUME_HISTORY_KEY,JSON.stringify(h));}
    w.document.open();
    w.document.write(html);
    w.document.close();
    try{w.focus();}catch{}
  }).catch(e=>{
    w.document.open();
    w.document.write('<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;padding:24px;color:#b91c1c">生成可编辑简历失败：'+escapeHtml(friendlyError(e))+'</body>');
    w.document.close();
    toast('生成可编辑简历失败：'+friendlyError(e));
  });
}

function printResume(id,key){
  const item=loadResumeHistory().find(x=>x.id===id),r=item?.versions?.[key];
  if(!r)return;
  adaptResumeToTemplate({...r,__versionKey:key,__jobTitle:item.jobTitle||item.title||''}).then(html=>{
    r.templateHtml=html;
    const h=loadResumeHistory(),it=h.find(x=>x.id===id);
    if(it?.versions?.[key]){it.versions[key].templateHtml=html;localStorage.setItem(RESUME_HISTORY_KEY,JSON.stringify(h));}
    const w=window.open('','_blank');
    if(!w)return toast('浏览器阻止了新窗口，请允许弹窗');
    w.document.open();w.document.write(html);w.document.close();
    setTimeout(()=>{try{w.focus();w.print();}catch{}},500);
  }).catch(e=>toast('PDF/打印生成失败：'+friendlyError(e)));
}
function sanitizeFilename(v){return String(v||'简历').replace(/[\\/:*?"<>|]/g,'-').replace(/\s+/g,' ').trim().replace(/[. ]+$/,'')||'简历';}
function downloadResumeHtml(id,key){
  const item=loadResumeHistory().find(x=>x.id===id),r=item?.versions?.[key];
  if(!r)return;
  adaptResumeToTemplate({...r,__versionKey:key,__jobTitle:item.jobTitle||item.title||''}).then(html=>{
    r.templateHtml=html;
    const h=loadResumeHistory(),it=h.find(x=>x.id===id);
    if(it?.versions?.[key]){it.versions[key].templateHtml=html;localStorage.setItem(RESUME_HISTORY_KEY,JSON.stringify(h));}
    const blob=new Blob([html],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;const safeJob=sanitizeFilename(item.jobTitle||'简历');const versionName=key==='targeted'?'针对性重构':key==='keywordFocused'?'关键词强化':key;a.download=`${safeJob}-${versionName}.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }).catch(e=>toast('HTML生成失败：'+friendlyError(e)));
}
function renderHistoryItem(x){
  const when=x.generatedAt?new Date(x.generatedAt).toLocaleString('zh-CN',{hour12:false}):'时间未知';
  const label=x.jobTitle||x.title||'未命名岗位';
  const status=x.status==='partial'?' · 部分完成':'';
  const versions=[['targeted','Targeted · 针对性重构版 ⭐'],['keywordFocused','Keyword Focused · 关键词强化版']];
  return `<details class="resume-history-card"><summary><div><strong>${escapeHtml(label)}</strong><div class="meta">${escapeHtml(when)}${status}</div></div><span class="history-arrow">›</span></summary><div class="history-body">${x.rebuildPlan?renderRebuildPlan(x.rebuildPlan):''}${x.status==='partial'?'<div class="status-text error">本次生成未全部完成，已保留成功版本。回到 JD 分析页可重新生成。</div>':''}<div class="resume-version-grid">${versions.map(([k,label])=>x.versions?.[k]?`<article class="resume-version"><div class="section-head"><strong>${label}</strong><div class="actions compact"><button class="btn" onclick="openResumeEditModal('${x.id}','${k}')">编辑内容</button><button class="btn" onclick="copyResume('${x.id}','${k}')">复制纯文本</button><button class="btn" onclick="downloadResumeHtml('${x.id}','${k}')">下载 HTML</button><button class="btn primary" onclick="openGeneratedResumeHtml('${x.id}','${k}')">打开可编辑 HTML</button><button class="btn" onclick="printResume('${x.id}','${k}')">PDF / 打印</button></div></div><iframe class="resume-template-frame" title="${label}" data-history-id="${x.id}" data-version-key="${k}"></iframe></article>`:'').join('')}</div>${renderWhyChanged(x.whyChanged)}</div></details>`;
}
function resumesPage(){
  const h=loadResumeHistory();
  return `<div class="page-title"><p class="eyebrow">简历</p><h1 style="font-size:42px">真正的定制简历。</h1><p class="lead">每一次 JD 重构都会独立保存。按“岗位 + 生成时间”查看本次重构方向与两版简历。</p></div><section class="card"><div class="section-head"><div><h2>简历重构记录</h2><div class="sub">历史记录不会因职业整理库后续修改而改变。</div></div><span class="plan-badge">${h.length} 次</span></div>${h.length?h.map(renderHistoryItem).join(''):emptyBlock('还没有生成简历','先进入 JD 分析，分析一个岗位后生成两版简历。')}</section>`;
}

function compactCareerEvidence(){
  const p=profile;
  return {
    personal:p.personal,
    experiences:(p.experiences||[]).map((x,i)=>({id:`experience_${i+1}`,company:x.company,position:x.position,start:x.start,end:x.end,current:x.current,content:x.workContent||x.rawWorkContent||''})),
    projects:(p.projects||[]).map((x,i)=>({id:`project_${i+1}`,title:x.title,start:x.start,end:x.end,description:x.description||x.rawDescription||''})),
    certificates:p.certificates||[],skills:p.skills||[],
    evidence:(p.evidenceBank||[]).filter(x=>x.confirmed).map(x=>({id:x.id,title:x.title,capability:x.capability,scenario:x.scenario,behavior:x.behavior,method:x.method,result:x.result,boundary:x.boundary,strength:x.strength,sourceName:x.sourceName,sourceQuote:x.sourceQuote})),
    evidenceGaps:loadEvidenceGaps()
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
  const btn=document.getElementById('resume-generate-btn');const status=btn?.closest('.card')?.querySelector('.resume-generation-status');
  if(btn){btn.disabled=true;btn.classList.add('is-loading');btn.textContent='⏳ 正在重构…';}
  const update=(html)=>{if(status){status.innerHTML=html;status.className='hint ai-status resume-generation-status';}};
  let plan;
  try{
    update('⏳ 正在确认岗位要求与真实经历的匹配证据…');
    plan=await ensureRebuildPlan(saved,ai);
    update('✓ 已完成 JD → 能力 → 真实证据匹配<br>⏳ 正在生成 Targeted（针对性重构版）<br>○ Keyword Focused（关键词强化版）');
  }catch(e){
    update(`❌ 重构方案生成失败：${escapeHtml(friendlyError(e))}`);toast('重构方案生成失败：'+friendlyError(e));
    if(btn){btn.disabled=false;btn.classList.remove('is-loading');btn.textContent='开始按此方案重构简历';}return;
  }
  const fixedEdu=fixedEducation();
  const baseContext=`职业整理库（唯一事实来源）：${JSON.stringify(compactCareerEvidence())}

招聘 JD：${saved.jd}

JD 深度分析：${JSON.stringify(saved.analysis||{})}

简历重构方案：${JSON.stringify(plan)}

固定个人信息（仅当已有值时使用，不得生成占位文字）：${JSON.stringify(profile.personal||{})}

固定教育背景：${JSON.stringify(fixedEdu)}`;
  const rules=`你是 CareerFit 的 JD 驱动简历重构专家。你的任务不是润色原简历，而是从用户全部真实经历中，重新组织一份“证明用户为什么适合该岗位”的简历。

能力迁移原则（必须遵守）：
1. 不得用职位名称、行业名称直接判断经历是否相关。必须从 JD 要求 → 能力 → 任务/行为 → 场景 → 真实证据建立匹配。
2. 能力具有可迁移性：过去工作和目标岗位场景不同，不代表能力不可迁移。客户需求挖掘、需求沟通、问题拆解、项目推进、数据分析、用户洞察、方案执行等方法论可以迁移到新场景。
3. 一个 JD 能力可以由多个不同经历共同证明，但每条事实必须保留原始来源，绝不能把不同公司的事实混成一个经历。
4. 判断一条事实是否保留时使用“删除测试”：如果删除它会明显削弱对某项重要 JD 能力的证明，就保留；否则可以压缩或删除。
5. 强相关证据扩大表达；中相关证据换成可迁移能力表达；弱相关证据压缩；无助于证明任何核心 JD 能力的内容省略。不要为了“完整”平均展示所有经历。
6. 不得把非 AI 工作写成 AI 工作；不得把外贸、数据分析等经历虚构成产品经理经历。只能表达真实可迁移能力。
7. 禁止编造或改变公司、职位、日期、客户、工具、技能、数字、职责、成果。所有数字必须原样保留。JD 中没有真实证据的能力只能作为缺口，绝不能写进简历。
8. 项目只展示与目标 JD 有明确证明关系的项目；专业技能只从职业库已有技能中筛选；证书全部保留。个人信息和教育背景固定，不生成“未填写姓名”等任何占位内容。
9. Targeted 是最强的能力匹配重构；Keyword Focused 在不改变事实的前提下，更主动采用 JD 原文中真实匹配的关键词表达。两版都必须是完整、可投递的简历结构。`;
  const schema=`只返回严格 JSON，不要 Markdown：{"summary":"","projects":[{"title":"必须来自职业库","date":"","bullets":[]}],"experiences":[{"company":"必须来自职业库","position":"必须来自职业库","date":"","bullets":[]}],"skills":[],"certificates":[]}`;
  const versions={};
  let history=loadResumeHistory();
  const item={id:crypto.randomUUID(),title:saved.title,jobTitle:saved.analysis?.jobTitle||saved.title||'未命名岗位',jd:saved.jd,generatedAt:new Date().toISOString(),versions:{},whyChanged:[],rebuildPlan:plan,status:'generating',version:'v6.0'};
  history.unshift(item);localStorage.setItem(RESUME_HISTORY_KEY,JSON.stringify(history));
  const saveProgress=()=>{const idx=history.findIndex(x=>x.id===item.id);if(idx>=0){history[idx]=item;localStorage.setItem(RESUME_HISTORY_KEY,JSON.stringify(history));}};
  const jobs=[['targeted','Targeted（针对性重构版）','主力版本。按 JD 重新分配简历空间，优先展示能证明核心能力的真实经历；允许大幅重排、压缩、合并同一公司的真实事实。'],['keywordFocused','Keyword Focused（关键词强化版）','在 Targeted 逻辑基础上，更主动使用 JD 中与用户真实证据对应的关键词和表达，但不得为了关键词覆盖而虚构能力。']];
  try{
    for(let i=0;i<jobs.length;i++){
      const [key,label,style]=jobs[i];
      update(`✓ 已完成 JD → 能力 → 真实证据匹配<br>${i>0?'✓ 已完成 Targeted（针对性重构版）<br>':''}⏳ 正在生成 ${label}…`);
      try{
        const raw=await callTrackedAI(ai,`${rules}

当前版本：${label}
版本策略：${style}
${schema}

${baseContext}`);
        const parsed=parseAIJSON(raw);const normalized=normalizeStructuredResume(parsed);
        normalized.__versionKey=key; normalized.__jobTitle=item.jobTitle||item.title||'';
        normalized.templateHtml=await adaptResumeToTemplate(normalized);
        if(!normalized.summary&&!normalized.experiences.length&&!normalized.projects.length)throw new Error('AI 返回的简历内容为空');
        versions[key]=normalized;item.versions[key]=normalized;saveProgress();
      }catch(e){
        item.status='partial';saveProgress();const reason=friendlyError(e);update(`❌ ${label}生成失败：${escapeHtml(reason)}<br>已保留此前成功生成的版本。<br><button class="btn" onclick="generateResumeVersions()">重新生成失败版本</button>`);toast(`${label}生成失败：${reason}`);return;
      }
    }
    update('✓ 两版结构化简历均已生成<br>⏳ 正在整理“为什么这样修改”…');
    try{
      const why=await callAIJSON(`根据 JD、重构方案、Targeted 简历和职业库，用中文解释这次重构为什么这样做。即使 JD 是英文，也必须用中文说明。重点说明：哪些能力被强化、哪些事实被弱化/省略、哪些项目/技能被选择，以及哪些 JD 要求仍然没有真实证据。必须尊重能力迁移原则：不同场景的可迁移能力可以共同证明同一 JD 能力，但不得混淆事实来源。返回严格 JSON 数组，最多8条，每项优先使用 {"change":"具体变化","reason":"具体原因"}。
JD：${saved.jd}
重构方案：${JSON.stringify(plan)}
Targeted简历：${JSON.stringify(item.versions.targeted)}
职业库：${JSON.stringify(compactCareerEvidence())}`);
      item.whyChanged=Array.isArray(why)?why:(Array.isArray(why?.whyChanged)?why.whyChanged:[]);
    }catch(e){item.whyChanged=[];}
    item.versions={...versions};item.status='completed';saveProgress();
    update('✓ 两版结构化简历完成<br>已保存到「简历」页面。');setPage('resumes');
    setTimeout(()=>toast('✓ 两版定制简历已生成，已保存到“简历”页面'),50);
  }finally{if(btn){btn.disabled=false;btn.classList.remove('is-loading');btn.textContent='开始按此方案重构简历';}}
}

function exportProfile(){
  const backup=structuredClone(profile);if(backup.ai)backup.ai.apiKey="";
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`careerfit-profile-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);toast("职业整理库已导出");
}
function importProfile(file){
  if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!data||!Array.isArray(data.experiences)||!Array.isArray(data.projects))throw new Error();profile={...blankProfile,...data,ai:{...blankProfile.ai,...(data.ai||{})}};saveProfile();toast("职业整理库已导入");}catch{alert("这不是有效的 CareerFit 职业整理库 JSON。")}};reader.readAsText(file);
}


let jdClipboardImages=[];
function showClipboardJdImages(){
  const el=document.getElementById('jd-image-names');if(!el)return;
  if(jdClipboardImages.length){el.innerHTML=`已粘贴 ${jdClipboardImages.length} 张 JD 截图，可继续 ⌘V / Ctrl+V 添加。<br><span class="small-note">图片仅在点击“AI识别截图”时发送给当前 AI。</span>`;}
}
async function recognizeJDScreenshots(){
  const input=document.getElementById('jd-images'),status=document.getElementById('jd-status');
  const files=[...(input?.files||[])];
  if(!files.length&&!jdClipboardImages.length)return toast('请先上传或粘贴 JD 截图');
  const ai=getCurrentAI();if(!ai)return toast('请先在设置里配置一个 AI');
  setActionBusy('jd-ocr-btn',true,'⏳ AI正在识别…');setActionBusy('jd-analyze-btn',true,'⏳ 请稍候…');
  try{
    const images=[];for(const f of [...files,...jdClipboardImages])images.push(await fileToImageData(f));
    setStatus('jd-status',`⏳ 正在识别 ${images.length} 张 JD 截图，请稍候，不要重复点击。`);
    const text=await callAI(ai,`请完整、准确地识别这些招聘 JD 截图中的文字。保持原有顺序和段落结构。不要总结、改写或补充不存在的内容。只返回识别到的 JD 原文。`,images);
    if(!text.trim())throw new Error('没有识别到有效文字');
    document.getElementById('jd-text').value=text.trim();
    const title=document.getElementById('jd-title')?.value.trim()||'';
    localStorage.setItem(JD_KEY,JSON.stringify({title,jd:text.trim(),analysis:null,createdAt:new Date().toISOString(),source:'image'}));
    setStatus('jd-status','✓ JD 截图识别完成。请检查文字，确认无误后再点击“AI 分析 JD”。','success');
  }catch(e){setStatus('jd-status',`❌ 截图识别失败：${friendlyError(e)}`,'error');}
  finally{setActionBusy('jd-ocr-btn',false);setActionBusy('jd-analyze-btn',false);}
}
document.addEventListener('paste',e=>{
  const target=e.target;
  if(!(target instanceof HTMLTextAreaElement)||target.id!=='jd-text')return;
  const items=[...(e.clipboardData?.items||[])];const imgs=items.filter(x=>x.type?.startsWith('image/'));
  if(!imgs.length)return;
  e.preventDefault();
  imgs.forEach(item=>{const f=item.getAsFile();if(f)jdClipboardImages.push(f);});
  showClipboardJdImages();toast(`已粘贴 ${imgs.length} 张 JD 截图`);
});

// Global navigation handler.
document.addEventListener("click",event=>{const button=event.target.closest("[data-page]");if(!button)return;setPage(button.dataset.page);});
render();
