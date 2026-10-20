import {readFile,writeFile} from 'node:fs/promises';

const fragment=await readFile(new URL('./minimal-learning-scene.html',import.meta.url),'utf8');
const document=[
  '<!doctype html>',
  '<html lang="zh-CN">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<meta name="color-scheme" content="light dark">',
  '<meta name="description" content="从已有记录做出预测，追踪参数怎样影响误差，再通过越过与摆动理解导数、学习率和训练。">',
  '<title>知微 · 让预测逐步变准</title>',
  '<style>html{color-scheme:light dark;background:light-dark(#fffefb,#21221f)}body{margin:0;padding:24px;box-sizing:border-box}@media(max-width:480px){body{padding:12px}}</style>',
  '</head>',
  '<body>',fragment,'</body>','</html>'
].join('\n');
await writeFile(new URL('./index.html',import.meta.url),document,'utf8');
console.log('Preview built: index.html');
