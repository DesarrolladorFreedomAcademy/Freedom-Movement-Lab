import{s as d}from"./supabase.CNFOKxbF.js";const h=document.getElementById("tab-todos"),p=document.getElementById("tab-siguiendo"),x=document.getElementById("sidebar-todos"),v=document.getElementById("sidebar-siguiendo"),E=document.getElementById("view-todos"),L=document.getElementById("view-siguiendo"),I=document.getElementById("filters-bar"),F=document.getElementById("catalog-title"),_=document.getElementById("catalog-subtitle"),c=document.getElementById("following-count"),g=document.getElementById("siguiendo-loading"),m=document.getElementById("siguiendo-content"),l=document.getElementById("siguiendo-empty"),b=document.getElementById("siguiendo-no-session"),A=document.getElementById("btn-go-explore");let w=!1;function u(s){const e=s==="todos";h&&p&&(e?(h.className="catalog-tab bg-[#00A3FF] text-white px-5 py-2 rounded-full text-sm font-bold transition-all shadow-[0_0_15px_rgba(0,163,255,0.3)]",p.className="catalog-tab bg-[#1E293B] hover:bg-slate-700 text-slate-300 border border-[#334155] px-5 py-2 rounded-full text-sm font-bold transition-all"):(p.className="catalog-tab bg-[#00A3FF] text-white px-5 py-2 rounded-full text-sm font-bold transition-all shadow-[0_0_15px_rgba(0,163,255,0.3)]",h.className="catalog-tab bg-[#1E293B] hover:bg-slate-700 text-slate-300 border border-[#334155] px-5 py-2 rounded-full text-sm font-bold transition-all")),x&&v&&(e?(x.className="sidebar-tab-link flex items-center gap-3 px-4 py-2.5 bg-[#00A3FF]/10 text-[#00A3FF] rounded-xl font-medium transition-colors",v.className="sidebar-tab-link flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors"):(v.className="sidebar-tab-link flex items-center gap-3 px-4 py-2.5 bg-[#00A3FF]/10 text-[#00A3FF] rounded-xl font-medium transition-colors",x.className="sidebar-tab-link flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors")),E&&E.classList.toggle("hidden",!e),L&&L.classList.toggle("hidden",e),I&&I.classList.toggle("hidden",!e),F&&(F.textContent=e?"Todos los Talleres y Tutoriales":"Instructores que Sigues"),_&&(_.textContent=e?"Domina tus habilidades con nuestras sesiones de alta intensidad dirigidas por expertos.":"Aquí aparecen los vídeos de los instructores a los que sigues."),!e&&!w&&B()}h?.addEventListener("click",()=>u("todos"));p?.addEventListener("click",()=>u("siguiendo"));x?.addEventListener("click",s=>{s.preventDefault(),u("todos")});v?.addEventListener("click",s=>{s.preventDefault(),u("siguiendo")});A?.addEventListener("click",()=>u("todos"));async function B(){g?.classList.remove("hidden"),m?.classList.add("hidden"),l?.classList.add("hidden"),l?.classList.remove("flex"),b?.classList.add("hidden"),b?.classList.remove("flex");const{data:{session:s}}=await d.auth.getSession();if(!s?.user){g?.classList.add("hidden"),b?.classList.remove("hidden"),b?.classList.add("flex");return}const e=s.user.id;try{const{data:n,error:t}=await d.from("seguimientos").select("instructor_nombre, creado_en").eq("usuario_id",e).order("creado_en",{ascending:!1});if(t)throw t;if(!n||n.length===0){g?.classList.add("hidden"),l?.classList.remove("hidden"),l?.classList.add("flex"),w=!0;return}c&&(c.textContent=n.length.toString(),c.classList.remove("hidden"));const r=n.map(a=>a.instructor_nombre),{data:f,error:i}=await d.from("videos").select("id, titulo, instructor, dificultad, creado_en, mux_playback_id").eq("estado","listo").in("instructor",r).order("creado_en",{ascending:!1});if(i)throw i;const o={};r.forEach(a=>{o[a]=[]}),(f||[]).forEach(a=>{o[a.instructor]&&o[a.instructor].push(a)}),$(o),w=!0}catch(n){console.error("Error cargando vista siguiendo:",n),g?.classList.add("hidden"),l?.classList.remove("hidden"),l?.classList.add("flex")}}function $(s){if(!m)return;let e="";for(const[t,r]of Object.entries(s)){const f=`https://ui-avatars.com/api/?name=${encodeURIComponent(t)}&background=0F172A&color=fff`,i=r.length;e+=`
        <div class="mb-12">
          <!-- Cabecera del Instructor -->
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full overflow-hidden border-2 border-[#00A3FF]/30 p-0.5 bg-[#111C2A]">
                <img src="${f}" alt="${t}" class="w-full h-full object-cover rounded-full" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">${t}</h3>
                <p class="text-xs text-slate-400 font-medium">${i} vídeo${i!==1?"s":""} disponible${i!==1?"s":""}</p>
              </div>
            </div>
            <button class="btn-unfollow px-4 py-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold transition-all hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400" data-instructor="${t}">
              ✓ Siguiendo
            </button>
          </div>

          ${i>0?`
            <!-- Grid de vídeos del instructor -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              ${r.map(o=>{const a=o.mux_playback_id?`https://image.mux.com/${o.mux_playback_id}/thumbnail.webp?time=1&width=600`:"https://images.unsplash.com/photo-1599058917212-97d14a72d4ae?q=80&w=800&auto=format&fit=crop",y=(o.dificultad||"INTERMEDIO").toUpperCase(),k=y==="PRINCIPIANTE"?"bg-emerald-500 text-white":y==="EXPERTO"?"bg-rose-500 text-white":"bg-[#00A3FF] text-white";return`
                  <a href="/reproductor?id=${o.id}" class="bg-[#111C2A] rounded-2xl overflow-hidden border border-white/5 hover:border-[#00A3FF]/30 transition-all duration-300 group shadow-lg shadow-black/20 hover:shadow-[#00A3FF]/10 cursor-pointer block">
                    <div class="relative w-full aspect-[16/10] overflow-hidden">
                      <img src="${a}" alt="${o.titulo}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none opacity-80 group-hover:opacity-90 transition-opacity"></div>
                      <div class="absolute bottom-3 left-3 flex items-center gap-2 z-20">
                        <span class="text-[10px] font-bold px-2.5 py-1 ${k} rounded uppercase tracking-wider shadow-md">${y}</span>
                      </div>
                      <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-20">
                        <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 scale-90 group-hover:scale-100 transition-transform">
                          <svg class="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                      </div>
                    </div>
                    <div class="p-5">
                      <h3 class="text-base font-bold text-slate-100 mb-2 leading-snug group-hover:text-[#00A3FF] transition-colors line-clamp-2">${o.titulo}</h3>
                      <span class="text-xs text-slate-500">${new Date(o.creado_en).toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"})}</span>
                    </div>
                  </a>
                `}).join("")}
            </div>
          `:`
            <div class="bg-[#111C2A] border border-white/5 rounded-2xl p-8 text-center">
              <p class="text-slate-400 text-sm">Este instructor aún no tiene vídeos publicados.</p>
            </div>
          `}
        </div>
      `}m.innerHTML=e,g?.classList.add("hidden"),m.classList.remove("hidden"),m.querySelectorAll(".btn-unfollow").forEach(t=>{t.addEventListener("click",async()=>{const r=t.getAttribute("data-instructor");if(!r||!confirm(`¿Dejar de seguir a ${r}?`))return;const{data:{session:i}}=await d.auth.getSession();if(!i?.user)return;const{error:o}=await d.from("seguimientos").delete().eq("usuario_id",i.user.id).eq("instructor_nombre",r);o?console.error("Error al dejar de seguir:",o):(w=!1,B())}),t.addEventListener("mouseenter",()=>{t.textContent="✕ Dejar de seguir"}),t.addEventListener("mouseleave",()=>{t.textContent="✓ Siguiendo"})})}window.location.hash==="#siguiendo"&&u("siguiendo");async function S(){const{data:{session:s}}=await d.auth.getSession();if(s?.user)try{const{data:e,error:n}=await d.from("seguimientos").select("id").eq("usuario_id",s.user.id);if(!n&&c&&e){const t=e.length;t>0&&(c.textContent=t.toString(),c.classList.remove("hidden"))}}catch{}}S();
