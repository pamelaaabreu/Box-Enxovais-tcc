// UI-only regression suite: every backend request is fulfilled in memory.
// Run after production build. PLAYWRIGHT_MODULE points to an installed Playwright runtime.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const dist = path.join(root, 'frontend/dist/frontend/browser');
const evidence = path.resolve(process.env.EVIDENCE_DIR || path.join(root, '.artifacts/cep-layout/screenshots'));
const base = 'http://127.0.0.1:4287';
const routePath = '/admin/catalog/shipping-ranges';
const original = [
 {id:1,name:'Umuarama / PR',startCep:'87500001',endCep:'87519999',priceCents:1290,minDays:1,maxDays:2,active:true},
 {id:2,name:'Maringá / PR',startCep:'87000001',endCep:'87109999',priceCents:2990,minDays:4,maxDays:6,active:true},
 {id:3,name:'Cianorte / PR',startCep:'87200001',endCep:'87214999',priceCents:2490,minDays:3,maxDays:5,active:false},
];
let items=structuredClone(original), overlap=false, toggleFailure=false, listFailure=false, countVariants=3;
const calls=[], errors=[];
const product=()=>({id:12,name:'Jogo de Cama Essência Floral Verde Oliva 100% Algodão',sku:'BX-CAM-001',description:'Produto de teste isolado.',price:239.9,quantity:8,status:'active',product_type_id:1,brand_id:1,measurements:{Material:'Algodão',Cor:'Verde oliva'},care_instructions:'Lavar com cuidado.',image_paths:[],variants:[{id:21,size:'Casal',dimensions:'190 × 240 cm',price:239.9,stock:3},{id:22,size:'Queen',dimensions:'220 × 240 cm',price:259.9,stock:5},{id:23,size:'King',dimensions:'240 × 260 cm',price:279.9,stock:0}].slice(0,countVariants)});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.jpg':'image/jpeg','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{try{const relative=decodeURIComponent(new URL(req.url,base).pathname);let file=path.resolve(dist,'.'+relative);if(!file.startsWith(dist+path.sep)&&file!==dist)throw Error('path');try{if(!(await fs.stat(file)).isFile())file=path.join(dist,'index.html');}catch{file=path.join(dist,'index.html');}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end();}});
let browser;
async function screenshot(page,name){await page.screenshot({path:path.join(evidence,name+'.png'),fullPage:true,animations:'disabled'});}
async function noOverflow(page){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow');}
async function closeDrawer(page){await page.getByRole('button',{name:'Fechar faixa de CEP'}).click();await page.getByRole('dialog',{name:/faixa de CEP/}).waitFor({state:'detached'});}
(async()=>{
 await fs.mkdir(evidence,{recursive:true}); await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4287,'127.0.0.1',resolve);});
 browser=await chromium.launch({channel:'chrome',headless:!process.argv.includes('--manual'),chromiumSandbox:true});
 const context=await browser.newContext();
 const payload=Buffer.from(JSON.stringify({sub:'isolated-ui',role:'admin',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
 await context.addInitScript(token=>{sessionStorage.setItem('authToken',token);sessionStorage.setItem('userName','Administrador de teste');sessionStorage.setItem('userEmail','admin@example.test');},'e30.'+payload+'.isolated');
 await context.route('http://localhost:8080/**',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method(),pathname=url.pathname;
  const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(pathname.includes('/admin/catalog/shipping-ranges')){
   if(method==='GET')return json(listFailure?{message:'Falha temporária'}:items,listFailure?503:200);
   const body=req.postDataJSON(); calls.push({method,body});
   if(method==='POST'||method==='PATCH'){
    if(overlap){overlap=false;return json({message:'A faixa de CEP se sobrepõe a outra cadastrada.'},409);}
    if(toggleFailure){toggleFailure=false;return json({message:'Falha temporária. Tente novamente.'},503);}
    if(method==='POST')items.push({id:10,...body});else items=items.map(item=>item.id===Number(pathname.split('/').pop())?{...item,...body}:item);
    return json({});
   }
   if(method==='DELETE'){items=items.filter(item=>item.id!==Number(pathname.split('/').pop()));return json({});}
  }
  if(pathname==='/products/categories'||pathname==='/admin/products/brands')return json([{id:1,name:pathname.includes('categories')?'Cama / Jogos de cama':'Box Enxovais'}]);
  if(pathname.endsWith('/images'))return json([]);
  if(pathname==='/admin/products/12'&&method==='PATCH'){calls.push({method,body:req.postDataJSON()});return json(product());}
  if(pathname==='/admin/products/12'||pathname==='/products/12')return json(product());
  return json([]);
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 for(const width of [320,390,768,1024,1440,1920]){
  await page.setViewportSize({width,height:1000});await page.goto(base+routePath);await page.getByRole('rowheader',{name:'Umuarama / PR'}).waitFor();await noOverflow(page);await screenshot(page,'listagem-'+width);
  await page.getByRole('button',{name:'Nova faixa de CEP',exact:true}).click();
  const drawer=page.getByRole('dialog',{name:'Nova faixa de CEP',exact:true});await drawer.waitFor();await page.waitForFunction(()=>document.activeElement?.id==='shipping-name');
  assert.ok(await drawer.evaluate(el=>el.contains(document.activeElement)));
  const rect=await drawer.boundingBox();assert.ok(rect.x>=-1&&rect.x+rect.width<=width+1);
  await screenshot(page,'drawer-'+width);await noOverflow(page);
  await page.keyboard.press('Tab');assert.ok(await drawer.evaluate(el=>el.contains(document.activeElement)));
  await page.keyboard.press('Escape');await drawer.waitFor({state:'detached'});
  await page.getByRole('button',{name:'Editar',exact:true}).first().click();
  await page.getByRole('dialog',{name:'Editar faixa de CEP'}).waitFor();assert.equal(await page.locator('#shipping-name').inputValue(),'Umuarama / PR');
  assert.equal(await page.locator('.money-input').inputValue(),'12,90');await closeDrawer(page);
  console.log('PASS listagem, drawer, edição, foco e Escape '+width);
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('searchbox',{name:'Buscar por nome ou CEP'}).fill('87500-001');assert.equal(await page.locator('tbody tr').count(),1);
 await page.getByRole('searchbox').fill('');await page.getByRole('combobox',{name:'Status',exact:true}).click();await page.getByRole('option',{name:'Inativas',exact:true}).click();assert.equal(await page.locator('tbody tr').count(),1);
 await page.getByRole('combobox',{name:'Status',exact:true}).click();await page.getByRole('option',{name:'Todos os status',exact:true}).click();
 const toggle=page.getByRole('switch',{name:'Faixa ativa: Umuarama / PR'});toggleFailure=true;await toggle.click();await page.getByRole('alert').filter({hasText:'Falha temporária'}).waitFor();assert.equal(await toggle.getAttribute('aria-checked'),'true');
 await toggle.click();await page.waitForFunction(()=>document.querySelector('button[aria-label="Faixa ativa: Umuarama / PR"]')?.getAttribute('aria-checked')==='false');
 await page.getByRole('button',{name:'Mais ações: Cianorte / PR'}).click();await page.getByRole('menuitem',{name:'Excluir faixa'}).waitFor();await screenshot(page,'menu-1440');await page.getByRole('menuitem',{name:'Excluir faixa'}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(items.length,3);
 console.log('PASS filtros, menu, status e falha sem alteração visual indevida');
 await page.getByRole('button',{name:'Nova faixa de CEP',exact:true}).click();
 await page.getByRole('button',{name:'Salvar faixa',exact:true}).click();await page.getByText('Preencha este campo.',{exact:true}).first().waitFor();assert.equal(calls.filter(x=>x.method==='POST').length,0);
 await page.getByRole('textbox',{name:'Nome da região',exact:true}).fill('Região isolada');await page.locator('[formcontrolname=startCep]').fill('87700001');await page.locator('[formcontrolname=endCep]').fill('87000000');await page.getByRole('button',{name:'Salvar faixa',exact:true}).click();await page.getByText('O CEP final deve ser maior ou igual ao inicial.').waitFor();
 await page.locator('[formcontrolname=endCep]').fill('87709999');await page.locator('.money-input').fill('1690');assert.equal(await page.locator('.money-input').inputValue(),'16,90');await page.locator('[formcontrolname=minDays]').fill('2');await page.locator('[formcontrolname=maxDays]').fill('3');
 overlap=true;await page.getByRole('button',{name:'Salvar faixa',exact:true}).click();await page.getByText('A faixa de CEP se sobrepõe a outra cadastrada.').waitFor();await screenshot(page,'conflito-1440');
 await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Continuar editando'}).click();assert.equal(await page.locator('#shipping-name').inputValue(),'Região isolada');
 await page.getByRole('button',{name:'Salvar faixa',exact:true}).click();await page.getByRole('dialog',{name:'Nova faixa de CEP',exact:true}).waitFor({state:'detached'});assert.equal(items.find(x=>x.id===10).priceCents,1690);
 const newRow=page.getByRole('row').filter({has:page.getByRole('rowheader',{name:'Região isolada'})});await newRow.getByRole('button',{name:'Editar',exact:true}).click();await page.locator('#shipping-name').fill('Região editada');await page.getByRole('button',{name:'Salvar faixa',exact:true}).click();await page.getByRole('dialog',{name:'Editar faixa de CEP'}).waitFor({state:'detached'});assert.ok(items.some(x=>x.name==='Região editada'));
 await page.getByRole('button',{name:'Mais ações: Região editada'}).click();await page.getByRole('menuitem',{name:'Excluir faixa'}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Excluir',exact:true}).click();await page.waitForFunction(()=>!document.body.textContent.includes('Região editada'));assert.equal(items.length,3);
 await page.getByRole('button',{name:'Nova faixa de CEP',exact:true}).click();await page.locator('#shipping-name').fill('Descartar');await page.keyboard.press('Escape');await page.getByRole('alertdialog').getByRole('button',{name:'Descartar',exact:true}).click();await page.getByRole('dialog',{name:'Nova faixa de CEP'}).waitFor({state:'detached'});
 await page.getByRole('searchbox').fill('sem resultado');await page.getByRole('heading',{name:'Nenhuma faixa encontrada para os filtros.'}).waitFor();await screenshot(page,'vazio-1440');await page.getByRole('searchbox').fill('');
 listFailure=true;await page.reload();await page.getByRole('button',{name:'Tentar novamente',exact:true}).waitFor();await screenshot(page,'erro-1440');listFailure=false;await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await page.getByRole('rowheader',{name:'Umuarama / PR'}).waitFor();
 console.log('PASS validação, conflito, CRUD isolado, descarte, vazio e recuperação de erro');
 for(const width of [320,390,768,1024,1440,1920]){
  await page.setViewportSize({width,height:1000});countVariants=3;await page.goto(base+'/admin/products/12/edit');await page.getByRole('tab',{name:'Variações',exact:true}).click();await page.locator('.variant-card').first().waitFor();await noOverflow(page);await screenshot(page,'variacoes-'+width);
  const variant=page.locator('app-product-variants');await variant.getByRole('button',{name:'Adicionar variação',exact:true}).click();await variant.locator('[formcontrolname=size]').last().fill('Nome longo para conferir alinhamento');await variant.locator('[formcontrolname=dimensions]').last().focus();await page.keyboard.press('Tab');await variant.locator('.error').first().waitFor();await noOverflow(page);await screenshot(page,'variacoes-erro-'+width);
  const controls=await variant.locator('input').evaluateAll(inputs=>inputs.map(i=>({width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height})));assert.ok(controls.every(c=>c.width>70&&c.height>=42));
  console.log('PASS variações, validação, dimensões e overflow '+width);
 }
 for(const count of [0,1]){countVariants=count;await page.goto(base+'/admin/products/12/edit');await page.getByRole('tab',{name:'Variações',exact:true}).click();if(count===0){await page.getByRole('button',{name:'Adicionar primeira variação',exact:false}).click();assert.equal(await page.locator('.variant-card').count(),1);assert.equal(await page.locator('.variant-card .error').count(),0);}else{await page.locator('.variant-card').waitFor();await page.locator('[formcontrolname=stock]').fill('0');await page.locator('[formcontrolname=price]').fill('24990');assert.equal(await page.locator('[formcontrolname=price]').inputValue(),'249,90');await page.locator('.remove').click();await page.getByRole('heading',{name:'Nenhuma variação cadastrada'}).waitFor();}}
 assert.deepEqual(errors,[]);console.log('PASS zero/uma variação, máscara, estoque zero, remoção; nenhum erro JavaScript');
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{await browser?.close();await new Promise(resolve=>server.close(resolve));});
