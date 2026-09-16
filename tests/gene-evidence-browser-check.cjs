const fs = require('node:fs');
const assert = require('node:assert/strict');
// Run tests/gene-feed-simulator.py and a dedicated Chrome on debugging port 9226 first.
const OUT = process.env.GENE_REVIEW_OUTPUT || '.local-gene-review';
fs.mkdirSync(OUT, {recursive:true});
const results = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, serial = 0;
const pending = new Map();
const listeners = new Map();
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++serial;
    const timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout: ' + method)); }, 20000);
    pending.set(id, { resolve: value => {clearTimeout(timer);resolve(value);}, reject: error => {clearTimeout(timer);reject(error);} });
    ws.send(JSON.stringify({id, method, params}));
  });
}
async function evaluate(expression) {
  const reply = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
  if (reply.exceptionDetails) throw Error(JSON.stringify(reply.exceptionDetails));
  return reply.result.value;
}
async function until(expression) {
  for (let i = 0; i < 100; i++) {
    try { if (await evaluate(expression)) return; } catch {}
    await sleep(100);
  }
  throw Error('Browser condition timed out: ' + expression);
}
async function screen(name) {
  const capture = await send('Page.captureScreenshot', {format:'png',captureBeyondViewport:false});
  fs.writeFileSync(`${OUT}/${name}.png`,Buffer.from(capture.data,'base64'));
}
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9226/json')).json();
 ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else for(const fn of listeners.get(m.method)||[])fn(m.params);});
 await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 for(const page of ['kilnwatch.html','kiln-watch-graph.html']){
  for(const width of [1440,390,320]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:width<500});
   for(const [mode,status] of [['current','LIVE'],['stale','STALE'],['missing','UNAVAILABLE'],['invalid','UNAVAILABLE'],['unavailable','UNAVAILABLE'],['failed','UNAVAILABLE'],['current','LIVE']]){
    await send('Page.navigate',{url:`http://127.0.0.1:8766/${page}?evidence=${mode}`});
    await until(`document.readyState==='complete' && document.getElementById('evidenceBadge')?.textContent===${JSON.stringify(status)}`);
    await sleep(100);
    const actual=await evaluate(`(()=>{
     const b=document.getElementById('evidenceBadge'),r=b.getBoundingClientRect(),s=getComputedStyle(b);
     const time=document.getElementById('${page==='kilnwatch.html'?'geneTime':'graphUpdated'}');
     const selectors=${JSON.stringify(page==='kilnwatch.html'?['.gene-card','.gene-left','.gene-right']:['.graph-panel','.graph-meta','.graph-status'])};
     const boxes=()=>selectors.map(sel=>{const x=document.querySelector(sel).getBoundingClientRect();return {selector:sel,x:x.x,y:x.y,width:x.width,height:x.height};});
     const withBadge=boxes();
     const wrapper=b.parentElement, parent=wrapper.parentElement, next=wrapper.nextSibling;
     const isGraph=${JSON.stringify(page)}==='kiln-watch-graph.html';
     const child=isGraph?wrapper.querySelector('h2'):time, childNext=child.nextSibling;
     const headingBox=isGraph?wrapper.getBoundingClientRect():null;
     const heading=wrapper.querySelector('h2')?.getBoundingClientRect();
     const timestampBox=time.getBoundingClientRect();
     const oldMargin=parent.style.marginBottom;
     if(!isGraph)parent.style.marginBottom='18px';
     parent.insertBefore(child,wrapper);wrapper.remove();
     const baseline=boxes();
     parent.insertBefore(wrapper,next);wrapper.insertBefore(child,childNext);parent.style.marginBottom=oldMargin;
     return {text:b.textContent,aria:b.getAttribute('aria-label'),font:s.fontSize,color:s.color,background:s.backgroundColor,width:r.width,height:r.height,left:r.left,right:r.right,viewport:innerWidth,clip:b.scrollWidth>b.clientWidth,beside:time.parentElement===b.parentElement,headingAligned:!isGraph||(Math.abs(r.right-headingBox.right)<1&&r.left>=heading.right+7),timestampBelow:!isGraph||timestampBox.top>=headingBox.bottom,withBadge,baseline};
    })()`);
    assert.equal(actual.text,status);assert.equal(actual.aria,'Temperature evidence: '+status);assert.equal(actual.clip,false);assert.ok(parseFloat(actual.font)>=13);assert.ok(actual.left>=0&&actual.right<=actual.viewport);
    assert.equal(actual.headingAligned,true);assert.equal(actual.timestampBelow,true);
    for(let i=0;i<actual.baseline.length;i++){
     const a=actual.withBadge[i],b=actual.baseline[i];
     assert.ok(Math.abs(a.width-b.width)<1,`${page} ${width} ${a.selector} width changed`);
     assert.ok(Math.abs(a.height-b.height)<1,`${page} ${width} ${a.selector} height changed: ${a.height} vs ${b.height}`);
     assert.ok(Math.abs(a.y-b.y)<1,`${page} ${width} ${a.selector} moved: ${a.y} vs ${b.y}`);
    }
    results.push({page,width,mode,pass:true,...actual});
    if(['current','stale','failed'].includes(mode)){
     await evaluate("document.getElementById('evidenceBadge').scrollIntoView({block:'center'})");
     await screen(`badge-${page.replace('.html','')}-${width}-${mode}`);
    }
   }
   console.log('PASS',page,width,'LIVE / STALE / UNAVAILABLE / failures / recovery / stable panel geometry');
  }
 }
 fs.writeFileSync(`${OUT}/badge-browser-results.json`,JSON.stringify(results,null,2));
 await send('Browser.close');
})().catch(e=>{fs.writeFileSync(`${OUT}/badge-browser-results.json`,JSON.stringify(results,null,2));console.error(e);if(ws)ws.close();process.exitCode=1;});
