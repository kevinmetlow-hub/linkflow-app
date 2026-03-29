const STORAGE_KEY = "linkflow_ui_split_v1";

const DEMO = {
  business: {
    name: "Sunshine Pressure Washing",
    type: "Pressure Washing",
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
        {label:"How big is the job?", options:[["Small",0],["Medium",30],["Large",60]]},
        {label:"Heavy stains / extra work?", options:[["No",0],["Yes",35]]}
      ]
    },
    {
      id: "svc2",
      name: "House Wash Estimate",
      base: 0,
      mode: "estimate",
      questions: [
        {label:"House size", options:[["Small",0],["Medium",0],["Large",0]]},
        {label:"Two-story?", options:[["No",0],["Yes",0]]}
      ]
    }
  ],
  jobs: []
};

let state = JSON.parse(JSON.stringify(DEMO));
state.currentFlowMode = "quote";
state.currentQuote = 0;
state.currentServiceId = null;

function qs(id){ return document.getElementById(id); }
function qsa(sel){ return document.querySelectorAll(sel); }
function money(n){ return "$" + Math.round(n || 0).toLocaleString(); }

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
function currentCustomerUrl(){
  return new URL("customer.html", window.location.href).toString();
}
async function copyBookingLink(){
  try{
    await navigator.clipboard.writeText(currentCustomerUrl());
    alert("Booking link copied.");
  }catch(e){
    prompt("Copy this link:", currentCustomerUrl());
  }
}
function renderTopTabs(){
  qsa(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      qsa(".app-tab").forEach(tab => tab.classList.add("hidden"));
      qsa(".tab-btn").forEach(b => b.classList.remove("active"));
      const tab = btn.dataset.tab;
      if(qs(tab)){ qs(tab).classList.remove("hidden"); }
      btn.classList.add("active");
      refreshDashboard();
    });
  });
}
function populateSettings(){
  if(qs("bizName")) qs("bizName").value = state.business.name;
  if(qs("bizType")) qs("bizType").value = state.business.type;
  if(qs("bizPhone")) qs("bizPhone").value = state.business.phone;
  if(qs("bizSlug")) qs("bizSlug").value = state.business.slug;
  if(qs("quoteMode")) qs("quoteMode").value = state.business.mode;
  if(qs("agreementTitle")) qs("agreementTitle").value = state.business.agreementTitle;
}
function saveSettings(){
  state.business = {
    name: qs("bizName").value.trim() || "My Business",
    type: qs("bizType").value,
    phone: qs("bizPhone").value.trim(),
    slug: qs("bizSlug").value.trim() || "mybusiness",
    mode: qs("quoteMode").value,
    agreementTitle: qs("agreementTitle").value.trim() || "Service Agreement"
  };
  saveState();
  renderSharedUI();
  alert("Settings saved.");
}
function parseQuestion(label, raw){
  return {
    label: label || "Question",
    options: (raw || "").split(",").map(part => {
      const bits = part.split("|");
      return [(bits[0] || "").trim(), parseFloat(bits[1]) || 0];
    }).filter(x => x[0])
  };
}
function addService(){
  const svc = {
    id: "svc" + Date.now(),
    name: qs("svcName").value.trim() || "New Service",
    base: parseFloat(qs("svcBase").value) || 0,
    mode: qs("svcMode").value,
    questions: [
      parseQuestion(qs("q1Label").value, qs("q1Opts").value),
      parseQuestion(qs("q2Label").value, qs("q2Opts").value)
    ]
  };
  state.services.push(svc);
  saveState();
  renderServices();
  renderCustomerServices();
}
function removeService(id){
  state.services = state.services.filter(s => s.id !== id);
  saveState();
  renderServices();
  renderCustomerServices();
}
function loadDemo(){
  state.business = JSON.parse(JSON.stringify(DEMO.business));
  state.services = JSON.parse(JSON.stringify(DEMO.services));
  saveState();
  populateSettings();
  renderSharedUI();
  renderServices();
  renderCustomerServices();
}
function renderServices(){
  const box = qs("serviceList");
  if(!box) return;
  if(!state.services.length){
    box.innerHTML = '<div class="mini">No services yet.</div>';
    return;
  }
  box.innerHTML = state.services.map(s => `
    <div class="service-item">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
        <div>
          <strong>${escapeHtml(s.name)}</strong>
          <div class="mini">${s.mode === "quote" ? "Instant Quote" : "Estimate Only"} · Base ${money(s.base)}</div>
          <div class="mini">${escapeHtml(s.questions.map(q => q.label).join(" • "))}</div>
        </div>
        <button data-remove-service="${s.id}">Delete</button>
      </div>
    </div>
  `).join("");
}
function renderSharedUI(){
  if(qs("bookingLinkNotice")) qs("bookingLinkNotice").textContent = currentCustomerUrl();
  if(qs("settingsLink")) qs("settingsLink").textContent = currentCustomerUrl();
  if(qs("previewBusinessName")) qs("previewBusinessName").textContent = state.business.name;
  if(qs("previewBusinessPhone")) qs("previewBusinessPhone").textContent = state.business.phone;
  if(qs("previewMode")) qs("previewMode").textContent = state.business.mode === "both" ? "Quote + Estimate" : state.business.mode === "quote" ? "Instant Quote Only" : "Estimate Booking Only";

  if(qs("customerBizName")) qs("customerBizName").textContent = state.business.name;
  if(qs("customerBizSub")) qs("customerBizSub").textContent = "Fast quotes. Easy booking.";
  if(qs("agreementHeading")) qs("agreementHeading").textContent = state.business.agreementTitle;
}
function refreshDashboard(){
  if(qs("mNew")) qs("mNew").textContent = state.jobs.length;
  if(qs("mScheduled")) qs("mScheduled").textContent = state.jobs.filter(j => j.status === "scheduled").length;
  if(qs("mCompleted")) qs("mCompleted").textContent = state.jobs.filter(j => j.status === "completed").length;
  if(qs("mQuoted")) qs("mQuoted").textContent = state.jobs.filter(j => j.mode === "quote").length;

  const recent = qs("recentJobs");
  const allJobs = qs("jobList");

  const empty = '<div class="mini">No jobs yet. Use the customer page to create a booking.</div>';

  if(recent){
    if(!state.jobs.length){ recent.innerHTML = empty; }
    else{
      recent.innerHTML = state.jobs.slice(0,3).map(j => `
        <div class="job-item">
          <strong>${escapeHtml(j.customer)}</strong>
          <div class="mini">${escapeHtml(j.serviceName)} · ${j.mode === "estimate" ? "Estimate Visit" : money(j.price)} · ${escapeHtml(j.scheduleDate)} ${escapeHtml(j.scheduleTime)}</div>
        </div>
      `).join("");
    }
  }

  if(allJobs){
    if(!state.jobs.length){ allJobs.innerHTML = empty; }
    else{
      allJobs.innerHTML = state.jobs.map(j => `
        <div class="job-item">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
            <div>
              <strong>${escapeHtml(j.customer)}</strong> <span class="chip">${j.mode === "estimate" ? "Estimate" : "Quote"}</span>
              <div class="mini">${escapeHtml(j.serviceName)} · ${j.mode === "estimate" ? "Estimate Visit" : money(j.price)} · ${escapeHtml(j.scheduleDate)} ${escapeHtml(j.scheduleTime)}</div>
              <div class="mini">${escapeHtml(j.address)} · ${escapeHtml(j.phone)}</div>
            </div>
            <div class="btn-row" style="margin-top:0">
              <button data-complete-job="${j.id}">Mark Complete</button>
            </div>
          </div>
        </div>
      `).join("");
    }
  }
}
function clearJobs(){
  if(!confirm("Clear all jobs?")) return;
  state.jobs = [];
  saveState();
  refreshDashboard();
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
  box.innerHTML = svc.questions.map((q, idx) => `
    <div>
      <label>${escapeHtml(q.label)}</label>
      <select id="cq_${idx}">
        ${q.options.map((opt, oi) => `<option value="${oi}">${escapeHtml(opt[0])}</option>`).join("")}
      </select>
    </div>
  `).join("");
}
function goStep(id){
  qsa(".step").forEach(s => s.classList.remove("active"));
  if(qs(id)) qs(id).classList.add("active");
}
function startCustomerFlow(mode){
  state.currentFlowMode = mode;
  goStep("customerStep1");
}
function continueCustomerResult(){
  const svc = state.services.find(x => x.id === qs("custService").value);
  if(!svc) return;
  let total = svc.base;
  const parts = [`${svc.name}: ${money(svc.base)}`];
  svc.questions.forEach((q, idx) => {
    const selected = parseInt(qs("cq_"+idx).value, 10) || 0;
    const opt = q.options[selected];
    total += opt[1];
    parts.push(`${q.label}: ${opt[0]} (${opt[1] >= 0 ? "+" : ""}${money(opt[1])})`);
  });
  const resultMode = state.currentFlowMode === "estimate" || svc.mode === "estimate" ? "estimate" : "quote";
  state.currentQuote = total;

  qs("resultTitle").textContent = resultMode === "estimate" ? "Estimate Visit" : "Your Quote";
  qs("quotePrice").textContent = resultMode === "estimate" ? "Estimate" : money(total);
  qs("quoteBreakdown").textContent = resultMode === "estimate" ? "Choose a time for an in-person estimate." : parts.join(" · ");
  goStep("customerStep2");
}
function continueAgreement(){
  const svc = state.services.find(x => x.id === qs("custService").value);
  const isEstimate = state.currentFlowMode === "estimate" || (svc && svc.mode === "estimate");
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
    id: "job_" + Date.now(),
    customer: qs("custName").value || "Customer",
    phone: qs("custPhone").value || "",
    address: qs("custAddress").value || "",
    serviceName: svc ? svc.name : "",
    mode: isEstimate ? "estimate" : "quote",
    price: isEstimate ? null : state.currentQuote,
    scheduleDate: qs("scheduleDate").value,
    scheduleTime: qs("scheduleTime").value,
    status: "scheduled"
  };
  state.jobs.unshift(job);
  saveState();
  refreshDashboard();
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
  renderTopTabs();

  if(qs("copyLinkBtn")) qs("copyLinkBtn").addEventListener("click", copyBookingLink);
  if(qs("copyLinkBtnTop")) qs("copyLinkBtnTop").addEventListener("click", copyBookingLink);
  if(qs("copyLinkBtnLinkTab")) qs("copyLinkBtnLinkTab").addEventListener("click", copyBookingLink);

  const openCustomer = () => window.location.href = "customer.html";
  if(qs("previewCustomerBtn")) qs("previewCustomerBtn").addEventListener("click", openCustomer);
  if(qs("previewCustomerBtnTop")) qs("previewCustomerBtnTop").addEventListener("click", openCustomer);
  if(qs("previewCustomerBtnLinkTab")) qs("previewCustomerBtnLinkTab").addEventListener("click", openCustomer);

  if(qs("saveSettingsBtn")) qs("saveSettingsBtn").addEventListener("click", saveSettings);
  if(qs("loadDemoBtn")) qs("loadDemoBtn").addEventListener("click", loadDemo);
  if(qs("clearJobsBtn")) qs("clearJobsBtn").addEventListener("click", clearJobs);
  if(qs("addServiceBtn")) qs("addServiceBtn").addEventListener("click", addService);

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
    const removeId = e.target.getAttribute("data-remove-service");
    if(removeId) removeService(removeId);
    const completeId = e.target.getAttribute("data-complete-job");
    if(completeId){
      const job = state.jobs.find(j => j.id === completeId);
      if(job) job.status = "completed";
      saveState();
      refreshDashboard();
    }
  });
}

loadState();
bindEvents();
populateSettings();
renderSharedUI();
renderServices();
renderCustomerServices();
refreshDashboard();
initSignature("customerSig");
