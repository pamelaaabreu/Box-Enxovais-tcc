const {spawn}=require('node:child_process');
const fs=require('node:fs/promises');const path=require('node:path');const assert=require('node:assert/strict');
const run=require('./artifacts.cjs').createArtifacts('quality',process.env.BOX_E2E_EVIDENCE_DIR||'docs/validacao-visual/quality-2026-11-21',['regressao.json']);
const root=path.resolve(__dirname,'../..');
const cases=[['audit.cjs',{}],['product-crud.cjs',{PRODUCT_CRUD_BROWSER:'1'}],['admin-orders.cjs',{ADMIN_ORDERS_BROWSER:'1'}],['admin-orders-states.cjs',{ADMIN_ORDERS_BROWSER:'1'}],['admin-customers.cjs',{ADMIN_CUSTOMERS_BROWSER:'1'}],['dashboard.cjs',{DASHBOARD_BROWSER:'1'}],['reports.cjs',{DASHBOARD_BROWSER:'1',REPORTS_BROWSER:'1'}]];
const results=[];
async function exit(child){return new Promise(resolve=>child.once('close',code=>resolve(code)));}
(async()=>{const selected=process.env.BOX_E2E_SUITE?cases.filter(([suite])=>suite===process.env.BOX_E2E_SUITE):cases;assert.ok(selected.length,'Unknown E2E suite');for(const [suite,flags]of selected){
 const env={...process.env,AUDIT_BROWSER:'1',CART_TEST_LOCAL:'1',DASHBOARD_BROWSER:'',REPORTS_BROWSER:'',PRODUCT_CRUD_BROWSER:'',ADMIN_ORDERS_BROWSER:'',ADMIN_CUSTOMERS_BROWSER:'',...flags};
 await fs.rm(path.join(root,'backend/audit-browser.stop'),{force:true});
 const server=spawn('go',['test','./src/routes','-run','^TestBrowserAuditServer$','-count=1','-v','-timeout','40m'],{cwd:path.join(root,'backend'),env,windowsHide:true});
 let log='';let readyResolve,readyReject;const ready=new Promise((a,b)=>{readyResolve=a;readyReject=b});
 for(const stream of [server.stdout,server.stderr])stream.on('data',data=>{log+=data; if(log.includes('ISOLATED_BROWSER_READY'))readyResolve();});
 server.once('error',readyReject);server.once('close',code=>{if(!log.includes('ISOLATED_BROWSER_READY'))readyReject(new Error('Isolated server failed: '+code));});
 const finished=exit(server);let code=1;
 try{await ready;const child=spawn(process.execPath,[path.join(__dirname,suite)],{cwd:root,env:{...process.env,BOX_E2E_KEEP_EVIDENCE:'0',AUDIT_FRONTEND_URL:'http://127.0.0.1:4206'},windowsHide:true});let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{output+=data;process.stdout.write(data)});code=await exit(child);await fs.writeFile(run.file(suite+'.log'),output);}
 finally{if(server.exitCode===null)await fs.writeFile(path.join(root,'backend/audit-browser.stop'),'stop');const serverCode=await finished;await fs.rm(path.join(root,'backend/audit-browser.stop'),{force:true});await fs.writeFile(run.file(suite+'.server.log'),log);const clean=serverCode===0&&log.includes('PRIMARY_COMMERCIAL_STATE_UNCHANGED')&&log.includes('ISOLATED_SCHEMA_REMOVED');results.push({suite,passed:code===0&&clean,exitCode:code,isolatedSchemaRemoved:clean,principalUnchanged:clean});console.log('SUITE_RESULT',JSON.stringify(results.at(-1)));}
 }
 await fs.writeFile(run.file('regressao.json'),JSON.stringify(results,null,2));assert.ok(results.every(r=>r.passed),'Há cenários pendentes');
})().catch(async e=>{console.error(e.message);await fs.writeFile(run.file('regressao.json'),JSON.stringify(results,null,2));process.exitCode=1;});
