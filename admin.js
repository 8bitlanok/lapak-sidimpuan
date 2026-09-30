const SUPABASE_URL="https://pzaiwbsikhmnfnlrvtld.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_d2ghHV2agZ0xV0tr3GL1iQ_Gqbk50D6";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);

const gate=document.getElementById("adminGate");
const adminApp=document.getElementById("adminApp");
const content=document.getElementById("adminContent");
const stats=document.getElementById("adminStats");
const toast=document.getElementById("toast"),adminAlerts=document.getElementById("adminAlerts");
const loginForm=document.getElementById("adminLoginForm");
const loginMessage=document.getElementById("adminLoginMessage");
let currentView="pending";
let adminUser=null;

const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const money=v=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v||0);
const date=v=>v?new Date(v).toLocaleString("id-ID"):"-";
const toastMsg=m=>{toast.textContent=m;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2200)};

async function signedUrl(path){
  if(!path)return null;
  const{data,error}=await sb.storage.from("listing-images").createSignedUrl(path,3600);
  return error?null:data?.signedUrl||null;
}

async function checkAdminAccess(){
  const{data,error}=await sb.rpc("check_admin_access");
  return{ok:Boolean(data),error};
}
async function openDashboard(){
  const{data,error}=await sb.auth.getUser();
  if(error||!data.user)return false;
  const check=await checkAdminAccess();
  if(check.error){
    loginMessage.textContent=check.error.message||"Gagal memeriksa akses admin.";
    loginMessage.className="form-message error";
    return false;
  }
  if(!check.ok){
    loginMessage.textContent="Akun ini bukan admin.";
    loginMessage.className="form-message error";
    return false;
  }
  adminUser=data.user;
  gate.classList.add("hidden");
  adminApp.classList.remove("hidden");
  await loadStats();
  await loadView();
  return true;
}
async function loginAdmin(e){
  e.preventDefault();
  loginMessage.textContent="Memeriksa akun...";
  loginMessage.className="form-message";
  const email=document.getElementById("adminEmail").value.trim();
  const password=document.getElementById("adminPassword").value;
  const{data,error}=await sb.auth.signInWithPassword({email,password});
  if(error){
    loginMessage.textContent=error.message||"Login gagal.";
    loginMessage.className="form-message error";
    return;
  }
  if(!data.session){
    loginMessage.textContent="Login belum membuat sesi.";
    loginMessage.className="form-message error";
    return;
  }
  await openDashboard();
}
async function init(){
  const{data}=await sb.auth.getSession();
  if(data.session) await openDashboard();
}

async function loadStats(){
  const count=async(table,filter)=>{let q=sb.from(table).select("id",{count:"exact",head:true});if(filter)q=filter(q);const r=await q;return r.count??0};
  const[sUsers,sUsers7,sListings,sPending,sPublished,sSold,sRejected,sReports,sSupport,sFav]=await Promise.all([
    count("profiles"),count("profiles",q=>q.gte("created_at",new Date(Date.now()-7*864e5).toISOString())),
    count("listings"),count("listings",q=>q.eq("status","pending")),count("listings",q=>q.eq("status","published")),
    count("listings",q=>q.eq("status","sold")),count("listings",q=>q.eq("status","rejected")),
    count("reports",q=>q.in("status",["open","reviewing"])),count("support_tickets",q=>q.in("status",["open","reviewing"])),count("favorites")
  ]);
  const s={users:sUsers,users7:sUsers7,listings:sListings,pending:sPending,published:sPublished,sold:sSold,rejected:sRejected,reports:sReports,support:sSupport,favorites:sFav};
  stats.innerHTML=[
    ["👥","Pengguna",s.users,"+"+s.users7+" baru / 7 hari","users"],
    ["📦","Total listing",s.listings,s.published+" aktif","overview"],
    ["⏳","Pending",s.pending,"Perlu moderasi","pending"],
    ["🚨","Laporan",s.reports,"Perlu perhatian","reports"],
    ["🎫","Bantuan",s.support,"Tiket belum selesai","support"],
    ["❤️","Favorit",s.favorites,"Interaksi pengguna","overview"]
  ].map(x=>'<button class="admin-stat" data-stat="'+x[4]+'"><span class="stat-icon">'+x[0]+'</span><div><strong>'+esc(x[2])+'</strong><span>'+esc(x[1])+'</span><small>'+esc(x[3])+'</small></div></button>').join("");
  document.querySelectorAll("[data-stat]").forEach(b=>b.onclick=()=>{currentView=b.dataset.stat;loadView()});
  const notices=[];if(s.pending)notices.push(["warning",s.pending+" listing menunggu approval.","pending"]);if(s.reports)notices.push(["danger",s.reports+" laporan perlu ditangani.","reports"]);if(s.support)notices.push(["info",s.support+" tiket bantuan belum selesai.","support"]);
  adminAlerts.innerHTML=notices.length?notices.map(x=>'<button class="admin-alert '+x[0]+'" data-alert="'+x[2]+'"><strong>'+esc(x[1])+'</strong><span>Buka →</span></button>').join(""):'<div class="admin-ok">✓ Tidak ada pekerjaan mendesak saat ini.</div>';
  document.querySelectorAll("[data-alert]").forEach(b=>b.onclick=()=>{currentView=b.dataset.alert;loadView()});
  return s;
}

