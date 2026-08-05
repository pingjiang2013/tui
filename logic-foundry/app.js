(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const clone = (value) => JSON.parse(JSON.stringify(value));

  // Hereditarily finite sets. Arrays are only the storage representation; every
  // constructor below normalizes them extensionally.
  const key = (value) => Array.isArray(value)
    ? `[${value.map(key).sort().join(",")}]`
    : JSON.stringify(value);
  const set = (...items) => {
    const unique = new Map(items.map((item) => [key(item), item]));
    return [...unique.values()].sort((a, b) => key(a).localeCompare(key(b)));
  };
  const empty = () => [];
  const pair = (a, b) => set(a, b);
  const union = (family) => set(...family.flatMap((member) => member));
  const vnSuccessor = (x) => set(...x, x);
  const vnNat = (n) => n === 0 ? empty() : vnSuccessor(vnNat(n - 1));
  const zSuccessor = (x) => set(x);
  const zNat = (n) => n === 0 ? empty() : zSuccessor(zNat(n - 1));
  const numeral = (n) => ({ kind: "numeral", value: n });
  const orderedPair = (a, b) => set(set(a), set(a, b));
  const equal = (a, b) => key(a) === key(b);
  const contains = (collection, value) => collection.some((item) => equal(item, value));
  const intersection = (family) => {
    if (!Array.isArray(family) || !family.length) throw new Error("交集族需要一个非空集合族。");
    if (family.some((member) => !Array.isArray(member))) throw new Error("交集族的每个成员都必须是集合。");
    return family.slice(1).reduce((common, member) => common.filter((item) => contains(member, item)), set(...family[0]));
  };
  const decodeOrderedPair = (encodedPair) => {
    const common = intersection(encodedPair);
    if (common.length !== 1) throw new Error("关系成员不是有效的 Kuratowski 有序对。");
    const first = common[0];
    const flattened = union(encodedPair);
    const other = flattened.filter((item) => !equal(item, first));
    if (other.length > 1) throw new Error("关系成员不是有效的 Kuratowski 有序对。");
    const second = other.length === 1 ? other[0] : first;
    if (!equal(encodedPair, orderedPair(first, second))) throw new Error("关系成员不是有效的 Kuratowski 有序对。");
    return [first, second];
  };
  const applyFunction = (graph, inputValue) => {
    if (!Array.isArray(graph)) throw new Error("函数必须表示为有序对集合。");
    const outputs = graph.map(decodeOrderedPair).filter(([first]) => equal(first, inputValue)).map(([, second]) => second);
    if (!outputs.length) throw new Error(`函数在输入 ${prettyCurrentSet(inputValue)} 上没有定义。`);
    if (outputs.length > 1) throw new Error(`这不是函数：输入 ${prettyCurrentSet(inputValue)} 对应了多个输出。`);
    return clone(outputs[0]);
  };
  const finiteSequence = (...items) => set(...items.map((item, index) => orderedPair(vnNat(index), item)));

  const prettySet = (value, depth = 0, numeralSystem = "both") => {
    if (value && !Array.isArray(value) && value.kind === "numeral") return String(value.value);
    if (!Array.isArray(value)) return String(value);
    for (let n = 0; n <= 6; n += 1) {
      const zMatch = (numeralSystem === "zermelo" || numeralSystem === "both") && equal(value, zNat(n));
      const vnMatch = (numeralSystem === "von-neumann" || numeralSystem === "both") && equal(value, vnNat(n));
      if (zMatch || vnMatch) return String(n);
    }
    if (depth > 2) return "{…}";
    return `{${value.map((item) => prettySet(item, depth + 1, numeralSystem)).join(",")}}`;
  };

  const formulaKey = (f) => JSON.stringify(f);
  const F = {
    prop: (name) => ({ kind: "prop", name }),
    variable: { kind: "var", name: "x" },
    pred: (term, name = "P") => ({ kind: "pred", name, term }),
    not: (body) => ({ kind: "not", body }),
    or: (left, right) => ({ kind: "or", left, right }),
    and: (left, right) => ({ kind: "and", left, right }),
    imp: (left, right) => ({ kind: "imp", left, right }),
    forall: (variable, body) => ({ kind: "forall", variable: variable.name, body })
  };
  const TRUTH_FALSE = "⊥";
  const TRUTH_TRUE = "⊤";
  const prettyFormula = (f) => {
    if (!f) return "?";
    if (f.kind === "prop") return f.name;
    if (f.kind === "var") return f.name;
    if (f.kind === "pred") return `${f.name}(${prettyFormula(f.term)})`;
    if (f.kind === "not") return `¬${prettyFormula(f.body)}`;
    if (f.kind === "or") return `(${prettyFormula(f.left)} ∨ ${prettyFormula(f.right)})`;
    if (f.kind === "and") return `(${prettyFormula(f.left)} ∧ ${prettyFormula(f.right)})`;
    if (f.kind === "imp") return `(${prettyFormula(f.left)} → ${prettyFormula(f.right)})`;
    if (f.kind === "forall") return `∀${f.variable} ${prettyFormula(f.body)}`;
    return "?";
  };

  const input = (type, label) => ({ type, label });
  const registry = {
    empty: { label: "空集", glyph: "∅", out: "set", outLabel: "空集", inputs: [], compute: () => empty() },
    pair: { label: "配对", glyph: "{a,b}", out: "set", outLabel: "配对结果", inputs: [input("set", "对象 a"), input("set", "对象 b")], compute: ([a, b]) => pair(a, b) },
    union: { label: "并集族", glyph: "⋃A", out: "set", outLabel: "并集结果", inputs: [input("set", "集合族 A")], compute: ([a]) => union(a) },
    intersect: { label: "交集族", glyph: "⋂A", out: "set", outLabel: "共同成员", inputs: [input("set", "非空集合族 A")], compute: ([a]) => intersection(a) },
    zSucc: { label: "后继", glyph: "S(x)", out: "set", outLabel: "下一个数", inputs: [input("set", "当前数 x")], compute: ([a]) => zSuccessor(a) },
    vnSucc: { label: "后继", glyph: "S(x)", out: "set", outLabel: "下一个数", inputs: [input("set", "当前数 x")], compute: ([a]) => vnSuccessor(a) },
    ord: { label: "有序对", glyph: "⟨a,b⟩", out: "set", outLabel: "有序对", inputs: [input("set", "第一项 a"), input("set", "第二项 b")], compute: ([a, b]) => orderedPair(a, b) },
    set1: { label: "单元素集", glyph: "{a}", out: "set", outLabel: "集合", inputs: [input("set", "元素 a")], compute: ([a]) => set(a) },
    set2: { label: "二元素集", glyph: "{a,b}", out: "set", outLabel: "集合", inputs: [input("set", "元素 a"), input("set", "元素 b")], compute: ([a, b]) => set(a, b) },
    set3: { label: "三元素集", glyph: "{a,b,c}", out: "set", outLabel: "集合", inputs: [input("set", "元素 a"), input("set", "元素 b"), input("set", "元素 c")], compute: ([a, b, c]) => set(a, b, c) },
    set4: { label: "四元素集", glyph: "{a,b,c,d}", out: "set", outLabel: "集合", inputs: [input("set", "元素 a"), input("set", "元素 b"), input("set", "元素 c"), input("set", "元素 d")], compute: ([a, b, c, d]) => set(a, b, c, d) },
    first: { label: "第一投影", glyph: "π₁(e)", out: "set", outLabel: "第一项", inputs: [input("set", "有序边 e")], compute: ([edge]) => decodeOrderedPair(edge)[0] },
    sampleFn: { label: "函数 f", glyph: "f(·)", out: "set", outLabel: "函数值 f(x)", inputs: [input("set", "输入 x")], compute: ([value]) => applyFunction(sampleFunction, value) },
    valuationFn: { label: "赋值函数 v", glyph: "v(·)", out: "set", outLabel: "命题变元的真值", inputs: [input("set", "命题变元")], compute: ([value]) => applyFunction(sampleValuation, value) },
    truthAndApply: { label: "合取函数", glyph: "∧(·,·)", out: "set", outLabel: "合取结果", inputs: [input("set", "左侧真值"), input("set", "右侧真值")], compute: ([left, right]) => applyFunction(truthConjunctionFunction, orderedPair(left, right)) },
    propP: { label: "命题变元 P", glyph: "P", out: "formula", outLabel: "公式 P", inputs: [], compute: () => F.prop("P") },
    propQ: { label: "命题变元 Q", glyph: "Q", out: "formula", outLabel: "公式 Q", inputs: [], compute: () => F.prop("Q") },
    and: { label: "合取", glyph: "∧", out: "formula", outLabel: "合取公式", inputs: [input("formula", "左侧公式"), input("formula", "右侧公式")], compute: ([left, right]) => F.and(left, right) },
    varx: { label: "变量 x", glyph: "x", out: "term", outLabel: "项 x", inputs: [], compute: () => clone(F.variable) },
    predP: { label: "谓词 P", glyph: "P(·)", out: "formula", outLabel: "原子公式", inputs: [input("term", "项")], compute: ([term]) => F.pred(term) },
    not: { label: "否定", glyph: "¬", out: "formula", outLabel: "否定公式", inputs: [input("formula", "被否定公式")], compute: ([body]) => F.not(body) },
    or: { label: "析取", glyph: "∨", out: "formula", outLabel: "析取公式", inputs: [input("formula", "左侧公式"), input("formula", "右侧公式")], compute: ([a, b]) => F.or(a, b) },
    imp: { label: "蕴含", glyph: "→", out: "formula", outLabel: "蕴含公式", inputs: [input("formula", "前件"), input("formula", "后件")], compute: ([a, b]) => F.imp(a, b) },
    forall: { label: "全称量词", glyph: "∀", out: "formula", outLabel: "全称公式", inputs: [input("term", "绑定变量"), input("formula", "量词辖域")], compute: ([v, body]) => F.forall(v, body) },
    model: {
      label: "模型", glyph: "𝔐", out: "model", outLabel: "模型 𝔐", inputs: [input("set", "谓词 P 的解释"), input("set", "谓词 Q 的解释")],
      compute: ([p, q]) => ({ domain: set(numeral(0), numeral(1)), P: p, Q: q })
    },
    assumption: {
      label: "假设", glyph: "[A]", out: "proof", outLabel: "开放证明", inputs: [input("formula", "假设公式 A")],
      compute: ([formula]) => ({ rule: "assumption", conclusion: formula, open: [formula] })
    },
    impIntro: {
      label: "蕴含引入", glyph: "→I", out: "proof", outLabel: "蕴含证明", inputs: [input("proof", "含开放假设的证明")],
      compute: ([proof]) => {
        if (!proof.open.length) throw new Error("蕴含引入需要一个尚未解除的假设。");
        const discharged = proof.open[proof.open.length - 1];
        return { rule: "impIntro", conclusion: F.imp(discharged, proof.conclusion), open: proof.open.slice(0, -1) };
      }
    },
    forallIntro: {
      label: "全称引入", glyph: "∀I", out: "proof", outLabel: "全称证明", inputs: [input("proof", "待推广证明")],
      compute: ([proof]) => ({ rule: "forallIntro", conclusion: F.forall(F.variable, proof.conclusion), open: proof.open })
    }
  };

  const fixed = (id, label, value, out, x, y, glyph = label, symbolic = false) => ({
    id, type: "source", label, glyph, out, value, x, y, fixed: true, symbolic
  });
  const goal = (type = "set", x = 720, y = 205) => ({
    id: "goal", type: "goal", label: "目标接口", glyph: "OUTPUT", inputs: [input(type, "最终产物")], out: null, x, y, fixed: true, goal: true
  });

  const px = F.pred(F.variable);
  const conjunctionFormula = F.and(F.prop("P"), F.prop("Q"));
  const truthConjunctionFunction = set(
    orderedPair(orderedPair(TRUTH_TRUE, TRUTH_TRUE), TRUTH_TRUE),
    orderedPair(orderedPair(TRUTH_TRUE, TRUTH_FALSE), TRUTH_FALSE),
    orderedPair(orderedPair(TRUTH_FALSE, TRUTH_TRUE), TRUTH_FALSE),
    orderedPair(orderedPair(TRUTH_FALSE, TRUTH_FALSE), TRUTH_FALSE)
  );
  const sampleValuation = set(orderedPair("P", TRUTH_TRUE), orderedPair("Q", TRUTH_FALSE));
  const truthNegationFunction = set(orderedPair(TRUTH_TRUE, TRUTH_FALSE), orderedPair(TRUTH_FALSE, TRUTH_TRUE));
  const truthDisjunctionFunction = set(
    orderedPair(orderedPair(TRUTH_TRUE, TRUTH_TRUE), TRUTH_TRUE),
    orderedPair(orderedPair(TRUTH_TRUE, TRUTH_FALSE), TRUTH_TRUE),
    orderedPair(orderedPair(TRUTH_FALSE, TRUTH_TRUE), TRUTH_TRUE),
    orderedPair(orderedPair(TRUTH_FALSE, TRUTH_FALSE), TRUTH_FALSE)
  );
  const truthImplicationFunction = set(
    orderedPair(orderedPair(TRUTH_TRUE, TRUTH_TRUE), TRUTH_TRUE),
    orderedPair(orderedPair(TRUTH_TRUE, TRUTH_FALSE), TRUTH_FALSE),
    orderedPair(orderedPair(TRUTH_FALSE, TRUTH_TRUE), TRUTH_TRUE),
    orderedPair(orderedPair(TRUTH_FALSE, TRUTH_FALSE), TRUTH_TRUE)
  );
  const negationFormula = F.not(F.prop("P"));
  const disjunctionFormula = F.or(negationFormula, F.prop("Q"));
  const implicationFormula = F.imp(F.prop("P"), F.prop("Q"));
  const tautologyExpanded = F.forall(F.variable, F.or(F.not(px), px));
  const identityFormula = F.forall(F.variable, F.imp(px, px));
  const structureZero = numeral(0), structureOne = numeral(1);
  const productAB = set(orderedPair(structureZero, "a"), orderedPair(structureZero, "b"), orderedPair(structureOne, "a"), orderedPair(structureOne, "b"));
  const sampleRelation = set(orderedPair(structureZero, "a"), orderedPair(structureZero, "b"), orderedPair(structureOne, "b"));
  const sampleFunction = set(orderedPair(structureZero, "b"), orderedPair(structureOne, "a"));

  const definitions = {
    sets: `<p>游戏里的集合按<strong>外延性</strong>比较：成员完全相同，就是同一个集合，顺序与重复都不重要。</p><code>∅ = {}\n配对(a,b) = {a,b}\n⋃A = {x | 存在 y∈A，使 x∈y}</code>`,
    zNaturals: `<p>策梅洛构造把当前数整体装进一个单元素集合。</p><code>0 = ∅\nS(x) = {x}\n1 = {0}\n2 = {1}</code>`,
    vnNaturals: `<p>冯·诺依曼构造让每个数包含所有更小的数。</p><code>0 = ∅\nS(x) = x ∪ {x}\n1 = {0}\n2 = {0,1}</code>`,
    pairs: `<p>普通集合没有顺序，所以用一种不对称结构编码有序对。高级节点仍然只是集合构造的封装。</p><code>⟨a,b⟩ = {{a}, {a,b}}</code>`,
    products: `<p>笛卡尔积收集从 A 指向 B 的每一种可能有序边。四元素收集器只是配对与并集族的派生简写。</p><code>A×B={⟨x,y⟩ | x∈A 且 y∈B}\n{p,q,r,s}=⋃{{p,q},{r,s}}</code>`,
    relations: `<p>从 A 到 B 的关系不是新种类的对象：它只是笛卡尔积 A×B 的任意子集。</p><code>R⊆A×B\n⟨x,y⟩∈R 表示 x 与 y 具有关系 R</code>`,
    functions: `<p>函数是一种特殊关系：定义域中的每个输入都恰好连向一个输出。于是给定 x，就能确定地得到 f(x)。</p><code>f⊆A×B\n∀x∈A，存在唯一 y∈B，使 ⟨x,y⟩∈f\n⟨x,y⟩∈f ⇔ f(x)=y</code><p>不同输入可以共享输出；B 中也可以有对象未被使用。</p>`,
    sequences: `<p>有限序列不是新的神秘对象：它是定义域为冯·诺依曼自然数 n 的函数。下标保存位置，所以重复项不会合并。</p><code>⟨a,b⟩ = {⟨0,a⟩,⟨1,b⟩}\n这张函数图占用的位置是 {0,1}=2</code>`,
    syntax: `<p>公式不是神秘的墨迹，而是有限语法树。每个节点都可以编码成带标签的有序组，最终仍是集合。</p><code>Var(x)\nPred(P, x)\nOr(left, right)\nForall(x, body)</code>`,
    models: `<p>模型为符号赋予意义：给出论域，并把一元谓词解释为论域的子集。</p><code>𝔐 = (D, Pᴹ, Qᴹ)\n𝔐 ⊨ P(a) 当且仅当 a ∈ Pᴹ</code>`,
    proof: `<p>证明也是一棵有限树。每个节点是一条局部可检查的规则；根节点必须没有未解除的假设。</p><code>[P(x)]\n────── →I\nP(x) → P(x)\n──────────── ∀I\n∀x(P(x) → P(x))</code>`
  };

  const levels = [
    {
      id: "ignite-empty", branch: "common", requires: [], next: "build-one", chapter: "第一章 · 点火", title: "启动虚无",
      copy: "数学世界还没有任何东西。启动空集发生器，造出第一个可以被后续机器使用的对象。",
      goal: "制造空集 ∅，并把它接入目标接口。", tools: ["empty"], artifacts: ["0"],
      nodes: [goal("set")], hint: "空集发生器不需要输入。把它放到画布上，直接连接目标。",
      definition: ["第一个集合", `<p>空集没有任何成员。我们把它作为自然数的起点。</p><code>0 = ∅ = {}</code>`], unlock: "已获得固定对象：0 = ∅",
      validate: ({ value }) => equal(value, empty())
        ? pass("空集稳定存在。我们把它命名为自然数 0。")
        : fail(`目标收到 ${prettyCurrentSet(value)}；本关只需要空集本身。`)
    },
    {
      id: "build-one", branch: "common", requires: ["ignite-empty"], next: "z-build-two", alternateNext: "vn-build-two", chapter: "第一章 · 点火", title: "第一个后继者",
      copy: "把刚才造出的 0 收进一个集合。配对器收到两个相同对象时，重复成员会合并。",
      goal: "使用配对器制造 {0}。", tools: ["pair"], artifacts: ["1"],
      nodes: [fixed("zero", "上一关产物", zNat(0), "set", 70, 205, "0"), goal("set")],
      hint: "把 0 的输出分别接入配对器的 a、b 两个端口。",
      completionLesson: `<span class="eyebrow">刚刚发生了什么？</span>
        <h3>0 和 {0} 差在哪里？</h3>
        <div class="set-compare">
          <div class="set-case">
            <b>0 = ∅ = {}</b>
            <div class="member-row"><span class="no-members">没有成员</span></div>
            <small><strong>0 个直接成员</strong><br>这是空集</small>
          </div>
          <div class="compare-arrow">≠</div>
          <div class="set-case singleton-case">
            <b>{0} = {∅}</b>
            <div class="member-row"><i class="nested-member"><em>0</em><span>∅</span></i></div>
            <small><strong>1 个直接成员</strong><br>这个成员是整个空集 0</small>
          </div>
        </div>
        <p class="layer-note">“没有成员”和“有一个成员，这个成员是空集”不同：<b>{0} 不是空集</b>。</p>`,
      definition: ["从 0 得到 1", `<p>集合不记录重复成员，因此配对同一个对象只会得到一个成员。</p><code>配对(0,0) = {0}\n1 := {0}</code>`], unlock: "已获得固定对象：1 = {0}",
      validate: ({ value }) => equal(value, zNat(1))
        ? pass("{0} 被命名为自然数 1。") : fail(`当前产物是 ${prettyCurrentSet(value)}；需要一个只包含 0 的集合。`)
    },
    {
      id: "z-build-two", branch: "zermelo", requires: ["build-one"], next: "z-abstract-successor", chapter: "第一章 · 策梅洛路线", title: "第二个数",
      copy: "继续使用同一种包装方法：把整个 1 当作一个对象，装进新的集合。",
      goal: "从 1 构造只包含 1 的集合 {1}，并把它命名为 2。", tools: ["pair"], artifacts: ["z-two"],
      nodes: [fixed("one", "上一关产物", zNat(1), "set", 70, 205, "1"), goal("set")],
      hint: "把 1 的输出分别接入配对器的 a、b 两个端口。",
      completionLesson: `<span class="eyebrow">策梅洛路线 · 层级变化</span>
        <h3>1 和 {1} 并不相同</h3>
        <div class="set-compare">
          <div class="set-case"><b>1 = {0}</b><div class="member-row"><i>0</i></div><small><strong>直接成员是 0</strong></small></div>
          <div class="compare-arrow">≠</div>
          <div class="set-case"><b>2 = {1} = {{0}}</b><div class="member-row"><i class="nested-member"><em>1</em><span>{0}</span></i></div><small><strong>直接成员是整个 1</strong></small></div>
        </div>
        <p class="layer-note">每次包装都会增加一层：<b>{1} 是新的对象 2</b>。</p>`,
      definition: ["策梅洛的 2", `<p>策梅洛后继把当前数整体放入单元素集合。</p><code>1 = {0}\n2 = {1} = {{0}}</code>`], unlock: "已获得固定对象：2",
      validate: ({ value }) => equal(value, zNat(2)) ? pass("{1} 构造完成，我们把它命名为 2。") : fail(`当前产物是 ${prettyCurrentSet(value)}；目标是只包含整个 1 的集合。`)
    },
    {
      id: "z-abstract-successor", branch: "zermelo", requires: ["z-build-two"], next: "z-run-successor", chapter: "第一章 · 策梅洛路线", title: "抽象后继机器",
      copy: "0 到 1、1 到 2 都使用了相同的包装。把具体数字换成 x，制造通用后继程序。",
      goal: "构造通用程序 S(x)={x}。", tools: ["pair"], artifacts: ["z-successor"],
      nodes: [fixed("x", "程序输入", zNat(2), "set", 70, 205, "x", true), goal("set")],
      hint: "把同一个 x 接入配对器的两个端口，重复成员会合并成 {x}。",
      definition: ["策梅洛后继", definitions.zNaturals], unlock: "已验证程序：后继 S(x)",
      validate: ({ evaluateGoal }) => {
        for (let n = 0; n < 3; n += 1) {
          const got = evaluateGoal({ x: zNat(n) });
          if (!equal(got, zSuccessor(zNat(n)))) return fail(`隐藏测试 x=${n} 失败，得到 ${prettyCurrentSet(got)}。`);
        }
        return pass("0、1、2 三个输入全部通过，包装网络已封装成后继程序。", "3 / 3 测试通过");
      }
    },
    {
      id: "z-run-successor", branch: "zermelo", requires: ["z-abstract-successor"], next: "build-three-set", chapter: "第一章 · 策梅洛路线", title: "让机器继续工作",
      copy: "使用刚刚封装的后继程序继续计数，不再重复展开底层配对网络。",
      goal: "从 2 串联两次后继，制造 4。", tools: ["zSucc"], artifacts: ["z-three", "z-four"],
      nodes: [fixed("two", "已知对象", zNat(2), "set", 70, 205, "2"), goal("set")],
      hint: "S(2) 得到 3，再把 3 送入另一个后继节点。",
      definition: ["程序成为零件", `<p>已经通过测试的网络可以折叠为后继节点。</p><code>S(2)=3\nS(S(2))=4</code>`], unlock: "策梅洛数码工坊完成：有限集合装配已解锁",
      validate: ({ value, nodes }) => equal(value, zNat(4)) && nodes.filter((n) => n.type === "zSucc").length >= 2
        ? pass("后继机器连续工作，制造出了 3 和 4。") : fail(`当前输出是 ${prettyCurrentSet(value)}；目标是从 2 前进两次。`)
    },
    {
      id: "vn-build-two", branch: "von-neumann", requires: ["build-one"], next: "vn-wrap-two", chapter: "第一章 · 冯·诺依曼路线", title: "保留全部历史",
      copy: "现在你已经亲手拥有 0 和 1。把它们收进同一个集合，制造下一个对象。",
      goal: "使用配对器制造 {0,1}。", tools: ["pair"], artifacts: ["2"],
      nodes: [fixed("zero", "已知对象", vnNat(0), "set", 65, 145, "0"), fixed("one", "已知对象", vnNat(1), "set", 65, 300, "1"), goal("set")],
      hint: "把 0 和 1 分别送入配对器。端口顺序不会影响普通集合。",
      definition: ["自然数开始生长", `<p>直到现在，我们才拥有谈论 2 所需的全部材料。</p><code>0 = ∅\n1 = {0}\n2 := {0,1}</code>`], unlock: "已获得固定对象：2 = {0,1}",
      validate: ({ value }) => equal(value, vnNat(2))
        ? pass("{0,1} 被命名为自然数 2；它包含此前造出的每个数。") : fail(`当前产物是 ${prettyCurrentSet(value)}；目标应同时包含 0 和 1。`)
    },
    {
      id: "vn-wrap-two", branch: "von-neumann", requires: ["vn-build-two"], next: "vn-build-three", chapter: "第一章 · 冯·诺依曼路线", title: "把 2 装进盒子",
      copy: "2 是包含 0、1 的集合。现在把整个 2 当作一个对象，再用配对器把它装进新的集合。",
      goal: "从 2 构造只包含 2 的集合 {2}。", tools: ["pair"], artifacts: ["singleton-two"],
      nodes: [fixed("two", "上一关产物", vnNat(2), "set", 70, 205, "2"), goal("set")],
      hint: "把 2 的输出分别接入配对器的 a、b 两个端口；重复成员会合并。",
      completionLesson: `<span class="eyebrow">刚刚发生了什么？</span>
        <h3>2 和 {2} 差在哪里？</h3>
        <div class="set-compare">
          <div class="set-case">
            <b>2 = {0,1}</b>
            <div class="member-row"><i>0</i><i>1</i></div>
            <small><strong>2 个直接成员</strong><br>分别是 0 和 1</small>
          </div>
          <div class="compare-arrow">≠</div>
          <div class="set-case singleton-case">
            <b>{2} = {{0,1}}</b>
            <div class="member-row"><i class="nested-member"><em>2</em><span>{0,1}</span></i></div>
            <small><strong>1 个直接成员</strong><br>这个成员是整个 2</small>
          </div>
        </div>
        <p class="layer-note">外面的花括号增加了一层：<b>{2} 不会自动展开成 {0,1}</b>。</p>`,
      definition: ["2 与 {2} 不同", `<p>花括号改变了成员层级。2 有两个成员，而 {2} 只有一个成员。</p><code>2 = {0,1}       成员：0、1\n{2} = {{0,1}}   成员：2\n配对(2,2) = {2}</code>`], unlock: "已获得固定对象：{2}",
      validate: ({ value }) => equal(value, set(vnNat(2)))
        ? pass("{2} 构造完成。它的唯一成员是整个 2，而不是 0 和 1。")
        : fail(`当前产物是 ${prettyCurrentSet(value)}；目标集合应当只有一个成员 2。`)
    },
    {
      id: "vn-build-three", branch: "von-neumann", requires: ["vn-wrap-two"], next: "vn-abstract-successor", chapter: "第一章 · 冯·诺依曼路线", title: "再造一个",
      copy: "你已经亲手拥有 2 和 {2}。把它们收进同一个集合族，再启动刚学会的并集机器。",
      goal: "用 2 和 {2} 组装集合族，再取并集制造 3。", tools: ["pair", "union"], artifacts: ["3"],
      nodes: [fixed("two", "已知对象", vnNat(2), "set", 60, 135, "2"), fixed("singleton-two", "上一关产物", set(vnNat(2)), "set", 60, 305, "{2}"), goal("set")],
      hint: "先把 2 与 {2} 送入配对器，得到 {2,{2}}；再把整个集合族送入并集族。",
      definition: ["并集族拆掉一层", `<p>把已经构造过的 2 与 {2} 组成集合族，再汇集两个成员集合中的内容。</p><code>配对(2,{2}) = {2,{2}}\n⋃{2,{2}} = 2 ∪ {2}\n= {0,1,2} = 3</code>`], unlock: "已获得固定对象：3；并集族训练完成",
      validate: ({ value }) => equal(value, vnNat(3))
        ? pass("并集拆掉外层后，0、1、2 汇集成了自然数 3。") : fail(`当前产物是 ${prettyCurrentSet(value)}；检查送入并集族的外层结构。`)
    },
    {
      id: "vn-abstract-successor", branch: "von-neumann", requires: ["vn-build-three"], next: "vn-run-successor", chapter: "第一章 · 冯·诺依曼路线", title: "抽象后继机器",
      copy: "刚才你用 2 和 {2} 造出了 3。现在把具体数字换成输入 x，并亲手制造 {x}，将做法抽象成通用机器。",
      goal: "构造通用程序 x ∪ {x}。", tools: ["pair", "union"], artifacts: ["successor"],
      nodes: [fixed("x", "程序输入", vnNat(2), "set", 70, 205, "x", true), goal("set")],
      hint: "先把 x 同时接入一个配对器，制造 {x}；再配对 x 与 {x} 得到 {x,{x}}；最后送入并集族。",
      definition: ["后继的集合定义", definitions.vnNaturals], unlock: "已验证程序：后继 S(x)",
      validate: ({ evaluateGoal }) => {
        for (let n = 0; n < 3; n += 1) {
          const got = evaluateGoal({ x: vnNat(n) });
          if (!equal(got, vnSuccessor(vnNat(n)))) return fail(`隐藏测试 x=${n} 失败，得到 ${prettyCurrentSet(got)}。`);
        }
        return pass("0、1、2 三个已知输入全部通过。这张网络被封装为后继程序。", "3 / 3 测试通过");
      }
    },
    {
      id: "vn-run-successor", branch: "von-neumann", requires: ["vn-abstract-successor"], next: "z-build-two", chapter: "第一章 · 冯·诺依曼路线", title: "让机器继续工作",
      copy: "后继程序已经成为可靠零件。让它从上一关认识的 3 出发，继续制造尚未见过的数。",
      goal: "把后继程序串联两次，从 3 制造出 5。", tools: ["vnSucc"], artifacts: ["4", "5"],
      nodes: [fixed("three", "已知对象", vnNat(3), "set", 70, 205, "3"), goal("set")],
      hint: "S(3) 得到 4，再把 4 送入另一个后继节点。",
      definition: ["程序成为零件", `<p>已经通过测试的构造网络可以折叠成一个节点，同时保留其集合论定义。</p><code>S(3) = 4\nS(S(3)) = 5</code>`], unlock: "自然数工坊完成：进入结构工坊",
      validate: ({ value, nodes }) => equal(value, vnNat(5)) && nodes.filter((n) => n.type === "vnSucc").length >= 2
        ? pass("同一台机器连续工作，制造出了 4 和 5。") : fail(`当前输出是 ${prettyCurrentSet(value)}；目标是从 3 前进两次。`)
    },
    {
      id: "build-three-set", branch: "shared", requires: ["z-run-successor"], next: "ordered-pair", chapter: "第二章 · 结构", title: "把三个对象收在一起",
      copy: "配对一次只能直接收集两个对象。把较小的集合先装进一个集合族，再用并集族拆掉外层，就能得到三元素集。",
      goal: "构造通用程序 Collect₃(a,b,c)={a,b,c}。", tools: ["pair", "union"], artifacts: ["three-element-set"],
      nodes: [fixed("collect-a", "程序输入", "a", "set", 40, 85, "a", true), fixed("collect-b", "程序输入", "b", "set", 40, 225, "b", true), fixed("collect-c", "程序输入", "c", "set", 40, 365, "c", true), goal("set", 790, 205)],
      hint: "先构造 {a,b} 与 {c}，再把这两个集合组成集合族，最后取并集族。",
      definition: ["三元素集来自配对与并集", `<p>先把 a、b 收成一组，再把 c 装进单元素集；并集族会拆掉这两个容器的外层。</p><code>{a,b,c}=⋃{{a,b},{c}}</code>`], unlock: "已验证三输入收集程序：三元素集节点已解锁",
      validate: ({ evaluateGoal }) => {
        const cases = [["a", "b", "c"], ["a", "a", "c"], ["a", "a", "a"]];
        for (const [a, b, c] of cases) {
          const got = evaluateGoal({ "collect-a": a, "collect-b": b, "collect-c": c });
          if (!equal(got, set(a, b, c))) return fail("隐藏测试失败：收集程序没有正确处理重复输入。");
        }
        return pass("Collect₃ 把三个输入收集为集合 {a,b,c}；外延性保证输入顺序与重复不会产生额外成员。", "Collect₃ 已定义");
      }
    },
    {
      id: "ordered-pair", branch: "shared", requires: ["build-three-set"], next: "cartesian-product", chapter: "第二章 · 结构", title: "制造有方向的连接",
      copy: "集合不记顺序。请用普通配对造一个结构，让交换 a、b 后结果通常不同。",
      goal: "构造 Kuratowski 有序对 {{a},{a,b}}。", tools: ["pair"],
      nodes: [fixed("a", "输入 a", numeral(0), "set", 55, 130, "a", true), fixed("b", "输入 b", numeral(1), "set", 55, 310, "b", true), goal("set")],
      hint: "需要两个内部集合：{a} 与 {a,b}，最后再把它们配成一组。",
      definition: ["集合如何保存顺序", definitions.pairs], unlock: "新零件：有序对；可以枚举所有可能的连接",
      validate: ({ value }) => equal(value, orderedPair(numeral(0), numeral(1)))
        ? pass("方向被编码进了纯集合结构。现在可以制造关系。") : fail("结构还不能区分先后，展开它检查两层配对。")
    },
    {
      id: "cartesian-product", branch: "shared", requires: ["ordered-pair"], next: "relation-subset", chapter: "第二章 · 结构", title: "把每种配对都列出来",
      copy: "从 A 中选择一个对象作为第一项，再从 B 中选择一个对象作为第二项，就得到一个有序对。A×B 收集所有这样的选择结果。",
      goal: "对 A={0,1}、B={a,b}，构造 A×B={⟨0,a⟩,⟨0,b⟩,⟨1,a⟩,⟨1,b⟩}。", tools: ["ord", "set4"], artifacts: ["cartesian-product"],
      nodes: [fixed("p0", "A 的元素", structureZero, "set", 35, 65, "0"), fixed("p1", "A 的元素", structureOne, "set", 35, 165, "1"), fixed("pa", "B 的元素", "a", "set", 145, 265, "a"), fixed("pb", "B 的元素", "b", "set", 145, 365, "b"), goal("set", 790, 205)],
      hint: "分别制造 ⟨0,a⟩、⟨0,b⟩、⟨1,a⟩、⟨1,b⟩，再用四元素集把它们收集起来。",
      definition: ["笛卡尔积列出全部选择", definitions.products], unlock: "已构造 A×B：下一步可以从这些有序对中选择一部分",
      validate: ({ value }) => equal(value, productAB) ? pass("第一项的两种选择与第二项的两种选择一一组合，得到的四个有序对正是 A×B。", "4 / 4 有序对") : fail("检查四种选择是否都已出现：0 与 a、b 配对，1 也要与 a、b 配对。")
    },
    {
      id: "relation-subset", branch: "shared", requires: ["cartesian-product"], next: "build-function", chapter: "第二章 · 结构", title: "关系机器",
      copy: "从 A 到 B 的关系就是 A×B 的任意子集：它可以保留全部可能边，也可以只选择其中一些。",
      goal: "从 A×B 中选择边，构造 R={⟨0,a⟩,⟨0,b⟩,⟨1,b⟩}。", tools: ["ord", "set3"], artifacts: ["relation"],
      nodes: [fixed("r0", "A 的元素", structureZero, "set", 35, 65, "0"), fixed("r1", "A 的元素", structureOne, "set", 35, 165, "1"), fixed("ra", "B 的元素", "a", "set", 145, 265, "a"), fixed("rb", "B 的元素", "b", "set", 145, 365, "b"), goal("set", 790, 205)],
      hint: "只制造目标列出的三条边，再用三元素集把它们收集成 A×B 的子集。",
      definition: ["关系是笛卡尔积的子集", definitions.relations], unlock: "已构造关系；下一步研究能确定输出的特殊关系",
      validate: ({ value }) => equal(value, sampleRelation)
        ? pass("R⊆A×B。它是合法关系；不过输入 0 同时通向 a、b，所以还不是函数。") : fail("每条边都必须来自 A×B，而且目标关系只选择指定的三条边。")
    },
    {
      id: "build-function", branch: "shared", requires: ["relation-subset"], next: "function-value-graph", alternateNext: "sequence-empty", alternateLabel: "探索有限序列支线", alternateLockedLabel: "完成冯·诺依曼路线后开放", chapter: "第二章 · 结构", title: "每个输入一个出口",
      copy: "函数仍是 A×B 的子集，但它限制每个输入恰好拥有一个出口。于是给定 x，沿唯一的边就能确定 f(x)。",
      goal: "构造任意函数 f:{0,1}→{a,b}。每个输入必须出现一次，而且只能有一个输出。", tools: ["ord", "set2"], artifacts: ["function"],
      nodes: [fixed("f0", "A 的元素", structureZero, "set", 35, 65, "0"), fixed("f1", "A 的元素", structureOne, "set", 35, 165, "1"), fixed("fa", "B 的元素", "a", "set", 145, 265, "a"), fixed("fb", "B 的元素", "b", "set", 145, 365, "b"), goal("set", 790, 205)],
      hint: "为 0、1 各制造一条边；两个输入可以共享输出，但同一输入不能拥有两条边。",
      definition: ["函数是特殊关系", definitions.functions], unlock: "已构造函数：现在可以解释函数值记号",
      validate: ({ value }) => {
        if (!Array.isArray(value)) return fail("函数必须先是一个有序对集合，也就是关系。");
        let edges;
        try { edges = value.map(decodeOrderedPair); } catch (error) { return fail(error.message); }
        if (edges.some(([first]) => ![structureZero, structureOne].some((x) => equal(x, first)))) return fail("发现起点不属于定义域 A={0,1} 的边。");
        if (edges.some(([, second]) => !["a", "b"].some((y) => equal(y, second)))) return fail("发现输出不属于目标集合 B={a,b} 的边。");
        const mapping = [];
        const problems = [];
        for (const inputValue of [structureZero, structureOne]) {
          const outputs = edges.filter(([first]) => equal(first, inputValue)).map(([, second]) => second);
          if (!outputs.length) problems.push(`输入 ${prettyCurrentSet(inputValue)} 没有出口`);
          else if (outputs.length > 1) problems.push(`输入 ${prettyCurrentSet(inputValue)} 有多个出口`);
          else mapping.push(`${prettyCurrentSet(inputValue)}↦${prettyCurrentSet(outputs[0])}`);
        }
        if (problems.length) return fail(`这还是普通关系：${problems.join("；")}。函数要求每个输入恰好拥有一个出口。`);
        return pass(`函数构造完成：${mapping.join("，")}。给定输入后，唯一的边确定了输出。`, "存在性 ✓　唯一性 ✓");
      }
    },
    {
      id: "function-value-graph", branch: "shared", requires: ["build-function"], next: "function-apply", chapter: "第二章 · 结构", title: "把等式翻译成边",
      copy: "f(x)=y 不是函数图之外的新事实；它只是说有序边 ⟨x,y⟩ 属于集合 f。请把两个函数值等式翻译成函数图。",
      goal: "给定 f(0)=b、f(1)=a，构造 f={⟨0,b⟩,⟨1,a⟩}。", tools: ["ord", "set2"], artifacts: ["function-value-notation"],
      nodes: [fixed("value-zero", "输入", structureZero, "set", 35, 75, "0"), fixed("value-one", "输入", structureOne, "set", 35, 175, "1"), fixed("value-a", "函数值", "a", "set", 145, 285, "a"), fixed("value-b", "函数值", "b", "set", 145, 385, "b"), goal("set", 790, 205)],
      hint: "把 f(0)=b 翻译为 ⟨0,b⟩，把 f(1)=a 翻译为 ⟨1,a⟩，再收集两条边。",
      definition: ["函数值等式就是成员关系", `<p>函数本身是有序对集合。唯一性保证给定 x 后至多有一个 y，因此两种写法表达同一个事实。</p><code>f(x)=y ⇔ ⟨x,y⟩∈f</code>`], unlock: "函数图已折叠为单输入节点 f(·)",
      validate: ({ value }) => equal(value, sampleFunction)
        ? pass("⟨0,b⟩∈f 与 f(0)=b 是同一个事实；⟨1,a⟩∈f 与 f(1)=a 也是如此。")
        : fail("每个函数值等式都应翻译成一条有序边；检查第一项是输入，第二项是函数值。")
    },
    {
      id: "function-apply", branch: "shared", requires: ["function-value-graph"], next: "proposition-atom", chapter: "第二章 · 结构", title: "让函数工作",
      copy: "上一关的函数图已经折叠为节点 f(·)。它记住的仍是同一个有序对集合；现在把一个输入送进去，读取唯一边的终点。",
      goal: "把输入 0 送入 f，并取得函数值 f(0)。", tools: ["sampleFn"], artifacts: ["function-application"],
      nodes: [fixed("apply-input", "输入", structureZero, "set", 55, 205, "0"), goal("set", 790, 205)],
      hint: "把 0 接入 f(·) 的输入端，再把函数值接入目标。",
      definition: ["运行节点仍在读取函数图", `<p>f(·) 记住的正是上一关构造的集合 {⟨0,b⟩,⟨1,a⟩}。</p><code>⟨0,b⟩∈f ⇔ f(0)=b</code>`], unlock: "结构层完成：公式语言工坊已解锁",
      validate: ({ value }) => equal(value, "b") ? pass("函数图中唯一以 0 为第一项的边是 ⟨0,b⟩，因此 f(0)=b。") : fail("f(·) 会沿着以输入 0 为第一项的唯一有序边读取输出。")
    },
    {
      id: "sequence-empty", branch: "finite-sequence", requires: ["build-function", "vn-run-successor"], next: "sequence-one", chapter: "可选工坊 · 有限序列", title: "空集的另一种身份",
      copy: "同一个集合可以承担不同角色。重新制造空集，这一次把它看成没有输入、也没有输出边的函数。",
      goal: "用空集构造空函数，也就是空序列 ⟨⟩。", tools: ["empty"], artifacts: ["empty-sequence"],
      nodes: [goal("set")], hint: "空函数的函数图里没有任何有序对，因此它就是空集本身。",
      definition: ["空集也是空序列", `${definitions.sequences}<p>函数由有序对集合表示；没有有序对的函数图就是 ∅。</p><code>⟨⟩ = ∅</code>`], unlock: "已识别对象：空序列 ⟨⟩",
      validate: ({ value }) => equal(value, finiteSequence()) ? pass("∅ 没有任何输入边，因此同时是空函数和空序列 ⟨⟩。") : fail("空序列的函数图必须没有任何有序对。")
    },
    {
      id: "sequence-one", branch: "finite-sequence", requires: ["sequence-empty"], next: "sequence-intersection", chapter: "可选工坊 · 有限序列", title: "第一项有了位置",
      copy: "集合不会记住 a 是第几项。先制造有序边 ⟨0,a⟩，再把整条边装进单元素集合。",
      goal: "只用有序对与配对构造 {⟨0,a⟩}，也就是序列 ⟨a⟩。", tools: ["ord", "pair"], artifacts: ["one-item-sequence"],
      nodes: [fixed("seq-zero", "第一个下标", vnNat(0), "set", 45, 145, "0"), fixed("seq-a", "第一项", "a", "set", 45, 310, "a"), goal("set", 790, 205)],
      hint: "先构造 ⟨0,a⟩；再把同一条边送入配对器的两个端口，得到只包含这条边的集合。",
      definition: ["一项序列是一个函数图", definitions.sequences], unlock: "已构造序列：⟨a⟩",
      validate: ({ value }) => equal(value, finiteSequence("a")) ? pass("位置 0 唯一地指向 a，函数图正是序列 ⟨a⟩。") : fail("目标应当只包含一条有序边 ⟨0,a⟩。")
    },
    {
      id: "sequence-intersection", branch: "finite-sequence", requires: ["sequence-one"], next: "sequence-project-first", chapter: "可选工坊 · 有限序列", title: "真正共同的核心",
      copy: "每两个集合都共享一个干扰成员，但只有 x 同时属于全部三个集合。先把 A、B、C 组成集合族，再找出真正的共同核心。",
      goal: "构造 ⋂{A,B,C}={x}。", tools: ["set3", "intersect"], artifacts: ["family-intersection"],
      nodes: [fixed("intersection-a", "集合 A", set("x", "a", "b"), "set", 45, 85, "{x,a,b}"), fixed("intersection-b", "集合 B", set("x", "b", "c"), "set", 45, 225, "{x,b,c}"), fixed("intersection-c", "集合 C", set("x", "a", "c"), "set", 45, 365, "{x,a,c}"), goal("set", 790, 205)],
      hint: "先用三元素集把 A、B、C 整体收集起来，再把这个集合族送入 ⋂；不要把三个集合的内部成员直接混在一起。",
      definition: ["交集族检查每个内部集合", `<p>a 只属于 A、C，b 只属于 A、B，c 只属于 B、C；只有 x 属于全部三个集合。</p><code>⋂{A,B,C}={x}</code>`], unlock: "新操作：交集族；现在可以拆解有序对",
      validate: ({ value }) => equal(value, set("x")) ? pass("a、b、c 都只通过两次检查；只有 x 通过了全部三次检查。", "1 个共同成员") : fail("必须先组成包含 A、B、C 的集合族；只检查其中两个集合还会留下一个干扰成员。")
    },
    {
      id: "sequence-project-first", branch: "finite-sequence", requires: ["sequence-intersection"], next: "sequence-abstract-first", chapter: "可选工坊 · 有限序列", title: "拆出一条边的起点",
      copy: "Kuratowski 有序对 e={{x},{x,y}} 的两个内部集合共同含有 x。先取交集得到 {x}，再取并集便拆出 x。",
      goal: "从有序边 e=⟨1,a⟩ 构造 ⋃⋂e=1。", tools: ["intersect", "union"], artifacts: ["concrete-first-projection"],
      nodes: [fixed("projection-concrete-edge", "有序边 e", orderedPair(vnNat(1), "a"), "set", 55, 205, "⟨1,a⟩"), goal("set", 790, 205)],
      hint: "先把整条边送入 ⋂，得到只包含起点的单元素集；再用 ⋃ 拆掉最后一层。",
      definition: ["第一项藏在共同部分里", `<p>若 e=⟨x,y⟩={{x},{x,y}}，则 ⋂e={x}，继而 ⋃⋂e=x。</p><code>⋃⋂⟨1,a⟩=1</code>`], unlock: "已从一条具体有序边中取出第一项",
      validate: ({ value }) => equal(value, vnNat(1)) ? pass("⋂e 先留下 {1}，⋃ 再拆掉这一层，得到起点 1。") : fail("网络顺序应当是先取交集族，再对结果取并集族。")
    },
    {
      id: "sequence-abstract-first", branch: "finite-sequence", requires: ["sequence-project-first"], next: "sequence-concrete-domain", chapter: "可选工坊 · 有限序列", title: "抽象第一投影",
      copy: "把具体的边换成符号输入 e，让同一张网络能够拆出任意纯集合有序对的第一项。",
      goal: "构造程序 π₁(e)=⋃⋂e。", tools: ["intersect", "union"], artifacts: ["first-projection"],
      nodes: [fixed("projection-input", "程序输入", orderedPair(vnNat(0), "a"), "set", 55, 205, "e", true), goal("set", 790, 205)],
      hint: "完整复用上一关的两节点网络，只把固定边换成符号输入 e。",
      definition: ["第一投影程序", `<p>第一投影不是新的原语，而是刚刚构造的集合程序。</p><code>π₁(e)=⋃⋂e</code>`], unlock: "已验证程序：π₁；可以批量读取序列位置",
      validate: ({ evaluateGoal }) => {
        const cases = [[orderedPair(vnNat(0), "a"), vnNat(0)], [orderedPair(vnNat(1), "b"), vnNat(1)], [orderedPair(vnNat(2), vnNat(2)), vnNat(2)]];
        for (const [edge, expected] of cases) if (!equal(evaluateGoal({ "projection-input": edge }), expected)) return fail("隐藏测试失败：网络没有稳定取出有序边的第一项。");
        return pass("不同起点和 ⟨x,x⟩ 都通过；这张网络可以折叠为 π₁。", "3 / 3 测试通过");
      }
    },
    {
      id: "sequence-concrete-domain", branch: "finite-sequence", requires: ["sequence-abstract-first"], next: "sequence-append-three", chapter: "可选工坊 · 有限序列", title: "这些位置已经被占用",
      copy: "序列 s=⟨a,b⟩ 的函数图有两条边。逐条读取起点并收集起来，就能看见这张具体函数图占用的位置。",
      goal: "从 ⟨0,a⟩、⟨1,b⟩ 构造位置集合 {0,1}=2。", tools: ["first", "set2"], artifacts: ["concrete-domain"],
      nodes: [fixed("domain-edge-zero", "s 中的边", orderedPair(vnNat(0), "a"), "set", 55, 125, "⟨0,a⟩"), fixed("domain-edge-one", "s 中的边", orderedPair(vnNat(1), "b"), "set", 55, 325, "⟨1,b⟩"), goal("set", 790, 205)],
      hint: "对两条边分别使用 π₁，再用二元素集收集两个结果；不要收集终点 a、b。",
      definition: ["这张图的定义域", `${definitions.sequences}<p>逐条收集第一项得到 {0,1}=2；这就是当前函数图的定义域。</p>`], unlock: "已得到具体位置集合：Dom(⟨a,b⟩)=2",
      validate: ({ value }) => equal(value, vnNat(2)) ? pass("两条边的起点是 0、1；它们组成 2，正好也是下一个空位置。", "2 / 2 位置") : fail("需要收集两条有序边的第一项；检查是否漏边或误收了终点。")
    },
    {
      id: "sequence-append-three", branch: "finite-sequence", requires: ["sequence-concrete-domain"], next: "function-value-graph", chapter: "可选工坊 · 有限序列", title: "在下一个位置追加",
      copy: "上一关得到位置集合 2。现在把它作为新边的下标，保留旧函数图，并将整条新边作为一个成员加入。",
      goal: "从 s=⟨a,b⟩ 构造 s∪{⟨2,c⟩}=⟨a,b,c⟩。", tools: ["ord", "pair", "union"], artifacts: ["concrete-append"],
      nodes: [fixed("append-graph", "已有序列 s", finiteSequence("a", "b"), "set", 40, 95, "⟨a,b⟩"), fixed("append-index", "上关得到的位置集合", vnNat(2), "set", 40, 235, "2"), fixed("append-item", "新末项", "c", "set", 40, 365, "c"), goal("set", 790, 205)],
      hint: "制造 ⟨2,c⟩ 和它的单元素集；再把该单元素集与整个旧函数图配成集合族，最后取并集。",
      completionLesson: `<span class="eyebrow">有限序列支线 · 第一阶段完成</span><h3>你找到了具体序列的下一个位置</h3><div class="set-compare"><div class="set-case"><b>边的起点 {0,1}</b><small>这张函数图已经占用的位置</small></div><div class="compare-arrow">=</div><div class="set-case"><b>自然数 2</b><small>下一条边应使用的下标</small></div></div><p class="layer-note">通用 Dom 与通用 Append 仍未解锁；它们需要后续的逻辑语言与分离能力。</p>`,
      definition: ["具体追加扩展函数图", `<p>旧边全部保留，新边使用刚刚算出的空位置 2。</p><code>⟨a,b⟩∪{⟨2,c⟩}=⟨a,b,c⟩</code>`], unlock: "有限序列第一阶段完成；通用定义域等待后续开放",
      validate: ({ value }) => equal(value, finiteSequence("a", "b", "c")) ? pass("旧位置 0、1 被保留，新位置 2 唯一地指向 c。") : fail("检查新边是否先被装成单元素集，再与整个旧函数图取并集。")
    },
    {
      id: "proposition-atom", branch: "shared", requires: ["function-apply"], next: "define-conjunction", chapter: "第三章 · 逻辑语言", title: "一片不会变化的叶子",
      copy: "P 是一个命题变元，也是最简单的原子公式。它没有连接词，也没有更小的子公式，所以在语法树中只是一片叶子。",
      goal: "构造原子公式 P，并在语法树与求值过程之间切换观察。", tools: ["propP"], artifacts: ["atomic-proposition"], formulaViews: true, formulaViewOptions: ["construction", "syntax", "evaluation"], valuationProps: ["P"],
      nodes: [goal("formula", 790, 205)],
      hint: "放入 P，把它直接接入目标；然后分别切换到语法树与求值过程。求值过程可以改变 P 当前显示的真值。",
      definition: ["最小的公式", `<p>命题变元 P 本身就是公式。它没有内部构造，因此对应一棵只有根、也只有一片叶子的语法树。</p><code>P 是原子公式</code>`], unlock: "已获得最小语法树：原子公式 P",
      validate: ({ value }) => formulaKey(value) === formulaKey(F.prop("P"))
        ? pass("P 没有更小的子公式；切换它当前显示的真值，也不会改变这棵只有一片叶子的语法树。")
        : fail(`当前公式是 ${prettyFormula(value)}；本关只需要原子公式 P。`)
    },
    {
      id: "define-conjunction", branch: "shared", requires: ["proposition-atom"], next: "proposition-conjunction", chapter: "第三章 · 逻辑语言", title: "定义合取函数",
      copy: "四个真值对已经列出。把每个真值对作为输入、相应真值作为输出，构造四条有序边，再把它们收集成函数图。",
      goal: "使用有序对与四元素集构造合取函数 ∧；仅当两个输入都为真时输出真。", tools: ["ord", "set4"], artifacts: ["truth-conjunction-function"],
      spawnPositions: [{ x: 195, y: 40 }, { x: 195, y: 150 }, { x: 195, y: 260 }, { x: 195, y: 370 }, { x: 370, y: 220 }],
      nodes: [
        fixed("truth-input-tt", "函数输入", orderedPair(TRUTH_TRUE, TRUTH_TRUE), "set", 20, 40, "⟨真,真⟩"),
        fixed("truth-input-tf", "函数输入", orderedPair(TRUTH_TRUE, TRUTH_FALSE), "set", 20, 150, "⟨真,假⟩"),
        fixed("truth-input-ft", "函数输入", orderedPair(TRUTH_FALSE, TRUTH_TRUE), "set", 20, 260, "⟨假,真⟩"),
        fixed("truth-input-ff", "函数输入", orderedPair(TRUTH_FALSE, TRUTH_FALSE), "set", 20, 370, "⟨假,假⟩"),
        fixed("truth-true", "函数值", TRUTH_TRUE, "set", 370, 45, "真"),
        fixed("truth-false", "函数值", TRUTH_FALSE, "set", 370, 395, "假"),
        goal("set", 790, 220)
      ],
      hint: "先用四个有序对制造四条函数边：第一项是真值对，第二项是结果。只有 ⟨真,真⟩ 指向真；最后用四元素集收集四条边。",
      definition: ["合取是一张函数图", `<p>{假,真}×{假,真} 中的四个真值对是函数输入。合取函数是一组有序边；每个输入恰好指向一个真值。</p><code>⟨真,真⟩ ↦ 真\n⟨真,假⟩ ↦ 假\n⟨假,真⟩ ↦ 假\n⟨假,假⟩ ↦ 假</code>`], unlock: "已用有序对集合构造二值合取函数 ∧",
      validate: ({ value }) => equal(value, truthConjunctionFunction)
        ? pass("合取函数已经定义：它在且仅在两个输入都为真时输出真。")
        : fail("这张函数图还不是合取：检查四个真值对是否都出现，并且只有“真 ∧ 真”指向真。")
    },
    {
      id: "proposition-conjunction", branch: "shared", requires: ["define-conjunction"], next: "build-valuation", chapter: "第三章 · 逻辑语言", title: "第一棵分叉的公式树",
      copy: "P、Q 是两片原子公式叶子。语法构造器 ∧ 把它们接到一个新根上；求值时，上一关定义的合取函数处理两片叶子的真值。",
      goal: "构造命题公式 P∧Q。", tools: ["propP", "propQ", "and"], artifacts: ["propositional-conjunction"],
      formulaViews: true, formulaViewOptions: ["construction", "syntax", "evaluation"], valuationProps: ["P", "Q"], truthTable: true,
      nodes: [goal("formula", 790, 205)],
      hint: "分别放入 P、Q，把 P 接到 ∧ 的左侧、Q 接到右侧，再将合取公式接入目标。",
      definition: ["合取形成一棵新公式树", `<p>P、Q 是叶子，∧ 是拥有两个子公式的根。这里的 ∧ 首先构造语法；求值时，再把叶子当前显示的真值送入已经定义的合取函数。</p><code>Formula ::= P | Q | (Formula ∧ Formula)\n真 ∧ 假 = 假</code>`], unlock: "已把合取的语法构造与语义函数接通",
      validate: ({ value }) => formulaKey(value) === formulaKey(conjunctionFormula)
        ? pass("P、Q 成为两个叶子，∧ 成为共同的根；这棵有限树就是公式 P∧Q。")
        : fail(`当前公式是 ${prettyFormula(value)}；目标语法树的左叶是 P，右叶是 Q。`)
    },
    {
      id: "build-valuation", branch: "shared", requires: ["proposition-conjunction"], next: "apply-valuation", chapter: "第三章 · 命题语义", title: "真值从哪里来",
      copy: "求值页面中的真值不能凭空出现。把命题变元作为输入、真值作为输出，构造一张真正的赋值函数图。",
      goal: "用有序对和二元素集构造 v={⟨P,真⟩,⟨Q,假⟩}。", tools: ["ord", "set2"], artifacts: ["valuation-function"],
      spawnPositions: [{ x: 195, y: 95 }, { x: 195, y: 315 }, { x: 370, y: 205 }],
      nodes: [fixed("valuation-p", "命题变元", "P", "set", 20, 40, "P"), fixed("valuation-true", "真值", TRUTH_TRUE, "set", 20, 150, "真"), fixed("valuation-q", "命题变元", "Q", "set", 20, 260, "Q"), fixed("valuation-false", "真值", TRUTH_FALSE, "set", 20, 370, "假"), goal("set", 790, 205)],
      hint: "构造 ⟨P,真⟩ 与 ⟨Q,假⟩，再用二元素集收集两条边。第一项是命题变元，第二项是它获得的真值。",
      definition: ["赋值也是函数", `<p>赋值函数把每个命题变元唯一地送到一个真值。本关只使用 P、Q，因此它仍是一张有限函数图。</p><code>v:{P,Q}→{假,真}\nv={⟨P,真⟩,⟨Q,假⟩}</code>`], unlock: "赋值函数 v 已折叠为可应用节点 v(·)",
      validate: ({ value }) => equal(value, sampleValuation)
        ? pass("赋值函数构造完成：P 唯一地指向真，Q 唯一地指向假。")
        : fail("检查两条函数边：P 应指向真，Q 应指向假；第一项和第二项不能倒置。")
    },
    {
      id: "apply-valuation", branch: "shared", requires: ["build-valuation"], next: "evaluate-conjunction", chapter: "第三章 · 命题语义", title: "读取两片叶子",
      copy: "上一关的函数图已经折叠为 v(·)。分别输入 P、Q，函数会沿唯一的边读取它们的真值。",
      goal: "构造有序对 ⟨v(P),v(Q)⟩=⟨真,假⟩。", tools: ["valuationFn", "ord"], artifacts: ["valuation-application"],
      spawnPositions: [{ x: 195, y: 120 }, { x: 195, y: 320 }, { x: 370, y: 220 }],
      nodes: [fixed("read-p", "命题变元", "P", "set", 20, 120, "P"), fixed("read-q", "命题变元", "Q", "set", 20, 320, "Q"), goal("set", 790, 220)],
      hint: "使用两个 v(·) 分别读取 P、Q，再把两个结果按 P 在前、Q 在后的顺序组成有序对。",
      definition: ["函数应用记号现在有了来源", `<p>v(P)=真表示函数图中有边 ⟨P,真⟩；v(Q)=假表示图中有边 ⟨Q,假⟩。</p><code>v(P)=真\nv(Q)=假</code>`], unlock: "已获得合法记号：v(P) 与 v(Q)",
      validate: ({ value }) => equal(value, orderedPair(TRUTH_TRUE, TRUTH_FALSE))
        ? pass("v 沿函数图读取出 v(P)=真、v(Q)=假，并按语法顺序组成了一对输入。")
        : fail("需要分别把 P、Q 送入 v(·)，再按 P 在前、Q 在后的顺序组成有序对。")
    },
    {
      id: "evaluate-conjunction", branch: "shared", requires: ["apply-valuation"], next: "define-negation", chapter: "第三章 · 命题语义", title: "从叶子算到根",
      copy: "语法树的两片叶子先由 v 读取真值；根节点再调用已经构造的合取函数。把这两层计算接成一张网络。",
      goal: "按 P∧Q 的语法结构计算 v(P∧Q)=真∧假=假。", tools: ["valuationFn", "truthAndApply"], artifacts: ["conjunction-evaluation"],
      spawnPositions: [{ x: 195, y: 120 }, { x: 195, y: 320 }, { x: 370, y: 220 }],
      nodes: [fixed("eval-p", "左叶 P", "P", "set", 20, 120, "P"), fixed("eval-q", "右叶 Q", "Q", "set", 20, 320, "Q"), goal("set", 790, 220)],
      hint: "分别用 v(·) 读取 P、Q；把 v(P) 接到合取函数左侧，把 v(Q) 接到右侧，再接入目标。",
      definition: ["求值沿语法树进行", `<p>赋值先解释叶子；连接词的真值函数再解释根。公式树的结构决定计算网络的结构。</p><code>v(P∧Q)=v(P)∧v(Q)\n=真∧假\n=假</code>`], unlock: "求值过程已形式化：可以继续加入新的连接词规则",
      validate: ({ value, nodes, connections }) => {
        const rootLink = connections.find((c) => c.to === "goal" && c.input === 0);
        const root = rootLink && nodes.find((node) => node.id === rootLink.from);
        const leftLink = root && connections.find((c) => c.to === root.id && c.input === 0);
        const rightLink = root && connections.find((c) => c.to === root.id && c.input === 1);
        const leftV = leftLink && nodes.find((node) => node.id === leftLink.from);
        const rightV = rightLink && nodes.find((node) => node.id === rightLink.from);
        const leftLeaf = leftV && connections.find((c) => c.to === leftV.id && c.input === 0);
        const rightLeaf = rightV && connections.find((c) => c.to === rightV.id && c.input === 0);
        const structure = root && root.type === "truthAndApply" && leftV && leftV.type === "valuationFn" && rightV && rightV.type === "valuationFn" && leftLeaf && leftLeaf.from === "eval-p" && rightLeaf && rightLeaf.from === "eval-q";
        return equal(value, TRUTH_FALSE) && structure
          ? pass("计算网络与语法树同形：两片叶子先由 v 读取，合取函数再从真、假得到假。")
          : fail("网络必须忠实跟随 P∧Q：P 经 v 接入左侧，Q 经 v 接入右侧，最后调用合取函数。")
      }
    },
    {
      id: "define-negation", branch: "shared", requires: ["evaluate-conjunction"], next: "formula-negation", chapter: "第三章 · 命题语义", title: "构造否定函数",
      copy: "否定是一元真值函数：它把真送到假，把假送到真。像此前构造函数一样制造两条有序边。",
      goal: "用有序对与二元素集构造否定函数 ¬。", tools: ["ord", "set2"], artifacts: ["truth-negation-function"],
      spawnPositions: [{ x: 195, y: 120 }, { x: 195, y: 320 }, { x: 370, y: 220 }],
      nodes: [fixed("neg-true", "真值", TRUTH_TRUE, "set", 20, 120, "真"), fixed("neg-false", "真值", TRUTH_FALSE, "set", 20, 320, "假"), goal("set", 790, 220)],
      hint: "制造 ⟨真,假⟩ 与 ⟨假,真⟩，再用二元素集收集两条函数边。两个固定真值的输出都可以重复使用。",
      definition: ["否定翻转真值", `<p>否定函数的定义域和值域都是 {假,真}，每个输入恰好指向相反的真值。</p><code>¬={⟨真,假⟩,⟨假,真⟩}</code>`], unlock: "已定义一元真值函数 ¬；否定语法构造器已解锁",
      validate: ({ value }) => equal(value, truthNegationFunction)
        ? pass("否定函数构造完成：两个真值互相交换。")
        : fail("否定函数必须恰好包含 ⟨真,假⟩ 与 ⟨假,真⟩ 两条边。")
    },
    {
      id: "formula-negation", branch: "shared", requires: ["define-negation"], next: "define-disjunction", chapter: "第三章 · 逻辑语言", title: "长出一条单枝",
      copy: "否定语法构造器在一棵公式树上方增加一个新根。它只有一个子公式，因此语法树不会分叉。",
      goal: "构造公式 ¬P，并观察它的语法树与求值过程。", tools: ["propP", "not"], artifacts: ["negation-formula"], formulaViews: true, formulaViewOptions: ["construction", "syntax", "evaluation"], valuationProps: ["P"], formalValuation: true, truthTable: true,
      spawnPositions: [{ x: 195, y: 220 }, { x: 370, y: 220 }], nodes: [goal("formula", 790, 220)],
      hint: "把 P 接入否定节点，再把 ¬P 接入目标。求值时，否定函数处理 P 当前的真值。",
      definition: ["否定公式是一元语法树", `<p>若 φ 是公式，那么 ¬φ 也是公式。求值先计算子公式，再调用否定函数。</p><code>v(¬P)=¬v(P)</code>`], unlock: "求值器已加入否定规则",
      validate: ({ value }) => formulaKey(value) === formulaKey(negationFormula)
        ? pass("否定成为 P 上方的新根；这是一棵只有一条分支的公式树。")
        : fail(`当前公式是 ${prettyFormula(value)}；目标是让否定直接作用于 P。`)
    },
    {
      id: "define-disjunction", branch: "shared", requires: ["formula-negation"], next: "formula-disjunction", chapter: "第三章 · 命题语义", title: "构造析取函数",
      copy: "析取接收两个真值。四个真值对已经列出；为每个输入制造唯一的函数边，再收集完整函数图。",
      goal: "用四个有序对与四元素集构造析取函数 ∨。", tools: ["ord", "set4"], artifacts: ["truth-disjunction-function"],
      spawnPositions: [{ x: 195, y: 40 }, { x: 195, y: 150 }, { x: 195, y: 260 }, { x: 195, y: 370 }, { x: 370, y: 220 }],
      nodes: [fixed("or-input-tt", "函数输入", orderedPair(TRUTH_TRUE, TRUTH_TRUE), "set", 20, 40, "⟨真,真⟩"), fixed("or-input-tf", "函数输入", orderedPair(TRUTH_TRUE, TRUTH_FALSE), "set", 20, 150, "⟨真,假⟩"), fixed("or-input-ft", "函数输入", orderedPair(TRUTH_FALSE, TRUTH_TRUE), "set", 20, 260, "⟨假,真⟩"), fixed("or-input-ff", "函数输入", orderedPair(TRUTH_FALSE, TRUTH_FALSE), "set", 20, 370, "⟨假,假⟩"), fixed("or-true", "函数值", TRUTH_TRUE, "set", 370, 45, "真"), fixed("or-false", "函数值", TRUTH_FALSE, "set", 370, 395, "假"), goal("set", 790, 220)],
      hint: "前三个真值对都指向真，只有 ⟨假,假⟩ 指向假。制造四条外层有序边，再用四元素集收集。",
      definition: ["析取的完整函数图", `<p>析取在至少一个输入为真时输出真；只有两个输入都为假时输出假。</p><code>⟨真,真⟩↦真　⟨真,假⟩↦真\n⟨假,真⟩↦真　⟨假,假⟩↦假</code>`], unlock: "已构造二值析取函数 ∨；析取语法构造器已解锁",
      validate: ({ value }) => equal(value, truthDisjunctionFunction)
        ? pass("析取函数构造完成：四个输入都有唯一输出，且仅假、假得到假。")
        : fail("检查完整函数图：前三个输入指向真，只有 ⟨假,假⟩ 指向假。")
    },
    {
      id: "formula-disjunction", branch: "shared", requires: ["define-disjunction"], next: "define-implication", chapter: "第三章 · 逻辑语言", title: "组合已有树枝",
      copy: "这次不只构造 P∨Q。先在 P 上增加否定，再让析取把 ¬P 与 Q 接到共同的根。",
      goal: "构造公式 ¬P∨Q，并观察组合语法树的求值过程。", tools: ["propP", "propQ", "not", "or"], artifacts: ["disjunction-formula"], formulaViews: true, formulaViewOptions: ["construction", "syntax", "evaluation"], valuationProps: ["P", "Q"], formalValuation: true, truthTable: true,
      spawnPositions: [{ x: 180, y: 80 }, { x: 180, y: 355 }, { x: 350, y: 80 }, { x: 350, y: 220 }], nodes: [goal("formula", 790, 220)],
      hint: "先构造 ¬P；把 ¬P 接到析取左侧，把 Q 接到右侧，再把结果接入目标。",
      definition: ["不同连接词可以嵌套", `<p>求值沿树从叶子向根进行：先得到 v(P)，再计算 ¬v(P)，最后与 v(Q) 一起送入析取函数。</p><code>v(¬P∨Q)=¬v(P)∨v(Q)</code>`], unlock: "求值器已加入析取规则",
      validate: ({ value }) => formulaKey(value) === formulaKey(disjunctionFormula)
        ? pass("否定先形成左侧子树，析取再把 ¬P 与 Q 接到同一个根。")
        : fail(`当前公式是 ${prettyFormula(value)}；目标左侧是 ¬P，右侧是 Q。`)
    },
    {
      id: "define-implication", branch: "shared", requires: ["formula-disjunction"], next: "formula-implication", chapter: "第三章 · 命题语义", title: "构造蕴含函数",
      copy: "蕴含同样是二元真值函数。它只有在前件为真、后件为假时输出假，其余三个输入都输出真。",
      goal: "用四个有序对与四元素集构造蕴含函数 →。", tools: ["ord", "set4"], artifacts: ["truth-implication-function"],
      spawnPositions: [{ x: 195, y: 40 }, { x: 195, y: 150 }, { x: 195, y: 260 }, { x: 195, y: 370 }, { x: 370, y: 220 }],
      nodes: [fixed("imp-input-tt", "函数输入", orderedPair(TRUTH_TRUE, TRUTH_TRUE), "set", 20, 40, "⟨真,真⟩"), fixed("imp-input-tf", "函数输入", orderedPair(TRUTH_TRUE, TRUTH_FALSE), "set", 20, 150, "⟨真,假⟩"), fixed("imp-input-ft", "函数输入", orderedPair(TRUTH_FALSE, TRUTH_TRUE), "set", 20, 260, "⟨假,真⟩"), fixed("imp-input-ff", "函数输入", orderedPair(TRUTH_FALSE, TRUTH_FALSE), "set", 20, 370, "⟨假,假⟩"), fixed("imp-true", "函数值", TRUTH_TRUE, "set", 370, 45, "真"), fixed("imp-false", "函数值", TRUTH_FALSE, "set", 370, 395, "假"), goal("set", 790, 220)],
      hint: "只有 ⟨真,假⟩ 指向假；另外三个真值对全部指向真。最后用四元素集收集四条函数边。",
      definition: ["蕴含的二值函数图", `<p>本关只构造蕴含在经典二值语义中的函数。它在真前件导向假后件时失败。</p><code>⟨真,真⟩↦真　⟨真,假⟩↦假\n⟨假,真⟩↦真　⟨假,假⟩↦真</code>`], unlock: "已构造二值蕴含函数 →；蕴含语法构造器已解锁",
      validate: ({ value }) => equal(value, truthImplicationFunction)
        ? pass("蕴含函数构造完成：只有真前件、假后件这一种输入得到假。")
        : fail("检查完整函数图：只有 ⟨真,假⟩ 指向假，其余三个输入都指向真。")
    },
    {
      id: "formula-implication", branch: "shared", requires: ["define-implication"], next: "build-formula", chapter: "第三章 · 逻辑语言", title: "构造蕴含公式",
      copy: "蕴含语法构造器把前件和后件接到有方向的根。这里先学习它的公式结构与二值求值，证明规则留到之后。",
      goal: "构造公式 P→Q，并观察它的语法树与求值过程。", tools: ["propP", "propQ", "imp"], artifacts: ["implication-formula"], formulaViews: true, formulaViewOptions: ["construction", "syntax", "evaluation"], valuationProps: ["P", "Q"], formalValuation: true, truthTable: true,
      spawnPositions: [{ x: 195, y: 120 }, { x: 195, y: 320 }, { x: 370, y: 220 }], nodes: [goal("formula", 790, 220)],
      hint: "把 P 接到蕴含的前件端口，把 Q 接到后件端口，再把 P→Q 接入目标。",
      definition: ["蕴含公式有方向", `<p>P 是前件，Q 是后件；交换两侧会得到不同公式。求值先读取两侧，再调用刚刚构造的蕴含函数。</p><code>v(P→Q)=v(P)→v(Q)</code>`], unlock: "否定、合取、析取与蕴含的语法和二值语义已经接通",
      validate: ({ value }) => formulaKey(value) === formulaKey(implicationFormula)
        ? pass("P 成为前件，Q 成为后件；蕴含根保留了两侧的方向。")
        : fail(`当前公式是 ${prettyFormula(value)}；目标前件是 P，后件是 Q。`)
    },
    {
      id: "build-formula", branch: "shared", requires: ["formula-implication"], next: "build-model", chapter: "第三章 · 语言", title: "把公式造出来",
      copy: "公式也可以像机器一样逐层搭建。先造 P(x)，再组合，最后把变量绑定起来。",
      goal: "构造 ∀x(¬P(x) ∨ P(x)) 的语法树。", tools: ["varx", "predP", "not", "or", "forall"],
      nodes: [goal("formula")], hint: "同一个 P(x) 的输出可以同时送入否定和析取；x 也能同时服务两个节点。",
      definition: ["公式是有限语法树", definitions.syntax], unlock: "新机器：有限模型求值器",
      validate: ({ value }) => formulaKey(value) === formulaKey(tautologyExpanded)
        ? pass(`语法树编译成功：${prettyFormula(value)}`) : fail(`当前语法树：${prettyFormula(value)}。检查量词绑定和析取两侧。`)
    },
    {
      id: "build-model", branch: "shared", requires: ["build-formula"], next: "countermodel", chapter: "第四章 · 语义", title: "让公式成真",
      copy: "符号还没有意义。为 P、Q 选择解释，制造一个满足 ∀x(P(x)∨Q(x)) 的两元素世界。",
      goal: "构造任意一个使公式为真的模型。", tools: ["set1", "set2", "model"],
      nodes: [fixed("n0", "论域元素 0", numeral(0), "set", 50, 140, "0"), fixed("n1", "论域元素 1", numeral(1), "set", 50, 310, "1"), goal("model")],
      hint: "让每个论域元素至少落入 P 或 Q 的解释之一。P 与 Q 可以重叠。",
      definition: ["模型赋予符号意义", definitions.models], unlock: "新能力：自动寻找反例",
      validate: ({ value }) => {
        const good = value.domain.every((x) => contains(value.P, x) || contains(value.Q, x));
        return good ? pass("量词巡检完毕：0 和 1 都满足 P(x)∨Q(x)。", "2 / 2 赋值通过")
          : fail("发现反例：论域中至少有一个元素既不属于 P，也不属于 Q。");
      }
    },
    {
      id: "countermodel", branch: "shared", requires: ["build-model"], next: "first-proof", chapter: "第四章 · 语义", title: "用反模型击破推理",
      copy: "一个反模型足以击破貌似合理的推理。让前提为真，同时让结论为假。",
      goal: "反驳：∀x(P∨Q)，所以 ∀xP ∨ ∀xQ。", tools: ["set1", "set2", "model"],
      nodes: [fixed("n0", "论域元素 0", numeral(0), "set", 50, 140, "0"), fixed("n1", "论域元素 1", numeral(1), "set", 50, 310, "1"), goal("model")],
      hint: "前提要求每个人至少属于一边；结论为假则要求 P、Q 都不能包含所有人。",
      definition: ["有效性与反模型", `${definitions.models}<p>推理有效意味着：不存在任何“前提真而结论假”的模型。</p>`], unlock: "语义层完成：进入证明机器",
      validate: ({ value }) => {
        const premise = value.domain.every((x) => contains(value.P, x) || contains(value.Q, x));
        const conclusion = value.domain.every((x) => contains(value.P, x)) || value.domain.every((x) => contains(value.Q, x));
        return premise && !conclusion ? pass("反模型成立：前提为真、结论为假。推理被击破。", "前提 TRUE　结论 FALSE")
          : fail(`当前模型：前提 ${premise ? "真" : "假"}，结论 ${conclusion ? "真" : "假"}。需要“真 / 假”。`);
      }
    },
    {
      id: "first-proof", branch: "shared", requires: ["countermodel"], next: null, chapter: "第五章 · 证明", title: "建造第一份证明",
      copy: "这一次不再枚举世界。把局部可靠的规则连成一棵可以机械检查的证明树。",
      goal: "证明 ∀x(P(x) → P(x))，并解除所有假设。", tools: ["assumption", "impIntro", "forallIntro"],
      nodes: [fixed("px", "公式", px, "formula", 60, 220, "P(x)"), goal("proof")],
      hint: "先暂时假设 P(x)，再用蕴含引入解除它，最后进行全称推广。",
      definition: ["证明是可检查的树", definitions.proof], unlock: "纵向切片完成：集合、程序、语法、模型与证明已经接通",
      validate: ({ value }) => formulaKey(value.conclusion) === formulaKey(identityFormula) && value.open.length === 0
        ? pass("证明核验通过：结论匹配，且没有遗留的开放假设。", "3 / 3 规则合法")
        : fail(`当前结论：${prettyFormula(value.conclusion)}；开放假设：${value.open.length} 个。`)
    }
  ];

  const levelCatalog = new Map(levels.map((level) => [level.id, level]));
  const mapGroups = [
    { title: "公共起点", detail: "两条路线共享", className: "common-route", ids: ["ignite-empty", "build-one"] },
    { title: "策梅洛路线", detail: "主干 · 推进结构章", className: "main-route", ids: ["z-build-two", "z-abstract-successor", "z-run-successor"] },
    { title: "冯·诺依曼路线", detail: "可选 · 并集与历史", className: "optional-route", ids: ["vn-build-two", "vn-wrap-two", "vn-build-three", "vn-abstract-successor", "vn-run-successor"] },
    { title: "结构基础", detail: "有限收集、有序对、关系与函数值", className: "shared-route", ids: ["build-three-set", "ordered-pair", "cartesian-product", "relation-subset", "build-function", "function-value-graph", "function-apply"] },
    { title: "有限序列", detail: "可选 · 投影、具体定义域与追加", className: "sequence-route", ids: ["sequence-empty", "sequence-one", "sequence-intersection", "sequence-project-first", "sequence-abstract-first", "sequence-concrete-domain", "sequence-append-three"] },
    { title: "逻辑主线", detail: "语言、语义与证明", className: "shared-route", ids: ["proposition-atom", "define-conjunction", "proposition-conjunction", "build-valuation", "apply-valuation", "evaluate-conjunction", "define-negation", "formula-negation", "define-disjunction", "formula-disjunction", "define-implication", "formula-implication", "build-formula", "build-model", "countermodel", "first-proof"] }
  ];
  const futureMapGroups = [
    { title: "高级序列理论", detail: "等待逻辑语言与分离能力", className: "future-route", nodes: ["定义域存在性", "通用 Dom", "通用 Append", "唯一分解", "序列连接"] },
    { title: "数值递归", detail: "后续 PA 路线", className: "future-route", nodes: ["有限迭代", "通用递归器", "加法", "递归唯一性"] },
    { title: "归纳方法", detail: "完成证明系统后开放", className: "future-route", nodes: ["归纳共同模板", "PA 归纳公理模式", "自然演绎归纳规则"] },
    { title: "等价的归纳原理", detail: "后续开放", className: "future-route", nodes: ["强归纳法", "自然数良序原理", "等价性桥梁"] }
  ];

  if (levelCatalog.size !== levels.length) throw new Error("关卡 ID 必须唯一。");
  levels.forEach((level) => {
    [...(level.requires || []), level.next, level.alternateNext].filter(Boolean).forEach((id) => {
      if (!levelCatalog.has(id)) throw new Error(`关卡 ${level.id} 引用了不存在的关卡 ${id}。`);
    });
  });
  const mappedIds = mapGroups.flatMap((group) => group.ids);
  if (mappedIds.length !== levels.length || new Set(mappedIds).size !== levels.length) throw new Error("关卡地图必须恰好包含每个关卡一次。");

  function readProgress() {
    try {
      const currentSave = localStorage.getItem("logic-foundry-progress-v14");
      const v13Save = localStorage.getItem("logic-foundry-progress-v13");
      const v12Save = localStorage.getItem("logic-foundry-progress-v12");
      const v11Save = localStorage.getItem("logic-foundry-progress-v11");
      const v10Save = localStorage.getItem("logic-foundry-progress-v10");
      const v9Save = localStorage.getItem("logic-foundry-progress-v9");
      const v8Save = localStorage.getItem("logic-foundry-progress-v8");
      const saved = JSON.parse(currentSave || v13Save || v12Save || v11Save || v10Save || v9Save || v8Save || localStorage.getItem("logic-foundry-progress-v7") || localStorage.getItem("logic-foundry-progress-v6") || localStorage.getItem("logic-foundry-progress-v5") || "{}");
      const rawCompleted = Array.isArray(saved.completedIds) ? saved.completedIds : [];
      const completed = Array.isArray(saved.completedIds) ? saved.completedIds.filter((id) => levelCatalog.has(id)) : [];
      let currentLevelId = levelCatalog.has(saved.currentLevelId) ? saved.currentLevelId : "ignite-empty";
      if (!currentSave && saved.currentLevelId === "function-domain") currentLevelId = completed.includes("build-function") ? "function-value-graph" : "build-function";
      const retiredV8SequenceIds = ["sequence-append-two", "sequence-next-position", "sequence-abstract-append"];
      if (!currentSave && retiredV8SequenceIds.includes(saved.currentLevelId)) currentLevelId = completed.includes("sequence-one") ? "sequence-intersection" : "sequence-empty";
      const legacyBeforeV8 = !currentSave && !v13Save && !v12Save && !v11Save && !v10Save && !v9Save && !v8Save;
      const removedSequenceIds = ["sequence-encode", "sequence-extend", "sequence-decompose", "recursion-trace", "finite-recursor", "define-addition", "define-concat"];
      if (legacyBeforeV8 && removedSequenceIds.includes(saved.currentLevelId)) {
        currentLevelId = completed.includes("ordered-pair") ? "cartesian-product" : "ordered-pair";
      }
      const oldStructureIds = ["build-relation", "repair-function"];
      const unfinishedOldFormula = saved.currentLevelId === "build-formula" && !rawCompleted.includes("build-formula");
      const unfinishedLegacySequence = ["sequence-empty", "sequence-one", "sequence-append-two", "sequence-next-position", "sequence-abstract-append"].includes(saved.currentLevelId) && !rawCompleted.includes(saved.currentLevelId);
      if (legacyBeforeV8 && (oldStructureIds.includes(saved.currentLevelId) || unfinishedOldFormula || unfinishedLegacySequence)) currentLevelId = completed.includes("ordered-pair") ? "cartesian-product" : "ordered-pair";
      if (legacyBeforeV8 && saved.currentLevelId === "induction-template") currentLevelId = completed.includes("build-formula") ? "build-model" : (completed.includes("ordered-pair") ? "cartesian-product" : "ordered-pair");
      if (!currentSave && currentLevelId === "ordered-pair" && !completed.includes("ordered-pair")) currentLevelId = "build-three-set";
      if (!currentSave && currentLevelId === "function-apply" && !completed.includes("function-apply")) currentLevelId = "function-value-graph";
      if (!currentSave && currentLevelId === "build-formula" && !completed.includes("build-formula") && !completed.includes("formula-implication")) currentLevelId = completed.includes("proposition-conjunction") ? "build-valuation" : "proposition-atom";
      if (!currentSave && currentLevelId === "proposition-conjunction" && !completed.includes("proposition-conjunction")) currentLevelId = "proposition-atom";
      return { completed, currentLevelId };
    } catch (_) { return { completed: [], currentLevelId: "ignite-empty" }; }
  }

  const savedProgress = readProgress();
  const state = {
    currentLevelId: savedProgress.currentLevelId,
    completed: new Set(savedProgress.completed),
    nodes: [], connections: [], selectedOutput: null, nextId: 1, sound: true,
    displayMode: localStorage.getItem("logic-foundry-display-mode-v1") === "encoding" ? "encoding" : "semantic",
    formulaView: "construction", valuation: { P: true, Q: false }, truthTableRows: new Map(), truthTableFormulaKey: null
  };

  const tutorial = { step: 0, selected: null, slots: [null, null] };
  const unionTutorial = { step: 0, activated: false, context: "" };
  const intersectionTutorial = { activated: false };

  function pass(message, count = "全部检查通过") { return { ok: true, message, count }; }
  function fail(message) { return { ok: false, message, count: "检查未通过" }; }
  function currentLevel() { return levelCatalog.get(state.currentLevelId); }
  function currentNumeralSystem() {
    const branch = currentLevel() && currentLevel().branch;
    if (branch === "zermelo") return "zermelo";
    if (branch === "von-neumann" || branch === "finite-sequence") return "von-neumann";
    if (branch === "common") return "zermelo";
    return "none";
  }
  function prettyCurrentSet(value, depth = 0) { return prettySet(value, depth, currentNumeralSystem()); }
  function resolvedNext(level = currentLevel()) {
    if (level.id === "vn-run-successor") {
      return ["z-build-two", "z-abstract-successor", "z-run-successor"].find((id) => !state.completed.has(id)) || "build-three-set";
    }
    return level.next;
  }
  function levelMarker(level) {
    if (level.branch === "common") return String(mapGroups[0].ids.indexOf(level.id) + 1).padStart(2, "0");
    if (level.branch === "zermelo") return String(mapGroups[1].ids.indexOf(level.id) + 3).padStart(2, "0");
    if (level.branch === "von-neumann") return `V${mapGroups[2].ids.indexOf(level.id) + 1}`;
    if (level.branch === "finite-sequence") return `S${mapGroups[4].ids.indexOf(level.id) + 1}`;
    const sharedIds = [...mapGroups[3].ids, ...mapGroups[5].ids];
    return String(sharedIds.indexOf(level.id) + 6).padStart(2, "0");
  }
  function isAvailable(levelOrId) {
    const level = typeof levelOrId === "string" ? levelCatalog.get(levelOrId) : levelOrId;
    return Boolean(level) && (level.requires || []).every((id) => state.completed.has(id));
  }
  function saveProgress() {
    localStorage.setItem("logic-foundry-progress-v14", JSON.stringify({ completedIds: [...state.completed], currentLevelId: state.currentLevelId }));
  }

  function init() {
    loadLevel(isAvailable(state.currentLevelId) || state.completed.has(state.currentLevelId) ? state.currentLevelId : "ignite-empty");
    $("#runButton").addEventListener("click", run);
    $("#clearButton").addEventListener("click", clearCanvas);
    $("#hintButton").addEventListener("click", showHint);
    $("#definitionButton").addEventListener("click", showDefinition);
    $("#definitionDialog .dialog-close").addEventListener("click", () => $("#definitionDialog").close());
    $("#nextButton").addEventListener("click", nextLevel);
    $("#alternateNextButton").addEventListener("click", alternateNextLevel);
    $("#mapButton").addEventListener("click", openMap);
    $("#mapDialog .dialog-close").addEventListener("click", () => $("#mapDialog").close());
    $("#soundToggle").addEventListener("click", toggleSound);
    $("#displayModeToggle").addEventListener("click", toggleDisplayMode);
    $("#displayCoachmarkClose").addEventListener("click", () => finishDisplayCoachmark(true));
    $("#tutorialReplay").addEventListener("click", openTutorial);
    $("#unionTutorialReplay").addEventListener("click", openUnionTutorial);
    $("#intersectionTutorialReplay").addEventListener("click", openIntersectionTutorial);
    $("#tutorialSkip").addEventListener("click", finishTutorial);
    $("#tutorialNext").addEventListener("click", advanceTutorial);
    document.querySelectorAll(".tutorial-token").forEach((button) => button.addEventListener("click", () => selectTutorialToken(button.dataset.token)));
    document.querySelectorAll("[data-slot]").forEach((button) => button.addEventListener("click", () => fillTutorialSlot(Number(button.dataset.slot))));
    $("#unionTutorialSkip").addEventListener("click", finishUnionTutorial);
    $("#unionActivate").addEventListener("click", activateUnionTutorial);
    $("#unionTutorialNext").addEventListener("click", advanceUnionTutorial);
    $("#intersectionTutorialSkip").addEventListener("click", finishIntersectionTutorial);
    $("#intersectionActivate").addEventListener("click", activateIntersectionTutorial);
    $("#intersectionTutorialNext").addEventListener("click", finishIntersectionTutorial);
    document.querySelectorAll("[data-formula-view]").forEach((button) => button.addEventListener("click", () => setFormulaView(button.dataset.formulaView)));
    document.querySelectorAll("[data-valuation-prop]").forEach((button) => button.addEventListener("click", () => toggleValuation(button.dataset.valuationProp)));
    window.addEventListener("resize", () => { fitFixedNodes(); renderCanvas(); positionDisplayCoachmark(); });
    updateDisplayModeButton();
    if (!localStorage.getItem("logic-foundry-tutorial-v2")) setTimeout(openTutorial, 250);
  }

  function renderRail() {
    const level = currentLevel();
    const labels = { common: "公共起点", zermelo: "策梅洛主干", "von-neumann": "冯·诺依曼分支", "finite-sequence": "有限序列支线", shared: "逻辑主线" };
    $("#routeLabel").textContent = labels[level.branch] || "关卡地图";
    renderLevelMap();
  }

  function renderLevelMap() {
    const map = $("#levelMap");
    map.innerHTML = "";
    mapGroups.forEach((group) => {
      const section = document.createElement("section");
      section.className = `map-section ${group.className}`;
      section.innerHTML = `<h3>${escapeHtml(group.title)}</h3><small>${escapeHtml(group.detail)}</small><div class="map-levels"></div>`;
      const list = section.querySelector(".map-levels");
      group.ids.forEach((id, index) => {
        const level = levelCatalog.get(id);
        const completed = state.completed.has(id);
        const available = isAvailable(level);
        const current = id === state.currentLevelId;
        const button = document.createElement("button");
        button.dataset.levelId = id;
        button.className = `map-level ${completed ? "completed" : ""} ${available ? "available" : "locked"} ${current ? "current" : ""}`;
        button.disabled = !available && !completed && !current;
        button.innerHTML = `<i>${completed ? "✓" : String(index + 1).padStart(2, "0")}</i><b>${escapeHtml(level.title)}</b>`;
        button.addEventListener("click", () => { if (!button.disabled) { $("#mapDialog").close(); loadLevel(id); } });
        list.appendChild(button);
      });
      map.appendChild(section);
    });
    futureMapGroups.forEach((group) => {
      const section = document.createElement("section");
      section.className = `map-section ${group.className}`;
      section.innerHTML = `<h3>${escapeHtml(group.title)}</h3><small>${escapeHtml(group.detail)}</small><div class="map-levels"></div>`;
      const list = section.querySelector(".map-levels");
      group.nodes.forEach((title) => {
        const button = document.createElement("button");
        button.className = "map-level future locked";
        button.disabled = true;
        button.innerHTML = `<i>◇</i><b>${escapeHtml(title)}</b><em>后续开放</em>`;
        list.appendChild(button);
      });
      map.appendChild(section);
    });
  }

  function openMap() { renderLevelMap(); $("#mapDialog").showModal(); }

  function loadLevel(id) {
    const level = levelCatalog.get(id);
    if (!level || (!isAvailable(level) && !state.completed.has(id) && id !== state.currentLevelId)) return;
    hideDisplayCoachmark();
    state.currentLevelId = id;
    state.formulaView = "construction";
    state.truthTableRows = new Map();
    state.truthTableFormulaKey = null;
    state.selectedOutput = null;
    state.connections = [];
    state.nodes = level.nodes.map((node) => clone(node));
    fitFixedNodes();
    state.nextId = 1;
    saveProgress();
    $("#chapterLabel").textContent = level.chapter;
    $("#levelNumber").textContent = levelMarker(level);
    $("#levelTitle").textContent = level.title;
    $("#levelCopy").textContent = level.copy;
    $("#goalText").textContent = level.goal;
    $("#consoleBody").innerHTML = `<span class="prompt">›</span> ${escapeHtml(id === "ignite-empty" ? "系统准备完毕。把一个结果接入金色的目标节点。" : "新工作台已就绪。")} `;
    $("#testCount").textContent = "等待构造";
    $("#formulaViewTabs").hidden = !level.formulaViews;
    document.querySelectorAll("[data-formula-view]").forEach((button) => {
      button.hidden = level.formulaViews && !(level.formulaViewOptions || ["construction", "syntax", "evaluation"]).includes(button.dataset.formulaView);
    });
    renderToolbox();
    renderCanvas();
    renderRail();
    const unionIntroLevel = id === "vn-build-three" || id === "build-three-set";
    $("#unionTutorialReplay").hidden = !localStorage.getItem("logic-foundry-union-tutorial-v5") && !unionIntroLevel;
    $("#intersectionTutorialReplay").hidden = !state.completed.has("sequence-intersection") && id !== "sequence-intersection";
    if (unionIntroLevel && !localStorage.getItem("logic-foundry-union-tutorial-v5")) setTimeout(openUnionTutorial, 260);
    if (id === "sequence-intersection" && !localStorage.getItem("logic-foundry-intersection-tutorial-v9")) setTimeout(openIntersectionTutorial, 260);
    if (id === "sequence-project-first" && !localStorage.getItem("logic-foundry-display-coach-v1")) setTimeout(openDisplayCoachmark, 360);
  }

  function fitFixedNodes() {
    const wrap = $("#canvasWrap");
    if (!wrap) return;
    const maxX = Math.max(400, wrap.clientWidth - 175);
    const maxY = Math.max(330, wrap.clientHeight - 82);
    state.nodes.filter((node) => node.fixed).forEach((node) => {
      node.x = Math.min(node.x, maxX);
      node.y = Math.min(node.y, maxY);
    });
  }

  function renderToolbox() {
    const box = $("#toolbox");
    box.innerHTML = "";
    currentLevel().tools.forEach((type) => {
      const def = registry[type];
      const button = document.createElement("button");
      button.className = "tool-button";
      button.innerHTML = `<code>${escapeHtml(def.glyph)}</code><b>${escapeHtml(def.label)}</b>`;
      button.addEventListener("click", () => addNode(type));
      box.appendChild(button);
    });
  }

  function addNode(type) {
    const offset = state.nodes.filter((node) => !node.fixed).length;
    const preset = (currentLevel().spawnPositions || [])[offset];
    state.nodes.push({
      id: `node-${state.nextId++}`, type, x: preset ? preset.x : 250 + (offset % 3) * 170, y: preset ? preset.y : 70 + (offset % 4) * 92,
      inputs: registry[type].inputs, out: registry[type].out
    });
    renderCanvas();
    tone(330 + offset * 24, .035);
  }

  function clearCanvas() {
    const fixedNodes = currentLevel().nodes.map((node) => clone(node));
    state.nodes = fixedNodes;
    state.connections = [];
    state.selectedOutput = null;
    state.truthTableRows = new Map();
    state.truthTableFormulaKey = null;
    renderCanvas();
    log("画布已清空，固定输入仍然保留。", false, "等待构造");
  }

  function renderCanvas() {
    const canvas = $("#nodeCanvas");
    canvas.innerHTML = "";
    $("#canvasTip").style.display = state.nodes.length > currentLevel().nodes.length ? "none" : "block";
    state.nodes.forEach((node) => canvas.appendChild(createNodeElement(node)));
    renderFormulaWorkspace();
    requestAnimationFrame(drawWires);
  }

  function setFormulaView(view) {
    const options = currentLevel().formulaViewOptions || ["construction", "syntax", "evaluation"];
    if (!currentLevel().formulaViews || !options.includes(view)) return;
    state.formulaView = view;
    renderFormulaWorkspace();
  }

  function toggleValuation(name) {
    if (!Object.prototype.hasOwnProperty.call(state.valuation, name)) return;
    state.valuation[name] = !state.valuation[name];
    renderFormulaWorkspace();
  }

  function renderFormulaWorkspace() {
    const level = currentLevel();
    const enabled = Boolean(level.formulaViews);
    const inspectorMode = enabled && state.formulaView !== "construction";
    $("#canvasWrap").classList.toggle("inspector-mode", inspectorMode);
    $("#formulaInspector").hidden = !inspectorMode;
    document.querySelectorAll("[data-formula-view]").forEach((button) => button.classList.toggle("active", button.dataset.formulaView === state.formulaView));
    if (!inspectorMode) return;

    const evaluation = state.formulaView === "evaluation";
    $("#valuationControls").hidden = !evaluation;
    $("#valuationControls .eyebrow").textContent = level.formalValuation ? "当前赋值" : "当前真值";
    $("#evaluationEquation").hidden = true;
    $("#truthTablePanel").hidden = true;
    document.querySelectorAll("[data-valuation-prop]").forEach((button) => {
      const name = button.dataset.valuationProp;
      button.hidden = !(level.valuationProps || []).includes(name);
      const truth = state.valuation[name];
      button.textContent = level.formalValuation ? `v(${name}): ${truth ? "真" : "假"}` : `${name}: ${truth ? "真" : "假"}`;
      button.classList.toggle("true", truth);
      button.classList.toggle("false", !truth);
    });

    let formula;
    try { formula = evaluateNode("goal"); }
    catch (_) {
      $("#formulaTree").className = "formula-tree";
      $("#formulaTree").innerHTML = `<p class="formula-tree-empty">目标接口还没有收到完整公式。<br>切回“构造网络”完成接线。</p>`;
      $("#formulaInspectorNote").textContent = evaluation ? "求值必须从一棵完整的公式树开始。" : "语法树由构造网络编译而来。";
      return;
    }

    $("#formulaTree").className = `formula-tree ${evaluation ? "evaluation" : "syntax"}`;
    $("#formulaTree").innerHTML = renderFormulaTreeNode(formula, evaluation);
    if (evaluation) {
      const result = evaluatePropositional(formula, state.valuation);
      const equation = level.formalValuation
        ? formalEvaluationEquation(formula)
        : (formula.kind === "prop"
          ? `${formula.name} 当前为${result ? "真" : "假"}`
          : `P = ${state.valuation.P ? "真" : "假"}，Q = ${state.valuation.Q ? "真" : "假"}；${state.valuation.P ? "真" : "假"} ∧ ${state.valuation.Q ? "真" : "假"} = ${result ? "真" : "假"}`);
      $("#evaluationEquation").textContent = equation;
      $("#evaluationEquation").hidden = false;
      if (level.truthTable) renderTruthTable(formula, level, result);
      $("#formulaInspectorNote").textContent = level.formalValuation
        ? formalEvaluationNote(formula)
        : (formula.kind === "prop"
          ? "改变 P 当前显示的真值，不会改变语法树中的 P。"
          : "先读取 P、Q 当前显示的真值，再把这两个真值送入上一关构造的合取函数。");
    } else {
      $("#formulaInspectorNote").textContent = syntaxTreeNote(formula);
    }
  }

  function syntaxTreeNote(formula) {
    if (formula.kind === "prop") return `${formula.name} 是不能继续分解的原子公式，因此语法树只有一片叶子。`;
    if (formula.kind === "not") return `¬ 是拥有一个子公式的根；${prettyFormula(formula.body)} 是它下方唯一的子树。`;
    if (formula.kind === "and") return `${prettyFormula(formula.left)}、${prettyFormula(formula.right)} 是左右子树；∧ 是拥有两个子公式的根。`;
    if (formula.kind === "or") return `${prettyFormula(formula.left)}、${prettyFormula(formula.right)} 是左右子树；∨ 是把它们接到一起的根。`;
    if (formula.kind === "imp") return `${prettyFormula(formula.left)} 是前件子树，${prettyFormula(formula.right)} 是后件子树；→ 保留了两侧的方向。`;
    return "语法树由构造网络中的公式节点逐层生成。";
  }

  function renderTruthTable(formula, level, result) {
    const props = level.valuationProps || [];
    const currentFormulaKey = formulaKey(formula);
    if (state.truthTableFormulaKey !== currentFormulaKey) {
      state.truthTableFormulaKey = currentFormulaKey;
      state.truthTableRows = new Map();
    }
    const rowKey = props.map((name) => state.valuation[name] ? "1" : "0").join("");
    if (!state.truthTableRows.has(rowKey)) {
      state.truthTableRows.set(rowKey, { values: props.map((name) => Boolean(state.valuation[name])), result });
    }
    const formulaLabel = formulaWithoutOuterParens(formula);
    const rows = [...state.truthTableRows.entries()].sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey)).map(([keyValue, row]) => `<tr class="${keyValue === rowKey ? "current" : ""}">${row.values.map((value) => `<td>${truthText(value)}</td>`).join("")}<td>${truthText(row.result)}</td></tr>`).join("");
    $("#truthTablePanel").innerHTML = `<table><thead><tr>${props.map((name) => `<th>${escapeHtml(name)}</th>`).join("")}<th>${escapeHtml(formulaLabel)}</th></tr></thead><tbody>${rows}</tbody></table>`;
    $("#truthTablePanel").hidden = false;
  }

  function evaluatePropositional(formula, valuation) {
    if (formula.kind === "prop") return Boolean(valuation[formula.name]);
    if (formula.kind === "not") {
      const inputValue = evaluatePropositional(formula.body, valuation) ? TRUTH_TRUE : TRUTH_FALSE;
      return equal(applyFunction(truthNegationFunction, inputValue), TRUTH_TRUE);
    }
    if (["and", "or", "imp"].includes(formula.kind)) {
      const left = evaluatePropositional(formula.left, valuation) ? TRUTH_TRUE : TRUTH_FALSE;
      const right = evaluatePropositional(formula.right, valuation) ? TRUTH_TRUE : TRUTH_FALSE;
      const graph = ({ and: truthConjunctionFunction, or: truthDisjunctionFunction, imp: truthImplicationFunction })[formula.kind];
      return equal(applyFunction(graph, orderedPair(left, right)), TRUTH_TRUE);
    }
    throw new Error("当前命题求值器不支持这种公式节点。");
  }

  function truthText(value) { return value ? "真" : "假"; }

  function formulaWithoutOuterParens(formula) {
    const text = prettyFormula(formula);
    return text.startsWith("(") && text.endsWith(")") ? text.slice(1, -1) : text;
  }

  function formalEvaluationEquation(formula) {
    const result = evaluatePropositional(formula, state.valuation);
    if (formula.kind === "prop") return `v(${formula.name}) = ${truthText(result)}`;
    if (formula.kind === "not") {
      const bodyTruth = evaluatePropositional(formula.body, state.valuation);
      return `v(${prettyFormula(formula)}) = ¬v(${formulaWithoutOuterParens(formula.body)}) = ¬${truthText(bodyTruth)} = ${truthText(result)}`;
    }
    const leftTruth = evaluatePropositional(formula.left, state.valuation);
    const rightTruth = evaluatePropositional(formula.right, state.valuation);
    const symbol = ({ and: "∧", or: "∨", imp: "→" })[formula.kind];
    return `v(${formulaWithoutOuterParens(formula)}) = v(${formulaWithoutOuterParens(formula.left)}) ${symbol} v(${formulaWithoutOuterParens(formula.right)}) = ${truthText(leftTruth)} ${symbol} ${truthText(rightTruth)} = ${truthText(result)}`;
  }

  function formalEvaluationNote(formula) {
    if (formula.kind === "not") return "先由 v 读取叶子 P，再把结果送入已经构造的否定函数。";
    if (formula.kind === "or") return "先求出左、右子公式的值，再把两个结果送入已经构造的析取函数。";
    if (formula.kind === "imp") return "先由 v 读取前件与后件，再把两个真值按方向送入已经构造的蕴含函数。";
    return "求值沿语法树从叶子逐层到达根。";
  }

  function formulaTreeHeight(formula) {
    if (formula.kind === "prop") return 0;
    if (formula.kind === "not") return 1 + formulaTreeHeight(formula.body);
    if (["and", "or", "imp"].includes(formula.kind)) return 1 + Math.max(formulaTreeHeight(formula.left), formulaTreeHeight(formula.right));
    return 0;
  }

  function renderFormulaTreeNode(formula, evaluation, totalHeight = formulaTreeHeight(formula), depth = 0) {
    const leaf = formula.kind === "prop";
    const symbol = leaf ? formula.name : ({ not: "¬", and: "∧", or: "∨", imp: "→" })[formula.kind];
    const truth = evaluation ? evaluatePropositional(formula, state.valuation) : null;
    const delay = evaluation ? Math.max(0, totalHeight - depth) * 280 : 0;
    const detail = leaf ? "命题变元" : prettyFormula(formula);
    const badge = evaluation ? `<em class="${truth ? "true" : "false"}">${truth ? "真" : "假"}</em>` : "";
    const childFormulas = leaf ? [] : (formula.kind === "not" ? [formula.body] : [formula.left, formula.right]);
    const children = childFormulas.length
      ? `<div class="formula-tree-children ${childFormulas.length === 1 ? "unary" : "binary"}">${childFormulas.map((child) => renderFormulaTreeNode(child, evaluation, totalHeight, depth + 1)).join("")}</div>`
      : "";
    return `<div class="formula-tree-node"><div class="formula-tree-card" style="--eval-delay:${delay}ms"><b>${escapeHtml(symbol)}</b><small>${escapeHtml(detail)}</small>${badge}</div>${children}</div>`;
  }

  function createNodeElement(node) {
    const def = node.type === "source" || node.type === "goal" ? node : registry[node.type];
    const el = document.createElement("article");
    el.className = `logic-node ${node.fixed ? "fixed" : ""} ${node.goal ? "goal" : ""}`;
    el.dataset.id = node.id;
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    const nodeBody = node.goal ? "把最终结果接到这里" : outputPreview(node);
    el.innerHTML = `<div class="node-head"><span>${escapeHtml(def.label)}</span><code>${escapeHtml(def.glyph)}</code></div><div class="node-body">${nodeBody}</div>`;

    (node.inputs || []).forEach((inputDef, index) => {
      const port = document.createElement("button");
      const source = state.nodes.find((item) => item.id === state.selectedOutput);
      const compatibility = source ? (source.out === inputDef.type ? "compatible" : "incompatible") : "";
      port.className = `port input ${isInputConnected(node.id, index) ? "connected" : ""} ${compatibility}`;
      port.style.top = `${24 + ((index + 1) * 42 / ((node.inputs || []).length + 1))}px`;
      port.setAttribute("aria-label", `${inputDef.label} · ${inputDef.type}`);
      port.appendChild(portLabel(`${inputDef.label} · ${typeName(inputDef.type)}`));
      port.addEventListener("click", (event) => { event.stopPropagation(); connectTo(node.id, index, inputDef); });
      el.appendChild(port);
    });
    if (node.out) {
      const port = document.createElement("button");
      port.className = `port output ${state.selectedOutput === node.id ? "selected" : ""}`;
      const outputLabel = def.outLabel || node.label || "输出";
      port.setAttribute("aria-label", `${outputLabel} · ${node.out}`);
      port.appendChild(portLabel(`${outputLabel} · ${typeName(node.out)}`));
      port.addEventListener("click", (event) => { event.stopPropagation(); selectOutput(node.id); });
      el.appendChild(port);
    }
    if (!node.fixed) {
      const del = document.createElement("button");
      del.className = "delete-node"; del.textContent = "×"; del.title = "移除节点";
      del.addEventListener("click", (event) => { event.stopPropagation(); deleteNode(node.id); });
      el.appendChild(del);
    }
    el.querySelector(".node-body").addEventListener("click", (event) => { event.stopPropagation(); inspectNode(node); });
    enableDrag(el, node);
    return el;
  }

  function typeName(type) {
    return ({ set: "集合", term: "项", formula: "公式", model: "模型", proof: "证明" })[type] || type;
  }

  function portLabel(text) {
    const label = document.createElement("span");
    label.className = "port-label";
    label.textContent = text;
    return label;
  }

  function outputPreview(node) {
    if (node.type === "source") {
      if (node.symbolic) return escapeHtml(node.glyph);
      if (node.out === "set") return state.displayMode === "semantic" ? escapeHtml(node.glyph) : escapeHtml(formatEncodedSet(node.value, node));
      if (node.out === "formula") return prettyFormula(node.value);
      return escapeHtml(node.glyph);
    }
    return escapeHtml(registry[node.type].glyph);
  }

  function selectOutput(nodeId) {
    state.selectedOutput = state.selectedOutput === nodeId ? null : nodeId;
    if (state.selectedOutput && !localStorage.getItem("logic-foundry-multiwire-tip-v2")) {
      log("提示：同一个输出可以反复选择并连接到多个输入端。", true, "接线技巧");
      localStorage.setItem("logic-foundry-multiwire-tip-v2", "seen");
    }
    renderCanvas();
  }

  function connectTo(targetId, inputIndex, inputDef) {
    if (!state.selectedOutput) {
      log(`这是“${inputDef.label}”端口。请先选择一个红色输出端。`, false, "等待接线");
      return;
    }
    const source = state.nodes.find((node) => node.id === state.selectedOutput);
    if (!source || source.id === targetId) return;
    if (source.out !== inputDef.type) {
      log(`端口类型不匹配：${typeName(source.out)}不能接入“${inputDef.label}”。`, false, "类型错误");
      tone(130, .08);
      renderCanvas();
      return;
    }
    state.connections = state.connections.filter((c) => !(c.to === targetId && c.input === inputIndex));
    state.connections.push({ from: source.id, to: targetId, input: inputIndex });
    state.selectedOutput = null;
    renderCanvas();
    tone(460, .04);
  }

  function deleteNode(id) {
    state.nodes = state.nodes.filter((node) => node.id !== id);
    state.connections = state.connections.filter((c) => c.from !== id && c.to !== id);
    if (state.selectedOutput === id) state.selectedOutput = null;
    renderCanvas();
  }

  function inspectNode(node) {
    try {
      if (node.symbolic) {
        log(`${node.label} 是符号输入 ${node.glyph}；运行时会代入不同的测试对象。`, true, "符号输入");
        return;
      }
      const value = evaluateNode(node.id);
      const valueType = node.out || (node.inputs && node.inputs[0] && node.inputs[0].type);
      log(`${node.label || registry[node.type].label} 当前结果：${formatValue(valueType, value, node)}`, true, "节点检查");
    } catch (error) {
      log(error.message, false, "节点尚未完成");
    }
  }

  function formatValue(type, value, node = null) {
    if (type === "set") {
      if (state.displayMode === "semantic" && node && node.type === "source") return node.glyph;
      if (state.displayMode === "semantic" && node && node.type === "ord") {
        const [first, second] = decodeOrderedPair(value);
        return `⟨${prettyCurrentSet(first)},${prettyCurrentSet(second)}⟩`;
      }
      return state.displayMode === "encoding" ? formatEncodedSet(value, node) : prettyCurrentSet(value);
    }
    if (type === "term" || type === "formula") return prettyFormula(value);
    if (type === "model") return `D={0,1}，P=${prettyCurrentSet(value.P)}，Q=${prettyCurrentSet(value.Q)}`;
    if (type === "proof") return `结论 ${prettyFormula(value.conclusion)}；开放假设 ${value.open.length} 个`;
    return String(value);
  }

  function formatEncodedSet(value, node = null) {
    const pairLikeNode = node && (node.type === "ord" || (node.type === "source" && String(node.glyph).startsWith("⟨")));
    if (pairLikeNode) {
      try {
        const [first, second] = decodeOrderedPair(value);
        const firstText = prettyCurrentSet(first);
        if (equal(first, second)) return `{{${firstText}}}`;
        return `{{${firstText}},{${firstText},${prettyCurrentSet(second)}}}`;
      } catch (_) { /* A sequence glyph can look pair-like while its value is a graph. */ }
    }
    return prettyCurrentSet(value);
  }

  function isInputConnected(id, input) { return state.connections.some((c) => c.to === id && c.input === input); }

  function enableDrag(el, node) {
    const head = el.querySelector(".node-head");
    head.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const startX = event.clientX, startY = event.clientY, originX = node.x, originY = node.y;
      head.setPointerCapture(event.pointerId);
      const move = (e) => {
        const wrap = $("#canvasWrap").getBoundingClientRect();
        node.x = Math.max(5, Math.min(wrap.width - 160, originX + e.clientX - startX));
        node.y = Math.max(5, Math.min(wrap.height - 82, originY + e.clientY - startY));
        el.style.left = `${node.x}px`; el.style.top = `${node.y}px`; drawWires();
      };
      const up = () => { head.removeEventListener("pointermove", move); head.removeEventListener("pointerup", up); };
      head.addEventListener("pointermove", move); head.addEventListener("pointerup", up);
    });
  }

  function drawWires() {
    const svg = $("#wireLayer");
    const wrap = $("#canvasWrap");
    if (!svg || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
    svg.innerHTML = "";
    state.connections.forEach((connection) => {
      const fromEl = document.querySelector(`[data-id="${connection.from}"] .port.output`);
      const toEl = document.querySelector(`[data-id="${connection.to}"] .port.input:nth-of-type(${connection.input + 1})`);
      if (!fromEl || !toEl) return;
      const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
      const x1 = a.left + a.width / 2 - rect.left, y1 = a.top + a.height / 2 - rect.top;
      const x2 = b.left + b.width / 2 - rect.left, y2 = b.top + b.height / 2 - rect.top;
      const bend = Math.max(45, Math.abs(x2 - x1) * .45);
      const pathData = `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("class", "wire-group");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", "wire"); path.setAttribute("d", pathData);
      const hit = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hit.setAttribute("class", "wire-hit"); hit.setAttribute("d", pathData);
      hit.addEventListener("click", () => {
        state.connections = state.connections.filter((item) => item !== connection);
        renderCanvas();
        log("连接已移除。", true, "画布已更新");
      });
      group.append(path, hit); svg.appendChild(group);
    });
  }

  function evaluateNode(id, context = {}, stack = new Set()) {
    if (stack.has(id)) throw new Error("检测到环路：集合构造不能依赖自身。");
    const node = state.nodes.find((item) => item.id === id);
    if (!node) throw new Error("连接指向了不存在的节点。");
    if (node.type === "source") return Object.prototype.hasOwnProperty.call(context, node.id) ? context[node.id] : clone(node.value);
    if (node.type === "goal") {
      const link = state.connections.find((c) => c.to === id && c.input === 0);
      if (!link) throw new Error("目标接口还没有收到输入。");
      return evaluateNode(link.from, context, stack);
    }
    stack.add(id);
    const def = registry[node.type];
    const values = def.inputs.map((inputDef, index) => {
      const link = state.connections.find((c) => c.to === id && c.input === index);
      if (!link) throw new Error(`${def.label} 缺少输入“${inputDef.label}”。`);
      return evaluateNode(link.from, context, new Set(stack));
    });
    return def.compute(values);
  }

  function run() {
    try {
      const evaluateGoal = (context = {}) => evaluateNode("goal", context);
      const value = evaluateGoal();
      const result = currentLevel().validate({ value, evaluateGoal, nodes: state.nodes, connections: state.connections });
      log(result.message, result.ok, result.count);
      if (result.ok) {
        tone(523, .08); setTimeout(() => tone(659, .08), 90); setTimeout(() => tone(784, .14), 180);
        setTimeout(() => showSuccess(result.message), 420);
      } else tone(145, .12);
    } catch (error) {
      log(error.message, false, "无法运行");
      tone(130, .09);
    }
  }

  function log(message, ok, count) {
    $("#consoleBody").innerHTML = `<span class="prompt">›</span> <span class="${ok ? "ok" : "error"}">${escapeHtml(message)}</span>`;
    $("#testCount").textContent = count;
  }

  function showHint() {
    log(`提示：${currentLevel().hint}`, true, "提示已展开");
  }

  function showDefinition() {
    const [title, body] = currentLevel().definition;
    $("#definitionTitle").textContent = title;
    $("#definitionBody").innerHTML = body;
    $("#definitionDialog").showModal();
  }

  function showSuccess(message) {
    const level = currentLevel();
    state.completed.add(level.id);
    saveProgress();
    const target = resolvedNext(level);
    const isLast = !target;
    const lesson = level.completionLesson || "";
    $("#successTitle").textContent = isLast ? "证明核验通过。" : "构造成立。";
    $("#successText").textContent = message;
    $("#completionLesson").hidden = !lesson;
    $("#completionLesson").innerHTML = lesson;
    $("#successDialog").classList.toggle("has-lesson", Boolean(lesson));
    $("#unlockCard").innerHTML = `<span class="eyebrow">已解锁</span><br>${escapeHtml(level.unlock)}`;
    const hasAlternate = Boolean(level.alternateNext);
    const alternateAvailable = hasAlternate && isAvailable(level.alternateNext);
    $("#alternateNextButton").hidden = !hasAlternate;
    $("#alternateNextButton").disabled = !alternateAvailable;
    $("#alternateNextButton").textContent = hasAlternate
      ? (alternateAvailable ? (level.alternateLabel || "尝试冯·诺依曼分支") : (level.alternateLockedLabel || "支线尚未解锁"))
      : "";
    $("#nextButton").innerHTML = isLast
      ? "查看关卡地图 <b>↺</b>"
      : (level.id === "vn-run-successor" && target !== "ordered-pair" ? "返回策梅洛主干 <b>→</b>" : "进入下一关 <b>→</b>");
    renderRail();
    $("#successDialog").showModal();
  }

  function nextLevel() {
    const target = resolvedNext();
    $("#successDialog").close();
    if (target) loadLevel(target); else openMap();
  }

  function alternateNextLevel() {
    const target = currentLevel().alternateNext;
    if (!target || !isAvailable(target)) return;
    $("#successDialog").close();
    loadLevel(target);
  }

  function openTutorial() {
    tutorial.step = 0; tutorial.selected = null; tutorial.slots = [null, null];
    renderTutorial();
    if (!$("#pairTutorial").open) $("#pairTutorial").showModal();
  }

  function selectTutorialToken(token) {
    tutorial.selected = token;
    renderTutorial();
    tone(token === "a" ? 360 : 430, .04);
  }

  function fillTutorialSlot(index) {
    if (!tutorial.selected) {
      $("#tutorialLesson").textContent = "先点击左侧的 a 或 b，再点击一个输入口。";
      return;
    }
    tutorial.slots[index] = tutorial.selected;
    renderTutorial();
    tone(500, .04);
  }

  function renderTutorial() {
    const first = tutorial.step === 0;
    $("#tutorialInstruction").textContent = first
      ? "把两个对象送进配对器，看看它会制造什么。"
      : "现在只选择 a，并把同一个 a 送进两个输入口。";
    document.querySelectorAll(".tutorial-token").forEach((button) => button.classList.toggle("selected", button.dataset.token === tutorial.selected));
    document.querySelectorAll("[data-slot]").forEach((button) => {
      const value = tutorial.slots[Number(button.dataset.slot)];
      button.textContent = value || "?";
      button.classList.toggle("filled", Boolean(value));
    });
    const complete = tutorial.slots.every(Boolean);
    const same = complete && tutorial.slots[0] === tutorial.slots[1];
    $("#tutorialResult").textContent = complete ? (same ? `{${tutorial.slots[0]}}` : "{a,b}") : "等待输入";
    const valid = complete && (first ? tutorial.slots.includes("a") && tutorial.slots.includes("b") : same && tutorial.slots[0] === "a");
    $("#tutorialNext").disabled = !valid;
    $("#tutorialNext").innerHTML = first ? "下一步 <b>→</b>" : "进入第一关 <b>→</b>";
    $("#tutorialLesson").textContent = valid
      ? (first ? "配对器把输入收进集合；输入顺序不会保留下来。" : "重复的 a 被合并了：集合只保留一个 a。同一输出可以重复连接。")
      : "先点击一个对象，再点击配对器的输入口。";
  }

  function advanceTutorial() {
    if ($("#tutorialNext").disabled) return;
    if (tutorial.step === 0) {
      tutorial.step = 1; tutorial.selected = null; tutorial.slots = [null, null]; renderTutorial();
    } else finishTutorial();
  }

  function finishTutorial() {
    localStorage.setItem("logic-foundry-tutorial-v2", "done");
    if ($("#pairTutorial").open) $("#pairTutorial").close();
  }

  function openUnionTutorial() {
    unionTutorial.step = 0;
    unionTutorial.activated = false;
    unionTutorial.context = state.currentLevelId;
    renderUnionTutorial();
    if (!$("#unionTutorial").open) $("#unionTutorial").showModal();
  }

  function renderUnionTutorial() {
    const symbolic = unionTutorial.step === 0;
    const numeralExample = unionTutorial.context === "vn-build-three";
    $("#unionTutorialInstruction").textContent = symbolic
      ? "先用彩色占位对象观察：并集族会拆开外层中的每个集合，再汇集它们的成员。"
      : (numeralExample ? "现在换回你亲手造出的冯·诺依曼数字，观察同一个操作如何作用在 1 和 2 上。" : "现在把第三个对象单独装箱，观察并集族如何把三个对象收进同一个集合。");
    $("#unionBefore").textContent = symbolic ? "{{a,b},{b,c}}" : (numeralExample ? "{1,2} = {{0},{0,1}}" : "{{a,b},{c}}");
    $("#unionBeforeNote").textContent = symbolic ? "外层有两个成员，它们本身都是集合" : (numeralExample ? "1={0}，2={0,1}" : "左箱装着 a、b，右箱只装 c");
    $("#unionAfter").textContent = unionTutorial.activated ? (symbolic ? "{a,b,c}" : (numeralExample ? "{0,1} = 2" : "{a,b,c}")) : "?";
    $("#unionAfterNote").textContent = unionTutorial.activated
      ? (symbolic ? "成员被汇集，重复的 b 只保留一次" : (numeralExample ? "外层的 1、2 消失，内部成员汇集起来" : "两个箱子的外层消失，a、b、c 留下"))
      : "等待机器运行";
    $("#unionVisual").textContent = unionTutorial.activated
      ? (symbolic ? "{a,b} + {b,c}  →  a,b,b,c  →  {a,b,c}" : (numeralExample ? "{0} + {0,1}  →  0,0,1  →  {0,1}" : "{a,b} + {c}  →  a,b,c  →  {a,b,c}"))
      : "";
    $("#unionAfterCard").classList.toggle("revealed", unionTutorial.activated);
    $("#unionVisual").classList.toggle("revealed", unionTutorial.activated);
    $("#unionActivate").disabled = unionTutorial.activated;
    $("#unionTutorialNext").disabled = !unionTutorial.activated;
    $("#unionTutorialNext").innerHTML = symbolic ? "查看数字例子 <b>→</b>" : "开始并集关卡 <b>→</b>";
    $("#unionTutorialLesson").textContent = unionTutorial.activated
      ? (symbolic ? "并集族只拆掉一层，并把这一层中各集合的成员汇在一起。" : (numeralExample ? "所以 ⋃{1,2}=2。结果恰好是已知对象，不代表机器没有做事。" : "所以 ⋃{{a,b},{c}}={a,b,c}；三元素集仍然来自已经掌握的集合操作。"))
      : "点击中间的并集机器，比较操作前后的结构。";
  }

  function activateUnionTutorial() {
    unionTutorial.activated = true;
    renderUnionTutorial();
    tone(unionTutorial.step === 0 ? 470 : 540, .09);
  }

  function advanceUnionTutorial() {
    if (!unionTutorial.activated) return;
    if (unionTutorial.step === 0) {
      unionTutorial.step = 1;
      unionTutorial.activated = false;
      renderUnionTutorial();
    } else finishUnionTutorial();
  }

  function finishUnionTutorial() {
    localStorage.setItem("logic-foundry-union-tutorial-v5", "done");
    $("#unionTutorialReplay").hidden = false;
    if ($("#unionTutorial").open) $("#unionTutorial").close();
  }

  function openIntersectionTutorial() {
    intersectionTutorial.activated = false;
    renderIntersectionTutorial();
    if (!$("#intersectionTutorial").open) $("#intersectionTutorial").showModal();
  }

  function renderIntersectionTutorial() {
    $("#intersectionAfter").textContent = intersectionTutorial.activated ? "{b}" : "?";
    $("#intersectionAfterNote").textContent = intersectionTutorial.activated ? "只有 b 同时属于两个内部集合" : "等待机器运行";
    $("#intersectionVisual").textContent = intersectionTutorial.activated ? "a 只在左边　b 两边都有　c 只在右边　→　{b}" : "";
    $("#intersectionAfterCard").classList.toggle("revealed", intersectionTutorial.activated);
    $("#intersectionVisual").classList.toggle("revealed", intersectionTutorial.activated);
    $("#intersectionActivate").disabled = intersectionTutorial.activated;
    $("#intersectionTutorialNext").disabled = !intersectionTutorial.activated;
    $("#intersectionTutorialLesson").textContent = intersectionTutorial.activated
      ? "并集族保留至少出现一次的成员；交集族只保留每个内部集合都拥有的成员。"
      : "点击中间的交集机器，比较操作前后的结构。";
  }

  function activateIntersectionTutorial() {
    intersectionTutorial.activated = true;
    renderIntersectionTutorial();
    tone(420, .09);
  }

  function finishIntersectionTutorial() {
    localStorage.setItem("logic-foundry-intersection-tutorial-v9", "done");
    $("#intersectionTutorialReplay").hidden = false;
    if ($("#intersectionTutorial").open) $("#intersectionTutorial").close();
  }

  function updateDisplayModeButton() {
    const encoding = state.displayMode === "encoding";
    $("#displayModeLabel").textContent = encoding ? "集合编码" : "数学记法";
    $("#displayModeToggle").setAttribute("aria-pressed", String(encoding));
    $("#displayModeToggle").title = encoding ? "切换到数学记法" : "切换到集合编码";
  }

  function toggleDisplayMode() {
    state.displayMode = state.displayMode === "semantic" ? "encoding" : "semantic";
    localStorage.setItem("logic-foundry-display-mode-v1", state.displayMode);
    if (!$("#displayCoachmark").hidden) finishDisplayCoachmark(true);
    updateDisplayModeButton();
    renderCanvas();
    log(state.displayMode === "encoding" ? "节点现在展示底层集合编码。" : "节点现在展示数学语义记法。", true, "显示已切换");
  }

  function openDisplayCoachmark() {
    if (state.currentLevelId !== "sequence-project-first" || localStorage.getItem("logic-foundry-display-coach-v1")) return;
    $("#displayCoachmark").hidden = false;
    $("#displayModeToggle").classList.add("coach-target");
    positionDisplayCoachmark();
  }

  function positionDisplayCoachmark() {
    const coachmark = $("#displayCoachmark");
    if (!coachmark || coachmark.hidden) return;
    const target = $("#displayModeToggle").getBoundingClientRect();
    const width = coachmark.offsetWidth;
    const left = Math.max(12, Math.min(window.innerWidth - width - 12, target.left + target.width / 2 - width / 2));
    const arrowX = Math.max(18, Math.min(width - 18, target.left + target.width / 2 - left));
    coachmark.style.left = `${left}px`;
    coachmark.style.top = `${target.bottom + 14}px`;
    coachmark.style.setProperty("--coach-arrow-x", `${arrowX}px`);
  }

  function hideDisplayCoachmark() {
    $("#displayCoachmark").hidden = true;
    $("#displayModeToggle").classList.remove("coach-target");
  }

  function finishDisplayCoachmark(markSeen) {
    if (markSeen) localStorage.setItem("logic-foundry-display-coach-v1", "done");
    hideDisplayCoachmark();
  }

  function toggleSound() {
    state.sound = !state.sound;
    $("#soundToggle").textContent = state.sound ? "♪" : "×";
    $("#soundToggle").setAttribute("aria-label", state.sound ? "关闭音效" : "开启音效");
    if (state.sound) tone(440, .05);
  }

  function tone(frequency, duration) {
    if (!state.sound) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const context = new AudioCtx();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine"; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.025, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(); oscillator.stop(context.currentTime + duration);
    } catch (_) { /* Audio is a cosmetic enhancement. */ }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  }

  init();
})();
