
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabaseUrl = 'https://zobsyvttmrocmtfbppfm.supabase.co'
const supabaseAnonKey = 'sb_publishable_-OCCW_mr0YKCwTcXPycAcg_yPtW3kg5'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const STORAGE_KEY = "linkflow_clean_editor_v1";

const DEMO = {
  business: {
    name: "Sunshine Pressure Washing",
    phone: "(954) 555-1022",
    slug: "sunshinepressurewash",
    mode: "both",
    agreementTitle: "Service Agreement"
  },
  services: [
    {
      id: "svc1",
      name: "Driveway Cleaning",
      base: 120,
      mode: "quote",
      questions: [
        {
          id:"q1",
          label:"How big is the job?",
          type:"multiple",
          options:[
            {id:"o1",label:"Small",modifierType:"fixed",modifierValue:0},
            {id:"o2",label:"Medium",modifierType:"fixed",modifierValue:30},
            {id:"o3",label:"Large",modifierType:"fixed",modifierValue:60}
          ]
        },
        {
          id:"q2",
          label:"Heavy stains / extra work?",
          type:"yesno",
          options:[
            {id:"o4",label:"No",modifierType:"fixed",modifierValue:0},
            {id:"o5",label:"Yes",modifierType:"fixed",modifierValue:35}
          ]
        },
        {
          id:"q3",
          label:"Gate code needed?",
          type:"text",
          options:[]
        }
      ]
    },
    {
      id: "svc2",
      name: "House Wash",
      base: 0,
      mode: "estimate",
      questions: [
        { id:"q4", label:"House size", type:"multiple", options:[{id:"o6",label:"Small",modifierType:"fixed",modifierValue:0},{id:"o7",label:"Medium",modifierType:"fixed",modifierValue:0},{id:"o8",label:"Large",modifierType:"fixed",modifierValue:0}] }
      ]
    }
  ],
  jobs: []
};

let state = {
  business: {...DEMO.business},
  services: JSON.parse(JSON.stringify(DEMO.services)),
  jobs: [],
  currentFlowMode: null,
  currentQuote: 0,
  currentServiceId: null,
  editingServiceId: null,
  latestAnswers: []
};

