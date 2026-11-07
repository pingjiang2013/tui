# 知微 · 让预测逐步变准

通过真实计算和同一舞台中的交互变化，从零理解 AI 如何预测与学习。

在线体验：<https://pingjiang2013.github.io/tui/ai-design/>

第四十幕（`#act-40`、`#act-40-values`）：沿用原表示作为教学用V，按真实权重缩放副本、逐分量组合，可切换读取位置复用同一套V。计算与Chrome三种宽度检查通过。

默认入口是极简主页。“从头开始”进入第一幕；左上三横杠打开侧栏目录，按三段学习路径跳转现有50幕。支持Esc、点击遮罩和关闭按钮收起目录，目录内可返回首页。同页跳转保留已训练的模型；刷新页面仍按原课程规则重新初始化，不宣称保存学习进度。

主页和目录源文件为 `site-shell.html`，由 `build-preview.mjs` 与课程源文件一起生成独立的 `index.html`。原有章节及子章节锚点保持可用。

目前包含五十幕，文字部分已实现配对、编号、多维预测表示、Softmax概率分配、负对数损失、解析梯度，以及三个候选的共同学习：

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

27. 拖动狗的表示，直接观察九格预测里的原文概率面积变化；再逐个位置描出真实总损失曲线，放大局部观察两侧试算的斜率，最后让同一个点沿曲线完成一次真实更新。支持撤回、重做与历史回看。