function setNav(view){
  document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
}

async function loadView(){
  setNav(currentView);content.innerHTML='<div class="skeleton"></div>';
  if(currentView==="overview")return loadOverview();
  if(["pending","published","sold","rejected"].includes(currentView))return loadListings();
  if(currentView==="reports")return loadReports();
  if(currentView==="users")return loadUsers();
  if(currentView==="support")return loadSupport();
  return loadLogs();
}

async function loadOverview(){
  const[{data:listings},{data:cats},{data:acts}]=await Promise.all([
    sb.from("listings").select("id,title,status,type,created_at,categories(name)").order("created_at",{ascending:false}).limit(8),
    sb.from("categories").select("id,name,type").eq("active",true).order("sort_order"),
    sb.from("activity_logs").select("id,event_type,target_type,target_id,metadata,created_at,actor_id").order("created_at",{ascending:false}).limit(8)
  ]);
  const categoryCounts=new Map();
  (listings||[]).forEach(x=>{const n=x.categories?.name||"Lainnya";categoryCounts.set(n,(categoryCounts.get(n)||0)+1)});
  const recent=(listings||[]).map(x=>'<div class="compact-row"><div><strong>'+esc(x.title)+'</strong><span>'+esc(x.categories?.name||x.type||"")+'</span></div><span class="status-pill status-'+esc(x.status)+'">'+esc(statusLabel(x.status))+'</span></div>').join("")||'<div class="empty-mini">Belum ada listing.</div>';
  const catHtml=[...categoryCounts.entries()].sort((a,b)=>b[1]-a[1]).map(x=>'<div class="bar-row"><span>'+esc(x[0])+'</span><strong>'+x[1]+'</strong></div>').join("")||'<div class="empty-mini">Belum ada data kategori.</div>';
  const actHtml=(acts||[]).map(activityRow).join("")||'<div class="empty-mini">Belum ada aktivitas.</div>';
  content.innerHTML='<div class="overview-grid"><section class="panel"><div class="panel-head"><h2>Listing terbaru</h2><button class="text-btn" data-go="published">Lihat aktif</button></div>'+recent+'</section><section class="panel"><div class="panel-head"><h2>Kategori yang terisi</h2><span class="muted">8 listing terbaru</span></div>'+catHtml+'</section><section class="panel wide"><div class="panel-head"><h2>Aktivitas terbaru</h2><button class="text-btn" data-go="logs">Lihat semua</button></div>'+actHtml+'</section></div>';
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{currentView=b.dataset.go;loadView()});
}
function statusLabel(s){return({pending:"Pending",published:"Aktif",sold:"Terjual",rejected:"Ditolak",archived:"Arsip"})[s]||s}
function activityRow(x){const m=x.metadata||{};const labels={user_registered:"Pengguna baru",listing_created:"Listing dibuat",report_created:"Laporan dibuat",support_created:"Tiket bantuan"};return '<div class="compact-row"><div><strong>'+esc(labels[x.event_type]||x.event_type)+'</strong><span>'+esc(m.title||m.subject||m.reason||x.target_type||"Aktivitas")+'</span></div><span class="row-time">'+esc(date(x.created_at))+'</span></div>'}

