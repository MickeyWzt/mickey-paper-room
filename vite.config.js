import { defineConfig } from 'vite';
import { readFileSync, statSync } from 'node:fs';
const loadingScreen=readFileSync(new URL('./src/loading-screen.html',import.meta.url),'utf8');
// Build-time byte weights stay accurate when a model is replaced or compressed.
const bootAssets=['room-v24-web.glb','player-v5-web.glb','room-v6-colliders.json','details-v24.glb','furnishings-v24.glb','entrance-v7/reference.png','entrance-v7/oak-pencil.png','entrance-v11/door-pencil-hd.png','entrance-v8/plaque.png','entrance-v8/botanical-card.png','entrance-v8/wooden-stool.png','entrance-v13/potted-plant-alpha.png'];
const bootWeights=Object.fromEntries(bootAssets.map(file=>[file,statSync(new URL('./public/assets/'+file,import.meta.url)).size]));
export default defineConfig({
  plugins:[{name:'paper-first-paint',transformIndexHtml:{order:'post',handler:html=>html.replace('<body data-phase="loading">','<body data-phase="loading" data-booting>'+loadingScreen.replace('__BOOT_WEIGHTS__',JSON.stringify(bootWeights)))}}],
  build:{rollupOptions:{input:{main:'index.html',room:'room-v3.html'},output:{manualChunks:{three:['three']}}}},
});
