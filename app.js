
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
const supabase = createClient('https://zobsyvttmrocmtfbppfm.supabase.co','sb_publishable_-OCCW_mr0YKCwTcXPycAcg_yPtW3kg5')

const PRESETS={
pressure_washing:{businessName:"My Pressure Washing Business",services:[{name:"Driveway Cleaning",base:120,mode:"quote",questions:[{label:"How big is the job?",type:"multiple",options:[["Small",0],["Medium",30],["Large",60]]},{label:"Heavy stains / extra work?",type:"yesno",options:[["Yes",35],["No",0]]}]},{name:"House Wash",base:0,mode:"estimate",questions:[{label:"House size",type:"multiple",options:[["Small",0],["Medium",0],["Large",0]]},{label:"Two-story?",type:"yesno",options:[["Yes",0],["No",0]]}]}]},
car_detailing:{businessName:"My Detailing Business",services:[{name:"Full Detail",base:160,mode:"quote",questions:[{label:"Vehicle type",type:"multiple",options:[["Sedan",0],["SUV",35],["Truck",45]]},{label:"Pet hair?",type:"yesno",options:[["Yes",25],["No",0]]}]}]},
lawn_service:{businessName:"My Lawn Service",services:[{name:"Weekly Mow",base:45,mode:"quote",questions:[{label:"Yard size",type:"multiple",options:[["Small",0],["Medium",15],["Large",30]]},{label:"Overgrown?",type:"yesno",options:[["Yes",25],["No",0]]}]}]},
handyman:{businessName:"My Handyman Business",services:[{name:"Handyman Visit",base:0,mode:"estimate",questions:[{label:"Job type",type:"text",options:[]},{label:"Do you have materials already?",type:"yesno",options:[["Yes",0],["No",0]]}]}]},
junk_removal:{businessName:"My Junk Removal Business",services:[{name:"Junk Pickup",base:0,mode:"estimate",questions:[{label:"How much needs to be removed?",type:"multiple",options:[["Small Load",0],["Medium Load",0],["Large Load",0]]},{label:"Easy access?",type:"yesno",options:[["Yes",0],["No",0]]}]}]},
scratch:{businessName:"My Business",services:[]}
};

let state={user:null,business:{id:null,name:"",phone:"",slug:"",mode:"both",agreementTitle:"Service Agreement",logoData:""},services:[],jobs:[],editingServiceId:null,editingDraft:null,currentQuote:0,currentServiceId:null,latestAnswers:[],activeJobId:null,homeStatusFilter:"scheduled",selectedTemplate:"pressure_washing",jobExtras:{}};

