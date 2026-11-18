
/* Mi Oficina Orlando V10 — cifrado PDF local QPDF/WASM.
   El módulo se descarga desde jsDelivr; el contenido del PDF no se envía. */
const SOURCES=[
  'https://cdn.jsdelivr.net/npm/@soulehshaikh99/qpdf-wasm@0.4.1/dist/',
  'https://unpkg.com/@soulehshaikh99/qpdf-wasm@0.4.1/dist/'
];
let enginePromise;
async function engine(){
 if(!enginePromise) enginePromise=(async()=>{
  const failures=[];
  for(const base of SOURCES){
   try{
    const mod=await import(base+'qpdf.js');
    const factory=mod.default||mod.createModule||mod.Module||mod.createQPDFModule;
    if(typeof factory!=='function'){
      failures.push(new URL(base).hostname+': exportaciones disponibles '+Object.keys(mod).join(', '));
      continue;
    }
    const q=await factory({locateFile:(name)=>base+name,noInitialRun:true});
    if(!q||!q.FS||typeof q.callMain!=='function'){
      failures.push(new URL(base).hostname+': módulo cargado sin FS/callMain');continue;
    }
    return q;
   }catch(err){failures.push(new URL(base).hostname+': '+String(err?.message||err).slice(0,220));}
  }
  throw Error('Motor QPDF no disponible. Diagnóstico: '+failures.join(' | '));
 })().catch(err=>{enginePromise=null;throw err});
 return enginePromise;
}
function safeName(name){return (name||'documento.pdf').replace(/\.pdf$/i,'').replace(/[\\/:*?"<>|]/g,'_')+'_protegido.pdf'}
window.orlandoProtectPdf=async function(file,password,confirm){
  if(!file)throw Error('Selecciona un PDF.');
  if(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf')throw Error('El archivo debe ser un PDF.');
  if(!password||password.length<8)throw Error('Utiliza una contraseña de al menos 8 caracteres.');
  if(password!==confirm)throw Error('Las contraseñas no coinciden.');
  const q=await engine();
  const nonce=crypto.randomUUID().replace(/-/g,'');
  const inPath='/in_'+nonce+'.pdf',outPath='/out_'+nonce+'.pdf';
  try{
    q.FS.writeFile(inPath,new Uint8Array(await file.arrayBuffer()));
    // Contraseña de propietario distinta y aleatoria: no permite apertura sin la del usuario.
    const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);
    const owner=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    const code=q.callMain(['--encrypt',password,owner,'256','--',inPath,outPath]);
    if(code!==0)throw Error('QPDF no pudo cifrar este documento (código '+code+').');
    const output=q.FS.readFile(outPath);
    if(!output||output.length<100)throw Error('El archivo cifrado está vacío.');
    // Verificación real con QPDF: la contraseña correcta permite inspeccionar el documento.
    const valid=q.callMain(['--password='+password,'--check',outPath]);
    if(valid!==0&&valid!==3)throw Error('No se pudo verificar la apertura del PDF protegido.');
    const out=new Blob([output],{type:'application/pdf'});
    window.saveResult(out,safeName(file.name));
    document.getElementById('protectPassword').value='';
    document.getElementById('protectConfirm').value='';
    return true;
  } finally {
    for(const path of [inPath,outPath])try{q.FS.unlink(path)}catch{}
  }
};
document.addEventListener('change',e=>{
  if(e.target?.id==='protectShow'){
    for(const id of ['protectPassword','protectConfirm']){
      const el=document.getElementById(id);
      if(el)el.type=e.target.checked?'text':'password';
    }
  }
});
