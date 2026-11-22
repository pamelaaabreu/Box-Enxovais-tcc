const run=require('./artifacts.cjs').createArtifacts("audit","docs/validacao-visual/auditoria-2026-11-20",["home-1440.png", "home-390.png", "conta-1440.png", "conta-390.png", "modal-1440.png", "modal-390.png", "resultados.json"]);
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const results=[];
async function check(name,task){try{await task();results.push({name,passed:true});console.log('PASS',name)}catch(e){results.push({name,passed:false,error:e.message.slice(0,1200)});console.log('FAIL',name,e.message.slice(0,500))}}
(async()=>{
 const browser=await chromium.launch({headless:true,chromiumSandbox:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route('http://localhost:8080/**',r=>r.continue({url:r.request().url().replace('http://localhost:8080','http://127.0.0.1:8086')}));
 const page=await context.newPage();page.setDefaultTimeout(12000);
 const base=process.env.AUDIT_FRONTEND_URL||'http://localhost:4200';
 await check('Login administrativo real',async()=>{
  await page.goto(base+'/login?returnUrl=%2Fadmin%2Fproducts');
  await page.locator('input[type=email]').fill('admin@audit.example.test');
  await page.locator('input[type=password]').fill('AuditOnly2026!');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.waitForURL(/\/admin\/products$/);
  await page.getByRole('heading',{name:'Produtos',exact:true}).waitFor();
 });
 await check('Sidebar direta e pesquisa por SKU',async()=>{
  await page.locator('nav[aria-label="Administração"] > a').filter({hasText:'Produtos'}).click();
  assert.equal(await page.locator('nav summary').count(),1);
  await page.getByLabel('Buscar produto',{exact:true}).fill('BX-CAM-001');
  await page.getByRole('button',{name:'Filtrar',exact:true}).click();
  await page.getByText('1 produto encontrado',{exact:true}).waitFor();
 });
 await check('Cadastro de produto simples com SKU automático',async()=>{
  await page.getByRole('link',{name:'Novo produto',exact:true}).click();
  await page.locator('#product-name').fill('Produto Auditoria E2E Simples');
  await page.locator('#product-category').click();
  await page.getByRole('option',{name:'Cama / Edredons',exact:true}).click();
  await page.locator('#product-price').fill('12990');
  await page.locator('#quantity').fill('5');
  await page.getByRole('button',{name:'Salvar e adicionar imagens',exact:true}).click();
  await page.getByRole('heading',{name:'Imagens do produto',exact:true}).waitFor();
  await page.waitForFunction(()=>Boolean(document.querySelector('app-product-sku input')?.value));
  assert.match(await page.getByLabel('SKU da loja',{exact:true}).inputValue(),/^BX-EDR-/);
 });
 await check('Upload real e conclusão da galeria',async()=>{
  const image=await context.request.get('http://127.0.0.1:8086/uploads/audit-product.png');assert.equal(image.status(),200);
  await fs.writeFile(run.file('upload.png'),await image.body());
  await page.locator('input[type=file]').setInputFiles(run.file('upload.png'));
  await page.getByRole('button',{name:'Enviar imagem',exact:true}).click();
  await page.getByText('Capa atual',{exact:true}).waitFor();
  const uploaded=page.locator('.image-list img').first();await uploaded.waitFor();
  await page.waitForFunction(()=>{const e=document.querySelector('.image-list img');return e&&e.complete&&e.naturalWidth>0});
  await page.getByRole('button',{name:'Concluir cadastro',exact:true}).click();
  await page.waitForURL(/\/admin\/products\?q=/);
  await page.getByText('Recém-cadastrado',{exact:true}).waitFor();
 });

 await check('Criação de produto com variantes e resumo automático',async()=>{
  await page.goto(base+'/admin/products/manage');
  await page.locator('#product-name').fill('Edredom E2E Variantes');await page.locator('#product-category').click();await page.getByRole('option',{name:'Cama / Edredons',exact:true}).click();
  for(const [size,price,stock] of [['Solteiro','24990','3'],['Queen','32990','4']]){
   await page.getByRole('button',{name:'Adicionar variação',exact:true}).click();const row=page.locator('.variant-card').last();await row.locator('[formcontrolname=size]').fill(size);await row.locator('[formcontrolname=dimensions]').fill('220 × 240 cm');await row.locator('[formcontrolname=price]').fill(price);await row.locator('[formcontrolname=stock]').fill(stock);
  }
  assert.equal(await page.locator('#product-price').count(),0);assert.match(await page.locator('app-product-commerce-summary').innerText(),/7 unidades/);
  await page.getByRole('button',{name:'Salvar e adicionar imagens',exact:true}).click();await page.getByRole('heading',{name:'Imagens do produto',exact:true}).waitFor();
  await page.locator('input[type=file]').setInputFiles(run.file('upload.png'));await page.getByRole('button',{name:'Enviar imagem',exact:true}).click();await page.getByText('Capa atual',{exact:true}).waitFor();await page.getByRole('button',{name:'Concluir cadastro',exact:true}).click();await page.getByText('Recém-cadastrado',{exact:true}).waitFor();
 });
 await check('Edição de variante preserva SKU e atualiza preço e estoque',async()=>{
  await page.locator('tr.new-product').getByRole('link',{name:'Variações',exact:true}).click();await page.locator('.variant-card').first().waitFor();const sku=await page.getByLabel('SKU da loja',{exact:true}).inputValue();const row=page.locator('.variant-card').first();await row.locator('[formcontrolname=price]').fill('25990');await row.locator('[formcontrolname=stock]').fill('6');await page.getByRole('button',{name:'Salvar variações',exact:true}).click();await page.waitForFunction(()=>document.querySelector('button[type=submit]')?.disabled);await page.reload();await page.locator('.variant-card').first().waitFor();assert.equal(await page.getByLabel('SKU da loja',{exact:true}).inputValue(),sku);assert.equal(await page.locator('.variant-card').first().locator('[formcontrolname=stock]').inputValue(),'6');
 });
 for(const [kind,noun] of [['categories','categoria'],['brands','marca']])await check('CRUD real de '+noun,async()=>{
  await page.goto(base+'/admin/catalog/'+kind);await page.getByRole('button',{name:'Nova '+noun,exact:true}).click();await page.locator('form.editor input[name=name]').fill('Auditoria E2E '+noun);await page.getByRole('button',{name:'Salvar',exact:true}).click();const row=page.locator('.registration-item').filter({hasText:'Auditoria E2E '+noun});await row.waitFor();await row.getByRole('button',{name:'Editar',exact:true}).click();await page.locator('form.editor input[name=name]').fill('Auditoria E2E '+noun+' revisada');await page.getByRole('button',{name:'Salvar',exact:true}).click();await row.getByRole('button',{name:'Excluir',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Excluir',exact:true}).click();await row.waitFor({state:'detached'});
 });
 await check('Faixa de CEP cadastrada pela interface e cotação real',async()=>{
  await page.goto(base+'/admin/catalog/shipping-ranges');await page.getByRole('button',{name:'Nova faixa de CEP',exact:true}).click();const form=page.locator('form.editor');await form.locator('[formcontrolname=name]').fill('Região E2E');await form.locator('[formcontrolname=startCep]').fill('01000000');await form.locator('[formcontrolname=endCep]').fill('01999999');await form.locator('[formcontrolname=price]').fill('15.90');await form.locator('[formcontrolname=minDays]').fill('3');await form.locator('[formcontrolname=maxDays]').fill('5');await page.getByRole('button',{name:'Salvar faixa',exact:true}).click();await page.getByText('Região E2E',{exact:true}).waitFor();const quote=await context.request.get('http://127.0.0.1:8086/shipping/quote?cep=01001000');assert.equal(quote.status(),200);assert.equal((await quote.json()).priceCents,1590);
 });
 let campaignName='Campanha E2E '+Date.now();
 await check('Campanha com produtos, imagem, desconto e publicação na Home',async()=>{
  await page.goto(base+'/admin/promotions/new');await page.locator('#promo-name').fill(campaignName);await page.locator('#campaign-description').fill('Campanha para auditoria isolada do fluxo completo.');await page.locator('#start-date').fill('2026-01-01T00:00');await page.locator('#end-date').fill('2027-12-31T23:59');await page.locator('.home-visibility-control').click();
  await page.getByRole('tab',{name:/Produtos/}).click();await page.getByRole('button',{name:/Adicionar produtos/}).first().click();await page.getByLabel('Selecionar Jogo de Cama Auditoria Algodão',{exact:true}).check();await page.getByRole('button',{name:'Adicionar selecionados',exact:true}).click();
  await page.getByRole('tab',{name:/Imagens/}).click();await page.locator('#campaign-upload').setInputFiles(run.file('upload.png'));await page.getByRole('button',{name:'Salvar promoção',exact:true}).waitFor();
  await page.getByRole('tab',{name:/Descontos/}).click();await page.locator('#discount-value').fill('10');await page.getByRole('button',{name:'Aplicar a todos os produtos',exact:true}).click();await page.getByRole('button',{name:'Salvar promoção',exact:true}).click();await page.waitForURL(base+'/admin/promotions');await page.getByText(campaignName,{exact:true}).waitFor();
  const campaign=await context.request.get('http://127.0.0.1:8086/home/campaign');assert.equal(campaign.status(),200);assert.equal((await campaign.json()).name,campaignName);
 });
 await check('Edição real da campanha e prévia persistida',async()=>{
  const row=page.locator('tr').filter({hasText:campaignName});await row.getByRole('button',{name:'Editar',exact:true}).click();campaignName+=' revisada';await page.locator('#promo-name').fill(campaignName);await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();await page.waitForURL(base+'/admin/promotions');await page.getByText(campaignName,{exact:true}).waitFor();
 });
 const customerContext=await browser.newContext({viewport:{width:1440,height:1000}});await customerContext.route('http://localhost:8080/**',r=>r.continue({url:r.request().url().replace('http://localhost:8080','http://127.0.0.1:8086')}));const client=await customerContext.newPage();client.setDefaultTimeout(12000);
 await check('Login de cliente e bloqueio da área administrativa',async()=>{
  await client.goto(base+'/login');await client.locator('input[type=email]').fill('cliente@audit.example.test');await client.locator('input[type=password]').fill('AuditOnly2026!');await client.getByRole('button',{name:'Entrar',exact:true}).click();await client.waitForURL(u=>!u.pathname.includes('login'));await client.goto(base+'/admin/products');await client.waitForURL(/\/home$/);
  const token=await client.evaluate(()=>sessionStorage.getItem('authToken'));const denied=await customerContext.request.get('http://127.0.0.1:8086/admin/products',{headers:{Authorization:'Bearer '+token}});assert.equal(denied.status(),403);
 });
 await check('Variantes públicas, preço, favorito e carrinho',async()=>{
  await client.goto(base+'/produto/2');await client.getByRole('button',{name:'Queen',exact:true}).click();assert.match(await client.locator('app-product-price').first().innerText(),/289,90/);await client.getByRole('button',{name:/Adicionar .* aos favoritos/}).first().click();await Promise.all([client.waitForResponse(r=>r.url().endsWith('/cart/items')&&r.request().method()==='POST'&&r.status()===200),client.getByRole('button',{name:'Adicionar ao carrinho',exact:true}).click()]);await client.goto(base+'/cart');await client.getByRole('article').filter({hasText:'Queen'}).waitFor();await client.getByRole('button',{name:/Aumentar quantidade/}).first().click();await client.getByRole('button',{name:/Diminuir quantidade/}).first().click();await client.goto(base+'/favorites');await client.getByText('Edredom Auditoria Variantes',{exact:true}).first().waitFor();await client.getByRole('button',{name:/Remover .* favoritos/}).first().click();
 });
 await check('Remoção de item do carrinho e inclusão de produto simples',async()=>{
  await client.goto(base+'/cart');await client.getByRole('button',{name:/Remover Edredom/}).first().click();await client.getByText('Seu carrinho está vazio',{exact:true}).waitFor();await client.goto(base+'/produto/1');await Promise.all([client.waitForResponse(r=>r.url().endsWith('/cart/items')&&r.request().method()==='POST'&&r.status()===200),client.getByRole('button',{name:'Adicionar ao carrinho',exact:true}).click()]);await client.goto(base+'/cart');await client.getByRole('link',{name:/Finalizar compra/}).waitFor();
 });
 await check('Checkout real: entrega, Pix, revisão e pedido',async()=>{
  await client.getByRole('link',{name:/Finalizar compra/}).click();await client.locator('#recipient').fill('Cliente Auditoria');await client.locator('#zipCode').fill('01001000');await client.locator('#street').fill('Rua Auditoria');await client.locator('#number').fill('100');await client.locator('#neighborhood').fill('Centro');await client.locator('#city').fill('São Paulo');await client.locator('#state').selectOption('SP');await client.getByRole('button',{name:/Continuar para pagamento/}).click();await client.getByRole('button',{name:/Revisar pedido/}).click();await client.getByRole('button',{name:/Confirmar pedido/}).click();await client.getByRole('heading',{name:/Pedido registrado|Compra realizada|Pedido confirmado|Seu pedido foi realizado!/}).first().waitFor();
 });
 let registeredEmail='';
 await check('Cadastro público real de nova conta',async()=>{
  const regContext=await browser.newContext();await regContext.route('http://localhost:8080/**',r=>r.continue({url:r.request().url().replace('http://localhost:8080','http://127.0.0.1:8086')}));const reg=await regContext.newPage();reg.setDefaultTimeout(12000);await reg.goto(base+'/register');await reg.getByLabel('Nome completo',{exact:true}).fill('Pessoa Auditoria');registeredEmail='nova-'+Date.now()+'@audit.example.test';await reg.getByLabel('E-mail',{exact:true}).fill(registeredEmail);await reg.getByLabel('Senha',{exact:true}).fill('AuditOnly2026@');await reg.getByLabel('Confirmar senha',{exact:true}).fill('AuditOnly2026@');await reg.locator('input[formcontrolname=terms]').check();await reg.getByRole('button',{name:'Criar conta',exact:true}).click();await reg.waitForURL(/\/login$/);await regContext.close();
 });

 await check('Recuperação real por OTP e login com nova senha sem SMTP externo',async()=>{
  const recoveryContext=await browser.newContext();await recoveryContext.route('http://localhost:8080/**',r=>r.continue({url:r.request().url().replace('http://localhost:8080','http://127.0.0.1:8086')}));const recovery=await recoveryContext.newPage();recovery.setDefaultTimeout(12000);
  await recovery.goto(base+'/forgot-password');await recovery.getByLabel('E-mail',{exact:true}).fill(registeredEmail);await recovery.getByRole('button',{name:'Enviar código',exact:true}).click();await recovery.getByRole('heading',{name:'Verifique seu e-mail',exact:true}).waitFor();
  const code=(await fs.readFile('backend/audit-browser.otp','utf8')).trim();assert.equal(code.length,8);for(let i=0;i<8;i++)await recovery.getByLabel('Caractere '+(i+1)+' do código',{exact:true}).fill(code[i]);await recovery.getByRole('button',{name:'Confirmar código',exact:true}).click();await recovery.getByRole('heading',{name:'Crie uma nova senha',exact:true}).waitFor();await recovery.getByLabel('Nova senha',{exact:true}).fill('NovaAudit2026@');await recovery.getByLabel('Confirmar nova senha',{exact:true}).fill('NovaAudit2026@');await recovery.getByRole('button',{name:'Alterar senha',exact:true}).click();await recovery.waitForURL(/\/login$/);await recovery.getByLabel('E-mail',{exact:true}).fill(registeredEmail);await recovery.getByLabel('Senha',{exact:true}).fill('NovaAudit2026@');await recovery.getByRole('button',{name:'Entrar',exact:true}).click();await recovery.waitForURL(u=>!u.pathname.includes('login'));await recoveryContext.close();
 });
 await check('Envio de avaliação e moderação administrativa real',async()=>{
  await client.goto(base+'/meus-pedidos');await client.getByRole('link',{name:'Ver detalhes',exact:true}).first().click();const review=client.locator('app-purchase-review');await review.locator('form').waitFor();
  await review.getByRole('radio',{name:'5 de 5 estrelas para a experiência de compra',exact:true}).check();
  await review.getByLabel('Comentário (opcional)',{exact:true}).fill('Avaliação E2E isolada.');await review.locator('input[type=checkbox]').check();await review.getByRole('button',{name:'Enviar avaliação',exact:true}).click();await review.getByText(/Sua avaliação foi recebida para moderação/).waitFor();
  await page.goto(base+'/admin/experience-reviews');const card=page.locator('article').filter({hasText:'Avaliação E2E isolada.'});await card.waitFor();await card.getByRole('combobox').click();await page.getByRole('option',{name:'Aprovado',exact:true}).click();await card.getByRole('combobox').filter({hasText:'Aprovado'}).waitFor();
 });
 await check('Cancelamento real e reposição de estoque',async()=>{
  const before=await customerContext.request.get('http://127.0.0.1:8086/products/1');const quantity=(await before.json()).quantity;
  await client.goto(base+'/meus-pedidos');await client.getByRole('link',{name:'Ver detalhes',exact:true}).first().click();await client.getByRole('button',{name:'Cancelar compra',exact:true}).click();await client.getByRole('combobox',{name:/Motivo do cancelamento/}).click();await client.getByRole('option').first().click();await client.getByRole('button',{name:'Confirmar cancelamento',exact:true}).click();await client.getByText('Pedido cancelado',{exact:true}).waitFor();const after=await customerContext.request.get('http://127.0.0.1:8086/products/1');assert.equal((await after.json()).quantity,quantity+1);
 });
 await check('Estoque indisponível e limite do backend',async()=>{
  await client.goto(base+'/produto/7');assert.equal(await client.getByRole('button',{name:'Produto indisponível',exact:true}).isDisabled(),true);
  const token=await client.evaluate(()=>sessionStorage.getItem('authToken'));const response=await customerContext.request.post('http://127.0.0.1:8086/cart/items',{headers:{Authorization:'Bearer '+token},data:{productId:1,quantity:99999}});assert.equal(response.status(),409);
 });
 await check('Galeria real: miniaturas, zoom e Escape',async()=>{
  await client.goto(base+'/produto/2');const thumbs=client.locator('.thumbnails button');await thumbs.first().waitFor();assert.equal(await thumbs.count(),2);await thumbs.nth(1).click();assert.equal(await thumbs.nth(1).getAttribute('aria-pressed'),'true');await client.getByRole('button',{name:'Ampliar imagem do produto',exact:true}).click();await client.getByRole('dialog',{name:'Imagem ampliada do produto',exact:true}).waitFor();await client.keyboard.press('Escape');await client.getByRole('dialog',{name:'Imagem ampliada do produto',exact:true}).waitFor({state:'hidden'});
 });
 await check('Catálogo: ordenações reais e URL após atualização',async()=>{
  await client.goto(base+'/categoria/cama');for(const name of ['Menor preço','Maior preço','Nome','Mais recentes','Mais relevantes']){await client.getByRole('combobox',{name:'Ordenar produtos',exact:true}).click();await client.getByRole('option',{name,exact:true}).click();await client.locator('app-product-card').first().waitFor();}await client.reload();await client.locator('app-product-card').first().waitFor();
 });
 const evidence=run.directory;await fs.mkdir(evidence,{recursive:true});
 for(const width of [1440,1024,768,390]){
  for(const [name,target,url] of [['dashboard-admin',page,'/admin/dashboard'],['categorias-admin',page,'/admin/catalog/categories'],['marcas-admin',page,'/admin/catalog/brands'],['cep-admin',page,'/admin/catalog/shipping-ranges'],['conta',client,'/account'],['pedidos',client,'/meus-pedidos'],['home',client,'/home'],['catalogo',client,'/categoria/cama'],['produto',client,'/produto/2'],['cadastro-admin',page,'/admin/products/manage'],['promocoes-admin',page,'/admin/promotions'],['avaliacoes-admin',page,'/admin/experience-reviews']])await check('Visual '+name+' '+width,async()=>{
   await target.setViewportSize({width,height:1000});await target.goto(base+url);await target.locator('h1:visible,h2:visible').first().waitFor();await target.screenshot({path:path.join(evidence,name+'-'+width+'.png'),fullPage:true,animations:'disabled'});
   const dimensions=await target.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));assert.ok(dimensions.width<=dimensions.viewport+1,'Overflow horizontal da página: '+JSON.stringify(dimensions));
  });
  await check('Visual modal e dropdown '+width,async()=>{
   await page.goto(base+'/admin/products/manage');await page.locator('#product-name').fill('Rascunho visual E2E');await page.locator('#product-category').click();await page.getByRole('option').first().waitFor();await page.screenshot({path:path.join(evidence,'dropdown-'+width+'.png'),fullPage:true,animations:'disabled'});await page.keyboard.press('Escape');await page.getByRole('link',{name:'Cancelar',exact:true}).click();await page.getByRole('alertdialog').waitFor();await page.screenshot({path:path.join(evidence,'modal-'+width+'.png'),animations:'disabled'});await page.getByRole('button',{name:'Continuar editando',exact:true}).click();await page.getByRole('alertdialog').waitFor({state:'detached'});assert.equal(await page.locator('#product-name').inputValue(),'Rascunho visual E2E');await page.getByRole('link',{name:'Cancelar',exact:true}).click();await page.getByRole('button',{name:'Descartar',exact:true}).click();await page.waitForURL(base+'/admin/products');
  });
 }
 await check('Estado vazio real do catálogo e limpeza dos filtros',async()=>{
  await client.goto(base+'/categoria/cama');await client.getByRole('button',{name:'Filtros',exact:true}).click();const input=client.getByPlaceholder('Nome do produto');await input.fill('ZZZ SEM RESULTADOS AUDITORIA');await client.getByRole('button',{name:'Aplicar filtros',exact:true}).click();await client.getByRole('heading',{name:'Nenhum produto encontrado',exact:true}).waitFor();await client.screenshot({path:path.join(evidence,'catalogo-vazio-390.png'),fullPage:true});await client.getByRole('button',{name:'Limpar filtros',exact:true}).click();await client.locator('app-product-card').first().waitFor();
 });
 await check('Falha HTTP administrativa e recarregamento pela interface',async()=>{
  await page.route('http://localhost:8080/admin/products?**',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Indisponibilidade controlada no teste'})}));await page.goto(base+'/admin/products');await page.getByRole('heading',{name:'Não foi possível carregar a listagem',exact:true}).waitFor();await page.screenshot({path:path.join(evidence,'erro-admin-390.png'),fullPage:true});await page.unroute('http://localhost:8080/admin/products?**');await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await page.locator('tbody tr').first().waitFor();
 });
 await customerContext.close();
 await fs.writeFile(run.file('resultados.json'),JSON.stringify(results,null,2));
 await browser.close();
 if(results.some(r=>!r.passed))process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1});