const qs=id=>document.getElementById(id), qsa=s=>document.querySelectorAll(s), clone=o=>JSON.parse(JSON.stringify(o)), money=n=>"$"+Number(n||0).toLocaleString(undefined,{maximumFractionDigits:2}), uid=(p="id")=>p+"_"+Date.now()+"_"+Math.floor(Math.random()*1e5);
const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const slugify=s=>String(s||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");

async function requireUser(){
  const { data } = await supabase.auth.getUser();
  if(!data.user){
    showOnly("authSection");
    throw new Error("Not authenticated");
  }
  return data.user;
}
const statusLabel=s=>s==="completed"?"Completed":s==="canceled"?"Canceled":"Pending";
const localKey=s=>`linkflow_${state.user?.id||"guest"}_${s}`;

function showOnly(id){["authSection","onboardingSection","appShell"].forEach(x=>qs(x)?.classList.add("hidden")); qs(id)?.classList.remove("hidden")}
function saveLocalExtras(){localStorage.setItem(localKey("jobExtras"),JSON.stringify(state.jobExtras||{}))}
function loadLocalExtras(){try{state.jobExtras=JSON.parse(localStorage.getItem(localKey("jobExtras"))||"{}")}catch(e){state.jobExtras={}}}

function setLogoUI(logoData){
  const hasLogo = !!logoData;
  if(qs("logoPreviewWrap")) qs("logoPreviewWrap").classList.toggle("hidden", !hasLogo);
  if(qs("logoPreviewImg") && hasLogo) qs("logoPreviewImg").src = logoData;
  if(qs("customerLogoWrap")) qs("customerLogoWrap").classList.toggle("hidden", !hasLogo);
  if(qs("customerLogo") && hasLogo) qs("customerLogo").src = logoData;
  if(qs("agreementLogoWrap")) qs("agreementLogoWrap").classList.toggle("hidden", !hasLogo);
  if(qs("agreementLogo") && hasLogo) qs("agreementLogo").src = logoData;
}

function readFileAsDataUrl(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function loadJobMetaFromSupabase(businessId){
  try{
    const { data, error } = await supabase.from("job_meta").select("*").eq("business_id", businessId);
    if(error) return {};
    const byId = {};
    (data || []).forEach(row => { byId[row.job_id] = row; });
    return byId;
  }catch(e){
    return {};
  }
}

async function upsertJobMeta(jobId, payload){
  try{
    const { error } = await supabase.from("job_meta").upsert({
      job_id: jobId,
      business_id: state.business.id,
      status: payload.status || "scheduled",
      answers: payload.answers || [],
      agreement_html: payload.agreementHtml || "",
      signature_data: payload.signatureData || ""
    });
    return !error;
  }catch(e){
    return false;
  }
}
function formatDisplayDate(dateStr,timeWindow){if(!dateStr)return timeWindow||""; const d=new Date(dateStr+"T12:00:00"); const fd=isNaN(d)?dateStr:d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); return `${fd}${timeWindow?" · "+timeWindow:""}`}
function normalizeScheduleDate(label){if(!label)return""; const t=new Date(), c=new Date(t), l=String(label).toLowerCase(); if(l==="tomorrow")c.setDate(c.getDate()+1); else if(l==="this friday"){const day=c.getDay(); c.setDate(c.getDate()+((5-day+7)%7||7))} else if(l==="this saturday"){const day=c.getDay(); c.setDate(c.getDate()+((6-day+7)%7||7))} else return label; return c.toISOString().slice(0,10)}
function effectiveModeForService(s){if(state.business.mode==="quote")return"quote"; if(state.business.mode==="estimate")return"estimate"; return s.mode}
function openModal(id){qs(id)?.classList.remove("hidden")} function closeModal(id){qs(id)?.classList.add("hidden")}
function buildAgreementHtml(d){return `<html><head><title>Work Order</title><meta name="viewport" content="width=device-width, initial-scale=1.0"/><style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;padding:24px;color:#111827}h1{margin:0 0 18px;font-size:28px}.card{border:1px solid #e5e7eb;border-radius:16px;padding:18px}.row{margin:10px 0}.label{font-weight:700}img{max-width:100%;border:1px solid #ddd;border-radius:12px;margin-top:8px}</style></head><body><h1>${d.agreementTitle||"Service Agreement"}</h1><div class="card">${d.logoData?`<div class="row"><img src="${d.logoData}" alt="Company logo" style="max-width:120px;max-height:100px;object-fit:contain;border:1px solid #ddd;border-radius:12px;padding:8px;background:#fff" /></div>`:""}<div class="row"><span class="label">Business:</span> ${d.business||""}</div><div class="row"><span class="label">Customer:</span> ${d.customer||""}</div><div class="row"><span class="label">Service:</span> ${d.service||""}</div><div class="row"><span class="label">Price / Type:</span> ${d.priceType||""}</div><div class="row"><span class="label">Address:</span> ${d.address||""}</div><div class="row"><span class="label">Scheduled:</span> ${d.schedule||""}</div><div class="row"><span class="label">Customer Signature:</span><br>${d.signatureData?`<img src="${d.signatureData}" alt="Signature" />`:"No signature captured"}</div></div></body></html>`}
function openAgreementHtml(html,print=false){const w=window.open("","_blank"); if(!w){alert("Popup blocked.");return} w.document.open(); w.document.write(print?html.replace("</body>","<script>window.onload=()=>window.print();</script></body>"):html); w.document.close()}
function viewAgreement(id){const j=state.jobs.find(x=>x.id===id); if(j?.agreementHtml)openAgreementHtml(j.agreementHtml,false)}
function printAgreement(id){const j=state.jobs.find(x=>x.id===id); if(j?.agreementHtml)openAgreementHtml(j.agreementHtml,true)}
function openSms(job,kind){if(!job?.phone)return alert("No phone number."); const body=kind==="confirm"?`Hi ${job.customer}, your ${job.serviceName} is booked for ${formatDisplayDate(job.scheduleDate,job.scheduleTime)}. Reply here with any questions.`:`Hi ${job.customer}, regarding your ${job.serviceName} booked for ${formatDisplayDate(job.scheduleDate,job.scheduleTime)}.`; window.location.href=`sms:${job.phone}&body=${encodeURIComponent(body)}`}
function openCall(job){if(!job?.phone)return alert("No phone number."); window.location.href=`tel:${job.phone}`}

async function signUp(){const email=qs("signupEmail").value.trim(), password=qs("signupPassword").value; const {error}=await supabase.auth.signUp({email,password}); if(error)return alert(error.message); const r=await supabase.auth.signInWithPassword({email,password}); if(r.error)alert("Account created. Check your email if confirmation is required.");}
async function signIn(){const email=qs("loginEmail").value.trim(), password=qs("loginPassword").value; const {error}=await supabase.auth.signInWithPassword({email,password}); if(error)alert(error.message)}
async function signOut(){await supabase.auth.signOut()}

async function ensureContext(){
  try{
    const sessionRes = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("auth timeout")), 5000))
    ]);
    const user = sessionRes?.data?.session?.user || null;
    state.user = user;

    if(!state.user){
      state.business={id:null,name:"",phone:"",slug:"",mode:"both",agreementTitle:"Service Agreement",logoData:""};
      state.services=[]; state.jobs=[]; state.jobExtras={};
      state.currentScreen="home";
      state.homeStatusFilter="scheduled";
      try{ localStorage.removeItem(screenStorageKey()) }catch(e){}
      showOnly("authSection");
      return;
    }

    loadLocalExtras();

    let business = null;
    try{
      const res = await Promise.race([
        supabase.from("businesses").select("*").eq("user_id",state.user.id).maybeSingle(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("business timeout")), 5000))
      ]);
      business = res?.data || null;
    }catch(e){
      console.error("business fetch failed", e);
    }

    if(!business){
      showOnly("onboardingSection");
      return;
    }

    state.business={
      id:business.id,
      name:business.name||"",
      phone:business.phone||"",
      slug:business.slug||"",
      mode:business.mode||"both",
      agreementTitle:business.agreement_title||"Service Agreement",
      logoData:business.logo_data||""
    };

    showOnly("appShell");
    const savedScreen = (()=>{ try{return localStorage.getItem(screenStorageKey())||"home"}catch(e){return "home"} })();
    switchScreen(savedScreen);
    renderSharedBits();

    try{
      await Promise.all([
        loadServicesFromSupabase(business.id),
        loadJobsFromSupabase(business.id)
      ]);
    }catch(e){
      console.error("app data load failed", e);
      state.services = state.services || [];
      state.jobs = state.jobs || [];
    }

    renderEverything();
  }catch(e){
    console.error("ensureContext failed", e);
    showOnly("authSection");
  }finally{
    stopBoot();
  }
}

