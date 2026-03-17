import{s as p}from"./supabase.CNFOKxbF.js";async function g(){const{data:{session:n}}=await p.auth.getSession();if(n?.user)try{const{data:i,error:c}=await p.from("historial_videos").select("tiempo_actual, video_id, videos(id, titulo, instructor, duracion, mux_playback_id)").eq("usuario_id",n.user.id).eq("completado",!1).order("actualizado_en",{ascending:!1});if(c){console.error("Error fetching historial (posible RLS):",c);return}if(!i||i.length===0)return;const s=i.filter(r=>r.videos!=null);if(s.length===0)return;const l=document.getElementById("hero-tracker-section"),d=document.getElementById("grid-continuar-section"),u=document.getElementById("grid-continuar-container"),m=(r,o)=>o?`${Math.max(1,Math.floor((o-r)/60))} min restantes`:"VOD",a=s[0],e=a.videos,h=e.duracion?Math.min(100,a.tiempo_actual/e.duracion*100):10,f=e.mux_playback_id?`https://image.mux.com/${e.mux_playback_id}/thumbnail.webp?time=${Math.max(1,a.tiempo_actual)}`:"https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=600&auto=format&fit=crop";if(l&&(l.innerHTML=`
          <div class="relative w-full rounded-3xl overflow-hidden bg-[#111C2A] border border-white/5 group shadow-2xl flex flex-col md:flex-row">
             <div class="w-full md:w-[60%] lg:w-[65%] relative aspect-video md:aspect-[16/9] overflow-hidden">
               <!-- Thumbnail -->
               <img src="${f}" alt="${e.titulo}" class="w-full h-full object-cover opacity-80 mix-blend-lighten group-hover:scale-105 transition-transform duration-700" />
               <!-- Play flotante -->
               <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <div class="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 scale-95 group-hover:scale-110 group-hover:bg-[#00A3FF] group-hover:border-[#00A3FF] transition-all duration-300 shadow-xl">
                      <svg class="w-8 h-8 fill-current ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                   </div>
               </div>
               <!-- Barra de progreso -->
               <div class="absolute bottom-0 left-0 w-full h-1.5 bg-black/60 backdrop-blur-sm z-10">
                 <div class="h-full bg-[#00A3FF] shadow-[0_0_10px_#00A3FF]" style="width: ${h}%"></div>
               </div>
             </div>
             
             <div class="p-6 md:p-8 flex flex-col justify-center w-full md:w-[40%] lg:w-[35%]">
               <span class="text-xs font-bold text-[#00A3FF] tracking-widest uppercase mb-3 flex items-center gap-2">
                 <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                 Siguiente Reto
               </span>
               <h2 class="text-2xl md:text-3xl font-black text-white leading-tight mb-2 line-clamp-3">${e.titulo}</h2>
               <p class="text-slate-400 font-medium mb-8 text-sm">${e.instructor||"Freedom Academy"} • ${m(a.tiempo_actual,e.duracion)}</p>
               
               <a href="/reproductor?id=${e.id}" class="btn-primary w-full text-center flex items-center justify-center gap-2 text-[15px] py-3.5 shadow-[0_0_20px_rgba(0,163,255,0.2)]">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  Continuar Clase
               </a>
             </div>
          </div>
         `,l.classList.remove("hidden")),s.length>1&&d&&u){const r=s.slice(1,4).map(o=>{const t=o.videos,v=t.duracion?Math.min(100,o.tiempo_actual/t.duracion*100):10,b=t.mux_playback_id?`https://image.mux.com/${t.mux_playback_id}/thumbnail.webp?time=${Math.max(1,o.tiempo_actual)}`:"https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=600&auto=format&fit=crop";return`
               <a href="/reproductor?id=${t.id}" class="bg-[#111C2A] rounded-2xl overflow-hidden border border-white/5 hover:border-[#00A3FF]/30 transition-all duration-300 group cursor-pointer block">
                 <div class="relative w-full aspect-video overflow-hidden">
                   <img src="${b}" alt="${t.titulo}" class="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" />
                   
                   <div class="absolute bottom-0 left-0 w-full h-1 bg-black/60 z-10">
                     <div class="h-full bg-[#00A3FF]" style="width: ${v}%"></div>
                   </div>

                   <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div class="w-12 h-12 rounded-full bg-black/50 backdrop-blur text-white flex items-center justify-center border border-white/20">
                        <svg class="w-5 h-5 fill-current ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                   </div>
                 </div>

                 <div class="p-4 md:p-5">
                   <h4 class="text-base font-bold text-slate-100 mb-1 leading-snug group-hover:text-[#00A3FF] transition-colors line-clamp-2">
                     ${t.titulo}
                   </h4>
                   <div class="flex justify-between items-center mt-3">
                     <p class="text-xs font-medium text-slate-400">${t.instructor||"Instructor"}</p>
                     <p class="text-[11px] font-bold text-slate-500">${m(o.tiempo_actual,t.duracion)}</p>
                   </div>
                 </div>
               </a>
             `}).join("");u.innerHTML=r,d.classList.remove("hidden")}}catch(i){console.error("Error trayendo 'Seguir Viendo'",i)}}g();