function qs(id){ return document.getElementById(id); }
function qsa(sel){ return document.querySelectorAll(sel); }
function money(n){ return "$" + Number(n || 0).toLocaleString(undefined,{maximumFractionDigits:2}); }
function uid(prefix="id"){ return prefix + "_" + Date.now() + "_" + Math.floor(Math.random()*100000); }

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    business: state.business,
    services: state.services,
    jobs: state.jobs
  }));
}
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed.business) state.business = parsed.business;
      if(parsed.services) state.services = parsed.services;
      if(parsed.jobs) state.jobs = parsed.jobs;
    }
  }catch(e){}
}
async function copyLink(){
  const link = new URL("customer.html", window.location.href).toString();
  try{
    await navigator.clipboard.writeText(link);
    alert("Booking link copied.");
  }catch(e){
    prompt("Copy this link:", link);
  }
}
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
function effectiveModeForService(service){
  if(state.business.mode === "quote") return "quote";
  if(state.business.mode === "estimate") return "estimate";
  return service.mode;
}
function switchScreen(name){
  qsa(".screen").forEach(s => s.classList.remove("active"));
  const target = qs("screen-" + name);
  if(target) target.classList.add("active");
  qsa(".nav-btn").forEach(b => b.classList.remove("active"));
  const activeBtn = document.querySelector('.nav-btn[data-screen="' + name + '"]');
  if(activeBtn) activeBtn.classList.add("active");
}
function renderSharedBits(){
  const link = new URL("customer.html", window.location.href).toString();
  if(qs("bookingLinkNotice")) qs("bookingLinkNotice").textContent = link;
  if(qs("bookingLinkNoticeLinkTab")) qs("bookingLinkNoticeLinkTab").textContent = link;

  if(qs("bizName")) qs("bizName").value = state.business.name;
  if(qs("bizPhone")) qs("bizPhone").value = state.business.phone;
  if(qs("bizSlug")) qs("bizSlug").value = state.business.slug;
  if(qs("quoteMode")) qs("quoteMode").value = state.business.mode;
  if(qs("agreementTitle")) qs("agreementTitle").value = state.business.agreementTitle;

  if(qs("customerBizName")) qs("customerBizName").textContent = state.business.name;
  if(qs("customerBizSub")) qs("customerBizSub").textContent = "Get a quote or book an appointment in just a few steps.";
  if(qs("agreementHeading")) qs("agreementHeading").textContent = state.business.agreementTitle;
}
function saveSettings(){
  state.business = {
    name: qs("bizName").value.trim() || "My Business",
    phone: qs("bizPhone").value.trim(),
    slug: qs("bizSlug").value.trim() || "mybusiness",
    mode: qs("quoteMode").value,
    agreementTitle: qs("agreementTitle").value.trim() || "Service Agreement"
  };
  saveState();
  renderSharedBits();
  renderCustomerServices();
  alert("Settings saved.");
}
function loadDemo(){
  state.business = JSON.parse(JSON.stringify(DEMO.business));
  state.services = JSON.parse(JSON.stringify(DEMO.services));
  saveState();
  renderEverything();
}
function renderMetrics(){
  if(qs("mNew")) qs("mNew").textContent = state.jobs.length;
  if(qs("mScheduled")) qs("mScheduled").textContent = state.jobs.filter(j => j.status === "scheduled").length;
  if(qs("mCompleted")) qs("mCompleted").textContent = state.jobs.filter(j => j.status === "completed").length;
  if(qs("mQuoted")) qs("mQuoted").textContent = state.jobs.filter(j => j.mode === "quote").length;
}
function renderJobs(){
  const recent = qs("recentJobs");
  const all = qs("jobList");
  const empty = '<div class="job-card"><div class="mini">No jobs yet. Use the customer page to create a booking.</div></div>';

  if(recent){
    recent.innerHTML = state.jobs.length ? state.jobs.slice(0,3).map(j => `
      <div class="job-card">
        <strong>${escapeHtml(j.customer)}</strong>
        <div class="mini">${escapeHtml(j.serviceName)} · ${j.mode === "estimate" ? "Appointment" : money(j.price)} · ${escapeHtml(j.scheduleDate)} ${escapeHtml(j.scheduleTime)}</div>
      </div>
    `).join("") : empty;
  }
  if(all){
    all.innerHTML = state.jobs.length ? state.jobs.map(j => `
      <div class="job-card">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
          <div>
            <strong>${escapeHtml(j.customer)}</strong> <span class="chip">${j.mode === "estimate" ? "Appointment" : "Quote"}</span>
            <div class="mini">${escapeHtml(j.serviceName)} · ${j.mode === "estimate" ? "Appointment" : money(j.price)} · ${escapeHtml(j.scheduleDate)} ${escapeHtml(j.scheduleTime)}</div>
            <div class="mini">${escapeHtml(j.address)} · ${escapeHtml(j.phone)}</div>
          </div>
          <button data-complete-job="${j.id}">Mark Complete</button>
        </div>
      </div>
    `).join("") : empty;
  }
}
function clearJobs(){
  if(!confirm("Clear all jobs?")) return;
  state.jobs = [];
  saveState();
  renderMetrics();
  renderJobs();
}
function newService(){
  const service = {
    id: uid("svc"),
    name: "New Service",
    base: 0,
    mode: "quote",
    questions: []
  };
  state.services.push(service);
  state.editingServiceId = service.id;
  saveState();
  renderServicesList();
  openServiceEditor(service.id);
}
function renderServicesList(){
  const box = qs("serviceList");
  if(!box) return;
  box.innerHTML = state.services.length ? state.services.map(s => `
    <div class="service-card">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
        <div>
          <strong>${escapeHtml(s.name)}</strong>
          <div class="mini">${effectiveModeForService(s) === "quote" ? "Get Quote" : "Book Appointment"} · Base ${money(s.base)}</div>
          <div class="mini">${s.questions.length} question${s.questions.length === 1 ? "" : "s"}</div>
        </div>
        <button data-edit-service="${s.id}">Edit</button>
      </div>
    </div>
  `).join("") : '<div class="service-card"><div class="mini">No services yet.</div></div>';
}
function openServiceEditor(id){
  state.editingServiceId = id;
  const service = state.services.find(s => s.id === id);
  if(!service) return;
  qs("editorTitle").textContent = service.name || "Edit service";
  qs("editServiceName").value = service.name;
  qs("editServiceBase").value = service.base;
  qs("editServiceMode").value = service.mode;
  renderQuestionEditor(service);
  switchScreen("editor");
}
function ensureQuestionOptionsShape(question){
  if(question.type === "yesno" && (!question.options || question.options.length !== 2)){
    question.options = [
      {id:uid("opt"), label:"Yes", modifierType:"fixed", modifierValue:0},
      {id:uid("opt"), label:"No", modifierType:"fixed", modifierValue:0},
    ];
  }
  if((question.type === "text" || question.type === "number") && !question.options){
    question.options = [];
  }
  if(question.type === "multiple" && (!question.options || question.options.length === 0)){
    question.options = [{id:uid("opt"), label:"Option 1", modifierType:"fixed", modifierValue:0}];
  }
}
function renderModifierFields(question, option){
  const key = `${question.id}__${option.id}`;
  return `
    <div class="option-line">
      <div>
        <input data-opt-label="${key}" value="${escapeHtml(option.label)}" placeholder="Option name" />
      </div>
      <div>
        <select data-opt-type="${key}">
          <option value="fixed" ${option.modifierType==="fixed"?"selected":""}>Fixed $</option>
          <option value="percent" ${option.modifierType==="percent"?"selected":""}>Percent %</option>
          <option value="multiplier" ${option.modifierType==="multiplier"?"selected":""}>Multiplier x</option>
        </select>
      </div>
      <div>
        <input type="number" step="0.01" data-opt-value="${key}" value="${option.modifierValue}" />
      </div>
      <div>
        <button data-delete-option="${key}" class="danger-btn">Remove</button>
      </div>
    </div>
  `;
}
function renderQuestionEditor(service){
  const box = qs("questionList");
  if(!box) return;
  box.innerHTML = service.questions.length ? service.questions.map(q => {
    ensureQuestionOptionsShape(q);
    const helper = q.type === "multiple" ? "Add choices and set how each one changes the price."
      : q.type === "yesno" ? "Yes and No are built in. Just set the pricing rules."
      : q.type === "text" ? "Customer types an answer. No pricing rules here."
      : "Customer enters a number. This is informational for now.";
    return `
    <div class="question-card">
      <div class="row-compact">
        <div>
          <label>Question label</label>
          <input data-q-label="${q.id}" value="${escapeHtml(q.label)}" />
        </div>
        <div>
          <label>Question type</label>
          <select data-q-type="${q.id}" class="q-type-select">
            <option value="multiple" ${q.type==="multiple"?"selected":""}>Multiple Choice</option>
            <option value="yesno" ${q.type==="yesno"?"selected":""}>Yes / No</option>
            <option value="text" ${q.type==="text"?"selected":""}>Text Input</option>
            <option value="number" ${q.type==="number"?"selected":""}>Number Input</option>
          </select>
          <div class="helper">${helper}</div>
        </div>
      </div>

      ${q.type === "multiple" ? `
        <div class="section-title">Options</div>
        <div class="option-head"><div>Option</div><div>Rule</div><div>Value</div><div></div></div>
        <div class="option-table">
          ${(q.options || []).map(opt => renderModifierFields(q, opt)).join("")}
        </div>
        <div class="btn-row"><button data-add-option="${q.id}">Add Option</button></div>
      ` : ""}

      ${q.type === "yesno" ? `
        <div class="section-title">Pricing Rules</div>
        <div class="option-head"><div>Answer</div><div>Rule</div><div>Value</div><div></div></div>
        <div class="option-table">
          ${(q.options || []).map(opt => renderModifierFields(q, opt)).join("")}
        </div>
      ` : ""}

      ${q.type === "text" ? `
        <div class="mini">This question collects information only.</div>
      ` : ""}

      ${q.type === "number" ? `
        <div class="mini">This question collects a number only. Pricing logic can be added later if you want.</div>
      ` : ""}

      <div class="btn-row">
        <button data-delete-question="${q.id}" class="danger-btn">Delete Question</button>
      </div>
    </div>
  `}).join("") : '<div class="question-card"><div class="mini">No questions yet. Add your first question.</div></div>';
}
function addQuestion(){
  const service = state.services.find(s => s.id === state.editingServiceId);
  if(!service) return;
  service.questions.push({
    id: uid("q"),
    label: "New question",
    type: "multiple",
    options: [{id:uid("opt"),label:"Option 1",modifierType:"fixed",modifierValue:0}]
  });
  saveState();
  renderQuestionEditor(service);
}
function addOption(questionId){
  const service = state.services.find(s => s.id === state.editingServiceId);
  if(!service) return;
  const q = service.questions.find(x => x.id === questionId);
  if(!q) return;
  q.options = q.options || [];
  q.options.push({id:uid("opt"), label:"New option", modifierType:"fixed", modifierValue:0});
  saveState();
  renderQuestionEditor(service);
}
function updateQuestionType(questionId, newType){
  const service = state.services.find(s => s.id === state.editingServiceId);
  if(!service) return;
  const question = service.questions.find(q => q.id === questionId);
  if(!question) return;
  question.type = newType;
  if(newType === "yesno"){
    question.options = [
      {id:uid("opt"), label:"Yes", modifierType:"fixed", modifierValue:0},
      {id:uid("opt"), label:"No", modifierType:"fixed", modifierValue:0},
    ];
  } else if(newType === "text" || newType === "number"){
    question.options = [];
  } else if(newType === "multiple" && (!question.options || question.options.length === 0)){
    question.options = [{id:uid("opt"), label:"Option 1", modifierType:"fixed", modifierValue:0}];
  }
  saveState();
  renderQuestionEditor(service);
}
function saveServiceEditor(){
  const service = state.services.find(s => s.id === state.editingServiceId);
  if(!service) return;
  service.name = qs("editServiceName").value.trim() || "Untitled Service";
  service.base = parseFloat(qs("editServiceBase").value) || 0;
  service.mode = qs("editServiceMode").value;

  service.questions = service.questions.map(q => {
    const labelEl = document.querySelector(`[data-q-label="${q.id}"]`);
    const typeEl = document.querySelector(`[data-q-type="${q.id}"]`);
    const nextType = typeEl ? typeEl.value : q.type;

    let nextOptions = [];
    if(nextType === "multiple" || nextType === "yesno"){
      nextOptions = (q.options || []).map(opt => {
        const key = `${q.id}__${opt.id}`;
        const label = document.querySelector(`[data-opt-label="${key}"]`)?.value?.trim() || "Option";
        const modifierType = document.querySelector(`[data-opt-type="${key}"]`)?.value || "fixed";
        const modifierValue = parseFloat(document.querySelector(`[data-opt-value="${key}"]`)?.value) || 0;
        return { ...opt, label, modifierType, modifierValue };
      });
    }

    return {
      ...q,
      label: labelEl ? labelEl.value.trim() || "Question" : q.label,
      type: nextType,
      options: nextOptions
    };
  });

  saveState();
  renderServicesList();
  renderCustomerServices();
  qs("editorTitle").textContent = service.name;
  alert("Service saved.");
}
function deleteService(){
  if(!state.editingServiceId) return;
  if(!confirm("Delete this service?")) return;
  state.services = state.services.filter(s => s.id !== state.editingServiceId);
  state.editingServiceId = null;
  saveState();
  renderServicesList();
  renderCustomerServices();
  switchScreen("services");
}
function renderCustomerServices(){
  const select = qs("custService");
  if(!select) return;
  select.innerHTML = state.services.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
  if(state.services[0]) state.currentServiceId = state.services[0].id;
  renderCustomerQuestions();
}
function renderCustomerQuestions(){
  const select = qs("custService");
  if(!select) return;
  const svcId = select.value || state.currentServiceId;
  state.currentServiceId = svcId;
  const svc = state.services.find(x => x.id === svcId);
  const box = qs("dynamicQuestions");
  if(!box || !svc) return;

  box.innerHTML = svc.questions.map((q, idx) => {
    if(q.type === "text"){
      return `<div class="question-card"><label>${escapeHtml(q.label)}</label><input id="cq_${idx}" data-type="text" placeholder="Type here" /></div>`;
    }
    if(q.type === "number"){
      return `<div class="question-card"><label>${escapeHtml(q.label)}</label><input id="cq_${idx}" data-type="number" type="number" placeholder="Enter number" /></div>`;
    }
    return `<div class="question-card"><label>${escapeHtml(q.label)}</label><select id="cq_${idx}" data-type="${q.type}">${(q.options||[]).map((opt,oi)=>`<option value="${oi}">${escapeHtml(opt.label)}</option>`).join("")}</select></div>`;
  }).join("");
}
function goStep(id){
  qsa(".step").forEach(s => s.classList.remove("active"));
  if(qs(id)) qs(id).classList.add("active");
}
function applyModifier(total, modifierType, modifierValue){
  const value = Number(modifierValue || 0);
  if(modifierType === "fixed") return total + value;
  if(modifierType === "percent") return total + (total * (value / 100));
  if(modifierType === "multiplier") return total * value;
  return total;
}
function modifierText(opt){
  const value = Number(opt.modifierValue || 0);
  if(opt.modifierType === "fixed") return `${value >= 0 ? "+" : ""}${money(value)}`;
  if(opt.modifierType === "percent") return `${value >= 0 ? "+" : ""}${value}%`;
  if(opt.modifierType === "multiplier") return `x${value}`;
  return "";
}
function collectAnswersAndPrice(svc){
  let total = Number(svc.base || 0);
  const parts = [`${svc.name}: ${money(total)}`];
  const answers = [];
  svc.questions.forEach((q, idx) => {
    const el = qs("cq_" + idx);
    if(!el) return;
    if(q.type === "text" || q.type === "number"){
      answers.push({question:q.label, answer:el.value || "", modifierType:null, modifierValue:0});
      parts.push(`${q.label}: ${el.value || "-"}`);
      return;
    }
    const selected = parseInt(el.value, 10) || 0;
    const opt = (q.options || [])[selected];
    if(opt){
      total = applyModifier(total, opt.modifierType, opt.modifierValue);
      answers.push({question:q.label, answer:opt.label, modifierType:opt.modifierType, modifierValue:opt.modifierValue});
      parts.push(`${q.label}: ${opt.label} (${modifierText(opt)})`);
    }
  });
  return { total, parts, answers };
}
function continueCustomerResult(){
  const svc = state.services.find(x => x.id === qs("custService").value);
  if(!svc) return;
  const mode = effectiveModeForService(svc);
  const result = collectAnswersAndPrice(svc);
  state.latestAnswers = result.answers;
  state.currentFlowMode = mode;
  state.currentQuote = result.total;

  qs("resultTitle").textContent = mode === "estimate" ? "Book Appointment" : "Your Quote";
  qs("quotePrice").textContent = mode === "estimate" ? "Appointment" : money(result.total);
  qs("quoteBreakdown").textContent = mode === "estimate" ? "This service is booked by appointment. Choose a time to continue." : result.parts.join(" · ");
  qs("continueScheduleBtn").textContent = mode === "estimate" ? "Book Appointment" : "Accept & Schedule";
  goStep("customerStep2");
}
function continueAgreement(){
  const svc = state.services.find(x => x.id === qs("custService").value);
  const mode = effectiveModeForService(svc);
  qs("agreementHeading").textContent = state.business.agreementTitle;
  qs("docBizName").textContent = state.business.name;
  qs("docCustName").textContent = qs("custName").value || "Customer";
  qs("docService").textContent = svc ? svc.name : "";
  qs("docPrice").textContent = mode === "estimate" ? "Appointment Request" : money(state.currentQuote);
  qs("docAddress").textContent = qs("custAddress").value || "";
  qs("docSchedule").textContent = `${qs("scheduleDate").value} · ${qs("scheduleTime").value}`;
  goStep("customerStep4");
}
function finishBooking(){
  const svc = state.services.find(x => x.id === qs("custService").value);
  const mode = effectiveModeForService(svc);
  const job = {
    id: uid("job"),
    customer: qs("custName").value || "Customer",
    phone: qs("custPhone").value || "",
    address: qs("custAddress").value || "",
    serviceName: svc ? svc.name : "",
    mode,
    price: mode === "estimate" ? null : state.currentQuote,
    scheduleDate: qs("scheduleDate").value,
    scheduleTime: qs("scheduleTime").value,
    status: "scheduled",
    answers: state.latestAnswers || []
  };
  state.jobs.unshift(job);
  saveState();
  renderMetrics();
  renderJobs();
  qs("confirmText").textContent = `${job.serviceName} · ${mode === "estimate" ? "Appointment" : money(job.price)} · ${job.scheduleDate} ${job.scheduleTime}`;
  goStep("customerStep5");
}
function initSignature(id){
  const canvas = qs(id);
  if(!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  function pos(e){
    const r = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return {x:(p.clientX-r.left)*(canvas.width/r.width), y:(p.clientY-r.top)*(canvas.height/r.height)};
  }
  let drawing = false;
  function start(e){ drawing = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); e.preventDefault(); }
  function move(e){ if(!drawing) return; const p = pos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); e.preventDefault(); }
  function end(){ drawing = false; }
  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  canvas.addEventListener("touchstart", start, {passive:false});
  canvas.addEventListener("touchmove", move, {passive:false});
  window.addEventListener("touchend", end);
}
function clearSig(id){
  const c = qs(id);
  if(!c) return;
  const ctx = c.getContext("2d");
  ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0,0,c.width,c.height);
}
function bindEvents(){
  qsa(".nav-btn").forEach(btn => btn.addEventListener("click", () => switchScreen(btn.dataset.screen)));
  if(qs("copyBookingLinkBtn")) qs("copyBookingLinkBtn").addEventListener("click", copyLink);
  if(qs("copyBookingLinkBtn2")) qs("copyBookingLinkBtn2").addEventListener("click", copyLink);
  if(qs("openBookingPageBtn")) qs("openBookingPageBtn").addEventListener("click", () => window.location.href = "customer.html");
  if(qs("openBookingPageBtn2")) qs("openBookingPageBtn2").addEventListener("click", () => window.location.href = "customer.html");
  if(qs("saveSettingsBtn")) qs("saveSettingsBtn").addEventListener("click", saveSettings);
  if(qs("loadDemoBtn")) qs("loadDemoBtn").addEventListener("click", loadDemo);
  if(qs("newServiceBtn")) qs("newServiceBtn").addEventListener("click", newService);
  if(qs("backToServicesBtn")) qs("backToServicesBtn").addEventListener("click", () => switchScreen("services"));
  if(qs("addQuestionBtn")) qs("addQuestionBtn").addEventListener("click", addQuestion);
  if(qs("saveServiceBtn")) qs("saveServiceBtn").addEventListener("click", saveServiceEditor);
  if(qs("deleteServiceBtn")) qs("deleteServiceBtn").addEventListener("click", deleteService);
  if(qs("clearJobsBtn")) qs("clearJobsBtn").addEventListener("click", clearJobs);

  if(qs("custService")) qs("custService").addEventListener("change", renderCustomerQuestions);
  if(qs("continueCustomerBtn")) qs("continueCustomerBtn").addEventListener("click", continueCustomerResult);
  if(qs("continueScheduleBtn")) qs("continueScheduleBtn").addEventListener("click", () => goStep("customerStep3"));
  if(qs("continueAgreementBtn")) qs("continueAgreementBtn").addEventListener("click", continueAgreement);
  if(qs("finishBookingBtn")) qs("finishBookingBtn").addEventListener("click", finishBooking);
  if(qs("restartCustomerBtn")) qs("restartCustomerBtn").addEventListener("click", () => { goStep("customerStep1"); });
  if(qs("newTestBookingBtn")) qs("newTestBookingBtn").addEventListener("click", () => { window.location.reload(); });
  if(qs("clearCustomerSigBtn")) qs("clearCustomerSigBtn").addEventListener("click", () => clearSig("customerSig"));
  qsa("[data-step]").forEach(btn => btn.addEventListener("click", () => goStep(btn.dataset.step)));

  document.addEventListener("change", (e) => {
    if(e.target.matches(".q-type-select")){
      const qId = e.target.getAttribute("data-q-type");
      updateQuestionType(qId, e.target.value);
    }
  });

  document.addEventListener("click", (e) => {
    const editId = e.target.getAttribute("data-edit-service");
    if(editId) openServiceEditor(editId);

    const delQ = e.target.getAttribute("data-delete-question");
    if(delQ){
      const service = state.services.find(s => s.id === state.editingServiceId);
      if(service){
        service.questions = service.questions.filter(q => q.id !== delQ);
        saveState();
        renderQuestionEditor(service);
      }
    }

    const addOptQ = e.target.getAttribute("data-add-option");
    if(addOptQ) addOption(addOptQ);

    const delOptKey = e.target.getAttribute("data-delete-option");
    if(delOptKey){
      const [qId, optId] = delOptKey.split("__");
      const service = state.services.find(s => s.id === state.editingServiceId);
      const question = service?.questions.find(q => q.id === qId);
      if(question){
        question.options = (question.options || []).filter(o => o.id !== optId);
        saveState();
        renderQuestionEditor(service);
      }
    }

    const completeId = e.target.getAttribute("data-complete-job");
    if(completeId){
      const job = state.jobs.find(j => j.id === completeId);
      if(job) job.status = "completed";
      saveState();
      renderMetrics();
      renderJobs();
    }
  });
}
function renderEverything(){
  renderSharedBits();
  renderMetrics();
  renderJobs();
  renderServicesList();
  renderCustomerServices();
}
loadState();
bindEvents();
renderEverything();
initSignature("customerSig");