async function loadListings(){
  const{data,error}=await sb.from("listings")
    .select("id,seller_id,title,type,status,description,contact_whatsapp,created_at,rejection_reason,categories(name),item_details(price,condition,cod_location),service_details(price_text,work_mode),listing_images(storage_path,sort_order)")
    .eq("status",currentView).order("created_at",{ascending:true}).limit(50);
  if(error){content.innerHTML='<div class="error-box">'+esc(error.message)+'</div>';return}
  if(!data?.length){content.innerHTML='<div class="empty"><h2>Tidak ada listing '+esc(currentView)+'.</h2><p>Dashboard akan menampilkan data di sini saat ada listing.</p></div>';return}

  const ids=[...new Set(data.map(x=>x.seller_id).filter(Boolean))];
  const{data:profiles}=ids.length?await sb.from("profiles").select("id,name,whatsapp,status").in("id",ids):{data:[]};
  const pm=new Map((profiles||[]).map(p=>[p.id,p]));
  content.innerHTML='<div class="admin-list">'+(await Promise.all(data.map(x=>card(x,pm.get(x.seller_id))))).join("")+'</div>';
  document.querySelectorAll("[data-approve]").forEach(b=>b.onclick=()=>approve(b.dataset.approve));
  document.querySelectorAll("[data-reject]").forEach(b=>b.onclick=()=>reject(b.dataset.reject));
}

async function card(x,seller){
  const d=x.type==="barang"?x.item_details?.[0]:x.service_details?.[0];
  const im=(x.listing_images||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))[0];
  const url=await signedUrl(im?.storage_path);
  const price=x.type==="barang"?(d?.price!=null?money(d.price):"Harga belum diisi"):(d?.price_text||"Harga sesuai layanan");
  return '<article class="admin-card">'+
    '<div class="admin-image">'+(url?'<img src="'+esc(url)+'" alt="'+esc(x.title)+'">':"Tanpa foto")+'</div>'+
    '<div class="admin-card-body">'+
      '<div class="admin-meta">'+esc(x.categories?.name||"")+' · '+esc(x.type)+"</div>"+
      '<h3>'+esc(x.title)+'</h3>'+
      '<strong>'+esc(price)+'</strong>'+
      '<p>'+esc(x.description||"")+'</p>'+
      '<div class="admin-meta">Penjual: '+esc(seller?.name||"Tidak ditemukan")+' · Status akun: '+esc(seller?.status||"-")+'</div>'+
      '<div class="admin-meta">WhatsApp listing: '+esc(x.contact_whatsapp||"-")+'</div>'+
      '<div class="admin-meta">'+esc(d?.condition||"Jasa")+' · '+esc(d?.cod_location||d?.work_mode||"")+'</div>'+
      '<p class="admin-meta">Dibuat: '+esc(date(x.created_at))+'</p>'+
      (x.rejection_reason?'<p><strong>Alasan penolakan:</strong> '+esc(x.rejection_reason)+'</p>':"")+
      (x.status==="pending"?'<div class="admin-actions"><button class="btn primary" data-approve="'+x.id+'">Approve</button><textarea class="reject-reason" id="reason-'+x.id+'" placeholder="Alasan penolakan, minimal 5 karakter"></textarea><button class="btn danger-btn" data-reject="'+x.id+'">Tolak</button></div>':"")+
    '</div></article>';
}

async function approve(id){
  const{error}=await sb.from("listings").update({
    status:"published",
    approved_at:new Date().toISOString(),
    approved_by:adminUser.id,
    rejection_reason:null
  }).eq("id",id).eq("status","pending");
  if(error){toastMsg(error.message);return}
  toastMsg("Listing disetujui.");
  await loadStats(); await loadView();
}

async function reject(id){
  const reason=document.getElementById("reason-"+id)?.value.trim()||"";
  if(reason.length<5){toastMsg("Alasan minimal 5 karakter.");return}
  const{error}=await sb.from("listings").update({
    status:"rejected",
    rejection_reason:reason.slice(0,1000),
    approved_at:null,
    approved_by:null
  }).eq("id",id).eq("status","pending");
  if(error){toastMsg(error.message);return}
  toastMsg("Listing ditolak.");
  await loadStats(); await loadView();
}

