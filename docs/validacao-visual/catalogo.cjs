const run=require('../../frontend/e2e/artifacts.cjs').createArtifacts('catalog-check','docs/validacao-visual/produto',[]);
const fs=require('node:fs/promises');
const out=process.argv[2] ?? run.directory;
const baseline=process.argv[3];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const api=await (await fetch('http://localhost:8080/products/1')).json();
 const payload=api.data??api;

 const tabs=await (await fetch('http://127.0.0.1:9228/json/list')).json();
 const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
 const calls=new Map();let seq=0;
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const [ok,bad]=calls.get(m.id);calls.delete(m.id);m.error?bad(m.error):ok(m.result)}};
 function send(method,params={}){return new Promise((ok,bad)=>{const id=++seq;calls.set(id,[ok,bad]);ws.send(JSON.stringify({id,method,params}))})}
 async function evaluate(expression){const x=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(x.exceptionDetails)throw Error('Falha na avaliação da página');return x.result.value}
 try{
 await send('Page.enable');
 await send('Page.navigate',{url:'http://localhost:4200/categoria/cama'});

 async function open(id){
  await send('Page.navigate',{url:'http://localhost:4200/produto/'+id});
  for(let i=0;i<60;i++){await delay(350);if(await evaluate("!!document.querySelector('.zoom-trigger img')?.naturalWidth"))return;}
  throw Error('Produto não renderizado: '+id);
 }
 async function shot(label,selector){
  if(selector)await evaluate(`document.activeElement?.blur();window.scrollTo({top:document.querySelector('${selector}').getBoundingClientRect().top+scrollY-195,behavior:'instant'})`);
  await evaluate('document.fonts.ready.then(() => true)');
  await delay(350);
  const {data}=await send('Page.captureScreenshot',{format:'png'});
  const png=Buffer.from(data,'base64');
  await fs.writeFile(out+'/'+label+'.png',png);
  if (baseline) {
    const previous = await fs.readFile(baseline+'/'+label+'.png');
    if (!png.equals(previous)) {
      const ratio = await evaluate(`(async()=>{
        const pixels=async(uri)=>{
          const bitmap=await createImageBitmap(await (await fetch(uri)).blob());
          const canvas=new OffscreenCanvas(bitmap.width,bitmap.height);
          const ctx=canvas.getContext('2d');
          ctx.drawImage(bitmap,0,0);
          return [bitmap.width,bitmap.height,ctx.getImageData(0,0,bitmap.width,bitmap.height).data];
        };
        const [aw,ah,a]=await pixels('data:image/png;base64,${previous.toString('base64')}');
        const [bw,bh,b]=await pixels('data:image/png;base64,${data}');
        if(aw!==bw||ah!==bh)return 1;
        let changed=0;
        for(let i=0;i<a.length;i+=4){
          if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>10)changed++;
        }
        return changed/(aw*ah);
      })()`);
      console.log(label+': '+(ratio*100).toFixed(3)+'% de pixels diferentes');
      if(ratio>0.0025)throw Error('Diferença visual: '+label);
    }
  }
 }



 const assert=(value,message)=>{if(!value)throw Error(message)};
 const activeTab=(i)=>evaluate(`document.querySelectorAll('[role=tab]')[${i}].click()`);
 await fs.mkdir(out,{recursive:true});
 for(const width of [1440,1024,768,390]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?1000:1000,deviceScaleFactor:1,mobile:false});
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await open(2);
  assert(await evaluate("document.querySelector('.included-items li')?.textContent.trim()==='1 edredom'"),'Composição');
  assert(await evaluate("document.documentElement.scrollWidth<=innerWidth"),'Overflow de produto');
  await shot(width+'-edredom');
  assert(await evaluate("document.querySelectorAll('.thumbnails button').length===5 && document.querySelector('.zoom-trigger img').srcset.includes('1448w')"),'Galeria ou srcset');
  await evaluate("document.querySelectorAll('.thumbnails button')[2].click()");
  await delay(200);
  assert(await evaluate("document.querySelector('.zoom-trigger img').src.includes('-023-2-2.jpg')"),'Foto dobrada');
  await shot(width+'-dobrado');
  await evaluate("document.querySelector('.zoom-trigger').click()");
  await delay(200);
  assert(await evaluate("!!document.querySelector('dialog[open] .zoom-image')?.naturalWidth"),'Zoom da galeria');
  await evaluate("document.querySelector('.close-zoom').click();document.querySelectorAll('.thumbnails button')[0].click()");
  const before=await evaluate("document.querySelector('.product-information app-product-price').textContent");
  await evaluate("document.querySelectorAll('.sizes button')[2].click()");
  assert(await evaluate("document.querySelector('.sizes button[aria-pressed=true]').textContent.includes('Queen')"),'Seleção Queen');
  assert(before!==await evaluate("document.querySelector('.product-information app-product-price').textContent"),'Preço não mudou');
  assert(await evaluate("getComputedStyle(document.querySelector('.sizes button[aria-pressed=true]')).borderTopWidth==='2px'"),'Borda do tamanho');
  await evaluate("document.querySelector('.sizes button[aria-pressed=true]').focus()");
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
  await evaluate("document.querySelector('app-shipping-quote button').click()");
  assert(await evaluate("!!document.querySelector('.quote-field #quote-cep-error')"),'CEP vazio');
  await evaluate("document.querySelector('#quote-cep').focus()");
  await send('Input.insertText',{text:'abc123'});
  assert(await evaluate("document.querySelector('#quote-cep').getAttribute('aria-invalid')==='true'"),'CEP incompleto');
  await shot(width+'-cep','.product-information app-shipping-quote');
  await evaluate("(()=>{const i=document.querySelector('#quote-cep');i.focus();i.select()})()");
  await send('Input.insertText',{text:'87502100'});
  assert(await evaluate("document.querySelector('#quote-cep').value==='87502-100'&&!document.querySelector('#quote-cep-error')"),'CEP válido e máscara');
  await activeTab(2);
  for(let i=0;i<20;i++){
    await delay(100);
    if(await evaluate("document.querySelectorAll('[role=tab]')[2].getAttribute('aria-selected')==='true'"))break;
  }
  assert(await evaluate("document.querySelectorAll('[role=tab]')[2].getAttribute('aria-selected')==='true'"),'Aba Cuidados não selecionada');
  assert(await evaluate("document.querySelector('.mat-mdc-tab-body-active .product-care svg')!==null"),'Cuidados SVG');
  assert(await evaluate("getComputedStyle(document.querySelector('.mdc-tab--active .mdc-tab-indicator__content--underline')).borderTopWidth==='4px'"),'Indicador da aba');
  if(width===390)assert(await evaluate("!document.querySelector('mat-tab-header')?.classList.contains('mat-mdc-tab-header-pagination-controls-enabled')"),'Abas mobile cortadas');
  await shot(width+'-cuidados','.product-description');
  await shot(width+'-recomendacoes','.recommendations');
  const zoom=".recommendation-actions button[title='Ampliar imagem']";
  const bounds=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(zoom)}).getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:bounds[0],y:bounds[1]});
  await evaluate(`document.querySelector(${JSON.stringify(zoom)}).click()`);await delay(250);
  assert(await evaluate("!!document.querySelector('.recommendation-preview[open] img')?.naturalWidth"),'Lightbox');
  if(width===1440||width===390)await shot(width+'-lightbox');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert(await evaluate("!document.querySelector('.recommendation-preview[open]')"),'Fechar lightbox com Esc');
  await send('Page.navigate',{url:'http://localhost:4200/categoria/travesseiros'});
  let count=0;
  for(let i=0;i<60&&count!==12;i++){await delay(250);count=await evaluate("document.querySelectorAll('app-product-card').length")}
  assert(count===12,'Catálogo Travesseiros incompleto');
  assert(await evaluate("!document.querySelector('.filter-panel')?.innerText.includes('Estampa')"),'Estampa em Travesseiros');
  assert(await evaluate("document.documentElement.scrollWidth<=innerWidth"),'Overflow Travesseiros');
  await shot(width+'-travesseiros','app-product-card');
  assert(await evaluate("!!document.querySelector('.filter-panel .facet button')"),'Filtro de dimensões');
  await evaluate("document.querySelector('.filter-toggle')?.click();document.querySelector('.filter-panel .facet button').click()");
  for(let i=0;i<30;i++){await delay(200);if(await evaluate("document.querySelectorAll('app-product-card').length>0&&document.querySelectorAll('app-product-card').length<12"))break;}
  assert(await evaluate("document.querySelectorAll('app-product-card').length>0&&document.querySelectorAll('app-product-card').length<12"),'Filtro não reduziu resultados');
  await evaluate("document.querySelector('.filter-panel .facet button[aria-pressed=true]').click()");
  for(let i=0;i<30;i++){await delay(200);if(await evaluate("document.querySelectorAll('app-product-card').length===12"))break;}
  const empty=await evaluate("Array.from(document.querySelectorAll('app-product-card')).find(x=>x.textContent.includes('Pluma Serena'))?.querySelector('.media').getAttribute('href')");
  assert(!!empty,'Produto sem estoque ausente');
  await send('Page.navigate',{url:'http://localhost:4200'+empty});
  for(let i=0;i<40;i++){await delay(200);if(await evaluate("!!document.querySelector('.availability--unavailable')"))break;}
  assert(await evaluate("document.querySelector('.purchase-button')?.disabled===true && !document.querySelector('.thumbnails')"),'Estoque zero ou galeria unitária');
  await shot(width+'-travesseiro-esgotado');
  console.log(width+' px: produto, tamanho, CEP, cuidados, lightbox e Travesseiros verificados');
 }
 }finally{ws.close()}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});

