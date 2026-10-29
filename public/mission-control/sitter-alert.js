/* GENE sitter display. Sound belongs to Cosmo; silence requires operator clearance. */
(() => {
  'use strict';
  const host = document.querySelector('.mc-top');
  if (!host || document.getElementById('geneSitterPanel')) return;
  const panel = document.createElement('section');
  panel.id = 'geneSitterPanel';
  panel.style.cssText = 'margin-top:18px;padding:16px;border:1px solid #9ac64e;border-radius:12px';
  panel.innerHTML = '<strong>Poor Boy sitter</strong><p id="geneSitterState" role="status">Connecting…</p><button type="button" id="geneSitterSilence" class="mc-button" hidden>Silence Alert</button><p id="geneSitterMessage" role="status"></p><img id="geneSitterFinal" alt="GENE — lever drop observed" hidden style="display:none;max-width:260px;width:100%;margin-top:12px;border-radius:10px">';
  host.appendChild(panel);
  const state=panel.querySelector('#geneSitterState');
  const silence=panel.querySelector('#geneSitterSilence');
  const message=panel.querySelector('#geneSitterMessage');
  const image=panel.querySelector('#geneSitterFinal');
  let eventId=null;
  let busy=false;
  async function request(path,options={}) {
    const clearance=await fetch('/mission-control/clearance.php',{cache:'no-store',credentials:'same-origin'});
    const grant=await clearance.json();
    if (!clearance.ok || !grant.ok || !grant.token) throw Error('Operator clearance unavailable.');
    const response=await fetch('http://127.0.0.1:8765'+path,{...options,cache:'no-store',headers:{...options.headers,Authorization:'Bearer '+grant.token}});
    const result=await response.json();
    if (!response.ok || !result.ok) throw Error(result.error||'Sitter observer unavailable.');
    return result.sitter;
  }
  function render(data) {
    eventId=data.event_id||null;
    state.textContent=String(data.position||'uncertain').toUpperCase()+' — '+(data.reason||'');
    silence.hidden=!data.alert_active;
    if (eventId) {
      message.textContent=data.alert_active ? 'Lever drop observed. '+(data.sound_error||'Alert sounding on Cosmo.') : 'Lever drop observed. Alert silenced.';
      image.src='/images/ultimate_gene.jpg'; image.hidden=false; image.style.display='block';
    } else {
      message.textContent='';image.hidden=true;image.style.display='none';
    }
  }
  async function poll() {
    if (busy) return;
    busy=true;
    try {render(await request('/sitter-status'));}
    catch (_) {state.textContent='UNCERTAIN — Sitter connection unavailable.';}
    finally {busy=false;}
  }
  silence.addEventListener('click',async()=>{
    silence.disabled=true;
    try {render(await request('/sitter-silence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event_id:eventId})}));}
    catch (error) {message.textContent=error.message;}
    finally {silence.disabled=false;}
  });
  poll();window.setInterval(poll,4000);
})();
