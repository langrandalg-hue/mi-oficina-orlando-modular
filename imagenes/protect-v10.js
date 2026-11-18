
/* Mi Oficina Orlando V10 — cifrado PDF local QPDF/WASM.
   El módulo se descarga desde jsDelivr; el contenido del PDF no se envía. */
const CDN='https://cdn.jsdelivr.net/npm/@soulehshaikh99/qpdf-wasm@0.4.1/dist/';
let enginePromise;
async function engine(){
  if(!enginePromise) enginePromise=(async()=>{
    const lib=await import(CDN+'qpdf.js');
    const factory=lib.default||lib.createModule;
    if(typeof factory!=='function') throw Error('El motor de cifrado no está disponible en este navegador.');
    return factory({locateFile:(name)=>CDN+name});
  })().catch(e=>{enginePromise=null;throw e});
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
    const code=q.callMain([inPath,'--encrypt','--user-password='+password,'--owner-password='+owner,'--bits=256','--',outPath]);
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
