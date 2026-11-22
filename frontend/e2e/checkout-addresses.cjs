const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const run=require('./artifacts.cjs').createArtifacts('checkout-addresses','docs/validacao-visual/checkout-enderecos',['delivery-1440.png','delivery-390.png']);
const api='http://127.0.0.1:8086',base='http://127.0.0.1:4206';
const address={recipient:'Cliente Auditoria',zipCode:'01001-000',street:'Rua de Testes',number:'12',complement:'Apto 3',neighborhood:'Centro',city:'São Paulo',state:'SP'};
(async()=>{
 const browser=await chromium.launch({headless:true,chromiumSandbox:true});
 try {
  const context=await browser.newContext({locale:'pt-BR',timezoneId:'America/Sao_Paulo'});
  await context.route('http://localhost:8080/**',r=>r.continue({url:r.request().url().replace('http://localhost:8080',api)}));
  await context.route('https://viacep.com.br/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  const page=await context.newPage();page.setDefaultTimeout(20000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const adminLogin=await context.request.post(api+'/login',{data:{email:'admin@audit.example.test',password:'AuditOnly2026!'}});assert.equal(adminLogin.status(),200);
  const admin={Authorization:'Bearer '+(await adminLogin.json()).token};
  const range={name:'Cobertura checkout isolado',startCep:'01000000',endCep:'01999999',priceCents:1590,minDays:3,maxDays:5,active:true};
  const created=await context.request.post(api+'/admin/catalog/shipping-ranges',{headers:admin,data:range});assert.equal(created.status(),201);const rangeId=(await created.json()).id;
  await page.goto(base+'/login');await page.locator('input[type=email]').fill('cliente@audit.example.test');await page.locator('input[type=password]').fill('AuditOnly2026!');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.waitForURL(u=>!u.pathname.includes('login'));
  const token=await page.evaluate(()=>sessionStorage.getItem('authToken'));const headers={Authorization:'Bearer '+token};
  const request=async(method,path,data,h=headers)=>{const response=await context.request[method](api+path,{headers:h,...(data===undefined?{}:{data})});assert.ok(response.ok(),method+' '+path+' HTTP '+response.status());return response.json();};
  const addresses=async()=>(await request('get','/me/addresses')).data;
  const check=async(name,fn)=>{await fn();console.log('PASS',name);};
  const cart=async()=>{await request('delete','/cart');await request('post','/cart/items',{productId:1,quantity:1});};
  const available=async()=>{await page.getByText('Entrega disponível para este CEP.',{exact:true}).waitFor();};
  const fill=async(number)=>{for(const [key,value]of Object.entries({...address,number})){if(key==='zipCode')continue;if(key==='state')await page.locator('#state').selectOption(value);else await page.locator('#'+key).fill(value);}await page.locator('#zipCode').fill(address.zipCode);await page.locator('#checkout-contact-phone').fill('11912345678');await available();};
  const purchase=async()=>{await page.getByRole('button',{name:'Continuar para pagamento',exact:true}).click();await page.getByRole('button',{name:'Revisar pedido',exact:true}).click();const waiting=page.waitForResponse(r=>new URL(r.url()).pathname==='/checkout'&&r.request().method()==='POST');await page.getByRole('button',{name:'Confirmar pedido',exact:true}).click();const response=await waiting;assert.equal(response.status(),200);const body=response.request().postDataJSON();const result=await response.json();await page.waitForURL(/checkout\/success\/\d+/);return {body,id:result.data.id};};
  await check('Falha de endereços não vira formulário vazio; retry recupera a conta',async()=>{
   await cart();let fail=true;await page.route('http://localhost:8080/me/addresses',r=>{if(fail&&r.request().method()==='GET'){fail=false;return r.fulfill({status:503,contentType:'application/json',body:'{}'});}return r.continue({url:api+'/me/addresses'});});await page.goto(base+'/checkout');await page.getByText('Não foi possível carregar seus endereços. Tente novamente.',{exact:false}).waitFor();assert.equal(await page.locator('#recipient').count(),0);assert.ok(await page.getByRole('button',{name:'Continuar para pagamento',exact:true}).isDisabled());await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await page.locator('#recipient').waitFor();await page.unroute('http://localhost:8080/me/addresses');
  });
  await check('Sem endereços: checkbox normal desmarcado e pedido sem gravar na conta',async()=>{
   assert.equal(await page.locator('.save-delivery-address input').isChecked(),false);const rect=await page.locator('.save-delivery-address input').boundingBox();assert.ok(rect.width>=18&&rect.width<=20&&rect.height>=18&&rect.height<=20);await fill('12');const result=await purchase();assert.equal(result.body.saveAddress,undefined);assert.equal(result.body.address.number,'12');assert.equal((await addresses()).length,0);const order=(await request('get','/orders/'+result.id)).data;assert.equal(order.address.number,'12');
  });
  let home,work,outside;
  await check('Um endereço: selecionado automaticamente sem repetir formulário',async()=>{
   home=(await request('post','/me/addresses',{...address,label:'Casa'})).data;await cart();await page.goto(base+'/checkout');await available();assert.equal(await page.locator('.saved-address-card').count(),2);assert.ok(await page.locator('.saved-address-card').filter({hasText:'Casa'}).locator('input').isChecked());assert.equal(await page.locator('#recipient').count(),0);
  });
  await check('Vários endereços: padrão, troca, retorno e restauração após reload',async()=>{
   work=(await request('post','/me/addresses',{...address,label:'Trabalho',number:'42',zipCode:'01002-000'})).data;outside=(await request('post','/me/addresses',{...address,label:'Fora da cobertura',zipCode:'99999-999'})).data;await request('put','/me/addresses/'+work.id+'/default',{});await page.evaluate(()=>{for(const key of Object.keys(sessionStorage))if(key.startsWith('box.checkout.address.'))sessionStorage.removeItem(key);});await page.reload();await available();assert.ok(await page.locator('.saved-address-card').filter({hasText:'Trabalho'}).locator('input').isChecked());await page.locator('.saved-address-card').filter({hasText:'Casa'}).locator('input').check();await available();await page.getByRole('button',{name:'Continuar para pagamento',exact:true}).click();await page.getByRole('button',{name:/Voltar à entrega/}).click();assert.ok(await page.locator('.saved-address-card').filter({hasText:'Casa'}).locator('input').isChecked());await page.reload();await available();assert.ok(await page.locator('.saved-address-card').filter({hasText:'Casa'}).locator('input').isChecked());
  });
  await check('CEP salvo fora da cobertura bloqueia UI e tentativa direta na API',async()=>{
   await page.locator('.saved-address-card').filter({hasText:'Fora da cobertura'}).locator('input').check();await page.getByText('Entrega indisponível para este CEP no momento.',{exact:false}).waitFor();assert.ok(await page.getByRole('button',{name:'Continuar para pagamento',exact:true}).isDisabled());const response=await context.request.post(api+'/checkout',{headers,data:{requestKey:'outside-checkout-e2e',addressId:outside.id,paymentMethod:'pix',expectedTotalCents:12990}});assert.equal(response.status(),422);
  });
  await check('Endereço de outro usuário é rejeitado pelo backend',async()=>{
   const other=(await request('post','/me/addresses',{...address,label:'Endereço de outro usuário'},admin)).data;const response=await context.request.post(api+'/checkout',{headers,data:{requestKey:'foreign-address-e2e',addressId:other.id,paymentMethod:'pix',expectedTotalCents:12990}});assert.equal(response.status(),404);
  });
  await check('Endereço escolhido vira snapshot e edição posterior não muda pedido',async()=>{
   await page.locator('.saved-address-card').filter({hasText:'Trabalho'}).locator('input').check();await available();const result=await purchase();assert.equal(result.body.addressId,work.id);await request('patch','/me/addresses/'+work.id,{...address,label:'Trabalho',number:'900',zipCode:'01002-000'});assert.equal((await request('get','/orders/'+result.id)).data.address.number,'42');
  });
  await check('Outro endereço só é salvo com opt-in; retry não duplica e padrão permanece',async()=>{
   await cart();await page.goto(base+'/checkout');await available();await page.getByRole('radio',{name:'Usar outro endereço',exact:true}).check();await fill('88');await page.locator('.save-delivery-address input').check();const result=await purchase();assert.equal(result.body.saveAddress,true);let items=await addresses();assert.equal(items.length,4);assert.equal(items.filter(a=>a.isDefault)[0].id,work.id);const again=await request('post','/checkout',result.body);assert.equal(again.data.id,result.id);assert.equal((await addresses()).length,4);
  });
  await check('Backend revalida cobertura alterada após avançar para revisão',async()=>{
   await cart();await page.goto(base+'/checkout');await available();await page.getByRole('button',{name:'Continuar para pagamento',exact:true}).click();await page.getByRole('button',{name:'Revisar pedido',exact:true}).click();await request('patch','/admin/catalog/shipping-ranges/'+rangeId,{...range,active:false},admin);const waiting=page.waitForResponse(r=>new URL(r.url()).pathname==='/checkout'&&r.request().method()==='POST');await page.getByRole('button',{name:'Confirmar pedido',exact:true}).click();assert.equal((await waiting).status(),422);await page.getByRole('heading',{name:'Informações de entrega',exact:true}).waitFor();assert.ok(await page.getByRole('button',{name:'Continuar para pagamento',exact:true}).isDisabled());await request('patch','/admin/catalog/shipping-ranges/'+rangeId,range,admin);await page.getByRole('button',{name:'Consultar entrega novamente',exact:true}).click();await available();
  });
  await check('Falha temporária de consulta tem retry sem confundir com falta de cobertura',async()=>{
   let fail=true;await page.route('http://localhost:8080/shipping/quote?*',r=>{if(fail){fail=false;return r.fulfill({status:503,contentType:'application/json',body:'{}'});}return r.continue({url:r.request().url().replace('http://localhost:8080',api)});});await page.locator('.saved-address-card').filter({hasText:'Casa'}).locator('input').check();await page.getByText('Não foi possível consultar a entrega. Tente novamente.',{exact:false}).waitFor();await page.getByRole('button',{name:'Consultar entrega novamente',exact:true}).click();await available();assert.equal(await page.locator('section.checkout > p.error').count(),0);await page.unroute('http://localhost:8080/shipping/quote?*');
  });
  for(const width of [1440,1024,768,390])await check('Cards, checkbox e foco sem overflow '+width,async()=>{
   await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('.saved-address-card').filter({hasText:'Casa'}).locator('input').focus();assert.ok(await page.evaluate(()=>document.activeElement.type==='radio'));await page.evaluate(()=>scrollTo(0,0));await page.evaluate(()=>document.fonts.ready);if(width===1440||width===390)await page.screenshot({path:run.file('delivery-'+width+'.png'),fullPage:true,animations:'disabled'});await page.getByRole('radio',{name:'Usar outro endereço',exact:true}).check();await page.locator('#recipient').waitFor();const box=await page.locator('.save-delivery-address input').boundingBox();assert.equal(box.width,18);assert.equal(box.height,18);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('.saved-address-card').filter({hasText:'Casa'}).locator('input').check();await available();
  });
  assert.deepEqual(errors,[]);console.log('PASS Sem erros Angular no navegador');
 } finally {await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