async function createBusinessFromOnboarding(){
  await requireUser();
  const tpl=PRESETS[state.selectedTemplate||"pressure_washing"], desired=qs("onboardBusinessName").value.trim()||tpl.businessName;
  let slugBase=slugify(desired)||"my-business", finalSlug=slugBase, i=1;
  while(true){const {data:ex}=await supabase.from("businesses").select("id").eq("slug",finalSlug).maybeSingle(); if(!ex)break; finalSlug=`${slugBase}-${i++}`}
  const {data:b,error}=await supabase.from("businesses").insert({user_id:state.user.id,name:desired,phone:"",slug:finalSlug,mode:"both",agreement_title:"Service Agreement",logo_data:""}).select().single();
  if(error)return alert(error.message);
  state.business={id:b.id,name:b.name,phone:b.phone||"",slug:b.slug,mode:b.mode||"both",agreementTitle:b.agreement_title||"Service Agreement",logoData:b.logo_data||""};
  state.services=tpl.services.map(s=>({id:uid("svc"),name:s.name,base:s.base,mode:s.mode,questions:s.questions.map(q=>({id:uid("q"),label:q.label,type:q.type,options:(q.options||[]).map(o=>({id:uid("opt"),label:o[0],modifierType:"fixed",modifierValue:o[1]}))}))}));
  state.jobs=[]; await syncServicesToSupabase(); renderEverything(); showOnly("appShell");
}
async function loadServicesFromSupabase(businessId){
  const {data:services}=await supabase.from("services").select("*").eq("business_id",businessId);
  const serviceIds = (services || []).map(s => s.id);
  let questions = [], options = [];
  if(serviceIds.length){
    const qRes = await supabase.from("questions").select("*").in("service_id", serviceIds);
    questions = qRes.data || [];
    const questionIds = questions.map(q => q.id);
    if(questionIds.length){
      const oRes = await supabase.from("options").select("*").in("question_id", questionIds);
      options = oRes.data || [];
    }
  }
  const qBy={}, oBy={}; (questions||[]).forEach(q=>(qBy[q.service_id]??=[]).push(q)); (options||[]).forEach(o=>(oBy[o.question_id]??=[]).push(o));
  state.services=(services||[]).map(s=>({id:s.id,name:s.name,base:Number(s.base_price||0),mode:s.mode||"quote",questions:(qBy[s.id]||[]).map(q=>({id:q.id,label:q.label,type:q.type,options:(oBy[q.id]||[]).map(o=>({id:o.id,label:o.label,modifierType:"fixed",modifierValue:Number(o.price||0)}))}))}));
}
async function syncServicesToSupabase(){
  await requireUser();
  if(!state.business.id)return;
  const {data:es}=await supabase.from("services").select("id").eq("business_id",state.business.id);
  const sids=(es||[]).map(x=>x.id);
  if(sids.length){const {data:eq}=await supabase.from("questions").select("id").in("service_id",sids); const qids=(eq||[]).map(x=>x.id); if(qids.length)await supabase.from("options").delete().in("question_id",qids); await supabase.from("questions").delete().in("service_id",sids); await supabase.from("services").delete().eq("business_id",state.business.id)}
  for(const s of state.services){const {data:sr}=await supabase.from("services").insert({business_id:state.business.id,name:s.name,base_price:s.base,mode:s.mode}).select().single(); for(const q of s.questions||[]){const {data:qr}=await supabase.from("questions").insert({service_id:sr.id,label:q.label,type:q.type}).select().single(); for(const o of q.options||[]) await supabase.from("options").insert({question_id:qr.id,label:o.label,price:o.modifierValue||0})}}
  await loadServicesFromSupabase(state.business.id);
}
async function loadJobsFromSupabase(businessId){
  const {data}=await supabase.from("jobs").select("*").eq("business_id",businessId).order("created_at",{ascending:false});
  const metaById = await loadJobMetaFromSupabase(businessId);
  state.jobs=(data||[]).map(j=>{
    const ex=metaById[j.id] || state.jobExtras[j.id] || {};
    return {
      id:j.id,
      customer:j.customer_name||"",
      phone:j.phone||"",
      address:j.address||"",
      serviceName:j.service_name||"",
      price:j.price,
      mode:j.mode||"quote",
      scheduleDate:j.schedule_date||"",
      scheduleTime:j.schedule_time||"",
      status:ex.status||"scheduled",
      answers:ex.answers||[],
      agreementHtml:ex.agreement_html||ex.agreementHtml||buildAgreementHtml({
        agreementTitle:state.business.agreementTitle,
        business:state.business.name,
        customer:j.customer_name,
        service:j.service_name,
        priceType:j.mode==="estimate"?"Appointment Request":money(j.price),
        address:j.address,
        schedule:formatDisplayDate(j.schedule_date,j.schedule_time),
        signatureData:ex.signature_data || "",
        logoData: state.business.logoData || ""
      })
    }
  });
}


