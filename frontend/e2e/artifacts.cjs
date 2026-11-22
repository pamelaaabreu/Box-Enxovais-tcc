const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
function within(parent,target){return target.startsWith(parent+path.sep);}
function createArtifacts(suite,destination,keep=[]){
 if(!/^[a-z0-9-]+$/.test(suite))throw new Error('Invalid artifact suite');
 const parent=path.join(root,'.artifacts','e2e');fs.mkdirSync(parent,{recursive:true});
 if(!within(root,fs.realpathSync(parent)))throw new Error('Artifact directory outside repository');
 const final=path.resolve(root,destination);
 if(!within(path.join(root,'docs','validacao-visual'),final))throw new Error('Evidence directory outside documentation');
 for(const name of keep)if(path.basename(name)!==name||name==='..')throw new Error('Invalid evidence filename');
 const directory=fs.mkdtempSync(path.join(parent,suite+'-'));
 const file=name=>{const target=path.resolve(directory,name);if(!within(directory,target))throw new Error('Artifact path outside run');return target;};
 let closed=false;
 function finish(){
  if(closed)return;closed=true;
  try{
   if(process.env.BOX_E2E_KEEP_EVIDENCE==='1'&&!process.exitCode){
    fs.mkdirSync(final,{recursive:true});
    if(!within(path.join(root,'docs'),fs.realpathSync(final)))throw new Error('Evidence directory outside repository');
    for(const name of keep){const source=file(name);if(fs.existsSync(source)&&fs.statSync(source).isFile())fs.copyFileSync(source,path.join(final,name));}
   }
  }finally{if(within(parent,directory)&&fs.existsSync(directory)&&!fs.lstatSync(directory).isSymbolicLink())fs.rmSync(directory,{recursive:true,force:true});}
 }
 process.once('exit',finish);
 return {directory,file,finish};
}
module.exports={createArtifacts};