async function loadReports(){
  const{data,error}=await sb.from("reports").select("id,reporter_id,listing_id,reason,description,status,created_at").order("created_at",{ascending:false}).limit(100);
  if(error){content.innerHTML='<div class="error-box">'+esc(error.message)+'</div>';return}
  if(!data?.length){content.innerHTML='<div class="empty"><h2>Belum ada laporan.</h2><p>Laporan dari pengguna akan muncul di sini.</p></div>';return}
  const listingIds=[...new Set(data.map(r=>r.listing_id).filter(Boolean))];
  const reporterIds=[...new Set(data.map(r=>r.reporter_id).filter(Boolean))];
  const[{data:listings},{data:reporters}]=await Promise.all([
    listingIds.length?sb.from("listings").select("id,title,status").in("id",listingIds):Promise.resolve({data:[]}),
    reporterIds.length?sb.from("profiles").select("id,name").in("id",reporterIds):Promise.resolve({data:[]})
  ]);
  const lm=new Map((listings||[]).map(x=>[x.id,x]));
  const rm=new Map((reporters||[]).map(x=>[x.id,x]));
  content.innerHTML='<div class="admin-table">'+data.map(r=>{
    const l=lm.get(r.listing_id),u=rm.get(r.reporter_id);
    return '<div class="admin-row"><strong>'+esc(r.reason)+'</strong><div class="row-meta">Listing: '+esc(l?.title||"Listing sudah tidak ada")+' · Penjual/status: '+esc(l?.status||"-")+'</div><div class="row-meta">Pelapor: '+esc(u?.name||"Pengguna")+' · '+esc(date(r.created_at))+'</div><p>'+esc(r.description||"Tidak ada deskripsi tambahan.")+'</p><span class="status-pill">'+esc(r.status)+'</span>'+(
      ["open","reviewing"].includes(r.status)?
      '<div class="row-actions"><button class="btn secondary" data-report-review="'+r.id+'">Tinjau</button><button class="btn primary" data-report-resolve="'+r.id+'">Selesaikan</button><button class="btn danger-btn" data-report-dismiss="'+r.id+'">Abaikan</button></div>':""
    )+'</div>';
  }).join("")+'</div>';
  document.querySelectorAll("[data-report-review]").forEach(b=>b.onclick=()=>updateReport(b.dataset.reportReview,"reviewing"));
  document.querySelectorAll("[data-report-resolve]").forEach(b=>b.onclick=()=>updateReport(b.dataset.reportResolve,"resolved"));
  document.querySelectorAll("[data-report-dismiss]").forEach(b=>b.onclick=()=>updateReport(b.dataset.reportDismiss,"dismissed"));
}

async function updateReport(id,status){
  const{error}=await sb.from("reports").update({status,reviewed_by:adminUser.id,reviewed_at:new Date().toISOString()}).eq("id",id);
  if(error){toastMsg(error.message);return}
  toastMsg("Status laporan diperbarui.");
  await loadStats(); await loadReports();
}

async function loadUsers(){
  const{data,error}=await sb.from("profiles").select("id,name,whatsapp,status,created_at,updated_at").order("created_at",{ascending:false}).limit(100);
  if(error){content.innerHTML='<div class="error-box">'+esc(error.message)+'</div>';return}
  if(!data?.length){content.innerHTML='<div class="empty">Belum ada pengguna.</div>';return}
  const listingCounts=await Promise.all(data.map(u=>sb.from("listings").select("id",{count:"exact",head:true}).eq("seller_id",u.id)));
  content.innerHTML='<div class="admin-table">'+data.map((u,i)=>'<div class="admin-row"><strong>'+esc(u.name||"Tanpa nama")+'</strong><div class="row-meta">WhatsApp: '+esc(u.whatsapp||"-")+'</div><div class="row-meta">Status akun: '+esc(u.status||"-")+' · Listing: '+esc(listingCounts[i].count??0)+'</div><div class="row-meta">Terdaftar: '+esc(date(u.created_at))+'</div></div>').join("")+'</div>';
}

