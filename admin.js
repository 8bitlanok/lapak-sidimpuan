const SUPABASE_URL="https://pzaiwbsikhmnfnlrvtld.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_d2ghHV2agZ0xV0tr3GL1iQ_Gqbk50D6";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);

const gate=document.getElementById("adminGate");
const adminApp=document.getElementById("adminApp");
const content=document.getElementById("adminContent");
const stats=document.getElementById("adminStats");
const toast=document.getElementById("toast");
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

async function init(){
  const{data,error}=await sb.auth.getUser();
  if(error||!data.user){
    gate.innerHTML='<h2>Login diperlukan</h2><p>Panel admin hanya dapat digunakan setelah login.</p><a class="btn primary" href="index.html#account">Kembali ke login</a>';
    return;
  }
  const{data:isAdmin,error:adminError}=await sb.rpc("check_admin_access");
  if(adminError){
    gate.innerHTML='<h2>Akses admin belum siap</h2><p>'+esc(adminError.message)+'</p><a class="btn primary" href="index.html">Kembali</a>';
    return;
  }
  if(!isAdmin){
    gate.innerHTML='<h2>Akses ditolak</h2><p>Akun ini sudah login, tetapi belum terdaftar sebagai admin.</p><a class="btn primary" href="index.html#account">Kembali</a>';
    return;
  }
  adminUser=data.user;
  gate.classList.add("hidden");
  adminApp.classList.remove("hidden");
  await loadStats();
  await loadView();
}

async function loadStats(){
  const statuses=["pending","published","sold","rejected"];
  const results=await Promise.all(statuses.map(s=>sb.from("listings").select("id",{count:"exact",head:true}).eq("status",s)));
  const report=await sb.from("reports").select("id",{count:"exact",head:true}).eq("status","open");
  stats.innerHTML=results.map((r,i)=>'<div class="admin-stat"><strong>'+esc(r.count??0)+'</strong><span>'+["Pending","Aktif","Terjual","Ditolak"][i]+'</span></div>').join("")+
    '<div class="admin-stat"><strong>'+esc(report.count??0)+'</strong><span>Laporan terbuka</span></div>';
}

function setNav(view){
  document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
}

async function loadView(){
  setNav(currentView);
  content.innerHTML='<div class="skeleton"></div>';
  if(["pending","published","sold","rejected"].includes(currentView))return loadListings();
  if(currentView==="reports")return loadReports();
  if(currentView==="users")return loadUsers();
  return loadLogs();
}

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

async function loadLogs(){
  const{data,error}=await sb.from("moderation_logs").select("id,actor_id,target_type,target_id,action,reason,created_at").order("created_at",{ascending:false}).limit(100);
  if(error){content.innerHTML='<div class="error-box">'+esc(error.message)+'</div>';return}
  if(!data?.length){content.innerHTML='<div class="empty"><h2>Belum ada riwayat moderasi.</h2><p>Aksi approve/tolak admin akan tercatat di sini jika trigger log aktif.</p></div>';return}
  const ids=[...new Set(data.map(x=>x.actor_id).filter(Boolean))];
  const{data:profiles}=ids.length?await sb.from("profiles").select("id,name").in("id",ids):{data:[]};
  const pm=new Map((profiles||[]).map(p=>[p.id,p]));
  content.innerHTML='<div class="admin-table">'+data.map(x=>'<div class="admin-row"><strong>'+esc(x.action)+'</strong><div class="row-meta">Admin: '+esc(pm.get(x.actor_id)?.name||"Admin")+' · Target: '+esc(x.target_type||"-")+' '+esc(x.target_id||"")+'</div><div class="row-meta">'+esc(date(x.created_at))+'</div><p>'+esc(x.reason||"Tidak ada alasan.")+'</p></div>').join("")+'</div>';
}

document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{currentView=b.dataset.view;loadView()});
init();
