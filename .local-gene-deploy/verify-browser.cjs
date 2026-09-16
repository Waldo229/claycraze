const fs = require('node:fs');
const assert = require('node:assert/strict');
const OUT = '.local-gene-deploy/verification';
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
const now = Date.now();
let scenario = {temp: 199, age: 0, mode: 'current'};
let noteText = 'Ramp 0 ?F/hr.';
function payload() {
  const data = JSON.parse(fs.readFileSync('tests/gene-feed-fixture.json','utf8'));
  data.source_status = scenario.mode === 'unavailable' ? 'unavailable' : 'current';
  data.evidence_generated_at = new Date(now - scenario.age).toISOString();
  data.gene_visual.state = scenario.mode === 'unavailable' ? 'unavailable' : 'watching';
  data.summaries = scenario.mode === 'missing' ? [] : [{name:'GREEN_0', latest_temp:scenario.mode === 'invalid' ? 'invalid' : scenario.temp, latest_rate:0}];
  data.gene_visual.hottest_temp_f = scenario.temp;
  return data;
}
async function screen(name) {
  const capture = await send('Page.captureScreenshot', {format:'png',captureBeyondViewport:false});
  fs.writeFileSync(`${OUT}/${name}.png`,Buffer.from(capture.data,'base64'));
}
async function snapshot(page) {
  return evaluate(`(() => {
    const img=document.getElementById(${JSON.stringify(page==='kilnwatch.html'?'geneMascot':'pocketGene')});
    const rect=img.getBoundingClientRect(), css=getComputedStyle(img);
    const frame=${page==='kilnwatch.html'?'img.parentElement':'img'};
    const box=frame.getBoundingClientRect();
    return {state:document.getElementById('geneTemperatureState').textContent,temperature:document.getElementById('temperature')?.textContent, ramp:document.getElementById('rampNote')?.textContent,note:document.getElementById('firingNote')?.textContent,src:img.getAttribute('src'),hidden:img.hidden,fit:css.objectFit,position:css.objectPosition,background:getComputedStyle(frame).backgroundColor,natural:[img.naturalWidth,img.naturalHeight],imageBox:[rect.width,rect.height],frame:[box.width,box.height],charset:document.characterSet};
  })()`);
}
async function refresh() {
  await evaluate('Promise.all(window.__geneCheck.intervals.filter(x=>x.ms===10000).map(x=>x.fn()))');
}
(async()=>{
  const pages=await(await fetch('http://127.0.0.1:9226/json')).json();
  ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
  ws.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.id){const p=pending.get(message.id);if(p){pending.delete(message.id);message.error?p.reject(Error(JSON.stringify(message.error))):p.resolve(message.result);}}
    else for(const fn of listeners.get(message.method)||[]) fn(message.params);
  });
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  // First inspect the real deployed pages with their unmodified public feeds.
  for(const page of ['kilnwatch.html','kiln-watch-graph.html']){
    await send('Page.navigate',{url:`https://claycraze.com/${page}?verify=5399fe1`});
    await until("document.readyState==='complete' && typeof GeneTemperature!=='undefined'");
    await sleep(1800);
    const live=await snapshot(page);assert.equal(live.charset,'UTF-8');
    results.push({page,kind:'real public feed',...live});console.log('LIVE',page,JSON.stringify(live));
    await screen(page.replace('.html','')+'-live');
  }
  // Harness wraps the clock and registers the page's actual timer callbacks.
  // Feed substitutions exist only in this isolated browser, never on SiteGround.
  const hook=`window.__geneCheck={now:${now},intervals:[]};Date.now=()=>window.__geneCheck.now;const originalSetInterval=window.setInterval;window.setInterval=(fn,ms,...args)=>{window.__geneCheck.intervals.push({fn,ms});return originalSetInterval(fn,ms,...args);};`;
  await send('Page.addScriptToEvaluateOnNewDocument',{source:hook});
  listeners.set('Fetch.requestPaused',[async event=>{
    try {
      const url=event.request.url;
      if(url.includes('kiln_watch_latest.json')&&scenario.mode==='failed'){
        await send('Fetch.failRequest',{requestId:event.requestId,errorReason:'ConnectionFailed'});return;
      }
      const isNote=url.includes('kiln_watch_latest.txt');
      const body=isNote?noteText:JSON.stringify(url.includes('gene_state_latest')?{generated_unix:now/1000,arousal:0.1,bpm:30}:payload());
      await send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:isNote?'text/plain; charset=utf-8':'application/json'},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(body).toString('base64')});
    }catch(e){console.error('INTERCEPT',e.message);}
  }]);
  await send('Fetch.enable',{patterns:[{urlPattern:'*://claycraze.com/gene/*latest.json*'},{urlPattern:'*://claycraze.com/gene/kiln_watch_latest.txt*'}]});
  const ladder=[[199,'Normal'],[200,'Chili'],[799,'Chili'],[800,'Safety GENE'],[1000,'Safety GENE'],[1001,'atomic_gene1'],[1800,'atomic_gene1'],[1801,'atomic_Gene2'],[1999,'atomic_Gene2'],[2000,'ultimate_gene']];
  for(const page of ['kilnwatch.html','kiln-watch-graph.html']){
    scenario={temp:199,age:0,mode:'current'};
    await send('Page.navigate',{url:`https://claycraze.com/${page}?browser-only-test=5399fe1`});
    await until("document.readyState==='complete' && !!window.__geneCheck && typeof GeneTemperature!=='undefined' && document.getElementById('geneTemperatureState').textContent==='Normal'");
    for(const width of [1440,390]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:width===390});
      for(const [temp,state] of ladder){
        scenario={temp,age:0,mode:'current'};await refresh();
        await until(`(()=>{const i=document.getElementById('${page==='kilnwatch.html'?'geneMascot':'pocketGene'}');return i.complete&&i.naturalWidth>0;})()`);
        const actual=await snapshot(page);
        assert.equal(actual.state,state);assert.equal(actual.hidden,false);assert.equal(actual.fit,'contain');assert.equal(actual.position,'50% 50%');assert.equal(actual.background,'rgb(9, 13, 16)');
        assert.ok(actual.natural[0]>0&&actual.natural[1]>0);
        if(page==='kilnwatch.html'){
          assert.equal(actual.temperature,String(temp));assert.equal(actual.ramp,'Ramp 0 \u00B0F/hr.');
          assert.ok(Math.abs(actual.frame[0]-actual.frame[1])<1,'console frame must stay square');
          assert.ok(actual.frame[0]<=360.1);
        }else{assert.equal(actual.note,'Ramp 0 \u00B0F/hr.');assert.ok(actual.frame[0]<=150.1);}
        const scale=Math.min(actual.imageBox[0]/actual.natural[0],actual.imageBox[1]/actual.natural[1]);
        assert.ok(actual.natural[0]*scale<=actual.frame[0]+1&&actual.natural[1]*scale<=actual.frame[1]+1);
        results.push({page,width,temp,expected:state,...actual,pass:true});
        if([199,200,800,1001,1801,2000].includes(temp)&&width===1440)await screen(`${page.replace('.html','')}-${temp}`);
      }
      console.log('PASS',page,width,'all 10 boundaries / six states / fitting / ramp units');
    }
    // Explicitly exercise the real freshness timer at both sides of the cutoff.
    scenario={temp:2000,age:0,mode:'current'};await refresh();
    for(const offset of [119999,120000,120001]){
      await evaluate(`window.__geneCheck.now=${now+offset};window.__geneCheck.intervals.filter(x=>x.ms===1000).forEach(x=>x.fn());`);
      const actual=await snapshot(page);
      assert.equal(actual.state,offset>120000?'Temperature unavailable':'ultimate_gene');
      if(offset>120000){assert.equal(actual.src,null);assert.equal(actual.hidden,true);}
      results.push({page,kind:'timer expiry',ageMs:offset,...actual,pass:true});
    }
    await evaluate(`window.__geneCheck.now=${now}`);
    for(const mode of ['missing','invalid','unavailable','failed']){
      scenario={temp:2000,age:0,mode:'current'};await refresh();
      scenario.mode=mode;await refresh();
      const actual=await snapshot(page);assert.equal(actual.state,'Temperature unavailable');assert.equal(actual.src,null);assert.equal(actual.hidden,true);
      results.push({page,kind:mode,...actual,pass:true});
    }
    console.log('PASS',page,'119999/120000/120001 ms expiry; hot -> missing/invalid/unavailable/network failure clears image');
  }
  fs.writeFileSync(`${OUT}/browser-results.json`,JSON.stringify(results,null,2));
  console.log('PASS: deployed browser verification complete; public feed never modified.');
  await send('Browser.close');
})().catch(async e=>{fs.writeFileSync(`${OUT}/browser-results.json`,JSON.stringify(results,null,2));console.error(e);if(ws)ws.close();process.exitCode=1;});
