const path = require('node:path');
const fs = require('node:fs');
const selectors = require('postcss-selector-parser');
function sources(directory) {
 return fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry => {
  const file=path.join(directory,entry.name);
  return entry.isDirectory()?sources(file):/\.(html|ts)$/.test(file)?[file]:[];
 });
}
module.exports = () => ({
 postcssPlugin:'box-bootstrap-css',
 Once(root,{result}) {
  const source=(result.opts.from||'').replaceAll('\\','/');
  if(!source.endsWith('/bootstrap/dist/css/bootstrap.min.css'))return;
  const workspace=path.resolve(__dirname,'../..');
  const files=sources(path.join(workspace,'src'));
  const tokens=new Set(files.flatMap(file=>fs.readFileSync(file,'utf8').match(/[a-zA-Z0-9_-]+/g)||[]));
  for(const file of files)result.messages.push({type:'dependency',plugin:'box-bootstrap-css',file});
  const dynamic=/^(carousel|dropdown|active$|show$|slide$|fade$|collaps)/;
  root.walkRules(rule=>{
   const kept=rule.selectors.filter(selector=>{
    if(/:(is|where|has)\(/.test(selector))return true;
    let used=true;
    selectors(ast=>ast.walkClasses(node=>{
     for(let parent=node.parent;parent;parent=parent.parent)if(parent.type==='pseudo'&&parent.value===':not')return;
     if(!tokens.has(node.value)&&!dynamic.test(node.value))used=false;
    })).processSync(selector);
    return used;
   });
   if(kept.length)rule.selectors=kept;else rule.remove();
  });
 }
});
module.exports.postcss=true;
