const fs=require('fs'),vm=require('vm'),assert=require('assert');
const asset=fs.readFileSync('app/src/main/assets/index.html','utf8');
const start=asset.indexOf('function computePhotoCrop('),end=asset.indexOf('\nfunction applyPhotoCrop(n)',start);
assert(start>=0&&end>start,'Calcul de recadrage absent');
const geometry=vm.runInNewContext('('+asset.slice(start,end)+')',{});
let scenarios=0;
for(const [fw,fh] of [[200,230],[120,110],[600,390]]){
 for(const [iw,ih] of [[500,950],[1000,550],[800,800]]){
  for(const zoom of [100,125,200,300]){
   scenarios++;
   const c=geometry(iw,ih,fw,fh,zoom,50,50);
   const x0=geometry(iw,ih,fw,fh,zoom,0,50),x100=geometry(iw,ih,fw,fh,zoom,100,50);
   const y0=geometry(iw,ih,fw,fh,zoom,50,0),y100=geometry(iw,ih,fw,fh,zoom,50,100);
   assert(c.width>=fw&&c.height>=fh,'image ne couvre pas le cadre');
   assert(Math.abs(c.width/c.height-iw/ih)<1e-9,'ratio image modifié');
   assert(x0.left>x100.left&&y0.top>y100.top,'curseur inactif');
   for(const a of [c,x0,x100,y0,y100]){
    assert(a.left<=0&&a.top<=0&&a.left+a.width>=fw&&a.top+a.height>=fh,'bord vide');
   }
   assert(Math.abs(c.left+.5*(c.width-fw))<1e-8,'centrage horizontal incorrect');
   assert(Math.abs(c.top+.5*(c.height-fh))<1e-8,'centrage vertical incorrect');
  }
 }
}
assert(geometry(0,10,100,100,100,50,50)===null,'image invalide');
console.log('PASS: '+scenarios+' cas photo, centrage XY, zoom, ratios et absence de bords vides');
