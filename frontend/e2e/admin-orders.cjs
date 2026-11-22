const run=require('./artifacts.cjs').createArtifacts("orders","docs/validacao-visual/pedidos-admin-2026-11-21",["lista-1440.png", "lista-1024.png", "lista-768.png", "lista-390.png", "detalhe-1440.png", "detalhe-1024.png", "detalhe-768.png", "detalhe-390.png", "confirmacao-390.png", "vazio-390.png", "inexistente-390.png", "resultados.json"]);
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const results=[];
async function check(name,run){try{await run();results.push({name,passed:true});console.log('PASS',name);}catch(err){results.push({name,passed:false,error:err.message.slice(0,1200)});console.log('FAIL',name,err.message.slice(0,500));}}
(async()=>{
 const browser=await chromium.launch({headless:true,chromiumSandbox:true});
 const context=await browser.newContext({locale:"pt-BR",viewport:{width:1440,height:1000}});
 const base='http://127.0.0.1:4206',api='http://127.0.0.1:8086',dir=run.directory;
 await fs.mkdir(dir,{recursive:true});
 await context.route('http://localhost:8080/**',route=>route.continue({url:route.request().url().replace('http://localhost:8080',api)}));
 const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let token;
 const headers=()=>({Authorization:'Bearer '+token});
 const get=async suffix=>{const r=await context.request.get(api+suffix,{headers:headers()});assert.equal(r.status(),200);return r.json();};
 const loaded=async()=>{await page.locator('app-admin-orders tbody tr').first().waitFor();};
 const noOverflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Rolagem horizontal');
 const shot=async name=>{await page.screenshot({path:path.join(dir,name+'.png'),fullPage:true});};
 await check('Login real e sidebar de Pedidos',async()=>{
 await page.goto(base+'/login?returnUrl=%2Fadmin%2Forders');await page.locator('input[type=email]').fill('admin@audit.example.test');await page.locator('input[type=password]').fill('AuditOnly2026!');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.waitForURL(base+'/admin/orders');await loaded();token=await page.evaluate(()=>sessionStorage.getItem('authToken'));assert.ok(token);assert.equal(await page.locator('app-admin-page-header').count(),1);assert.equal(await page.locator('app-admin-orders tbody tr').count(),10);assert.ok(await page.locator('nav[aria-label="Administração"] a[href="/admin/orders"]').count());
 });
 await check('API protegida contra clientes e visitantes',async()=>{
 const anon=await context.request.get(api+'/admin/orders');assert.equal(anon.status(),401);
 const login=await context.request.post(api+'/login',{data:{email:'cliente@audit.example.test',password:'AuditOnly2026!'}});assert.equal(login.status(),200);const customer=(await login.json()).token;
 for(const suffix of ['/admin/orders','/admin/orders/13'])assert.equal((await context.request.get(api+suffix,{headers:{Authorization:'Bearer '+customer}})).status(),403);
 assert.equal((await context.request.post(api+'/admin/orders/13/cancel',{headers:{Authorization:'Bearer '+customer},data:{reasonCode:'changed_mind'}})).status(),403);
 });
 await check('Paginação e ordenação reais, com URL persistida',async()=>{
 const first=await get('/admin/orders');assert.equal(first.data.orders[0].id,13);assert.equal(first.data.total,13);
 await page.getByRole('button',{name:/Próxima/}).click();await page.waitForURL(/page=2/);await page.getByText('Página 2 de 2',{exact:true}).waitFor();assert.equal(await page.locator('tbody tr').count(),3);await page.reload();await loaded();assert.equal(await page.locator('tbody tr').count(),3);
 });
 await check('Pesquisa por número e cliente, status e período',async()=>{
 await page.getByLabel('Buscar pedido ou cliente').fill('#13');await page.getByRole('button',{name:'Filtrar',exact:true}).click();await page.getByText('Página 1 de 1',{exact:true}).waitFor();await page.locator('tbody tr').filter({hasText:'#13'}).waitFor();assert.equal(await page.locator('tbody tr').count(),1);
 await page.getByRole('button',{name:'Limpar',exact:true}).click();await page.getByLabel('Status',{exact:true}).selectOption('cancelled');await page.getByRole('button',{name:'Filtrar',exact:true}).click();await page.locator('tbody tr').filter({hasText:'#3'}).waitFor();assert.equal(await page.locator('tbody tr').count(),1);
 await page.getByRole('button',{name:'Limpar',exact:true}).click();await page.getByLabel('Buscar pedido ou cliente').fill('Cliente Auditoria');await page.getByLabel('De',{exact:true}).fill('2026-11-05');await page.getByLabel('Até',{exact:true}).fill('2026-11-06');await page.getByRole('button',{name:'Filtrar',exact:true}).click();await page.getByText('Página 1 de 1',{exact:true}).waitFor();assert.equal(await page.locator('tbody tr').count(),2);
 });
 for(const width of [1440,1024,768,390]){
 await check('Lista responsiva '+width,async()=>{await page.setViewportSize({width,height:1000});await page.goto(base+'/admin/orders');await loaded();await noOverflow();assert.equal(await page.locator('app-admin-page-header').count(),1);await shot('lista-'+width);});
 await check('Detalhe histórico e variante '+width,async()=>{await page.goto(base+'/admin/orders/13');await page.getByRole('heading',{name:'Produtos comprados',exact:true}).waitFor();await page.getByText('Edredom Histórico — Queen',{exact:true}).waitFor();assert.ok((await page.locator('.product-info').innerText()).includes('SKU:'));assert.ok((await page.locator('.product-info').innerText()).includes('Variação #2'));assert.equal((await get('/admin/orders/13')).data.total,25);await page.waitForFunction(()=>Array.from(document.querySelectorAll('.product-info img')).every(img=>img.complete&&img.naturalWidth>0));await noOverflow();await shot('detalhe-'+width);});
 await check('Modal acessível e desistência '+width,async()=>{await page.getByRole('button',{name:'Cancelar pedido',exact:true}).click();const dialog=page.getByRole('alertdialog');await dialog.waitFor();await page.waitForFunction(()=>Boolean(document.activeElement?.closest('[role=alertdialog]')));await noOverflow();await shot('confirmacao-'+width);await dialog.getByRole('button',{name:'Manter pedido',exact:true}).click();await dialog.waitFor({state:'detached'});assert.equal((await get('/admin/orders/13')).data.status,'simulated_approved');});
 await check('Estado vazio e recuperação '+width,async()=>{await page.goto(base+'/admin/orders?search=inexistente');await page.getByRole('heading',{name:'Nenhum pedido encontrado'}).waitFor();await noOverflow();await shot('vazio-'+width);await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();await loaded();});
 }
 await check('Preços históricos de produto simples após alteração do catálogo',async()=>{await page.goto(base+'/admin/orders/12');await page.getByRole('heading',{name:'Produtos comprados',exact:true}).waitFor();const o=(await get('/admin/orders/12')).data;assert.equal(o.total,129.90);assert.equal(o.items[0].unitPrice,129.90);assert.equal(o.discount,null);assert.equal(o.shipping,null);assert.equal(o.address.street,'Rua de Testes');assert.equal(o.events.length,1);});
 await check('Pedido inexistente e retorno à listagem',async()=>{await page.goto(base+'/admin/orders/999999');await page.getByRole('heading',{name:'Pedido não encontrado',exact:true}).waitFor();await shot('inexistente-390');await page.getByRole('link',{name:'Voltar aos pedidos',exact:true}).click();await loaded();});
 await check('Erro de comunicação e tentativa de recarregar',async()=>{
 await context.route('http://localhost:8080/admin/orders?page=1',async route=>{await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Serviço temporariamente indisponível'})});},{times:1});
 await page.goto(base+'/admin/orders');await page.getByRole('heading',{name:'Não foi possível carregar os pedidos',exact:true}).waitFor();await shot('erro-390');await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await loaded();
 });
 await check('Cancelamento real de variante e atualização do histórico',async()=>{await page.goto(base+'/admin/orders/13');await page.getByRole('button',{name:'Cancelar pedido',exact:true}).click();const dialog=page.getByRole('alertdialog');await dialog.getByRole('button',{name:'Cancelar pedido',exact:true}).click();await dialog.waitFor({state:'detached'});await page.getByText('Pedido cancelado',{exact:true}).waitFor();const o=(await get('/admin/orders/13')).data;assert.equal(o.status,'cancelled');assert.equal(o.canCancel,false);assert.equal(o.events.length,2);assert.equal(await page.getByRole('button',{name:'Cancelar pedido',exact:true}).count(),0);});
 await check('Cancelamento duplicado não repõe estoque novamente',async()=>{const before=await context.request.get(api+'/products/2');const a=await before.json();const duplicate=await context.request.post(api+'/admin/orders/13/cancel',{headers:headers(),data:{reasonCode:'changed_mind'}});assert.equal(duplicate.status(),200);const after=await context.request.get(api+'/products/2');const b=await after.json();assert.ok(Array.isArray(a.variants)&&a.variants.length>0);assert.deepEqual(b.variants,a.variants);});
 await check('Pedido legado sem débito não permite cancelamento',async()=>{await page.goto(base+'/admin/orders/2');await page.getByRole('heading',{name:'Produtos comprados',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Cancelar pedido',exact:true}).count(),0);const response=await context.request.post(api+'/admin/orders/2/cancel',{headers:headers(),data:{reasonCode:'changed_mind'}});assert.equal(response.status(),409);});
 await check('Cancelamento simples e dashboard consistente',async()=>{const response=await context.request.post(api+'/admin/orders/12/cancel',{headers:headers(),data:{reasonCode:'changed_mind'}});assert.equal(response.status(),200);const list=(await get('/admin/orders')).data;assert.equal(list.cancelled,3);const dashboard=await get('/admin/dashboard');assert.equal(dashboard.orders,13);});
 await check('Foco de teclado real e ausência de erros Angular',async()=>{await page.goto(base+'/admin/orders');await loaded();await page.getByLabel('Buscar pedido ou cliente').focus();await page.keyboard.press('Tab');assert.equal(await page.getByLabel('Status',{exact:true}).evaluate(e=>e===document.activeElement),true);assert.equal(errors.length,0,errors.join('\n'));});
 await fs.writeFile(path.join(dir,'resultados.json'),JSON.stringify({results,pageErrors:errors},null,2));await browser.close();if(results.some(r=>!r.passed))process.exitCode=1;
})().catch(err=>{console.error(err.message);process.exitCode=1;});
