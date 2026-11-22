const run=require('./artifacts.cjs').createArtifacts("order-states","docs/validacao-visual/pedidos-admin-2026-11-21",["erro-390.png", "erro-cancelamento-390.png", "estados-resultados.json"]);
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({headless:true,chromiumSandbox:true});
 try{
 const context=await browser.newContext({locale:'pt-BR'});const page=await context.newPage();page.setDefaultTimeout(15000);const dir=run.directory,results=[];
 await context.route('http://localhost:8080/**',r=>r.continue({url:r.request().url().replace('http://localhost:8080','http://127.0.0.1:8086')}));
 await page.goto('http://127.0.0.1:4206/login?returnUrl=%2Fadmin%2Forders');await page.locator('input[type=email]').fill('admin@audit.example.test');await page.locator('input[type=password]').fill('AuditOnly2026!');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.waitForURL('http://127.0.0.1:4206/admin/orders').catch(async err=>{await page.screenshot({path:run.file('login-error.png'),fullPage:true});console.error('URL_FINAL',page.url());console.error((await page.locator('body').innerText()).slice(-1500));throw err;});await page.locator('tbody tr').first().waitFor();
 for(const width of [1440,1024,768,390]){
 await page.setViewportSize({width,height:1000});
 let release;const gate=new Promise(resolve=>release=resolve);
 await context.route('http://localhost:8080/admin/orders?page=1',async route=>{await gate;await route.continue({url:route.request().url().replace('http://localhost:8080','http://127.0.0.1:8086')});},{times:1});
 await page.goto('http://127.0.0.1:4206/admin/orders');await page.getByText('Carregando pedidos',{exact:true}).waitFor();await page.screenshot({path:dir+'/carregando-'+width+'.png',fullPage:true});release();await page.locator('tbody tr').first().waitFor();results.push({name:'Carregamento e resposta real '+width,passed:true});
 await context.route('http://localhost:8080/admin/orders?page=1',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Falha de comunicação injetada para teste de recuperação.'})}),{times:1});
 await page.reload();await page.getByRole('heading',{name:'Não foi possível carregar os pedidos',exact:true}).waitFor();await page.screenshot({path:dir+'/erro-'+width+'.png',fullPage:true});await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await page.locator('tbody tr').first().waitFor();results.push({name:'Erro injetado e retry real '+width,passed:true});
 }
 await page.goto('http://127.0.0.1:4206/admin/orders/11');await page.getByRole('button',{name:'Cancelar pedido',exact:true}).click();
 await context.route('http://localhost:8080/admin/orders/11/cancel',r=>r.fulfill({status:409,contentType:'application/json',body:JSON.stringify({message:'Não foi possível repor o estoque deste pedido.'})}),{times:1});
 const modal=page.getByRole('alertdialog');await modal.getByRole('button',{name:'Cancelar pedido',exact:true}).click();await modal.getByRole('alert').filter({hasText:'Não foi possível repor'}).waitFor();assert.ok(await modal.isVisible());await page.screenshot({path:dir+'/erro-cancelamento-390.png',fullPage:true});await modal.getByRole('button',{name:'Manter pedido',exact:true}).click();await modal.waitFor({state:'detached'});results.push({name:'HTTP 409 injetado mantém confirmação aberta e permite desistir',passed:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await fs.writeFile(dir+'/estados-resultados.json',JSON.stringify({results,errorResponses:'503 e 409 injetados no navegador, sem alteração do banco; carregamento e recuperação usam a API real.'},null,2));console.log('PASS',results.length,'estados adicionais');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
