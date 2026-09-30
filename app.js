const menuBtn=document.querySelector(".menu-btn");const nav=document.querySelector(".nav");const search=document.querySelector("#search");const searchBtn=document.querySelector("#searchBtn");
menuBtn?.addEventListener("click",()=>nav?.classList.toggle("open"));
document.querySelectorAll(".nav a").forEach(a=>a.addEventListener("click",()=>nav?.classList.remove("open")));
function runSearch(){const q=search?.value.trim();if(!q)return;alert("Pencarian akan terhubung ke database Lapak Sidimpuan pada tahap berikutnya.")}
searchBtn?.addEventListener("click",runSearch);search?.addEventListener("keydown",e=>{if(e.key==="Enter")runSearch()});