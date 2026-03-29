const ADMIN_PASSWORD = "123456789";
const STORAGE_KEY = "linkflow_contractor_mvp_v1";

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
  ]
};

let state = {
  business: {...DEMO.business},
  services: JSON.parse(JSON.stringify(DEMO.services)),
  jobs: [],
  currentFlowMode: "quote",
  currentQuote: 0,
  currentServiceId: null,
  adminAuthed: false
};

function qs(id){ return document.getElementById(id); }
function qsa(sel){ return document.querySelectorAll(sel); }
function money(n){ return "$" + Math.round(n || 0).toLocaleString(); }

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    business: state.business,
    services: state.services,
    jobs: state.jobs,
    adminAuthed: state.adminAuthed
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
      if(parsed.adminAuthed) state.adminAuthed = true;
    }
  }catch(e){
    console.error("Failed to load state", e);
  }
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[s]));
}

function switchTab(name){
  qsa(".app-tab").forEach(el => el.classList.add("hidden"));
  qsa(".tab-btn").forEach(btn => btn.classList.remove("active"));
  qs(name).classList.remove("hidden");
  document.querySelector('.tab-btn[data-tab="'+name+'"]').classList.add("active");
  refreshAll();
}

function showAdminPane(id, linkEl){
  qsa(".admin-pane").forEach(p => p.classList.add("hidden"));
  qs(id).classList.remove("hidden");
  qsa(".sidebar a[data-pane]").forEach(a => a.classList.remove("active"));
  if(linkEl) linkEl.classList.add("active");
}

function adminLogin(){
  const val = qs("adminPassword").value;
  if(val !== ADMIN_PASSWORD){
    qs("loginMsg").textContent = "Wrong password.";
    return;
  }
  state.adminAuthed = true;
  qs("adminPassword").value = "";
  qs("loginMsg").textContent = "";
  saveState();
  refreshAdminAuth();
}

function adminLogout(){
  state.adminAuthed = false;
  saveState();
  refreshAdminAuth();
}

function refreshAdminAuth(){
  qs("adminLoginView").classList.toggle("hidden", state.adminAuthed);
  qs("adminAppView").classList.toggle("hidden", !state.adminAuthed);
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
  refreshCustomerLink();
}

function removeService(id){
  state.services = state.services.filter(s => s.id !== id);
  saveState();
  refreshAll();
}

function saveBuilder(){
  state.business = {
    name: qs("bizName").value.trim() || "My Business",
    type: qs("bizType").value,
    phone: qs("bizPhone").value.trim(),
    slug: (qs("bizSlug").value.trim() || "mybusiness").replace(/\s+/g,"").toLowerCase(),
    mode: qs("quoteMode").value,
    agreementTitle: qs("agreementTitle").value.trim() || "Service Agreement"
  };
  saveState();
  refreshAll();
  alert("Business settings saved.");
}

function loadDemo(){
  state.business = {...DEMO.business};
  state.services = JSON.parse(JSON.stringify(DEMO.services));
  saveState();
  populateBuilder();
  refreshAll();
}

function populateBuilder(){
  qs("bizName").value = state.business.name;
  qs("bizType").value = state.business.type;
  qs("bizPhone").value = state.business.phone;
  qs("bizSlug").value = state.business.slug;
  qs("quoteMode").value = state.business.mode;
  qs("agreementTitle").value = state.business.agreementTitle;
  renderServices();
}

function renderServices(){
  const box = qs("serviceList");
  if(!state.services.length){
    box.innerHTML = '<div class="mini">No services yet.</div>';
    return;
  }
  box.innerHTML = state.services.map(s => `
    <div class="service-item">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
        <div>
          <strong>${escapeHtml(s.name)}</strong>
          <div class="mini">${s.mode === 'quote' ? 'Instant Quote' : 'Estimate Only'} · Base ${money(s.base)}</div>
          <div class="mini">${escapeHtml(s.questions.map(q => q.label).join(" • "))}</div>
        </div>
        <button data-remove-service="${s.id}">Delete</button>
      </div>
    </div>
  `).join("");
}

