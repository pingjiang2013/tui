# 知微 · Inside AI

用真实计算、逐步追踪和交互实验，从零构建一个小型语言模型。

初稿在线体验：<https://pingjiang2013.github.io/tui/ai-lab-preview/>。
极简交互版在独立地址：<https://pingjiang2013.github.io/tui/ai-design/>。

包含七部分 24 节中文课程、六个实验室、理解检查、本地学习记录、可编辑 Python 和完整 Transformer 的训练与生成。

## 本地启动

需要 Node.js 22（或兼容的更新版本）。在此目录运行：

```powershell
npm install
npm run dev
```

打开终端显示的地址，通常为 http://127.0.0.1:5173/ 。无需后端或模型 API 密钥。首次打开实验会从固定版本的 jsDelivr CDN 加载 Pyodide 0.27.7 和 NumPy，不能离线首次启动计算环境。Google Fonts 为可选字体，失败时使用系统字体。

```powershell
npm run build
npm run preview
```

`dist/` 可以放在静态服务器上，支持子目录部署；路由使用 URL 的 `#` 部分，无需服务器重写规则。不要用 `file://` 直接打开，后台线程与资源加载需要 HTTP。

## GitHub Pages 发布

```powershell
npm run build:pages
```

这会重建仓库根目录下专用的 `ai-lab-preview/` 静态发布目录。将源码与该目录一起提交到仓库的 `master` 分支，由现有 GitHub Pages 发布。计算线程、Python 引擎和模型检查点都包含在构建中；Pyodide 与 NumPy 首次运行仍需从 CDN 下载。

## 实现与数学

- `src/curriculum.ts`：24 节课的目标、动机、实验任务、解释、公式与理解检查。
- `src/Experiment.tsx`：课程和实验室共用的实验界面。
- `public/python/engine.py`：唯一的数值实现，原生 Python 与网页直接使用同一份源码。包含自动微分、广播梯度、Embedding 查表、LayerNorm、多头因果注意力和完整训练。
- `src/python.worker.ts`：模块后台线程；课程模型和代码练习各自运行，任意代码超时后终止练习线程。

可视化、公式中的实际数值和单步计算记录都来自 Python 返回的同一个计算结果。回放展示实际计算记录。显示值舍入，内部为 float64。教学 Attention 使用手工二维参数，并明确标出；最终模型使用 32 维真实可训练表示。

神经元实验为便于追踪，更新第一隐藏节点的 w、b，其余连接固定。最终 Transformer 更新全部参数。局部二维 Transformer 示范块与最终 Pre-LN 模型的归一化位置不同，课程已说明这一边界。

## 最终模型

2 层、4 头、32 维、前馈宽度 64、上下文 32 字符。字符级切分是教学简化。原创受控中文语料内置于源码，检查点附词表、全部权重、随机数状态和训练来源；预训练参数与现场训练分别标注。

预训练模型在 1200 步中明显记住了小语料，保留片段表现远弱于训练片段。这是过拟合的真实表现，不声称通用语言能力。生成始终实时运行，可单步抽样再追加字符。

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe scripts/prepare_checkpoint.py
```

## 检查

```powershell
npm test
npm run typecheck
.\.venv\Scripts\python.exe -m unittest discover -s tests -p test_*.py
node scripts/check-wasm.mjs
node scripts/check-pages.mjs
npm run build
```

数值检查包含有限差分梯度、因果隔离、所有参数家族、真实训练下降、检查点恢复和随机抽样复现。WebAssembly 检查执行与页面相同的 Python/NumPy 运行时，并核对原生检查点。全页面检查为服务端渲染，不代替浏览器布局和事件验收。

实际结果及未验证项见 `evidence/verification.md`。没有实际浏览器证据时，不声称已完成 Chrome 或手机视觉验收。

进度保存在 localStorage，大实验和模型保存在 IndexedDB。清除浏览器站点数据会清除这些记录；可以通过页面导出。无需账号，不向外部模型服务发送输入。