function renderTemplatePreview(){
  const body = qs("templatePreviewBody");
  const title = qs("templatePreviewTitle");
  if(!body || !title) return;
  const tpl = PRESETS[state.selectedTemplate || "pressure_washing"];
  const niceTitle = (state.selectedTemplate || "pressure_washing").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  title.textContent = niceTitle;
  if(!tpl || !tpl.services?.length){
    body.innerHTML = '<div class="template-preview-item"><strong>Start From Scratch</strong><div class="mini">No starter services. Build your own setup.</div></div>';
    return;
  }
  body.innerHTML = tpl.services.map(service => {
    const qHtml = (service.questions || []).map(q => {
      const opts = (q.options || []).map(opt => Array.isArray(opt) ? opt[0] : opt.label).join(", ");
      return `<div class="mini">• ${q.label}${opts ? ` — ${opts}` : ""}</div>`;
    }).join("");
    return `<div class="template-preview-item"><strong>${service.name}</strong><div class="mini">${service.mode === "quote" ? "Instant Quote" : "Book Appointment"}${service.base ? ` · Base ${money(service.base)}` : ""}</div>${qHtml}</div>`;
  }).join("");
}

function renderSharedBits(){if(qs("headerBusinessName"))qs("headerBusinessName").textContent=state.business.name||"Contractor App"; const link=`${window.location.origin}/customer.html?slug=${state.business.slug||""}`; qs("bookingLinkNotice")&&(qs("bookingLinkNotice").textContent=link); qs("bizName")&&(qs("bizName").value=state.business.name||""); qs("bizPhone")&&(qs("bizPhone").value=state.business.phone||""); qs("bizSlug")&&(qs("bizSlug").value=state.business.slug||""); qs("quoteMode")&&(qs("quoteMode").value=state.business.mode||"both"); qs("agreementTitle")&&(qs("agreementTitle").value=state.business.agreementTitle||"Service Agreement"); setLogoUI(state.business.logoData||"")}
function renderMetrics(){qs("mPending")&&(qs("mPending").textContent=state.jobs.filter(j=>(j.status||"scheduled")==="scheduled").length); qs("mCompleted")&&(qs("mCompleted").textContent=state.jobs.filter(j=>j.status==="completed").length); qs("mCanceled")&&(qs("mCanceled").textContent=state.jobs.filter(j=>j.status==="canceled").length); qs("mQuoted")&&(qs("mQuoted").textContent=state.jobs.filter(j=>j.mode==="quote").length)}
function renderJobs(){
  const recent=qs("recentJobs"), empty='<div class="job-card"><div class="mini">No jobs yet.</div></div>';
  const filter=state.homeStatusFilter||"scheduled";
  const filtered=state.jobs.filter(j=>(j.status||"scheduled")===filter);

  const cardHtml = j => `<div class="job-card job-open-hit" data-open-job="${j.id}">
    <div>
      <div>
        <strong>${escapeHtml(j.customer)}</strong> <span class="chip">${statusLabel(j.status||"scheduled")}</span>
        <div class="mini">${escapeHtml(j.serviceName)} · ${j.mode==="estimate"?"Appointment":money(j.price)} · ${escapeHtml(formatDisplayDate(j.scheduleDate,j.scheduleTime))}</div>
        <div class="mini">${escapeHtml(j.address)} · ${escapeHtml(j.phone)}</div>
      </div>
      <div class="job-open-arrow">›</div>
    </div>
  </div>`;

  if(recent) recent.innerHTML = filtered.length ? filtered.map(cardHtml).join("") : empty;
}
function openJobDetails(id){const j=state.jobs.find(x=>x.id===id); if(!j)return; state.activeJobId=id; qs("jobDetailTitle").textContent=j.customer||"Order"; qs("jobDetailDate").textContent=formatDisplayDate(j.scheduleDate,j.scheduleTime); qs("jobDetailCustomer").textContent=j.customer||""; qs("jobDetailPhone").textContent=j.phone||""; qs("jobDetailAddress").textContent=j.address||""; qs("jobDetailService").textContent=j.serviceName||""; qs("jobDetailPrice").textContent=j.mode==="estimate"?"Appointment":money(j.price); qs("jobDetailStatus").textContent=statusLabel(j.status); qs("jobDetailAnswers").innerHTML=(j.answers||[]).length?j.answers.map(a=>`<div>${escapeHtml(a.question)}: ${escapeHtml(a.answer)}</div>`).join(""):"No saved answers."; openModal("jobDetailModal")}
function renderServicesList(){const box=qs("serviceList"); if(!box)return; box.innerHTML=state.services.length?state.services.map(s=>`<div class="service-card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><strong>${escapeHtml(s.name)}</strong><div class="mini">${effectiveModeForService(s)==="quote"?"Instant Quote":"Book Appointment"} · Base ${money(s.base)}</div><div class="mini">${s.questions.length} question${s.questions.length===1?"":"s"}</div></div><button data-edit-service="${s.id}">Edit</button></div></div>`).join(""):'<div class="service-card"><div class="mini">No services yet.</div></div>'}
function ensureQ(q){if(q.type==="yesno"&&(!q.options||q.options.length!==2))q.options=[{id:uid("opt"),label:"Yes",modifierType:"fixed",modifierValue:0},{id:uid("opt"),label:"No",modifierType:"fixed",modifierValue:0}]; if((q.type==="text"||q.type==="number")&&!q.options)q.options=[]; if(q.type==="multiple"&&(!q.options||!q.options.length))q.options=[{id:uid("opt"),label:"Option 1",modifierType:"fixed",modifierValue:0}]}
function syncDraft(){if(!state.editingDraft)return; state.editingDraft.name=qs("editServiceName").value.trim()||"Untitled Service"; state.editingDraft.base=parseFloat(qs("editServiceBase").value)||0; state.editingDraft.mode=qs("editServiceMode").value; state.editingDraft.questions=(state.editingDraft.questions||[]).map(q=>{const t=document.querySelector(`[data-q-type="${q.id}"]`)?.value||q.type; const l=document.querySelector(`[data-q-label="${q.id}"]`)?.value?.trim()||q.label; let opts=[]; if(t==="multiple"||t==="yesno"){opts=(q.options||[]).map(o=>{const k=`${q.id}__${o.id}`; return {...o,label:document.querySelector(`[data-opt-label="${k}"]`)?.value?.trim()||o.label,modifierType:"fixed",modifierValue:parseFloat(document.querySelector(`[data-opt-value="${k}"]`)?.value)||0}})} return {...q,label:l,type:t,options:opts}})}
function commitDraft(){if(!state.editingDraft||!state.editingServiceId)return; const i=state.services.findIndex(s=>s.id===state.editingServiceId); if(i>=0)state.services[i]=clone(state.editingDraft)}
function modifierFields(q,o){const k=`${q.id}__${o.id}`; return `<div class="simple-option-row"><div><input data-opt-label="${k}" value="${escapeHtml(o.label)}" placeholder="Choice label"></div><div><input type="number" step="0.01" data-opt-value="${k}" value="${o.modifierValue}" placeholder="0"></div><div><button data-delete-option="${k}" class="danger-btn">Remove</button></div></div>`}

