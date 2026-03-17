import{s as u}from"./supabase.CNFOKxbF.js";async function m(){const a=document.getElementById("seguir-viendo-section"),i=document.getElementById("seguir-viendo-grid");if(!(!a||!i))try{const{data:{session:o}}=await u.auth.getSession();if(!o?.user)return;const{data:r,error:n}=await u.from("historial_videos").select(`
          tiempo_actual, completado, actualizado_en,
          videos!inner ( id, titulo, mux_playback_id, duracion, dificultad )
        `).eq("usuario_id",o.user.id).eq("completado",!1).order("actualizado_en",{ascending:!1}).limit(4);if(n)throw n;if(!r||r.length===0){a.classList.remove("hidden"),i.innerHTML=`
          <div class="col-span-1 md:col-span-2 lg:col-span-4 flex flex-col items-center justify-center py-16 text-center bg-[#111C2A] rounded-2xl border border-white/5 shadow-inner">
            <svg class="w-16 h-16 text-[#00A3FF]/40 mb-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
            </svg>
            <h3 class="text-2xl font-bold text-white mb-2">Aún no has empezado a entrenar.</h3>
            <p class="text-slate-400 font-medium mb-8 max-w-md mx-auto">¡Explora nuestro catálogo para encontrar los mejores tutoriales y lleva tu movimiento al siguiente nivel!</p>
            <a href="/catalogo" class="btn-primary inline-flex items-center gap-3 px-8 py-3.5 text-sm font-bold shadow-[0_0_20px_rgba(0,163,255,0.3)] hover:-translate-y-1 transition-transform">
              <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              Explorar Catálogo
            </a>
          </div>
        `;return}a.classList.remove("hidden");let c="";for(const e of r){const t=e.videos,p=t.mux_playback_id?`https://image.mux.com/${t.mux_playback_id}/thumbnail.webp?time=${e.tiempo_actual||1}&width=600`:"https://images.unsplash.com/photo-1599058917212-97d14a72d4ae?q=80&w=600&auto=format&fit=crop";let s=0,l="SEGUIR VIENDO";if(t.duracion&&t.duracion>0){s=Math.min(100,Math.round(e.tiempo_actual/t.duracion*100));const d=Math.round((t.duracion-e.tiempo_actual)/60);d>0&&(l=`${d}M RESTANTES`)}else e.tiempo_actual>0&&(s=50,l=`MIN ${(e.tiempo_actual/60).toFixed(1)} `);c+=`
          <a href="/reproductor?id=${t.id}" class="group block cursor-pointer">
            <div class="relative w-full aspect-[16/9] rounded-xl overflow-hidden mb-3 border border-white/5 transition-all duration-300 shadow-lg shadow-black/40 group-hover:shadow-[#00A3FF]/20 group-hover:border-[#008AE6]/50">
              <img src="${p}" alt="${t.titulo}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none opacity-80 group-hover:opacity-90 transition-opacity"></div>
              <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                <div class="w-12 h-12 rounded-full bg-[#00A3FF]/90 flex items-center justify-center text-white backdrop-blur shadow-xl scale-90 group-hover:scale-100 transition-transform">
                   <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
              <div class="absolute bottom-0 left-0 w-full h-1 bg-slate-800">
                <div class="h-full bg-[#00A3FF]" style="width: ${s}%;"></div>
              </div>
            </div>
            <h3 class="font-bold text-slate-100 group-hover:text-white transition-colors truncate">${t.titulo}</h3>
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-widest truncate">${t.dificultad||"VÍDEO"} • ${l}</p>
          </a>
        `}i.innerHTML=c}catch(o){console.error("Error cargando seguir viendo:",o)}}m();
