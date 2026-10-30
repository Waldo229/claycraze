/* Howard asks; GENE answers. Historical dialogue is never presented as fresh sensor data. */
(() => {
 'use strict';
 const host=document.querySelector('.obs-grid');
 if(!host)return;
 const panel=document.createElement('section');panel.className='panel full';
 const heading=document.createElement('h2');heading.className='panel-title';heading.textContent='Calling the firing — Howard & GENE';
 const status=document.createElement('p');status.setAttribute('role','status');
 const current=document.createElement('p');
 const picture=document.createElement('img');picture.hidden=true;picture.style.cssText='display:none;width:min(260px,100%);height:auto;border-radius:12px;margin:12px 0';
 const caption=document.createElement('p');caption.className='memory-time';
 const list=document.createElement('div');list.className='memory-list';
 const archive=document.createElement('a');archive.className='obs-button';archive.textContent='Complete mission journal';archive.hidden=true;archive.style.display='none';
 panel.append(heading,status,current,picture,caption,list,archive);const field=document.getElementById('currentField');if(field)field.after(panel);else host.prepend(panel);
 let received=null,failed=false;
 function age(){return received? (Date.now()-Date.parse(received.generated_at_utc))/1000:Infinity;}
 function freshness(){
   const a=age();
   status.textContent=!received?'Awaiting the first mission broadcast.':failed||!Number.isFinite(a)||a< -5||a>90
    ?'Last received mission record — current broadcast unavailable. Dialogue below is history.'
    :'Mission: '+String(received.mission_name||'Unnamed mission')+' · '+String(received.mission_status||'Unknown')+' · Updated '+new Date(received.generated_at_utc).toLocaleTimeString();
   const evidence=received?.current_probe_evidence;
   // Match canonical evidence expiry. Keep historical portrait labelled as an event image.
   const source=evidence?.source_time;
   const at=window.GeneTemperature?.evidenceTime(source);
   const evidenceAge=Number.isFinite(at)?(Date.now()-at)/1000:Infinity;
   current.textContent=age()<=90&&!failed&&evidence?.available&&evidenceAge>=0&&evidenceAge<=120
      ?'Current probe evidence: '+evidence.probe+' · '+evidence.temperature_f+' °F.'
      :'Current probe evidence is unavailable or out of date.';
 }
 function render(data){
   if(data?.record_type!=='gene_firing_broadcast'||!data.mission_id||!Array.isArray(data.events))throw Error('Invalid broadcast.');
   received=data;failed=false;freshness();list.replaceChildren();picture.hidden=true;picture.style.display='none';caption.textContent='';
   const events=data.events.filter(e=>e.mission_id===data.mission_id).slice(-12).reverse();
   for(const event of events){
     const item=document.createElement('article');item.className='memory-item';
     const when=document.createElement('div');when.className='memory-time';
     when.textContent=new Date(event.observed_at_utc).toLocaleString()+' · '+String(event.kind||'Registered event');
     const howard=document.createElement('p');howard.className='memory-text';howard.textContent=String(event.howard||'');
     const gene=document.createElement('p');gene.className='memory-text';gene.textContent=String(event.gene||'');
     const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Recorded evidence';
     const evidence=document.createElement('pre');evidence.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';evidence.textContent=JSON.stringify(event.evidence,null,2);
     details.append(summary,evidence);item.append(when,howard,gene,details);list.append(item);
   }
   const portrait=events.find(e=>typeof e.image==='string'&&/^\/images\/[A-Za-z0-9_.-]+(?:\?v=[A-Za-z0-9]+)?$/.test(e.image));
   if(portrait){picture.src=portrait.image;picture.alt='GENE at the recorded '+portrait.kind+' event';picture.hidden=false;picture.style.display='block';caption.textContent='Event image · '+new Date(portrait.observed_at_utc).toLocaleString()+' · Historical witness, not a current temperature claim.';}
   if(typeof data.archive_url==='string'&&/^\/gene\/firing-missions\/[a-f0-9]{64}\.json$/.test(data.archive_url)){
     archive.href=data.archive_url;archive.hidden=false;archive.style.display='inline-flex';
   }else{archive.hidden=true;archive.style.display='none';archive.removeAttribute('href');}
 }
 let busy=false;
 async function refresh(){if(busy)return;busy=true;
   try{const r=await fetch('/gene/firing_broadcast_latest.json?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Unavailable');render(await r.json());}
   catch(_){failed=true;freshness();}finally{busy=false;}
 }
 refresh();setInterval(refresh,10000);setInterval(freshness,1000);
})();

