const SUPABASE_URL = "https://pzaiwbsikhmnfnlrvtld.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_d2ghHV2agZ0xV0tr3GL1iQ_Gqbk50D6";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const menuBtn=document.querySelector(".menu-btn"),nav=document.querySelector(".nav"),search=document.querySelector("#search"),searchBtn=document.querySelector("#searchBtn");
const authModal=document.querySelector("#authModal"),authForm=document.querySelector("#authForm"),authTitle=document.querySelector("#authTitle"),authDescription=document.querySelector("#authDescription"),authSubmit=document.querySelector("#authSubmit"),authMessage=document.querySelector("#authMessage"),accountBtn=document.querySelector("#accountBtn"),sellBtn=document.querySelector("#sellBtn"),closeAuthBtn=document.querySelector("#closeAuthBtn"),loginTab=document.querySelector("#loginTab"),registerTab=document.querySelector("#registerTab"),registerFields=document.querySelectorAll(".register-only"),accountPanel=document.querySelector("#accountPanel"),accountName=document.querySelector("#accountName"),accountEmail=document.querySelector("#accountEmail"),logoutBtn=document.querySelector("#logoutBtn");
let authMode="login";

menuBtn?.addEventListener("click",()=>nav?.classList.toggle("open"));
document.querySelectorAll(".nav a").forEach(a=>a.addEventListener("click",()=>nav?.classList.remove("open")));

function setMessage(message="",type=""){authMessage.textContent=message;authMessage.className=`auth-message ${type}`;}
function openAuth(mode="login"){authModal.hidden=false;document.body.classList.add("modal-open");setAuthMode(mode);}
function closeAuth(){authModal.hidden=true;document.body.classList.remove("modal-open");setMessage();}
function setAuthMode(mode){authMode=mode;const isRegister=mode==="register";authTitle.textContent=isRegister?"Buat akun":"Masuk";authDescription.textContent=isRegister?"Buat akun untuk nanti memasang barang atau jasa.":"Masuk untuk mengelola akun dan memasang iklan.";authSubmit.textContent=isRegister?"Daftar":"Masuk";loginTab.classList.toggle("active",!isRegister);registerTab.classList.toggle("active",isRegister);registerFields.forEach(f=>f.hidden=!isRegister);document.querySelector("#name").required=isRegister;}
async function loadAccount(){const {data:{user}}=await supabase.auth.getUser();if(!user){accountBtn.textContent="Masuk";accountPanel.hidden=true;return;}const {data:profile}=await supabase.from("profiles").select("name,email,whatsapp").eq("id",user.id).maybeSingle();accountBtn.textContent=profile?.name||"Akun";accountPanel.hidden=false;accountName.textContent=profile?.name||user.user_metadata?.name||"Pengguna";accountEmail.textContent=profile?.email||user.email||"";}
async function handleAuth(event){event.preventDefault();setMessage();authSubmit.disabled=true;const email=document.querySelector("#email").value.trim(),password=document.querySelector("#password").value,name=document.querySelector("#name").value.trim(),whatsapp=document.querySelector("#whatsapp").value.trim();try{if(authMode==="register"){const {data,error}=await supabase.auth.signUp({email,password,options:{data:{name,whatsapp:whatsapp||null}}});if(error)throw error;if(data.session){setMessage("Akun berhasil dibuat. Kamu sudah masuk.","success");authForm.reset();await loadAccount();}else{setMessage("Akun dibuat. Cek email untuk konfirmasi sebelum masuk.","success");authForm.reset();}}else{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;setMessage("Berhasil masuk.","success");authForm.reset();await loadAccount();}}catch(error){setMessage(error.message||"Terjadi kesalahan. Coba lagi.","error");}finally{authSubmit.disabled=false;}}
async function logout(){const {error}=await supabase.auth.signOut();if(error){setMessage(error.message,"error");return;}accountBtn.textContent="Masuk";accountPanel.hidden=true;setMessage("Kamu sudah keluar.","success");}
function runSearch(){const q=search?.value.trim();if(!q)return;alert("Pencarian database akan kita sambungkan setelah Auth selesai.");}

accountBtn?.addEventListener("click",async()=>{const {data:{user}}=await supabase.auth.getUser();openAuth("login");if(user){authForm.hidden=true;accountPanel.hidden=false;setMessage();}else{authForm.hidden=false;accountPanel.hidden=true;}});
sellBtn?.addEventListener("click",async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){openAuth("login");setMessage("Masuk atau daftar dulu untuk memasang iklan.","info");return;}alert("Auth sudah aktif. Form posting barang/jasa kita pasang di tahap berikutnya.");});
closeAuthBtn?.addEventListener("click",closeAuth);
loginTab?.addEventListener("click",()=>{authForm.hidden=false;accountPanel.hidden=true;setAuthMode("login");setMessage();});
registerTab?.addEventListener("click",()=>{authForm.hidden=false;accountPanel.hidden=true;setAuthMode("register");setMessage();});
authForm?.addEventListener("submit",handleAuth);
logoutBtn?.addEventListener("click",logout);
authModal?.addEventListener("click",e=>{if(e.target===authModal)closeAuth();});
searchBtn?.addEventListener("click",runSearch);search?.addEventListener("keydown",e=>{if(e.key==="Enter")runSearch();});
supabase.auth.onAuthStateChange(()=>loadAccount());
setAuthMode("login");loadAccount();