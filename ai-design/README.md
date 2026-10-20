# 知微 · 让预测逐步变准

通过真实计算和同一舞台中的交互变化，从零理解 AI 如何预测与学习。

在线体验：<https://pingjiang2013.github.io/tui/ai-design/>

目前包含十二幕：

1. 根据已有记录做出预测。
2. 衡量预测差距，让电脑自己调整。
3. 追踪参数怎样影响平均差距，理解导数给出的方向。
4. 观察越过与摆动，理解学习率并实际训练。
5. 尝试对齐新记录，再通过整体平移理解第二个参数。
6. 点击参数数字让它增加1，直接观察预测和差距，再理解梯度与共同更新。
7. 转动同一条预测线，观察平均差距不变，再提取差距并展开面积，理解平方评分的取舍。
8. 从窄条面积理解平方评分的导数，再实际训练两个参数。
9. 用共有色块对齐相消，直观看见相邻预测之差为何相同，理解直线模型的局限。
10. 为直线加入补充项，观察一处改善怎样弄坏另一处。
11. 将负值停在0，看到ReLU如何让预测规则出现拐点。
12. 跟踪乘加与激活，理解第一个神经元，并预测没有记录的输入。

可直接访问 [第二幕](https://pingjiang2013.github.io/tui/ai-design/#act-2)、[第三幕](https://pingjiang2013.github.io/tui/ai-design/#act-3)、[第四幕](https://pingjiang2013.github.io/tui/ai-design/#act-4)、[第五幕](https://pingjiang2013.github.io/tui/ai-design/#act-5)。

新增入口：[第六幕](https://pingjiang2013.github.io/tui/ai-design/#act-6)、[第七幕](https://pingjiang2013.github.io/tui/ai-design/#act-7)、[第八幕](https://pingjiang2013.github.io/tui/ai-design/#act-8)、[第九幕](https://pingjiang2013.github.io/tui/ai-design/#act-9)。

神经元分支：[第十幕](https://pingjiang2013.github.io/tui/ai-design/#act-10)、[第十一幕](https://pingjiang2013.github.io/tui/ai-design/#act-11)、[第十二幕](https://pingjiang2013.github.io/tui/ai-design/#act-12)。

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

平方评分训练从相同参数出发，可比较学习率0.05与0.25。自动继续每次推进20个实际轮次，保存每轮并支持逐轮回退；平均平方差不超过0.01时停止，不将参数吸附到答案。第九幕最多执行3000轮真实更新，并通过相邻增量证明直线无法完全拟合新记录。

第十至十二幕手动构造一个ReLU分支，所有输出实时计算；尚未训练这个神经元的参数。第2.5秒的125明确标为尚无记录核对的预测。运算中的数轴移动只是教学过渡，不代表额外训练或算法输出。