function refreshCustomerLink(){
  qs("customerBizName").textContent = state.business.name;
  qs("customerBizSub").textContent = `Fast online quote and booking · ${state.business.phone}`;
  qs("shareLinkLabel").textContent = `Example share link: yourapp.com/${state.business.slug}`;
  qs("previewLink").textContent = `yourapp.com/${state.business.slug}`;
  qs("settingsLink").textContent = `yourapp.com/${state.business.slug}`;
  qs("previewMode").textContent = state.business.mode === "both" ? "Quote + Estimate" : state.business.mode === "quote" ? "Instant Quote Only" : "Estimate Booking Only";

  const select = qs("custService");
  select.innerHTML = state.services.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
  if(state.services[0]) state.currentServiceId = state.services[0].id;
  renderCustomerQuestions();

  qs("startQuoteBtn").classList.toggle("hidden", state.business.mode === "estimate");
  qs("startEstimateBtn").classList.toggle("hidden", state.business.mode === "quote");
}

function renderCustomerQuestions(){
  const svcId = qs("custService").value || state.currentServiceId;
  state.currentServiceId = svcId;
  const svc = state.services.find(x => x.id === svcId);
  const box = qs("dynamicQuestions");
  if(!svc){
    box.innerHTML = "";
    return;
  }
  box.innerHTML = svc.questions.map((q, idx) => `
    <div>
      <label>${escapeHtml(q.label)}</label>
      <select id="cq_${idx}">
        ${q.options.map((opt, oi) => `<option value="${oi}">${escapeHtml(opt[0])}</option>`).join("")}
      </select>
    </div>
  `).join("");
}

function startCustomerFlow(mode){
  state.currentFlowMode = mode;
  goStep("customerStep2");
}

function goStep(id){
  qsa("#customer .step").forEach(s => s.classList.remove("active"));
  qs(id).classList.add("active");
}

function resetCustomerFlow(){
  qs("custName").value = "";
  qs("custPhone").value = "";
  qs("custAddress").value = "";
  if(state.services[0]) qs("custService").value = state.services[0].id;
  renderCustomerQuestions();
  clearSig("customerSig");
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

  if(resultMode === "estimate"){
    qs("resultTitle").textContent = "Request an in-person estimate";
    qs("quotePrice").textContent = "Estimate Visit";
    qs("quoteBreakdown").textContent = "Customer requested an in-person estimate based on the form answers.";
  } else {
    qs("resultTitle").textContent = "Your quote";
    qs("quotePrice").textContent = money(total);
    qs("quoteBreakdown").textContent = parts.join(" · ");
  }

  goStep("customerStep3");
}

function continueSchedule(){
  goStep("customerStep4");
}

function continueAgreement(){
  const svc = state.services.find(x => x.id === qs("custService").value);
  qs("agreementHeading").textContent = state.business.agreementTitle;
  qs("docBizName").textContent = state.business.name;
  qs("docCustName").textContent = qs("custName").value || "Customer";
  qs("docService").textContent = svc ? svc.name : "";
  qs("docPrice").textContent = (state.currentFlowMode === "estimate" || (svc && svc.mode === "estimate")) ? "Estimate Request" : money(state.currentQuote);
  qs("docAddress").textContent = qs("custAddress").value || "";
  qs("docSchedule").textContent = `${qs("scheduleDate").value} · ${qs("scheduleTime").value}`;
  goStep("customerStep5");
}

function collectAnswerText(svc){
  if(!svc) return [];
  return svc.questions.map((q, idx) => {
    const selected = parseInt(qs("cq_"+idx).value, 10) || 0;
    return {question:q.label, answer:q.options[selected][0], price:q.options[selected][1]};
  });
}