function niceQuestionType(t){
  if(t==="multiple") return "Multiple Choice";
  if(t==="yesno") return "Yes / No";
  if(t==="text") return "Text";
  if(t==="number") return "Number";
  return "Question";
}

function renderQuestionEditor(service){
  const box=qs("questionList"); if(!box)return;
  if(!service.questions.length){
    box.innerHTML = '<div class="question-empty"><div class="mini">No questions yet. Use the quick buttons above to add one.</div></div>';
    return;
  }
  box.innerHTML = service.questions.map((q, idx) => {
    ensureQ(q);
    const pricingInfo = q.type==="multiple"
      ? '<div class="price-helper">Each choice can add to the starting price.</div>'
      : q.type==="yesno"
      ? '<div class="price-helper">Set how much Yes or No should add to the price.</div>'
      : '<div class="price-helper">This question is only for customer details.</div>';

    const optionsUI = (q.type==="multiple"||q.type==="yesno")
      ? `<div class="simple-option-head"><div>${q.type==="yesno"?"Answer":"Choice"}</div><div>Add to price ($)</div><div></div></div>
         ${(q.options||[]).map(o=>modifierFields(q,o)).join("")}
         ${q.type==="multiple" ? `<div class="btn-row"><button data-add-option="${q.id}">Add Choice</button></div>` : ""}`
      : "";

    return `<details class="question-shell" ${idx===0 ? "open" : ""}>
      <summary class="question-summary">
        <div class="question-summary-left">
          <div class="question-summary-title">${escapeHtml(q.label || "New question")}</div>
          <div class="question-summary-type">${niceQuestionType(q.type)}</div>
        </div>
        <div class="question-summary-right">
          <span class="chip">${niceQuestionType(q.type)}</span>
          <span class="expand-indicator" aria-hidden="true">
            <span class="expand-line expand-line-a"></span>
            <span class="expand-line expand-line-b"></span>
          </span>
        </div>
      </summary>
      <div class="question-body">
        <div class="row">
          <div><label>Question to ask customer</label><input data-q-label="${q.id}" value="${escapeHtml(q.label)}" placeholder="Ex: How big is the job?"></div>
          <div><label>Question type</label>
          <div class="toggle-group question-type-toggle" data-question-id="${q.id}">
            <button type="button" class="toggle-pill ${q.type==="multiple"?"active":""}" data-question-type="multiple" data-question-id="${q.id}">Multiple</button>
            <button type="button" class="toggle-pill ${q.type==="yesno"?"active":""}" data-question-type="yesno" data-question-id="${q.id}">Yes / No</button>
            <button type="button" class="toggle-pill ${q.type==="text"?"active":""}" data-question-type="text" data-question-id="${q.id}">Text</button>
            <button type="button" class="toggle-pill ${q.type==="number"?"active":""}" data-question-type="number" data-question-id="${q.id}">Number</button>
          </div>
          <input type="hidden" data-q-type="${q.id}" value="${q.type}">
        </div>
        </div>
        ${pricingInfo}
        ${optionsUI}
        <div class="btn-row"><button data-delete-question="${q.id}" class="danger-btn">Delete Question</button></div>
      </div>
    </details>`;
  }).join("");
}function openServiceEditor(id){const s=state.services.find(x=>x.id===id); if(!s)return; state.editingServiceId=id; state.editingDraft=clone(s); qs("editorTitle").textContent=s.name; qs("editServiceName").value=s.name; qs("editServiceBase").value=s.base; qs("editServiceMode").value=s.mode;
  qsa("[data-service-mode]").forEach(b=>b.classList.toggle("active", b.getAttribute("data-service-mode")===s.mode));
  renderQuestionEditor(state.editingDraft); switchScreen("editor")}