让原文改变表示：[第二十七幕](https://pingjiang2013.github.io/tui/ai-design/#act-27)，或[移动表示](https://pingjiang2013.github.io/tui/ai-design/#act-27-probe)、[描出损失曲线](https://pingjiang2013.github.io/tui/ai-design/#act-27-rate)、[正式移动一次](https://pingjiang2013.github.io/tui/ai-design/#act-27-update)。仅训练一个分量，梯度为两侧数值近似，学习率1。曲线采样用于观察，不是训练的搜索过程；点击正式执行才写入共享表示，随后展开这一步的实际变化。

28. 从总概率100%的面积分配出发，先只扩大狗，再把全体统一缩回100%；看清猫为什么受损，再计算新增面积及缩回的代价，得到两句的解析影响并真实更新。

从概率竞争理解反馈：[第二十八幕](https://pingjiang2013.github.io/tui/ai-design/#act-28)，或[拖动概率面积](https://pingjiang2013.github.io/tui/ai-design/#act-28-source)、[先扩大再缩回](https://pingjiang2013.github.io/tui/ai-design/#act-28-endpoints)、[缩回为什么有损失](https://pingjiang2013.github.io/tui/ai-design/#act-28-chain)、[合并两句影响](https://pingjiang2013.github.io/tui/ai-design/#act-28-merge)、[实际更新](https://pingjiang2013.github.io/tui/ai-design/#act-28-update)。解释操作的目的和计算来源，再引入局部影响；正式执行才保存，已有表示及历史保留。

29. 先观察竞争者，再只改变“鸟”的分数：正数面积改变总量，整体换算改变正确答案概率，同一概率再改变损失。看清这条因果链后，回到原模型真实共同更新，支持十轮运行、暂停、单步和逐轮撤回。

让所有候选共同学习：[第二十九幕](https://pingjiang2013.github.io/tui/ai-design/#act-29)，或[观察竞争者](https://pingjiang2013.github.io/tui/ai-design/#act-29-observe)、[比较参数的反馈](https://pingjiang2013.github.io/tui/ai-design/#act-29-feedback)、[共同训练](https://pingjiang2013.github.io/tui/ai-design/#act-29-train)。继承当前表示；观察不保存，正式训练才写入。另一方向的分量和此前训练记录保持不变。

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

第三十幕：同一个字的表示共同适应睡觉与飞翔两种上下文，支持真实十轮训练、暂停续跑和撤回。

第三十一幕：从前文读取共享表示，为下一字“睡／飞”计算分数与真实概率。入口 [用前文预测下一个字](https://pingjiang2013.github.io/tui/ai-design/#act-31)。明确单字读取和两个输出候选的教学简化，不修改已有训练。

第三十二幕：将两个动物字的共享表示相加并取平均，以空心点表示这次使用的上下文，实际计算下一字概率；可替换第二个字，观察合成点与概率联动。入口 [多个字共同参与预测](https://pingjiang2013.github.io/tui/ai-design/#act-32)。同份量和忽略顺序的局限在结尾明确提出。

第三十三幕：[同样出现的字，为什么不能都各算一半](https://pingjiang2013.github.io/tui/ai-design/#act-33)。切换两段前文检验平均的局限，直接拖动上下文点手动分配权重，真实重算加权表示与下一字概率。明确模型尚未计算权重，也未自动使用顺序。

第三十四幕：[这次想找什么：Query与Key](https://pingjiang2013.github.io/tui/ai-design/#act-34)。以同一只小猫的颜色、触感、动作信息说明寻找需求与候选特征的匹配，用真实点积与Softmax得到权重。二值表示及寻找目标由教学手工设置，尚未自动理解句子或学习读取器，不改变旧模型。

第三十五幕：[让词的表示结合上下文](https://pingjiang2013.github.io/tui/ai-design/#act-35)。先观察“小猫”带入白色信息，再回看Q/K如何决定份量；随后观察白色位置带入对象信息，最后同时显示两处更新。独立手工表示通过真实点积、Softmax、加权和及加回原表示计算，不修改此前模型。

第三十六幕：[同一份表示怎样生成Q和K](https://pingjiang2013.github.io/tui/ai-design/#act-36)。固定更新前的输入，追踪同一个输出分量在两套参数下的真实贡献；保留Q/K比较，换词复用参数，再接回上一幕的信息更新。

第三十七幕：[把各位置的Q和K排起来](https://pingjiang2013.github.io/tui/ai-design/#act-37)。用相同参数逐位置生成输出，组成两张矩阵。行对应文字位置，列对应向量分量；可点行名看对应位置，点格子回看输入、权重与贡献。尚未引入注意力分数表。

第三十八幕：[从逐次比较到匹配分数表](https://pingjiang2013.github.io/tui/ai-design/#act-38)。沿用同一组Q/K，先固定小猫Q逐个比较K，再换白色Q形成另一行。对应分量的乘积与求和实时计算，结果进入对应格子；点格子回看来源。新表的列对应候选位置，分数尚未转换为读取份量。

第三十九幕：[每个位置各自分配读取份量](https://pingjiang2013.github.io/tui/ai-design/#act-39)。沿用原匹配分数，先沿指数曲线读出1→约2.72、0→1，把对应高度接成两段长度，再让每行独立计算Softmax。取指数得到的两段依次拼合、共同缩放成完整份量带，两行分别合计100%；再将真实权重收回对应格子，可点行名回看。尚未引入V或缩放点积。

第四十一幕：[准备传递的内容：V的共享变换](https://pingjiang2013.github.io/tui/ai-design/#act-41)。固定输入、Q/K及读取权重，手动调整共享V参数的白色信息倍率1→2；同一单位长度展示V增长和约0.731→1.462的读入结果。松开拖动后重放输入到V再到加权上下文的计算，最后回看完整共享参数表。明确手动实验，不执行训练或残差相加。

第四十二幕：[把上下文补回原表示](https://pingjiang2013.github.io/tui/ai-design/#act-42)。沿用当前V倍率与旧输入，按分量把上下文长度接在原表示之后，再命名残差连接。浅深色和接缝标出两部分来源；两处都从冻结旧输入读取，候写结果全部备好后一起成为新输入。

第四十三幕：[回放一轮上下文更新](https://pingjiang2013.github.io/tui/ai-design/#act-43)。在同一舞台依次生成Q/K/V、比较并分配权重、读取V、补回原表示并一起写回。使用上一轮旧输入与当前V倍率，支持单步推进、真实中间帧暂停、回退和一次完整连续重放；回放不训练模型，也不把上一轮新表示误当作这一轮起点。

第四十四幕：[让位置参与计算](https://pingjiang2013.github.io/tui/ai-design/#act-44)。交换“小猫追小狗”两端词，先验证非均匀注意力在无位置信息时的结果不变；再从独立位置表取向量，与词向量相加后进入同一套Q/K/V计算。词表随词复用，位置表依位置复用，默认只展开一个位置，可选查看其他位置。使用手工教学初值，不训练或宣称学会语言关系。

第四十五幕：[预测时只能读取已知内容](https://pingjiang2013.github.io/tui/ai-design/#act-45)。沿用位置相加后的教学输入与共享Q/K/V，先追踪答案进入上下文的通路，再排除右边位置、对允许读取的分数重新运行Softmax。以真实V贡献更新表示，最后展开各行的因果阅读范围。答案留在计算之外用于之后检查，本幕不生成预测、不训练。

第四十六幕：[把上下文表示变成下一词概率](https://pingjiang2013.github.io/tui/ai-design/#act-46)。使用因果注意力之后“追”的真实表示，以每个候选的二维读出权重计算分数，默认展开“小狗”，可选回看其他候选。相同尺度展示分量乘权重、正负贡献首尾相接及分数端点，再用Softmax拼合、缩放出词表概率带。读出权重为手工教学初值，不训练、不加读出偏置、不抽样；训练答案只在最后用于指出要提高的概率。

第四十七幕：[让正确答案调整读出权重](https://pingjiang2013.github.io/tui/ai-design/#act-47)。将正确答案概率对应到真实负对数损失，再从各候选分数的损失曲线斜率，经固定表示分量传回读出权重。固定上下文，使用同一次预测的解析梯度同时更新六个读出权重，步幅0.1；重算分数、概率和损失，并保留更新前对照。支持再学一步、重置及候选回看；仅训练单个教学例子的读出，不更新注意力或文字表示。

第四十八幕：[把反馈送回上下文表示](https://pingjiang2013.github.io/tui/ai-design/#act-48)。继承第47幕当前读出权重，先区分候选分数与损失斜率，用概率和答案标记的有向差距解释反馈来源，再沿原连接返回求和。用户点击后暂改一个分量，真实重算预测并停住比较；明确恢复原值后，才显示残差分区、接缝并局部展开来源，向两侧传递完整反馈。布局收紧，支持分量切换、重放与返回，不训练或更改已有模型。

第四十九幕：[读入的内容收到多少反馈](https://pingjiang2013.github.io/tui/ai-design/#act-49)。沿用这一轮真实的V、因果读取份额与上下文反馈，先看加权相加，再以“V多1”的变化量副本解释倍率，最后让损失反馈沿同一次读取返回。每份V收到其读取份额乘上下文反馈，未来被遮挡位置本次为0。保留预测摘要、可选回看另一分量；不训练或改变V、读取份额和读出参数。

第五十幕：[内容不变，重新分配读取份额](https://pingjiang2013.github.io/tui/ai-design/#act-50)。把两份固定V放入等比例二维坐标图，上下文是线段上的真实加权平均点。在同一图上展开损失的下降方向及其在线段上的投影，再直接拖动上下文点，观察读取份额、预测和损失同步变化。支持鼠标、触摸、键盘及可选的一次自动试算。保持总和100%及因果遮挡，结果停住并明确恢复；试算不是训练，Softmax与匹配分数回传留待后续。

第五十一幕：[把读取反馈传回匹配分数](https://pingjiang2013.github.io/tui/ai-design/#act-51)。沿用同一张上下文图，匹配分数的标记移动时，通过真实Softmax同步推动上下文点。连续比较两次相同分数增量在均分和接近独占时的不同响应，保留灰色轨迹供对照；再观察两个分数共同平移时分配不变，并按实际损失梯度试改分数、保留结果和明确恢复。支持分数拖动、触摸、键盘与减少动态效果。Q、K和其他模型参数保持不变。

第五十二幕：[同一个 Q 收到多条路径的反馈](https://pingjiang2013.github.io/tui/ai-design/#act-52)。两行真实面积图共用一组Q：改变同一分量时两行同时变宽，通过新增窄片的不同高度展示K如何决定分数变化。再将两条路径返回Q的真实反馈以同尺度向量首尾相接，沿共同方向试改Q，同步更新面积、匹配分数、读取份额、上下文点与预测。结果停住并明确恢复；K、V及共享参数保持不变。

第五十三幕：[固定 Q，把反馈传回每份 K](https://pingjiang2013.github.io/tui/ai-design/#act-53)。沿用面积图，只提高追的位置K的两个分量：同高薄片因Q宽度不同产生不同的分数增量，另一行保持不动。恢复后，在高度边旁用真实更新幅度显示K收到的反馈；固定Q试改两份K，同步重算面积、匹配分数、读取份额、上下文和预测。支持结果停住、明确恢复、重放与直接入口，共享权重尚未训练。

第五十四幕：[让生成 K 的共享权重学习](https://pingjiang2013.github.io/tui/ai-design/#act-54)。从纯文字目标回到一条实际生成K的直线，调整同一权重时两个固定输入位置的输出同步改变，用不同长度位移展示输入的作用。把两条相反路径的真实试改量首尾接在共享权重刻度上，合成期间参数不动，随后一次更新同步重算K、匹配分数、读取分配、上下文与预测。只修改工作副本中的一个矩阵元素，结果停住并明确恢复，原模型和其他参数保持隔离。

第五十五幕：[学习更有用的匹配方式](https://pingjiang2013.github.io/tui/ai-design/#act-55)。从当前预测需要怎样的读取判断出发，解释生成K的共享权重怎样组织文字信息参与匹配。K图的底色直接来自固定Q的实际打分，分数贴近K点；输入贡献箭头仅在追踪生成过程时出现。一次学习共同更新四项权重，观察匹配差别、读取内容和下一词预测怎样改善，并可在同一背景上直接对照学习前后。

第五十六幕：[让选择与表达共同学习](https://pingjiang2013.github.io/tui/ai-design/#act-56)。在上下文图上观察两件相互配合的学习：先保持读取份额，学习V如何表达传递的信息；再保留这次改进，让Q、K、V共同学习寻找、匹配与表达。两处V、读取份额、上下文和下一词预测由真实参数同步计算，背景采样显示固定读出对不同上下文的“小狗”预测概率。支持每一步前后对照、恢复和连续状态衔接，不把这次单模块学习当作完整语言模型训练。