function finishBooking(){
  const svc = state.services.find(x => x.id === qs("custService").value);
  const isEstimate = state.currentFlowMode === "estimate" || (svc && svc.mode === "estimate");

  const job = {
    id: "job_" + Date.now(),
    customer: qs("custName").value || "Customer",
    phone: qs("custPhone").value || "",
    address: qs("custAddress").value || "",
    serviceId: svc ? svc.id : "",
    serviceName: svc ? svc.name : "",
    mode: isEstimate ? "estimate" : "quote",
    price: isEstimate ? null : state.currentQuote,
    scheduleDate: qs("scheduleDate").value,
    scheduleTime: qs("scheduleTime").value,
    status: "scheduled",
    createdAt: new Date().toISOString(),
    answers: collectAnswerText(svc),
    signed: hasSignature("customerSig")
  };

  state.jobs.unshift(job);
  saveState();
  qs("confirmText").textContent = `${job.customer} · ${job.serviceName} · ${isEstimate ? "Estimate Visit" : money(job.price)} · ${job.scheduleDate} ${job.scheduleTime}`;
  refreshDashboard();
  goStep("customerStep6");
}

function refreshDashboard(){
  qs("jobsCount").textContent = state.jobs.length;
  qs("mNew").textContent = state.jobs.length;
  qs("mScheduled").textContent = state.jobs.filter(j => j.status === "scheduled").length;
  qs("mCompleted").textContent = state.jobs.filter(j => j.status === "completed").length;
  qs("mQuoted").textContent = state.jobs.filter(j => j.mode === "quote").length;

  const recent = qs("recentJobs");
  const allJobs = qs("jobList");

  if(!state.jobs.length){
    const empty = '<div class="mini">No jobs yet. Go through the customer flow to create test jobs.</div>';
    recent.innerHTML = empty;
    allJobs.innerHTML = empty;
    return;
  }

  recent.innerHTML = state.jobs.slice(0,3).map(j => `
    <div class="job-item">
      <strong>${escapeHtml(j.customer)}</strong>
      <div class="mini">${escapeHtml(j.serviceName)} · ${j.mode === 'estimate' ? 'Estimate Visit' : money(j.price)} · ${escapeHtml(j.scheduleDate)} ${escapeHtml(j.scheduleTime)}</div>
    </div>
  `).join("");

  allJobs.innerHTML = state.jobs.map(j => `
    <div class="job-item">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
        <div>
          <strong>${escapeHtml(j.customer)}</strong> <span class="chip">${j.mode === 'estimate' ? 'Estimate' : 'Quote'}</span>
          <div class="mini">${escapeHtml(j.serviceName)} · ${j.mode === 'estimate' ? 'Estimate Visit' : money(j.price)} · ${escapeHtml(j.scheduleDate)} ${escapeHtml(j.scheduleTime)}</div>
          <div class="mini">${escapeHtml(j.address)} · ${escapeHtml(j.phone)}</div>
          <div class="mini">${j.answers.map(a => `${a.question}: ${a.answer}`).join(" • ")}</div>
        </div>
        <div class="btn-row" style="margin-top:0">
          <button data-complete-job="${j.id}">Mark Complete</button>
          <button data-open-job="${j.id}">Open Job Doc</button>
        </div>
      </div>
    </div>
  `).join("");
}

function markComplete(id){
  const job = state.jobs.find(j => j.id === id);
  if(job) job.status = "completed";
  saveState();
  refreshDashboard();
}

function openJobDoc(id){
  const job = state.jobs.find(j => j.id === id);
  if(!job) return;

  const w = window.open("", "_blank");
  if(!w){
    alert("Popup blocked.");
    return;
  }

  w.document.write(`
    <html><head><title>Job Summary</title><style>
      body{font-family:Arial,sans-serif;padding:24px;color:#111}
      h1{margin:0 0 8px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      td,th{border:1px solid #ddd;padding:10px}
      th{text-align:left;background:#f7f7f7;width:180px}
    </style></head><body>
      <h1>${escapeHtml(state.business.name)} - Job Summary</h1>
      <div>${escapeHtml(job.customer)} · ${escapeHtml(job.phone)}</div>
      <table>
        <tr><th>Service</th><td>${escapeHtml(job.serviceName)}</td></tr>
        <tr><th>Type</th><td>${job.mode === "estimate" ? "Estimate Visit" : "Instant Quote"}</td></tr>
        <tr><th>Price</th><td>${job.mode === "estimate" ? "Estimate Visit" : money(job.price)}</td></tr>
        <tr><th>Address</th><td>${escapeHtml(job.address)}</td></tr>
        <tr><th>Schedule</th><td>${escapeHtml(job.scheduleDate)} · ${escapeHtml(job.scheduleTime)}</td></tr>
        <tr><th>Status</th><td>${escapeHtml(job.status)}</td></tr>
        <tr><th>Signed</th><td>${job.signed ? "Yes" : "No"}</td></tr>
      </table>
    </body></html>
  `);
  w.document.close();
}