async function loadSupport(){
  const{data,error}=await sb.from("support_tickets").select("id,user_id,category,subject,message,status,admin_reply,created_at,updated_at").order("updated_at",{ascending:false}).limit(100);
  if(error){content.innerHTML='<div class="error-box">'+esc(error.message)+'</div>';return}
  if(!data?.length){content.innerHTML='<div class="empty"><h2>Belum ada tiket bantuan.</h2><p>Pengguna dapat menghubungi admin dari menu Akun.</p></div>';return}
  const ids=[...new Set(data.map(x=>x.user_id).filter(Boolean))];const{data:users}=ids.length?await sb.from("profiles").select("id,name,email,whatsapp").in("id",ids):{data:[]};const um=new Map((users||[]).map(x=>[x.id,x]));
  content.innerHTML='<div class="admin-table">'+data.map(t=>{const u=um.get(t.user_id);return '<div class="ticket-row"><div class="row-top"><div><span class="ticket-category">'+esc(t.category)+'</span><h3>'+esc(t.subject)+'</h3></div><span class="status-pill status-'+esc(t.status)+'">'+esc(t.status)+'</span></div><div class="row-meta">'+esc(u?.name||"Pengguna")+' · '+esc(u?.email||"")+' · WA '+esc(u?.whatsapp||"-")+'</div><p>'+esc(t.message)+'</p>'+(t.admin_reply?'<div class="admin-reply"><strong>Balasan admin</strong><p>'+esc(t.admin_reply)+'</p></div>':'')+(['open','reviewing'].includes(t.status)?'<div class="ticket-form"><textarea id="reply-'+t.id+'" placeholder="Tulis balasan untuk pengguna...">'+esc(t.admin_reply||"")+'</textarea><div class="row-actions"><button class="btn secondary" data-ticket-review="'+t.id+'">Tandai diproses</button><button class="btn primary" data-ticket-resolve="'+t.id+'">Balas & selesai</button></div></div>':"")+'</div>'}).join("")+'</div>';
  document.querySelectorAll("[data-ticket-review]").forEach(b=>b.onclick=()=>updateTicket(b.dataset.ticketReview,"reviewing"));
  document.querySelectorAll("[data-ticket-resolve]").forEach(b=>b.onclick=()=>updateTicket(b.dataset.ticketResolve,"resolved"));
}
async function updateTicket(id,status){const reply=document.getElementById("reply-"+id)?.value.trim()||null;const patch={status,admin_id:adminUser.id,admin_reply:reply};if(status==="resolved")patch.resolved_at=new Date().toISOString();const{error}=await sb.from("support_tickets").update(patch).eq("id",id);if(error){toastMsg(error.message);return}toastMsg("Tiket diperbarui.");await refreshDashboard()}

async function loadLogs(){
  const[{data:acts,error:aErr},{data:mods,error:mErr}]=await Promise.all([
    sb.from("activity_logs").select("id,event_type,target_type,target_id,metadata,created_at,actor_id").order("created_at",{ascending:false}).limit(100),
    sb.from("moderation_logs").select("id,actor_id,target_type,target_id,action,reason,created_at").order("created_at",{ascending:false}).limit(100)
  ]);
  if(aErr||mErr){content.innerHTML='<div class="error-box">'+esc(aErr?.message||mErr?.message||"Gagal memuat aktivitas.")+'</div>';return}
  const combined=[...(acts||[]).map(x=>({...x,kind:"activity"})),...(mods||[]).map(x=>({...x,event_type:"moderation",metadata:{action:x.action,reason:x.reason},kind:"moderation"}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,150);
  if(!combined.length){content.innerHTML='<div class="empty"><h2>Belum ada aktivitas.</h2><p>Aktivitas pengguna dan moderasi akan tercatat di sini.</p></div>';return}
  const ids=[...new Set(combined.map(x=>x.actor_id).filter(Boolean))];const{data:users}=ids.length?await sb.from("profiles").select("id,name,email").in("id",ids):{data:[]};const um=new Map((users||[]).map(x=>[x.id,x]));
  content.innerHTML='<div class="timeline">'+combined.map(x=>{const m=x.metadata||{},u=um.get(x.actor_id);let label=x.kind==="moderation"?"Moderasi: "+(m.action||"aksi"):({user_registered:"Pengguna baru",listing_created:"Listing dibuat",report_created:"Laporan dibuat",support_created:"Tiket bantuan"}[x.event_type]||x.event_type);return '<div class="timeline-item"><span class="timeline-dot"></span><div><strong>'+esc(label)+'</strong><p>'+esc(m.title||m.subject||m.reason||x.target_type||"Aktivitas")+'</p><small>'+esc(u?.name||"Sistem")+' · '+esc(date(x.created_at))+'</small></div></div>'}).join("")+'</div>';
}

document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{currentView=b.dataset.view;loadView()});
loginForm?.addEventListener("submit",loginAdmin);
init();
