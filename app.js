const STORAGE_KEY = "linkflow_real_app_v1";

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
        { id:"q1", label:"How big is the job?", type:"multiple", options:[{label:"Small",price:0},{label:"Medium",price:30},{label:"Large",price:60}] },
        { id:"q2", label:"Heavy stains / extra work?", type:"yesno", options:[{label:"No",price:0},{label:"Yes",price:35}] }
      ]
    },
    {
      id: "svc2",
      name: "House Wash Estimate",
      base: 0,
      mode: "estimate",
      questions: [
        { id:"q3", label:"House size", type:"multiple", options:[{label:"Small",price:0},{label:"Medium",price:0},{label:"Large",price:0}] },
        { id:"q4", label:"Two-story?", type:"yesno", options:[{label:"No",price:0},{label:"Yes",price:0}] },
        { id:"q5", label:"Gate access needed?", type:"yesno", options:[{label:"No",price:0},{label:"Yes",price:0}] }
      ]
    }
  ],
  jobs: []
};

let state = {
  business: {...DEMO.business},
  services: JSON.parse(JSON.stringify(DEMO.services)),
  jobs: [],
  currentFlowMode: "quote",
  currentQuote: 0,
  currentServiceId: null,
  editingServiceId: null
};

function qs(id){ return document.getElementById(id); }
function qsa(sel){ return document.querySelectorAll(sel); }
function money(n){ return "$" + Math.round(n || 0).toLocaleString(); }
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
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
function customerUrl(){
  return new URL("customer.html", window.location.href).toString();
}
async function copyLink(){
  try{
    await navigator.clipboard.writeText(customerUrl());
    alert("Booking link copied.");
  }catch(e){
    prompt("Copy this link:", customerUrl());
  }
}
function renderSharedBits(){
  if(qs("bookingLinkNotice")) qs("bookingLinkNotice").textContent = customerUrl();
  if(qs("bookingLinkNoticeLinkTab")) qs("bookingLinkNoticeLinkTab").textContent = customerUrl();

  if(qs("bizName")) qs("bizName").value = state.business.name;
  if(qs("bizPhone")) qs("bizPhone").value = state.business.phone;
  if(qs("bizSlug")) qs("bizSlug").value = state.business.slug;
  if(qs("quoteMode")) qs("quoteMode").value = state.business.mode;
  if(qs("agreementTitle")) qs("agreementTitle").value = state.business.agreementTitle;

  if(qs("previewBusinessName")) qs("previewBusinessName").textContent = state.business.name;
  if(qs("previewBusinessPhone")) qs("previewBusinessPhone").textContent = state.business.phone;
  if(qs("previewMode")) qs("previewMode").textContent = state.business.mode === "both" ? "Quote + Estimate" : state.business.mode === "quote" ? "Instant Quote Only" : "Estimate Booking Only";

  if(qs("customerBizName")) qs("customerBizName").textContent = state.business.name;
  if(qs("customerBizSub")) qs("customerBizSub").textContent = "Fast quotes. Easy booking.";
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
function switchScreen(name){
  qsa(".screen").forEach(s => s.classList.remove("active"));
  const target = qs("screen-" + name);
  if(target) target.classList.add("active");
  qsa(".nav-btn").forEach(b => b.classList.remove("active"));
  const activeBtn = document.querySelector('.nav-btn[data-screen="' + name + '"]');
  if(activeBtn) activeBtn.classList.add("active");
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
    if(!state.jobs.length) recent.innerHTML = empty;
    else recent.innerHTML = state.jobs.slice(0,3).map(j => `
      <div class="job-card">
        <strong>${escapeHtml(j.customer)}</strong>
        <div class="mini">${escapeHtml(j.serviceName)} · ${j.mode === "estimate" ? "Estimate Visit" : money(j.price)} · ${escapeHtml(j.scheduleDate)} ${escapeHtml(j.scheduleTime)}</div>
      </div>
    `).join("");
  }

  if(all){
    if(!state.jobs.length) all.innerHTML = empty;
    else all.innerHTML = state.jobs.map(j => `
      <div class="job-card">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
          <div>
            <strong>${escapeHtml(j.customer)}</strong> <span class="chip">${j.mode === "estimate" ? "Estimate" : "Quote"}</span>
            <div class="mini">${escapeHtml(j.serviceName)} · ${j.mode === "estimate" ? "Estimate Visit" : money(j.price)} · ${escapeHtml(j.scheduleDate)} ${escapeHtml(j.scheduleTime)}</div>
            <div class="mini">${escapeHtml(j.address)} · ${escapeHtml(j.phone)}</div>
          </div>
          <button data-complete-job="${j.id}">Mark Complete</button>
        </div>
      </div>
    `).join("");
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
  if(!state.services.length){
    box.innerHTML = '<div class="service-card"><div class="mini">No services yet.</div></div>';
    return;
  }
  box.innerHTML = state.services.map(s => `
    <div class="service-card">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
        <div>
          <strong>${escapeHtml(s.name)}</strong>
          <div class="mini">${s.mode === "quote" ? "Instant Quote" : "Estimate Only"} · Base ${money(s.base)}</div>
          <div class="mini">${s.questions.length} question${s.questions.length === 1 ? "" : "s"}</div>
        </div>
        <button data-edit-service="${s.id}">Edit</button>
      </div>
    </div>
  `).join("");
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
function renderQuestionEditor(service){
  const box = qs("questionList");
  if(!box) return;
  if(!service.questions.length){
    box.innerHTML = '<div class="question-card"><div class="mini">No questions yet. Add your first question.</div></div>';
    return;
  }
  box.innerHTML = service.questions.map((q, i) => `
    <div class="question-card">
      <div class="row-compact">
        <div>
          <label>Question label</label>
          <input data-q-label="${q.id}" value="${escapeHtml(q.label)}" />
        </div>
        <div>
          <label>Question type</label>
          <select data-q-type="${q.id}">
            <option value="multiple" ${q.type==="multiple"?"selected":""}>Multiple Choice</option>
            <option value="yesno" ${q.type==="yesno"?"selected":""}>Yes / No</option>
            <option value="text" ${q.type==="text"?"selected":""}>Text Input</option>
            <option value="number" ${q.type==="number"?"selected":""}>Number Input</option>
          </select>
        </div>
      </div>
      <div class="mt12">
        <label>Options / pricing</label>
        <input data-q-options="${q.id}" value="${serializeOptions(q)}" placeholder="Small|0,Medium|30,Large|60" />
      </div>
      <div class="btn-row">
        <button data-delete-question="${q.id}" class="danger-btn">Delete Question</button>
      </div>
    </div>
  `).join("");
}
function serializeOptions(q){
  if(q.type === "text" || q.type === "number") return "";
  return (q.options || []).map(o => `${o.label}|${o.price}`).join(",");
}
function parseOptions(raw, type){
  if(type === "text" || type === "number") return [];
  return (raw || "").split(",").map(part => {
    const bits = part.split("|");
    return { label:(bits[0] || "").trim(), price: parseFloat(bits[1]) || 0 };
  }).filter(x => x.label);
}
function addQuestion(){
  const service = state.services.find(s => s.id === state.editingServiceId);
  if(!service) return;
  service.questions.push({
    id: uid("q"),
    label: "New question",
    type: "multiple",
    options: [{label:"Option 1", price:0}]
  });
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
    const optsEl = document.querySelector(`[data-q-options="${q.id}"]`);
    const type = typeEl ? typeEl.value : q.type;
    return {
      ...q,
      label: labelEl ? labelEl.value.trim() || "Question" : q.label,
      type,
      options: parseOptions(optsEl ? optsEl.value : "", type)
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

  if(qs("startQuoteBtn")) qs("startQuoteBtn").classList.toggle("hidden", state.business.mode === "estimate");
  if(qs("startEstimateBtn")) qs("startEstimateBtn").classList.toggle("hidden", state.business.mode === "quote");
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
    return `
      <div class="question-card">
        <label>${escapeHtml(q.label)}</label>
        <select id="cq_${idx}" data-type="${q.type}">
          ${(q.options || []).map((opt, oi) => `<option value="${oi}">${escapeHtml(opt.label)}</option>`).join("")}
        </select>
      </div>
    `;
  }).join("");
}
function goStep(id){
  qsa(".step").forEach(s => s.classList.remove("active"));
  if(qs(id)) qs(id).classList.add("active");
}
function startCustomerFlow(mode){
  state.currentFlowMode = mode;
  goStep("customerStep1");
}
function collectAnswersAndPrice(svc){
  let total = svc.base || 0;
  const parts = [`${svc.name}: ${money(svc.base)}`];
  const answers = [];

  svc.questions.forEach((q, idx) => {
    const el = qs("cq_" + idx);
    if(!el) return;
    if(q.type === "text" || q.type === "number"){
      answers.push({question:q.label, answer:el.value || "", price:0});
      parts.push(`${q.label}: ${el.value || "-"}`);
      return;
    }
    const selected = parseInt(el.value, 10) || 0;
    const opt = (q.options || [])[selected];
    if(opt){
      total += opt.price || 0;
      answers.push({question:q.label, answer:opt.label, price:opt.price || 0});
      parts.push(`${q.label}: ${opt.label} (${(opt.price||0) >= 0 ? "+" : ""}${money(opt.price||0)})`);
    }
  });

  return { total, parts, answers };
}
let latestAnswers = [];
function continueCustomerResult(){
  const svc = state.services.find(x => x.id === qs("custService").value);
  if(!svc) return;
  const result = collectAnswersAndPrice(svc);
  latestAnswers = result.answers;
  const resultMode = state.currentFlowMode === "estimate" || svc.mode === "estimate" ? "estimate" : "quote";
  state.currentQuote = result.total;

  qs("resultTitle").textContent = resultMode === "estimate" ? "Estimate Visit" : "Your Quote";
  qs("quotePrice").textContent = resultMode === "estimate" ? "Estimate" : money(result.total);
  qs("quoteBreakdown").textContent = resultMode === "estimate" ? "Choose a time for an in-person estimate." : result.parts.join(" · ");
  goStep("customerStep2");
}
function continueAgreement(){
  const svc = state.services.find(x => x.id === qs("custService").value);
  const isEstimate = state.currentFlowMode === "estimate" || (svc && svc.mode === "estimate");
  qs("agreementHeading").textContent = state.business.agreementTitle;
  qs("docBizName").textContent = state.business.name;
  qs("docCustName").textContent = qs("custName").value || "Customer";
  qs("docService").textContent = svc ? svc.name : "";
  qs("docPrice").textContent = isEstimate ? "Estimate Request" : money(state.currentQuote);
  qs("docAddress").textContent = qs("custAddress").value || "";
  qs("docSchedule").textContent = `${qs("scheduleDate").value} · ${qs("scheduleTime").value}`;
  goStep("customerStep4");
}
function finishBooking(){
  const svc = state.services.find(x => x.id === qs("custService").value);
  const isEstimate = state.currentFlowMode === "estimate" || (svc && svc.mode === "estimate");
  const job = {
    id: uid("job"),
    customer: qs("custName").value || "Customer",
    phone: qs("custPhone").value || "",
    address: qs("custAddress").value || "",
    serviceName: svc ? svc.name : "",
    mode: isEstimate ? "estimate" : "quote",
    price: isEstimate ? null : state.currentQuote,
    scheduleDate: qs("scheduleDate").value,
    scheduleTime: qs("scheduleTime").value,
    status: "scheduled",
    answers: latestAnswers
  };
  state.jobs.unshift(job);
  saveState();
  renderMetrics();
  renderJobs();
  qs("confirmText").textContent = `${job.serviceName} · ${isEstimate ? "Estimate Visit" : money(job.price)} · ${job.scheduleDate} ${job.scheduleTime}`;
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

  if(qs("custService")) qs("custService").addEventListener("change", renderCustomerQuestions);
  if(qs("startQuoteBtn")) qs("startQuoteBtn").addEventListener("click", () => startCustomerFlow("quote"));
  if(qs("startEstimateBtn")) qs("startEstimateBtn").addEventListener("click", () => startCustomerFlow("estimate"));
  if(qs("continueCustomerBtn")) qs("continueCustomerBtn").addEventListener("click", continueCustomerResult);
  if(qs("continueScheduleBtn")) qs("continueScheduleBtn").addEventListener("click", () => goStep("customerStep3"));
  if(qs("continueAgreementBtn")) qs("continueAgreementBtn").addEventListener("click", continueAgreement);
  if(qs("finishBookingBtn")) qs("finishBookingBtn").addEventListener("click", finishBooking);
  if(qs("restartCustomerBtn")) qs("restartCustomerBtn").addEventListener("click", () => window.location.reload());
  if(qs("newTestBookingBtn")) qs("newTestBookingBtn").addEventListener("click", () => window.location.reload());
  if(qs("clearCustomerSigBtn")) qs("clearCustomerSigBtn").addEventListener("click", () => clearSig("customerSig"));

  qsa("[data-step]").forEach(btn => btn.addEventListener("click", () => goStep(btn.dataset.step)));

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

    const completeId = e.target.getAttribute("data-complete-job");
    if(completeId){
      const job = state.jobs.find(j => j.id === completeId);
      if(job) job.status = "completed";
      saveState();
      renderMetrics();
      renderJobs();
    }
  });

  if(qs("clearJobsBtn")) qs("clearJobsBtn").addEventListener("click", clearJobs);
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
