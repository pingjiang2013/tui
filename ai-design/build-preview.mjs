import {readFile,writeFile} from 'node:fs/promises';

const fragment=await readFile(new URL('./minimal-learning-scene.html',import.meta.url),'utf8');
const shell=await readFile(new URL('./site-shell.html',import.meta.url),'utf8');
const document=[
  '<!doctype html>',
  '<html lang="zh-CN">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<meta name="color-scheme" content="light dark">',
  '<meta name="description" content="通过真实计算与交互探索，从一次预测开始，逐步理解模型怎样学习、神经网络怎样计算，以及文字怎样参与预测。">',
  '<title>知微 · 从零理解 AI</title>',
  '<style>html{color-scheme:light dark;background:light-dark(#fffefb,#21221f)}body{margin:0;padding:24px;box-sizing:border-box}@media(max-width:480px){body{padding:12px}}</style>',
  '</head>',
  '<body>',fragment,shell,'</body>','</html>'
].join('\n');
await writeFile(new URL('./index.html',import.meta.url),document,'utf8');
console.log('Preview built: index.html');
