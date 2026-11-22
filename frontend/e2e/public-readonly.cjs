const run=require('./artifacts.cjs').createArtifacts("public",process.env.BOX_E2E_EVIDENCE_DIR||'docs/validacao-visual/auditoria-2026-11-20',["catalogo-real-cama-1440.png", "catalogo-real-cama-390.png", "produto-real-1440.png", "produto-real-390.png", "foco-teclado-1440.png", "foco-teclado-390.png", "public-resultados.json"]);
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({headless:true,chromiumSandbox:true});
 const context=await browser.newContext();
 await context.route('http://localhost:8080/**',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():r.abort('blockedbyclient'));
 const page=await context.newPage();page.setDefaultTimeout(15000);
 const results=[];const evidence=run.directory;
 async function loadVisibleImages(){const height=await page.evaluate(()=>document.documentElement.scrollHeight);for(let y=0;y<height;y+=800){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForFunction(()=>[...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0}).every(i=>i.complete));}await page.evaluate(()=>scrollTo(0,0));}
 for(const width of [1440,1024,768,390]){
  await page.setViewportSize({width,height:1000});
  for(const slug of ['cama','travesseiros','toalhas','almofadas','mesa','decoracao']){
   try{
    await page.goto('http://localhost:4200/categoria/'+slug);await page.locator('app-product-card').first().waitFor();
    await page.locator('app-product-card img').first().waitFor();
    await page.waitForFunction(()=>{const img=document.querySelector('app-product-card img');return img&&img.complete&&img.naturalWidth>0});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await loadVisibleImages();await page.screenshot({path:evidence+'/catalogo-real-'+slug+'-'+width+'.png',fullPage:true,animations:'disabled'});
    results.push({slug,width,passed:true});console.log('PASS catálogo real somente leitura',slug,width);
   }catch(e){results.push({slug,width,passed:false,error:e.message.slice(0,600)});console.log('FAIL catálogo real',slug,width,e.message.slice(0,300));}
  }
  try{
   await page.goto('http://localhost:4200/produto/1');await page.getByRole('button',{name:'Ampliar imagem do produto',exact:true}).waitFor();
   await page.waitForFunction(()=>{const img=document.querySelector('app-product-gallery .main-image img');return img&&img.complete&&img.naturalWidth>0});
   await page.screenshot({path:evidence+'/produto-real-'+width+'.png',fullPage:true,animations:'disabled'});
   await page.getByRole('button',{name:'Ampliar imagem do produto',exact:true}).click();await page.getByRole('dialog',{name:'Imagem ampliada do produto',exact:true}).waitFor();await page.keyboard.press('Escape');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));results.push({slug:'produto-1-galeria',width,passed:true});console.log('PASS galeria real somente leitura',width);
   await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>{const e=document.activeElement,r=e.getBoundingClientRect(),s=getComputedStyle(e);return e.matches(':focus-visible')&&r.top>=0&&r.bottom<=innerHeight&&(s.outlineStyle!=='none'||s.boxShadow!=='none')}));await page.screenshot({path:evidence+'/foco-teclado-'+width+'.png',animations:'disabled'});results.push({slug:'foco-teclado',width,passed:true});console.log('PASS foco real por teclado',width);
  }catch(e){results.push({slug:'produto-1-galeria',width,passed:false,error:e.message.slice(0,600)});console.log('FAIL galeria real',width,e.message.slice(0,300));}
 }
 await fs.writeFile(run.file('public-resultados.json'),JSON.stringify(results,null,2));await browser.close();if(results.some(r=>!r.passed))process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1});
