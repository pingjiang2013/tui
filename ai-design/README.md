# 知微 · 让预测逐步变准

通过真实计算和同一舞台中的交互变化，从零理解 AI 如何预测与学习。

在线体验：<https://pingjiang2013.github.io/tui/ai-design/>

目前包含二十八幕，文字部分已实现配对、编号、多维预测表示、Softmax概率分配、负对数损失、数值近似更新与沿共享分母追踪解析梯度：

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
11. 在常函数0与直线之间逐点取较大值，再把补充函数逐点叠到原函数上，理解ReLU与拐点。
12. 点击数字改变权重和偏置，观察整条直线及完整预测的变化，理解第一个神经元。
13. 将输出权重明确设为10，点击增加1，再让电脑通过平方评分实际训练这个权重。
14. 观察变化经过ReLU与输出放大，展开局部影响为什么相乘，再实际训练偏置。
15. 在同一函数图上比较ReLU前后的两个权重；先看一轮，再一键连续训练三个参数，保留暂停、单步和逐轮回退。
16. 新增第4秒观测，比较30、50、30的增量，再用第二个ReLU分支的负贡献形成第二次转折。
17. 两个输出权重从10和0开始，共同学习贡献大小，观察负权重如何由误差产生；两次引导更新后，一键训练到停止。
18. 沿用学到的两个输出权重，只训练偏置；观察两个启动位置沿相反方向移动，以及正、负贡献区域如何变化。
19. 从函数交点取激活值，将正负贡献逐点叠到预测上，把同一条误差展开为平方；点击参数直接观察函数、预测与平方误差变化，缩回原值读取局部影响，再真实共同训练六个分支参数。
20. 区分已有记录与尚无答案可核对的预测，再把第一层的整条输出函数送入第二层，观察翻转、平移和ReLU的组合；改前层影响两层，改后层只影响后层。
21. 用真实的1→3→2→1网络联动节点与整条函数：拖动输入观察计算，临时让单个节点输出0；还可展开每个神经元，让输入经权重变成贡献、首尾相接、加偏置并得到输出，再对比局部参数怎样改变整个函数。
22. 让同一结构的17个参数共同学习五条固定记录：先实际更新，再回看旧参数的五次预测、两条路径的影响相加和记录平均；连续真实训练，支持暂停、单步、逐轮回退，并展开当前轮的节点计算。
23. 在同一句话上移动分界，真实生成前文与下一字答案；在原字块中展开编号，标出同字同编号的位置，再更换一套可逆编号，观察原句与预测任务保持不变。
24. 同时观察三种字的用法线索，再移动共享表示影响两个上下文的真实分数；数轴连续展开为平面，增加独立调整方向；一起旋转表示与读取方向，展示坐标改变而分数不变。再用编号查找同一行表示，保持已有编辑与分数。数值手工设置，尚未训练文字表示。

25. 沿用当前表示与原句答案，把三个实际分数变成共同分配的概率；用指数曲线追踪正长度，再将同一批线段首尾拼接、整体对齐100%，按需展开Softmax数学。尚未训练文字模型。

26. 从全部可能结果100%的方块开始，按第一句、第二句的实际概率逐层生成结果表，再找到原文对应格子；先明确评分要求，再累计损失贡献，最后用指数关系验证。两句共同预测与总损失保持实时联动。

