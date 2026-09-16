const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
(async()=>{
 const paths=['kilnwatch.html','kiln-watch-graph.html','js/gene-temperature.js','images/1atomic.jpg','images/2Atomic.jpg','images/safety_gene.jpg','images/ultimate_gene.jpg'];
 for(const path of paths){
  const response=await fetch('https://claycraze.com/'+path+'?verify=5399fe1-'+Date.now(),{signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,200,path);
  const bytes=Buffer.from(await response.arrayBuffer()), local=fs.readFileSync('.local-gene-deploy/payload/public/'+path);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),crypto.createHash('sha256').update(local).digest('hex'),path);
  console.log('HTTP 200 / SHA-256 MATCH '+path);
 }
 for(const path of ['images/gene-kilnwatch-emoji.png','images/gene-chilli-pepper-hot.png']){
  const response=await fetch('https://claycraze.com/'+path+'?verify=5399fe1');assert.equal(response.status,200,path);console.log('HTTP 200 '+path);
 }
})().catch(e=>{console.error(e);process.exitCode=1});