function clearJobs(){
  if(!confirm("Clear all jobs?")) return;
  state.jobs = [];
  saveState();
  refreshDashboard();
}

function clearAllStarterData(){
  if(!confirm("Reset business settings, services, jobs, and admin login?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = {
    business: {...DEMO.business},
    services: JSON.parse(JSON.stringify(DEMO.services)),
    jobs: [],
    currentFlowMode: "quote",
    currentQuote: 0,
    currentServiceId: null,
    adminAuthed: false
  };
  populateBuilder();
  refreshAll();
  refreshAdminAuth();
  resetCustomerFlow();
}

function refreshAll(){
  populateBuilder();
  renderServices();
  refreshCustomerLink();
  refreshDashboard();
  refreshAdminAuth();
}

function initSignature(id){
  const canvas = qs(id);
  const ctx = canvas.getContext("2d");
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  function pos(e){
    const r = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return {
      x:(p.clientX-r.left)*(canvas.width/r.width),
      y:(p.clientY-r.top)*(canvas.height/r.height)
    };
  }

  let drawing = false;

  function start(e){
    drawing = true;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    e.preventDefault();
  }

  function move(e){
    if(!drawing) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    canvas.dataset.signed = "1";
    e.preventDefault();
  }

  function end(){
    drawing = false;
  }

  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  canvas.addEventListener("touchstart", start, {passive:false});
  canvas.addEventListener("touchmove", move, {passive:false});
  window.addEventListener("touchend", end);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function clearSig(id){
  const c = qs(id);
  const ctx = c.getContext("2d");
  ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0,0,c.width,c.height);
  c.dataset.signed = "";
}

function hasSignature(id){
  return qs(id).dataset.signed === "1";
}

function bindEvents(){
  qsa(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  qsa("[data-go]").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.go));
  });

  qsa("[data-step]").forEach(btn => {
    btn.addEventListener("click", () => goStep(btn.dataset.step));
  });

  qs("startQuoteBtn").addEventListener("click", () => startCustomerFlow("quote"));
  qs("startEstimateBtn").addEventListener("click", () => startCustomerFlow("estimate"));
  qs("custService").addEventListener("change", renderCustomerQuestions);
  qs("continueCustomerBtn").addEventListener("click", continueCustomerResult);
  qs("resetCustomerBtn").addEventListener("click", resetCustomerFlow);
  qs("restartCustomerBtn").addEventListener("click", resetCustomerFlow);
  qs("continueScheduleBtn").addEventListener("click", continueSchedule);
  qs("continueAgreementBtn").addEventListener("click", continueAgreement);
  qs("finishBookingBtn").addEventListener("click", finishBooking);
  qs("newTestBookingBtn").addEventListener("click", resetCustomerFlow);
  qs("clearCustomerSigBtn").addEventListener("click", () => clearSig("customerSig"));

  qs("adminLoginBtn").addEventListener("click", adminLogin);
  qs("adminLogoutBtn").addEventListener("click", adminLogout);

  qsa(".sidebar a[data-pane]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showAdminPane(link.dataset.pane, link);
    });
  });

  qs("saveBuilderBtn").addEventListener("click", saveBuilder);
  qs("loadDemoBtn").addEventListener("click", loadDemo);
  qs("addServiceBtn").addEventListener("click", addService);
  qs("clearJobsBtn").addEventListener("click", clearJobs);
  qs("resetAllBtn").addEventListener("click", clearAllStarterData);

  document.addEventListener("click", (e) => {
    const removeId = e.target.getAttribute("data-remove-service");
    if(removeId) removeService(removeId);

    const completeId = e.target.getAttribute("data-complete-job");
    if(completeId) markComplete(completeId);

    const openId = e.target.getAttribute("data-open-job");
    if(openId) openJobDoc(openId);
  });
}

loadState();
bindEvents();
populateBuilder();
refreshAll();
initSignature("customerSig");