可直接访问 [第二幕](https://pingjiang2013.github.io/tui/ai-design/#act-2)、[第三幕](https://pingjiang2013.github.io/tui/ai-design/#act-3)、[第四幕](https://pingjiang2013.github.io/tui/ai-design/#act-4)、[第五幕](https://pingjiang2013.github.io/tui/ai-design/#act-5)。

新增入口：[第六幕](https://pingjiang2013.github.io/tui/ai-design/#act-6)、[第七幕](https://pingjiang2013.github.io/tui/ai-design/#act-7)、[第八幕](https://pingjiang2013.github.io/tui/ai-design/#act-8)、[第九幕](https://pingjiang2013.github.io/tui/ai-design/#act-9)。

神经元分支：[第十幕](https://pingjiang2013.github.io/tui/ai-design/#act-10)、[第十一幕](https://pingjiang2013.github.io/tui/ai-design/#act-11)、[第十二幕](https://pingjiang2013.github.io/tui/ai-design/#act-12)。

输出权重训练：[第十三幕](https://pingjiang2013.github.io/tui/ai-design/#act-13)。

影响穿过激活与偏置训练：[第十四幕](https://pingjiang2013.github.io/tui/ai-design/#act-14)。

直接进入链式法则：[用共享位置刻度连接两幅函数图](https://pingjiang2013.github.io/tui/ai-design/#act-14-chain)。

整个神经元共同训练：[第十五幕](https://pingjiang2013.github.io/tui/ai-design/#act-15)，或[直接进入训练](https://pingjiang2013.github.io/tui/ai-design/#act-15-train)。

为什么需要第二个神经元：[第十六幕](https://pingjiang2013.github.io/tui/ai-design/#act-16)，或[直接拼合第二个分支](https://pingjiang2013.github.io/tui/ai-design/#act-16-add)。

让两个分支自己协调：[第十七幕](https://pingjiang2013.github.io/tui/ai-design/#act-17)，或[直接进入共同训练](https://pingjiang2013.github.io/tui/ai-design/#act-17-train)。

让分支学习从哪里启动：[第十八幕](https://pingjiang2013.github.io/tui/ai-design/#act-18)，或[直接进入位置学习](https://pingjiang2013.github.io/tui/ai-design/#act-18-train)。

完整小网络训练循环：[第十九幕](https://pingjiang2013.github.io/tui/ai-design/#act-19)，或[反向追踪](https://pingjiang2013.github.io/tui/ai-design/#act-19-back)、[合并观测](https://pingjiang2013.github.io/tui/ai-design/#act-19-batch)、[六参数训练](https://pingjiang2013.github.io/tui/ai-design/#act-19-train)。

收拢训练与层间组合：[第二十幕](https://pingjiang2013.github.io/tui/ai-design/#act-20)，或[直接进入层间组合实验](https://pingjiang2013.github.io/tui/ai-design/#act-20-compose)。实验使用独立的手工小模型，未继续训练原模型；随后进入整张网络的观察。

看整张网络：[第二十一幕](https://pingjiang2013.github.io/tui/ai-design/#act-21)，或[直接操作网络](https://pingjiang2013.github.io/tui/ai-design/#act-21-network)、[临时让节点输出0](https://pingjiang2013.github.io/tui/ai-design/#act-21-remove)。使用手工参数，全部节点和曲线实时计算。

查看权重与偏置：[展开第二层上方节点](https://pingjiang2013.github.io/tui/ai-design/#act-21-node)。详情替换下方函数图，保留上方网络；可切换查看所有六个神经元，输出节点按真实结构不加ReLU。

整张网络一起学习：[第二十二幕](https://pingjiang2013.github.io/tui/ai-design/#act-22)，或[直接进入训练](https://pingjiang2013.github.io/tui/ai-design/#act-22-train)、[查看两条路径如何合并影响](https://pingjiang2013.github.io/tui/ai-design/#act-22-paths)。五条记录固定，全部17个参数实际更新，记录每轮历史。

从文字得到预测任务：[第二十三幕](https://pingjiang2013.github.io/tui/ai-design/#act-23)，或[移动输入与答案的分界](https://pingjiang2013.github.io/tui/ai-design/#act-23-pairs)、[查看编号](https://pingjiang2013.github.io/tui/ai-design/#act-23-ids)、[换一套编号](https://pingjiang2013.github.io/tui/ai-design/#act-23-renumber)。这里真实生成训练配对并编码、解码，尚未运行文字模型预测或训练。

从用法理解表示：[第二十四幕](https://pingjiang2013.github.io/tui/ai-design/#act-24)，或[用法线索](https://pingjiang2013.github.io/tui/ai-design/#act-24-usage)、[一维表示](https://pingjiang2013.github.io/tui/ai-design/#act-24-dimensions)、[展开二维](https://pingjiang2013.github.io/tui/ai-design/#act-24-data)、[转动表示与读取方向](https://pingjiang2013.github.io/tui/ai-design/#act-24-capacity)、[同一个字查找同一行](https://pingjiang2013.github.io/tui/ai-design/#act-24-shared)。六个分数来自真实点积，不是概率；初值与读取方向手工指定，尚未训练。

从分数得到概率：[第二十五幕](https://pingjiang2013.github.io/tui/ai-design/#act-25)，或[共同分配](https://pingjiang2013.github.io/tui/ai-design/#act-25-distribution)、[指数转换](https://pingjiang2013.github.io/tui/ai-design/#act-25-convert)、[拼接与归一化](https://pingjiang2013.github.io/tui/ai-design/#act-25-normalize)。表示、分数和概率实时联动，保留上一幕编辑与旋转状态；当前分配并非真实世界频率。

从原文构造评分：[第二十六幕](https://pingjiang2013.github.io/tui/ai-design/#act-26)，或[方块逐层生成](https://pingjiang2013.github.io/tui/ai-design/#act-26-records)、[评分设计要求](https://pingjiang2013.github.io/tui/ai-design/#act-26-design)、[逐句累计](https://pingjiang2013.github.io/tui/ai-design/#act-26-ruler)、[指数验证](https://pingjiang2013.github.io/tui/ai-design/#act-26-inverse)、[当前损失联动](https://pingjiang2013.github.io/tui/ai-design/#act-26-curve)。先说明目标与评分选择，再引入函数及其验证。

27. 拖动狗的表示，直接观察九格预测里的原文概率面积变化；再逐个位置描出真实总损失曲线，放大局部观察两侧试算的坡度，最后让同一个点沿曲线完成一次真实更新。支持撤回、重做与历史回看。

让原文改变表示：[第二十七幕](https://pingjiang2013.github.io/tui/ai-design/#act-27)，或[移动表示](https://pingjiang2013.github.io/tui/ai-design/#act-27-probe)、[描出损失曲线](https://pingjiang2013.github.io/tui/ai-design/#act-27-rate)、[正式移动一次](https://pingjiang2013.github.io/tui/ai-design/#act-27-update)。仅训练一个分量，梯度为两侧数值近似，学习率1。曲线采样用于观察，不是训练的搜索过程；点击正式执行才写入共享表示，随后展开这一步的实际变化。

28. 从损失的两个端点解释同一次移动为何帮助狗却伤害猫；用同一总量刻度连接指数与对数计算，从局部比例得到P狗，再逐点合并两句损失及其影响，以解析梯度真实更新一个分量。

从当前计算直接追踪影响：[第二十八幕](https://pingjiang2013.github.io/tui/ai-design/#act-28)，或[找到损失端点](https://pingjiang2013.github.io/tui/ai-design/#act-28-source)、[移动端点](https://pingjiang2013.github.io/tui/ai-design/#act-28-endpoints)、[衔接两段计算](https://pingjiang2013.github.io/tui/ai-design/#act-28-chain)、[汇合两句影响](https://pingjiang2013.github.io/tui/ai-design/#act-28-merge)、[解析梯度更新](https://pingjiang2013.github.io/tui/ai-design/#act-28-update)。沿用当前共享表示，仅正式执行才保存；未训练整张表示表。

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

第十至十二幕手动构造一个ReLU分支，所有输出实时计算；尚未训练这个神经元的参数。权重1→2改变斜率，偏置−2→−1改变激活前的统一偏移；两个独立实验都展示对完整预测的影响。第2.5秒的125明确标为尚无记录核对的预测。函数取较大值与贡献面积叠加的过渡用于解释计算，不代表训练。

第十三幕固定内部权重1、偏置−2，只训练输出权重。明确从10开始，手动10→11后接续训练；平均平方差的解析导数与学习率0.5决定每次真实更新。完整函数和固定比例放大的第三条差距同步变化。首次单步后开放连续调整与暂停，保存每轮供回退，平均平方差不超过0.001时停止，不吸附到20。

第十四幕另开偏置实验，固定内部权重1、输出权重20。点击−2.5→−2.4，用变化窄带展示整条函数怎样经过ReLU，再重放到预测图，第三条140→142。随后使用解析链式导数和学习率0.00125真实训练偏置，支持暂停、逐轮回退与单元内重做。ReLU拐点处不编造唯一导数，未激活部分的局部影响为0。内部权重及三参数共同训练接在第十五幕；多层网络尚未实现。

偏置训练之前绘制“偏置→预测位置”和“预测位置→平均平方误差”两幅真实函数图，各自标明单位。通过旋转、移动同一段厘米刻度，解释前一步的输出为何是后一步的输入，再将两段变化比相乘。初始试算±0.05让位置区间清楚可见，随后让两点靠近，区分有限区间变化比与当前位置的导数。所有试算与刻度移动都不修改训练历史。
