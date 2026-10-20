# 知微 · 让预测逐步变准

通过真实计算和同一舞台中的交互变化，从零理解 AI 如何预测与学习。

在线体验：<https://pingjiang2013.github.io/tui/ai-design/>

目前包含四幕：

1. 根据已有记录做出预测。
2. 衡量预测差距，让电脑自己调整。
3. 追踪参数怎样影响平均差距，理解导数给出的方向。
4. 观察越过与摆动，理解学习率并实际训练。

可直接访问 [第二幕](https://pingjiang2013.github.io/tui/ai-design/#act-2)、[第三幕](https://pingjiang2013.github.io/tui/ai-design/#act-3)、[第四幕](https://pingjiang2013.github.io/tui/ai-design/#act-4)。

## 本地开发

无需安装第三方依赖。使用 Node.js 执行：

```sh
node verify-scene.mjs
node build-preview.mjs
```

使用 Python 启动静态预览：

```sh
python -m http.server 4180
```

打开 <http://127.0.0.1:4180/>。

## 文件与发布

- `minimal-learning-scene.html`：教学场景、样式和实际计算的源文件。
- `build-preview.mjs`：将场景构建为独立的 `index.html`。
- `verify-scene.mjs`：计算、交互状态与 SVG 几何检查；不代替真实浏览器的视觉验收。
- `act-*-story.md`、`next-acts-design.md`：教学设计与后续路线。

修改场景后重新运行检查与构建，并一起提交源文件和生成的 `index.html`。
GitHub Pages 从仓库的 `master` 分支根目录发布，本项目位于 `ai-design/` 子目录。

当前模型和训练在浏览器中实时计算。布局展开、拼合与均分用于解释同一组实际数值，动画过渡不会增加训练轮次。
