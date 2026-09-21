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
function renderResumePaper(r){
  const p=r.personal||{};
  return `<div class="resume-paper"><header class="resume-paper-head">${p.name?`<h2>${resumeEscapeText(p.name)}</h2>`:''}<div class="resume-headline">${resumeEscapeText(p.headline||'')}</div><div class="resume-contact">${[p.email,p.phone,p.location].filter(Boolean).map(resumeEscapeText).join(' · ')}</div></header>
  ${r.summary?`<section class="resume-section"><h3>综合评价</h3><p>${resumeEscapeText(r.summary)}</p></section>`:''}
  ${r.projects?.length?`<section class="resume-section"><h3>项目经历</h3>${r.projects.map(x=>`<article class="resume-entry"><div class="resume-entry-head"><strong>${resumeEscapeText(x.title)}</strong><span>${resumeEscapeText(x.date)}</span></div><ul>${(x.bullets||[]).map(b=>`<li>${resumeEscapeText(b)}</li>`).join('')}</ul></article>`).join('')}</section>`:''}
  ${r.experiences?.length?`<section class="resume-section"><h3>工作经历</h3>${r.experiences.map(x=>`<article class="resume-entry"><div class="resume-entry-head"><div><strong>${resumeEscapeText(x.company)}</strong><span class="resume-position">${resumeEscapeText(x.position)}</span></div><span>${resumeEscapeText(x.date)}</span></div><ul>${(x.bullets||[]).map(b=>`<li>${resumeEscapeText(b)}</li>`).join('')}</ul></article>`).join('')}</section>`:''}
  ${r.education?.length?`<section class="resume-section"><h3>教育背景</h3>${r.education.map(x=>`<div class="resume-fixed-line"><strong>${resumeEscapeText(x.school||x.raw||'')}</strong>${x.degree?`<span>${resumeEscapeText(x.degree)}</span>`:''}${x.start||x.end?`<span>${resumeEscapeText([x.start,x.end].filter(Boolean).join('—'))}</span>`:''}</div>`).join('')}</section>`:''}
  ${r.skills?.length?`<section class="resume-section"><h3>专业技能</h3><p>${r.skills.map(resumeEscapeText).join(' · ')}</p></section>`:''}
  ${r.certificates?.length?`<section class="resume-section"><h3>证书</h3><p>${r.certificates.map(resumeEscapeText).join(' · ')}</p></section>`:''}
  </div>`;
}
function openResumeEditModal(historyId,key){
  const h=loadResumeHistory();const item=h.find(x=>x.id===historyId);const r=item?.versions?.[key];if(!item||!r)return;
  const bulletRows=(r.experiences||[]).map((x,i)=>`<div class="field full"><label>${resumeEscapeText(x.company)} · ${resumeEscapeText(x.position)}</label><textarea id="re-${i}" rows="5">${resumeEscapeText((x.bullets||[]).join('\n'))}</textarea></div>`).join('');
  openModal('编辑简历',`<form onsubmit="saveResumeEdit(event,'${historyId}','${key}')" class="form-grid"><div class="field full"><label>综合评价</label><textarea id="re-summary" rows="6">${resumeEscapeText(r.summary)}</textarea></div>${bulletRows}<div class="hint field full">个人信息、教育背景、证书和项目筛选结果由 CareerFit 锁定；这里主要编辑综合评价和工作经历表达。</div><div class="actions field full"><button type="button" class="btn" onclick="closeModal()">取消</button><button class="btn primary">保存修改</button></div></form>`);
}
function loadResumeHistory(){try{return JSON.parse(localStorage.getItem(RESUME_HISTORY_KEY)||'[]')}catch{return[]}}
function saveResumeEdit(e,id,key){e.preventDefault();const h=loadResumeHistory(),item=h.find(x=>x.id===id),r=item?.versions?.[key];if(!r)return; r.summary=document.getElementById('re-summary')?.value.trim()||'';(r.experiences||[]).forEach((x,i)=>{const el=document.getElementById(`re-${i}`);if(el)x.bullets=el.value.split(/\n+/).map(v=>v.trim()).filter(Boolean);});item.versions[key]=normalizeStructuredResume(r);localStorage.setItem(RESUME_HISTORY_KEY,JSON.stringify(h));closeModal();render();toast('简历已保存修改');}
function copyResume(id,key){const item=loadResumeHistory().find(x=>x.id===id);const r=item?.versions?.[key];if(!r)return;navigator.clipboard?.writeText(resumePlainText(r)).then(()=>toast('已复制简历纯文本')).catch(()=>toast('复制失败，请检查浏览器权限'));}
function printResume(id,key){const item=loadResumeHistory().find(x=>x.id===id),r=item?.versions?.[key];if(!r)return;const w=window.open('','_blank');if(!w)return;w.document.write(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${resumeEscapeText(item.jobTitle||'CareerFit 简历')}</title><style>body{margin:0;background:#eee;font-family:Arial,'Microsoft YaHei',sans-serif}.resume-paper{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:18mm;box-sizing:border-box;color:#111;line-height:1.55}.resume-paper-head{text-align:center;border-bottom:2px solid #111;padding-bottom:12px}.resume-paper-head h2{margin:0;font-size:25px}.resume-headline{font-size:14px;margin-top:5px}.resume-contact{font-size:11px;color:#555;margin-top:5px}.resume-section{margin-top:17px}.resume-section h3{font-size:15px;border-bottom:1px solid #ccc;padding-bottom:5px;margin:0 0 9px}.resume-section p{margin:0;font-size:12px}.resume-entry{margin:0 0 12px}.resume-entry-head{display:flex;justify-content:space-between;gap:12px;font-size:12px}.resume-position{margin-left:8px;font-weight:400}.resume-entry ul{margin:5px 0 0;padding-left:18px;font-size:11.5px}.resume-entry li{margin:3px 0}.resume-fixed-line{display:flex;gap:18px;font-size:12px;margin:6px 0}</style></head><body>${renderResumePaper(r)}<script>window.onload=()=>window.print();<\/script></body></html>`);w.document.close();}
function renderWhyChanged(items){
  if(!Array.isArray(items)||!items.length)return '';
  return `<div class="match-box why-changed"><h3>为什么这样修改</h3><ul>${items.slice(0,8).map(x=>{
    if(x&&typeof x==='object'){
      const change=x.change||x.action||x.title||x.fact||'';
      const reason=x.reason||x.explanation||x.source||'';
      return `<li>${change?`<strong>${safeAIText(change)}</strong>`:''}${reason?`<div>${safeAIText(reason)}</div>`:(!change?safeAIText(x):'')}</li>`;
    }
    return `<li>${safeAIText(x)}</li>`;
  }).join('')}</ul></div>`;
}
function renderHistoryItem(x){
  const when=x.generatedAt?new Date(x.generatedAt).toLocaleString('zh-CN',{hour12:false}):'时间未知';
  const label=x.jobTitle||x.title||'未命名岗位';
  const status=x.status==='partial'?' · 部分完成':'';
  const versions=[['targeted','Targeted · 针对性重构版 ⭐'],['keywordFocused','Keyword Focused · 关键词强化版']];
  return `<details class="resume-history-card"><summary><div><strong>${escapeHtml(label)}</strong><div class="meta">${escapeHtml(when)}${status}</div></div><span class="history-arrow">›</span></summary><div class="history-body">${x.rebuildPlan?renderRebuildPlan(x.rebuildPlan):''}${x.status==='partial'?'<div class="status-text error">本次生成未全部完成，已保留成功版本。回到 JD 分析页可重新生成。</div>':''}<div class="resume-version-grid">${versions.map(([k,label])=>x.versions?.[k]?`<article class="resume-version"><div class="section-head"><strong>${label}</strong><div class="actions compact"><button class="btn" onclick="openResumeEditModal('${x.id}','${k}')">编辑</button><button class="btn" onclick="copyResume('${x.id}','${k}')">复制</button><button class="btn" onclick="printResume('${x.id}','${k}')">PDF/打印</button></div></div>${String(x.versions[k].version||'').startsWith('structured-v5.')?renderResumePaper(x.versions[k]):`<div class="content-preview">${safeAIText(x.versions[k])}</div>`}</article>`:'').join('')}</div>${renderWhyChanged(x.whyChanged)}</div></details>`;
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
        if(!normalized.summary&&!normalized.experiences.length&&!normalized.projects.length)throw new Error('AI 返回的简历内容为空');
        versions[key]=normalized;item.versions[key]=normalized;saveProgress();
      }catch(e){
        item.status='partial';saveProgress();const reason=friendlyError(e);update(`❌ ${label}生成失败：${escapeHtml(reason)}<br>已保留此前成功生成的版本。<br><button class="btn" onclick="generateResumeVersions()">重新生成失败版本</button>`);toast(`${label}生成失败：${reason}`);return;
      }
    }
    update('✓ 两版结构化简历均已生成<br>⏳ 正在整理“为什么这样修改”…');
    try{
      const why=await callAIJSON(`根据 JD、重构方案、Targeted 简历和职业库，解释这次重构为什么这样做。重点说明：哪些能力被强化、哪些事实被弱化/省略、哪些项目/技能被选择，以及哪些 JD 要求仍然没有真实证据。必须尊重能力迁移原则：不同场景的可迁移能力可以共同证明同一 JD 能力，但不得混淆事实来源。返回严格 JSON 数组，最多8条，每项优先使用 {"change":"具体变化","reason":"具体原因"}。
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

// Global navigation handler.
document.addEventListener("click",event=>{const button=event.target.closest("[data-page]");if(!button)return;setPage(button.dataset.page);});
render();
