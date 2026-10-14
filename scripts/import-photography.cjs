// Produce website derivatives only. Originals are never modified.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const sharp=require('sharp');
const source=process.argv[2],root=path.resolve(__dirname,'..'),out=path.join(root,'public/assets/photography-v1');
if(!source)throw Error('Provide a photo source directory');
fs.mkdirSync(out,{recursive:true});
(async()=>{const rows=[],audit=[];for(const name of fs.readdirSync(source).filter(n=>/\.(jpg|jpeg|png)$/i.test(n)).sort()){
 const input=path.join(source,name),bytes=fs.readFileSync(input),hash=crypto.createHash('sha256').update(bytes).digest('hex'),id=hash.slice(0,12),date=name.match(/IMG_(\d{4})(\d{2})(\d{2})/),meta=await sharp(input).metadata();
 const row={id,filename:name,date:date?date.slice(1).join('-'):'',label:date?date.slice(1).join('.'):'摄影',width:meta.autoOrient.width,height:meta.autoOrient.height};
 for(const [kind,size,quality] of [['thumb',320,74],['preview',1600,83],['full',2880,88]]){const file=id+'-'+kind+'.webp',dest=path.join(out,file);if(!fs.existsSync(dest))await sharp(input).rotate().resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).webp({quality,effort:5}).toFile(dest);row[kind]='/assets/photography-v1/'+file;}
 rows.push(row);audit.push({filename:name,sha256:hash,originalBytes:bytes.length});console.log(rows.length+' '+name);
 }
 fs.mkdirSync(path.join(root,'src/content'),{recursive:true});fs.writeFileSync(path.join(root,'src/content/photos.json'),JSON.stringify(rows,null,2));
 const evidence=path.resolve(process.argv[3]||path.join(root,'.local','photo-import'));fs.mkdirSync(evidence,{recursive:true});fs.writeFileSync(path.join(evidence,'photo-originals.json'),JSON.stringify(audit,null,2));
 const tiles=[];for(let i=0;i<rows.length;i++){const buf=await sharp(path.join(root,'public',rows[i].thumb)).resize(180,140,{fit:'contain',background:'#eee'}).png().toBuffer();tiles.push({input:buf,left:(i%8)*190+5,top:Math.floor(i/8)*165+5});const text=Buffer.from('<svg width="180" height="20"><text x="4" y="15" font-size="12">'+String(i+1).padStart(2,'0')+' '+rows[i].date+'</text></svg>');tiles.push({input:text,left:(i%8)*190+5,top:Math.floor(i/8)*165+146});}
 await sharp({create:{width:1520,height:Math.ceil(rows.length/8)*165,channels:3,background:'#fff'}}).composite(tiles).png().toFile(evidence+'/contact-sheet.png');
 console.log(JSON.stringify({count:rows.length,originalBytes:audit.reduce((s,r)=>s+r.originalBytes,0),websiteBytes:fs.readdirSync(out).reduce((s,f)=>s+fs.statSync(path.join(out,f)).size,0)}));
})();
