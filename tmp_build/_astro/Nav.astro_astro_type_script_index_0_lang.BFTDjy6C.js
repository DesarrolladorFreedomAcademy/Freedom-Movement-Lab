import{s as l}from"./supabase.CNFOKxbF.js";const _=document.getElementById("notifications-wrapper"),M=document.getElementById("mobile-auth-loading"),$=document.getElementById("mobile-login-btn"),k=document.getElementById("mobile-user-nav"),C=document.getElementById("mobile-avatar-img"),w=document.getElementById("desktop-auth-loading"),N=document.getElementById("desktop-login-btn"),E=document.getElementById("desktop-user-nav"),T=document.getElementById("desktop-avatar-img"),z=window.location.pathname.startsWith("/perfil");if(z){const e=document.getElementById("mobile-search-btn"),t=document.getElementById("desktop-search-bar");e&&(e.style.display="none"),t&&(t.style.display="none")}const y=document.getElementById("noti-dot-pulse"),L=document.getElementById("noti-dot-solid");function B(){y&&y.classList.remove("hidden"),L&&L.classList.remove("hidden"),localStorage.setItem("fml_unread_notis","true")}function f(){y&&y.classList.add("hidden"),L&&L.classList.add("hidden"),localStorage.setItem("fml_unread_notis","false")}localStorage.getItem("fml_unread_notis")==="true"&&B();async function P(e){const t=localStorage.getItem("fml_noti_last_check"),i=new Date().getTime();if(!(t&&i-parseInt(t)<300*1e3)){localStorage.setItem("fml_noti_last_check",i.toString());try{const{data:o}=await l.from("seguimientos").select("instructor_nombre").eq("usuario_id",e);if(!o||o.length===0){f();return}const r=o.map(c=>c.instructor_nombre),n=new Date(i-864e5*3).toISOString(),{data:s}=await l.from("videos").select("id").eq("estado","listo").in("instructor",r).gte("creado_en",n);if(!s||s.length===0){f();return}const p=s.map(c=>c.id),{data:v}=await l.from("notificaciones_vistas").select("video_id").eq("usuario_id",e).in("video_id",p),d=new Set(v?.map(c=>c.video_id)||[]);s.some(c=>!d.has(c.id))?B():f()}catch{}}}async function U(){try{const{data:{session:e}}=await l.auth.getSession();if(M&&M.classList.add("hidden"),w&&w.classList.add("hidden"),w&&w.classList.remove("md:block"),e&&e.user){const t=e.user.user_metadata,i=t?.full_name||e.user.email?.split("@")[0]||"Usuario",o=t?.avatar_url||`https://ui-avatars.com/api/?name=${encodeURIComponent(i)}&background=00A3FF&color=fff`;C&&(C.src=o),T&&(T.src=o),window.location.pathname.startsWith("/perfil")||(k&&(k.classList.remove("hidden"),k.classList.add("flex")),E&&(E.classList.remove("hidden"),E.classList.add("hidden","md:flex"))),_&&(_.classList.remove("hidden"),_.classList.add("flex"),P(e.user.id))}else $&&$.classList.remove("hidden"),N&&N.classList.add("hidden","md:flex")}catch(e){console.error("Error on auth load:",e)}}U();const I=document.getElementById("noti-btn"),u=document.getElementById("noti-dropdown");let H=!1;I&&u&&(I.addEventListener("click",e=>{e.stopPropagation(),!u.classList.contains("opacity-0")?(u.classList.add("opacity-0","invisible","scale-95"),u.classList.remove("opacity-100","visible","scale-100")):(u.classList.remove("opacity-0","invisible","scale-95"),u.classList.add("opacity-100","visible","scale-100"),H||(V(),H=!0))}),document.addEventListener("click",e=>{!u.contains(e.target)&&!I.contains(e.target)&&(u.classList.add("opacity-0","invisible","scale-95"),u.classList.remove("opacity-100","visible","scale-100"))}));function R(e){const t=new Date,i=new Date(e),o=t.getTime()-i.getTime(),r=Math.floor(o/6e4),n=Math.floor(r/60),s=Math.floor(n/24);return r<1?"Ahora mismo":r<60?`Hace ${r} min`:n<24?`Hace ${n}h`:s===1?"Ayer":s<7?`Hace ${s} días`:s<30?`Hace ${Math.floor(s/7)} semana${Math.floor(s/7)>1?"s":""}`:i.toLocaleDateString("es-ES",{day:"numeric",month:"short"})}let x=[],h=null;async function V(){const e=document.getElementById("noti-list"),t=document.getElementById("noti-badge-count"),i=document.getElementById("btn-marcar-vistas");if(e)try{const{data:{session:o}}=await l.auth.getSession();if(!o?.user){e.innerHTML=`
          <div class="p-6 text-center">
            <p class="text-sm text-slate-400">Inicia sesión para ver notificaciones.</p>
          </div>`;return}h=o.user.id;const{data:r}=await l.from("perfiles").select("rol, nombre").eq("id",h).single();if(r?.rol==="instructor"||r?.rol==="admin"){e.innerHTML=`
           <div class="p-3">
             <div class="bg-gradient-to-r from-[#1E293B] to-[#0F172A] border border-[#EAB308]/30 px-4 py-3 rounded-xl flex items-center justify-between mb-3 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
               <div class="flex items-center gap-2">
                 <svg class="w-4 h-4 text-[#EAB308]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/><path d="M16 16l-4-4-4 4"/></svg>
                 <span class="text-xs font-black text-[#EAB308] uppercase tracking-wider">Métricas Creador</span>
               </div>
               <span class="text-[10px] text-slate-400 uppercase font-bold tracking-widest bg-slate-800 px-2 py-0.5 rounded">Últimos 7 días</span>
             </div>
             
             <div class="space-y-2">
               <!-- Nuevos Seguidores -->
               <div class="noti-item flex gap-3 items-center p-3 bg-white/5 hover:bg-white/10 transition-colors border border-white/5 rounded-xl relative overflow-hidden group">
                 <div class="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div class="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex flex-shrink-0 items-center justify-center relative z-10">
                   <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                 </div>
                 <div class="min-w-0 flex-1 relative z-10">
                   <p class="text-sm text-slate-200 leading-snug"><span class="font-bold text-emerald-400 text-base">+24</span> nuevos traceurs comenzaron a seguirte</p>
                   <p class="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide font-bold">¡La comunidad crece!</p>
                 </div>
               </div>
               
               <!-- Visualizaciones -->
               <div class="noti-item flex gap-3 items-center p-3 bg-white/5 hover:bg-white/10 transition-colors border border-white/5 rounded-xl relative overflow-hidden group">
                 <div class="absolute inset-0 bg-[#00A3FF]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div class="w-10 h-10 rounded-full bg-[#00A3FF]/10 border border-[#00A3FF]/20 text-[#00A3FF] flex flex-shrink-0 items-center justify-center relative z-10">
                   <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                 </div>
                 <div class="min-w-0 flex-1 relative z-10">
                   <p class="text-sm text-slate-200 leading-snug"><span class="font-bold text-[#00A3FF] text-base">4,280</span> min. de reproducción acumulados.</p>
                   <p class="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide font-bold">↑ 18% respecto a la semana anterior</p>
                 </div>
               </div>

               <!-- Interacciones -->
               <div class="noti-item flex gap-3 items-center p-3 bg-white/5 hover:bg-white/10 transition-colors border border-white/5 rounded-xl relative overflow-hidden group">
                 <div class="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div class="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex flex-shrink-0 items-center justify-center relative z-10">
                   <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                 </div>
                 <div class="min-w-0 flex-1 relative z-10">
                   <p class="text-[13px] text-slate-200 leading-snug"><span class="font-bold text-white">Alex P.</span> ha guardado en favoritos tu tutorial <span class="text-slate-400 font-semibold italic">"Fundamentos Wall Run"</span>.</p>
                   <p class="text-[10px] text-slate-500 mt-1">Hace 2 horas</p>
                 </div>
               </div>
             </div>
           </div>`,t&&(t.textContent=r?.rol==="admin"?"PANEL ADMIN":"PANEL INSTRUCTOR",t.classList.replace("text-[#00A3FF]","text-[#EAB308]"),t.classList.remove("hidden")),i&&i.classList.add("hidden"),f();return}const{data:s,error:p}=await l.from("seguimientos").select("instructor_nombre").eq("usuario_id",h);if(p||!s||s.length===0){e.innerHTML=`
          <div class="p-6 text-center">
            <svg class="w-8 h-8 text-slate-600 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            <p class="text-sm text-slate-400 mb-1">Sin notificaciones</p>
            <p class="text-xs text-slate-500">Sigue instructores en el catálogo para recibir alertas de nuevos vídeos.</p>
          </div>`,f();return}const v=s.map(a=>a.instructor_nombre),{data:d,error:A}=await l.from("videos").select("id, titulo, instructor, creado_en, mux_playback_id").eq("estado","listo").in("instructor",v).order("creado_en",{ascending:!1}).limit(10);if(A||!d||d.length===0){e.innerHTML=`
          <div class="p-6 text-center">
            <p class="text-sm text-slate-400 mb-1">Todo al día</p>
            <p class="text-xs text-slate-500">Tus instructores seguidos no han publicado vídeos recientes.</p>
          </div>`,f();return}let c=new Set;try{const a=d.map(m=>m.id),{data:b}=await l.from("notificaciones_vistas").select("video_id").eq("usuario_id",h).in("video_id",a);b&&b.forEach(m=>c.add(m.video_id))}catch{}x=d.filter(a=>!c.has(a.id)).map(a=>a.id);const g=x.length;t&&g>0?(t.textContent=`${g} nueva${g>1?"s":""}`,t.classList.remove("hidden")):t&&t.classList.add("hidden"),i&&g>0&&i.classList.remove("hidden"),g>0?B():f();let S="";d.forEach((a,b)=>{const m=!c.has(a.id),F=a.mux_playback_id?`https://image.mux.com/${a.mux_playback_id}/thumbnail.webp?time=1&width=80&height=45`:"",q=b<d.length-1?"border-b border-white/5":"",D=m?"bg-white/5 hover:bg-white/10":"hover:bg-white/5";S+=`
          <a href="/reproductor?id=${a.id}" class="noti-item block p-3 ${q} ${D} transition-colors" data-video-id="${a.id}">
            <div class="flex gap-3">
              ${F?`
                <div class="w-16 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-white/5">
                  <img src="${F}" alt="" class="w-full h-full object-cover" />
                </div>
              `:`
                <div class="noti-dot w-2 h-2 mt-1.5 rounded-full ${m?"bg-[#00A3FF]":"bg-transparent"} flex-shrink-0"></div>
              `}
              <div class="min-w-0">
                <p class="text-sm ${m?"text-slate-200":"text-slate-300"} leading-snug">
                  <span class="font-bold ${m?"text-white":"text-slate-200"}">${a.instructor}</span> ha publicado
                </p>
                <p class="noti-titulo text-xs ${m?"text-[#00A3FF]":"text-slate-400"} font-medium truncate mt-0.5">${a.titulo}</p>
                <p class="text-[10px] text-slate-500 mt-1">${R(a.creado_en)}</p>
              </div>
            </div>
          </a>
        `}),e.innerHTML=S}catch(o){console.error("Error cargando notificaciones:",o),e.innerHTML=`
        <div class="p-6 text-center">
          <p class="text-sm text-slate-400">No se pudieron cargar las notificaciones.</p>
        </div>`}}async function j(){if(!h||x.length===0)return;const e=document.getElementById("btn-marcar-vistas"),t=document.getElementById("noti-badge-count");e&&(e.textContent="Guardando...");try{const i=x.map(n=>({usuario_id:h,video_id:n})),{error:o}=await l.from("notificaciones_vistas").upsert(i,{onConflict:"usuario_id, video_id"});if(o)throw o;document.querySelectorAll(".noti-item").forEach(n=>{n.classList.remove("bg-white/5"),n.classList.add("hover:bg-white/5");const s=n.querySelector(".noti-titulo");s&&(s.classList.remove("text-[#00A3FF]"),s.classList.add("text-slate-400"));const p=n.querySelector(".noti-dot");p&&(p.classList.remove("bg-[#00A3FF]"),p.classList.add("bg-transparent"));const v=n.querySelector(".font-bold");v&&(v.classList.remove("text-white"),v.classList.add("text-slate-200"));const d=n.querySelector("p.text-sm");d&&(d.classList.remove("text-slate-200"),d.classList.add("text-slate-300"))}),t&&t.classList.add("hidden"),f(),e&&(e.textContent="✓ Listo",e.classList.add("text-emerald-400"),e.classList.remove("text-slate-400"),setTimeout(()=>{e.classList.add("hidden")},2e3)),x=[]}catch(i){console.error("Error marcando como vistas:",i),e&&(e.textContent="Error, reintentar")}}document.getElementById("btn-marcar-vistas")?.addEventListener("click",j);