function addQuestionOfType(type){
  if(!state.editingDraft)return;
  syncDraft();
  const q = {id:uid("q"),label:"New question",type,options:[]};
  if(type==="multiple"){
    q.label = "Choose one option";
    q.options = [
      {id:uid("opt"),label:"Option 1",modifierType:"fixed",modifierValue:0},
      {id:uid("opt"),label:"Option 2",modifierType:"fixed",modifierValue:0}
    ];
  } else if(type==="yesno"){
    q.label = "Yes or No?";
    q.options = [
      {id:uid("opt"),label:"Yes",modifierType:"fixed",modifierValue:0},
      {id:uid("opt"),label:"No",modifierType:"fixed",modifierValue:0}
    ];
  } else if(type==="text"){
    q.label = "Type your answer";
  } else if(type==="number"){
    q.label = "Enter a number";
  }
  state.editingDraft.questions.push(q);
  commitDraft();
  renderQuestionEditor(state.editingDraft);
  renderServicesList();
}
function addQuestion(){ addQuestionOfType("multiple"); }
function addOption(qid){if(!state.editingDraft)return; syncDraft(); const q=state.editingDraft.questions.find(x=>x.id===qid); if(!q)return; q.options.push({id:uid("opt"),label:`Option ${(q.options?.length||0)+1}`,modifierType:"fixed",modifierValue:0}); commitDraft(); renderQuestionEditor(state.editingDraft)}
function updateQuestionType(qid,t){if(!state.editingDraft)return; syncDraft(); const q=state.editingDraft.questions.find(x=>x.id===qid); if(!q)return; q.type=t; if(t==="yesno")q.options=[{id:uid("opt"),label:"Yes",modifierType:"fixed",modifierValue:0},{id:uid("opt"),label:"No",modifierType:"fixed",modifierValue:0}]; else if(t==="text"||t==="number")q.options=[]; else if(t==="multiple"&&!q.options.length)q.options=[{id:uid("opt"),label:"Option 1",modifierType:"fixed",modifierValue:0}]; commitDraft(); renderQuestionEditor(state.editingDraft)}
async function saveServiceEditor(){if(!state.editingDraft)return; syncDraft(); commitDraft(); await syncServicesToSupabase(); renderServicesList(); renderCustomerServices(); alert("Service saved.")}
async function deleteService(){if(!state.editingServiceId)return; if(!confirm("Delete this service?"))return; state.services=state.services.filter(s=>s.id!==state.editingServiceId); state.editingServiceId=null; state.editingDraft=null; await syncServicesToSupabase(); renderServicesList(); renderCustomerServices(); switchScreen("services")}
async function saveSettings(){await requireUser(); state.business.name=qs("bizName").value.trim()||state.business.name; state.business.phone=qs("bizPhone").value.trim(); state.business.slug=slugify(qs("bizSlug").value.trim())||state.business.slug; state.business.mode=qs("quoteMode").value; state.business.agreementTitle=qs("agreementTitle").value.trim()||"Service Agreement";
  const logoFile = qs("bizLogo")?.files?.[0];
  if(logoFile){
    state.business.logoData = await readFileAsDataUrl(logoFile);
  }
  await supabase.from("businesses").update({name:state.business.name,phone:state.business.phone,slug:state.business.slug,mode:state.business.mode,agreement_title:state.business.agreementTitle,logo_data:state.business.logoData||""}).eq("id",state.business.id);
  renderSharedBits();
  if(qs("bizLogo")) qs("bizLogo").value = "";
  alert("Profile saved.")
}
function switchScreen(name){qsa(".screen").forEach(s=>s.classList.remove("active")); qs("screen-"+name)?.classList.add("active"); qsa(".nav-btn").forEach(b=>b.classList.remove("active")); document.querySelector(`.nav-btn[data-screen="${name}"]`)?.classList.add("active")}
function renderEverything(){renderSharedBits(); renderMetrics(); renderJobs(); renderServicesList(); if(typeof bindServiceCardInteractions==="function") bindServiceCardInteractions()}
function applyModifier(total,t,v){v=Number(v||0); if(t==="fixed")return total+v; if(t==="percent")return total+(total*(v/100)); if(t==="multiplier")return total*v; return total}
function modifierText(o){const v=Number(o.modifierValue||0); if(o.modifierType==="fixed")return `${v>=0?"+":""}${money(v)}`; if(o.modifierType==="percent")return `${v>=0?"+":""}${v}%`; if(o.modifierType==="multiplier")return `x${v}`; return ""}
function renderCustomerServices(){const sel=qs("custService"); if(!sel)return; sel.innerHTML=state.services.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join(""); state.currentServiceId=state.services[0]?.id||null; renderCustomerQuestions()}
function renderCustomerQuestions(){const svc=state.services.find(s=>s.id===(qs("custService")?.value||state.currentServiceId)); const box=qs("dynamicQuestions"); if(!box||!svc)return; box.innerHTML=svc.questions.map((q,i)=>q.type==="text"?`<div class="question-card"><label>${escapeHtml(q.label)}</label><input id="cq_${i}"></div>`:q.type==="number"?`<div class="question-card"><label>${escapeHtml(q.label)}</label><input id="cq_${i}" type="number"></div>`:`<div class="question-card"><label>${escapeHtml(q.label)}</label><select id="cq_${i}">${(q.options||[]).map((o,j)=>`<option value="${j}">${escapeHtml(o.label)}</option>`).join("")}</select></div>`).join("")}
function collectAnswersAndPrice(svc){let total=Number(svc.base||0); const parts=[`${svc.name}: ${money(total)}`], answers=[]; svc.questions.forEach((q,i)=>{const el=qs("cq_"+i); if(!el)return; if(q.type==="text"||q.type==="number"){answers.push({question:q.label,answer:el.value||""}); parts.push(`${q.label}: ${el.value||"-"}`); return} const opt=(q.options||[])[parseInt(el.value||"0",10)]||null; if(opt){total=applyModifier(total,opt.modifierType,opt.modifierValue); answers.push({question:q.label,answer:opt.label}); parts.push(`${q.label}: ${opt.label} (${modifierText(opt)})`)}}); return {total,parts,answers}}
function goStep(id){qsa(".step").forEach(s=>s.classList.remove("active")); qs(id)?.classList.add("active")}
function saveWorkOrderCurrent(){openAgreementHtml(buildAgreementHtml({agreementTitle:qs("agreementHeading")?.textContent||"Service Agreement",business:qs("docBizName")?.textContent||"",customer:qs("docCustName")?.textContent||"",service:qs("docService")?.textContent||"",priceType:qs("docPrice")?.textContent||"",address:qs("docAddress")?.textContent||"",schedule:qs("docSchedule")?.textContent||"",signatureData:qs("customerSig")?.toDataURL?qs("customerSig").toDataURL("image/png"):"",logoData:state.business.logoData||""}),true)}
async function publicLoadBySlug(){
  try{
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");
    if(!slug){
      qs("customerBizName").textContent = "Missing business link";
      return;
    }

    let b = null;
    try{
      const res = await Promise.race([
        supabase.from("businesses").select("*").eq("slug",slug).maybeSingle(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("public load timeout")), 5000))
      ]);
      b = res?.data || null;
    }catch(e){
      console.error("public business load failed", e);
    }

    if(!b){
      qs("customerBizName").textContent = "Business not found";
      return;
    }

    state.business={
      id:b.id,
      name:b.name||"",
      phone:b.phone||"",
      slug:b.slug,
      mode:b.mode||"both",
      agreementTitle:b.agreement_title||"Service Agreement",
      logoData:b.logo_data||""
    };

    try{
      await loadServicesFromSupabase(b.id);
    }catch(e){
      console.error("public services load failed", e);
      state.services = [];
    }

    qs("customerBizName").textContent = state.business.name;
    qs("docBizName").textContent = state.business.name;
    setLogoUI(state.business.logoData||"");
    renderCustomerServices();
  }finally{
    stopBoot();
  }
}
function bindCustomerEvents(){qs("custService")?.addEventListener("change",renderCustomerQuestions); qs("continueCustomerBtn")?.addEventListener("click",()=>{const svc=state.services.find(s=>s.id===qs("custService").value); if(!svc)return; const r=collectAnswersAndPrice(svc); state.currentQuote=r.total; state.latestAnswers=r.answers; const mode=effectiveModeForService(svc); qs("resultTitle").textContent=mode==="estimate"?"Book Appointment":"Your Quote"; qs("quotePrice").textContent=mode==="estimate"?"Appointment":money(r.total); qs("quoteBreakdown").textContent=mode==="estimate"?"This service is booked by appointment. Choose a time to continue.":r.parts.join(" · "); qs("continueScheduleBtn").textContent=mode==="estimate"?"Book Appointment":"Accept & Schedule"; goStep("customerStep2")}); qs("continueScheduleBtn")?.addEventListener("click",()=>goStep("customerStep3")); qs("continueAgreementBtn")?.addEventListener("click",()=>{const svc=state.services.find(s=>s.id===qs("custService").value), mode=effectiveModeForService(svc); qs("agreementHeading").textContent=state.business.agreementTitle; qs("docBizName").textContent=state.business.name; qs("docCustName").textContent=qs("custName").value||"Customer"; qs("docService").textContent=svc?.name||""; qs("docPrice").textContent=mode==="estimate"?"Appointment Request":money(state.currentQuote); qs("docAddress").textContent=qs("custAddress").value||""; qs("docSchedule").textContent=formatDisplayDate(normalizeScheduleDate(qs("scheduleDate").value),qs("scheduleTime").value); goStep("customerStep4")}); qs("finishBookingBtn")?.addEventListener("click",submitPublicBooking); qs("restartCustomerBtn")?.addEventListener("click",()=>goStep("customerStep1")); qs("newTestBookingBtn")?.addEventListener("click",()=>window.location.reload()); qs("clearCustomerSigBtn")?.addEventListener("click",()=>clearSig("customerSig")); qs("saveWorkOrderBtn")?.addEventListener("click",saveWorkOrderCurrent); qs("saveWorkOrderBtnDone")?.addEventListener("click",saveWorkOrderCurrent); qsa("[data-step]").forEach(btn=>btn.addEventListener("click",()=>goStep(btn.dataset.step)))}

async function init(){
  initSignature("customerSig");
  try{
    if(qs("authSection")){
      bindContractorEvents();
      const {data}=await supabase.auth.getSession();
      if(data.session?.user) await ensureContext();
      else { showOnly("authSection"); }
      supabase.auth.onAuthStateChange(async()=>{ await ensureContext(); });
    }
    if(qs("customerBizName")){
      bindCustomerEvents();
      await publicLoadBySlug();
    }
  }catch(e){
    console.error("init failed", e);
    if(qs("authSection")) showOnly("authSection");
  }finally{
    stopBoot();
  }
}
init();
