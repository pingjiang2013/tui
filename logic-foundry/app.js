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
  const analyzeFiniteMap = (graph, domain, codomain) => {
    let edges = [];
    try {
      if (!Array.isArray(graph)) throw new Error("函数图必须是有序对集合。");
      edges = graph.map(decodeOrderedPair);
    } catch (error) {
      return { valid: false, complete: false, injective: false, surjective: false, edges: [], error: error.message };
    }
    const inDomain = ([first]) => domain.some((item) => equal(item, first));
    const inCodomain = ([, second]) => codomain.some((item) => equal(item, second));
    const valid = edges.every((edge) => inDomain(edge) && inCodomain(edge));
    const inputCount = (item) => edges.filter(([first]) => equal(first, item)).length;
    const outputCount = (item) => edges.filter(([, second]) => equal(second, item)).length;
    const complete = valid && domain.every((item) => inputCount(item) === 1);
    const injective = complete && codomain.every((item) => outputCount(item) <= 1);
    const surjective = complete && codomain.every((item) => outputCount(item) >= 1);
    return { valid, complete, injective, surjective, edges, inputCount, outputCount };
  };
  const finiteSequence = (...items) => set(...items.map((item, index) => orderedPair(vnNat(index), item)));
  const formulaSet = (...formulas) => set(...formulas);

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
  const equalFormula = (left, right) => formulaKey(left) === formulaKey(right);
  const F = {
    prop: (name) => ({ kind: "prop", name }),
    schema: (name) => ({ kind: "schema", name }),
    bottom: () => ({ kind: "bottom" }),
    variable: { kind: "var", name: "x" },
    variableNamed: (name) => ({ kind: "var", name }),
    termSchema: (name) => ({ kind: "termSchema", name }),
    constant: (name) => ({ kind: "const", name }),
    func: (argument, name = "f") => ({ kind: "func", name, argument }),
    pred: (term, name = "P") => ({ kind: "pred", name, term }),
    rel: (left, right, name = "R") => ({ kind: "rel", name, left, right }),
    eq: (left, right) => ({ kind: "eq", left, right }),
    not: (body) => ({ kind: "not", body }),
    or: (left, right) => ({ kind: "or", left, right }),
    and: (left, right) => ({ kind: "and", left, right }),
    imp: (left, right) => ({ kind: "imp", left, right }),
    box: (body) => ({ kind: "box", body }),
    diamond: (body) => ({ kind: "diamond", body }),
    forall: (variable, body) => ({ kind: "forall", variable: variable.name, body }),
    exists: (variable, body) => ({ kind: "exists", variable: variable.name, body })
  };
  const TRUTH_FALSE = "⊥";
  const TRUTH_TRUE = "⊤";
  const prettyFormula = (f) => {
    if (!f) return "?";
    if (f.kind === "prop") return f.name;
    if (f.kind === "schema") return f.name;
    if (f.kind === "bottom") return "⊥";
    if (f.kind === "var") return f.name;
    if (f.kind === "termSchema") return f.name;
    if (f.kind === "const") return f.name;
    if (f.kind === "func") return `${f.name}(${prettyFormula(f.argument)})`;
    if (f.kind === "pred") return `${f.name}(${prettyFormula(f.term)})`;
    if (f.kind === "rel") return `${f.name}(${prettyFormula(f.left)},${prettyFormula(f.right)})`;
    if (f.kind === "eq") return `${prettyFormula(f.left)}=${prettyFormula(f.right)}`;
    if (f.kind === "not") {
      const body = prettyFormula(f.body);
      return f.body.kind === "prop" && /[⊢⊨]/.test(f.body.name) ? `¬(${body})` : `¬${body}`;
    }
    if (f.kind === "or") return `(${prettyFormula(f.left)} ∨ ${prettyFormula(f.right)})`;
    if (f.kind === "and") return `(${prettyFormula(f.left)} ∧ ${prettyFormula(f.right)})`;
    if (f.kind === "imp") return `(${prettyFormula(f.left)} → ${prettyFormula(f.right)})`;
    if (f.kind === "box") return `□${prettyFormula(f.body)}`;
    if (f.kind === "diamond") return `◇${prettyFormula(f.body)}`;
    if (f.kind === "forall") return `∀${f.variable} ${prettyFormula(f.body)}`;
    if (f.kind === "exists") return `∃${f.variable} ${prettyFormula(f.body)}`;
    return "?";
  };

  const freeVariableNames = (formula, bound = new Set()) => {
    if (!formula) return new Set();
    if (formula.kind === "var") return bound.has(formula.name) ? new Set() : new Set([formula.name]);
    if (["prop", "schema", "bottom", "const", "termSchema"].includes(formula.kind)) return new Set();
    const merge = (...sets) => new Set(sets.flatMap((setValue) => [...setValue]));
    if (formula.kind === "func") return freeVariableNames(formula.argument, bound);
    if (formula.kind === "pred") return freeVariableNames(formula.term, bound);
    if (formula.kind === "rel" || formula.kind === "eq") return merge(freeVariableNames(formula.left, bound), freeVariableNames(formula.right, bound));
    if (["not", "box", "diamond"].includes(formula.kind)) return freeVariableNames(formula.body, bound);
    if (["and", "or", "imp"].includes(formula.kind)) return merge(freeVariableNames(formula.left, bound), freeVariableNames(formula.right, bound));
    if (["forall", "exists"].includes(formula.kind)) {
      const nestedBound = new Set(bound);
      nestedBound.add(formula.variable);
      return freeVariableNames(formula.body, nestedBound);
    }
    return new Set();
  };

  const substituteFreeVariable = (formula, targetName, term) => {
    if (!formula) return formula;
    if (formula.kind === "var") return formula.name === targetName ? clone(term) : clone(formula);
    if (["prop", "schema", "bottom", "const", "termSchema"].includes(formula.kind)) return clone(formula);
    if (formula.kind === "func") return F.func(substituteFreeVariable(formula.argument, targetName, term), formula.name);
    if (formula.kind === "pred") return F.pred(substituteFreeVariable(formula.term, targetName, term), formula.name);
    if (formula.kind === "rel") return F.rel(substituteFreeVariable(formula.left, targetName, term), substituteFreeVariable(formula.right, targetName, term), formula.name);
    if (formula.kind === "eq") return F.eq(substituteFreeVariable(formula.left, targetName, term), substituteFreeVariable(formula.right, targetName, term));
    if (formula.kind === "not") return F.not(substituteFreeVariable(formula.body, targetName, term));
    if (formula.kind === "box") return F.box(substituteFreeVariable(formula.body, targetName, term));
    if (formula.kind === "diamond") return F.diamond(substituteFreeVariable(formula.body, targetName, term));
    if (formula.kind === "and") return F.and(substituteFreeVariable(formula.left, targetName, term), substituteFreeVariable(formula.right, targetName, term));
    if (formula.kind === "or") return F.or(substituteFreeVariable(formula.left, targetName, term), substituteFreeVariable(formula.right, targetName, term));
    if (formula.kind === "imp") return F.imp(substituteFreeVariable(formula.left, targetName, term), substituteFreeVariable(formula.right, targetName, term));
    if (["forall", "exists"].includes(formula.kind)) {
      if (formula.variable === targetName) return clone(formula);
      if (freeVariableNames(term).has(formula.variable) && freeVariableNames(formula.body).has(targetName)) {
        throw new Error(`把 ${term.name} 放进这里会被量词 ${formula.variable} 捕获；请先安全易字。`);
      }
      return { kind: formula.kind, variable: formula.variable, body: substituteFreeVariable(formula.body, targetName, term) };
    }
    return clone(formula);
  };

  const formulaContainsConstant = (formula, constantName) => {
    if (!formula) return false;
    if (formula.kind === "const") return formula.name === constantName;
    if (["func", "pred", "not", "box", "diamond"].includes(formula.kind)) return formulaContainsConstant(formula.argument || formula.term || formula.body, constantName);
    if (["rel", "eq", "and", "or", "imp"].includes(formula.kind)) return formulaContainsConstant(formula.left, constantName) || formulaContainsConstant(formula.right, constantName);
    if (["forall", "exists"].includes(formula.kind)) return formulaContainsConstant(formula.body, constantName);
    return false;
  };

  const replaceConstant = (formula, constantName, term) => {
    if (!formula) return formula;
    if (formula.kind === "const") return formula.name === constantName ? clone(term) : clone(formula);
    if (["prop", "schema", "bottom", "var", "termSchema"].includes(formula.kind)) return clone(formula);
    if (formula.kind === "func") return F.func(replaceConstant(formula.argument, constantName, term), formula.name);
    if (formula.kind === "pred") return F.pred(replaceConstant(formula.term, constantName, term), formula.name);
    if (formula.kind === "rel") return F.rel(replaceConstant(formula.left, constantName, term), replaceConstant(formula.right, constantName, term), formula.name);
    if (formula.kind === "eq") return F.eq(replaceConstant(formula.left, constantName, term), replaceConstant(formula.right, constantName, term));
    if (formula.kind === "not") return F.not(replaceConstant(formula.body, constantName, term));
    if (formula.kind === "box") return F.box(replaceConstant(formula.body, constantName, term));
    if (formula.kind === "diamond") return F.diamond(replaceConstant(formula.body, constantName, term));
    if (formula.kind === "and") return F.and(replaceConstant(formula.left, constantName, term), replaceConstant(formula.right, constantName, term));
    if (formula.kind === "or") return F.or(replaceConstant(formula.left, constantName, term), replaceConstant(formula.right, constantName, term));
    if (formula.kind === "imp") return F.imp(replaceConstant(formula.left, constantName, term), replaceConstant(formula.right, constantName, term));
    if (["forall", "exists"].includes(formula.kind)) return { kind: formula.kind, variable: formula.variable, body: replaceConstant(formula.body, constantName, term) };
    return clone(formula);
  };

  const replaceEqualTerm = (formula, sourceTerm, targetTerm, selectedOccurrence = null) => {
    let replacements = 0, matches = 0;
    const replaceTerm = (term, bound) => {
      const sourceIsBoundHere = [...freeVariableNames(sourceTerm)].some((name) => bound.has(name));
      if (equalFormula(term, sourceTerm) && !sourceIsBoundHere) {
        const occurrence = matches++;
        if (selectedOccurrence === null || selectedOccurrence === occurrence) {
          const captured = [...freeVariableNames(targetTerm)].find((name) => bound.has(name));
          if (captured) throw new Error(`替换后的 ${captured} 会被量词捕获；请先安全易字。`);
          replacements += 1;
          return clone(targetTerm);
        }
        return clone(term);
      }
      if (term && term.kind === "func") return F.func(replaceTerm(term.argument, bound), term.name);
      return clone(term);
    };
    const walk = (current, bound = new Set()) => {
      if (!current) return current;
      if (["var", "const", "termSchema", "func"].includes(current.kind)) return replaceTerm(current, bound);
      if (["prop", "schema", "bottom"].includes(current.kind)) return clone(current);
      if (current.kind === "pred") return F.pred(replaceTerm(current.term, bound), current.name);
      if (current.kind === "rel") return F.rel(replaceTerm(current.left, bound), replaceTerm(current.right, bound), current.name);
      if (current.kind === "eq") return F.eq(replaceTerm(current.left, bound), replaceTerm(current.right, bound));
      if (current.kind === "not") return F.not(walk(current.body, bound));
      if (current.kind === "box") return F.box(walk(current.body, bound));
      if (current.kind === "diamond") return F.diamond(walk(current.body, bound));
      if (current.kind === "and") return F.and(walk(current.left, bound), walk(current.right, bound));
      if (current.kind === "or") return F.or(walk(current.left, bound), walk(current.right, bound));
      if (current.kind === "imp") return F.imp(walk(current.left, bound), walk(current.right, bound));
      if (["forall", "exists"].includes(current.kind)) {
        const nestedBound = new Set(bound);
        nestedBound.add(current.variable);
        return { kind: current.kind, variable: current.variable, body: walk(current.body, nestedBound) };
      }
      return clone(current);
    };
    const result = walk(formula);
    return { formula: result, replacements, matches };
  };

  const generalizeFreeName = (formula, name, boundName = "x") => F.forall(
    F.variableNamed(boundName), substituteFreeVariable(formula, name, F.variableNamed(boundName))
  );

  const existentialGeneralization = (formula, name, boundName = "x") => F.exists(
    F.variableNamed(boundName), substituteFreeVariable(formula, name, F.variableNamed(boundName))
  );

  const input = (type, label) => ({ type, label });
  const inferenceRule = (premises, conclusion) => ({ kind: "rule", premises: formulaSet(...premises), conclusion: clone(conclusion) });
  const normalizeScopeDependencies = (dependencies = []) => {
    const scopes = new Map();
    dependencies.forEach((dependency) => {
      if (!dependency || !dependency.id || !dependency.formula) return;
      const existing = scopes.get(dependency.id);
      if (existing && !equalFormula(existing.formula, dependency.formula)) throw new Error("同一个子证明不能同时采用两条不同公式。");
      scopes.set(dependency.id, {
        ...(existing || {}), ...clone(dependency),
        id: dependency.id, formula: clone(dependency.formula)
      });
    });
    return [...scopes.values()];
  };
  const proofObject = (rule, conclusion, open = [], children = [], extra = {}) => {
    const { openScopes = [], ...rest } = extra;
    const labelled = children.filter((child) => child.world);
    if (["andIntro", "impElim"].includes(rule) && labelled.length && (labelled.length !== children.length || labelled.some((child) => child.world !== labelled[0].world))) throw new Error("这一步的公式必须位于同一个世界；不能把一个世界的前件交给另一个世界的蕴含。");
    const modal = labelled.length || extra.world || extra.accessibilityDeps;
    const inherited = modal ? {
      world: labelled[0]?.world,
      worldOpen: uniqueModalDependencies(children.flatMap((child) => child.worldOpen || [])),
      accessibilityDeps: uniqueModalDependencies(children.flatMap((child) => child.accessibilityDeps || []))
    } : {};
    return { kind: "proof", rule, conclusion: clone(conclusion), open: formulaSet(...open), openScopes: normalizeScopeDependencies(openScopes), children, ...inherited, ...rest };
  };
  const uniqueModalDependencies = (items) => [...new Map(items.map((item) => [JSON.stringify(item), clone(item)])).values()];
  const worldGiven = (world, formula) => proofObject("given", formula, [], [], { world, worldOpen: [{ world, formula }] });
  const accessProof = (from, to, scopeId = null) => proofObject(scopeId ? "worldAssumption" : "given", { kind: "accessibility", from, to }, [], [], { accessibilityDeps: [{ from, to, scopeId }], scopeId });
  const proofJudgement = (proof) => proof.conclusion.kind === "accessibility" ? `${proof.conclusion.from}R${proof.conclusion.to}` : `${proof.world ? `${proof.world}:` : ""}${prettyFormula(proof.conclusion)}`;
  const proofJudgementKey = (proof) => `${proof.world || ""}|${formulaKey(proof.conclusion)}`;
  const modalProofMatches = (proof, world, formula, closed = false) => proof?.kind === "proof" && proof.world === world && equalFormula(proof.conclusion, formula) && (!closed || (!proof.open.length && !proof.openScopes.length && !(proof.worldOpen || []).length && !(proof.accessibilityDeps || []).length));
  const proofInputs = (proof) => {
    if (!proof || proof.kind !== "proof") throw new Error("该规则需要一条来自 Γ、子证明或已有推理的公式。");
    return proof;
  };
  const MAIN_SCOPE_ID = "main-scope";
  const LEFT_CASE_SCOPE_ID = "left-case";
  const RIGHT_CASE_SCOPE_ID = "right-case";
  const mergeOpen = (...proofs) => formulaSet(...proofs.flatMap((proof) => proofInputs(proof).open));
  const mergeOpenScopes = (...proofs) => normalizeScopeDependencies(proofs.flatMap((proof) => proofInputs(proof).openScopes || []));
  const inductionEvidence = (target) => ({ kind: "inductionEvidence", target: clone(target) });
  const inductionStepInstance = (number) => ({ kind: "inductionStepInstance", number: clone(number) });
  const inductionPathEndpoint = (expression) => ({ kind: "inductionPathEndpoint", expression });
  const inductionClause = { kind: "inductionClause", from: "𝒜(n)", to: "𝒜(S(n))", general: true };
  const concreteInductionClause = (from, to) => ({ kind: "inductionClause", from: `𝒜(${from})`, to: `𝒜(${to})`, general: false, fromIndex: from, toIndex: to });
  const inductionPrinciple = { kind: "inductionPrinciple", base: "𝒜(0)", step: "𝒜(n)⇒𝒜(S(n))" };
  const soundnessMeta = {
    membership: { kind: "soundnessMembership", statement: "A∈Γ" },
    gammaSatisfied: { kind: "soundnessGammaSatisfied", statement: "𝔐,s⊨Γ" },
    smallerProofs: { kind: "soundnessSmallerProofs", statement: "若有直接子证明，则 h(πᵢ)≤n" },
    localPreservation: { kind: "soundnessLocalPreservation", statement: "r 局部保持真" }
  };
  const zermeloIndex = (value, limit = 12) => {
    for (let index = 0; index <= limit; index += 1) if (equal(value, zNat(index))) return index;
    return -1;
  };
  const registry = {
    empty: { label: "空集", glyph: "∅", out: "set", outLabel: "空集", inputs: [], compute: () => empty() },
    pair: { label: "配对", glyph: "{a,b}", out: "set", outLabel: "配对结果", inputs: [input("object", "对象 a"), input("object", "对象 b")], compute: ([a, b]) => pair(a, b) },
    union: { label: "并集族", glyph: "⋃A", out: "set", outLabel: "并集结果", inputs: [input("set", "集合族 A")], compute: ([a]) => union(a) },
    intersect: { label: "交集族", glyph: "⋂A", out: "set", outLabel: "共同成员", inputs: [input("set", "非空集合族 A")], compute: ([a]) => intersection(a) },
    zSucc: {
      label: "后继", glyph: "S(x)", out: "set", outLabel: "下一个数", inputs: [input("set", "当前数 x")],
      compute: ([a]) => a && a.kind === "inductionPathEndpoint" ? inductionPathEndpoint(`S(${a.expression})`) : zSuccessor(a)
    },
    inductionLink: {
      label: "具体传播", glyph: "𝒜(k)⇒𝒜(k+1)", out: "evidence", outLabel: "下一层的性质依据", inputs: [input("evidence", "当前层的性质依据")],
      compute: ([evidence], node) => {
        if (!evidence || evidence.kind !== "inductionEvidence" || !equal(evidence.target, zNat(node.from))) throw new Error(`这一步需要先得到 𝒜(${node.from})。`);
        return inductionEvidence(zNat(node.to));
      }
    },
    inductionStepInstance: {
      label: "步骤实例", glyph: "𝒜(n)⇒𝒜(S(n))", out: "inductionStepInstance", outLabel: "填入当前 n 的步骤形状", inputs: [input("set", "放入元位置 n 的具体自然数")],
      compute: ([number]) => {
        if (zermeloIndex(number) < 0) throw new Error("n 的位置需要一个从 0 反复使用后继得到的自然数。");
        return inductionStepInstance(number);
      }
    },
    inductionTemplate: {
      label: "归纳模板", glyph: "基础 ＋ 步骤", out: "induction", outLabel: "完整的归纳方法", inputs: [input("evidence", "基础依据 𝒜(0)"), input("inductionClause", "任意后继步骤")],
      compute: ([base, step]) => {
        if (!base || base.kind !== "inductionEvidence" || !equal(base.target, zNat(0))) throw new Error("归纳基础必须从 𝒜(0) 开始。");
        if (!step || step.kind !== "inductionClause") throw new Error("还没有为后继边提供传播方法。");
        if (!step.general) throw new Error("具体的一步不能重复覆盖整条链；这里需要对任意 n 都适用的推步。");
        return clone(inductionPrinciple);
      }
    },
    vnSucc: { label: "后继", glyph: "S(x)", out: "set", outLabel: "下一个数", inputs: [input("set", "当前数 x")], compute: ([a]) => vnSuccessor(a) },
    ord: { label: "有序对", glyph: "⟨a,b⟩", out: "set", outLabel: "有序对", inputs: [input("object", "第一项 a"), input("object", "第二项 b")], compute: ([a, b]) => orderedPair(a, b) },
    set1: { label: "单元素集", glyph: "{a}", out: "set", outLabel: "集合", inputs: [input("set", "元素 a")], compute: ([a]) => set(a) },
    set2: { label: "二元素集", glyph: "{a,b}", out: "set", outLabel: "集合", inputs: [input("set", "元素 a"), input("set", "元素 b")], compute: ([a, b]) => set(a, b) },
    set3: { label: "三元素集", glyph: "{a,b,c}", out: "set", outLabel: "集合", inputs: [input("set", "元素 a"), input("set", "元素 b"), input("set", "元素 c")], compute: ([a, b, c]) => set(a, b, c) },
    set4: { label: "四元素集", glyph: "{a,b,c,d}", out: "set", outLabel: "集合", inputs: [input("set", "元素 a"), input("set", "元素 b"), input("set", "元素 c"), input("set", "元素 d")], compute: ([a, b, c, d]) => set(a, b, c, d) },
    first: { label: "第一投影", glyph: "π₁(e)", out: "set", outLabel: "第一项", inputs: [input("set", "有序边 e")], compute: ([edge]) => decodeOrderedPair(edge)[0] },
    sampleFn: { label: "函数 f", glyph: "f(·)", out: "set", outLabel: "函数值 f(x)", inputs: [input("set", "输入 x")], compute: ([value]) => applyFunction(sampleFunction, value) },
    quotientFn: { label: "自然投影 q", glyph: "q(·)", out: "set", outLabel: "对象所属的等价类", inputs: [input("set", "原对象 x")], compute: ([value]) => applyFunction(quotientProjection, value) },
    naturalDouble: { label: "倍增 d", glyph: "d(·)", out: "set", outLabel: "这一组的起点 d(n)", inputs: [input("set", "自然数组号 n")], compute: ([value]) => countableDoubleValue(value) },
    valuationFn: { label: "赋值函数 v", glyph: "v(·)", out: "set", outLabel: "命题变元的真值", inputs: [input("set", "命题变元")], compute: ([value]) => applyFunction(sampleValuation, value) },
    applyGraph: { label: "函数应用", glyph: "f(t)", out: "object", outLabel: "函数在该输入处的值", inputs: [input("set", "函数 f"), input("object", "输入 t")], compute: ([graph, value]) => applyFunction(graph, value) },
    assignmentS: { label: "变量赋值 s", glyph: "s(·)", out: "object", outLabel: "变量当前指向的对象", inputs: [input("object", "变量")], compute: ([value]) => applyFunction(semanticAssignment, value) },
    assignmentT: { label: "变量赋值 t", glyph: "t(·)", out: "object", outLabel: "变量当前指向的对象", inputs: [input("object", "变量")], compute: ([value]) => applyFunction(semanticAssignmentXToB, value) },
    termAssignmentS: {
      label: "变量赋值 s", glyph: "s(·)", out: "object", outLabel: "变量在赋值 s 下指向的对象", inputs: [input("term", "等待赋值解释的变量项")],
      compute: ([term]) => {
        if (!term || term.kind !== "var") throw new Error("变量赋值 s 只解释变量项；常元应交给模型中的常元解释。");
        return applyFunction(termAssignmentGraph, term.name);
      }
    },
    termFunctionF: { label: "函数解释 fᴹ", glyph: "fᴹ(·)", out: "object", outLabel: "函数解释 fᴹ 在该对象上的值", inputs: [input("object", "子项已经指向的对象")], compute: ([value]) => applyFunction(termFunctionGraph, value) },
    termConstantMeaning: {
      label: "常元解释", glyph: "□ᴹ", out: "object", outLabel: "常元在模型中指向的对象", inputs: [input("term", "等待模型解释的常元项")],
      compute: ([term]) => {
        if (!term || term.kind !== "const" || term.name !== "c") throw new Error("这份常元解释只记录了 c↦盘子。");
        return "盘子";
      }
    },
    truthAndApply: { label: "合取函数", glyph: "∧(·,·)", out: "set", outLabel: "合取结果", inputs: [input("set", "左侧真值"), input("set", "右侧真值")], compute: ([left, right]) => applyFunction(truthConjunctionFunction, orderedPair(left, right)) },
    truthOrApply: { label: "析取函数", glyph: "∨(·,·)", out: "set", outLabel: "析取结果", inputs: [input("set", "左侧真值"), input("set", "右侧真值")], compute: ([left, right]) => applyFunction(truthDisjunctionFunction, orderedPair(left, right)) },
    truthImpApply: { label: "蕴含函数", glyph: "→(·,·)", out: "set", outLabel: "蕴含结果", inputs: [input("set", "前件真值"), input("set", "后件真值")], compute: ([left, right]) => applyFunction(truthImplicationFunction, orderedPair(left, right)) },
    recursionPredicateP: { label: "读取 Pᴹ", glyph: "Pᴹ(·)", out: "set", outLabel: "原子公式 P(t) 的真值", inputs: [input("object", "项 t 已经指向的对象")], compute: ([object]) => contains(set("盘子"), object) ? TRUTH_TRUE : TRUTH_FALSE },
    recursionPredicateQ: { label: "读取 Qᴹ", glyph: "Qᴹ(·)", out: "set", outLabel: "原子公式 Q(t) 的真值", inputs: [input("object", "项 t 已经指向的对象")], compute: ([object]) => contains(set("盘子"), object) ? TRUTH_TRUE : TRUTH_FALSE },
    recursionForallTwo: { label: "全称量词的两条赋值路径", glyph: "∀D", out: "set", outLabel: "全称句的真值", inputs: [input("set", "x 指向杯子时的辖域真值"), input("set", "x 指向盘子时的辖域真值")], compute: ([cupValue, plateValue]) => equal(cupValue, TRUTH_TRUE) && equal(plateValue, TRUTH_TRUE) ? TRUTH_TRUE : TRUTH_FALSE },
    propP: { label: "命题变元 P", glyph: "P", out: "formula", outLabel: "公式 P", inputs: [], compute: () => F.prop("P") },
    propQ: { label: "命题变元 Q", glyph: "Q", out: "formula", outLabel: "公式 Q", inputs: [], compute: () => F.prop("Q") },
    modalBox: { label: "必然", glyph: "□", out: "formula", outLabel: "公式 □A", inputs: [input("formula", "被 □ 包住的公式 A")], compute: ([body]) => F.box(body) },
    modalDiamond: { label: "可能", glyph: "◇", out: "formula", outLabel: "公式 ◇A", inputs: [input("formula", "被 ◇ 包住的公式 A")], compute: ([body]) => F.diamond(body) },
    modalBoxElim: {
      label: "必然消去", glyph: "□E", out: "proof", inputs: [input("proof", "已经证明的 w:□A"), input("accessibility", "已经可用的可达条件 wRu")],
      compute: ([source, relation]) => {
        proofInputs(source); proofInputs(relation);
        const edge = relation.conclusion;
        if (edge.kind !== "accessibility" || source.conclusion.kind !== "box" || source.world !== edge.from) throw new Error("□E 需要从同一个出发世界得到的 □A 与可达条件 wRu；一次只取掉一层 □。");
        return proofObject("boxElim", source.conclusion.body, mergeOpen(source, relation), [source, relation], { world: edge.to, openScopes: mergeOpenScopes(source, relation) });
      }
    },
    modalWorldEntry: {
      label: "任意可达世界", glyph: "wRu", out: "accessibility", inputs: [],
      compute: (_, node) => {
        const frame = (currentLevel().scopeFrames || []).find((item) => item.id === node.scopeId && item.worldScope);
        if (!frame) throw new Error("可达条件只能来自已经打开的世界范围。");
        return accessProof(frame.from, frame.to, frame.id);
      }
    },
    modalBoxIntro: {
      label: "必然引入", glyph: "□I", out: "proof", inputs: [input("proof", "任意可达世界 u 内得到的 A")],
      compute: ([source], node) => closeModalWorld(source, node)
    },
    modalBoxIntroDraft: {
      label: "收回世界范围", glyph: "□", out: "proof", inputs: [input("proof", "范围内真正证明的公式"), input("formula", "范围外提出的必然公式")],
      compute: ([source, proposed], node) => {
        const proof = closeModalWorld(source, node);
        if (!equalFormula(proof.conclusion, proposed)) throw new Error("范围外应为 □A，其中 A 必须是范围内实际证明的那条公式；写出的公式本身不是证明。");
        return proof;
      }
    },
    modalDiamondIntro: {
      label: "可能引入", glyph: "◇I", out: "proof", inputs: [input("proof", "可达世界 u 内已经得到的 A"), input("accessibility", "已经可用的可达条件 wRu")],
      compute: ([source, relation]) => {
        proofInputs(source); proofInputs(relation);
        const edge = relation.conclusion;
        if (edge.kind !== "accessibility" || !source.world || source.world !== edge.to || source.conclusion.kind === "accessibility") throw new Error("◇I 需要到达世界 u 的公式证明，以及指向这个世界的可达条件 wRu。");
        return proofObject("diamondIntro", F.diamond(source.conclusion), mergeOpen(source, relation), [source, relation], { world: edge.from, openScopes: mergeOpenScopes(source, relation) });
      }
    },
    modalDiamondWitness: {
      label: "暂称见证为 u", glyph: "◇", out: "proof", inputs: [input("proof", "出发世界已经证明的 ◇A")],
      compute: ([source], node) => {
        const frame = modalWitnessFrame(node);
        proofInputs(source);
        if (source.world !== frame.from || source.conclusion.kind !== "diamond") throw new Error("见证范围必须由出发世界的 ◇A 证明授权；不能只接入写出的公式。");
        if ((source.worldOpen || []).some((item) => item.world === frame.to) || (source.openScopes || []).some((item) => item.world === frame.to) || (source.accessibilityDeps || []).some((item) => item.from === frame.to || item.to === frame.to)) throw new Error("临时见证名字必须是新鲜的，不能出现在授权依据的开放前提或可达条件中。");
        const dependency = { id: frame.id, formula: source.conclusion.body, world: frame.to, modalWitness: true, from: frame.from, source: clone(source) };
        return proofObject("diamondWitness", source.conclusion.body, source.open, [], { world: frame.to, scopeId: frame.id, witnessSource: source, worldOpen: source.worldOpen || [], accessibilityDeps: source.accessibilityDeps || [], openScopes: [...source.openScopes, dependency] });
      }
    },
    modalDiamondAccess: {
      label: "见证的可达条件", glyph: "wRu", out: "accessibility", inputs: [],
      compute: (_, node, environment) => {
        const frame = modalWitnessFrame(node), witness = evaluateNode(frame.entry, environment?.context || {}, new Set(environment?.stack || []));
        const source = witness.witnessSource;
        return proofObject("witnessAccess", { kind: "accessibility", from: frame.from, to: frame.to }, source.open, [], { scopeId: frame.id, witnessSource: source, worldOpen: source.worldOpen || [], openScopes: witness.openScopes, accessibilityDeps: [...(source.accessibilityDeps || []), { from: frame.from, to: frame.to, scopeId: frame.id, witness: true }] });
      }
    },
    modalDiamondExitDraft: {
      label: "结束见证范围", glyph: "出口", out: "proof", inputs: [input("proof", "已经回到 w、且不依赖临时名字的结论")],
      compute: ([inner], node, environment) => closeModalWitness(inner, node, environment)
    },
    modalDiamondExit: {
      label: "可能消去出口", glyph: "◇E", out: "proof", inputs: [input("proof", "已经回到 w、且不依赖临时名字的结论")],
      compute: ([inner], node, environment) => closeModalWitness(inner, node, environment)
    },
    schemaA: { label: "公式元变量 A", glyph: "A", out: "formula", outLabel: "任意公式 A", inputs: [], compute: () => F.schema("A") },
    schemaB: { label: "公式元变量 B", glyph: "B", out: "formula", outLabel: "任意公式 B", inputs: [], compute: () => F.schema("B") },
    schemaC: { label: "公式元变量 C", glyph: "C", out: "formula", outLabel: "共同结论 C", inputs: [], compute: () => F.schema("C") },
    bottom: { label: "矛盾常元", glyph: "⊥", out: "formula", outLabel: "公式 ⊥", inputs: [], compute: () => F.bottom() },
    and: { label: "合取", glyph: "∧", out: "formula", outLabel: "合取公式", inputs: [input("formula", "左侧公式"), input("formula", "右侧公式")], compute: ([left, right]) => F.and(left, right) },
    varx: { label: "变量 x", glyph: "x", out: "term", outLabel: "项 x", inputs: [], compute: () => clone(F.variable) },
    vary: { label: "变量 y", glyph: "y", out: "term", outLabel: "项 y", inputs: [], compute: () => F.variableNamed("y") },
    varz: { label: "新变量 z", glyph: "z", out: "term", outLabel: "项 z", inputs: [], compute: () => F.variableNamed("z") },
    constC: { label: "常元符号 c", glyph: "c", out: "term", outLabel: "没有输入位置的常元项 c", inputs: [], compute: () => F.constant("c") },
    constD: { label: "新鲜常元 d", glyph: "d", out: "term", outLabel: "刚刚登记的新鲜常元项 d", inputs: [], compute: () => F.constant("d") },
    funcF: { label: "一元函数符号 f", glyph: "f(·)", out: "term", outLabel: "由一个项形成的复合项", inputs: [input("term", "f 的唯一项位置")], compute: ([term]) => F.func(term) },
    predP: { label: "一元谓词符号 P", glyph: "P(·)", out: "formula", outLabel: "原子公式", inputs: [input("term", "P 的唯一项位置")], compute: ([term]) => F.pred(term) },
    predQ: { label: "一元谓词符号 Q", glyph: "Q(·)", out: "formula", outLabel: "原子公式", inputs: [input("term", "Q 的唯一项位置")], compute: ([term]) => F.pred(term, "Q") },
    predR: { label: "二元谓词符号 R", glyph: "R(·,·)", out: "formula", outLabel: "原子公式", inputs: [input("term", "R 的第一个项位置"), input("term", "R 的第二个项位置")], compute: ([left, right]) => F.rel(left, right) },
    equality: { label: "等号", glyph: "=", out: "formula", outLabel: "由两个项形成的等式", inputs: [input("term", "等号左侧的项"), input("term", "等号右侧的项")], compute: ([left, right]) => F.eq(left, right) },
    not: { label: "否定", glyph: "¬", out: "formula", outLabel: "否定公式", inputs: [input("formula", "被否定公式")], compute: ([body]) => F.not(body) },
    or: { label: "析取", glyph: "∨", out: "formula", outLabel: "析取公式", inputs: [input("formula", "左侧公式"), input("formula", "右侧公式")], compute: ([a, b]) => F.or(a, b) },
    imp: { label: "蕴含", glyph: "→", out: "formula", outLabel: "蕴含公式", inputs: [input("formula", "前件"), input("formula", "后件")], compute: ([a, b]) => F.imp(a, b) },
    forall: { label: "全称量词", glyph: "∀", out: "formula", outLabel: "全称公式", inputs: [input("term", "绑定变量"), input("formula", "量词辖域")], compute: ([v, body]) => F.forall(v, body) },
    exists: { label: "存在量词", glyph: "∃", out: "formula", outLabel: "存在公式", inputs: [input("term", "绑定变量"), input("formula", "量词辖域")], compute: ([v, body]) => F.exists(v, body) },
    formulaSubstitution: {
      label: "公式代入", glyph: "φ[t/x]", out: "formula", outLabel: "完成无捕获代入的公式",
      inputs: [input("formula", "接受代入的公式 φ"), input("term", "准备替换的变量 x"), input("term", "放入公式的项 t")],
      compute: ([formula, target, term]) => {
        if (!target || target.kind !== "var") throw new Error("代入记号的下方必须指定一个变量。");
        return substituteFreeVariable(formula, target.name, term);
      }
    },
    equalityIntro: {
      label: "等号引入", glyph: "=I", out: "proof", outLabel: "无前提得到的自身等式", inputs: [input("term", "任意项 t")],
      compute: ([term]) => proofObject("equalityIntro", F.eq(term, term), [], [])
    },
    equalityElim: {
      label: "等号消去", glyph: "=E", out: "proof", outLabel: "用等项替换后得到的公式",
      inputs: [input("proof", "已经证明的等式 s=t"), input("proof", "已经证明的旧公式 φ(s)")],
      compute: ([equalityProof, oldInstanceProof], node) => {
        const identity = proofInputs(equalityProof), oldInstance = proofInputs(oldInstanceProof);
        if (!identity.conclusion || identity.conclusion.kind !== "eq") throw new Error("=E 的第一个输入必须是一条已经证明的等式 s=t。");
        const scan = replaceEqualTerm(oldInstance.conclusion, identity.conclusion.left, identity.conclusion.right, -1);
        if (!scan.matches) throw new Error(`旧公式中没有可以由 ${prettyFormula(identity.conclusion.left)} 替换的位置。`);
        if (!Number.isInteger(node.replacementOccurrence) || node.replacementOccurrence < 0 || node.replacementOccurrence >= scan.matches) {
          throw new Error("请在 =E 节点中选择这一步要替换的自由出现位置。");
        }
        const replaced = replaceEqualTerm(oldInstance.conclusion, identity.conclusion.left, identity.conclusion.right, node.replacementOccurrence);
        return proofObject("equalityElim", replaced.formula, mergeOpen(identity, oldInstance), [identity, oldInstance], {
          openScopes: mergeOpenScopes(identity, oldInstance), equalityReplacements: replaced.replacements,
          replacementOccurrence: node.replacementOccurrence
        });
      }
    },
    forallElim: {
      label: "全称消去", glyph: "∀E", out: "proof", outLabel: "得到的代入实例", inputs: [input("proof", "已经得到的全称公式"), input("term", "代入量词变量的项")],
      compute: ([proof, term]) => {
        const source = proofInputs(proof);
        if (source.conclusion.kind !== "forall") throw new Error("∀E 的第一个输入必须是已经得到的全称公式。");
        return proofObject("forallElim", substituteFreeVariable(source.conclusion.body, source.conclusion.variable, term), source.open, [source], { openScopes: source.openScopes, instantiatingTerm: clone(term) });
      }
    },
    existsIntro: {
      label: "存在引入", glyph: "∃I", out: "proof", outLabel: "绑定临时名字后得到的存在公式；绑定变量统一写作 x", inputs: [input("proof", "已经得到的具体实例"), input("term", "实例中准备隐藏的见证名字")],
      compute: ([proof, term]) => {
        const source = proofInputs(proof);
        if (term.kind !== "var" || !freeVariableNames(source.conclusion).has(term.name)) throw new Error("∃I 要隐藏的见证名字必须自由出现在已有公式中。");
        return proofObject("existsIntro", existentialGeneralization(source.conclusion, term.name), source.open, [source], { openScopes: source.openScopes, witness: clone(term) });
      }
    },
    arbitraryFlag: {
      label: "全称旗入口", glyph: "⚑ 任意", out: "term", outLabel: "旗内可用的任意名字", inputs: [input("term", "准备作为任意对象的新名字")],
      compute: ([term], node) => {
        if (!term || term.kind !== "var") throw new Error("全称旗需要一个变量名字。");
        const outsideFormulas = (node.contextIds || []).map((id) => proofInputs(evaluateNode(id)).conclusion);
        if (outsideFormulas.some((formula) => freeVariableNames(formula).has(term.name))) throw new Error(`${term.name} 已经自由出现在外部前提中，仍带着特殊信息；请换一个新名字。`);
        return clone(term);
      }
    },
    existsFlag: {
      label: "存在旗入口", glyph: "⚑ 见证", out: "proof", outLabel: "旗内暂时可用的见证实例", inputs: [input("proof", "授权这面旗的存在公式"), input("term", "给未知见证使用的新名字")],
      compute: ([proof, term], node) => {
        const source = proofInputs(proof);
        if (source.conclusion.kind !== "exists") throw new Error("存在旗必须由一个已经得到的存在公式授权。");
        if (!term || term.kind !== "var") throw new Error("请给未知见证选择一个变量名字。");
        if ((source.open || []).some((formula) => freeVariableNames(formula).has(term.name))) throw new Error(`${term.name} 已经出现在外部前提中，不能用来临时命名未知见证。`);
        const instance = substituteFreeVariable(source.conclusion.body, source.conclusion.variable, term);
        return proofObject("existsFlag", instance, source.open, [], {
          openScopes: [...(source.openScopes || []), {
            id: node.scopeId, formula: instance, flagName: term.name,
            existentialFormula: clone(source.conclusion), authorizationProof: clone(source)
          }], scopeId: node.scopeId,
          flagName: term.name, flagSource: clone(source.conclusion)
        });
      }
    },
    model: {
      label: "模型", glyph: "𝔐", out: "model", outLabel: "模型 𝔐", inputs: [input("set", "谓词 P 的解释"), input("set", "谓词 Q 的解释")],
      compute: ([p, q]) => ({ domain: set(numeral(0), numeral(1)), P: p, Q: q })
    },
    andElim1: {
      label: "合取消去₁", glyph: "∧E₁", out: "proof", outLabel: "得到的左侧公式", inputs: [input("proof", "已经得到的合取 A∧B")],
      compute: ([proof]) => {
        const source = proofInputs(proof);
        if (source.conclusion.kind !== "and") throw new Error("合取消去的输入必须是合取公式 A∧B。");
        return proofObject("andElim1", source.conclusion.left, source.open, [source], { openScopes: source.openScopes });
      }
    },
    andElim2: {
      label: "合取消去₂", glyph: "∧E₂", out: "proof", outLabel: "得到的右侧公式", inputs: [input("proof", "已经得到的合取 A∧B")],
      compute: ([proof]) => {
        const source = proofInputs(proof);
        if (source.conclusion.kind !== "and") throw new Error("合取消去的输入必须是合取公式 A∧B。");
        return proofObject("andElim2", source.conclusion.right, source.open, [source], { openScopes: source.openScopes });
      }
    },
    andIntro: {
      label: "合取引入", glyph: "∧I", out: "proof", outLabel: "得到的合取公式", inputs: [input("proof", "已经得到的公式 A"), input("proof", "已经得到的公式 B")],
      compute: ([left, right]) => {
        const leftProof = proofInputs(left), rightProof = proofInputs(right);
        return proofObject("andIntro", F.and(leftProof.conclusion, rightProof.conclusion), mergeOpen(leftProof, rightProof), [leftProof, rightProof], { openScopes: mergeOpenScopes(leftProof, rightProof) });
      }
    },
    impElim: {
      label: "蕴含消去", glyph: "→E", out: "proof", outLabel: "得到的后件", inputs: [input("proof", "已经得到的蕴含 A→B"), input("proof", "已经得到的前件 A")],
      compute: ([impProof, antecedentProof]) => {
        const implication = proofInputs(impProof), antecedent = proofInputs(antecedentProof);
        if (implication.conclusion.kind !== "imp") throw new Error("蕴含消去的第一个输入必须是蕴含公式 A→B。");
        if (!equalFormula(implication.conclusion.left, antecedent.conclusion)) throw new Error("蕴含消去需要同一个前件 A：请把 A 接入第二个端口。");
        return proofObject("impElim", implication.conclusion.right, mergeOpen(implication, antecedent), [implication, antecedent], { openScopes: mergeOpenScopes(implication, antecedent) });
      }
    },
    orIntro1: {
      label: "析取引入₁", glyph: "∨I₁", out: "proof", outLabel: "得到的析取", inputs: [input("proof", "已经得到的左侧公式 A"), input("formula", "放在右侧的公式 B")],
      compute: ([leftProof, rightFormula]) => {
        const source = proofInputs(leftProof);
        return proofObject("orIntro1", F.or(source.conclusion, rightFormula), source.open, [source], { openScopes: source.openScopes });
      }
    },
    orIntro2: {
      label: "析取引入₂", glyph: "∨I₂", out: "proof", outLabel: "得到的析取", inputs: [input("formula", "放在左侧的公式 A"), input("proof", "已经得到的右侧公式 B")],
      compute: ([leftFormula, rightProof]) => {
        const source = proofInputs(rightProof);
        return proofObject("orIntro2", F.or(leftFormula, source.conclusion), source.open, [source], { openScopes: source.openScopes });
      }
    },
    caseLeft: {
      label: "左分支假设", glyph: "[A]", out: "proof", outLabel: "左分支中的假设", inputs: [input("proof", "已经得到的析取 A∨B")],
      compute: ([proof], node) => {
        const source = proofInputs(proof);
        if (source.conclusion.kind !== "or") throw new Error("分类讨论的来源必须是已经得到的析取 A∨B。");
        return proofObject("assumption", source.conclusion.left, [], [], { openScopes: [{ id: node.scopeId, formula: source.conclusion.left }], scopeId: node.scopeId, temporary: true, caseSide: "left" });
      }
    },
    caseRight: {
      label: "右分支假设", glyph: "[B]", out: "proof", outLabel: "右分支中的假设", inputs: [input("proof", "已经得到的析取 A∨B")],
      compute: ([proof], node) => {
        const source = proofInputs(proof);
        if (source.conclusion.kind !== "or") throw new Error("分类讨论的来源必须是已经得到的析取 A∨B。");
        return proofObject("assumption", source.conclusion.right, [], [], { openScopes: [{ id: node.scopeId, formula: source.conclusion.right }], scopeId: node.scopeId, temporary: true, caseSide: "right" });
      }
    },
    orElim: {
      label: "析取消去", glyph: "∨E", out: "proof", outLabel: "两种情况的共同结论", inputs: [input("proof", "已经得到的析取 A∨B"), input("proof", "从临时 A 得到的 C"), input("proof", "从临时 B 得到的 C")],
      compute: ([orProof, leftProof, rightProof], node) => {
        const source = proofInputs(orProof), left = proofInputs(leftProof), right = proofInputs(rightProof);
        if (source.conclusion.kind !== "or") throw new Error("∨E 的第一个输入必须是已经得到的析取 A∨B。");
        const leftDependency = (left.openScopes || []).find((scope) => scope.id === node.leftScopeId);
        const rightDependency = (right.openScopes || []).find((scope) => scope.id === node.rightScopeId);
        if (!leftDependency || !equalFormula(leftDependency.formula, source.conclusion.left)) throw new Error("左分支必须假设析取的左侧公式 A。");
        if (!rightDependency || !equalFormula(rightDependency.formula, source.conclusion.right)) throw new Error("右分支必须假设析取的右侧公式 B。");
        if (!equalFormula(left.conclusion, right.conclusion)) throw new Error("两种情况必须到达完全相同的结论 C。");
        const remainingScopes = mergeOpenScopes(source, left, right).filter((scope) => scope.id !== node.leftScopeId && scope.id !== node.rightScopeId);
        return proofObject("orElim", left.conclusion, mergeOpen(source, left, right), [source, left, right], {
          openScopes: remainingScopes, dischargedScopes: [leftDependency, rightDependency]
        });
      }
    },
    notElim: {
      label: "否定消去", glyph: "¬E", out: "proof", outLabel: "得到矛盾 ⊥", inputs: [input("proof", "已经得到的公式 A"), input("proof", "已经得到的否定 ¬A")],
      compute: ([formulaProof, negationProof]) => {
        const source = proofInputs(formulaProof), negation = proofInputs(negationProof);
        if (negation.conclusion.kind !== "not") throw new Error("否定消去的第二个输入必须是 ¬A。");
        if (!equalFormula(source.conclusion, negation.conclusion.body)) throw new Error("¬E 需要互相对应的 A 与 ¬A。");
        return proofObject("notElim", F.bottom(), mergeOpen(source, negation), [source, negation], { openScopes: mergeOpenScopes(source, negation) });
      }
    },
    bottomElim: {
      label: "矛盾消去", glyph: "⊥E", out: "proof", outLabel: "得到指定公式", inputs: [input("proof", "已经得到的矛盾 ⊥"), input("formula", "准备得到的公式 A")],
      compute: ([bottomProof, formula]) => {
        const source = proofInputs(bottomProof);
        if (source.conclusion.kind !== "bottom") throw new Error("⊥E 的第一个输入必须是已经得到的 ⊥。");
        return proofObject("bottomElim", formula, source.open, [source], { openScopes: source.openScopes });
      }
    },
    scopeAssumption: {
      label: "假设", glyph: "[A]", out: "proof", outLabel: "子证明中可用的公式", inputs: [input("formula", "准备假设的公式")],
      compute: ([formula], node) => proofObject("assumption", formula, [], [], { world: node.world, openScopes: [{ id: node.scopeId, formula, ...(node.world ? { world: node.world } : {}) }], scopeId: node.scopeId, temporary: true })
    },
    impIntroForge: {
      label: "蕴含 · 引入规则", glyph: "□ → □", out: null,
      inputs: [input("formula", "蕴含前件：这次假设的公式"), input("proof", "蕴含后件：子证明中推导的结论")],
      compute: ([assumption, proof], node) => {
        const source = proofInputs(proof);
        return {
          kind: "dependencyRule", scopeId: node.scopeId, assumption: clone(assumption), proof: source,
          conclusion: F.imp(assumption, source.conclusion)
        };
      }
    },
    impIntro: {
      label: "解除假设", glyph: "→I", out: "proof", outLabel: "子证明外得到的蕴含", inputs: [input("proof", "子证明中最后得到的公式")],
      compute: ([proof], node) => {
        const source = proofInputs(proof);
        const dependency = (source.openScopes || []).find((scope) => scope.id === node.scopeId);
        if (!dependency) throw new Error("子证明中结果并不依赖这次假设，不能在这里解除它。");
        if (dependency.world && dependency.world !== source.world) throw new Error("→I 的临时前提和结论必须在同一个世界；请先收回可达世界范围。");
        const remainingScopes = source.openScopes.filter((scope) => scope.id !== node.scopeId);
        return proofObject("impIntro", F.imp(dependency.formula, source.conclusion), source.open, [source], {
          openScopes: remainingScopes, discharged: dependency.formula, dischargedScopeId: node.scopeId
        });
      }
    },
    notIntroForge: {
      label: "否定 · 引入规则", glyph: "¬□", out: null,
      inputs: [input("formula", "准备否定的公式 A"), input("proof", "由临时 A 推导出的矛盾 ⊥")],
      compute: ([assumption, proof], node) => {
        const source = proofInputs(proof);
        if (source.conclusion.kind !== "bottom") throw new Error("否定引入要求子证明中最终得到 ⊥。");
        return { kind: "negationDependencyRule", scopeId: node.scopeId, assumption: clone(assumption), proof: source, conclusion: F.not(assumption) };
      }
    },
    notIntro: {
      label: "解除反证范围", glyph: "¬I", out: "proof", outLabel: "子证明外得到的否定", inputs: [input("proof", "子证明中已经得到的矛盾 ⊥")],
      compute: ([proof], node) => {
        const source = proofInputs(proof);
        if (source.conclusion.kind !== "bottom") throw new Error("¬I 只能关闭一段以 ⊥ 结束的子证明。");
        const dependency = (source.openScopes || []).find((scope) => scope.id === node.scopeId);
        if (!dependency) throw new Error("这个矛盾并不依赖本次假设，不能在这里解除它。");
        const remainingScopes = source.openScopes.filter((scope) => scope.id !== node.scopeId);
        return proofObject("notIntro", F.not(dependency.formula), source.open, [source], {
          openScopes: remainingScopes, discharged: dependency.formula, dischargedScopeId: node.scopeId
        });
      }
    },
    raa: {
      label: "反证法", glyph: "RAA", out: "proof", outLabel: "反证得到的公式", inputs: [input("proof", "由临时 ¬A 得到的矛盾 ⊥")],
      compute: ([proof], node) => {
        const source = proofInputs(proof);
        if (source.conclusion.kind !== "bottom") throw new Error("RAA 只能关闭一段以 ⊥ 结束的子证明。");
        const dependency = (source.openScopes || []).find((scope) => scope.id === node.scopeId);
        if (!dependency || dependency.formula.kind !== "not") throw new Error("RAA 要求本次假设的公式形如 ¬A。");
        const remainingScopes = source.openScopes.filter((scope) => scope.id !== node.scopeId);
        const conclusion = node.metaConclusion || dependency.formula.body;
        return proofObject("raa", conclusion, node.metaConclusion ? [] : source.open, [source], {
          openScopes: remainingScopes, discharged: dependency.formula, dischargedScopeId: node.scopeId
        });
      }
    },
    completenessRequestModule: {
      label: "写出反模型要求", glyph: "K33", out: "context", outLabel: "S=T∪{¬A}",
      inputs: [input("context", "理论 T"), input("formula", "结论 A")],
      compute: ([theory, formula]) => {
        if (!equal(theory, abstractTheoryT) || !equalFormula(formula, schemaA)) throw new Error("这个成果把 T 与 ¬A 合成反模型理论 S。");
        return clone(completenessCountermodelRequest);
      }
    },
    completenessConsistencyModule: {
      label: "保护反模型要求的相容性", glyph: "K34", out: "consistency", outLabel: "S 相容",
      inputs: [input("proof", "反设 T⊬A"), input("context", "反模型理论 S")],
      compute: ([assumption, theory]) => {
        const source = proofInputs(assumption);
        if (!equalFormula(source.conclusion, completenessMetaNotDerivable) || !equal(theory, completenessCountermodelRequest)) throw new Error("K34 需要外层反设 T⊬A 和上一模块写出的 S。");
        return { kind: "consistency", theory: clone(theory), openScopes: clone(source.openScopes || []) };
      }
    },
    completenessModelModule: {
      label: "模型存在定理", glyph: "模型存在", out: "proof", outLabel: "𝔐⊨T 且 𝔐⊭A",
      inputs: [input("context", "理论 S"), input("consistency", "S 相容")],
      compute: ([theory, consistency]) => {
        if (!equal(theory, completenessCountermodelRequest) || !consistency || consistency.kind !== "consistency" || !equal(consistency.theory, theory)) throw new Error("模型存在定理需要同一个理论 S 及其相容性。");
        return proofObject("modelExistence", F.and(completenessMetaModelTheory, completenessMetaModelNotFormula), [], [], { openScopes: clone(consistency.openScopes || []) });
      }
    },
    freshProofRename: {
      label: "撤去新鲜常元", glyph: "d ↦ y", out: "proof", outLabel: "撤去 d 后的整份证明", inputs: [input("proof", "旧前提不含新常元 d 的证明"), input("term", "还原后使用的变量名字")],
      compute: ([proof, term]) => {
        const source = proofInputs(proof);
        if (!term || term.kind !== "var") throw new Error("撤去新鲜常元后需要恢复为一个变量名字。 ");
        if ((source.open || []).some((formula) => formulaContainsConstant(formula, "d"))) throw new Error("d 仍出现在旧理论的前提中，因此不是可以撤去的临时新鲜常元。 ");
        if ((source.openScopes || []).some((scope) => formulaContainsConstant(scope.formula, "d"))) throw new Error("d 仍出现在未解除的临时前提中；请先关闭该范围。 ");
        if ((source.open || []).some((formula) => freeVariableNames(formula).has(term.name))) throw new Error(`${term.name} 已自由出现在旧前提中，请换一个新变量名字。`);
        return proofObject("freshRename", replaceConstant(source.conclusion, "d", term), source.open, [source], { openScopes: source.openScopes, renamedConstant: "d", renamedTo: term.name });
      }
    },
    forallIntro: {
      label: "关闭全称旗", glyph: "∀I", out: "proof", outLabel: "收回任意名字后得到的全称公式；绑定变量统一写作 x", inputs: [input("proof", "旗内对任意名字得到的公式")],
      compute: ([proof], node) => {
        const source = proofInputs(proof);
        const frame = (currentLevel().scopeFrames || []).find((item) => item.id === node.scopeId);
        if (!frame || !frame.flagNode) throw new Error("当前范围没有对应的全称旗入口。");
        const term = evaluateNode(frame.flagNode);
        if (!term || term.kind !== "var" || !freeVariableNames(source.conclusion).has(term.name)) throw new Error("旗内结论必须仍含有这个任意名字。");
        if ((source.open || []).some((formula) => freeVariableNames(formula).has(term.name))) throw new Error(`${term.name} 仍自由出现在未解除的前提中，全称旗还不能关闭。`);
        if ((source.openScopes || []).some((scope) => freeVariableNames(scope.formula).has(term.name))) throw new Error(`${term.name} 仍出现在未解除的临时前提中；请先关闭里面的子证明。`);
        return proofObject("forallIntro", generalizeFreeName(source.conclusion, term.name), source.open, [source], {
          openScopes: source.openScopes, flagName: term.name, flagScopeId: node.scopeId
        });
      }
    },
    existsElim: {
      label: "关闭存在旗", glyph: "∃E", out: "proof", outLabel: "旗外保留下来的结论", inputs: [input("proof", "旗内已经得到的无关结论")],
      compute: ([innerProof], node) => {
        const inner = proofInputs(innerProof);
        const dependency = (inner.openScopes || []).find((scope) => scope.id === node.scopeId);
        if (!dependency || !dependency.authorizationProof || !dependency.flagName) throw new Error("这条结论并不依赖当前存在旗，无法从这里带出。");
        const source = proofInputs(dependency.authorizationProof);
        const term = F.variableNamed(dependency.flagName);
        if (source.conclusion.kind !== "exists") throw new Error("这面存在旗没有保存有效的授权存在公式。");
        const expectedInstance = substituteFreeVariable(source.conclusion.body, source.conclusion.variable, term);
        if (!dependency || !equalFormula(dependency.formula, expectedInstance)) throw new Error("旗内结论必须沿着这面存在旗给出的临时实例推导出来。");
        if (freeVariableNames(inner.conclusion).has(term.name)) throw new Error(`${term.name} 仍自由出现在准备带出旗外的结论中；先把见证名字隐藏起来。`);
        const persistent = formulaSet(...source.open, ...inner.open);
        if (persistent.some((formula) => freeVariableNames(formula).has(term.name))) throw new Error(`${term.name} 出现在外部未解除前提中，不能作为新见证名字。`);
        const remainingScopes = normalizeScopeDependencies([
          ...(source.openScopes || []),
          ...(inner.openScopes || []).filter((scope) => scope.id !== node.scopeId)
        ]);
        return proofObject("existsElim", inner.conclusion, persistent, [source, inner], {
          openScopes: remainingScopes, discharged: dependency.formula, dischargedScopeId: node.scopeId,
          flagName: dependency.flagName, existentialSource: clone(source.conclusion)
        });
      }
    }
  };

  const fixed = (id, label, value, out, x, y, glyph = label, symbolic = false) => ({
    id, type: "source", label, glyph, out, value, x, y, fixed: true, symbolic
  });
  const worldPremiseNode = (id, world, formula, x, y) => fixed(id, "已有依据", worldGiven(world, formula), "proof", x, y, `${world}:${prettyFormula(formula)}`);
  const worldRelationNode = (id, from, to, x, y) => fixed(id, "可达条件", accessProof(from, to), "accessibility", x, y, `${from}R${to}`);
  const modalWorldNode = (id, scopeId, x, y, draft = false) => ({ id, type: draft ? "modalBoxIntroDraft" : "modalBoxIntro", inputs: registry[draft ? "modalBoxIntroDraft" : "modalBoxIntro"].inputs, out: "proof", fixed: true, scopeId, x, y });
  const goal = (type = "set", x = 720, y = 205) => ({
    id: "goal", type: "goal", label: "目标接口", glyph: "OUTPUT", inputs: [input(type, "最终产物")], out: null, x, y, fixed: true, goal: true
  });
  const semanticGoal = (id, label, glyph, inputLabel, x, y) => ({
    id, type: "goal", label, glyph, inputs: [input("set", inputLabel)], out: null, x, y, fixed: true, goal: true,
    slotBody: `接入${inputLabel}`
  });
  const semanticValueGoal = (id, label, glyph, inputLabel, x, y) => ({
    id, type: "goal", label, glyph, inputs: [input("object", inputLabel)], out: null, x, y, fixed: true, goal: true,
    slotBody: `接入${inputLabel}`
  });
  const ruleSlot = (id, label, role, x, y) => ({
    id, type: "goal", label, glyph: role === "premise" ? "横线上方" : "横线下方",
    inputs: [input("formula", role === "premise" ? "必须已经得到的公式" : "这一步新得到的公式")],
    out: null, x, y, fixed: true, goal: true, ruleSlot: role,
    slotBody: role === "premise" ? "接入一条已有公式" : "接入这一步的结论"
  });
  const scopeSlot = (id, label, type, role, x, y) => ({
    id, type: "goal", label, glyph: role === "assumption" ? "范围入口" : (role === "result" ? "子证明中" : "子证明外"),
    inputs: [input(type, role === "assumption" ? "假设的公式" : (role === "result" ? "子证明中得到的公式" : "解除后得到的公式"))],
    out: null, x, y, fixed: true, goal: true, scopeSlot: role,
    slotBody: role === "assumption" ? "接入假设的公式" : (role === "result" ? "接入子证明中结果" : "接入解除后的结论")
  });
  const scopeAssumptionNode = (id, scopeId, x, y) => ({
    id, type: "scopeAssumption", label: "假设", glyph: "[A]", inputs: registry.scopeAssumption.inputs,
    out: registry.scopeAssumption.out, x, y, fixed: true, scopeId, scopeAssumption: true
  });
  const scopeDischargeNode = (id, scopeId, x, y) => ({
    id, type: "impIntro", label: "解除假设", glyph: "→I", inputs: registry.impIntro.inputs,
    out: registry.impIntro.out, x, y, fixed: true, scopeId, scopeDischarge: true
  });
  const negationDischargeNode = (id, scopeId, x, y) => ({
    id, type: "notIntro", label: "解除反证范围", glyph: "¬I", inputs: registry.notIntro.inputs,
    out: registry.notIntro.out, x, y, fixed: true, scopeId, scopeDischarge: true
  });
  const raaDischargeNode = (id, scopeId, x, y) => ({
    id, type: "raa", label: "反证出口", glyph: "RAA", inputs: registry.raa.inputs,
    out: registry.raa.out, outLabel: registry.raa.outLabel, x, y, fixed: true, scopeId, scopeDischarge: true
  });
  const caseAssumptionNode = (id, side, scopeId, x, y) => ({
    id, type: side === "left" ? "caseLeft" : "caseRight", label: side === "left" ? "左分支假设" : "右分支假设",
    glyph: side === "left" ? "[A]" : "[B]", inputs: registry[side === "left" ? "caseLeft" : "caseRight"].inputs,
    out: "proof", outLabel: "本情况内临时可用", x, y, fixed: true, scopeId, scopeAssumption: true, caseAssumption: true
  });
  const orElimNode = (id, leftScopeId, rightScopeId, x, y) => ({
    id, type: "orElim", label: "析取消去", glyph: "∨E", inputs: registry.orElim.inputs, out: registry.orElim.out,
    outLabel: registry.orElim.outLabel, x, y, fixed: true, leftScopeId, rightScopeId, caseDischarge: true
  });
  const arbitraryFlagNode = (id, scopeId, x, y, contextIds = []) => ({
    id, type: "arbitraryFlag", label: "插下全称旗", glyph: "⚑ 任意 □", inputs: registry.arbitraryFlag.inputs,
    out: registry.arbitraryFlag.out, outLabel: registry.arbitraryFlag.outLabel, x, y, fixed: true, scopeId,
    contextIds, quantifierFlag: "universal"
  });
  const forallIntroNode = (id, scopeId, x, y) => ({
    id, type: "forallIntro", label: "关闭全称旗", glyph: "∀I", inputs: registry.forallIntro.inputs,
    out: registry.forallIntro.out, outLabel: registry.forallIntro.outLabel, x, y, fixed: true, scopeId,
    quantifierFlagExit: "universal", scopeDischarge: true
  });
  const existsFlagNode = (id, scopeId, x, y) => ({
    id, type: "existsFlag", label: "插下存在旗", glyph: "⚑ 见证 □", inputs: registry.existsFlag.inputs,
    out: registry.existsFlag.out, outLabel: registry.existsFlag.outLabel, x, y, fixed: true, scopeId,
    quantifierFlag: "existential", scopeAssumption: true
  });
  const existsElimNode = (id, scopeId, x, y) => ({
    id, type: "existsElim", label: "关闭存在旗", glyph: "∃E", inputs: registry.existsElim.inputs,
    out: registry.existsElim.out, outLabel: registry.existsElim.outLabel, x, y, fixed: true, scopeId,
    quantifierFlagExit: "existential", scopeDischarge: true
  });

  const foundationSetA = set("a", "b");
  const foundationWrappedA = set(foundationSetA);
  const foundationSetB = set("a", "b", "c");
  const foundationPowerA = set(empty(), set("a"), set("b"), foundationSetA);

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
  const soundnessR = F.prop("R");
  const soundnessPAndQ = F.and(F.prop("P"), F.prop("Q"));
  const soundnessQImpR = F.imp(F.prop("Q"), soundnessR);
  const soundnessPreservationFormula = F.imp(F.and(implicationFormula, F.prop("P")), F.prop("Q"));
  const soundnessProofTarget = F.and(soundnessR, F.prop("Q"));
  const schemaA = F.schema("A"), schemaB = F.schema("B"), schemaC = F.schema("C");
  const theorySchemaMarker = F.schema("T");
  const abstractTheoryT = formulaSet(theorySchemaMarker);
  const completenessCountermodelRequest = formulaSet(theorySchemaMarker, F.not(schemaA));
  const completenessMetaDerivable = F.prop("T⊢A");
  const completenessMetaNotDerivable = F.not(completenessMetaDerivable);
  const completenessMetaInconsistent = F.prop("S⊢⊥");
  const completenessMetaModelTheory = F.prop("𝔐⊨T");
  const completenessMetaModelFormula = F.prop("𝔐⊨A");
  const completenessMetaModelNotFormula = F.not(completenessMetaModelFormula);
  const completenessMetaEntailmentInstance = F.imp(completenessMetaModelTheory, completenessMetaModelFormula);
  const COMPLETENESS_META_SCOPE_ID = "completeness-meta-scope";
  const COMPLETENESS_NEG_A_SCOPE_ID = "completeness-neg-a-scope";
  const bottomFormula = F.bottom();
  const bottomImpliesQFormula = F.imp(bottomFormula, F.prop("Q"));
  const schemaImplication = F.imp(schemaA, schemaB);
  const schemaConjunction = F.and(schemaA, schemaB);
  const impElimRule = inferenceRule([schemaImplication, schemaA], schemaB);
  const concreteImpElimRule = inferenceRule([implicationFormula, F.prop("P")], F.prop("Q"));
  const andElimLeftRule = inferenceRule([schemaConjunction], schemaA);
  const andElimRightRule = inferenceRule([schemaConjunction], schemaB);
  const andElimRules = set(andElimLeftRule, andElimRightRule);
  const andIntroRule = inferenceRule([schemaA, schemaB], schemaConjunction);
  const orIntroLeftRule = inferenceRule([schemaA], F.or(schemaA, schemaB));
  const orIntroRightRule = inferenceRule([schemaB], F.or(schemaA, schemaB));
  const orIntroRules = set(orIntroLeftRule, orIntroRightRule);
  const notElimRule = inferenceRule([schemaA, F.not(schemaA)], bottomFormula);
  const bottomElimRule = inferenceRule([bottomFormula], schemaA);
  const nestedConjunctionFormula = F.and(F.prop("P"), F.and(F.prop("Q"), F.prop("P")));
  const combinedPremiseFormula = F.and(F.prop("P"), implicationFormula);
  const packagedScopeConclusion = F.imp(conjunctionFormula, F.prop("P"));
  const retainedScopeBodyFormula = F.and(F.prop("P"), F.prop("Q"));
  const retainedScopeConclusion = F.imp(F.prop("P"), retainedScopeBodyFormula);
  const theoremBodyFormula = F.and(F.prop("P"), F.prop("P"));
  const scopeTheoremFormula = F.imp(F.prop("P"), theoremBodyFormula);
  const propositionalTautology = F.imp(F.prop("P"), F.prop("P"));
  const propositionalContradiction = F.and(F.prop("P"), F.not(F.prop("P")));
  const disjunctionSwapPair = F.and(F.or(F.prop("P"), F.prop("Q")), F.or(F.prop("Q"), F.prop("P")));
  const swappedDisjunction = F.or(F.prop("Q"), F.prop("P"));
  const nestedDisjunctionPremise = F.or(F.or(F.prop("P"), F.prop("Q")), F.prop("P"));
  const disjunctionSwapTheorem = F.imp(F.or(F.prop("P"), F.prop("Q")), swappedDisjunction);
  const doubleNegationP = F.not(F.not(F.prop("P")));
  const doubleNegationEliminationFormula = F.imp(doubleNegationP, F.prop("P"));
  const variableY = F.variableNamed("y");
  const variableZ = F.variableNamed("z");
  const unaryPEntry = orderedPair("P", numeral(1));
  const unaryQEntry = orderedPair("Q", numeral(1));
  const binaryREntry = orderedPair("R", numeral(2));
  const firstOrderSignature = set(unaryPEntry, unaryQEntry, binaryREntry);
  const predicatePFormula = F.pred(F.variable);
  const predicateQFormula = F.pred(F.variable, "Q");
  const relationRFormula = F.rel(F.variable, variableY);
  const openPredicateFormula = F.or(predicatePFormula, predicateQFormula);
  const universalPredicateFormula = F.forall(F.variable, predicatePFormula);
  const universalScopeFormula = F.forall(F.variable, openPredicateFormula);
  const partiallyBoundRelationFormula = F.forall(F.variable, relationRFormula);
  const closedRelationSentence = F.forall(variableY, partiallyBoundRelationFormula);
  const existentialPredicateFormula = F.exists(F.variable, predicatePFormula);
  const semanticDomain = set("a", "b");
  const semanticPOnlyA = set("a");
  const semanticQAll = set("a", "b");
  const semanticPAll = set("a", "b");
  const semanticRAA = orderedPair("a", "a");
  const semanticRAB = orderedPair("a", "b");
  const semanticRBA = orderedPair("b", "a");
  const semanticRBB = orderedPair("b", "b");
  const semanticRelation = set(semanticRAB, semanticRBA);
  const semanticColumnRelation = set(semanticRAA, semanticRBA);
  const semanticAssignment = set(orderedPair("x", "a"), orderedPair("y", "b"));
  const semanticAssignmentXToB = set(orderedPair("x", "b"), orderedPair("y", "b"));
  const contextPImpQ = formulaSet(F.prop("P"), implicationFormula);
  const tautologyExpanded = F.forall(F.variable, F.or(F.not(px), px));
  const identityFormula = F.forall(F.variable, F.imp(px, px));
  const py = F.pred(variableY), pz = F.pred(variableZ);
  const qx = F.pred(F.variable, "Q"), qy = F.pred(variableY, "Q"), qz = F.pred(variableZ, "Q");
  const universalP = F.forall(F.variable, px);
  const universalPImpQ = F.forall(F.variable, F.imp(px, qx));
  const universalPImpQz = F.forall(F.variable, F.imp(px, qz));
  const universalQ = F.forall(F.variable, qx);
  const existentialP = F.exists(F.variable, px);
  const existentialQ = F.exists(F.variable, qx);
  const existentialPAndQ = F.exists(F.variable, F.and(px, qx));
  const theoryDomain = set("杯子", "盘子");
  const theoryCoverage = F.forall(F.variable, F.or(px, qx));
  const theoryNoOverlap = F.not(F.exists(F.variable, F.and(px, qx)));
  const partitionTheory = formulaSet(theoryCoverage, theoryNoOverlap);
  const implicationExistenceTheory = formulaSet(universalPImpQ, existentialP);
  const theoryTarget = existentialPAndQ;
  const monadicExtensions = [empty(), set("杯子"), set("盘子"), set("杯子", "盘子")];

  const evaluateMonadicFormula = (formula, pExtension, qExtension, environment = {}) => {
    const termValue = (term) => {
      if (term && term.kind === "var") return environment[term.name];
      throw new Error("这一观察表只处理由对象变量组成的一元公式。");
    };
    if (!formula) return false;
    if (formula.kind === "bottom") return false;
    if (formula.kind === "pred") {
      const extension = formula.name === "P" ? pExtension : qExtension;
      return contains(extension, termValue(formula.term));
    }
    if (formula.kind === "not") return !evaluateMonadicFormula(formula.body, pExtension, qExtension, environment);
    if (formula.kind === "and") return evaluateMonadicFormula(formula.left, pExtension, qExtension, environment) && evaluateMonadicFormula(formula.right, pExtension, qExtension, environment);
    if (formula.kind === "or") return evaluateMonadicFormula(formula.left, pExtension, qExtension, environment) || evaluateMonadicFormula(formula.right, pExtension, qExtension, environment);
    if (formula.kind === "imp") return !evaluateMonadicFormula(formula.left, pExtension, qExtension, environment) || evaluateMonadicFormula(formula.right, pExtension, qExtension, environment);
    if (formula.kind === "forall") return theoryDomain.every((object) => evaluateMonadicFormula(formula.body, pExtension, qExtension, { ...environment, [formula.variable]: object }));
    if (formula.kind === "exists") return theoryDomain.some((object) => evaluateMonadicFormula(formula.body, pExtension, qExtension, { ...environment, [formula.variable]: object }));
    throw new Error("观察表遇到了尚未定义的公式结构。");
  };
  const quantifiedIdentity = F.forall(F.variable, F.imp(px, px));
  const constantCTerm = F.constant("c");
  const completenessPc = F.pred(constantCTerm);
  const completenessQc = F.pred(constantCTerm, "Q");
  const completenessPcImpQc = F.imp(completenessPc, completenessQc);
  const completenessRcc = F.rel(constantCTerm, constantCTerm);
  const completenessStartTheory = formulaSet(universalPImpQ, F.not(universalQ));
  const completenessDecisionBase = formulaSet(completenessPc, completenessPcImpQc);
  const completenessStageOne = formulaSet(...completenessDecisionBase, completenessQc);
  const completenessStageTwo = formulaSet(...completenessStageOne, completenessRcc);
  const completenessStageThree = formulaSet(...completenessStageTwo, F.not(universalP));
  const witnessDTerm = F.constant("d");
  const witnessPd = F.pred(witnessDTerm);
  const witnessQd = F.pred(witnessDTerm, "Q");
  const witnessNameEntry = orderedPair("d", numeral(0));
  const witnessExampleTheory = formulaSet(existentialP);
  const witnessExampleExtension = formulaSet(existentialP, witnessPd);
  const witnessPhiX = F.pred(F.variable, "φ");
  const witnessPhiD = F.pred(witnessDTerm, "φ");
  const witnessPhiY = F.pred(variableY, "φ");
  const witnessPhiZ = F.pred(variableZ, "φ");
  const witnessExistsPhi = F.exists(F.variable, witnessPhiX);
  const witnessForallNotPhi = F.forall(F.variable, F.not(witnessPhiX));
  const completenessHenkinStageOne = formulaSet(...completenessStartTheory, F.not(existentialP));
  const completenessHenkinStageTwo = formulaSet(...completenessHenkinStageOne, existentialQ);
  const completenessHenkinStageThree = formulaSet(...completenessHenkinStageTwo, witnessQd);
  const termFc = F.func(constantCTerm);
  const termFd = F.func(witnessDTerm);
  const termFfc = F.func(termFc);
  const termFfd = F.func(termFd);
  const closedTermWindow = set(constantCTerm, witnessDTerm, termFc, termFd);
  const termClassC = set(constantCTerm, witnessDTerm);
  const termClassFc = set(termFc, termFd);
  const termClassFfc = set(termFfc, termFfd);
  const termModelFunctionWindow = set(orderedPair(termClassC, termClassFc), orderedPair(termClassFc, termClassFfc));
  const termModelPredicateWindow = set(termClassC);
  const termModelRelationWindow = set(orderedPair(termClassC, termClassFc));
  const equalityCd = F.eq(constantCTerm, witnessDTerm);
  const equalityCc = F.eq(constantCTerm, constantCTerm);
  const equalityDc = F.eq(witnessDTerm, constantCTerm);
  const equalityDFc = F.eq(witnessDTerm, termFc);
  const equalityCFc = F.eq(constantCTerm, termFc);
  const equalityFcFd = F.eq(termFc, termFd);
  const predicatePd = F.pred(witnessDTerm);
  const relationCfc = F.rel(constantCTerm, termFc);
  const relationDc = F.rel(witnessDTerm, constantCTerm);
  const relationDd = F.rel(witnessDTerm, witnessDTerm);
  const pcAndQc = F.and(completenessPc, completenessQc);
  const truthSchemaOr = F.or(schemaA, schemaB);
  const truthSchemaImp = F.imp(schemaA, schemaB);
  const truthInductionRxy = F.rel(F.variable, variableY);
  const truthInductionExistsRxy = F.exists(variableY, truthInductionRxy);
  const truthInductionNotPx = F.not(px);
  const truthInductionImp = F.imp(px, qx);
  const truthInductionOr = F.or(truthInductionNotPx, truthInductionExistsRxy);
  const truthInductionBody = F.and(truthInductionImp, truthInductionOr);
  const truthInductionTarget = F.forall(F.variable, truthInductionBody);
  const existentialNotP = F.exists(F.variable, F.not(px));
  const notExistentialNotP = F.not(existentialNotP);
  const functionFxTerm = F.func(F.variable);
  const nestedFunctionTerm = F.func(functionFxTerm);
  const functionTermAtom = F.rel(functionFxTerm, constantCTerm);
  const functionTermEquality = F.eq(functionFxTerm, constantCTerm);
  const equalityDiagonal = set(orderedPair("杯子", "杯子"), orderedPair("盘子", "盘子"));
  const arbitraryTermT = F.termSchema("t"), arbitraryTermU = F.termSchema("u");
  const arbitraryFormulaPattern = F.pred(variableY, "φ");
  const arbitraryFormulaAtT = F.pred(arbitraryTermT, "φ"), arbitraryFormulaAtU = F.pred(arbitraryTermU, "φ");
  const equalityTermSchema = F.eq(arbitraryTermT, arbitraryTermU);
  const relationCC = F.rel(constantCTerm, constantCTerm);
  const relationFunctionC = F.rel(functionFxTerm, constantCTerm);
  const relationFunctionFunction = F.rel(functionFxTerm, functionFxTerm);
  const constantSymbolEntry = orderedPair("c", numeral(0));
  const unaryFunctionSymbolEntry = orderedPair("f", numeral(1));
  const termFunctionSignature = set(constantSymbolEntry, unaryFunctionSymbolEntry);
  const completenessBaseLanguage = set(unaryPEntry, unaryQEntry, binaryREntry, constantSymbolEntry, unaryFunctionSymbolEntry);
  const completenessWitnessLanguage = set(unaryPEntry, unaryQEntry, binaryREntry, constantSymbolEntry, unaryFunctionSymbolEntry, witnessNameEntry);
  const termFunctionGraph = set(orderedPair("杯子", "盘子"), orderedPair("盘子", "杯子"));
  const termAssignmentGraph = set(orderedPair("x", "杯子"));
  const termRelationGraph = set(orderedPair("盘子", "盘子"));
  const structureZero = numeral(0), structureOne = numeral(1), structureTwo = numeral(2);
  const productAB = set(orderedPair(structureZero, "a"), orderedPair(structureZero, "b"), orderedPair(structureOne, "a"), orderedPair(structureOne, "b"));
  const sampleRelation = set(orderedPair(structureZero, "a"), orderedPair(structureZero, "b"), orderedPair(structureOne, "b"));
  const sampleFunction = set(orderedPair(structureZero, "b"), orderedPair(structureOne, "a"));
  const foundationInverseFunction = set(
    orderedPair(structureZero, "b"),
    orderedPair(structureOne, "c"),
    orderedPair(structureTwo, "a")
  );
  const foundationInverseGraph = set(
    orderedPair("b", structureZero),
    orderedPair("c", structureOne),
    orderedPair("a", structureTwo)
  );
  const foundationReverseCollision = set(orderedPair("a", structureZero), orderedPair("a", structureOne));
  const foundationReverseGap = set(orderedPair("a", structureZero), orderedPair("b", structureOne));
  const foundationDirectBijection = set(
    orderedPair(structureZero, "杯子"),
    orderedPair(structureOne, "盘子"),
    orderedPair(structureTwo, "勺子")
  );
  const foundationIndexThree = set(structureZero, structureOne, structureTwo);
  const foundationNestedOne = set("a");
  const foundationNestedTwo = set(foundationNestedOne);
  const foundationNestedSet = set("a", foundationNestedOne, foundationNestedTwo);
  const foundationNestedBijection = set(
    orderedPair(structureZero, "a"),
    orderedPair(structureOne, foundationNestedOne),
    orderedPair(structureTwo, foundationNestedTwo)
  );
  const foundationIndexFour = set(...foundationIndexThree, numeral(3));
  const foundationIndexFive = set(...foundationIndexFour, numeral(4));
  const foundationTwoObjectSet = set("a", "b");
  const foundationPowerOfTwo = set(empty(), set("a"), set("b"), foundationTwoObjectSet);
  const foundationSingletonInjection = set(
    orderedPair("a", set("a")),
    orderedPair("b", set("b"))
  );
  const foundationPowerBijection = set(
    orderedPair(numeral(0), empty()),
    orderedPair(numeral(1), set("a")),
    orderedPair(numeral(2), set("b")),
    orderedPair(numeral(3), foundationTwoObjectSet)
  );
  const foundationVnThree = vnNat(3);
  const foundationVnFive = vnNat(5);
  const foundationVnSix = vnNat(6);
  const quotientCup = "杯子", quotientPlate = "盘子", quotientSpoon = "勺子";
  const quotientDomain = set(quotientCup, quotientPlate, quotientSpoon);
  const quotientDiagonal = set(
    orderedPair(quotientCup, quotientCup),
    orderedPair(quotientPlate, quotientPlate),
    orderedPair(quotientSpoon, quotientSpoon)
  );
  const quotientSymmetryBase = set(
    orderedPair(quotientCup, quotientPlate),
    orderedPair(quotientSpoon, quotientCup)
  );
  const quotientSymmetricRelation = set(
    ...quotientSymmetryBase,
    orderedPair(quotientPlate, quotientCup),
    orderedPair(quotientCup, quotientSpoon)
  );
  const quotientTransitiveBase = set(
    orderedPair(quotientCup, quotientPlate),
    orderedPair(quotientPlate, quotientSpoon)
  );
  const quotientTransitiveRelation = set(...quotientTransitiveBase, orderedPair(quotientCup, quotientSpoon));
  const quotientClassDishes = set(quotientCup, quotientPlate);
  const quotientClassSpoon = set(quotientSpoon);
  const quotientEquivalenceRelation = set(
    orderedPair(quotientCup, quotientCup),
    orderedPair(quotientCup, quotientPlate),
    orderedPair(quotientPlate, quotientCup),
    orderedPair(quotientPlate, quotientPlate),
    orderedPair(quotientSpoon, quotientSpoon)
  );
  const quotientPartition = set(quotientClassDishes, quotientClassSpoon);
  const quotientProjection = set(
    orderedPair(quotientCup, quotientClassDishes),
    orderedPair(quotientPlate, quotientClassDishes),
    orderedPair(quotientSpoon, quotientClassSpoon)
  );
  const quotientClassMap = set(orderedPair(quotientClassDishes, "a"), orderedPair(quotientClassSpoon, "b"));
  const quotientCompositeMap = set(orderedPair(quotientCup, "a"), orderedPair(quotientPlate, "a"), orderedPair(quotientSpoon, "b"));
  const foundationIdentityIndex = set(...[structureZero, structureOne, structureTwo].map((value) => orderedPair(value, value)));
  const foundationIdentityLetters = set(...["a", "b", "c"].map((value) => orderedPair(value, value)));
  const orderObjectA = "a", orderObjectB = "b";
  const orderAntisymmetricRelation = set(
    orderedPair(orderObjectA, orderObjectA),
    orderedPair(orderObjectB, orderObjectB),
    orderedPair(orderObjectA, orderObjectB)
  );
  const orderBottom = empty(), orderLeft = set("a"), orderRight = set("b");
  const orderVDomain = set(orderBottom, orderLeft, orderRight);
  const orderVRelation = set(
    orderedPair(orderBottom, orderBottom),
    orderedPair(orderLeft, orderLeft),
    orderedPair(orderRight, orderRight),
    orderedPair(orderBottom, orderLeft),
    orderedPair(orderBottom, orderRight)
  );
  const orderLinearRelation = set(...orderVRelation, orderedPair(orderLeft, orderRight));
  const orderStrictRelation = set(
    orderedPair(orderBottom, orderLeft),
    orderedPair(orderBottom, orderRight),
    orderedPair(orderLeft, orderRight)
  );
  const orderIndexTwo = vnNat(2);
  const orderSubsetZero = set(vnNat(0));
  const orderSubsetOne = set(vnNat(1));
  const orderSubsetBoth = set(vnNat(0), vnNat(1));
  const orderMinimumFunction = set(
    orderedPair(orderSubsetZero, vnNat(0)),
    orderedPair(orderSubsetOne, vnNat(1)),
    orderedPair(orderSubsetBoth, vnNat(0))
  );
  const orderVnLessThree = set(
    orderedPair(vnNat(0), vnNat(1)),
    orderedPair(vnNat(0), vnNat(2)),
    orderedPair(vnNat(1), vnNat(2))
  );
  const MODAL_WORLDS = ["w₀", "w₁", "w₂"];
  const modalInitialP = set(orderedPair("w₀", TRUTH_TRUE), orderedPair("w₁", TRUTH_FALSE), orderedPair("w₂", TRUTH_TRUE));
  const modalMixedP = set(orderedPair("w₀", TRUTH_FALSE), orderedPair("w₁", TRUTH_TRUE), orderedPair("w₂", TRUTH_FALSE));
  const modalTutorialRelation = set(orderedPair("w₀", "w₁"), orderedPair("w₀", "w₂"), orderedPair("w₁", "w₀"));

  const definitions = {
    sets: `<p>游戏里的集合按<strong>外延性</strong>比较：成员完全相同，就是同一个集合，顺序与重复都不重要。</p><code>∅ = {}\n配对(a,b) = {a,b}\n⋃A = {x | 存在 y∈A，使 x∈y}</code>`,
    zNaturals: `<p>策梅洛构造把当前数整体装进一个单元素集合。</p><code>0 = ∅\nS(x) = {x}\n1 = {0}\n2 = {1}</code>`,
    vnNaturals: `<p>冯·诺依曼构造让每个数包含所有更小的数。</p><code>0 = ∅\nS(x) = x ∪ {x}\n1 = {0}\n2 = {0,1}</code>`,
    pairs: `<p>普通集合没有顺序，所以用一种不对称结构编码有序对。高级节点仍然只是集合构造的封装。</p><code>⟨a,b⟩ = {{a}, {a,b}}</code>`,
    products: `<p>笛卡尔积收集第一项来自 A、第二项来自 B 的每一种可能有序对。四元素收集器只是配对与并集族的派生简写。</p><code>A×B={⟨x,y⟩ | x∈A 且 y∈B}\n{p,q,r,s}=⋃{{p,q},{r,s}}</code>`,
    relations: `<p>从 A 到 B 的关系不是新种类的对象：它只是笛卡尔积 A×B 的任意子集。</p><code>R⊆A×B\n⟨x,y⟩∈R 表示 x 与 y 具有关系 R</code>`,
    functions: `<p>函数是一种特殊关系：定义域中的每个输入都恰好连向一个输出。于是给定 x，就能确定地得到 f(x)。</p><code>f⊆A×B\n∀x∈A，存在唯一 y∈B，使 ⟨x,y⟩∈f\n⟨x,y⟩∈f ⇔ f(x)=y</code><p>不同输入可以共享输出；B 中也可以有对象未被使用。</p>`,
    sequences: `<p>有限序列不是新的神秘对象：它是定义域为冯·诺依曼自然数 n 的函数。下标保存位置，所以重复项不会合并。</p><code>⟨a,b⟩ = {⟨0,a⟩,⟨1,b⟩}\n这张函数图占用的位置是 {0,1}=2</code>`,
    syntax: `<p>公式不是神秘的墨迹，而是有限语法树。每个节点都可以编码成带标签的有序组，最终仍是集合。</p><code>Var(x)\nPred(P, x)\nOr(left, right)\nForall(x, body)</code>`,
    models: `<p>模型为语言中的每个非逻辑符号赋予意义：给出非空论域，把一元谓词解释为论域子集，把二元谓词解释为论域平方的子集。</p><code>𝔐=(D,Pᴹ,Qᴹ,Rᴹ)\n𝔐,s⊨P(x) ⇔ s(x)∈Pᴹ</code>`,
    proof: `<p>证明也是一棵有限树。树叶可能来自 Γ，也可能只在某个子证明内采用；内部节点是一条局部可检查的规则。定理的根节点没有未解除的子证明。</p><code>[P(x)]\n────── →I\nP(x) → P(x)\n──────────── ∀I\n∀x(P(x) → P(x))</code>`
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
      copy: "现在你已经拥有 0 和 1。把它们收进同一个集合，制造下一个对象。",
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
      copy: "你已经拥有 2 和 {2}。把它们收进同一个集合族，再启动刚学会的并集机器。",
      goal: "用 2 和 {2} 组装集合族，再取并集制造 3。", tools: ["pair", "union"], artifacts: ["3"],
      nodes: [fixed("two", "已知对象", vnNat(2), "set", 60, 135, "2"), fixed("singleton-two", "上一关产物", set(vnNat(2)), "set", 60, 305, "{2}"), goal("set")],
      hint: "先把 2 与 {2} 送入配对器，得到 {2,{2}}；再把整个集合族送入并集族。",
      definition: ["并集族拆掉一层", `<p>把已经构造过的 2 与 {2} 组成集合族，再汇集两个成员集合中的内容。</p><code>配对(2,{2}) = {2,{2}}\n⋃{2,{2}} = 2 ∪ {2}\n= {0,1,2} = 3</code>`], unlock: "已获得固定对象：3；并集族训练完成",
      validate: ({ value }) => equal(value, vnNat(3))
        ? pass("并集拆掉外层后，0、1、2 汇集成了自然数 3。") : fail(`当前产物是 ${prettyCurrentSet(value)}；检查送入并集族的外层结构。`)
    },
    {
      id: "vn-abstract-successor", branch: "von-neumann", requires: ["vn-build-three"], next: "vn-run-successor", chapter: "第一章 · 冯·诺依曼路线", title: "抽象后继机器",
      copy: "刚才你用 2 和 {2} 造出了 3。现在把具体数字换成输入 x，并制造 {x}，将做法抽象成通用机器。",
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
      id: "build-three-set", branch: "shared", requires: ["z-run-successor"], next: "ordered-pair", alternateNext: "set-foundation-membership", alternateLabel: "进入集合论基础支线", chapter: "第二章 · 结构", title: "把三个对象收在一起",
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
      id: "set-foundation-membership", branch: "set-foundation", requires: ["build-three-set"], next: "set-foundation-subset", chapter: "集合论基础", title: "再包一层，里面不会散开",
      copy: "先把 a、b 收成 A={a,b}，再把整个 A 装进 C={A}。这一层只记录整个 A，不会自动把 A 内部的成员摊开。",
      goal: "构造 A={a,b} 与 C={A}，让观察台展开它们的直接成员。", tools: ["pair"], semanticWorkbench: "set-membership-layers", multiGoals: ["foundation-membership-a", "foundation-membership-c"], artifacts: ["direct-membership"],
      spawnPositions: [{ x: 185, y: 145 }, { x: 365, y: 300 }],
      nodes: [
        fixed("foundation-member-a", "已有对象", "a", "set", 25, 115, "a"),
        fixed("foundation-member-b", "已有对象", "b", "set", 25, 325, "b"),
        { ...goal("set", 500, 75), id: "foundation-membership-a", label: "集合 A", glyph: "A={a,b}" },
        { ...goal("set", 500, 315), id: "foundation-membership-c", label: "集合 C", glyph: "C={A}" }
      ],
      hint: "先用一个配对器收集 a、b；它的输出既接入 A，也同时接入另一个配对器的两个端口，形成只含整个 A 的 C。",
      openingLesson: ["只看最外面一层", `<p>一个集合可以像其他对象一样，整体成为另一个集合的成员。外层花括号不会把内层集合自动拆开。</p><p>这一关完成后，我们才给“直接出现在最外层”引入记号。</p>`],
      definition: ["成员只看直接一层", `<p>若对象 x 直接出现在集合 Y 的最外层成员中，就写作 <code>x∈Y</code>。</p><code>a∈A　　b∈A　　A∈C<br>a∉C　　b∉C</code><p>C 的唯一直接成员是整个 A。成员关系不会因为多套了一层花括号而自动穿透。</p>`],
      unlock: "成员记号 ∈：记录集合的直接成员",
      completionLesson: `<span class="eyebrow">直接成员</span><h3>整个 A 被装进了 C</h3><code>a∈A　　b∈A　　A∈C<br>a∉C　　b∉C</code>`,
      validate: ({ values, nodes }) => equal(values["foundation-membership-a"], foundationSetA) && equal(values["foundation-membership-c"], foundationWrappedA) && nodes.filter((node) => node.type === "pair").length >= 2
        ? pass("A 的直接成员是 a、b；C 的唯一直接成员则是整个 A。")
        : fail("先得到 A={a,b}；再让同一份 A 输出同时进入第二个配对器的两个端口，得到 C={A}。")
    },
    {
      id: "set-foundation-subset", branch: "set-foundation", requires: ["set-foundation-membership"], next: "set-foundation-power", chapter: "集合论基础", title: "装进整个 A，还是保留 A 的成员",
      copy: "从同一个 A={a,b} 出发：一条路线把整个 A 装进 C，另一条路线保留 A 的成员并加入 c，得到 B。两种“包含”将在观察台中并排出现。",
      goal: "构造 C={A} 与 B=A∪{c}={a,b,c}。", tools: ["pair", "union"], semanticWorkbench: "set-subset-contrast", multiGoals: ["foundation-subset-c", "foundation-subset-b"], artifacts: ["subset-relation"],
      spawnPositions: [{ x: 205, y: 75 }, { x: 205, y: 300 }, { x: 380, y: 250 }, { x: 470, y: 250 }],
      nodes: [
        fixed("foundation-subset-a", "上一关的集合", foundationSetA, "set", 25, 125, "A"),
        fixed("foundation-subset-c-item", "新对象", "c", "set", 25, 355, "c"),
        { ...goal("set", 535, 70), id: "foundation-subset-c", label: "包含整个 A", glyph: "C={A}" },
        { ...goal("set", 535, 330), id: "foundation-subset-b", label: "保留 A 的成员", glyph: "B=A∪{c}" }
      ],
      hint: "上路把 A 同时接入配对器两端。下路先把 c 装成 {c}，再把 A 与 {c} 配成集合族并取并集。",
      definition: ["子集保留每一个成员", `<p>若 A 的每个成员也都是 B 的成员，就写作 <code>A⊆B</code>。</p><code>A={a,b}　　B={a,b,c}<br>A⊆B，但 A∉B</code><p>相反，C={A} 收下的是整个 A，所以 A∈C；C 并没有把 a、b 变成自己的直接成员。</p>`],
      unlock: "子集记号 ⊆：比较两个集合的成员覆盖",
      completionLesson: `<span class="eyebrow">两种包含</span><h3>成员与子集回答不同的问题</h3><div class="set-foundation-summary"><article><code>A∈C</code><span>C 收下整个 A</span></article><article><code>A⊆B</code><span>B 保留 A 的每个成员</span></article></div><p class="layer-note">B 的成员是 a、b、c，不包括整个 A；C 的成员只有整个 A，不包括直接的 a、b。</p>`,
      validate: ({ values }) => equal(values["foundation-subset-c"], foundationWrappedA) && equal(values["foundation-subset-b"], foundationSetB)
        ? pass("A∈C 与 A⊆B 已由两条不同的集合构造显现。")
        : fail("C 要把整个 A 包成单元素集；B 则要拆开集合族 {A,{c}} 的一层，保留 a、b 并加入 c。")
    },
    {
      id: "set-foundation-power", branch: "set-foundation", requires: ["set-foundation-subset"], next: "ordered-pair", chapter: "集合论基础", title: "把所有选取方式收起来",
      copy: "A={a,b} 只有四种子集：什么都不选、只选 a、只选 b、以及全部选择。请先逐个造出它们，再把四个集合收进同一个集合。",
      goal: "构造 𝒫(A)={∅,{a},{b},{a,b}}。", tools: ["empty", "pair", "union"], semanticWorkbench: "set-power-two", artifacts: ["concrete-power-set"],
      spawnPositions: [{ x: 135, y: 35 }, { x: 135, y: 145 }, { x: 135, y: 255 }, { x: 290, y: 75 }, { x: 290, y: 225 }, { x: 415, y: 150 }, { x: 465, y: 290 }],
      nodes: [
        fixed("foundation-power-a", "集合 A", foundationSetA, "set", 20, 55, "A"),
        fixed("foundation-power-item-a", "A 的成员", "a", "set", 20, 225, "a"),
        fixed("foundation-power-item-b", "A 的成员", "b", "set", 20, 385, "b"),
        { ...goal("set", 545, 225), label: "A 的全部子集", glyph: "𝒫(A)" }
      ],
      hint: "生成 ∅，再分别制造 {a}、{b}；A 已经给出。把四个集合先分成两组配对，再把两组配成集合族并取并集。",
      definition: ["幂集收集全部子集", `<p>A 的幂集以 A 的所有子集为成员：</p><code>𝒫(A)={X｜X⊆A}</code><p>对于 A={a,b}，四种选择恰好是 ∅、{a}、{b}、A 本身。因此：</p><code>X∈𝒫(A)　恰好当　X⊆A</code><p>这里先完成具体的二元素情形；通用幂集构造要等到以后说明幂集公理时再解锁。</p>`],
      unlock: "二元素集的全部子集已经收集；回到结构主线",
      completionLesson: `<span class="eyebrow">集合的集合</span><h3>幂集的成员是 A 的所有子集</h3><code>𝒫(A)={∅,{a},{b},A}<br>X∈𝒫(A) ⇔ X⊆A</code><p class="layer-note">集合只由成员决定：不同的枚举顺序和构造路线不会产生新的子集。这是此前反复出现的外延观点。</p>`,
      validate: ({ value, nodes }) => {
        const produced = nodes.filter((node) => node.out === "set").map((node) => { try { return evaluateNode(node.id); } catch (_) { return null; } });
        const has = (candidate) => produced.some((item) => item && equal(item, candidate));
        return equal(value, foundationPowerA) && has(empty()) && has(set("a")) && has(set("b")) && nodes.some((node) => node.type === "union")
          ? pass("∅、{a}、{b}、A 四种子集已经成为 𝒫(A) 的四个成员。")
          : fail("必须先实际造出 ∅、{a}、{b}，再连同已有的 A 一起收成四成员集合。")
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
      copy: "从 A 到 B 的关系就是 A×B 的任意子集：它可以保留全部可能有序对，也可以只选择其中一些。观察台会把每个有序对同时画成箭头。",
      goal: "从 A×B 中选择有序对，构造 R={⟨0,a⟩,⟨0,b⟩,⟨1,b⟩}。", tools: ["ord", "set3"], semanticWorkbench: "relation-diagram", artifacts: ["relation"],
      spawnPositions: [{ x: 205, y: 35 }, { x: 205, y: 175 }, { x: 205, y: 315 }, { x: 385, y: 205 }],
      nodes: [fixed("r0", "A 的元素", structureZero, "set", 15, 35, "0"), fixed("r1", "A 的元素", structureOne, "set", 15, 145, "1"), fixed("ra", "B 的元素", "a", "set", 15, 285, "a"), fixed("rb", "B 的元素", "b", "set", 15, 395, "b"), goal("set", 570, 205)],
      hint: "只制造目标列出的三个有序对，再用三元素集把它们收集成 A×B 的子集。",
      definition: ["关系及其箭头表示", `${definitions.relations}<p>为了直接看出对象之间的连接，我们约定把关系成员 <code>⟨x,y⟩</code> 画成从 x 指向 y 的箭头：</p><code>⟨x,y⟩∈R　⇔　x ─R→ y</code><p>这条箭头也叫作一条<b>有向边</b>。它不是新的数学对象，只是同一个有序对的图形表示。当两项相同，箭头从 x 回到 x，简称<b>自环</b>。</p>`], unlock: "已构造关系；有序对可以同步读作有向边",
      completionLesson: `<span class="eyebrow">同一个关系，两种表示</span><h3>有序对集合可以直接画成箭头图</h3><code>⟨0,a⟩∈R　⇔　0 ─R→ a</code><p>以后观察台会经常使用箭头。有向边只是关系成员的图形表示；若出现 ⟨x,x⟩，对应的箭头回到自身，称为自环。</p>`,
      validate: ({ value }) => equal(value, sampleRelation)
        ? pass("R⊆A×B。它是合法关系；不过输入 0 同时通向 a、b，所以还不是函数。") : fail("每个有序对都必须来自 A×B，而且目标关系只选择指定的三个有序对。")
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
      id: "function-apply", branch: "shared", requires: ["function-value-graph"], next: "proposition-atom", alternateNext: "set-foundation-injection", alternateLabel: "继续集合论基础支线", alternateLockedLabel: "先完成集合论基础 F1–F3", chapter: "第二章 · 结构", title: "让函数工作",
      copy: "上一关的函数图已经折叠为节点 f(·)。它记住的仍是同一个有序对集合；现在把一个输入送进去，读取唯一边的终点。",
      goal: "把输入 0 送入 f，并取得函数值 f(0)。", tools: ["sampleFn"], artifacts: ["function-application"],
      nodes: [fixed("apply-input", "输入", structureZero, "set", 55, 205, "0"), goal("set", 790, 205)],
      hint: "把 0 接入 f(·) 的输入端，再把函数值接入目标。",
      definition: ["运行节点仍在读取函数图", `<p>f(·) 记住的正是上一关构造的集合 {⟨0,b⟩,⟨1,a⟩}。</p><code>⟨0,b⟩∈f ⇔ f(0)=b</code>`], unlock: "结构层完成：公式语言工坊已解锁",
      validate: ({ value }) => equal(value, "b") ? pass("函数图中唯一以 0 为第一项的边是 ⟨0,b⟩，因此 f(0)=b。") : fail("f(·) 会沿着以输入 0 为第一项的唯一有序边读取输出。")
    },
    {
      id: "set-foundation-injection", branch: "set-foundation", requires: ["set-foundation-power", "function-apply"], next: "set-foundation-surjection", chapter: "集合论基础", title: "不要让两条边撞在同一个终点",
      copy: "函数允许不同输入共享输出。现在构造 g:{0,1}→{a,b,c}，让 0、1 的两条边落在不同终点，保留两个输入之间的区别。",
      goal: "构造任意一个让 0、1 落在不同终点的函数 g:{0,1}→{a,b,c}。", tools: ["ord", "pair"], semanticWorkbench: "set-foundation-injection", artifacts: ["injection"],
      spawnPositions: [{ x: 245, y: 95 }, { x: 245, y: 330 }, { x: 420, y: 210 }],
      nodes: [
        fixed("foundation-inj-zero", "输入", structureZero, "set", 20, 80, "0"),
        fixed("foundation-inj-one", "输入", structureOne, "set", 20, 315, "1"),
        fixed("foundation-inj-a", "可能的输出", "a", "set", 185, 45, "a"),
        fixed("foundation-inj-b", "可能的输出", "b", "set", 185, 205, "b"),
        fixed("foundation-inj-c", "可能的输出", "c", "set", 185, 365, "c"),
        { ...goal("set", 555, 210), label: "函数图 g", glyph: "g:{0,1}→{a,b,c}" }
      ],
      hint: "分别为 0、1 制造一条有序边，并用配对收成函数图；两条边的第二项必须不同。",
      definition: ["不同输入保持分开", `<p>函数要求每个输入恰有一个出口，却允许不同输入共享终点。若一个函数从不让不同输入落到同一输出，就叫作<b>单射</b>。</p><code>不同输入　→　不同输出</code><p>到达集可以仍有对象没有被使用；单射只禁止碰撞。</p>`],
      unlock: "单射：不同输入不同输出",
      completionLesson: `<span class="eyebrow">单射</span><h3>两个输入仍能从输出中区分出来</h3><p>0、1 各有唯一出口，而且终点不同。到达集里允许留下空位。</p>`,
      validate: ({ value }) => {
        const analysis = analyzeFiniteMap(value, [structureZero, structureOne], ["a", "b", "c"]);
        if (!analysis.valid) return fail("每条边都必须从 0 或 1 出发，并落在 a、b、c 之一。");
        if (!analysis.complete) return fail("0、1 都必须恰好拥有一条出口。");
        return analysis.injective ? pass("不同输入落在不同终点；g 是单射。") : fail("两个输入落在了同一个终点。请改变其中一条边的第二项。");
      }
    },
    {
      id: "set-foundation-surjection", branch: "set-foundation", requires: ["set-foundation-injection"], next: "set-foundation-bijection", chapter: "集合论基础", title: "不要留下空着的终点",
      copy: "这次允许输入在终点相遇，但到达集 B={a,b} 中不能留下空位。构造 h:{0,1,2}→B，让 a、b 都至少成为一条边的终点。",
      goal: "构造任意满射 h:{0,1,2}→{a,b}。", tools: ["ord", "set3"], semanticWorkbench: "set-foundation-surjection", artifacts: ["surjection"],
      spawnPositions: [{ x: 235, y: 45 }, { x: 235, y: 210 }, { x: 235, y: 375 }, { x: 420, y: 210 }],
      nodes: [
        fixed("foundation-surj-zero", "输入", structureZero, "set", 15, 45, "0"),
        fixed("foundation-surj-one", "输入", structureOne, "set", 15, 205, "1"),
        fixed("foundation-surj-two", "输入", structureTwo, "set", 15, 365, "2"),
        fixed("foundation-surj-a", "到达集成员", "a", "set", 125, 125, "a"),
        fixed("foundation-surj-b", "到达集成员", "b", "set", 125, 305, "b"),
        { ...goal("set", 555, 210), label: "函数图 h", glyph: "h:{0,1,2}→{a,b}" }
      ],
      hint: "为 0、1、2 各造一条边并用三元素集收集；三个终点可以重复，但 a、b 必须都出现。",
      definition: ["到达集没有空位", `<p>若声明的到达集中每个对象都至少被命中一次，函数就叫作<b>满射</b>。</p><code>到达集中的每个对象　←　至少一条边</code><p>同一张图若改写成 h:{0,1,2}→{a,b,c}，没有边抵达 c，就不再是满射。因此“满射”离不开指定的到达集。</p>`],
      unlock: "满射：到达集中的每个对象都被命中",
      completionLesson: `<span class="eyebrow">满射</span><h3>a、b 都已经成为实际输出</h3><p>三个输入必须共享某个终点，但这不妨碍满射。满射关心有没有空着的目标，而不是有没有碰撞。</p>`,
      validate: ({ value }) => {
        const analysis = analyzeFiniteMap(value, [structureZero, structureOne, structureTwo], ["a", "b"]);
        if (!analysis.valid) return fail("每条边都必须从 0、1、2 之一出发，并落在 a、b 之一。");
        if (!analysis.complete) return fail("0、1、2 都必须恰好拥有一条出口。");
        return analysis.surjective ? pass("a、b 都至少被命中一次；h 是满射。") : fail("到达集还有一个对象没有收到任何边。");
      }
    },
    {
      id: "set-foundation-bijection", branch: "set-foundation", requires: ["set-foundation-surjection"], next: "set-foundation-inverse", chapter: "集合论基础", title: "没有碰撞，也没有空位",
      copy: "现在两边各有三个对象。构造 k:{0,1,2}→{a,b,c}：每个输入有唯一出口，每个终点也恰好收到一条边。",
      goal: "构造任意双射 k:{0,1,2}→{a,b,c}。", tools: ["ord", "set3"], semanticWorkbench: "set-foundation-bijection", artifacts: ["bijection"],
      spawnPositions: [{ x: 235, y: 45 }, { x: 235, y: 210 }, { x: 235, y: 375 }, { x: 420, y: 210 }],
      nodes: [
        fixed("foundation-bij-zero", "输入", structureZero, "set", 15, 45, "0"),
        fixed("foundation-bij-one", "输入", structureOne, "set", 15, 205, "1"),
        fixed("foundation-bij-two", "输入", structureTwo, "set", 15, 365, "2"),
        fixed("foundation-bij-a", "到达集成员", "a", "set", 185, 45, "a"),
        fixed("foundation-bij-b", "到达集成员", "b", "set", 185, 205, "b"),
        fixed("foundation-bij-c", "到达集成员", "c", "set", 185, 365, "c"),
        { ...goal("set", 555, 210), label: "函数图 k", glyph: "k:{0,1,2}→{a,b,c}" }
      ],
      hint: "三条边必须使用三个不同终点；这样既不会碰撞，也不会留下空位。",
      definition: ["刚好一一配完", `<p>同时是单射和满射的函数叫作<b>双射</b>。</p><code>每个输入一个输出<br>每个输出一个输入</code><p>双射把两个集合一一配对。以后比较集合大小时，真正使用的就是这种配对，而不是对象的外观。</p>`],
      unlock: "双射：两个集合一一配对",
      completionLesson: `<span class="eyebrow">双射</span><h3>双射=单射＋满射</h3><div class="set-foundation-summary"><article><code>单射</code><span>终点没有碰撞</span></article><article><code>满射</code><span>终点没有空位</span></article></div><p class="layer-note">同时满足单射和满射，输入与输出便一一对应。</p>`,
      validate: ({ value }) => {
        const analysis = analyzeFiniteMap(value, [structureZero, structureOne, structureTwo], ["a", "b", "c"]);
        if (!analysis.valid) return fail("函数边必须连接显示出的两个集合。");
        if (!analysis.complete) return fail("0、1、2 都必须恰好拥有一条出口。");
        if (!analysis.injective) return fail("有两个输入撞在同一终点，因此还不是单射。");
        return analysis.surjective ? pass("没有碰撞，也没有空位；k 是双射。") : fail("到达集中仍有空位，因此还不是满射。");
      }
    },
    {
      id: "set-foundation-inverse", branch: "set-foundation", requires: ["set-foundation-bijection"], next: "set-foundation-reverse-failures", chapter: "集合论基础", title: "把所有箭头反过来",
      copy: "给定双射 k={⟨0,b⟩,⟨1,c⟩,⟨2,a⟩}。交换每条边的起点和终点，构造从 {a,b,c} 回到 {0,1,2} 的函数。",
      goal: "构造 k⁻¹={⟨b,0⟩,⟨c,1⟩,⟨a,2⟩}。", tools: ["ord", "set3"], semanticWorkbench: "set-foundation-inverse", artifacts: ["inverse-function"],
      spawnPositions: [{ x: 235, y: 45 }, { x: 235, y: 210 }, { x: 235, y: 375 }, { x: 420, y: 210 }],
      nodes: [
        fixed("foundation-inv-zero", "返回对象", structureZero, "set", 15, 45, "0"),
        fixed("foundation-inv-one", "返回对象", structureOne, "set", 15, 205, "1"),
        fixed("foundation-inv-two", "返回对象", structureTwo, "set", 15, 365, "2"),
        fixed("foundation-inv-a", "反向输入", "a", "set", 185, 45, "a"),
        fixed("foundation-inv-b", "反向输入", "b", "set", 185, 205, "b"),
        fixed("foundation-inv-c", "反向输入", "c", "set", 185, 365, "c"),
        { ...goal("set", 555, 210), label: "反向函数图", glyph: "k⁻¹" }
      ],
      hint: "原图的 0→b、1→c、2→a 分别反向为 b→0、c→1、a→2，再收集三条反向边。",
      definition: ["双射能够倒着运行", `<p>把双射中的每条有序边反向，所得关系仍然是函数，叫作它的<b>逆函数</b>。</p><p>原函数满射，保证反向后的每个输入都有出口；原函数单射，保证反向后的每个输入不会拥有多个出口。</p><code>0 → b → 0<br>1 → c → 1<br>2 → a → 2</code>`],
      unlock: "逆函数 k⁻¹；函数之间的大小比较已经准备好",
      completionLesson: `<span class="eyebrow">逆函数</span><h3>一一配对可以沿两个方向读取</h3><code>k⁻¹(k(0))=0<br>k⁻¹(k(1))=1<br>k⁻¹(k(2))=2</code><p class="layer-note">普通函数的箭头反向后未必仍是函数；双射恰好同时保证反向图不会缺边，也不会分叉。</p>`,
      validate: ({ value }) => equal(value, foundationInverseGraph)
        ? pass("三条边全部反向；k⁻¹ 能把每个输出送回原输入。")
        : fail("逐条交换原图中有序对的两个位置：0→b 应变成 b→0，其余两条同理。")
    },
    {
      id: "set-foundation-reverse-failures", branch: "set-foundation", requires: ["set-foundation-inverse"], next: "set-foundation-equinumerous", alternateNext: "set-foundation-reflexive", chapter: "集合论基础", title: "反过来为什么不再是函数",
      copy: "上一关的双射反向后仍是函数。现在分别反转一个发生碰撞的函数和一个留下空位的函数，看看单射与满射各自保护了什么。",
      goal: "构造 f 的反向关系 {⟨a,0⟩,⟨a,1⟩}，以及 g 的反向关系 {⟨a,0⟩,⟨b,1⟩}。", tools: ["ord", "set2"], semanticWorkbench: "set-foundation-reverse-failures", multiGoals: ["foundation-reverse-collision", "foundation-reverse-gap"], artifacts: ["inverse-function-criterion"],
      spawnPositions: [{ x: 205, y: 30 }, { x: 385, y: 30 }, { x: 205, y: 175 }, { x: 385, y: 175 }, { x: 205, y: 320 }, { x: 385, y: 320 }],
      nodes: [
        fixed("foundation-reverse-a", "反向输入", "a", "set", 15, 35, "a"),
        fixed("foundation-reverse-b", "反向输入", "b", "set", 15, 150, "b"),
        fixed("foundation-reverse-zero", "返回对象", structureZero, "set", 15, 275, "0"),
        fixed("foundation-reverse-one", "返回对象", structureOne, "set", 15, 390, "1"),
        { ...goal("set", 570, 60), id: "foundation-reverse-collision", label: "反转 f", glyph: "f 的反向关系" },
        { ...goal("set", 570, 335), id: "foundation-reverse-gap", label: "反转 g", glyph: "g 的反向关系" }
      ],
      openingLesson: ["反向关系不一定是逆函数", `<p>给定函数中的边 x→y ，总能把它变成 y→x 。但得到的首先只是一个关系；它是否仍是函数，要看每个反向输入是否恰有一个输出。</p><code>f: 0→a, 1→a<br>g: 0→a, 1→b，且到达集是 {a,b,c}</code>`],
      hint: "上方目标收集 a→0、a→1；下方目标收集 a→0、b→1。同一条 a→0 可以分接给两个集合。",
      definition: ["单射与满射各保护一半", `<p>原函数单射，保证反向后不会从同一个输入分叉；原函数满射，保证反向后的每个输入都有出口。</p><p>因此，反向关系成为整个到达集上的函数，当且仅当原函数是双射。</p>`],
      unlock: "逆函数的条件：原函数必须同时单射且满射",
      completionLesson: `<span class="eyebrow">为什么需要双射</span><h3>碰撞反过来成为分叉，空位反过来成为缺口</h3><div class="set-foundation-summary"><article><code>不单射</code><span>反向后一个输入拥有多个出口</span></article><article><code>不满射</code><span>反向后有输入没有出口</span></article></div><p class="layer-note">双射恰好同时排除这两种失败，所以它的反向关系才是逆函数。</p>`,
      validate: ({ values }) => equal(values["foundation-reverse-collision"], foundationReverseCollision) && equal(values["foundation-reverse-gap"], foundationReverseGap)
        ? pass("两种失败已经显现：碰撞反成分叉，空位反成没有出口。")
        : fail("逐条交换已有函数边的起点与终点；这里构造的是两个反向关系，不要求它们通过函数条件。")
    },
    {
      id: "set-foundation-equinumerous", branch: "set-foundation", requires: ["set-foundation-reverse-failures"], next: "set-foundation-pigeonhole", chapter: "集合论基础", title: "跨过中间的一一配对",
      copy: "已知 0、1、2 分别对应 a、b、c，而 a、b、c 又分别对应杯子、盘子、勺子。沿两段路径走到底，直接配对最左与最右的对象。",
      goal: "构造 m={⟨0,杯子⟩,⟨1,盘子⟩,⟨2,勺子⟩}。", tools: ["ord", "set3"], semanticWorkbench: "set-foundation-equinumerous", artifacts: ["equinumerous-sets"],
      spawnPositions: [{ x: 365, y: 35 }, { x: 365, y: 165 }, { x: 365, y: 295 }, { x: 365, y: 420 }],
      nodes: [
        fixed("foundation-equi-zero", "左侧对象", structureZero, "set", 20, 55, "0"),
        fixed("foundation-equi-one", "左侧对象", structureOne, "set", 20, 210, "1"),
        fixed("foundation-equi-two", "左侧对象", structureTwo, "set", 20, 365, "2"),
        fixed("foundation-equi-cup", "右侧对象", "杯子", "set", 190, 55, "杯子"),
        fixed("foundation-equi-plate", "右侧对象", "盘子", "set", 190, 210, "盘子"),
        fixed("foundation-equi-spoon", "右侧对象", "勺子", "set", 190, 365, "勺子"),
        { ...goal("set", 555, 210), label: "直接配对 m", glyph: "m" }
      ],
      hint: "沿 0→a→杯子、1→b→盘子、2→c→勺子三条路径，制造首尾之间的有序边，再收成三元素函数图。",
      definition: ["双射比较集合的大小", `<p>若 A 与 B 之间存在双射，就说它们等势，记作 <code>A≈B</code>。等势只比较成员能否一一配完，不要求两个集合拥有相同成员或相似外观。</p><p>一一配对能够跨过中间集合：A≈B 且 B≈C 时，沿两段对应关系便得到 A≈C。</p>`],
      unlock: "等势记号 A≈B：存在从 A 到 B 的双射",
      completionLesson: `<span class="eyebrow">等势</span><h3>一一配对可以沿路径传递</h3><code>{0,1,2} ≈ {a,b,c} ≈ {杯子,盘子,勺子}</code><p>直接配对 m 说明最左与最右的集合也同样多。成员叫什么、长什么样，都不影响这件事。</p>`,
      validate: ({ value }) => equal(value, foundationDirectBijection)
        ? pass("三条两段路径已经压成三条直接边；最左与最右的集合一一对应。")
        : fail("每条新边应连接一条两段路径的首尾：0 到杯子，1 到盘子，2 到勺子。")
    },
    {
      id: "set-foundation-pigeonhole", branch: "set-foundation", requires: ["set-foundation-equinumerous"], next: "set-foundation-finite-index", chapter: "集合论基础", title: "三个输入挤进两个位置",
      copy: "这次不指定每条边落在哪里。只要求 0、1、2 各有一个出口，而可选终点只有 a、b。完成任意函数后，观察台会显示无法避免的事情。",
      goal: "构造任意函数 h:{0,1,2}→{a,b}。", tools: ["ord", "set3"], semanticWorkbench: "set-foundation-pigeonhole", artifacts: ["finite-pigeonhole-example"],
      spawnPositions: [{ x: 365, y: 35 }, { x: 365, y: 165 }, { x: 365, y: 295 }, { x: 365, y: 420 }],
      nodes: [
        fixed("foundation-hole-zero", "输入", structureZero, "set", 15, 45, "0"),
        fixed("foundation-hole-one", "输入", structureOne, "set", 15, 205, "1"),
        fixed("foundation-hole-two", "输入", structureTwo, "set", 15, 365, "2"),
        fixed("foundation-hole-a", "可选终点", "a", "set", 175, 125, "a"),
        fixed("foundation-hole-b", "可选终点", "b", "set", 175, 305, "b"),
        { ...goal("set", 555, 210), label: "任意完整函数 h", glyph: "h:{0,1,2}→{a,b}" }
      ],
      hint: "为 0、1、2 各造一条边，再用三元素集收集。终点可以任意选择；只要每个输入恰好出现一次即可。",
      definition: ["有限鸽巢现象的第一个实例", `<p>三个不同输入只有两个终点可选，因此任何完整函数都必有两个输入共享终点。换言之，不存在从 {0,1,2} 到 {a,b} 的单射。</p><p>本关只得到 3 对 2 的具体结论；一般的有限鸽巢原理以后用归纳方法证明。</p>`],
      unlock: "具体鸽巢结论：三元素集不能单射到二元素集",
      completionLesson: `<span class="eyebrow">无法避免的碰撞</span><h3>任意选择仍然不能制造第三个终点</h3><p>目标没有要求满射，也没有规定三条边怎么连接。碰撞来自对象数量本身，而不是某一种错误接法。</p><code>不存在单射　{0,1,2} → {a,b}</code>`,
      validate: ({ value }) => {
        const analysis = analyzeFiniteMap(value, [structureZero, structureOne, structureTwo], ["a", "b"]);
        if (!analysis.valid) return fail("每条边都必须从 0、1、2 之一出发，并落在 a、b 之一。");
        if (!analysis.complete) return fail("0、1、2 都必须恰好拥有一条出口。");
        return !analysis.injective ? pass("函数已经完整，而两个终点中必有一个收到至少两条边；单射无法构成。") : fail("三个输入不可能在两个终点上保持互不碰撞。");
      }
    },
    {
      id: "set-foundation-finite-index", branch: "set-foundation", requires: ["set-foundation-pigeonhole"], next: "set-foundation-finite-extension", chapter: "集合论基础", title: "用三个位置为集合编号",
      copy: "先构造标准位置集合 I₃={0,1,2}，再从 a 构造 E={a,{a},{{a}}}。最后用一张双射，让 I₃ 的每个位置恰好编号 E 的一个成员。",
      goal: "构造 I₃、E={a,{a},{{a}}}，以及从 I₃ 到 E 的双射。", tools: ["pair", "set3", "ord"], semanticWorkbench: "set-foundation-finite-index", multiGoals: ["foundation-index-three", "foundation-nested-set", "foundation-index-bijection"], artifacts: ["finite-set-definition"],
      spawnPositions: [{ x: 205, y: 20 }, { x: 385, y: 20 }, { x: 205, y: 130 }, { x: 385, y: 130 }, { x: 205, y: 240 }, { x: 385, y: 240 }, { x: 205, y: 350 }, { x: 385, y: 350 }],
      nodes: [
        fixed("foundation-finite-zero", "位置", structureZero, "set", 15, 35, "0"),
        fixed("foundation-finite-one", "位置", structureOne, "set", 15, 145, "1"),
        fixed("foundation-finite-two", "位置", structureTwo, "set", 15, 255, "2"),
        fixed("foundation-finite-a", "已有对象", "a", "set", 15, 385, "a"),
        { ...goal("set", 570, 45), id: "foundation-index-three", label: "位置集合", glyph: "I₃" },
        { ...goal("set", 570, 205), id: "foundation-nested-set", label: "被编号的集合", glyph: "E" },
        { ...goal("set", 570, 365), id: "foundation-index-bijection", label: "编号函数", glyph: "I₃ ↔ E" }
      ],
      hint: "用配对制造 {a}，再把 {a} 自己配成 {{a}}。用三元素集分别收集 0、1、2 与 a、{a}、{{a}}；最后制造三条编号边。",
      definition: ["有限集可以被完整编号", `<p>记 <code>Iₙ={0,1,…,n−1}</code>。若对某个 Iₙ，存在双射 <code>Iₙ→A</code>，就称 A 是有限集。</p><p>双射保证没有成员漏掉，也没有两个位置重复编号同一个成员。本关构造的编号表因此直接说明 E 是有限集。</p><p>这里暂时写 Iₙ。等冯·诺依曼路线汇入后，会看到它的 n 恰好就是这个位置集合。</p>`],
      unlock: "有限集：能够与某个有限位置集合 Iₙ 一一配对",
      completionLesson: `<span class="eyebrow">有限集</span><h3>一张完整的编号表说明 E 是有限集</h3><div class="set-foundation-summary"><article><code>0 ↔ a</code><span>位置 0 已使用</span></article><article><code>1 ↔ {a}</code><span>位置 1 已使用</span></article><article><code>2 ↔ {{a}}</code><span>位置 2 已使用</span></article></div><p class="layer-note">I₃ 的位置与 E 的成员恰好一一对应，没有遗漏，也没有重复。成员内部是什么，不影响它在编号表中只占一个位置。</p>`,
      validate: ({ values }) => equal(values["foundation-index-three"], foundationIndexThree) && equal(values["foundation-nested-set"], foundationNestedSet) && equal(values["foundation-index-bijection"], foundationNestedBijection)
        ? pass("I₃ 已经完整编号 E：每个位置和每个成员都恰好出现一次，因此 E 是有限集。")
        : fail("需要同时完成位置集合 I₃、对象集合 E，以及三条对应边 0→a、1→{a}、2→{{a}}。")
    },
    {
      id: "set-foundation-finite-extension", branch: "set-foundation", requires: ["set-foundation-finite-index"], next: "set-foundation-singleton-injection", chapter: "集合论基础", title: "可以一直加，但每次仍然有限",
      copy: "上一关得到 I₃={0,1,2}。把新位置 3 装成单元素集并加入，得到 I₄；再用同样方法加入位置 4，得到 I₅。",
      goal: "依次构造 I₄=I₃∪{3} 与 I₅=I₄∪{4}。", tools: ["pair", "union"], semanticWorkbench: "set-foundation-finite-extension", multiGoals: ["foundation-index-four", "foundation-index-five"], artifacts: ["finite-versus-infinite"],
      spawnPositions: [{ x: 205, y: 35 }, { x: 385, y: 35 }, { x: 205, y: 195 }, { x: 385, y: 195 }, { x: 205, y: 355 }, { x: 385, y: 355 }],
      nodes: [
        fixed("foundation-extension-three", "已有位置集合", foundationIndexThree, "set", 20, 85, "I₃"),
        fixed("foundation-extension-next-three", "新位置", numeral(3), "set", 20, 225, "3"),
        fixed("foundation-extension-next-four", "再下一个位置", numeral(4), "set", 20, 365, "4"),
        { ...goal("set", 570, 85), id: "foundation-index-four", label: "第一次扩展", glyph: "I₄" },
        { ...goal("set", 570, 335), id: "foundation-index-five", label: "第二次扩展", glyph: "I₅" }
      ],
      hint: "先把 3 配成 {3}，再把 I₃ 与 {3} 配成集合族并取并集。将所得 I₄ 分接到下一条路线，以同样方式加入 4。",
      definition: ["任意大仍不等于无限", `<p>每次加入一个新位置，都会得到更大的有限位置集合；但任何完成后的 Iₙ 仍然只有有限多个成员。</p><p>一个集合若不与任何有限位置集合 Iₙ 双射，才称为无限集。无穷不是“已经非常大”，而是不存在最后一个有限编号。</p><p>本关没有把所有 Iₙ 收成一个集合；自然数集与无穷公理将在后续关卡中单独处理。</p>`],
      unlock: "有限与无限的分界已经明确",
      completionLesson: `<span class="eyebrow">有限不等于有上限</span><h3>总能再加一个，但每个成品仍有有限编号</h3><code>I₃ ⊂ I₄ ⊂ I₅ ⊂ ···</code><p>省略号表示这种扩展可以继续，不表示已经制造出了一个无限集合。无限集必须不能与任何 Iₙ 一一配对。</p>`,
      validate: ({ values }) => equal(values["foundation-index-four"], foundationIndexFour) && equal(values["foundation-index-five"], foundationIndexFive)
        ? pass("I₃ 已连续扩展为 I₄、I₅；两个结果都更大，也都仍有完整的有限位置表。")
        : fail("先由 I₃ 与 {3} 得到 I₄，再把同一份 I₄ 用于下一次扩展并加入 {4}。")
    },
    {
      id: "set-foundation-singleton-injection", branch: "set-foundation", requires: ["set-foundation-finite-extension"], next: "set-foundation-power-cardinality", chapter: "集合论基础", title: "每个对象都有自己的单元素位置",
      copy: "A={a,b} 的幂集里已经有 {a} 与 {b}。把每个对象送到只装着它自己的子集，就能在 𝒫(A) 中为 A 的成员保留互不碰撞的位置。",
      goal: "构造 s={⟨a,{a}⟩,⟨b,{b}⟩}。", tools: ["pair", "ord"], semanticWorkbench: "set-foundation-singleton-injection", artifacts: ["cardinality-injection"],
      spawnPositions: [{ x: 205, y: 70 }, { x: 385, y: 70 }, { x: 205, y: 250 }, { x: 385, y: 250 }],
      nodes: [
        fixed("foundation-singleton-a", "A 的成员", "a", "set", 20, 115, "a"),
        fixed("foundation-singleton-b", "A 的成员", "b", "set", 20, 315, "b"),
        { ...goal("set", 570, 210), label: "单元素配对", glyph: "s:A→𝒫(A)" }
      ],
      hint: "先用配对器把 a 与自身配成 {a}，把 b 与自身配成 {b}；再制造两条有序边并收成二元素函数图。",
      definition: ["用单射比较大小", `<p>若存在从 A 到 B 的单射，就记作 <code>A≼B</code>：B 至少有足够的位置分别容纳 A 的成员。</p><p>这不是说 A 是 B 的子集。本关中 a、b 并不是 𝒫(A) 的成员；进入幂集的是 {a}、{b}。</p>`],
      unlock: "大小比较 A≼B：存在从 A 到 B 的单射",
      completionLesson: `<span class="eyebrow">单射比较大小</span><h3>每个对象都对应一个只装着自己的子集</h3><code>a ↦ {a}<br>b ↦ {b}</code><p>两个输出不同，所以这是一张从 A 到 𝒫(A) 的单射。幂集里没有被使用的 ∅ 与 A 并不妨碍单射成立。</p><code>A≼𝒫(A)</code>`,
      validate: ({ value }) => equal(value, foundationSingletonInjection)
        ? pass("a、b 已分别进入自己的单元素子集；A 单射到 𝒫(A)。")
        : fail("两条边应当是 a→{a} 与 b→{b}；不要把对象直接送回对象本身。")
    },
    {
      id: "set-foundation-power-cardinality", branch: "set-foundation", requires: ["set-foundation-singleton-injection"], next: "set-foundation-diagonal-subset", chapter: "集合论基础", title: "四种选取方式，四个位置",
      copy: "A={a,b} 的一个子集，就是对 a、b 各做一次“选入或不选”的结果。把四种结果逐一放到四个有限位置上。",
      goal: "构造 0↦∅、1↦{a}、2↦{b}、3↦{a,b} 的双射。", tools: ["ord", "set4"], semanticWorkbench: "set-foundation-power-cardinality", artifacts: ["finite-power-cardinality"],
      spawnPositions: [{ x: 355, y: 30 }, { x: 355, y: 145 }, { x: 355, y: 260 }, { x: 355, y: 375 }, { x: 465, y: 205 }],
      nodes: [
        fixed("foundation-power-index-zero", "位置", numeral(0), "set", 15, 35, "0"),
        fixed("foundation-power-index-one", "位置", numeral(1), "set", 15, 145, "1"),
        fixed("foundation-power-index-two", "位置", numeral(2), "set", 15, 255, "2"),
        fixed("foundation-power-index-three", "位置", numeral(3), "set", 15, 365, "3"),
        fixed("foundation-power-empty", "A 的子集", empty(), "set", 175, 35, "∅"),
        fixed("foundation-power-a", "A 的子集", set("a"), "set", 175, 145, "{a}"),
        fixed("foundation-power-b", "A 的子集", set("b"), "set", 175, 255, "{b}"),
        fixed("foundation-power-ab", "A 的子集", foundationTwoObjectSet, "set", 175, 365, "{a,b}"),
        { ...goal("set", 570, 210), label: "四个位置的编号", glyph: "I₄↔𝒫(A)" }
      ],
      hint: "按题面制造四条边，再用四元素集收集它们。四个位置和四个子集都必须各出现一次。",
      definition: ["有限基数", `<p>若 <code>Iₙ≈X</code>，就写作 <code>|X|=n</code>。这表示 X 的成员恰好能被 n 个有限位置逐一编号。</p><p>本关因此得到 <code>|A|=2</code> 与 <code>|𝒫(A)|=4</code>。指数记号稍后再引入；眼下最重要的是看清四种选取结果。</p>`],
      unlock: "有限基数记号 |X|=n",
      completionLesson: `<span class="eyebrow">有限基数</span><h3>每个子集恰好占据一个位置</h3><code>0↔∅　1↔{a}　2↔{b}　3↔{a,b}</code><p>A 有两个成员；𝒫(A) 收集对这两个成员的全部选取方式，所以这里共有四个成员。</p>`,
      validate: ({ value }) => equal(value, foundationPowerBijection)
        ? pass("四个有限位置与四个子集已经一一配完；|𝒫(A)|=4。")
        : fail("按照 0→∅、1→{a}、2→{b}、3→{a,b} 收集四条边。")
    },
    {
      id: "set-foundation-diagonal-subset", branch: "set-foundation", requires: ["set-foundation-power-cardinality"], next: "set-foundation-vn-index", chapter: "集合论基础", title: "造出函数遗漏的子集",
      copy: "任意选择一张从 A={a,b} 到 𝒫(A) 的完整函数图 f。然后逐个查看：当 x 没有被自己的像 f(x) 收进去时，才把 x 收进 D。",
      goal: "先构造任意 f:A→𝒫(A)，再构造 D={x∈A｜x∉f(x)}。", tools: ["ord", "pair"], semanticWorkbench: "set-foundation-diagonal-subset", multiGoals: ["foundation-diagonal-function", "foundation-diagonal-set"], artifacts: ["finite-diagonal-subset"],
      spawnPositions: [{ x: 365, y: 25 }, { x: 365, y: 120 }, { x: 365, y: 215 }, { x: 365, y: 310 }, { x: 365, y: 405 }],
      nodes: [
        fixed("foundation-diagonal-a", "输入", "a", "set", 15, 70, "a"),
        fixed("foundation-diagonal-b", "输入", "b", "set", 15, 315, "b"),
        fixed("foundation-diagonal-empty", "可选的像", empty(), "set", 175, 20, "∅"),
        fixed("foundation-diagonal-a-set", "可选的像", set("a"), "set", 175, 130, "{a}"),
        fixed("foundation-diagonal-b-set", "可选的像", set("b"), "set", 175, 240, "{b}"),
        fixed("foundation-diagonal-ab-set", "可选的像", foundationTwoObjectSet, "set", 175, 350, "{a,b}"),
        { ...goal("set", 570, 80), id: "foundation-diagonal-function", label: "任意完整函数", glyph: "f:A→𝒫(A)" },
        { ...goal("set", 570, 345), id: "foundation-diagonal-set", label: "由 f 决定的子集", glyph: "D" }
      ],
      hint: "先为 a、b 各选一个幂集成员作为像。观察台会逐行显示 x 是否属于 f(x)；恰好把答案为“否”的那些 x 收进 D。D 可能是 ∅、{a}、{b} 或 {a,b}。",
      definition: ["对角子集", `<p>由任意函数 <code>f:A→𝒫(A)</code> 都能构造子集 <code>D={x∈A｜x∉f(x)}</code>。</p><p>D 与每个 f(x) 都恰好在 x 这一点上相反，因此 D 不会等于任何 f(x)。本关只亲手验证了二元素集合的具体情形；一般的康托定理要等分离与逻辑工具准备好后再证明。</p>`],
      unlock: "具体对角构造：A={a,b} 时，任何 A→𝒫(A) 都会漏掉一个子集",
      completionLesson: `<span class="eyebrow">对角构造</span><h3>D 在每个对象自己的位置上翻转答案</h3><code>x∈D ⇔ x∉f(x)</code><p>所以 D 与 f(a) 在 a 处不同，也与 f(b) 在 b 处不同。无论刚才怎样选择函数，D 都不在它的输出之中。</p>`,
      validate: ({ values }) => {
        const graph = values["foundation-diagonal-function"];
        const diagonal = values["foundation-diagonal-set"];
        const analysis = analyzeFiniteMap(graph, ["a", "b"], foundationPowerOfTwo);
        if (!analysis.valid || !analysis.complete) return fail("f 必须让 a、b 各恰好拥有一个像，而且像必须是 A 的四个子集之一。");
        const expected = set(...["a", "b"].filter((x) => !contains(applyFunction(graph, x), x)));
        return equal(diagonal, expected)
          ? pass("D 已逐项翻转 x∈f(x) 的答案，因此不可能等于 f 的任何输出。")
          : fail("查看观察台的两行：只把“不属于自己的像”的那些输入收进 D。");
      }
    },
    {
      id: "set-foundation-vn-index", branch: "set-foundation", requires: ["set-foundation-diagonal-subset", "vn-run-successor"], next: "set-foundation-inductive-entry", chapter: "集合论基础", title: "位置集合原来就是冯·诺依曼数",
      copy: "冯·诺依曼路线把 2 造为 {0,1}。现在一边对 2 使用后继，一边直接收集三个位置 0、1、2，比较两条路线的结果。",
      goal: "同时构造 S(2)=2∪{2} 与 I₃={0,1,2}。", tools: ["vnSucc", "set3"], semanticWorkbench: "set-foundation-vn-index", multiGoals: ["foundation-vn-successor-three", "foundation-vn-index-three"], artifacts: ["vn-finite-index-identity"],
      spawnPositions: [{ x: 230, y: 75 }, { x: 390, y: 300 }],
      nodes: [
        fixed("foundation-vn-zero", "位置", vnNat(0), "set", 20, 45, "0"),
        fixed("foundation-vn-one", "位置", vnNat(1), "set", 20, 205, "1"),
        fixed("foundation-vn-two", "已有的数", vnNat(2), "set", 20, 365, "2"),
        { ...goal("set", 570, 95), id: "foundation-vn-successor-three", label: "沿后继路线", glyph: "S(2)" },
        { ...goal("set", 570, 330), id: "foundation-vn-index-three", label: "沿位置路线", glyph: "I₃" }
      ],
      hint: "把 2 接入冯·诺依曼后继；同时把 0、1、2 接入三元素集。两个出口会得到同一个集合。",
      definition: ["有限序数就是有限位置集合", `<p>冯·诺依曼后继满足 <code>S(n)=n∪{n}</code>，所以 <code>3={0,1,2}</code>。这正是此前写作 I₃ 的位置集合。</p><p>策梅洛数与冯·诺依曼数在各自路线内都可以直接写作 0、1、2；只有比较两种构造时才需要指出它们来自哪条路线。</p>`],
      unlock: "识别：冯·诺依曼 n 就是有限位置集合 Iₙ",
      completionLesson: `<span class="eyebrow">两条路线汇合</span><h3>后继得到的 3，正是三个有限位置</h3><code>S(2)=2∪{2}={0,1,2}=I₃</code><p>从这里开始，冯·诺依曼自然数既能表示数，也能直接充当有限序列和有限编号的定义域。</p>`,
      validate: ({ values }) => equal(values["foundation-vn-successor-three"], foundationVnThree) && equal(values["foundation-vn-index-three"], foundationVnThree)
        ? pass("两条构造路线落在同一个集合上：3=I₃。")
        : fail("上方对 2 使用冯·诺依曼后继；下方把 0、1、2 收进三元素集。")
    },
    {
      id: "set-foundation-inductive-entry", branch: "set-foundation", requires: ["set-foundation-vn-index"], next: "proposition-atom", chapter: "集合论基础", title: "有限候选总会漏掉下一个数",
      copy: "把 I₅={0,1,2,3,4} 当作已经收好的有限候选。对它的最后一个成员 4 使用后继会得到 5；再对 5 使用后继，又会得到新的 6。",
      goal: "依次构造 5=S(4) 与 6=S(5)。", tools: ["vnSucc"], semanticWorkbench: "set-foundation-inductive-entry", multiGoals: ["foundation-vn-five", "foundation-vn-six"], artifacts: ["inductive-set-motivation"],
      spawnPositions: [{ x: 260, y: 100 }, { x: 420, y: 285 }],
      nodes: [
        fixed("foundation-vn-four", "I₅ 的最后一个成员", vnNat(4), "set", 30, 210, "4"),
        { ...goal("set", 570, 105), id: "foundation-vn-five", label: "候选之外的下一个数", glyph: "5" },
        { ...goal("set", 570, 330), id: "foundation-vn-six", label: "继续得到的下一个数", glyph: "6" }
      ],
      hint: "把 4 接入后继，并把所得 5 同时接入第一个目标和另一个后继；再把第二个后继的输出接入 6。",
      definition: ["归纳集的入口", `<p>集合 X 若包含 0，并且每当 n∈X 时也包含 S(n)，就称 X 对后继封闭，也称为归纳集。</p><p>任何有限位置集合 Iₙ 都无法做到这一点：它的最后成员 n−1 在集合中，但其后继 n 不在集合中。下一批关卡将说明为什么需要无穷公理来保证归纳集存在。</p>`],
      unlock: "归纳集条件：0∈X，且 n∈X 时 S(n)∈X",
      completionLesson: `<span class="eyebrow">有限候选无法封闭</span><h3>最后一个成员的后继总在外面</h3><code>4∈I₅　但　S(4)=5∉I₅</code><p>把候选扩成 I₆ 也只会把问题推到 6。要让 0 以及每一次后继都留在同一个集合中，必须首次保证一个真正的归纳集存在。</p>`,
      validate: ({ values }) => equal(values["foundation-vn-five"], foundationVnFive) && equal(values["foundation-vn-six"], foundationVnSix)
        ? pass("每个有限候选都能指出下一个未被收进来的自然数；归纳集不能只是某个 Iₙ。")
        : fail("先由 4 得到 5，再把同一个 5 送入下一次后继得到 6。")
    },
    {
      id: "set-foundation-reflexive", branch: "set-foundation", requires: ["set-foundation-reverse-failures"], next: "set-foundation-symmetric", chapter: "集合论基础 · 等价关系", title: "每个对象都与自己相关",
      copy: "在 A={杯子,盘子,勺子} 上，为每个对象 x 制造有序对 ⟨x,x⟩，再把三个有序对收成一个关系。",
      goal: "构造 Δₐ={⟨杯子,杯子⟩,⟨盘子,盘子⟩,⟨勺子,勺子⟩}。", tools: ["ord", "set3"], semanticWorkbench: "set-foundation-reflexive", artifacts: ["reflexive-relation"],
      spawnPositions: [{ x: 245, y: 45 }, { x: 245, y: 185 }, { x: 245, y: 325 }, { x: 410, y: 205 }],
      nodes: [
        fixed("quotient-reflexive-cup", "A 的对象", quotientCup, "set", 20, 55, quotientCup),
        fixed("quotient-reflexive-plate", "A 的对象", quotientPlate, "set", 20, 210, quotientPlate),
        fixed("quotient-reflexive-spoon", "A 的对象", quotientSpoon, "set", 20, 365, quotientSpoon),
        { ...goal("set", 570, 210), label: "三个 ⟨x,x⟩ 组成的关系", glyph: "Δₐ" }
      ],
      hint: "让同一个对象同时进入有序对的两个入口，分别得到三个 ⟨x,x⟩，再用三元素集收集。",
      definition: ["自反关系", `<p>集合 A 上的关系 R 若让每个对象都与自身有关系，就称 R 在 A 上<b>自反</b>。</p><code>对每个 x∈A，都有 ⟨x,x⟩∈R</code><p>本关构造的 Δₐ 只有自环。一般的自反关系还可以拥有其他边；它只要求这些自环一个都不能少。</p>`],
      unlock: "关系性质：自反性",
      completionLesson: `<span class="eyebrow">自反性</span><h3>A 中的每个对象都拥有一条自环</h3><code>∀x∈A　⟨x,x⟩∈Δₐ</code><p>自反性不是要求关系只有自环，而是要求所有自环都存在。</p>`,
      validate: ({ value }) => equal(value, quotientDiagonal)
        ? pass("三个对象的自环都已进入关系；Δₐ 在 A 上自反。")
        : fail("杯子、盘子、勺子都必须分别与自身组成有序对。")
    },
    {
      id: "set-foundation-symmetric", branch: "set-foundation", requires: ["set-foundation-reflexive"], next: "set-foundation-transitive", chapter: "集合论基础 · 等价关系", title: "每条边都能反向读取",
      copy: "已有 S₀={⟨杯子,盘子⟩,⟨勺子,杯子⟩}。为每条已有边补上反向边，再把两部分合并成同一个关系 S。",
      goal: "构造 S=S₀∪{⟨盘子,杯子⟩,⟨杯子,勺子⟩}。", tools: ["ord", "pair", "union"], semanticWorkbench: "set-foundation-symmetric", artifacts: ["symmetric-relation"],
      spawnPositions: [{ x: 215, y: 25 }, { x: 385, y: 25 }, { x: 215, y: 165 }, { x: 385, y: 165 }, { x: 300, y: 325 }],
      nodes: [
        fixed("quotient-symmetric-cup", "端点", quotientCup, "set", 15, 35, quotientCup),
        fixed("quotient-symmetric-plate", "端点", quotientPlate, "set", 15, 170, quotientPlate),
        fixed("quotient-symmetric-spoon", "端点", quotientSpoon, "set", 15, 305, quotientSpoon),
        fixed("quotient-symmetric-base", "已有关系", quotientSymmetryBase, "set", 175, 400, "S₀"),
        { ...goal("set", 570, 210), label: "补齐反向边后的关系", glyph: "S" }
      ],
      hint: "制造盘子→杯子和杯子→勺子，用配对收成二元素关系；再把它与 S₀ 配成集合族并取并集。",
      definition: ["对称关系", `<p>若关系中的每条边反向后仍在同一个关系里，就称关系<b>对称</b>。</p><code>⟨x,y⟩∈R ⇒ ⟨y,x⟩∈R</code><p>反向关系总能构造；对称性的要求更强：反向得到的边不需要另建关系，它们已经属于 R。</p>`],
      unlock: "关系性质：对称性",
      completionLesson: `<span class="eyebrow">对称性</span><h3>每条有向边都在同一个关系里找到反向边</h3><code>xSy ⇒ ySx</code><p>S₀ 本身不是对称关系；补齐的两条反向边让整个 S 具备了对称性。</p>`,
      validate: ({ value }) => equal(value, quotientSymmetricRelation)
        ? pass("两条反向边已经补齐；S 中的每条边都能在 S 内反向读取。")
        : fail("已有杯子→盘子、勺子→杯子；还需加入盘子→杯子、杯子→勺子。")
    },
    {
      id: "set-foundation-transitive", branch: "set-foundation", requires: ["set-foundation-symmetric"], next: "set-foundation-equivalence", alternateNext: "set-foundation-antisymmetric", alternateLabel: "探索次序与良序", chapter: "集合论基础 · 等价关系", title: "两段关系要求一条直达边",
      copy: "已有 T₀={⟨杯子,盘子⟩,⟨盘子,勺子⟩}。这两条边首尾相接；把它们共同要求的直达边加入同一个关系。",
      goal: "加入 ⟨杯子,勺子⟩，构造传递关系 T。", tools: ["ord", "pair", "union"], semanticWorkbench: "set-foundation-transitive", artifacts: ["transitive-relation"],
      spawnPositions: [{ x: 245, y: 50 }, { x: 405, y: 50 }, { x: 245, y: 230 }, { x: 405, y: 230 }],
      nodes: [
        fixed("quotient-transitive-cup", "起点", quotientCup, "set", 15, 55, quotientCup),
        fixed("quotient-transitive-spoon", "终点", quotientSpoon, "set", 15, 255, quotientSpoon),
        fixed("quotient-transitive-base", "已有的两段关系", quotientTransitiveBase, "set", 15, 405, "T₀"),
        { ...goal("set", 570, 210), label: "补齐直达边后的关系", glyph: "T" }
      ],
      hint: "先制造杯子→勺子，把这条边配成单元素关系；再与 T₀ 配成集合族并取并集。",
      definition: ["传递关系", `<p>若 x 通过关系到达 y，而 y 又到达 z，传递性要求 x 能在同一关系中直接到达 z。</p><code>⟨x,y⟩∈R 且 ⟨y,z⟩∈R ⇒ ⟨x,z⟩∈R</code><p>本关的直达边不是任意捷径，而是已有两段边共同要求的结果。</p>`],
      unlock: "关系性质：传递性",
      completionLesson: `<span class="eyebrow">传递性</span><h3>经过盘子的两段边要求杯子直达勺子</h3><code>杯子 T 盘子　盘子 T 勺子<br>────────────────────<br>杯子 T 勺子</code>`,
      validate: ({ value }) => equal(value, quotientTransitiveRelation)
        ? pass("直达边已经加入；这条两段路径满足传递性的要求。")
        : fail("把杯子→勺子作为第三条边加入已有关系 T₀。")
    },
    {
      id: "set-foundation-equivalence", branch: "set-foundation", requires: ["set-foundation-transitive"], next: "set-foundation-equivalence-classes", chapter: "集合论基础 · 等价关系", title: "属于同一组",
      copy: "把杯子与盘子放在一组，把勺子单独放在另一组。规定两个对象有关系，当且仅当它们位于同一组；请构造两个组和全部组内边。",
      goal: "构造 B={杯子,盘子}、C={勺子}，以及“同组”关系 R。", tools: ["pair", "ord", "set4", "union"], semanticWorkbench: "set-foundation-equivalence", multiGoals: ["quotient-block-dishes", "quotient-block-spoon", "quotient-equivalence-relation"], artifacts: ["equivalence-relation"],
      spawnPositions: [{ x: 205, y: 25 }, { x: 385, y: 25 }, { x: 205, y: 135 }, { x: 385, y: 135 }, { x: 205, y: 245 }, { x: 385, y: 245 }, { x: 205, y: 355 }, { x: 385, y: 355 }],
      nodes: [
        fixed("quotient-equivalence-cup", "第一组的对象", quotientCup, "set", 15, 55, quotientCup),
        fixed("quotient-equivalence-plate", "第一组的对象", quotientPlate, "set", 15, 210, quotientPlate),
        fixed("quotient-equivalence-spoon", "第二组的对象", quotientSpoon, "set", 15, 365, quotientSpoon),
        { ...goal("set", 570, 30), id: "quotient-block-dishes", label: "第一组", glyph: "B" },
        { ...goal("set", 570, 150), id: "quotient-block-spoon", label: "第二组", glyph: "C" },
        { ...goal("set", 570, 330), id: "quotient-equivalence-relation", label: "同组关系", glyph: "R" }
      ],
      hint: "B 用配对直接构造；C 由勺子与自身配对。R 包含 B 内部的四种有序边和 C 内部唯一的自环；先分别收集，再取并集。",
      definition: ["等价关系", `<p>同时满足自反性、对称性和传递性的关系叫作<b>等价关系</b>。</p><p>“位于同一组”自然满足三条要求：每个对象与自己同组；同组关系可以交换方向；与同一个中间对象同组的对象仍在同一组。</p>`],
      unlock: "等价关系：自反、对称且传递",
      completionLesson: `<span class="eyebrow">第一个等价关系</span><h3>关系边只在组内出现</h3><div class="set-foundation-summary"><article><code>自反</code><span>三个自环都存在</span></article><article><code>对称</code><span>跨对象的边成对出现</span></article><article><code>传递</code><span>组内路径不会跑到组外</span></article></div>`,
      validate: ({ values }) => equal(values["quotient-block-dishes"], quotientClassDishes) && equal(values["quotient-block-spoon"], quotientClassSpoon) && equal(values["quotient-equivalence-relation"], quotientEquivalenceRelation)
        ? pass("两个组和全部组内边已经构成；R 是 A 上的等价关系。")
        : fail("R 必须恰好包含杯子、盘子之间的四条组内边，以及勺子的自环。")
    },
    {
      id: "set-foundation-equivalence-classes", branch: "set-foundation", requires: ["set-foundation-equivalence"], next: "set-foundation-partition", chapter: "集合论基础 · 等价关系", title: "沿关系收集同类对象",
      copy: "固定使用上一关的同组关系 R。从每个对象所在的行出发，把与它有关系的所有对象收成一个集合。",
      goal: "分别构造 [杯子]、[盘子] 与 [勺子]。", tools: ["pair"], semanticWorkbench: "set-foundation-equivalence-classes", multiGoals: ["quotient-class-cup", "quotient-class-plate", "quotient-class-spoon"], artifacts: ["equivalence-classes"],
      spawnPositions: [{ x: 295, y: 100 }, { x: 295, y: 320 }],
      nodes: [
        fixed("quotient-class-source-cup", "从这一行出发", quotientCup, "set", 20, 55, quotientCup),
        fixed("quotient-class-source-plate", "从这一行出发", quotientPlate, "set", 20, 210, quotientPlate),
        fixed("quotient-class-source-spoon", "从这一行出发", quotientSpoon, "set", 20, 365, quotientSpoon),
        { ...goal("set", 570, 45), id: "quotient-class-cup", label: "杯子的等价类", glyph: "[杯子]" },
        { ...goal("set", 570, 205), id: "quotient-class-plate", label: "盘子的等价类", glyph: "[盘子]" },
        { ...goal("set", 570, 365), id: "quotient-class-spoon", label: "勺子的等价类", glyph: "[勺子]" }
      ],
      hint: "杯子与盘子都和杯子、盘子有关系，所以前两个目标接收同一个配对结果；勺子只与自身有关系。",
      definition: ["等价类", `<p>对象 x 的等价类，是所有与 x 有关系的对象组成的集合：</p><code>[x]ᵣ={y∈A｜xRy}</code><p>等价类不是给对象添加的新标签，而是从关系的一整行读出的普通集合。等价的对象会读出同一个等价类。</p>`],
      unlock: "等价类 [x]ᵣ",
      completionLesson: `<span class="eyebrow">等价类</span><h3>不同起点可能读出同一个集合</h3><code>[杯子]ᵣ=[盘子]ᵣ={杯子,盘子}<br>[勺子]ᵣ={勺子}</code><p>杯子和盘子不是两个不同的类；它们是同一个类的两个代表。</p>`,
      validate: ({ values }) => equal(values["quotient-class-cup"], quotientClassDishes) && equal(values["quotient-class-plate"], quotientClassDishes) && equal(values["quotient-class-spoon"], quotientClassSpoon)
        ? pass("三行关系已经读成等价类；杯子与盘子给出同一个集合。")
        : fail("前两个目标都应收到 {杯子,盘子}；勺子的类是单元素集 {勺子}。")
    },
    {
      id: "set-foundation-partition", branch: "set-foundation", requires: ["set-foundation-equivalence-classes"], next: "set-foundation-quotient-projection", chapter: "集合论基础 · 等价关系", title: "这些类重新覆盖原集合",
      copy: "只取两个不同的等价类 B={杯子,盘子} 与 C={勺子}。把它们收成一组块，再展开这些块，看看能否恰好取回原集合 A。",
      goal: "构造 Π={B,C}，并由 ⋃Π 重新得到 A。", tools: ["pair", "union"], semanticWorkbench: "set-foundation-partition", multiGoals: ["quotient-partition", "quotient-partition-cover"], artifacts: ["set-partition", "quotient-set"],
      spawnPositions: [{ x: 245, y: 100 }, { x: 405, y: 285 }],
      nodes: [
        fixed("quotient-partition-dishes", "第一个不同的类", quotientClassDishes, "set", 20, 115, "B={杯子,盘子}"),
        fixed("quotient-partition-spoon", "第二个不同的类", quotientClassSpoon, "set", 20, 315, "C={勺子}"),
        { ...goal("set", 570, 105), id: "quotient-partition", label: "类组成的块集合", glyph: "Π" },
        { ...goal("set", 570, 330), id: "quotient-partition-cover", label: "展开全部块", glyph: "⋃Π=A" }
      ],
      hint: "用配对把 B、C 收成 Π；把同一个 Π 输出接入第一个目标和并集族，再把并集结果送入第二个目标。",
      definition: ["划分与商集", `<p>A 的一个<b>划分</b>是一组非空、互不重叠，并且合起来覆盖 A 的子集。</p><p>等价关系的不同等价类总会形成这样的划分。把这组等价类本身当作一个集合，就得到<b>商集</b>：</p><code>A/R={ [x]ᵣ｜x∈A }</code><p>商集不是在划分之外另造一份集合；它就是这组块，只是现在把每个完整的块当作一个新对象。</p>`],
      unlock: "划分与商集 A/R",
      completionLesson: `<span class="eyebrow">商集</span><h3>这份划分就是商集</h3><code>Π=A/R={{杯子,盘子},{勺子}}<br>⋃Π={杯子,盘子,勺子}=A</code><p>原集合的对象被分进互不重叠的块；现在把每个完整的块当作一个对象。我们没有重新构造别的集合，只是开始以新的方式使用这份划分。</p>`,
      validate: ({ values }) => equal(values["quotient-partition"], quotientPartition) && equal(values["quotient-partition-cover"], quotientDomain)
        ? pass("两个不同的等价类已经组成划分，并且完整覆盖 A。")
        : fail("先把 B、C 收成 Π，再对同一个 Π 使用并集族；结果应恰好是 A。")
    },
    {
      id: "set-foundation-quotient-projection", branch: "set-foundation", requires: ["set-foundation-partition"], next: "set-foundation-function-image", chapter: "集合论基础 · 等价关系", title: "把原对象送到它所属的类",
      copy: "上一关已经得到商集 A/R={{杯子,盘子},{勺子}}。现在构造一个函数，记录每个原对象在商集中变成了哪个对象。",
      goal: "构造函数 q：杯子和盘子都送到 {杯子,盘子}，勺子送到 {勺子}。", tools: ["set3", "ord"], semanticWorkbench: "set-foundation-quotient-projection", artifacts: ["quotient-projection"],
      spawnPositions: [{ x: 350, y: 35 }, { x: 350, y: 155 }, { x: 350, y: 275 }, { x: 470, y: 205 }],
      nodes: [
        fixed("quotient-projection-cup", "原对象", quotientCup, "set", 15, 45, quotientCup),
        fixed("quotient-projection-plate", "原对象", quotientPlate, "set", 15, 205, quotientPlate),
        fixed("quotient-projection-spoon", "原对象", quotientSpoon, "set", 15, 365, quotientSpoon),
        fixed("quotient-projection-dishes-class", "等价类", quotientClassDishes, "set", 185, 125, "B={杯子,盘子}"),
        fixed("quotient-projection-spoon-class", "等价类", quotientClassSpoon, "set", 185, 365, "C={勺子}"),
        { ...goal("set", 570, 210), label: "送往所属的类", glyph: "q:A→A/R" }
      ],
      hint: "分别用有序对制造三条边，再用三元素集收集。制造前两条边时，让杯子和盘子复用同一个 B 节点作为输出；勺子送往 C。",
      definition: ["自然投影", `<p>把每个对象送到其等价类的函数叫作<b>自然投影</b>：</p><code>q:A→A/R　　q(x)=[x]ᵣ</code><p>它保留“属于哪个类”，同时忘掉同一个类中对象之间的区别。q 能到达商集中的每个类，所以是满射；等价但不同的对象会共享输出，所以通常不是单射。</p>`],
      unlock: "自然投影 q:A→A/R",
      completionLesson: `<span class="eyebrow">自然投影</span><h3>保留属于哪个类，忘掉类内对象的区别</h3><code>q:A→A/R　　q(x)=[x]ᵣ</code><p>你构造的函数把杯子与盘子送到同一个商集对象，把勺子送到另一个对象。这个函数覆盖全部等价类，但不再区分类内的杯子与盘子。</p><p>以后构造项模型时，也会用同样方法把“可证明相等”的名字合并。</p>`,
      validate: ({ value }) => equal(value, quotientProjection)
        ? pass("每个原对象都已经送到所属的类；这个函数叫作自然投影。")
        : fail("q 需要三条边：杯子、盘子都送往 {杯子,盘子}，勺子送往 {勺子}。")
    },
    {
      id: "set-foundation-function-image", branch: "set-foundation", requires: ["set-foundation-quotient-projection"], next: "set-foundation-function-preimage", chapter: "集合论基础 · 函数与集合", title: "两个对象的像只有一个对象",
      copy: "沿用你构造的自然投影 q：杯子、盘子都送到 B={杯子,盘子}，勺子送到 C={勺子}。选出原集合的一部分，收集这些对象经过 q 后能够到达的全部对象。q(·) 读取的就是上一关那张函数图。",
      goal: "分别收集 {杯子,盘子} 与 {盘子,勺子} 的全部函数值。", tools: ["quotientFn", "pair"], semanticWorkbench: "function-set-image", multiGoals: ["function-image-dishes", "function-image-mixed"], artifacts: ["function-image"],
      spawnPositions: [{ x: 210, y: 40 }, { x: 210, y: 195 }, { x: 210, y: 350 }, { x: 390, y: 100 }, { x: 390, y: 320 }],
      nodes: [
        fixed("function-image-cup", "原对象", quotientCup, "set", 15, 45, "杯子"),
        fixed("function-image-plate", "原对象", quotientPlate, "set", 15, 205, "盘子"),
        fixed("function-image-spoon", "原对象", quotientSpoon, "set", 15, 365, "勺子"),
        { ...goal("set", 570, 100), id: "function-image-dishes", label: "收集杯子、盘子的函数值", glyph: "输入 {杯子,盘子}" },
        { ...goal("set", 570, 320), id: "function-image-mixed", label: "收集盘子、勺子的函数值", glyph: "输入 {盘子,勺子}" }
      ],
      hint: "分别让三个原对象经过 q。把杯子与盘子的函数值配对，送入第一个目标；把盘子与勺子的函数值配对，送入第二个目标。配对遇到相同元素时只留下一个成员。",
      definition: ["函数的像", `<p>对函数 q 和它定义域中的子集 U，收集 U 中所有对象的函数值，得到 U 的<b>像</b>：</p><code>q[U]={q(x)｜x∈U}</code><p>q(x) 是一个对象，q[U] 是收集函数值的集合。这里 q(杯子)=B，但 q[{杯子,盘子}]={B}；B 的成员是杯子与盘子，{B} 的唯一成员是整个 B。</p>`],
      unlock: "集合的像 q[U]",
      completionLesson: `<h3>收集函数值，得到集合的像</h3><code>q[{杯子,盘子}]={B}<br>q[{盘子,勺子}]={B,C}</code><p>杯子与盘子共享函数值 B，因此它们的像只有一个成员。B={杯子,盘子} 是一个输出对象；{B}={{杯子,盘子}} 是把这个输出对象收起来的集合。</p><p>记号 q(x) 表示一个输入的函数值，q[U] 表示整个输入集合的像。</p>`,
      validate: ({ values }) => equal(values["function-image-dishes"], set(quotientClassDishes)) && equal(values["function-image-mixed"], quotientPartition)
        ? pass("选定输入的全部函数值已经收成像集；共享的函数值只作为一个成员出现。")
        : fail("第一个目标要收集整个 B，得到 {B}；第二个目标要收集 B 与 C，得到 {B,C}。")
    },
    {
      id: "set-foundation-function-preimage", branch: "set-foundation", requires: ["set-foundation-function-image"], next: "set-foundation-function-composition", chapter: "集合论基础 · 函数与集合", title: "哪些输入会到达这里",
      copy: "现在从输出一侧选定一个集合，找出所有会进入它的原对象。沿用同一个 q：一个输出 B 可以对应杯子与盘子两个输入，不能只挑其中一个。",
      goal: "分别收集会到达 {B} 与 {B,C} 的全部原对象。", tools: ["pair", "set3"], semanticWorkbench: "function-set-preimage", multiGoals: ["function-preimage-dishes", "function-preimage-all"], artifacts: ["function-preimage"],
      spawnPositions: [{ x: 300, y: 100 }, { x: 300, y: 320 }],
      nodes: [
        fixed("function-preimage-cup", "可收集的原对象", quotientCup, "set", 15, 45, "杯子"),
        fixed("function-preimage-plate", "可收集的原对象", quotientPlate, "set", 15, 205, "盘子"),
        fixed("function-preimage-spoon", "可收集的原对象", quotientSpoon, "set", 15, 365, "勺子"),
        { ...goal("set", 570, 100), id: "function-preimage-dishes", label: "全部通向 B 的输入", glyph: "输出集合 {B}" },
        { ...goal("set", 570, 320), id: "function-preimage-all", label: "全部通向 B 或 C 的输入", glyph: "输出集合 {B,C}" }
      ],
      hint: "观察 q 的三条对应关系。第一个目标收下杯子与盘子，第二个目标再收下勺子；每个目标都必须包含所有符合要求的输入。",
      definition: ["函数的原像", `<p>对输出一侧的集合 V，所有函数值落在 V 中的输入组成它的<b>原像</b>：</p><code>q⁻¹[V]={x∈A｜q(x)∈V}</code><p>q⁻¹[V] 是一个集合；这个记号不要求 q 有逆函数。逆函数必须为一个输出确定唯一的输入，原像则可以把对应的多个输入一起收集起来。</p>`],
      unlock: "集合的原像 q⁻¹[V]",
      completionLesson: `<h3>原像收集所有符合要求的输入</h3><code>q⁻¹[{B}]={杯子,盘子}<br>q⁻¹[{B,C}]={杯子,盘子,勺子}</code><p>B 对应的两个输入都被收下，完整输出集合的原像则覆盖整个定义域。q 没有逆函数，却仍然有原像：原像是集合，不需要从多个输入中选出一个。</p>`,
      validate: ({ values }) => equal(values["function-preimage-dishes"], quotientClassDishes) && equal(values["function-preimage-all"], quotientDomain)
        ? pass("所有函数值落在选定输出集合中的输入已经收集；它们组成该集合的原像。")
        : fail("通向 B 的输入是杯子和盘子；通向 B 或 C 的输入还包括勺子。")
    },
    {
      id: "set-foundation-function-composition", branch: "set-foundation", requires: ["set-foundation-function-preimage"], next: "set-foundation-function-identity", chapter: "集合论基础 · 函数与集合", title: "把两段对应接成一个函数",
      copy: "之前你曾跨过中间对象构造一一配对。现在让自然投影 q 后面再接一个普通函数：先构造 h，把 B 送到 a、C 送到 b；再记录每个原对象沿这两段对应到达的最终对象。",
      goal: "构造 h={⟨B,a⟩,⟨C,b⟩}，以及从杯子、盘子、勺子直接到最终对象的函数。", tools: ["ord", "pair", "set3"], semanticWorkbench: "function-set-composition", multiGoals: ["function-composition-h", "function-composition-direct"], artifacts: ["function-composition"],
      spawnPositions: [{ x: 365, y: 5 }, { x: 365, y: 100 }, { x: 365, y: 195 }, { x: 365, y: 290 }, { x: 365, y: 385 }, { x: 545, y: 20 }, { x: 545, y: 280 }],
      nodes: [
        fixed("function-composition-cup", "原对象", quotientCup, "set", 15, 45, "杯子"),
        fixed("function-composition-plate", "原对象", quotientPlate, "set", 15, 205, "盘子"),
        fixed("function-composition-spoon", "原对象", quotientSpoon, "set", 15, 365, "勺子"),
        fixed("function-composition-b", "中间对象", quotientClassDishes, "set", 185, 20, "B={杯子,盘子}"),
        fixed("function-composition-c", "中间对象", quotientClassSpoon, "set", 185, 145, "C={勺子}"),
        fixed("function-composition-a", "最终对象", "a", "set", 185, 270, "a"),
        fixed("function-composition-last-b", "最终对象", "b", "set", 185, 395, "b"),
        { ...goal("set", 545, 135), id: "function-composition-h", label: "从等价类到最终对象", glyph: "h" },
        { ...goal("set", 545, 405), id: "function-composition-direct", label: "从原对象到最终对象", glyph: "两段接成一个函数" }
      ],
      hint: "用两个有序对与配对构造 h。再顺着观察台的两段路径，制造杯子→a、盘子→a、勺子→b，收成一个三元素函数图。",
      definition: ["函数的复合", `<p>若 q:A→A/R，h:A/R→{a,b}，则先经过 q、再经过 h，得到<b>复合函数</b>：</p><code>h∘q:A→{a,b}<br>(h∘q)(x)=h(q(x))</code><p>中间的函数值必须能作为下一段的输入。复合不要求函数是双射；杯子与盘子在 q 处共享输出，经过 h 后仍然共享输出。</p>`],
      unlock: "函数复合 h∘q",
      completionLesson: `<h3>先经过 q，再经过 h</h3><code>(h∘q)(x)=h(q(x))<br>h∘q={⟨杯子,a⟩,⟨盘子,a⟩,⟨勺子,b⟩}</code><p>复合把两段函数对应记录成一张直接的函数图。记号 h∘q 的右边 q 先执行，左边 h 后执行。</p><p>杯子与盘子在第一段已经汇合，因此第二段也无法区分它们。复合适用于普通函数，并不只适用于一一配对。</p>`,
      validate: ({ values }) => equal(values["function-composition-h"], quotientClassMap) && equal(values["function-composition-direct"], quotientCompositeMap)
        ? pass("两段对应已经合成一个函数；每个原对象直接对应 h(q(x))。")
        : fail("h 应把 B 送往 a、C 送往 b；合成后的函数把杯子、盘子送往 a，把勺子送往 b。")
    },
    {
      id: "set-foundation-function-identity", branch: "set-foundation", requires: ["set-foundation-function-composition", "set-foundation-inverse"], next: "set-foundation-natural-bijection", chapter: "集合论基础 · 函数与集合", title: "两个方向都能回到原对象",
      copy: "沿用逆函数关中已经构造的双射：k 把 0、1、2 分别送到 b、c、a，k⁻¹ 把它们送回。分别从两侧出发，把往返后的最终对应写成两个复合函数图。",
      goal: "构造先 k 后 k⁻¹，以及先 k⁻¹ 后 k 的两个复合函数。", tools: ["ord", "set3"], semanticWorkbench: "function-set-identity", multiGoals: ["function-identity-index", "function-identity-letters"], artifacts: ["identity-function", "inverse-composition"],
      spawnPositions: [{ x: 365, y: 5 }, { x: 365, y: 85 }, { x: 365, y: 165 }, { x: 365, y: 245 }, { x: 365, y: 325 }, { x: 365, y: 405 }, { x: 545, y: 20 }, { x: 545, y: 280 }],
      nodes: [
        fixed("function-identity-zero", "第一侧的对象", structureZero, "set", 15, 45, "0"),
        fixed("function-identity-one", "第一侧的对象", structureOne, "set", 15, 205, "1"),
        fixed("function-identity-two", "第一侧的对象", structureTwo, "set", 15, 365, "2"),
        fixed("function-identity-a", "另一侧的对象", "a", "set", 185, 45, "a"),
        fixed("function-identity-b", "另一侧的对象", "b", "set", 185, 205, "b"),
        fixed("function-identity-c", "另一侧的对象", "c", "set", 185, 365, "c"),
        { ...goal("set", 545, 135), id: "function-identity-index", label: "从 0、1、2 出发往返", glyph: "先 k，后 k⁻¹" },
        { ...goal("set", 545, 405), id: "function-identity-letters", label: "从 a、b、c 出发往返", glyph: "先 k⁻¹，后 k" }
      ],
      hint: "顺着两段路径找到最终对象。每条路径都回到出发对象，因此同一个对象节点应接入有序对两侧；分别收集两侧的三条边。",
      definition: ["恒等函数与逆函数", `<p>在集合 X 上，把每个对象送到自身的函数叫作<b>恒等函数</b>：</p><code>id_X(x)=x</code><p>双射 k:X→Y 与逆函数满足：</p><code>k⁻¹∘k=id_X<br>k∘k⁻¹=id_Y</code><p>两个方向的复合分别恢复各自的原对象；它们是不同集合上的恒等函数。</p>`],
      unlock: "恒等函数与逆函数的复合",
      completionLesson: `<h3>往返对应恢复每个原对象</h3><code>k⁻¹∘k=id_{ {0,1,2} }<br>k∘k⁻¹=id_{ {a,b,c} }</code><p>你构造的两个函数分别只包含 ⟨x,x⟩，把各自集合的每个对象送到自身。这种函数叫作恒等函数，记作 id_X，满足 id_X(x)=x。</p><p>逆函数能够撤销原函数：两个方向的复合分别得到各自集合上的恒等函数。</p>`,
      validate: ({ values }) => equal(values["function-identity-index"], foundationIdentityIndex) && equal(values["function-identity-letters"], foundationIdentityLetters)
        ? pass("两个方向的复合分别恢复各自的原对象，得到两个集合上的恒等函数。")
        : fail("第一张函数图需要 0→0、1→1、2→2；第二张需要 a→a、b→b、c→c。")
    },
    {
      id: "set-foundation-natural-bijection", branch: "set-foundation", requires: ["set-foundation-function-identity", "vn-run-successor", "set-foundation-vn-less", "set-foundation-inductive-entry"], next: "set-foundation-countable-enumeration", chapter: "集合论基础 · 无穷集合", title: "删去 0，仍然一一对应",
      copy: "ℕ 收集从 0 经过有限次后继得到的全部自然数；本关新增一个存在性假定：这样的无限集合存在，以后会在集合论公理中正式说明。从 ℕ 中删去 0 得到 ℕ∖{0}。后继把每个自然数送进这个真子集，请用已有的集合操作把它送回来，并从另一侧出发也恢复原对象。这里沿用冯诺依曼自然数。",
      goal: "为任意自然数 n 与任意非零自然数 m 分别构造完整的往返路径。", tools: ["vnSucc", "union"], semanticWorkbench: "natural-bijection", multiGoals: ["natural-bijection-n-return", "natural-bijection-m-return"], artifacts: ["natural-proper-subset-bijection"],
      spawnPositions: [{ x: 215, y: 110 }, { x: 395, y: 110 }, { x: 215, y: 325 }, { x: 395, y: 325 }],
      nodes: [
        fixed("natural-bijection-n", "任意自然数", vnNat(0), "set", 15, 110, "n ∈ ℕ", true),
        fixed("natural-bijection-m", "任意非零自然数", vnNat(1), "set", 15, 325, "m ∈ ℕ∖{0}", true),
        { ...goal("set", 575, 110), id: "natural-bijection-n-return", label: "回到原自然数", glyph: "恢复 n" },
        { ...goal("set", 575, 325), id: "natural-bijection-m-return", label: "回到原非零自然数", glyph: "恢复 m" }
      ],
      hint: "后继把 n 以及 n 的全部成员收成 S(n)=n∪{n}。试试哪个已有操作能从这个集合取回 n；再交换两个操作的先后，从非零自然数 m 出发。目标需要完整的往返，直接接入原输入没有建立对应。",
      definition: ["自然数与去掉 0 的自然数等势", `<p>本关的 ℕ 是包含 0 且对后继封闭的最小集合：它恰好包含从 0 经过有限次后继得到的全部自然数。这里假定这个无限集合存在；它的存在并不能仅从“还能继续构造更大的有限集合”推出。</p><p>冯诺依曼自然数 n 的成员恰好是全部比 n 小的自然数。它们的成员仍比 n 小，因此 <code>⋃n⊆n</code>，所以：</p><code>⋃S(n)=⋃(n∪{n})=(⋃n)∪n=n</code><p>每个非零自然数 m 都是某个自然数 n 的后继，因此 <code>S(⋃m)=m</code>。并集族在非零自然数上是后继的逆函数：</p><code>S:ℕ→ℕ∖{0}<br>⋃:ℕ∖{0}→ℕ</code><p>两方向的复合分别是恒等函数，于是 <code>ℕ≈ℕ∖{0}</code>，同时 <code>ℕ∖{0}⊊ℕ</code>。右侧不含 0，仍与原集合等势。取 m=0 时 <code>S(⋃0)=1≠0</code>，这解释了返回路径为什么只从非零自然数出发。</p>`],
      unlock: "ℕ 与它的真子集 ℕ∖{0} 等势",
      completionLesson: `<h3>删去一个对象，仍能一一对应</h3><code>⋃S(n)=n　（n∈ℕ）<br>S(⋃m)=m　（m∈ℕ∖{0}）</code><p>n 包含全部更小的自然数，展开这些数不会越出 n；展开 {n} 又恰好取回 n。因此 ⋃S(n)=n。每个非零自然数都是一个后继，所以另一方向也恢复原对象。</p><code>ℕ≈ℕ∖{0}　　ℕ∖{0}⊊ℕ</code><p>后继与并集族在这两个集合之间互为逆函数，建立了双射。右侧确实没有 0，却没有遗漏任何原对象的对应位置。</p><p>有限鸽巢关中，有限集合不能与自己的真子集等势；自然数集合却能够做到。观察台的有限窗口帮助看见对应，一般结论来自上面的构造理由。</p>`,
      validate: ({ nodes, connections }) => {
        const forward = naturalBijectionRoute("natural-bijection-n-return", "natural-bijection-n", 0, nodes, connections);
        const backward = naturalBijectionRoute("natural-bijection-m-return", "natural-bijection-m", 1, nodes, connections);
        if (!forward.complete || !backward.complete) return fail("两条往返路径都应从各自的符号输入出发，只使用后继与并集族，并接入对应目标。");
        if (!forward.operations.length || !backward.operations.length) return fail("直接连接原输入没有建立对应；请先进入另一个集合，再返回。");
        if (forward.operations[0] !== "vnSucc" || backward.operations[0] !== "union") return fail("从 n 出发先用后继进入 ℕ∖{0}；从非零 m 出发先找回它的前一个数，再返回。");
        if (!forward.identity || !backward.identity) return fail("这条路径不能为所有允许的输入恢复原对象；尤其要考虑 n=0 与 m=1 的边界。");
        return pass("两个方向对任意允许的输入都恢复原对象；后继与并集族建立了 ℕ 和 ℕ∖{0} 之间的双射。");
      }
    },
    {
      id: "set-foundation-countable-enumeration", branch: "set-foundation", requires: ["set-foundation-natural-bijection", "set-foundation-finite-index"], next: "set-foundation-countable-doubling", chapter: "集合论基础 · 可数集合", title: "给不断生成的对象编号", naturalNumerals: true,
      copy: "沿用之前的 a、{a}、{{a}}：每次把前一个对象整个装进单元素集，得到下一个对象。本关把这样生成的全部对象收成集合 X，并给它们逐个编号。先给 a 编号 0，再构造通用的推进方法：假定 n 已经对应对象 u，让下一个对象获得下一个编号。u 就是当前已经编号的对象。",
      goal: "构造初始对应 ⟨0,a⟩，再从已有对应 n↔u 构造下一条对应。", tools: ["vnSucc", "pair", "ord"], semanticWorkbench: "countable-enumeration", multiGoals: ["countable-enumeration-base", "countable-enumeration-step"], artifacts: ["countable-infinite-set", "singleton-enumeration"],
      spawnPositions: [{ x: 250, y: 65 }, { x: 215, y: 280 }, { x: 215, y: 405 }, { x: 395, y: 340 }],
      nodes: [
        fixed("countable-enumeration-zero", "初始编号", vnNat(0), "set", 15, 25, "0"),
        fixed("countable-enumeration-a", "初始对象", "a", "set", 15, 135, "a"),
        fixed("countable-enumeration-n", "已有编号", vnNat(1), "set", 15, 280, "n", true),
        fixed("countable-enumeration-u", "n 对应的对象", set("a"), "set", 15, 405, "u", true),
        { ...goal("set", 575, 65), id: "countable-enumeration-base", label: "初始编号", glyph: "第一条对应" },
        { ...goal("set", 575, 340), id: "countable-enumeration-step", label: "从已有对应推进一步", glyph: "下一条对应" }
      ],
      hint: "先用有序对记录 0→a。推进时，对编号 n 做一次后继；把同一个 u 接入配对的两个入口，得到 {u}，再把新编号与新对象组成有序对。",
      definition: ["可数无限集合", `<p>令 a₀=a，a_{S(n)}={aₙ}，X 收集按此规则生成的全部对象。初始对应与推进方法逐项定义了编号表：</p><code>0↔a，1↔{a}，2↔{{a}}，…</code><p>每个生成对象经过有限次包裹得到，因此都能获得编号；不同包裹层数得到不同对象，所以没有重复编号。这份编号表是 ℕ 与 X 之间的双射。</p><p>与 ℕ 等势的集合叫作<b>可数无限集合</b>。有限集合与某个有限编号集合等势；有限集合与可数无限集合合称<b>至多可数集合</b>。这里的 X 只包含这条生成链上的对象，不是所有集合。</p>`],
      unlock: "可数无限集合 X 与它的编号方法",
      completionLesson: `<h3>无限的一批对象，也能逐个编号</h3><code>0↔a，1↔{a}，2↔{{a}}，…<br>X≈ℕ</code><p>你构造了初始编号和通用推进方法。每个对象在有限次包裹后出现，因此不会遗漏；不同层数的对象不同，因此不会重复。于是编号表是一份双射，X 是可数无限集合。</p><p>有限集合与可数无限集合统称至多可数。可数无限并不表示编号会在最后一个对象处结束，而是每个对象都有一个自然数编号。</p>`,
      validate: ({ nodes, connections }) => validateCountableConstruction("enumeration", nodes, connections)
    },
    {
      id: "set-foundation-countable-doubling", branch: "set-foundation", requires: ["set-foundation-countable-enumeration"], next: "set-foundation-countable-two-copies", chapter: "集合论基础 · 可数集合", title: "一次留出两个连续位置", naturalNumerals: true,
      copy: "下一份编号表要同时容纳两批对象。先构造一个起点函数 d，为每组预留两个连续位置：第 0 组从 0 开始，下一组的起点向后移动两步。工作区的 n 是已有组号，d(n) 是已经为这一组得到的起点；你正在定义怎样从这一份结果得到下一份。",
      goal: "构造初始对应 ⟨0,0⟩，再构造下一组的编号与起点之间的对应。", tools: ["vnSucc", "ord"], semanticWorkbench: "countable-doubling", multiGoals: ["countable-doubling-base", "countable-doubling-step"], artifacts: ["natural-doubling"],
      spawnPositions: [{ x: 250, y: 65 }, { x: 215, y: 275 }, { x: 215, y: 405 }, { x: 395, y: 405 }, { x: 395, y: 275 }],
      nodes: [
        fixed("countable-doubling-zero", "初始组号与起点", vnNat(0), "set", 15, 65, "0"),
        fixed("countable-doubling-n", "已有组号", vnNat(1), "set", 15, 275, "n", true),
        fixed("countable-doubling-value", "这一组的已有起点", vnNat(2), "set", 15, 405, "d(n)", true),
        { ...goal("set", 575, 65), id: "countable-doubling-base", label: "第一组从哪里开始", glyph: "初始对应" },
        { ...goal("set", 575, 305), id: "countable-doubling-step", label: "下一组从哪里开始", glyph: "下一条对应" }
      ],
      hint: "初始有序对的两个入口都接 0。推进时，对 n 做一次后继，对已有起点 d(n) 连续做两次后继，再将两个结果组成有序对。",
      definition: ["逐项定义倍增", `<p>起点函数由两份条款定义：</p><code>d(0)=0<br>d(S(n))=S(S(d(n)))</code><p>每增加一组，起点向后移动两步，因此 d(n)=2n。这就是<b>倍增</b>。每组使用起点 d(n) 以及紧接它的 S(d(n))：</p><code>第 0 组：0、1<br>第 1 组：2、3<br>第 2 组：4、5<br>…</code><p>从 0 开始，每一组紧接上一组的两个位置，因此不重复也不遗漏。d(·) 在本关完成后才作为可用函数解锁。</p>`],
      unlock: "倍增函数 d(·)，满足 d(n)=2n",
      completionLesson: `<h3>每一组有两个紧接的位置</h3><code>d(0)=0<br>d(S(n))=S(S(d(n)))<br>d(n)=2n</code><p>你构造的两份条款逐项确定了起点 0、2、4、6、…，每组再使用紧接起点的那个位置。各组连续接合，因此所有自然数位置恰好各用一次。</p><p>这份已经构造的函数现在可以折叠为 d(·)，用于下一关的编号。</p>`,
      validate: ({ nodes, connections }) => validateCountableConstruction("doubling", nodes, connections)
    },
    {
      id: "set-foundation-countable-two-copies", branch: "set-foundation", requires: ["set-foundation-countable-doubling"], next: "proposition-atom", chapter: "集合论基础 · 可数集合", title: "两份对象共用一张编号表", naturalNumerals: true,
      copy: "使用第一关的集合 X，把它复制成两份。为保留两份对象的区别，用有序对 ⟨u,0⟩、⟨u,1⟩ 标明来自哪一份；全部对象组成已经熟悉的笛卡尔积 X×{0,1}。若 u 原来的编号是 n，请把它的两份分别放进第 n 组预留的两个位置。",
      goal: "构造两份带标记的对象，分别给它们编号，并把这一组的两条对应收成一个集合。", tools: ["naturalDouble", "vnSucc", "ord", "pair"], semanticWorkbench: "countable-two-copies", artifacts: ["two-countable-copies"],
      spawnPositions: [{ x: 215, y: 20 }, { x: 395, y: 20 }, { x: 215, y: 145 }, { x: 395, y: 145 }, { x: 215, y: 265 }, { x: 395, y: 265 }, { x: 395, y: 395 }],
      nodes: [
        fixed("countable-copies-n", "u 原来的编号", vnNat(1), "set", 15, 25, "n", true),
        fixed("countable-copies-u", "原集合的对象", set("a"), "set", 15, 175, "u", true),
        fixed("countable-copies-zero", "第一份的标记", vnNat(0), "set", 15, 305, "0"),
        fixed("countable-copies-one", "第二份的标记", vnNat(1), "set", 15, 415, "1"),
        { ...goal("set", 575, 395), label: "这一组的两条编号对应", glyph: "两份对象，一组位置" }
      ],
      hint: "先构造 ⟨u,0⟩、⟨u,1⟩ 两份对象。用 d(n) 与它的后继作为两个编号，分别与对应的带标记对象组成外层有序对，再配对收集这两条对应。",
      definition: ["两份可数对象仍可共同编号", `<p>原集合 X 的每个对象 u 都有唯一编号 n。给两份对象加上标记，得到 X×{0,1}，然后定义编号：</p><code>d(n)↔⟨u,0⟩<br>S(d(n))↔⟨u,1⟩</code><p>原编号没有重复，标记又区分两份对象；每个对象都能进入对应组。上一关已经构造出连续、不重叠并覆盖全部自然数的两位置分组，所以这份编号表也是双射：</p><code>X×{0,1}≈ℕ</code><p>这里证明的是两份带标记的 X 可以共同编号；任意可数集合的并，以及可数多个集合的并，留到后续处理。</p>`],
      unlock: "X×{0,1} 仍是可数无限集合",
      completionLesson: `<h3>两份对象都进入了同一张编号表</h3><code>d(n)↔⟨u,0⟩<br>S(d(n))↔⟨u,1⟩<br>X×{0,1}≈ℕ</code><p>原对象有唯一组号，标记区分它的两份；每组又恰好使用两个连续位置。于是没有重复，也没有遗漏，两份对象仍与自然数一一对应。</p><p>有序对的第二项很重要：如果直接把 X 与自身取并集，会得到同一个 X，而不会保留两份对象。</p>`,
      validate: ({ nodes, connections }) => validateCountableConstruction("copies", nodes, connections)
    },
    {
      id: "set-foundation-antisymmetric", branch: "set-foundation", requires: ["set-foundation-transitive"], next: "set-foundation-partial-order", chapter: "集合论基础 · 次序", title: "反向都成立时只能是同一个对象",
      copy: "在 {a,b} 上构造两个自环和一条 a→b。关系允许 aRb，但不加入 bRa；比较它与刚刚学过的对称关系。",
      goal: "构造 R={⟨a,a⟩,⟨b,b⟩,⟨a,b⟩}。", tools: ["ord", "set3"], semanticWorkbench: "set-foundation-antisymmetric", artifacts: ["antisymmetric-relation"],
      spawnPositions: [{ x: 230, y: 55 }, { x: 230, y: 205 }, { x: 230, y: 355 }, { x: 410, y: 205 }],
      nodes: [
        fixed("order-antisymmetric-a", "对象", orderObjectA, "set", 20, 115, "a"),
        fixed("order-antisymmetric-b", "对象", orderObjectB, "set", 20, 325, "b"),
        { ...goal("set", 570, 210), label: "只有一个跨对象方向", glyph: "R" }
      ],
      hint: "分别制造 a→a、b→b 与 a→b，再用三元素集收集；不要加入 b→a。",
      definition: ["反对称关系", `<p>若 xRy 与 yRx 同时成立时必有 x=y，就称 R <b>反对称</b>。</p><code>xRy 且 yRx ⇒ x=y</code><p>反对称不禁止自环，也不要求每条边都有反向边。它只禁止两个不同对象同时拥有两个方向的关系。</p>`],
      unlock: "关系性质：反对称性",
      completionLesson: `<span class="eyebrow">反对称性</span><h3>不同对象之间不能同时保留两个方向</h3><code>aRb　但并非 bRa<br>aRa、bRb 仍然允许</code><p>“对称”要求反向边存在；“反对称”则限制不同对象的反向边不能与原边同时存在。</p>`,
      validate: ({ value }) => equal(value, orderAntisymmetricRelation)
        ? pass("自环仍然保留，而 a、b 之间只有一个方向；R 是反对称关系。")
        : fail("目标关系只包含 a→a、b→b、a→b 三个有序对。")
    },
    {
      id: "set-foundation-partial-order", branch: "set-foundation", requires: ["set-foundation-antisymmetric"], next: "set-foundation-minimal-least", chapter: "集合论基础 · 次序", title: "把包含关系画成偏序",
      copy: "包含关系不只是在集合之间判定真假，它还能把一批集合组织成有上下方向、但允许分叉的次序。固定在 D={∅,{a},{b}} 上，构造子集关系留下的五个有序对，看看这种次序为什么叫作“偏序”。",
      goal: "构造 D 上的子集关系 R。", tools: ["ord", "set4", "pair", "union"], semanticWorkbench: "set-foundation-partial-order", artifacts: ["partial-order"],
      spawnPositions: [{ x: 205, y: 20 }, { x: 385, y: 20 }, { x: 205, y: 125 }, { x: 385, y: 125 }, { x: 205, y: 230 }, { x: 385, y: 230 }, { x: 205, y: 335 }, { x: 385, y: 335 }],
      nodes: [
        fixed("order-partial-bottom", "D 的对象", orderBottom, "set", 15, 55, "∅"),
        fixed("order-partial-left", "D 的对象", orderLeft, "set", 15, 210, "{a}"),
        fixed("order-partial-right", "D 的对象", orderRight, "set", 15, 365, "{b}"),
        { ...goal("set", 570, 210), label: "D 上的子集关系", glyph: "R=⊆|D" }
      ],
      hint: "R 包含三个 ⟨x,x⟩，以及 ∅→{a}、∅→{b}；可先收集四条边，再把第五条边作为单元素关系并入。",
      definition: ["偏序关系", `<p>同时满足<b>自反、反对称、传递</b>的关系叫作偏序关系。这三条性质让关系能够稳定地表达“一个对象不高于另一个对象”。</p><div class="set-foundation-summary"><article><code>X⊆X</code><span>自反：每个集合都处在自己的位置</span></article><article><code>X⊆Y 且 Y⊆X ⇒ X=Y</code><span>反对称：两个方向都成立时，由外延性可知它们是同一个集合</span></article><article><code>X⊆Y 且 Y⊆Z ⇒ X⊆Z</code><span>传递：沿次序连续向上不会改变方向</span></article></div><p>它叫作“序”，因为这些性质把对象组织出一致的上下关系；它叫作“偏”序，因为只要求<b>部分</b>对象能够比较，不要求任意两个对象之间都有方向。</p><p>在本关中，<code>∅</code> 位于 <code>{a}</code> 与 <code>{b}</code> 下方，但后两者互不包含，因此形成分叉，而不是一条直线。</p>`],
      unlock: "偏序：自反、反对称且传递",
      completionLesson: `<span class="eyebrow">第一个偏序</span><h3>包含关系把集合组织成允许分叉的层级</h3><code>∅⊆{a}　　∅⊆{b}<br>{a}⊈{b}　　{b}⊈{a}</code><p>图中向上的箭头从较小集合指向包含它的较大集合；三个自环体现自反性，不能在不同对象之间同时来回体现反对称性，连续的包含关系始终可以接起来体现传递性。</p><p><code>{a}</code> 与 <code>{b}</code> 无法比较，所以这不是把所有对象排成一列的全序，而是只规定部分比较的<b>偏序</b>。偏序的意义正在于：它能忠实表示具有分支的层级，而不必强迫本来无关的对象分出先后。</p>`,
      validate: ({ value }) => equal(value, orderVRelation)
        ? pass("五条包含关系已经构成；子集关系在 D 上是偏序。")
        : fail("R 应含三个自环和从 ∅ 出发的两条边。")
    },
    {
      id: "set-foundation-minimal-least", branch: "set-foundation", requires: ["set-foundation-partial-order"], next: "set-foundation-total-order", chapter: "集合论基础 · 次序", title: "极小不等于最小",
      copy: "沿用包含关系作为次序。在选定范围内，极小元没有另一个成员包含于它；最小元则包含于范围内的每个成员。用 a、b、c 构造两个非空集合，收成 M，使它们都是极小元，但 M 没有最小元。再保留它们，加入一个新的非空集合，得到有最小元的 N。M、N 的成员都必须是 {a,b,c} 的子集。",
      goal: "构造恰有两个极小元却没有最小元的 M；再加入一个非空最小元，构造恰有三个成员的 N。", tools: ["pair", "set3"], semanticWorkbench: "set-foundation-minimal-least", multiGoals: ["order-subset-m", "order-subset-n"], artifacts: ["minimal-versus-least"],
      spawnPositions: [{ x: 215, y: 45 }, { x: 215, y: 200 }, { x: 395, y: 120 }, { x: 215, y: 355 }, { x: 395, y: 355 }],
      nodes: [
        fixed("order-minimal-a", "可放入集合的对象", "a", "set", 15, 55, "a"),
        fixed("order-minimal-b", "可放入集合的对象", "b", "set", 15, 210, "b"),
        fixed("order-minimal-c", "可放入集合的对象", "c", "set", 15, 365, "c"),
        { ...goal("set", 575, 120), id: "order-subset-m", label: "两个极小元，没有最小元", glyph: "M" },
        { ...goal("set", 575, 355), id: "order-subset-n", label: "保留原成员，加入最小元", glyph: "N" }
      ],
      hint: "让两个集合各有一个对方没有的成员，使它们互不包含；同时保留共同成员，才能构造一个包含于两者的非空新集合。先配对收成 M，再把两个原集合与新集合接入三元素集，得到 N。",
      definition: ["极小元与最小元", `<p>本关使用子集关系作为次序，且只比较当前范围内的成员。</p><p><b>极小元</b>：没有不同于它、又包含于它的成员。<b>最小元</b>：它包含于范围中的每个成员，包括自身。</p><p>若 M 只有两个互不包含的集合，它们都是极小元，但谁也不在所有成员下面，所以没有最小元。若它们有共同成员，就能构造一个新的非空集合 C，包含于它们两者；把 C 也收进 N，它便是 N 的最小元。</p><p>最小元一定是极小元，极小元却未必是最小元。极小元可以有多个，最小元至多一个。一个共同的较小集合只有成为当前范围的成员，才有资格成为它的最小元。</p>`],
      unlock: "区分：极小元可以有多个，最小元至多一个",
      completionLesson: `<h3>极小不保证位于所有成员下面</h3><p>你构造的 M 中，两个集合互不包含，所以都没有别的成员在它下面；但谁也不包含于另一个，所以 M 没有最小元。</p><p>在 N 中，你保留这两个集合，并加入一个非空集合，它包含于两者。这时新成员同时是唯一极小元与最小元。</p><p>最小元取决于当前比较范围，不必是空集。极小元可以有多个；最小元必须包含于范围内的每个成员，因此至多一个。</p>`,
      validate: ({ values }) => validateOrderExtremaConstruction(values["order-subset-m"], values["order-subset-n"])
    },
    {
      id: "set-foundation-total-order", branch: "set-foundation", requires: ["set-foundation-minimal-least"], next: "set-foundation-strict-order", chapter: "集合论基础 · 次序", title: "把无法比较的一对排出先后",
      copy: "回到 O2“把包含关系画成偏序”中的 V 形关系，{a} 与 {b} 无法比较。现在加入 {a}→{b}，构造新的次序，让三个对象排成 ∅≤{a}≤{b}。新增的次序不再是原来的子集关系。",
      goal: "把 ⟨{a},{b}⟩ 加入偏序 R，构造全序 L。", tools: ["ord", "pair", "union"], semanticWorkbench: "set-foundation-total-order", artifacts: ["total-order"],
      spawnPositions: [{ x: 230, y: 80 }, { x: 390, y: 80 }, { x: 310, y: 285 }],
      nodes: [
        fixed("order-total-base", "O2 构造的偏序", orderVRelation, "set", 15, 80, "R"),
        fixed("order-total-left", "尚不可比较", orderLeft, "set", 15, 275, "{a}"),
        fixed("order-total-right", "尚不可比较", orderRight, "set", 15, 405, "{b}"),
        { ...goal("set", 570, 225), label: "每一对都可比较", glyph: "L" }
      ],
      hint: "制造 {a}→{b}，把它配成单元素关系；再与已有 R 配成集合族并取并集。",
      definition: ["全序关系", `<p>若偏序中的任意两个对象都能比较，即总有 x≤y 或 y≤x，就称它为<b>全序</b>。</p><p>加入 {a}≤{b} 后，原来无法比较的一对获得先后；已有的 ∅≤{b} 又保证传递性不需要补出新边。</p>`],
      unlock: "全序：偏序中的任意两个对象都可比较",
      completionLesson: `<span class="eyebrow">全序</span><h3>V 形偏序已经排成一条链</h3><code>∅ ≤ {a} ≤ {b}</code><p>偏序允许分叉；全序要求所有对象都落在同一条可比较的次序上。</p>`,
      validate: ({ value }) => equal(value, orderLinearRelation)
        ? pass("{a} 与 {b} 已经获得先后；L 是三个对象上的全序。")
        : fail("只需在原偏序上加入 {a}→{b}，其余五条边全部保留。")
    },
    {
      id: "set-foundation-strict-order", branch: "set-foundation", requires: ["set-foundation-total-order"], next: "set-foundation-well-order", chapter: "集合论基础 · 次序", title: "去掉自环，留下严格先后",
      copy: "全序 ≤ 包含每个对象的自环。重新构造只保留真正先后关系的三条边，得到严格次序 <。",
      goal: "构造 <={⟨∅,{a}⟩,⟨∅,{b}⟩,⟨{a},{b}⟩}。", tools: ["ord", "set3"], semanticWorkbench: "set-foundation-strict-order", artifacts: ["strict-order"],
      spawnPositions: [{ x: 230, y: 45 }, { x: 230, y: 190 }, { x: 230, y: 335 }, { x: 410, y: 205 }],
      nodes: [
        fixed("order-strict-bottom", "第一个对象", orderBottom, "set", 15, 55, "∅"),
        fixed("order-strict-left", "第二个对象", orderLeft, "set", 15, 210, "{a}"),
        fixed("order-strict-right", "第三个对象", orderRight, "set", 15, 365, "{b}"),
        { ...goal("set", 570, 210), label: "没有自环的严格次序", glyph: "<" }
      ],
      hint: "只制造 ∅→{a}、∅→{b}、{a}→{b}；严格次序不收集三个 ⟨x,x⟩。",
      definition: ["严格次序与非严格次序", `<p>从 ≤ 中去掉相等情形便得到严格次序：</p><code>x<y ⇔ x≤y 且 x≠y<br>x≤y ⇔ x<y 或 x=y</code><p>因此 ≤ 自反，而 < 不允许 x<x；两种写法保存相同的先后信息。</p>`],
      unlock: "严格次序 < 与非严格次序 ≤",
      completionLesson: `<span class="eyebrow">严格次序</span><h3>自环消失，真正的先后仍然保留</h3><code>∅ < {a} < {b}</code><p>接下来谈良序和自然数成员关系时，将主要使用这种严格写法。</p>`,
      validate: ({ value }) => equal(value, orderStrictRelation)
        ? pass("三个自环已经去掉，三条严格先后边完整保留。")
        : fail("严格关系只包含三个不同对象之间的先后边，不含任何 ⟨x,x⟩。")
    },
    {
      id: "set-foundation-well-order", branch: "set-foundation", requires: ["set-foundation-strict-order"], next: "set-foundation-vn-less", chapter: "集合论基础 · 次序", title: "每个非空子集都有最先者",
      copy: "在 I₂={0,1} 且 0<1 的次序上，非空子集只有 {0}、{1}、{0,1}。把每个非空子集送到其中的最小元。",
      goal: "构造最小元函数 min({0})=0、min({1})=1、min({0,1})=0。", tools: ["ord", "set3"], semanticWorkbench: "set-foundation-well-order", artifacts: ["finite-well-order"],
      spawnPositions: [{ x: 365, y: 35 }, { x: 365, y: 180 }, { x: 365, y: 325 }, { x: 475, y: 205 }],
      nodes: [
        fixed("order-well-subset-zero", "非空子集", orderSubsetZero, "set", 15, 45, "{0}"),
        fixed("order-well-subset-one", "非空子集", orderSubsetOne, "set", 15, 205, "{1}"),
        fixed("order-well-subset-both", "非空子集", orderSubsetBoth, "set", 15, 365, "{0,1}"),
        fixed("order-well-zero", "可选的最小元", vnNat(0), "set", 190, 115, "0"),
        fixed("order-well-one", "可选的最小元", vnNat(1), "set", 190, 315, "1"),
        { ...goal("set", 570, 210), label: "三个非空子集的最小元", glyph: "min" }
      ],
      hint: "制造 {0}→0、{1}→1、{0,1}→0 三条函数边，再用三元素集收集。",
      definition: ["良序关系", `<p>一个全序若让每个非空子集都有最小元，就叫作<b>良序</b>。</p><p>I₂ 只有三个非空子集，本关已经逐个给出它们的最小元，因此完整验证了这个具体有限次序是良序。更大的有限次序以及自然数的良序性以后用归纳证明。</p>`],
      unlock: "良序：每个非空子集都有最小元",
      completionLesson: `<span class="eyebrow">第一个良序</span><h3>I₂ 的每个非空部分都能找到最先者</h3><code>min({0})=0　min({1})=1　min({0,1})=0</code><p>良序把“不断向前寻找更小对象”截住在某个最小元处。</p>`,
      validate: ({ value }) => equal(value, orderMinimumFunction)
        ? pass("I₂ 的三个非空子集都已指向各自最小元；这个次序是良序。")
        : fail("三个输入分别是 {0}、{1}、{0,1}，输出应当依次为 0、1、0。")
    },
    {
      id: "set-foundation-vn-less", branch: "set-foundation", requires: ["set-foundation-well-order", "set-foundation-vn-index"], next: "proposition-atom", chapter: "集合论基础 · 次序", title: "自然数的小于就在成员关系里",
      copy: "冯·诺依曼 1 的成员是 0，2 的成员是 0、1。把这些成员事实逐条写成从较小自然数指向较大自然数的有序边。",
      goal: "构造 <₃={⟨0,1⟩,⟨0,2⟩,⟨1,2⟩}。", tools: ["ord", "set3"], semanticWorkbench: "set-foundation-vn-less", artifacts: ["von-neumann-order"],
      spawnPositions: [{ x: 230, y: 45 }, { x: 230, y: 190 }, { x: 230, y: 335 }, { x: 410, y: 205 }],
      nodes: [
        fixed("order-vn-zero", "冯·诺依曼数", vnNat(0), "set", 15, 55, "0"),
        fixed("order-vn-one", "冯·诺依曼数", vnNat(1), "set", 15, 210, "1"),
        fixed("order-vn-two", "冯·诺依曼数", vnNat(2), "set", 15, 365, "2"),
        { ...goal("set", 570, 210), label: "三个数上的严格小于", glyph: "<₃" }
      ],
      hint: "1={0} 给出 0<1；2={0,1} 给出 0<2 与 1<2。把三条有序边收集起来。",
      definition: ["冯·诺依曼自然数的次序", `<p>冯·诺依曼自然数 n 恰好收集所有比 n 小的自然数，因此严格小于可以直接定义为成员关系：</p><code>m<n ⇔ m∈n</code><p>本关在 {0,1,2} 上把这一定义完整展开。之后的自然数继续保持同样结构。</p>`],
      unlock: "自然数次序：m<n 当且仅当 m∈n",
      completionLesson: `<span class="eyebrow">数与集合结构汇合</span><h3>“位于里面”就是“严格更小”</h3><code>0∈1　0∈2　1∈2<br>⇕<br>0<1　0<2　1<2</code><p>自然数良序原理、最小反例法以及强弱归纳的等价性将在归纳与证明工具汇合后开放。</p>`,
      validate: ({ value }) => equal(value, orderVnLessThree)
        ? pass("三个成员事实已经成为严格小于关系；在冯·诺依曼自然数上，m<n 就是 m∈n。")
        : fail("只需收集 0→1、0→2、1→2 三条边。")
    },
    {
      id: "sequence-empty", branch: "finite-sequence", requires: ["build-function", "vn-run-successor"], next: "sequence-one", chapter: "有限序列", title: "空集的另一种身份",
      copy: "同一个集合可以承担不同角色。重新制造空集，这一次把它看成没有输入、也没有输出边的函数。",
      goal: "用空集构造空函数，也就是空序列 ⟨⟩。", tools: ["empty"], artifacts: ["empty-sequence"],
      nodes: [goal("set")], hint: "空函数的函数图里没有任何有序对，因此它就是空集本身。",
      definition: ["空集也是空序列", `${definitions.sequences}<p>函数由有序对集合表示；没有有序对的函数图就是 ∅。</p><code>⟨⟩ = ∅</code>`], unlock: "已识别对象：空序列 ⟨⟩",
      validate: ({ value }) => equal(value, finiteSequence()) ? pass("∅ 没有任何输入边，因此同时是空函数和空序列 ⟨⟩。") : fail("空序列的函数图必须没有任何有序对。")
    },
    {
      id: "sequence-one", branch: "finite-sequence", requires: ["sequence-empty"], next: "sequence-intersection", chapter: "有限序列", title: "第一项有了位置",
      copy: "集合不会记住 a 是第几项。先制造有序边 ⟨0,a⟩，再把整条边装进单元素集合。",
      goal: "只用有序对与配对构造 {⟨0,a⟩}，也就是序列 ⟨a⟩。", tools: ["ord", "pair"], artifacts: ["one-item-sequence"],
      nodes: [fixed("seq-zero", "第一个下标", vnNat(0), "set", 45, 145, "0"), fixed("seq-a", "第一项", "a", "set", 45, 310, "a"), goal("set", 790, 205)],
      hint: "先构造 ⟨0,a⟩；再把同一条边送入配对器的两个端口，得到只包含这条边的集合。",
      definition: ["一项序列是一个函数图", definitions.sequences], unlock: "已构造序列：⟨a⟩",
      validate: ({ value }) => equal(value, finiteSequence("a")) ? pass("位置 0 唯一地指向 a，函数图正是序列 ⟨a⟩。") : fail("目标应当只包含一条有序边 ⟨0,a⟩。")
    },
    {
      id: "sequence-intersection", branch: "finite-sequence", requires: ["sequence-one"], next: "sequence-project-first", chapter: "有限序列", title: "真正共同的核心",
      copy: "每两个集合都共享一个干扰成员，但只有 x 同时属于全部三个集合。先把 A、B、C 组成集合族，再找出真正的共同核心。",
      goal: "构造 ⋂{A,B,C}={x}。", tools: ["set3", "intersect"], artifacts: ["family-intersection"],
      nodes: [fixed("intersection-a", "集合 A", set("x", "a", "b"), "set", 45, 85, "{x,a,b}"), fixed("intersection-b", "集合 B", set("x", "b", "c"), "set", 45, 225, "{x,b,c}"), fixed("intersection-c", "集合 C", set("x", "a", "c"), "set", 45, 365, "{x,a,c}"), goal("set", 790, 205)],
      hint: "先用三元素集把 A、B、C 整体收集起来，再把这个集合族送入 ⋂；不要把三个集合的内部成员直接混在一起。",
      definition: ["交集族检查每个内部集合", `<p>a 只属于 A、C，b 只属于 A、B，c 只属于 B、C；只有 x 属于全部三个集合。</p><code>⋂{A,B,C}={x}</code>`], unlock: "新操作：交集族；现在可以拆解有序对",
      validate: ({ value }) => equal(value, set("x")) ? pass("a、b、c 都只通过两次检查；只有 x 通过了全部三次检查。", "1 个共同成员") : fail("必须先组成包含 A、B、C 的集合族；只检查其中两个集合还会留下一个干扰成员。")
    },
    {
      id: "sequence-project-first", branch: "finite-sequence", requires: ["sequence-intersection"], next: "sequence-abstract-first", chapter: "有限序列", title: "拆出一条边的起点",
      copy: "Kuratowski 有序对 e={{x},{x,y}} 的两个内部集合共同含有 x。先取交集得到 {x}，再取并集便拆出 x。",
      goal: "从有序边 e=⟨1,a⟩ 构造 ⋃⋂e=1。", tools: ["intersect", "union"], artifacts: ["concrete-first-projection"],
      nodes: [fixed("projection-concrete-edge", "有序边 e", orderedPair(vnNat(1), "a"), "set", 55, 205, "⟨1,a⟩"), goal("set", 790, 205)],
      hint: "先把整条边送入 ⋂，得到只包含起点的单元素集；再用 ⋃ 拆掉最后一层。",
      definition: ["第一项藏在共同部分里", `<p>若 e=⟨x,y⟩={{x},{x,y}}，则 ⋂e={x}，继而 ⋃⋂e=x。</p><code>⋃⋂⟨1,a⟩=1</code>`], unlock: "已从一条具体有序边中取出第一项",
      validate: ({ value }) => equal(value, vnNat(1)) ? pass("⋂e 先留下 {1}，⋃ 再拆掉这一层，得到起点 1。") : fail("网络顺序应当是先取交集族，再对结果取并集族。")
    },
    {
      id: "sequence-abstract-first", branch: "finite-sequence", requires: ["sequence-project-first"], next: "sequence-concrete-domain", chapter: "有限序列", title: "抽象第一投影",
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
      id: "sequence-concrete-domain", branch: "finite-sequence", requires: ["sequence-abstract-first"], next: "sequence-append-three", chapter: "有限序列", title: "这些位置已经被占用",
      copy: "序列 s=⟨a,b⟩ 的函数图有两条边。逐条读取起点并收集起来，就能看见这张具体函数图占用的位置。",
      goal: "从 ⟨0,a⟩、⟨1,b⟩ 构造位置集合 {0,1}=2。", tools: ["first", "set2"], artifacts: ["concrete-domain"],
      nodes: [fixed("domain-edge-zero", "s 中的边", orderedPair(vnNat(0), "a"), "set", 55, 125, "⟨0,a⟩"), fixed("domain-edge-one", "s 中的边", orderedPair(vnNat(1), "b"), "set", 55, 325, "⟨1,b⟩"), goal("set", 790, 205)],
      hint: "对两条边分别使用 π₁，再用二元素集收集两个结果；不要收集终点 a、b。",
      definition: ["这张图的定义域", `${definitions.sequences}<p>逐条收集第一项得到 {0,1}=2；这就是当前函数图的定义域。</p>`], unlock: "已得到具体位置集合：Dom(⟨a,b⟩)=2",
      validate: ({ value }) => equal(value, vnNat(2)) ? pass("两条边的起点是 0、1；它们组成 2，正好也是下一个空位置。", "2 / 2 位置") : fail("需要收集两条有序边的第一项；检查是否漏边或误收了终点。")
    },
    {
      id: "sequence-append-three", branch: "finite-sequence", requires: ["sequence-concrete-domain"], next: "function-value-graph", chapter: "有限序列", title: "在下一个位置追加",
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
        ? pass("公式 ¬P∨Q 构造完成；真值表记录了它在四种赋值下的结果。")
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
      id: "formula-implication", branch: "shared", requires: ["define-implication"], next: "formula-tautology", chapter: "第三章 · 逻辑语言", title: "构造蕴含公式",
      copy: "析取公式关已经得到 ¬P∨Q 的真值表。现在构造 P→Q，再观察两种公式的真值是否一致。",
      goal: "构造公式 P→Q，并补全它的真值表。", tools: ["propP", "propQ", "imp"], artifacts: ["implication-formula"], formulaViews: true, formulaViewOptions: ["construction", "syntax", "evaluation"], valuationProps: ["P", "Q"], formalValuation: true, truthTable: true,
      spawnPositions: [{ x: 195, y: 120 }, { x: 195, y: 320 }, { x: 370, y: 220 }], nodes: [goal("formula", 790, 220)],
      hint: "把 P 接到蕴含的前件端口，把 Q 接到后件端口，再把 P→Q 接入目标。",
      completionLesson: `<span class="eyebrow">语义等价</span><h3>不同的树，相同的真值</h3><p>你刚刚构造的 <b>P→Q</b> 与析取公式关中的 <b>¬P∨Q</b> 不是同一棵语法树。比较它们在四种赋值下的结果：</p><table class="comparison-table"><thead><tr><th>P</th><th>Q</th><th>¬P∨Q</th><th>P→Q</th></tr></thead><tbody><tr><td>假</td><td>假</td><td>真</td><td>真</td></tr><tr><td>假</td><td>真</td><td>真</td><td>真</td></tr><tr><td>真</td><td>假</td><td>假</td><td>假</td></tr><tr><td>真</td><td>真</td><td>真</td><td>真</td></tr></tbody></table><p class="layer-note">四行完全相同，所以它们在经典二值语义下等价；但它们仍然是不同的公式。</p>`,
      definition: ["蕴含公式有方向", `<p>P 是前件，Q 是后件；交换两侧会得到不同公式。求值先读取两侧，再调用刚刚构造的蕴含函数。</p><code>v(P→Q)=v(P)→v(Q)</code>`], unlock: "否定、合取、析取与蕴含的语法和二值语义已经接通",
      validate: ({ value }) => formulaKey(value) === formulaKey(implicationFormula)
        ? pass("P 成为前件，Q 成为后件；蕴含根保留了两侧的方向。")
        : fail(`当前公式是 ${prettyFormula(value)}；目标前件是 P，后件是 Q。`)
    },
    {
      id: "formula-tautology", branch: "shared", requires: ["formula-implication"], next: "formula-contradiction", chapter: "第三章 · 命题语义", title: "构造重言式",
      copy: "把同一片原子公式 P 接到蕴含的前件和后件。构造 P→P，观察它在不同赋值下的输出。",
      goal: "构造重言式 P→P，并补全它的真值表。", tools: ["propP", "imp"], artifacts: ["propositional-tautology"], formulaViews: true, formulaViewOptions: ["construction", "syntax", "evaluation"], valuationProps: ["P"], formalValuation: true, truthTable: true,
      spawnPositions: [{ x: 195, y: 220 }, { x: 370, y: 220 }], nodes: [goal("formula", 790, 220)],
      hint: "只放入一片 P，同时把它的输出分别接到蕴含的前件与后件；再把蕴含结果接入目标。",
      completionLesson: `<span class="eyebrow">重言式</span><h3>所有赋值都得到真</h3><p>同一个命题总能蕴含它自己。无论 P 取假还是真，<b>P→P</b> 的结果都是真。</p><table class="comparison-table"><thead><tr><th>P</th><th>P→P</th></tr></thead><tbody><tr><td>假</td><td>真</td></tr><tr><td>真</td><td>真</td></tr></tbody></table><p class="layer-note">这类在所有赋值下都为真的公式叫作重言式。</p>`,
      definition: ["重言式", `<p>重言式的真值不依赖命题变元的具体赋值。P→P 是最小的例子：蕴含只有在真前件、假后件时才为假，而这里前件与后件始终相同。</p><code>P→P</code>`], unlock: "已构造第一个命题重言式：P→P",
      validate: ({ value }) => formulaKey(value) === formulaKey(propositionalTautology)
        ? pass("同一命题蕴含自身；P 为假或真时，结果都为真。")
        : fail(`当前公式是 ${prettyFormula(value)}；需要让同一片 P 同时成为前件和后件。`)
    },
    {
      id: "formula-contradiction", branch: "shared", requires: ["formula-tautology"], next: "formula-context", chapter: "第三章 · 命题语义", title: "构造矛盾式",
      copy: "把同一片 P 分出两条支路：一条直接进入合取，另一条先经过否定，再接入合取。",
      goal: "构造矛盾式 P∧¬P，并补全它的真值表。", tools: ["propP", "not", "and"], artifacts: ["propositional-contradiction"], formulaViews: true, formulaViewOptions: ["construction", "syntax", "evaluation"], valuationProps: ["P"], formalValuation: true, truthTable: true,
      spawnPositions: [{ x: 150, y: 220 }, { x: 330, y: 120 }, { x: 500, y: 220 }], nodes: [goal("formula", 790, 220)],
      hint: "把 P 的输出分接到两个位置：一条进入合取左侧，另一条先进入否定，再把 ¬P 接到合取右侧。",
      completionLesson: `<span class="eyebrow">矛盾式</span><h3>所有赋值都得到假</h3><p><b>P</b> 与 <b>¬P</b> 不可能同时为真。无论 P 取假还是真，<b>P∧¬P</b> 的结果都是假。</p><table class="comparison-table"><thead><tr><th>P</th><th>¬P</th><th>P∧¬P</th></tr></thead><tbody><tr><td>假</td><td>真</td><td>假</td></tr><tr><td>真</td><td>假</td><td>假</td></tr></tbody></table><p class="layer-note">这类在所有赋值下都为假的公式叫作矛盾式。</p>`,
      definition: ["矛盾式", `<p>矛盾式的真值也不依赖命题变元的具体赋值。P 与 ¬P 恰好相反，因此它们的合取永远无法得到真。</p><code>P∧¬P</code>`], unlock: "已构造第一个命题矛盾式：P∧¬P",
      validate: ({ value }) => formulaKey(value) === formulaKey(propositionalContradiction)
        ? pass("P 与 ¬P 接入同一个合取根；它们不可能同时为真。")
        : fail(`当前公式是 ${prettyFormula(value)}；需要让右侧成为同一片 P 的否定。`)
    },
    {
      id: "formula-context", branch: "shared", requires: ["formula-contradiction"], next: "formula-schemas", chapter: "第四章 · 公式集与后承", title: "公式集",
      copy: "公式不只可以单独出现，也可以像其他对象一样被收进一个集合。用已经熟悉的配对器，把 P 与 P→Q 放进同一个公式集 Γ。",
      goal: "用配对器构造公式集 Γ={P,P→Q}。", tools: ["pair"], artifacts: ["formula-context"],
      nodes: [fixed("context-p", "公式 P", F.prop("P"), "formula", 35, 105, "P"), fixed("context-imp", "公式 P→Q", implicationFormula, "formula", 35, 315, "P→Q"), goal("context", 790, 220)],
      hint: "把 P 与 P→Q 分别接入配对器的两个端口，再把配对结果接入目标。公式集的顺序不重要，重复成员也会合并。",
      definition: ["公式集 Γ", `<p>Γ 是由公式组成的有限集合，不是一个需要求真值的公式。我们用它记录当前可用的前提。</p><code>Γ={P,P→Q}</code><p>以后写 Γ,φ 时，表示把 φ 加入这个集合。</p>`], unlock: "公式集、满足与语义后承已经定义；下一步制作可反复使用的公式模式",
      completionLesson: `<span class="eyebrow">概念页 · 语义后承</span><h3>前提是否保证结论？</h3><p>公式集 Γ 记录一组前提。一个赋值满足 Γ，是指它让 Γ 中的每个公式都为真。</p><p>如果每个满足 Γ 的赋值也都让公式 φ 为真，我们就说 <b>Γ 语义后承 φ</b>，记作 <b>Γ⊨φ</b>。</p><p>任何同时让 P 和 P→Q 为真的赋值都必须让 Q 为真，所以：</p><code>{P,P→Q}⊨Q</code><p>但 Γ 并不保证每个公式。令 P、Q 都为真，Γ 中的两个公式都为真，而已经构造过的 ¬P 为假，因此：</p><code>{P,P→Q}⊭¬P</code><p>这种让前提全部为真、结论却为假的赋值叫作反例。语义后承回答的是：这些前提是否在所有可能情况下都能保证结论。</p>`,
      validate: ({ value }) => equal(value, contextPImpQ)
        ? pass("P 与 P→Q 已收进同一个前提集 Γ；它们仍然是两个不同的公式。", "Γ 中有 2 个公式")
        : fail(`当前得到 ${formatContext(value)}；前提集必须恰好包含 P 与 P→Q。`)
    },
    {
      id: "formula-schemas", branch: "shared", requires: ["formula-context"], next: "proof-rule-anatomy", chapter: "第五章 · 推理规则", title: "把公式做成模式",
      copy: "先定义两个新记号：A、B 是可以装入任意公式的槽位。用它们构造 A→B，得到一个能反复替换内容的公式模式。",
      goal: "用公式元变量 A、B 构造公式模式 A→B。", tools: ["schemaA", "schemaB", "imp"], formulaViews: true, formulaViewOptions: ["construction", "syntax"], artifacts: ["formula-schemas"],
      spawnPositions: [{ x: 190, y: 120 }, { x: 190, y: 330 }, { x: 420, y: 220 }], nodes: [goal("formula", 790, 220)],
      hint: "把 A 接到蕴含前件，把 B 接到后件。这里的 A、B 是公式元变量，不是刚才真值表里的具体命题。",
      definition: ["公式模式", `<p>A、B 代表任意公式，并要求同一个字母在一个模式中始终替换为同一公式。</p><code>A=P，B=Q　⇒　A→B=P→Q<br>A=P∧Q，B=¬P　⇒　A→B=(P∧Q)→¬P</code><p>规则只记录这些槽位之间的形状，因此可以用于许多具体公式。</p>`],
      unlock: "公式元变量 A、B 已定义；下一步先认识推理横线的上下结构",
      completionLesson: `<span class="eyebrow">公式模式</span><h3>固定的是形状，不是内容</h3><p>A→B 不是一条具体公式，而是一个模式。以后每次使用规则，具体公式会一致地填入 A、B；规则本身不必重造。</p>`,
      validate: ({ value }) => equalFormula(value, schemaImplication)
        ? pass("A、B 已成为同一个蕴含模式中的两个公式元变量。", "2 个公式元变量")
        : fail(`当前模式是 ${prettyFormula(value)}；需要让 A 成为前件、B 成为后件。`)
    },
    {
      id: "proof-rule-anatomy", branch: "shared", requires: ["formula-schemas"], next: "proof-imp-elim", chapter: "第五章 · 推理规则", title: "横线把什么分开",
      copy: "先不发明规则，只认识它的结构。横线上方摆放使用这一步之前必须已经得到的公式；横线下方摆放这一步新得到的一条公式。",
      goal: "把 P→Q、P 放在横线上方，把 Q 放在横线下方。", tools: [], ruleLayoutTutorial: true, artifacts: ["rule-anatomy"],
      toolHint: "先点公式卡的输出端，再点横线上方或下方的对应插槽。",
      nodes: [
        fixed("anatomy-imp", "具体公式", implicationFormula, "formula", 35, 65, "P→Q"),
        fixed("anatomy-p", "具体公式", F.prop("P"), "formula", 35, 215, "P"),
        fixed("anatomy-q", "具体公式", F.prop("Q"), "formula", 35, 365, "Q"),
        ruleSlot("anatomy-premise-1", "必须已经得到 · ①", "premise", 350, 65),
        ruleSlot("anatomy-premise-2", "必须已经得到 · ②", "premise", 530, 65),
        ruleSlot("anatomy-conclusion", "这一步新得到", "conclusion", 440, 330)
      ],
      ruleFrames: [{ premises: ["anatomy-premise-1", "anatomy-premise-2"], conclusion: "anatomy-conclusion", label: "一次推理" }],
      hint: "P→Q 与 P 都是这一步需要的依据，所以放在横线上方；Q 是这一步增加的新公式，所以放在下方。",
      definition: ["一条横线，一步推理", `<p>横线上方不是一个需要另外构造的 Γ，也不是一个“公式集输入端”。它只是把这一局部步骤需要的若干条已有公式并排展示。</p><p>横线下方只有一个位置，因为当前采用的是单结论自然演绎：一次规则应用只在推导树上增加一个新结论。</p><code>P→Q　　P<br>────────<br>　　Q</code>`],
      unlock: "推理横线的上方依据与下方结论已经区分；下一关开始真正构造规则",
      completionLesson: `<span class="eyebrow">推理横线</span><h3>上方可以分叉，下方只增加一个结论</h3><p>P→Q 与 P 是使用这一步之前必须已经得到的两条公式；Q 是完成这一步以后才加入推导的公式。整条横线记录的就是一次局部推理。</p>`,
      validate: ({ value }) => sameInferenceRule(value, concreteImpElimRule)
        ? pass("两条已有公式位于横线上方，新得到的 Q 位于横线下方。", "横线结构正确")
        : fail("检查上下位置：P→Q、P 必须在横线上方，Q 必须在横线下方。")
    },
    {
      id: "proof-imp-elim", branch: "shared", requires: ["proof-rule-anatomy"], next: "proof-apply-imp-elim", chapter: "第五章 · 推理规则", title: "推理及其依据",
      copy: "现在把具体公式换回 A、B 模式。请构造横线上方需要的全部公式以及下方的新结论。",
      goal: "构造一个以 B 为新结论、上方不直接包含 B，并且在所有 A、B 真值下都保真的完整规则模式。", tools: ["schemaA", "schemaB", "imp"], ruleForge: true, artifacts: ["imp-elim-rule"],
      spawnPositions: [{ x: 35, y: 100 }, { x: 35, y: 330 }, { x: 205, y: 215 }],
      nodes: [
        ruleSlot("imp-rule-premise-1", "必须已经得到 · ①", "premise", 350, 65),
        ruleSlot("imp-rule-premise-2", "必须已经得到 · ②", "premise", 530, 65),
        ruleSlot("imp-rule-conclusion", "这一步新得到", "conclusion", 440, 330)
      ],
      ruleFrames: [{ premises: ["imp-rule-premise-1", "imp-rule-premise-2"], conclusion: "imp-rule-conclusion", label: "候选规则" }],
      hint: "用 A、B 先构造 A→B；横线上方需要 A→B 与 A，横线下方接 B。同一个公式元变量的输出可以分接。",
      definition: ["怎样检验规则", `<p>横线上方的每个插槽都代表一条使用规则前必须已经得到的公式，下方插槽代表这一步产生的新公式。</p><p>“检验规则”会查看全部四种 A、B 真值。如果出现上方全部为真、下方却为假的一行，这个模式就不能成为保真的推理规则。</p>`],
      unlock: "已构造蕴含消去规则 →E",
      completionLesson: `<span class="eyebrow">规则命名</span><h3>你构造的是蕴含消去</h3><code>A→B　　A<br>──────── →E<br>　　B</code><p>它不是在计算 B 的真值，而是在已经拥有两条上方公式时，许可把 B 加入推导。</p>`,
      validate: ({ value }) => validateForgedRule(value, impElimRule, "→E", "A→B 与 A 已成为 B 的充分推理依据。")
    },
    {
      id: "proof-apply-imp-elim", branch: "shared", requires: ["proof-imp-elim"], next: "proof-and-elim", chapter: "第五章 · 规则应用", title: "让 →E 工作",
      copy: "蕴含消去规则已经定义。现在 Γ 中真的有 P→Q 与 P：把这两条已有公式送入 →E，观察规则怎样增加一条新公式。",
      goal: "使用一次 →E，从 Γ={P→Q,P} 得到 Q。", tools: ["impElim"], proofViews: true, fitchView: true, artifacts: ["imp-elim-application"],
      spawnPositions: [{ x: 390, y: 220 }],
      nodes: [
        fixed("apply-imp-formula", "Γ 中已有", proofObject("given", implicationFormula, [implicationFormula]), "proof", 35, 125, "P→Q"),
        fixed("apply-imp-antecedent", "Γ 中已有", proofObject("given", F.prop("P"), [F.prop("P")]), "proof", 35, 315, "P"),
        goal("proof", 790, 220)
      ],
      hint: "→E 的第一个端口接 P→Q，第二个端口接 P，再把得到的 Q 接入目标。它需要两条已有公式，缺一不可。",
      definition: ["从模式到一次应用", `<p>构造规则时，A、B 是任意公式元变量；应用规则时，同一个模式被具体替换为 A=P、B=Q。</p><code>P→Q　　P<br>──────── →E<br>　　Q</code><p>上方两条公式来自 Γ；只有规则运行后，Q 才成为这份推导中已经得到的公式。</p>`],
      unlock: "→E 已完成第一次具体应用；下一步构造合取消去",
      completionLesson: `<span class="eyebrow">规则应用</span><h3>规则不是公式生成器</h3><p>→E 没有凭空制造 Q。它先检查 P→Q 与 P 是否都已经得到，再许可把 Q 接到它们下方。切换到 Gentzen 视图，可以看到这三个位置组成的一步推理。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "impElim" && equalFormula(value.conclusion, F.prop("Q")) && equal(value.open, contextPImpQ)
        ? pass("P→Q 与 P 共同进入 →E，Q 成为这一步的新结论。", "1 次规则应用")
        : fail("需要让同一个 P 同时充当 P→Q 的前件与 →E 的第二条依据，最终得到 Q。")
    },
    {
      id: "proof-and-elim", branch: "shared", requires: ["proof-apply-imp-elim"], next: "proof-apply-and-elim", chapter: "第五章 · 推理规则", title: "打开合取模式",
      copy: "A∧B 同时保存左右两部分。请完整构造两个规则模式：它们都从 A∧B 出发，但各自只在横线下方增加一个结论。",
      goal: "构造两个完整规则模式，分别从 A∧B 得到 A、得到 B。", tools: ["schemaA", "schemaB", "and"], ruleForge: true, artifacts: ["and-elim-rules"],
      spawnPositions: [{ x: 35, y: 100 }, { x: 35, y: 330 }, { x: 205, y: 215 }],
      nodes: [
        ruleSlot("and-elim-left-premise", "左规则 · 已有公式", "premise", 350, 65),
        ruleSlot("and-elim-left-conclusion", "左规则 · 新结论", "conclusion", 350, 330),
        ruleSlot("and-elim-right-premise", "右规则 · 已有公式", "premise", 530, 65),
        ruleSlot("and-elim-right-conclusion", "右规则 · 新结论", "conclusion", 530, 330)
      ],
      ruleFrames: [
        { premises: ["and-elim-left-premise"], conclusion: "and-elim-left-conclusion", label: "第一张规则" },
        { premises: ["and-elim-right-premise"], conclusion: "and-elim-right-conclusion", label: "第二张规则" }
      ],
      hint: "先构造 A∧B，并把它分接到两张规则的上方；再把 A、B 分别接到两条横线下方。两张规则左右次序不限。",
      definition: ["合取消去的两条投影", `<p>合取中保存了两份信息，所以从 A∧B 出发，左右两侧都能安全取回。它们是两条不同的规则。</p><code>A∧B　　 A∧B<br>──── ∧E₁　──── ∧E₂<br> A　　　　 B</code>`],
      unlock: "已构造合取消去规则 ∧E₁、∧E₂",
      validate: ({ rules }) => validateForgedRuleSet(rules, andElimRules, "两条合取消去规则都已构造。")
    },
    {
      id: "proof-apply-and-elim", branch: "shared", requires: ["proof-and-elim"], next: "proof-and-intro", chapter: "第五章 · 规则应用", title: "打开两层合取",
      copy: "这次 Q 藏在合取的第二层，不能只填一次规则输入就结束。沿公式的结构连续使用刚构造的两条消去规则，把 Q 一层层取出来。",
      goal: "从 Γ={P∧(Q∧P)} 得到藏在第二层左侧的 Q。", tools: ["andElim1", "andElim2"], proofViews: true, fitchView: true, artifacts: ["and-elim-application"],
      spawnPositions: [{ x: 300, y: 155 }, { x: 515, y: 285 }],
      nodes: [fixed("apply-and-nested", "Γ 中已有", proofObject("given", nestedConjunctionFormula, [nestedConjunctionFormula]), "proof", 35, 220, "P∧(Q∧P)"), goal("proof", 790, 220)],
      hint: "先观察最外层：Q∧P 在右侧，因此先用 ∧E₂；得到 Q∧P 后，Q 在左侧，再用 ∧E₁。",
      definition: ["规则可以连续应用", `<p>一次 ∧E 只打开一层合取。前一步得到的公式可以立即成为下一步规则的上方依据。</p><code>P∧(Q∧P)<br>─────── ∧E₂<br> Q∧P<br>──── ∧E₁<br> Q</code>`],
      unlock: "∧E₁、∧E₂ 已串成两步推理；下一步构造合取引入",
      completionLesson: `<span class="eyebrow">两步应用</span><h3>推导开始长成一棵树</h3><p>第一条横线得到 Q∧P；第二条横线把这个新结果继续作为依据，得到 Q。规则仍然只检查局部的一步，但它们可以首尾相接。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "andElim1" && equalFormula(value.conclusion, F.prop("Q")) && equal(value.open, formulaSet(nestedConjunctionFormula)) && proofUsesRule(value, "andElim2")
        ? pass("先取出右侧 Q∧P，再取出它的左侧 Q；两次消去沿着公式结构相接。", "2 次规则应用")
        : fail("Q 位于第二层：先从最外层取右侧 Q∧P，再从这一层取左侧 Q。")
    },
    {
      id: "proof-and-intro", branch: "shared", requires: ["proof-apply-and-elim"], next: "proof-apply-and-intro", chapter: "第五章 · 推理规则", title: "把两份依据合在一起",
      copy: "这次反过来：横线上方有两条独立分支。请构造上方的 A、B 和下方的复合公式，让一次规则应用同时保留两份信息。",
      goal: "完成整个规则模式：横线上方是 A、B，横线下方是同时保留两者的公式。", tools: ["schemaA", "schemaB", "and"], ruleForge: true, artifacts: ["and-intro-rule"],
      spawnPositions: [{ x: 35, y: 100 }, { x: 35, y: 330 }, { x: 205, y: 215 }],
      nodes: [
        ruleSlot("and-intro-premise-1", "必须已经得到 · ①", "premise", 350, 65),
        ruleSlot("and-intro-premise-2", "必须已经得到 · ②", "premise", 530, 65),
        ruleSlot("and-intro-conclusion", "这一步新得到", "conclusion", 440, 330)
      ],
      ruleFrames: [{ premises: ["and-intro-premise-1", "and-intro-premise-2"], conclusion: "and-intro-conclusion", label: "候选规则" }],
      hint: "把 A、B 分别接到横线上方；再用同一对公式元变量构造 A∧B，接到横线下方。",
      definition: ["合取引入", `<p>如果 A、B 都已可用，A∧B 就能在一条公式中同时记录这两份信息。</p><code>A　　B<br>────── ∧I<br> A∧B</code><p>运行构造时，唯一让上方全部为真的赋值也会让 A∧B 为真。</p>`],
      unlock: "已构造合取引入规则 ∧I；三条基本规则可以协同工作",
      validate: ({ value }) => validateForgedRule(value, andIntroRule, "∧I", "A 与 B 已被合并为同时保存两者的 A∧B。")
    },
    {
      id: "proof-apply-and-intro", branch: "shared", requires: ["proof-and-intro"], next: "proof-combine", chapter: "第五章 · 规则应用", title: "重新装回两层",
      copy: "Γ 只给出 P 与 Q。不要只合成最直接的 P∧Q：重复使用 ∧I，并分接已有的 P，重新构造上一关出现的两层公式。",
      goal: "从 Γ={P,Q} 得到 P∧(Q∧P)。", tools: ["andIntro"], proofViews: true, fitchView: true, artifacts: ["and-intro-application"],
      spawnPositions: [{ x: 300, y: 135 }, { x: 535, y: 285 }],
      nodes: [
        fixed("apply-intro-p", "Γ 中已有", proofObject("given", F.prop("P"), [F.prop("P")]), "proof", 35, 125, "P"),
        fixed("apply-intro-q", "Γ 中已有", proofObject("given", F.prop("Q"), [F.prop("Q")]), "proof", 35, 315, "Q"),
        goal("proof", 790, 220)
      ],
      hint: "先用 Q 与 P 得到内层 Q∧P；再把原来的 P 分接到另一个 ∧I 左侧，把 Q∧P 接到右侧。",
      definition: ["同一条规则可以重复使用", `<p>规则模式不是一次性零件。每次应用 ∧I 都增加一个合取根，因此两层合取需要两次应用。</p><code>Q　P　　　 P　Q∧P<br>──── ∧I　──────── ∧I<br> Q∧P　　　P∧(Q∧P)</code>`],
      unlock: "∧I 已重复应用并生成两层公式；三类规则可以进入综合推导",
      completionLesson: `<span class="eyebrow">重复应用</span><h3>有限的局部步骤构成复杂结果</h3><p>第一步保存 Q 与 P，第二步再把原来的 P 和这个结果合在一起。构造网络中的分接，在 Gentzen 视图里表现为同一条已有公式服务于不同分支。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "andIntro" && equalFormula(value.conclusion, nestedConjunctionFormula) && equal(value.open, formulaSet(F.prop("P"), F.prop("Q"))) && countProofRule(value, "andIntro") === 2
        ? pass("两次 ∧I 先构造 Q∧P，再构造 P∧(Q∧P)。", "2 次规则应用")
        : fail("目标有两个合取根，因此需要两个 ∧I：先完成内层 Q∧P，再完成外层 P∧(Q∧P)。")
    },
    {
      id: "proof-combine", branch: "shared", requires: ["proof-apply-and-intro"], next: "proof-scope-inside", chapter: "第五章 · 形式推导", title: "让三种规则协同",
      copy: "现在不再给出单步操作。新的 Γ 只含公式 P∧(P→Q)；使用刚刚构造的规则，把藏在合取中的两部分取出，再组织成目标。",
      goal: "从 Γ={P∧(P→Q)} 推导 P∧Q。", tools: ["andElim1", "andElim2", "impElim", "andIntro"], proofViews: true, fitchView: true, artifacts: ["combined-proof"],
      spawnPositions: [{ x: 250, y: 95 }, { x: 250, y: 340 }, { x: 475, y: 220 }, { x: 665, y: 220 }],
      nodes: [fixed("combined-premise", "来自 Γ 的公式", proofObject("given", combinedPremiseFormula, [combinedPremiseFormula]), "proof", 35, 220, "P∧(P→Q)"), goal("proof", 875, 220)],
      hint: "对同一个 P∧(P→Q) 分别使用 ∧E₁、∧E₂，得到 P 与 P→Q；再用 →E 得到 Q，最后用 ∧I 合成 P∧Q。",
      definition: ["从规则到推导", `<p>一条规则只允许一个局部步骤；推导则把多次规则应用接成有限树。树叶来自 Γ，内部横线来自已经构造的规则，树根是最终结论。</p><code>Γ={P∧(P→Q)}<br>目标：P∧Q</code>`],
      unlock: "已完成第一份多步形式推导；语法后承 Γ⊢P∧Q 已定义",
      completionLesson: `<span class="eyebrow">第一份多步推导</span><h3>局部规则组合成整体保证</h3><p>每个规则节点只检查附近的一步；整棵有限树记录 P∧Q 如何从 Γ 得到。因此写作：</p><code>Γ⊢P∧Q</code><p><b>Γ⊨P∧Q</b> 说的是所有赋值；<b>Γ⊢P∧Q</b> 说的是存在一份只使用已构造规则的形式推导。</p>`,
      validate: ({ value }) => validCombinedProof(value)
        ? pass("四次规则应用接成一棵推导树，从 P∧(P→Q) 得到了 P∧Q。", "4 步推理")
        : fail("目标需要同时用到 ∧E₁、∧E₂、→E 与 ∧I；检查每条分支是否都来自 Γ 中的同一公式。")
    },
    {
      id: "proof-scope-inside", branch: "shared", requires: ["proof-combine"], next: "proof-imp-intro-forge", chapter: "第五章 · 子证明", title: "借来的公式不能带出门",
      copy: "这张 P∧Q 不来自 Γ。把它送进假设后，它只在框内可用；使用已经构造的 ∧E₁，在子证明中取出 P。",
      goal: "假设 P∧Q，并在子证明中得到 P。", tools: ["andElim1"], proofViews: true, fitchView: true, artifacts: ["temporary-scope"], runTarget: "scope-inside-result", scopeTutorial: true, toolScope: MAIN_SCOPE_ID,
      toolHint: "先把画布左侧的 P∧Q 接入橙色假设，再把入口输出送进 ∧E₁，最后接到子证明中结果。",
      spawnPositions: [{ x: 455, y: 205 }],
      nodes: [
        fixed("scope-inside-formula", "准备假设", conjunctionFormula, "formula", 25, 220, "P∧Q"),
        scopeAssumptionNode("scope-inside-entry", MAIN_SCOPE_ID, 245, 105),
        scopeSlot("scope-inside-result", "子证明中得到", "proof", "result", 665, 300)
      ],
      scopeFrames: [{ id: MAIN_SCOPE_ID, label: "子证明 · 这里得到的公式仍依赖 P∧Q", x: 205, y: 45, width: 635, height: 390 }],
      hint: "P∧Q 进入假设后才成为框内可用公式。把入口输出接入 ∧E₁，再把得到的 P 接到框内目标。",
      definition: ["范围记录依赖", `<p>假设 P∧Q，并不等于把它加入永久前提 Γ。框内每个由它得到的结果都会继续依赖这次假设。</p><code>[P∧Q]<br>───── ∧E₁<br>P　（仍依赖假设的 P∧Q）</code><p>这项依赖尚未解除，所以 P 还不能作为框外的普通结论。</p>`],
      unlock: "子证明与其中传播的依赖已经定义；下一步构造解除范围的规则",
      completionLesson: `<span class="eyebrow">临时依赖</span><h3>P 能用，但还不能带走</h3><p>你确实在框内得到了 P；然而它的来源包含假设的 P∧Q。范围不是公式外面的装饰，而是对哪些结果依赖这次假设的记录。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "andElim1" && equalFormula(value.conclusion, F.prop("P")) && value.open.length === 0 && hasScopeDependency(value, MAIN_SCOPE_ID, conjunctionFormula)
        ? pass("P 已在子证明中得到，并且仍明确依赖假设的 P∧Q。", "子证明仍开放")
        : fail("需要让 P 真正来自假设：先送入 P∧Q，再在框内使用 ∧E₁。")
    },
    {
      id: "proof-imp-intro-forge", branch: "shared", requires: ["proof-scope-inside"], next: "proof-imp-intro-retain", chapter: "第五章 · 推理规则", title: "让蕴含记录依赖",
      copy: "边界上的 → 是你已经构造过语法树、定义过真值函数的蕴含。同一个蕴含还可以记录一段推导对临时公式的依赖。",
      goal: "把假设的 P∧Q 接到蕴含前件，把唯一的 P 推导接到蕴含后件，完成对应引入规则。", tools: [], ruleForge: true, dependencyForge: { forge: "scope-package-forge" }, artifacts: ["imp-intro-rule"],
      toolHint: "橙色连线是上一关已经完成的推导。P∧Q 是这次假设的内容，P 是这段推导唯一的结论；把它们接到边界模式的对应端口。",
      nodes: [
        fixed("scope-package-assumption", "假设的公式", conjunctionFormula, "formula", 25, 95, "P∧Q"),
        scopeAssumptionNode("scope-package-entry", MAIN_SCOPE_ID, 225, 85),
        {
          id: "scope-package-result", type: "andElim1", label: "使用 ∧E₁ 得到", glyph: "P",
          inputs: registry.andElim1.inputs, out: registry.andElim1.out, outLabel: "仍带临时依赖的 P", x: 455, y: 90,
          fixed: true, scopeBound: true, scopeId: MAIN_SCOPE_ID
        },
        {
          id: "scope-package-forge", type: "impIntroForge", label: "蕴含引入", glyph: "□ → □",
          inputs: registry.impIntroForge.inputs, out: null, x: 625, y: 325,
          fixed: true, scopeId: MAIN_SCOPE_ID, dependencyForgeNode: true
        }
      ],
      initialConnections: [
        { from: "scope-package-assumption", to: "scope-package-entry", input: 0, locked: true },
        { from: "scope-package-entry", to: "scope-package-result", input: 0, locked: true }
      ],
      scopeFrames: [{ id: MAIN_SCOPE_ID, label: "上一关留下的推导 · 唯一的 P 仍依赖假设的 P∧Q", x: 195, y: 40, width: 575, height: 285, discharge: true, discovery: true, boundaryLabel: "→", boundaryCopy: "填入前件与后件" }],
      hint: "这是普通的蕴含 A→B：假设的 A 写进前件，子证明中推导的结论 B 写进后件。本例中 A=P∧Q，B=P。",
      definition: ["同一个蕴含，新的观察角度", `<p><b>→</b> 仍然是你熟悉的二元公式构造符号：左边是前件，右边是后件。这里没有引入第二种蕴含。</p><p>此前你从语义一侧认识它的真值函数；现在从证明一侧追问：什么时候有资格得到 A→B？答案将来自一整段推导——假设 A，并在其中推出 B。</p><p>模式读取的是同一份推导的结论 B，不会另外制造一条无依赖的 B。</p>`],
      unlock: "已构造蕴含引入规则 →I；子证明出口现已可操作",
      completionLesson: `<span class="eyebrow">熟悉的符号，新的规则</span><h3>→ 是蕴含；→I 是得到蕴含的方法</h3><p>模式里出现的 <b>(P∧Q)→P</b> 使用的正是此前定义真值函数时认识的那个蕴含，没有增加任何新连接词。新构造的是它的引入规则：把“假设 A 后推出 B”的依赖结构变成 A→B 的证明方式。</p><div class="set-compare"><div class="set-case"><b>熟悉的公式</b><small>A→B：A 是前件，B 是后件</small></div><div class="compare-arrow">→I</div><div class="set-case"><b>新的证明行为</b><small>假设 A，推出 B，再结束子证明并解除假设</small></div></div><code>Γ,A⊢B<br>────── →I<br>Γ⊢A→B</code><p>这一关用具体推导构造了规则模式；下一关才正式应用它。反过来，已经学过的 →E 会在重新得到 A 时使用 A→B 得到 B。</p>`,
      validate: ({ value }) => value && value.kind === "dependencyRule" && value.proof && value.proof.kind === "proof"
        && value.proof.rule === "andElim1" && hasScopeDependency(value.proof, MAIN_SCOPE_ID, conjunctionFormula)
        && equalFormula(value.assumption, conjunctionFormula) && equalFormula(value.proof.conclusion, F.prop("P"))
        && equalFormula(value.conclusion, packagedScopeConclusion)
        ? pass("蕴含现在写成 (P∧Q)→P：假设内容进入前件，唯一的推导结论进入后件。", "→I 模式已构造")
        : fail("引入规则必须读取同一段推导的两端：假设 P∧Q，子证明中得到 P。")
    },
    {
      id: "proof-imp-intro-retain", branch: "shared", requires: ["proof-imp-intro-forge"], next: "proof-scope-theorem", chapter: "第五章 · 规则应用", title: "只归还借来的 P",
      copy: "Q 来自 Γ，可以一直使用；P 只在框内假设。先用 ∧I 得到 P∧Q，再通过刚构造的出口关闭子证明。",
      goal: "从 Γ={Q} 出发，假设 P，得到 P→(P∧Q)；解除后仍保留对 Q 的依赖。", tools: ["andIntro"], proofViews: true, fitchView: true, artifacts: ["imp-intro-retained-context"], toolScope: MAIN_SCOPE_ID,
      toolHint: "把假设输出的 P 与来自 Γ 的 Q 接入 ∧I；再把 P∧Q 接到引入规则 →I，最后连接框外目标。",
      spawnPositions: [{ x: 455, y: 205 }],
      nodes: [
        fixed("scope-retain-q", "来自 Γ", proofObject("given", F.prop("Q"), [F.prop("Q")]), "proof", 25, 85, "Q"),
        fixed("scope-retain-p", "准备假设", F.prop("P"), "formula", 25, 330, "P"),
        scopeAssumptionNode("scope-retain-entry", MAIN_SCOPE_ID, 245, 300),
        scopeDischargeNode("scope-retain-exit", MAIN_SCOPE_ID, 650, 360),
        goal("proof", 850, 360)
      ],
      scopeFrames: [{ id: MAIN_SCOPE_ID, label: "子证明 · P 只在框内可用，Q 来自 Γ", x: 205, y: 45, width: 615, height: 390, discharge: true }],
      hint: "P 必须先进入假设。用子证明中的 P 和外部持续可用的 Q 构造 P∧Q，再把结果接入 →I。",
      definition: ["只解除假设的公式", `<p>进入范围前，Q 已经来自 Γ；打开子证明以后，框内结果同时依赖 Q 与临时 P。→I 只解除假设的 P，不会抹掉 Q。</p><code>Q　 [P]<br>────── ∧I<br>P∧Q<br>──────── →I<br>P→(P∧Q)</code><p>框外结果仍由 Γ={Q} 支持。</p>`],
      unlock: "→I 已解除假设的 P，同时保留 Γ 中的 Q；下一步解除最后一条依赖",
      completionLesson: `<span class="eyebrow">精确解除</span><h3>消失的是临时 P，不是所有前提</h3><p>P 已被写入蕴含前件，因此不再作为未解除的假设；Q 原本来自 Γ，仍然支持最终结论。切换 Gentzen 与 Fitch 视图，可以看到同一范围在两种布局中的位置。</p>`,
      validate: ({ value }) => validScopeDischarge(value, MAIN_SCOPE_ID, F.prop("P"), retainedScopeConclusion, formulaSet(F.prop("Q"))) && proofUsesRule(value, "andIntro")
        ? pass("假设的 P 已被解除并写入蕴含；Γ 中的 Q 被准确保留下来。", "前提：Q；子证明：0")
        : fail("需要在子证明中用临时 P 与 Γ 中的 Q 得到 P∧Q，再由 →I 产生 P→(P∧Q)。")
    },
    {
      id: "proof-scope-theorem", branch: "shared", requires: ["proof-imp-intro-retain"], next: "proof-not-elim-forge", chapter: "第五章 · 形式推导", title: "第一条无前提定理",
      copy: "这次 Γ 为空。假设 P，把它分接到 ∧I 的两个端口得到 P∧P，再关闭子证明。",
      goal: "构造不依赖 Γ、也没有未解除范围的 P→(P∧P)。", tools: ["andIntro"], proofViews: true, fitchView: true, artifacts: ["first-theorem"], toolScope: MAIN_SCOPE_ID,
      toolHint: "P 进入假设后可以分接两次。先得到 P∧P，再通过 →I 离开范围。",
      spawnPositions: [{ x: 455, y: 205 }],
      nodes: [
        fixed("scope-theorem-p", "准备假设", F.prop("P"), "formula", 25, 300, "P"),
        scopeAssumptionNode("scope-theorem-entry", MAIN_SCOPE_ID, 245, 300),
        scopeDischargeNode("scope-theorem-exit", MAIN_SCOPE_ID, 650, 360),
        goal("proof", 850, 360)
      ],
      scopeFrames: [{ id: MAIN_SCOPE_ID, label: "子证明 · Γ=∅", x: 205, y: 45, width: 615, height: 390, discharge: true }],
      hint: "把子证明中的 P 输出分别接入 ∧I 左右两个端口；P∧P 接入 →I，得到的蕴含再接目标。",
      definition: ["没有未解除的假设的推导", `<p>框内的 P∧P 依赖假设的 P；→I 把这唯一的依赖写进 P→(P∧P)。出口之后既不依赖 Γ，也没有未解除范围。</p><code>[P]　[P]<br>────── ∧I<br>P∧P<br>──────── →I<br>P→(P∧P)</code><p>存在这样一份没有未解除的假设的形式推导时，根公式就是当前系统中的定理。</p>`],
      unlock: "定理已经定义：存在一份不依赖 Γ、也没有开放子证明的形式推导",
      completionLesson: `<span class="eyebrow">第一条定理</span><h3>所有假设都已解除</h3><p>P 只在框内被暂时采用；范围关闭后，最终公式不再把 P 当作外部依据。因此写作：</p><code>⊢ P→(P∧P)</code><p>Gentzen 用括号标记被解除的假设，Fitch 用缩进框标记同一个范围；两者来自同一份推导数据。</p>`,
      validate: ({ value }) => validScopeDischarge(value, MAIN_SCOPE_ID, F.prop("P"), scopeTheoremFormula, []) && proofUsesRule(value, "andIntro") && countProofRule(value, "andIntro") === 1
        ? pass("P 的唯一临时依赖已经解除；P→(P∧P) 成为没有未解除的假设的定理。", "前提：0；子证明：0")
        : fail("需要在子证明内把 P 分接两次得到 P∧P，再解除这项临时依赖；最终结果不能依赖任何外部公式。")
    },
    {
      id: "proof-not-elim-forge", branch: "shared", requires: ["proof-scope-theorem"], next: "proof-not-elim-apply", chapter: "第六章 · 否定与矛盾", title: "给冲突一个共同出口",
      copy: "你已经构造过永远为假的 P∧¬P。现在把其中的形状抽象为任意 A 与 ¬A，并为这种正面冲突规定同一个证明结论。",
      goal: "构造规则模式：横线上方是 A 与 ¬A，横线下方是 ⊥。", tools: ["schemaA", "not", "bottom"], ruleForge: true, artifacts: ["not-elim-rule"],
      openingLesson: ["从矛盾式到矛盾常元", `<p><b>P∧¬P</b> 是你已经构造过的一棵复合公式树：根是 ∧，两侧是 P 与 ¬P。</p><p><b>⊥</b> 是无子公式的常元，读作“矛盾”。它让各种不同冲突都能汇入同一个结论。</p><div class="set-compare"><div class="set-case"><b>P∧¬P</b><small>一棵具体的复合公式树</small></div><div class="compare-arrow">≠</div><div class="set-case"><b>⊥</b><small>没有子公式的矛盾常元</small></div></div><p class="layer-note">⊥ 是公式，不是真值“假”本身；只是在二值语义中，它在每个赋值下都取假。</p>`],
      spawnPositions: [{ x: 35, y: 120 }, { x: 205, y: 220 }, { x: 35, y: 340 }],
      nodes: [
        ruleSlot("not-elim-premise-a", "必须已经得到 · ①", "premise", 350, 65),
        ruleSlot("not-elim-premise-not-a", "必须已经得到 · ②", "premise", 530, 65),
        ruleSlot("not-elim-conclusion", "这一步新得到", "conclusion", 440, 330)
      ],
      ruleFrames: [{ premises: ["not-elim-premise-a", "not-elim-premise-not-a"], conclusion: "not-elim-conclusion", label: "否定消去 ¬E" }],
      hint: "同一片 A 要分接：一条直接放到横线上方，另一条先经过 ¬。把新公式 ⊥ 放到横线下方。",
      definition: ["否定消去", `<p>A 与 ¬A 不能同时成立。当推导中已经得到两者时，用 ⊥ 统一记录冲突已经发生。</p><code>A　　¬A<br>────── ¬E<br>　⊥</code><p>这里消去的是公式最外层的否定符号，因此规则名是“否定消去”。</p>`],
      unlock: "已定义公式常元 ⊥，并构造否定消去规则 ¬E",
      completionLesson: `<span class="eyebrow">规则命名</span><h3>A 与 ¬A 汇入 ⊥</h3><p>这条规则不重新计算真值；它检查推导中是否已经同时拥有互相对应的 A 与 ¬A。若有，就许可把 ⊥ 加入推导。</p><code>A　　¬A<br>────── ¬E<br>　⊥</code>`,
      validate: ({ value }) => validateForgedRule(value, notElimRule, "¬E", "互相对应的 A 与 ¬A 已汇入共同结论 ⊥。")
    },
    {
      id: "proof-not-elim-apply", branch: "shared", requires: ["proof-not-elim-forge"], next: "proof-bottom-implication", chapter: "第六章 · 否定与矛盾", title: "把矛盾式送到 ⊥",
      copy: "Γ 中只有以前构造过的复合公式 P∧¬P。它还不是两条分开的依据：先打开合取，再使用刚构造的 ¬E。",
      goal: "从 Γ={P∧¬P} 推导 ⊥。", tools: ["andElim1", "andElim2", "notElim"], proofViews: true, fitchView: true, artifacts: ["not-elim-application"],
      spawnPositions: [{ x: 270, y: 100 }, { x: 270, y: 330 }, { x: 530, y: 220 }],
      nodes: [fixed("not-elim-contradiction", "Γ 中已有", proofObject("given", propositionalContradiction, [propositionalContradiction]), "proof", 25, 220, "P∧¬P"), goal("proof", 830, 220)],
      hint: "对同一份 P∧¬P 分别使用 ∧E₁、∧E₂，得到 P 与 ¬P；再按顺序接入 ¬E。",
      definition: ["复合矛盾怎样到达 ⊥", `<p>P∧¬P 是一条复合前提。先用合取消去得到冲突双方，¬E 才能识别它们。</p><code>P∧¬P　　P∧¬P<br>─── ∧E₁　─── ∧E₂<br>P　　　　 ¬P<br>────── ¬E<br>　⊥</code>`],
      unlock: "具体矛盾式已经通过 ∧E 与 ¬E 接入共同结论 ⊥",
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "notElim" && value.conclusion.kind === "bottom" && equal(value.open, formulaSet(propositionalContradiction)) && proofUsesRule(value, "andElim1") && proofUsesRule(value, "andElim2")
        ? pass("P∧¬P 被拆成 P 与 ¬P，随后由 ¬E 汇入 ⊥。", "3 次规则应用")
        : fail("先从同一份 P∧¬P 分别取出 P、¬P，再把它们送入 ¬E。")
    },
    {
      id: "proof-bottom-implication", branch: "shared", requires: ["proof-not-elim-apply"], next: "proof-bottom-elim-forge", chapter: "第六章 · 矛盾的语义", title: "矛盾为什么能推出 Q",
      copy: "Q 与刚才的冲突毫无关系。把 ⊥ 放在蕴含前件、Q 放在后件，改变 Q 的真值，看看这个蕴含有没有失败的可能。",
      goal: "使用普通蕴含构造 ⊥→Q，并补全 Q 为假、为真时的两行真值表。", tools: ["bottom", "propQ", "imp"], formulaViews: true, formulaViewOptions: ["construction", "syntax", "evaluation"], valuationProps: ["Q"], formalValuation: true, truthTable: true, artifacts: ["bottom-implication"],
      spawnPositions: [{ x: 175, y: 125 }, { x: 175, y: 330 }, { x: 445, y: 220 }], nodes: [goal("formula", 790, 220)],
      hint: "把 ⊥ 接到蕴含前件，把 Q 接到后件。完成公式后切换到求值过程，分别查看 Q 为假与为真。",
      definition: ["没有反例的蕴含", `<p>蕴含只有在前件为真、后件为假时才失败。⊥ 在每个赋值下都为假，所以无论 Q 怎样变化，⊥→Q 都不可能失败。</p><table class="comparison-table"><thead><tr><th>⊥</th><th>Q</th><th>⊥→Q</th></tr></thead><tbody><tr><td>假</td><td>假</td><td>真</td></tr><tr><td>假</td><td>真</td><td>真</td></tr></tbody></table>`],
      unlock: "已经从蕴含的含义看见：矛盾没有可能成为反例的起点",
      completionLesson: `<span class="eyebrow">矛盾推一切 · 语义一侧</span><h3>Q 与冲突无关，蕴含仍然成立</h3><p>要让 ⊥→Q 失败，必须让前件 ⊥ 为真；但这样的赋值不存在。因此不可能出现“⊥ 成立而 Q 不成立”的反例。</p><code>⊥→Q 是重言式<br>⊥⊨Q</code><p class="layer-note">这解释了为什么“矛盾推出一切”能够保真。下一关把同一种保证做成可用于形式推导的规则。</p>`,
      validate: ({ value }) => equalFormula(value, bottomImpliesQFormula)
        ? pass("⊥ 位于前件，因此无论无关的 Q 取什么真值，这个蕴含都不会失败。")
        : fail(`当前公式是 ${prettyFormula(value)}；需要让 ⊥ 成为前件、Q 成为后件。`)
    },
    {
      id: "proof-bottom-elim-forge", branch: "shared", requires: ["proof-bottom-implication"], next: "proof-bottom-elim-apply", chapter: "第六章 · 否定与矛盾", title: "把语义保证做成规则",
      copy: "上一关用 ⊥→Q 看见：从 ⊥ 出发不会产生反例。现在把具体的 Q 换回任意公式元变量 A，让这项保证成为证明系统中的一步。",
      goal: "构造规则模式：从 ⊥ 得到任意公式 A。", tools: ["bottom", "schemaA"], ruleForge: true, artifacts: ["bottom-elim-rule"],
      spawnPositions: [{ x: 60, y: 120 }, { x: 60, y: 335 }],
      nodes: [ruleSlot("bottom-elim-premise", "必须已经得到", "premise", 440, 65), ruleSlot("bottom-elim-conclusion", "这一步新得到", "conclusion", 440, 330)],
      ruleFrames: [{ premises: ["bottom-elim-premise"], conclusion: "bottom-elim-conclusion", label: "矛盾消去 ⊥E" }],
      hint: "把 ⊥ 放到横线上方，把公式元变量 A 放到横线下方。",
      definition: ["矛盾消去", `<p>⊥→Q 展示了一个具体例子；把 Q 换成任意公式元变量 A，同一个理由仍然成立。证明系统把它记录为：</p><code>⊥<br>── ⊥E<br>A</code><p>A 本身不必永远为真。规则说的是：已经得到 ⊥ 的前提不可能对应任何反例。</p>`],
      unlock: "已构造矛盾消去规则 ⊥E",
      validate: ({ value }) => validateForgedRule(value, bottomElimRule, "⊥E", "从 ⊥ 出发，任意公式元变量 A 都可以成为下一步结论。")
    },
    {
      id: "proof-bottom-elim-apply", branch: "shared", requires: ["proof-bottom-elim-forge"], next: "proof-not-intro-inside", chapter: "第六章 · 否定与矛盾", title: "从冲突抵达 Q",
      copy: "这次目标 Q 与原来的 P 没有内容上的联系。先证明前提自身发生冲突，得到 ⊥；只有随后使用 ⊥E，才能抵达 Q。",
      goal: "从 Γ={P∧¬P} 推导 Q。", tools: ["andElim1", "andElim2", "notElim", "bottomElim", "propQ"], proofViews: true, fitchView: true, artifacts: ["bottom-elim-application"],
      spawnPositions: [{ x: 235, y: 70 }, { x: 235, y: 315 }, { x: 430, y: 185 }, { x: 625, y: 220 }, { x: 435, y: 390 }],
      nodes: [fixed("bottom-elim-contradiction", "Γ 中已有", proofObject("given", propositionalContradiction, [propositionalContradiction]), "proof", 20, 220, "P∧¬P"), goal("proof", 875, 220)],
      hint: "先像上一关一样得到 ⊥。再放入 Q 公式叶子，把 ⊥ 与 Q 分别接到 ⊥E 的两个端口。",
      definition: ["⊥E 的一次具体应用", `<p>目标 Q 不是从 P 的结构中提取出来的；关键是 Γ 已经导致 ⊥。一旦前提组合不可能成立，它就无法为任何目标提供反例。</p><code>P∧¬P ⊢ ⊥<br>─────── ⊥E<br>　 Q</code>`],
      unlock: "¬E 与 ⊥E 已连接成一份完整推导",
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "bottomElim" && equalFormula(value.conclusion, F.prop("Q")) && equal(value.open, formulaSet(propositionalContradiction)) && proofUsesRule(value, "notElim") && proofUsesRule(value, "andElim1") && proofUsesRule(value, "andElim2")
        ? pass("前提先由 ¬E 导致 ⊥，再由 ⊥E 得到目标 Q。", "4 次规则应用")
        : fail("Q 必须由 ⊥E 得到；而 ⊥ 必须先从 P∧¬P 中拆出的 P 与 ¬P 得到。")
    },
    {
      id: "proof-not-intro-inside", branch: "shared", requires: ["proof-bottom-elim-apply"], next: "proof-not-intro-forge", chapter: "第六章 · 临时反证", title: "借来的 P 通向矛盾",
      copy: "Γ 中已有 P→Q 与 ¬Q，但还没有 ¬P。暂时采用 P，先推出 Q，再让 Q 与 ¬Q 汇入 ⊥。",
      goal: "从 Γ={P→Q,¬Q} 出发，假设 P，并在子证明中得到 ⊥。", tools: ["impElim", "notElim"], proofViews: true, fitchView: true, artifacts: ["negation-scope"], runTarget: "not-intro-inside-result", scopeTutorial: true, toolScope: MAIN_SCOPE_ID,
      spawnPositions: [{ x: 400, y: 105 }, { x: 575, y: 245 }],
      nodes: [
        fixed("not-intro-inside-imp", "来自 Γ", proofObject("given", implicationFormula, [implicationFormula]), "proof", 20, 65, "P→Q"),
        fixed("not-intro-inside-not-q", "来自 Γ", proofObject("given", F.not(F.prop("Q")), [F.not(F.prop("Q"))]), "proof", 20, 205, "¬Q"),
        fixed("not-intro-inside-p", "准备假设", F.prop("P"), "formula", 20, 350, "P"),
        scopeAssumptionNode("not-intro-inside-entry", MAIN_SCOPE_ID, 225, 315),
        scopeSlot("not-intro-inside-result", "子证明中得到", "proof", "result", 740, 320)
      ],
      scopeFrames: [{ id: MAIN_SCOPE_ID, label: "子证明 · ⊥ 仍依赖假设的 P", x: 190, y: 40, width: 700, height: 400 }],
      hint: "先让 P 进入假设。用 P→Q 与子证明中的 P 经 →E 得到 Q；再把 Q 与来自 Γ 的 ¬Q 送入 ¬E。",
      definition: ["让临时 P 真正产生冲突", `<p>Γ 中没有 ¬P。假设 P 后，→E 才能得到 Q；这个新 Q 随后与 Γ 中的 ¬Q 产生冲突。</p><code>P→Q　 [P]<br>────── →E<br>　Q　　¬Q<br>────── ¬E<br>　⊥</code><p>因此 ⊥ 确实依赖临时 P。结束子证明并解除假设后，¬P 才会成为一条新的结论。</p>`],
      unlock: "已经构造出一段以临时公式开始、以 ⊥ 结束的推导；下一步构造它的出口",
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "notElim" && value.conclusion.kind === "bottom" && equal(value.open, formulaSet(implicationFormula, F.not(F.prop("Q")))) && hasScopeDependency(value, MAIN_SCOPE_ID, F.prop("P")) && proofUsesRule(value, "impElim")
        ? pass("临时 P 经 P→Q 产生 Q，并与 Γ 中的 ¬Q 汇入 ⊥；Γ 中原本没有 ¬P。", "子证明仍开放")
        : fail("需要让临时 P 与 P→Q 先经 →E 得到 Q，再让 Q 与 Γ 中的 ¬Q 经 ¬E 得到 ⊥。")
    },
    {
      id: "proof-not-intro-forge", branch: "shared", requires: ["proof-not-intro-inside"], next: "proof-not-intro-apply", chapter: "第六章 · 推理规则", title: "把通向矛盾的路收进否定",
      copy: "¬ 是已经构造过语法树、定义过真值函数的否定。现在为它补上证明一侧：若假设 A 会走到 ⊥，就结束子证明并解除假设，得到 ¬A。",
      goal: "把假设的 P 与依赖它得到的 ⊥ 接到否定出口，构造 ¬I。", tools: [], ruleForge: true, dependencyForge: { forge: "not-intro-forge-node" }, dependencyForgeKind: "negation", artifacts: ["not-intro-rule"],
      nodes: [
        fixed("not-intro-forge-imp", "来自 Γ", proofObject("given", implicationFormula, [implicationFormula]), "proof", 15, 50, "P→Q"),
        fixed("not-intro-forge-not-q", "来自 Γ", proofObject("given", F.not(F.prop("Q")), [F.not(F.prop("Q"))]), "proof", 15, 175, "¬Q"),
        fixed("not-intro-forge-p", "假设的公式", F.prop("P"), "formula", 15, 335, "P"),
        scopeAssumptionNode("not-intro-forge-entry", MAIN_SCOPE_ID, 210, 310),
        { id: "not-intro-forge-q", type: "impElim", label: "使用 →E 得到", glyph: "Q", inputs: registry.impElim.inputs, out: registry.impElim.out, outLabel: "仍带临时依赖的 Q", x: 380, y: 75, fixed: true, scopeBound: true, scopeId: MAIN_SCOPE_ID },
        { id: "not-intro-forge-bottom", type: "notElim", label: "使用 ¬E 得到", glyph: "⊥", inputs: registry.notElim.inputs, out: registry.notElim.out, outLabel: "仍带临时依赖的 ⊥", x: 545, y: 185, fixed: true, scopeBound: true, scopeId: MAIN_SCOPE_ID },
        { id: "not-intro-forge-node", type: "notIntroForge", label: "否定引入", glyph: "¬□", inputs: registry.notIntroForge.inputs, out: null, x: 675, y: 325, fixed: true, scopeId: MAIN_SCOPE_ID, dependencyForgeNode: true }
      ],
      initialConnections: [
        { from: "not-intro-forge-p", to: "not-intro-forge-entry", input: 0, locked: true },
        { from: "not-intro-forge-imp", to: "not-intro-forge-q", input: 0, locked: true },
        { from: "not-intro-forge-entry", to: "not-intro-forge-q", input: 1, locked: true },
        { from: "not-intro-forge-q", to: "not-intro-forge-bottom", input: 0, locked: true },
        { from: "not-intro-forge-not-q", to: "not-intro-forge-bottom", input: 1, locked: true }
      ],
      scopeFrames: [{ id: MAIN_SCOPE_ID, label: "上一关留下的推导 · 临时 P 经 Q 通向 ⊥", x: 180, y: 35, width: 660, height: 290, discharge: true, discovery: true, boundaryLabel: "¬", boundaryCopy: "填入被否定公式与矛盾推导" }],
      hint: "把假设的 P 接到“准备否定的公式”，把子证明中那份仍依赖 P 的 ⊥ 推导接到第二个端口。",
      definition: ["否定引入", `<p><b>¬</b> 仍是此前构造过的一元公式连接词，没有第二种否定。新构造的是得到 ¬A 的证明规则：假设 A，并让这项采用导致 ⊥。</p><code> [A]<br>  ⋮<br>  ⊥<br>──── ¬I<br> ¬A</code>`],
      unlock: "已构造否定引入规则 ¬I；通向 ⊥ 的临时依赖现在可以被解除",
      completionLesson: `<span class="eyebrow">熟悉的否定，新的规则</span><h3>¬P 是这次推导的新结论</h3><p>Γ 只含 P→Q 与 ¬Q，并不含 ¬P。临时假设 P 产生 Q，Q 再与 ¬Q 产生 ⊥；结束子证明并解除假设 p 后，¬P 才第一次出现。</p><code>P→Q,¬Q,P⊢⊥<br>────────── ¬I<br>P→Q,¬Q⊢¬P</code>`,
      validate: ({ value }) => value && value.kind === "negationDependencyRule" && equalFormula(value.assumption, F.prop("P")) && value.proof && value.proof.conclusion.kind === "bottom" && hasScopeDependency(value.proof, MAIN_SCOPE_ID, F.prop("P")) && equal(value.proof.open, formulaSet(implicationFormula, F.not(F.prop("Q")))) && proofUsesRule(value.proof, "impElim") && equalFormula(value.conclusion, F.not(F.prop("P")))
        ? pass("临时假设 P 经 Q 通向 ⊥；解除这项依赖后，Γ 首次得到 ¬P。", "¬I 模式已构造")
        : fail("否定出口必须读取同一段推导的两端：假设 P，并由此得到 ⊥。")
    },
    {
      id: "proof-not-intro-apply", branch: "shared", requires: ["proof-not-intro-forge"], next: "proof-or-intro-forge", chapter: "第六章 · 形式推导", title: "否定一条矛盾式",
      copy: "这次 Γ 为空。假设以前构造过的矛盾式 P∧¬P，在子证明中把它送到 ⊥，再用刚构造的 ¬I 结束子证明并解除假设。",
      goal: "构造没有未解除的假设的 ¬(P∧¬P)。", tools: ["andElim1", "andElim2", "notElim"], proofViews: true, fitchView: true, artifacts: ["negated-contradiction"], toolScope: MAIN_SCOPE_ID,
      spawnPositions: [{ x: 390, y: 80 }, { x: 390, y: 300 }, { x: 570, y: 190 }],
      nodes: [
        fixed("not-intro-apply-formula", "准备假设", propositionalContradiction, "formula", 20, 300, "P∧¬P"),
        scopeAssumptionNode("not-intro-apply-entry", MAIN_SCOPE_ID, 220, 285),
        negationDischargeNode("not-intro-apply-exit", MAIN_SCOPE_ID, 720, 355),
        goal("proof", 900, 355)
      ],
      scopeFrames: [{ id: MAIN_SCOPE_ID, label: "子证明 · 假设 P∧¬P 并让它通向 ⊥", x: 190, y: 45, width: 690, height: 390, discharge: true, boundaryLabel: "¬I", boundaryCopy: "只有 ⊥ 可以从这里离开" }],
      hint: "先让 P∧¬P 进入假设；分别用 ∧E₁、∧E₂ 得到 P、¬P，再由 ¬E 得到 ⊥。把 ⊥ 接入边界上的 ¬I。",
      definition: ["一份否定证明", `<p>要证明 ¬A，假设 A，并推出 ⊥；¬I 随后解除这项假设。这里 A 就是整棵 P∧¬P。</p><code>[P∧¬P]<br>　⋮<br>　⊥<br>────── ¬I<br>¬(P∧¬P)</code><p>最终结论不再依赖任何来自 Γ 或仍开放的临时公式。</p>`],
      unlock: "否定的引入与消去已经能够参与完整形式推导",
      completionLesson: `<span class="eyebrow">否定证明完成</span><h3>矛盾式不可能成立</h3><p>你没有再次用真值表检查 P∧¬P，而是从证明规则一侧展示：一旦假设它，就能拆出 P 与 ¬P 并得到 ⊥。解除这项采用后得到：</p><code>⊢ ¬(P∧¬P)</code>`,
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "notIntro" && equalFormula(value.conclusion, F.not(propositionalContradiction)) && equal(value.open, []) && (!value.openScopes || value.openScopes.length === 0) && proofUsesRule(value, "andElim1") && proofUsesRule(value, "andElim2") && proofUsesRule(value, "notElim")
        ? pass("P∧¬P 通向 ⊥，临时依赖随后由 ¬I 解除；¬(P∧¬P) 成为定理。", "前提：0；子证明：0")
        : fail("需要从假设的 P∧¬P 拆出 P 与 ¬P，得到 ⊥，再由 ¬I 关闭这一个范围。")
    },
    {
      id: "proof-or-intro-forge", branch: "shared", requires: ["proof-not-intro-apply"], next: "proof-or-intro-apply", chapter: "第七章 · 析取证明", title: "只要拥有其中一边",
      copy: "A∨B 允许只凭其中一边建立。请构造两张方向不同的规则：已得到 A 时把 B 放到右侧；已得到 B 时把 A 放到左侧。",
      goal: "构造两条析取引入规则：A⊢A∨B 与 B⊢A∨B。", tools: ["schemaA", "schemaB", "or"], ruleForge: true, artifacts: ["or-intro-rules"],
      spawnPositions: [{ x: 35, y: 100 }, { x: 35, y: 330 }, { x: 205, y: 215 }],
      nodes: [
        ruleSlot("or-intro-left-premise", "左规则 · 已有公式", "premise", 350, 65),
        ruleSlot("or-intro-left-conclusion", "左规则 · 新结论", "conclusion", 350, 330),
        ruleSlot("or-intro-right-premise", "右规则 · 已有公式", "premise", 545, 65),
        ruleSlot("or-intro-right-conclusion", "右规则 · 新结论", "conclusion", 545, 330)
      ],
      ruleFrames: [
        { premises: ["or-intro-left-premise"], conclusion: "or-intro-left-conclusion", label: "析取引入 ∨I₁" },
        { premises: ["or-intro-right-premise"], conclusion: "or-intro-right-conclusion", label: "析取引入 ∨I₂" }
      ],
      hint: "构造同一个 A∨B 并分接到两条横线下方；左规则上方放 A，右规则上方放 B。",
      definition: ["析取引入的两个方向", `<p>要得到 A∨B，只需已经得到其中一边；另一边只需明确写出是哪条公式。</p><code>A　　　 B<br>──── ∨I₁　──── ∨I₂<br>A∨B　　 A∨B</code><p>下标记录已有公式最终位于析取的左侧还是右侧。</p>`],
      unlock: "已构造析取引入规则 ∨I₁、∨I₂",
      completionLesson: `<span class="eyebrow">两条引入规则</span><h3>一份依据，两种位置</h3><p>析取不像合取那样要求同时拥有两边。∨I₁ 把已有公式放在左侧，∨I₂ 把已有公式放在右侧；另一侧仍必须是一条明确的公式。</p>`,
      validate: ({ rules }) => validateForgedRuleSet(rules, orIntroRules, "两条析取引入规则都已构造。", "两张规则必须分别从 A、B 出发，并共同得到同一个 A∨B。")
    },
    {
      id: "proof-or-intro-apply", branch: "shared", requires: ["proof-or-intro-forge"], next: "proof-or-cases-concrete", chapter: "第七章 · 规则应用", title: "同一份 P 的两个位置",
      copy: "Γ 只有 P。让它分别成为两个析取的左侧和右侧，再把两条新公式一起保存下来。",
      goal: "从 Γ={P} 推导 (P∨Q)∧(Q∨P)。", tools: ["propQ", "orIntro1", "orIntro2", "andIntro"], proofViews: true, fitchView: true, artifacts: ["or-intro-application"],
      spawnPositions: [{ x: 235, y: 350 }, { x: 340, y: 80 }, { x: 340, y: 285 }, { x: 600, y: 210 }],
      nodes: [fixed("or-intro-apply-p", "Γ 中已有", proofObject("given", F.prop("P"), [F.prop("P")]), "proof", 25, 210, "P"), goal("proof", 855, 210)],
      hint: "同一份 P 可以分接。用 ∨I₁ 得到 P∨Q，用 ∨I₂ 得到 Q∨P，最后用 ∧I 合并两条结果。",
      definition: ["析取引入不会证明另一边", `<p>从 P 得到 P∨Q，并不表示已经证明 Q；它只表示至少有一边成立，而 P 已经足够保证这一点。</p><code>P⊢P∨Q<br>P⊢Q∨P</code>`],
      unlock: "∨I₁、∨I₂ 已在同一份推导中分别工作",
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "andIntro" && equalFormula(value.conclusion, disjunctionSwapPair) && equal(value.open, formulaSet(F.prop("P"))) && proofUsesRule(value, "orIntro1") && proofUsesRule(value, "orIntro2")
        ? pass("P 分别占据两个析取的左、右位置，再由 ∧I 一同保存。", "3 次规则应用")
        : fail("需要用同一份 P 分别经 ∨I₁、∨I₂ 得到 P∨Q、Q∨P，再用 ∧I 合并。")
    },
    {
      id: "proof-or-cases-concrete", branch: "shared", requires: ["proof-or-intro-apply"], next: "proof-or-elim-forge", chapter: "第七章 · 分类讨论", title: "两种情况，同一个终点",
      copy: "P∨Q 没有告诉你究竟是哪一边成立。把它送入左右两个情况入口，并让两条分支分别到达完全相同的 Q∨P。",
      goal: "在临时 P、临时 Q 两种情况中，都得到 Q∨P。", tools: [], caseTutorial: { source: "or-cases-source", left: "or-cases-left-result", right: "or-cases-right-result" }, artifacts: ["or-cases-concrete"],
      nodes: [
        fixed("or-cases-source", "来自 Γ", proofObject("given", F.or(F.prop("P"), F.prop("Q")), [F.or(F.prop("P"), F.prop("Q"))]), "proof", 20, 205, "P∨Q"),
        caseAssumptionNode("or-cases-left-entry", "left", LEFT_CASE_SCOPE_ID, 220, 80),
        fixed("or-cases-left-q", "放在左侧的公式", F.prop("Q"), "formula", 220, 285, "Q"),
        { id: "or-cases-left-intro", type: "orIntro2", label: "使用 ∨I₂", glyph: "Q∨P", inputs: registry.orIntro2.inputs, out: registry.orIntro2.out, outLabel: "左分支得到 Q∨P", x: 345, y: 175, fixed: true, scopeBound: true, scopeId: LEFT_CASE_SCOPE_ID },
        scopeSlot("or-cases-left-result", "左分支结论", "proof", "result", 345, 325),
        caseAssumptionNode("or-cases-right-entry", "right", RIGHT_CASE_SCOPE_ID, 545, 80),
        fixed("or-cases-right-p", "放在右侧的公式", F.prop("P"), "formula", 545, 285, "P"),
        { id: "or-cases-right-intro", type: "orIntro1", label: "使用 ∨I₁", glyph: "Q∨P", inputs: registry.orIntro1.inputs, out: registry.orIntro1.out, outLabel: "右分支得到 Q∨P", x: 670, y: 175, fixed: true, scopeBound: true, scopeId: RIGHT_CASE_SCOPE_ID },
        scopeSlot("or-cases-right-result", "右分支结论", "proof", "result", 670, 325)
      ],
      scopeFrames: [
        { id: LEFT_CASE_SCOPE_ID, label: "左分支 · 暂时采用 P", x: 195, y: 40, width: 315, height: 400 },
        { id: RIGHT_CASE_SCOPE_ID, label: "右分支 · 暂时采用 Q", x: 520, y: 40, width: 315, height: 400 }
      ],
      hint: "P∨Q 要同时接入两个情况入口。左侧把公式 Q 与临时 P 送入 ∨I₂；右侧把临时 Q 与公式 P 送入 ∨I₁。",
      definition: ["分类讨论不是任选一边", `<p>拥有 P∨Q 并不许可直接挑选 P 或 Q。分类讨论分别临时考察两种情况；只有两条分支都能得到的同一公式，才不依赖究竟是哪种情况。</p><code>[P]⊢Q∨P<br>[Q]⊢Q∨P</code>`],
      unlock: "第三个公式元变量 C 已定义：它表示所有情况共同到达的任意公式",
      completionLesson: `<span class="eyebrow">分类讨论的共同结论</span><h3>分支可以不同，结论必须相同</h3><p>左分支临时假设 P，右分支临时假设 Q；它们分别使用了不同的引入规则，却都到达 Q∨P。把析取的两种情况抽象为 A、B，把共同结论抽象为新的公式元变量 C，下一关就能写出分类讨论的一般形式。</p>`,
      validate: ({ value }) => value && value.source && value.source.conclusion.kind === "or" && value.left && value.right && equalFormula(value.left.conclusion, swappedDisjunction) && equalFormula(value.right.conclusion, swappedDisjunction) && hasScopeDependency(value.left, LEFT_CASE_SCOPE_ID, F.prop("P")) && hasScopeDependency(value.right, RIGHT_CASE_SCOPE_ID, F.prop("Q")) && value.left.rule === "orIntro2" && value.right.rule === "orIntro1"
        ? pass("临时假设 P 与临时假设 Q 经过不同分支，都到达同一个 Q∨P。", "共同结论：Q∨P")
        : fail("两条情况都必须来自同一份 P∨Q，并分别使用 ∨I₂、∨I₁ 到达完全相同的 Q∨P。")
    },
    {
      id: "proof-or-elim-forge", branch: "shared", requires: ["proof-or-cases-concrete"], next: "proof-or-elim-apply", chapter: "第七章 · 推理规则", title: "把分类讨论写成规则",
      copy: "现在抛开具体 P、Q。A、B 是析取提供的两类，C 是两条分支共同到达的公式。把它们摆进分类讨论的一般结构。",
      goal: "完成 A∨B、两项临时情况、两处分支结论与子证明外共同结论，构造 ∨E。", tools: ["schemaA", "schemaB", "schemaC", "or"], ruleForge: true, caseRuleSchema: { source: "or-forge-source", leftAssumption: "or-forge-left-assumption", leftResult: "or-forge-left-result", rightAssumption: "or-forge-right-assumption", rightResult: "or-forge-right-result", conclusion: "or-forge-conclusion" }, artifacts: ["or-elim-rule"],
      spawnPositions: [{ x: 30, y: 70 }, { x: 30, y: 210 }, { x: 30, y: 350 }, { x: 190, y: 70 }],
      nodes: [
        ruleSlot("or-forge-source", "分类来源", "premise", 420, 35),
        scopeSlot("or-forge-left-assumption", "左类假设", "formula", "assumption", 215, 145),
        scopeSlot("or-forge-left-result", "左分支结论", "formula", "result", 315, 275),
        scopeSlot("or-forge-right-assumption", "右类假设", "formula", "assumption", 550, 145),
        scopeSlot("or-forge-right-result", "右分支结论", "formula", "result", 650, 275),
        ruleSlot("or-forge-conclusion", "子证明外共同结论", "conclusion", 420, 370)
      ],
      scopeFrames: [
        { id: LEFT_CASE_SCOPE_ID, label: "左类 · 临时假设 A", x: 190, y: 115, width: 300, height: 250, discharge: true, boundaryLabel: "共同 C", boundaryCopy: "左分支的终点" },
        { id: RIGHT_CASE_SCOPE_ID, label: "右类 · 临时假设 B", x: 525, y: 115, width: 300, height: 250, discharge: true, boundaryLabel: "共同 C", boundaryCopy: "右分支的终点" }
      ],
      hint: "先构造 A∨B 接到分类来源。A、B 分别进入左右假设；同一个 C 要分接到左右分支结论和子证明外结论三处。",
      definition: ["分类讨论的一般形式", `<p>A∨B 保证两类覆盖所有情况。左分支只假设 A，右分支只假设 B；分支过程可以不同，但终点必须是同一个 C。</p><code>A∨B　 [A]⋮C　 [B]⋮C<br>──────────────── ∨E<br>　　　　C</code>`],
      unlock: "已构造析取消去规则 ∨E",
      completionLesson: `<span class="eyebrow">析取消去</span><h3>分类可以不同，结论不能摇摆</h3><p>∨E 同时检查分类来源、左分支和右分支。两项假设都在边界处解除，只有共同的 C 离开。</p><code>A∨B　 [A]⋮C　 [B]⋮C<br>──────────────── ∨E<br>　　　　C</code>`,
      validate: ({ value }) => value && equalFormula(value.source, F.or(schemaA, schemaB)) && equalFormula(value.leftAssumption, schemaA) && equalFormula(value.rightAssumption, schemaB) && equalFormula(value.leftResult, schemaC) && equalFormula(value.rightResult, schemaC) && equalFormula(value.conclusion, schemaC)
        ? pass("A∨B 覆盖两类，临时假设 A、B 的分支都到达同一个 C；分类讨论结构完整。", "∨E 模式已构造")
        : fail("检查分类结构：来源是 A∨B，左右入口分别是 A、B，而同一个 C 必须占据两个分支结论和子证明外结论。")
    },
    {
      id: "proof-or-elim-apply", branch: "shared", requires: ["proof-or-elim-forge"], next: "proof-or-swap-theorem", chapter: "第七章 · 规则应用", title: "两条不对称的分支",
      copy: "外层析取的左边已经是目标 P∨Q，右边只有 P。分类讨论时，一条分支可以直接结束，另一条分支需要加工。",
      goal: "从 Γ={(P∨Q)∨P} 推导 P∨Q。", tools: ["orIntro1"], proofViews: true, fitchView: true, artifacts: ["or-elim-application"], toolScope: RIGHT_CASE_SCOPE_ID,
      spawnPositions: [{ x: 555, y: 205 }],
      nodes: [
        fixed("or-elim-apply-source", "来自 Γ", proofObject("given", nestedDisjunctionPremise, [nestedDisjunctionPremise]), "proof", 20, 210, "(P∨Q)∨P"),
        caseAssumptionNode("or-elim-apply-left", "left", LEFT_CASE_SCOPE_ID, 220, 100),
        caseAssumptionNode("or-elim-apply-right", "right", RIGHT_CASE_SCOPE_ID, 455, 100),
        fixed("or-elim-apply-q", "放在右侧的公式", F.prop("Q"), "formula", 455, 300, "Q"),
        orElimNode("or-elim-apply-rule", LEFT_CASE_SCOPE_ID, RIGHT_CASE_SCOPE_ID, 730, 185),
        goal("proof", 910, 185)
      ],
      scopeFrames: [
        { id: LEFT_CASE_SCOPE_ID, label: "左分支 · 已经得到 P∨Q", x: 195, y: 55, width: 220, height: 285 },
        { id: RIGHT_CASE_SCOPE_ID, label: "右分支 · 从 P 出发", x: 430, y: 55, width: 275, height: 360 }
      ],
      hint: "同一份外层析取接入两个情况入口和 ∨E。左入口的 P∨Q 可直接接到 ∨E 左分支；右入口的 P 先经 ∨I₁ 得到 P∨Q，再接右分支。",
      definition: ["分支不必长得一样", `<p>∨E 要求两个分支结论相同，不要求步骤数量相同。左分支本身就是 P∨Q；右分支需要用一次 ∨I₁。</p>`],
      unlock: "∨E 已完成第一次不对称分类讨论",
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "orElim" && equalFormula(value.conclusion, F.or(F.prop("P"), F.prop("Q"))) && equal(value.open, formulaSet(nestedDisjunctionPremise)) && (!value.openScopes || value.openScopes.length === 0) && proofUsesRule(value, "orIntro1")
        ? pass("左分支直接结束，右分支经 ∨I₁ 加工；∨E 解除两项临时假设并得到共同结论。", "2 次规则应用")
        : fail("两条分支必须都得到 P∨Q：左侧直接使用临时假设 P∨Q，右侧从临时假设 P 经 ∨I₁ 得到它。")
    },
    {
      id: "proof-or-swap-theorem", branch: "shared", requires: ["proof-or-elim-apply"], next: "formula-double-negation", chapter: "第七章 · 形式推导", title: "析取交换律定理",
      copy: "Γ 为空。假设 P∨Q，在它内部再分类讨论；两种情况都得到 Q∨P 后，先用 ∨E 合并分支，再由 →I 关闭最外层范围。",
      goal: "构造没有未解除的假设的 (P∨Q)→(Q∨P)。", tools: [], proofViews: true, fitchView: true, artifacts: ["or-swap-theorem"],
      nodes: [
        fixed("or-swap-formula", "准备假设", F.or(F.prop("P"), F.prop("Q")), "formula", 15, 330, "P∨Q"),
        scopeAssumptionNode("or-swap-outer-entry", MAIN_SCOPE_ID, 200, 310),
        caseAssumptionNode("or-swap-left-entry", "left", LEFT_CASE_SCOPE_ID, 370, 80),
        fixed("or-swap-left-q", "放在左侧的公式", F.prop("Q"), "formula", 370, 255, "Q"),
        { id: "or-swap-left-intro", type: "orIntro2", label: "使用 ∨I₂", glyph: "Q∨P", inputs: registry.orIntro2.inputs, out: registry.orIntro2.out, outLabel: "左分支得到 Q∨P", x: 455, y: 165, fixed: true, scopeBound: true, scopeId: LEFT_CASE_SCOPE_ID },
        caseAssumptionNode("or-swap-right-entry", "right", RIGHT_CASE_SCOPE_ID, 590, 80),
        fixed("or-swap-right-p", "放在右侧的公式", F.prop("P"), "formula", 590, 255, "P"),
        { id: "or-swap-right-intro", type: "orIntro1", label: "使用 ∨I₁", glyph: "Q∨P", inputs: registry.orIntro1.inputs, out: registry.orIntro1.out, outLabel: "右分支得到 Q∨P", x: 675, y: 165, fixed: true, scopeBound: true, scopeId: RIGHT_CASE_SCOPE_ID },
        orElimNode("or-swap-elim", LEFT_CASE_SCOPE_ID, RIGHT_CASE_SCOPE_ID, 555, 330),
        scopeDischargeNode("or-swap-exit", MAIN_SCOPE_ID, 755, 365),
        goal("proof", 920, 365)
      ],
      scopeFrames: [
        { id: MAIN_SCOPE_ID, label: "外层子证明 · 采用 P∨Q", x: 175, y: 35, width: 705, height: 405, discharge: true },
        { id: LEFT_CASE_SCOPE_ID, label: "左分支 · 临时假设 P", x: 345, y: 55, width: 215, height: 250 },
        { id: RIGHT_CASE_SCOPE_ID, label: "右分支 · 临时假设 Q", x: 565, y: 55, width: 215, height: 250 }
      ],
      hint: "P∨Q 先进入外层假设，再分接到两个情况入口和 ∨E。左右分别用 ∨I₂、∨I₁ 得到 Q∨P；∨E 的结果最后接入 →I。",
      definition: ["范围可以嵌套", `<p>两项分类假设 P、Q 先由 ∨E 同时解除，得到仍依赖外层 P∨Q 的 Q∨P；随后 →I 再解除外层依赖。</p><code>[P∨Q]<br>　[P]⋮Q∨P　 [Q]⋮Q∨P<br>　──────────── ∨E<br>　　 Q∨P<br>────────────── →I<br>(P∨Q)→(Q∨P)</code>`],
      unlock: "析取引入、析取消去与嵌套子证明已经完成一次综合证明",
      completionLesson: `<span class="eyebrow">析取模块完成</span><h3>分类讨论进入无前提定理</h3><p>∨E 先消去两项内部情况，→I 再解除外层采用；最终没有来自 Γ 或仍开放范围的依赖。</p><code>⊢ (P∨Q)→(Q∨P)</code>`,
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "impIntro" && equalFormula(value.conclusion, disjunctionSwapTheorem) && equal(value.open, []) && (!value.openScopes || value.openScopes.length === 0) && proofUsesRule(value, "orElim") && proofUsesRule(value, "orIntro1") && proofUsesRule(value, "orIntro2")
        ? pass("两种情况先合并为 Q∨P，外层 P∨Q 随后由 →I 解除；交换律成为定理。", "前提：0；子证明：0")
        : fail("需要在外层临时假设 P∨Q 内完成两种情况，各自得到 Q∨P；先用 ∨E 合并，再用 →I 关闭外层范围。")
    },
    {
      id: "formula-double-negation", branch: "shared", requires: ["proof-or-swap-theorem"], next: "proof-raa-inside", chapter: "第八章 · 经典边界", title: "真值表已经走得更远",
      copy: "把 P 连续否定两次，再让 ¬¬P 成为蕴含前件、原来的 P 成为后件。观察经典二值语义怎样评价它。",
      goal: "构造 ¬¬P→P，并补全 P 为假、为真时的真值表。", tools: ["propP", "not", "imp"], formulaViews: true, formulaViewOptions: ["construction", "syntax", "evaluation"], valuationProps: ["P"], formalValuation: true, truthTable: true, artifacts: ["double-negation-tautology"],
      spawnPositions: [{ x: 140, y: 215 }, { x: 315, y: 105 }, { x: 470, y: 105 }, { x: 625, y: 215 }], nodes: [goal("formula", 860, 215)],
      hint: "同一片 P 分成两路：一路连续经过两个否定节点成为 ¬¬P，接入蕴含前件；另一路直接接入后件。",
      definition: ["经典语义中的双重否定", `<p>否定会翻转真值两次，所以 ¬¬P 与 P 在两个经典赋值下取值相同。因此 ¬¬P→P 总为真。</p><table class="comparison-table"><thead><tr><th>P</th><th>¬¬P</th><th>¬¬P→P</th></tr></thead><tbody><tr><td>假</td><td>假</td><td>真</td></tr><tr><td>真</td><td>真</td><td>真</td></tr></tbody></table>`],
      unlock: "经典二值语义已经指出一条现有证明规则尚未直接提供的重言式",
      completionLesson: `<span class="eyebrow">经典边界</span><h3>语义已经允许，证明还缺一步</h3><p>真值表说明 ¬¬P→P 是经典重言式；但此前的构造性规则还不能普遍从 ¬¬P 得到 P。接下来开始寻找这一步。</p>`,
      validate: ({ value }) => equalFormula(value, doubleNegationEliminationFormula)
        ? pass("¬¬P 成为前件，P 成为后件；两种经典赋值下蕴含都为真。")
        : fail(`当前公式是 ${prettyFormula(value)}；需要连续否定同一片 P，并让原来的 P 成为后件。`)
    },
    {
      id: "proof-raa-inside", branch: "shared", requires: ["formula-double-negation"], next: "proof-raa-forge", chapter: "第八章 · 临时反证", title: "反过来假设 ¬P",
      copy: "Γ 中有 ¬¬P。暂时采用它所否定的 ¬P，两条互相冲突的公式会在子证明中汇入 ⊥。",
      goal: "从 Γ={¬¬P} 出发，假设 ¬P，并在子证明中得到 ⊥。", tools: ["notElim"], proofViews: true, fitchView: true, artifacts: ["raa-scope"], runTarget: "raa-inside-result", scopeTutorial: true, toolScope: MAIN_SCOPE_ID,
      spawnPositions: [{ x: 485, y: 205 }],
      nodes: [
        fixed("raa-inside-double-neg", "来自 Γ", proofObject("given", doubleNegationP, [doubleNegationP]), "proof", 20, 95, "¬¬P"),
        fixed("raa-inside-not-p", "准备假设", F.not(F.prop("P")), "formula", 20, 335, "¬P"),
        scopeAssumptionNode("raa-inside-entry", MAIN_SCOPE_ID, 245, 300),
        scopeSlot("raa-inside-result", "子证明中得到", "proof", "result", 720, 300)
      ],
      scopeFrames: [{ id: MAIN_SCOPE_ID, label: "子证明 · ⊥ 仍依赖假设的 ¬P", x: 205, y: 45, width: 680, height: 390 }],
      hint: "让 ¬P 进入假设；把子证明中的 ¬P 接到 ¬E 第一个端口，把 Γ 中的 ¬¬P 接到第二个端口。",
      definition: ["否定目标，再观察后果", `<p>¬¬P 正是否定 ¬P 的公式。假设 ¬P 后，¬E 得到的 ⊥ 明确依赖这次采用。</p><code>¬¬P　 [¬P]<br>──────── ¬E<br>　　⊥</code><p>现在仍没有得到 P；下一关才决定能否解除这项临时假设。</p>`],
      unlock: "已经构造出一段从临时假设 ¬P 通向 ⊥ 的推导",
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "notElim" && value.conclusion.kind === "bottom" && equal(value.open, formulaSet(doubleNegationP)) && hasScopeDependency(value, MAIN_SCOPE_ID, F.not(F.prop("P")))
        ? pass("¬¬P 与临时假设 ¬P 汇入 ⊥；矛盾确实依赖这次临时假设。", "子证明仍开放")
        : fail("⊥ 必须由假设给出的 ¬P 与 Γ 中的 ¬¬P 共同经过 ¬E 得到。")
    },
    {
      id: "proof-raa-forge", branch: "shared", requires: ["proof-raa-inside"], next: "proof-raa-apply", chapter: "第八章 · 推理规则", title: "把反证写成规则",
      copy: "用公式元变量 A 抽象刚才的 P：假设 ¬A，如果这项采用通向 ⊥，就在子证明外得到 A。",
      goal: "完成临时假设 ¬A、子证明中 ⊥ 与子证明外 A，构造经典反证法 RAA。", tools: ["schemaA", "not", "bottom"], ruleForge: true, raaSchema: { assumption: "raa-forge-assumption", result: "raa-forge-result", conclusion: "raa-forge-conclusion" }, artifacts: ["raa-rule"],
      spawnPositions: [{ x: 35, y: 125 }, { x: 200, y: 125 }, { x: 35, y: 345 }],
      nodes: [
        scopeSlot("raa-forge-assumption", "假设", "formula", "assumption", 330, 105),
        scopeSlot("raa-forge-result", "子证明中终点", "formula", "result", 535, 250),
        ruleSlot("raa-forge-conclusion", "子证明外新结论", "conclusion", 760, 345)
      ],
      scopeFrames: [{ id: MAIN_SCOPE_ID, label: "经典反证范围 · 假设 ¬A", x: 300, y: 55, width: 430, height: 350, discharge: true, boundaryLabel: "RAA", boundaryCopy: "解除临时假设 ¬A，得到 A" }],
      hint: "用 A 构造 ¬A，接到假设；把 ⊥ 接到子证明中终点；同一片 A 接到子证明外结论。",
      definition: ["经典反证法", `<p>¬I 假设 A、推出 ⊥，得到 ¬A；RAA 反过来假设 ¬A、推出 ⊥，得到 A。</p><code>[¬A]<br>　⋮<br>　⊥<br>──── RAA<br>　A</code><p>允许这个反向出口，就是当前证明系统从构造性核心进入经典逻辑的分界线。</p>`],
      unlock: "已构造经典反证法 RAA",
      completionLesson: `<span class="eyebrow">经典扩展</span><h3>反证法只增加一个出口</h3><div class="set-compare"><div class="set-case"><b>¬I</b><small>临时假设 A 导致 ⊥，得到 ¬A</small></div><div class="compare-arrow">↔</div><div class="set-case"><b>RAA</b><small>临时假设 ¬A 导致 ⊥，得到 A</small></div></div><p class="layer-note">这不是新的公式连接词，而是一条新的经典证明规则。</p>`,
      validate: ({ value }) => value && equalFormula(value.assumption, F.not(schemaA)) && value.result && value.result.kind === "bottom" && equalFormula(value.conclusion, schemaA)
        ? pass("临时假设 ¬A 通向 ⊥，子证明外得到 A；RAA 的经典结构完整。", "RAA 已构造")
        : fail("反证结构必须是：假设 ¬A，子证明中到达 ⊥，子证明外得到同一个 A。")
    },
    {
      id: "proof-raa-apply", branch: "shared", requires: ["proof-raa-forge"], next: "logic-system-overview", chapter: "第八章 · 经典命题逻辑", title: "让双重否定落回 P",
      copy: "回到第一关发现的缺口。Γ 给出 ¬¬P；假设 ¬P 得到 ⊥，再用刚构造的 RAA 解除临时假设。",
      goal: "从 Γ={¬¬P} 推导 P。", tools: ["notElim"], proofViews: true, fitchView: true, artifacts: ["double-negation-elimination"], toolScope: MAIN_SCOPE_ID,
      spawnPositions: [{ x: 470, y: 205 }],
      nodes: [
        fixed("raa-apply-double-neg", "来自 Γ", proofObject("given", doubleNegationP, [doubleNegationP]), "proof", 20, 95, "¬¬P"),
        fixed("raa-apply-not-p", "准备假设", F.not(F.prop("P")), "formula", 20, 335, "¬P"),
        scopeAssumptionNode("raa-apply-entry", MAIN_SCOPE_ID, 245, 300),
        raaDischargeNode("raa-apply-exit", MAIN_SCOPE_ID, 680, 355),
        goal("proof", 875, 355)
      ],
      scopeFrames: [{ id: MAIN_SCOPE_ID, label: "经典反证范围 · 假设 ¬P", x: 205, y: 45, width: 645, height: 390, discharge: true, boundaryLabel: "RAA", boundaryCopy: "解除临时假设 ¬P，得到 P" }],
      hint: "用假设的 ¬P 与 Γ 中的 ¬¬P 经 ¬E 得到 ⊥；把 ⊥ 接入 RAA，再把得到的 P 接到目标。",
      definition: ["双重否定消去是 RAA 的一次应用", `<p>令 A=P。假设 ¬P 与前提 ¬¬P 冲突，RAA 因而得到 P。</p><code>¬¬P　 [¬P]<br>──────── ¬E<br>　　⊥<br>────── RAA<br>　 P</code>`],
      unlock: "经典命题逻辑总装页",
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "raa" && equalFormula(value.conclusion, F.prop("P")) && equal(value.open, formulaSet(doubleNegationP)) && (!value.openScopes || value.openScopes.length === 0) && proofUsesRule(value, "notElim")
        ? pass("临时假设 ¬P 导致 ⊥，RAA 解除这项依赖并从 ¬¬P 得到 P。", "前提：¬¬P；子证明：0")
        : fail("需要让临时假设 ¬P 与 ¬¬P 经 ¬E 得到 ⊥，再由 RAA 解除临时假设并得到 P。")
    },
    {
      id: "logic-system-overview", branch: "shared", requires: ["proof-raa-apply"], next: "predicate-arity", alternateNext: "modal-formula-formation", alternateLabel: "进入命题模态逻辑支线", chapter: "第八章 · 语言总装", title: "第一门完整逻辑",
      copy: "几十关里分别构造的公式、经典真值与推理规则，现在第一次作为一个整体出现。这一关没有构造任务；看完后可以直接进入下一章。",
      goal: "完整查看经典命题逻辑。", tools: [], nodes: [], overview: true, artifacts: ["classical-propositional-logic"],
      hint: "这一关没有谜题。总览同时展示公式语言、经典二值语义和自然演绎系统。",
      definition: ["经典命题逻辑", `<p>当前系统以 P、Q、⊥ 为公式起点，允许有限次使用 ¬、∧、∨、→ 构造新公式；经典二值语义为公式确定真值，自然演绎规则则组织形式推导。</p>`],
      unlock: "一阶语法主线与命题模态逻辑支线",
      validate: () => pass("经典命题逻辑总装完成。")
    },
    {
      id: "modal-formula-formation", branch: "modal", requires: ["logic-system-overview"], next: "modal-world-valuations", chapter: "命题模态逻辑 · 公式形成", title: "给公式加上两种新外壳",
      copy: "原来的命题变元、⊥ 和连接词继续保留。现在增加两条形成规则：若 A 已经是公式，□A、◇A 也都是公式。□、◇ 通常读作必然、可能。A 代表任意已构造的公式，可以是原子、复合公式，也可以已经含有模态算子。两个新节点都接收公式、输出公式。这一关先构造表达式；它们的真假将在后面的世界模型中定义。",
      goal: "构造 □(P→Q)∧◇P，观察两个新算子各自包住哪棵子树。", tools: ["propP", "propQ", "imp", "and", "modalBox", "modalDiamond"], formulaViews: true, formulaViewOptions: ["construction", "syntax"], artifacts: ["modal-formula-language", "modal-formula-constructors"],
      spawnPositions: [{ x: 200, y: 60 }, { x: 200, y: 330 }, { x: 380, y: 110 }, { x: 560, y: 110 }, { x: 380, y: 330 }, { x: 560, y: 260 }],
      nodes: [{ ...goal("formula", 790, 205), label: "由形成规则得到的公式", glyph: "□(P→Q)∧◇P" }],
      hint: "先把 P、Q 接入蕴含，把整个 P→Q 接入 □；将同一个 P 输出接入 ◇，最后用合取连接两条公式。□、◇ 接收的都是公式，不是真值。",
      definition: ["命题模态公式的形成规则", `<p>原来的命题变元与 ⊥ 是公式；对已经得到的公式，仍可使用 ¬、∧、∨、→。新增两条规则：</p><code>A 是公式 ⇒ □A 是公式<br>A 是公式 ⇒ ◇A 是公式</code><p>A 是任意公式的位置，不是新命题变元。反复有限次使用这些规则，就得到命题模态公式。例如 ◇P 已经是公式，因此还能构造 □◇P。</p><p>本关的 □ 包住完整的 P→Q，◇ 包住 P，最外层 ∧ 连接两条公式。这里介绍公式形成规则；世界语义与推理规则分别在后续介绍。</p>`],
      unlock: "□、◇ 的公式构造节点；下一步解释世界中的真假",
      completionLesson: `<h3>新算子接收公式，仍然产生公式</h3><code>□(P→Q) ∧ ◇P</code><p>左边的 □ 只有一棵子树，是完整的 P→Q；右边的 ◇ 只有一棵子树，是 P。最外层仍是熟悉的合取。</p><p>形成规则也允许继续把 □A 或 ◇A 当作输入，构造嵌套公式。接下来先建立世界与可达关系，再定义这些公式的真假。</p>`,
      validate: ({ value }) => equalFormula(value, F.and(F.box(F.imp(F.prop("P"), F.prop("Q"))), F.diamond(F.prop("P"))))
        ? pass("两种新公式已按形成规则构造，并由熟悉的合取连接；每个模态算子的子公式范围都已经明确。")
        : fail("最外层应是 ∧；左子树是 □(P→Q)，右子树是 ◇P。")
    },
    {
      id: "modal-world-valuations", branch: "modal", requires: ["modal-formula-formation"], next: "modal-accessibility", chapter: "命题模态逻辑 · 世界", title: "同一个命题，不同的世界",
      copy: "世界是一份可能的状态，不必理解成一个真实宇宙。以前给 P 指定一个真假；现在要分别说明 P 在每个世界的真假。本关只讨论 P，请用函数图把三个世界各自送到一个真值。观察台会把这些对应放回各个世界。",
      goal: "构造 P 的世界赋值：w₀ 真、w₁ 假、w₂ 真。", tools: ["ord", "set3"], semanticWorkbench: "modal-worlds", modal: { lesson: "worlds", pGoal: "goal" }, artifacts: ["modal-world-valuation"],
      spawnPositions: [{ x: 215, y: 20 }, { x: 215, y: 150 }, { x: 215, y: 280 }, { x: 395, y: 195 }],
      nodes: [...modalColumnSources(), { ...goal("set", 575, 195), label: "每个世界里的 P", glyph: "世界 → 真值" }],
      hint: "用三个有序对分别记录 w₀→真、w₁→假、w₂→真，再用三元素集收成函数图。每个世界必须恰好有一个真值。",
      definition: ["命题在世界中的真假", `<p>每个世界都有一份命题赋值，同一个 P 在不同世界可以有不同真假。本关只记录 P，把它写成一列从世界到真值的函数；以后加入 Q 时另添一列，每个世界的一行合起来就是该世界的赋值。</p><p>普通连接词仍在同一个世界使用熟悉的真值函数。两个世界的 P 相同，也不意味着它们是同一个世界。</p>`],
      unlock: "世界与逐世界的命题赋值",
      completionLesson: `<h3>真假现在需要说明所在世界</h3><code>P 在 w₀ 真，在 w₁ 假，在 w₂ 真</code><p>你构造的函数图为每个世界给出了一个真值。接下来还要指定世界之间的关系，才能讨论必然与可能。</p>`,
      validate: ({ value }) => validateModalTruthColumn(value) && equal(value, modalInitialP) ? pass("P 已在三个世界获得各自的真值；w₀ 与 w₂ 的 P 相同，仍是两个不同世界。") : fail("每个世界应恰好对应一个真值：w₀ 真、w₁ 假、w₂ 真。")
    },
    {
      id: "modal-accessibility", branch: "modal", requires: ["modal-world-valuations"], next: "modal-define-box", chapter: "命题模态逻辑 · 世界", title: "从这里需要考虑哪些世界",
      copy: "讨论必然或可能时，需要指定哪些世界纳入考虑。从 w 指向 u 的有序对记录这一点，称为可达关系。本关让 w₀ 考虑 w₁、w₂，让 w₁ 只考虑 w₀，w₂ 不考虑任何世界。切换当前世界，观察从它出发的箭头。",
      goal: "构造 R={⟨w₀,w₁⟩,⟨w₀,w₂⟩,⟨w₁,w₀⟩}。", tools: ["ord", "set3"], semanticWorkbench: "modal-worlds", modal: { lesson: "accessibility", p: modalInitialP, relationGoal: "goal" }, artifacts: ["modal-accessibility"],
      spawnPositions: [{ x: 215, y: 35 }, { x: 215, y: 185 }, { x: 215, y: 335 }, { x: 395, y: 205 }],
      nodes: [...modalRelationSources(), { ...goal("set", 575, 205), label: "哪些世界可达", glyph: "R" }],
      hint: "制造指定的三条有序对，再收集起来。不要给 w₂ 添加出边，也不要把两步才能到达的世界自动添进 R。",
      definition: ["可达关系与模态模型", `<p>世界集合 W、可达关系 R⊆W×W，以及每个世界的命题赋值，共同组成模态模型，决定公式在什么世界成立。</p><p>wRu 表示在 w 判断必然与可能时需要考察 u。这里指 R 直接记录的对应，不自动包含沿多步路径到达的世界。</p><p>先采用最基本的 K 型模型：R 可以是任意关系，不默认自反、对称或传递。不同关系要求将在后续产生不同的模态系统。</p>`],
      unlock: "模态模型的可达关系 R",
      completionLesson: `<h3>判断范围由当前世界的出边确定</h3><p>w₀ 考虑两个世界，w₁ 只考虑 w₀，w₂ 没有可达世界。当前世界不一定考虑自身，反向或多步对应也不自动成立。</p>`,
      validate: ({ value }) => equal(value, modalTutorialRelation) ? pass("从每个世界出发，现在都能明确读出需要考虑的世界。") : fail("R 应恰好包含 w₀→w₁、w₀→w₂、w₁→w₀ 三条对应。")
    },
    {
      id: "modal-define-box", branch: "modal", requires: ["modal-accessibility"], next: "modal-define-diamond", chapter: "命题模态逻辑 · 必然与可能", title: "这里是假，仍可以在那里必然为真",
      copy: "□P 读作“必然 P”：在当前世界可达的每个世界中，P 都真，□P 才真。沿用已经构造的 R，请重新构造 P 的世界赋值，让 P 在 w₀ 为假，却让 □P 在 w₀ 为真。当前世界没有到自身的边，自身的真假不直接参与这次必然判断。",
      goal: "构造世界赋值，使 w₀ 的 P 假、□P 真。", tools: ["ord", "set3"], semanticWorkbench: "modal-worlds", modal: { lesson: "box", pGoal: "goal", relation: modalTutorialRelation }, artifacts: ["modal-box"],
      spawnPositions: [{ x: 215, y: 20 }, { x: 215, y: 150 }, { x: 215, y: 280 }, { x: 395, y: 195 }],
      nodes: [...modalColumnSources(), { ...goal("set", 575, 195), label: "让这里假、必然为真", glyph: "P 的世界赋值" }],
      hint: "w₀ 可达 w₁、w₂。让这两个世界的 P 都真，同时让 w₀ 的 P 假。切换到没有出口的 w₂，观察定义的边界情况。",
      definition: ["必然的语义", `<p>□A 是公式，不是只读取 A 当前真值的真假函数。它在 w 成立，当且仅当每个满足 wRu 的世界 u 都让 A 成立。</p><p>当前世界的 A 可以假，而 □A 真，因为当前世界未必可达自身。没有可达世界时，找不到可达反例，所以 □A 真。“每个”只指当前世界直接可达的世界。</p>`],
      unlock: "□ 的逐世界语义",
      completionLesson: `<h3>这里的真假，与可达世界的真假不同</h3><p>你让 w₀ 的 P 假，却让它可达的每个世界都满足 P，因此 □P 在 w₀ 真。没有可达世界时也没有可达反例，□A 依定义真。</p><p>□ 的公式构造已经在支线入口介绍；本关定义的是它在模型中的真假。</p>`,
      validate: ({ value }) => validateModalLessonModel("box", value)
    },
    {
      id: "modal-define-diamond", branch: "modal", requires: ["modal-define-box"], next: "modal-whole-subformula", chapter: "命题模态逻辑 · 必然与可能", title: "有一个世界成立就足够",
      copy: "◇P 读作“可能 P”：至少有一个可达世界让 P 真，◇P 就真。构造新的 P 世界赋值，让 ◇P 在 w₀ 为真、□P 为假。一个可达世界提供成立的世界，另一个阻止必然成立。",
      goal: "构造世界赋值，使 w₀ 的 ◇P 真、□P 假。", tools: ["ord", "set3"], semanticWorkbench: "modal-worlds", modal: { lesson: "diamond", pGoal: "goal", relation: modalTutorialRelation }, artifacts: ["modal-diamond"],
      spawnPositions: [{ x: 215, y: 20 }, { x: 215, y: 150 }, { x: 215, y: 280 }, { x: 395, y: 195 }],
      nodes: [...modalColumnSources(), { ...goal("set", 575, 195), label: "可能成立、并非必然", glyph: "P 的世界赋值" }],
      hint: "让 w₁、w₂ 的 P 一真一假；w₀ 自己的 P 可以任选。切换到 w₂，比较没有出口时的必然与可能。",
      definition: ["可能的语义", `<p>◇A 在 w 成立，当且仅当至少有一个满足 wRu 的世界 u 让 A 成立。其他可达世界不成立，不会否定可能，却会否定必然。</p><p>没有可达世界时，找不到成立的世界，所以 ◇A 假，同时 □A 真。两者分别要求“每一个”和“至少一个”。</p>`],
      unlock: "◇ 的逐世界语义",
      completionLesson: `<h3>一个提供见证，另一个提供反例</h3><p>某个可达世界满足 P，因此 ◇P 真；另一个不满足 P，因此 □P 假。两个算子考察同一个可达范围，却有不同要求。</p><p>◇ 的公式构造已经介绍；本关定义的是它在模型中的真假。</p>`,
      validate: ({ value }) => validateModalLessonModel("diamond", value)
    },
    {
      id: "modal-whole-subformula", branch: "modal", requires: ["modal-define-diamond"], next: "modal-nested-worlds", chapter: "命题模态逻辑 · 公式与求值", title: "去另一个世界，计算整个子公式",
      copy: "使用语法关中已经构造的子公式 □(P→Q)。这里 P 在 w₁ 真、w₂ 假，w₀ 可达这两个世界。请只构造 Q 的世界赋值，让这条固定公式在 w₀ 真，但 □Q 假。求值需要先去各个可达世界，在那里计算完整的 P→Q。",
      goal: "构造 Q 的世界赋值，使 w₀ 的 □(P→Q) 真、□Q 假。", tools: ["ord", "set3"], semanticWorkbench: "modal-worlds", modal: { lesson: "whole", p: modalMixedP, qGoal: "goal", relation: modalTutorialRelation, formula: F.box(F.imp(F.prop("P"), F.prop("Q"))) }, formulaViews: true, formulaViewOptions: ["construction", "syntax", "evaluation"], artifacts: ["modal-composite-formula"],
      spawnPositions: [{ x: 215, y: 20 }, { x: 215, y: 150 }, { x: 215, y: 280 }, { x: 395, y: 195 }],
      nodes: [...modalColumnSources(), { ...goal("set", 575, 195), label: "每个世界里的 Q", glyph: "Q 的世界赋值" }],
      hint: "P 真处必须让 Q 真；P 假处可以让 Q 假而蕴含仍真。公式已经固定，接入 Q 的赋值后可以查看逐世界的求值过程。",
      definition: ["模态算子的辖域", `<p>□(P→Q) 的直接子公式是整个 P→Q。先从当前世界去各个可达世界，再分别在那里计算 P、Q 与蕴含。</p><p>赋值只为命题变元提供真值，复合公式仍由子公式和连接词求值。不能把 P→Q 当作命题变元直接交给赋值。</p>`],
      unlock: "模态算子可以作用于完整复合公式",
      completionLesson: `<h3>先换世界，再计算整个子公式</h3><p>在 P 真处，你让 Q 真；在 P 假处，你让 Q 假。两个可达世界的 P→Q 都真，因此 □(P→Q) 真，而 □Q 假。</p><p>□ 在语法树中只有一棵子树；求值却会把这棵子树放到每个可达世界分别计算。</p>`,
      validate: ({ value }) => validateModalLessonModel("whole", value, F.box(F.imp(F.prop("P"), F.prop("Q"))))
    },
    {
      id: "modal-nested-worlds", branch: "modal", requires: ["modal-whole-subformula"], next: "modal-proof-worlds", chapter: "命题模态逻辑 · 公式与求值", title: "必然之后，还有一次可能",
      copy: "按照形成规则，先由 P 构造 ◇P，再由 ◇P 构造 □◇P，仍得到一条公式。本关固定使用 □◇P，P 在 w₀ 真、w₁ 假、w₂ 真。请只构造可达关系，让它在 w₀ 真，而 □P 假。第一步到达的世界可以不满足 P，但它必须能够从自己出发，再找到满足 P 的世界。",
      goal: "构造可达关系，使 w₀ 的 □◇P 真、□P 假。", tools: ["ord", "pair", "set3"], semanticWorkbench: "modal-worlds", modal: { lesson: "nested", p: modalInitialP, relationGoal: "goal", formula: F.box(F.diamond(F.prop("P"))) }, formulaViews: true, formulaViewOptions: ["construction", "syntax", "evaluation"], artifacts: ["modal-nested-formula"],
      spawnPositions: [{ x: 215, y: 35 }, { x: 215, y: 185 }, { x: 215, y: 335 }, { x: 395, y: 205 }],
      nodes: [...modalRelationSources(), { ...goal("set", 575, 205), label: "两次判断使用的关系", glyph: "R" }],
      hint: "让 w₀ 可达 P 为假的 w₁，阻止 □P；再让 w₁ 可达 P 为真的世界，使它满足 ◇P。固定公式的求值树会展示内层从新的世界出发。",
      definition: ["嵌套模态的世界变化", `<p>□◇P 在 w₀ 成立，要求每个从 w₀ 可达的世界 u 都满足 ◇P。判断这个 ◇P 时，需要改从 u 出发，寻找让 P 成立的世界。</p><p>不能把两步到达的世界直接添为 w₀ 的可达世界，也不能让内层继续使用外层的出发世界。推理规则、对偶关系及不同模态系统留到后续。</p>`],
      unlock: "命题模态逻辑的世界、关系、公式与逐世界求值",
      completionLesson: `<h3>内层模态从新的世界重新出发</h3><p>w₀ 可达某个 P 为假的世界，所以 □P 假；每个可达世界又能找到 P 为真的世界，所以 □◇P 真。两层模态对应两次相对世界的判断。</p>`,
      validate: ({ value }) => validateModalLessonModel("nested", value, F.box(F.diamond(F.prop("P"))))
    },
    {
      id: "modal-proof-worlds", branch: "modal", requires: ["modal-nested-worlds"], next: "modal-forge-box-elim", chapter: "命题模态逻辑 · 带世界的证明", title: "在各自的世界继续推理",
      copy: "命题推理仍然可用，但不能混用不同世界的依据。w:P 表示 P 在世界 w 成立；w: 只是标明证明所在的位置，不是新的连接词。这里的 w、u 是任意世界的名字，不限定为前面模型里的三个世界。分别完成两个世界里的推理。",
      goal: "从各自世界的两条依据，得到 w:Q 与 u:P。", tools: ["impElim"], proofViews: true, fitchView: true, runTarget: "modal-world-q", multiGoals: ["modal-world-q", "modal-world-p"], artifacts: ["modal-labelled-proofs"],
      spawnPositions: [{ x: 310, y: 115 }, { x: 310, y: 345 }],
      nodes: [worldPremiseNode("modal-w-imp", "w", F.imp(F.prop("P"), F.prop("Q")), 35, 45), worldPremiseNode("modal-w-p", "w", F.prop("P"), 35, 170), worldPremiseNode("modal-u-imp", "u", F.imp(F.prop("Q"), F.prop("P")), 35, 300), worldPremiseNode("modal-u-q", "u", F.prop("Q"), 35, 425), { ...goal("proof", 585, 115), id: "modal-world-q", glyph: "w:Q", label: "世界 w 的结论" }, { ...goal("proof", 585, 345), id: "modal-world-p", glyph: "u:P", label: "世界 u 的结论" }],
      hint: "每个 →E 的两条依据必须带着相同世界标记；上面的两条一起，下面的两条一起。",
      definition: ["世界标记与命题推理", "<p>w:A 表示公式 A 在世界 w 成立。→E 的两条依据 w:A→B、w:A 得到 w:B。∧I、∧E、→I 也在同一世界内使用，不会自动把公式搬到另一个世界。</p>"],
      unlock: "带世界位置的命题推理",
      validate: ({ values }) => modalProofMatches(values["modal-world-q"], "w", F.prop("Q")) && modalProofMatches(values["modal-world-p"], "u", F.prop("P")) ? pass("命题规则在每个世界分别成立；来自另一个世界的同名公式不能替代这里的依据。") : fail("两个目标都需要在各自世界中得到的结论。")
    },
    {
      id: "modal-forge-box-elim", branch: "modal", requires: ["modal-proof-worlds"], next: "modal-apply-box-elim", chapter: "命题模态逻辑 · 必然消去", title: "必然可以带出哪一层",
      copy: "w:□A 说的是每个从 w 可达的世界都满足 A。因此，有可达条件 wRu 时，就能在 u 得到 A。用同一个可达条件摆出两条规则：一条从 □A 得到 A，一条从 □□A 得到 □A。横线上下的世界位置已经标好；只构造各位置上的公式。wRu 是世界之间的条件，不是语言中的公式。",
      goal: "构造两条只取掉一层 □ 的规则模式。", tools: ["schemaA", "modalBox"], ruleForge: true, artifacts: ["modal-box-elimination"],
      spawnPositions: [{ x: 35, y: 55 }, { x: 245, y: 55 }, { x: 245, y: 245 }],
      nodes: [fixed("modal-rule-access", "共同的可达条件", { from: "w", to: "u" }, "accessibilityPattern", 35, 350, "wRu"), { ...ruleSlot("modal-box-premise", "w:□A，wRu", "premise", 475, 50), inputs: [input("formula", "世界 w 的必然公式"), input("accessibilityPattern", "可达条件 wRu")], slotBody: "接入公式与可达条件" }, { ...ruleSlot("modal-box-result", "u:A", "conclusion", 475, 240) }, { ...ruleSlot("modal-box2-premise", "w:□□A，wRu", "premise", 735, 50), inputs: [input("formula", "世界 w 的两层必然公式"), input("accessibilityPattern", "可达条件 wRu")], slotBody: "接入公式与可达条件" }, { ...ruleSlot("modal-box2-result", "u:□A", "conclusion", 735, 240) }],
      ruleFrames: [{ premises: ["modal-box-premise"], conclusion: "modal-box-result", relation: "modal-rule-access", modalRule: true, from: "w", to: "u", label: "wRu · 一层必然" }, { premises: ["modal-box2-premise"], conclusion: "modal-box2-result", relation: "modal-rule-access", modalRule: true, from: "w", to: "u", label: "wRu · 两层必然" }],
      hint: "A 输出可以重复使用。先构造 □A，再由它构造 □□A；第二条规则的结论仍是 □A。",
      definition: ["必然消去 □E", "<p>w:□A　　wRu</p><hr><p>u:A　□E</p><p>可达条件可以反复使用，但一次 □E 只取掉一层 □。构造关系中的有序对，不等于取得证明里已经可用的可达条件。</p>"],
      unlock: "必然消去 □E",
      completionLesson: "<h3>必然消去 □E</h3><p>w:□A 与 wRu 给出 u:A。两层 □ 仍需要两步可达推理，不能一次全部去掉。</p>",
      validate: ({ rules }) => rules.length === 2 && equalFormula(rules[0].premises[0], F.box(F.schema("A"))) && equalFormula(rules[0].conclusion, F.schema("A")) && equalFormula(rules[1].premises[0], F.box(F.box(F.schema("A")))) && equalFormula(rules[1].conclusion, F.box(F.schema("A"))) ? pass("每个可达世界满足 □ 的整个子公式；因此 □E 只去掉最外面一层，并把结论放在到达的世界。") : fail("第一条应为 w:□A 到 u:A；第二条应为 w:□□A 到 u:□A。")
    },
    {
      id: "modal-apply-box-elim", branch: "modal", requires: ["modal-forge-box-elim"], next: "modal-counterexample-local", chapter: "命题模态逻辑 · 必然消去", title: "沿两条关系，完成一次推理",
      copy: "从 w 到 u，再从 u 到 v。w 的两条依据各带两层 □，需要分别沿这两条可达条件取出内部公式，最后在 v 使用熟悉的蕴含消去。这里没有给出 wRv；两步可达不意味着直接可达。",
      goal: "从 w:□□(P→Q)、w:□□P、wRu、uRv 得到 v:Q。", tools: ["modalBoxElim", "impElim"], proofViews: true, fitchView: true, artifacts: ["modal-two-step-proof"],
      spawnPositions: [{ x: 275, y: 70 }, { x: 275, y: 255 }, { x: 480, y: 70 }, { x: 480, y: 255 }, { x: 695, y: 165 }],
      nodes: [worldPremiseNode("modal-double-imp", "w", F.box(F.box(F.imp(F.prop("P"), F.prop("Q")))), 20, 70), worldPremiseNode("modal-double-p", "w", F.box(F.box(F.prop("P"))), 20, 255), worldRelationNode("modal-w-u", "w", "u", 20, 425), worldRelationNode("modal-u-v", "u", "v", 275, 425), { ...goal("proof", 915, 165), glyph: "v:Q" }],
      hint: "两条 □□ 依据各用一次 wRu 得到 u 的 □；再各用一次 uRv，才能在 v 接入 →E。",
      definition: ["逐层取出必然", "<p>w:□□A 与 wRu 得到 u:□A；u:□A 与 uRv 得到 v:A。这里仍未得到 wRv，不能跳过 u。</p>"],
      unlock: "沿实际可达条件逐层使用 □E",
      validate: ({ value }) => modalProofMatches(value, "v", F.prop("Q")) ? pass("两层必然沿两条可达条件逐层展开；到达 v 后，P→Q 与 P 在同一个世界给出 Q。") : fail("需要真正推导出世界 v 的 Q。")
    },
    {
      id: "modal-counterexample-local", branch: "modal", requires: ["modal-apply-box-elim"], next: "modal-forge-box-intro", chapter: "命题模态逻辑 · 必然引入的条件", title: "这里有 P，还缺少什么",
      copy: "仅仅在这里得到 P，可以推出这里的 □P 吗？为已经写好的 P→□P 构造反模型：给三个世界安排 P 的真假，再构造可达关系，使它在 w₀ 为假。这样就能看见必然引入比这里的命题推理多要求什么。",
      goal: "构造赋值与可达关系，让 w₀ 的 P 真而 □P 假。", tools: ["ord", "pair", "set3"], semanticWorkbench: "modal-worlds", modal: { lesson: "local-counterexample", pGoal: "modal-local-p", relationGoal: "modal-local-r", formula: F.imp(F.prop("P"), F.box(F.prop("P"))) }, formulaViews: true, formulaViewOptions: ["construction", "syntax", "evaluation"], multiGoals: ["modal-local-p", "modal-local-r"], artifacts: ["modal-local-countermodel"],
      spawnPositions: [{ x: 210, y: 30 }, { x: 210, y: 165 }, { x: 210, y: 300 }, { x: 410, y: 165 }, { x: 410, y: 350 }, { x: 610, y: 350 }],
      nodes: [...modalColumnSources(), { ...goal("set", 640, 80), id: "modal-local-p", label: "P 的世界赋值", glyph: "V(P)" }, { ...goal("set", 815, 350), id: "modal-local-r", label: "可达关系", glyph: "R" }],
      hint: "让 w₀ 的 P 真，再让它可达一个 P 为假的世界。P 列由三个世界到真假的有序对组成；关系可只包含一对，用配对把它包成单元素集。",
      definition: ["局部成立不等于必然成立", "<p>P→□P 不是一般有效的模态公式：一个世界的 P 真，并不保证它可达的世界也让 P 真。□I 必须取得对任意可达世界都成立的证明。</p>"],
      unlock: "必然引入必须考察任意可达世界",
      validate: ({ values }) => {
        if (!validateModalTruthColumn(values["modal-local-p"]) || !validateModalRelation(values["modal-local-r"])) return fail("请构造完整的 P 世界赋值与可达关系。");
        const model = modalModelForLevel(currentLevel(), values);
        return evaluateModalFormula(F.imp(F.prop("P"), F.box(F.prop("P"))), model, "w₀") === false ? pass("w₀ 的 P 真，但可达世界里有 P 为假之处，所以 □P 假。仅有这里的 P 不足以推出必然的 P。") : fail("需要让 w₀ 的 P 真，并找到一个可达的 P 为假的世界。");
      }
    },
    {
      id: "modal-forge-box-intro", branch: "modal", requires: ["modal-counterexample-local"], next: "modal-prove-k", chapter: "命题模态逻辑 · 必然引入", title: "进入任意可达世界，并带回必然结论",
      copy: "要证明 w 的必然结论，临时取一个任意可达世界 u，采用 wRu。u 是不受外部前提指定的新名字；这既不往模型里新增对象，也不声称可达世界一定存在。在 u 内临时假设 P∧Q，证明 Q∧P，再解除这个公式假设。最后构造你要带回 w 的必然公式，并把真正的内层证明交给世界范围的出口。",
      goal: "构造并证明 w:□((P∧Q)→(Q∧P))，由此铸造 □I。", tools: ["andElim1", "andElim2", "andIntro", "modalBox"], proofViews: true, fitchView: true, artifacts: ["modal-box-introduction"],
      spawnPositions: [{ x: 425, y: 110 }, { x: 425, y: 235 }, { x: 635, y: 165 }, { x: 250, y: 425 }],
      scopeFrames: [{ id: "modal-forge-world", worldScope: true, from: "w", to: "u", label: "任意可达世界 u · 暂用 wRu", x: 190, y: 25, width: 790, height: 390, discharge: true, boundaryLabel: "□", boundaryCopy: "解除 wRu，把在任意 u 的证明带回 w" }, { id: "modal-forge-assumption", label: "世界 u 内 · 临时假设 P∧Q", x: 220, y: 75, width: 610, height: 260 }],
      nodes: [fixed("modal-forge-conjunction", "临时前提的公式", F.and(F.prop("P"), F.prop("Q")), "formula", 15, 110), fixed("modal-forge-phi", "已经会构造的公式", F.imp(F.and(F.prop("P"), F.prop("Q")), F.and(F.prop("Q"), F.prop("P"))), "formula", 15, 425), { ...scopeAssumptionNode("modal-forge-assume", "modal-forge-assumption", 245, 165), world: "u" }, { id: "modal-forge-entry", type: "modalWorldEntry", scopeId: "modal-forge-world", inputs: [], out: "accessibility", x: 15, y: 280, fixed: true }, scopeDischargeNode("modal-forge-imp-exit", "modal-forge-assumption", 635, 355), modalWorldNode("modal-forge-world-exit", "modal-forge-world", 835, 355, true), { ...goal("proof", 1035, 355), glyph: "w:□((P∧Q)→(Q∧P))" }],
      hint: "先用两种 ∧E 取出 P、Q，把 Q 放在 ∧I 左边。→I 解除 u:P∧Q；另一条公式输出经过 □，与内层证明一起交给世界范围出口。",
      openingLesson: ["临时取一个任意可达世界", "<p>上一关说明：在 w 证明 P，并不足以证明 w:□P。我们需要在<b>任意从 w 可达的世界 u</b>证明内部公式。</p><p>世界范围临时提供 wRu。u 不出现在外部开放前提里，所以证明不能依靠对某个特定 u 的额外了解。新鲜的是名字，并不要求 u 与 w 是不同世界。范围内仍可以打开、解除普通的公式假设；最后才能收回世界范围。</p>"],
      definition: ["必然引入 □I", "<p>临时采用 wRu，在任意新鲜世界 u 内证明 u:A；解除可达条件后得到 w:□A。u 不得出现在剩余的外部开放前提或可达条件中。在 u 临时假设的公式也必须先解除。</p>"],
      unlock: "必然引入 □I",
      completionLesson: "<h3>必然引入 □I</h3><p>你先在任意可达世界 u 内证明 (P∧Q)→(Q∧P)，再收回临时条件 wRu，得到 w:□((P∧Q)→(Q∧P))。</p><p>□I 的出口只接收内层证明；出发世界、任意世界与临时可达条件由范围入口记录。公式节点写出的 □A 不是证明。</p>",
      validate: ({ value }) => modalProofMatches(value, "w", F.box(F.imp(F.and(F.prop("P"), F.prop("Q")), F.and(F.prop("Q"), F.prop("P")))), true) ? pass("交换合取的推理不依赖 u 的任何特定性质，所以它在任意可达世界成立；解除世界范围后得到必然结论。这就是 □I。") : fail("需要先解除普通假设，再把任意可达世界里的完整证明收回到 w。")
    },
    {
      id: "modal-prove-k", branch: "modal", requires: ["modal-forge-box-intro"], next: "modal-forge-diamond-intro", chapter: "命题模态逻辑 · 第一个模态定理", title: "第一次完整证明 K",
      copy: "用刚刚铸造的规则证明：如果 P→Q 必然成立，那么 P 必然成立就能推出 Q 必然成立。先在 w 临时采用 □(P→Q) 与 □P，再进入任意可达世界 u。把两条必然依据带到 u 完成命题推理；随后收回世界范围，并从里到外解除两个公式假设。",
      goal: "无开放前提地证明 w:□(P→Q)→(□P→□Q)。", tools: ["modalBoxElim", "impElim"], proofViews: true, fitchView: true, artifacts: ["modal-k-theorem"],
      spawnPositions: [{ x: 555, y: 210 }, { x: 555, y: 345 }, { x: 745, y: 270 }],
      scopeFrames: [{ id: "modal-k-outer", label: "世界 w · 临时假设 □(P→Q)", x: 165, y: 25, width: 845, height: 470 }, { id: "modal-k-inner", label: "世界 w · 再临时假设 □P", x: 185, y: 165, width: 805, height: 305 }, { id: "modal-k-world", worldScope: true, from: "w", to: "u", label: "任意可达世界 u · 暂用 wRu", x: 365, y: 190, width: 550, height: 245 }],
      nodes: [fixed("modal-k-imp-formula", "临时前提的公式", F.box(F.imp(F.prop("P"), F.prop("Q"))), "formula", 0, 60), fixed("modal-k-p-formula", "临时前提的公式", F.box(F.prop("P")), "formula", 0, 215), { ...scopeAssumptionNode("modal-k-imp-assume", "modal-k-outer", 190, 60), world: "w" }, { ...scopeAssumptionNode("modal-k-p-assume", "modal-k-inner", 205, 215), world: "w" }, { id: "modal-k-world-entry", type: "modalWorldEntry", scopeId: "modal-k-world", inputs: [], out: "accessibility", fixed: true, x: 375, y: 270 }, modalWorldNode("modal-k-world-exit", "modal-k-world", 930, 265), scopeDischargeNode("modal-k-p-exit", "modal-k-inner", 815, 490), scopeDischargeNode("modal-k-imp-exit", "modal-k-outer", 620, 490), { ...goal("proof", 1030, 490), glyph: "w:□(P→Q)→(□P→□Q)" }],
      hint: "两条 w 的必然依据各与临时 wRu 接入 □E。在 u 用 →E 得到 Q；□I 得到 w:□Q；两个 →I 依次解除 □P 和 □(P→Q)。",
      definition: ["K 的自然演绎证明", "<p>□(P→Q)→(□P→□Q) 称为 K。它表达必然性与蕴含的配合：每个可达世界的 P→Q 与 P 都成立，就使每个可达世界的 Q 成立。</p><p>这里从已有规则证明 K，不把它预先当作新公理或工具。仍未假定可达关系自反、对称或传递。</p>"],
      unlock: "定理 K：□(P→Q)→(□P→□Q)",
      completionLesson: "<h3>第一个完整的模态定理</h3><p>任意可达世界里的 →E，通过 □E 与 □I 连成了必然性的推理。两个普通假设也已解除，因此 K 不依赖任何开放前提。</p><p>这六关建立了 □ 的证明入口；◇ 的推理规则与不同可达关系对应的模态系统还留在后续。</p>",
      validate: ({ value }) => modalProofMatches(value, "w", F.imp(F.box(F.imp(F.prop("P"), F.prop("Q"))), F.imp(F.box(F.prop("P")), F.box(F.prop("Q")))), true) ? pass("K 已由 □E、□I 和命题推理规则证明；两个公式假设与临时可达条件全部解除，没有开放依赖。") : fail("请得到完整的 K 公式，并解除全部公式假设与世界范围。")
    },
    {
      id: "modal-forge-diamond-intro", branch: "modal", requires: ["modal-prove-k"], next: "modal-apply-diamond-intro", chapter: "命题模态逻辑 · 可能引入", title: "找到一个世界，就能得到可能",
      copy: "同一条可达条件 wRu 可以连接两个推理方向：w 的必然内容在 u 成立；u 成立的内容则在 w 可能成立。请先重建熟悉的 □E，再构造反方向的可能引入。横线上下已经标好世界，只需构造公式并接入共同的可达条件。这里的 wRu 是规则模式里的条件，不是模型中已经证明的事实。",
      goal: "摆出 w:□A 到 u:A，以及 u:A 到 w:◇A 的两条规则。", tools: ["schemaA", "modalBox", "modalDiamond"], ruleForge: true, artifacts: ["modal-diamond-introduction"],
      spawnPositions: [{ x: 35, y: 55 }, { x: 245, y: 55 }, { x: 245, y: 245 }],
      nodes: [fixed("modal-di-rule-access", "共同的可达条件", { from: "w", to: "u" }, "accessibilityPattern", 35, 350, "wRu"), { ...ruleSlot("modal-di-box-premise", "w:□A，wRu", "premise", 475, 50), inputs: [input("formula", "世界 w 的必然公式"), input("accessibilityPattern", "可达条件 wRu")], slotBody: "接入公式与可达条件" }, ruleSlot("modal-di-box-result", "u:A", "conclusion", 475, 240), { ...ruleSlot("modal-di-premise", "u:A，wRu", "premise", 735, 50), inputs: [input("formula", "世界 u 成立的公式"), input("accessibilityPattern", "可达条件 wRu")], slotBody: "接入公式与可达条件" }, ruleSlot("modal-di-result", "w:◇A", "conclusion", 735, 240)],
      ruleFrames: [{ premises: ["modal-di-box-premise"], conclusion: "modal-di-box-result", modalRule: true, from: "w", to: "u", label: "□E · 从 w 到 u" }, { premises: ["modal-di-premise"], conclusion: "modal-di-result", modalRule: true, from: "w", to: "u", label: "从 u 回到 w 的可能性" }],
      hint: "同一个 A 输出接到两个 u 的位置；由 A 分别构造 □A 和 ◇A，放到两个 w 的位置。wRu 接入两条横线上方。",
      definition: ["可能引入 ◇I", "<p>u:A　　wRu</p><hr><p>w:◇A　◇I</p><p>可达世界 u 中的成立依据，给出出发世界 w 的可能性。它并不证明 A 在 w 成立。</p>"],
      unlock: "可能引入 ◇I",
      completionLesson: "<h3>可能引入 ◇I</h3><p>u 是从 w 可达的世界，A 在 u 成立，所以 A 在 w 可能成立。◇I 接收 u:A 的证明和 wRu 的依据，得到 w:◇A。</p>",
      validate: ({ rules }) => rules.length === 2 && equalFormula(rules[0].premises[0], F.box(F.schema("A"))) && equalFormula(rules[0].conclusion, F.schema("A")) && equalFormula(rules[1].premises[0], F.schema("A")) && equalFormula(rules[1].conclusion, F.diamond(F.schema("A"))) ? pass("□E 把必然内容取到可达世界；◇I 把可达世界的成立依据带回出发世界，成为可能。") : fail("左边重建 □E；右边应由 u:A 与 wRu 得到 w:◇A。")
    },
    {
      id: "modal-apply-diamond-intro", branch: "modal", requires: ["modal-forge-diamond-intro"], next: "modal-forge-diamond-elim", chapter: "命题模态逻辑 · 可能引入", title: "把那里的推理带回这里",
      copy: "可达世界 u 的 P 成立，而每个从 w 可达的世界都满足 P→Q。先在那里得到 Q，再说明这里的 Q 是可能的。不要把 u 的成立结论直接当作 w 的成立结论。",
      goal: "从 w:□(P→Q)、wRu、u:P 证明 w:◇Q。", tools: ["modalBoxElim", "impElim", "modalDiamondIntro"], proofViews: true, fitchView: true, artifacts: ["modal-diamond-local-proof"],
      spawnPositions: [{ x: 265, y: 70 }, { x: 465, y: 220 }, { x: 665, y: 220 }],
      nodes: [worldPremiseNode("modal-di-given-box", "w", F.box(F.imp(F.prop("P"), F.prop("Q"))), 20, 70), worldRelationNode("modal-di-given-edge", "w", "u", 20, 260), worldPremiseNode("modal-di-given-p", "u", F.prop("P"), 265, 390), { ...goal("proof", 885, 220), glyph: "w:◇Q" }],
      hint: "用 □E 取出 u:P→Q，再与 u:P 接入 →E。最后把 u:Q 与同一条 wRu 接入 ◇I。",
      definition: ["在可达世界推理", "<p>w:□(P→Q) 与 wRu 得到 u:P→Q；与 u:P 得到 u:Q；再由 wRu 得到 w:◇Q。结论是可能的 Q，不是这里的 Q。</p>"],
      unlock: "把可达世界中的推理带回为可能性",
      validate: ({ value }) => modalProofMatches(value, "w", F.diamond(F.prop("Q"))) ? pass("你在可达世界 u 证明了 Q，因此在 w 得到的是 ◇Q，而不是 Q。") : fail("请完成在 u 的推理，再用 ◇I 得到 w:◇Q。")
    },
    {
      id: "modal-forge-diamond-elim", branch: "modal", requires: ["modal-apply-diamond-intro"], next: "modal-diamond-transfer", chapter: "命题模态逻辑 · 可能消去", title: "不知道是哪一个世界，也能继续推理",
      copy: "w:◇(P∧Q) 保证某个可达世界满足 P∧Q，但没有告诉我们它是哪一个。把这条证明接入范围入口，暂称这个世界为 u，才能使用框内的 wRu 与 u:P∧Q。分别从那里取得 P、Q，带回 w 的两种可能性，再将它们合取。最后结束见证范围，不留下对临时名字 u 的依赖。",
      goal: "由 w:◇(P∧Q) 证明范围外的 w:◇P∧◇Q，铸造 ◇E。", tools: ["andElim1", "andElim2", "modalDiamondIntro", "andIntro"], proofViews: true, fitchView: true, artifacts: ["modal-diamond-elimination"],
      spawnPositions: [{ x: 350, y: 110 }, { x: 350, y: 255 }, { x: 530, y: 110 }, { x: 530, y: 255 }, { x: 710, y: 185 }],
      scopeFrames: [{ id: "modal-di-forge-scope", witnessScope: true, from: "w", to: "u", entry: "modal-di-forge-entry", label: "由 ◇(P∧Q) 授权 · 临时见证 u", x: 160, y: 40, width: 710, height: 415, discharge: true, boundaryLabel: "出口", boundaryCopy: "只解除这次授权的 wRu 与 u:P∧Q" }],
      nodes: [worldPremiseNode("modal-di-forge-source", "w", F.diamond(F.and(F.prop("P"), F.prop("Q"))), 0, 180), { id: "modal-di-forge-entry", type: "modalDiamondWitness", inputs: registry.modalDiamondWitness.inputs, out: "proof", scopeId: "modal-di-forge-scope", x: 180, y: 180, fixed: true }, { id: "modal-di-forge-access", type: "modalDiamondAccess", inputs: [], out: "accessibility", scopeId: "modal-di-forge-scope", x: 180, y: 350, fixed: true }, { id: "modal-di-forge-exit", type: "modalDiamondExitDraft", inputs: registry.modalDiamondExitDraft.inputs, out: "proof", scopeId: "modal-di-forge-scope", x: 890, y: 185, fixed: true }, { ...goal("proof", 1070, 185), glyph: "w:◇P∧◇Q" }],
      openingLesson: ["暂称那个存在的世界为 u", "<p>◇A 保证某个可达世界满足 A。我们还不知道它是谁，先暂称它为 <b>u</b>：入口由 ◇A 的证明授权，同时提供 <b>wRu</b> 和 <b>u:A</b>。</p><p>这与 □I 的任意世界不同：这里是在利用一个已保证存在的见证。u 只是新鲜名字，不要求它与 w 是不同世界。结论和其余开放依据不能留下 u。</p><p>即使框内已经得到 w 的公式，它仍可能依赖这两条临时依据；必须通过范围出口解除它们。</p>"],
      hint: "先给入口接入 ◇(P∧Q) 的证明。两个 ∧E 分别取出 P、Q，两个 ◇I 共用框内的 wRu，最后用 ∧I 合取，再交给出口。",
      definition: ["可能消去 ◇E", "<p>从 w:◇A 出发，临时采用 wRu、u:A，推导出 w:B。若 u 不出现在结论与其余开放依据中，就可解除两条临时依据，保留 w:B。</p><p>原来的 w:◇A 仍是依据；它没有被出口解除。出口只接收内层证明，授权与名字由入口记录。</p>"],
      unlock: "可能消去 ◇E 的见证范围入口与出口",
      completionLesson: "<h3>可能消去 ◇E</h3><p>w:◇A　　[wRu，u:A]</p><p>　　　　　　　⋮</p><p>　　　　　　w:B</p><hr><p>　　　　　　w:B　◇E</p><p>u 是临时见证名字，不得出现在结论和其余开放依据中。你已解除 wRu、u:P∧Q，保留原来的 w:◇(P∧Q)，得到 w:◇P∧◇Q。Gentzen 与 Fitch 中可以查看同一次解除。</p>",
      validate: ({ value }) => modalProofMatches(value, "w", F.and(F.diamond(F.prop("P")), F.diamond(F.prop("Q")))) && value.rule === "diamondElim" && !value.openScopes.length && !(value.accessibilityDeps || []).length && value.worldOpen.length === 1 && equalFormula(value.worldOpen[0].formula, F.diamond(F.and(F.prop("P"), F.prop("Q")))) ? pass("同一个可达见证同时满足 P、Q，所以分别给出两种可能性。临时世界依据已经解除，原来的 ◇(P∧Q) 仍是证明依据。这就是 ◇E。") : fail("请通过见证范围出口得到 w:◇P∧◇Q，并解除两条临时依据。")
    },
    {
      id: "modal-diamond-transfer", branch: "modal", requires: ["modal-forge-diamond-elim"], next: "modal-separate-witnesses", chapter: "命题模态逻辑 · 可能性的完整证明", title: "必然的条件，传递可能的结果",
      copy: "证明必然成立的 P→Q 能把 P 的可能性传递给 Q。先在 w 临时采用 □(P→Q) 与 ◇P，再用 ◇P 授权一个临时见证世界 u。在那里完成推理，将结果带回 w 的可能性；关闭见证范围后，从里到外解除两个普通假设。",
      goal: "无开放前提地证明 w:□(P→Q)→(◇P→◇Q)。", tools: ["modalBoxElim", "impElim", "modalDiamondIntro"], proofViews: true, fitchView: true, artifacts: ["modal-diamond-transfer-theorem"],
      spawnPositions: [{ x: 555, y: 220 }, { x: 745, y: 220 }, { x: 745, y: 365 }],
      scopeFrames: [{ id: "modal-dt-outer", label: "世界 w · 临时假设 □(P→Q)", x: 165, y: 25, width: 845, height: 470 }, { id: "modal-dt-inner", label: "世界 w · 再临时假设 ◇P", x: 185, y: 175, width: 805, height: 290 }, { id: "modal-dt-witness", witnessScope: true, from: "w", to: "u", entry: "modal-dt-entry", label: "由 ◇P 授权 · 临时见证 u", x: 365, y: 200, width: 550, height: 235 }],
      nodes: [fixed("modal-dt-box-formula", "临时前提的公式", F.box(F.imp(F.prop("P"), F.prop("Q"))), "formula", 0, 60), fixed("modal-dt-diamond-formula", "临时前提的公式", F.diamond(F.prop("P")), "formula", 0, 235), { ...scopeAssumptionNode("modal-dt-box-assume", "modal-dt-outer", 190, 60), world: "w" }, { ...scopeAssumptionNode("modal-dt-diamond-assume", "modal-dt-inner", 205, 235), world: "w" }, { id: "modal-dt-entry", type: "modalDiamondWitness", inputs: registry.modalDiamondWitness.inputs, out: "proof", scopeId: "modal-dt-witness", x: 375, y: 245, fixed: true }, { id: "modal-dt-access", type: "modalDiamondAccess", inputs: [], out: "accessibility", scopeId: "modal-dt-witness", x: 375, y: 365, fixed: true }, { id: "modal-dt-witness-exit", type: "modalDiamondExit", inputs: registry.modalDiamondExit.inputs, out: "proof", scopeId: "modal-dt-witness", x: 930, y: 305, fixed: true }, scopeDischargeNode("modal-dt-inner-exit", "modal-dt-inner", 815, 490), scopeDischargeNode("modal-dt-outer-exit", "modal-dt-outer", 620, 490), { ...goal("proof", 1030, 490), glyph: "定理", slotBody: "w:□(P→Q)→(◇P→◇Q)" }],
      hint: "用 ◇P 的证明授权入口。□E 与临时 wRu 得到 u:P→Q，再用 u:P 得到 u:Q；◇I 得到 w:◇Q。先结束见证范围，再依次解除 ◇P、□(P→Q)。",
      definition: ["必然条件与可能结果", "<p>每个可达世界都满足 P→Q，而其中某个世界满足 P，所以那个世界满足 Q。这给出 ◇Q，而不要求每个可达世界的 Q 都真。</p>"],
      unlock: "定理：□(P→Q)→(◇P→◇Q)",
      validate: ({ value }) => modalProofMatches(value, "w", F.imp(F.box(F.imp(F.prop("P"), F.prop("Q"))), F.imp(F.diamond(F.prop("P")), F.diamond(F.prop("Q")))), true) ? pass("必然的 P→Q 在那个满足 P 的可达世界也成立，因此那里满足 Q。见证范围和两个普通假设全部解除，得到没有开放依赖的定理。") : fail("先关闭见证范围，再解除两个普通假设，得到完整的无前提定理。")
    },
    {
      id: "modal-separate-witnesses", branch: "modal", requires: ["modal-diamond-transfer"], next: "modal-counterexample-t", chapter: "命题模态逻辑 · 可能性的推理边界", title: "两个可能，不一定在同一个世界",
      copy: "前面从 ◇(P∧Q) 得到了 ◇P∧◇Q，反过来也成立吗？这里固定 P、Q 的世界赋值：w₀ 都假，w₁ 只有 P 真，w₂ 只有 Q 真。只构造可达关系，让固定公式 (◇P∧◇Q)→◇(P∧Q) 在 w₀ 为假，看看两种可能性是否必须共用一个世界。",
      goal: "让 w₀ 的 ◇P、◇Q 都真，但 ◇(P∧Q) 假。", tools: ["ord", "pair"], semanticWorkbench: "modal-worlds", modal: { lesson: "separate-witnesses", p: set(orderedPair("w₀", TRUTH_FALSE), orderedPair("w₁", TRUTH_TRUE), orderedPair("w₂", TRUTH_FALSE)), q: set(orderedPair("w₀", TRUTH_FALSE), orderedPair("w₁", TRUTH_FALSE), orderedPair("w₂", TRUTH_TRUE)), relationGoal: "goal", formula: F.imp(F.and(F.diamond(F.prop("P")), F.diamond(F.prop("Q"))), F.diamond(F.and(F.prop("P"), F.prop("Q")))) }, formulaViews: true, formulaViewOptions: ["construction", "syntax", "evaluation"], artifacts: ["modal-separate-witness-countermodel"],
      spawnPositions: [{ x: 235, y: 85 }, { x: 235, y: 305 }, { x: 455, y: 195 }],
      nodes: [...modalRelationSources(), { ...goal("set", 675, 195), label: "可达关系", glyph: "R" }],
      hint: "让 w₀ 分别可达 P 真处与 Q 真处。用两个有序对和配对把它们收成关系；不需要改变固定的世界赋值。",
      definition: ["可能性的见证不必相同", "<p>◇P 与 ◇Q 可以由两个不同的可达世界分别成立；◇(P∧Q) 却需要同一个世界同时满足 P、Q。因此 (◇P∧◇Q)→◇(P∧Q) 不是一般有效的公式。</p><p>不同见证范围不能擅自共用一个临时名字；相同名字会错误地假定它们是同一个世界。</p>"],
      unlock: "区分共同见证与分别见证",
      completionLesson: "<h3>两种可能性不保证共同发生</h3><p>P 与 Q 分别在不同可达世界成立，所以 ◇P∧◇Q 不保证 ◇(P∧Q)。同一个世界若满足 P∧Q，则同时为两种可能性提供依据。</p>",
      validate: ({ value }) => {
        if (!validateModalRelation(value)) return fail("请用世界的有序对构造可达关系。");
        const model = modalModelForLevel(currentLevel(), { goal: value });
        return evaluateModalFormula(currentLevel().modal.formula, model, "w₀") === false ? pass("P 的可达见证与 Q 的可达见证不同，没有可达世界同时满足 P、Q。所以两个可能不能直接合并成同一世界里的可能。") : fail("请让 w₀ 同时找到 P 的见证和 Q 的见证，使整个蕴含为假。");
      }
    },
    {
      id: "modal-counterexample-t", branch: "modal", requires: ["modal-separate-witnesses"], next: "modal-reflexive-extension", chapter: "命题模态逻辑 · 自反条件", title: "必然成立，为什么这里却不成立？",
      copy: "□ 考察的是可达世界，它一定会考察这里吗？本关固定 P 在 w₀ 假、w₁ 真、w₂ 真。构造可达关系，让 w₀ 至少能到达一个世界，同时使固定公式 □P→P 在 w₀ 为假。请观察当前世界与可达世界是否重合。",
      goal: "让 w₀ 至少可达一个世界，并使这里的 □P 真、P 假。", tools: ["ord", "pair"], semanticWorkbench: "modal-worlds", modal: { lesson: "t-counterexample", p: set(orderedPair("w₀", TRUTH_FALSE), orderedPair("w₁", TRUTH_TRUE), orderedPair("w₂", TRUTH_TRUE)), relationGoal: "goal", formula: F.imp(F.box(F.prop("P")), F.prop("P")) }, formulaViews: true, formulaViewOptions: ["construction", "syntax", "evaluation"], artifacts: ["modal-t-countermodel"],
      spawnPositions: [{ x: 235, y: 85 }, { x: 235, y: 305 }, { x: 455, y: 195 }],
      nodes: [...modalRelationSources(), { ...goal("set", 675, 195), label: "可达关系", glyph: "R" }],
      hint: "让 w₀ 到达 P 为真的 w₁ 或 w₂，但不要让它到达 P 为假的自己。一个有序对可用配对的两个相同输入包成单元素关系。",
      definition: ["必然不一定包含当前世界", "<p>□P 只要求从当前世界可达的世界满足 P。如果 w₀ 不能到达自己，那么 w₀ 的 P 可以假，同时它可达的世界的 P 全部真。所以 □P→P 在一般的 K 模型中不总成立。</p>"],
      unlock: "发现当前世界可能未被 □ 考察",
      validate: ({ value }) => {
        if (!validateModalRelation(value)) return fail("请用世界的有序对构造可达关系。");
        const model = modalModelForLevel(currentLevel(), { goal: value });
        if (!modalSuccessors(model, "w₀").length) return fail("本关需要 w₀ 至少可达一个世界，不能依靠没有可达世界来完成。");
        return evaluateModalFormula(currentLevel().modal.formula, model, "w₀") === false ? pass("可达世界都满足 P，所以 w₀ 的 □P 真；但 w₀ 自己不在考察范围中，这里的 P 仍是假。□P→P 因而为假。") : fail("需要让 w₀ 可达的世界都满足 P，却不把 P 为假的 w₀ 自己纳入考察。");
      }
    },
    {
      id: "modal-reflexive-extension", branch: "modal", requires: ["modal-counterexample-t"], next: "modal-prove-t", chapter: "命题模态逻辑 · 自反条件", title: "把每个世界自己也纳入考察",
      copy: "关系自反，是指每个世界 w 都满足 wRw。本关固定原关系 R={⟨w₀,w₁⟩}，沿用 P 在 w₀ 假、w₁ 真、w₂ 真的赋值。保留原来的连接，再为三个世界分别补上自己到自己的连接，不添加其他连接。请先把三个新有序对收成集合，再与 R 合并。",
      goal: "构造 R∪{⟨w₀,w₀⟩,⟨w₁,w₁⟩,⟨w₂,w₂⟩}。", tools: ["ord", "set3", "pair", "union"], semanticWorkbench: "modal-worlds", modal: { lesson: "reflexive-extension", p: set(orderedPair("w₀", TRUTH_FALSE), orderedPair("w₁", TRUTH_TRUE), orderedPair("w₂", TRUTH_TRUE)), relationGoal: "goal", baseRelation: set(orderedPair("w₀", "w₁")), formula: F.imp(F.box(F.prop("P")), F.prop("P")) }, formulaViews: true, formulaViewOptions: ["construction", "syntax", "evaluation"], artifacts: ["modal-reflexive-relation"],
      spawnPositions: [{ x: 215, y: 35 }, { x: 215, y: 180 }, { x: 215, y: 325 }, { x: 410, y: 195 }, { x: 610, y: 195 }, { x: 410, y: 385 }],
      nodes: [...modalRelationSources(), fixed("modal-reflexive-original", "保留的原关系", set(orderedPair("w₀", "w₁")), "set", 610, 35, "R={⟨w₀,w₁⟩}"), { ...goal("set", 610, 385), label: "补充后的关系", glyph: "R∪Δ" }],
      hint: "三个有序对的两端各接同一个世界，用三元素集收成 Δ。R 与 Δ 接入配对，得到 {R,Δ}，再交给并集族。",
      definition: ["关系的自反性", "<p>关系 R 在世界集合 W 上自反，是指每个 w∈W 都有 ⟨w,w⟩∈R，记作 wRw。Δ={⟨w,w⟩｜w∈W} 收集所有这样的有序对。R∪Δ 保留原关系，并补齐全部自己到自己的连接。</p><p>本关构造了一个具体的自反关系。下一关额外要求任意可达关系自反，并在这个条件下进行一般证明；不能把一个具体构造当作任意关系的证明。</p>"],
      unlock: "认识并构造自反的可达关系",
      completionLesson: "<h3>这里也进入了自己的考察范围</h3><p>w₀ 的 P 没有变，仍是假。改变的是可达关系：w₀ 现在可达自己，所以这里的 □P 从真变成假，□P→P 从假变成真。</p><p>你构造了一个自反关系。接下来的证明额外要求可达关系自反；这是新增条件，不是原来的 K 已经保证的性质。</p>",
      validate: ({ value }) => equal(value, set(orderedPair("w₀", "w₁"), ...MODAL_WORLDS.map((world) => orderedPair(world, world)))) ? pass("原来的连接被保留，每个世界也都能到达自己。w₀ 的 P 仍是假，因此现在不能再说这里的 P 必然成立。") : fail("需要保留 ⟨w₀,w₁⟩，补齐三个世界自己到自己的连接，并且不添加其他连接。")
    },
    {
      id: "modal-prove-t", branch: "modal", requires: ["modal-reflexive-extension"], chapter: "命题模态逻辑 · 系统 T", title: "必然、成立、可能之间的连接",
      copy: "现在额外要求可达关系自反。因此，在任意世界 w 都可以使用 wRw；这里的 w 不限于前面的三个具体世界。分别临时采用 □P 与 P，利用同一条 wRw 证明两个方向，再分别解除普通假设。自反条件是整个系统的背景要求，不会随公式假设一起解除。",
      goal: "在自反条件下，无开放公式前提地证明 w:□P→P 与 w:P→◇P。", tools: ["modalBoxElim", "modalDiamondIntro"], proofViews: true, fitchView: true, parallelProofs: true, proofComparisonNote: "两条证明应分别解除自己的普通假设；R 自反仍是系统条件，不属于开放的公式前提 Γ。", runTarget: "modal-t-box-goal", multiGoals: ["modal-t-box-goal", "modal-t-diamond-goal"], artifacts: ["modal-system-t"],
      spawnPositions: [{ x: 440, y: 115 }, { x: 440, y: 345 }],
      scopeFrames: [{ id: "modal-t-box-scope", label: "世界 w · 临时假设 □P", x: 205, y: 40, width: 410, height: 165 }, { id: "modal-t-p-scope", label: "世界 w · 临时假设 P", x: 205, y: 270, width: 410, height: 165 }],
      nodes: [fixed("modal-t-box-formula", "临时前提的公式", F.box(F.prop("P")), "formula", 15, 115), fixed("modal-t-p-formula", "临时前提的公式", F.prop("P"), "formula", 15, 345), { ...scopeAssumptionNode("modal-t-box-assume", "modal-t-box-scope", 230, 115), world: "w" }, { ...scopeAssumptionNode("modal-t-p-assume", "modal-t-p-scope", 230, 345), world: "w" }, fixed("modal-t-self", "由自反条件得到", proofObject("given", { kind: "accessibility", from: "w", to: "w" }, [], [], { backgroundCondition: "R 自反", accessibilityDeps: [{ from: "w", to: "w", scopeId: null, backgroundCondition: "R 自反" }] }), "accessibility", 440, 485, "wRw"), scopeDischargeNode("modal-t-box-exit", "modal-t-box-scope", 650, 115), scopeDischargeNode("modal-t-p-exit", "modal-t-p-scope", 650, 345), { ...goal("proof", 850, 115), id: "modal-t-box-goal", glyph: "w:□P→P" }, { ...goal("proof", 850, 345), id: "modal-t-diamond-goal", glyph: "w:P→◇P" }],
      hint: "□P 的临时证明与 wRw 接入 □E，得到 w:P，再交给上方 →I。P 的临时证明与同一条 wRw 接入 ◇I，再交给下方 →I。",
      definition: ["自反条件下的系统 T", "<p>自反性保证 wRw。w:□P 与 wRw 经 □E 给出 w:P；w:P 与 wRw 经 ◇I 给出 w:◇P。解除普通假设，分别得到 w:□P→P 与 w:P→◇P。</p><p>在 K 的基础上加入自反条件，对应的系统称为 T。公式 □A→A 通常称为 T 公理。本关通过已有规则与自反条件证明它的 P 实例，同样的推理可用于任意公式 A；没有把 T 公理预先作为零件。</p>"],
      unlock: "系统 T：自反条件下的模态推理",
      completionLesson: "<h3>系统 T</h3><p>当前世界也属于自己的可达世界。因此，必然成立的公式在这里成立；这里成立的公式也在这里可能成立。</p><p>两个普通公式假设都已解除，但自反条件仍然保留。把 P 换成任意公式 A，同样的证明给出 □A→A 与 A→◇A。没有新增 T 公理按钮。</p>",
      validate: ({ values }) => {
        const valid = (proof, formula) => modalProofMatches(proof, "w", formula) && !proof.open.length && !proof.openScopes.length && !(proof.worldOpen || []).length && proof.accessibilityDeps?.length === 1 && proof.accessibilityDeps[0].from === "w" && proof.accessibilityDeps[0].to === "w" && proof.accessibilityDeps[0].backgroundCondition === "R 自反";
        return valid(values["modal-t-box-goal"], F.imp(F.box(F.prop("P")), F.prop("P"))) && valid(values["modal-t-diamond-goal"], F.imp(F.prop("P"), F.diamond(F.prop("P")))) ? pass("两条证明都已解除普通假设，没有开放公式前提；自反条件仍然保留。必然蕴含这里成立，这里成立又给出可能。这是在系统 T 中的推理。") : fail("两个目标都要解除自己的公式假设，并保留来自系统自反条件的 wRw 依据。");
      }
    },
    {
      id: "predicate-arity", branch: "shared", requires: ["logic-system-overview"], next: "first-order-signature", chapter: "第九章 · 一阶语法", title: "给 P 留一个位置",
      copy: "命题逻辑把 P 当作不可拆开的整句话；一阶逻辑把它展开成 P(·)，留下一个可以放入对象名称的位置。先规定这个位置的数量。",
      goal: "构造符号条目 ⟨P,1⟩。", tools: ["ord"], artifacts: ["unary-p-entry"],
      spawnPositions: [{ x: 360, y: 210 }],
      nodes: [
        fixed("arity-p-symbol", "新符号", "P", "object", 75, 105, "P"),
        fixed("arity-one", "入口数量", numeral(1), "object", 75, 315, "1"),
        goal("set", 760, 210)
      ],
      hint: "把符号 P 放在有序对第一项，把自然数 1 放在第二项，再把结果接入目标。",
      openingLesson: ["从命题逻辑进入一阶逻辑", `<p>命题逻辑中的 <b>P</b> 是一整块，无法表达“谁具有性质 P”。一阶逻辑把这块叶子展开：</p><div class="fol-concept-bridge"><div><code>P</code><span><b>命题逻辑的命题</b><small>一整句话，内部没有对象位置</small></span></div><div><code>x</code><span><b>项</b><small>用来指向论域中的一个对象；变量 x 以后由赋值决定指向谁</small></span></div><div><code>P(x)</code><span><b>开公式</b><small>P 是性质位置，x 还没有确定，所以真假仍依赖 x 的取值</small></span></div><div><code>∀xP(x)</code><span><b>句子（闭公式）</b><small>x 已被量词绑定，不再留下等待外部赋值的自由变量</small></span></div></div><p>本章会依次构造这四层结构。第一步只是为 P(·) 规定它有几个项位置。</p>`],
      definition: ["入口数", `<p>⟨P,1⟩ 记录符号 P 有一个项位置。以后把一个项 t 放进去，才能形成原子公式 P(t)。</p><p>这里的 P 仍只是一枚符号；它既不是公式，也还没有被解释成任何集合。</p><code>符号 P　＋　入口数 1　＝　⟨P,1⟩</code>`],
      unlock: "一元谓词符号的条目已经定义",
      validate: ({ value }) => equal(value, unaryPEntry)
        ? pass("⟨P,1⟩ 规定了 P 恰好接收一个项；它还没有获得任何模型中的解释。")
        : fail(`当前条目是 ${prettyCurrentSet(value)}；需要让 P 位于第一项、1 位于第二项。`)
    },
    {
      id: "first-order-signature", branch: "shared", requires: ["predicate-arity"], next: "predicate-atom", chapter: "第九章 · 一阶语法", title: "列出这门语言的符号",
      copy: "沿用刚才的格式：Q 也接收一个项，R 接收两个有顺序的项。把三个条目收进一张符号表。",
      goal: "构造 {⟨P,1⟩,⟨Q,1⟩,⟨R,2⟩}。", tools: ["ord", "set3"], artifacts: ["first-order-signature"],
      spawnPositions: [{ x: 365, y: 105 }, { x: 365, y: 315 }, { x: 585, y: 210 }],
      nodes: [
        fixed("signature-p-entry", "上一关的条目", unaryPEntry, "set", 20, 35, "⟨P,1⟩"),
        fixed("signature-q-symbol", "新符号", "Q", "object", 20, 160, "Q"),
        fixed("signature-one", "Q 的入口数量", numeral(1), "object", 185, 160, "1"),
        fixed("signature-r-symbol", "新符号", "R", "object", 20, 335, "R"),
        fixed("signature-two", "R 的入口数量", numeral(2), "object", 185, 335, "2"),
        goal("set", 825, 210)
      ],
      hint: "先分别构造 ⟨Q,1⟩ 与 ⟨R,2⟩；再用三元素集把它们和已有的 ⟨P,1⟩ 收在一起。",
      definition: ["一阶语言的符号表", `<p>符号表只规定有哪些非逻辑符号，以及每个符号需要几个项输入。本章使用 P、Q 两个一元谓词符号和 R 一个二元谓词符号。</p><code>{⟨P,1⟩,⟨Q,1⟩,⟨R,2⟩}</code><p>符号表没有规定这些符号表示什么；那是以后模型的工作。</p>`],
      unlock: "P(·)、Q(·) 与 R(·,·) 可以按照各自的入口数使用",
      completionLesson: `<span class="eyebrow">一阶符号表</span><h3>先有语法位置，后有模型解释</h3><p>P、Q、R 目前只是带有固定入口数的符号。以后建立模型时，一元符号会获得论域子集作为解释，二元符号会获得有序对关系作为解释。</p>`,
      validate: ({ value }) => equal(value, firstOrderSignature)
        ? pass("三个符号条目组成了一张完整的符号表：P、Q 各有一个位置，R 有两个有序位置。")
        : fail(`当前集合是 ${prettyCurrentSet(value)}；符号表必须恰好包含 ⟨P,1⟩、⟨Q,1⟩、⟨R,2⟩。`)
    },
    {
      id: "predicate-atom", branch: "shared", requires: ["first-order-signature"], next: "relation-atom", chapter: "第九章 · 一阶语法", title: "把项送进谓词",
      copy: "变量 x 是最简单的项：它以后会指向论域中的某个对象。P(·) 表示一个性质位置；把 x 放进去，才得到可以讨论真假的公式 P(x)。",
      goal: "构造原子公式 P(x)。", tools: ["varx", "predP"], formulaViews: true, formulaViewOptions: ["construction", "syntax"], artifacts: ["predicate-atom"],
      spawnPositions: [{ x: 210, y: 220 }, { x: 400, y: 220 }], nodes: [goal("formula", 790, 220)],
      hint: "把变量 x 接入 P(·) 的项端口，再把 P(x) 接入目标。",
      definition: ["项、谓词与原子公式", `<p><b>项</b>负责指向对象，<b>谓词符号</b>留下对象位置，填满位置后得到的<b>原子公式</b>才负责陈述一件可能为真或为假的事情。</p><code>x：项　　P(·)：一元谓词符号　　P(x)：原子公式</code><p>现在还没有模型，因此尚未规定 x 指向谁，也未规定哪些对象具有性质 P。</p>`], unlock: "一元原子公式已经定义；下一关使用二元符号 R",
      completionLesson: `<span class="eyebrow">命题被展开了</span><h3>P(x) 比命题逻辑的 P 多出一个对象位置</h3><div class="set-compare"><div class="set-case"><b>P</b><small>命题逻辑中不可再分的整句话</small></div><div class="compare-arrow">→</div><div class="set-case"><b>P(x)</b><small>P 表示性质位置，项 x 填入这个位置</small></div></div><p class="layer-note">P(x) 已经是公式，但 x 仍然自由；在知道 x 指向哪个对象之前，模型还不能单独决定它的真假。</p>`,
      validate: ({ value }) => equalFormula(value, predicatePFormula)
        ? pass("P(·) 接收了项 x，生成原子公式 P(x)。")
        : fail(`当前结果是 ${prettyFormula(value)}；需要把变量 x 接入谓词 P。`)
    },
    {
      id: "relation-atom", branch: "shared", requires: ["predicate-atom"], next: "open-formula", chapter: "第九章 · 一阶语法", title: "两个位置有先后",
      copy: "一元谓词 P(x) 描述一个对象具有的性质；二元谓词 R(x,y) 可以描述两个对象之间的关系。两个项的位置有先后。",
      goal: "构造原子公式 R(x,y)。", tools: ["varx", "vary", "predR"], formulaViews: true, formulaViewOptions: ["construction", "syntax"], artifacts: ["binary-relation-atom"],
      spawnPositions: [{ x: 145, y: 115 }, { x: 145, y: 325 }, { x: 400, y: 220 }], nodes: [goal("formula", 790, 220)],
      hint: "x 接入 R 的第一个项位置，y 接入第二个项位置；交换它们会得到 R(y,x)。",
      definition: ["性质与关系", `<p>P(x) 只留下一个对象位置，可以表达“x 具有性质 P”；R(x,y) 留下两个有顺序的位置，可以表达“x 与 y 具有关系 R”。</p><code>P(x)：关于一个对象<br>R(x,y)：关于两个有序对象</code><p>R(x,y) 与 R(y,x) 通常是不同公式。R 目前仍只是符号；模型以后才会用有序对集合解释它。</p>`],
      unlock: "二元谓词应用与两个变量 x、y 已经定义",
      validate: ({ value }) => equalFormula(value, relationRFormula)
        ? pass("x、y 依次占据 R 的两个位置，构成原子公式 R(x,y)。")
        : fail(`当前结果是 ${prettyFormula(value)}；需要让 x 位于 R 的第一处、y 位于第二处。`)
    },
    {
      id: "open-formula", branch: "shared", requires: ["relation-atom"], next: "forall-binding", chapter: "第九章 · 一阶语法", title: "自由的 x",
      copy: "构造 P(x)∨Q(x)。它像一句仍留有空格的话：“这个对象具有 P 或 Q。”由于 x 尚未指定是哪一个对象，它是一条开公式。",
      goal: "构造开放公式 P(x)∨Q(x)。", tools: ["varx", "predP", "predQ", "or"], formulaViews: true, formulaViewOptions: ["construction", "syntax"], artifacts: ["open-formula"],
      spawnPositions: [{ x: 160, y: 220 }, { x: 345, y: 105 }, { x: 345, y: 335 }, { x: 530, y: 220 }], nodes: [goal("formula", 790, 220)],
      hint: "同一个 x 的输出可以分接给 P(·) 和 Q(·)；再把两片原子公式接入析取。",
      definition: ["开公式与自由变量", `<p>变量的某次出现如果没有处在绑定它的量词之下，就叫作<b>自由出现</b>。含有自由变量的公式叫作<b>开公式</b>。</p><p>P(x)∨Q(x) 中的 x 仍等待变量赋值告诉它指向哪个对象；不同的 x 取值可能使公式得到不同真值。</p><code>自由变量：FV(P(x)∨Q(x))={x}</code>`], unlock: "自由变量已经可见；下一关用量词关闭这个外部入口",
      completionLesson: `<span class="eyebrow">开公式</span><h3>x 是一个仍未填写的对象位置</h3><p>P(x)∨Q(x) 已经具有完整的公式树，但模型还需要一份变量赋值才能知道 x 指向谁。</p><code>x↦某个对象　之后才能判断 P(x)∨Q(x)</code><p class="layer-note">量词不是给 x 选定一个对象，而是让公式系统地考虑论域中的对象。</p>`,
      validate: ({ value }) => equalFormula(value, openPredicateFormula)
        ? pass("同一个项 x 出现在两个原子公式中；x 仍是这棵树的自由变量。")
        : fail(`当前公式是 ${prettyFormula(value)}；需要构造 P(x)∨Q(x)。`)
    },
    {
      id: "forall-binding", branch: "shared", requires: ["open-formula"], next: "forall-scope", chapter: "第九章 · 一阶语法", title: "把 x 绑定起来",
      copy: "全称量词 ∀x 让公式不再等待外部为 x 选值：它要求辖域中的说法面向论域里的每个对象。先构造最小句子 ∀xP(x)。",
      goal: "构造句子 ∀xP(x)。", tools: ["varx", "predP", "forall"], formulaViews: true, formulaViewOptions: ["construction", "syntax"], artifacts: ["forall-binding"],
      spawnPositions: [{ x: 160, y: 220 }, { x: 345, y: 220 }, { x: 530, y: 220 }], nodes: [goal("formula", 790, 220)],
      hint: "x 同时接到 P(·) 和 ∀ 的绑定变量端口；P(x) 接到量词辖域端口。",
      definition: ["全称绑定与句子", `<p>∀xφ 把辖域 φ 中自由出现的 x 转为受量词控制的出现。直观上，∀xP(x) 说“论域中的每个对象都具有性质 P”。</p><p>没有自由变量的公式叫作<b>句子</b>或<b>闭公式</b>。句子不再等待外部为变量填值。</p><code>FV(∀xP(x))=∅</code>`], unlock: "全称绑定已定义；下一关检查量词实际管辖哪棵子树",
      completionLesson: `<span class="eyebrow">从开公式到句子</span><h3>∀x 关闭了 P(x) 留下的自由入口</h3><div class="set-compare"><div class="set-case"><b>P(x)</b><small>x 自由；真假还依赖 x 指向谁</small></div><div class="compare-arrow">∀x</div><div class="set-case"><b>∀xP(x)</b><small>x 被绑定；公式已经成为句子</small></div></div>`,
      validate: ({ value }) => equalFormula(value, universalPredicateFormula)
        ? pass("∀ 把 x 绑定在 P(x) 的辖域中；结果已经是没有自由变量的句子。")
        : fail(`当前公式是 ${prettyFormula(value)}；需要构造 ∀xP(x)。`)
    },
    {
      id: "forall-scope", branch: "shared", requires: ["forall-binding"], next: "partial-binding", chapter: "第九章 · 一阶语法", title: "圈住整个辖域",
      copy: "量词只影响自己的辖域。要表达“每个对象都具有 P 或 Q”，∀x 必须管辖整个 P(x)∨Q(x)，而不只是其中一片原子公式。",
      goal: "构造句子 ∀x(P(x)∨Q(x))。", tools: ["varx", "predP", "predQ", "or", "forall"], formulaViews: true, formulaViewOptions: ["construction", "syntax"], artifacts: ["forall-scope"],
      spawnPositions: [{ x: 135, y: 220 }, { x: 300, y: 100 }, { x: 300, y: 340 }, { x: 465, y: 220 }, { x: 635, y: 220 }], nodes: [goal("formula", 790, 220)],
      hint: "同一个 x 分别送入 P、Q；先构造 P(x)∨Q(x)，再把整个析取结果接到 ∀ 的辖域端口。",
      definition: ["量词辖域", `<p>量词节点下方的整棵公式子树叫作它的<b>辖域</b>。在 ∀x(P(x)∨Q(x)) 中，∀x 同时控制 P(x) 与 Q(x) 中的 x。</p><p>如果只让 ∀x 管辖 P(x)，就会得到 (∀xP(x))∨Q(x)：其中 Q(x) 的 x 仍然自由，数学意义也不同。</p><code>∀x(P(x)∨Q(x))　≠　(∀xP(x))∨Q(x)</code>`], unlock: "量词可以管辖复合公式；下一关区分同一辖域内的两个变量",
      validate: ({ value }) => equalFormula(value, universalScopeFormula)
        ? pass("∀ 的辖域覆盖整棵析取树；x 的所有出现都被绑定，得到句子。")
        : fail(`当前公式是 ${prettyFormula(value)}；需要让 ∀x 管辖整个 P(x)∨Q(x)。`)
    },
    {
      id: "partial-binding", branch: "shared", requires: ["forall-scope"], next: "close-relation-sentence", chapter: "第九章 · 一阶语法", title: "量词只认自己的变量",
      copy: "R(x,y) 留下两个对象位置。∀x 会让第一个位置遍历对象，却不会替第二个位置的 y 作决定；因此整条公式仍然开放。",
      goal: "构造开放公式 ∀xR(x,y)。", tools: ["varx", "vary", "predR", "forall"], formulaViews: true, formulaViewOptions: ["construction", "syntax"], artifacts: ["partial-binding"],
      spawnPositions: [{ x: 110, y: 110 }, { x: 110, y: 330 }, { x: 340, y: 220 }, { x: 555, y: 220 }], nodes: [goal("formula", 820, 220)],
      hint: "x、y 依次接入 R；x 还要接到 ∀ 的绑定变量端口，整个 R(x,y) 接入辖域。",
      definition: ["按名字绑定", `<p>进入辖域并不等于被绑定。量词只绑定与自己变量名相同的自由出现。</p><p>在 ∀xR(x,y) 中，x 由“每个对象”控制；y 虽然也位于辖域内，却仍等待外部赋值指定一个对象。</p><code>FV(∀xR(x,y))={y}</code><p>所以 ∀xR(x,y) 仍是开公式，不是句子。</p>`],
      unlock: "已经区分辖域与实际被绑定的变量",
      completionLesson: `<span class="eyebrow">部分绑定</span><h3>一个量词只关闭一个名字留下的入口</h3><div class="set-compare"><div class="set-case"><b>x</b><small>被 ∀x 绑定；不再等待赋值</small></div><div class="compare-arrow">｜</div><div class="set-case"><b>y</b><small>仍然自由；公式仍需知道 y 指向谁</small></div></div><p class="layer-note">因此 ∀xR(x,y) 可以随着 y 的取值改变真假。</p>`,
      validate: ({ value }) => equalFormula(value, partiallyBoundRelationFormula)
        ? pass("∀x 管辖整条 R(x,y)，但只绑定其中的 x；y 仍然自由。")
        : fail(`当前公式是 ${prettyFormula(value)}；需要让内层原子公式保持 R(x,y)，并只用 ∀x 绑定 x。`)
    },
    {
      id: "close-relation-sentence", branch: "shared", requires: ["partial-binding"], next: "exists-binding", chapter: "第九章 · 一阶语法", title: "关闭最后一个自由入口",
      copy: "上一关仍在说“对当前这个 y，每个 x 都与它有关系”。现在用外层 ∀y 也绑定 y，让公式谈论所有 x 和所有 y。",
      goal: "构造句子 ∀y∀xR(x,y)。", tools: ["varx", "vary", "predR", "forall"], formulaViews: true, formulaViewOptions: ["construction", "syntax"], artifacts: ["closed-relation-sentence"],
      spawnPositions: [{ x: 70, y: 105 }, { x: 70, y: 335 }, { x: 275, y: 220 }, { x: 475, y: 220 }, { x: 665, y: 220 }], nodes: [goal("formula", 875, 220)],
      hint: "先重建 ∀xR(x,y)，再让第二个 ∀ 使用 y 作为绑定变量，并把整棵 ∀xR(x,y) 接入它的辖域。",
      definition: ["句子", `<p>没有自由变量的公式叫作句子。内层 ∀x 绑定 x，外层 ∀y 再绑定 y，因此最终没有等待外部赋值的对象位置。</p><code>FV(∀y∀xR(x,y))=∅</code><p>开公式需要模型和变量赋值才能决定真假；句子的真假不再依赖外部给 x、y 选择什么对象。量词的先后顺序仍保留在语法树中。</p>`],
      unlock: "含有嵌套量词的一阶句子已经构造完成",
      completionLesson: `<span class="eyebrow">闭公式</span><h3>所有对象位置现在都由公式自己控制</h3><p>内层 ∀x 处理 x，外层 ∀y 处理 y。最终没有自由变量，因此 ∀y∀xR(x,y) 是一条句子。</p><code>开公式 ＋ 绑定全部自由变量 ＝ 句子</code>`,
      validate: ({ value }) => equalFormula(value, closedRelationSentence)
        ? pass("内层 ∀x 与外层 ∀y 分别绑定自己的变量；最终公式不再留下自由入口。")
        : fail(`当前公式是 ${prettyFormula(value)}；需要先得到 ∀xR(x,y)，再由外层 ∀y 绑定剩余的 y。`)
    },
    {
      id: "exists-binding", branch: "shared", requires: ["close-relation-sentence"], next: "semantics-bridge", chapter: "第九章 · 一阶语法", title: "至少有一个",
      copy: "∀xP(x) 面向论域中的每个对象；∃xP(x) 只要求至少能找到一个具有性质 P 的对象。两者都会绑定辖域中的 x。",
      goal: "构造句子 ∃xP(x)。", tools: ["varx", "predP", "exists"], formulaViews: true, formulaViewOptions: ["construction", "syntax"], artifacts: ["existential-binding"],
      spawnPositions: [{ x: 155, y: 220 }, { x: 365, y: 220 }, { x: 575, y: 220 }], nodes: [goal("formula", 825, 220)],
      hint: "用 x 构造 P(x)；同一个 x 接入 ∃ 的绑定变量端口，再把 P(x) 接入它的辖域。",
      definition: ["存在量词的语法", `<p>∃xP(x) 是一棵以 ∃x 为根、以 P(x) 为辖域的公式树。它读作“存在至少一个 x，使 P(x)”。</p><p>∃x 与 ∀x 都会绑定辖域中自由出现的 x；区别在于以后如何使用论域中的对象判断它们。</p><code>∀xP(x)：每个对象<br>∃xP(x)：至少一个对象</code><p>这一关只确定语法结构；下一章才用模型精确定义“每个”和“至少一个”。</p>`],
      unlock: "一阶关系语言的项、原子公式、两种量词、自由变量与句子已经全部进入工作台",
      completionLesson: `<span class="eyebrow">一阶语法章完成</span><h3>公式树现在能够谈论对象</h3><p>符号表固定了 P、Q、R 的项位置；变量进入这些位置形成原子公式；∀ 与 ∃ 再按照变量名和辖域绑定自由出现。</p><code>P(x)　R(x,y)　∀xP(x)　∃xP(x)</code><p class="layer-note">这些符号仍然只有语法结构。下一章才会构造论域、解释与变量赋值，让句子在模型中获得真值。</p>`,
      validate: ({ value }) => equalFormula(value, existentialPredicateFormula)
        ? pass("∃x 成为公式树的根，并绑定 P(x) 中的 x；存在句子的语法结构完成。")
        : fail(`当前公式是 ${prettyFormula(value)}；需要让 ∃x 的辖域恰好是 P(x)。`)
    },
    {
      id: "semantics-bridge", branch: "shared", requires: ["exists-binding"], next: "model-domain", chapter: "第十章 · 模型与语义", title: "公式还缺少一个世界",
      copy: "语法已经说明哪些符号串是公式，却没有决定它们在说什么。现在要为这些符号造出一个可以被谈论的世界。",
      goal: "观察公式获得意义所需的三层材料，然后继续。", tools: [], nodes: [], overview: true, semanticOverview: true,
      hint: "阅读三层结构：论域、符号解释与变量赋值。",
      definition: ["从语法进入语义", `<p>同一棵 P(x) 语法树可以在不同世界中具有不同真假。模型先给出对象和谓词解释；变量赋值再告诉自由变量当前指向哪个对象。</p><code>语法树 ＋ 模型 ＋ 变量赋值 → 真或假</code>`],
      unlock: "模型与语义工作台已经开启", validate: () => pass("已经区分公式的语法结构与使它获得真假的外部材料。")
    },
    {
      id: "model-domain", branch: "shared", requires: ["semantics-bridge"], next: "interpret-predicate", chapter: "第十章 · 模型与语义", title: "这个世界里有什么",
      copy: "模型首先要规定允许谈论哪些对象。把 a、b 收进同一个非空集合，作为这个小世界的全部对象。",
      goal: "构造论域 D={a,b}。", tools: ["set2"], artifacts: ["model-domain"], spawnPositions: [{ x: 360, y: 220 }],
      nodes: [fixed("domain-a", "对象", "a", "set", 80, 120, "a"), fixed("domain-b", "对象", "b", "set", 80, 330, "b"), goal("set", 760, 220)],
      hint: "用二元素集收集 a 与 b，再接入目标。",
      definition: ["论域", `<p>模型的<b>论域</b> D 是这个模型中所有对象组成的非空集合。之后变量只能指向 D 中的对象，谓词和关系也只能在 D 上解释。</p><code>D={a,b}　　D≠∅</code>`],
      unlock: "已获得模型的论域 D={a,b}",
      validate: ({ value }) => equal(value, semanticDomain) ? pass("D={a,b} 规定了当前模型恰好谈论 a、b 两个对象。") : fail("论域必须恰好收集对象 a 与 b。")
    },
    {
      id: "interpret-predicate", branch: "shared", requires: ["model-domain"], next: "interpret-relation", chapter: "第十章 · 模型与语义", title: "谓词指向哪些对象",
      copy: "这个模型规定：P 适用于 a；Q 同时适用于 a、b。把每个谓词适用的全部对象收成一个集合，这个集合就是谓词在模型中的解释。",
      goal: "构造 Pᴹ={a} 与 Qᴹ={a,b}。", tools: ["set1", "set2"], artifacts: ["unary-predicate-interpretations"],
      multiGoals: ["predicate-p-goal", "predicate-q-goal"],
      modelFrame: { x: 590, y: 54, width: 390, height: 360, label: "论域 D={a,b}", detail: "把谓词适用的对象集合接入对应位置" },
      spawnPositions: [{ x: 285, y: 115 }, { x: 285, y: 330 }],
      nodes: [
        fixed("predicate-a", "论域对象", "a", "set", 45, 135, "a"),
        fixed("predicate-b", "论域对象", "b", "set", 45, 335, "b"),
        semanticGoal("predicate-p-goal", "P 适用于哪些对象", "Pᴹ", "P 适用的全部对象", 690, 125),
        semanticGoal("predicate-q-goal", "Q 适用于哪些对象", "Qᴹ", "Q 适用的全部对象", 690, 325)
      ],
      hint: "把 a 收成 {a} 接入 Pᴹ；把 a、b 收成 {a,b} 接入 Qᴹ。同一个对象 a 可以同时用于两个解释。",
      definition: ["一元谓词的解释", `<p>一元谓词可以适用于一个、多个或没有任何论域对象。模型把某个谓词适用的全部对象收成一个集合。</p><code>Pᴹ={d∈D｜P 适用于 d}</code><p>本模型中 P 只适用于 a，所以 Pᴹ={a}；Q 适用于 a、b，所以 Qᴹ={a,b}。这两个集合都是论域 D 的子集。</p>`],
      unlock: "P、Q 已经分别对应到它们适用的对象集合",
      completionLesson: `<span class="eyebrow">一元谓词的模型解释</span><h3>把谓词适用的全部对象收在一起</h3><p>P 适用于 a，所以 Pᴹ={a}；Q 适用于 a、b，所以 Qᴹ={a,b}。</p><code>P ↦ {a}　　Q ↦ {a,b}</code><p class="layer-note">一个谓词可以对应多个对象；同一个对象也可以同时出现在多个谓词的解释中。</p>`,
      validate: ({ values }) => equal(values["predicate-p-goal"], semanticPOnlyA)
        && equal(values["predicate-q-goal"], semanticQAll)
        ? pass("P、Q 已经分别对应到它们适用的全部论域对象：Pᴹ={a}，Qᴹ={a,b}。")
        : fail("P 只适用于 a；Q 同时适用于 a、b。请把两个对象集合接入对应位置。")
    },
    {
      id: "interpret-relation", branch: "shared", requires: ["interpret-predicate"], next: "assemble-model", chapter: "第十章 · 模型与语义", title: "R 适用于哪些对象对",
      copy: "P、Q 各自挑出它们适用的对象；R 有两个有顺序的位置，所以它挑出自己适用的对象对。这个模型规定：每个对象都与另一个对象具有 R，但不与自己具有 R。",
      goal: "收集符合这项规定的全部有序对象对，作为 Rᴹ。", tools: ["ord", "set2"], artifacts: ["relation-interpretation"],
      modelFrame: { x: 635, y: 62, width: 365, height: 345, label: "模型 𝔐 · D={a,b}", detail: "Pᴹ={a}　Qᴹ={a,b}　现在补上 Rᴹ" },
      spawnPositions: [{ x: 270, y: 95 }, { x: 270, y: 340 }, { x: 490, y: 220 }],
      nodes: [
        fixed("relation-a", "论域对象", "a", "set", 45, 120, "a"),
        fixed("relation-b", "论域对象", "b", "set", 45, 330, "b"),
        semanticGoal("goal", "R 适用于哪些对象对", "Rᴹ", "R 适用的全部有序对象对", 735, 220)
      ],
      hint: "a 与另一个对象 b 具有 R，b 与另一个对象 a 也具有 R；有序对要分别记录两个方向。",
      definition: ["从一元谓词到二元谓词", `<p>P 只有一个位置，所以 Pᴹ 收集 P 适用的对象；R 有两个有顺序的位置，所以 Rᴹ 收集 R 适用的有序对象对。</p><code>Pᴹ={d∈D｜P 适用于 d}<br>Rᴹ={⟨d,e⟩｜R 适用于 d、e}</code><p>两个位置都只能放入论域对象，因此这些候选对象对自然来自 D×D；所以 Rᴹ 是 D×D 的子集，而不是另一种新对象。</p>`],
      unlock: "R 已经对应到它适用的有序对象对集合",
      completionLesson: `<span class="eyebrow">同一种解释方式</span><h3>一元谓词收集对象，二元谓词收集对象对</h3><div class="set-compare"><div class="set-case"><b>Pᴹ={a}</b><small>P 适用于单个对象 a</small></div><div class="compare-arrow">对应</div><div class="set-case"><b>Rᴹ={⟨a,b⟩,⟨b,a⟩}</b><small>R 适用于两个有顺序的对象</small></div></div><p class="layer-note">a 与 b 之间的两个方向必须分别记录；这个模型没有让任何对象与自己具有 R。</p>`,
      validate: ({ value, nodes }) => equal(value, semanticRelation) && nodes.filter((node) => node.type === "ord").length >= 2 && nodes.some((node) => node.type === "set2")
        ? pass("⟨a,b⟩ 与 ⟨b,a⟩ 分别记录两个方向；所有符合规定的对象对已经收进 Rᴹ。")
        : fail("需要记录 a 到 b、b 到 a 两个方向，并且不要加入对象到自身的有序对。")
    },
    {
      id: "assemble-model", branch: "shared", requires: ["interpret-relation"], next: "build-variable-assignment", chapter: "第十章 · 模型与语义", title: "第一个完整模型",
      copy: "论域以及 P、Q、R 的解释已经分别构造完成。现在把它们作为同一个世界来阅读，并看看这套抽象记录怎样描述桌上的杯子和盘子。",
      goal: "完整查看模型 𝔐 及其日常解释。", tools: [], nodes: [], overview: true, modelOverview: true, artifacts: ["first-order-model"],
      hint: "对照两栏阅读：a、b 指杯子和盘子；P、Q 描述单个对象，R 描述两个对象之间的位置关系。",
      definition: ["关系语言的模型", `<p>对于当前含有 P、Q、R 的语言，一个模型由非空论域和每个谓词符号的解释组成。</p><code>𝔐=(D,Pᴹ,Qᴹ,Rᴹ)</code><p>模型为符号赋予意义，但还没有替自由变量 x、y 选择对象；那是下一关变量赋值的工作。</p>`],
      unlock: "第一个完整一阶模型 𝔐 已经呈现",
      validate: () => pass("论域、两个一元谓词解释和一个二元关系解释已经组成完整模型。")
    },
    {
      id: "build-variable-assignment", branch: "shared", requires: ["assemble-model"], next: "read-variable-value", chapter: "第十章 · 模型与语义", title: "让变量指向对象",
      copy: "在命题逻辑中，赋值 v 把 P、Q 送到真或假。现在 x、y 是对象变量：变量赋值 s 不给它们真假，而是从模型的论域中为它们选择对象。",
      goal: "记录 x 指向 a、y 指向 b，得到变量赋值 s={⟨x,a⟩,⟨y,b⟩}。", tools: ["ord", "set2"], artifacts: ["variable-assignment"], semanticWorkbench: "assignment",
      spawnPositions: [{ x: 220, y: 95 }, { x: 220, y: 340 }, { x: 410, y: 220 }],
      nodes: [fixed("assignment-x", "变量", "x", "object", 35, 70, "x"), fixed("assignment-a", "论域成员", "a", "set", 35, 175, "a"), fixed("assignment-y", "变量", "y", "object", 35, 300, "y"), fixed("assignment-b", "论域成员", "b", "set", 35, 405, "b"), goal("set", 585, 220)],
      hint: "用有序对记录 x 与 a、y 与 b 的对应，再用二元素集把两条记录收在一起。注意：右侧是论域对象，不是真或假。",
      definition: ["两种赋值选择不同的东西", `<p>命题赋值 v 为命题变元选择真值；变量赋值 s 为对象变量选择论域中的对象。</p><code>v(P)=真　　v(Q)=假<br>s(x)=a　　s(y)=b</code><p>s 本身不会直接说一个公式是真是假。它只说明公式中的 x、y 当前谈论哪些对象；之后还要结合模型中 P、Q、R 的解释来判断公式。</p>`],
      unlock: "已区分命题赋值与变量赋值",
      validate: ({ value }) => equal(value, semanticAssignment) ? pass("变量赋值已经记录：x 指向 a，y 指向 b。这里选择的是论域对象，而不是命题逻辑中的真或假。") : fail("需要记录 x 指向 a、y 指向 b；有序对的右侧应当是论域对象。")
    },
    {
      id: "read-variable-value", branch: "shared", requires: ["build-variable-assignment"], next: "satisfy-predicate-atom", chapter: "第十章 · 模型与语义", title: "项最终指向了谁",
      copy: "变量 x 是语法中的项，不是模型里的对象。把刚刚构造的 s 用作函数，才能找到 x 在这个赋值下指向的论域对象。",
      goal: "用函数应用得到 s(x)=a。", tools: ["applyGraph"], artifacts: ["term-evaluation"], semanticWorkbench: "term", spawnPositions: [{ x: 330, y: 220 }],
      nodes: [fixed("read-assignment", "变量赋值", semanticAssignment, "set", 55, 120, "s"), fixed("read-x", "变量项", "x", "object", 55, 330, "x"), goal("object", 535, 220)],
      hint: "把 s 接到函数应用的函数端口，把 x 接到输入端口。这是本章唯一一次展开完整的赋值图；之后它会折叠为 s(·)。",
      definition: ["变量项的指称", `<p>命题赋值给命题变元真值；变量赋值则让变量项指向论域对象。这里的函数应用不是在判断真假，只是在回答 x 当前谈论谁。</p><code>x：语法中的项<br>s(x)=a：论域中的对象</code>`],
      unlock: "变量赋值 s 已折叠为可应用节点 s(·)",
      validate: ({ value }) => equal(value, "a") ? pass("s(x)=a：语法中的变量 x 现在指向模型中的对象 a；这里还没有判断任何公式的真假。") : fail("对刚刚构造的变量赋值 s 应用输入 x。")
    },
    {
      id: "satisfy-predicate-atom", branch: "shared", requires: ["read-variable-value"], next: "satisfy-relation-atom", chapter: "第十章 · 模型与语义", title: "P(x) 怎样成为真",
      copy: "P(x) 先留下一个等待对象的位置。让 x 经过已经折叠的 s(·)，再把所得对象送到这个位置；右侧模型记录会告诉我们 P 是否适用于它。",
      goal: "把 s(x) 得到的对象送入 P 的位置。", tools: ["assignmentS"], artifacts: ["atomic-satisfaction"], semanticWorkbench: "predicate", spawnPositions: [{ x: 300, y: 220 }],
      modelFrame: { x: 610, y: 72, width: 385, height: 340, label: "模型中的 P", detail: "Pᴹ={a}　P 只适用于对象 a" },
      nodes: [fixed("sat-p-x", "变量项", "x", "object", 45, 220, "x"), semanticValueGoal("goal", "P(x) 等待所指对象", "P(□)", "s(x) 所指对象", 535, 220)],
      hint: "把 x 接入 s(·)，再把输出对象接入目标。Pᴹ={a} 已经是你在前面构造好的模型解释，不需要另造检查器。",
      definition: ["满足一个原子公式", `<p>P(x) 在模型 𝔐 和赋值 s 下成立，当且仅当 x 所指的对象属于 P 的解释。</p><code>𝔐,s ⊨ P(x)　⇔　s(x)∈Pᴹ</code><p>符号 ⊨ 在这里读作“满足”或“使其成立”。</p>`],
      unlock: "原子公式 P(x) 的满足条件已经定义",
      validate: ({ value, nodes }) => equal(value, "a") && nodes.some((node) => node.type === "assignmentS") ? pass("s(x)=a，而 a 正是 Pᴹ 中的对象，所以 𝔐,s⊨P(x)。满足判断来自赋值与模型解释的配合，不是一个新的真值机器。") : fail("先让 x 经过 s(·)；P 的位置需要接到 x 当前所指的对象 a。")
    },
    {
      id: "satisfy-relation-atom", branch: "shared", requires: ["satisfy-predicate-atom"], next: "update-assignment", chapter: "第十章 · 模型与语义", title: "两个项落成一条边",
      copy: "R(x,y) 有两个有顺序的位置。分别找出 x、y 当前所指的对象，再按公式中的顺序组成模型要寻找的有序对。",
      goal: "构造 R(x,y) 在赋值 s 下指向的对象对 ⟨s(x),s(y)⟩。", tools: ["assignmentS", "ord"], artifacts: ["relation-satisfaction"], semanticWorkbench: "relation",
      modelFrame: { x: 650, y: 62, width: 370, height: 355, label: "模型中的 R", detail: "Rᴹ={⟨a,b⟩,⟨b,a⟩}　两条方向都已记录" },
      spawnPositions: [{ x: 220, y: 100 }, { x: 220, y: 340 }, { x: 405, y: 220 }],
      nodes: [fixed("sat-r-x", "第一个变量项", "x", "object", 30, 150, "x"), fixed("sat-r-y", "第二个变量项", "y", "object", 30, 335, "y"), semanticGoal("goal", "R(x,y) 寻找的对象对", "⟨s(x),s(y)⟩", "按顺序得到的对象对", 585, 220)],
      hint: "放入两个 s(·)，分别读取 x、y；再用已经熟悉的有序对保持两个位置的顺序。",
      definition: ["满足二元原子公式", `<p>二元关系公式保留项的顺序。R(x,y) 成立，恰好表示由两个项的值组成的有序边属于 Rᴹ。</p><code>𝔐,s⊨R(x,y) ⇔ ⟨s(x),s(y)⟩∈Rᴹ</code>`],
      unlock: "二元原子公式的满足条件已经定义",
      validate: ({ value, nodes }) => equal(value, semanticRAB) && nodes.filter((node) => node.type === "assignmentS").length >= 2 && nodes.some((node) => node.type === "ord") ? pass("s(x)=a、s(y)=b，所以公式寻找 ⟨a,b⟩；这条有序边已经在 Rᴹ 中，因此 𝔐,s⊨R(x,y)。") : fail("需要依次组成 ⟨s(x),s(y)⟩；不要交换 R 的两个位置。")
    },
    {
      id: "open-formula-varies", branch: "shared", requires: ["update-assignment"], next: "check-every-object", chapter: "第十章 · 模型与语义", title: "同一开公式，两种结果",
      copy: "模型与公式 P(x) 都保持不变。分别让 x 经过 s(·) 与刚刚构造的 t(·)，把它在两份赋值下所指的对象并排记录。",
      goal: "分别把 s(x)、t(x) 送入两条 P(x) 求值通道。", tools: ["assignmentS", "assignmentT"], artifacts: ["open-formula-dependence"], semanticWorkbench: "open-compare", multiGoals: ["vary-s-goal", "vary-t-goal"],
      spawnPositions: [{ x: 270, y: 105 }, { x: 270, y: 340 }],
      nodes: [fixed("vary-x", "同一个自由变量", "x", "object", 35, 220, "x"), semanticValueGoal("vary-s-goal", "赋值 s 下的 P(x)", "P(s(x))", "s(x) 所指对象", 485, 125), semanticValueGoal("vary-t-goal", "赋值 t 下的 P(x)", "P(t(x))", "t(x) 所指对象", 485, 335)],
      hint: "让同一个 x 分别接入 s(·)、t(·)，再把两个输出送到各自的 P(x) 通道。观察台会直接显示两条通道是否成立。",
      definition: ["开公式依赖赋值", `<p>模型 𝔐 与公式 P(x) 都没有改变；自由变量 x 的所指改变，就可能改变公式的真假。</p><code>𝔐,s⊨P(x)<br>𝔐,t⊭P(x)</code><p>因此不能脱离赋值单独问一个开公式在模型中是否为真。</p>`],
      unlock: "已经观察到开公式对自由变量赋值的依赖",
      validate: ({ values, nodes }) => equal(values["vary-s-goal"], "a") && equal(values["vary-t-goal"], "b") && nodes.some((node) => node.type === "assignmentS") && nodes.some((node) => node.type === "assignmentT") ? pass("s(x)=a、t(x)=b；Pᴹ 只含 a，所以 𝔐,s⊨P(x)，而 𝔐,t⊭P(x)。两条通道把差别直接显示出来。") : fail("s(·) 的输出应进入上方通道，t(·) 的输出应进入下方通道。")
    },
    {
      id: "update-assignment", branch: "shared", requires: ["satisfy-relation-atom"], next: "open-formula-varies", chapter: "第十章 · 模型与语义", title: "只改动一个变量",
      copy: "量词会让一个指定变量依次指向论域对象，同时保留其他变量的值。把 s 中 x 的边替换为 x↦b，而让 y 仍指向 b。",
      goal: "构造 s[x↦b]={⟨x,b⟩,⟨y,b⟩}。", tools: ["ord", "set2"], artifacts: ["assignment-update"], semanticWorkbench: "assignment-update",
      spawnPositions: [{ x: 240, y: 95 }, { x: 240, y: 340 }, { x: 430, y: 220 }],
      nodes: [fixed("update-x", "被改动的变量", "x", "object", 35, 70, "x"), fixed("update-y", "保持不变的变量", "y", "object", 35, 195, "y"), fixed("update-b", "论域成员", "b", "set", 35, 330, "b"), fixed("update-old", "原赋值", semanticAssignment, "set", 35, 440, "s"), goal("set", 605, 220)],
      hint: "构造 ⟨x,b⟩ 与 ⟨y,b⟩；原赋值用于对照，不要把整张旧函数图收进新赋值。",
      definition: ["赋值更新", `<p>s[x↦b] 表示只把 x 的值改成 b，其他变量仍取 s 中原来的值。</p><code>s[x↦b](x)=b<br>s[x↦b](y)=s(y)=b</code><p>它仍是一张变量到论域的函数图。</p>`],
      unlock: "更新后的变量赋值已折叠为 t(·)",
      validate: ({ value }) => equal(value, semanticAssignmentXToB) ? pass("新赋值只替换了 x 的去向；y 的去向保持不变。") : fail("新函数图应恰好包含 ⟨x,b⟩ 与原来的 ⟨y,b⟩。")
    },
    {
      id: "check-every-object", branch: "shared", requires: ["open-formula-varies"], next: "forall-semantics", chapter: "第十章 · 模型与语义", title: "让 x 轮流指向每个对象",
      copy: "量词不会让 x 同时指向许多对象。它保留其他变量，只把 x 依次改指向论域中的每个对象。先展开这两条路径，再分别认识全称与存在。",
      goal: "查看量词如何使用 s[x↦a] 与 s[x↦b]。", tools: [], nodes: [], overview: true, semanticLesson: "quantifier-paths", artifacts: ["domain-enumeration"],
      hint: "全称要求两条路径全部成立；存在只需要其中一条路径提供见证。",
      definition: ["量词改变变量赋值", `<p>对每个 d∈D 考察 φ，不是把 d 直接塞进公式文本，而是使用只更新 x 的赋值 s[x↦d]。</p><code>d=a：𝔐,s[x↦a]⊨φ<br>d=b：𝔐,s[x↦b]⊨φ</code>`],
      unlock: "量词的逐对象路径已经展开",
      validate: () => pass("量词通过赋值更新让 x 依次指向论域对象。")
    },
    {
      id: "forall-semantics", branch: "shared", requires: ["check-every-object"], next: "exists-semantics", chapter: "第十章 · 模型与语义", title: "让每一次检查都通过",
      copy: "∀xP(x) 要求论域中的每个对象都让 P(x) 成立。当前 Pᴹ={a} 漏掉了 b；重新安排 P 的解释，让两条赋值路径都有对应对象。",
      goal: "构造使 ∀xP(x) 成立的新解释 Pᴹ={a,b}。", tools: ["set2"], artifacts: ["universal-satisfaction"], semanticWorkbench: "forall",
      modelFrame: { x: 620, y: 65, width: 390, height: 350, label: "∀xP(x) 的两条路径", detail: "x↦a 需要 a∈Pᴹ　　x↦b 需要 b∈Pᴹ" },
      spawnPositions: [{ x: 330, y: 220 }],
      nodes: [fixed("forall-a", "论域对象", "a", "set", 45, 145, "a"), fixed("forall-b", "论域对象", "b", "set", 45, 330, "b"), semanticGoal("goal", "P 必须适用于每个对象", "Pᴹ", "P 适用的全部对象", 535, 220)],
      hint: "用二元素集把 a、b 都收进 Pᴹ。这里没有把两个真假接入合取；“每个对象都通过”本身就是 ∀ 的语义。",
      definition: ["全称量词的满足条件", `<p>∀xφ 在 𝔐、s 下成立，当且仅当论域中每个对象 d 都让更新后的 φ 成立。</p><code>𝔐,s⊨∀xφ ⇔ 对每个 d∈D，𝔐,s[x↦d]⊨φ</code><p>有限论域让我们能把路径全部画出来，但 ∀ 的意义是“每个对象”，不是一个合取电路。</p>`],
      unlock: "全称量词的语义已经定义",
      validate: ({ value, nodes }) => equal(value, semanticPAll) && nodes.some((node) => node.type === "set2")
        ? pass("新的 Pᴹ 同时包含 a、b；无论 x 指向论域中的哪个对象，P(x) 都成立，所以 𝔐⊨∀xP(x)。")
        : fail("∀ 要求覆盖论域中的每个对象；新的 Pᴹ 必须同时包含 a 与 b。")
    },
    {
      id: "exists-semantics", branch: "shared", requires: ["forall-semantics"], next: "free-variable-survives", chapter: "第十章 · 模型与语义", title: "找到一个见证就够了",
      copy: "把 Pᴹ 恢复为 {a}。∃xP(x) 不要求覆盖每条路径；你只需从论域中选出一个确实让 P(x) 成立的对象。",
      goal: "从 a、b 中选出 ∃xP(x) 的见证。", tools: [], artifacts: ["existential-satisfaction"], semanticWorkbench: "exists",
      modelFrame: { x: 610, y: 72, width: 385, height: 340, label: "寻找见证", detail: "Pᴹ={a}　选择一个 P 确实适用的论域对象" },
      nodes: [fixed("exists-a", "候选对象", "a", "set", 65, 150, "a"), fixed("exists-b", "候选对象", "b", "set", 65, 330, "b"), semanticValueGoal("goal", "∃xP(x) 的见证", "见证 d", "使 P(x) 成立的对象", 500, 220)],
      hint: "Pᴹ={a} 已经明确记录 P 适用于谁。选择其中的对象作为见证，不需要先枚举所有真假。",
      definition: ["存在量词的满足条件", `<p>∃xφ 在 𝔐、s 下成立，当且仅当论域中至少有一个对象 d 让更新后的 φ 成立。</p><code>𝔐,s⊨∃xφ ⇔ 存在 d∈D，使 𝔐,s[x↦d]⊨φ</code><p>这样的 d 叫作这个存在公式的<b>见证</b>。</p>`],
      unlock: "存在量词与见证的语义已经定义",
      validate: ({ value }) => equal(value, "a")
        ? pass("a∈Pᴹ，所以取 s[x↦a] 时 P(x) 成立；a 就是 ∃xP(x) 的见证。存在量词不要求再检查并汇总其他对象。")
        : fail("所选对象必须确实在 Pᴹ={a} 中；b 不能见证 P(x)。")
    },
    {
      id: "free-variable-survives", branch: "shared", requires: ["exists-semantics"], next: "sentence-independence", alternateNext: "coincidence-example", alternateLabel: "进入变量与绑定支线", chapter: "第十章 · 模型与语义", title: "量词没有改动 y",
      copy: "在 ∀xR(x,y) 中，x 轮流指向 a、b，但自由变量 y 始终指向 a。把两次需要的有序对收成 R 的解释，清楚保留那个没有被量词改动的位置。",
      goal: "构造 Rᴹ={⟨a,a⟩,⟨b,a⟩}，使当前赋值下的 ∀xR(x,y) 成立。", tools: ["ord", "set2"], artifacts: ["partial-binding-semantics"], semanticWorkbench: "free-variable",
      modelFrame: { x: 650, y: 62, width: 370, height: 355, label: "x 改变，y 保持", detail: "x↦a 时寻找 ⟨a,a⟩　x↦b 时寻找 ⟨b,a⟩" },
      spawnPositions: [{ x: 240, y: 95 }, { x: 240, y: 340 }, { x: 430, y: 220 }],
      nodes: [fixed("free-a", "y 的固定值；也是 x 的第一种值", "a", "set", 35, 150, "a"), fixed("free-b", "x 的第二种值", "b", "set", 35, 335, "b"), semanticGoal("goal", "让两种 x 都与固定的 y 具有 R", "Rᴹ", "R 适用的全部对象对", 605, 220)],
      hint: "分别构造 ⟨a,a⟩ 与 ⟨b,a⟩，再收进二元素集。两个有序对的第二项都必须是 y 的固定值 a。",
      definition: ["部分绑定的语义", `<p>在 ∀xR(x,y) 中，量词只更新 x。自由变量 y 始终保留初始赋值 s(y) 的值。</p><code>对每个 d∈D，检查 ⟨d,s(y)⟩∈Rᴹ</code><p>因此这条开公式仍可能随着 y 的值改变真假。</p>`],
      unlock: "已经看见量词更新与自由变量保留同时发生",
      validate: ({ value, nodes }) => equal(value, semanticColumnRelation) && nodes.filter((node) => node.type === "ord").length >= 2 && nodes.some((node) => node.type === "set2")
        ? pass("x 轮流取 a、b 时，两个有序对的第二项始终是 y 所指的 a；∀x 只接管了 x，自由变量 y 保留下来。")
        : fail("需要两条边 ⟨a,a⟩、⟨b,a⟩；第二个位置始终保留 y 的值 a。")
    },
    {
      id: "coincidence-example", branch: "variable-hygiene", requires: ["free-variable-survives"], next: "coincidence-lemma", chapter: "变量与绑定", title: "只改了无关的变量",
      copy: "模型、关系与公式都保持不变。s、t 对 x 的初始安排不同，却对 y 作出相同安排。分别找出公式 ∀xR(x,y) 还会从两份初始赋值中读取什么。",
      goal: "分别把公式在 s、t 下仍需读取的对象接入两条求值通道。", tools: ["assignmentS", "assignmentT"], artifacts: ["coincidence-example"], semanticWorkbench: "coincidence", multiGoals: ["coincidence-s-goal", "coincidence-t-goal"],
      spawnPositions: [{ x: 255, y: 105 }, { x: 255, y: 340 }],
      nodes: [fixed("coincidence-x", "变量 x", "x", "object", 35, 145, "x"), fixed("coincidence-y", "变量 y", "y", "object", 35, 335, "y"), semanticValueGoal("coincidence-s-goal", "赋值 s 下的公式", "∀xR(x,□)　[s]", "仍由初始赋值提供的对象", 500, 125), semanticValueGoal("coincidence-t-goal", "赋值 t 下的公式", "∀xR(x,□)　[t]", "仍由初始赋值提供的对象", 500, 335)],
      hint: "先看量词绑定了哪个变量。把另一个变量分别送入 s(·)、t(·)，再把所得对象接到相应通道。",
      definition: ["先观察合同现象", `<p>s(x)=a、t(x)=b，但 s(y)=t(y)=b。公式 ∀xR(x,y) 的 x 已被量词绑定，只有 y 仍从初始赋值读取。</p><code>s与t在自由变量y上相同<br>𝔐,s⊨∀xR(x,y) ⇔ 𝔐,t⊨∀xR(x,y)</code>`],
      unlock: "已经观察到：改变非自由变量不影响公式真假",
      validate: ({ values, nodes, connections }) => {
        const readsVariable = (goalId, assignmentType, sourceId) => {
          const intoGoal = connections.find((connection) => connection.to === goalId && connection.input === 0);
          const assignment = intoGoal && nodes.find((node) => node.id === intoGoal.from && node.type === assignmentType);
          const intoAssignment = assignment && connections.find((connection) => connection.to === assignment.id && connection.input === 0);
          return Boolean(intoAssignment && intoAssignment.from === sourceId);
        };
        const correct = equal(values["coincidence-s-goal"], "b") && equal(values["coincidence-t-goal"], "b")
          && readsVariable("coincidence-s-goal", "assignmentS", "coincidence-y")
          && readsVariable("coincidence-t-goal", "assignmentT", "coincidence-y");
        return correct
          ? pass("s、t 虽然在 x 上不同，却都为自由变量 y 提供 b；∀x 会覆盖原来的 x，因此同一个模型给出相同的满足判断。")
          : fail("这条公式不会向初始赋值读取被 ∀x 接管的 x；找出仍然自由的变量，并分别查看 s、t 为它指定的对象。");
      }
    },
    {
      id: "coincidence-lemma", branch: "variable-hygiene", requires: ["coincidence-example"], next: "sentence-independence", chapter: "变量与绑定", title: "公式只读取自由变量",
      copy: "刚才的现象对所有一阶公式都成立。先完整查看合同引理及其依赖图；一般证明需要对公式树作结构归纳，将在相应工具解锁后补上。",
      goal: "查看合同引理的陈述，并返回模型与语义主线。", tools: [], nodes: [], overview: true, semanticLesson: "coincidence-lemma", artifacts: ["coincidence-lemma-statement"],
      hint: "公式只会从初始赋值读取自由变量；绑定变量由自己的量词接管。",
      definition: ["合同引理", `<p>若两个赋值 s、t 在公式 φ 的所有自由变量上取值相同，则它们不会改变 φ 在同一模型中的真假。</p><code>s｜FV(φ)=t｜FV(φ)<br>⇒ (𝔐,s⊨φ ⇔ 𝔐,t⊨φ)</code><p>这里只获得并使用结论；它的结构归纳证明留到元理论。</p>`],
      unlock: "合同引理的陈述",
      validate: () => pass("公式的语义依赖已经缩减到它的自由变量。")
    },
    {
      id: "sentence-independence", branch: "shared", requires: ["free-variable-survives"], next: "build-satisfying-model", chapter: "第十章 · 模型与语义", title: "句子接管了所有变量",
      copy: "在 ∀x∃yR(x,y) 中，x、y 都被量词接管。初始赋值无论把它们指向哪里，求值时都会被量词自己的更新覆盖。",
      goal: "查看句子为什么不再依赖初始变量赋值。", tools: [], nodes: [], overview: true, semanticLesson: "closed-sentence", artifacts: ["sentence-satisfaction"],
      hint: "先由 ∀x 轮换 x，再由 ∃y 为当前 x 寻找见证；初始 s 中的 x、y 都不会保留下来。",
      definition: ["句子的真假", `<p>句子没有自由变量。∀x∃yR(x,y) 先让 x 遍历论域，再为每个 x 寻找某个 y；初始赋值中的 x、y 都会被量词接管。</p><code>𝔐⊨∀x∃yR(x,y)</code><p>对句子可以省略变量赋值，直接说模型 𝔐 满足它。</p>`],
      unlock: "句子的真假只由模型决定",
      validate: () => pass("x、y 都由量词接管，因此可以写作 𝔐⊨∀x∃yR(x,y)，省略初始变量赋值。")
    },
    {
      id: "build-satisfying-model", branch: "shared", requires: ["sentence-independence"], next: "substitute-all-free", chapter: "第十章 · 模型与语义", title: "为一句话造出世界",
      copy: "现在反过来工作：句子 ∀x∃yR(x,y) 已经给定。选择 R 的有序边，使论域中的每个对象至少拥有一个 R 后继。",
      goal: "构造一个使 ∀x∃yR(x,y) 成立的 Rᴹ⊆D×D。", tools: ["ord", "set2"], artifacts: ["satisfying-model"], semanticWorkbench: "model-build",
      spawnPositions: [{ x: 240, y: 95 }, { x: 240, y: 340 }, { x: 430, y: 220 }],
      nodes: [fixed("final-domain-a", "论域成员", "a", "set", 35, 115, "a"), fixed("final-domain-b", "论域成员", "b", "set", 35, 330, "b"), fixed("final-sentence", "需要成立的句子", F.forall(F.variable, F.exists(variableY, relationRFormula)), "formula", 35, 445, "∀x∃yR(x,y)"), goal("set", 605, 220)],
      hint: "至少造两条边：一条以 a 为第一项，一条以 b 为第一项；它们的第二项可以相同。",
      definition: ["构造满足公式的模型", `<p>模型求值从模型和公式得到真假；模型构造则反过来，根据公式安排解释。</p><code>目标：为每个 x∈D，找到某个 y∈D，使 ⟨x,y⟩∈Rᴹ</code><p>满足条件的关系不止一个。语义关心结构是否满足句子，而不是是否猜中唯一答案。</p>`],
      unlock: "第一个由你为指定句子构造的模型已经完成",
      completionLesson: `<span class="eyebrow">模型与语义章完成</span><h3>公式现在能在一个世界中获得真假</h3><p>你已经构造了论域、谓词解释、关系解释与变量赋值，并从原子公式一路展开到全称量词和存在量词。</p><code>𝔐,s⊨φ　　𝔐⊨σ</code><p class="layer-note">最后，你不再被动计算真假，而是主动构造了一个满足给定句子的模型。</p>`,
      validate: ({ value }) => {
        try {
          if (!Array.isArray(value) || value.some((edge) => {
            const [left, right] = decodeOrderedPair(edge);
            return !contains(semanticDomain, left) || !contains(semanticDomain, right);
          })) return fail("Rᴹ 必须只包含 D×D 中的有序边。");
          const starts = value.map((edge) => decodeOrderedPair(edge)[0]);
          return semanticDomain.every((object) => contains(starts, object))
            ? pass("a、b 都至少拥有一条从自己出发的 R 边，因此这个模型满足 ∀x∃yR(x,y)。")
            : fail("仍有一个论域对象没有任何从它出发的 R 边。");
        } catch (_) { return fail("目标必须是一组合法有序边组成的关系。"); }
      }
    },
    {
      id: "substitute-all-free", branch: "shared", requires: ["build-satisfying-model"], next: "capture-experiment", chapter: "第十一章 · 代入与易字", title: "先从简单换字开始",
      copy: "暂时不定义正式的公式代入。先使用一个朴素操作：把公式中写作 x 的位置全部换成 y。没有量词时，这件事看起来毫无危险。",
      goal: "在 R(x,x) 中逐字把 x 全部换成 y，得到 R(y,y)。", tools: [], nodes: [], formulaSurgery: "all-free", surgeryTokens: ["y"], artifacts: ["literal-replacement"],
      hint: "先选择 y，再点击任意一个带虚线边框的 x；也可以直接把 y 拖过去。",
      openingLesson: ["先做一个朴素操作", `<p>现在只有“把名字 x 全部换成 y”的逐字换字，还没有定义数学上的公式代入。</p><code>R(x,x)　⟶　R(y,y)</code><p>等量词出现以后，我们会发现这个操作需要增加保护条件。</p>`],
      definition: ["逐字换字", `<p>逐字换字只按照变量名字修改公式树，目前还不会主动避免捕获。</p><code>R(x,x)　⟶　R(y,y)</code>`],
      unlock: "朴素的逐字换字操作",
      validate: ({ value }) => value.token === "y" && value.target === "free-x"
        ? pass("两个位置都写作 x，因此朴素换字同时把它们改成 y；在没有量词时还看不出危险。")
        : fail("选择 y，并把它放到公式树中的 x 上。")
    },
    {
      id: "capture-experiment", branch: "shared", requires: ["substitute-all-free"], next: "fresh-alpha-renaming", chapter: "第十一章 · 代入与易字", title: "新名字落进了量词",
      copy: "继续使用刚才的朴素换字：在 ∀yR(x,y) 中把 x 换成 y。操作会正常完成，但新放进去的 y 正好落入已有的 ∀y 辖域。",
      goal: "逐字把自由的 x 换成 y，观察生成的 y 为什么不再自由。", tools: [], nodes: [], formulaSurgery: "capture", surgeryTokens: ["y"], artifacts: ["variable-capture"],
      hint: "选择 y，再点击 R 中自由的 x。",
      definition: ["变量捕获", `<p>把 y 放入 ∀y 的辖域后，这个新 y 会被已有量词接管。</p><code>∀yR(x,y)　⟶　∀yR(y,y)</code><p>自由变量从 {x} 变成 ∅，所以这次逐字换字没有保留原来的依赖。</p>`],
      unlock: "变量捕获及其可见后果",
      validate: ({ value }) => value.token === "y" && value.target === "free-x"
        ? pass("新放入的 y 落进已有的 ∀y 辖域：自由变量从 {x} 变成 ∅，固定模型中的结果也从真变成假。")
        : fail("把 y 放到 R 的第一个位置中自由的 x 上。")
    },
    {
      id: "fresh-alpha-renaming", branch: "shared", requires: ["capture-experiment"], next: "capture-free-substitution", chapter: "第十一章 · 代入与易字", title: "先把挡路的名字搬开",
      copy: "我们仍想在 ∀yR(x,y) 中把 x 换成 y。既然内部的 ∀y 会捕获新名字，就先选一个不会吞掉自由变量的新名字，改写量词及其绑定叶子。",
      goal: "把 ∀yR(x,y) 安全易字，为随后的 x→y 腾出名字 y。", tools: [], nodes: [], formulaSurgery: "freshen", surgeryTokens: ["x", "y", "z"], artifacts: ["alpha-renaming"],
      hint: "x 在辖域中自由出现，y 已经被使用；选择原公式中没有出现的新名字。",
      openingLesson: ["一个尚未使用的变量名", `<p>变量符号不止 x、y。这里引入同类的新变量名 <b>z</b>。</p><code>z</code><p>当 z 没有出现在当前公式中时，它可以作为新鲜名字，替换量词的绑定变量而不捕获任何自由位置。</p>`],
      definition: ["安全易字", `<p>绑定变量可以一致改名，但新名字不能捕获辖域中原本自由的变量。</p><code>∀yR(x,y) ≡α ∀zR(x,z)</code><p>易字同时修改量词名字及原来受它绑定的变量叶子。</p>`],
      unlock: "有实际用途的安全易字；新变量名 z",
      validate: ({ value }) => value.token === "z" && value.target === "binder"
        ? pass("绑定的 y 已一致换成新鲜的 z，自由变量仍是 {x}；名字 y 现在可以安全地用于下一步换字。")
        : value.token === "x" && value.target === "binder"
          ? fail("x 原本在 R 的第一个位置自由出现；用 x 给量词易字会把它捕获。")
          : fail("需要选择未在原公式中使用的新名字 z。")
    },
    {
      id: "capture-free-substitution", branch: "shared", requires: ["fresh-alpha-renaming"], next: "forge-formula-substitution", chapter: "第十一章 · 代入与易字", title: "完成原来的换字",
      copy: "上一关已经把挡路的绑定变量改成 z。现在再执行最初想做的逐字换字，新的 y 就不会落进任何 ∀y 的辖域。",
      goal: "在 ∀zR(x,z) 中逐字把 x 换成 y，得到 ∀zR(y,z)。", tools: [], nodes: [], formulaSurgery: "safe-substitute", surgeryTokens: ["y"], artifacts: ["manual-capture-avoidance"],
      hint: "z 继续由 ∀z 接管；这一次只需要修改 R 第一个位置中的 x。",
      definition: ["手工避免捕获", `<p>朴素换字可能把新变量送进同名量词；解决办法是先把冲突的绑定变量安全易字，再完成换字。</p><code>∀yR(x,y) ≡α ∀zR(x,z)<br>∀zR(x,z)　⟶　∀zR(y,z)</code>`],
      unlock: "手工完成的一次无捕获换字流程",
      validate: ({ value }) => value.token === "y" && value.target === "free-x"
        ? pass("结果是 ∀zR(y,z)：z 仍被绑定，新的 y 保持自由；现在可以把这套保护方法总结成正式操作。")
        : fail("把 y 放到 x 上；不要改动已经由 ∀z 接管的 z。")
    },
    {
      id: "forge-formula-substitution", branch: "shared", requires: ["capture-free-substitution"], next: "apply-formula-substitution", chapter: "第十一章 · 代入与易字", title: "为量词安排三种出口",
      copy: "公式代入沿公式树前进，迟早会遇到量词。此时不能一律停下，也不能一律进入辖域：量词绑定的名字不同，下一步就不同。",
      goal: "观察三个具体公式，把三种处理动作分别送到合适的量词边界。", tools: [], nodes: [], formulaSurgery: "forge-substitution", surgeryTokens: [], artifacts: ["formula-substitution"],
      hint: "先看量词绑定谁：它可能正好绑定目标 x，也可能与 x、y 都无关，还可能绑定即将放入的 y。",
      definition: ["量词处的公式代入", `<p>把 y 代入 x 时，遇到量词要按它绑定的名字选择下一步。</p><code>绑定 x：保留整个量词公式<br>与 x、y 都无关：进入辖域继续<br>绑定 y：先安全易字，再进入辖域</code>`],
      unlock: "正式的无捕获公式代入 φ[t/x]",
      validate: ({ value }) => value.routes["same-binder"] === "preserve" && value.routes["safe-binder"] === "descend" && value.routes["capture-binder"] === "rename-descend"
        ? pass("三个出口组成了正式代入：它只处理自由出现的目标，并在新变量可能被捕获时先安全易字。")
        : fail("还有量词边界没有得到恰当处理。查看每张卡片显示的结果，再调整动作。")
    },
    {
      id: "apply-formula-substitution", branch: "shared", requires: ["forge-formula-substitution"], next: "forge-forall-elim", chapter: "第十一章 · 代入与易字", title: "新的代入只处理自由出现",
      copy: "现在才正式使用 φ[t/x]。把 y 送入刚刚构造的代入操作；它会沿公式树寻找自由的 x，并在遇到重新绑定 x 的量词时保留整棵辖域。",
      goal: "运行 (P(x)∧∀xQ(x))[y/x]，得到 P(y)∧∀xQ(x)。", tools: [], nodes: [], formulaSurgery: "formal-substitution", surgeryTokens: ["y"], artifacts: ["free-occurrence-substitution"],
      hint: "选择 y，再把它放入中间的 [□/x] 操作槽。",
      definition: ["公式代入的第一次运行", `<p>正式代入沿公式结构工作，只替换自由出现的目标变量。</p><code>(P(x)∧∀xQ(x))[y/x]=P(y)∧∀xQ(x)</code><p>进入 ∀xQ(x) 时，x 已被这里的量词重新绑定，因此该辖域保持不动。</p>`],
      unlock: "量词推理可以使用的代入操作",
      completionLesson: `<span class="eyebrow">代入与易字</span><h3>正式代入已经构造完成</h3><code>φ[t/x]：只替换自由出现的 x，并自动避免捕获</code><p class="layer-note">接下来的量词规则可以准确地说“把项 t 代入公式”，而不再把绑定问题藏在记号里。</p>`,
      validate: ({ value }) => value.token === "y" && value.target === "substitution-slot"
        ? pass("代入只把 P(x) 的自由入口改成 y；进入 ∀xQ(x) 时停止，因此量词与它的绑定变量保持完整。")
        : fail("把 y 送入中间的正式代入操作，而不是直接修改公式树的某片叶子。")
    },
    {
      id: "forge-forall-elim", branch: "shared", requires: ["apply-formula-substitution"], next: "apply-forall-elim", chapter: "第十二章 · 量词推理", title: "从全称公式拆出一个实例",
      copy: "先不要使用任何量词推理零件。用已有的变量、谓词、量词和公式代入，分别构造横线上方的 ∀xP(x) 与下方的 P(y)。如果下方恰好是全称公式辖域对 y 的代入实例，这条横线才获得名字。",
      goal: "构造推理横线 ∀xP(x) / P(y)，构造全称消去规则。", tools: ["varx", "vary", "predP", "forall", "formulaSubstitution"], ruleFrames: [{ premises: ["forall-forge-premise"], conclusion: "forall-forge-conclusion", label: "尚未命名的量词推理" }], ruleForge: true, artifacts: ["forall-elim-rule"],
      spawnPositions: [{ x: 40, y: 85 }, { x: 40, y: 345 }, { x: 215, y: 190 }, { x: 405, y: 85 }, { x: 405, y: 330 }],
      nodes: [ruleSlot("forall-forge-premise", "横线上方：已有公式", "premise", 700, 85), ruleSlot("forall-forge-conclusion", "横线下方：新公式", "conclusion", 700, 330)],
      hint: "先用 x 构造 P(x)。一路把 x、P(x) 接入 ∀，另一路把 P(x)、x、y 接入公式代入；再把两个结果分别送到横线上下。",
      definition: ["等待构造的全称规则", `<p>这一关还没有 ∀E 零件。你正在检查一种公式形状之间是否允许推理。</p><code>上方：∀xP(x)<br>下方：P(x)[y/x]</code>`],
      unlock: "全称消去规则 ∀E",
      validate: ({ value, nodes, connections }) => {
        const conclusionLink = connections.find((connection) => connection.to === "forall-forge-conclusion" && connection.input === 0);
        const conclusionNode = conclusionLink && nodes.find((node) => node.id === conclusionLink.from);
        return value && value.kind === "rule" && value.premises.length === 1 && equalFormula(value.premises[0], universalP)
          && equalFormula(value.conclusion, py) && conclusionNode && conclusionNode.type === "formulaSubstitution"
          ? pass("横线下方的 P(y) 正是 P(x)[y/x]；这条由全称公式取得代入实例的推理现在被命名为 ∀E。")
          : fail("横线上方应是自己构造的 ∀xP(x)；下方必须由公式代入 P(x)[y/x] 构造出 P(y)。");
      }
    },
    {
      id: "apply-forall-elim", branch: "shared", requires: ["forge-forall-elim"], next: "forge-exists-intro", chapter: "第十二章 · 量词推理", title: "让一个全称前提服务两个名字",
      copy: "现在 ∀E 才进入零件架。让同一份全称证明分别经过 y、z 两个名字，再把得到的两个实例合在一起。",
      goal: "从 ∀xP(x) 推导 P(y)∧P(z)。", tools: ["vary", "varz", "forallElim", "andIntro"], proofViews: true, fitchView: true, artifacts: ["forall-elim-application"],
      spawnPositions: [{ x: 205, y: 70 }, { x: 205, y: 350 }, { x: 390, y: 70 }, { x: 390, y: 350 }, { x: 650, y: 210 }],
      nodes: [fixed("forall-elim-source", "来自 Γ", proofObject("given", universalP, [universalP]), "proof", 20, 210, "∀xP(x)"), goal("proof", 875, 210)],
      hint: "放置两次 ∀E。全称证明都接入第一个端口，y、z 分别接入第二个端口；最后用 ∧I 合并。",
      definition: ["全称消去的应用", `<p>∀E 接收一份全称证明和一个项，输出相应的公式代入实例。</p><code>∀xA(x)<br>────── ∀E<br>A(t)</code>`],
      unlock: "能够反复使用的全称消去",
      validate: ({ value }) => value && value.kind === "proof" && equalFormula(value.conclusion, F.and(py, pz))
        && countProofRule(value, "forallElim") === 2 && proofUsesRule(value, "andIntro")
        ? pass("同一个 ∀xP(x) 分别给出了 P(y)、P(z)，两个实例又被 ∧I 合成同一个结论。")
        : fail("分别用 y、z 对同一个全称前提应用 ∀E，再按 P(y)、P(z) 的顺序合并。")
    },
    {
      id: "forge-exists-intro", branch: "shared", requires: ["apply-forall-elim"], next: "apply-exists-intro", chapter: "第十二章 · 量词推理", title: "从一个实例收起见证",
      copy: "暂时不要使用 ∃I。再次从同一个 P(x) 出发：公式代入产生横线上方的 P(y)，存在量词产生下方的 ∃xP(x)。这里 y 是实例使用的自由名字；被绑定后统一改用 x 书写。",
      goal: "构造推理横线 P(y) / ∃xP(x)，构造存在引入规则。", tools: ["varx", "vary", "predP", "exists", "formulaSubstitution"], ruleFrames: [{ premises: ["exists-forge-premise"], conclusion: "exists-forge-conclusion", label: "尚未命名的量词推理" }], ruleForge: true, artifacts: ["exists-intro-rule"],
      spawnPositions: [{ x: 40, y: 85 }, { x: 40, y: 345 }, { x: 215, y: 190 }, { x: 405, y: 330 }, { x: 405, y: 85 }],
      nodes: [ruleSlot("exists-forge-premise", "横线上方：已有实例", "premise", 700, 85), ruleSlot("exists-forge-conclusion", "横线下方：存在公式", "conclusion", 700, 330)],
      hint: "用 x 构造 P(x)。把 P(x)、x、y 送入公式代入得到 P(y)，放在线上；把 x、P(x) 送入 ∃ 得到 ∃xP(x)，放在线下。",
      definition: ["等待构造的存在规则", `<p>这一关还没有 ∃I 零件。你正在检查一个具体实例是否足以支持相应的存在式。</p><code>上方：P(x)[y/x]<br>下方：∃xP(x)</code><p>实例中的 y 被绑定并收回以后，结论统一用 x 书写；写成 ∃yP(y) 只差一次安全的绑定变量易字。</p>`],
      unlock: "存在引入规则 ∃I",
      validate: ({ value, nodes, connections }) => {
        const premiseLink = connections.find((connection) => connection.to === "exists-forge-premise" && connection.input === 0);
        const premiseNode = premiseLink && nodes.find((node) => node.id === premiseLink.from);
        const conclusionLink = connections.find((connection) => connection.to === "exists-forge-conclusion" && connection.input === 0);
        const conclusionNode = conclusionLink && nodes.find((node) => node.id === conclusionLink.from);
        return value && value.kind === "rule" && value.premises.length === 1 && equalFormula(value.premises[0], py)
          && equalFormula(value.conclusion, existentialP) && premiseNode && premiseNode.type === "formulaSubstitution" && conclusionNode && conclusionNode.type === "exists"
          ? pass("P(y) 是 P(x) 的具体实例，因此足以支持 ∃xP(x)；这条收起见证的推理被命名为 ∃I。")
          : fail("横线上方必须由 P(x)[y/x] 构造 P(y)，下方必须用存在量词构造 ∃xP(x)。");
      }
    },
    {
      id: "apply-exists-intro", branch: "shared", requires: ["forge-exists-intro"], next: "counterexample-arbitrary-name", chapter: "第十二章 · 量词推理", title: "把两个具体事实藏起来",
      copy: "现在 ∃I 才进入零件架。先从合取中取出两个关于 y 的事实，再分别隐藏见证名字，最后把两个存在结论合在一起。",
      goal: "从 P(y)∧Q(y) 推导 ∃xP(x)∧∃xQ(x)。", tools: ["vary", "andElim1", "andElim2", "existsIntro", "andIntro"], proofViews: true, fitchView: true, artifacts: ["exists-intro-application"],
      spawnPositions: [{ x: 215, y: 210 }, { x: 390, y: 75 }, { x: 390, y: 345 }, { x: 565, y: 75 }, { x: 565, y: 345 }, { x: 755, y: 210 }],
      nodes: [fixed("exists-intro-source", "来自 Γ", proofObject("given", F.and(py, qy), [F.and(py, qy)]), "proof", 20, 210, "P(y)∧Q(y)"), goal("proof", 940, 210)],
      hint: "用 ∧E₁、∧E₂ 取出 P(y)、Q(y)；把 y 接到两次 ∃I 的见证端口，最后合并两个存在式。",
      definition: ["存在引入的应用", `<p>∃I 把实例中使用的见证名字绑定起来；外部只留下“至少有一个”。实例名字 y 被收回后，结论中的绑定变量统一写作 x；写作 y 也只差安全易字。</p><code>A(t)<br>────── ∃I<br>∃xA(x)</code>`],
      unlock: "能够反复使用的存在引入",
      validate: ({ value }) => value && value.kind === "proof" && equalFormula(value.conclusion, F.and(existentialP, existentialQ))
        && countProofRule(value, "existsIntro") === 2 && proofUsesRule(value, "andElim1") && proofUsesRule(value, "andElim2")
        ? pass("P(y)、Q(y) 分别证明了两个存在式；∃I 隐藏见证后，两个结论由 ∧I 合在一起。")
        : fail("先分别取得 P(y)、Q(y)，各自使用一次 ∃I 隐藏 y，再按两个存在式的顺序合并。")
    },
    {
      id: "counterexample-arbitrary-name", branch: "shared", requires: ["apply-exists-intro"], next: "forge-forall-flag", chapter: "第十二章 · 量词推理", title: "一个名字不代表所有对象",
      copy: "固定世界中只有杯子满足 P。让普通变量 y 指向杯子，就能使 P(y) 成立；但盘子仍不满足 P，所以 ∀xP(x) 依然不成立。",
      goal: "构造 s={⟨y,杯子⟩}，同时观察 P(y) 与 ∀xP(x) 的真假。", tools: ["ord", "set1"], semanticWorkbench: "forall-flag-counterexample", artifacts: ["need-arbitrary-flag"],
      spawnPositions: [{ x: 245, y: 220 }, { x: 455, y: 220 }],
      nodes: [
        fixed("arbitrary-counterexample-y", "普通变量名字", "y", "object", 35, 125, "y"),
        fixed("arbitrary-counterexample-cup", "论域对象", "杯子", "object", 35, 325, "杯子"),
        semanticGoal("goal", "变量赋值 s", "y↦杯子", "s 的函数图", 680, 220)
      ],
      hint: "先构造有序对 ⟨y,杯子⟩，再把它收进单元素集，成为变量赋值 s。观察台会比较 P(y) 和 ∀xP(x)。",
      definition: ["普通名字不具有任意性", `<p>P(y) 只检查当前赋值为 y 指定的那个对象；∀xP(x) 则要求论域中的每个对象都满足 P。</p><code>P(y) ⊬ ∀xP(x)</code><p>因此，全称推理需要一个不由当前赋值或外部前提指定的任意名字。</p>`],
      unlock: "已经发现全称 flag 的必要性",
      validate: ({ value }) => equal(value, set(orderedPair("y", "杯子")))
        ? pass("s(y)=杯子，所以 P(y) 为真；但盘子不在 Pᴹ 中，∀xP(x) 为假。普通变量 y 只代表当前指向的一个对象，不能代表任意对象。")
        : fail("变量赋值应当只记录 y↦杯子；让 P(y) 成立，再与仍然为假的 ∀xP(x) 对照。")
    },
    {
      id: "forge-forall-flag", branch: "shared", requires: ["counterexample-arbitrary-name"], next: "apply-forall-flag", chapter: "第十二章 · 量词推理", title: "插下第一面全称旗",
      copy: "全称引入需要一个没有被外部前提指定的新名字。Γ 中故意放着 Q(y)，所以 y 已带有外部信息；请找出真正新鲜的名字，在旗内完成一段不依赖对象身份的证明。",
      goal: "选择可作为任意对象的名字，在旗内证明 P→P，再关闭 flag 得到 ∀x(P(x)→P(x))。", tools: ["vary", "varz", "predP"], proofViews: true, fitchView: true, artifacts: ["forall-flag", "forall-intro-rule"], toolScope: "forall-flag-scope",
      spawnPositions: [{ x: 285, y: 75 }, { x: 285, y: 325 }, { x: 430, y: 135 }],
      nodes: [
        fixed("forall-flag-context", "外部前提中已有", proofObject("given", qy, [qy]), "proof", 20, 55, "Q(y)"),
        arbitraryFlagNode("forall-flag-start", "forall-flag-scope", 210, 185, ["forall-flag-context"]),
        scopeAssumptionNode("forall-flag-assumption", "forall-flag-inner", 455, 145),
        scopeDischargeNode("forall-flag-imp", "forall-flag-inner", 620, 245),
        forallIntroNode("forall-flag-close", "forall-flag-scope", 785, 245),
        goal("proof", 955, 245)
      ],
      scopeFrames: [
        { id: "forall-flag-scope", flagKind: "universal", flagNode: "forall-flag-start", label: "⚑ 任意 □", contextNote: "先检查外部 Γ：Q(y) 已经占用名字 y", x: 190, y: 35, width: 750, height: 410, discharge: true, boundaryLabel: "∀I", boundaryCopy: "收回任意名字；绑定变量统一写作 x" },
        { id: "forall-flag-inner", label: "假设 P，只为构造 P→P", x: 430, y: 105, width: 330, height: 235, discharge: true, boundaryLabel: "→I", boundaryCopy: "先解除公式假设，再关闭全称旗" }
      ],
      openingLesson: ["全称 flag 不是一个公式", `<p>全称旗只引入一个<strong>没有外部身份的新名字</strong>，不会赠送任何关于它的公式。</p><code>⚑ 任意 z<br>│ 在这里对 z 完成推理<br>└ 关闭时把 z 绑定起来</code><p>如果名字已经自由出现在外部前提中，它就不是任意的。关闭时临时的 z 被收回，结论统一用绑定变量 x 书写。</p>`],
      hint: "y 已出现在 Q(y) 中。把 z 接入全称旗，用旗内的 z 构造 P(z)，假设它并用 →I 解除，最后只把 P(z)→P(z) 接入 ∀I 出口。",
      definition: ["全称旗与 ∀I", `<p>全称旗标记一个任意名字的有效范围。若旗内得到 A(z)，而 z 不自由出现在任何未解除前提中，关闭旗后可得 ∀xA(x)。这里 x 只是统一采用的绑定占位符；写成 ∀zA(z) 只差安全易字。</p><code>⚑ 任意 z<br>│ A(z)<br>└────── ∀I<br> ∀xA(x)</code>`],
      unlock: "全称 flag 与全称引入规则 ∀I",
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "forallIntro" && value.flagName === "z"
        && equalFormula(value.conclusion, quantifiedIdentity) && proofUsesRule(value, "impIntro") && (!value.openScopes || value.openScopes.length === 0)
        ? pass("z 没有从外部获得任何特殊信息；临时假设 P(z) 已先解除，关闭全称旗后得到 ∀x(P(x)→P(x))。")
        : fail("y 已被外部前提使用。选择 z，并确保临时假设 P(z) 先经 →I 解除，再关闭全称旗。")
    },
    {
      id: "apply-forall-flag", branch: "shared", requires: ["forge-forall-flag"], next: "counterexample-fixed-witness", chapter: "第十二章 · 量词推理", title: "把逐个推理收成全称结论",
      copy: "这次不再证明一个恒等式。把两个全称前提都落实到同一个任意名字 y，在旗内推出 Q(y)，再把这段对任意对象都适用的推理收回全称结论。",
      goal: "从 ∀x(P(x)→Q(x))、∀xP(x) 推导 ∀xQ(x)。", tools: ["vary", "forallElim", "impElim"], proofViews: true, fitchView: true, artifacts: ["forall-intro-application"], toolScope: "forall-application-scope",
      spawnPositions: [{ x: 250, y: 220 }, { x: 430, y: 90 }, { x: 430, y: 320 }, { x: 620, y: 205 }],
      nodes: [
        fixed("forall-rule", "来自 Γ", proofObject("given", universalPImpQ, [universalPImpQ]), "proof", 20, 75, "∀x(P(x)→Q(x))"),
        fixed("forall-fact", "来自 Γ", proofObject("given", universalP, [universalP]), "proof", 20, 330, "∀xP(x)"),
        arbitraryFlagNode("forall-apply-start", "forall-application-scope", 195, 205, ["forall-rule", "forall-fact"]),
        forallIntroNode("forall-apply-close", "forall-application-scope", 800, 205),
        goal("proof", 955, 205)
      ],
      scopeFrames: [{ id: "forall-application-scope", flagKind: "universal", flagNode: "forall-apply-start", label: "⚑ 任意 □", x: 175, y: 35, width: 720, height: 410, discharge: true, boundaryLabel: "∀I", boundaryCopy: "把 Q(y) 收成 ∀xQ(x)" }],
      hint: "把 y 插入 flag，并把旗内输出的 y 同时送入两次 ∀E；用 →E 得到 Q(y)，最后只把 Q(y) 接入 ∀I 出口。",
      definition: ["对任意对象的推理", `<p>任意名字可以同时代入所有全称前提。只要最终推理没有假设关于这个名字的特殊前提，就可以用 ∀I 收回全称结论。</p><code>∀x(P(x)→Q(x)), ∀xP(x) ⊢ ∀xQ(x)</code>`],
      unlock: "全称 flag 的完整应用",
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "forallIntro" && equalFormula(value.conclusion, universalQ)
        && countProofRule(value, "forallElim") === 2 && proofUsesRule(value, "impElim")
        ? pass("两个全称前提都作用于同一个任意 y；旗内得到 Q(y)，关闭旗后得到 ∀xQ(x)。")
        : fail("在同一面 flag 内，用同一个 y 实例化两个全称前提，先得到 Q(y)，再关闭全称旗。")
    },
    {
      id: "counterexample-fixed-witness", branch: "shared", requires: ["apply-forall-flag"], next: "forge-exists-flag", chapter: "第十二章 · 量词推理", title: "存在者没有固定姓名",
      copy: "存在式保证某个对象满足 P，却没有把那个对象永久命名为 y。构造两份只在 y 指向上不同的赋值，让存在句保持为真，而开放公式 P(y) 改变真假。",
      goal: "构造 s={⟨y,杯子⟩} 与 t={⟨y,盘子⟩}，展示 ∃xP(x) 不能直接给出 P(y)。", tools: ["ord", "set1"], semanticWorkbench: "existential-counterexample", multiGoals: ["witness-s-goal", "witness-t-goal"], artifacts: ["no-fixed-witness"],
      spawnPositions: [{ x: 245, y: 85 }, { x: 245, y: 335 }, { x: 455, y: 85 }, { x: 455, y: 335 }],
      nodes: [
        fixed("witness-y", "变量名字", "y", "object", 20, 205, "y"),
        fixed("witness-cup", "论域对象", "杯子", "object", 20, 70, "杯子"),
        fixed("witness-plate", "论域对象", "盘子", "object", 20, 350, "盘子"),
        semanticGoal("witness-s-goal", "赋值 s", "y↦杯子", "s 的函数图", 680, 85),
        semanticGoal("witness-t-goal", "赋值 t", "y↦盘子", "t 的函数图", 680, 335)
      ],
      hint: "分别构造有序对 ⟨y,杯子⟩、⟨y,盘子⟩，再各自收进单元素集，成为两份赋值函数图。",
      definition: ["存在式没有指定名字", `<p>∃xP(x) 的真假不读取初始赋值中的 y；P(y) 却会读取它。因此不能从存在式直接推出某个预先写好的 P(y)。</p><code>∃xP(x) ⊬ P(y)</code>`],
      unlock: "存在 flag 的必要性",
      validate: ({ values }) => equal(values["witness-s-goal"], set(orderedPair("y", "杯子"))) && equal(values["witness-t-goal"], set(orderedPair("y", "盘子")))
        ? pass("同一个模型中，∃xP(x) 始终为真，P(y) 却随 y 的指向改变；存在见证不能获得一个预先固定的名字。")
        : fail("左侧赋值只记录 y↦杯子，右侧赋值只记录 y↦盘子；不要把两个有序对装进同一份赋值。")
    },
    {
      id: "forge-exists-flag", branch: "shared", requires: ["counterexample-fixed-witness"], next: "apply-quantifier-rules", chapter: "第十二章 · 量词推理", title: "把见证的名字留在旗内",
      copy: "存在前提只允许我们在旗内把未知见证暂称为 y。外部前提原本谈论的 z 并不是临时名字：若借助见证推出 Q(z)，关闭旗时只需收回 y，Q(z) 可以保留下来。",
      goal: "从 ∃xP(x)、∀x(P(x)→Q(z)) 推导 Q(z)。", tools: ["vary", "forallElim", "impElim"], proofViews: true, fitchView: true, ruleForge: true, artifacts: ["exists-flag", "exists-elim-rule"], toolScope: "exists-flag-scope",
      spawnPositions: [{ x: 245, y: 330 }, { x: 455, y: 130 }, { x: 625, y: 200 }],
      nodes: [
        fixed("exists-flag-source", "来自 Γ", proofObject("given", existentialP, [existentialP]), "proof", 20, 90, "∃xP(x)"),
        fixed("exists-flag-law", "来自 Γ", proofObject("given", universalPImpQz, [universalPImpQz]), "proof", 20, 335, "∀x(P(x)→Q(z))"),
        existsFlagNode("exists-flag-start", "exists-flag-scope", 225, 170),
        existsElimNode("exists-flag-close", "exists-flag-scope", 790, 205),
        goal("proof", 955, 205)
      ],
      scopeFrames: [{ id: "exists-flag-scope", flagKind: "existential", flagNode: "exists-flag-start", label: "⚑ 暂称见证为 □", x: 205, y: 35, width: 680, height: 410, discharge: true, boundaryLabel: "∃E", boundaryCopy: "只有不含见证名字的结论可以离开" }],
      openingLesson: ["存在 flag 由存在证明授权", `<p>把 ∃xA(x) 与一个新名字 y 接入旗杆，旗内会暂时得到 A(y)。关闭旗时，最终结论不能含这个临时名字。</p><code>∃xA(x)<br>⚑ 暂称见证为 y<br>│ A(y)<br>│ ⋮<br>│ C<br>└ C　（C 不含 y）</code>`],
      hint: "把存在前提和 y 接入旗杆，得到 P(y)；再用 y 实例化全称前提，得到 P(y)→Q(z)。用 →E 推出 Q(z)，最后只把这个无关结论接入 ∃E 出口。",
      definition: ["存在旗与 ∃E", `<p>存在旗只在局部子证明中给未知见证一个新名字。若从临时实例 A(y) 得到不含 y 的 C，就可以关闭旗并保留 C。C 可以含有原本就在外部前提中的其他变量。</p><code>∃xA(x)　[A(y)]⋮C<br>──────────────── ∃E<br>C　（C 不含 y）</code>`],
      unlock: "存在 flag 与存在消去规则 ∃E",
      completionLesson: `<span class="eyebrow">存在消去 ∃E</span><h3>临时命名见证，带出无关结论</h3><div class="exists-elim-rule-views"><article class="exists-gentzen-rule"><small>GENTZEN · 证明树</small><div class="exists-gentzen-premises"><code>∃xA(x)</code><span><b>[A(y)]</b><i>⋮</i><code>C</code></span></div><div class="exists-gentzen-bar"><em>∃E</em></div><code class="exists-gentzen-result">C</code></article><article class="exists-fitch-rule"><small>FITCH · 子证明</small><div class="mini-exists-fitch-row"><i>1</i><code>∃xA(x)</code><span>前提</span></div><div class="mini-exists-fitch-scope"><div class="mini-exists-fitch-row assumption"><i>2</i><code>A(y)</code><span>假设·flag</span></div><div class="mini-exists-fitch-row dots"><i>3</i><code>⋮</code><span></span></div><div class="mini-exists-fitch-row"><i>4</i><code>C</code><span></span></div></div><div class="mini-exists-fitch-row result"><i>5</i><code>C</code><span>∃E 1, 2–4</span></div></article></div><p class="exists-elim-side-condition"><b>名字条件：</b>y 必须是新名字，并且不能自由出现在最终结论 C 或旗外尚未解除的前提中。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "existsElim" && equalFormula(value.conclusion, qz)
        && value.flagName === "y" && proofUsesRule(value, "forallElim") && proofUsesRule(value, "impElim") && (!value.openScopes || value.openScopes.length === 0)
        ? pass("临时名字 y 已随存在旗关闭；Q(z) 不含 y，而 z 原本就在外部前提中，因此结论可以保留。")
        : fail("在旗内用 P(y) 与 P(y)→Q(z) 推出 Q(z)；Q(z) 不含临时名字 y，可以通过 ∃E 留在旗外。")
    },
    {
      id: "apply-quantifier-rules", branch: "shared", requires: ["forge-exists-flag"], next: "term-symbol-signature", chapter: "第十二章 · 量词推理", title: "把存在知识传过全称规律",
      copy: "最后把两种方向接在一起：存在前提提供一个临时见证，全称前提适用于这个见证；得到的新性质再次藏回存在式以后，临时名字就可以安全消失。",
      goal: "从 ∃xP(x)、∀x(P(x)→Q(x)) 推导 ∃xQ(x)。", tools: ["vary", "forallElim", "impElim", "existsIntro"], proofViews: true, fitchView: true, artifacts: ["quantifier-rules-combined"], toolScope: "exists-application-scope",
      spawnPositions: [{ x: 245, y: 350 }, { x: 430, y: 85 }, { x: 600, y: 185 }, { x: 745, y: 275 }],
      nodes: [
        fixed("quantifier-exists", "来自 Γ", proofObject("given", existentialP, [existentialP]), "proof", 20, 90, "∃xP(x)"),
        fixed("quantifier-forall", "来自 Γ", proofObject("given", universalPImpQ, [universalPImpQ]), "proof", 20, 335, "∀x(P(x)→Q(x))"),
        existsFlagNode("quantifier-exists-start", "exists-application-scope", 220, 185),
        existsElimNode("quantifier-exists-close", "exists-application-scope", 860, 205),
        goal("proof", 1015, 205)
      ],
      scopeFrames: [{ id: "exists-application-scope", flagKind: "existential", flagNode: "quantifier-exists-start", label: "⚑ 暂称见证为 □", x: 200, y: 35, width: 755, height: 410, discharge: true, boundaryLabel: "∃E", boundaryCopy: "把 ∃xQ(x) 留在旗外" }],
      hint: "存在旗给出 P(y)；用 y 实例化全称前提得到 P(y)→Q(y)，推出 Q(y) 后用 ∃I 隐藏 y；最后只把 ∃xQ(x) 接入存在旗出口。",
      definition: ["量词规则协同", `<p>存在见证可以在局部子证明中接受全称规律。只要最终再次把临时名字绑定起来，结论就不依赖见证叫什么。</p><code>∃xP(x), ∀x(P(x)→Q(x)) ⊢ ∃xQ(x)</code>`],
      unlock: "四条基本量词规则的协同证明",
      completionLesson: `<span class="eyebrow">量词推理</span><h3>四条基本规则已经接通</h3><code>∀E：取出实例　　∃I：隐藏见证<br>∀I：关闭任意 flag　　∃E：关闭见证 flag</code><p class="layer-note">公式代入负责准确换字；两种 flag 负责管理只能临时使用的名字。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "existsElim" && equalFormula(value.conclusion, existentialQ)
        && proofUsesRule(value, "forallElim") && proofUsesRule(value, "impElim") && proofUsesRule(value, "existsIntro")
        ? pass("临时见证 y 先接受全称规律，再被隐藏进 ∃xQ(x)；关闭存在旗后，结论不再依赖它的名字。")
        : fail("在存在 flag 内依次使用 ∀E、→E、∃I，得到不含自由 y 的 ∃xQ(x)，再关闭 flag。")
    },
    {
      id: "term-symbol-signature", branch: "shared", requires: ["apply-quantifier-rules"], next: "build-function-term", chapter: "第十三章 · 项与函数符号", title: "会产生对象的符号",
      copy: "谓词符号接收项后产生公式；现在另开一张产生项的符号表。c 没有输入位置，f 有一个输入位置。先用已经熟悉的入口数把它们登记下来。",
      goal: "构造函数符号表 {⟨c,0⟩,⟨f,1⟩}。", tools: ["ord", "set2"], artifacts: ["term-function-signature"],
      spawnPositions: [{ x: 420, y: 95 }, { x: 420, y: 335 }, { x: 620, y: 215 }],
      nodes: [
        fixed("term-signature-c", "新符号", "c", "object", 35, 65, "c"),
        fixed("term-signature-zero", "c 的入口数量", numeral(0), "object", 225, 65, "0"),
        fixed("term-signature-f", "新符号", "f", "object", 35, 335, "f"),
        fixed("term-signature-one", "f 的入口数量", numeral(1), "object", 225, 335, "1"),
        goal("set", 815, 215)
      ],
      hint: "分别构造 ⟨c,0⟩、⟨f,1⟩，再用二元素集把两个符号条目收在一起。",
      definition: ["产生项的符号表", `<p>⟨c,0⟩ 让 c 不接收任何项，自己就是一个项；⟨f,1⟩ 让 f 接收一个项并产生新项。</p><code>谓词符号＋项 → 公式<br>函数符号＋项 → 项</code><p>它们现在仍只是语法符号，尚未在模型中表示对象或函数。</p>`],
      unlock: "常元项 c 与一元函数符号 f(·)",
      validate: ({ value, nodes }) => equal(value, termFunctionSignature) && nodes.filter((node) => node.type === "ord").length >= 2 && nodes.some((node) => node.type === "set2")
        ? pass("⟨c,0⟩ 与 ⟨f,1⟩ 组成了产生项的符号表：c 直接形成项，f 等待一个项输入。")
        : fail("符号表必须恰好收进 ⟨c,0⟩ 与 ⟨f,1⟩；符号放在有序对第一项，入口数放在第二项。")
    },
    {
      id: "build-function-term", branch: "shared", requires: ["term-symbol-signature"], next: "nest-function-term", chapter: "第十三章 · 项与函数符号", title: "函数仍然造出项",
      copy: "刚刚定义的 f(·) 现在才进入零件架。变量 x 是项；把它填进 f 的唯一位置，得到的不是公式，而是另一个项。",
      goal: "构造复合项 f(x)。", tools: ["varx", "funcF"], formulaViews: true, formulaViewOptions: ["construction", "syntax"], artifacts: ["unary-function-term"],
      spawnPositions: [{ x: 255, y: 220 }, { x: 470, y: 220 }], nodes: [goal("term", 790, 220)],
      hint: "把变量项 x 接入 f(·) 的唯一项位置，再把复合项接入目标。",
      definition: ["函数项的形成", `<p>函数符号与谓词符号的输出类型不同。P(x) 是能够陈述真假的公式；f(x) 仍然只是负责指向对象的项。</p><code>x：项<br>f(·)：一元函数符号<br>f(x)：复合项</code>`],
      unlock: "一元函数形成复合项的方式",
      validate: ({ value }) => equalFormula(value, functionFxTerm)
        ? pass("f 接收了项 x，形成复合项 f(x)；这里还没有模型，因此尚未计算它指向哪个对象。")
        : fail(`当前结果是 ${prettyFormula(value)}；需要把 x 放进 f 的唯一项位置。`)
    },
    {
      id: "nest-function-term", branch: "shared", requires: ["build-function-term"], next: "term-inside-atom", chapter: "第十三章 · 项与函数符号", title: "项长成一棵树",
      copy: "f(x) 已经是项，因此还能再次填入 f 的项位置。把同一个形成方式使用两次，让项树继续向上生长。",
      goal: "构造嵌套项 f(f(x))。", tools: ["varx", "funcF"], formulaViews: true, formulaViewOptions: ["construction", "syntax"], artifacts: ["nested-function-term"],
      spawnPositions: [{ x: 190, y: 220 }, { x: 390, y: 220 }, { x: 590, y: 220 }], nodes: [goal("term", 850, 220)],
      hint: "先得到 f(x)，再把整个 f(x) 接入第二个 f(·)。",
      definition: ["项可以有限次嵌套", `<p>函数符号产生的结果仍是项，所以可以继续进入接受项的位置。有限次重复就得到任意深度的项树。</p><code>x → f(x) → f(f(x)) → …</code>`],
      unlock: "嵌套复合项",
      validate: ({ value, nodes }) => equalFormula(value, nestedFunctionTerm) && nodes.filter((node) => node.type === "funcF").length >= 2
        ? pass("内层 f 先形成 f(x)，外层 f 再接收整个复合项，得到 f(f(x))。")
        : fail("需要串联两个 f：x 进入内层 f，内层结果再进入外层 f。")
    },
    {
      id: "term-inside-atom", branch: "shared", requires: ["nest-function-term"], next: "interpret-term-symbols", chapter: "第十三章 · 项与函数符号", title: "项负责对象，公式负责陈述",
      copy: "复合项和常元项都可以占据谓词位置。让 f(x) 与 c 分别进入 R 的两个有序位置，观察项树如何成为原子公式的下层结构。",
      goal: "构造原子公式 R(f(x),c)。", tools: ["varx", "constC", "funcF", "predR"], formulaViews: true, formulaViewOptions: ["construction", "syntax"], artifacts: ["function-term-atom"],
      spawnPositions: [{ x: 155, y: 110 }, { x: 155, y: 340 }, { x: 365, y: 110 }, { x: 565, y: 220 }], nodes: [goal("formula", 850, 220)],
      hint: "先构造 f(x)；把它接到 R 的第一项位置，把没有输入位置的 c 接到第二项位置。",
      definition: ["项进入原子公式", `<p>f(x) 与 c 都负责指向对象，本身没有真假；R 使用它们形成能够成立或不成立的原子公式。</p><code>f(x)、c：项<br>R(f(x),c)：公式</code><p>现在还没有为 c、f 指定模型解释，因此仍不判断这条公式。</p>`],
      unlock: "含复合项的原子公式",
      validate: ({ value }) => equalFormula(value, functionTermAtom)
        ? pass("f(x) 与 c 依次填入 R 的两个位置；项树现在成为原子公式树的一部分。")
        : fail(`当前公式是 ${prettyFormula(value)}；需要让 f(x) 位于 R 的第一项，c 位于第二项。`)
    },
    {
      id: "interpret-term-symbols", branch: "shared", requires: ["term-inside-atom"], next: "evaluate-function-term", chapter: "第十三章 · 项与函数符号", title: "同一个符号，进入具体世界",
      copy: "语法中的 c 与 f 还没有指向任何东西。固定论域 D={杯子,盘子}：让 c 指向盘子，并用一张已经熟悉的函数图解释 f，使两件物品互相对应。",
      goal: "构造 cᴹ=盘子，以及 fᴹ={⟨杯子,盘子⟩,⟨盘子,杯子⟩}。", tools: ["ord", "set2"], semanticWorkbench: "term-interpretation", multiGoals: ["term-c-interpretation", "term-f-interpretation"], artifacts: ["term-symbol-interpretation"],
      spawnPositions: [{ x: 285, y: 95 }, { x: 285, y: 340 }, { x: 505, y: 220 }],
      nodes: [
        fixed("term-world-cup", "论域对象", "杯子", "object", 35, 105, "杯子"),
        fixed("term-world-plate", "论域对象", "盘子", "object", 35, 335, "盘子"),
        semanticValueGoal("term-c-interpretation", "常元 c 的解释", "cᴹ", "c 指向的论域对象", 720, 85),
        semanticGoal("term-f-interpretation", "函数符号 f 的解释", "fᴹ", "f 的函数图", 720, 330)
      ],
      hint: "把盘子直接接到 cᴹ；再构造 ⟨杯子,盘子⟩、⟨盘子,杯子⟩，用二元素集收成 fᴹ。",
      definition: ["项符号的模型解释", `<p>常元符号由模型指定为一个论域对象；一元函数符号由模型指定为从论域到论域的真正函数。</p><code>cᴹ∈D<br>fᴹ:D→D</code><p>语法中的 f(·) 负责造项；集合形式的 fᴹ 才负责实际计算。</p>`],
      unlock: "cᴹ 与 fᴹ 的模型解释",
      completionLesson: `<span class="eyebrow">项与公式的分界</span><h3>得到对象，不等于说出一句话</h3><div class="set-compare"><div class="set-case"><b>c　与　f(·)</b><small>c 是项；f 把项变成项。它们最终指向“杯子”或“盘子”这样的对象，对象本身无所谓真假。</small></div><div class="compare-arrow">≠</div><div class="set-case"><b>P(·)　与　R(·,·)</b><small>P 把一个项变成公式，R 把两个项变成公式。“·是杯子”“·和·有某关系”才是能够为真或为假的陈述。</small></div></div><p class="layer-note">c 与 f 负责回答“是哪一个对象”；P 与 R 负责陈述“这个对象怎样”或“这些对象有什么关系”。</p>`,
      validate: ({ values, nodes }) => equal(values["term-c-interpretation"], "盘子") && equal(values["term-f-interpretation"], termFunctionGraph)
        && nodes.filter((node) => node.type === "ord").length >= 2 && nodes.some((node) => node.type === "set2")
        ? pass("cᴹ 固定指向盘子；fᴹ 给论域中的每个对象安排了唯一输出，因此真正解释了函数符号 f。")
        : fail("cᴹ 应指向盘子；fᴹ 应恰好包含杯子↦盘子与盘子↦杯子两条有序边。")
    },
    {
      id: "evaluate-function-term", branch: "shared", requires: ["interpret-term-symbols"], next: "first-order-system-overview", chapter: "第十三章 · 项与函数符号", title: "从项树走到对象",
      copy: "回到 R(f(x),c)。让变量项 x 经过赋值 s，再把所得对象送入 fᴹ；让常元项 c 经过模型中的常元解释。最后按 R 的位置顺序组成它要寻找的对象对。",
      goal: "让 x、c 分别经过对应解释，构造 R(f(x),c) 寻找的对象对 ⟨盘子,盘子⟩。", tools: ["termAssignmentS", "termFunctionF", "termConstantMeaning", "ord"], semanticWorkbench: "function-term-evaluation", artifacts: ["compound-term-evaluation"],
      spawnPositions: [{ x: 285, y: 80 }, { x: 490, y: 80 }, { x: 285, y: 335 }, { x: 700, y: 220 }],
      nodes: [
        fixed("term-eval-x", "变量项", F.variable, "term", 95, 80, "x"),
        fixed("term-eval-c", "常元项", constantCTerm, "term", 95, 335, "c"),
        goal("set", 870, 220)
      ],
      hint: "上路：x→s(·) 得到杯子，再进入 fᴹ(·) 得到盘子。下路：c→常元解释得到盘子。最后把两路输出按顺序接入有序对。",
      definition: ["复合项的求值", `<p>变量由赋值解释，常元由模型解释；函数项先求出子项指向的对象，再应用模型中的真正函数。</p><code>x → s(·) → 杯子<br>杯子 → fᴹ(·) → 盘子<br>c → 常元解释 → 盘子</code><p>s 不属于模型：它只安排变量。模型分别解释 c、f、R，不需要成为一个接收整棵公式的大节点。</p>`],
      unlock: "常元、函数项及其模型求值",
      completionLesson: `<span class="eyebrow">项与函数符号</span><h3>语法项已经能够落到论域对象</h3><code>变量 → 读取赋值<br>常元 → 读取模型解释<br>函数项 → 先求子项，再应用函数解释</code><p class="layer-note">谓词和关系并不直接接收语法文字；它们检查的是各个项最终指向的论域对象。</p>`,
      validate: ({ value, nodes }) => equal(value, orderedPair("盘子", "盘子")) && nodes.some((node) => node.type === "termAssignmentS") && nodes.some((node) => node.type === "termFunctionF") && nodes.some((node) => node.type === "termConstantMeaning") && nodes.some((node) => node.type === "ord")
        ? pass("s(x)=杯子，fᴹ(杯子)=盘子，而 cᴹ=盘子；R 因而寻找 ⟨盘子,盘子⟩，这条边确实在 Rᴹ 中。")
        : fail("让 x 依次经过 s 与 fᴹ，让 c 经过常元解释；最后按 f(x)、c 的顺序组成有序对。")
    },
    {
      id: "first-order-system-overview", branch: "shared", requires: ["evaluate-function-term"], next: "equality-diagonal", chapter: "第十四章 · 一阶逻辑总览", title: "第一门完整的一阶语言",
      copy: "先停下来查看你已经构造出的完整系统。它不含等号，但已经拥有项、公式、模型语义与自然演绎证明。",
      goal: "完整查看无等号一阶逻辑；无需装配，可以直接进入下一章。", tools: [], nodes: [], overview: true, firstOrderOverview: true, artifacts: ["equality-free-first-order-logic"],
      hint: "这一关没有接线任务；阅读总装页面后直接继续。",
      definition: ["无等号一阶逻辑", `<p>一阶逻辑不必把等号作为语言的一部分。当前系统已经能够用项指称对象、用谓词形成公式、在模型中判断满足，并用自然演绎进行推导。</p>`],
      unlock: "无等号一阶逻辑已经完成",
      validate: () => pass("无等号一阶逻辑总装完成。")
    },
    {
      id: "equality-diagonal", branch: "shared", requires: ["first-order-system-overview"], next: "equality-formula", chapter: "第十五章 · 等号扩展", title: "只留下自环",
      copy: "普通二元关系可以自由选择哪些对象对成立。现在固定论域 D={杯子,盘子}，只收集每个对象与自身组成的有序对，看看这种关系为什么与普通关系不同。",
      goal: "构造 {⟨杯子,杯子⟩,⟨盘子,盘子⟩}。", tools: ["ord", "set2"], semanticWorkbench: "equality-diagonal", artifacts: ["equality-semantics"],
      spawnPositions: [{ x: 285, y: 110 }, { x: 285, y: 345 }, { x: 520, y: 225 }],
      nodes: [
        fixed("equality-cup", "论域对象", "杯子", "object", 35, 105, "杯子"),
        fixed("equality-plate", "论域对象", "盘子", "object", 35, 335, "盘子"),
        goal("set", 815, 220)
      ],
      hint: "分别让杯子、盘子与自身组成有序对，再用二元素集收集这两条边。不要加入杯子到盘子或盘子到杯子的边。",
      definition: ["等号在模型中的意义", `<p>普通关系符号的解释由模型自由选择；等号则固定比较两个项是否指向同一个论域对象。</p><code>=ᴹ={⟨d,d⟩｜d∈D}</code>`],
      unlock: "等式构造节点 =",
      completionLesson: `<span class="eyebrow">等号的固定解释</span><h3>每个对象只与自身相等</h3><p>普通关系 Rᴹ 可以由模型自由选择；等号在每个模型中都固定表示“同一个对象”。它的关系图必定是论域上的全部自环。</p><code>=ᴹ={⟨d,d⟩｜d∈D}</code>`,
      validate: ({ value, nodes }) => equal(value, equalityDiagonal) && nodes.filter((node) => node.type === "ord").length >= 2 && nodes.some((node) => node.type === "set2")
        ? pass("两条自环覆盖了论域中的每个对象；这就是等号在当前模型中的固定解释。")
        : fail("等号只留下全部自环：杯子连回杯子，盘子连回盘子。")
    },
    {
      id: "equality-formula", branch: "shared", requires: ["equality-diagonal"], next: "equality-evaluation", chapter: "第十五章 · 等号扩展", title: "等号两边都是项",
      copy: "刚刚定义的等号现在进入零件架。把两个已经熟悉的项放到它的左右位置：等号不会把项变成对象，而是用两个项形成一条原子公式。",
      goal: "构造等式 f(x)=c。", tools: ["varx", "constC", "funcF", "equality"], formulaViews: true, formulaViewOptions: ["construction", "syntax"], artifacts: ["equality-formula"],
      spawnPositions: [{ x: 145, y: 130 }, { x: 145, y: 345 }, { x: 355, y: 130 }, { x: 580, y: 220 }], nodes: [goal("formula", 850, 220)],
      hint: "先让 x 进入 f(·)，再把 f(x) 与 c 分别接到等号的左、右项位置。",
      definition: ["等式的形成", `<p>等号两侧都必须是项。两个项本身只负责指向对象；把它们用等号连接后，才形成能够为真或为假的原子公式。</p><code>f(x)、c：项<br>f(x)=c：原子公式</code>`],
      unlock: "由两个项形成等式",
      completionLesson: `<span class="eyebrow">项与公式的边界</span><h3>等号把两个项组成原子公式</h3><div class="set-compare"><div class="set-case"><b>f(x)　c</b><small>都是项；负责指向对象，本身无所谓真假</small></div><div class="compare-arrow">=</div><div class="set-case"><b>f(x)=c</b><small>是原子公式；可以为真或为假</small></div></div>`,
      validate: ({ value }) => equalFormula(value, functionTermEquality)
        ? pass("f(x) 与 c 占据等号两侧，形成了原子公式 f(x)=c。")
        : fail(`当前结果是 ${prettyFormula(value)}；等号左侧应为 f(x)，右侧应为 c。`)
    },
    {
      id: "equality-evaluation", branch: "shared", requires: ["equality-formula"], next: "forge-equality-intro", chapter: "第十五章 · 等号扩展", title: "写法不同，指向相同",
      copy: "f(x) 与 c 的写法完全不同，但等号比较的不是文字。分别沿两棵项树取得它们在模型中的值，让观察台查看两条路径是否汇到同一个对象。",
      goal: "分别求出 f(x) 与 c 的值，并接入等号左右两侧的对象位置。", tools: ["termAssignmentS", "termFunctionF", "termConstantMeaning"], semanticWorkbench: "equality-evaluation", multiGoals: ["equality-left-value", "equality-right-value"], artifacts: ["equality-satisfaction"],
      spawnPositions: [{ x: 285, y: 80 }, { x: 500, y: 80 }, { x: 285, y: 340 }],
      nodes: [
        fixed("equality-eval-x", "变量项", F.variable, "term", 70, 80, "x"),
        fixed("equality-eval-c", "常元项", constantCTerm, "term", 70, 340, "c"),
        semanticValueGoal("equality-left-value", "等号左项的值", "⟦f(x)⟧ᴹ,s", "f(x) 最终指向的对象", 770, 95),
        semanticValueGoal("equality-right-value", "等号右项的值", "⟦c⟧ᴹ,s", "c 最终指向的对象", 770, 335)
      ],
      hint: "上路让 x 先经过 s，再经过 fᴹ；下路让 c 经过常元解释。把两条路径最终得到的对象分别接入对应目标。",
      definition: ["等式的满足", `<p>先分别求出等号两侧项的值。两个值是同一个论域对象时，等式成立；文字写法是否相同并不重要。</p><code>𝔐,s⊨t=u ⇔ ⟦t⟧ᴹ,s 与 ⟦u⟧ᴹ,s 是同一个对象</code>`],
      unlock: "等式的模型求值",
      validate: ({ values, nodes }) => equal(values["equality-left-value"], "盘子") && equal(values["equality-right-value"], "盘子")
        && nodes.some((node) => node.type === "termAssignmentS") && nodes.some((node) => node.type === "termFunctionF") && nodes.some((node) => node.type === "termConstantMeaning")
        ? pass("f(x) 与 c 写法不同，却都指向盘子；因此当前模型与赋值满足 f(x)=c。")
        : fail("上路应得到 ⟦f(x)⟧ᴹ,s=盘子，下路应得到 ⟦c⟧ᴹ,s=盘子。")
    },
    {
      id: "forge-equality-intro", branch: "shared", requires: ["equality-evaluation"], next: "forge-equality-elim", chapter: "第十五章 · 等号扩展", title: "同一项当然等于自身",
      copy: "先不提供任何等号推理规则。分别使用变量项、常元项和复合项，让同一份项输出同时进入等号两侧；从三个实例中找出不依赖具体项的共同结构。",
      goal: "分别构造 x=x、c=c、f(x)=f(x)，且每条等式两侧必须接收同一个项节点的输出。", tools: ["varx", "constC", "funcF", "equality"], semanticWorkbench: "equality-intro-forge", multiGoals: ["eq-intro-x", "eq-intro-c", "eq-intro-fx"], ruleForge: true, artifacts: ["equality-intro-rule"],
      nodes: [goal("formula", 820, 65), goal("formula", 820, 220), goal("formula", 820, 375)].map((node, index) => ({ ...node, id: ["eq-intro-x", "eq-intro-c", "eq-intro-fx"][index], label: ["变量实例", "常元实例", "复合项实例"][index], glyph: ["x=x", "c=c", "f(x)=f(x)"][index] })),
      hint: "每个实例只造一份对应的项节点；选中它的输出后，先接等号左侧，再次选中同一输出并接到右侧。",
      definition: ["等号引入的共同结构", `<p>无论 t 是变量、常元还是复合项，同一个项在同一模型与赋值下必定取得同一个值。规则中的 t 表示任意项，不是语言里新增的项。</p><code>──── =I<br>t=t</code>`],
      unlock: "等号引入规则 =I",
      completionLesson: `<span class="eyebrow">从三个实例抽象规则</span><h3>同一项当然等于自身</h3><code>──── =I<br>t=t</code><p class="layer-note">t 不是语言中新增加的项，而是规则中“任意项”的位置，作用类似此前的公式元变量 A。</p>`,
      validate: ({ values, nodes, connections }) => {
        const expected = { "eq-intro-x": F.eq(F.variable, F.variable), "eq-intro-c": F.eq(constantCTerm, constantCTerm), "eq-intro-fx": F.eq(functionFxTerm, functionFxTerm) };
        const structurallyShared = Object.keys(expected).every((goalId) => {
          const intoGoal = connections.find((connection) => connection.to === goalId && connection.input === 0);
          const equalityNode = intoGoal && nodes.find((node) => node.id === intoGoal.from && node.type === "equality");
          if (!equalityNode) return false;
          const left = connections.find((connection) => connection.to === equalityNode.id && connection.input === 0);
          const right = connections.find((connection) => connection.to === equalityNode.id && connection.input === 1);
          return left && right && left.from === right.from;
        });
        return Object.entries(expected).every(([id, formula]) => equalFormula(values[id], formula)) && structurallyShared
          ? pass("三个实例都把同一项送入等号两侧；共同结构已经抽象为无前提规则 =I。")
          : fail("完成 x=x、c=c、f(x)=f(x)，并确保每条等式左右两侧来自同一个项节点。 ");
      }
    },
    {
      id: "forge-equality-elim", branch: "shared", requires: ["forge-equality-intro"], next: "apply-equality-elim", chapter: "第十五章 · 等号扩展", title: "把等项带进公式",
      copy: "t、u 表示任意两个项；φ(y) 表示任意一个可能含自由 y 的公式。它们都是描述规则模式的元记号，不是语言中新增加的符号。请用已经构造的无捕获代入，亲手形成横线上下的两个公式实例。",
      goal: "构造 t=u、φ(y)[t/y] 与 φ(y)[u/y]，再把前两者放在横线上方，把后者放在下方。",
      tools: ["equality", "formulaSubstitution"],
      ruleFrames: [{ premises: ["eq-elim-equality", "eq-elim-old"], conclusion: "eq-elim-new", label: "尚未命名的等项推理" }], ruleForge: true,
      artifacts: ["equality-elim-rule"], spawnPositions: [{ x: 360, y: 80 }, { x: 360, y: 245 }, { x: 530, y: 335 }],
      nodes: [
        fixed("eq-meta-t", "任意项元记号", arbitraryTermT, "term", 25, 35, "t"),
        fixed("eq-meta-u", "任意项元记号", arbitraryTermU, "term", 25, 155, "u"),
        fixed("eq-meta-y", "模板的自由位置", variableY, "term", 25, 275, "y"),
        fixed("eq-meta-phi", "任意公式元记号", arbitraryFormulaPattern, "formula", 25, 395, "φ(y)"),
        ruleSlot("eq-elim-equality", "证明前提：等项", "premise", 650, 70),
        ruleSlot("eq-elim-old", "证明前提：代入 t 的实例", "premise", 850, 70),
        ruleSlot("eq-elim-new", "推理结论：代入 u 的实例", "conclusion", 750, 350)
      ],
      hint: "让 t、u 进入等号两侧；再把同一个 φ(y) 输出接入两个公式代入节点，两次都替换 y，分别放入 t 与 u。",
      definition: ["用代入构造等号消去", `<p>φ(y) 不是谓词符号，而是“任意一个可能含自由 y 的公式”的元记号。t、u 同样表示任意项。</p><code>t=u　　φ(y)[t/y]<br>──────────────── =E<br>φ(y)[u/y]</code><p>两次操作都使用此前构造的无捕获代入，因此不会误改绑定变量，也不会让新变量被量词捕获。</p>`],
      unlock: "等号消去规则 =E",
      completionLesson: `<span class="eyebrow">从代入操作抽象规则</span><h3>相同对象可以进入同一个公式位置</h3><code>t=u　　φ(y)[t/y]<br>──────────────── =E<br>φ(y)[u/y]</code><p class="layer-note">通常把两个代入实例简写为 φ(t)、φ(u)。φ 只是表示其余公式结构保持不变，不是 =E 的第三个输入。</p>`,
      validate: ({ rules, nodes }) => {
        const rule = rules[0];
        const correct = rule && rule.premises.some((formula) => equalFormula(formula, equalityTermSchema))
          && rule.premises.some((formula) => equalFormula(formula, arbitraryFormulaAtT))
          && equalFormula(rule.conclusion, arbitraryFormulaAtU);
        return correct && nodes.filter((node) => node.type === "formulaSubstitution").length >= 2 && nodes.some((node) => node.type === "equality")
          ? pass("两次无捕获代入保留了同一个公式结构；t=u 因而允许从 φ(t) 推出 φ(u)，=E 已经构造完成。")
          : fail("构造 t=u；让同一个 φ(y) 分别代入 t、u，得到 φ(t)、φ(u)，再按题面放到横线上。")
      }
    },
    {
      id: "apply-equality-elim", branch: "shared", requires: ["forge-equality-elim"], next: "sentence-filters-models", chapter: "第十五章 · 等号扩展", title: "选择要替换的位置",
      copy: "规则已经构造完成。现在已知 c=f(x) 与 R(c,c)：一个公式中有两处 c 可以被等项替换。每次使用 =E 时，在节点中明确选择这一推理步骤要改动的自由出现。",
      goal: "先把左侧 c 换成 f(x)，得到 R(f(x),c)；再把剩余的 c 换掉，得到 R(f(x),f(x))。",
      tools: ["equalityElim"], proofViews: true, fitchView: true, equalityOccurrenceSelection: true,
      artifacts: ["equality-elim-application"], spawnPositions: [{ x: 315, y: 145 }, { x: 600, y: 265 }],
      nodes: [
        fixed("eq-apply-equality", "来自 Γ", proofObject("given", F.eq(constantCTerm, functionFxTerm), [F.eq(constantCTerm, functionFxTerm)]), "proof", 25, 95, "c=f(x)"),
        fixed("eq-apply-relation", "来自 Γ", proofObject("given", relationCC, [relationCC]), "proof", 25, 350, "R(c,c)"),
        goal("proof", 900, 220)
      ],
      hint: "第一个 =E 接入 c=f(x) 与 R(c,c)，在节点中选择第 1 处 c；第二个 =E 仍接入同一等式，旧公式改接第一步的输出，再选择剩余位置。",
      definition: ["一次只替换选中的自由出现", `<p>写成 φ(t) 时，φ 已经暗中标出了本次要替换的位置。游戏把这件事直接显示出来：你选择哪一处，哪一处就由 t 换成 u。</p><code>R(c,c) → R(f(x),c) → R(f(x),f(x))</code><p>受量词绑定的位置不能这样替换；若新项会被捕获，仍须先使用安全易字。</p>`],
      unlock: "等号引入与等号消去的完整操作",
      completionLesson: `<span class="eyebrow">带等号的一阶逻辑</span><h3>等号规则已经能够实际工作</h3><code>=I：同一项等于自身<br>=E：把选中的自由出现换成等项</code><p class="layer-note">证明视图中只有 c=f(x) 与 R(c,c) 是前提；替换位置由每次 =E 操作记录，不会成为额外前提。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "equalityElim"
        && equalFormula(value.conclusion, relationFunctionFunction) && countProofRule(value, "equalityElim") === 2
        && value.children[1] && equalFormula(value.children[1].conclusion, relationFunctionC)
        ? pass("第一步替换左侧 c，第二步替换剩余 c；两次 =E 最终得到 R(f(x),f(x))。")
        : fail("需要串联两次 =E：先得到 R(f(x),c)，再得到 R(f(x),f(x))。")
    },
    {
      id: "sentence-filters-models", branch: "shared", requires: ["apply-equality-elim"], next: "collect-first-theory", chapter: "第十六章 · 从语言到理论", title: "同一句话，不同的世界",
      copy: "三个模型谈论同样的两个对象，却给 P 不同的解释。先构造同一句 ∀xP(x)，再把它分接到三个模型；句子不会改变世界，只会显示哪些世界符合它。",
      goal: "构造 ∀xP(x)，并让三个模型分别判断同一句话。", tools: ["forall"], semanticWorkbench: "sentence-model-filter", multiGoals: ["filter-model-all", "filter-model-cup", "filter-model-empty"], artifacts: ["axiom-as-sentence"],
      spawnPositions: [{ x: 315, y: 220 }],
      nodes: [
        fixed("filter-x", "绑定变量", F.variable, "term", 30, 120, "x"),
        fixed("filter-px", "已经构造的开公式", px, "formula", 30, 325, "P(x)"),
        { ...goal("formula", 560, 65), id: "filter-model-all", label: "模型 𝔐₁", glyph: "Pᴹ=D" },
        { ...goal("formula", 560, 220), id: "filter-model-cup", label: "模型 𝔐₂", glyph: "Pᴹ={杯子}" },
        { ...goal("formula", 560, 375), id: "filter-model-empty", label: "模型 𝔐₃", glyph: "Pᴹ=∅" }
      ],
      hint: "用 x 和 P(x) 构造一个 ∀ 公式；同一个输出可以反复选择，分别接入三个模型位置。",
      definition: ["把句子当作要求", `<p>闭公式的真假由整个模型决定。同一句 ∀xP(x) 在不同模型里可能有不同真假。</p><p>当我们把一句话列为模型必须满足的要求时，便把这句话称为一条<b>公理</b>。公理在语法上仍然只是句子。</p>`],
      unlock: "公理：被当作模型必须满足之要求的句子",
      completionLesson: `<span class="eyebrow">公理仍然是句子</span><h3>句子没有改造模型，只筛选模型</h3><p>三个模型都完整保留；只有 𝔐₁ 让论域中的每个对象都属于 Pᴹ，因此只有它满足 ∀xP(x)。</p><code>𝔐₁⊨∀xP(x)　　𝔐₂,𝔐₃⊭∀xP(x)</code>`,
      validate: ({ values }) => Object.values(values).every((formula) => equalFormula(formula, universalP))
        ? pass("同一句 ∀xP(x) 已在三个模型中分别求值；它留下 𝔐₁，却没有改变任何模型的解释。")
        : fail("三个模型都应接收同一份 ∀xP(x)，不要为不同模型改写句子。")
    },
    {
      id: "collect-first-theory", branch: "shared", requires: ["sentence-filters-models"], next: "build-theory-model", chapter: "第十六章 · 从语言到理论", title: "不止一个要求",
      copy: "A 要求每个对象至少具有 P、Q 中的一种性质；B 要求没有对象同时具有两种性质。用配对把这两条句子收成一个集合，再让三个模型分别接受整组要求。",
      goal: "构造 T={A,B}，并将同一个 T 接入三个模型。", tools: ["pair"], semanticWorkbench: "theory-model-filter", multiGoals: ["theory-model-one", "theory-model-two", "theory-model-three"], artifacts: ["first-order-theory"],
      spawnPositions: [{ x: 315, y: 220 }],
      nodes: [
        fixed("theory-a", "句子 A", theoryCoverage, "formula", 25, 105, "∀x(P(x)∨Q(x))"),
        fixed("theory-b", "句子 B", theoryNoOverlap, "formula", 25, 330, "¬∃x(P(x)∧Q(x))"),
        { ...goal("context", 560, 65), id: "theory-model-one", label: "模型 𝔐₁", glyph: "检查 T" },
        { ...goal("context", 560, 220), id: "theory-model-two", label: "模型 𝔐₂", glyph: "检查 T" },
        { ...goal("context", 560, 375), id: "theory-model-three", label: "模型 𝔐₃", glyph: "检查 T" }
      ],
      hint: "把 A、B 接入配对器；配对结果就是公式集 T。将同一个输出分接到三个模型位置。",
      definition: ["理论与理论的模型", `<p>一个<b>理论</b> T 是一些句子组成的集合。模型 𝔐 满足 T，是指它满足 T 中的每一句话。</p><code>𝔐⊨T　⇔　对每个 σ∈T，都有 𝔐⊨σ</code>`],
      unlock: "理论 T 与满足理论的模型",
      completionLesson: `<span class="eyebrow">第一组公理</span><h3>两个筛选条件取共同部分</h3><p>𝔐₁ 同时满足 A、B，所以 𝔐₁⊨T。𝔐₂ 让两种性质重叠，𝔐₃ 遗漏了盘子；它们各自至少违反一条公理。</p><code>𝔐⊨T　表示 𝔐 满足 T 中每一句话</code>`,
      validate: ({ values }) => Object.values(values).every((context) => equal(context, partitionTheory))
        ? pass("A、B 已收成同一个理论 T；逐句求值显示只有 𝔐₁ 同时满足两项要求。")
        : fail("先用配对构造恰好含 A、B 的公式集，再把同一个集合分接到三个模型。")
    },
    {
      id: "build-theory-model", branch: "shared", requires: ["collect-first-theory"], next: "theory-conflict", chapter: "第十六章 · 从语言到理论", title: "让两个要求同时成立",
      copy: "理论 T 已经固定，论域也固定为 {杯子,盘子}。现在由你决定 P、Q 分别适用于哪些对象；观察台会把两个解释代回 T 中的两句话。",
      goal: "构造 Pᴹ、Qᴹ，使 𝔐 同时满足 T 的两条公理。", tools: ["empty", "set1", "set2"], semanticWorkbench: "theory-model-build", multiGoals: ["theory-build-p", "theory-build-q"], artifacts: ["satisfiable-theory"],
      spawnPositions: [{ x: 245, y: 65 }, { x: 245, y: 210 }, { x: 245, y: 355 }],
      nodes: [
        fixed("theory-build-cup", "论域对象", "杯子", "set", 25, 125, "杯子"),
        fixed("theory-build-plate", "论域对象", "盘子", "set", 25, 335, "盘子"),
        semanticGoal("theory-build-p", "解释 P", "Pᴹ", "P 适用的对象集合", 535, 125),
        semanticGoal("theory-build-q", "解释 Q", "Qᴹ", "Q 适用的对象集合", 535, 335)
      ],
      hint: "每个对象必须至少进入一个解释，又不能同时进入两个解释。比如让 P 只收杯子，让 Q 只收盘子。",
      definition: ["为理论构造模型", `<p>理论只提出要求，并不替模型选择谓词解释。只要能构造至少一个同时满足全部公理的模型，这个理论就是<b>可满足的</b>。</p>`],
      unlock: "可满足理论：至少拥有一个模型的理论",
      completionLesson: `<span class="eyebrow">可满足</span><h3>这组要求确实描述了可能的世界</h3><p>你亲手给出了 Pᴹ、Qᴹ，并让 T 中每一句都成立。因此这个具体的 𝔐 是 T 的模型，T 是可满足的。</p><code>𝔐⊨T　⇒　T 至少有一个模型</code>`,
      validate: ({ values }) => {
        const pExtension = values["theory-build-p"], qExtension = values["theory-build-q"];
        const validExtensions = Array.isArray(pExtension) && Array.isArray(qExtension) && [...pExtension, ...qExtension].every((object) => contains(theoryDomain, object));
        const satisfies = validExtensions && partitionTheory.every((formula) => evaluateMonadicFormula(formula, pExtension, qExtension));
        return satisfies ? pass("Pᴹ、Qᴹ 让每个对象恰好具有一种性质；你构造出了 T 的一个模型。") : fail("检查两个要求：每个对象至少进入 Pᴹ、Qᴹ 之一，而且不能同时进入两边。 ");
      }
    },
    {
      id: "theory-conflict", branch: "shared", requires: ["build-theory-model"], next: "theory-semantic-consequence", chapter: "第十六章 · 从语言到理论", title: "无论怎样解释都会失败",
      copy: "在二元素论域上，一元谓词 P 只有四种可能解释。把这四种集合全部构造出来；观察台会让每一种解释分别面对 ∀xP(x) 与 ∃x¬P(x)。",
      goal: "构造 Pᴹ 的全部四种可能解释，确认没有一行能同时满足两句话。", tools: ["empty", "set1", "set2"], semanticWorkbench: "theory-conflict", multiGoals: ["conflict-extension-1", "conflict-extension-2", "conflict-extension-3", "conflict-extension-4"], artifacts: ["unsatisfiable-theory"],
      spawnPositions: [{ x: 235, y: 35 }, { x: 235, y: 145 }, { x: 235, y: 260 }, { x: 235, y: 375 }],
      nodes: [
        fixed("conflict-cup", "论域对象", "杯子", "set", 20, 120, "杯子"),
        fixed("conflict-plate", "论域对象", "盘子", "set", 20, 330, "盘子"),
        ...[45, 155, 265, 375].map((y, index) => ({ ...goal("set", 535, y), id: `conflict-extension-${index + 1}`, label: `第 ${index + 1} 种解释`, glyph: "Pᴹ" }))
      ],
      hint: "四种解释是 ∅、{杯子}、{盘子}、{杯子,盘子}；次序不限，但四个目标不能重复。",
      definition: ["不可满足", `<p>理论 U={∀xP(x),∃x¬P(x)} 同时要求所有对象具有 P，又要求至少一个对象不具有 P。若没有任何模型能满足全部公理，U 就称为<b>不可满足</b>。</p>`],
      unlock: "不可满足理论：没有任何模型的理论",
      completionLesson: `<span class="eyebrow">不可满足</span><h3>冲突不来自某次失败的猜测</h3><p>四种解释已经穷尽固定论域上的全部可能；而且冲突只在于同一个见证既被 ∀ 要求属于 Pᴹ，又被 ∃¬ 要求不属于 Pᴹ。换成任何非空论域，这个冲突仍然存在。</p><code>{∀xP(x),∃x¬P(x)} 没有模型</code>`,
      validate: ({ values }) => {
        const built = Object.values(values);
        const expected = new Set(monadicExtensions.map(key));
        const actual = new Set(built.map(key));
        return built.length === 4 && actual.size === 4 && [...actual].every((item) => expected.has(item))
          ? pass("Pᴹ 的四种解释全部出现，但两条句子在每一行都至少有一条失败；U 不可满足。")
          : fail("需要恰好构造 ∅、{杯子}、{盘子}、{杯子,盘子} 四种互不重复的解释。 ");
      }
    },
    {
      id: "theory-semantic-consequence", branch: "shared", requires: ["theory-conflict"], next: "theory-syntactic-consequence", chapter: "第十六章 · 从语言到理论", title: "公理没有写出结论，却迫使它成立",
      copy: "把两条公理收成理论 T，再构造候选结论 C。观察台会在固定二元素论域上列出 P、Q 的全部十六种解释，只保留满足 T 的模型。",
      goal: "构造 T={∀x(P(x)→Q(x)),∃xP(x)} 与 C=∃x(P(x)∧Q(x))。", tools: ["pair", "and", "exists"], semanticWorkbench: "theory-consequence", multiGoals: ["consequence-theory", "consequence-target"], artifacts: ["first-order-semantic-consequence"],
      spawnPositions: [{ x: 255, y: 80 }, { x: 255, y: 275 }, { x: 415, y: 325 }],
      nodes: [
        fixed("consequence-law", "公理", universalPImpQ, "formula", 20, 45, "∀x(P(x)→Q(x))"),
        fixed("consequence-exists", "公理", existentialP, "formula", 20, 165, "∃xP(x)"),
        fixed("consequence-x", "绑定变量", F.variable, "term", 20, 285, "x"),
        fixed("consequence-px", "开放公式", px, "formula", 20, 365, "P(x)"),
        fixed("consequence-qx", "开放公式", qx, "formula", 20, 445, "Q(x)"),
        { ...goal("context", 575, 105), id: "consequence-theory", label: "公理集合", glyph: "T" },
        { ...goal("formula", 575, 335), id: "consequence-target", label: "候选结论", glyph: "C" }
      ],
      hint: "用配对收集两条公理；用 P(x)、Q(x) 构造合取，再与 x 一起接入存在量词。",
      definition: ["理论的语义后承", `<p>若每个满足理论 T 的模型也都满足句子 C，就说 T 在语义上后承 C。</p><code>T⊨C</code><p>这次变化的是整个模型中的谓词解释，而不只是同一模型中的变量赋值。</p>`],
      unlock: "一阶理论的语义后承 T⊨C",
      completionLesson: `<span class="eyebrow">语义后承</span><h3>所有允许的模型都带来同一结论</h3><p>十六格穷尽了固定二元素论域上的解释；所有满足 T 的格子也都满足 C。一般定义把这个要求扩展到任意论域上的任意模型：</p><code>T⊨C　⇔　每个 T 的模型都满足 C</code><p class="layer-note">有限表格让必然关系可见，但一般结论的范围并不只限于这十六个模型。</p>`,
      validate: ({ values }) => equal(values["consequence-theory"], implicationExistenceTheory) && equalFormula(values["consequence-target"], theoryTarget)
        ? pass("T 与 C 已经放到各自位置；所有满足两条公理的模型都让同一个见证同时具有 P、Q。")
        : fail("T 应恰好收集两条给定公理；C 应把 P(x)、Q(x) 合取后再用 ∃x 绑定。")
    },
    {
      id: "theory-syntactic-consequence", branch: "shared", requires: ["theory-semantic-consequence"], next: null, alternateNext: "induction-concrete-chain", alternateLabel: "进入归纳方法支线", chapter: "第十六章 · 从语言到理论", title: "把必然关系写成证明",
      copy: "上一关比较了所有模型；这一关不再查看模型，而是把 T 中两条公理作为长期前提，用已经构造的规则写出 C 的证明。",
      goal: "从 ∀x(P(x)→Q(x))、∃xP(x) 推导 ∃x(P(x)∧Q(x))。", tools: ["vary", "forallElim", "impElim", "andIntro", "existsIntro"], proofViews: true, fitchView: true, artifacts: ["first-order-syntactic-consequence"], toolScope: "theory-proof-scope",
      spawnPositions: [{ x: 245, y: 355 }, { x: 410, y: 80 }, { x: 555, y: 160 }, { x: 675, y: 240 }, { x: 790, y: 315 }],
      nodes: [
        fixed("theory-proof-exists", "来自 T", proofObject("given", existentialP, [existentialP]), "proof", 20, 90, "∃xP(x)"),
        fixed("theory-proof-law", "来自 T", proofObject("given", universalPImpQ, [universalPImpQ]), "proof", 20, 350, "∀x(P(x)→Q(x))"),
        existsFlagNode("theory-proof-start", "theory-proof-scope", 220, 185),
        existsElimNode("theory-proof-close", "theory-proof-scope", 875, 205),
        goal("proof", 1035, 205)
      ],
      scopeFrames: [{ id: "theory-proof-scope", flagKind: "existential", flagNode: "theory-proof-start", label: "⚑ 暂称见证为 □", x: 200, y: 35, width: 770, height: 410, discharge: true, boundaryLabel: "∃E", boundaryCopy: "把不含临时名字的 C 留在旗外" }],
      hint: "旗内先得到 P(y)，再从全称公理取得 P(y)→Q(y)，推出 Q(y) 后把 P(y)、Q(y) 合取；用 ∃I 隐藏 y，最后只把所得存在句接入存在旗出口。",
      definition: ["理论的语法后承", `<p>T⊢C 表示存在一份从 T 中公理出发、只使用推理规则得到 C 的形式证明。它与 T⊨C 是两个不同定义。</p><code>T⊨C：谈所有模型<br>T⊢C：谈一份形式证明</code><p>它们之间为什么能够对应，将由之后的可靠性与完备性回答。</p>`],
      unlock: "理论层完成：公理、模型、T⊨C 与 T⊢C 已经分开",
      completionLesson: `<span class="eyebrow">从语言到理论</span><h3>同一个结果，两种完全不同的保证</h3><div class="theory-consequence-summary"><article><small>所有模型</small><code>T⊨∃x(P(x)∧Q(x))</code><p>没有满足公理却推翻结论的模型。</p></article><article><small>一份证明</small><code>T⊢∃x(P(x)∧Q(x))</code><p>存在一份只使用已构造规则的推导。</p></article></div><p class="layer-note">这里还没有断言两种保证总会重合。可靠性与完备性正是接下来需要研究的问题。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "existsElim" && equalFormula(value.conclusion, theoryTarget)
        && proofUsesRule(value, "forallElim") && proofUsesRule(value, "impElim") && proofUsesRule(value, "andIntro") && proofUsesRule(value, "existsIntro")
        && (!value.openScopes || value.openScopes.length === 0)
        ? pass("两条公理已经通过有限规则组成 C 的证明，因此 T⊢∃x(P(x)∧Q(x))。")
        : fail("在存在 flag 内依次使用 ∀E、→E、∧I、∃I，再用 ∃E 关闭临时见证。")
    },
    {
      id: "induction-concrete-chain", branch: "induction", requires: ["theory-syntactic-consequence"], next: "induction-step-template", chapter: "归纳方法", title: "从 0 开始向前传递",
      copy: "先不使用归纳公式。𝒜(n) 表示“已经证明当前对象 n 具有正在研究的性质”。把 𝒜(0) 沿三条具体后继依据逐层传到 3。",
      goal: "依次得到 𝒜(1)、𝒜(2)、𝒜(3)。", tools: [], semanticWorkbench: "induction-chain", artifacts: ["concrete-induction-chain"],
      nodes: [
        fixed("induction-base-zero", "起点依据", inductionEvidence(zNat(0)), "evidence", 25, 220, "𝒜(0)"),
        { id: "induction-link-01", type: "inductionLink", label: "第一步", glyph: "𝒜(0)⇒𝒜(1)", inputs: registry.inductionLink.inputs, out: "evidence", outLabel: "𝒜(1)", x: 220, y: 220, fixed: true, from: 0, to: 1 },
        { id: "induction-link-12", type: "inductionLink", label: "第二步", glyph: "𝒜(1)⇒𝒜(2)", inputs: registry.inductionLink.inputs, out: "evidence", outLabel: "𝒜(2)", x: 400, y: 220, fixed: true, from: 1, to: 2 },
        { id: "induction-link-23", type: "inductionLink", label: "第三步", glyph: "𝒜(2)⇒𝒜(3)", inputs: registry.inductionLink.inputs, out: "evidence", outLabel: "𝒜(3)", x: 580, y: 220, fixed: true, from: 2, to: 3 },
        goal("evidence", 760, 220)
      ],
      openingLesson: ["𝒜 是证明中的性质位置", `<p><b>𝒜(n)</b> 暂时表示“对象 n 具有我们正在研究的某个性质，而且已有相应依据”。</p><p>𝒜 不是一阶语言中新增加的谓词符号，只是这一条元层证明中用来观察依据如何传播的记号。</p>`],
      hint: "从 𝒜(0) 开始，依次接入 0→1、1→2、2→3 三张依据，最后把 𝒜(3) 接入目标。",
      definition: ["逐层传播", `<p>对 0 的依据不会直接跳到 3。每一条具体后继步骤只把当前一层的依据传到下一层。</p>`],
      unlock: "性质依据能够沿有限的后继构造逐层传播",
      completionLesson: `<span class="eyebrow">有限传播</span><h3>对象前进一层，依据也前进一层</h3><code>𝒜(0) → 𝒜(1) → 𝒜(2) → 𝒜(3)</code><p class="layer-note">这里还没有归纳法，只有三次彼此分开的具体传播。</p>`,
      validate: ({ value }) => value && value.kind === "inductionEvidence" && equal(value.target, zNat(3))
        ? pass("𝒜(0) 的依据经过三次后继传播，终于到达 𝒜(3)。") : fail("每条具体依据都只能接收紧邻前一层的结果。")
    },
    {
      id: "induction-step-template", branch: "induction", requires: ["induction-concrete-chain"], next: "induction-hypothesis-scope", chapter: "归纳方法", title: "把重复步骤收成一个模板",
      copy: "上一关的三张传播卡只有数字不同。分别把 0、1、2 放进同一个步骤形状的 n 位置，重建三张卡；这里只比较形状，不会从 𝒜(n) 自动产生任何新依据。",
      goal: "构造 n=0、n=1、n=2 时的三个步骤实例。", tools: ["inductionStepInstance"], semanticWorkbench: "induction-template-instances", multiGoals: ["induction-instance-zero", "induction-instance-one", "induction-instance-two"], artifacts: ["induction-step-frame"],
      spawnPositions: [{ x: 245, y: 80 }, { x: 245, y: 220 }, { x: 245, y: 360 }],
      nodes: [
        fixed("template-zero", "第一个 n", zNat(0), "set", 20, 80, "0"),
        fixed("template-one", "第二个 n", zNat(1), "set", 20, 220, "1"),
        fixed("template-two", "第三个 n", zNat(2), "set", 20, 360, "2"),
        { ...goal("inductionStepInstance", 540, 80), id: "induction-instance-zero", label: "第一张具体卡", glyph: "𝒜(0)⇒𝒜(1)" },
        { ...goal("inductionStepInstance", 540, 220), id: "induction-instance-one", label: "第二张具体卡", glyph: "𝒜(1)⇒𝒜(2)" },
        { ...goal("inductionStepInstance", 540, 360), id: "induction-instance-two", label: "第三张具体卡", glyph: "𝒜(2)⇒𝒜(3)" }
      ],
      hint: "放入三个“步骤实例”，分别接收 0、1、2，再把它们送到对应的具体卡位置。它们只记录形状，不接收 𝒜(n)。",
      definition: ["尚未填充的归纳步骤", `<p>n 是“任意当前自然数”的元位置。三个实例共享形状：</p><code>临时采用 𝒜(n)<br>　　　⋮<br>需要得到 𝒜(S(n))</code><p>中间的省略处必须由具体数学论证填充；模板本身不能制造 𝒜(S(n))。</p>`],
      unlock: "尚待填充的归纳步骤框架",
      completionLesson: `<span class="eyebrow">共同形状</span><h3>你只抽象了问题，还没有得到答案</h3><code>n=0　n=1　n=2<br>　　　↓ 共同框架<br>[𝒜(n)]　⋮　𝒜(S(n))</code><p class="layer-note">下一关必须选择一个具体性质，真正填满中间的论证。</p>`,
      validate: ({ values, nodes }) => {
        const expected = { "induction-instance-zero": zNat(0), "induction-instance-one": zNat(1), "induction-instance-two": zNat(2) };
        const correct = Object.entries(expected).every(([id, number]) => values[id] && values[id].kind === "inductionStepInstance" && equal(values[id].number, number));
        return correct && nodes.filter((node) => node.type === "inductionStepInstance").length === 3
          ? pass("三个具体步骤显露了同一个待证明框架；它还不是可以自动运行的推理规则。") : fail("三个步骤实例应分别把 0、1、2 放入同一个 n 位置。 ");
      }
    },
    {
      id: "induction-hypothesis-scope", branch: "induction", requires: ["induction-step-template"], next: "induction-two-parts", chapter: "归纳方法", title: "把一条路径延长一步",
      copy: "给上一关的空框架装入最简单的具体内容：从 0 沿后继 S 能够到达当前对象。左侧确认路径的起点；右侧把一条已经到达 n 的路径再延长一步。",
      goal: "让零步路径到达 0；再用一次后继 S，把已有路径的终点从 n 延长到 S(n)。", tools: ["zSucc"], semanticWorkbench: "induction-hypothesis", multiGoals: ["induction-property-base", "induction-property-step"], artifacts: ["induction-base-and-step"],
      spawnPositions: [{ x: 270, y: 330 }],
      nodes: [
        fixed("induction-property-zero", "路径起点", zNat(0), "set", 25, 105, "0"),
        fixed("induction-property-hypothesis", "临时给定的路径终点", inductionPathEndpoint("n"), "set", 25, 335, "n"),
        { ...goal("set", 535, 105), id: "induction-property-base", label: "零步路径", glyph: "从 0 到达 0" },
        { ...goal("set", 535, 335), id: "induction-property-step", label: "延长后的终点", glyph: "从 0 到达 S(n)" }
      ],
      openingLesson: ["先看路径，再写性质记号", `<p>自然数的构造从 0 开始。每使用一次已经熟悉的后继 <b>S</b>，路径就向前延长一层。</p><code>0 → S(0) → S(S(0)) → …</code><p>本关只问一件事：这条从 0 出发的路径现在能够到达哪里？</p>`],
      hint: "左侧把 0 直接接到零步路径；右侧把已有路径的终点 n 接入唯一的后继 S，再把 S(n) 接到新的终点。",
      definition: ["后继只做一件事", `<p><b>S</b> 仍然是此前构造自然数时使用的后继操作：把 n 送到 S(n)。它不是性质，也不是证明。</p><p>右侧只在这一小步内临时给定一条到达 n 的路径；你使用 S，把它再延长一步。关闭这一步后，留下的是延长任意此类路径的方法，而不是一条无条件到达 n 的路径。</p>`],
      unlock: "从具体路径中得到的归纳基础与归纳步骤",
      completionLesson: `<span class="eyebrow">路径的两个部分</span><h3>基础确定起点，推步延长已有路径</h3><div class="induction-property-summary"><article><small>零步路径</small><code>0</code><b>从 0 能到达 0</b></article><article><small>延长一步</small><code>0 → … → n → S(n)</code><b>到达 n 就能到达 S(n)</b></article></div><p class="layer-note">现在把“从 0 沿 S 能到达 n”简称为 𝒜(n)。上面两项便分别写作 𝒜(0) 与 𝒜(n)⇒𝒜(S(n))。𝒜 是对整条路径的性质记号；S 始终只是后继操作。右侧的 𝒜(n) 只在推步内部临时采用，最终留下的是延长方法。</p>`,
      validate: ({ values, nodes }) => equal(values["induction-property-base"], zNat(0)) && values["induction-property-step"] && values["induction-property-step"].kind === "inductionPathEndpoint" && values["induction-property-step"].expression === "S(n)"
        && nodes.filter((node) => node.type === "zSucc").length === 1
        ? pass("零步路径确定了起点；同一个后继 S 把任意已有路径从 n 延长到了 S(n)。") : fail("把 0 直接接入左侧；右侧只使用一次普通后继 S，将终点 n 延长为 S(n)。")
    },
    {
      id: "induction-two-parts", branch: "induction", requires: ["induction-hypothesis-scope"], next: "induction-arbitrary-history", chapter: "归纳方法", title: "归纳证明的两个入口",
      copy: "要覆盖从 0 开始的整条后继链，必须选对起点，也必须选到可以在每一层重复使用的步骤。从四张已经见过的卡中找出真正足够的两张。",
      goal: "为后继链选择正确的第一份依据与可重复步骤，再输出完整的归纳方法。", tools: [], semanticWorkbench: "induction-two-parts", artifacts: ["ordinary-induction-template"],
      nodes: [
        fixed("induction-base-zero-candidate", "起点候选", inductionEvidence(zNat(0)), "evidence", 20, 35, "𝒜(0)"),
        fixed("induction-base-one-candidate", "起点候选", inductionEvidence(zNat(1)), "evidence", 20, 145, "𝒜(1)"),
        fixed("induction-step-concrete-candidate", "步骤候选", concreteInductionClause(0, 1), "inductionClause", 20, 275, "𝒜(0)⇒𝒜(1)"),
        fixed("induction-step-general-candidate", "步骤候选", inductionClause, "inductionClause", 20, 390, "𝒜(n)⇒𝒜(S(n))"),
        { id: "induction-template-node", type: "inductionTemplate", label: "覆盖整条后继链", glyph: "0 → 1 → 2 → …", inputs: [input("evidence", "第一份依据"), input("inductionClause", "可以重复的步骤")], out: "induction", outLabel: "完整的归纳方法", x: 315, y: 205, fixed: true, inductionCoverageNode: true },
        goal("induction", 650, 220)
      ],
      hint: "起点必须覆盖 0；步骤必须能在到达任何 n 后再次使用。连接候选卡时，观察哪些圆点和箭头真正被覆盖。",
      definition: ["覆盖整条生成链", `<p><b>起点入口</b>需要后继链第一个对象的依据。<b>重复入口</b>需要一份能放在每一条后继边上的方法。</p><p>一条具体的 𝒜(0)⇒𝒜(1) 只跨过第一条边；它不能自动变成下一条边所需的 𝒜(1)⇒𝒜(2)。</p>`],
      unlock: "普通归纳的共同模板",
      completionLesson: `<span class="eyebrow">普通归纳</span><h3>基础必须明确，推步必须能够重复</h3><code>𝒜(0)　　任意 n：𝒜(n)⇒𝒜(S(n))<br>────────────────────────────<br>　　　每个自然数 n 都有 𝒜(n)</code><p class="layer-note">𝒜(1) 会漏掉 0；一条具体传播只能跨过一条边。只有从 0 启动并在任意后继处重复，依据才能覆盖整条生成链。</p>`,
      validate: ({ value }) => value && value.kind === "inductionPrinciple" ? pass("归纳基础与归纳推步已经组成完整模板。") : fail("完整模板必须同时接收 𝒜(0) 与任意后继步骤。")
    },
    {
      id: "induction-arbitrary-history", branch: "induction", requires: ["induction-two-parts"], next: "induction-branching-structure", chapter: "归纳方法", title: "证明沿着构造一起生长",
      copy: "归纳法不是一件要送进节点运行的对象。亲手从 0 连续构造出 4；观察台会把构造图中的每一条后继边，与上一关已经得到的一个推步实例并排展开。",
      goal: "从 0 恰好使用四次后继 S 构造出 4。", tools: ["zSucc"], semanticWorkbench: "induction-history", artifacts: ["ordinary-induction"],
      spawnPositions: [{ x: 155, y: 215 }, { x: 290, y: 215 }, { x: 425, y: 215 }, { x: 560, y: 215 }],
      nodes: [
        fixed("induction-history-zero", "构造起点", zNat(0), "set", 20, 215, "0"),
        { ...goal("set", 725, 215), label: "构造的终点", glyph: "4" }
      ],
      hint: "让四个普通后继首尾相接：0→1→2→3→4。每完成一层，观察台右栏才会出现与这一层对应的依据。",
      definition: ["两段同形的历史", `<p>左栏来自你实际搭出的对象构造：0 经过四次 S 到达 4。右栏不是另一种构造任务，而是把上一关的归纳基础与任意推步沿同一张图展开。</p><p>每出现一条 n→S(n) 的构造边，才有一个对应的 𝒜(n)⇒𝒜(S(n)) 实例。</p>`],
      unlock: "普通自然数归纳：覆盖任意有限后继历史",
      completionLesson: `<span class="eyebrow">构造图就是展开的骨架</span><h3>对象增加一层，依据也增加一层</h3><code>0 → 1 → 2 → 3 → 4<br>𝒜(0) → 𝒜(1) → 𝒜(2) → 𝒜(3) → 𝒜(4)</code><p class="layer-note">“任意 n”不是从 0 一步跳到无限远处。每个实际构造出的自然数都有一段有限历史；基础覆盖起点，推步在其中每条后继边上各实例化一次。</p>`,
      validate: ({ value, nodes }) => equal(value, zNat(4)) && nodes.filter((node) => node.type === "zSucc").length === 4
        ? pass("对象的四层构造历史与依据的四次展开完全对齐。") : fail("从 0 出发，让四个普通后继首尾相接并得到 4。")
    },
    {
      id: "induction-branching-structure", branch: "induction", requires: ["induction-arbitrary-history"], next: "induction-syntax-bridge", chapter: "归纳方法", title: "构造历史第一次分叉",
      copy: "后继 S 只有一个输入，所以它的构造历史是一条链。合取 ∧ 有左、右两个公式输入；用已经熟悉的 P、Q、⊥ 和两个合取，看看构造历史怎样第一次分叉。",
      goal: "构造公式 (P∧Q)∧⊥。", tools: ["and"], semanticWorkbench: "induction-tree-intro", artifacts: ["syntax-construction-tree"],
      spawnPositions: [{ x: 245, y: 145 }, { x: 440, y: 220 }],
      nodes: [
        fixed("induction-tree-p", "原子公式", F.prop("P"), "formula", 25, 70, "P"),
        fixed("induction-tree-q", "原子公式", F.prop("Q"), "formula", 25, 220, "Q"),
        fixed("induction-tree-bottom", "矛盾常元", bottomFormula, "formula", 25, 370, "⊥"),
        { ...goal("formula", 665, 220), label: "构造的根", glyph: "(P∧Q)∧⊥" }
      ],
      openingLesson: ["先把熟悉的构造正式画出来", `<p>你早已构造过 P∧Q。现在把每次构造得到的公式画成一个位置，并从新公式连向它直接使用的子公式。</p><code>　P∧Q<br>　／ ＼<br>P　　Q</code><p>最上方最后形成的公式叫作<b>根</b>；没有子公式的位置叫作<b>叶</b>。∧ 有左、右两个有次序的输入，所以它是<b>二元构造</b>。这种分叉的构造历史叫作一棵树。</p><p>这里的边表示“直接子公式”，不是 Gentzen 证明树中的推理关系。</p>`],
      hint: "先用 P、Q 构造 P∧Q，再把整个 P∧Q 与 ⊥ 分别接入第二个 ∧ 的左右入口。",
      definition: ["树记录直接构造关系", `<p>树不是额外的数学零件，而是当前对象如何由直接子对象逐层形成的视图。一个 ∧ 节点有两个直接子公式，因此构造历史会分成左右两支。</p><p>“二元”描述的是构造器有两个输入，与模型中的二元关系不是同一个概念。</p>`],
      unlock: "根、叶、直接子公式与二元构造已经正式定义",
      completionLesson: `<span class="eyebrow">第一棵正式命名的构造树</span><h3>两个输入让构造历史发生分叉</h3><code>　　　(P∧Q)∧⊥<br>　　　／　　 ＼<br>　 P∧Q　　　⊥<br>　／　＼<br>P　　 Q</code><p class="layer-note">这是一棵有根、有次序的语法树：左右位置不能交换。若要证明根具有某种性质，就必须从它的两个直接子公式各取得一份依据；更深处的 P、Q 不能越过 P∧Q，直接代替整个左子树。</p>`,
      validate: ({ value, nodes }) => equalFormula(value, F.and(conjunctionFormula, bottomFormula)) && nodes.filter((node) => node.type === "and").length === 2
        ? pass("两个合取构造形成了根、内部节点和三片叶子。") : fail("先构造 P∧Q，再把它放在外层合取左边，把 ⊥ 放在右边。")
    },
    {
      id: "induction-syntax-bridge", branch: "induction", requires: ["induction-branching-structure"], next: "induction-formula-finiteness", chapter: "归纳方法", title: "语法树也是逐层生成的",
      copy: "把共同模板接回已经熟悉的语法构造。分别构造一个单输入项构造、一个单输入公式构造和一个双输入公式构造；每个构造需要的归纳假设，恰好来自它的直接输入。",
      goal: "构造 f(t)、∀xA、A∧B，并比较三种构造各需要几份直接依据。", tools: ["funcF", "forall", "and"], semanticWorkbench: "induction-syntax", multiGoals: ["induction-term-case", "induction-unary-formula-case", "induction-binary-formula-case"], artifacts: ["structural-induction-template"],
      spawnPositions: [{ x: 290, y: 70 }, { x: 290, y: 220 }, { x: 290, y: 365 }],
      nodes: [
        fixed("induction-meta-term", "任意直接子项", arbitraryTermT, "term", 20, 70, "t"),
        fixed("induction-meta-x", "量词绑定变量", F.variable, "term", 20, 185, "x"),
        fixed("induction-meta-a", "任意直接子公式", schemaA, "formula", 20, 300, "A"),
        fixed("induction-meta-b", "另一直接子公式", schemaB, "formula", 20, 415, "B"),
        { ...goal("term", 585, 70), id: "induction-term-case", label: "一份项依据", glyph: "f(t)" },
        { ...goal("formula", 585, 220), id: "induction-unary-formula-case", label: "一份公式依据", glyph: "∀xA" },
        { ...goal("formula", 585, 370), id: "induction-binary-formula-case", label: "两份公式依据", glyph: "A∧B" }
      ],
      hint: "t 接入 f；x 与 A 接入 ∀；A、B 分别接入 ∧ 的两个位置。",
      definition: ["结构归纳", `<p>要证明所有项或公式具有某性质，先处理每一种基础叶子；再对每一种复合构造证明：直接子结构具有性质时，构造出的根也具有性质。</p><p>f(t) 只有一个直接子项 t；∀xA 只有一个直接子公式 A；A∧B 有两个直接子公式 A、B。因此它们分别需要一份、一份、两份归纳假设。假设的数量由构造器的直接输入数量决定。</p>`],
      unlock: "项与公式的结构归纳模板",
      completionLesson: `<span class="eyebrow">从构造读取归纳步骤</span><h3>每个直接输入贡献一份归纳假设</h3><code>t → f(t)：一份<br>A → ∀xA：一份<br>A，B → A∧B：两份</code><p class="layer-note">更深的子树不会越过直接子结构单独成为根的假设。现在模板已经完整；下一关把一个真实性质放进其中，第一次完成结构归纳证明。</p>`,
      validate: ({ values }) => equalFormula(values["induction-term-case"], F.func(arbitraryTermT)) && equalFormula(values["induction-unary-formula-case"], F.forall(F.variable, schemaA)) && equalFormula(values["induction-binary-formula-case"], F.and(schemaA, schemaB))
        ? pass("一元与二元语法构造已经显露各自需要的直接子树数量；结构归纳模板完成。") : fail("依次构造 f(t)、∀xA、A∧B，不要交换项位置与公式位置。")
    },
    {
      id: "induction-formula-finiteness", branch: "induction", requires: ["induction-syntax-bridge"], next: "soundness-local-step", alternateNext: "recursion-value-flow", alternateLabel: "进入结构递归支线", chapter: "归纳方法", title: "每棵公式树都是有限的",
      copy: "第一次真正使用结构归纳。构造公式 ∀x(P(x)→∃yR(x,y))；观察台会沿你实际搭出的直接子公式关系，展示有限性怎样从叶子一路传到根。",
      goal: "构造 ∀x(P(x)→∃yR(x,y))。", tools: ["predP", "predR", "imp", "exists", "forall"], semanticWorkbench: "induction-formula-finiteness", artifacts: ["finite-formula-tree"],
      spawnPositions: [{ x: 195, y: 65 }, { x: 195, y: 225 }, { x: 355, y: 300 }, { x: 475, y: 210 }, { x: 585, y: 130 }],
      nodes: [
        fixed("induction-finite-x", "变量", F.variable, "term", 20, 105, "x"),
        fixed("induction-finite-y", "变量", F.variableNamed("y"), "term", 20, 315, "y"),
        { ...goal("formula", 700, 210), label: "整棵公式树", glyph: "∀x(P(x)→∃yR(x,y))" }
      ],
      hint: "用 x 构造 P(x)；用 x、y 构造 R(x,y)，再依次加上 ∃y、→ 和最外层 ∀x。",
      definition: ["一个真实的结构归纳证明", `<p>本关研究的性质是：<b>公式层的语法树是有限的</b>。在公式层，P(x)、R(x,y) 这样的原子公式先作为叶子；它们内部项的有限性可以由同样方法另行证明。</p><p>原子叶子是有限的；一元构造在一棵有限子树上只增加一个根；二元构造把两棵有限子树接到一个新根。语言的每种公式构造都保持有限性，所以每个有限步骤构造出的公式都有有限语法树。</p>`],
      unlock: "第一个结构归纳结论：每个公式都有有限语法树",
      completionLesson: `<span class="eyebrow">第一次使用结构归纳</span><h3>有限性沿着真实构造逐层到达根</h3><code>P(x)　　R(x,y)　　　　　　原子叶<br>　　　　　↓ ∃　　　　　　　一元构造<br>P(x)　→　∃yR(x,y)　　　　　二元构造<br>　　　　　↓ ∀　　　　　　　一元构造</code><p class="layer-note">这里并不是只检查了这一个例子。这个例子把公式语言的两种共同步骤显了出来：一元构造保留有限性，二元构造合并两棵有限树后仍然有限；对所有公式构造逐一如此处理，就得到每棵公式树都有限。</p>`,
      validate: ({ value }) => equalFormula(value, F.forall(F.variable, F.imp(F.pred(F.variable), F.exists(F.variableNamed("y"), F.rel(F.variable, F.variableNamed("y"))))))
        ? pass("原子叶的有限性已经沿存在、蕴含与全称构造逐层到达整棵公式树。") : fail("目标的构造次序是：P(x)、R(x,y)、∃yR(x,y)、P(x)→∃yR(x,y)、最后 ∀x。")
    },
    {
      id: "recursion-value-flow", branch: "recursion", requires: ["induction-formula-finiteness", "sentence-independence"], next: "recursion-term-clauses", chapter: "结构递归", title: "值从叶子长到根",
      copy: "你已经用结构归纳让性质依据沿语法树传播。现在回到 P∧(Q∧P)：不再证明它具有某种性质，而是让每片叶子的真值逐层产生根的真值。",
      goal: "按照公式树构造 v(P∧(Q∧P))，得到假。", tools: ["valuationFn", "truthAndApply"], semanticWorkbench: "recursion-value-flow", artifacts: ["structural-recursion-direction"],
      spawnPositions: [{ x: 180, y: 55 }, { x: 180, y: 205 }, { x: 180, y: 355 }, { x: 355, y: 280 }, { x: 520, y: 190 }],
      nodes: [
        fixed("recursion-leaf-p-left", "左叶", "P", "set", 20, 55, "P"),
        fixed("recursion-leaf-q", "中间叶", "Q", "set", 20, 205, "Q"),
        fixed("recursion-leaf-p-right", "右叶", "P", "set", 20, 355, "P"),
        { ...goal("set", 675, 190), label: "根的真值", glyph: "v(P∧(Q∧P))" }
      ],
      openingLesson: ["这次不是结构归纳", `<p>结构归纳把“子公式已有性质依据”传到父公式；这一关则让子公式先产生值，再由构造子的解释产生父公式的值。</p><p>先完成计算，之后再给这种方法命名。</p>`],
      hint: "三片叶子分别经过 v；先计算右侧 Q∧P，再把它的结果与左侧 P 一起送入第二个合取函数。",
      definition: ["结构递归的方向", `<p>每个复合对象的输出只读取其直接子结构已经产生的输出。公式由叶子向根构造，递归计算也沿同一棵树由叶子向根进行。</p>`],
      unlock: "结构递归：沿结构逐层产生数据",
      completionLesson: `<span class="eyebrow">结构递归</span><h3>归纳传播依据，递归产生数据</h3><div class="recursion-direction-summary"><article><small>结构归纳</small><b>子结构的依据 → 父结构的依据</b></article><article><small>结构递归</small><b>子结构的值 → 父结构的值</b></article></div><code>v(P∧(Q∧P))=真∧(假∧真)=假</code>`,
      validate: ({ value, nodes }) => equal(value, TRUTH_FALSE) && nodes.filter((node) => node.type === "valuationFn").length >= 3 && nodes.filter((node) => node.type === "truthAndApply").length >= 2
        ? pass("真值沿实际公式树从三片叶子到达根；结构递归的方向已经显现。")
        : fail("三片叶子都必须先由 v 读取；右侧合取的结果再成为外层合取的右输入。")
    },
    {
      id: "recursion-term-clauses", branch: "recursion", requires: ["recursion-value-flow"], next: "recursion-formula-clauses", chapter: "结构递归", title: "每种项都知道怎样得到对象",
      copy: "变量、常元和函数项的求值已经分别出现过。现在把它们放在同一张施工台上，并用嵌套项 f(f(x)) 显示：函数项必须先取得直接子项的值。",
      goal: "分别得到 ⟦x⟧=杯子、⟦c⟧=盘子、⟦f(f(x))⟧=杯子。", tools: ["termAssignmentS", "termConstantMeaning", "termFunctionF"], semanticWorkbench: "recursion-term-clauses", multiGoals: ["recursion-term-x", "recursion-term-c", "recursion-term-ffx"], artifacts: ["term-recursion-clauses"],
      spawnPositions: [{ x: 215, y: 65 }, { x: 215, y: 225 }, { x: 215, y: 385 }, { x: 385, y: 330 }],
      nodes: [
        fixed("recursion-term-x-source", "变量项", F.variable, "term", 25, 65, "x"),
        fixed("recursion-term-c-source", "常元项", constantCTerm, "term", 25, 225, "c"),
        fixed("recursion-term-nested-source", "嵌套项的最内层", F.variable, "term", 25, 385, "x"),
        { ...goal("object", 555, 65), id: "recursion-term-x", label: "变量条款的结果", glyph: "⟦x⟧" },
        { ...goal("object", 555, 225), id: "recursion-term-c", label: "常元条款的结果", glyph: "⟦c⟧" },
        { ...goal("object", 555, 385), id: "recursion-term-ffx", label: "函数条款重复两次", glyph: "⟦f(f(x))⟧" }
      ],
      hint: "x 经过 s；c 经过常元解释；最下方的 x 先经过 s，再连续经过两次 fᴹ。",
      definition: ["项求值的三类条款", `<p>变量读取赋值，常元读取模型解释，函数项先求直接子项的值，再应用函数解释。只有第三条真正调用了同一个求值方法处理更小的项。</p>`],
      unlock: "项求值的结构递归定义",
      completionLesson: `<span class="eyebrow">项上的结构递归</span><h3>三种项构造决定三条求值路径</h3><code>⟦x⟧ᴹ,s=s(x)<br>⟦c⟧ᴹ,s=cᴹ<br>⟦f(t)⟧ᴹ,s=fᴹ(⟦t⟧ᴹ,s)</code><p class="layer-note">t 是递归条款中“任意直接子项”的位置，不是语言中新增加的项。</p>`,
      validate: ({ values, nodes }) => equal(values["recursion-term-x"], "杯子") && equal(values["recursion-term-c"], "盘子") && equal(values["recursion-term-ffx"], "杯子") && nodes.filter((node) => node.type === "termFunctionF").length >= 2
        ? pass("变量、常元和函数项的三种求值方式已经收成同一份递归定义。")
        : fail("嵌套项必须从 x 开始，先读 s，再让所得对象连续经过两次 fᴹ。")
    },
    {
      id: "recursion-formula-clauses", branch: "recursion", requires: ["recursion-term-clauses"], next: "soundness-local-step", chapter: "结构递归", title: "从对象一直算到句子",
      copy: "在固定世界中求值 ∀x(P(f(x))→Q(c))。两条量词路径必须分别完成项求值、原子求值和蕴含求值，最后才能汇入全称量词。",
      goal: "完成 x↦杯子与 x↦盘子两条路径，得到整个句子为真。", tools: ["termFunctionF", "termConstantMeaning"], artifacts: ["formula-recursion-clauses"],
      spawnPositions: [{ x: 190, y: 55 }, { x: 190, y: 245 }, { x: 190, y: 415 }],
      nodes: [
        fixed("recursion-formula-cup-value", "s[x↦杯子] 已给出的 x 值", "杯子", "object", 20, 55, "杯子"),
        fixed("recursion-formula-plate-value", "s[x↦盘子] 已给出的 x 值", "盘子", "object", 20, 245, "盘子"),
        fixed("recursion-formula-c", "常元项", constantCTerm, "term", 20, 415, "c"),
        { id: "recursion-p-cup", type: "recursionPredicateP", label: "求 P(f(x))", glyph: "Pᴹ={盘子}", inputs: registry.recursionPredicateP.inputs, out: registry.recursionPredicateP.out, x: 365, y: 55, fixed: true },
        { id: "recursion-p-plate", type: "recursionPredicateP", label: "求 P(f(x))", glyph: "Pᴹ={盘子}", inputs: registry.recursionPredicateP.inputs, out: registry.recursionPredicateP.out, x: 365, y: 245, fixed: true },
        { id: "recursion-q-c", type: "recursionPredicateQ", label: "求 Q(c)", glyph: "Qᴹ={盘子}", inputs: registry.recursionPredicateQ.inputs, out: registry.recursionPredicateQ.out, x: 365, y: 415, fixed: true },
        { id: "recursion-imp-cup", type: "truthImpApply", label: "杯子赋值下的辖域", glyph: "→", inputs: registry.truthImpApply.inputs, out: registry.truthImpApply.out, x: 555, y: 105, fixed: true },
        { id: "recursion-imp-plate", type: "truthImpApply", label: "盘子赋值下的辖域", glyph: "→", inputs: registry.truthImpApply.inputs, out: registry.truthImpApply.out, x: 555, y: 315, fixed: true },
        { id: "recursion-forall-root", type: "recursionForallTwo", label: "汇总整个论域", glyph: "∀x", inputs: registry.recursionForallTwo.inputs, out: registry.recursionForallTwo.out, x: 755, y: 210, fixed: true },
        { ...goal("set", 955, 210), label: "整句的真值", glyph: "∀x(P(f(x))→Q(c))" }
      ],
      hint: "两条 x 路径分别先经过 fᴹ，再进入 Pᴹ；c 经过常元解释后进入 Qᴹ，并把同一个 Q(c) 真值分接给两条蕴含。最后按杯子、盘子的顺序接入 ∀x。",
      definition: ["公式求值的三类递归条款", `<p>原子公式先求项值并读取谓词解释；连接词先求直接子公式的真值；量词改变变量赋值，并在每个新赋值下重新求辖域的真值。</p>`],
      unlock: "一阶公式求值的结构递归定义",
      completionLesson: `<span class="eyebrow">结构递归支线完成</span><h3>语言的构造方式已经决定了它的求值方式</h3><code>项：变量、常元、函数项 → 对象<br>公式：原子、连接词、量词 → 真值</code><p class="layer-note">项求值与公式求值不是另附的一张计算表：每一种语言构造都给出相应的求值条款，复合表达式只读取直接子结构已经产生的结果。递归定义作为集合函数的存在性与唯一性留给之后的良基递归路线。</p>`,
      validate: ({ value, nodes }) => equal(value, TRUTH_TRUE) && nodes.filter((node) => node.type === "termFunctionF").length >= 2 && nodes.some((node) => node.type === "termConstantMeaning")
        ? pass("项、原子公式、连接词和量词的求值已经接成一条完整结构递归。")
        : fail("每条量词路径都要从对应的 x 值开始；Q(c) 可以共享，但两个 P(f(x)) 必须分别计算。")
    },
    {
      id: "soundness-local-step", branch: "soundness", requires: ["induction-formula-finiteness"], next: "soundness-all-valuations", chapter: "元理论 · 可靠性", title: "一条推理会不会丢掉真",
      copy: "先只看一次熟悉的 →E。当前赋值让 P→Q 与 P 都为真；亲手应用规则得到 Q，观察横线上下的真假怎样对应。",
      goal: "从已经为真的 P→Q 与 P 应用一次 →E，得到 Q。", tools: ["impElim"], proofViews: true, fitchView: true, semanticWorkbench: "soundness-local-step", artifacts: ["truth-preserving-instance"],
      spawnPositions: [{ x: 315, y: 205 }],
      nodes: [
        fixed("soundness-step-imp", "当前为真", proofObject("given", implicationFormula, [implicationFormula]), "proof", 20, 100, "P→Q"),
        fixed("soundness-step-p", "当前为真", proofObject("given", F.prop("P"), [F.prop("P")]), "proof", 20, 305, "P"),
        goal("proof", 565, 205)
      ],
      hint: "把 P→Q、P 依次接入 →E 的两个入口，再把所得 Q 接到目标。",
      definition: ["规则保持真", `<p>研究一个推理规则是否可靠，不是问结论能否脱离前提单独为真，而是问：<b>当这一步的全部前提都真时，结论会不会变成假</b>。</p><p>本关先观察一个具体赋值下的一次规则应用；下一关再把所有赋值一起纳入。</p>`],
      unlock: "一次 →E 应用中的真值保持现象",
      completionLesson: `<span class="eyebrow">局部观察</span><h3>这一步没有把真前提变成假结论</h3><code>P→Q：真　　P：真<br>────────────── →E<br>　　 Q：真</code><p class="layer-note">一个成功例子还不能说明规则在所有赋值下都可靠。下一关要寻找是否存在“上方全真、下方为假”的反例。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "impElim" && equalFormula(value.conclusion, F.prop("Q"))
        ? pass("P→Q 与 P 都真时，→E 得到的 Q 也真；这一次应用没有丢掉真。") : fail("把两条已经得到的前提按顺序送入 →E。")
    },
    {
      id: "soundness-all-valuations", branch: "soundness", requires: ["soundness-local-step"], next: "soundness-or-cases", chapter: "元理论 · 可靠性", title: "所有赋值都找不到反例",
      copy: "上一关只观察了一次成功的 →E。现在把“是否存在前提全真而结论假的赋值”转写成一个公式，再用已经熟悉的永真式检查覆盖所有赋值。",
      goal: "构造与 →E 保真条件对应的公式 ((P→Q)∧P)→Q，并考察 P、Q 的全部四种赋值。", tools: ["propP", "propQ", "imp", "and"], formulaViews: true, formulaViewOptions: ["construction", "syntax", "evaluation"], valuationProps: ["P", "Q"], formalValuation: true, truthTable: true, artifacts: ["imp-elim-truth-preservation"],
      spawnPositions: [{ x: 120, y: 65 }, { x: 120, y: 340 }, { x: 285, y: 120 }, { x: 430, y: 205 }, { x: 565, y: 205 }],
      nodes: [goal("formula", 735, 205)],
      openingLesson: ["把规则的可靠性问题写成公式", `<p>上一关使用的是推理规则：</p><code>P→Q　　P<br>──────── →E<br>　　Q</code><p>它若不可靠，就会存在一种赋值，让横线上方的两个前提同时为真，而横线下方的 Q 为假。</p><div class="soundness-counterexample-bridge"><article><small>两个前提同时为真</small><code>(P→Q)∧P</code></article><i>并且</i><article><small>结论为假</small><code>¬Q</code></article></div><p>所以反例条件可以写成 <code>(P→Q)∧P∧¬Q</code>。不存在这种反例，等价于下面的公式在每个赋值下都为真：</p><code>((P→Q)∧P)→Q</code><p><b>Q 本身不是永真式。</b>永真的是这个完整的条件句：只要规则的全部前提为真，结论就不会为假。</p>`],
      hint: "先构造 P→Q，再把它与同一个 P 合取；最后以整个合取为前件、Q 为后件构造蕴含。到求值过程页切换 P、Q，直到四行都出现。",
      definition: ["永真式怎样表达规则保真", `<p>永真式是一个公式在所有赋值下为真；语义后承则要求每个满足前提的赋值也满足结论。对于有限个命题前提，可以先把前提合取，再用蕴含连接结论。</p><code>{P→Q,P}⊨Q<br>⇔<br>⊨((P→Q)∧P)→Q</code><p>推理规则、语义后承与对应公式仍是三种不同对象；这里的公式只是把“前提全真而结论假”的反例条件编码出来。</p>`],
      unlock: "→E 对每个命题赋值都保持真",
      completionLesson: `<span class="eyebrow">永真式与可靠性第一次汇合</span><h3>同一份保真保证的三种写法</h3><div class="soundness-three-forms"><article><small>推理规则</small><code>P→Q　　P<br>─────── →E<br>　 Q</code></article><article><small>语义后承</small><code>{P→Q,P}⊨Q</code></article><article><small>对应永真式</small><code>⊨((P→Q)∧P)→Q</code></article></div><p class="layer-note">Q 并不是永真式；完整条件句才是。当前提没有同时为真时，规则并未被应用；当前提同时为真时，Q 必定为真。三种写法不是同一种对象，但在这个有限命题情形中表达同一份“找不到反例”的保证。</p>`,
      validate: ({ value, truthTableRows }) => equalFormula(value, soundnessPreservationFormula) && truthTableRows && truthTableRows.size === 4
        ? pass("四种赋值已经穷尽；没有一行让 →E 的全部前提为真而结论为假。") : fail("先完成目标公式，再到求值过程切换 P、Q，生成假假、假真、真假、真真四行。")
    },
    {
      id: "soundness-or-cases", branch: "soundness", requires: ["soundness-all-valuations"], next: "soundness-flags", chapter: "元理论 · 可靠性", title: "两条安全道路",
      copy: "∨E 的可靠性不能只检查一条分支。从 P∨Q 出发，分别在临时 P、临时 Q 中得到同一个 Q∨P，再让两条道路汇合。",
      goal: "完成两条分支，并用 ∨E 从 P∨Q 得到 Q∨P。", tools: [], proofViews: true, fitchView: true, semanticWorkbench: "soundness-or-cases", artifacts: ["or-elim-truth-preservation"],
      nodes: [
        fixed("soundness-or-source", "来自 Γ", proofObject("given", F.or(F.prop("P"), F.prop("Q")), [F.or(F.prop("P"), F.prop("Q"))]), "proof", 15, 205, "P∨Q"),
        caseAssumptionNode("soundness-or-left", "left", "soundness-left-case", 125, 55),
        fixed("soundness-or-left-q", "放在左侧", F.prop("Q"), "formula", 125, 275, "Q"),
        { id: "soundness-or-left-intro", type: "orIntro2", label: "使用 ∨I₂", glyph: "Q∨P", inputs: registry.orIntro2.inputs, out: registry.orIntro2.out, outLabel: "左分支得到 Q∨P", x: 235, y: 155, fixed: true, scopeBound: true, scopeId: "soundness-left-case" },
        caseAssumptionNode("soundness-or-right", "right", "soundness-right-case", 300, 55),
        fixed("soundness-or-right-p", "放在右侧", F.prop("P"), "formula", 300, 275, "P"),
        { id: "soundness-or-right-intro", type: "orIntro1", label: "使用 ∨I₁", glyph: "Q∨P", inputs: registry.orIntro1.inputs, out: registry.orIntro1.out, outLabel: "右分支得到 Q∨P", x: 410, y: 155, fixed: true, scopeBound: true, scopeId: "soundness-right-case" },
        orElimNode("soundness-or-elim", "soundness-left-case", "soundness-right-case", 350, 390),
        goal("proof", 525, 390)
      ],
      scopeFrames: [
        { id: "soundness-left-case", label: "P 为真的情况", x: 110, y: 25, width: 175, height: 360 },
        { id: "soundness-right-case", label: "Q 为真的情况", x: 285, y: 25, width: 175, height: 360 }
      ],
      hint: "P∨Q 同时接入两个分支入口和 ∨E；左侧从 P 得 Q∨P，右侧从 Q 得 Q∨P，最后把两个相同结论接入 ∨E。",
      definition: ["∨E 为什么需要两条分支", `<p>P∨Q 为真只保证至少一边为真，并没有告诉我们是哪一边。左、右分支必须各自在自己的情况中保持真，并到达同一个 C；这样无论实际走哪条道路，C 都不会失败。</p>`],
      unlock: "分类讨论的两分支保真结构",
      completionLesson: `<span class="eyebrow">覆盖全部可能</span><h3>析取为真时，总有一条真实分支</h3><p>P 为真时左分支保证 Q∨P；Q 为真时右分支保证 Q∨P。两类覆盖了 P∨Q 成立的所有方式，因此共同结论能够安全离开子证明。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "orElim" && equalFormula(value.conclusion, swappedDisjunction)
        && hasScopeDependency(value.children[1], "soundness-left-case", F.prop("P")) && hasScopeDependency(value.children[2], "soundness-right-case", F.prop("Q"))
        ? pass("P、Q 两种真实情况都到达 Q∨P；∨E 汇合后没有遗漏析取成立的方式。") : fail("两条分支必须来自同一个 P∨Q，各自到达完全相同的 Q∨P，再一起进入 ∨E。")
    },
    {
      id: "soundness-flags", branch: "soundness", requires: ["soundness-or-cases"], next: "soundness-proof-tree", chapter: "元理论 · 可靠性", title: "Flag 正是在保护可靠性",
      copy: "构造一个最小反例世界：论域有杯子、盘子，但 P 只适用于杯子；再让普通名字 y 指向杯子。观察为什么 P(y) 真仍不能推出 ∀xP(x)。",
      goal: "构造 Pᴹ={杯子} 与 s={⟨y,杯子⟩}。", tools: ["ord", "set1"], semanticWorkbench: "soundness-flags", multiGoals: ["soundness-flag-p", "soundness-flag-s"], artifacts: ["flag-soundness-condition"],
      spawnPositions: [{ x: 220, y: 75 }, { x: 220, y: 315 }, { x: 400, y: 315 }],
      nodes: [
        fixed("soundness-flag-y", "普通名字", "y", "set", 20, 75, "y"),
        fixed("soundness-flag-cup", "论域对象", "杯子", "set", 20, 230, "杯子"),
        fixed("soundness-flag-plate", "论域对象", "盘子", "set", 20, 385, "盘子"),
        { ...goal("set", 565, 95), id: "soundness-flag-p", label: "P 的解释", glyph: "Pᴹ" },
        { ...goal("set", 565, 320), id: "soundness-flag-s", label: "变量赋值", glyph: "s" }
      ],
      hint: "杯子单独收成 Pᴹ；y 与杯子先组成有序对，再把它收成单元素集作为 s。盘子留在论域中，但不要放进 Pᴹ。",
      definition: ["任意性是保真的条件", `<p>普通 y 可以因当前赋值恰好指向杯子而使 P(y) 为真，这不包含任何关于盘子的信息。全称 Flag 要求名字不受外部前提和既定身份限制，正是为了让旗内推理能代表论域中的任意对象。</p>`],
      unlock: "量词 Flag 的可靠性作用",
      completionLesson: `<span class="eyebrow">一个明确反例</span><h3>没有 Flag 的全称引入会丢掉真</h3><code>𝔐,s⊨P(y)　但　𝔐,s⊭∀xP(x)</code><p class="layer-note">全称 Flag 排除的正是这种“只对一个被选中的对象成立”的推理。Flag 不是证明排版，而是 ∀I 保持真的必要边界条件；存在 Flag 对临时见证承担同样职责。</p>`,
      validate: ({ values }) => equal(values["soundness-flag-p"], set("杯子")) && equal(values["soundness-flag-s"], set(orderedPair("y", "杯子")))
        ? pass("P(y) 因 y 恰好指向杯子而真，∀xP(x) 却因盘子失败；无 Flag 的推理确实会丢掉真。") : fail("Pᴹ 只收杯子；赋值 s 只记录 y↦杯子。")
    },
    {
      id: "soundness-proof-tree", branch: "soundness", requires: ["soundness-flags"], next: "soundness-proof-height", chapter: "元理论 · 可靠性", title: "真沿着整棵证明树传递",
      copy: "固定一个满足 Γ={P∧Q,Q→R} 的赋值。先从 P∧Q 取出 Q，再与 Q→R 合用得到 R；观察每一步怎样只依赖它的直接上层。",
      goal: "从 Γ={P∧Q,Q→R} 推导 R。", tools: ["andElim2", "impElim"], proofViews: true, fitchView: true, semanticWorkbench: "soundness-proof-tree", artifacts: ["truth-through-proof-tree"],
      spawnPositions: [{ x: 245, y: 120 }, { x: 430, y: 205 }],
      nodes: [
        fixed("soundness-tree-conjunction", "来自 Γ", proofObject("given", soundnessPAndQ, [soundnessPAndQ]), "proof", 20, 85, "P∧Q"),
        fixed("soundness-tree-implication", "来自 Γ", proofObject("given", soundnessQImpR, [soundnessQImpR]), "proof", 20, 325, "Q→R"),
        goal("proof", 585, 205)
      ],
      hint: "先对 P∧Q 使用 ∧E₂ 得到 Q；再把 Q→R 与这个 Q 接入 →E。",
      definition: ["从局部保真到整棵证明", `<p>模型满足 Γ，意味着证明树的长期前提叶都真。每个规则步骤若在直接前提为真时保证结论为真，那么真值就能沿有限证明树逐层到达根。</p>`],
      unlock: "一棵具体证明树上的逐层保真",
      completionLesson: `<span class="eyebrow">从叶到根</span><h3>每一层只使用已经为真的直接依据</h3><code>P∧Q：真<br>────── ∧E₂<br>Q：真　　Q→R：真<br>──────────── →E<br>　　 R：真</code><p class="layer-note">两条已经构造的局部规则逐层完成了传递。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "impElim" && equalFormula(value.conclusion, soundnessR) && proofUsesRule(value, "andElim2")
        ? pass("满足 Γ 的赋值让两片前提叶为真；∧E₂ 与 →E 逐层把真带到根 R。") : fail("先从 P∧Q 得到 Q，再用 Q→R 与 Q 得到 R。")
    },
    {
      id: "soundness-proof-height", branch: "soundness", requires: ["soundness-proof-tree"], next: "soundness-structural-proof", chapter: "元理论 · 可靠性", title: "同一个结论，不同的证明高度",
      copy: "同一个 Q 可以直接作为前提，也可以从 P∧Q 推导出来。分别完成两份证明，观察它们的结论虽然相同，证明树的高度却不同。",
      goal: "让 Q 直接到达第一处；再从 P∧Q 得到 Q，送到第二处。", tools: ["andElim2"], proofViews: true, fitchView: true, runTarget: "proof-height-derived", semanticWorkbench: "soundness-proof-height", multiGoals: ["proof-height-direct", "proof-height-derived"], artifacts: ["proof-height"],
      spawnPositions: [{ x: 300, y: 310 }],
      nodes: [
        fixed("proof-height-q", "来自 Γ", proofObject("given", F.prop("Q"), [F.prop("Q")]), "proof", 25, 80, "Q"),
        fixed("proof-height-conjunction", "来自 Γ", proofObject("given", soundnessPAndQ, [soundnessPAndQ]), "proof", 25, 330, "P∧Q"),
        { ...goal("proof", 575, 80), id: "proof-height-direct", label: "直接证明", glyph: "Q" },
        { ...goal("proof", 575, 330), id: "proof-height-derived", label: "经过一步", glyph: "Q" }
      ],
      hint: "上方的 Q 直接连接上方目标；下方先对 P∧Q 使用 ∧E₂，再连接下方目标。",
      definition: ["证明高度", `<p>前提叶没有规则步骤，高度记作 0。若证明的最后一步把若干份子证明接到新根，那么新证明的高度是最高子证明的高度再加 1。</p><code>h(前提叶)=0<br>h(r(π₁,…,πₖ))=1+max(h(π₁),…,h(πₖ))</code>`],
      unlock: "按证明高度作归纳",
      completionLesson: `<span class="eyebrow">结论不能决定证明高度</span><h3>归纳跟随的是证明的生成过程</h3><p>上方的 Q 是前提叶，高度为 0；下方的 Q 经一次 ∧E₂ 得到，高度为 1。可靠性证明要归纳的是一份证明有多少层，而不是根上公式长什么样。</p>`,
      validate: ({ values }) => values["proof-height-direct"]?.kind === "proof" && values["proof-height-direct"].rule === "given" && equalFormula(values["proof-height-direct"].conclusion, F.prop("Q"))
        && values["proof-height-derived"]?.kind === "proof" && values["proof-height-derived"].rule === "andElim2" && equalFormula(values["proof-height-derived"].conclusion, F.prop("Q"))
        ? pass("两份证明都以 Q 为结论；直接前提的高度是 0，经过 ∧E₂ 的证明高度是 1。") : fail("上方直接送入 Q；下方必须从 P∧Q 经 ∧E₂ 得到 Q。")
    },
    {
      id: "soundness-structural-proof", branch: "soundness", requires: ["soundness-proof-height"], next: "soundness-general-induction", chapter: "元理论 · 可靠性", title: "沿证明高度完成归纳",
      copy: "照常构造一份从 Γ 到 R∧Q 的证明。观察台会自动标出每一层的高度，并展示最后一步下面的子证明为什么已经落在归纳假设中。",
      goal: "从 Γ={P∧Q,Q→R} 推导 R∧Q。", tools: ["andElim2", "impElim", "andIntro"], proofViews: true, fitchView: true, semanticWorkbench: "soundness-structural-proof", artifacts: ["proof-tree-induction"],
      spawnPositions: [{ x: 205, y: 120 }, { x: 350, y: 245 }, { x: 505, y: 205 }],
      nodes: [
        fixed("soundness-induction-conjunction", "来自 Γ", proofObject("given", soundnessPAndQ, [soundnessPAndQ]), "proof", 15, 75, "P∧Q"),
        fixed("soundness-induction-implication", "来自 Γ", proofObject("given", soundnessQImpR, [soundnessQImpR]), "proof", 15, 340, "Q→R"),
        goal("proof", 595, 205)
      ],
      hint: "从 P∧Q 得到 Q；用 Q→R 与 Q 得到 R；最后把 R、Q 按这个顺序送入 ∧I。",
      definition: ["对证明高度作归纳", `<p>令 𝒮(π) 表示：只要模型满足证明 π 的全部长期前提，它就满足 π 的结论。高度为 0 时，π 只是前提叶。高度为 n+1 时，最后一步的每份直接子证明高度都不超过 n；归纳假设先保证它们的结论为真，再由最后一条规则的局部保真得到新根为真。</p>`],
      unlock: "可靠性证明所需的证明树结构归纳",
      completionLesson: `<span class="eyebrow">归纳变量已经可见</span><h3>最后一步下面永远是更矮的证明</h3><div class="induction-template-summary"><article><b>高度 0</b><span>模型满足 Γ，所以前提叶为真</span></article><article><b>高度 n+1</b><span>子证明更矮；归纳假设与规则保真把真带到新根</span></article></div><p class="layer-note">这份证明的各层高度依次是 0、1、2、3。任意有限证明都能用同一个高度归纳论证，因此局部保真可以提升为整体可靠性。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "andIntro" && equalFormula(value.conclusion, soundnessProofTarget)
        && proofUsesRule(value, "andElim2") && proofUsesRule(value, "impElim")
        ? pass("叶、一元步骤与二元步骤已经组成完整证明树；结构归纳把真带到根 R∧Q。") : fail("依次得到 Q、R，最后用 ∧I 按 R、Q 的顺序构造根。")
    },
    {
      id: "soundness-general-induction", branch: "soundness", requires: ["soundness-structural-proof"], next: "soundness-overview", chapter: "元理论 · 可靠性", title: "让任意证明都保持真",
      copy: "现在不再固定某棵证明。π 表示任意一份证明：先处理它只有前提叶的情形，再处理它由若干份更矮的子证明接上最后一条规则形成的情形。",
      goal: "在归纳证明板上，分别为高度 0 与高度 n+1 的结论连接全部依据。", tools: [], semanticWorkbench: "soundness-general-induction", soundnessInductionBoard: true, artifacts: ["soundness-induction-proof"],
      nodes: [
        { ...fixed("soundness-meta-membership", "来自公式集的前提叶", soundnessMeta.membership, "soundnessMembership", 20, 65, "A∈Γ", true), metaProofBoard: true },
        { ...fixed("soundness-meta-gamma", "模型满足公式集", soundnessMeta.gammaSatisfied, "soundnessGammaSatisfied", 20, 195, "𝔐,s⊨Γ", true), metaProofBoard: true },
        { id: "soundness-general-base", type: "goal", label: "高度 0 的结论", glyph: "𝔐,s⊨A", inputs: [input("soundnessMembership", "A 是 Γ 中的前提叶"), input("soundnessGammaSatisfied", "模型满足整个 Γ")], out: null, x: 470, y: 125, fixed: true, goal: true, metaProofBoard: true, slotBody: "把结论依赖的两条事实连到这里" },
        { ...fixed("soundness-meta-smaller", "更矮的直接子证明（若有）", soundnessMeta.smallerProofs, "soundnessSmallerProofs", 20, 345, "h(πᵢ)≤n", true), metaProofBoard: true },
        { ...fixed("soundness-meta-local", "最后规则的语义依据", soundnessMeta.localPreservation, "soundnessLocalPreservation", 245, 435, "r 局部保真", true), metaProofBoard: true },
        { id: "soundness-general-step", type: "goal", label: "高度 n+1 的结论", glyph: "𝔐,s⊨A", inputs: [input("soundnessSmallerProofs", "归纳假设作用于所有存在的直接子证明"), input("soundnessLocalPreservation", "最后规则 r 的局部保真")], out: null, x: 585, y: 345, fixed: true, goal: true, metaProofBoard: true, slotBody: "把归纳假设与最后规则的依据连到这里" }
      ],
      hint: "高度 0 的结论依赖 A∈Γ 与 𝔐,s⊨Γ；高度 n+1 的结论依赖更矮的直接子证明，以及最后规则 r 的局部保真。这里只连接依据，不需要任何新零件。",
      definition: ["归纳命题与规则参数", `<p>π 是“任意一份证明”的元记号，不是一阶语言中的公式。归纳命题是：若 π 是 Γ⊢A 的证明，那么 Γ⊨A。</p><p>直接子证明可以带有自己的公式集 Γᵢ；对它们使用归纳假设得到 Γᵢ⊨Bᵢ。最后一步的 r 再按照自己的依赖规则，把这些语义后承变成 Γ⊨A。</p>`],
      unlock: "从形式证明通向语义后承的可靠性定理",
      completionLesson: `<span class="eyebrow">一般结论</span><h3>归纳不再依赖某棵具体证明</h3><code>Γ⊢A　⇒　Γ⊨A</code><p>子证明可以暂时使用扩大的公式集；→I、∨E、∃E 等规则会按各自方式解除临时依赖。高度 0 与高度 n+1 两种情形覆盖了每一份有限证明。</p>`,
      validate: ({ connections }) => {
        const linked = (from, to, inputIndex) => connections.some((connection) => connection.from === from && connection.to === to && connection.input === inputIndex);
        const baseReady = linked("soundness-meta-membership", "soundness-general-base", 0) && linked("soundness-meta-gamma", "soundness-general-base", 1);
        const stepReady = linked("soundness-meta-smaller", "soundness-general-step", 0) && linked("soundness-meta-local", "soundness-general-step", 1);
        return baseReady && stepReady
          ? pass("归纳基础与归纳推步都已完成：每份从 Γ 推导 A 的有限证明都保证 Γ⊨A。")
          : fail("需要为高度 0 与高度 n+1 的结论分别连接全部依据。");
      }
    },
    {
      id: "soundness-overview", branch: "soundness", requires: ["soundness-general-induction"], next: "countermodel-blocks-proof", chapter: "元理论 · 可靠性", title: "证明不会超出语义",
      copy: "局部规则、Flag 条件与证明树归纳现在汇成第一个元定理。本关没有接线任务；完整查看可靠性定理后即可返回地图。",
      goal: "完整查看一阶逻辑可靠性定理。", tools: [], nodes: [], overview: true, soundnessOverview: true, artifacts: ["first-order-soundness"],
      hint: "这一关没有谜题。页面并排展示 Γ⊢A 与 Γ⊨A，并说明结构归纳怎样连接两者。",
      definition: ["可靠性定理", `<p>若存在一份从 Γ 推导 A 的形式证明，那么每个满足 Γ 的模型与赋值都满足 A。</p><code>Γ⊢A　⇒　Γ⊨A</code><p>可靠性只断言从左到右；反方向是之后的完备性问题。</p>`],
      unlock: "一阶逻辑可靠性定理",
      validate: () => pass("一阶逻辑可靠性定理已经完整呈现。")
    },
    {
      id: "countermodel-blocks-proof", branch: "countermodel", requires: ["soundness-overview"], next: "model-proves-consistency", chapter: "元理论 · 反模型与相容性", title: "一个世界就能阻止证明",
      copy: "可靠性说：只要 T⊢A，每个 T 的模型都必须满足 A。现在反过来利用它——亲手构造一个满足 T、却让候选结论失败的模型。",
      goal: "在 D={杯子,盘子} 上构造 Pᴹ=∅、Qᴹ={杯子}。", tools: ["empty", "set1"], semanticWorkbench: "countermodel-proof", multiGoals: ["countermodel-p", "countermodel-q"], artifacts: ["countermodel-method"],
      spawnPositions: [{ x: 250, y: 110 }, { x: 250, y: 315 }],
      nodes: [
        fixed("countermodel-cup", "论域对象", "杯子", "set", 25, 145, "杯子"),
        fixed("countermodel-plate", "论域对象", "盘子", "set", 25, 350, "盘子"),
        semanticGoal("countermodel-p", "解释 P", "Pᴹ", "P 适用的对象集合", 555, 145),
        semanticGoal("countermodel-q", "解释 Q", "Qᴹ", "Q 适用的对象集合", 555, 350)
      ],
      hint: "把空集接到 Pᴹ；用杯子构造单元素集，再接到 Qᴹ。盘子留在 Qᴹ 之外，正是结论失败的原因。",
      definition: ["反模型", `<p>若一个模型满足全部前提，却不满足候选结论，它就是这次语义后承的<b>反模型</b>。</p><code>𝔐⊨T　但　𝔐⊭A</code><p>于是 T⊭A。再结合已经证明的可靠性：若真有 T⊢A，就必有 T⊨A；所以一个反模型同时排除了形式证明。</p>`],
      unlock: "反模型法：用一个模型证明不可推导",
      completionLesson: `<span class="eyebrow">可靠性的逆否用法</span><h3>一个反模型胜过搜索所有证明</h3><code>𝔐⊨T　且　𝔐⊭∀xQ(x)<br>──────────────────<br>T⊭∀xQ(x)，因此 T⊬∀xQ(x)</code><p class="layer-note">这里 T={∀x(P(x)→Q(x))}。Pᴹ 为空使前提成立；盘子不属于 Qᴹ，使全称结论失败。可靠性保证：若存在形式证明，这个反模型就不可能存在。</p>`,
      validate: ({ values }) => equal(values["countermodel-p"], empty()) && equal(values["countermodel-q"], set("杯子"))
        ? pass("这个模型满足前提，却让 ∀xQ(x) 为假；它排除了 T⊢∀xQ(x)。")
        : fail("让 Pᴹ 为空，并让 Qᴹ 只包含杯子。")
    },
    {
      id: "model-proves-consistency", branch: "countermodel", requires: ["countermodel-blocks-proof"], next: "satisfiability-consistency-overview", chapter: "元理论 · 反模型与相容性", title: "有模型，就推不出矛盾",
      copy: "理论 T 要求存在 P 对象，并要求每个 P 对象都是 Q 对象。构造一个满足它的模型，再问：T 能否同时推出永远为假的 ⊥？",
      goal: "在 D={杯子,盘子} 上构造 Pᴹ=Qᴹ={杯子}。", tools: ["set1"], semanticWorkbench: "consistency-from-model", multiGoals: ["consistency-p", "consistency-q"], artifacts: ["satisfiable-implies-consistent"],
      spawnPositions: [{ x: 250, y: 220 }],
      nodes: [
        fixed("consistency-cup", "论域对象", "杯子", "set", 25, 145, "杯子"),
        fixed("consistency-plate", "论域对象", "盘子", "set", 25, 350, "盘子"),
        semanticGoal("consistency-p", "解释 P", "Pᴹ", "P 适用的对象集合", 555, 145),
        semanticGoal("consistency-q", "解释 Q", "Qᴹ", "Q 适用的对象集合", 555, 350)
      ],
      hint: "只需用杯子构造 {杯子}；同一个集合输出可以分别接到 Pᴹ 与 Qᴹ。",
      definition: ["语法相容", `<p>理论 T 是<b>相容的</b>，指从 T 不能形式推导出矛盾常元：</p><code>T⊬⊥</code><p>这是关于证明的定义；“T 有模型”则是语义性质。可靠性把二者连接起来。</p>`],
      unlock: "可满足蕴含相容",
      completionLesson: `<span class="eyebrow">从模型回望证明</span><h3>这个真实世界容不下矛盾结论</h3><code>𝔐⊨T　　𝔐⊭⊥<br><br>若 T⊢⊥，可靠性将给出 T⊨⊥，与上面矛盾。<br>所以 T⊬⊥。</code><p class="layer-note">可满足说明至少存在一个 T 的模型；相容说明不存在从 T 到 ⊥ 的形式证明。你刚用可靠性证明了：可满足 ⇒ 相容。</p>`,
      validate: ({ values }) => equal(values["consistency-p"], set("杯子")) && equal(values["consistency-q"], set("杯子"))
        ? pass("你构造了 T 的模型；可靠性因此排除了 T⊢⊥。")
        : fail("让 Pᴹ 与 Qᴹ 都恰好是 {杯子}。")
    },
    {
      id: "satisfiability-consistency-overview", branch: "countermodel", requires: ["model-proves-consistency"], next: "completeness-consistent-start", chapter: "元理论 · 反模型与相容性", title: "两种“没有坏掉”",
      copy: "可满足与相容分别观察模型和证明。它们已经由可靠性连接了一半；本关没有装配任务，完整查看区别后即可返回地图。",
      goal: "区分可满足与相容，并看见完备性将要填补的方向。", tools: [], nodes: [], overview: true, consistencyOverview: true, artifacts: ["satisfiability-consistency-boundary"],
      hint: "这一关没有谜题。页面会把两个定义、已经证明的方向与尚未证明的方向并排展开。",
      definition: ["可满足与相容", `<p><b>可满足</b>：存在模型 𝔐，使 𝔐⊨T。<br><b>相容</b>：不存在从 T 推出 ⊥ 的形式证明，即 T⊬⊥。</p><p>可靠性已经给出“可满足 ⇒ 相容”。反方向需要从相容的句子集合真正造出模型，这是完备性证明的核心。</p>`],
      unlock: "完备性问题的入口：从相容性构造模型",
      validate: () => pass("可满足与相容已经分开；完备性需要完成尚缺的反方向。")
    },
    {
      id: "completeness-consistent-start", branch: "completeness", requires: ["satisfiability-consistency-overview"], next: "completeness-sentence-enumeration", chapter: "元理论 · 完备性Ⅰ", title: "把反驳候选放进起点",
      copy: "上一章的反模型已经说明 T⊬∀xQ(x)。现在把候选结论的否定加入 T，亲手组成完备性施工所需的第一个相容理论。",
      goal: "构造 S₀={∀x(P(x)→Q(x)),¬∀xQ(x)}。", tools: ["not", "pair"], semanticWorkbench: "completeness-start", artifacts: ["consistent-counterexample-start"],
      spawnPositions: [{ x: 260, y: 300 }, { x: 470, y: 220 }],
      nodes: [
        fixed("completeness-start-premise", "原理论 T 的公理", universalPImpQ, "formula", 25, 120, "∀x(P(x)→Q(x))"),
        fixed("completeness-start-candidate", "尚不可证明的候选", universalQ, "formula", 25, 340, "∀xQ(x)"),
        { ...goal("context", 730, 220), label: "相容起点", glyph: "S₀" }
      ],
      hint: "先否定候选结论 ∀xQ(x)，再用配对把它与 T 中的公理收成公式集。",
      definition: ["不可证明怎样留下相容起点", `<p>一般地，若 Γ∪{¬A} 能推出 ⊥，那么在 Γ 下临时采用 ¬A 并得到矛盾，再用 RAA 就能推出 A。</p><code>Γ∪{¬A}⊢⊥　⇒　Γ⊢A</code><p>取逆否：若 Γ⊬A，则 Γ∪{¬A} 相容。本关用上一章已经找到的具体 T 与 A 构造这个起点。</p>`],
      unlock: "完备性起点：Γ⊬A 时，Γ∪{¬A} 相容",
      completionLesson: `<span class="eyebrow">从失败的证明开始造模型</span><h3>候选结论的否定成为新要求</h3><code>T⊬∀xQ(x)<br>──────────────<br>S₀=T∪{¬∀xQ(x)} 相容</code><p class="layer-note">上一章的模型 Pᴹ=∅、Qᴹ={杯子} 同时满足这两句话；一般理由则来自 RAA：若加入 ¬A 会产生矛盾，原来的 Γ 就已经能够推出 A。</p>`,
      validate: ({ value }) => equal(value, completenessStartTheory)
        ? pass("T 与候选结论的否定已经组成相容起点 S₀。")
        : fail("S₀ 必须恰好包含原公理与 ¬∀xQ(x)。")
    },
    {
      id: "completeness-sentence-enumeration", branch: "completeness", requires: ["completeness-consistent-start"], next: "completeness-concrete-decision", chapter: "元理论 · 完备性Ⅰ", title: "每个句子都会轮到",
      copy: "要让未来的理论对每句话都有明确态度，必须先确认所有句子能够依次排队。本关没有装配任务；观察有限公式树怎样得到一个永不漏项的次序。",
      goal: "查看当前语言的全部句子为什么能够写成 σ₀,σ₁,σ₂,…。", tools: [], nodes: [], overview: true, completenessEnumerationOverview: true, artifacts: ["sentence-enumeration"],
      hint: "这一关没有谜题。页面按公式秩展开句子的有限构造，并说明如何在每一层内固定次序。",
      definition: ["句子枚举", `<p>当前语言的符号可以排成一列，每个公式又只有有限多层。先按公式树的秩排列，再在同一秩中按符号与子公式的既定次序排列，就能得到一个覆盖全部句子的序列。</p><code>σ₀,σ₁,σ₂,…</code><p>这里的下标只是元理论中的排队编号，不是语言中新增加的符号。</p>`],
      unlock: "句子序列 σ₀,σ₁,σ₂,…",
      validate: () => pass("每个有限句子都将在序列中的某个位置出现。")
    },
    {
      id: "completeness-concrete-decision", branch: "completeness", requires: ["completeness-sentence-enumeration"], next: "completeness-safe-side", chapter: "元理论 · 完备性Ⅱ", title: "这一句不能放在反面",
      copy: "先在练习理论 U₀={P(c),P(c)→Q(c)} 上观察一次判定。轮到句子 Q(c) 时，尝试把 ¬Q(c) 放进去，看看为什么这条道路立即封死。",
      goal: "从 P(c)、P(c)→Q(c)、¬Q(c) 推导 ⊥。", tools: ["impElim", "notElim"], proofViews: true, fitchView: true, semanticWorkbench: "completeness-concrete-decision", artifacts: ["concrete-consistent-choice"],
      spawnPositions: [{ x: 300, y: 170 }, { x: 510, y: 235 }],
      nodes: [
        fixed("decision-pc", "来自当前理论", proofObject("given", completenessPc, [completenessPc]), "proof", 20, 75, "P(c)"),
        fixed("decision-imp", "来自当前理论", proofObject("given", completenessPcImpQc, [completenessPcImpQc]), "proof", 20, 245, "P(c)→Q(c)"),
        fixed("decision-not-q", "尝试加入的反面", proofObject("given", F.not(completenessQc), [F.not(completenessQc)]), "proof", 20, 415, "¬Q(c)"),
        goal("proof", 760, 245)
      ],
      hint: "先由 P(c)→Q(c) 与 P(c) 使用 →E 得到 Q(c)，再让 Q(c) 与 ¬Q(c) 进入 ¬E。",
      definition: ["对一句话作相容选择", `<p>轮到 σ 时，我们希望把 σ 或 ¬σ 加入当前理论，同时保持相容。本关先使用便于直接推导的练习理论 U₀，σ 是 Q(c)。</p><p>尝试加入 ¬Q(c) 会产生矛盾，所以这一次不能选反面；保留 Q(c) 才能继续。之后同一种施工会回到完备性的相容起点 S₀。</p>`],
      unlock: "一次具体的句子判定",
      completionLesson: `<span class="eyebrow">第一个判定步骤</span><h3>不相容，就不许加入理论</h3><code>P(c)→Q(c)　P(c)<br>────────────── →E<br>Q(c)　　¬Q(c)<br>──────────── ¬E<br>　　　⊥</code><p class="layer-note">因此当前理论加上 ¬Q(c) 不相容。轮到 Q(c) 时，这条分支关闭，只能把 Q(c) 留在继续生长的理论中。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && equalFormula(value.conclusion, bottomFormula)
        && proofUsesRule(value, "impElim") && proofUsesRule(value, "notElim")
        ? pass("¬Q(c) 分支已经产生矛盾；这一阶段必须保留 Q(c)。")
        : fail("先用 →E 得到 Q(c)，再把它与 ¬Q(c) 送入 ¬E。")
    },
    {
      id: "completeness-safe-side", branch: "completeness", requires: ["completeness-concrete-decision"], next: "completeness-decision-chain", chapter: "元理论 · 完备性Ⅱ", title: "两边不可能同时封死",
      copy: "具体例子里反面失败了。现在固定一个相容理论 S 和任意句子 σ：假设加入 σ 与加入 ¬σ 都会产生矛盾，用已经熟悉的范围规则证明这会反过来毁掉 S 本身。",
      goal: "分别关闭两个假设范围，再由 σ 与 ¬σ 得到 ⊥。", tools: [], semanticWorkbench: "completeness-safe-side", artifacts: ["consistent-extension-lemma"],
      nodes: [
        fixed("safe-positive-bottom", "若 S,σ 会推出矛盾", proofObject("hypothetical", bottomFormula, [], [], { openScopes: [{ id: "safe-positive-scope", formula: schemaA }] }), "proof", 35, 145, "⊥"),
        negationDischargeNode("safe-positive-close", "safe-positive-scope", 255, 145),
        fixed("safe-negative-bottom", "若 S,¬σ 也会推出矛盾", proofObject("hypothetical", bottomFormula, [], [], { openScopes: [{ id: "safe-negative-scope", formula: F.not(schemaA) }] }), "proof", 35, 365, "⊥"),
        raaDischargeNode("safe-negative-close", "safe-negative-scope", 255, 365),
        { id: "safe-final-conflict", type: "notElim", label: "让 S 自身矛盾", glyph: "¬E", inputs: registry.notElim.inputs, out: registry.notElim.out, outLabel: registry.notElim.outLabel, x: 520, y: 255, fixed: true },
        goal("proof", 780, 255)
      ],
      scopeFrames: [
        { id: "safe-positive-scope", label: "假设把 σ 加入 S", x: 15, y: 70, width: 420, height: 170, discharge: true, boundaryLabel: "¬I", boundaryCopy: "若这边封死，S 能推出 ¬σ" },
        { id: "safe-negative-scope", label: "假设把 ¬σ 加入 S", x: 15, y: 290, width: 420, height: 170, discharge: true, boundaryLabel: "RAA", boundaryCopy: "若这边也封死，S 能推出 σ" }
      ],
      hint: "上方的 ⊥ 经过 ¬I 得到 ¬σ；下方的 ⊥ 经过 RAA 得到 σ。把 σ 接入 ¬E 的第一个入口、¬σ 接入第二个入口。",
      definition: ["相容扩张引理", `<p>若 S 相容，那么 S∪{σ} 与 S∪{¬σ} 不可能同时不相容。</p><p>否则第一条失败道路让 S 推出 ¬σ，第二条失败道路让 S 推出 σ；两者再由 ¬E 使 S 自身推出 ⊥。</p>`],
      unlock: "每轮判定至少存在一条保持相容的道路",
      completionLesson: `<span class="eyebrow">相容扩张引理</span><h3>每个句子至少有一面可以安全加入</h3><code>S,σ⊢⊥ ⇒ S⊢¬σ<br>S,¬σ⊢⊥ ⇒ S⊢σ<br><br>若两边都成立，则 S⊢⊥，与 S 相容矛盾。</code><p class="layer-note">无论轮到什么句子，扩张都不会因为两条道路同时封死而停止。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && equalFormula(value.conclusion, bottomFormula)
        && proofUsesRule(value, "notIntro") && proofUsesRule(value, "raa") && proofUsesRule(value, "notElim")
        ? pass("若正反两边都封死，S 自身就会推出矛盾；所以相容理论至少有一边可以继续。")
        : fail("先分别用 ¬I、RAA 关闭两个范围，再把所得 ¬σ 与 σ 汇入 ¬E。")
    },
    {
      id: "completeness-decision-chain", branch: "completeness", requires: ["completeness-safe-side"], next: "completeness-unnamed-witness", chapter: "元理论 · 完备性Ⅱ", title: "让决定沿序列生长",
      copy: "先在同一个练习理论上把上一关的保证连续使用三次。每次仍只用熟悉的配对与并集族，把本轮保留的一面加入上一阶段；右侧模型会同时见证这些有限阶段确实相容。",
      goal: "依次构造 U₁=U₀∪{Q(c)}、U₂=U₁∪{R(c,c)}、U₃=U₂∪{¬∀xP(x)}。", tools: ["pair", "union"], semanticWorkbench: "completeness-decision-chain", multiGoals: ["decision-stage-one", "decision-stage-two", "decision-stage-three"], artifacts: ["consistent-decision-chain"],
      spawnPositions: [{ x: 235, y: 60 }, { x: 380, y: 60 }, { x: 515, y: 60 }, { x: 235, y: 225 }, { x: 380, y: 225 }, { x: 515, y: 225 }, { x: 235, y: 390 }, { x: 380, y: 390 }, { x: 515, y: 390 }],
      nodes: [
        fixed("decision-chain-base", "练习理论", completenessDecisionBase, "context", 20, 65, "U₀"),
        fixed("decision-chain-q", "σ₀ 保留正面", completenessQc, "formula", 20, 180, "Q(c)"),
        fixed("decision-chain-r", "σ₁ 保留正面", completenessRcc, "formula", 20, 295, "R(c,c)"),
        fixed("decision-chain-not-all-p", "σ₂ 保留反面", F.not(universalP), "formula", 20, 410, "¬∀xP(x)"),
        { ...goal("context", 700, 85), id: "decision-stage-one", label: "第一阶段", glyph: "U₁" },
        { ...goal("context", 700, 245), id: "decision-stage-two", label: "第二阶段", glyph: "U₂" },
        { ...goal("context", 700, 405), id: "decision-stage-three", label: "第三阶段", glyph: "U₃" }
      ],
      hint: "加入一个公式 φ 的集合操作是 S∪{φ}：先用配对把 φ 与自身收成 {φ}，再把 S 与 {φ} 配成集合族，最后使用并集族。三个阶段必须首尾相接。",
      definition: ["逐句扩张", `<p>在第 n 轮考察 σₙ，并从 σₙ、¬σₙ 中选择能够保持相容的一面加入当前阶段。上一关保证每一轮至少可以继续。</p><code>U₀⊆U₁⊆U₂⊆U₃⊆⋯</code><p>U 是本节用于练习扩张方法的具体理论；下一节会把同一种逐句扩张与见证步骤一起应用到真正的完备性起点 S₀。本关模型只见证前三个选择；一般的扩张依赖的是相容扩张引理。</p>`],
      unlock: "逐句保持相容的理论链",
      completionLesson: `<span class="eyebrow">有限窗口中的无限扩张方法</span><h3>每轮只决定一句，但任何一句最终都会轮到</h3><code>U₀ ⊆ U₁ ⊆ U₂ ⊆ U₃ ⊆ ⋯<br>　　 σ₀　 σ₁　 σ₂</code><p class="layer-note">本关模型取 cᴹ=杯子、Pᴹ=Qᴹ={杯子}、Rᴹ={⟨杯子,杯子⟩}；盘子使 ¬∀xP(x) 成立。它见证练习链的前三阶段都相容。下一节将回到 S₀，并补上存在见证。</p>`,
      validate: ({ values }) => equal(values["decision-stage-one"], completenessStageOne)
        && equal(values["decision-stage-two"], completenessStageTwo)
        && equal(values["decision-stage-three"], completenessStageThree)
        ? pass("三个相容阶段已经首尾相接；同一方法可以继续处理 σ₃、σ₄、……")
        : fail("每一阶段都应把指定公式加入紧邻的上一阶段，而不是重新从 U₀ 开始。")
    },
    {
      id: "completeness-unnamed-witness", branch: "completeness", requires: ["completeness-decision-chain"], next: "completeness-register-witness-name", chapter: "元理论 · 完备性Ⅲ", title: "存在，却没有名字叫出它",
      copy: "闭项是不含自由变量的项。先构造一个模型，让 ∃xP(x) 为真，却让语言现有的每个闭项都指向盘子。观察为什么直接拿闭项当作未来模型的对象会漏掉存在见证。",
      goal: "构造 Pᴹ={杯子}、cᴹ=盘子，以及把两个对象都送到盘子的 fᴹ。", tools: ["ord", "set1", "set2"], semanticWorkbench: "completeness-unnamed-witness", multiGoals: ["unnamed-p", "unnamed-c", "unnamed-f"], artifacts: ["unnamed-existential-witness"],
      spawnPositions: [{ x: 235, y: 35 }, { x: 235, y: 160 }, { x: 235, y: 285 }, { x: 410, y: 285 }, { x: 555, y: 285 }],
      nodes: [
        fixed("unnamed-cup", "论域对象", "杯子", "set", 20, 125, "杯子"),
        fixed("unnamed-plate", "论域对象", "盘子", "set", 20, 350, "盘子"),
        semanticGoal("unnamed-p", "解释 P", "Pᴹ", "P 适用的对象集合", 720, 80),
        semanticValueGoal("unnamed-c", "解释 c", "cᴹ", "c 指向的对象", 720, 225),
        semanticGoal("unnamed-f", "解释 f", "fᴹ", "f 的完整函数图", 720, 375)
      ],
      hint: "Pᴹ 只收杯子；cᴹ 直接接盘子；fᴹ 收集 ⟨杯子,盘子⟩ 与 ⟨盘子,盘子⟩。",
      definition: ["闭项未必命名所有对象", `<p>闭项是不含自由变量的项。当前语言中的闭项从 c 开始，再反复使用 f：</p><code>c，f(c)，f(f(c))，…</code><p>模型可以含有这些闭项都没有指到的对象。若以后只拿闭项构造模型，就必须为每个存在句补一个能够命名其见证的新常元。</p>`],
      unlock: "Henkin 见证问题：存在对象需要闭项名字",
      completionLesson: `<span class="eyebrow">名字不足</span><h3>存在为真，却没有现成闭项指向见证</h3><code>𝔐⊨∃xP(x)　见证：杯子<br>⟦c⟧=⟦f(c)⟧=⟦f(f(c))⟧=⋯=盘子</code><p class="layer-note">后面的项模型要让闭项充当对象的名字；若没有闭项指向杯子，∃xP(x) 就无法落实为某个闭实例 P(t)。因此下一步必须扩充语言的名字供应。</p>`,
      validate: ({ values }) => {
        const graph = values["unnamed-f"];
        return equal(values["unnamed-p"], set("杯子")) && equal(values["unnamed-c"], "盘子")
          && equal(graph, set(orderedPair("杯子", "盘子"), orderedPair("盘子", "盘子")))
          ? pass("∃xP(x) 有杯子作见证，但所有现有闭项都沿 c、f 落到盘子。")
          : fail("让 P 只适用于杯子，同时让 c、f(c)、f(f(c))、……全部指向盘子。")
      }
    },
    {
      id: "completeness-register-witness-name", branch: "completeness", requires: ["completeness-unnamed-witness"], next: "completeness-fresh-name-renaming", chapter: "元理论 · 完备性Ⅲ", title: "给语言增加一个名字",
      copy: "旧语言 L 的符号表里没有 d。先把 d 登记成入口数为 0 的项符号，再将这个新条目加入整张符号表，亲手得到能够写出 d 的扩充语言 L(d)。这是以后反复加入见证名字、最终得到膨胀语言 L* 的第一步。",
      goal: "构造 L(d)=L∪{⟨d,0⟩}。", tools: ["ord", "pair", "union"], artifacts: ["fresh-witness-constant", "expanded-witness-language"],
      spawnPositions: [{ x: 245, y: 70 }, { x: 245, y: 285 }, { x: 400, y: 180 }, { x: 545, y: 180 }],
      nodes: [
        fixed("witness-name-mark", "尚未登记的新记号", "d", "object", 40, 125, "d"),
        fixed("witness-name-arity", "入口数量", numeral(0), "object", 40, 335, "0"),
        fixed("witness-old-language", "旧语言的符号表", completenessBaseLanguage, "set", 265, 335, "L"),
        { ...goal("set", 740, 220), label: "扩充后的语言", glyph: "L(d)" }
      ],
      hint: "先构造 ⟨d,0⟩；用配对把它变成单元素集，再把这个单元素集与 L 配成集合族，最后使用并集族。",
      definition: ["从 L 扩充到 L*", `<p>语言由符号表规定。向旧符号表 L 加入一个新符号，便得到一次语言扩充：</p><code>L(d)=L∪{⟨d,0⟩}</code><p>d 的入口数为 0，所以它自己就是闭项。<b>新鲜</b>表示 d 从未出现在此前的语言、理论或已有推导中。</p><p>以后每遇到一个需要名字的存在句，就再加入一个不同的新鲜常元：</p><code>L ⊆ L(d₀) ⊆ L(d₀,d₁) ⊆ ···<br>L* = ⋃ₙL(d₀,…,dₙ)<br>　 = L ∪ {⟨dₙ,0⟩｜n∈ℕ}</code><p><b>L*</b> 叫作膨胀语言：它包含原语言 L 的全部符号，也包含 Henkin 施工加入的全部辅助常元。星号不是语言中的符号，而是“施工完成后的扩充语言”的记号。</p><p>语言扩充只增加能够书写的表达式；它不会为新常元指定对象，也不会自动向理论加入任何断言。</p>`],
      unlock: "扩充语言 L(d) 与新鲜常元 d",
      completionLesson: `<span class="eyebrow">从一次扩充到完整膨胀语言</span><h3>d 是 L* 中第一批新增的见证名字之一</h3><code>L → L(d)<br>L ⊆ L(d₀) ⊆ L(d₀,d₁) ⊆ ···<br>L* = ⋃ₙL(d₀,…,dₙ)</code><p class="layer-note">本关只完成了一次扩充。反复为存在句登记不同的新鲜常元后，全部阶段的符号表合起来就是 L*。旧语言 L 的符号和旧句子的含义始终保留。</p>`,
      validate: ({ value }) => equal(value, completenessWitnessLanguage)
        ? pass("新条目已经加入旧符号表；L(d) 现在能够写出闭项 d。")
        : fail("目标是整张扩充后的符号表 L(d)，不只是新条目 ⟨d,0⟩。")
    },
    {
      id: "completeness-fresh-name-renaming", branch: "completeness", requires: ["completeness-register-witness-name"], next: "completeness-add-witness", chapter: "元理论 · 完备性Ⅲ", title: "旧前提不认识这个名字",
      copy: "同一份旧前提 ∀xP(x) 完全不含新常元 d。分别用 d 与 y 重做同一个 ∀E 步骤，观察撤去临时常元 d、还原为变量 y 后，这一步仍是同一条规则的实例。",
      goal: "从同一个 ∀xP(x) 分别推导 P(d) 与 P(y)。", tools: ["constD", "vary", "forallElim"], proofViews: true, fitchView: true, runTarget: "fresh-rename-y-goal", semanticWorkbench: "completeness-fresh-renaming", multiGoals: ["fresh-rename-d-goal", "fresh-rename-y-goal"], artifacts: ["fresh-proof-renaming-transform"],
      spawnPositions: [{ x: 245, y: 95 }, { x: 245, y: 325 }, { x: 425, y: 95 }, { x: 425, y: 325 }],
      nodes: [
        fixed("fresh-rename-universal", "旧理论中的前提", proofObject("given", universalP, [universalP]), "proof", 20, 215, "∀xP(x)"),
        { ...goal("proof", 690, 105), id: "fresh-rename-d-goal", label: "使用 d 的证明", glyph: "P(d)" },
        { ...goal("proof", 690, 330), id: "fresh-rename-y-goal", label: "换成 y 的证明", glyph: "P(y)" }
      ],
      hint: "从同一个前提输出接出两枚 ∀E：一枚代入 d，另一枚代入 y。两个结果分别进入上下目标。",
      definition: ["撤去新鲜常元", `<p>d 是临时加入的新鲜常元，方向是把 d 还原为变量 y。本关的两棵一步证明逐项相同，只把 ∀E 使用的项从 d 换成 y。</p><code>∀xP(x)⊢P(d)　　⇒　　∀xP(x)⊢P(y)</code><p>一般情形对证明高度归纳：前提叶不含 d；每个更高节点先还原直接子证明，再重建最后一条规则。它是对整棵证明的元层变换，不是对象语言中的新推理规则。</p>`],
      unlock: "已构造元操作：撤去新鲜常元",
      completionLesson: `<span class="eyebrow">新鲜常元可以撤去</span><h3>撤去 d 后，这一步仍是同一个 ∀E 实例</h3><code>∀xP(x)⊢P(d)　　　∀xP(x)⊢P(y)<br><br>d 未出现于 Γ，Γ⊢B(d)　⇒　Γ⊢B(y)</code><p class="layer-note">一般情形对证明高度归纳：高度 0 的前提叶不含 d；更高处先还原直接子证明，再重建最后一条规则。若 y 与量词或 Flag 冲突，就先安全易字。后面可以直接使用“撤去新鲜常元”这个元层操作。</p>`,
      validate: ({ values }) => {
        const withD = values["fresh-rename-d-goal"], withY = values["fresh-rename-y-goal"];
        return withD && withY && withD.kind === "proof" && withY.kind === "proof"
          && withD.rule === "forallElim" && withY.rule === "forallElim"
          && equalFormula(withD.conclusion, witnessPd) && equalFormula(withY.conclusion, py)
          ? pass("d 是临时新鲜常元；把它还原为 y 后，原来的 ∀E 步骤仍能重建。")
          : fail("从同一个 ∀xP(x) 分别使用 ∀E 得到 P(d) 与 P(y)。");
      }
    },
    {
      id: "completeness-add-witness", branch: "completeness", requires: ["completeness-fresh-name-renaming"], next: "completeness-witness-consistency", chapter: "元理论 · 完备性Ⅲ", title: "扩张理论，让名字成为见证",
      copy: "语言扩充只让 P(d) 成为可以书写的句子；现在才向公式集增加断言。把 P(d) 加入 W={∃xP(x)}，得到理论扩张 W′，明确要求 d 成为本句的见证。",
      goal: "构造 W′=W∪{P(d)}。", tools: ["constD", "predP", "pair", "union"], semanticWorkbench: "completeness-add-witness", artifacts: ["henkin-witness-axiom"],
      spawnPositions: [{ x: 235, y: 120 }, { x: 360, y: 120 }, { x: 470, y: 120 }, { x: 360, y: 300 }, { x: 540, y: 220 }],
      nodes: [
        fixed("witness-theory-base", "含存在句的理论", witnessExampleTheory, "context", 20, 220, "W={∃xP(x)}"),
        { ...goal("context", 760, 220), label: "加入见证后", glyph: "W′" }
      ],
      hint: "用 d 构造 P(d)；配对 P(d) 与自身得到 {P(d)}，再把它与 W 配成集合族并使用并集族。",
      definition: ["理论扩张与见证公理", `<p><b>理论扩张</b>是在原公式集上加入新句子。这里先在扩充语言 L(d) 中写出 P(d)，再令：</p><code>W′=W∪{P(d)}</code><p>P(d) 叫作 ∃xP(x) 的见证公理。它不是从存在句直接推导出的结论，而是扩张理论时加入的新要求。</p><p>语言扩充增加可用符号；理论扩张增加必须满足的句子。两件事不能混为一谈。</p>`],
      unlock: "Henkin 见证公理",
      completionLesson: `<span class="eyebrow">理论已经扩张</span><h3>可用的新名字现在承担了一项存在承诺</h3><code>L → L(d)：可以写 P(d)<br>W → W′：要求 P(d) 成立</code><p class="layer-note">以后只要 ∃xP(x) 被收入 H，P(d) 也会在 H 中；项模型便能用闭项 d 找到这个存在句所需的对象。下一关必须回答：理论扩张会不会破坏相容性。</p>`,
      validate: ({ value }) => equal(value, witnessExampleExtension)
        ? pass("P(d) 已作为 ∃xP(x) 的见证公理加入 W。")
        : fail("W′ 必须恰好在 W 的基础上加入 P(d)。")
    },
    {
      id: "completeness-witness-consistency", branch: "completeness", requires: ["completeness-add-witness"], next: "completeness-interleaved-chain", chapter: "元理论 · 完备性Ⅲ", title: "新见证不会炸毁旧理论",
      copy: "假设相容理论 S 含有 ∃xφ(x)，但加入新鲜见证 φ(d) 后产生矛盾。先解除 φ(d)，再撤去临时常元 d，并利用两个量词 Flag 让这个矛盾回到 S 本身。",
      goal: "从“加入 φ(d) 后推出 ⊥”构造出只依赖旧理论 S 的 ⊥。", tools: ["vary", "varz", "freshProofRename", "forallElim", "notElim"], proofViews: true, fitchView: true, semanticWorkbench: "completeness-witness-consistency", artifacts: ["witness-consistency-lemma"],
      spawnPositions: [{ x: 270, y: 70 }, { x: 140, y: 330 }, { x: 530, y: 180 }, { x: 400, y: 330 }, { x: 530, y: 330 }],
      nodes: [
        fixed("witness-failure-bottom", "若 S,φ(d) 会推出矛盾", proofObject("hypothetical", bottomFormula, [witnessExistsPhi], [], { openScopes: [{ id: "witness-failure-scope", formula: witnessPhiD }] }), "proof", 10, 70, "⊥"),
        negationDischargeNode("witness-failure-close", "witness-failure-scope", 140, 70),
        arbitraryFlagNode("witness-arbitrary-start", "witness-arbitrary-scope", 400, 70, ["witness-failure-close"]),
        forallIntroNode("witness-generalize", "witness-arbitrary-scope", 660, 180),
        fixed("witness-old-exists", "旧理论 S 中已有", proofObject("given", witnessExistsPhi, [witnessExistsPhi]), "proof", 10, 330, "∃xφ(x)"),
        existsFlagNode("witness-exists-start", "witness-exists-scope", 270, 330),
        existsElimNode("witness-exists-close", "witness-exists-scope", 660, 330),
        goal("proof", 660, 445)
      ],
      scopeFrames: [
        { id: "witness-failure-scope", label: "临时加入见证公理 φ(d)", x: 5, y: 35, width: 255, height: 155, discharge: true, boundaryLabel: "¬I", boundaryCopy: "旧理论推出 ¬φ(d)" },
        { id: "witness-arbitrary-scope", flagKind: "universal", flagNode: "witness-arbitrary-start", label: "⚑ 任意 □", x: 390, y: 35, width: 390, height: 245, discharge: true, boundaryLabel: "∀I", boundaryCopy: "收成 ∀x¬φ(x)" },
        { id: "witness-exists-scope", flagKind: "existential", flagNode: "witness-exists-start", label: "⚑ 暂称旧存在句的见证为 z", x: 260, y: 295, width: 520, height: 125, discharge: true, boundaryLabel: "∃E", boundaryCopy: "把 ⊥ 带回旧理论" }
      ],
      hint: "由上方 ⊥ 经 ¬I 得到 ¬φ(d)。把 y 插入全称 Flag，用旗内的 y 统一改名，只把所得 ¬φ(y) 接入 ∀I 出口。存在 Flag 给出 φ(z)；用 ∀E 得到 ¬φ(z)，经 ¬E 得到 ⊥，最后只把这个 ⊥ 接入存在旗出口。",
      definition: ["见证扩张保持相容", `<p>若 S 相容且 ∃xφ(x)∈S，d 是不出现在 S 中的新常元，那么 S∪{φ(d)} 仍相容。</p><p>否则失败推导给出 S⊢¬φ(d)。新鲜常元还原引理先把 d 撤去、恢复为任意变量 y；再由 ∀I 得到 S⊢∀x¬φ(x)，与 S 中已有的 ∃xφ(x) 冲突，使 S 自身不相容。</p>`],
      unlock: "见证扩张保持相容",
      completionLesson: `<span class="eyebrow">Henkin 见证引理</span><h3>新鲜名字只把已有的存在承诺写出来</h3><code>S 相容　∃xφ(x)∈S　d 新鲜<br>──────────────────────<br>S∪{φ(d)} 相容</code><p class="layer-note">因为旧 S 不认识 d，可以从失败证明中撤去这个临时常元，还原为任意变量；存在 Flag 再表明，无论原见证是谁，∀x¬φ(x) 都会与它冲突。因此失败只能来自旧 S，而旧 S 已知相容。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && equalFormula(value.conclusion, bottomFormula)
        && proofUsesRule(value, "notIntro") && proofUsesRule(value, "freshRename") && proofUsesRule(value, "forallIntro")
        && proofUsesRule(value, "forallElim") && proofUsesRule(value, "notElim") && proofUsesRule(value, "existsElim")
        ? pass("若见证扩张产生矛盾，旧理论 S 自身也会产生矛盾；所以新鲜见证保持相容。")
        : fail("依次完成 ¬I、撤去新鲜常元、∀I，再在存在 Flag 内用 ∀E、¬E 得到 ⊥ 并关闭 ∃E。")
    },
    {
      id: "completeness-interleaved-chain", branch: "completeness", requires: ["completeness-witness-consistency"], next: "completeness-limit-union", chapter: "元理论 · 完备性Ⅲ", title: "决定一句，再照顾它的见证",
      copy: "回到真正的相容起点 S₀。前三步依次保留 ¬∃xP(x)、保留 ∃xQ(x)，再为后一存在句加入 Q(d)。这个有限窗口只出现一个新名字；一般施工会为后续存在句继续加入 d₁、d₂、……，理论链增长的同时，语言也从 L 逐步膨胀到 L*。",
      goal: "构造 S₁=S₀∪{¬∃xP(x)}、S₂=S₁∪{∃xQ(x)}、S₃=S₂∪{Q(d)}。", tools: ["constD", "predQ", "pair", "union"], semanticWorkbench: "completeness-interleaved-chain", multiGoals: ["henkin-stage-one", "henkin-stage-two", "henkin-stage-three"], artifacts: ["henkin-construction-chain"],
      spawnPositions: [{ x: 220, y: 35 }, { x: 330, y: 35 }, { x: 440, y: 35 }, { x: 550, y: 35 }, { x: 220, y: 205 }, { x: 330, y: 205 }, { x: 440, y: 205 }, { x: 550, y: 205 }, { x: 220, y: 375 }, { x: 330, y: 375 }, { x: 440, y: 375 }],
      nodes: [
        fixed("henkin-chain-base", "完备性起点", completenessStartTheory, "context", 15, 60, "S₀"),
        fixed("henkin-choice-not-p", "σ₀ 保留反面", F.not(existentialP), "formula", 15, 185, "¬∃xP(x)"),
        fixed("henkin-choice-exists-q", "σ₁ 保留正面", existentialQ, "formula", 15, 310, "∃xQ(x)"),
        { ...goal("context", 720, 80), id: "henkin-stage-one", label: "第一次判定", glyph: "S₁" },
        { ...goal("context", 720, 245), id: "henkin-stage-two", label: "第二次判定", glyph: "S₂" },
        { ...goal("context", 720, 410), id: "henkin-stage-three", label: "加入见证", glyph: "S₃" }
      ],
      hint: "前两步照旧用 S∪{φ}。第三步先用 d 构造 Q(d)，再以同样的集合操作加入紧邻的 S₂。",
      definition: ["理论链与语言链同时增长", `<p>每轮先让下一句 σₙ 选择能够保持相容的一面；若保留下来的是存在句，再为它加入一个尚未使用的新鲜常元实例。</p><p>因此施工中同时存在两条链：</p><code>语言：L ⊆ L(d₀) ⊆ L(d₀,d₁) ⊆ ··· → L*<br>理论：S₀ ⊆ S₁ ⊆ S₂ ⊆ S₃ ⊆ ··· → H</code><p>语言链提供可以书写的见证名字；理论链决定哪些句子必须成立，并把对应的见证实例加入理论。相容扩张引理保护判定步骤，见证引理保护加入见证实例的步骤。</p>`],
      unlock: "既逐句判定、又补齐存在见证的相容链",
      completionLesson: `<span class="eyebrow">语言与理论共同扩张</span><h3>新名字进入 L*，新要求进入 H</h3><code>L ⊆ L(d₀) ⊆ L(d₀,d₁) ⊆ ··· → L*<br>S₀ ⊆ S₁ ⊆ S₂ ⊆ S₃ ⊆ ··· → H</code><p class="layer-note">语言链回答“可以写哪些名字”，理论链回答“哪些句子必须成立”。当前窗口只使用 d；一般施工会为后续存在句继续登记互不相同的新鲜常元。下一关把全部阶段的理论收进 H。</p>`,
      validate: ({ values }) => equal(values["henkin-stage-one"], completenessHenkinStageOne)
        && equal(values["henkin-stage-two"], completenessHenkinStageTwo)
        && equal(values["henkin-stage-three"], completenessHenkinStageThree)
        ? pass("判定与见证步骤已经接成同一条相容链。")
        : fail("三个阶段必须依次从紧邻的上一阶段扩张；最后加入的是 Q(d)。")
    },
    {
      id: "completeness-limit-union", branch: "completeness", requires: ["completeness-interleaved-chain"], next: "completeness-deductive-closure", chapter: "元理论 · 完备性Ⅳ", title: "造出极大一致 Henkin 集",
      copy: "前面的无限施工是为了造出一份足够完整的模型蓝图 H：它既对每个句子作出相容的选择，也为每个存在承诺留下一个闭项见证。",
      goal: "查看极大一致与 Henkin 性分别解决项模型的什么问题。", tools: [], nodes: [], overview: true, completenessMaximalHenkinOverview: true, artifacts: ["complete-henkin-theory"],
      hint: "这一关没有装配任务。页面会把前面完成的判定与见证施工汇成同一个 H。",
      definition: ["极大一致 Henkin 集", `<p>反复加入新鲜常元得到扩充语言 L*；各阶段 Sₙ 都是 L* 中逐步扩张的理论。把所有阶段已经保留的句子收在一起：</p><code>B∈H　⇔　存在 n，使 B∈Sₙ</code><p><b>极大一致</b>表示 H 相容，而且对每个 L* 句子 B，恰有 B、¬B 之一属于 H。<b>Henkin 性</b>表示只要 ∃xφ(x)∈H，就有某个闭项 t 使 φ(t)∈H。</p><p>前者让 H 能够决定项模型中句子的真假；后者让项模型能为存在句找到对象。</p>`],
      unlock: "极大一致 Henkin 集 H",
      validate: () => pass("H 已经成为相容、逐句表态并为存在句提供闭项见证的模型蓝图。")
    },
    {
      id: "completeness-deductive-closure", branch: "completeness", requires: ["completeness-limit-union"], next: "completeness-closed-terms", chapter: "元理论 · 完备性Ⅳ", title: "H 会收下自己能够证明的句子",
      copy: "假设已有一份从 H 推导 B 的证明。如果 H 反而收下 ¬B，这两份材料会让 H 推出矛盾。亲手完成这最后一次冲突。",
      goal: "由 H⊢B 与假设的 ¬B∈H 得到 ⊥。", tools: ["notElim"], semanticWorkbench: "completeness-deductive-closure", artifacts: ["deductively-closed-henkin-theory"],
      spawnPositions: [{ x: 390, y: 220 }],
      nodes: [
        fixed("closure-derived-b", "已经有一份 H 中的证明", proofObject("derivedFromH", schemaB, []), "proof", 25, 125, "H⊢B"),
        fixed("closure-negative-b", "若 H 收下反面", proofObject("given", F.not(schemaB), [F.not(schemaB)]), "proof", 25, 335, "¬B∈H"),
        goal("proof", 690, 220)
      ],
      hint: "把已证明的 B 接入 ¬E 第一入口，把假设属于 H 的 ¬B 接入第二入口。",
      definition: ["演绎闭包", `<p>若 H⊢B，而 B 不属于 H，那么判定性质迫使 ¬B∈H。于是 H 同时能够使用 B 与 ¬B，推出 ⊥，违背相容。</p><code>H⊢B　⇒　B∈H</code><p>这让“能够从 H 证明”与“已经写在 H 中”在后续模型构造中对齐。</p>`],
      unlock: "H 的演绎闭包",
      completionLesson: `<span class="eyebrow">H 已经封闭</span><h3>凡是 H 能证明的句子，H 都已经收下</h3><code>H⊢B　且　¬B∈H<br>───────────── ¬E<br>H⊢⊥</code><p class="layer-note">相容性排除 ¬B∈H；判定性质又不允许两边都缺席，所以 B∈H。现在 H 已经具备构造项模型所需的完整语法材料。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && equalFormula(value.conclusion, bottomFormula) && proofUsesRule(value, "notElim")
        ? pass("¬B∈H 会破坏相容，因此 H⊢B 时只能有 B∈H。")
        : fail("用 ¬E 让已经证明的 B 与假设属于 H 的 ¬B 发生冲突。")
    },
    {
      id: "completeness-closed-terms", branch: "completeness", requires: ["completeness-deductive-closure"], next: "completeness-provable-equality", chapter: "元理论 · 完备性Ⅴ", title: "让闭项充当模型里的名字",
      copy: "H 已经为存在句补足闭项见证。先取语言中的一个有限窗口：c、d、f(c)、f(d)。把这些不含变量的项收在一起，观察完整的闭项宇宙如何继续生长。",
      goal: "用配对与并集族构造 {c,d,f(c),f(d)}。", tools: ["constC", "constD", "funcF", "pair", "union"], semanticWorkbench: "completeness-closed-terms", artifacts: ["closed-term-universe"],
      spawnPositions: [{ x: 180, y: 55 }, { x: 180, y: 310 }, { x: 325, y: 55 }, { x: 325, y: 310 }, { x: 475, y: 55 }, { x: 475, y: 310 }, { x: 620, y: 180 }, { x: 760, y: 180 }],
      nodes: [{ ...goal("set", 900, 205), label: "闭项窗口", glyph: "T₀" }],
      hint: "各造一份 c、d；分别送入 f 得到 f(c)、f(d)。先将四个项两两配对，再把两个二元素集配成集合族并使用并集族。",
      definition: ["闭项宇宙", `<p>闭项是不含自由变量的项。常元先给出闭项，函数符号再从已有闭项制造新的闭项：</p><code>c，d，f(c)，f(d)，f(f(c))，…</code><p>完整集合通常是无限的；本关只亲手构造一个有限窗口。</p>`],
      unlock: "项模型的原始名字供应",
      completionLesson: `<span class="eyebrow">项模型的原料</span><h3>每个闭项都可以先当作一个候选对象名字</h3><code>T₀={c,d,f(c),f(d),…}</code><p class="layer-note">但不同闭项可能被 H 证明相等。若直接把每种写法都当成不同对象，等号的固定语义就会失败。下一关先看“能够由 H 证明相等”怎样把这些名字分组。</p>`,
      validate: ({ value }) => equal(value, closedTermWindow)
        ? pass("四个闭项已经收集；同一生成方式可以继续产生更深的闭项。")
        : fail("目标窗口应恰好包含 c、d、f(c)、f(d)。")
    },
    {
      id: "completeness-provable-equality", branch: "completeness", requires: ["completeness-closed-terms", "set-foundation-quotient-projection"], next: "completeness-equivalence-class", chapter: "元理论 · 完备性Ⅴ", title: "证明可证明相等是等价关系",
      copy: "你已经用自反、对称、传递构造过具体等价关系。现在把同一套定义应用到闭项集合 T₀：规定 t∼u 当且仅当 H⊢t=u，并用 =I 与 =E 完成三个证明实例。",
      goal: "证明 c∼c；由 c∼d 证明 d∼c；由 c∼d、d∼f(c) 证明 c∼f(c)。",
      tools: ["constC", "equalityIntro", "equalityElim"], proofViews: true, fitchView: true, runTarget: "provable-equality-transitive", multiGoals: ["provable-equality-reflexive", "provable-equality-symmetric", "provable-equality-transitive"], artifacts: ["provable-equality-equivalence"],
      openingLesson: ["把熟悉的等价关系换到闭项上", `<p>商集支线中已经构造过：自反性给出 <code>x∼x</code>，对称性把 <code>x∼y</code> 反成 <code>y∼x</code>，传递性把两段关系合成一段。</p><p>本关不再定义这些概念，而是证明一个新的具体关系满足它们：</p><code>t∼u　⇔　H⊢t=u</code><p>关系的对象从杯子、盘子换成闭项，所需的三种结构没有改变。</p>`],
      spawnPositions: [{ x: 230, y: 55 }, { x: 405, y: 55 }, { x: 300, y: 235 }, { x: 485, y: 350 }],
      nodes: [
        fixed("provable-equality-cd", "对称性实例的前提；传递性实例也会使用", proofObject("given", equalityCd, [equalityCd]), "proof", 20, 205, "c∼d，即 H⊢c=d"),
        fixed("provable-equality-dfc", "仅用于传递性的独立实例", proofObject("given", equalityDFc, [equalityDFc]), "proof", 20, 400, "d∼f(c)，即 H⊢d=f(c)"),
        { ...goal("proof", 730, 65), id: "provable-equality-reflexive", label: "自反性实例", glyph: "c∼c" },
        { ...goal("proof", 730, 245), id: "provable-equality-symmetric", label: "对称性实例", glyph: "d∼c" },
        { ...goal("proof", 730, 420), id: "provable-equality-transitive", label: "传递性实例", glyph: "c∼f(c)" }
      ],
      hint: "自反性：把 c 接入 =I。对称性：先由 =I 得到 c=c，再用 c=d 替换等式左侧的 c。传递性：把 d=f(c) 与已有的 c=d 接入 =E，替换其中的 d。",
      definition: ["闭项上的等价关系", `<p>本关研究的是闭项集合 T₀ 上的二元关系：</p><code>t∼u　⇔　H⊢t=u</code><p>=I 给出自反性；用 =E 可以从 H⊢t=u 得到 H⊢u=t，给出对称性；再次使用 =E 可以从 H⊢t=u、H⊢u=v 得到 H⊢t=v，给出传递性。</p><code>∀t∈T₀　t∼t<br>∀t,u∈T₀　t∼u ⇒ u∼t<br>∀t,u,v∈T₀　(t∼u 且 u∼v) ⇒ t∼v</code>`],
      unlock: "闭项上的可证明相等关系 ∼",
      completionLesson: `<span class="eyebrow">闭项上的等价关系</span><h3>可证明相等具有自反性、对称性和传递性</h3><code>∀t∈T₀　t∼t<br>∀t,u∈T₀　t∼u ⇒ u∼t<br>∀t,u,v∈T₀　(t∼u 且 u∼v) ⇒ t∼v</code><p class="layer-note">自反性保证每个闭项属于自己的等价类；对称性保证关系没有方向；传递性保证通过中间名字相等的闭项仍在同一个等价类。下一关把第一个等价类实际构造成集合。</p>`,
      validate: ({ values }) => {
        const reflexive = values["provable-equality-reflexive"], symmetric = values["provable-equality-symmetric"], transitive = values["provable-equality-transitive"];
        return reflexive && symmetric && transitive
          && equalFormula(reflexive.conclusion, equalityCc) && proofUsesRule(reflexive, "equalityIntro")
          && equalFormula(symmetric.conclusion, equalityDc) && proofUsesRule(symmetric, "equalityElim")
          && equalFormula(transitive.conclusion, equalityCFc) && proofUsesRule(transitive, "equalityElim")
          ? pass("自反性、对称性和传递性的实例都已由等号规则证明；可证明相等是等价关系。")
          : fail("三个目标分别是自反性实例 c∼c、对称性实例 d∼c 和传递性实例 c∼f(c)。")
      }
    },
    {
      id: "completeness-equivalence-class", branch: "completeness", requires: ["completeness-provable-equality"], next: "completeness-term-quotient", chapter: "元理论 · 完备性Ⅴ", title: "两个名字，同一个等价类",
      copy: "本关换用观察台给出的有限关系表。在窗口 W={c,d,f(c),f(d)} 中，分别找出所有与 c 等价、与 d 等价的闭项，观察两个起点为什么得到同一个集合。",
      goal: "构造 [c]∩W 与 [d]∩W，并让两个目标收到同一个名字组。", tools: ["pair"], semanticWorkbench: "completeness-equivalence-class", multiGoals: ["equivalence-class-c-goal", "equivalence-class-d-goal"], artifacts: ["first-term-equivalence-class"],
      openingLesson: ["把熟悉的等价类应用到闭项", `<p>你已经从具体关系的一整行收集过等价类。这里操作完全相同，只把对象换成闭项，把关系换成“可证明相等”：</p><code>[t]={u∈T₀｜t∼u}={u∈T₀｜H⊢t=u}</code><p>观察台给出的是无限闭项集合中的一个有限窗口。</p>`],
      spawnPositions: [{ x: 380, y: 220 }],
      nodes: [
        fixed("equivalence-class-c", "窗口中的闭项", constantCTerm, "term", 25, 55, "c"),
        fixed("equivalence-class-d", "窗口中的闭项", witnessDTerm, "term", 25, 185, "d"),
        fixed("equivalence-class-fc", "窗口中的闭项", termFc, "term", 25, 315, "f(c)"),
        fixed("equivalence-class-fd", "窗口中的闭项", termFd, "term", 25, 445, "f(d)"),
        { ...goal("set", 700, 130), id: "equivalence-class-c-goal", label: "从 c 出发", glyph: "[c]∩W" },
        { ...goal("set", 700, 360), id: "equivalence-class-d-goal", label: "从 d 出发", glyph: "[d]∩W" }
      ],
      hint: "观察 c∼u 与 d∼u 两行中哪些列成立。用配对构造对应的二元素集，再让同一个输出分别接入两个目标。",
      definition: ["等价类", `<p>闭项 t 的等价类由关系 ∼ 直接决定：</p><code>[t]={u∈T₀｜t∼u}={u∈T₀｜H⊢t=u}</code><p>本关只构造有限截面 [t]∩W。若 c∼d，则自反性、对称性与传递性保证 c 与 d 同每一个闭项的关系完全一致，因此完整等价类也满足：</p><code>c∼d　⇒　[c]=[d]</code>`],
      unlock: "闭项的等价类 [t]",
      completionLesson: `<span class="eyebrow">同一个等价类</span><h3>不同起点读出了同一个名字集合</h3><code>[c]∩W=[d]∩W={c,d}<br><br>一般地：c∼d ⇒ [c]=[d]</code><p class="layer-note">自反性保证 c、d 各自在组内；对称性与传递性保证任何与其中一个等价的闭项，也与另一个等价。方括号表示整组名字，不是给项添加的新语法。</p>`,
      validate: ({ values }) => equal(values["equivalence-class-c-goal"], termClassC) && equal(values["equivalence-class-d-goal"], termClassC)
        ? pass("从 c 与 d 出发都得到了同一个有限截面 {c,d}。")
        : fail("观察关系表：c 与 d 两行成立的列完全相同；两个目标应收到同一个集合 {c,d}。")
    },
    {
      id: "completeness-function-congruence", branch: "completeness", requires: ["completeness-term-quotient"], next: "completeness-predicate-congruence", chapter: "元理论 · 完备性Ⅴ", title: "等名经过函数仍然等名",
      copy: "假设 H 已经收下 c=d。先由 =I 得到 f(c)=f(c)，再用 =E 把右侧那次 c 换成 d；这保证函数不会把同一个对象送往两个不同结果。",
      goal: "从 c=d 推导 f(c)=f(d)。", tools: ["constC", "funcF", "equalityIntro", "equalityElim"], proofViews: true, fitchView: true, semanticWorkbench: "completeness-function-congruence", artifacts: ["term-congruence"],
      spawnPositions: [{ x: 230, y: 85 }, { x: 375, y: 85 }, { x: 520, y: 85 }, { x: 520, y: 305 }],
      nodes: [
        fixed("term-congruence-cd", "H 中已有的等式", proofObject("given", equalityCd, [equalityCd]), "proof", 20, 210, "c=d"),
        { ...goal("proof", 735, 210), label: "函数下的等式", glyph: "f(c)=f(d)" }
      ],
      hint: "构造 f(c)，用 =I 得到 f(c)=f(c)。把 c=d 与这条自身等式接入 =E，并在节点中选择右侧的 c。",
      definition: ["函数对等号的相容性", `<p>若 H⊢t=u，等号消去允许在任意公式中把 t 换成 u。应用到自身等式 f(t)=f(t)，得到：</p><code>H⊢t=u　⇒　H⊢f(t)=f(u)</code><p>因此函数作用在等价类上时不依赖代表元写法。</p>`],
      unlock: "函数解释在等价类上良定义",
      completionLesson: `<span class="eyebrow">函数的良定义性</span><h3>换一个等名，不会改变函数结果所代表的对象</h3><code>c=d<br>──────<br>f(c)=f(d)</code><p class="layer-note">这个结论来自已经构造的 =I 与 =E。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && equalFormula(value.conclusion, equalityFcFd)
        && proofUsesRule(value, "equalityIntro") && proofUsesRule(value, "equalityElim")
        ? pass("f(c) 与 f(d) 已被证明相等；函数解释不会依赖代表元。")
        : fail("先得到 f(c)=f(c)，再用 c=d 只替换右侧那次 c。")
    },
    {
      id: "completeness-term-quotient", branch: "completeness", requires: ["completeness-equivalence-class"], next: "completeness-function-congruence", chapter: "元理论 · 完备性Ⅴ", title: "让每一组等名成为一个对象",
      copy: "先用杯子与盘子的具体动画观察“多个名字、一个对象”，再依次认识闭项全集、等价类、商集和项模型论域的记号。最后才把它们合成一个公式。",
      goal: "逐个读懂 T₀、[t]、T₀/∼、Dᴴ 以及集合描述符中的每一部分。", tools: [], nodes: [], overview: true, completenessTermQuotientOverview: true, artifacts: ["term-quotient-domain"],
      hint: "这一关没有装配任务。先看杯子与盘子的类比，再从左到右阅读每一个记号。",
      definition: ["闭项商集", `<p><b>T₀</b> 是膨胀语言 L* 中全部闭项组成的集合；下标 0 只是这里采用的记号，不表示“第零阶段”。</p><p><b>[t]</b> 是闭项 t 的等价类，也就是所有与 t 可证明相等的闭项。</p><p><b>T₀/∼</b> 是把 T₀ 按关系 ∼ 分组后得到的商集；斜线不是除法。</p><p><b>Dᴴ</b> 是由极大一致 Henkin 理论 H 构造出的项模型的论域；上标 H 表示它来自 H，不是乘方。</p><code>Dᴴ=T₀/∼={ [t]｜t∈T₀ }</code>`],
      unlock: "项模型论域 Dᴴ",
      validate: () => pass("闭项已经按 H 中的可证明等式合并成模型对象。")
    },
    {
      id: "completeness-predicate-congruence", branch: "completeness", requires: ["completeness-term-quotient"], next: "completeness-assemble-term-model", chapter: "元理论 · 完备性Ⅴ", title: "性质也不读取代表元写法",
      copy: "H 已有 c=d。分别把 P(c) 与 R(c,c) 中的 c 换成等名 d；一元、二元谓词都必须只依赖对象，而不能依赖我们选了哪个名字。",
      goal: "推导 P(d)，并分两步推导 R(d,d)。", tools: ["equalityElim"], proofViews: true, fitchView: true, runTarget: "predicate-congruence-r-goal", semanticWorkbench: "completeness-predicate-congruence", multiGoals: ["predicate-congruence-p-goal", "predicate-congruence-r-goal"], artifacts: ["predicate-congruence"],
      spawnPositions: [{ x: 250, y: 70 }, { x: 250, y: 325 }, { x: 455, y: 325 }],
      nodes: [
        fixed("predicate-congruence-cd", "H 中已有", proofObject("given", equalityCd, [equalityCd]), "proof", 20, 70, "c=d"),
        fixed("predicate-congruence-pc", "H 中已有", proofObject("given", completenessPc, [completenessPc]), "proof", 20, 205, "P(c)"),
        fixed("predicate-congruence-rcc", "H 中已有", proofObject("given", completenessRcc, [completenessRcc]), "proof", 20, 365, "R(c,c)"),
        { ...goal("proof", 670, 125), id: "predicate-congruence-p-goal", label: "一元谓词结果", glyph: "P(d)" },
        { ...goal("proof", 670, 350), id: "predicate-congruence-r-goal", label: "二元谓词结果", glyph: "R(d,d)" }
      ],
      hint: "一枚 =E 把 P(c) 改成 P(d)。R(c,c) 需要两枚 =E：先选择一次 c 得到 R(d,c)，再选择剩余的 c 得到 R(d,d)。",
      definition: ["谓词解释的良定义性", `<p>由 H⊢t=u 与 H⊢P(t)，=E 给出 H⊢P(u)。关系的每个项位置也能逐一替换。</p><p>因此用“P(t) 是否属于 H”定义 Pᴴ 时，答案不会因同一等价类选择了不同代表元而改变。</p>`],
      unlock: "谓词与关系解释在等价类上良定义",
      validate: ({ values }) => {
        const pProof = values["predicate-congruence-p-goal"], rProof = values["predicate-congruence-r-goal"];
        return pProof && rProof && equalFormula(pProof.conclusion, predicatePd) && equalFormula(rProof.conclusion, relationDd)
          && countProofRule(rProof, "equalityElim") === 2
          ? pass("P 与 R 都只读取等价类，不读取代表元的写法。")
          : fail("P(c) 替换一次；R(c,c) 必须在两个项位置各替换一次。");
      }
    },
    {
      id: "completeness-assemble-term-model", branch: "completeness", requires: ["completeness-predicate-congruence"], next: "completeness-term-evaluation", chapter: "元理论 · 完备性Ⅴ", title: "让 H 自己解释这门语言",
      copy: "论域对象已经是闭项等价类。现在在一个有限窗口中构造常元、函数、谓词和关系的解释；每一项定义都直接读取项的构造或公式是否属于 H。",
      goal: "构造 cᴴ=[c]、两条 fᴴ 边、Pᴴ={[c]} 与 Rᴴ={⟨[c],[f(c)]⟩}。", tools: ["ord", "set1", "set2"], semanticWorkbench: "completeness-assemble-term-model", multiGoals: ["term-model-c", "term-model-f", "term-model-p", "term-model-r"], artifacts: ["canonical-term-model"],
      spawnPositions: [{ x: 190, y: 65 }, { x: 190, y: 205 }, { x: 190, y: 345 }, { x: 350, y: 65 }, { x: 350, y: 205 }, { x: 350, y: 345 }, { x: 500, y: 205 }],
      nodes: [
        fixed("term-class-c", "对象类", termClassC, "set", 15, 80, "[c]=[d]", true),
        fixed("term-class-fc", "对象类", termClassFc, "set", 15, 235, "[f(c)]=[f(d)]", true),
        fixed("term-class-ffc", "对象类", termClassFfc, "set", 15, 390, "[f(f(c))]", true),
        semanticValueGoal("term-model-c", "解释常元 c", "cᴴ", "等价类 [c]", 610, 45),
        semanticGoal("term-model-f", "解释函数 f 的窗口", "fᴴ", "两条函数边", 610, 165),
        semanticGoal("term-model-p", "解释谓词 P 的窗口", "Pᴴ", "具有 P 的对象类", 610, 300),
        semanticGoal("term-model-r", "解释关系 R 的窗口", "Rᴴ", "满足 R 的对象类对", 610, 420)
      ],
      hint: "[c] 直接送入 cᴴ。fᴴ 收集 ⟨[c],[f(c)]⟩ 与 ⟨[f(c)],[f(f(c))]⟩；Pᴴ 是 {[c]}；Rᴴ 只收 ⟨[c],[f(c)]⟩。",
      definition: ["项模型", `<p>在 Dᴴ 上解释语言：</p><code>cᴴ=[c]<br>fᴴ([t])=[f(t)]<br>Pᴴ={ [t]｜P(t)∈H }<br>Rᴴ={ ⟨[t],[u]⟩｜R(t,u)∈H }</code><p>前两关已经保证这些定义不依赖代表元。</p>`],
      unlock: "由 H 生成的项模型 𝔐ᴴ",
      completionLesson: `<span class="eyebrow">规范模型已经出现</span><h3>语法中的闭项变成对象，H 中的原子句变成解释</h3><code>闭项 t → 对象 [t]<br>P(t)∈H → [t]∈Pᴴ</code><p class="layer-note">本关只显示有限窗口；四条定义同时覆盖所有闭项。</p>`,
      validate: ({ values }) => equal(values["term-model-c"], termClassC)
        && equal(values["term-model-f"], termModelFunctionWindow)
        && equal(values["term-model-p"], termModelPredicateWindow)
        && equal(values["term-model-r"], termModelRelationWindow)
        ? pass("常元、函数、谓词和关系已经在同一个闭项商集上获得解释。")
        : fail("按 [t]↦[f(t)] 构造函数边；P 与 R 的窗口只收题面指定的对象类。")
    },
    {
      id: "completeness-term-evaluation", branch: "completeness", requires: ["completeness-assemble-term-model"], next: "completeness-atomic-truth", chapter: "元理论 · 完备性Ⅴ", title: "项的值就是它自己的等价类",
      copy: "让 [c] 连续经过两次刚刚构造的 fᴴ。语法树 f(f(c)) 每增加一层 f，模型中的值就沿函数解释前进一条边。",
      goal: "连续使用两次函数应用，得到 ⟦f(f(c))⟧ᴴ=[f(f(c))]。", tools: ["applyGraph"], semanticWorkbench: "completeness-term-evaluation", artifacts: ["term-evaluation-lemma"],
      spawnPositions: [{ x: 310, y: 120 }, { x: 505, y: 300 }],
      nodes: [
        fixed("term-eval-model-f", "刚刚构造的 fᴴ 窗口", termModelFunctionWindow, "set", 20, 90, "fᴴ"),
        fixed("term-eval-class-c", "常元的值", termClassC, "set", 20, 350, "[c]", true),
        { ...semanticValueGoal("goal", "复合项的值", "[f(f(c))]", "第二次函数应用的结果", 730, 215), label: "复合项的值" }
      ],
      hint: "同一个 fᴴ 输出可以连接到两枚函数应用。先输入 [c] 得到 [f(c)]，再把这个输出作为第二次输入。",
      definition: ["项取值引理", `<p>对项的构造作归纳。常元情形由 cᴴ=[c]；函数情形由 fᴴ([t])=[f(t)]：</p><code>⟦t⟧ᴴ=[t]</code><p>含变量的项则配合规范赋值 sᴴ(x)=[x]，得到同样结论。</p>`],
      unlock: "项取值引理：⟦t⟧ᴴ=[t]",
      completionLesson: `<span class="eyebrow">语法树与模型值对齐</span><h3>项模型没有另行计算名字的意义</h3><code>⟦c⟧ᴴ=[c]<br>⟦f(c)⟧ᴴ=[f(c)]<br>⟦f(f(c))⟧ᴴ=[f(f(c))]</code><p class="layer-note">这个具体两层路径展示了归纳推步；任意有限项树都沿同一规则得到自己的等价类。</p>`,
      validate: ({ value, nodes }) => equal(value, termClassFfc) && nodes.filter((node) => node.type === "applyGraph").length >= 2
        ? pass("两层函数项的语法构造与模型中的两次函数应用完全同步。")
        : fail("先得到 [f(c)]，再让它经过第二次 fᴴ。")
    },
    {
      id: "completeness-atomic-truth", branch: "completeness", requires: ["completeness-term-evaluation"], next: "completeness-conjunction-truth", chapter: "元理论 · 完备性Ⅵ", title: "项模型把 H 变成一个世界",
      copy: "完备性需要把一份相容的语法理论变成一个真正满足它的模型。刚才构造的 𝔐ᴴ 就是“项模型”：它用闭项的等价类充当对象，并直接按照 H 中留下的原子句解释谓词与关系。这样的模型不是随意猜出的；它被特意设计成让 H 写下的句子成为真句。本关先从原子公式检验这个设计。",
      goal: "理解项模型为什么由 H 构造，并查看三种原子公式怎样首先实现“模型为真 ⇔ 属于 H”。", tools: [], nodes: [], overview: true, completenessAtomicTruthOverview: true, artifacts: ["atomic-truth-lemma"],
      hint: "这一关没有装配任务。先看项模型是什么、为什么需要它，再沿三条等价链检查它是否完成了原子层的目标。",
      definition: ["项模型及其目的", `<p><b>项模型 𝔐ᴴ</b> 是从 H 直接造出的模型：闭项的等价类 [t] 是它的对象；函数按照项的构造运行；Pᴴ、Rᴴ 则按照 P(t)、R(t,u) 是否属于 H 决定。</p><p>引入它是为了完成从语法到语义的关键一步：</p><code>相容理论 H　→　一个满足 H 的模型 𝔐ᴴ</code><p>首先，项取值为 [t]，而原子解释直接读取 H，所以：</p><code>𝔐ᴴ⊨P(t) ⇔ [t]∈Pᴴ ⇔ P(t)∈H<br>𝔐ᴴ⊨R(t,u) ⇔ R(t,u)∈H<br>𝔐ᴴ⊨t=u ⇔ [t]=[u] ⇔ t=u∈H</code><p>后续关卡再证明这种对应会沿连接词与量词传播到所有句子。</p>`],
      unlock: "真值引理的原子基础",
      completionLesson: `<span class="eyebrow">从语法造出语义世界</span><h3>项模型不是任意模型，而是 H 的语义版本</h3><code>对象：[t]<br>原子解释：读取 H<br>目标：𝔐ᴴ⊨A ⇔ A∈H</code><p class="layer-note">原子公式已经按定义对齐。接下来要证明连接词和量词不会破坏这种对应，最终得到 𝔐ᴴ⊨H。</p>`,
      validate: () => pass("项模型把 H 的语法信息变成了对象与解释；原子公式已经在这个模型中按 H 的记录说真话。")
    },
    {
      id: "completeness-conjunction-truth", branch: "completeness", requires: ["completeness-atomic-truth"], next: "completeness-negation-truth", chapter: "元理论 · 完备性Ⅵ", title: "让 H 与模型用同一种方式判断合取",
      copy: "我们要求一句话属于 H，当且仅当它在刚刚构造的项模型中为真。模型认为 A∧B 为真，恰好要求 A、B 都真，所以极大一致的 H 也必须恰好在同时留下 A、B 时留下 A∧B。",
      goal: "证明 P(c)∧Q(c) 属于 H，当且仅当 P(c)、Q(c) 都属于 H。", tools: ["andElim1", "andElim2", "andIntro"], proofViews: true, fitchView: true, runTarget: "truth-and-build-goal", semanticWorkbench: "completeness-conjunction-truth", multiGoals: ["truth-and-left-goal", "truth-and-right-goal", "truth-and-build-goal"], artifacts: ["conjunction-truth-step"],
      spawnPositions: [{ x: 245, y: 55 }, { x: 245, y: 195 }, { x: 430, y: 340 }],
      nodes: [
        fixed("truth-and-whole", "假设属于 H", proofObject("given", pcAndQc, [pcAndQc]), "proof", 20, 90, "P(c)∧Q(c)"),
        fixed("truth-and-p", "假设属于 H", proofObject("given", completenessPc, [completenessPc]), "proof", 20, 315, "P(c)"),
        fixed("truth-and-q", "假设属于 H", proofObject("given", completenessQc, [completenessQc]), "proof", 20, 430, "Q(c)"),
        { ...goal("proof", 650, 55), id: "truth-and-left-goal", label: "取出左边", glyph: "P(c)" },
        { ...goal("proof", 650, 190), id: "truth-and-right-goal", label: "取出右边", glyph: "Q(c)" },
        { ...goal("proof", 650, 385), id: "truth-and-build-goal", label: "重新合成", glyph: "P(c)∧Q(c)" }
      ],
      hint: "需要证明两个方向：上方完整合取分别经 ∧E₁、∧E₂ 取出两边；下方两条单独公式经 ∧I 合回同一个合取。",
      definition: ["为什么要检查 H 中的合取", `<p>最终目标是真值引理：</p><code>𝔐ᴴ⊨A ⇔ A∈H</code><p>假设较小的 A、B 已经分别与模型对齐。合取的语义要求两边同时为真；而 ∧E、∧I 保证 H 中也恰好是两边同时存在时，合取才存在：</p><code>A∧B∈H ⇔ A∈H 且 B∈H<br>　　　　 ⇔ 𝔐ᴴ⊨A 且 𝔐ᴴ⊨B<br>　　　　 ⇔ 𝔐ᴴ⊨A∧B</code><p>所以本关不是再次练习合取规则，而是在证明这些规则让 H 与模型对合取作出相同判断。</p>`],
      unlock: "真值引理的合取步骤",
      completionLesson: `<span class="eyebrow">对应关系向上推进了一层</span><h3>H 与项模型现在会对合取作出相同判断</h3><code>A∧B∈H ⇔ A∈H 且 B∈H<br>𝔐ᴴ⊨A∧B ⇔ 𝔐ᴴ⊨A 且 𝔐ᴴ⊨B</code><p class="layer-note">子公式已经对应时，这两行拥有完全相同的结构。因此真值引理从 A、B 传播到了 A∧B。</p>`,
      validate: ({ values }) => equalFormula(values["truth-and-left-goal"] && values["truth-and-left-goal"].conclusion, completenessPc)
        && equalFormula(values["truth-and-right-goal"] && values["truth-and-right-goal"].conclusion, completenessQc)
        && equalFormula(values["truth-and-build-goal"] && values["truth-and-build-goal"].conclusion, pcAndQc)
        ? pass("H 与项模型都恰好在两边同时成立时接受合取；真值对应已经传播到合取根。")
        : fail("从完整合取各取一次，再用两条单独公式重建合取。")
    },
    {
      id: "completeness-negation-truth", branch: "completeness", requires: ["completeness-conjunction-truth"], next: "completeness-disjunction-truth", chapter: "元理论 · 完备性Ⅵ", title: "H 怎样把假写成否定",
      copy: "从具体原子句 P(f(c)) 开始：对象 [f(c)] 不在 Pᴴ 的范围内，所以这句话在项模型中为假。沿已经完成的原子真值引理走进 H，再观察极大一致性为什么迫使 H 留下它的否定。",
      goal: "认识相容性与判定性如何分别完成否定真值引理的两个方向。", tools: [], nodes: [], overview: true, completenessNegationTruthOverview: true, artifacts: ["negation-truth-step"],
      hint: "这一关没有装配任务。先阅读 P(f(c)) 的具体路径，再比较下方两个相反方向分别在哪一步使用相容性与判定性。",
      definition: ["否定的真值步骤", `<p>极大一致性包含两件事：<b>相容性</b>保证 A 与 ¬A 不会同时属于 H；<b>判定性</b>保证二者不会同时缺席。因此：</p><code>¬A∈H ⇔ A∉H</code><p>处理公式树的 ¬A 根时，它唯一的子公式 A 更小，所以归纳方法允许使用已经对 A 证明的对应：</p><code>A∈H ⇔ 𝔐ᴴ⊨A</code><p>否定的语义又给出 𝔐ᴴ⊨¬A ⇔ 𝔐ᴴ⊭A。把三段对应接起来：</p><code>𝔐ᴴ⊨¬A ⇔ ¬A∈H</code>`],
      unlock: "真值引理的否定步骤",
      validate: () => pass("相容性排除了同时保留两面，判定性排除了两面都不保留；否定的两个方向已经闭合。")
    },
    {
      id: "completeness-disjunction-truth", branch: "completeness", requires: ["completeness-negation-truth"], next: "completeness-implication-truth", chapter: "元理论 · 完备性Ⅵ", title: "若析取属于 H，至少一边属于 H",
      copy: "假定 A∨B∈H，却有 A∉H 且 B∉H。由极大一致性可得 ¬A∈H、¬B∈H；现在对析取的两种情况分别推出矛盾，再用已经构造的 ∨E 合并。",
      goal: "从 A∨B、¬A、¬B 推导 ⊥，排除 A∉H 且 B∉H。", tools: ["notElim"], proofViews: true, fitchView: true, semanticWorkbench: "completeness-disjunction-truth", artifacts: ["disjunction-truth-step"],
      spawnPositions: [{ x: 230, y: 120 }, { x: 480, y: 120 }],
      nodes: [
        fixed("truth-or-source", "假设属于 H", proofObject("given", truthSchemaOr, [truthSchemaOr]), "proof", 15, 300, "A∨B"),
        caseAssumptionNode("truth-or-left-entry", "left", "truth-or-left-scope", 165, 60),
        fixed("truth-or-not-a", "由 A∉H 得 ¬A∈H", proofObject("given", F.not(schemaA), [F.not(schemaA)]), "proof", 165, 165, "¬A"),
        caseAssumptionNode("truth-or-right-entry", "right", "truth-or-right-scope", 415, 60),
        fixed("truth-or-not-b", "由 B∉H 得 ¬B∈H", proofObject("given", F.not(schemaB), [F.not(schemaB)]), "proof", 415, 165, "¬B"),
        orElimNode("truth-or-elim", "truth-or-left-scope", "truth-or-right-scope", 300, 300),
        { ...goal("proof", 505, 410), label: "排除 A∉H 且 B∉H", glyph: "⊥" }
      ],
      scopeFrames: [
        { id: "truth-or-left-scope", label: "情况一 · 暂时采用 A", x: 140, y: 25, width: 230, height: 225 },
        { id: "truth-or-right-scope", label: "情况二 · 暂时采用 B", x: 390, y: 25, width: 230, height: 225 }
      ],
      hint: "A∨B 同时接到两个情况入口和 ∨E。每个临时情况分别与对应否定送入一枚 ¬E；两边得到的共同结论 ⊥ 再接入 ∨E。",
      definition: ["析取的真值步骤", `<p>若 A∨B∈H，而 A∉H 且 B∉H，极大一致性便给出 ¬A∈H、¬B∈H。对 A∨B 分类讨论后，两条分支都会矛盾，因此这种情况不可能。</p><code>A∨B∈H ⇒ A∈H 或 B∈H</code><p>反方向使用玩家已经构造的两条 ∨I：</p><code>A∈H 或 B∈H ⇒ A∨B∈H</code><p>所以 A∨B∈H 恰好对应模型中至少一边为真。</p>`],
      unlock: "真值引理的析取步骤",
      completionLesson: `<span class="eyebrow">分类讨论排除了 A∉H 且 B∉H</span><h3>析取属于 H，当且仅当至少一边属于 H</h3><code>A∨B∈H ⇔ A∈H 或 B∈H</code><p class="layer-note">困难的方向由你刚完成的 ∨E 证明；反方向就是之前亲手构造的 ∨I₁、∨I₂。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "orElim" && value.conclusion.kind === "bottom" && countProofRule(value, "notElim") === 2
        ? pass("若 A∨B∈H，就不可能同时有 A∉H 与 B∉H；结合 ∨I，两个方向都已完成。")
        : fail("两种临时情况都要与各自的否定经 ¬E 得到 ⊥，再由 ∨E 合并。")
    },
    {
      id: "completeness-implication-truth", branch: "completeness", requires: ["completeness-disjunction-truth"], next: "completeness-quantifier-duality", chapter: "元理论 · 完备性Ⅵ", title: "蕴含只禁止一种失败",
      copy: "假定 A→B∈H 且 A∈H。由 →E 可得 B∈H；因此不可能再有 ¬B∈H，也就是不可能同时满足 A→B∈H、A∈H 与 B∉H。请亲手推出这个矛盾。",
      goal: "从 A→B 与 A 得到 B，再让 B 与 ¬B 相撞得到 ⊥。", tools: ["impElim", "notElim"], proofViews: true, fitchView: true, semanticWorkbench: "completeness-implication-truth", artifacts: ["implication-truth-step"],
      spawnPositions: [{ x: 230, y: 145 }, { x: 405, y: 245 }],
      nodes: [
        fixed("truth-imp-source", "假设属于 H", proofObject("given", truthSchemaImp, [truthSchemaImp]), "proof", 20, 75, "A→B"),
        fixed("truth-imp-a", "前件也属于 H", proofObject("given", schemaA, [schemaA]), "proof", 20, 245, "A"),
        fixed("truth-imp-not-b", "由 B∉H 得 ¬B∈H", proofObject("given", F.not(schemaB), [F.not(schemaB)]), "proof", 20, 415, "¬B"),
        { ...goal("proof", 535, 365), label: "禁止的组合", glyph: "⊥" }
      ],
      hint: "先把 A→B 与 A 按顺序送入 →E 得到 B；再把 B 与 ¬B 按顺序送入 ¬E。",
      definition: ["蕴含的真值步骤", `<p>你刚排除了唯一让蕴含失败的组合：A∈H 而 B∉H。</p><code>A→B∈H ⇒ A∉H 或 B∈H</code><p>反方向使用已经构造的 →I：A∉H 时，极大一致性给出 ¬A∈H，临时采用 A 会产生矛盾并推出 B；B∈H 时，在临时 A 的范围内仍可使用 B。关闭范围都得到 A→B。</p><code>A→B∈H ⇔ A∉H 或 B∈H</code>`],
      unlock: "真值引理的蕴含步骤",
      completionLesson: `<span class="eyebrow">蕴含的失败条件</span><h3>A→B∈H 排除了 A∈H 且 B∉H</h3><code>A→B∈H ⇔ A∉H 或 B∈H</code><p class="layer-note">对子公式使用已经得到的对应后，这正是模型里蕴含为真的条件。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && value.conclusion.kind === "bottom" && proofUsesRule(value, "impElim") && proofUsesRule(value, "notElim")
        ? pass("→E 暴露了蕴含唯一禁止的失败情形；蕴含的真值条件已经与语义对齐。")
        : fail("先用 →E 从 A→B、A 得到 B，再让 B 与 ¬B 经 ¬E 得到矛盾。")
    },
    {
      id: "completeness-quantifier-duality", branch: "completeness", requires: ["completeness-implication-truth"], next: "completeness-quantifier-truth", chapter: "元理论 · 完备性Ⅵ", title: "没有全称，就要找到反例",
      copy: "“并非所有对象都是盘子”可以推出”存在一个对象，这个对象不是盘子“。由 ¬∀xP(x) 出发，反设不存在反例；在任意名字 y 上再反设 ¬P(y)，加上存在量词便产生矛盾，于是得到 P(y)，最后收回任意名字。",
      goal: "用已经构造的规则证明 ¬∀xP(x) ⊢ ∃x¬P(x)。", tools: ["vary", "existsIntro", "notElim"], proofViews: true, fitchView: true, artifacts: ["classical-quantifier-duality"],
      spawnPositions: [{ x: 245, y: 405 }, { x: 640, y: 405 }, { x: 775, y: 405 }],
      nodes: [
        fixed("duality-not-forall", "已有前提", proofObject("given", F.not(universalP), [F.not(universalP)]), "proof", 15, 65, "¬∀xP(x)"),
        fixed("duality-outer-assumption", "准备反设", notExistentialNotP, "formula", 15, 210, "¬∃x¬P(x)"),
        scopeAssumptionNode("duality-outer-entry", "duality-outer-scope", 205, 190),
        arbitraryFlagNode("duality-forall-start", "duality-forall-scope", 385, 60, ["duality-not-forall", "duality-outer-entry"]),
        fixed("duality-inner-assumption", "在任意 y 上反设", F.not(py), "formula", 385, 220, "¬P(y)"),
        scopeAssumptionNode("duality-inner-entry", "duality-inner-scope", 555, 205),
        raaDischargeNode("duality-inner-close", "duality-inner-scope", 760, 190),
        forallIntroNode("duality-forall-close", "duality-forall-scope", 900, 105),
        raaDischargeNode("duality-outer-close", "duality-outer-scope", 1045, 205),
        goal("proof", 1200, 305)
      ],
      scopeFrames: [
        { id: "duality-outer-scope", label: "反设：不存在反例", x: 190, y: 25, width: 1000, height: 450, discharge: true, boundaryLabel: "RAA", boundaryCopy: "解除反设，得到存在反例" },
        { id: "duality-forall-scope", flagKind: "universal", flagNode: "duality-forall-start", label: "⚑ 任意 y", x: 370, y: 45, width: 600, height: 300, discharge: true, boundaryLabel: "∀I", boundaryCopy: "从任意 y 收成全称" },
        { id: "duality-inner-scope", label: "再反设 ¬P(y)", x: 540, y: 175, width: 330, height: 145, discharge: true, boundaryLabel: "RAA", boundaryCopy: "得到 P(y)" }
      ],
      hint: "把固定的 ¬P(y) 接入内层假设，并用 y 经 ∃I 隐去这个临时名字，得到 ∃x¬P(x)。它与外层反设经 ¬E 得 ⊥；关闭内层 RAA 得 P(y)，只把 P(y) 接入 ∀I 出口，再与最左前提冲突，最后关闭外层 RAA。",
      definition: ["量词的经典对偶", `<p>在经典逻辑中，“并非每个对象都有 P”会给出一个不具有 P 的对象：</p><code>¬∀xP(x) ⊢ ∃x¬P(x)</code><p>证明的关键不是凭空挑出对象，而是反设根本没有反例，再用任意名字推出全称句。这里用到 RAA；直觉主义逻辑不能一般地完成这一步。</p>`],
      unlock: "量词的经典对偶",
      completionLesson: `<span class="eyebrow">量词之间的桥梁</span><h3>否定全称，等价于存在反例</h3><code>¬∀xP(x) ⊢ ∃x¬P(x)</code><p class="layer-note">两层范围各有职责：内层证明任意 y 满足 P；全称旗把它收成 ∀xP(x)；外层才解除“不存在反例”的假设。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && equalFormula(value.conclusion, existentialNotP)
        && countProofRule(value, "raa") === 2 && proofUsesRule(value, "existsIntro") && proofUsesRule(value, "forallIntro") && proofUsesRule(value, "notElim")
        ? pass("不存在反例的假设迫使全称句成立，与原前提冲突；所以反例必定存在。")
        : fail("需要两次 RAA：先在任意 y 上得到 P(y)，再解除外层的“不存在反例”。")
    },
    {
      id: "completeness-quantifier-truth", branch: "completeness", requires: ["completeness-quantifier-duality"], next: "completeness-truth-induction", chapter: "元理论 · 完备性Ⅵ", title: "见证把量词落到闭项上",
      copy: "先回到杯子与盘子的世界：杯子让“存在一个杯子”成立，盘子让“所有对象都是杯子”失败。随后沿闭项名字逐步展开存在与全称的两个方向。",
      goal: "认识模型中的对象、H 中的闭项见证和量词公式怎样逐项对应。", tools: [], nodes: [], overview: true, completenessQuantifierTruthOverview: true, artifacts: ["quantifier-truth-step"],
      hint: "这一关没有装配任务。先看杯子与盘子的具体量词，再阅读存在量词的两个方向；全称量词的反向使用上一关得到的“没有全称就有反例”。",
      definition: ["量词的真值步骤", `<p>项模型的每个对象都是某个闭项的等价类 [t]。因此模型中的对象见证可以用闭项 t 命名，H 中的闭项见证也会成为模型对象。</p><p>处理 A(t) 时，它比 ∃xA 或 ∀xA 少一层量词，所以可以使用已经对这个较小公式证明的对应：</p><code>𝔐ᴴ⊨A(t) ⇔ A(t)∈H</code><p>存在句属于 H 时，Henkin 性给出闭项见证；反向使用 ∃I 与 H 对推导的封闭性。全称句属于 H 时，∀E 给出每个闭项实例；若它不属于 H，判定性、量词对偶和 Henkin 见证会产生闭项反例。</p><code>𝔐ᴴ⊨∃xA ⇔ ∃xA∈H<br>𝔐ᴴ⊨∀xA ⇔ ∀xA∈H</code>`],
      unlock: "真值引理的量词步骤",
      completionLesson: `<span class="eyebrow">量词已经落地</span><h3>项模型中的对象恰好都有闭项名字</h3><p>因此模型里“有一个对象”与 H 里“有一个闭项见证”能够逐项对应；全称失败也一定能被某个闭项反例看见。</p>`,
      validate: () => pass("闭项名字把模型对象与 H 中的见证逐一接通；存在与全称的两个真值步骤已经完成。")
    },
    {
      id: "completeness-truth-induction", branch: "completeness", requires: ["completeness-quantifier-truth"], next: "completeness-model-existence", chapter: "元理论 · 完备性Ⅵ", title: "真值沿整棵公式树传播",
      copy: "局部真值步骤不再作为抽象卡片出现。请像之前构造语法树那样，亲手搭出一个同时含有原子、否定、合取、析取、蕴含、存在与全称的完整句子；右侧会显示对应关系怎样从叶子逐层到达根。",
      goal: "构造 ∀x((P(x)→Q(x))∧(¬P(x)∨∃yR(x,y)))。", tools: ["predP", "predQ", "predR", "not", "imp", "or", "and", "exists", "forall"], semanticWorkbench: "completeness-truth-induction", artifacts: ["truth-lemma"],
      spawnPositions: [{ x: 130, y: 35 }, { x: 130, y: 145 }, { x: 130, y: 385 }, { x: 300, y: 355 }, { x: 300, y: 80 }, { x: 470, y: 330 }, { x: 470, y: 145 }, { x: 300, y: 435 }, { x: 535, y: 250 }],
      nodes: [
        fixed("truth-induction-x", "变量", F.variable, "term", 15, 115, "x", true),
        fixed("truth-induction-y", "变量", variableY, "term", 15, 390, "y", true),
        { ...goal("formula", 535, 425), label: "完整句子", glyph: "∀x((P(x)→Q(x))∧(¬P(x)∨∃yR(x,y)))" }
      ],
      hint: "让同一个 P(x) 输出分接给 → 的前件与 ¬。R 的左右项依次是 x、y；先用 ∃ 绑定 y，最后用 ∀ 绑定整棵树中的 x。",
      definition: ["真值引理", `<p>对句子 A 的结构作归纳：</p><code>𝔐ᴴ⊨A　⇔　A∈H</code><p>原子情形来自项模型的定义；¬、∧、∨、→ 使用已经构造的自然演绎规则、H 的判定性与相容性；∀、∃ 使用闭项论域与 Henkin 见证。</p>`],
      unlock: "项模型真值引理",
      completionLesson: `<span class="eyebrow">语法与语义逐层吻合</span><h3>H 写下的每个句子，恰好都是项模型中的真句</h3><code>对任意句子 A：　𝔐ᴴ⊨A ⇔ A∈H</code><p class="layer-note">这不是只验证几个例子：结构归纳覆盖了公式树的每一种有限生成方式。</p>`,
      validate: ({ value, nodes }) => equalFormula(value, truthInductionTarget) && ["predP", "predQ", "predR", "not", "imp", "or", "and", "exists", "forall"].every((type) => nodes.some((node) => node.type === type))
        ? pass("对应关系已经从三片原子叶，经过每一种构造，传播到整个句子的根。")
        : fail("依次完成原子叶、内部连接词、∃y 与最外层 ∀x；P(x) 可以分接到两个位置。")
    },
    {
      id: "completeness-model-existence", branch: "completeness", requires: ["completeness-truth-induction"], next: "completeness-language-reduct", chapter: "元理论 · 完备性Ⅵ", title: "把原理论的每句话带回模型",
      copy: "Henkin 施工向理论中加入了许多决定与见证，却从未删除原理论 S₀ 的句子。请在扩张后的 H 中逐句找到 S₀ 原有的两句话；上一关完成的真值引理会在右侧显示它们已经在项模型中成立。",
      goal: "把 S₀={∀x(P(x)→Q(x)),¬∀xQ(x)} 的两句话分别对应到 H 中的同一句话。", tools: [], semanticWorkbench: "completeness-model-existence", multiGoals: ["model-existence-universal", "model-existence-negated"], artifacts: ["expanded-language-model"],
      nodes: [
        fixed("model-existence-source-universal", "S₀ 的第一句话", universalPImpQ, "formula", 25, 125, "∀x(P(x)→Q(x))", true),
        fixed("model-existence-source-negated", "S₀ 的第二句话", F.not(universalQ), "formula", 25, 345, "¬∀xQ(x)", true),
        { ...goal("formula", 390, 65), id: "model-existence-universal", label: "H 中的一句话", glyph: "∀x(P(x)→Q(x))", slotBody: "若它来自 S₀，接入完全相同的原句" },
        { ...goal("formula", 390, 185), id: "model-existence-decoy-qc", label: "H 中新增的句子", glyph: "Q(c)", slotBody: "判断它是否属于原来的 S₀" },
        { ...goal("formula", 390, 305), id: "model-existence-negated", label: "H 中的一句话", glyph: "¬∀xQ(x)", slotBody: "若它来自 S₀，接入完全相同的原句" },
        { ...goal("formula", 390, 425), id: "model-existence-decoy-rcc", label: "H 中新增的句子", glyph: "R(c,c)", slotBody: "判断它是否属于原来的 S₀" }
      ],
      hint: "逐字比较公式。第一句话接到 H 中的全称蕴含位置，第二句话接到 H 中的否定全称位置；新增的 Q(c)、R(c,c)、P(d) 不属于原来的 S₀。",
      definition: ["为什么项模型也满足原理论", `<p>对 S₀ 中任意一句 A，Henkin 施工始终保留旧句子，所以：</p><code>A∈S₀ ⇒ A∈H</code><p>上一关的真值引理又给出：</p><code>A∈H ⇔ 𝔐ᴴ⊨A</code><p>因此 S₀ 的每句话都在项模型中为真：</p><code>𝔐ᴴ⊨S₀</code><p>本关只把 S₀ 的两个成员逐句画出来；同一个论证适用于任意原理论 S。项模型目前仍解释扩充语言 L* 中的辅助名字，下一关再把它们忘掉。</p>`],
      unlock: "扩充语言中满足 S₀ 的项模型",
      completionLesson: `<span class="eyebrow">原理论逐句进入模型</span><h3>施工增加了句子，却没有丢掉 S₀ 的任何句子</h3><code>任取 A∈S₀<br>A∈S₀ ⇒ A∈H ⇔ 𝔐ᴴ⊨A<br>因此 𝔐ᴴ⊨S₀</code><p class="layer-note">右侧两行是这个一般论证的具体展开。项模型目前仍属于扩充语言 L*；下一关将忘掉辅助名字，回到原语言 L。</p>`,
      validate: ({ values }) => equalFormula(values["model-existence-universal"], universalPImpQ) && equalFormula(values["model-existence-negated"], F.not(universalQ))
        ? pass("S₀ 的两句话都仍属于 H，真值引理因此逐句保证它们在项模型中成立。")
        : fail("把 S₀ 的两句话分别接到 H 中完全相同的公式位置，不要接入施工后来新增的句子。")
    },
    {
      id: "completeness-language-reduct", branch: "completeness", requires: ["completeness-model-existence"], next: "completeness-model-existence-summary", chapter: "元理论 · 完备性Ⅵ", title: "忘掉证明中添加的名字",
      copy: "项模型还解释着扩充语言 L* 中的 Henkin 常元。现在保留同一论域和所有原符号的解释，只忘掉这些辅助常元；任何原语言句子的真假都不会因此改变。",
      goal: "查看模型如何从 L* 回到原语言 L。", tools: [], nodes: [], overview: true, completenessLanguageReductOverview: true, artifacts: ["language-reduct"],
      hint: "这一关没有装配任务。页面只删除原语言句子根本不会读取的辅助解释。",
      definition: ["忘掉辅助符号", `<p>把 L* 模型中只属于扩充语言的符号解释略去，记作：</p><code>𝔐=𝔐ᴴ↾L</code><p>论域不变，L 中每个常元、函数、谓词和关系的解释也不变。由于原语言句子 A 根本不含新增符号，它在前后两个模型中的真假相同：</p><code>𝔐ᴴ⊨A　⇔　𝔐⊨A</code><p>因此 𝔐ᴴ⊨S 会给出真正的原语言模型 𝔐⊨S。</p>`],
      unlock: "把扩充语言模型缩回原语言的方法",
      validate: () => pass("辅助名字已经忘掉；原语言句子的真假保持不变。")
    },
    {
      id: "completeness-model-existence-summary", branch: "completeness", requires: ["completeness-language-reduct"], next: "completeness-countermodel-theory", chapter: "元理论 · 完备性Ⅵ", title: "没有矛盾，就能造出一个世界",
      copy: "你已经完成了证明的每一个施工步骤。现在拉远视角，看看它们怎样共同把“没有语法矛盾”变成“存在一个满足理论的世界”。",
      goal: "回顾并正式获得模型存在定理。", tools: [], nodes: [], overview: true, modelExistenceTheoremOverview: true, artifacts: ["model-existence-theorem"],
      hint: "这一关没有装配任务。模型存在定理是此前全部 Henkin 施工的总成果，而不是一个需要再次接线的新零件。",
      definition: ["模型存在定理", `<p>这个定理把一个语法事实变成一个语义事实：</p><code>S 相容　⇒　存在 𝔐，使 𝔐⊨S</code><p>Henkin 施工先把相容理论 S 扩张成极大相容且拥有见证的 H；闭项和可证等式组成项模型 𝔐ᴴ；真值引理证明 <code>A∈H ⇔ 𝔐ᴴ⊨A</code>；最后忘掉辅助常元，得到原语言模型 <code>𝔐=𝔐ᴴ↾L</code>。</p><p>任取 A∈S。因为 S⊆H，所以 A∈H；真值引理给出 𝔐ᴴ⊨A；A 是原语言句子，缩减模型后仍有 𝔐⊨A。A 任意，因此 𝔐 满足 S 的全部句子。</p>`],
      unlock: "模型存在定理",
      validate: () => pass("模型存在定理已经完整呈现。")
    },
    {
      id: "completeness-countermodel-theory", branch: "completeness", requires: ["completeness-model-existence-summary"], next: "completeness-countermodel-consistency", chapter: "元理论 · 完备性Ⅶ", title: "把反模型的要求写成理论",
      copy: "已知 T⊨A，并暂时反设 T⊬A。要反驳语义后承，我们需要一个满足 T、却不满足 A 的模型。先不要寻找模型，只把这两项要求写进同一个理论。",
      goal: "构造 S=T∪{¬A}。", tools: ["not", "pair", "union"], runTarget: "completeness-countermodel-request", semanticWorkbench: "completeness-countermodel-request", artifacts: ["countermodel-theory"],
      spawnPositions: [{ x: 180, y: 185 }, { x: 345, y: 185 }, { x: 345, y: 65 }, { x: 500, y: 125 }],
      nodes: [
        fixed("completeness-final-theory", "任意原语言理论", abstractTheoryT, "context", 20, 65, "T", true),
        fixed("completeness-final-formula", "希望在模型中为假", schemaA, "formula", 20, 225, "A", true),
        { ...goal("context", 545, 155), id: "completeness-countermodel-request", label: "反模型要求", glyph: "S=T∪{¬A}", slotBody: "把两项要求收进同一个理论" }
      ],
      hint: "先构造 ¬A，再用配对得到 {¬A}；把 T 与 {¬A} 配对后取并集。",
      definition: ["反模型理论", `<p><code>T⊬A</code> 并不直接给出 <code>¬A</code>。我们主动把 ¬A 加进理论，是为了把“寻找反模型”写成一组模型必须同时满足的要求：</p><code>S=T∪{¬A}</code><p>任何满足 S 的模型都会满足 T，并让 A 为假。</p>`],
      unlock: "反模型理论 S=T∪{¬A}",
      completionLesson: `<span class="eyebrow">反模型要求已经写下</span><h3>一个模型满足 S，正好就是我们要找的反模型</h3><code>𝔐⊨S　⇒　𝔐⊨T 且 𝔐⊭A</code><p class="layer-note">¬A 是为了规定模型应当怎样，而不是由 T⊬A 推导出来的。</p>`,
      validate: ({ value, nodes }) => equal(value, completenessCountermodelRequest) && nodes.filter((node) => node.type === "pair").length >= 2 && nodes.some((node) => node.type === "not") && nodes.some((node) => node.type === "union")
        ? pass("反模型的两项要求已经收进同一个理论 S。")
        : fail("构造 ¬A 和单元素集 {¬A}，再把它与 T 合并成 T∪{¬A}。")
    },
    {
      id: "completeness-countermodel-consistency", branch: "completeness", requires: ["completeness-countermodel-theory"], next: "completeness-theorem", chapter: "元理论 · 完备性Ⅶ", title: "从反设造出反模型",
      copy: "上一关得到 S=T∪{¬A}。现在反设 S 能推出矛盾：这会产生一份 T⊢A 的证明，与外层反设 T⊬A 冲突。解除这个反设得到 S 相容，再立即把 S 与相容性送入模型存在定理。",
      goal: "证明 S 相容，并用模型存在定理得到满足 S 的模型。", tools: [], proofViews: true, fitchView: true, runTarget: "completeness-existence-consistency-input", semanticWorkbench: "completeness-theorem-application", multiGoals: ["completeness-existence-theory-input", "completeness-existence-consistency-input"], artifacts: ["countermodel"],
      nodes: [
        fixed("completeness-inconsistent-proof", "展开 S⊢⊥", proofObject("inconsistencyAssumption", bottomFormula, abstractTheoryT, [], { openScopes: [{ id: COMPLETENESS_META_SCOPE_ID, formula: completenessMetaNotDerivable }, { id: "completeness-inconsistent-scope", formula: completenessMetaInconsistent }, { id: COMPLETENESS_NEG_A_SCOPE_ID, formula: F.not(schemaA) }] }), "proof", 30, 140, "T,¬A⊢⊥"),
        { ...raaDischargeNode("completeness-neg-a-raa", COMPLETENESS_NEG_A_SCOPE_ID, 215, 140), label: "解除临时的 ¬A", metaConclusion: completenessMetaDerivable },
        fixed("completeness-not-derivable", "外层反设", proofObject("assumption", completenessMetaNotDerivable, [], [], { openScopes: [{ id: COMPLETENESS_META_SCOPE_ID, formula: completenessMetaNotDerivable }] }), "proof", 215, 270, "T⊬A"),
        { id: "completeness-derivability-conflict", type: "notElim", label: "与外层反设冲突", glyph: "¬E", inputs: registry.notElim.inputs, out: registry.notElim.out, x: 375, y: 190, fixed: true, scopeBound: true, scopeId: "completeness-inconsistent-scope" },
        { ...negationDischargeNode("completeness-consistency-discharge", "completeness-inconsistent-scope", 545, 190), label: "解除 S⊢⊥" },
        fixed("completeness-stage-theory", "K33 构造的理论", completenessCountermodelRequest, "context", 30, 390, "S=T∪{¬A}"),
        { ...goal("context", 225, 390), id: "completeness-existence-theory-input", label: "定理的理论输入", glyph: "理论 S", slotBody: "接入 K33 构造的理论" },
        { ...goal("proof", 545, 365), id: "completeness-existence-consistency-input", label: "定理的条件输入", glyph: "S 相容", slotBody: "接入 ¬(S⊢⊥) 的证明" }
      ],
      scopeFrames: [
        { id: COMPLETENESS_META_SCOPE_ID, label: "外层反设：T⊬A", x: 5, y: 25, width: 680, height: 455, discharge: false },
        { id: "completeness-inconsistent-scope", label: "暂时反设：S⊢⊥", x: 15, y: 90, width: 645, height: 255, discharge: true, boundaryLabel: "¬I", boundaryCopy: "矛盾解除 S⊢⊥，得到 S⊬⊥，也就是 S 相容" },
        { id: COMPLETENESS_NEG_A_SCOPE_ID, label: "在 S=T∪{¬A} 中临时使用 ¬A", x: 22, y: 115, width: 355, height: 125, discharge: true, boundaryLabel: "RAA", boundaryCopy: "解除 ¬A，得到 T⊢A" }
      ],
      hint: "先用 RAA 从 T,¬A⊢⊥ 得到 T⊢A；与外层 T⊬A 接入 ¬E；再用 ¬I 解除 S⊢⊥。把得到的 S 相容和左下角的 S 分别接入模型存在定理。",
      definition: ["从相容性到反模型", `<p>相容就是不能推出矛盾：</p><code>S 相容　⇔　S⊬⊥</code><p>若反设 <code>S⊢⊥</code>，由于 <code>S=T∪{¬A}</code>，便有 <code>T,¬A⊢⊥</code>。解除 ¬A 得到 <code>T⊢A</code>，与外层 <code>T⊬A</code> 冲突，因此 <code>S⊬⊥</code>。</p><p>模型存在定理随即给出：</p><code>存在 𝔐，使 𝔐⊨S</code>`],
      unlock: "满足 T 而不满足 A 的模型 𝔐",
      completionLesson: `<span class="eyebrow">反模型已经存在</span><h3>同一条推理先保护相容性，再让相容性产生世界</h3><code>T⊬A<br>⇒ S=T∪{¬A} 相容<br>⇒（模型存在定理）存在 𝔐⊨S<br>⇒ 𝔐⊨T 且 𝔐⊭A</code><p class="layer-note">下一关只需让这个反模型与题设 T⊨A 正面相撞。</p>`,
      validate: ({ values }) => {
        const consistencyProof = values["completeness-existence-consistency-input"];
        return equal(values["completeness-existence-theory-input"], completenessCountermodelRequest) && completenessConsistencyProofReady(consistencyProof)
          ? pass("S 的相容性已经从反设中证明，并立即通过模型存在定理产生了反模型。")
          : fail("先在上方推出并解除 S⊢⊥，再把所得相容性与左下角的 S 一起送入模型存在定理。");
      }
    },
    {
      id: "completeness-theorem", branch: "completeness", requires: ["completeness-countermodel-consistency"], next: "completeness-concrete-replay", chapter: "元理论 · 完备性Ⅶ", title: "不存在的反模型",
      copy: "上一关得到同一个模型 𝔐：它满足 T，却不满足 A。但题设 T⊨A 说，每个满足 T 的模型都必须满足 A。请让题设作用于这个具体模型，并关闭最外层反设。",
      goal: "在同一个模型中推出 𝔐⊨A 与 𝔐⊭A 的冲突，得到 T⊢A。", tools: [], proofViews: true, fitchView: true, runTarget: "completeness-final-goal", artifacts: ["first-order-completeness-theorem"],
      nodes: [
        fixed("completeness-entailment-at-model", "语义后承作用于这个模型", proofObject("entailmentInstance", completenessMetaEntailmentInstance), "proof", 35, 105, "(𝔐⊨T)→(𝔐⊨A)"),
        fixed("completeness-model-theory", "K34 得到的同一个模型", proofObject("modelExistence", completenessMetaModelTheory, [], [], { openScopes: [{ id: COMPLETENESS_META_SCOPE_ID, formula: completenessMetaNotDerivable }] }), "proof", 35, 245, "𝔐⊨T"),
        fixed("completeness-model-not-formula", "K34 得到的同一个模型", proofObject("modelExistence", completenessMetaModelNotFormula, [], [], { openScopes: [{ id: COMPLETENESS_META_SCOPE_ID, formula: completenessMetaNotDerivable }] }), "proof", 300, 355, "𝔐⊭A"),
        { id: "completeness-meta-imp-elim", type: "impElim", label: "代入这个模型", glyph: "→E", inputs: registry.impElim.inputs, out: registry.impElim.out, x: 300, y: 155, fixed: true, scopeBound: true, scopeId: COMPLETENESS_META_SCOPE_ID },
        { id: "completeness-meta-not-elim", type: "notElim", label: "同一模型中的冲突", glyph: "¬E", inputs: registry.notElim.inputs, out: registry.notElim.out, x: 525, y: 245, fixed: true, scopeBound: true, scopeId: COMPLETENESS_META_SCOPE_ID },
        raaDischargeNode("completeness-meta-raa", COMPLETENESS_META_SCOPE_ID, 715, 245),
        { ...goal("proof", 910, 245), id: "completeness-final-goal", label: "完备性结论", glyph: "T⊢A", slotBody: "接入解除外层反设后的结论" }
      ],
      scopeFrames: [{ id: COMPLETENESS_META_SCOPE_ID, label: "外层反设：T⊬A", x: 5, y: 35, width: 875, height: 430, discharge: true, boundaryLabel: "RAA", boundaryCopy: "反模型不可能存在，因此解除 T⊬A" }],
      hint: "先用 →E 从 T⊨A 与 𝔐⊨T 得到 𝔐⊨A；再把它和同一模型的 𝔐⊭A 接入 ¬E；最后用 RAA 解除 T⊬A。",
      definition: ["一阶逻辑完备性定理", `<p>反设 <code>T⊬A</code> 后，前两关依次得到：</p><code>S=T∪{¬A}<br>S 相容<br>存在 𝔐，𝔐⊨T 且 𝔐⊭A</code><p>但 <code>T⊨A</code> 要求每个满足 T 的模型都满足 A，所以这个 𝔐 又必须满足 A，矛盾。解除反设便得到：</p><code>T⊨A ⇒ T⊢A</code>`],
      unlock: "一阶逻辑完备性定理",
      completionLesson: `<span class="eyebrow">一阶逻辑完备性</span><h3>所有语义上必然成立的推论，都能被证明系统推出</h3><code>T⊨A　⇒　T⊢A</code><p class="layer-note">可靠性已经给出反方向 T⊢A⇒T⊨A。因此，对这门一阶逻辑而言：T⊢A ⇔ T⊨A。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "raa" && equalFormula(value.conclusion, completenessMetaDerivable) && (!value.openScopes || value.openScopes.length === 0) && proofUsesRule(value, "impElim") && proofUsesRule(value, "notElim")
        ? pass("语义后承排除了模型存在定理产生的反模型；外层反设已经解除，得到 T⊢A。")
        : fail("让 T⊨A 先作用于满足 T 的同一个模型，再把得到的 𝔐⊨A 与 𝔐⊭A 接成矛盾并解除反设。")
    },
    {
      id: "completeness-concrete-replay", branch: "completeness", requires: ["completeness-theorem"], next: "completeness-proof-assembly", chapter: "元理论 · 完备性Ⅷ", title: "沿着同一个见证推出矛盾",
      copy: "取一个具体理论 T={∃xP(x),∀x(P(x)→Q(x))}，目标 A=∃xQ(x)。反模型还必须满足 ¬A。请暂时给存在见证起名 y，让同一个见证经过全称规律，最后亲手推出矛盾。",
      goal: "从 ∃xP(x)、∀x(P(x)→Q(x))、¬∃xQ(x) 推出旗外的 ⊥。", tools: ["vary", "forallElim", "impElim", "existsIntro", "notElim"], proofViews: true, fitchView: true, runTarget: "concrete-replay-close", semanticWorkbench: "completeness-concrete-replay", toolScope: "concrete-replay-scope", artifacts: ["concrete-completeness-replay"],
      spawnPositions: [{ x: 185, y: 330 }, { x: 325, y: 255 }, { x: 480, y: 150 }, { x: 480, y: 280 }, { x: 325, y: 385 }],
      nodes: [
        fixed("concrete-replay-exists", "来自 T", proofObject("given", existentialP, [existentialP]), "proof", 20, 75, "∃xP(x)"),
        fixed("concrete-replay-law", "来自 T", proofObject("given", universalPImpQ, [universalPImpQ]), "proof", 20, 245, "∀x(P(x)→Q(x))"),
        fixed("concrete-replay-negated-goal", "反模型还必须满足", proofObject("given", F.not(existentialQ), [F.not(existentialQ)]), "proof", 20, 415, "¬∃xQ(x)"),
        existsFlagNode("concrete-replay-start", "concrete-replay-scope", 220, 75),
        existsElimNode("concrete-replay-close", "concrete-replay-scope", 480, 400)
      ],
      scopeFrames: [{ id: "concrete-replay-scope", flagKind: "existential", flagNode: "concrete-replay-start", label: "⚑ 暂称杯子见证为 □", x: 155, y: 25, width: 500, height: 465, discharge: true, boundaryLabel: "∃E", boundaryCopy: "⊥ 不含临时名字 y，可以带到旗外" }],
      openingLesson: ["追踪同一个存在见证", `<p><code>∃xP(x)</code> 只保证有一个 P 对象，并没有永久给它命名。打开存在旗后，我们在局部范围内暂称它为 y，于是得到 <code>P(y)</code>。</p><p>右侧杯盘图会跟随你的推导，但不会替你应用任何规则。</p>`],
      hint: "用 ∃xP(x) 和 y 打开存在旗；以同一个 y 对全称前提使用 ∀E，和 P(y) 一起经 →E 得到 Q(y)。用 ∃I 隐藏 y，再与 ¬∃xQ(x) 经 ¬E 得到 ⊥，最后关闭存在旗。",
      definition: ["具体理论中的不可能反模型", `<p>若存在这个反模型，它就必须同时满足：</p><code>∃xP(x)<br>∀x(P(x)→Q(x))<br>¬∃xQ(x)</code><p>存在见证先给出 P(y)，全称规律再给出 P(y)→Q(y)，所以同一个 y 必须满足 Q。把名字隐藏便得到 ∃xQ(x)，与反模型要求的 ¬∃xQ(x) 冲突。</p>`],
      unlock: "完备性证明的具体轮廓",
      completionLesson: `<span class="eyebrow">具体反模型无法存在</span><h3>临时名字消失了，矛盾仍然留下</h3><code>∃xP(x), ∀x(P(x)→Q(x)), ¬∃xQ(x) ⊢ ⊥</code><p class="layer-note">在这个具体例子里，T 已经能直接证明 A。一般的完备性证明不能预先知道这份证明；它从 T⊬A 出发，借助模型存在定理造出反模型，再由 T⊨A 排除它。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "existsElim" && value.conclusion.kind === "bottom" && value.flagName === "y"
        && proofUsesRule(value, "forallElim") && proofUsesRule(value, "impElim") && proofUsesRule(value, "existsIntro") && proofUsesRule(value, "notElim") && (!value.openScopes || value.openScopes.length === 0)
        ? pass("同一个见证经过全称规律产生 ∃xQ(x)，与 ¬∃xQ(x) 冲突；临时名字已经随存在旗关闭。")
        : fail("必须在同一面存在旗内依次使用 ∀E、→E、∃I、¬E，得到不含 y 的 ⊥，再用 ∃E 将它带出。")
    },
    {
      id: "completeness-proof-assembly", branch: "completeness", requires: ["completeness-concrete-replay"], next: null, chapter: "元理论 · 完备性Ⅷ", title: "把整座完备性证明接起来",
      copy: "现在回到任意理论 T 与任意句子 A。画布上的三块金色装置不是新规则，而是你在前面已经完成的施工成果。请让它们依次工作，再用熟悉的自然演绎规则关闭反设。",
      goal: "从 T⊨A 出发，解除 T⊬A，得到 T⊢A。", tools: [], proofViews: true, fitchView: true, runTarget: "assembly-raa", artifacts: ["completeness-proof-map"],
      nodes: [
        fixed("assembly-theory", "任意理论", abstractTheoryT, "context", 20, 70, "T", true),
        fixed("assembly-formula", "任意句子", schemaA, "formula", 20, 190, "A", true),
        { id: "assembly-request", type: "completenessRequestModule", label: "写出反模型要求", glyph: "K33", inputs: registry.completenessRequestModule.inputs, out: registry.completenessRequestModule.out, outLabel: registry.completenessRequestModule.outLabel, x: 190, y: 115, fixed: true, earnedModule: "K33", moduleContract: "T，A ↦ S=T∪{¬A}" },
        fixed("assembly-assumption", "外层反设", proofObject("assumption", completenessMetaNotDerivable, [], [], { openScopes: [{ id: COMPLETENESS_META_SCOPE_ID, formula: completenessMetaNotDerivable }] }), "proof", 190, 330, "T⊬A"),
        { id: "assembly-consistency", type: "completenessConsistencyModule", label: "保护 S 的相容性", glyph: "K34", inputs: registry.completenessConsistencyModule.inputs, out: registry.completenessConsistencyModule.out, outLabel: registry.completenessConsistencyModule.outLabel, x: 385, y: 165, fixed: true, earnedModule: "K34", moduleContract: "T⊬A，S ↦ S 相容" },
        { id: "assembly-model", type: "completenessModelModule", label: "让相容理论产生模型", glyph: "模型存在", inputs: registry.completenessModelModule.inputs, out: registry.completenessModelModule.out, outLabel: registry.completenessModelModule.outLabel, x: 590, y: 165, fixed: true, earnedModule: "K31", moduleContract: "S，S 相容 ↦ 𝔐⊨T 且 𝔐⊭A" },
        { id: "assembly-model-t", type: "andElim1", label: "取出模型满足 T", glyph: "∧E₁", inputs: registry.andElim1.inputs, out: registry.andElim1.out, x: 790, y: 80, fixed: true, scopeBound: true, scopeId: COMPLETENESS_META_SCOPE_ID },
        { id: "assembly-model-not-a", type: "andElim2", label: "取出模型不满足 A", glyph: "∧E₂", inputs: registry.andElim2.inputs, out: registry.andElim2.out, x: 790, y: 275, fixed: true, scopeBound: true, scopeId: COMPLETENESS_META_SCOPE_ID },
        fixed("assembly-entailment", "题设在这个模型上的含义", proofObject("entailmentInstance", completenessMetaEntailmentInstance), "proof", 385, 375, "(𝔐⊨T)→(𝔐⊨A)"),
        { id: "assembly-model-a", type: "impElim", label: "题设作用于这个模型", glyph: "→E", inputs: registry.impElim.inputs, out: registry.impElim.out, x: 975, y: 80, fixed: true, scopeBound: true, scopeId: COMPLETENESS_META_SCOPE_ID },
        { id: "assembly-conflict", type: "notElim", label: "同一模型中的冲突", glyph: "¬E", inputs: registry.notElim.inputs, out: registry.notElim.out, x: 975, y: 260, fixed: true, scopeBound: true, scopeId: COMPLETENESS_META_SCOPE_ID },
        { ...raaDischargeNode("assembly-raa", COMPLETENESS_META_SCOPE_ID, 975, 390), metaConclusion: completenessMetaDerivable }
      ],
      scopeFrames: [{ id: COMPLETENESS_META_SCOPE_ID, label: "反设：T⊬A", x: 5, y: 30, width: 1135, height: 475, discharge: true, boundaryLabel: "RAA", boundaryCopy: "反模型与 T⊨A 冲突，解除反设并得到 T⊢A" }],
      hint: "先用 K33 写出 S；让 K34 从 T⊬A 与 S 得到相容性；再把同一个 S 和相容性送入模型存在定理。取出模型的两项性质后，让 T⊨A 作用于它，接出矛盾并用 RAA 收束。",
      definition: ["完备性证明的整条动力链", `<p>这条证明的关键不是某一步神奇推理，而是三次转换：</p><code>T⊬A<br>⇒ S=T∪{¬A} 相容<br>⇒ 存在 𝔐，𝔐⊨T 且 𝔐⊭A<br>⇒ 与 T⊨A 矛盾</code><p>K33 写下反模型必须满足的要求；K34 证明这组要求在反设下相容；模型存在定理把语法相容性变成真实世界。最后的自然演绎只负责把冲突关闭。</p>`],
      unlock: "完整的一阶逻辑完备性证明图",
      completionLesson: `<span class="eyebrow">完整证明已经由你重新接通</span><h3>可证明与在所有模型中成立，终于重合</h3><code>T⊨A　⇔　T⊢A</code><p class="layer-note">可靠性给出从证明到模型；完备性用相容理论的模型存在性走回证明。</p>`,
      validate: ({ value }) => value && value.kind === "proof" && value.rule === "raa" && equalFormula(value.conclusion, completenessMetaDerivable) && (!value.openScopes || value.openScopes.length === 0) && proofUsesRule(value, "modelExistence") && proofUsesRule(value, "andElim1") && proofUsesRule(value, "andElim2") && proofUsesRule(value, "impElim") && proofUsesRule(value, "notElim")
        ? pass("反模型要求、相容性、模型存在与最终反证已经接成一条完整证明。")
        : fail("沿着 K33 → K34 → 模型存在定理接线，再取出模型的两项性质并用自然演绎关闭反设。")
    }
  ];

  const levelCatalog = new Map(levels.map((level) => [level.id, level]));
  const mapGroups = [
    { title: "公共起点", detail: "两条路线共享", className: "common-route", ids: ["ignite-empty", "build-one"] },
    { title: "策梅洛路线", detail: "主干 · 推进结构章", className: "main-route", ids: ["z-build-two", "z-abstract-successor", "z-run-successor"] },
    { title: "冯·诺依曼路线", detail: "可选 · 并集与历史", className: "optional-route", ids: ["vn-build-two", "vn-wrap-two", "vn-build-three", "vn-abstract-successor", "vn-run-successor"] },
    { title: "结构基础", detail: "有限收集、有序对、关系与函数值", className: "shared-route", ids: ["build-three-set", "ordered-pair", "cartesian-product", "relation-subset", "build-function", "function-value-graph", "function-apply"] },
    { title: "集合论基础", detail: "可选 · 集合关系、有限大小与归纳集入口", className: "optional-route", ids: ["set-foundation-membership", "set-foundation-subset", "set-foundation-power", "set-foundation-injection", "set-foundation-surjection", "set-foundation-bijection", "set-foundation-inverse", "set-foundation-reverse-failures", "set-foundation-equinumerous", "set-foundation-pigeonhole", "set-foundation-finite-index", "set-foundation-finite-extension", "set-foundation-singleton-injection", "set-foundation-power-cardinality", "set-foundation-diagonal-subset", "set-foundation-vn-index", "set-foundation-inductive-entry"] },
    { title: "等价关系与商集", detail: "集合论基础支线 · 从关系性质到合并同类对象", className: "optional-route", ids: ["set-foundation-reflexive", "set-foundation-symmetric", "set-foundation-transitive", "set-foundation-equivalence", "set-foundation-equivalence-classes", "set-foundation-partition", "set-foundation-quotient-projection"] },
    { title: "函数与集合", detail: "集合论基础支线 · 像、原像、复合、无穷与可数集合", className: "optional-route", ids: ["set-foundation-function-image", "set-foundation-function-preimage", "set-foundation-function-composition", "set-foundation-function-identity", "set-foundation-natural-bijection", "set-foundation-countable-enumeration", "set-foundation-countable-doubling", "set-foundation-countable-two-copies"] },
    { title: "次序与良序", detail: "集合论基础支线 · 从偏序到自然数的小于", className: "optional-route", ids: ["set-foundation-antisymmetric", "set-foundation-partial-order", "set-foundation-minimal-least", "set-foundation-total-order", "set-foundation-strict-order", "set-foundation-well-order", "set-foundation-vn-less"] },
    { title: "有限序列", detail: "可选 · 投影、具体定义域与追加", className: "sequence-route", ids: ["sequence-empty", "sequence-one", "sequence-intersection", "sequence-project-first", "sequence-abstract-first", "sequence-concrete-domain", "sequence-append-three"] },
    { title: "逻辑主线", detail: "语言、语义与证明", className: "shared-route", ids: ["proposition-atom", "define-conjunction", "proposition-conjunction", "build-valuation", "apply-valuation", "evaluate-conjunction", "define-negation", "formula-negation", "define-disjunction", "formula-disjunction", "define-implication", "formula-implication", "formula-tautology", "formula-contradiction", "formula-context", "formula-schemas", "proof-rule-anatomy", "proof-imp-elim", "proof-apply-imp-elim", "proof-and-elim", "proof-apply-and-elim", "proof-and-intro", "proof-apply-and-intro", "proof-combine", "proof-scope-inside", "proof-imp-intro-forge", "proof-imp-intro-retain", "proof-scope-theorem", "proof-not-elim-forge", "proof-not-elim-apply", "proof-bottom-implication", "proof-bottom-elim-forge", "proof-bottom-elim-apply", "proof-not-intro-inside", "proof-not-intro-forge", "proof-not-intro-apply", "proof-or-intro-forge", "proof-or-intro-apply", "proof-or-cases-concrete", "proof-or-elim-forge", "proof-or-elim-apply", "proof-or-swap-theorem", "formula-double-negation", "proof-raa-inside", "proof-raa-forge", "proof-raa-apply", "logic-system-overview", "predicate-arity", "first-order-signature", "predicate-atom", "relation-atom", "open-formula", "forall-binding", "forall-scope", "partial-binding", "close-relation-sentence", "exists-binding", "semantics-bridge", "model-domain", "interpret-predicate", "interpret-relation", "assemble-model", "build-variable-assignment", "read-variable-value", "satisfy-predicate-atom", "satisfy-relation-atom", "update-assignment", "open-formula-varies", "check-every-object", "forall-semantics", "exists-semantics", "free-variable-survives", "sentence-independence", "build-satisfying-model", "substitute-all-free", "capture-experiment", "fresh-alpha-renaming", "capture-free-substitution", "forge-formula-substitution", "apply-formula-substitution", "forge-forall-elim", "forge-exists-intro", "counterexample-arbitrary-name", "forge-forall-flag", "apply-forall-flag", "counterexample-fixed-witness", "forge-exists-flag", "apply-quantifier-rules"] },
    { title: "命题模态逻辑", detail: "可选 · 世界、模态推理与关系条件", className: "optional-route", ids: ["modal-formula-formation", "modal-world-valuations", "modal-accessibility", "modal-define-box", "modal-define-diamond", "modal-whole-subformula", "modal-nested-worlds", "modal-proof-worlds", "modal-forge-box-elim", "modal-apply-box-elim", "modal-counterexample-local", "modal-forge-box-intro", "modal-prove-k", "modal-forge-diamond-intro", "modal-apply-diamond-intro", "modal-forge-diamond-elim", "modal-diamond-transfer", "modal-separate-witnesses", "modal-counterexample-t", "modal-reflexive-extension", "modal-prove-t"] },
    { title: "变量与绑定", detail: "可选 · 合同引理", className: "hygiene-route", ids: ["coincidence-example", "coincidence-lemma"] },
    { title: "归纳方法", detail: "可选 · 从自然数单链到语法树", className: "induction-route", ids: ["induction-concrete-chain", "induction-step-template", "induction-hypothesis-scope", "induction-two-parts", "induction-arbitrary-history", "induction-branching-structure", "induction-syntax-bridge", "induction-formula-finiteness"] },
    { title: "结构递归", detail: "可选 · 沿语法树产生对象与真值", className: "recursion-route", ids: ["recursion-value-flow", "recursion-term-clauses", "recursion-formula-clauses"] },
    { title: "可靠性", detail: "元理论 · 从局部保真到整棵证明", className: "soundness-route", ids: ["soundness-local-step", "soundness-all-valuations", "soundness-or-cases", "soundness-flags", "soundness-proof-tree", "soundness-proof-height", "soundness-structural-proof", "soundness-general-induction", "soundness-overview"] },
    { title: "反模型与相容性", detail: "元理论 · 用模型限制可证明性", className: "countermodel-route", ids: ["countermodel-blocks-proof", "model-proves-consistency", "satisfiability-consistency-overview"] },
    { title: "完备性 · Henkin 与项模型", detail: "元理论 · 从相容扩张到语义完备性", className: "completeness-route", ids: ["completeness-consistent-start", "completeness-sentence-enumeration", "completeness-concrete-decision", "completeness-safe-side", "completeness-decision-chain", "completeness-unnamed-witness", "completeness-register-witness-name", "completeness-fresh-name-renaming", "completeness-add-witness", "completeness-witness-consistency", "completeness-interleaved-chain", "completeness-limit-union", "completeness-deductive-closure", "completeness-closed-terms", "completeness-provable-equality", "completeness-equivalence-class", "completeness-term-quotient", "completeness-function-congruence", "completeness-predicate-congruence", "completeness-assemble-term-model", "completeness-term-evaluation", "completeness-atomic-truth", "completeness-conjunction-truth", "completeness-negation-truth", "completeness-disjunction-truth", "completeness-implication-truth", "completeness-quantifier-duality", "completeness-quantifier-truth", "completeness-truth-induction", "completeness-model-existence", "completeness-language-reduct", "completeness-model-existence-summary", "completeness-countermodel-theory", "completeness-countermodel-consistency", "completeness-theorem", "completeness-concrete-replay", "completeness-proof-assembly"] }
  ];
  const logicMapGroup = mapGroups.find((group) => group.title === "逻辑主线");
  logicMapGroup.ids.splice(logicMapGroup.ids.indexOf("forge-exists-intro"), 0, "apply-forall-elim");
  logicMapGroup.ids.splice(logicMapGroup.ids.indexOf("counterexample-arbitrary-name"), 0, "apply-exists-intro");
  logicMapGroup.ids.push("term-symbol-signature", "build-function-term", "nest-function-term", "term-inside-atom", "interpret-term-symbols", "evaluate-function-term", "first-order-system-overview", "equality-diagonal", "equality-formula", "equality-evaluation", "forge-equality-intro", "forge-equality-elim", "apply-equality-elim", "sentence-filters-models", "collect-first-theory", "build-theory-model", "theory-conflict", "theory-semantic-consequence", "theory-syntactic-consequence");
  function mapTopic(route, id, title, glyph, startId, endId = null) {
    const group = mapGroups.find((item) => item.title === route);
    const start = group ? group.ids.indexOf(startId) : -1;
    const end = endId && group ? group.ids.indexOf(endId) : (group ? group.ids.length : -1);
    if (!group || start < 0 || end < 0 || end <= start) throw new Error(`地图主题 ${title} 的范围无效。`);
    return { route, id, title, glyph, ids: group.ids.slice(start, end), anchor: startId };
  }
  const mapTopics = [
    mapTopic("公共起点", "origin", "从空集得到第一个对象", "∅", "ignite-empty"),
    mapTopic("策梅洛路线", "zermelo-numbers", "策梅洛自然数与后继", "S", "z-build-two"),
    mapTopic("冯·诺依曼路线", "von-neumann-numbers", "冯·诺依曼自然数与并集", "⋃", "vn-build-two"),
    mapTopic("结构基础", "finite-collection", "有限集合的装配", "{·}", "build-three-set", "ordered-pair"),
    mapTopic("结构基础", "pairs-relations", "有序对、笛卡尔积与关系", "⟨,⟩", "ordered-pair", "build-function"),
    mapTopic("结构基础", "functions", "函数图与函数应用", "↦", "build-function"),
    mapTopic("集合论基础", "membership-power", "成员、子集与幂集", "∈", "set-foundation-membership", "set-foundation-injection"),
    mapTopic("集合论基础", "finite-maps", "单射、满射、双射与逆函数", "↔", "set-foundation-injection", "set-foundation-equinumerous"),
    mapTopic("集合论基础", "finite-cardinality", "等势、有限鸽巢与有限集", "≈", "set-foundation-equinumerous", "set-foundation-singleton-injection"),
    mapTopic("集合论基础", "power-diagonal", "幂集、有限基数与对角构造", "𝒫", "set-foundation-singleton-injection", "set-foundation-vn-index"),
    mapTopic("集合论基础", "finite-ordinals", "有限序数与归纳集入口", "ω", "set-foundation-vn-index"),
    mapTopic("等价关系与商集", "relation-properties", "自反、对称、传递与等价关系", "∼", "set-foundation-reflexive", "set-foundation-equivalence-classes"),
    mapTopic("等价关系与商集", "quotient-sets", "等价类、划分与商集", "[x]", "set-foundation-equivalence-classes"),
    mapTopic("函数与集合", "images-preimages", "收集函数值与寻找全部输入", "q[U]", "set-foundation-function-image", "set-foundation-function-composition"),
    mapTopic("函数与集合", "composition-identity", "连接函数与恢复原对象", "∘", "set-foundation-function-composition", "set-foundation-natural-bijection"),
    mapTopic("函数与集合", "natural-infinity", "删去 0，仍与全部自然数等势", "ℕ", "set-foundation-natural-bijection", "set-foundation-countable-enumeration"),
    mapTopic("函数与集合", "countable-enumeration", "给不断生成的对象逐个编号", "↔", "set-foundation-countable-enumeration", "set-foundation-countable-doubling"),
    mapTopic("函数与集合", "countable-copies", "构造倍增，把两份对象编入一张表", "2n", "set-foundation-countable-doubling"),
    mapTopic("次序与良序", "partial-total-orders", "反对称、偏序、全序与严格次序", "≤", "set-foundation-antisymmetric", "set-foundation-well-order"),
    mapTopic("次序与良序", "well-orders", "良序与冯·诺依曼自然数", "<", "set-foundation-well-order"),
    mapTopic("有限序列", "sequence-encoding", "序列编码与第一投影", "π₁", "sequence-empty", "sequence-concrete-domain"),
    mapTopic("有限序列", "sequence-extension", "定义域与具体追加", "⌢", "sequence-concrete-domain"),
    mapTopic("逻辑主线", "propositions-conjunction", "命题、赋值与合取", "∧", "proposition-atom", "define-negation"),
    mapTopic("逻辑主线", "truth-functions", "否定、析取与蕴含", "→", "define-negation", "formula-tautology"),
    mapTopic("逻辑主线", "semantic-consequence", "重言式、矛盾式与语义后承", "⊨", "formula-tautology", "formula-schemas"),
    mapTopic("逻辑主线", "inference-anatomy", "公式模式、推理横线与语法后承", "⊢", "formula-schemas", "proof-and-elim"),
    mapTopic("逻辑主线", "and-imp-rules", "合取与蕴含的自然演绎", "→I", "proof-and-elim", "proof-not-elim-forge"),
    mapTopic("逻辑主线", "negation-bottom", "否定、矛盾与爆炸原理", "⊥", "proof-not-elim-forge", "proof-or-intro-forge"),
    mapTopic("逻辑主线", "disjunction-cases", "析取与分类讨论", "∨", "proof-or-intro-forge", "formula-double-negation"),
    mapTopic("逻辑主线", "classical-logic", "双重否定、反证法与经典逻辑", "¬¬", "formula-double-negation", "predicate-arity"),
    mapTopic("逻辑主线", "first-order-syntax", "项、谓词、自由变量与量词", "∀", "predicate-arity", "semantics-bridge"),
    mapTopic("逻辑主线", "models-semantics", "模型、解释、赋值与满足", "𝔐", "semantics-bridge", "substitute-all-free"),
    mapTopic("逻辑主线", "substitution", "公式代入、易字与变量捕获", "[t/x]", "substitute-all-free", "forge-forall-elim"),
    mapTopic("逻辑主线", "quantifier-rules", "全称、存在与两种 Flag", "∀∃", "forge-forall-elim", "term-symbol-signature"),
    mapTopic("逻辑主线", "terms-functions", "函数符号、复合项与项求值", "f", "term-symbol-signature", "equality-diagonal"),
    mapTopic("逻辑主线", "equality", "等号的语义与推理规则", "=", "equality-diagonal", "sentence-filters-models"),
    mapTopic("逻辑主线", "theories", "理论、模型与两种后承", "T", "sentence-filters-models"),
    mapTopic("命题模态逻辑", "modal-syntax", "先定义并构造模态公式", "□A", "modal-formula-formation", "modal-world-valuations"),
    mapTopic("命题模态逻辑", "modal-worlds", "构造世界赋值与可达关系", "W", "modal-world-valuations", "modal-define-box"),
    mapTopic("命题模态逻辑", "modal-operators", "定义必然与可能", "□◇", "modal-define-box", "modal-whole-subformula"),
    mapTopic("命题模态逻辑", "modal-formulas", "复合公式与两次世界变化", "□◇P", "modal-whole-subformula", "modal-proof-worlds"),
    mapTopic("命题模态逻辑", "modal-proof", "世界中的推理与必然消去", "□E", "modal-proof-worlds", "modal-counterexample-local"),
    mapTopic("命题模态逻辑", "modal-intro", "任意可达世界与定理 K", "□I", "modal-counterexample-local", "modal-forge-diamond-intro"),
    mapTopic("命题模态逻辑", "modal-diamond-rules", "可能引入与临时见证范围", "◇E", "modal-forge-diamond-intro", "modal-diamond-transfer"),
    mapTopic("命题模态逻辑", "modal-diamond-results", "传递可能性与区分见证", "◇", "modal-diamond-transfer", "modal-counterexample-t"),
    mapTopic("命题模态逻辑", "modal-reflexive-t", "自反关系与系统 T", "T", "modal-counterexample-t"),
    mapTopic("变量与绑定", "coincidence", "赋值合同与无关变量", "≡", "coincidence-example"),
    mapTopic("归纳方法", "natural-induction", "自然数归纳的共同模板", "n+1", "induction-concrete-chain", "induction-branching-structure"),
    mapTopic("归纳方法", "structural-induction", "分叉结构与语法树归纳", "𝒯", "induction-branching-structure"),
    mapTopic("结构递归", "structural-recursion", "沿结构产生对象与真值", "F", "recursion-value-flow"),
    mapTopic("可靠性", "local-soundness", "规则的局部保真", "⊨", "soundness-local-step", "soundness-proof-tree"),
    mapTopic("可靠性", "proof-induction", "沿证明高度传递真", "h", "soundness-proof-tree", "soundness-overview"),
    mapTopic("可靠性", "soundness-theorem", "从可证明到语义后承", "⊢⇒⊨", "soundness-overview"),
    mapTopic("反模型与相容性", "countermodels", "反模型、可满足与相容", "𝔐⊭", "countermodel-blocks-proof"),
    mapTopic("完备性 · Henkin 与项模型", "consistent-start", "反模型要求与句子枚举", "¬A", "completeness-consistent-start", "completeness-concrete-decision"),
    mapTopic("完备性 · Henkin 与项模型", "maximal-consistency", "逐句扩张相容理论", "H", "completeness-concrete-decision", "completeness-unnamed-witness"),
    mapTopic("完备性 · Henkin 与项模型", "henkin-witnesses", "语言膨胀与 Henkin 见证", "d", "completeness-unnamed-witness", "completeness-limit-union"),
    mapTopic("完备性 · Henkin 与项模型", "henkin-limit", "极大一致 Henkin 集", "H*", "completeness-limit-union", "completeness-closed-terms"),
    mapTopic("完备性 · Henkin 与项模型", "term-model", "闭项、等价类与项模型", "[t]", "completeness-closed-terms", "completeness-conjunction-truth"),
    mapTopic("完备性 · Henkin 与项模型", "truth-lemma", "真值引理的结构归纳", "𝔐ᴴ", "completeness-conjunction-truth", "completeness-model-existence"),
    mapTopic("完备性 · Henkin 与项模型", "model-existence", "模型存在定理与语言还原", "∃𝔐", "completeness-model-existence", "completeness-countermodel-theory"),
    mapTopic("完备性 · Henkin 与项模型", "completeness-final", "反模型施工与完备性定理", "⊨⇒⊢", "completeness-countermodel-theory")
  ];
  const futureMapGroups = [
    { title: "高级序列理论", detail: "等待逻辑语言与分离能力", className: "future-route", nodes: ["定义域存在性", "通用 Dom", "通用 Append", "唯一分解", "序列连接"] },
    { title: "数值递归", detail: "后续 PA 路线 · 与有限序列交汇", className: "future-route", nodes: ["构造历史的序列编码", "有限迭代", "通用递归器", "加法", "递归唯一性"] },
    { title: "良基递归", detail: "后续 ZFC 路线 · 证明递归函数作为集合存在且唯一", className: "future-route", nodes: ["按层构造部分函数", "相容合并", "良基递归定理", "递归存在与唯一性"] },
    { title: "等价的归纳原理", detail: "后续开放", className: "future-route", nodes: ["强归纳法", "最小反例法", "自然数良序原理", "等价性桥梁"] }
  ];

  if (levelCatalog.size !== levels.length) throw new Error("关卡 ID 必须唯一。");
  levels.forEach((level) => {
    [...(level.requires || []), level.next, level.alternateNext].filter(Boolean).forEach((id) => {
      if (!levelCatalog.has(id)) throw new Error(`关卡 ${level.id} 引用了不存在的关卡 ${id}。`);
    });
  });
  const mappedIds = mapGroups.flatMap((group) => group.ids);
  if (mappedIds.length !== levels.length || new Set(mappedIds).size !== levels.length) throw new Error("关卡地图必须恰好包含每个关卡一次。");
  const topicIds = mapTopics.flatMap((topic) => topic.ids);
  if (topicIds.length !== levels.length || new Set(topicIds).size !== levels.length) throw new Error("知识主题必须恰好覆盖每个关卡一次。");

  function readProgress() {
    try {
      const v20Save = localStorage.getItem("logic-foundry-progress-v20");
      const v19Save = localStorage.getItem("logic-foundry-progress-v19");
      const v18Save = localStorage.getItem("logic-foundry-progress-v18");
      const v17Save = localStorage.getItem("logic-foundry-progress-v17");
      const v16Save = localStorage.getItem("logic-foundry-progress-v16");
      const v15Save = localStorage.getItem("logic-foundry-progress-v15");
      const v14Save = localStorage.getItem("logic-foundry-progress-v14");
      const currentSave = v20Save || v19Save || v18Save || v17Save || v16Save || v15Save || v14Save;
      const v13Save = localStorage.getItem("logic-foundry-progress-v13");
      const v12Save = localStorage.getItem("logic-foundry-progress-v12");
      const v11Save = localStorage.getItem("logic-foundry-progress-v11");
      const v10Save = localStorage.getItem("logic-foundry-progress-v10");
      const v9Save = localStorage.getItem("logic-foundry-progress-v9");
      const v8Save = localStorage.getItem("logic-foundry-progress-v8");
      const saved = JSON.parse(currentSave || v13Save || v12Save || v11Save || v10Save || v9Save || v8Save || localStorage.getItem("logic-foundry-progress-v7") || localStorage.getItem("logic-foundry-progress-v6") || localStorage.getItem("logic-foundry-progress-v5") || "{}");
      const rawCompleted = Array.isArray(saved.completedIds) ? saved.completedIds : [];
      let completed = Array.isArray(saved.completedIds) ? saved.completedIds.filter((id) => levelCatalog.has(id)) : [];
      const retiredSemanticIds = ["semantic-entailment", "semantic-counterexample"];
      const retiredProofIds = ["proof-premise", "proof-context-extension", "proof-imp-intro"];
      const retiredLogicIds = ["build-formula", "build-model", "countermodel", "first-proof", ...retiredSemanticIds, ...retiredProofIds];
      let currentLevelId = levelCatalog.has(saved.currentLevelId) ? saved.currentLevelId : "ignite-empty";
      if (saved.currentLevelId === "alpha-renaming") currentLevelId = "fresh-alpha-renaming";
      if (saved.currentLevelId === "substitute-free-only") currentLevelId = "capture-experiment";
      if (saved.currentLevelId === "interpret-second-predicate") currentLevelId = "interpret-relation";
      if (["recursion-local-uniqueness", "recursion-unary-uniqueness", "recursion-quantifier-uniqueness", "recursion-global-uniqueness", "recursion-subformulas"].includes(saved.currentLevelId)) currentLevelId = "soundness-local-step";
      const oldFirstOrderSyntaxIds = ["predicate-atom", "open-formula", "forall-binding", "forall-scope"];
      const needsFirstOrderSyntaxMigration = !v19Save && Boolean(v18Save) && (oldFirstOrderSyntaxIds.includes(saved.currentLevelId) || oldFirstOrderSyntaxIds.some((id) => rawCompleted.includes(id)));
      if (needsFirstOrderSyntaxMigration) {
        completed = completed.filter((id) => !oldFirstOrderSyntaxIds.includes(id));
        currentLevelId = completed.includes("logic-system-overview") ? "predicate-arity" : "logic-system-overview";
      }
      const redesignedProofIds = ["proof-imp-elim", "proof-and-elim", "proof-and-intro", "proof-context-extension", "proof-imp-intro"];
      const needsRuleForgeMigration = !v18Save && !v17Save && !v16Save && !v15Save && Boolean(v14Save) && (redesignedProofIds.includes(saved.currentLevelId) || redesignedProofIds.some((id) => rawCompleted.includes(id)));
      if (needsRuleForgeMigration) {
        completed = completed.filter((id) => !redesignedProofIds.includes(id));
        currentLevelId = completed.includes("formula-context") ? "formula-schemas" : "formula-context";
      }
      const ruleFrameIds = ["proof-imp-elim", "proof-and-elim", "proof-and-intro", "proof-combine", "proof-context-extension", "proof-imp-intro"];
      const needsRuleFrameMigration = !v18Save && !v17Save && !v16Save && Boolean(v15Save) && (ruleFrameIds.includes(saved.currentLevelId) || ruleFrameIds.some((id) => rawCompleted.includes(id)));
      if (needsRuleFrameMigration) {
        completed = completed.filter((id) => !ruleFrameIds.includes(id));
        currentLevelId = completed.includes("formula-schemas") ? "proof-rule-anatomy" : (completed.includes("formula-context") ? "formula-schemas" : "formula-context");
      }
      const ruleApplicationAnchors = [...ruleFrameIds, "predicate-atom", "open-formula", "forall-binding", "forall-scope"];
      const needsRuleApplicationMigration = !v18Save && !v17Save && Boolean(v16Save) && (ruleApplicationAnchors.includes(saved.currentLevelId) || ruleApplicationAnchors.some((id) => rawCompleted.includes(id)));
      if (needsRuleApplicationMigration) {
        currentLevelId = completed.includes("proof-imp-elim") ? "proof-apply-imp-elim" : (completed.includes("proof-rule-anatomy") ? "proof-imp-elim" : (completed.includes("formula-schemas") ? "proof-rule-anatomy" : "formula-schemas"));
      }
      const scopeRedesignAnchors = ["proof-context-extension", "proof-imp-intro", "predicate-atom", "open-formula", "forall-binding", "forall-scope"];
      const needsScopeRedesignMigration = !v18Save && Boolean(v17Save) && (scopeRedesignAnchors.includes(saved.currentLevelId) || scopeRedesignAnchors.some((id) => rawCompleted.includes(id)));
      if (needsScopeRedesignMigration) currentLevelId = completed.includes("proof-combine") ? "proof-scope-inside" : "proof-combine";
      if (retiredSemanticIds.includes(saved.currentLevelId)) currentLevelId = completed.includes("formula-context") ? "formula-schemas" : "formula-context";
      else if (retiredProofIds.includes(saved.currentLevelId)) currentLevelId = ["proof-context-extension", "proof-imp-intro"].includes(saved.currentLevelId) && completed.includes("proof-combine")
        ? "proof-scope-inside"
        : (completed.includes("formula-schemas") ? "proof-rule-anatomy" : (completed.includes("formula-context") ? "formula-schemas" : "formula-context"));
      else if (retiredLogicIds.includes(saved.currentLevelId)) currentLevelId = completed.includes("formula-contradiction") ? "formula-context" : (completed.includes("formula-implication") ? "formula-tautology" : (completed.includes("proposition-conjunction") ? "build-valuation" : "proposition-atom"));
      if (!needsRuleForgeMigration && !needsRuleFrameMigration && !needsRuleApplicationMigration && !needsScopeRedesignMigration && ["proof-and-elim", "proof-and-intro"].includes(saved.currentLevelId) && rawCompleted.includes("proof-premise") && !completed.includes("proof-imp-elim")) currentLevelId = "formula-schemas";
      if (!currentSave && saved.currentLevelId === "function-domain") currentLevelId = completed.includes("build-function") ? "function-value-graph" : "build-function";
      const retiredV8SequenceIds = ["sequence-append-two", "sequence-next-position", "sequence-abstract-append"];
      if (!currentSave && retiredV8SequenceIds.includes(saved.currentLevelId)) currentLevelId = completed.includes("sequence-one") ? "sequence-intersection" : "sequence-empty";
      const legacyBeforeV8 = !currentSave && !v13Save && !v12Save && !v11Save && !v10Save && !v9Save && !v8Save;
      const removedSequenceIds = ["sequence-encode", "sequence-extend", "sequence-decompose", "recursion-trace", "finite-recursor", "define-addition", "define-concat"];
      if (legacyBeforeV8 && removedSequenceIds.includes(saved.currentLevelId)) {
        currentLevelId = completed.includes("ordered-pair") ? "cartesian-product" : "ordered-pair";
      }
      const oldStructureIds = ["build-relation", "repair-function"];
      const unfinishedOldFormula = retiredLogicIds.includes(saved.currentLevelId) && !rawCompleted.includes(saved.currentLevelId);
      const unfinishedLegacySequence = ["sequence-empty", "sequence-one", "sequence-append-two", "sequence-next-position", "sequence-abstract-append"].includes(saved.currentLevelId) && !rawCompleted.includes(saved.currentLevelId);
      if (legacyBeforeV8 && (oldStructureIds.includes(saved.currentLevelId) || unfinishedOldFormula || unfinishedLegacySequence)) currentLevelId = completed.includes("ordered-pair") ? "cartesian-product" : "ordered-pair";
      if (legacyBeforeV8 && saved.currentLevelId === "induction-template") currentLevelId = completed.includes("build-formula") ? "formula-context" : (completed.includes("ordered-pair") ? "cartesian-product" : "ordered-pair");
      if (!currentSave && currentLevelId === "ordered-pair" && !completed.includes("ordered-pair")) currentLevelId = "build-three-set";
      if (!currentSave && currentLevelId === "function-apply" && !completed.includes("function-apply")) currentLevelId = "function-value-graph";
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
    formulaView: "construction", proofView: "construction", valuation: { P: true, Q: false }, modalWorld: "w₀", truthTableRows: new Map(), truthTableFormulaKey: null,
    surgeryToken: null, surgeryTarget: null, surgeryAction: null, surgeryRoutes: {}
  };
  let selectedMapLevelId = state.currentLevelId;
  const mapPan = { active: false, pointerId: null, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 };

  const tutorial = { step: 0, selected: null, slots: [null, null] };
  const unionTutorial = { step: 0, activated: false, context: "" };
  const intersectionTutorial = { activated: false };

  function pass(message, count = "全部检查通过") { return { ok: true, message, count }; }
  function fail(message) { return { ok: false, message, count: "检查未通过" }; }
  function currentLevel() { return levelCatalog.get(state.currentLevelId); }

  function completenessConsistencyProofReady(proof) {
    return Boolean(proof && proof.kind === "proof" && proof.rule === "notIntro"
      && equalFormula(proof.conclusion, F.not(completenessMetaInconsistent))
      && hasScopeDependency(proof, COMPLETENESS_META_SCOPE_ID, completenessMetaNotDerivable)
      && !(proof.openScopes || []).some((scope) => scope.id === "completeness-inconsistent-scope")
      && proofUsesRule(proof, "raa") && proofUsesRule(proof, "notElim"));
  }

  function currentNumeralSystem() {
    const branch = currentLevel() && currentLevel().branch;
    if (branch === "zermelo") return "zermelo";
    if (branch === "von-neumann" || branch === "finite-sequence" || (currentLevel() && (currentLevel().id === "set-foundation-natural-bijection" || currentLevel().naturalNumerals))) return "von-neumann";
    if (branch === "induction") return "zermelo";
    if (branch === "common") return "zermelo";
    return "none";
  }
  function prettyCurrentSet(value, depth = 0) { return prettySet(value, depth, currentNumeralSystem()); }
  function resolvedNext(level = currentLevel()) {
    if (level.id === "vn-run-successor") {
      return ["z-build-two", "z-abstract-successor", "z-run-successor"].find((id) => !state.completed.has(id)) || "build-three-set";
    }
    if (level.id === "proof-apply-imp-elim" && state.completed.has("proof-and-elim")) return "proof-apply-and-elim";
    if (level.id === "proof-apply-and-elim" && state.completed.has("proof-and-intro")) return "proof-apply-and-intro";
    if (level.id === "proof-apply-and-intro" && state.completed.has("proof-combine")) return "proof-scope-inside";
    return level.next;
  }
  function levelMarker(level) {
    const ids = (title) => mapGroups.find((group) => group.title === title).ids;
    if (level.branch === "common") return String(ids("公共起点").indexOf(level.id) + 1).padStart(2, "0");
    if (level.branch === "zermelo") return String(ids("策梅洛路线").indexOf(level.id) + 3).padStart(2, "0");
    if (level.branch === "von-neumann") return `V${ids("冯·诺依曼路线").indexOf(level.id) + 1}`;
    if (level.branch === "set-foundation") {
      const foundationIndex = ids("集合论基础").indexOf(level.id);
      if (foundationIndex >= 0) return `F${foundationIndex + 1}`;
      const equivalenceIndex = ids("等价关系与商集").indexOf(level.id);
      if (equivalenceIndex >= 0) return `E${equivalenceIndex + 1}`;
      const orderIndex = ids("次序与良序").indexOf(level.id);
      if (orderIndex >= 0) return `O${orderIndex + 1}`;
      const functionIndex = ids("函数与集合").indexOf(level.id);
      if (functionIndex >= 0) return `M${functionIndex + 1}`;
    }
    if (level.branch === "modal") return `L${ids("命题模态逻辑").indexOf(level.id) + 1}`;
    if (level.branch === "finite-sequence") return `S${ids("有限序列").indexOf(level.id) + 1}`;
    if (level.branch === "variable-hygiene") return `H${ids("变量与绑定").indexOf(level.id) + 1}`;
    if (level.branch === "induction") return `I${ids("归纳方法").indexOf(level.id) + 1}`;
    if (level.branch === "recursion") return `D${ids("结构递归").indexOf(level.id) + 1}`;
    if (level.branch === "soundness") return `R${ids("可靠性").indexOf(level.id) + 1}`;
    if (level.branch === "countermodel") return `C${ids("反模型与相容性").indexOf(level.id) + 1}`;
    if (level.branch === "completeness") return `K${ids("完备性 · Henkin 与项模型").indexOf(level.id) + 1}`;
    const sharedIds = [...ids("结构基础"), ...ids("逻辑主线")];
    return String(sharedIds.indexOf(level.id) + 6).padStart(2, "0");
  }
  function isAvailable(levelOrId) {
    const level = typeof levelOrId === "string" ? levelCatalog.get(levelOrId) : levelOrId;
    return Boolean(level) && (level.requires || []).every((id) => state.completed.has(id));
  }
  function saveProgress() {
    localStorage.setItem("logic-foundry-progress-v20", JSON.stringify({ completedIds: [...state.completed], currentLevelId: state.currentLevelId }));
  }

  function init() {
    loadLevel(isAvailable(state.currentLevelId) || state.completed.has(state.currentLevelId) ? state.currentLevelId : "ignite-empty");
    $("#runButton").addEventListener("click", run);
    $("#hintButton").addEventListener("click", showHint);
    $("#definitionButton").addEventListener("click", showDefinition);
    $("#definitionDialog .dialog-close").addEventListener("click", () => $("#definitionDialog").close());
    $("#nextButton").addEventListener("click", nextLevel);
    $("#alternateNextButton").addEventListener("click", alternateNextLevel);
    $("#mapButton").addEventListener("click", openMap);
    $("#mapCloseButton").addEventListener("click", closeMap);
    $("#mapLocateButton").addEventListener("click", () => locateCurrentMapLevel(true));
    $("#mapScroll").addEventListener("pointerdown", startMapPan);
    $("#mapScroll").addEventListener("pointermove", moveMapPan);
    $("#mapScroll").addEventListener("pointerup", finishMapPan);
    $("#mapScroll").addEventListener("pointercancel", finishMapPan);
    $("#soundToggle").addEventListener("click", toggleSound);
    $("#displayModeToggle").addEventListener("click", toggleDisplayMode);
    $("#displayCoachmarkClose").addEventListener("click", () => finishDisplayCoachmark(true));
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
    document.querySelectorAll("[data-proof-view]").forEach((button) => button.addEventListener("click", () => setProofView(button.dataset.proofView)));
    document.querySelectorAll("[data-valuation-prop]").forEach((button) => button.addEventListener("click", () => toggleValuation(button.dataset.valuationProp)));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !$("#mapPage").hidden) closeMap();
    });
    window.addEventListener("resize", () => { fitFixedNodes(); renderCanvas(); positionDisplayCoachmark(); });
    updateDisplayModeButton();
  }

  function renderRail() {
    if (!$("#mapPage").hidden) renderLevelMap();
  }

  function mapLaneFor(level) {
    const lanes = {
      common: 0, zermelo: 0, shared: 0, soundness: 0, countermodel: 0, completeness: 0,
      "von-neumann": -1, "set-foundation": -2, "variable-hygiene": -1,
      "finite-sequence": 1, induction: 1, recursion: 2
    };
    return lanes[level.branch] ?? 0;
  }

  function startMapPan(event) {
    if (event.button !== 0 || event.target.closest("button")) return;
    const scroller = $("#mapScroll");
    mapPan.active = true;
    mapPan.pointerId = event.pointerId;
    mapPan.startX = event.clientX;
    mapPan.startY = event.clientY;
    mapPan.scrollLeft = scroller.scrollLeft;
    mapPan.scrollTop = scroller.scrollTop;
    scroller.classList.add("panning");
    scroller.setPointerCapture(event.pointerId);
  }

  function moveMapPan(event) {
    if (!mapPan.active || event.pointerId !== mapPan.pointerId) return;
    const scroller = $("#mapScroll");
    scroller.scrollLeft = mapPan.scrollLeft - (event.clientX - mapPan.startX);
    scroller.scrollTop = mapPan.scrollTop - (event.clientY - mapPan.startY);
    event.preventDefault();
  }

  function finishMapPan(event) {
    if (!mapPan.active || event.pointerId !== mapPan.pointerId) return;
    const scroller = $("#mapScroll");
    mapPan.active = false;
    mapPan.pointerId = null;
    scroller.classList.remove("panning");
    if (scroller.hasPointerCapture(event.pointerId)) scroller.releasePointerCapture(event.pointerId);
  }

  function buildMapGraphLayout() {
    const rankById = new Map();
    const laneLastRank = new Map();
    const pending = [...levels];
    let guard = levels.length * 3;
    while (pending.length && guard-- > 0) {
      let progressed = false;
      for (let index = 0; index < pending.length;) {
        const level = pending[index];
        const requirements = level.requires || [];
        if (!requirements.every((id) => rankById.has(id))) { index += 1; continue; }
        const lane = mapLaneFor(level);
        const dependencyRank = requirements.length ? Math.max(...requirements.map((id) => rankById.get(id))) + 1 : 0;
        const rank = Math.max(dependencyRank, (laneLastRank.get(lane) ?? -1) + 1);
        rankById.set(level.id, rank);
        laneLastRank.set(lane, rank);
        pending.splice(index, 1);
        progressed = true;
      }
      if (!progressed) break;
    }
    if (pending.length) throw new Error("关卡树中存在无法排列的前置关系。");

    const graphWidth = 1940;
    const centerX = graphWidth / 2;
    const laneGap = 380;
    const nodeWidth = 230;
    const nodeHeight = 62;
    const rankGap = 104;
    const top = 120;
    const positions = new Map();
    levels.forEach((level) => {
      const lane = mapLaneFor(level);
      positions.set(level.id, {
        x: centerX + lane * laneGap - nodeWidth / 2,
        y: top + rankById.get(level.id) * rankGap,
        lane, rank: rankById.get(level.id)
      });
    });
    return { positions, graphWidth, nodeWidth, nodeHeight, rankGap, maxRank: Math.max(...rankById.values()) };
  }

  function renderLevelMap() {
    const map = $("#levelMap");
    const chapterNav = $("#mapChapterNav");
    const layout = buildMapGraphLayout();
    const futureTop = 190 + layout.maxRank * layout.rankGap;
    const graphHeight = futureTop + 560;
    map.className = "level-map map-graph";
    map.style.width = `${layout.graphWidth}px`;
    map.style.height = `${graphHeight}px`;
    map.innerHTML = `<svg class="map-tree-wires" viewBox="0 0 ${layout.graphWidth} ${graphHeight}" aria-hidden="true"></svg>`;
    chapterNav.innerHTML = `<span>路线</span>`;
    const wireLayer = map.querySelector(".map-tree-wires");
    levels.forEach((level) => {
      const target = layout.positions.get(level.id);
      (level.requires || []).forEach((requirementId) => {
        const source = layout.positions.get(requirementId);
        if (!source) return;
        const x1 = source.x + layout.nodeWidth / 2;
        const y1 = source.y + layout.nodeHeight;
        const x2 = target.x + layout.nodeWidth / 2;
        const y2 = target.y;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        if (source.lane === target.lane) {
          path.setAttribute("d", `M ${x1} ${y1} L ${x2} ${y2}`);
        } else {
          const direction = Math.sign(x2 - x1);
          const sourceGutter = x1 + direction * (layout.nodeWidth / 2 + 75);
          const radius = 12;
          const turnTop = y1 + 21;
          const turnBottom = y2 - 21;
          if (turnBottom - turnTop < radius * 2) {
            const trackY = (y1 + y2) / 2;
            path.setAttribute("d", `M ${x1} ${y1} L ${x1} ${trackY - radius} Q ${x1} ${trackY} ${x1 + direction * radius} ${trackY} L ${x2 - direction * radius} ${trackY} Q ${x2} ${trackY} ${x2} ${trackY + radius} L ${x2} ${y2}`);
          } else {
            path.setAttribute("d", `M ${x1} ${y1} L ${x1} ${turnTop - radius} Q ${x1} ${turnTop} ${x1 + direction * radius} ${turnTop} L ${sourceGutter - direction * radius} ${turnTop} Q ${sourceGutter} ${turnTop} ${sourceGutter} ${turnTop + radius} L ${sourceGutter} ${turnBottom - radius} Q ${sourceGutter} ${turnBottom} ${sourceGutter + direction * radius} ${turnBottom} L ${x2 - direction * radius} ${turnBottom} Q ${x2} ${turnBottom} ${x2} ${turnBottom + radius} L ${x2} ${y2}`);
          }
        }
        path.setAttribute("class", `map-tree-edge branch-${level.branch} ${state.completed.has(requirementId) && state.completed.has(level.id) ? "completed" : ""}`);
        path.dataset.from = requirementId;
        path.dataset.to = level.id;
        wireLayer.appendChild(path);
      });
    });

    levels.forEach((level) => {
      const position = layout.positions.get(level.id);
      const completed = state.completed.has(level.id);
      const available = isAvailable(level);
      const current = level.id === state.currentLevelId;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.levelId = level.id;
      button.dataset.branch = level.branch;
      button.style.left = `${position.x}px`;
      button.style.top = `${position.y}px`;
      button.className = `map-level ${completed ? "completed" : ""} ${available ? "available" : "locked"} ${current ? "current" : ""} ${level.id === selectedMapLevelId ? "selected" : ""}`;
      button.setAttribute("aria-disabled", String(!available && !completed && !current));
      button.innerHTML = `<i>${completed ? "✓" : escapeHtml(levelMarker(level))}</i><span><small>${escapeHtml(level.chapter)}</small><b>${escapeHtml(level.title)}</b></span>`;
      button.addEventListener("click", () => selectMapLevel(level.id));
      map.appendChild(button);
    });

    mapGroups.forEach((group) => {
      const topics = mapTopics.filter((topic) => topic.route === group.title);
      const routeCompleted = group.ids.filter((id) => state.completed.has(id)).length;
      const route = document.createElement("section");
      route.className = `map-nav-route ${group.ids.includes(state.currentLevelId) ? "current" : ""}`;
      const routeButton = document.createElement("button");
      routeButton.type = "button";
      routeButton.className = "map-nav-route-button";
      routeButton.innerHTML = `<span>${escapeHtml(group.title)}</span><i>${routeCompleted}/${group.ids.length}</i>`;
      routeButton.addEventListener("click", () => {
        const firstNode = map.querySelector(`[data-level-id="${group.ids[0]}"]`);
        if (firstNode) firstNode.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      });
      route.appendChild(routeButton);
      const topicList = document.createElement("div");
      topicList.className = "map-nav-topics";
      topics.forEach((topic) => {
        const topicCompleted = topic.ids.filter((id) => state.completed.has(id)).length;
        const topicDone = topicCompleted === topic.ids.length;
        const topicCurrent = topic.ids.includes(state.currentLevelId);
        const topicButton = document.createElement("button");
        topicButton.type = "button";
        topicButton.className = `map-nav-topic ${topicDone ? "completed" : ""} ${topicCurrent ? "current" : ""}`;
        topicButton.innerHTML = `<b>${escapeHtml(topic.glyph)}</b><span>${escapeHtml(topic.title)}</span><i>${topicDone ? "✓" : `${topicCompleted}/${topic.ids.length}`}</i>`;
        topicButton.addEventListener("click", () => {
          const firstIncomplete = topic.ids.find((id) => !state.completed.has(id));
          const targetId = firstIncomplete || topic.anchor;
          const targetNode = map.querySelector(`[data-level-id="${targetId}"]`);
          if (targetNode) targetNode.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        });
        topicList.appendChild(topicButton);

        const anchorPosition = layout.positions.get(topic.anchor);
        const landmark = document.createElement("div");
        const topicStarted = topicCompleted > 0;
        landmark.className = `map-topic-glyph ${topicDone ? "completed" : ""} ${topicStarted ? "started" : ""} ${topicCurrent ? "current" : ""}`;
        landmark.dataset.wide = String(Array.from(topic.glyph).length > 1);
        landmark.style.left = `${anchorPosition.lane >= 2 ? anchorPosition.x - 62 : anchorPosition.x + layout.nodeWidth + 14}px`;
        landmark.style.top = `${anchorPosition.y + 9}px`;
        landmark.textContent = topic.glyph;
        map.appendChild(landmark);
      });
      route.appendChild(topicList);
      chapterNav.appendChild(route);
    });

    const futureRoot = document.createElement("div");
    futureRoot.className = "map-future-root";
    futureRoot.style.left = `${layout.graphWidth / 2 - 105}px`;
    futureRoot.style.top = `${futureTop}px`;
    futureRoot.innerHTML = `<small>后续开放</small><b>未来理论分支</b>`;
    map.appendChild(futureRoot);
    futureMapGroups.forEach((group, index) => {
      const branchWidth = 270;
      const gap = 28;
      const totalWidth = futureMapGroups.length * branchWidth + (futureMapGroups.length - 1) * gap;
      const left = (layout.graphWidth - totalWidth) / 2 + index * (branchWidth + gap);
      const branch = document.createElement("section");
      branch.id = `map-future-${index}`;
      branch.className = "map-future-branch";
      branch.style.left = `${left}px`;
      branch.style.top = `${futureTop + 105}px`;
      branch.innerHTML = `<header><h3>${escapeHtml(group.title)}</h3><p>${escapeHtml(group.detail)}</p></header>`;
      group.nodes.forEach((title) => {
        const node = document.createElement("button");
        node.type = "button";
        node.className = "map-level future locked";
        node.disabled = true;
        node.innerHTML = `<i>◇</i><span><small>后续开放</small><b>${escapeHtml(title)}</b></span>`;
        branch.appendChild(node);
      });
      map.appendChild(branch);
      const branchCenter = left + branchWidth / 2;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M ${layout.graphWidth / 2} ${futureTop + 56} C ${layout.graphWidth / 2} ${futureTop + 82}, ${branchCenter} ${futureTop + 82}, ${branchCenter} ${futureTop + 105}`);
      path.setAttribute("class", "map-tree-edge future");
      wireLayer.appendChild(path);
    });
    renderMapLevelDetail(selectedMapLevelId);
    highlightMapEdges(selectedMapLevelId);
  }

  function highlightMapEdges(id) {
    document.querySelectorAll(".map-tree-edge.focused").forEach((edge) => edge.classList.remove("focused"));
    document.querySelectorAll(".map-tree-edge[data-from][data-to]").forEach((edge) => {
      if (edge.dataset.from === id || edge.dataset.to === id) edge.classList.add("focused");
    });
  }

  function selectMapLevel(id) {
    const level = levelCatalog.get(id);
    if (!level) return;
    selectedMapLevelId = id;
    document.querySelectorAll(".map-level.selected").forEach((node) => node.classList.remove("selected"));
    const selected = [...document.querySelectorAll(".map-level[data-level-id]")].find((node) => node.dataset.levelId === id);
    if (selected) selected.classList.add("selected");
    highlightMapEdges(id);
    renderMapLevelDetail(id);
  }

  function renderMapLevelDetail(id) {
    const level = levelCatalog.get(id);
    const detail = $("#mapLevelDetail");
    if (!level) {
      detail.innerHTML = `<span class="eyebrow">选择关卡</span><h3>查看关卡目标</h3><p>从树上选择一个关卡，查看它的位置和解锁条件。</p>`;
      return;
    }
    const completed = state.completed.has(id);
    const available = isAvailable(level);
    const current = id === state.currentLevelId;
    const status = current ? "当前关卡" : (completed ? "已完成" : (available ? "可以进入" : "尚未解锁"));
    const requirements = (level.requires || []).map((requirementId) => {
      const requirement = levelCatalog.get(requirementId);
      return `<li class="${state.completed.has(requirementId) ? "done" : ""}"><i>${state.completed.has(requirementId) ? "✓" : "○"}</i><span>${escapeHtml(levelMarker(requirement))} · ${escapeHtml(requirement.title)}</span></li>`;
    }).join("");
    detail.innerHTML = `
      <span class="map-detail-status ${completed ? "completed" : (available || current ? "available" : "locked")}">${status}</span>
      <small>${escapeHtml(levelMarker(level))} · ${escapeHtml(level.chapter)}</small>
      <h3>${escapeHtml(level.title)}</h3>
      <p>${escapeHtml(level.goal || level.copy || "")}</p>
      ${requirements ? `<div class="map-requirements"><b>前置关卡</b><ul>${requirements}</ul></div>` : `<div class="map-requirements root"><b>课程起点</b><p>不需要前置关卡。</p></div>`}
      <button id="mapEnterLevel" type="button" ${!available && !completed && !current ? "disabled" : ""}>${current ? "返回当前关卡" : (completed ? "重新进入" : "进入关卡")} <b>→</b></button>`;
    const enterButton = $("#mapEnterLevel");
    if (!enterButton.disabled) enterButton.addEventListener("click", () => {
      closeMap();
      loadLevel(id);
    });
  }

  function locateCurrentMapLevel(smooth = false, levelId = state.currentLevelId) {
    selectedMapLevelId = levelId;
    selectMapLevel(levelId);
    const current = [...document.querySelectorAll(".map-level[data-level-id]")].find((node) => node.dataset.levelId === levelId);
    if (current) current.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
  }

  function openMap(levelId = state.currentLevelId) {
    selectedMapLevelId = typeof levelId === "string" && levelCatalog.has(levelId) ? levelId : state.currentLevelId;
    const focusId = selectedMapLevelId;
    renderLevelMap();
    $("#mapPage").hidden = false;
    document.body.classList.add("map-page-open");
    $(".app-shell").setAttribute("aria-hidden", "true");
    requestAnimationFrame(() => {
      locateCurrentMapLevel(false, focusId);
      $("#mapCloseButton").focus();
    });
  }

  function closeMap() {
    $("#mapPage").hidden = true;
    document.body.classList.remove("map-page-open");
    $(".app-shell").removeAttribute("aria-hidden");
    $("#mapButton").focus();
  }

  function loadLevel(id) {
    const level = levelCatalog.get(id);
    if (!level || (!isAvailable(level) && !state.completed.has(id) && id !== state.currentLevelId)) return;
    hideDisplayCoachmark();
    document.body.classList.toggle("logic-overview-level", Boolean(level.overview));
    document.body.classList.toggle("semantic-workbench-level", Boolean(level.semanticWorkbench));
    document.body.classList.toggle("natural-bijection-level", level.semanticWorkbench === "natural-bijection");
    document.body.classList.toggle("modal-level", Boolean(level.modal));
    $("#ruleForgeBackdrop").setAttribute("aria-hidden", level.modal ? "false" : "true");
    document.body.classList.toggle("formula-surgery-level", Boolean(level.formulaSurgery));
    document.body.classList.toggle("witness-consistency-level", level.id === "completeness-witness-consistency");
    document.body.classList.toggle("completeness-finale-level", level.id === "completeness-theorem");
    document.body.classList.toggle("model-existence-theorem-level", Boolean(level.modelExistenceTheoremOverview));
    state.currentLevelId = id;
    state.formulaView = "construction";
    state.modalWorld = "w₀";
    state.proofView = "construction";
    state.truthTableRows = new Map();
    state.truthTableFormulaKey = null;
    state.surgeryToken = null;
    state.surgeryTarget = null;
    state.surgeryAction = null;
    state.surgeryRoutes = {};
    state.selectedOutput = null;
    state.connections = clone(level.initialConnections || []);
    state.nodes = level.nodes.map((node) => clone(node));
    $("#canvasWrap").classList.remove("dependency-packaged");
    fitFixedNodes();
    state.nextId = 1;
    saveProgress();
    $("#chapterLabel").textContent = level.chapter;
    $("#levelNumber").textContent = levelMarker(level);
    $("#levelTitle").textContent = level.title;
    $("#levelCopy").textContent = level.copy;
    $("#goalText").textContent = level.goal;
    $("#runButton span").textContent = level.formulaSurgery ? "检查变换" : (level.semanticLesson ? "继续" : (level.modelOverview ? "模型已经完整" : (level.semanticOverview ? "开始构造模型" : level.overview ? "继续下一章"
      : level.raaSchema ? "检验反证结构"
      : level.caseRuleSchema ? "检验分类结构"
      : level.caseTutorial ? "检查两种情况"
        : level.dependencyForge ? "检验封装"
          : level.scopeForge ? "检验解除规则"
            : level.scopeTutorial ? "检查子证明中结果"
              : level.ruleLayoutTutorial ? "检查横线"
                  : level.ruleForge ? "检验规则"
                  : level.scopeFrames ? "运行推导" : "运行构造")));
    $("#runButton b").textContent = level.overview ? "→" : "▶";
    if (level.modelExistenceTheoremOverview) $("#runButton span").textContent = "在完备性中使用";
    $("#consoleBody").innerHTML = `<span class="prompt">›</span><span class="console-message">${escapeHtml(level.semanticLesson ? "沿页面展开的路径阅读量词语义。" : (level.modelOverview ? "前面构造的论域和解释已经组成同一个模型。" : (level.semanticOverview ? "公式已经就绪；下一步为它构造一个世界。" : (level.firstOrderOverview ? "无等号一阶逻辑已经进入总装台。" : (level.soundnessOverview ? "可靠性定理已经进入总装台。" : (level.consistencyOverview ? "可满足与相容已经进入对照台。" : (level.overview ? "第一门完整逻辑已经进入总装台。" : (id === "ignite-empty" ? "系统准备完毕。把一个结果接入金色的目标节点。" : "新工作台已就绪。"))))))))}</span>`;
    if (level.completenessEnumerationOverview) $("#consoleBody").innerHTML = `<span class="prompt">›</span><span class="console-message">全部有限句子已经排入施工序列。</span>`;
    if (level.completenessMaximalHenkinOverview) $("#consoleBody").innerHTML = `<span class="prompt">›</span><span class="console-message">H 已汇集全部判定与闭项见证。</span>`;
    if (level.completenessNegationTruthOverview) $("#consoleBody").innerHTML = `<span class="prompt">›</span><span class="console-message">否定的两个方向已经展开。</span>`;
    if (level.completenessQuantifierTruthOverview) $("#consoleBody").innerHTML = `<span class="prompt">›</span><span class="console-message">存在与全称的两个方向已经展开。</span>`;
    if (level.completenessLanguageReductOverview) $("#consoleBody").innerHTML = `<span class="prompt">›</span><span class="console-message">辅助常元已略去；原语言句子的真假保持不变。</span>`;
    if (level.modelExistenceTheoremOverview) $("#consoleBody").innerHTML = `<span class="prompt">›</span><span class="console-message">Henkin 施工已经完整收束为模型存在定理。</span>`;
    const toolHint = level.toolHint || (id === "ignite-empty" ? "点击放入画布。先点输出端，再点输入端，即可接线。" : "");
    $(".tool-hint").textContent = toolHint;
    $(".tool-hint").hidden = !toolHint;
    $(".tool-section").hidden = !level.tools.length && !toolHint;
    $("#formulaViewTabs").hidden = !level.formulaViews;
    $("#proofViewTabs").hidden = !level.proofViews;
    document.querySelectorAll("[data-formula-view]").forEach((button) => {
      button.hidden = level.formulaViews && !(level.formulaViewOptions || ["construction", "syntax", "evaluation"]).includes(button.dataset.formulaView);
    });
    document.querySelectorAll("[data-proof-view]").forEach((button) => {
      button.hidden = button.dataset.proofView === "fitch" && !level.fitchView;
    });
    renderToolbox();
    renderCanvas();
    renderRail();
    const unionIntroLevel = id === "vn-build-three" || id === "build-three-set";
    if (id === "ignite-empty") setTimeout(() => {
      if (state.currentLevelId === id) openTutorial();
    }, 260);
    if (unionIntroLevel) setTimeout(() => {
      if (state.currentLevelId === id) openUnionTutorial();
    }, 260);
    if (id === "sequence-intersection") setTimeout(() => {
      if (state.currentLevelId === id) openIntersectionTutorial();
    }, 260);
    if (id === "sequence-project-first" && !localStorage.getItem("logic-foundry-display-coach-v1")) setTimeout(openDisplayCoachmark, 360);
    if (level.openingLesson) setTimeout(() => {
      if (state.currentLevelId !== id) return;
      const [title, body] = level.openingLesson;
      $("#definitionTitle").textContent = title;
      $("#definitionBody").innerHTML = body;
      if (!$("#definitionDialog").open) $("#definitionDialog").showModal();
    }, 260);
  }

  function fitFixedNodes() {
    const wrap = $("#canvasWrap");
    if (!wrap) return;
    const offset = canvasContentOffset();
    state.nodes.filter((node) => node.fixed).forEach((node) => {
      const maxX = Math.max(400, wrap.clientWidth - (node.dependencyForgeNode ? 255 : 175) - offset.x);
      const maxY = Math.max(node.dependencyForgeNode ? 300 : 330, wrap.clientHeight - (node.dependencyForgeNode ? 122 : 82) - offset.y);
      node.x = Math.min(node.x, maxX);
      node.y = Math.min(node.y, maxY);
    });
  }

  function canvasContentOffset() {
    const level = currentLevel();
    if (!level || level.formulaSurgery || level.overview) return { x: 0, y: 0 };
    return { x: 52, y: level.semanticWorkbench || level.id === "completeness-theorem" ? 22 : 68 };
  }

  function renderToolbox() {
    const box = $("#toolbox");
    box.innerHTML = "";
    if (!currentLevel().tools.length) return;
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
      inputs: registry[type].inputs, out: registry[type].out,
      scopeBound: Boolean(currentLevel().toolScope), scopeId: currentLevel().toolScope || undefined
    });
    renderCanvas();
    tone(330 + offset * 24, .035);
  }

  function safeSemanticValue(id = "goal") {
    try { return evaluateNode(id); } catch (_) { return null; }
  }

  function latestSemanticNodeValue(type) {
    const candidates = state.nodes.filter((node) => node.type === type).slice().reverse();
    for (const node of candidates) {
      try { return evaluateNode(node.id); } catch (_) { /* keep looking for the latest completed node */ }
    }
    return null;
  }

  function latestSemanticSetProgress() {
    const node = state.nodes.filter((item) => item.type === "set2").slice().reverse()[0];
    if (!node) return null;
    const members = [];
    (node.inputs || []).forEach((_, inputIndex) => {
      const link = state.connections.find((connection) => connection.to === node.id && connection.input === inputIndex);
      if (!link) return;
      try { members.push(evaluateNode(link.from)); } catch (_) { /* wait for this member to become complete */ }
    });
    return members.length ? set(...members) : null;
  }

  function constructedSemanticRelation() {
    const completed = [];
    state.nodes.filter((node) => node.type === "ord").forEach((node) => {
      try { completed.push(evaluateNode(node.id)); } catch (_) { /* an unfinished edge is not visible yet */ }
    });
    return set(...completed);
  }

  function semanticAssignmentValue(graph, variable) {
    if (!graph) return null;
    try { return applyFunction(graph, variable); } catch (_) { return null; }
  }

  function semanticPairParts(value) {
    if (!value) return null;
    try { return decodeOrderedPair(value); } catch (_) { return null; }
  }

  function semanticPairLabel(value) {
    const parts = semanticPairParts(value);
    return parts ? `⟨${prettyCurrentSet(parts[0])},${prettyCurrentSet(parts[1])}⟩` : "⟨?,?⟩";
  }

  function semanticRelationContains(relation, left, right) {
    return Array.isArray(relation) && relation.some((edge) => equal(edge, orderedPair(left, right)));
  }

  function semanticSetLabel(value) {
    if (!Array.isArray(value)) return "{?}";
    const simple = value.every((item) => typeof item === "string");
    if (simple) return `{${value.map(prettyCurrentSet).join(",")}}`;
    const pairs = value.map(semanticPairParts);
    return pairs.every(Boolean) ? `{${value.map(semanticPairLabel).join(",")}}` : "{…}";
  }

  function semanticDomainView(pExtension = null, active = []) {
    return `<div class="semantic-domain-view">
      <div class="semantic-object-card ${active.some((value) => equal(value, "a")) ? "active" : ""} ${pExtension && contains(pExtension, "a") ? "has-p" : ""}"><span>a</span>${pExtension && contains(pExtension, "a") ? "<b>P</b>" : ""}</div>
      <div class="semantic-object-card ${active.some((value) => equal(value, "b")) ? "active" : ""} ${pExtension && contains(pExtension, "b") ? "has-p" : ""}"><span>b</span>${pExtension && contains(pExtension, "b") ? "<b>P</b>" : ""}</div>
    </div>`;
  }

  function semanticAssignmentView(xValue, yValue, title = "变量赋值") {
    const row = (variable, value) => `<div class="semantic-assignment-row"><code>${variable}</code><i>→</i><b class="${value ? "resolved" : ""}">${value ? escapeHtml(prettyCurrentSet(value)) : "?"}</b></div>`;
    return `<section class="semantic-assignment-view"><small>${escapeHtml(title)}</small>${row("x", xValue)}${row("y", yValue)}</section>`;
  }

  function semanticRelationView(relation, currentPair = null) {
    const current = semanticPairParts(currentPair);
    const edge = (left, arrow, right) => {
      const present = semanticRelationContains(relation, left, right);
      const selected = current && equal(current[0], left) && equal(current[1], right);
      return `<div class="semantic-edge ${present ? "present" : ""} ${selected ? "selected" : ""}"><span>${left}</span><i>${arrow}</i><span>${right}</span><code>⟨${left},${right}⟩</code></div>`;
    };
    return `<div class="semantic-relation-view">
      <div class="semantic-relation-objects"><b>a</b><span>R 的有向边</span><b>b</b></div>
      <div class="semantic-edge-grid">${edge("a", "↺", "a")}${edge("a", "→", "b")}${edge("b", "→", "a")}${edge("b", "↻", "b")}</div>
    </div>`;
  }

  function semanticPathStatus(known, ok, success, failure) {
    return `<div class="semantic-path-status ${!known ? "waiting" : (ok ? "pass" : "fail")}"><i>${!known ? "○" : (ok ? "✓" : "×")}</i><span>${escapeHtml(!known ? "等待当前构造" : (ok ? success : failure))}</span></div>`;
  }

  function foundationMappingView(graph, domain, codomain) {
    const analysis = analyzeFiniteMap(graph || empty(), domain, codomain);
    const label = (value) => escapeHtml(prettyCurrentSet(value));
    const lanes = domain.map((source) => {
      const outputs = analysis.edges.filter(([first]) => equal(first, source)).map(([, second]) => second);
      const outputText = outputs.length ? outputs.map(label).join(" / ") : "?";
      return `<div class="foundation-map-lane ${outputs.length === 1 ? "ready" : (outputs.length > 1 ? "conflict" : "waiting")}"><b>${label(source)}</b><i>→</i><span>${outputText}</span></div>`;
    }).join("");
    const targets = codomain.map((target) => {
      const count = analysis.edges.filter(([, second]) => equal(second, target)).length;
      return `<div class="foundation-target ${count === 0 ? "empty" : (count === 1 ? "hit" : "collision")}"><b>${label(target)}</b><span>${count === 0 ? "空位" : (count === 1 ? "1 条边" : `${count} 条边相撞`)}</span></div>`;
    }).join("");
    return `<div class="foundation-map-view"><div class="foundation-map-lanes">${lanes}</div><div class="foundation-targets">${targets}</div></div>`;
  }

  function functionSetMemberView(value) {
    if (equal(value, quotientClassDishes)) return `<span class="function-class-object"><b>B</b><span class="function-class-members"><span>杯子</span><span>盘子</span></span></span>`;
    if (equal(value, quotientClassSpoon)) return `<span class="function-class-object"><b>C</b><span class="function-class-members"><span>勺子</span></span></span>`;
    return `<span class="function-set-member">${escapeHtml(prettyCurrentSet(value))}</span>`;
  }

  function functionSetBoundaryView(value) {
    return `<div class="function-set-boundary ${value === null ? "waiting" : ""}">${value === null ? `<span class="function-set-unknown">?</span>` : (Array.isArray(value) ? value.map(functionSetMemberView).join("") : functionSetMemberView(value))}</div>`;
  }

  function functionSetDiagram(sourceSet, targetSet, markerId) {
    const includes = (collection, value) => Array.isArray(collection) && contains(collection, value);
    const sourceRows = [[quotientCup, 31], [quotientPlate, 70], [quotientSpoon, 109]];
    const paths = [
      [quotientCup, quotientClassDishes, "M82 31 C115 31,130 50,164 50"],
      [quotientPlate, quotientClassDishes, "M82 70 C115 70,130 50,164 50"],
      [quotientSpoon, quotientClassSpoon, "M82 109 L164 109"]
    ].map(([source, target, path]) => `<path class="function-path ${includes(sourceSet, source) && includes(targetSet, target) ? "complete" : "given"}" d="${path}" marker-end="url(#${markerId})"></path>`).join("");
    const sources = sourceRows.map(([source, y]) => `<g class="function-object ${includes(sourceSet, source) ? "selected" : ""}"><rect x="10" y="${y - 14}" width="72" height="28" rx="14"></rect><text x="46" y="${y + 5}">${source}</text></g>`).join("");
    return `<svg class="function-set-diagram" viewBox="0 0 320 133" role="img" aria-label="杯子与盘子共同指向 B，勺子指向 C；高亮选定对象"><defs><marker id="${markerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z"></path></marker></defs>${paths}${sources}<g class="function-object function-class ${includes(targetSet, quotientClassDishes) ? "selected" : ""}"><rect x="174" y="18" width="134" height="63" rx="8"></rect><text class="class-name" x="241" y="36">B</text><rect class="class-member" x="181" y="45" width="58" height="26" rx="13"></rect><text x="210" y="63">杯子</text><rect class="class-member" x="243" y="45" width="58" height="26" rx="13"></rect><text x="272" y="63">盘子</text></g><g class="function-object function-class ${includes(targetSet, quotientClassSpoon) ? "selected" : ""}"><rect x="174" y="91" width="134" height="35" rx="8"></rect><text x="191" y="114">C</text><rect class="class-member" x="211" y="95" width="90" height="27" rx="13"></rect><text x="256" y="114">勺子</text></g></svg>`;
  }

  function functionSetCase(title, resultId, requested, preimage, markerId) {
    const result = safeSemanticValue(resultId);
    const expected = preimage
      ? set(...quotientDomain.filter((source) => contains(requested, applyFunction(quotientProjection, source))))
      : set(...requested.map((source) => applyFunction(quotientProjection, source)));
    const ready = result !== null && equal(result, expected);
    return `<article class="function-set-case ${ready ? "complete" : ""}"><h4>${escapeHtml(title)}</h4>${functionSetDiagram(preimage ? result : requested, preimage ? requested : result, markerId)}<div class="function-set-result"><small>${preimage ? "收集全部输入" : "收集全部函数值"}</small>${functionSetBoundaryView(result)}</div></article>`;
  }

  function constructedFunctionOn(domain) {
    return set(...constructedSemanticRelation().filter((edge) => {
      const parts = semanticPairParts(edge);
      return parts && contains(domain, parts[0]);
    }));
  }

  function functionCompositionDiagram(h) {
    const secondPaths = [[quotientClassDishes, "a", "M204 83 L257 83"], [quotientClassDishes, "b", "M204 83 L257 180"], [quotientClassSpoon, "a", "M204 180 L257 83"], [quotientClassSpoon, "b", "M204 180 L257 180"]]
      .filter(([source, target]) => semanticRelationContains(h, source, target))
      .map(([, , path]) => `<path class="function-path complete" d="${path}" marker-end="url(#function-composition-h-arrow)"></path>`).join("");
    return `<svg class="function-composition-diagram" viewBox="0 0 320 212" role="img" aria-label="先沿 q 到达等价类，再沿玩家构造的 h 到达最终对象"><defs><marker id="function-composition-q-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z"></path></marker><marker id="function-composition-h-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z"></path></marker></defs><text class="function-stage-name" x="105" y="22">q</text><text class="function-stage-name" x="231" y="22">h</text><path class="function-path given" d="M77 52 C95 52,99 83,117 83" marker-end="url(#function-composition-q-arrow)"></path><path class="function-path given" d="M77 115 C95 115,99 83,117 83" marker-end="url(#function-composition-q-arrow)"></path><path class="function-path given" d="M77 180 L117 180" marker-end="url(#function-composition-q-arrow)"></path>${secondPaths}${[["杯子",52],["盘子",115],["勺子",180]].map(([label,y]) => `<g class="function-object"><rect x="5" y="${y - 16}" width="72" height="32" rx="16"></rect><text x="41" y="${y + 5}">${label}</text></g>`).join("")}<g class="function-object"><rect x="126" y="53" width="78" height="60" rx="8"></rect><text x="165" y="75">B</text><text class="function-small-text" x="165" y="96">{杯子,盘子}</text></g><g class="function-object"><rect x="126" y="157" width="78" height="46" rx="8"></rect><text x="165" y="175">C</text><text class="function-small-text" x="165" y="193">{勺子}</text></g>${[["a",83],["b",180]].map(([label,y]) => `<g class="function-object"><rect x="266" y="${y - 16}" width="48" height="32" rx="16"></rect><text x="290" y="${y + 5}">${label}</text></g>`).join("")}</svg>`;
  }

  function functionDirectRows(graph, domain, expected) {
    return `<div class="function-direct-rows">${domain.map((source) => {
      const output = semanticAssignmentValue(graph, source);
      const target = applyFunction(expected, source);
      const ready = output !== null && equal(output, target);
      return `<article class="${ready ? "complete" : ""}"><b>${escapeHtml(prettyCurrentSet(source))}</b><i>→</i><b>${output === null ? "?" : escapeHtml(prettyCurrentSet(output))}</b></article>`;
    }).join("")}</div>`;
  }

  function functionRoundTripCase(title, graph, sources, first, firstLabel, secondLabel) {
    return `<article class="function-roundtrip-case"><h4>${escapeHtml(title)}</h4><div>${sources.map((source) => {
      const middle = applyFunction(first, source);
      const output = semanticAssignmentValue(graph, source);
      const ready = output !== null && equal(output, source);
      return `<div class="function-roundtrip-row ${ready ? "complete" : ""}"><b>${escapeHtml(prettyCurrentSet(source))}</b><span><small>${firstLabel}</small><i>→</i></span><b>${escapeHtml(prettyCurrentSet(middle))}</b><span><small>${secondLabel}</small><i>→</i></span><b>${output === null ? "?" : escapeHtml(prettyCurrentSet(output))}</b></div>`;
    }).join("")}</div></article>`;
  }

  function naturalBijectionRoute(goalId, sourceId, minimum, nodes = state.nodes, connections = state.connections) {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const goalNode = byId.get(goalId), source = byId.get(sourceId);
    const missing = { complete: false, identity: false, operations: [] };
    if (!goalNode || goalNode.type !== "goal" || !source || source.type !== "source" || !source.symbolic) return missing;
    const targetLink = connections.find((connection) => connection.to === goalId && connection.input === 0);
    if (!targetLink) return missing;
    let cursor = targetLink.from;
    const operations = [], seen = new Set();
    while (cursor !== sourceId) {
      if (seen.has(cursor)) return missing;
      seen.add(cursor);
      const node = byId.get(cursor);
      if (!node || !["vnSucc", "union"].includes(node.type)) return missing;
      operations.push(node.type);
      const link = connections.find((connection) => connection.to === cursor && connection.input === 0);
      if (!link) return missing;
      cursor = link.from;
    }
    operations.reverse();
    // On these natural-number domains, S adds one and union subtracts one,
    // stopping at zero. Every unary composition has the exact form
    // max(input + offset, floor); this checks all inputs, not sampled values.
    let offset = 0, floor = minimum;
    operations.forEach((type) => {
      if (type === "vnSucc") { offset += 1; floor += 1; }
      else { offset -= 1; floor = Math.max(0, floor - 1); }
    });
    return { complete: true, identity: offset === 0 && floor <= minimum, operations, offset, floor };
  }

  function naturalBijectionReady(route, firstOperation) {
    return route.complete && route.identity && route.operations.length > 0 && route.operations[0] === firstOperation;
  }

  function naturalBijectionDiagram(nSample, mSample, forwardInstalled, backwardInstalled) {
    const paths = [], objects = [];
    for (let n = 0; n < 4; n += 1) {
      const y = 48 + n * 43;
      paths.push(`<path class="natural-correspondence forward ${forwardInstalled ? "installed" : "waiting"} ${forwardInstalled && n === nSample ? "selected" : ""}" d="M91 ${y - 5} C129 ${y - 20},182 ${y - 20},220 ${y - 5}" marker-end="url(#natural-forward-arrow)"></path>`);
      paths.push(`<path class="natural-correspondence backward ${backwardInstalled ? "installed" : "waiting"} ${backwardInstalled && n + 1 === mSample ? "selected" : ""}" d="M230 ${y + 5} C189 ${y + 20},140 ${y + 20},101 ${y + 5}" marker-end="url(#natural-backward-arrow)"></path>`);
      objects.push(`<span class="natural-number left ${n === nSample ? "selected" : ""}" style="top:${(y - 14) / 233 * 100}%">${n}</span><span class="natural-number right ${n + 1 === mSample ? "selected" : ""}" style="top:${(y - 14) / 233 * 100}%">${n + 1}</span>`);
    }
    return `<div class="natural-bijection-diagram" role="img" aria-label="全部自然数与去掉 0 的自然数之间的往返对应；只展示前四对"><svg viewBox="0 0 320 233" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="natural-forward-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z"></path></marker><marker id="natural-backward-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z"></path></marker></defs>${paths.join("")}</svg><b class="natural-domain-name left">ℕ</b><b class="natural-domain-name right">ℕ∖{0}</b><span class="natural-operation-name">${forwardInstalled ? "S →" : ""}</span><span class="natural-operation-name backward">${backwardInstalled ? "← ⋃" : ""}</span>${objects.join("")}<span class="natural-ellipsis left">⋮</span><span class="natural-ellipsis right">⋮</span></div>`;
  }

  function naturalBijectionSampleControls(nSample, mSample) {
    return `<div class="natural-sample-controls">${[["n", "natural-bijection-n", nSample, [0,1,2,3]], ["m", "natural-bijection-m", mSample, [1,2,3,4]]].map(([symbol, id, sample, choices]) => `<div><span>观察 ${symbol}=</span>${choices.map((number) => `<button type="button" data-natural-source="${id}" data-natural-value="${number}" aria-label="观察 ${symbol}=${number}" aria-pressed="${number === sample}" class="${number === sample ? "selected" : ""}">${number}</button>`).join("")}</div>`).join("")}</div>`;
  }

  function naturalBijectionReason(route, symbol, sample, goalId) {
    const firstOperation = symbol === "n" ? "vnSucc" : "union";
    const ready = naturalBijectionReady(route, firstOperation);
    const result = safeSemanticValue(goalId);
    const resultText = Array.isArray(result) ? result.length : "?";
    const expression = route.operations.reduce((text, type) => type === "vnSucc" ? `S(${text})` : `⋃${text}`, symbol);
    let reason = "先进入另一个集合，再恢复出发对象。";
    if (route.complete && !ready) reason = "这还不是所需的往返；应对任意允许的输入恢复原对象。";
    if (ready) reason = symbol === "n"
      ? "⋃n⊆n：更小数的成员仍在 n 中。展开 S(n) 得到 (⋃n)∪n=n。"
      : "m 非零，所以是某个数的后继。先取并集恢复前一个数，再做后继取回 m。";
    const formula = ready ? `${expression} = ${symbol}` : (route.complete ? expression : `${symbol} → … → ${symbol}`);
    return `<article class="natural-bijection-reason ${ready ? "complete" : "waiting"}"><header><b>${symbol === "n" ? "任意 n∈ℕ" : "任意 m∈ℕ∖{0}"}</b><span>观察 ${sample} → ${resultText}</span></header><code>${escapeHtml(formula)}</code><p>${reason}</p></article>`;
  }

  function modalColumnSources() {
    return [
      ...MODAL_WORLDS.map((world, i) => fixed(`modal-world-${i}`, "世界", world, "set", 15, 20 + i * 90, world)),
      fixed("modal-truth-true", "可指定的真值", TRUTH_TRUE, "set", 15, 310, "真"),
      fixed("modal-truth-false", "可指定的真值", TRUTH_FALSE, "set", 15, 405, "假")
    ];
  }

  function modalRelationSources() {
    return MODAL_WORLDS.map((world, i) => fixed(`modal-world-${i}`, "世界", world, "set", 15, 45 + i * 160, world));
  }

  function validateModalTruthColumn(graph) {
    return analyzeFiniteMap(graph, MODAL_WORLDS, [TRUTH_FALSE, TRUTH_TRUE]).complete;
  }

  function validateModalRelation(graph, worlds = MODAL_WORLDS) {
    if (!Array.isArray(graph)) return false;
    try { return graph.map(decodeOrderedPair).every(([from, to]) => worlds.includes(from) && worlds.includes(to)); }
    catch (_) { return false; }
  }

  function modalDraftEdges(kind) {
    return set(...constructedSemanticRelation().filter((edge) => {
      const [from, to] = decodeOrderedPair(edge);
      return MODAL_WORLDS.includes(from) && (kind === "relation" ? MODAL_WORLDS.includes(to) : [TRUTH_TRUE, TRUTH_FALSE].includes(to));
    }));
  }

  function modalModelForLevel(level = currentLevel(), values = null) {
    const spec = level.modal;
    const read = (id) => values === null ? safeSemanticValue(id) : (values[id] ?? null);
    const column = (letter) => {
      const id = spec[`${letter.toLowerCase()}Goal`];
      if (!id) return spec[letter.toLowerCase()] || null;
      return read(id) ?? (values === null ? modalDraftEdges("truth") : null);
    };
    const relationTarget = spec.relationGoal ? read(spec.relationGoal) : spec.relation;
    return {
      worlds: MODAL_WORLDS, columns: { P: column("P"), Q: column("Q") },
      relation: relationTarget ?? (values === null && spec.relationGoal ? set(...(spec.baseRelation || []), ...modalDraftEdges("relation")) : []),
      relationKnown: validateModalRelation(relationTarget)
    };
  }

  function modalTruthAtWorld(model, world, name) {
    try {
      const value = applyFunction(model.columns[name], world);
      return value === TRUTH_TRUE ? true : value === TRUTH_FALSE ? false : null;
    } catch (_) { return null; }
  }

  function modalSuccessors(model, world) {
    if (!Array.isArray(model.relation)) return [];
    const worlds = [];
    model.relation.forEach((edge) => {
      const parts = semanticPairParts(edge);
      if (parts && parts[0] === world && model.worlds.includes(parts[1]) && !worlds.includes(parts[1])) worlds.push(parts[1]);
    });
    return worlds;
  }

  function modalLocalTruth(kind, values) {
    if (kind === "not") return values[0] === null ? null : equal(applyFunction(truthNegationFunction, values[0] ? TRUTH_TRUE : TRUTH_FALSE), TRUTH_TRUE);
    if (kind === "and" && values.includes(false)) return false;
    if (kind === "or" && values.includes(true)) return true;
    if (kind === "imp" && (values[0] === false || values[1] === true)) return true;
    if (values.includes(null)) return null;
    const graph = { and: truthConjunctionFunction, or: truthDisjunctionFunction, imp: truthImplicationFunction }[kind];
    return equal(applyFunction(graph, orderedPair(values[0] ? TRUTH_TRUE : TRUTH_FALSE, values[1] ? TRUTH_TRUE : TRUTH_FALSE)), TRUTH_TRUE);
  }

  function modalEvaluationTrace(formula, model, world, cache = new Map()) {
    if (!formula || !model.worlds.includes(world)) throw new Error("模态求值需要完整公式与模型中的世界。");
    const cacheKey = `${world}|${formulaKey(formula)}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    const trace = { formula, world, children: [], value: null, relationKnown: model.relationKnown };
    cache.set(cacheKey, trace);
    if (formula.kind === "prop") trace.value = modalTruthAtWorld(model, world, formula.name);
    else if (formula.kind === "bottom") trace.value = false;
    else if (["box", "diamond"].includes(formula.kind)) {
      trace.children = modalSuccessors(model, world).map((target) => modalEvaluationTrace(formula.body, model, target, cache));
      const values = trace.children.map((child) => child.value);
      if (model.relationKnown) trace.value = formula.kind === "box"
        ? (values.includes(false) ? false : values.includes(null) ? null : true)
        : (values.includes(true) ? true : values.includes(null) ? null : false);
    } else if (formula.kind === "not") {
      trace.children = [modalEvaluationTrace(formula.body, model, world, cache)];
      trace.value = modalLocalTruth("not", [trace.children[0].value]);
    } else if (["and", "or", "imp"].includes(formula.kind)) {
      trace.children = [modalEvaluationTrace(formula.left, model, world, cache), modalEvaluationTrace(formula.right, model, world, cache)];
      trace.value = modalLocalTruth(formula.kind, trace.children.map((child) => child.value));
    } else throw new Error("这条支线只对命题连接词与 □、◇ 求值。");
    return trace;
  }

  function evaluateModalFormula(formula, model, world) {
    const value = modalEvaluationTrace(formula, model, world).value;
    if (value === null) throw new Error("还缺少这一公式需要的世界赋值或可达关系。");
    return value;
  }

  function validateModalLessonModel(lesson, graph, formula = null) {
    if (lesson !== "nested" && !validateModalTruthColumn(graph)) return fail("每个世界必须恰好获得一个真或假；请构造完整的世界赋值函数图。");
    const p = F.prop("P"), q = F.prop("Q");
    const model = { worlds: MODAL_WORLDS, columns: { P: graph }, relation: modalTutorialRelation, relationKnown: true };
    if (lesson === "box") return !evaluateModalFormula(p, model, "w₀") && evaluateModalFormula(F.box(p), model, "w₀")
      ? pass("w₀ 的 P 假，而每个可达世界的 P 都真；因此 □P 在 w₀ 真。") : fail("让 w₀ 的 P 假，同时让它直接可达的 w₁、w₂ 的 P 都真。");
    if (lesson === "diamond") return evaluateModalFormula(F.diamond(p), model, "w₀") && !evaluateModalFormula(F.box(p), model, "w₀")
      ? pass("一个可达世界满足 P，另一个不满足 P；因此 ◇P 真而 □P 假。") : fail("w₀ 的两个可达世界中，需要一个 P 真、一个 P 假。");
    if (lesson === "whole") {
      if (!equalFormula(formula, F.box(F.imp(p, q)))) return fail("公式需要是 □(P→Q)：先构造蕴含，再把整个子公式接入 □。");
      model.columns = { P: modalMixedP, Q: graph };
      return evaluateModalFormula(formula, model, "w₀") && !evaluateModalFormula(F.box(q), model, "w₀")
        ? pass("每个可达世界的 P→Q 都真，而其中一个世界的 Q 假；□(P→Q) 真、□Q 假。") : fail("让 P 真处的 Q 真，让 P 假的可达世界中 Q 假；分别在各个世界计算蕴含。");
    }
    if (!validateModalRelation(graph)) return fail("可达关系的每个成员都应是三个世界之间的有序对。");
    if (!equalFormula(formula, F.box(F.diamond(p)))) return fail("公式需要是 □◇P：从 P 开始先接 ◇，再接 □。");
    model.columns = { P: modalInitialP }; model.relation = graph;
    return evaluateModalFormula(formula, model, "w₀") && !evaluateModalFormula(F.box(p), model, "w₀")
      ? pass("第一步可达的世界中有 P 假处，但每个这样的世界又能找到 P 真处；□◇P 真而 □P 假。") : fail("让 w₀ 可达 P 假的世界，阻止 □P；每个可达世界还需从自己出发找到 P 真处。");
  }

  function modalTruthLabel(value) { return value === null ? "?" : truthText(value); }

  function selectModalWorld(world) {
    if (!currentLevel().modal || !MODAL_WORLDS.includes(world)) return;
    state.modalWorld = world;
    renderCanvas();
  }

  function modalFocusFormula(level = currentLevel()) {
    if (level.modal.formulaGoal) return safeSemanticValue(level.modal.formulaGoal);
    if (level.modal.formula) return level.modal.formula;
    const p = F.prop("P");
    return level.modal.lesson === "box" ? F.box(p) : level.modal.lesson === "diamond" ? F.diamond(p) : p;
  }

  function modalTraceEdges(trace, found = new Map(), seen = new Set()) {
    if (!trace || seen.has(trace)) return found;
    seen.add(trace);
    if (["box", "diamond"].includes(trace.formula.kind) && trace.relationKnown) trace.children.forEach((child) => found.set(`${trace.world}|${child.world}`, [trace.world, child.world]));
    trace.children.forEach((child) => modalTraceEdges(child, found, seen));
    return found;
  }

  function modalWorldGraph(model, focus) {
    const selected = state.modalWorld || "w₀", highlighted = focus ? modalTraceEdges(modalEvaluationTrace(focus, model, selected)) : new Map();
    const paths = {
      "0-1": "M132 170 C104 150,83 127,68 109", "1-0": "M46 105 C54 137,91 163,106 191",
      "0-2": "M188 170 C216 150,237 127,252 109", "2-0": "M274 105 C266 137,229 163,214 191",
      "1-2": "M104 64 L211 64", "2-1": "M216 86 L109 86",
      "0-0": "M147 232 C119 267,201 267,173 237", "1-1": "M43 44 C8 4,94 4,73 39", "2-2": "M247 44 C212 4,298 4,277 39"
    };
    const arrows = [];
    MODAL_WORLDS.forEach((from, i) => MODAL_WORLDS.forEach((to, j) => {
      if (semanticRelationContains(model.relation, from, to)) arrows.push(`<path class="modal-world-edge ${highlighted.has(`${from}|${to}`) || from === selected ? "selected" : ""}" d="${paths[`${i}-${j}`]}" marker-end="url(#modal-world-arrow)"></path>`);
    }));
    const positions = [{ x: 115, y: 175 }, { x: 10, y: 48 }, { x: 220, y: 48 }];
    const worlds = MODAL_WORLDS.map((world, i) => {
      const position = positions[i];
      const names = currentLevel().modal.qGoal ? ["P", "Q"] : ["P"];
      const values = names.map((name) => {
        const value = modalTruthAtWorld(model, world, name);
        return `<span class="modal-atomic-value ${value === null ? "unknown" : value ? "true" : "false"}">${name}：${modalTruthLabel(value)}</span>`;
      }).join("");
      return `<button type="button" class="modal-world-card ${world === selected ? "selected" : ""}" data-modal-world="${world}" aria-pressed="${world === selected}" style="left:${position.x / 320 * 100}%;top:${position.y / 270 * 100}%"><b>${world}</b><span>${values}</span></button>`;
    }).join("");
    return `<div class="modal-world-graph"><svg viewBox="0 0 320 270" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="modal-world-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z"></path></marker></defs>${arrows.join("")}</svg>${worlds}</div>`;
  }

  function modalWorkbenchBody() {
    const level = currentLevel(), lesson = level.modal.lesson, model = modalModelForLevel(level), world = state.modalWorld || "w₀";
    const focus = modalFocusFormula(level), successors = modalSuccessors(model, world);
    const results = ["worlds", "accessibility", "box"].includes(lesson) ? [["P", F.prop("P")]] : [];
    if (focus && focus.kind !== "prop") results.push([prettyFormula(focus), focus]);
    if (lesson === "diamond" || lesson === "nested") results.push(["□P", F.box(F.prop("P"))]);
    if (lesson === "whole") results.push(["□Q", F.box(F.prop("Q"))]);
    if (lesson === "local-counterexample") results.push(["P", F.prop("P")], ["□P", F.box(F.prop("P"))]);
    if (lesson === "t-counterexample" || lesson === "reflexive-extension") results.push(["P", F.prop("P")], ["□P", F.box(F.prop("P"))]);
    if (lesson === "separate-witnesses") results.push(["◇P", F.diamond(F.prop("P"))], ["◇Q", F.diamond(F.prop("Q"))], ["◇(P∧Q)", F.diamond(F.and(F.prop("P"), F.prop("Q")))]);
    const rows = results.map(([label, formula]) => {
      const value = modalEvaluationTrace(formula, model, world).value;
      return `<article><code>${escapeHtml(label)}</code><b class="${value === null ? "unknown" : value ? "true" : "false"}">${modalTruthLabel(value)}</b></article>`;
    }).join("");
    let reason = "";
    if (lesson === "t-counterexample") reason = successors.includes(world) ? "这里也在自己的考察范围中，□P 必须把这里的 P 算在内。" : "可达世界的 P 与这里的 P 分开显示：□ 不会自动把当前世界纳入考察。";
    if (lesson === "reflexive-extension") {
      const before = { ...model, relation: level.modal.baseRelation, relationKnown: true };
      const pBefore = modalTruthAtWorld(before, world, "P"), boxBefore = modalEvaluationTrace(F.box(F.prop("P")), before, world).value, implicationBefore = modalEvaluationTrace(focus, before, world).value;
      reason = `原关系 R：P ${modalTruthLabel(pBefore)}，□P ${modalTruthLabel(boxBefore)}，□P→P ${modalTruthLabel(implicationBefore)}。上方显示当前构造；P 的赋值没有改变，改变的是 □ 的考察范围。`;
    }
    if (lesson === "local-counterexample") reason = "这里的 P 真，还不足以保证每个可达世界的 P 都真。寻找一个可达反例，让 P→□P 为假。";
    if (lesson === "separate-witnesses") {
      const pWorlds = successors.filter((item) => modalTruthAtWorld(model, item, "P") === true), qWorlds = successors.filter((item) => modalTruthAtWorld(model, item, "Q") === true);
      reason = `P 的可达见证：${pWorlds.join("、") || "无"}；Q 的可达见证：${qWorlds.join("、") || "无"}。三个世界中都没有 P、Q 同时成立之处。`;
    }
    if (["box", "diamond", "whole", "nested"].includes(lesson)) {
      if (model.relationKnown && !successors.length) reason = lesson === "box" ? "没有可达世界，也就没有可达反例，所以 □P 真。" : "没有可达世界：找不到反例，□ 真；也找不到成立的世界，◇ 假。";
      else reason = lesson === "whole" ? "先到各个可达世界，再分别在那里计算完整的 P→Q。" : lesson === "nested" ? "内层 ◇ 从第一步到达的世界重新出发；不能一直使用外层的出发世界。" : lesson === "box" ? "必然要考察每个可达世界，不只读取这里的 P。" : "可能需要一个成立的世界；必然要求每个可达世界都成立。";
    }
    const scope = lesson === "worlds" ? `当前世界 ${world}` : `${world} 直接可达：${successors.join("、") || (model.relationKnown ? "无" : "?")}${model.relationKnown ? "" : "（关系尚未接入目标）"}`;
    return modalWorldGraph(model, focus) + `<p class="modal-world-scope">${escapeHtml(scope)}</p><div class="modal-world-results">${rows}</div>${reason ? `<p class="modal-world-reason">${reason}</p>` : ""}`;
  }

  function renderModalEvaluationTrace(trace, budget = { remaining: 96 }) {
    const value = modalTruthLabel(trace.value), modal = ["box", "diamond"].includes(trace.formula.kind);
    const card = `<div class="modal-trace-card"><span>${trace.world}</span><b>${escapeHtml(prettyFormula(trace.formula))}</b><em class="${trace.value === null ? "unknown" : trace.value ? "true" : "false"}">${value}</em></div>`;
    if (budget.remaining-- <= 0) return `<div class="modal-trace-node">${card}<p class="modal-trace-scope">后续分支已折叠；真值仍按完整模型计算。</p></div>`;
    const scope = modal ? (!trace.relationKnown ? "可达关系还未接入目标" : trace.children.length ? `${trace.formula.kind === "box" ? "每个" : "至少一个"}可达世界：${trace.children.map((child) => child.world).join("、")}` : trace.formula.kind === "box" ? "没有可达世界，没有反例，因此真" : "没有可达世界，没有成立的见证，因此假") : "";
    return `<div class="modal-trace-node">${card}${scope ? `<p class="modal-trace-scope">${scope}</p>` : ""}${trace.children.length ? `<div class="modal-trace-children ${modal ? "world-change" : "same-world"}">${trace.children.map((child) => renderModalEvaluationTrace(child, budget)).join("")}</div>` : ""}</div>`;
  }

  function renderModalFormulaWorkspace(evaluation) {
    $("#valuationControls").hidden = true;
    $("#truthTablePanel").hidden = true;
    $("#evaluationEquation").hidden = true;
    const formula = modalFocusFormula();
    $("#formulaTree").className = evaluation ? "formula-tree modal-evaluation" : "formula-tree syntax";
    if (!formula) {
      $("#formulaTree").innerHTML = `<p class="formula-tree-empty">公式目标还没有收到完整公式。切回构造网络完成接线。</p>`;
      $("#formulaInspectorNote").textContent = "右侧模型保留在这里；世界赋值与可达关系决定每一步的判断位置。";
      return;
    }
    if (!evaluation) {
      $("#formulaTree").innerHTML = renderFormulaTreeNode(formula, false);
      $("#formulaInspectorNote").textContent = syntaxTreeNote(formula);
      return;
    }
    const model = modalModelForLevel(), world = state.modalWorld || "w₀", trace = modalEvaluationTrace(formula, model, world);
    $("#formulaTree").innerHTML = `<div class="modal-evaluation-controls"><span>出发世界</span>${MODAL_WORLDS.map((target) => `<button type="button" data-modal-world="${target}" class="${target === world ? "selected" : ""}" aria-pressed="${target === world}">${target}</button>`).join("")}</div>${renderModalEvaluationTrace(trace)}`;
    $("#formulaTree").querySelectorAll("[data-modal-world]").forEach((button) => button.addEventListener("click", () => selectModalWorld(button.dataset.modalWorld)));
    $("#evaluationEquation").textContent = `${world} 中的 ${prettyFormula(formula)}：${modalTruthLabel(trace.value)}`;
    $("#evaluationEquation").hidden = false;
    $("#formulaInspectorNote").textContent = "每张卡片标明所在世界。连接词的子公式留在同一世界；□、◇的子公式进入可达世界。";
  }

  function orderSetIncluded(left, right) {
    return Array.isArray(left) && Array.isArray(right) && left.every((member) => contains(right, member));
  }

  function orderExtremaFacts(range) {
    const known = Array.isArray(range) && range.every((member) => Array.isArray(member) && member.every((object) => ["a", "b", "c"].includes(object)));
    if (!known) return { known: false, members: [], minimal: [], least: [] };
    return {
      known: true, members: range,
      minimal: range.filter((member) => !range.some((other) => !equal(member, other) && orderSetIncluded(other, member))),
      least: range.filter((member) => range.every((other) => orderSetIncluded(member, other)))
    };
  }

  function orderExtremaMReady(m) {
    const facts = orderExtremaFacts(m);
    return facts.known && m.length === 2 && m.every((member) => member.length > 0) && facts.minimal.length === 2 && facts.least.length === 0;
  }

  function validateOrderExtremaConstruction(m, n) {
    const mFacts = orderExtremaFacts(m), nFacts = orderExtremaFacts(n);
    if (!mFacts.known || m.length !== 2 || m.some((member) => member.length === 0)) return fail("M 必须恰好收下两个不同的非空集合，且它们都是 {a,b,c} 的子集。");
    if (!orderExtremaMReady(m)) return fail("M 的两个集合之间已经有包含关系，其中一个是最小元。请构造互不包含的两个集合。");
    const common = m[0].filter((member) => contains(m[1], member));
    if (!common.length) return fail("M 的两个集合没有共同成员，无法再加入一个包含于两者的非空集合；请调整这两个集合。");
    if (!nFacts.known || n.length !== 3 || n.some((member) => member.length === 0)) return fail("N 必须恰有三个非空集合，且每个都是 {a,b,c} 的子集。");
    if (!m.every((member) => contains(n, member))) return fail("N 必须保留 M 的两个完整成员，再加入一个新集合。");
    const added = n.filter((member) => !contains(m, member));
    if (added.length !== 1) return fail("请只加入一个新的非空集合，并保留两个原集合。");
    const missingIn = m.find((member) => !orderSetIncluded(added[0], member));
    if (missingIn) {
      const witness = added[0].find((member) => !contains(missingIn, member));
      return fail(`新增集合中的 ${witness} 不属于 ${prettyCurrentSet(missingIn)}，所以它没有包含于这个原集合。`);
    }
    return pass("M 的两个成员都极小，却没有最小元；加入一个包含于两者的非空成员后，N 有了唯一的极小元与最小元。");
  }

  function orderExtremaDiagram(range, name, m) {
    const facts = orderExtremaFacts(range), supplied = range !== null;
    if (supplied && (!facts.known || range.length > 3)) return `<p class="order-extrema-invalid">${name} 的每个成员都应是 {a,b,c} 的子集。</p>`;
    if (supplied && range.length === 0) return `<p class="order-extrema-invalid">${name} 没有成员。</p>`;
    let members = facts.known ? range.slice() : Array(name === "M" ? 2 : 3).fill(null);
    if (name === "N" && facts.known && members.length === 3) {
      if (orderExtremaFacts(m).known && m.length === 2 && m.every((member) => contains(range, member))) members = [...m, ...range.filter((member) => !contains(m, member))];
      else members.sort((left, right) => right.length - left.length || key(left).localeCompare(key(right)));
    }
    const height = members.length > 2 ? 230 : 114;
    const positions = members.length === 1 ? [{ x: 97.5, y: 42 }] : [{ x: 10, y: 42 }, { x: 185, y: 42 }, { x: 97.5, y: 139 }];
    const marker = `order-extrema-${name}-arrow`;
    const paths = [];
    const directions = {
      "0-1": "M139 60 L176 60", "1-0": "M181 78 L144 78",
      "2-0": "M132 135 C115 120,98 113,83 99", "2-1": "M188 135 C205 120,222 113,237 99",
      "0-2": "M83 94 C98 113,115 120,132 130", "1-2": "M237 94 C222 113,205 120,188 130"
    };
    members.forEach((member, i) => {
      if (!member) return;
      const { x, y } = positions[i], center = x + 62.5;
      const loop = i === 2
        ? `M${center - 18} ${y + 52} C${center - 45} ${y + 86},${center + 45} ${y + 86},${center + 18} ${y + 58}`
        : `M${center - 16} ${y - 4} C${center - 36} ${y - 40},${center + 38} ${y - 40},${center + 14} ${y - 9}`;
      paths.push(`<path class="order-extrema-loop" d="${loop}" marker-end="url(#${marker})"></path>`);
      members.forEach((other, j) => {
        if (i !== j && other && orderSetIncluded(member, other)) paths.push(`<path class="order-extrema-edge" d="${directions[`${i}-${j}`]}" marker-end="url(#${marker})"></path>`);
      });
    });
    const common = orderExtremaFacts(m).known && m.length === 2 ? m[0].filter((member) => contains(m[1], member)) : [];
    const cards = members.map((member, i) => {
      const position = positions[i];
      const added = name === "N" && member && orderExtremaFacts(m).known && m.length === 2 && !contains(m, member);
      const content = member === null ? "?" : member.length === 0 ? "∅" : member.map((object) => {
        const missing = added && !m.every((original) => contains(original, object));
        return `<span class="order-extrema-object ${missing ? "missing" : common.includes(object) ? "shared" : ""}">${object}</span>`;
      }).join("");
      return `<div class="order-extrema-set ${member === null ? "waiting" : ""} ${added ? "added" : ""}" style="left:${position.x / 320 * 100}%;top:${position.y / height * 100}%;width:${125 / 320 * 100}%;height:${48 / height * 100}%" aria-label="${member === null ? "待构造集合" : escapeHtml(prettyCurrentSet(member))}">${content}</div>`;
    }).join("");
    return `<div class="order-extrema-diagram ${members.length > 2 ? "three-members" : "two-members"}" role="img" aria-label="${name} 中每个集合的直接成员及真实包含关系"><svg viewBox="0 0 320 ${height}" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="${marker}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z"></path></marker></defs>${paths.join("")}</svg>${cards}</div>`;
  }

  function orderExtremaRangeView(range, name, m) {
    const facts = orderExtremaFacts(range);
    const ready = name === "M" ? orderExtremaMReady(range) : range !== null && m !== null && validateOrderExtremaConstruction(m, range).ok;
    const list = (values) => values.length ? values.map((value) => escapeHtml(prettyCurrentSet(value))).join("、") : "无";
    const summary = facts.least.length === 1 ? `极小且最小：${list(facts.least)}` : `极小元：${facts.minimal.length && facts.minimal.length === facts.members.length ? "全部成员" : list(facts.minimal)}；最小元：无`;
    return `<section class="order-extrema-range ${ready ? "complete" : ""}"><header><b>${name}</b><code>${range === null ? "?" : escapeHtml(prettyCurrentSet(range))}</code></header>${orderExtremaDiagram(range, name, m)}${facts.known ? `<p class="order-extrema-summary">${summary}</p>` : ""}</section>`;
  }

  function orderExtremaFeedback(m, n) {
    if (m === null) return "";
    const facts = orderExtremaFacts(m);
    if (!orderExtremaMReady(m)) {
      if (facts.known && m.length === 2 && m.every((member) => member.length > 0)) {
        const lower = facts.least[0];
        return `${prettyCurrentSet(lower)} 已包含于另一个成员，因此它既极小又最小；M 还不是所需的反例。`;
      }
      return "M 要收下两个不同的非空子集；收集的是两个完整集合，而不是它们内部的 a、b、c。";
    }
    const common = m[0].filter((member) => contains(m[1], member));
    if (!common.length) return "M 的两个成员都极小，但没有共同成员；无法再加入一个包含于两者的非空集合，需要调整 M。";
    if (n === null) return `两个集合共享 ${common.join("、")}，但共同的较小集合并不会自动成为 M 的成员。`;
    const result = validateOrderExtremaConstruction(m, n);
    if (!result.ok) return result.message;
    const added = n.find((member) => !contains(m, member));
    return `加入 ${prettyCurrentSet(added)} 改变了比较范围：它位于两个原集合下面，原来的两个极小元不再极小。`;
  }

  function countableDoubleValue(value) {
    if (!Array.isArray(value) || !equal(value, vnNat(value.length))) throw new Error("倍增的输入应当是冯诺依曼自然数。");
    let result = vnNat(0);
    for (let n = 0; n < value.length; n += 1) result = vnSuccessor(vnSuccessor(result));
    return result;
  }

  function countableParameter(name, role = "natural") { return { kind: "countable-parameter", name, role }; }

  function countableNaturalExpression(value) {
    if (Array.isArray(value)) return equal(value, vnNat(value.length));
    return Boolean(value && ((value.kind === "countable-parameter" && value.role === "natural") || value.kind === "countable-successor" || value.kind === "countable-double"));
  }

  function countableSuccessorExpression(value) {
    if (!countableNaturalExpression(value)) throw new Error("后继在这份编号条款中应作用于自然数编号或起点。");
    return Array.isArray(value) ? vnSuccessor(value) : { kind: "countable-successor", argument: value };
  }

  function countableDoubleExpression(value) {
    if (!countableNaturalExpression(value)) throw new Error("倍增应作用于自然数组号。");
    return Array.isArray(value) ? countableDoubleValue(value) : { kind: "countable-double", argument: value };
  }

  function countableConstructionSpec(kind) {
    const zero = vnNat(0), one = vnNat(1), n = countableParameter("n"), u = countableParameter("u", "object"), value = countableParameter("d(n)");
    if (kind === "enumeration") return {
      parameters: { "countable-enumeration-n": n, "countable-enumeration-u": u },
      clauses: [
        { id: "countable-enumeration-base", label: "初始编号", expected: orderedPair(zero, "a") },
        { id: "countable-enumeration-step", label: "从已有 n↔u 推进", expected: orderedPair(countableSuccessorExpression(n), set(u)) }
      ]
    };
    if (kind === "doubling") return {
      parameters: { "countable-doubling-n": n, "countable-doubling-value": value },
      clauses: [
        { id: "countable-doubling-base", label: "第一组的起点", expected: orderedPair(zero, zero) },
        { id: "countable-doubling-step", label: "从已有起点 d(n) 推进", expected: orderedPair(countableSuccessorExpression(n), countableSuccessorExpression(countableSuccessorExpression(value))) }
      ]
    };
    if (kind === "copies") return {
      parameters: { "countable-copies-n": n, "countable-copies-u": u },
      clauses: [{ id: "goal", label: "这一组的两条对应", expected: set(
        orderedPair(countableDoubleExpression(n), orderedPair(u, zero)),
        orderedPair(countableSuccessorExpression(countableDoubleExpression(n)), orderedPair(u, one))
      ) }]
    };
    throw new Error("没有定义这份编号构造。");
  }

  function countableSymbolicValue(id, parameters, nodes = state.nodes, connections = state.connections, stack = new Set()) {
    if (stack.has(id)) throw new Error("编号条款中不能有环路。");
    const node = nodes.find((item) => item.id === id);
    if (!node) throw new Error("连接指向不存在的节点。");
    if (node.type === "source") {
      if (Object.prototype.hasOwnProperty.call(parameters, id)) {
        if (!node.symbolic) throw new Error("推进方法需要保留任意输入。");
        return parameters[id];
      }
      return clone(node.value);
    }
    const allowed = { goal: 1, vnSucc: 1, pair: 2, ord: 2, naturalDouble: 1 };
    if (!Object.prototype.hasOwnProperty.call(allowed, node.type)) throw new Error("请使用本关已有的集合与编号操作。");
    const nextStack = new Set(stack); nextStack.add(id);
    const arguments_ = Array.from({ length: allowed[node.type] }, (_, index) => {
      const link = connections.find((connection) => connection.to === id && connection.input === index);
      if (!link) throw new Error("这一条对应还缺少输入。");
      return countableSymbolicValue(link.from, parameters, nodes, connections, nextStack);
    });
    if (node.type === "goal") return arguments_[0];
    if (node.type === "vnSucc") return countableSuccessorExpression(arguments_[0]);
    if (node.type === "naturalDouble") return countableDoubleExpression(arguments_[0]);
    if (node.type === "pair") return pair(arguments_[0], arguments_[1]);
    return orderedPair(arguments_[0], arguments_[1]);
  }

  function countableConstructionFacts(kind, nodes = state.nodes, connections = state.connections) {
    const spec = countableConstructionSpec(kind);
    return {
      ...spec,
      clauses: spec.clauses.map((clause) => {
        try {
          const value = countableSymbolicValue(clause.id, spec.parameters, nodes, connections);
          return { ...clause, value, ready: equal(value, clause.expected), error: null };
        } catch (error) { return { ...clause, value: null, ready: false, error: error.message }; }
      })
    };
  }

  function validateCountableConstruction(kind, nodes, connections) {
    const facts = countableConstructionFacts(kind, nodes, connections);
    if (facts.clauses.every((clause) => clause.ready)) return pass(kind === "enumeration"
      ? "初始编号与推进条款已经构造；这批生成对象与自然数一一对应，是可数无限集合。"
      : kind === "doubling" ? "从 0 开始，每组起点向后移动两步；这份逐项定义得到倍增函数 d(n)=2n。"
        : "每个原对象的两份分别使用这一组的两个位置；X×{0,1} 与自然数一一对应。");
    const incomplete = facts.clauses.find((clause) => clause.error);
    if (incomplete) return fail(incomplete.error);
    return fail(kind === "enumeration"
      ? "初始编号应是 0→a；推进方法需要同时把编号 n 变为 S(n)，把对应对象 u 变为 {u}。"
      : kind === "doubling" ? "初始对应应是 0→0；下一组的组号增加一步，而已有起点 d(n) 需要增加两步。"
        : "请分别构造两份带标记的对象，再用 d(n) 和它的后继编号；收集的是两条外层编号对应。");
  }

  function countableExpressionText(value) {
    if (value && value.kind === "countable-parameter") return value.name;
    if (value && value.kind === "countable-successor") return `S(${countableExpressionText(value.argument)})`;
    if (value && value.kind === "countable-double") return `d(${countableExpressionText(value.argument)})`;
    if (Array.isArray(value)) {
      if (countableNaturalExpression(value)) return String(value.length);
      return `{${value.map(countableExpressionText).join(",")}}`;
    }
    return String(value);
  }

  function countablePairText(value, nested = false) {
    try {
      const [left, right] = decodeOrderedPair(value);
      return `⟨${countableExpressionText(left)},${nested ? countablePairText(right) : countableExpressionText(right)}⟩`;
    } catch (_) { return countableExpressionText(value); }
  }

  function countableRulesView(facts, kind) {
    return `<div class="countable-program-rules">${facts.clauses.map((clause) => {
      const text = clause.value === null ? "?" : kind === "copies"
        ? (Array.isArray(clause.value) ? `{${clause.value.map((edge) => countablePairText(edge, true)).join(", ")}}` : countableExpressionText(clause.value))
        : countablePairText(clause.value);
      return `<article class="${clause.ready ? "complete" : "waiting"}"><span>${clause.label}</span><code>${escapeHtml(text)}</code></article>`;
    }).join("")}</div>`;
  }

  function countableConstructedPrefix(kind, facts, length = 4) {
    if (!facts.clauses[0].ready) return [];
    const rows = [decodeOrderedPair(evaluateNode(facts.clauses[0].id))];
    if (!facts.clauses[1].ready) return rows;
    const parameterIds = Object.keys(facts.parameters);
    while (rows.length < length) {
      const [index, value] = rows[rows.length - 1];
      rows.push(decodeOrderedPair(evaluateNode(facts.clauses[1].id, { [parameterIds[0]]: index, [parameterIds[1]]: value })));
    }
    return rows;
  }

  function countablePrefixTable(kind, facts) {
    const rows = countableConstructedPrefix(kind, facts);
    const doubling = kind === "doubling";
    return `<div class="countable-prefix-table"><header><span>${doubling ? "组号" : "自然数编号"}</span><span>${doubling ? "本组的两个位置" : "按规则生成的对象"}</span></header>${Array.from({ length: 4 }, (_, n) => {
      const row = rows[n];
      const content = row ? doubling
        ? `<div class="countable-reserved-pair"><b>${row[1].length}</b><b>${vnSuccessor(row[1]).length}</b></div>`
        : `<code>${escapeHtml(countableExpressionText(row[1]))}</code>` : `<span class="countable-unknown">?</span>`;
      return `<article class="${row ? "complete" : "waiting"}"><b>${row ? row[0].length : n}</b>${content}</article>`;
    }).join("")}<footer><span>⋮</span><span>⋮</span></footer></div>`;
  }

  function countableCopiesTable(facts) {
    const rows = [];
    if (facts.clauses[0].ready) {
      let object = "a";
      for (let n = 0; n < 3; n += 1) {
        const entries = evaluateNode("goal", { "countable-copies-n": vnNat(n), "countable-copies-u": object });
        entries.forEach((edge) => {
          const [index, tagged] = decodeOrderedPair(edge), [original, tag] = decodeOrderedPair(tagged);
          rows.push({ index: index.length, original, tag: tag.length });
        });
        object = set(object);
      }
      rows.sort((left, right) => left.index - right.index);
    }
    return `<div class="countable-prefix-table copies"><header><span>共同编号</span><span>来自哪一份的对象</span></header>${Array.from({ length: 6 }, (_, i) => {
      const row = rows[i];
      return `<article class="${row ? "complete" : "waiting"}"><b>${row ? row.index : i}</b>${row ? `<span class="countable-copy-object"><code>⟨${escapeHtml(countableExpressionText(row.original))},</code><b class="countable-copy-tag tag-${row.tag}">${row.tag}</b><code>⟩</code></span>` : `<span class="countable-unknown">?</span>`}</article>`;
    }).join("")}<footer><span>⋮</span><span>⋮</span></footer></div>`;
  }

  function countableConstructionWorkbench(kind) {
    const facts = countableConstructionFacts(kind), ready = facts.clauses.every((clause) => clause.ready);
    const reason = ready ? kind === "enumeration"
      ? "每个对象经有限次包裹出现，所以都能获得编号；不同层数得到不同对象，所以编号不重复。"
      : kind === "doubling" ? "每组占两个位置，下一组紧接在它们之后。从 0 开始，没有重叠，也没有空位。"
        : "原编号确定唯一组号，标记区分两份对象；每组使用两个连续位置，因此没有重复或遗漏。"
      : kind === "copies" ? "先将对象与份数标记配成有序对，再把这整个对象与它的位置配成外层有序对。"
        : "初始对应确定起点；推进条款决定怎样从一份已有对应得到下一份。";
    return countableRulesView(facts, kind) + (kind === "copies" ? countableCopiesTable(facts) : countablePrefixTable(kind, facts))
      + `<p class="countable-general-reason ${ready ? "complete" : ""}">${reason}</p>`;
  }

  function renderSemanticWorkbench(backdrop, kind) {
    let title = "模型观察台";
    let subtitle = "节点变化会在这里立即显现";
    let body = "";
    if (kind === "modal-worlds") {
      title = "世界与逐世界的判断";
      subtitle = "点击世界，切换当前判断位置";
      body = modalWorkbenchBody();
    } else if (kind === "relation-diagram") {
      const relation = constructedSemanticRelation();
      const target = safeSemanticValue("goal");
      const entries = [
        [structureZero, "0", "a"],
        [structureZero, "0", "b"],
        [structureOne, "1", "b"]
      ];
      const rows = entries.map(([left, leftLabel, right]) => {
        const ready = contains(relation, orderedPair(left, right));
        return `<article class="${ready ? "complete" : "waiting"}"><code>⟨${leftLabel},${right}⟩</code><i>⇔</i><div><b>${leftLabel}</b><em>→</em><b>${right}</b></div></article>`;
      }).join("");
      const complete = Boolean(target && equal(target, sampleRelation));
      title = "同一个关系的两种表示";
      subtitle = "每个有序对完成时，对应箭头同时出现";
      body = `<div class="relation-diagram-head"><span>关系的成员</span><span>箭头表示</span></div><div class="relation-diagram-rows">${rows}</div><div class="relation-loop-convention"><div><b>x</b><i>↻</i></div><p><strong>两项相同时，箭头回到自身</strong><span>⟨x,x⟩ 对应的这种有向边简称自环</span></p></div><div class="foundation-property-strip ${complete ? "revealed" : "waiting"}"><code>${complete ? "R={⟨0,a⟩,⟨0,b⟩,⟨1,b⟩}" : `${relation.length} / 3 个目标有序对`}</code><b>${complete ? "集合与箭头图是同一关系" : ""}</b></div>`;
    } else if (kind === "set-foundation-reflexive") {
      const graph = safeSemanticValue("goal");
      const cupReady = Boolean(graph && contains(graph, orderedPair(quotientCup, quotientCup)));
      const plateReady = Boolean(graph && contains(graph, orderedPair(quotientPlate, quotientPlate)));
      const spoonReady = Boolean(graph && contains(graph, orderedPair(quotientSpoon, quotientSpoon)));
      const complete = Boolean(graph && equal(graph, quotientDiagonal));
      title = "每个对象都需要对应的 ⟨x,x⟩";
      subtitle = "箭头图会把这三个有序对画成三条自环";
      body = `<div class="reflexive-directed-graph">
        <svg viewBox="0 0 320 275" role="img" aria-label="A 上三个对象及其自环">
          <defs><marker id="reflexive-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs>
          <path class="relation-loop ${cupReady ? "complete" : "waiting"}" d="M 48 82 C 8 12, 122 12, 88 82" marker-end="url(#reflexive-arrow)"></path>
          <path class="relation-loop ${plateReady ? "complete" : "waiting"}" d="M 232 82 C 198 12, 312 12, 272 82" marker-end="url(#reflexive-arrow)"></path>
          <path class="relation-loop ${spoonReady ? "complete" : "waiting"}" d="M 138 218 C 98 278, 222 278, 182 218" marker-end="url(#reflexive-arrow)"></path>
          <g class="relation-object ${cupReady ? "active" : ""}"><rect x="25" y="82" width="82" height="42" rx="21"></rect><text x="66" y="108">杯子</text></g>
          <g class="relation-object ${plateReady ? "active" : ""}"><rect x="213" y="82" width="82" height="42" rx="21"></rect><text x="254" y="108">盘子</text></g>
          <g class="relation-object ${spoonReady ? "active" : ""}"><rect x="119" y="176" width="82" height="42" rx="21"></rect><text x="160" y="202">勺子</text></g>
          <text class="relation-graph-caption" x="66" y="146">${cupReady ? "⟨杯子,杯子⟩" : "等待 ⟨x,x⟩"}</text>
          <text class="relation-graph-caption" x="254" y="146">${plateReady ? "⟨盘子,盘子⟩" : "等待 ⟨x,x⟩"}</text>
          <text class="relation-graph-caption" x="160" y="238">${spoonReady ? "⟨勺子,勺子⟩" : "等待 ⟨x,x⟩"}</text>
        </svg>
      </div><div class="foundation-property-strip ${complete ? "revealed" : "waiting"}"><code>∀x∈A　⟨x,x⟩∈Δₐ</code><b>${complete ? "自反" : ""}</b></div>`;
    } else if (kind === "set-foundation-symmetric") {
      const graph = safeSemanticValue("goal");
      const constructed = constructedSemanticRelation();
      const plateToCup = contains(constructed, orderedPair(quotientPlate, quotientCup)) || Boolean(graph && contains(graph, orderedPair(quotientPlate, quotientCup)));
      const cupToSpoon = contains(constructed, orderedPair(quotientCup, quotientSpoon)) || Boolean(graph && contains(graph, orderedPair(quotientCup, quotientSpoon)));
      const complete = Boolean(graph && equal(graph, quotientSymmetricRelation));
      title = "原边与反向边留在同一个关系里";
      subtitle = "每条边都要在同一个关系中找到反向边";
      body = `<div class="symmetric-directed-graph">
        <svg viewBox="0 0 320 270" role="img" aria-label="S 中已有边及其反向边">
          <defs>
            <marker id="symmetric-given-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker>
            <marker id="symmetric-built-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker>
            <marker id="symmetric-waiting-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker>
          </defs>
          <path class="relation-arrow given" d="M 184 82 Q 242 105 258 169" marker-end="url(#symmetric-given-arrow)"></path>
          <path class="relation-arrow ${plateToCup ? "complete" : "waiting"}" d="M 249 168 Q 211 112 180 88" marker-end="url(#${plateToCup ? "symmetric-built-arrow" : "symmetric-waiting-arrow"})"></path>
          <path class="relation-arrow given" d="M 70 168 Q 109 112 140 88" marker-end="url(#symmetric-given-arrow)"></path>
          <path class="relation-arrow ${cupToSpoon ? "complete" : "waiting"}" d="M 136 82 Q 78 105 62 169" marker-end="url(#${cupToSpoon ? "symmetric-built-arrow" : "symmetric-waiting-arrow"})"></path>
          <g class="relation-object"><rect x="119" y="48" width="82" height="42" rx="21"></rect><text x="160" y="74">杯子</text></g>
          <g class="relation-object"><rect x="213" y="170" width="82" height="42" rx="21"></rect><text x="254" y="196">盘子</text></g>
          <g class="relation-object"><rect x="25" y="170" width="82" height="42" rx="21"></rect><text x="66" y="196">勺子</text></g>
          <text class="relation-edge-label given" x="235" y="115">杯子→盘子</text>
          <text class="relation-edge-label ${plateToCup ? "complete" : "waiting"}" x="220" y="143">${plateToCup ? "盘子→杯子" : "等待反向边"}</text>
          <text class="relation-edge-label given" x="84" y="143">勺子→杯子</text>
          <text class="relation-edge-label ${cupToSpoon ? "complete" : "waiting"}" x="84" y="115">${cupToSpoon ? "杯子→勺子" : "等待反向边"}</text>
        </svg>
      </div><div class="foundation-property-strip ${complete ? "revealed" : "waiting"}"><code>xSy ⇒ ySx</code><b>${complete ? "对称" : ""}</b></div>`;
    } else if (kind === "set-foundation-transitive") {
      const graph = safeSemanticValue("goal");
      const directReady = Boolean(graph && contains(graph, orderedPair(quotientCup, quotientSpoon)));
      const complete = Boolean(graph && equal(graph, quotientTransitiveRelation));
      title = "两段路径与直达边";
      subtitle = "已有路径经过盘子；第三条边必须留在同一个关系中";
      body = `<div class="quotient-transitive-board"><div><b>杯子</b><i>→</i><b>盘子</b><i>→</i><b>勺子</b></div><article class="${directReady ? "complete" : "waiting"}"><b>杯子</b><i>────────→</i><b>勺子</b></article></div><div class="foundation-property-strip ${complete ? "revealed" : "waiting"}"><code>xTy 且 yTz ⇒ xTz</code><b>${complete ? "传递" : ""}</b></div>`;
    } else if (kind === "set-foundation-antisymmetric") {
      const goalGraph = safeSemanticValue("goal");
      const graph = goalGraph || constructedSemanticRelation();
      const loopA = semanticRelationContains(graph, orderObjectA, orderObjectA);
      const loopB = semanticRelationContains(graph, orderObjectB, orderObjectB);
      const forward = semanticRelationContains(graph, orderObjectA, orderObjectB);
      const complete = Boolean(goalGraph && equal(goalGraph, orderAntisymmetricRelation));
      title = "不同对象之间只保留一个方向";
      subtitle = "自环仍然允许；缺少的反向边不是错误";
      body = `<div class="order-directed-board order-two-board"><svg viewBox="0 0 320 215" role="img" aria-label="a、b 上的反对称关系"><defs><marker id="order-two-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z"></path></marker></defs><path class="edge ${loopA ? "complete" : "waiting"}" d="M75 94 C35 28,145 28,105 94" marker-end="url(#order-two-arrow)"></path><path class="edge ${loopB ? "complete" : "waiting"}" d="M215 94 C175 28,285 28,245 94" marker-end="url(#order-two-arrow)"></path><path class="edge ${forward ? "complete" : "waiting"}" d="M116 117 L204 117" marker-end="url(#order-two-arrow)"></path><g class="node"><rect x="45" y="95" width="72" height="42" rx="21"></rect><text x="81" y="121">a</text></g><g class="node"><rect x="203" y="95" width="72" height="42" rx="21"></rect><text x="239" y="121">b</text></g><text class="blocked-label" x="160" y="163">b→a 不加入</text></svg></div><div class="foundation-property-strip ${complete ? "revealed" : "waiting"}"><code>xRy 且 yRx ⇒ x=y</code><b>${complete ? "反对称" : ""}</b></div>`;
    } else if (kind === "set-foundation-partial-order") {
      const goalGraph = safeSemanticValue("goal");
      const graph = goalGraph || constructedSemanticRelation();
      const has = (left, right) => semanticRelationContains(graph, left, right);
      const complete = Boolean(goalGraph && equal(goalGraph, orderVRelation));
      title = "子集关系形成一个 V 形偏序";
      subtitle = "箭头从较小集合向上指向包含它的较大集合";
      body = `<div class="order-directed-board order-v-board"><svg viewBox="0 0 320 280" role="img" aria-label="D 上的子集偏序"><defs><marker id="order-v-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z"></path></marker></defs><path class="edge ${has(orderBottom,orderLeft) ? "complete" : "waiting"}" d="M147 193 L91 124" marker-end="url(#order-v-arrow)"></path><path class="edge ${has(orderBottom,orderRight) ? "complete" : "waiting"}" d="M173 193 L229 124" marker-end="url(#order-v-arrow)"></path><path class="loop ${has(orderLeft,orderLeft) ? "complete" : "waiting"}" d="M55 74 C18 20,126 20,91 74" marker-end="url(#order-v-arrow)"></path><path class="loop ${has(orderRight,orderRight) ? "complete" : "waiting"}" d="M229 74 C194 20,302 20,265 74" marker-end="url(#order-v-arrow)"></path><path class="loop bottom ${has(orderBottom,orderBottom) ? "complete" : "waiting"}" d="M137 244 C105 274,215 274,183 244" marker-end="url(#order-v-arrow)"></path><g class="node"><rect x="35" y="74" width="82" height="42" rx="21"></rect><text x="76" y="100">{a}</text></g><g class="node"><rect x="203" y="74" width="82" height="42" rx="21"></rect><text x="244" y="100">{b}</text></g><g class="node"><rect x="119" y="196" width="82" height="42" rx="21"></rect><text x="160" y="222">∅</text></g></svg></div><div class="order-property-triad ${complete ? "complete" : "waiting"}"><span>自反</span><span>反对称</span><span>传递</span></div>`;
    } else if (kind === "set-foundation-minimal-least") {
      const m = safeSemanticValue("order-subset-m"), n = safeSemanticValue("order-subset-n");
      const feedback = orderExtremaFeedback(m, n);
      title = "你构造的集合与包含关系";
      subtitle = "箭头从子集指向包含它的集合；只比较当前范围的成员";
      body = `<div class="order-extrema-comparison">${orderExtremaRangeView(m, "M", m)}${orderExtremaRangeView(n, "N", m)}</div>${feedback ? `<p class="order-extrema-feedback">${escapeHtml(feedback)}</p>` : ""}`;
    } else if (kind === "set-foundation-total-order") {
      const goalGraph = safeSemanticValue("goal");
      const constructed = constructedSemanticRelation();
      const comparisonReady = semanticRelationContains(constructed, orderLeft, orderRight) || Boolean(goalGraph && semanticRelationContains(goalGraph, orderLeft, orderRight));
      const complete = Boolean(goalGraph && equal(goalGraph, orderLinearRelation));
      title = "补上一条边，V 形变成一条链";
      subtitle = "原来不可比较的 {a} 与 {b} 现在获得先后";
      body = `<div class="order-linear-chain"><b>∅</b><i>→</i><b>{a}</b><i class="${comparisonReady ? "complete" : "waiting"}">→</i><b>{b}</b><span class="${comparisonReady ? "complete" : "waiting"}">${comparisonReady ? "{a}≤{b}" : "等待新的比较边"}</span></div><div class="foundation-property-strip ${complete ? "revealed" : "waiting"}"><code>任意 x,y：x≤y 或 y≤x</code><b>${complete ? "全序" : ""}</b></div>`;
    } else if (kind === "set-foundation-strict-order") {
      const goalGraph = safeSemanticValue("goal");
      const strictReady = Boolean(goalGraph && equal(goalGraph, orderStrictRelation));
      title = "同一先后关系的两种写法";
      subtitle = "左边保留相等情形，右边只保留不同对象之间的先后";
      body = `<div class="order-strict-comparison"><article class="complete"><small>非严格次序 ≤</small><div><span>∅↻</span><span>{a}↻</span><span>{b}↻</span></div><code>∅≤{a}≤{b}</code></article><article class="${strictReady ? "complete" : "waiting"}"><small>严格次序 &lt;</small><div><span>∅</span><i>→</i><span>{a}</span><i>→</i><span>{b}</span></div><code>${strictReady ? "没有任何 x<x" : "等待三条严格边"}</code></article></div><div class="foundation-property-strip ${strictReady ? "revealed" : "waiting"}"><code>x&lt;y ⇔ x≤y 且 x≠y</code><b>${strictReady ? "自环已去掉" : ""}</b></div>`;
    } else if (kind === "set-foundation-well-order") {
      const graph = safeSemanticValue("goal") || constructedSemanticRelation();
      const rows = [
        [orderSubsetZero, vnNat(0), "{0}", "0"],
        [orderSubsetOne, vnNat(1), "{1}", "1"],
        [orderSubsetBoth, vnNat(0), "{0,1}", "0"]
      ].map(([subset, minimum, subsetLabel, minimumLabel]) => {
        const ready = semanticRelationContains(graph, subset, minimum);
        return `<article class="${ready ? "complete" : "waiting"}"><code>${subsetLabel}</code><i>min→</i><b>${ready ? minimumLabel : "?"}</b></article>`;
      }).join("");
      const complete = Boolean(safeSemanticValue("goal") && equal(safeSemanticValue("goal"), orderMinimumFunction));
      title = "逐个非空子集找到最小元";
      subtitle = "I₂ 的全部非空子集已经列完";
      body = `<div class="order-minimum-rows">${rows}</div><div class="foundation-property-strip ${complete ? "revealed" : "waiting"}"><code>每个非空 X⊆I₂ 都有 min(X)</code><b>${complete ? "良序" : ""}</b></div>`;
    } else if (kind === "set-foundation-vn-less") {
      const graph = safeSemanticValue("goal") || constructedSemanticRelation();
      const rows = [
        [vnNat(0), vnNat(1), "0∈1", "0<1"],
        [vnNat(0), vnNat(2), "0∈2", "0<2"],
        [vnNat(1), vnNat(2), "1∈2", "1<2"]
      ].map(([left, right, membership, order]) => {
        const ready = semanticRelationContains(graph, left, right);
        return `<article class="${ready ? "complete" : "waiting"}"><code>${membership}</code><i>⇔</i><b>${ready ? order : "?"}</b></article>`;
      }).join("");
      const complete = Boolean(safeSemanticValue("goal") && equal(safeSemanticValue("goal"), orderVnLessThree));
      title = "成员关系直接画出自然数次序";
      subtitle = "右端自然数内部恰好收着全部更小自然数";
      body = `<div class="order-vn-chain"><b>0</b><i>→</i><b>1</b><i>→</i><b>2</b><em>0 → 2</em></div><div class="order-vn-rows">${rows}</div><div class="foundation-property-strip ${complete ? "revealed" : "waiting"}"><code>m&lt;n ⇔ m∈n</code><b>${complete ? "自然数的严格次序" : ""}</b></div>`;
    } else if (kind === "set-foundation-equivalence") {
      const dishes = safeSemanticValue("quotient-block-dishes");
      const spoon = safeSemanticValue("quotient-block-spoon");
      const relation = safeSemanticValue("quotient-equivalence-relation");
      const dishesReady = Boolean(dishes && equal(dishes, quotientClassDishes));
      const spoonReady = Boolean(spoon && equal(spoon, quotientClassSpoon));
      const relationReady = Boolean(relation && equal(relation, quotientEquivalenceRelation));
      const relationCount = relation && Array.isArray(relation) ? relation.length : 0;
      title = "关系边只在同一个组内出现";
      subtitle = "组内的每一种有序连接都属于 R";
      body = `<div class="quotient-groups"><article class="${dishesReady ? "complete" : "waiting"}"><small>第一组 B</small><div><b>杯子</b><b>盘子</b></div><code>${relationReady ? "4 条组内边" : "等待 B 与组内边"}</code></article><article class="${spoonReady ? "complete" : "waiting"}"><small>第二组 C</small><div><b>勺子</b></div><code>${relationReady ? "1 条自环" : "等待 C 与自环"}</code></article></div><div class="quotient-relation-count ${relationReady ? "complete" : "waiting"}"><span>R 中已收到</span><b>${relationCount}</b><span>/ 5 条组内边</span></div><div class="quotient-three-properties"><span class="${relationReady ? "complete" : ""}">自反</span><span class="${relationReady ? "complete" : ""}">对称</span><span class="${relationReady ? "complete" : ""}">传递</span></div>`;
    } else if (kind === "set-foundation-equivalence-classes") {
      const values = [
        [quotientCup, "quotient-class-cup", quotientClassDishes],
        [quotientPlate, "quotient-class-plate", quotientClassDishes],
        [quotientSpoon, "quotient-class-spoon", quotientClassSpoon]
      ];
      const rows = values.map(([source, id, expected]) => {
        const value = safeSemanticValue(id);
        const ready = Boolean(value && equal(value, expected));
        return `<article class="${ready ? "complete" : "waiting"}"><b>${source}</b><i>R→</i><span>${source === quotientSpoon ? "勺子" : "杯子　盘子"}</span><em>⇒</em><code>${ready ? prettyCurrentSet(value) : "?"}</code></article>`;
      }).join("");
      const sameClass = Boolean(safeSemanticValue("quotient-class-cup") && safeSemanticValue("quotient-class-plate") && equal(safeSemanticValue("quotient-class-cup"), safeSemanticValue("quotient-class-plate")));
      title = "从关系的一整行读出集合";
      subtitle = "行首不同，收集结果仍可能完全相同";
      body = `<div class="quotient-class-rows">${rows}</div><div class="foundation-property-strip ${sameClass ? "revealed" : "waiting"}"><code>[杯子]ᵣ ${sameClass ? "=" : "?"} [盘子]ᵣ</code><b>${sameClass ? "同一个类" : ""}</b></div>`;
    } else if (kind === "set-foundation-partition") {
      const partition = safeSemanticValue("quotient-partition");
      const cover = safeSemanticValue("quotient-partition-cover");
      const partitionReady = Boolean(partition && equal(partition, quotientPartition));
      const coverReady = Boolean(cover && equal(cover, quotientDomain));
      title = "不同的类成为不重叠的块";
      subtitle = "展开全部块以后，每个原对象恰好出现一次";
      body = `<div class="quotient-partition-board"><article class="${partitionReady ? "complete" : "waiting"}"><small>B</small><div><b>杯子</b><b>盘子</b></div></article><article class="${partitionReady ? "complete" : "waiting"}"><small>C</small><div><b>勺子</b></div></article></div><div class="quotient-cover-row ${coverReady ? "complete" : "waiting"}"><code>⋃Π</code><i>＝</i><span>{杯子,盘子,勺子}</span></div><div class="foundation-property-strip ${partitionReady && coverReady ? "revealed" : "waiting"}"><code>${partitionReady && coverReady ? "Π = A/R" : "非空　不重叠　覆盖 A"}</code><b>${partitionReady && coverReady ? "把每个块当作一个对象" : ""}</b></div>`;
    } else if (kind === "set-foundation-quotient-projection") {
      const projection = safeSemanticValue("goal");
      const rows = [
        [quotientCup, quotientClassDishes, "{杯子,盘子}"],
        [quotientPlate, quotientClassDishes, "{杯子,盘子}"],
        [quotientSpoon, quotientClassSpoon, "{勺子}"]
      ].map(([source, target, targetLabel]) => {
        const ready = Boolean(projection && contains(projection, orderedPair(source, target)));
        return `<article class="${ready ? "complete" : "waiting"}"><b>${source}</b><i>q→</i><code>${ready ? targetLabel : "?"}</code></article>`;
      }).join("");
      const projectionReady = Boolean(projection && equal(projection, quotientProjection));
      title = "把原对象送到它所属的类";
      subtitle = "商集已经存在；现在记录每个对象变成哪个类";
      body = `<div class="quotient-set-result complete"><small>上一关得到的商集 A/R</small><code>{{杯子,盘子},{勺子}}</code></div><div class="quotient-projection-rows">${rows}</div><div class="foundation-property-strip ${projectionReady ? "revealed" : "waiting"}"><code>${projectionReady ? "杯子与盘子共享输出" : "把每个对象送到所属的类"}</code><b>${projectionReady ? "满射但非单射" : ""}</b></div>`;
    } else if (kind === "function-set-image") {
      title = "把到达的对象收成集合";
      subtitle = "B 内部有两个成员，{B} 的成员只有整个 B";
      body = functionSetCase("输入集合 {杯子,盘子}", "function-image-dishes", set(quotientCup, quotientPlate), false, "function-image-first-arrow")
        + functionSetCase("输入集合 {盘子,勺子}", "function-image-mixed", set(quotientPlate, quotientSpoon), false, "function-image-second-arrow");
    } else if (kind === "function-set-preimage") {
      title = "沿对应关系找齐输入";
      subtitle = "指定输出集合以后，把所有通向它的输入收下";
      body = functionSetCase("输出集合 {B}", "function-preimage-dishes", set(quotientClassDishes), true, "function-preimage-first-arrow")
        + functionSetCase("输出集合 {B,C}", "function-preimage-all", quotientPartition, true, "function-preimage-second-arrow");
    } else if (kind === "function-set-composition") {
      const h = safeSemanticValue("function-composition-h") || constructedFunctionOn(quotientPartition);
      const direct = safeSemanticValue("function-composition-direct") || constructedFunctionOn(quotientDomain);
      title = "两段路径与直接对应";
      subtitle = "q 已经构造；h 的每条对应会随你的有序对出现";
      body = functionCompositionDiagram(h) + `<section class="function-direct-result"><h4>你构造的直接对应</h4>${functionDirectRows(direct, [quotientCup, quotientPlate, quotientSpoon], quotientCompositeMap)}</section>`;
    } else if (kind === "function-set-identity") {
      const index = safeSemanticValue("function-identity-index") || constructedFunctionOn(foundationIndexThree);
      const letters = safeSemanticValue("function-identity-letters") || constructedFunctionOn(set("a", "b", "c"));
      title = "沿两个方向往返";
      subtitle = "两段路径已知；最后一列来自你构造的复合函数";
      body = functionRoundTripCase("从 {0,1,2} 出发", index, [structureZero, structureOne, structureTwo], foundationInverseFunction, "k", "k⁻¹")
        + functionRoundTripCase("从 {a,b,c} 出发", letters, ["a", "b", "c"], foundationInverseGraph, "k⁻¹", "k");
    } else if (kind === "natural-bijection") {
      const nSource = state.nodes.find((node) => node.id === "natural-bijection-n");
      const mSource = state.nodes.find((node) => node.id === "natural-bijection-m");
      const nSample = nSource && Array.isArray(nSource.value) ? nSource.value.length : 0;
      const mSample = mSource && Array.isArray(mSource.value) ? mSource.value.length : 1;
      const installed = (sourceId, type) => state.nodes.some((node) => node.type === type && state.connections.some((link) => link.to === node.id && link.input === 0 && link.from === sourceId));
      const forward = naturalBijectionRoute("natural-bijection-n-return", "natural-bijection-n", 0);
      const backward = naturalBijectionRoute("natural-bijection-m-return", "natural-bijection-m", 1);
      title = "两个无限集合的往返对应";
      subtitle = "右侧没有 0；图只展示有限窗口，下方给出一般理由";
      body = naturalBijectionDiagram(nSample, mSample, installed("natural-bijection-n", "vnSucc"), installed("natural-bijection-m", "union"))
        + naturalBijectionSampleControls(nSample, mSample)
        + `<div class="natural-bijection-reasons">${naturalBijectionReason(forward, "n", nSample, "natural-bijection-n-return")}${naturalBijectionReason(backward, "m", mSample, "natural-bijection-m-return")}</div>`;
    } else if (["countable-enumeration", "countable-doubling", "countable-two-copies"].includes(kind)) {
      const construction = kind === "countable-enumeration" ? "enumeration" : kind === "countable-doubling" ? "doubling" : "copies";
      title = construction === "enumeration" ? "编号与对象一同向前" : construction === "doubling" ? "每组预留两个连续位置" : "两份对象进入共同编号表";
      subtitle = construction === "enumeration" ? "展开你构造的初始对应与推进条款" : construction === "doubling" ? "起点由你的条款产生，另一个位置紧接起点" : "沿用第一关的对象生成规则与上一关的组起点";
      body = countableConstructionWorkbench(construction);
    } else if (kind === "set-foundation-reverse-failures") {
      const collisionGraph = safeSemanticValue("foundation-reverse-collision");
      const gapGraph = safeSemanticValue("foundation-reverse-gap");
      const collisionReady = Boolean(collisionGraph && equal(collisionGraph, foundationReverseCollision));
      const gapReady = Boolean(gapGraph && equal(gapGraph, foundationReverseGap));
      title = "反向后还符合函数条件吗";
      subtitle = "上方观察分叉，下方观察没有出口的输入";
      body = `<div class="foundation-reverse-board">
        <article class="${collisionReady ? "complete" : "waiting"}"><small>f 中两条边在 a 相撞</small><code>0→a　1→a</code><i>全部反向</i><div><b>a</b><span>→ ${collisionReady ? "0" : "?"}</span><span>→ ${collisionReady ? "1" : "?"}</span></div><strong>${collisionReady ? "a 有两个出口：发生分叉" : "等待 f 的反向关系"}</strong></article>
        <article class="${gapReady ? "complete" : "waiting"}"><small>g 的到达集还有 c</small><code>0→a　1→b　c 空着</code><i>全部反向</i><div><b>a→${gapReady ? "0" : "?"}</b><b>b→${gapReady ? "1" : "?"}</b><b class="gap">c→?</b></div><strong>${gapReady ? "c 没有出口：留下缺口" : "等待 g 的反向关系"}</strong></article>
      </div><div class="foundation-property-strip ${collisionReady && gapReady ? "revealed" : "waiting"}"><code>无分叉 ＋ 无缺口</code><b>${collisionReady && gapReady ? "双射才能反成函数" : ""}</b></div>`;
    } else if (kind === "set-foundation-equinumerous") {
      const graph = safeSemanticValue("goal");
      const rows = [
        [structureZero, "0", "a", "杯子"],
        [structureOne, "1", "b", "盘子"],
        [structureTwo, "2", "c", "勺子"]
      ];
      const pathRows = rows.map(([source, sourceLabel, middle, target]) => {
        const ready = Boolean(graph && contains(graph, orderedPair(source, target)));
        return `<article class="${ready ? "complete" : "waiting"}"><b>${sourceLabel}</b><i>→</i><span>${middle}</span><i>→</i><span>${target}</span><em>⇒</em><code>${ready ? `${sourceLabel}↔${target}` : "?"}</code></article>`;
      }).join("");
      const complete = Boolean(graph && equal(graph, foundationDirectBijection));
      title = "沿两段配对走到最右边";
      subtitle = "每一行的首尾将成为一条新的直接边";
      body = `<div class="foundation-equi-head"><span>{0,1,2}</span><span>{a,b,c}</span><span>{杯子,盘子,勺子}</span></div><div class="foundation-equi-paths">${pathRows}</div><div class="foundation-property-strip ${complete ? "revealed" : "waiting"}"><code>{0,1,2} ${complete ? "≈" : "?"} {杯子,盘子,勺子}</code><b>${complete ? "等势" : ""}</b></div>`;
    } else if (kind === "set-foundation-pigeonhole") {
      const graph = safeSemanticValue("goal") || constructedSemanticRelation();
      const analysis = analyzeFiniteMap(graph, [structureZero, structureOne, structureTwo], ["a", "b"]);
      const collision = analysis.complete && !analysis.injective;
      title = "三个出口只能落在两个终点";
      subtitle = "边可以任意选择；观察完成后的终点占用情况";
      body = `${foundationMappingView(graph, [structureZero, structureOne, structureTwo], ["a", "b"])}<div class="foundation-pigeon-count ${collision ? "complete" : "waiting"}"><span><b>3</b><small>不同输入</small></span><i>→</i><span><b>2</b><small>可选终点</small></span></div><div class="foundation-property-strip ${collision ? "revealed" : "waiting"}"><code>${collision ? "至少一个终点收到两条边" : "先让每个输入恰有一个出口"}</code><b>${collision ? "必然碰撞" : ""}</b></div>`;
    } else if (kind === "set-foundation-finite-index") {
      const indexSet = safeSemanticValue("foundation-index-three");
      const nestedSet = safeSemanticValue("foundation-nested-set");
      const bijection = safeSemanticValue("foundation-index-bijection");
      const indexReady = Boolean(indexSet && equal(indexSet, foundationIndexThree));
      const setReady = Boolean(nestedSet && equal(nestedSet, foundationNestedSet));
      const pairs = [
        [structureZero, "0", "a", "位置 0 已编号"],
        [structureOne, "1", "{a}", "位置 1 已编号"],
        [structureTwo, "2", "{{a}}", "位置 2 已编号"]
      ];
      const pairRows = pairs.map(([source, sourceLabel, targetLabel, detail], index) => {
        const target = ["a", foundationNestedOne, foundationNestedTwo][index];
        const ready = Boolean(bijection && contains(bijection, orderedPair(source, target)));
        return `<article class="${ready ? "complete" : "waiting"}"><b>${sourceLabel}</b><i>↔</i><code>${targetLabel}</code><span>${detail}</span></article>`;
      }).join("");
      const bijectionReady = Boolean(bijection && equal(bijection, foundationNestedBijection));
      title = "用 I₃ 完整编号 E";
      subtitle = "每个位置和每个成员都恰好使用一次";
      body = `<div class="foundation-finite-sets"><article class="${indexReady ? "complete" : "waiting"}"><small>位置集合</small><code>I₃={0,1,2}</code></article><article class="${setReady ? "complete" : "waiting"}"><small>被编号的集合</small><code>E={a,{a},{{a}}}</code></article></div><div class="foundation-index-pairs">${pairRows}</div><div class="foundation-property-strip ${bijectionReady ? "revealed" : "waiting"}"><code>I₃ ${bijectionReady ? "≈" : "?"} E</code><b>${bijectionReady ? "E 是有限集" : ""}</b></div>`;
    } else if (kind === "set-foundation-finite-extension") {
      const four = safeSemanticValue("foundation-index-four");
      const five = safeSemanticValue("foundation-index-five");
      const fourReady = Boolean(four && equal(four, foundationIndexFour));
      const fiveReady = Boolean(five && equal(five, foundationIndexFive));
      const row = (label, members, ready) => `<article class="${ready ? "complete" : "waiting"}"><b>${label}</b><div>${members.map((member) => `<span>${member}</span>`).join("")}</div><small>${members.length} 个有限位置</small></article>`;
      title = "每次扩展都有完整的有限位置表";
      subtitle = "省略号表示还能继续，不是一个已经完成的无限集合";
      body = `<div class="foundation-extension-chain">${row("I₃", ["0", "1", "2"], true)}<i>加入 3 ↓</i>${row("I₄", ["0", "1", "2", "3"], fourReady)}<i>加入 4 ↓</i>${row("I₅", ["0", "1", "2", "3", "4"], fiveReady)}<em>⋮</em></div><div class="foundation-property-strip ${fourReady && fiveReady ? "revealed" : "waiting"}"><code>任意大 ≠ 已经无限</code><b>${fourReady && fiveReady ? "每个成品仍有限" : ""}</b></div>`;
    } else if (kind === "set-foundation-singleton-injection") {
      const graph = safeSemanticValue("goal");
      const aReady = Boolean(graph && contains(graph, orderedPair("a", set("a"))));
      const bReady = Boolean(graph && contains(graph, orderedPair("b", set("b"))));
      const complete = Boolean(graph && equal(graph, foundationSingletonInjection));
      title = "在幂集中为每个对象保留一个位置";
      subtitle = "没有使用所有终点，也仍然可以是单射";
      body = `<div class="foundation-singleton-map"><article class="${aReady ? "complete" : "waiting"}"><b>a</b><i>↦</i><code>{a}</code></article><article class="${bReady ? "complete" : "waiting"}"><b>b</b><i>↦</i><code>{b}</code></article></div><div class="foundation-power-unused"><small>𝒫(A) 中暂未使用的位置</small><code>∅</code><code>{a,b}</code></div><div class="foundation-property-strip ${complete ? "revealed" : "waiting"}"><code>A ${complete ? "≼" : "?"} 𝒫(A)</code><b>${complete ? "存在单射" : ""}</b></div>`;
    } else if (kind === "set-foundation-power-cardinality") {
      const graph = safeSemanticValue("goal");
      const entries = [
        [numeral(0), empty(), "0", "∅"],
        [numeral(1), set("a"), "1", "{a}"],
        [numeral(2), set("b"), "2", "{b}"],
        [numeral(3), foundationTwoObjectSet, "3", "{a,b}"]
      ];
      const cards = entries.map(([index, subset, indexLabel, subsetLabel]) => {
        const ready = Boolean(graph && contains(graph, orderedPair(index, subset)));
        return `<article class="${ready ? "complete" : "waiting"}"><b>${indexLabel}</b><i>↔</i><code>${subsetLabel}</code></article>`;
      }).join("");
      const complete = Boolean(graph && equal(graph, foundationPowerBijection));
      title = "四个子集逐一占据四个位置";
      subtitle = "每张卡片是一种对 a、b 的完整选取方式";
      body = `<div class="foundation-power-choice-grid">${cards}</div><div class="foundation-choice-legend"><span><i></i>a 不选、b 不选</span><span><i></i>只选 a</span><span><i></i>只选 b</span><span><i></i>a、b 都选</span></div><div class="foundation-property-strip ${complete ? "revealed" : "waiting"}"><code>|A|=2　|𝒫(A)|=${complete ? "4" : "?"}</code><b>${complete ? "四种选取" : ""}</b></div>`;
    } else if (kind === "set-foundation-diagonal-subset") {
      const graph = safeSemanticValue("foundation-diagonal-function");
      const diagonal = safeSemanticValue("foundation-diagonal-set");
      const analysis = analyzeFiniteMap(graph || empty(), ["a", "b"], foundationPowerOfTwo);
      const rows = ["a", "b"].map((x) => {
        let image = null;
        try { image = analysis.complete ? applyFunction(graph, x) : null; } catch (error) { image = null; }
        const decided = image !== null;
        const inImage = decided && contains(image, x);
        const shouldEnter = decided && !inImage;
        const reflected = diagonal && (contains(diagonal, x) === shouldEnter);
        return `<article class="${decided && reflected ? "complete" : "waiting"}"><b>${x}</b><code>${decided ? prettyCurrentSet(image) : "?"}</code><span>${decided ? (inImage ? "是" : "否") : "?"}</span><em>${decided ? (shouldEnter ? "进入 D" : "不进入 D") : "等待 f(x)"}</em></article>`;
      }).join("");
      let expected = null;
      if (analysis.complete) expected = set(...["a", "b"].filter((x) => !contains(applyFunction(graph, x), x)));
      const diagonalReady = Boolean(expected && diagonal && equal(diagonal, expected));
      const missed = diagonalReady && ["a", "b"].every((x) => !equal(diagonal, applyFunction(graph, x)));
      title = "逐行翻转“属于自己的像吗”";
      subtitle = "先读 f，再决定哪些输入成为 D 的成员";
      body = `<div class="foundation-diagonal-head"><span>输入 x</span><span>f(x)</span><span>x∈f(x)?</span><span>D 的决定</span></div><div class="foundation-diagonal-rows">${rows}</div><div class="foundation-diagonal-result ${diagonalReady ? "complete" : "waiting"}"><small>对角子集</small><code>D=${diagonalReady ? prettyCurrentSet(diagonal) : "?"}</code><span>${missed ? "D≠f(a)，且 D≠f(b)" : "按照两行决定构造 D"}</span></div><div class="foundation-property-strip ${missed ? "revealed" : "waiting"}"><code>${missed ? "f 没有覆盖整个 𝒫(A)" : "D 会成为 f 遗漏的输出"}</code><b>${missed ? "不是满射" : ""}</b></div>`;
    } else if (kind === "set-foundation-vn-index") {
      const successor = safeSemanticValue("foundation-vn-successor-three");
      const index = safeSemanticValue("foundation-vn-index-three");
      const successorReady = Boolean(successor && equal(successor, foundationVnThree));
      const indexReady = Boolean(index && equal(index, foundationVnThree));
      const merged = successorReady && indexReady;
      const memberCard = (ready, label, encoding, className = "") => ready
        ? `<article class="member ${className}"><b>${label}</b><code>${encoding}</code></article>`
        : `<article class="member ghost"><b>?</b><code>等待</code></article>`;
      title = "比较两个集合的直接成员";
      subtitle = "构造方法不同；集合是否相同，只看边界内有哪些成员";
      body = `<div class="foundation-set-comparison ${merged ? "matched" : ""}">
        <section class="foundation-set-result ${successorReady ? "complete" : "waiting"}">
          <header><b>S(2)</b><small>后继得到</small></header>
          <div class="foundation-set-boundary">
            ${memberCard(successorReady, "0", "∅", "inherited")}
            ${memberCard(successorReady, "1", "{0}", "inherited")}
            ${memberCard(successorReady, "2", "{0,1}", "added")}
          </div>
          <div class="foundation-member-origin"><span class="inherited">0、1 原来就在 2 中</span><span class="added">把整个 2 作为新成员加入</span></div>
        </section>
        <section class="foundation-set-result ${indexReady ? "complete" : "waiting"}">
          <header><b>I₃</b><small>直接收集</small></header>
          <div class="foundation-set-boundary">
            ${memberCard(indexReady, "0", "∅")}
            ${memberCard(indexReady, "1", "{0}")}
            ${memberCard(indexReady, "2", "{0,1}")}
          </div>
          <div class="foundation-member-origin neutral"><span>三个有限位置：0、1、2</span></div>
        </section>
      </div>
      <div class="foundation-extensional-result ${merged ? "complete" : "waiting"}">
        <div><small>左边多出的成员</small><b>${merged ? "没有" : "…"}</b></div>
        <div><small>右边多出的成员</small><b>${merged ? "没有" : "…"}</b></div>
        <strong>${merged ? "S(2) = I₃" : "等待两个集合"}</strong>
        <p>${merged ? "直接成员完全相同，因此按照外延性，它们就是同一个集合。" : "完成两侧构造后，将逐个比较边界内的成员。"}</p>
      </div>`;
    } else if (kind === "set-foundation-inductive-entry") {
      const five = safeSemanticValue("foundation-vn-five");
      const six = safeSemanticValue("foundation-vn-six");
      const fiveReady = Boolean(five && equal(five, foundationVnFive));
      const sixReady = Boolean(six && equal(six, foundationVnSix));
      title = "有限候选的边界不断后移";
      subtitle = "后继不会在任何一个完成的 Iₙ 处停下";
      body = `<div class="foundation-boundary-chain"><article><small>有限候选 I₅</small><div><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span></div></article><i>最后成员的后继</i><b class="${fiveReady ? "complete" : "waiting"}">${fiveReady ? "5 在 I₅ 外" : "?"}</b><i>继续后继</i><b class="${sixReady ? "complete" : "waiting"}">${sixReady ? "6 又在 I₆ 外" : "?"}</b></div><div class="foundation-property-strip ${fiveReady && sixReady ? "revealed" : "waiting"}"><code>n−1∈Iₙ　但　n∉Iₙ</code><b>${fiveReady && sixReady ? "有限集不对后继封闭" : ""}</b></div>`;
    } else if (kind === "set-foundation-injection") {
      const graph = safeSemanticValue("goal") || constructedSemanticRelation();
      const analysis = analyzeFiniteMap(graph, [structureZero, structureOne], ["a", "b", "c"]);
      title = "终点会不会发生碰撞";
      subtitle = "对照函数 f：0→a，1→a；它的两条边在 a 相撞";
      body = `<div class="foundation-fixed-contrast"><small>已有函数 f</small><code>0→a　1→a</code><b>两个输入仍有唯一出口，但输出无法区分它们</b></div>
        ${foundationMappingView(graph, [structureZero, structureOne], ["a", "b", "c"])}
        <div class="foundation-property-strip ${analysis.injective ? "revealed" : "waiting"}"><code>${analysis.injective ? "不同输入 → 不同输出" : "让两条边落在不同终点"}</code><b>${analysis.injective ? "单射" : ""}</b></div>`;
    } else if (kind === "set-foundation-surjection") {
      const graph = safeSemanticValue("goal") || constructedSemanticRelation();
      const analysis = analyzeFiniteMap(graph, [structureZero, structureOne, structureTwo], ["a", "b"]);
      title = "到达集里还有没有空位";
      subtitle = "输入可以共享终点；a、b 都必须被命中";
      body = `${foundationMappingView(graph, [structureZero, structureOne, structureTwo], ["a", "b"])}
        <div class="foundation-property-strip ${analysis.surjective ? "revealed" : "waiting"}"><code>${analysis.surjective ? "a、b 都至少收到一条边" : "填满声明的到达集"}</code><b>${analysis.surjective ? "满射" : ""}</b></div>
        <div class="foundation-codomain-note"><code>→ {a,b}</code><span>当前到达集</span><i></i><code>→ {a,b,c}</code><span>若多声明 c，同一张图便不满</span></div>`;
    } else if (kind === "set-foundation-bijection") {
      const graph = safeSemanticValue("goal") || constructedSemanticRelation();
      const analysis = analyzeFiniteMap(graph, [structureZero, structureOne, structureTwo], ["a", "b", "c"]);
      title = "碰撞与空位同时消失";
      subtitle = "每个终点最终应当恰好收到一条边";
      body = `${foundationMappingView(graph, [structureZero, structureOne, structureTwo], ["a", "b", "c"])}
        <div class="foundation-two-properties"><article class="${analysis.injective ? "complete" : "waiting"}"><small>没有碰撞</small><b>单射</b></article><article class="${analysis.surjective ? "complete" : "waiting"}"><small>没有空位</small><b>满射</b></article></div>
        <div class="foundation-property-strip ${analysis.injective && analysis.surjective ? "revealed" : "waiting"}"><code>每个输入 ↔ 唯一的输出</code><b>${analysis.injective && analysis.surjective ? "双射" : ""}</b></div>`;
    } else if (kind === "set-foundation-inverse") {
      const graph = safeSemanticValue("goal") || constructedSemanticRelation();
      const analysis = analyzeFiniteMap(graph, ["a", "b", "c"], [structureZero, structureOne, structureTwo]);
      const reversed = foundationInverseFunction.map((edge) => {
        const [first, second] = decodeOrderedPair(edge);
        return orderedPair(second, first);
      });
      const steps = [
        ["0", "b", contains(graph, orderedPair("b", structureZero))],
        ["1", "c", contains(graph, orderedPair("c", structureOne))],
        ["2", "a", contains(graph, orderedPair("a", structureTwo))]
      ];
      title = "沿同一条配对来回";
      subtitle = "上行是给定的 k；你正在构造下行的 k⁻¹";
      body = `<div class="foundation-round-trips">${steps.map(([source, target, ready]) => `<article class="${ready ? "complete" : "waiting"}"><b>${source}</b><i>k→</i><span>${target}</span><i>k⁻¹→</i><b>${ready ? source : "?"}</b></article>`).join("")}</div>
        <div class="foundation-inverse-graphs"><code>k = {0→b, 1→c, 2→a}</code><code class="${equal(graph, foundationInverseGraph) ? "complete" : ""}">k⁻¹ = ${equal(graph, foundationInverseGraph) ? "{b→0, c→1, a→2}" : "{…}"}</code></div>
        <div class="foundation-property-strip ${analysis.complete && equal(set(...reversed), graph) ? "revealed" : "waiting"}"><code>所有箭头已经反向</code><b>${analysis.complete && equal(set(...reversed), graph) ? "逆函数" : ""}</b></div>`;
    } else if (kind === "set-membership-layers") {
      const aSet = safeSemanticValue("foundation-membership-a");
      const cSet = safeSemanticValue("foundation-membership-c");
      const aReady = Boolean(aSet && equal(aSet, foundationSetA));
      const cReady = Boolean(cSet && equal(cSet, foundationWrappedA));
      title = "最外层决定直接成员";
      subtitle = "内层集合保持为一个完整对象";
      body = `<div class="foundation-layer-tree">
        <article class="outer ${cReady ? "complete" : "waiting"}"><small>C 的最外层</small><b>C</b><div class="foundation-inner-set"><span>A</span><i>a</i><i>b</i></div></article>
        <article class="${aReady ? "complete" : "waiting"}"><small>A 的最外层</small><b>A</b><div><i>a</i><i>b</i></div></article>
      </div><div class="foundation-fact-list"><span class="${aReady ? "complete" : ""}"><code>a∈A　b∈A</code><b>直接出现</b></span><span class="${cReady ? "complete" : ""}"><code>A∈C</code><b>整个 A 出现</b></span><span class="${cReady ? "complete" : ""}"><code>a∉C　b∉C</code><b>没有穿透外层</b></span></div>`;
    } else if (kind === "set-subset-contrast") {
      const cSet = safeSemanticValue("foundation-subset-c");
      const bSet = safeSemanticValue("foundation-subset-b");
      const cReady = Boolean(cSet && equal(cSet, foundationWrappedA));
      const bReady = Boolean(bSet && equal(bSet, foundationSetB));
      title = "两种包含不会混在一起";
      subtitle = "左边收下整个 A；右边保留 A 的成员";
      body = `<div class="foundation-containment-board">
        <article class="${cReady ? "complete" : "waiting"}"><small>C={A}</small><div class="whole-set"><b>A</b><span>{a,b}</span></div><code>A∈C</code><p>C 的直接成员只有 A</p></article>
        <article class="${bReady ? "complete" : "waiting"}"><small>B=A∪{c}</small><div class="member-chips"><i>a</i><i>b</i><i>c</i></div><code>A⊆B</code><p>A 的每个成员都留在 B 中</p></article>
      </div><div class="foundation-contrast-result ${cReady && bReady ? "revealed" : "waiting"}"><code>A∈C</code><i>≠</i><code>A⊆B</code></div>`;
    } else if (kind === "set-power-two") {
      const result = safeSemanticValue("goal");
      const produced = state.nodes.filter((node) => node.out === "set").map((node) => { try { return evaluateNode(node.id); } catch (_) { return null; } });
      const has = (candidate) => produced.some((item) => item && equal(item, candidate));
      const ready = [has(empty()), has(set("a")), has(set("b")), true];
      const powerReady = Boolean(result && equal(result, foundationPowerA));
      title = "A={a,b} 的全部选取方式";
      subtitle = "每个亮起的对象本身都是一个集合";
      body = `<div class="foundation-power-lattice">
        <article class="top ${ready[3] ? "complete" : ""}"><code>{a,b}</code><span>两个都选</span></article>
        <div><article class="${ready[1] ? "complete" : "waiting"}"><code>{a}</code><span>只选 a</span></article><article class="${ready[2] ? "complete" : "waiting"}"><code>{b}</code><span>只选 b</span></article></div>
        <article class="bottom ${ready[0] ? "complete" : "waiting"}"><code>∅</code><span>什么都不选</span></article>
      </div><div class="foundation-power-result ${powerReady ? "revealed" : "waiting"}"><small>把四种子集收成一个集合</small><code>${powerReady ? "𝒫(A)={∅,{a},{b},A}" : "等待 𝒫(A)"}</code><b>${powerReady ? "X∈𝒫(A) ⇔ X⊆A" : ""}</b></div>`;
    } else if (kind === "recursion-value-flow") {
      const completeOfType = (type) => state.nodes.filter((node) => node.type === type).filter((node) => {
        try { evaluateNode(node.id); return true; } catch (_) { return false; }
      }).length;
      const leaves = Math.min(3, completeOfType("valuationFn"));
      const conjunctions = Math.min(2, completeOfType("truthAndApply"));
      title = "同一棵树，值由下向上产生";
      subtitle = "亮起的节点只来自已经完成的接线";
      body = `<div class="recursion-live-tree"><article class="root ${conjunctions >= 2 ? "complete" : ""}"><code>∧</code><small>${conjunctions >= 2 ? "假" : "?"}</small></article><div class="tree-level"><article class="${leaves >= 1 ? "complete" : ""}"><code>P</code><small>${leaves >= 1 ? "真" : "?"}</small></article><article class="${conjunctions >= 1 ? "complete" : ""}"><code>∧</code><small>${conjunctions >= 1 ? "假" : "?"}</small></article></div><div class="tree-level lower"><span></span><article class="${leaves >= 2 ? "complete" : ""}"><code>Q</code><small>${leaves >= 2 ? "假" : "?"}</small></article><article class="${leaves >= 3 ? "complete" : ""}"><code>P</code><small>${leaves >= 3 ? "真" : "?"}</small></article></div></div><div class="recursion-direction-note"><b>构造公式</b><span>叶 → 根</span><i></i><b>产生真值</b><span>子公式值 → 父公式值</span></div>`;
    } else if (kind === "recursion-term-clauses") {
      const xValue = safeSemanticValue("recursion-term-x"), cValue = safeSemanticValue("recursion-term-c"), nestedValue = safeSemanticValue("recursion-term-ffx");
      const clause = (titleText, formula, value, expected) => `<article class="${equal(value, expected) ? "complete" : "waiting"}"><small>${titleText}</small><code>${formula}</code><b>${value ? escapeHtml(String(value)) : "?"}</b></article>`;
      title = "三种构造，三条路径";
      subtitle = "函数项会再次调用较小子项已经产生的值";
      body = `<div class="recursion-clause-list">${clause("变量", "x → s(x)", xValue, "杯子")}${clause("常元", "c → cᴹ", cValue, "盘子")}${clause("嵌套函数项", "x → s → fᴹ → fᴹ", nestedValue, "杯子")}</div><div class="recursion-nesting-trace"><code>f(f(x))</code><span>外层 f 必须等待内层 f(x) 的对象值</span></div>`;
    } else if (kind === "completeness-concrete-replay") {
      const reached = (type, formula) => state.nodes.some((node) => {
        if (node.type !== type) return false;
        try {
          const value = evaluateNode(node.id);
          return value && value.kind === "proof" && equalFormula(value.conclusion, formula);
        } catch (_) { return false; }
      });
      const witnessReady = reached("existsFlag", py);
      const lawReady = reached("forallElim", F.imp(py, qy));
      const qReady = reached("impElim", qy);
      const hiddenReady = reached("existsIntro", existentialQ);
      const conflictReady = reached("notElim", bottomFormula);
      const outsideReady = (() => {
        try {
          const value = evaluateNode("concrete-replay-close");
          return value && value.kind === "proof" && value.rule === "existsElim" && value.conclusion.kind === "bottom";
        } catch (_) { return false; }
      })();
      const trailStep = (ready, formula, note) => `<article class="${ready ? "complete" : "waiting"}"><code>${formula}</code><span>${ready ? note : "等待你的推导"}</span></article>`;
      title = "同一个见证的行程";
      subtitle = "P(x)：x 是杯子　　Q(x)：x 在桌上";
      body = `<div class="witness-replay-world">
        <div class="witness-replay-scene"><article class="replay-cup ${witnessReady ? "named" : ""} ${qReady ? "on-table" : ""}"><b>杯子</b>${witnessReady && !hiddenReady ? "<i>y</i>" : ""}<small>${qReady ? "已经被推出在桌上" : (witnessReady ? "旗内暂称为 y" : "等待存在旗")}</small></article><article class="replay-plate"><b>盘子</b><small>没有参与这次见证推理</small></article><div class="replay-table ${qReady ? "occupied" : ""}"><span>桌面 · Q</span><b>${qReady ? "杯子" : "空"}</b><em>反模型要求：¬∃xQ(x)</em></div></div>
        <div class="witness-proof-trail">
          ${trailStep(witnessReady, "P(y)", "存在旗给见证临时命名")}
          ${trailStep(lawReady, "P(y)→Q(y)", "同一个 y 进入全称规律")}
          ${trailStep(qReady, "Q(y)", "见证被推出在桌上")}
          ${trailStep(hiddenReady, "∃xQ(x)", "y 被量词重新隐藏")}
          ${trailStep(conflictReady, "⊥", "与 ¬∃xQ(x) 正面冲突")}
        </div>
      </div><div class="semantic-live-result ${conflictReady ? "conflict" : ""}"><small>${outsideReady ? "存在旗已经关闭" : (conflictReady ? "矛盾已经不含 y" : "推导正在进行")}</small><code>${outsideReady ? "⊥ 留在旗外" : (conflictReady ? "现在可以使用 ∃E" : "沿同一个 y 向下推")}</code></div>`;
    } else if (kind === "assignment") {
      const graph = safeSemanticValue() || latestSemanticNodeValue("set2") || latestSemanticSetProgress() || constructedSemanticRelation();
      const xValue = semanticAssignmentValue(graph, "x"), yValue = semanticAssignmentValue(graph, "y");
      title = "变量指向论域对象";
      body = `${semanticAssignmentView(xValue, yValue, "正在构造的 s")}${semanticDomainView(null, [xValue, yValue].filter(Boolean))}
        <div class="semantic-live-result"><small>当前记录</small><code>${xValue && yValue ? "s：x↦a，y↦b" : "s：x↦?，y↦?"}</code></div>`;
    } else if (kind === "term") {
      const value = safeSemanticValue() || latestSemanticNodeValue("applyGraph");
      title = "项从语法进入模型";
      body = `${semanticAssignmentView("a", "b", "已经构造的 s")}${semanticDomainView(null, value ? [value] : [])}
        <div class="semantic-flow-line"><code>x</code><i>经 s</i><b>${value ? escapeHtml(prettyCurrentSet(value)) : "?"}</b></div>
        ${semanticPathStatus(Boolean(value), equal(value, "a"), "s(x)=a", "x 当前没有指向 a")}`;
    } else if (kind === "predicate") {
      const value = safeSemanticValue() || latestSemanticNodeValue("assignmentS");
      const known = Boolean(value), ok = known && contains(semanticPOnlyA, value);
      title = "P 在模型中适用于谁";
      subtitle = "Pᴹ={a} 与当前对象始终同时可见";
      body = `<div class="semantic-notation"><span>谓词解释</span><code>Pᴹ=${semanticSetLabel(semanticPOnlyA)}</code></div>${semanticDomainView(semanticPOnlyA, value ? [value] : [])}
        <div class="semantic-flow-line"><code>x</code><i>经 s</i><b>${value ? escapeHtml(prettyCurrentSet(value)) : "?"}</b><i>送入</i><code>P(□)</code></div>
        ${semanticPathStatus(known, ok, "𝔐,s ⊨ P(x)", "𝔐,s ⊭ P(x)")}`;
    } else if (kind === "relation") {
      const pair = safeSemanticValue() || latestSemanticNodeValue("ord");
      const known = Boolean(semanticPairParts(pair)), ok = known && semanticRelationContains(semanticRelation, ...semanticPairParts(pair));
      title = "R 在模型中的有向边";
      subtitle = `Rᴹ=${semanticSetLabel(semanticRelation)}`;
      body = `<div class="semantic-live-result"><small>当前构造的对象对</small><code>${semanticPairLabel(pair)}</code></div>${semanticRelationView(semanticRelation, pair)}
        ${semanticPathStatus(known, ok, "这条边在 Rᴹ 中：𝔐,s ⊨ R(x,y)", "这条边不在 Rᴹ 中")}`;
    } else if (kind === "assignment-update") {
      const graph = safeSemanticValue() || latestSemanticNodeValue("set2") || latestSemanticSetProgress() || constructedSemanticRelation();
      const xValue = semanticAssignmentValue(graph, "x"), yValue = semanticAssignmentValue(graph, "y");
      title = "只移动 x 的指向";
      body = `<div class="semantic-assignment-compare">${semanticAssignmentView("a", "b", "原赋值 s")}${semanticAssignmentView(xValue, yValue, "更新后 s[x↦b]")}</div>
        ${semanticDomainView(null, [xValue, yValue].filter(Boolean))}${semanticPathStatus(Boolean(xValue && yValue), equal(xValue, "b") && equal(yValue, "b"), "x 已改指 b；y 仍指 b", "只应改动 x 的去向")}`;
    } else if (kind === "open-compare") {
      const sValue = safeSemanticValue("vary-s-goal") || latestSemanticNodeValue("assignmentS");
      const tValue = safeSemanticValue("vary-t-goal") || latestSemanticNodeValue("assignmentT");
      const lane = (name, value) => `<article class="semantic-eval-lane ${value ? (contains(semanticPOnlyA, value) ? "pass" : "fail") : "waiting"}"><small>赋值 ${name}</small><div><code>x</code><i>→</i><b>${value ? escapeHtml(prettyCurrentSet(value)) : "?"}</b><i>→</i><code>P(x)</code></div><strong>${!value ? "等待接入" : (contains(semanticPOnlyA, value) ? "成立 ✓" : "不成立 ×")}</strong></article>`;
      title = "同一个 P(x)，两条赋值通道";
      subtitle = "模型保持 Pᴹ={a}";
      body = `${semanticDomainView(semanticPOnlyA, [sValue, tValue].filter(Boolean))}<div class="semantic-lane-list">${lane("s", sValue)}${lane("t", tValue)}</div>`;
    } else if (kind === "existential-counterexample") {
      const sGraph = safeSemanticValue("witness-s-goal");
      const tGraph = safeSemanticValue("witness-t-goal");
      const sValue = semanticAssignmentValue(sGraph, "y"), tValue = semanticAssignmentValue(tGraph, "y");
      const lane = (name, value) => {
        const known = Boolean(value), pTrue = value === "杯子";
        return `<article class="witness-counterexample-lane ${known ? (pTrue ? "pass" : "fail") : "waiting"}"><header>赋值 ${name}</header><div><code>y</code><i>→</i><b>${known ? escapeHtml(value) : "?"}</b><i>→</i><code>P(y)</code><strong>${known ? (pTrue ? "真" : "假") : "等待"}</strong></div><footer><code>∃xP(x)</code><b>真</b><span>见证始终是杯子</span></footer></article>`;
      };
      title = "存在句不读取预先写好的 y";
      subtitle = "固定世界：D={杯子,盘子}，Pᴹ={杯子}";
      body = `<div class="witness-world"><article class="semantic-object-card has-p"><span>杯子</span><b>P</b></article><article class="semantic-object-card"><span>盘子</span></article></div><div class="witness-counterexample-grid">${lane("s", sValue)}${lane("t", tValue)}</div>
        ${semanticPathStatus(Boolean(sValue && tValue), sValue === "杯子" && tValue === "盘子", "存在句保持为真，P(y) 却一真一假", "让两份赋值把 y 分别指向杯子和盘子")}`;
    } else if (kind === "forall-flag-counterexample") {
      const graph = safeSemanticValue() || latestSemanticNodeValue("set1");
      const yValue = semanticAssignmentValue(graph, "y");
      const known = Boolean(yValue), pyTrue = yValue === "杯子";
      title = "P(y) 真，不等于每个对象都有 P";
      subtitle = "固定世界：D={杯子,盘子}，Pᴹ={杯子}";
      body = `<div class="witness-world"><article class="semantic-object-card has-p"><span>杯子</span><b>P</b></article><article class="semantic-object-card"><span>盘子</span></article></div>
        <div class="semantic-lane-list"><article class="semantic-eval-lane ${known && pyTrue ? "pass" : "waiting"}"><small>普通变量读取赋值 s</small><div><code>y</code><i>→</i><b>${known ? escapeHtml(yValue) : "?"}</b><i>→</i><code>P(y)</code></div><strong>${known ? (pyTrue ? "真 ✓" : "假 ×") : "等待接入"}</strong></article></div>
        <div class="semantic-quantifier-lanes"><article class="pass"><code>x↦杯子</code><span>P(杯子)</span><b>✓</b></article><article class="fail"><code>x↦盘子</code><span>P(盘子)</span><b>×</b></article></div>
        ${semanticPathStatus(known && pyTrue, false, "", "P(y) 为真，但 ∀xP(x) 为假")}`;
    } else if (kind === "induction-chain") {
      const reached = (index) => state.nodes.some((node) => {
        try {
          const value = evaluateNode(node.id);
          return value && value.kind === "inductionEvidence" && equal(value.target, zNat(index));
        } catch (_) { return false; }
      });
      const stages = [0, 1, 2, 3].map((index) => `<div class="induction-chain-stage ${reached(index) ? "reached" : "waiting"}"><span>${index}</span><b>𝒜(${index})</b><small>${reached(index) ? "依据已到达" : "等待前一层"}</small></div>`).join(`<i class="induction-chain-arrow">→</i>`);
      title = "依据沿具体后继逐层移动";
      subtitle = "三张依据彼此分开";
      body = `<div class="induction-chain-board">${stages}</div><p class="induction-live-note">对象每经过一次后继，性质依据也只能前进一层。</p>`;
    } else if (kind === "induction-template-instances") {
      const instances = [0, 1, 2].map((index) => safeSemanticValue(["induction-instance-zero", "induction-instance-one", "induction-instance-two"][index]));
      title = "三个实例只共享形状";
      subtitle = "它们没有接收或制造任何性质依据";
      body = `<div class="induction-instance-list">${instances.map((instance, index) => {
        const ready = Boolean(instance && instance.kind === "inductionStepInstance" && equal(instance.number, zNat(index)));
        return `<article class="${ready ? "complete" : "waiting"}"><small>n=${index}</small><code>𝒜(${index}) ⇒ 𝒜(${index + 1})</code><b>${ready ? "形状已记录 ✓" : "等待实例"}</b></article>`;
      }).join("")}</div><div class="induction-empty-frame"><code>[𝒜(n)]　⋮　𝒜(S(n))</code><span>中间仍等待具体数学论证</span></div>`;
    } else if (kind === "induction-hypothesis") {
      const base = safeSemanticValue("induction-property-base"), step = safeSemanticValue("induction-property-step");
      const baseReady = Boolean(base && equal(base, zNat(0)));
      const stepReady = Boolean(step && step.kind === "inductionPathEndpoint" && step.expression === "S(n)");
      title = "一条路径有起点，也能继续延长";
      subtitle = "S 始终只是已经熟悉的后继操作";
      body = `<div class="induction-property-board"><article class="${baseReady ? "complete" : "waiting"}"><header>路径的起点</header><div class="induction-path"><code>0</code></div><footer>${baseReady ? "零步便能从 0 到达 0 ✓" : "把 0 接入零步路径"}</footer></article><article class="${stepReady ? "complete" : "waiting"}"><header>把已有路径延长一步</header><div class="property-assumption"><small>这一步内临时采用</small><code>0 → … → n</code></div><div class="induction-path"><code>0 → … → n</code><i>经 S</i><b>${stepReady ? "S(n)" : "?"}</b></div><footer>${stepReady ? "留下延长任意路径的方法 ✓" : "用 S 延长当前终点"}</footer></article></div>`;
    } else if (kind === "induction-two-parts") {
      const incomingValue = (inputIndex) => {
        const connection = state.connections.find((item) => item.to === "induction-template-node" && item.input === inputIndex);
        return connection ? safeSemanticValue(connection.from) : null;
      };
      const base = incomingValue(0), step = incomingValue(1);
      const baseIndex = base && base.kind === "inductionEvidence" ? zermeloIndex(base.target) : -1;
      const generalStep = Boolean(step && step.kind === "inductionClause" && step.general);
      const concreteStep = Boolean(step && step.kind === "inductionClause" && !step.general);
      const reached = [0, 1, 2, 3].map((index) => {
        if (baseIndex < 0) return false;
        if (index === baseIndex) return true;
        if (generalStep && index > baseIndex) return true;
        return concreteStep && baseIndex === step.fromIndex && index === step.toIndex;
      });
      const arrows = [0, 1, 2].map((index) => generalStep || (concreteStep && step.fromIndex === index && step.toIndex === index + 1));
      const chain = reached.map((on, index) => `<span class="${on ? "on" : "off"}">${index}</span>${index < arrows.length ? `<i class="${arrows[index] ? "on" : "off"}">→</i>` : ""}`).join("");
      const correctBase = baseIndex === 0, correctStep = generalStep;
      const baseNote = baseIndex < 0 ? "尚未选择起点" : (correctBase ? "从 0 启动 ✓" : "从 1 启动会漏掉 0");
      const stepNote = !step ? "尚未选择步骤" : (correctStep ? "每条边都能使用 ✓" : "这一步只能跨过 0→1");
      title = "哪些材料能够覆盖整条后继链？";
      subtitle = "圆点表示已有依据，亮起的箭头表示步骤可以使用";
      body = `<div class="induction-coverage-board"><div class="induction-coverage-chain">${chain}<b>…</b></div><div class="induction-choice-status"><article class="${correctBase ? "correct" : (base ? "wrong" : "waiting")}"><small>第一份依据</small><b>${baseNote}</b></article><article class="${correctStep ? "correct" : (step ? "wrong" : "waiting")}"><small>后继步骤</small><b>${stepNote}</b></article></div></div>${semanticPathStatus(Boolean(base || step), correctBase && correctStep, "起点与可重复步骤已经覆盖整条链", "继续寻找不会遗漏任何自然数的两张卡")}`;
    } else if (kind === "induction-history") {
      const reached = Array.from({ length: 5 }, (_, index) => state.nodes.some((node) => {
        try { return equal(evaluateNode(node.id), zNat(index)); }
        catch (_) { return false; }
      }));
      const lastReached = reached.reduce((last, current, index) => current ? index : last, 0);
      const rows = reached.map((active, index) => {
        const objectNote = index === 0 ? "构造起点" : `第 ${index} 次 S 后`;
        const evidenceNote = index === 0 ? "归纳基础" : `n=${index - 1} 的推步实例`;
        const connector = index === 0 ? "" : `<div class="induction-history-connector ${active ? "active" : "waiting"}"><span>S</span><i>同步</i><span>n=${index - 1}</span></div>`;
        return `${connector}<div class="induction-history-pair ${active ? "reached" : "waiting"}"><article><small>对象构造</small><code>${index}</code><b>${objectNote}</b></article><i>↔</i><article><small>依据展开</small><code>𝒜(${index})</code><b>${evidenceNote}</b></article></div>`;
      }).join("");
      title = "对象怎样生成，依据就怎样展开";
      subtitle = `构造目前到达 ${lastReached}；没有额外的“传播”操作`;
      body = `<div class="induction-parallel-history">${rows}</div>${semanticPathStatus(lastReached > 0, reached[4], "两段有限历史已经逐层对齐", "继续延长对象构造，右侧会同步出现对应的推步实例")}`;
    } else if (kind === "induction-tree-intro") {
      const innerReady = state.nodes.some((node) => {
        try { return equalFormula(evaluateNode(node.id), conjunctionFormula); }
        catch (_) { return false; }
      });
      const root = safeSemanticValue("goal");
      const rootReady = Boolean(root && equalFormula(root, F.and(conjunctionFormula, bottomFormula)));
      title = "公式的直接构造关系正在形成一棵树";
      subtitle = "边连接复合公式与它的直接子公式，不表示推理";
      body = `<div class="induction-construction-tree"><div class="construction-tree-node root ${rootReady ? "ready" : "waiting"}"><small>根</small><b>∧</b><code>${rootReady ? "(P∧Q)∧⊥" : "?"}</code></div><div class="construction-tree-children"><div class="construction-subtree"><div class="construction-tree-node ${innerReady ? "ready" : "waiting"}"><small>内部节点</small><b>∧</b><code>${innerReady ? "P∧Q" : "?"}</code></div><div class="construction-tree-children leaves"><div class="construction-tree-node leaf ready"><small>叶</small><code>P</code></div><div class="construction-tree-node leaf ready"><small>叶</small><code>Q</code></div></div></div><div class="construction-tree-node leaf ready"><small>叶</small><code>⊥</code></div></div></div>${semanticPathStatus(innerReady, rootReady, "两个二元构造已经形成完整语法树", "先完成内层 P∧Q，再让它与 ⊥ 汇入新的根")}`;
    } else if (kind === "induction-syntax") {
      const term = safeSemanticValue("induction-term-case"), unary = safeSemanticValue("induction-unary-formula-case"), binary = safeSemanticValue("induction-binary-formula-case");
      const cards = [
        ["项构造", "一份直接子项", "𝒯(t) ⇒ 𝒯(f(t))", Boolean(term && equalFormula(term, F.func(arbitraryTermT)))],
        ["单输入公式构造", "一份直接子公式", "𝒜(A) ⇒ 𝒜(∀xA)", Boolean(unary && equalFormula(unary, F.forall(F.variable, schemaA)))],
        ["双输入公式构造", "两份直接子公式", "𝒜(A),𝒜(B) ⇒ 𝒜(A∧B)", Boolean(binary && equalFormula(binary, F.and(schemaA, schemaB)))]
      ];
      title = "语法构造正在显露归纳接口";
      subtitle = "输入数量来自根的直接子结构";
      body = `<div class="induction-syntax-cases">${cards.map(([name, inputs, rule, ready]) => `<article class="${ready ? "complete" : "waiting"}"><small>${name}</small><b>${inputs}</b><code>${rule}</code><i>${ready ? "✓" : "○"}</i></article>`).join("")}</div>`;
    } else if (kind === "induction-formula-finiteness") {
      const hasFormula = (expected) => state.nodes.some((node) => {
        try { return node.out === "formula" && equalFormula(evaluateNode(node.id), expected); }
        catch (_) { return false; }
      });
      const px = F.pred(F.variable);
      const rxy = F.rel(F.variable, F.variableNamed("y"));
      const existsRxy = F.exists(F.variableNamed("y"), rxy);
      const implication = F.imp(px, existsRxy);
      const whole = F.forall(F.variable, implication);
      const stages = [
        ["原子基础", "P(x)", "公式层的一片叶子", hasFormula(px)],
        ["原子基础", "R(x,y)", "公式层的一片叶子", hasFormula(rxy)],
        ["一元构造", "∃yR(x,y)", "有限子树上增加一个根", hasFormula(existsRxy)],
        ["二元构造", "P(x)→∃yR(x,y)", "等待两棵直接子树", hasFormula(implication)],
        ["一元构造", "∀x(P(x)→∃yR(x,y))", "有限子树上增加最后的根", Boolean(safeSemanticValue("goal") && equalFormula(safeSemanticValue("goal"), whole))]
      ];
      title = "有限性正沿直接子公式向根生长";
      subtitle = "性质标记只出现在观察台，不是可拖动的证明零件";
      body = `<div class="induction-finiteness-stages">${stages.map(([kindLabel, formula, note, ready]) => `<article class="${ready ? "complete" : "waiting"}"><small>${kindLabel}</small><code>${formula}</code><span>${note}</span><b>${ready ? "有限 ✓" : "等待构造"}</b></article>`).join("")}</div>`;
    } else if (kind === "soundness-local-step") {
      const result = safeSemanticValue("goal");
      const ready = Boolean(result && result.kind === "proof" && equalFormula(result.conclusion, F.prop("Q")));
      title = "横线上方全真时，结论不能掉成假";
      subtitle = "当前赋值：P=真，Q=真";
      body = `<div class="soundness-local-rule"><div><article class="true"><small>规则前提</small><code>P→Q</code><b>真</b></article><article class="true"><small>规则前提</small><code>P</code><b>真</b></article></div><i>→E</i><article class="${ready ? "true" : "waiting"}"><small>规则结论</small><code>Q</code><b>${ready ? "真" : "等待推导"}</b></article></div>${semanticPathStatus(ready, ready, "这一次规则应用保持了真", "把两条前提送入 →E")}`;
    } else if (kind === "soundness-or-cases") {
      const left = safeSemanticValue("soundness-or-left-intro");
      const right = safeSemanticValue("soundness-or-right-intro");
      const result = safeSemanticValue("goal");
      const leftReady = Boolean(left && left.kind === "proof" && equalFormula(left.conclusion, swappedDisjunction));
      const rightReady = Boolean(right && right.kind === "proof" && equalFormula(right.conclusion, swappedDisjunction));
      const merged = Boolean(result && result.kind === "proof" && result.rule === "orElim");
      title = "P∨Q 成立的方式必须全部被覆盖";
      subtitle = "哪一边实际为真并不预先确定";
      body = `<div class="soundness-case-board"><article class="${leftReady ? "complete" : "waiting"}"><small>P 为真</small><code>[P] ⋮ Q∨P</code><b>${leftReady ? "左路安全 ✓" : "完成左分支"}</b></article><article class="${rightReady ? "complete" : "waiting"}"><small>Q 为真</small><code>[Q] ⋮ Q∨P</code><b>${rightReady ? "右路安全 ✓" : "完成右分支"}</b></article><div class="${merged ? "complete" : "waiting"}"><span>两类覆盖 P∨Q 的全部真实方式</span><code>${merged ? "Q∨P" : "等待共同结论"}</code></div></div>`;
    } else if (kind === "soundness-flags") {
      const pExtension = safeSemanticValue("soundness-flag-p");
      const assignment = safeSemanticValue("soundness-flag-s");
      const pReady = Boolean(pExtension && equal(pExtension, set("杯子")));
      const sReady = Boolean(assignment && equal(assignment, set(orderedPair("y", "杯子"))));
      title = "一个对象上的真，不是所有对象上的真";
      subtitle = "D={杯子,盘子}；Flag 阻止名字偷带固定身份";
      body = `<div class="soundness-flag-board"><section><small>普通名字当前所指</small><code>s(y)=${sReady ? "杯子" : "?"}</code><article class="${pReady && sReady ? "true" : "waiting"}"><span>P(y)</span><b>${pReady && sReady ? "真" : "等待模型"}</b></article></section><i>不能直接推出</i><section><small>遍历整个论域</small><code>Pᴹ=${pReady ? "{杯子}" : "?"}</code><article class="${pReady ? "false" : "waiting"}"><span>∀xP(x)</span><b>${pReady ? "假：盘子失败" : "等待模型"}</b></article></section></div><p class="soundness-flag-note">⚑ 任意名字：不由当前赋值或外部前提预先选定对象</p>`;
    } else if (kind === "soundness-general-induction") {
      const linked = (from, to, inputIndex) => state.connections.some((connection) => connection.from === from && connection.to === to && connection.input === inputIndex);
      const baseReady = linked("soundness-meta-membership", "soundness-general-base", 0) && linked("soundness-meta-gamma", "soundness-general-base", 1);
      const premisesReady = linked("soundness-meta-smaller", "soundness-general-step", 0);
      const stepReady = premisesReady && linked("soundness-meta-local", "soundness-general-step", 1);
      title = "一份任意证明正在变成可靠性定理";
      subtitle = "归纳覆盖证明高度；逐条语义验证负责最后规则";
      body = `<div class="soundness-general-stages"><article class="${baseReady ? "complete" : "waiting"}"><small>h(π)=0</small><code>A∈Γ，𝔐,s⊨Γ</code><b>${baseReady ? "𝔐,s⊨A ✓" : "完成归纳基础"}</b></article><article class="${premisesReady ? "complete" : "waiting"}"><small>h(π)=n+1</small><code>h(πᵢ)≤n</code><b>${premisesReady ? "规则前提全真 ✓" : "使用归纳假设"}</b></article><article class="${stepReady ? "complete" : "waiting"}"><small>最后规则 r</small><code>B₁,…,Bₖ / A</code><b>${stepReady ? "𝔐,s⊨A ✓" : "接上局部保真"}</b></article></div><div class="soundness-rule-atlas"><p><b>真值规则</b><span>∧I/E · ∨I · →E · ¬E · ⊥E</span></p><p><b>范围规则</b><span>→I · ¬I · RAA · ∨E</span></p><p><b>量词规则</b><span>∀I/E · ∃I/E · Flag</span></p><p><b>等号规则</b><span>=I · =E</span></p></div>${semanticPathStatus(baseReady && stepReady, baseReady && stepReady, "Γ⊢A ⇒ Γ⊨A", "完成归纳的两个情形")}`;
    } else if (kind === "soundness-proof-height") {
      const direct = safeSemanticValue("proof-height-direct");
      const derived = safeSemanticValue("proof-height-derived");
      const directReady = Boolean(direct && direct.kind === "proof" && direct.rule === "given" && equalFormula(direct.conclusion, F.prop("Q")));
      const derivedReady = Boolean(derived && derived.kind === "proof" && derived.rule === "andElim2" && equalFormula(derived.conclusion, F.prop("Q")));
      title = "公式相同，证明树却可以不同高";
      subtitle = "高度数的是从前提叶到根的规则层数";
      body = `<div class="soundness-height-comparison"><article class="${directReady ? "complete" : "waiting"}"><small>直接作为前提</small><code>Q</code><b>${directReady ? "h=0" : "等待 Q"}</b><span>没有规则步骤</span></article><article class="${derivedReady ? "complete" : "waiting"}"><small>从合取中取得</small><code>P∧Q ⟶ Q</code><b>${derivedReady ? "h=1" : "等待 ∧E₂"}</b><span>在前提叶上增加一层</span></article></div><div class="soundness-height-definition"><code>h(前提叶)=0</code><code>h(r(π₁,…,πₖ))=1+max h(πᵢ)</code></div>${semanticPathStatus(directReady && derivedReady, directReady && derivedReady, "两个 Q 已经拥有不同的证明高度", "分别完成两份 Q 的证明")}`;
    } else if (kind === "soundness-proof-tree" || kind === "soundness-structural-proof") {
      const hasProof = (expected, rule = null) => state.nodes.some((node) => {
        if (node.out !== "proof") return false;
        try {
          const proof = evaluateNode(node.id);
          return proof && proof.kind === "proof" && equalFormula(proof.conclusion, expected) && (!rule || proof.rule === rule);
        } catch (_) { return false; }
      });
      const qReady = hasProof(F.prop("Q"), "andElim2");
      const rReady = hasProof(soundnessR, "impElim");
      const finalProof = safeSemanticValue("goal");
      const extended = kind === "soundness-structural-proof";
      const finalReady = Boolean(finalProof && finalProof.kind === "proof" && equalFormula(finalProof.conclusion, extended ? soundnessProofTarget : soundnessR));
      const stages = [
        [extended ? "前提叶 · h=0" : "前提叶", "P∧Q，Q→R", "模型满足 Γ，所以为真", true],
        [extended ? "一元规则 · h=1" : "一元规则", "P∧Q ⟶ Q", extended ? "子证明 h=0，∧E₂ 保持真" : "∧E₂ 保持真", qReady],
        [extended ? "二元规则 · h=2" : "二元规则", "Q→R，Q ⟶ R", extended ? "子证明 h=0、1，→E 保持真" : "→E 保持真", rReady]
      ];
      if (extended) stages.push(["二元规则 · h=3", "R，Q ⟶ R∧Q", "直接子证明 h=2、1；∧I 保持真", finalReady]);
      title = extended ? "归纳正沿证明高度上升" : "真正从前提叶逐层到达根";
      subtitle = extended ? "每个规则根都只依赖高度更小的直接子证明" : "当前模型满足 Γ={P∧Q,Q→R}";
      body = `<div class="soundness-proof-stages">${stages.map(([stage, formulas, note, ready]) => `<article class="${ready ? "complete" : "waiting"}"><small>${stage}</small><code>${formulas}</code><span>${note}</span><b>${ready ? "真 ✓" : "等待下层"}</b></article>`).join("")}</div>${semanticPathStatus(finalReady, finalReady, extended ? "整棵有限证明树保持真" : "根 R 已经为真", "继续完成证明树")}`;
    } else if (kind === "sentence-model-filter") {
      const formulas = [safeSemanticValue("filter-model-all"), safeSemanticValue("filter-model-cup"), safeSemanticValue("filter-model-empty")];
      const models = [
        { name: "𝔐₁", extension: set("杯子", "盘子") },
        { name: "𝔐₂", extension: set("杯子") },
        { name: "𝔐₃", extension: empty() }
      ];
      const modelCard = (model, index) => {
        const ready = Boolean(formulas[index] && equalFormula(formulas[index], universalP));
        const cup = contains(model.extension, "杯子"), plate = contains(model.extension, "盘子");
        const satisfied = ready && cup && plate;
        return `<article class="theory-model-card ${ready ? (satisfied ? "pass" : "fail") : "waiting"}"><header><b>${model.name}</b><code>Pᴹ=${semanticSetLabel(model.extension)}</code></header><div><span>杯子 ${cup ? "∈" : "∉"} Pᴹ</span><i>${cup ? "✓" : "×"}</i></div><div><span>盘子 ${plate ? "∈" : "∉"} Pᴹ</span><i>${plate ? "✓" : "×"}</i></div><footer>${ready ? (satisfied ? "满足 ∀xP(x)" : "不满足 ∀xP(x)") : "等待同一句话"}</footer></article>`;
      };
      title = "一句话正在经过三个模型";
      subtitle = "固定论域：D={杯子,盘子}";
      body = `<div class="theory-model-list">${models.map(modelCard).join("")}</div>`;
    } else if (kind === "theory-model-filter") {
      const contexts = [safeSemanticValue("theory-model-one"), safeSemanticValue("theory-model-two"), safeSemanticValue("theory-model-three")];
      const models = [
        { name: "𝔐₁", p: set("杯子"), q: set("盘子") },
        { name: "𝔐₂", p: set("杯子", "盘子"), q: set("杯子") },
        { name: "𝔐₃", p: set("杯子"), q: empty() }
      ];
      const row = (model, index) => {
        const ready = Boolean(contexts[index] && equal(contexts[index], partitionTheory));
        const a = ready && evaluateMonadicFormula(theoryCoverage, model.p, model.q);
        const b = ready && evaluateMonadicFormula(theoryNoOverlap, model.p, model.q);
        return `<tr class="${!ready ? "waiting" : (a && b ? "pass" : "fail")}"><th>${model.name}<small>Pᴹ=${semanticSetLabel(model.p)}<br>Qᴹ=${semanticSetLabel(model.q)}</small></th><td>${ready ? (a ? "✓" : "×") : "○"}</td><td>${ready ? (b ? "✓" : "×") : "○"}</td><td><b>${ready ? (a && b ? "𝔐⊨T" : "𝔐⊭T") : "等待 T"}</b></td></tr>`;
      };
      title = "模型必须同时通过每条公理";
      subtitle = "A：覆盖每个对象　B：两种性质不重叠";
      body = `<table class="theory-satisfaction-table"><thead><tr><th>模型</th><th>A</th><th>B</th><th>整组 T</th></tr></thead><tbody>${models.map(row).join("")}</tbody></table>`;
    } else if (kind === "theory-model-build") {
      const pExtension = safeSemanticValue("theory-build-p"), qExtension = safeSemanticValue("theory-build-q");
      const ready = Array.isArray(pExtension) && Array.isArray(qExtension);
      const a = ready && evaluateMonadicFormula(theoryCoverage, pExtension, qExtension);
      const b = ready && evaluateMonadicFormula(theoryNoOverlap, pExtension, qExtension);
      const objectRow = (object) => {
        const inP = ready && contains(pExtension, object), inQ = ready && contains(qExtension, object);
        return `<article class="theory-object-row ${ready && inP !== inQ ? "pass" : (ready ? "fail" : "waiting")}"><b>${object}</b><span class="${inP ? "active" : ""}">P</span><span class="${inQ ? "active" : ""}">Q</span><small>${!ready ? "等待解释" : (inP !== inQ ? "恰好一种性质" : (inP ? "两种性质重叠" : "没有性质"))}</small></article>`;
      };
      title = "解释正在形成一个 T 的模型";
      subtitle = `Pᴹ=${semanticSetLabel(pExtension)}　Qᴹ=${semanticSetLabel(qExtension)}`;
      body = `<div class="theory-object-list">${theoryDomain.map(objectRow).join("")}</div><div class="theory-axiom-results"><div class="${a ? "pass" : "fail"}"><code>A</code><span>每个对象至少一种</span><b>${ready ? (a ? "✓" : "×") : "○"}</b></div><div class="${b ? "pass" : "fail"}"><code>B</code><span>没有对象同时两种</span><b>${ready ? (b ? "✓" : "×") : "○"}</b></div></div>${semanticPathStatus(ready, a && b, "两条公理同时成立：𝔐⊨T", "继续调整 Pᴹ、Qᴹ")}`;
    } else if (kind === "completeness-start") {
      const theory = safeSemanticValue("goal");
      const ready = Boolean(theory && equal(theory, completenessStartTheory));
      title = "旧反模型正在见证新的相容起点";
      subtitle = "Pᴹ=∅　Qᴹ={杯子}　D={杯子,盘子}";
      body = `<div class="completeness-start-board"><article class="pass"><small>原公理</small><code>∀x(P(x)→Q(x))</code><b>真 ✓</b><p>Pᴹ 为空，不会出现 P 真而 Q 假的对象。</p></article><article class="${ready ? "pass" : "waiting"}"><small>新增要求</small><code>¬∀xQ(x)</code><b>${ready ? "真 ✓" : "等待加入 S₀"}</b><p>盘子不属于 Qᴹ，所以 ∀xQ(x) 为假。</p></article></div><div class="completeness-start-result ${ready ? "revealed" : "waiting"}"><code>${ready ? "𝔐⊨S₀" : "等待 S₀"}</code><span>${ready ? "S₀ 有模型，因此 S₀ 相容" : "把原公理与候选结论的否定收成公式集"}</span></div>`;
    } else if (kind === "completeness-concrete-decision") {
      const proof = safeSemanticValue("goal");
      const qReady = state.nodes.some((node) => {
        if (node.out !== "proof") return false;
        try { const value = evaluateNode(node.id); return value && value.rule === "impElim" && equalFormula(value.conclusion, completenessQc); }
        catch (_) { return false; }
      });
      const conflict = Boolean(proof && proof.kind === "proof" && equalFormula(proof.conclusion, bottomFormula));
      title = "Q(c) 的反面正在封死";
      subtitle = "练习理论 U₀={P(c),P(c)→Q(c)}　轮到 σ=Q(c)";
      body = `<div class="completeness-decision-path"><article class="${qReady ? "complete" : "waiting"}"><small>当前理论已经迫使</small><code>P(c)→Q(c)　P(c)<br>──────────── →E<br>Q(c)</code><b>${qReady ? "已得到 Q(c) ✓" : "等待 →E"}</b></article><i>遇到</i><article class="${conflict ? "closed" : "waiting"}"><small>尝试加入的反面</small><code>¬Q(c)</code><b>${conflict ? "产生 ⊥ ×" : "等待 ¬E"}</b></article></div><div class="completeness-choice-result ${conflict ? "revealed" : "waiting"}"><span>${conflict ? "¬Q(c) 这边不相容" : "还没有决定"}</span><code>${conflict ? "本轮保留 Q(c)" : "先完成矛盾推导"}</code></div>`;
    } else if (kind === "completeness-safe-side") {
      const negSigma = safeSemanticValue("safe-positive-close");
      const sigma = safeSemanticValue("safe-negative-close");
      const result = safeSemanticValue("goal");
      const negReady = Boolean(negSigma && equalFormula(negSigma.conclusion, F.not(schemaA)));
      const sigmaReady = Boolean(sigma && equalFormula(sigma.conclusion, schemaA));
      const conflict = Boolean(result && equalFormula(result.conclusion, bottomFormula));
      title = "假设两边封死，会使 S 自身爆炸";
      subtitle = "S 在两段范围外保持不变";
      body = `<div class="completeness-two-failures"><article class="${negReady ? "complete" : "waiting"}"><small>若 S,σ⊢⊥</small><code>S⊢¬σ</code><b>${negReady ? "¬I ✓" : "关闭上方范围"}</b></article><article class="${sigmaReady ? "complete" : "waiting"}"><small>若 S,¬σ⊢⊥</small><code>S⊢σ</code><b>${sigmaReady ? "RAA ✓" : "关闭下方范围"}</b></article></div><div class="completeness-safe-conclusion ${conflict ? "revealed" : "waiting"}"><code>${conflict ? "S⊢σ　且　S⊢¬σ　⇒　S⊢⊥" : "等待两条结果汇合"}</code><strong>${conflict ? "与 S 相容矛盾" : ""}</strong><span>${conflict ? "因此两条扩张道路至少有一条保持相容" : ""}</span></div>`;
    } else if (kind === "completeness-decision-chain") {
      const values = [safeSemanticValue("decision-stage-one"), safeSemanticValue("decision-stage-two"), safeSemanticValue("decision-stage-three")];
      const expected = [completenessStageOne, completenessStageTwo, completenessStageThree];
      const ready = values.map((value, index) => Boolean(value && equal(value, expected[index])));
      const formulas = ["Q(c)", "R(c,c)", "¬∀xP(x)"];
      title = "同一个模型见证前三个阶段";
      subtitle = "cᴹ=杯子　Pᴹ=Qᴹ={杯子}　Rᴹ={⟨杯子,杯子⟩}";
      body = `<div class="completeness-chain-stages"><article class="complete"><small>起点</small><code>U₀</code><b>相容 ✓</b></article>${ready.map((done, index) => `<i>⊆</i><article class="${done ? "complete" : "waiting"}"><small>决定 σ${index}</small><code>U${index + 1}=U${index}∪{${formulas[index]}}</code><b>${done ? "模型满足 ✓" : "等待构造"}</b></article>`).join("")}</div><div class="completeness-infinite-tail ${ready.every(Boolean) ? "revealed" : "waiting"}"><code>U₀⊆U₁⊆U₂⊆U₃⊆⋯</code><span>${ready.every(Boolean) ? "任意 σₙ 最终都会轮到" : "三个阶段必须首尾相接"}</span></div>`;
    } else if (kind === "completeness-unnamed-witness") {
      const pExtension = safeSemanticValue("unnamed-p");
      const cValue = safeSemanticValue("unnamed-c");
      const fGraph = safeSemanticValue("unnamed-f");
      const pReady = equal(pExtension, set("杯子"));
      const cReady = equal(cValue, "盘子");
      const fReady = equal(fGraph, set(orderedPair("杯子", "盘子"), orderedPair("盘子", "盘子")));
      const ready = pReady && cReady && fReady;
      title = "对象存在，不代表旧名字能够叫出它";
      subtitle = "固定论域：D={杯子,盘子}";
      body = `<div class="unnamed-witness-world"><article class="${pReady ? "witness" : "waiting"}"><b>杯子</b><span>${pReady ? "P 成立 · 存在见证" : "等待放入 Pᴹ"}</span></article><article class="${cReady ? "named" : "waiting"}"><b>盘子</b><span>${cReady ? "c 指向这里" : "等待 cᴹ"}</span></article></div>
        <div class="closed-term-track ${ready ? "complete" : "waiting"}"><small>语言当前能够写出的闭项</small><div><code>c</code><i>→</i><code>f(c)</code><i>→</i><code>f(f(c))</code><i>→</i><code>⋯</code></div><strong>${ready ? "盘子　　盘子　　　盘子" : "等待完整的 cᴹ 与 fᴹ"}</strong></div>
        <div class="completeness-witness-result ${ready ? "revealed" : "waiting"}"><code>𝔐⊨∃xP(x)</code><span>${ready ? "杯子确实存在，但没有现成闭项指向它" : "先完成三个解释"}</span></div>`;
    } else if (kind === "completeness-fresh-renaming") {
      const before = safeSemanticValue("fresh-rename-d-goal");
      const after = safeSemanticValue("fresh-rename-y-goal");
      const original = Boolean(before && before.kind === "proof" && before.rule === "forallElim" && equalFormula(before.conclusion, witnessPd));
      const renamed = Boolean(after && after.kind === "proof" && after.rule === "forallElim" && equalFormula(after.conclusion, py));
      title = "撤去 d 后，局部规则仍能重建";
      subtitle = "d 是临时新鲜常元；y 是还原后的变量";
      body = `<div class="fresh-renaming-board"><article class="${original ? "complete" : "waiting"}"><small>使用 d</small><code>∀xP(x)<br>──── ∀E<br>P(d)</code><b>${original ? "规则实例完成 ✓" : "等待 P(d)"}</b></article><i>d ↦ y</i><article class="${renamed ? "complete" : "waiting"}"><small>使用 y 重建</small><code>∀xP(x)<br>──── ∀E<br>P(y)</code><b>${renamed ? "同一规则实例 ✓" : "等待 P(y)"}</b></article></div>
        <div class="freshness-strip ${original && renamed ? "revealed" : "waiting"}"><span>前提没有改变</span><b>＋</b><span>规则形状没有改变</span><strong>⇒ 可沿有限证明树逐层重建</strong></div>`;
    } else if (kind === "completeness-add-witness") {
      const theory = safeSemanticValue("goal");
      const ready = Boolean(theory && equal(theory, witnessExampleExtension));
      title = "一句存在承诺得到一个闭项实例";
      subtitle = "W={∃xP(x)}";
      body = `<div class="witness-extension-flow"><article class="complete"><small>理论已有</small><code>∃xP(x)</code><span>声称某个对象具有 P</span></article><i>＋</i><article class="${ready ? "complete" : "waiting"}"><small>新鲜名字</small><code>P(d)</code><span>${ready ? "d 被指定为见证" : "等待加入理论"}</span></article><b>→</b><article class="${ready ? "complete" : "waiting"}"><small>扩张理论</small><code>W′</code><span>${ready ? "存在承诺已被命名" : "等待 W∪{P(d)}"}</span></article></div>`;
    } else if (kind === "completeness-witness-consistency") {
      const negD = safeSemanticValue("witness-failure-close");
      const renamed = state.nodes.some((node) => {
        if (node.type !== "freshProofRename") return false;
        try { const value = evaluateNode(node.id); return value && value.kind === "proof" && value.rule === "freshRename" && equalFormula(value.conclusion, F.not(witnessPhiY)); }
        catch (_) { return false; }
      });
      const universal = safeSemanticValue("witness-generalize");
      const result = safeSemanticValue("goal");
      const steps = [
        Boolean(negD && equalFormula(negD.conclusion, F.not(witnessPhiD))),
        renamed,
        Boolean(universal && equalFormula(universal.conclusion, witnessForallNotPhi)),
        Boolean(result && equalFormula(result.conclusion, bottomFormula))
      ];
      const labels = ["S⊢¬φ(d)", "S⊢¬φ(y)", "S⊢∀x¬φ(x)", "S⊢⊥"];
      title = "失败的见证扩张会把矛盾送回旧理论";
      subtitle = "d 新鲜，且 ∃xφ(x) 已属于 S";
      body = `<div class="witness-consistency-steps">${labels.map((label, index) => `<article class="${steps[index] ? "complete" : "waiting"}"><small>${["解除失败假设", "撤去临时常元 d", "收回任意变量", "调用旧存在句"][index]}</small><code>${label}</code><b>${steps[index] ? "✓" : "○"}</b></article>${index < labels.length - 1 ? "<i>→</i>" : ""}`).join("")}</div>
        <div class="witness-consistency-result ${steps.every(Boolean) ? "revealed" : "waiting"}"><code>${steps.every(Boolean) ? "S∪{φ(d)}⊢⊥　⇒　S⊢⊥" : "依次完成四段推导"}</code><span>${steps.every(Boolean) ? "这与 S 相容矛盾，所以见证扩张保持相容" : "矛盾最终必须不再依赖 d、y 或 z"}</span></div>`;
    } else if (kind === "completeness-interleaved-chain") {
      const values = [safeSemanticValue("henkin-stage-one"), safeSemanticValue("henkin-stage-two"), safeSemanticValue("henkin-stage-three")];
      const expected = [completenessHenkinStageOne, completenessHenkinStageTwo, completenessHenkinStageThree];
      const ready = values.map((value, index) => Boolean(value && equal(value, expected[index])));
      const actions = ["决定 ¬∃xP(x)", "决定 ∃xQ(x)", "为它加入 Q(d)"];
      title = "判定与见证共用一条扩张链";
      subtitle = "同一模型：Pᴹ=∅　Qᴹ={杯子}　dᴹ=杯子";
      body = `<div class="henkin-language-chain"><small>语言链 · 提供可以书写的新名字</small><div><code>L</code><i>⊆</i><code>L(d₀)</code><i>⊆</i><code>L(d₀,d₁)</code><i>⊆ ···</i><b>L*</b></div></div><div class="henkin-chain-board"><article class="complete"><small>起点</small><code>S₀</code><b>相容 ✓</b></article>${ready.map((done, index) => `<i>⊆</i><article class="${done ? "complete" : "waiting"}"><small>${actions[index]}</small><code>S${index + 1}</code><b>${done ? "相容 ✓" : "等待构造"}</b></article>`).join("")}</div><div class="henkin-chain-legend"><span><b>判定</b>让理论对句子表态</span><span><b>见证</b>先扩充语言，再把见证实例加入理论</span></div>`;
    } else if (kind === "completeness-deductive-closure") {
      const result = safeSemanticValue("goal");
      const ready = Boolean(result && result.kind === "proof" && equalFormula(result.conclusion, bottomFormula));
      title = "判定与相容一起迫使 H 收下证明结果";
      subtitle = "已经知道 H⊢B";
      body = `<div class="deductive-closure-board"><article class="complete"><small>若 B∈H</small><code>已经完成</code><span>结论已在理论中</span></article><article class="${ready ? "closed" : "waiting"}"><small>若 B∉H</small><code>判定性 ⇒ ¬B∈H</code><span>${ready ? "与 H⊢B 得到 ⊥" : "等待 ¬E"}</span></article></div><div class="deductive-closure-result ${ready ? "revealed" : "waiting"}"><code>${ready ? "H⊢B　⇒　B∈H" : "排除反面以后，正面才能留下"}</code><span>${ready ? "H 对自己的可证明后果封闭" : ""}</span></div>`;
    } else if (kind === "completeness-closed-terms") {
      const terms = safeSemanticValue("goal");
      const ready = Boolean(terms && equal(terms, closedTermWindow));
      title = "闭项沿函数符号不断生长";
      subtitle = "本关只装配最初的四个名字";
      body = `<div class="term-growth-track"><article class="${ready ? "complete" : "waiting"}"><small>常元起点</small><code>c　d</code></article><i>f(·)</i><article class="${ready ? "complete" : "waiting"}"><small>一层函数</small><code>f(c)　f(d)</code></article><i>f(·)</i><article class="tail"><small>继续生成</small><code>f(f(c))　…</code></article></div><div class="term-model-result ${ready ? "revealed" : "waiting"}"><code>${ready ? "{c,d,f(c),f(d)}⊆T₀" : "等待闭项窗口"}</code><span>每个闭项都是有限项树，因此总会在有限层出现。</span></div>`;
    } else if (kind === "completeness-equivalence-class") {
      const classFromC = safeSemanticValue("equivalence-class-c-goal");
      const classFromD = safeSemanticValue("equivalence-class-d-goal");
      const cReady = Boolean(classFromC && equal(classFromC, termClassC));
      const dReady = Boolean(classFromD && equal(classFromD, termClassC));
      title = "等价类就是关系中与起点相连的全部对象";
      subtitle = "有限窗口 W={c,d,f(c),f(d)}";
      body = `<div class="equivalence-window-definition"><code>[t]∩W={u∈W｜t∼u}</code><span>分别找出关系成立与不成立的候选项</span></div>
        <div class="equivalence-relation-cards" aria-label="有限窗口中的等价关系">
          <article class="equivalence-relation-card"><header><small>从 c 出发</small><code>c∼u</code></header><div class="equivalence-relation-sides"><section><b>关系成立</b><span><code>c</code><small>自反性</small></span><span><code>d</code><small>已知 c∼d</small></span></section><section class="negative"><b>关系不成立</b><span><code>f(c)</code><small>—</small></span><span><code>f(d)</code><small>—</small></span></section></div></article>
          <article class="equivalence-relation-card"><header><small>从 d 出发</small><code>d∼u</code></header><div class="equivalence-relation-sides"><section><b>关系成立</b><span><code>c</code><small>对称性</small></span><span><code>d</code><small>自反性</small></span></section><section class="negative"><b>关系不成立</b><span><code>f(c)</code><small>—</small></span><span><code>f(d)</code><small>—</small></span></section></div></article>
        </div>
        <div class="equivalence-window-results"><article class="${cReady ? "complete" : "waiting"}"><small>从 c 出发</small><code>[c]∩W=${cReady ? "{c,d}" : "?"}</code></article><article class="${dReady ? "complete" : "waiting"}"><small>从 d 出发</small><code>[d]∩W=${dReady ? "{c,d}" : "?"}</code></article></div>
        <div class="equivalence-window-conclusion ${cReady && dReady ? "revealed" : "waiting"}"><code>${cReady && dReady ? "[c]∩W=[d]∩W" : "等待两个关系行产生的集合"}</code><span>${cReady && dReady ? "同一个集合同时是两个起点的有限等价类" : "两行成立的列完全相同"}</span></div>`;
    } else if (kind === "completeness-function-congruence") {
      const proof = safeSemanticValue("goal");
      const ready = Boolean(proof && equalFormula(proof.conclusion, equalityFcFd));
      title = "等名经过 f 仍指向同一对象";
      subtitle = "H⊢c=d";
      body = `<div class="congruence-flow"><article class="complete"><code>[c]=[d]</code><span>输入是同一个对象</span></article><i>fᴴ</i><article class="${ready ? "complete" : "waiting"}"><code>[f(c)]=[f(d)]</code><span>${ready ? "输出仍是同一个对象" : "等待 =I 与 =E"}</span></article></div><div class="term-model-result ${ready ? "revealed" : "waiting"}"><code>fᴴ([t])=[f(t)]</code><span>${ready ? "定义不依赖代表元" : "先证明 f(c)=f(d)"}</span></div>`;
    } else if (kind === "completeness-predicate-congruence") {
      const p = safeSemanticValue("predicate-congruence-p-goal"), r = safeSemanticValue("predicate-congruence-r-goal");
      const pReady = Boolean(p && equalFormula(p.conclusion, predicatePd)), rReady = Boolean(r && equalFormula(r.conclusion, relationDd));
      title = "谓词只看对象，不看它选用的名字";
      subtitle = "H⊢c=d";
      body = `<div class="predicate-congruence-board"><article class="${pReady ? "complete" : "waiting"}"><small>一元位置</small><code>P(c) ⇒ P(d)</code><b>${pReady ? "=E ✓" : "等待替换"}</b></article><article class="${rReady ? "complete" : "waiting"}"><small>两个项位置</small><code>R(c,c) ⇒ R(d,c) ⇒ R(d,d)</code><b>${rReady ? "两次 =E ✓" : "等待逐项替换"}</b></article></div><div class="term-model-result ${pReady && rReady ? "revealed" : "waiting"}"><code>[c]=[d]</code><span>换代表元不改变 Pᴴ、Rᴴ 的成员关系。</span></div>`;
    } else if (kind === "completeness-assemble-term-model") {
      const ids = ["term-model-c", "term-model-f", "term-model-p", "term-model-r"];
      const expected = [termClassC, termModelFunctionWindow, termModelPredicateWindow, termModelRelationWindow];
      const ready = ids.map((id, index) => equal(safeSemanticValue(id), expected[index]));
      title = "符号正在同一个世界里留下痕迹";
      subtitle = "对象不动；名字、函数、性质与关系逐层显现";
      body = `<div class="term-model-world ${ready.every(Boolean) ? "complete" : "building"}" aria-label="项模型的有限窗口">
        <header><b>Dᴴ</b><span>论域中的三个对象类</span></header>
        <svg viewBox="0 0 330 235" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="termModelGreenArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z"></path></marker>
            <marker id="termModelBlueArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z"></path></marker>
            <marker id="termModelRustArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z"></path></marker>
          </defs>
          <path class="term-model-name-path ${ready[0] ? "revealed" : "waiting"}" d="M49 40 L49 91"></path>
          <path class="term-model-function-path ${ready[1] ? "revealed" : "waiting"}" d="M88 111 C108 77 132 77 151 111"></path>
          <path class="term-model-function-path ${ready[1] ? "revealed" : "waiting"}" d="M199 111 C219 77 243 77 262 111"></path>
          <path class="term-model-relation-path ${ready[3] ? "revealed" : "waiting"}" d="M88 153 C108 194 132 194 151 153"></path>
        </svg>
        <span class="term-model-name-tag ${ready[0] ? "revealed" : "waiting"}"><code>c</code><small>名字</small></span>
        <span class="term-model-edge-label function-one ${ready[1] ? "revealed" : "waiting"}">fᴴ</span>
        <span class="term-model-edge-label function-two ${ready[1] ? "revealed" : "waiting"}">fᴴ</span>
        <span class="term-model-edge-label relation ${ready[3] ? "revealed" : "waiting"}">Rᴴ</span>
        <article class="term-model-object object-one ${ready[2] ? "predicate-member" : ""}"><small>对象</small><code>[c]=[d]</code><b class="term-model-p-badge ${ready[2] ? "revealed" : "waiting"}">Pᴴ</b></article>
        <article class="term-model-object object-two"><small>对象</small><code>[f(c)]</code></article>
        <article class="term-model-object object-three"><small>对象</small><code>[f(f(c))]</code></article>
      </div>
      <div class="term-model-visual-legend">
        <span class="name ${ready[0] ? "complete" : "waiting"}"><i></i>常元落点</span>
        <span class="function ${ready[1] ? "complete" : "waiting"}"><i></i>函数去向</span>
        <span class="predicate ${ready[2] ? "complete" : "waiting"}"><i></i>谓词范围</span>
        <span class="relation ${ready[3] ? "complete" : "waiting"}"><i></i>关系边</span>
      </div>
      <div class="term-model-result ${ready.every(Boolean) ? "revealed" : "waiting"}"><code>${ready.every(Boolean) ? "𝔐ᴴ 已成形" : `${ready.filter(Boolean).length}/4`}</code><span>${ready.every(Boolean) ? "同一组对象现在承载了整门语言的解释" : "每完成一种解释，模型地图就多出一种结构"}</span></div>`;
    } else if (kind === "completeness-term-evaluation") {
      const value = safeSemanticValue("goal");
      const ready = Boolean(value && equal(value, termClassFfc));
      body = `<div class="term-evaluation-path"><article class="complete"><code>c</code><span>[c]</span></article><i>f</i><article class="${ready ? "complete" : "waiting"}"><code>f(c)</code><span>[f(c)]</span></article><i>f</i><article class="${ready ? "complete" : "waiting"}"><code>f(f(c))</code><span>${ready ? "[f(f(c))]" : "等待第二次应用"}</span></article></div><div class="term-model-result ${ready ? "revealed" : "waiting"}"><code>⟦t⟧ᴴ=[t]</code><span>项的语法构造与模型取值逐层同步。</span></div>`;
      title = "每增加一层函数，模型值前进一步";
      subtitle = "项取值引理的具体两层路径";
    } else if (kind === "completeness-conjunction-truth") {
      const left = safeSemanticValue("truth-and-left-goal"), right = safeSemanticValue("truth-and-right-goal"), whole = safeSemanticValue("truth-and-build-goal");
      const split = Boolean(left && right && equalFormula(left.conclusion, completenessPc) && equalFormula(right.conclusion, completenessQc));
      const join = Boolean(whole && equalFormula(whole.conclusion, pcAndQc));
      title = "合取的两个方向都由旧规则完成";
      subtitle = "H 对推导已经封闭";
      body = `<div class="truth-two-directions"><article class="${split ? "complete" : "waiting"}"><small>拆开</small><code>A∧B∈H ⇒ A∈H 且 B∈H</code><span>∧E₁、∧E₂</span></article><article class="${join ? "complete" : "waiting"}"><small>合回</small><code>A∈H 且 B∈H ⇒ A∧B∈H</code><span>∧I</span></article></div><div class="term-model-result ${split && join ? "revealed" : "waiting"}"><code>A∧B∈H ⇔ A∈H 且 B∈H</code><span>与模型中合取为真的条件相同。</span></div>`;
    } else if (kind === "completeness-negation-truth") {
      const goalLinks = state.connections.filter((c) => c.to === "truth-not-goal");
      const ready = ["truth-not-decision", "truth-not-consistency", "truth-not-ih"].every((id, index) => goalLinks.some((c) => c.from === id && c.input === index));
      title = "判定性把“不在 H”变成“反面在 H”";
      subtitle = "相容性保证两面不能同时留下";
      body = `<div class="negation-truth-chain"><code>¬A∈H</code><i>⇔</i><code>A∉H</code><i>⇔</i><code>𝔐ᴴ⊭A</code><i>⇔</i><code>𝔐ᴴ⊨¬A</code></div><div class="term-model-result ${ready ? "revealed" : "waiting"}"><code>𝔐ᴴ⊨¬A ⇔ ¬A∈H</code><span>${ready ? "否定步骤完成" : "汇合判定性、相容性与 IH(A)"}</span></div>`;
    } else if (kind === "completeness-disjunction-truth") {
      const branchProofs = state.nodes.filter((node) => node.type === "notElim").map((node) => safeSemanticValue(node.id)).filter(Boolean);
      const leftReady = branchProofs.some((proof) => proof.conclusion && proof.conclusion.kind === "bottom" && (proof.openScopes || []).some((scope) => scope.id === "truth-or-left-scope"));
      const rightReady = branchProofs.some((proof) => proof.conclusion && proof.conclusion.kind === "bottom" && (proof.openScopes || []).some((scope) => scope.id === "truth-or-right-scope"));
      const result = safeSemanticValue("goal");
      const ready = Boolean(result && result.rule === "orElim" && result.conclusion.kind === "bottom");
      title = "A、B 都不属于 H，会让每种情况都矛盾";
      subtitle = "困难方向由分类讨论完成";
      body = `<div class="truth-case-board"><article class="${leftReady ? "complete" : "waiting"}"><small>情况 A</small><code>A　＋　¬A</code><b>${leftReady ? "⊥" : "等待 ¬E"}</b></article><article class="${rightReady ? "complete" : "waiting"}"><small>情况 B</small><code>B　＋　¬B</code><b>${rightReady ? "⊥" : "等待 ¬E"}</b></article></div><div class="truth-case-merge ${ready ? "complete" : "waiting"}"><span>∨E 合并全部情况</span><code>${ready ? "A∨B∈H ⇒ A∈H 或 B∈H" : "两条分支必须到达同一个 ⊥"}</code></div><div class="term-model-result ${ready ? "revealed" : "waiting"}"><code>A∨B∈H ⇔ A∈H 或 B∈H</code><span>${ready ? "反方向由 ∨I₁、∨I₂ 完成" : "正在排除 A∉H 且 B∉H"}</span></div>`;
    } else if (kind === "completeness-implication-truth") {
      const implicationSteps = state.nodes.filter((node) => node.type === "impElim").map((node) => safeSemanticValue(node.id)).filter(Boolean);
      const bReady = implicationSteps.some((proof) => proof.conclusion && equalFormula(proof.conclusion, schemaB));
      const result = safeSemanticValue("goal");
      const ready = Boolean(result && result.conclusion && result.conclusion.kind === "bottom");
      title = "蕴含只排除一个真值组合";
      subtitle = "A∈H 时，B 也必须属于 H";
      body = `<div class="implication-failure-path"><article class="complete"><small>两项都属于 H</small><code>A→B　＋　A</code><span>→E</span></article><article class="${bReady ? "complete" : "waiting"}"><small>得到 B∈H</small><code>B</code><span>再与 ¬B 相撞</span></article><article class="${ready ? "complete" : "waiting"}"><small>禁止的组合</small><code>${ready ? "⊥" : "等待 ¬E"}</code><span>A∈H 且 B∉H 不可能</span></article></div><div class="term-model-result ${ready ? "revealed" : "waiting"}"><code>A→B∈H ⇔ A∉H 或 B∈H</code><span>${ready ? "唯一失败情形已被排除" : "先用 →E 得到 B"}</span></div>`;
    } else if (kind === "completeness-quantifier-truth") {
      const existsReady = state.connections.filter((c) => c.to === "truth-exists-goal").length === 3;
      const forallReady = state.connections.filter((c) => c.to === "truth-forall-goal").length === 3;
      title = "闭项见证连接 H 与项模型中的对象";
      subtitle = "每个 [t] 都有闭项名字 t";
      body = `<div class="truth-two-directions"><article class="${existsReady ? "complete" : "waiting"}"><small>存在</small><code>∃xA∈H ⇔ 某个 A(t)∈H</code><span>Henkin 见证</span></article><article class="${forallReady ? "complete" : "waiting"}"><small>全称</small><code>∀xA∈H ⇔ 每个 A(t)∈H</code><span>∀E 与闭项反例</span></article></div><div class="term-model-result ${existsReady && forallReady ? "revealed" : "waiting"}"><code>量词真值步骤</code><span>${existsReady && forallReady ? "两种量词都已对齐" : "分别完成两类依据"}</span></div>`;
    } else if (kind === "completeness-truth-induction") {
      const builtFormulas = state.nodes.map((node) => safeSemanticValue(node.id)).filter((value) => value && value.kind && ["pred", "rel", "not", "and", "or", "imp", "exists", "forall"].includes(value.kind));
      const hasFormula = (formula) => builtFormulas.some((value) => equalFormula(value, formula));
      const marks = {
        px: hasFormula(px), qx: hasFormula(qx), rxy: hasFormula(truthInductionRxy),
        imp: hasFormula(truthInductionImp), not: hasFormula(truthInductionNotPx), exists: hasFormula(truthInductionExistsRxy),
        or: hasFormula(truthInductionOr), and: hasFormula(truthInductionBody), root: hasFormula(truthInductionTarget)
      };
      const ready = marks.root && Boolean(safeSemanticValue("goal"));
      title = "对应关系沿你搭出的公式树逐层上升";
      subtitle = "子公式完成，父公式的真值步骤才有落脚处";
      body = `<div class="truth-formula-tree">
        <div class="tree-row root"><span class="truth-tree-node ${marks.root ? "complete" : "waiting"}">∀x</span></div>
        <div class="tree-stem ${marks.root ? "complete" : ""}"></div>
        <div class="tree-row"><span class="truth-tree-node ${marks.and ? "complete" : "waiting"}">∧</span></div>
        <div class="tree-fork"></div>
        <div class="tree-row pair"><span class="truth-tree-node ${marks.imp ? "complete" : "waiting"}">→</span><span class="truth-tree-node ${marks.or ? "complete" : "waiting"}">∨</span></div>
        <div class="tree-row leaves"><span class="truth-tree-node ${marks.px ? "complete" : "waiting"}">P(x)</span><span class="truth-tree-node ${marks.qx ? "complete" : "waiting"}">Q(x)</span><span class="truth-tree-node ${marks.not ? "complete" : "waiting"}">¬P(x)</span><span class="truth-tree-node ${marks.exists ? "complete" : "waiting"}">∃yR(x,y)</span></div>
        <div class="tree-row atoms"><span class="truth-tree-node shared ${marks.px ? "complete" : "waiting"}">同一片 P(x)</span><span class="truth-tree-node ${marks.rxy ? "complete" : "waiting"}">R(x,y)</span></div>
      </div><div class="truth-induction-legend"><span>叶子：原子真值引理</span><span>每个根：对应的局部步骤</span></div><div class="term-model-result ${ready ? "revealed" : "waiting"}"><code>𝔐ᴴ⊨A ⇔ A∈H</code><span>${ready ? "这棵树完成；结构归纳同样覆盖任意有限公式树" : "从已经完成的子公式向根推进"}</span></div>`;
    } else if (kind === "completeness-model-existence") {
      const universalValue = safeSemanticValue("model-existence-universal");
      const negatedValue = safeSemanticValue("model-existence-negated");
      const universalReady = Boolean(universalValue && equalFormula(universalValue, universalPImpQ));
      const negatedReady = Boolean(negatedValue && equalFormula(negatedValue, F.not(universalQ)));
      const ready = universalReady && negatedReady;
      title = "H 保留原句，项模型便逐句满足它们";
      subtitle = "新增的决定与见证不属于原来的 S₀";
      body = `<div class="model-existence-h-window"><header><span>扩张后的 H · 有限窗口</span><small>原句与施工新增句并存</small></header><div><code class="${universalReady ? "original matched" : "original"}">∀x(P(x)→Q(x))</code><code class="added">Q(c)</code><code class="added">R(c,c)</code><code class="${negatedReady ? "original matched" : "original"}">¬∀xQ(x)</code><code class="added">P(d)</code></div></div><div class="model-existence-traces"><article class="${universalReady ? "complete" : "waiting"}"><small>S₀ 的第一句话</small><code>∀x(P(x)→Q(x))</code><i>真值引理</i><b>${universalReady ? "𝔐ᴴ⊨∀x(P(x)→Q(x))" : "等待在 H 中对应"}</b></article><article class="${negatedReady ? "complete" : "waiting"}"><small>S₀ 的第二句话</small><code>¬∀xQ(x)</code><i>真值引理</i><b>${negatedReady ? "𝔐ᴴ⊨¬∀xQ(x)" : "等待在 H 中对应"}</b></article></div><div class="term-model-result ${ready ? "revealed" : "waiting"}"><code>${ready ? "𝔐ᴴ⊨S₀" : "逐句追踪 S₀"}</code><span>${ready ? "S₀ 的每句话都在项模型中为真" : "还需找到原理论中的全部句子"}</span></div>`;
    } else if (kind === "completeness-countermodel-request") {
      const request = safeSemanticValue("completeness-countermodel-request");
      const ready = Boolean(request && equal(request, completenessCountermodelRequest));
      title = "把反模型要求收进同一个理论";
      subtitle = "这里规定模型应当满足什么，不是在进行推导";
      body = `<div class="countermodel-request-meaning"><article><small>保留原有要求</small><code>𝔐⊨T</code><span>模型必须满足 T 的每个句子</span></article><article><small>加入反例要求</small><code>𝔐⊨¬A</code><span>也就是 𝔐⊭A</span></article></div><div class="countermodel-request-result ${ready ? "revealed" : "waiting"}"><small>收进同一个理论</small><code>${ready ? "S=T∪{¬A}" : "等待构造 S"}</code><b>${ready ? "𝔐⊨S　⇒　𝔐⊨T 且 𝔐⊭A" : "一个模型必须同时完成两项要求"}</b></div>`;
    } else if (kind === "completeness-theorem-application") {
      const theory = safeSemanticValue("completeness-existence-theory-input");
      const consistency = safeSemanticValue("completeness-existence-consistency-input");
      const theoryReady = Boolean(theory && equal(theory, completenessCountermodelRequest));
      const consistencyReady = completenessConsistencyProofReady(consistency);
      const ready = theoryReady && consistencyReady;
      title = "模型存在定理";
      subtitle = "把一个语法条件变成真正的模型";
      body = `<div class="model-existence-application"><header><small>已经证明的通用定理</small><code>S 相容　⇒　存在 𝔐，使 𝔐⊨S</code></header><div><article class="${theoryReady ? "complete" : "waiting"}"><span>这一次的 S</span><code>${theoryReady ? "T∪{¬A}" : "等待理论"}</code></article><article class="${consistencyReady ? "complete" : "waiting"}"><span>所需条件</span><code>${consistencyReady ? "S 相容" : "等待相容性"}</code></article></div><i>↓</i><section class="${ready ? "revealed" : "waiting"}"><small>定理给出的同一个模型</small><b>${ready ? "存在 𝔐" : "等待两个输入"}</b><code>${ready ? "𝔐⊨T　且　𝔐⊭A" : "𝔐⊨S"}</code></section></div>`;
    } else if (kind === "countermodel-proof") {
      const pExtension = safeSemanticValue("countermodel-p"), qExtension = safeSemanticValue("countermodel-q");
      const ready = Array.isArray(pExtension) && Array.isArray(qExtension);
      const premise = ready && evaluateMonadicFormula(universalPImpQ, pExtension, qExtension);
      const conclusion = ready && evaluateMonadicFormula(universalQ, pExtension, qExtension);
      const objectRow = (object) => `<article class="countermodel-object-row"><b>${object}</b><span class="${ready && contains(pExtension, object) ? "active" : ""}">P</span><span class="${ready && contains(qExtension, object) ? "active" : ""}">Q</span><small>${!ready ? "等待解释" : (contains(qExtension, object) ? "Q 成立" : "Q 失败")}</small></article>`;
      title = "同一个模型正在分开前提与结论";
      subtitle = `T={∀x(P(x)→Q(x))}　候选结论：∀xQ(x)`;
      body = `<div class="countermodel-world">${theoryDomain.map(objectRow).join("")}</div>
        <div class="countermodel-judgments"><article class="${premise ? "pass" : "waiting"}"><small>前提</small><code>𝔐⊨∀x(P(x)→Q(x))</code><b>${ready ? (premise ? "成立 ✓" : "不成立") : "等待模型"}</b><p>Pᴹ 为空，没有对象会让 P(x) 真而 Q(x) 假。</p></article><article class="${ready && !conclusion ? "counterexample" : "waiting"}"><small>候选结论</small><code>𝔐⊭∀xQ(x)</code><b>${ready ? (!conclusion ? "盘子反驳 ×" : "仍然成立") : "等待模型"}</b><p>全称句要求杯子、盘子都具有 Q；盘子没有。</p></article></div>
        <div class="countermodel-consequence ${ready && premise && !conclusion ? "revealed" : "waiting"}"><span>可靠性：T⊢A ⇒ T⊨A</span><code>${ready && premise && !conclusion ? "T⊭∀xQ(x)　⇒　T⊬∀xQ(x)" : "等待一个满足 T、推翻结论的模型"}</code></div>`;
    } else if (kind === "consistency-from-model") {
      const pExtension = safeSemanticValue("consistency-p"), qExtension = safeSemanticValue("consistency-q");
      const ready = Array.isArray(pExtension) && Array.isArray(qExtension);
      const existence = ready && evaluateMonadicFormula(existentialP, pExtension, qExtension);
      const inclusion = ready && evaluateMonadicFormula(universalPImpQ, pExtension, qExtension);
      const modelReady = existence && inclusion;
      title = "一个 T 的模型已经足以保护相容性";
      subtitle = "T={∃xP(x), ∀x(P(x)→Q(x))}";
      body = `<div class="consistency-model-card"><header><span>你构造的模型</span><code>Pᴹ=${semanticSetLabel(pExtension)}　Qᴹ=${semanticSetLabel(qExtension)}</code></header><div><article class="${existence ? "pass" : "waiting"}"><code>∃xP(x)</code><b>${existence ? "杯子见证 ✓" : "等待"}</b></article><article class="${inclusion ? "pass" : "waiting"}"><code>∀x(P(x)→Q(x))</code><b>${inclusion ? "成立 ✓" : "等待"}</b></article></div></div>
        <div class="consistency-argument ${modelReady ? "revealed" : "waiting"}"><article><small>这个模型</small><code>${modelReady ? "𝔐⊨T" : "等待 𝔐⊨T"}</code></article><i>而</i><article><small>每个模型</small><code>𝔐⊭⊥</code></article><b>所以可靠性排除 <code>T⊢⊥</code></b><strong>${modelReady ? "T⊬⊥　相容" : "等待模型"}</strong></div>`;
    } else if (kind === "theory-conflict") {
      const built = [1, 2, 3, 4].map((index) => safeSemanticValue(`conflict-extension-${index}`));
      const row = (extension) => {
        const present = built.some((value) => Array.isArray(value) && equal(value, extension));
        const allP = present && theoryDomain.every((object) => contains(extension, object));
        const someNotP = present && theoryDomain.some((object) => !contains(extension, object));
        return `<tr class="${present ? "revealed" : "waiting"}"><th><code>${semanticSetLabel(extension)}</code></th><td>${present ? (allP ? "真" : "假") : "○"}</td><td>${present ? (someNotP ? "真" : "假") : "○"}</td><td>${present ? (allP && someNotP ? "同时成立" : "至少一项失败") : "等待构造"}</td></tr>`;
      };
      title = "Pᴹ 的所有可能都在这里";
      subtitle = "U={∀xP(x), ∃x¬P(x)}";
      body = `<table class="theory-conflict-table"><thead><tr><th>Pᴹ</th><th>∀xP(x)</th><th>∃x¬P(x)</th><th>结果</th></tr></thead><tbody>${monadicExtensions.map(row).join("")}</tbody></table><p class="theory-table-note">行的位置固定；你可以按任意次序构造。</p>`;
    } else if (kind === "theory-consequence") {
      const theory = safeSemanticValue("consequence-theory"), target = safeSemanticValue("consequence-target");
      const theoryReady = Boolean(theory && equal(theory, implicationExistenceTheory));
      const targetReady = Boolean(target && equalFormula(target, theoryTarget));
      const label = (extension) => semanticSetLabel(extension).replaceAll("杯子", "杯").replaceAll("盘子", "盘");
      const cells = monadicExtensions.flatMap((pExtension, rowIndex) => monadicExtensions.map((qExtension, columnIndex) => {
        const satisfiesTheory = implicationExistenceTheory.every((formula) => evaluateMonadicFormula(formula, pExtension, qExtension));
        const satisfiesTarget = evaluateMonadicFormula(theoryTarget, pExtension, qExtension);
        return `<div class="theory-grid-cell ${satisfiesTheory ? (satisfiesTarget ? "kept" : "counterexample") : "excluded"}" style="grid-row:${rowIndex + 2};grid-column:${columnIndex + 2}"><b>${satisfiesTheory ? "T ✓" : "T ×"}</b><small>${satisfiesTarget ? "C ✓" : "C ×"}</small></div>`;
      })).join("");
      title = "十六种解释，没有反例格";
      subtitle = "行选择 Pᴹ，列选择 Qᴹ";
      body = theoryReady && targetReady
        ? `<div class="theory-model-grid"><span class="corner">P＼Q</span>${monadicExtensions.map((extension, index) => `<code class="column-label" style="grid-column:${index + 2}">${label(extension)}</code>`).join("")}${monadicExtensions.map((extension, index) => `<code class="row-label" style="grid-row:${index + 2}">${label(extension)}</code>`).join("")}${cells}</div><div class="theory-grid-legend"><span class="kept">满足 T，也满足 C</span><span class="excluded">不满足 T，排除</span></div>`
        : `<div class="theory-grid-wait"><b>${theoryReady ? "T 已就位" : "等待公理集 T"}</b><i>＋</i><b>${targetReady ? "C 已就位" : "等待候选结论 C"}</b><p>两者完成后展开全部模型。</p></div>`;
    } else if (kind === "equality-diagonal") {
      const relation = safeSemanticValue() || latestSemanticNodeValue("set2") || latestSemanticSetProgress() || constructedSemanticRelation();
      const cupLoop = semanticRelationContains(relation, "杯子", "杯子");
      const plateLoop = semanticRelationContains(relation, "盘子", "盘子");
      const crossEdges = semanticRelationContains(relation, "杯子", "盘子") || semanticRelationContains(relation, "盘子", "杯子");
      const loop = (object, complete, side) => `<article class="equality-loop ${complete ? "complete" : "waiting"}"><span>${escapeHtml(object)}</span><i class="${side}" aria-hidden="true">↻</i><b>${complete ? "自环已出现" : "等待自环"}</b><code>⟨${escapeHtml(object)},${escapeHtml(object)}⟩</code></article>`;
      title = "同一个对象连回自身";
      subtitle = "固定论域：D={杯子,盘子}";
      body = `<div class="equality-loop-board">${loop("杯子", cupLoop, "left")}${loop("盘子", plateLoop, "right")}</div>
        <div class="semantic-live-result"><small>当前收集的关系</small><code>${semanticSetLabel(relation)}</code></div>
        ${semanticPathStatus(Boolean(relation && relation.length), cupLoop && plateLoop && !crossEdges && relation.length === 2, "全部对象都恰好留下自环", "收集杯子与自身、盘子与自身组成的两条边")}`;
    } else if (kind === "equality-evaluation") {
      const assigned = latestSemanticNodeValue("termAssignmentS");
      const left = safeSemanticValue("equality-left-value") || latestSemanticNodeValue("termFunctionF");
      const right = safeSemanticValue("equality-right-value") || latestSemanticNodeValue("termConstantMeaning");
      const known = Boolean(left && right), same = known && equal(left, right);
      title = "等号比较两条项路径的终点";
      subtitle = "比较对象，而不是比较写法";
      body = `<div class="equality-value-paths">
          <article class="${left ? "resolved" : "waiting"}"><small>等号左项</small><code>f(x)</code><div><span>x</span><i>经 s</i><b>${assigned ? escapeHtml(assigned) : "?"}</b><i>经 fᴹ</i><strong>${left ? escapeHtml(left) : "?"}</strong></div><p>⟦f(x)⟧ᴹ,s = ${left ? escapeHtml(left) : "?"}</p></article>
          <article class="${right ? "resolved" : "waiting"}"><small>等号右项</small><code>c</code><div><span>c</span><i>经常元解释</i><strong>${right ? escapeHtml(right) : "?"}</strong></div><p>⟦c⟧ᴹ,s = ${right ? escapeHtml(right) : "?"}</p></article>
        </div>
        <div class="equality-merge ${same ? "same" : (known ? "different" : "waiting")}"><span>${left ? escapeHtml(left) : "?"}</span><i>${same ? "同一个对象" : (known ? "不同对象" : "等待两条路径")}</i><span>${right ? escapeHtml(right) : "?"}</span></div>
        ${semanticPathStatus(known, same, "𝔐,s ⊨ f(x)=c", "𝔐,s ⊭ f(x)=c")}`;
    } else if (kind === "equality-intro-forge") {
      const formulas = [safeSemanticValue("eq-intro-x"), safeSemanticValue("eq-intro-c"), safeSemanticValue("eq-intro-fx")];
      const labels = ["x=x", "c=c", "f(x)=f(x)"];
      const complete = formulas.map((formula, index) => Boolean(formula && equalFormula(formula, [F.eq(F.variable, F.variable), F.eq(constantCTerm, constantCTerm), F.eq(functionFxTerm, functionFxTerm)][index])));
      title = "从具体项中找出共同形状";
      subtitle = "每一条等式都必须复用同一份项输出";
      body = `<div class="equality-instance-board">${labels.map((label, index) => `<article class="${complete[index] ? "complete" : "waiting"}"><small>无前提实例 ${index + 1}</small><code>────<br>${label}</code><b>${complete[index] ? "✓" : "○"}</b></article>`).join("")}</div>
        <div class="equality-rule-preview ${complete.every(Boolean) ? "revealed" : "waiting"}"><span>${complete.every(Boolean) ? "三个实例的共同结构" : "完成三个实例后抽象"}</span><code>──── =I<br>t=t</code><p>t 表示任意项，不是语言中新增加的项。</p></div>`;
    } else if (kind === "term-interpretation") {
      const cValue = safeSemanticValue("term-c-interpretation");
      const fGraph = safeSemanticValue("term-f-interpretation") || latestSemanticNodeValue("set2");
      const cupOutput = semanticAssignmentValue(fGraph, "杯子"), plateOutput = semanticAssignmentValue(fGraph, "盘子");
      const complete = Boolean(cValue && cupOutput && plateOutput);
      title = "语法符号正在获得模型解释";
      subtitle = "固定论域：D={杯子,盘子}";
      body = `<div class="witness-world"><article class="semantic-object-card"><span>杯子</span></article><article class="semantic-object-card ${cValue === "盘子" ? "active" : ""}"><span>盘子</span><b>${cValue === "盘子" ? "cᴹ" : ""}</b></article></div>
        <div class="semantic-notation"><span>常元解释</span><code>cᴹ=${cValue ? escapeHtml(cValue) : "?"}</code></div>
        <div class="semantic-lane-list"><article class="semantic-eval-lane ${cupOutput === "盘子" ? "pass" : "waiting"}"><small>函数解释 fᴹ</small><div><code>杯子</code><i>→</i><b>${cupOutput ? escapeHtml(cupOutput) : "?"}</b></div><strong>${cupOutput ? "已定义" : "等待函数图"}</strong></article><article class="semantic-eval-lane ${plateOutput === "杯子" ? "pass" : "waiting"}"><small>函数解释 fᴹ</small><div><code>盘子</code><i>→</i><b>${plateOutput ? escapeHtml(plateOutput) : "?"}</b></div><strong>${plateOutput ? "已定义" : "等待函数图"}</strong></article></div>
        ${semanticPathStatus(complete, cValue === "盘子" && cupOutput === "盘子" && plateOutput === "杯子", "cᴹ 与 fᴹ 已覆盖全部解释位置", "c 应指向盘子；f 应让杯子与盘子互相对应")}`;
    } else if (kind === "function-term-evaluation") {
      const xValue = latestSemanticNodeValue("termAssignmentS");
      const functionValue = latestSemanticNodeValue("termFunctionF");
      const constantValue = latestSemanticNodeValue("termConstantMeaning");
      const pair = safeSemanticValue();
      const pairParts = semanticPairParts(pair);
      const satisfied = Boolean(pairParts && semanticRelationContains(termRelationGraph, pairParts[0], pairParts[1]));
      title = "沿项树取得 R 的两个对象";
      subtitle = "变量由 s 解释；c、f、R 分别由模型解释";
      body = `<div class="semantic-flow-line"><code>x</code><i>经 s</i><b>${xValue ? escapeHtml(xValue) : "?"}</b><i>经 fᴹ</i><b>${functionValue ? escapeHtml(functionValue) : "?"}</b></div>
        <div class="semantic-flow-line"><code>c</code><i>经常元解释</i><b>${constantValue ? escapeHtml(constantValue) : "?"}</b></div>
        <div class="semantic-notation"><span>模型中的关系边</span><code>盘子 ──R──▶ 盘子　   Rᴹ={⟨盘子,盘子⟩}</code></div>
        <div class="semantic-live-result"><small>R(f(x),c) 寻找的有序对象对</small><code>${semanticPairLabel(pair)}</code></div>
        ${semanticPathStatus(Boolean(pairParts), satisfied, "对象对在 Rᴹ 中：𝔐,s⊨R(f(x),c)", "当前对象对不在 Rᴹ 中")}`;
    } else if (kind === "forall") {
      const built = safeSemanticValue() || latestSemanticNodeValue("set2") || latestSemanticSetProgress();
      const pExtension = Array.isArray(built) ? built : semanticPOnlyA;
      const aPass = contains(pExtension, "a"), bPass = contains(pExtension, "b");
      title = "∀ 展开为每个论域对象";
      subtitle = `当前 Pᴹ=${semanticSetLabel(pExtension)}`;
      body = `${semanticDomainView(pExtension, [])}<div class="semantic-quantifier-lanes"><article class="${aPass ? "pass" : "fail"}"><code>x↦a</code><span>P(a)</span><b>${aPass ? "✓" : "×"}</b></article><article class="${bPass ? "pass" : "fail"}"><code>x↦b</code><span>P(b)</span><b>${bPass ? "✓" : "×"}</b></article></div>
        ${semanticPathStatus(Boolean(built), aPass && bPass, "每条路径都成立：𝔐⊨∀xP(x)", "仍有论域对象未被 P 覆盖")}`;
    } else if (kind === "exists") {
      const witness = safeSemanticValue();
      const known = Boolean(witness), ok = known && contains(semanticPOnlyA, witness);
      title = "∃ 只需要一条见证路径";
      subtitle = "Pᴹ={a}";
      body = `${semanticDomainView(semanticPOnlyA, witness ? [witness] : [])}<div class="semantic-witness-path"><span>所选对象</span><b>${witness ? escapeHtml(prettyCurrentSet(witness)) : "?"}</b><i>→</i><code>P(${witness ? escapeHtml(prettyCurrentSet(witness)) : "?"})</code></div>
        ${semanticPathStatus(known, ok, `${prettyCurrentSet(witness)} 是见证：𝔐⊨∃xP(x)`, "所选对象不能见证 P(x)")}`;
    } else if (kind === "free-variable") {
      const relation = safeSemanticValue() || latestSemanticNodeValue("set2") || latestSemanticSetProgress();
      const current = Array.isArray(relation) ? relation : constructedSemanticRelation();
      const aa = semanticRelationContains(current, "a", "a"), ba = semanticRelationContains(current, "b", "a");
      title = "∀ 改动 x，自由变量 y 保持为 a";
      subtitle = `当前 Rᴹ=${semanticSetLabel(current)}`;
      body = `<div class="semantic-pinned-variable"><span>固定</span><code>y↦a</code></div>${semanticRelationView(current)}<div class="semantic-quantifier-lanes"><article class="${aa ? "pass" : "fail"}"><code>x↦a</code><span>寻找 ⟨a,a⟩</span><b>${aa ? "✓" : "×"}</b></article><article class="${ba ? "pass" : "fail"}"><code>x↦b</code><span>寻找 ⟨b,a⟩</span><b>${ba ? "✓" : "×"}</b></article></div>`;
    } else if (kind === "coincidence") {
      const assignmentSource = (goalId, assignmentType) => {
        const intoGoal = state.connections.find((connection) => connection.to === goalId && connection.input === 0);
        const assignment = intoGoal && state.nodes.find((node) => node.id === intoGoal.from && node.type === assignmentType);
        const intoAssignment = assignment && state.connections.find((connection) => connection.to === assignment.id && connection.input === 0);
        return intoAssignment ? intoAssignment.from : null;
      };
      const sValue = safeSemanticValue("coincidence-s-goal");
      const tValue = safeSemanticValue("coincidence-t-goal");
      const sSource = assignmentSource("coincidence-s-goal", "assignmentS");
      const tSource = assignmentSource("coincidence-t-goal", "assignmentT");
      const sKnown = Boolean(sValue), tKnown = Boolean(tValue);
      const sTrue = sKnown && sSource === "coincidence-y" && equal(sValue, "b");
      const tTrue = tKnown && tSource === "coincidence-y" && equal(tValue, "b");
      const assignmentCard = (name, xValue, source) => {
        const choseX = source === "coincidence-x", choseY = source === "coincidence-y";
        return `<article class="coincidence-assignment-card"><header>赋值 ${name}</header><div class="${choseX ? "overwritten" : ""}"><code>x↦${xValue}</code><span>${choseX ? "被 ∀x 覆盖" : ""}</span></div><div class="${choseY ? "retained" : ""}"><code>y↦b</code><span>${choseY ? "公式仍读取" : ""}</span></div></article>`;
      };
      const resultLane = (name, value, source, known, ok) => {
        const variable = source === "coincidence-x" ? "x" : (source === "coincidence-y" ? "y" : "?");
        return `<article class="semantic-eval-lane ${known ? (ok ? "pass" : "fail") : "waiting"}"><small>${name} 下读取自由位置</small><div><code>${variable}</code><i>经 ${name}</i><b>${known ? escapeHtml(prettyCurrentSet(value)) : "?"}</b></div><strong>${known ? (ok ? "正确 ✓" : "会被覆盖") : "等待接入"}</strong></article>`;
      };
      const paths = sTrue && tTrue
        ? `<div class="coincidence-quantifier-paths"><span>∀x 接管后，两边都检查</span><code>R(a,b) ✓　R(b,b) ✓</code></div>`
        : `<div class="coincidence-quantifier-paths pending"><span>先找出公式仍从初始赋值读取的位置</span><code>完成后展开 ∀x 的两条路径</code></div>`;
      title = "公式究竟读取赋值的哪一部分";
      subtitle = "固定：Rᴹ={⟨a,b⟩,⟨b,b⟩}　公式 ∀xR(x,y)";
      body = `<div class="coincidence-assignment-grid">${assignmentCard("s", "a", sSource)}${assignmentCard("t", "b", tSource)}</div>
        <div class="semantic-lane-list">${resultLane("s", sValue, sSource, sKnown, sTrue)}${resultLane("t", tValue, tSource, tKnown, tTrue)}</div>
        ${paths}
        ${semanticPathStatus(sKnown && tKnown, sTrue && tTrue, "只改初始 x，满足判断没有改变", "检查你是否读取了仍然自由的 y")}`;
    } else if (kind === "model-build") {
      const relation = safeSemanticValue() || latestSemanticNodeValue("set2") || latestSemanticSetProgress();
      const current = Array.isArray(relation) ? relation : constructedSemanticRelation();
      const aWitness = current.some((edge) => { const parts = semanticPairParts(edge); return parts && equal(parts[0], "a"); });
      const bWitness = current.some((edge) => { const parts = semanticPairParts(edge); return parts && equal(parts[0], "b"); });
      title = "为每个起点找到一个 R 后继";
      subtitle = `当前 Rᴹ=${semanticSetLabel(current)}`;
      body = `${semanticRelationView(current)}<div class="semantic-quantifier-lanes witness-lanes"><article class="${aWitness ? "pass" : "fail"}"><code>x=a</code><span>${aWitness ? "已经有一条从 a 出发的边" : "还没有见证 y"}</span><b>${aWitness ? "✓" : "○"}</b></article><article class="${bWitness ? "pass" : "fail"}"><code>x=b</code><span>${bWitness ? "已经有一条从 b 出发的边" : "还没有见证 y"}</span><b>${bWitness ? "✓" : "○"}</b></article></div>
        ${semanticPathStatus(current.length > 0, aWitness && bWitness, "每个 x 都找到了 y：模型满足句子", "还有一个起点没有 R 后继")}`;
    }
    const panel = document.createElement("section");
    panel.className = `semantic-workbench semantic-workbench-${kind}`;
    panel.innerHTML = `<header><h3>${escapeHtml(title)}</h3><p>${escapeHtml(subtitle)}</p></header><div class="semantic-workbench-body">${body}</div>`;
    if (kind === "modal-worlds") panel.addEventListener("click", (event) => {
      const button = event.target.closest("[data-modal-world]");
      if (button && panel.contains(button)) selectModalWorld(button.dataset.modalWorld);
    });
    if (kind === "natural-bijection") panel.addEventListener("click", (event) => {
      const button = event.target.closest("[data-natural-source]");
      if (!button || !panel.contains(button)) return;
      const source = state.nodes.find((node) => node.id === button.dataset.naturalSource);
      const number = Number(button.dataset.naturalValue);
      const minimum = source && source.id === "natural-bijection-m" ? 1 : 0;
      if (!source || !Number.isInteger(number) || number < minimum || number > minimum + 3) return;
      source.value = vnNat(number);
      renderCanvas();
    });
    backdrop.appendChild(panel);
  }

  function renderRuleForgeBackdrop() {
    const backdrop = $("#ruleForgeBackdrop");
    const frames = currentLevel().ruleFrames || [];
    const scopeFrames = currentLevel().scopeFrames || [];
    const semanticWorkbench = currentLevel().semanticWorkbench;
    const modelFrame = semanticWorkbench ? null : currentLevel().modelFrame;
    backdrop.hidden = !frames.length && !scopeFrames.length && !modelFrame && !semanticWorkbench;
    backdrop.innerHTML = "";
    if (semanticWorkbench) renderSemanticWorkbench(backdrop, semanticWorkbench);
    if (modelFrame) {
      const panel = document.createElement("section");
      panel.className = "model-interpretation-frame";
      panel.style.left = `${modelFrame.x}px`;
      panel.style.top = `${modelFrame.y}px`;
      panel.style.width = `${modelFrame.width}px`;
      panel.style.height = `${modelFrame.height}px`;
      panel.innerHTML = `<span>${escapeHtml(modelFrame.label)}</span><small>${escapeHtml(modelFrame.detail || "把已经构造的解释接入对应位置")}</small>`;
      backdrop.appendChild(panel);
    }
    frames.forEach((frame, index) => {
      const premiseNodes = frame.premises.map((id) => state.nodes.find((node) => node.id === id)).filter(Boolean);
      const conclusionNode = state.nodes.find((node) => node.id === frame.conclusion);
      if (!premiseNodes.length || !conclusionNode) return;
      const left = Math.min(conclusionNode.x, ...premiseNodes.map((node) => node.x)) - 10;
      const right = Math.max(conclusionNode.x + 154, ...premiseNodes.map((node) => node.x + 154)) + 10;
      const premiseBottom = Math.max(...premiseNodes.map((node) => node.y + 73));
      const top = Math.round((premiseBottom + conclusionNode.y) / 2);
      const line = document.createElement("div");
      line.className = "rule-frame-line";
      line.style.left = `${left}px`;
      line.style.top = `${top}px`;
      line.style.width = `${right - left}px`;
      line.innerHTML = `<span>${escapeHtml(frame.label || `规则 ${index + 1}`)}</span>`;
      backdrop.appendChild(line);
    });
    scopeFrames.forEach((frame) => {
      const scope = document.createElement("section");
      scope.className = `scope-frame ${frame.discharge ? "with-discharge" : "open-scope"} ${frame.discovery ? "dependency-discovery" : ""} ${frame.flagKind ? `quantifier-flag-frame ${frame.flagKind}` : ""}`;
      scope.style.left = `${frame.x}px`;
      if (frame.worldScope) scope.classList.add("modal-world-scope");
      if (frame.witnessScope) scope.classList.add("modal-witness-scope");
      scope.style.top = `${frame.y}px`;
      scope.style.width = `${frame.width}px`;
      scope.style.height = `${frame.height}px`;
      let frameLabel = frame.label || "子证明";
      if (frame.witnessScope) {
        try { const witness = evaluateNode(frame.entry); frameLabel = `由 ${proofJudgement(witness.witnessSource)} 授权 · 暂称见证为 ${frame.to}`; }
        catch (_) { frameLabel = `临时见证范围 · 先给入口接入 ${frame.from}:◇A 的证明`; }
      }
      if (frame.flagKind && frame.flagNode) {
        const flagNode = state.nodes.find((node) => node.id === frame.flagNode);
        const termInput = flagNode && flagNode.type === "existsFlag" ? 1 : 0;
        const nameLink = flagNode && state.connections.find((connection) => connection.to === flagNode.id && connection.input === termInput);
        if (nameLink) {
          try {
            const term = evaluateNode(nameLink.from);
            if (term && term.kind === "var") frameLabel = frame.flagKind === "universal" ? `⚑ 任意 ${term.name}` : `⚑ 暂称见证为 ${term.name}`;
          } catch (_) { /* Keep the empty flag label until its name is valid. */ }
        }
      }
      const boundaryLabel = frame.boundaryLabel || "→I";
      const boundaryCopy = frame.boundaryCopy || "结束子证明并解除假设后才能离开";
      scope.innerHTML = `<span class="scope-frame-label">${escapeHtml(frameLabel)}</span>${frame.contextNote ? `<small class="flag-context-note">${escapeHtml(frame.contextNote)}</small>` : ""}<div class="scope-flow" aria-hidden="true">⋮</div>${frame.discharge ? `<div class="scope-boundary"><b>${escapeHtml(boundaryLabel)}</b><span>${escapeHtml(boundaryCopy)}</span></div>` : `<span class="scope-open-warning">子证明尚未关闭</span>`}`;
      backdrop.appendChild(scope);
    });
  }

  function renderCanvas() {
    const canvas = $("#nodeCanvas");
    canvas.innerHTML = "";
    if (currentLevel().formulaSurgery) {
      $("#ruleForgeBackdrop").hidden = true;
      $("#wireLayer").innerHTML = "";
      renderFormulaSurgery(canvas);
      renderFormulaWorkspace();
      return;
    }
    if (currentLevel().overview) {
      $("#ruleForgeBackdrop").hidden = true;
      $("#wireLayer").innerHTML = "";
      renderLogicOverview(canvas);
      renderFormulaWorkspace();
      return;
    }
    renderRuleForgeBackdrop();
    state.nodes.forEach((node) => canvas.appendChild(createNodeElement(node)));
    renderFormulaWorkspace();
    requestAnimationFrame(drawWires);
  }

  function renderFormulaSurgery(canvas) {
    const level = currentLevel();
    const kind = level.formulaSurgery;
    if (kind === "forge-substitution") {
      renderSubstitutionForge(canvas);
      return;
    }
    const selected = state.surgeryToken;
    const applied = Boolean(state.surgeryTarget);
    const leaf = (name, options = {}) => {
      const classes = ["surgery-tree-node", "leaf", options.bound ? "bound" : "free", options.captured ? "captured" : "", options.target ? "editable surgery-target" : ""].filter(Boolean).join(" ");
      return options.target
        ? `<button type="button" class="${classes}" data-surgery-target="${options.target}" aria-label="编辑变量 ${name}">${name}</button>`
        : `<span class="${classes}">${name}</span>`;
    };
    const node = (label, children = [], className = "") => `<div class="surgery-tree-branch ${className}"><span class="surgery-tree-node operator">${label}</span>${children.length ? `<div class="surgery-tree-children ${children.length === 1 ? "unary" : "binary"}">${children.join("")}</div>` : ""}</div>`;
    const quantifier = (variable, body, editable = false, captured = false) => {
      const variableHtml = editable
        ? `<button type="button" class="surgery-binder surgery-target" data-surgery-target="binder" aria-label="修改量词绑定名字">${variable}</button>`
        : `<b class="surgery-binder ${captured ? "captured" : ""}">${variable}</b>`;
      return node(`<span>∀</span>${variableHtml}`, [body], "quantifier");
    };
    const pred = (name, terms) => node(name, terms);
    const relation = (left, right) => pred("R", [left, right]);
    const predicate = (name, term) => pred(name, [term]);
    let sourceTree = "", resultTree = "", operation = "", operationMarkup = "", feedback = "", resultClass = "waiting";

    if (kind === "all-free") {
      operation = "逐字换字 x→y";
      sourceTree = relation(leaf("x", { target: "free-x" }), leaf("x", { target: "free-x" }));
      if (applied) {
        resultTree = relation(leaf("y"), leaf("y"));
        feedback = "朴素换字同时改动两个同名位置；这里还没有量词，也还没有定义正式代入。";
        resultClass = "safe";
      }
    } else if (kind === "capture") {
      operation = "逐字换字 x→y";
      sourceTree = quantifier("y", relation(leaf("x", { target: "free-x" }), leaf("y", { bound: true })));
      if (applied) {
        resultTree = quantifier("y", relation(leaf("y", { bound: true, captured: true }), leaf("y", { bound: true })), false, true);
        feedback = "新放入的 y 落进了已有的 ∀y 辖域；本来要保留的自由依赖被量词吞掉。";
        resultClass = "danger";
      }
    } else if (kind === "freshen") {
      operation = "为绑定的 y 选择新名字";
      sourceTree = quantifier("y", relation(leaf("x"), leaf("y", { bound: true })), true);
      if (applied) {
        if (selected === "z") {
          resultTree = quantifier("z", relation(leaf("x"), leaf("z", { bound: true })));
          feedback = "z 未在原公式中出现；易字后 FV 仍是 {x}，名字 y 已经腾出。";
          resultClass = "safe";
        } else if (selected === "x") {
          resultTree = quantifier("x", relation(leaf("x", { bound: true, captured: true }), leaf("x", { bound: true })), false, true);
          feedback = "量词改成 ∀x 后，原本自由的 x 被捕获，FV 从 {x} 变成 ∅。";
          resultClass = "danger";
        } else {
          resultTree = quantifier("y", relation(leaf("x"), leaf("y", { bound: true })));
          feedback = "仍使用 y 没有腾出名字，也没有完成易字。";
          resultClass = "warning";
        }
      }
    } else if (kind === "safe-substitute") {
      operation = "逐字换字 x→y";
      sourceTree = quantifier("z", relation(leaf("x", { target: "free-x" }), leaf("z", { bound: true })));
      if (applied) {
        resultTree = quantifier("z", relation(leaf("y"), leaf("z", { bound: true })));
        feedback = "自由依赖从 x 换成 y；z 仍由 ∀z 接管，没有变量被捕获。";
        resultClass = "safe";
      }
    } else if (kind === "formal-substitution") {
      operation = "正式代入";
      operationMarkup = `<button type="button" class="surgery-operation-slot surgery-target" data-surgery-target="substitution-slot" aria-label="把替换项送入正式代入操作">[□/x]</button>`;
      sourceTree = node("∧", [predicate("P", leaf("x")), quantifier("x", predicate("Q", leaf("x", { bound: true })))], "compound");
      if (applied) {
        resultTree = node("∧", [predicate("P", leaf("y")), quantifier("x", predicate("Q", leaf("x", { bound: true })))], "compound");
        feedback = "代入在 P(x) 找到自由 x；进入 ∀x 时遇到新的绑定边界，于是保留整棵 Q(x) 辖域。";
        resultClass = "safe";
      }
    }

    const tokenButtons = level.surgeryTokens.map((token) => `<button type="button" draggable="true" class="surgery-token ${selected === token ? "selected" : ""}" data-surgery-token="${token}" aria-pressed="${selected === token}">${token}</button>`).join("");
    const captureComparison = kind === "capture" && applied ? `<section class="surgery-consequence-board">
      <article><small>原公式</small><code>∀yR(x,y)</code><span>FV={x}</span><b>R(b,a) ✓　R(b,b) ✓</b><strong>真</strong></article>
      <article class="broken"><small>逐字换字后</small><code>∀yR(y,y)</code><span>FV=∅</span><b>R(a,a) ×　R(b,b) ✓</b><strong>假</strong></article>
      <p>固定 D={a,b}，Rᴹ={⟨b,a⟩,⟨b,b⟩}，s(x)=b。新放入的 y 被量词接管以后，公式不再读取原来的 x。</p>
    </section>` : "";
    const finalTrail = kind === "safe-substitute" && applied ? `<section class="surgery-final-trail"><code>∀yR(x,y)</code><i>安全易字</i><code>∀zR(x,z)</code><i>逐字换字</i><code>∀zR(y,z)</code><span>原来的自由依赖 x 已安全改为 y</span></section>` : "";
    const substitutionTrace = kind === "formal-substitution" && applied ? `<section class="substitution-trace"><article class="changed"><code>P(x)</code><i>找到自由 x</i><b>P(y)</b></article><article class="stopped"><code>∀xQ(x)</code><i>遇到重新绑定 x 的量词</i><b>整棵辖域保持不动</b></article></section>` : "";

    canvas.innerHTML = `<article class="formula-surgery-workspace">
      <header class="surgery-header"><div><span>公式树编辑</span><h3>${escapeHtml(level.title)}</h3></div><div class="surgery-token-rack"><small>变量材料</small>${tokenButtons}</div></header>
      <section class="surgery-stage">
        <article class="surgery-tree-card source"><small>原公式树</small><div class="surgery-tree">${sourceTree}</div></article>
        <div class="surgery-operation"><span>执行</span>${operationMarkup || `<code>${escapeHtml(operation)}</code>`}<i>→</i></div>
        <article class="surgery-tree-card result ${resultClass}"><small>变换结果</small><div class="surgery-tree">${resultTree || `<p>选择变量，再点击或拖到虚线位置</p>`}</div></article>
      </section>
      <section class="surgery-feedback ${resultClass}"><span>${applied ? "当前观察" : "等待操作"}</span><p>${escapeHtml(feedback || "树上带虚线的变量位置可以接收左上方的变量材料。")}</p></section>
      ${captureComparison}${finalTrail}${substitutionTrace}
    </article>`;

    canvas.querySelectorAll("[data-surgery-token]").forEach((button) => {
      button.addEventListener("click", () => selectSurgeryToken(button.dataset.surgeryToken));
      button.addEventListener("dragstart", (event) => {
        state.surgeryToken = button.dataset.surgeryToken;
        event.dataTransfer.setData("text/plain", button.dataset.surgeryToken);
        event.dataTransfer.effectAllowed = "copy";
      });
    });
    canvas.querySelectorAll("[data-surgery-target]").forEach((target) => {
      target.addEventListener("click", () => applySurgery(target.dataset.surgeryTarget));
      target.addEventListener("dragover", (event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; });
      target.addEventListener("drop", (event) => {
        event.preventDefault();
        applySurgery(target.dataset.surgeryTarget, event.dataTransfer.getData("text/plain"));
      });
    });
  }

  function renderSubstitutionForge(canvas) {
    const routes = state.surgeryRoutes || {};
    const selected = state.surgeryAction;
    const correctRoutes = { "same-binder": "preserve", "safe-binder": "descend", "capture-binder": "rename-descend" };
    const actions = {
      preserve: { title: "保留整个量词公式", short: "保留", detail: "不进入这个量词的辖域" },
      descend: { title: "进入辖域继续换字", short: "进入辖域", detail: "让代入继续寻找自由的 x" },
      "rename-descend": { title: "先安全易字，再进入辖域", short: "易字后进入", detail: "先搬开量词绑定的名字" }
    };
    const outcomes = {
      "same-binder": {
        preserve: ["∀xQ(x)", "这里没有自由的 x；整棵量词公式保持不动。", "correct"],
        descend: ["∀xQ(y)", "把由 ∀x 接管的 x 错当成了自由出现。", "wrong"],
        "rename-descend": ["∀zQ(z)", "结果虽只做了安全易字，却没有直接认出这里已无自由的 x。", "detour"]
      },
      "safe-binder": {
        preserve: ["∀zR(x,z)", "过早停下，自由的 x 根本没有被换掉。", "wrong"],
        descend: ["∀zR(y,z)", "z 与 x、y 都无关，可以进入辖域继续换字。", "correct"],
        "rename-descend": ["∀wR(y,w)", "结果安全，但白白改了一个不冲突的绑定名字。", "detour"]
      },
      "capture-binder": {
        preserve: ["∀yR(x,y)", "过早停下，自由的 x 仍留在原处。", "wrong"],
        descend: ["∀yR(y,y)", "新放入的 y 被 ∀y 捕获，刚才的错误再次发生。", "wrong"],
        "rename-descend": ["∀zR(y,z)", "先把绑定的 y 改名，新的自由 y 就能安全进入。", "correct"]
      }
    };
    const cases = [
      { id: "same-binder", index: "情形一", formula: "(∀xQ(x))[y/x]", question: "量词正好绑定目标 x" },
      { id: "safe-binder", index: "情形二", formula: "(∀zR(x,z))[y/x]", question: "量词绑定无关的 z" },
      { id: "capture-binder", index: "情形三", formula: "(∀yR(x,y))[y/x]", question: "量词绑定即将放入的 y" }
    ];
    const used = new Set(Object.values(routes));
    const complete = cases.every(({ id }) => routes[id] === correctRoutes[id]);
    const actionCard = (id) => {
      const action = actions[id];
      const assigned = used.has(id);
      return `<button type="button" draggable="true" class="substitution-action ${selected === id ? "selected" : ""} ${assigned ? "assigned" : ""}" data-substitution-action="${id}" aria-pressed="${selected === id}"><span>${assigned ? "已放置 · 仍可移动" : "处理动作"}</span><b>${action.title}</b><small>${action.detail}</small></button>`;
    };
    const caseCard = ({ id, index, formula, question }) => {
      const actionId = routes[id];
      const action = actions[actionId];
      const outcome = actionId ? outcomes[id][actionId] : null;
      return `<article class="substitution-case ${outcome ? outcome[2] : "waiting"}" data-substitution-case="${id}">
        <header><span>${index}</span><code>${formula}</code><p>${question}</p></header>
        <button type="button" class="substitution-case-slot" data-substitution-case-slot="${id}">${action ? `<small>选择的出口</small><b>${action.short}</b>` : `<small>量词边界</small><b>把处理动作放在这里</b>`}</button>
        <div class="substitution-case-result">${outcome ? `<small>得到</small><code>${outcome[0]}</code><p>${outcome[1]}</p>` : `<p>选择动作后，这里会直接显示它造成的结果。</p>`}</div>
      </article>`;
    };
    canvas.innerHTML = `<article class="formula-surgery-workspace substitution-forge-workspace">
      <header class="surgery-header"><div><span>量词边界</span><h3>为量词安排三种出口</h3></div><code class="forge-target-symbol">${complete ? "φ[t/x]" : "[y/x]"}</code></header>
      <section class="substitution-forge-stage">
        <div class="substitution-action-rack">${Object.keys(actions).map(actionCard).join("")}</div>
        <div class="substitution-case-grid">${cases.map(caseCard).join("")}</div>
      </section>
      <section class="substitution-machine ${complete ? "complete" : ""}">
        <span>${complete ? "三个出口已经接通" : "正在归纳量词处的操作"}</span>
        <h4>φ[t/x]</h4>
        <p>${complete ? "只替换自由出现的 x；可以进入时继续，可能捕获时先安全易字。" : "三个具体情形都处理恰当后，才得到一个可以反复使用的公式代入操作。"}</p>
      </section>
    </article>`;
    const assignAction = (caseId, actionId = state.surgeryAction) => {
      if (!actions[actionId]) {
        log("先选择上方的一种处理动作，再把它放到量词边界。", false, "等待动作");
        return;
      }
      Object.keys(state.surgeryRoutes).forEach((id) => {
        if (state.surgeryRoutes[id] === actionId) delete state.surgeryRoutes[id];
      });
      state.surgeryRoutes[caseId] = actionId;
      state.surgeryAction = null;
      renderCanvas();
      tone(correctRoutes[caseId] === actionId ? 520 : 180, .05);
    };
    canvas.querySelectorAll("[data-substitution-action]").forEach((button) => {
      button.addEventListener("click", () => {
        state.surgeryAction = button.dataset.substitutionAction;
        renderCanvas();
        tone(430, .04);
      });
      button.addEventListener("dragstart", (event) => {
        const actionId = button.dataset.substitutionAction;
        state.surgeryAction = actionId;
        event.dataTransfer.setData("text/plain", actionId);
        event.dataTransfer.effectAllowed = "move";
      });
    });
    canvas.querySelectorAll("[data-substitution-case-slot]").forEach((slot) => {
      slot.addEventListener("click", () => assignAction(slot.dataset.substitutionCaseSlot));
      slot.addEventListener("dragover", (event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; });
      slot.addEventListener("drop", (event) => {
        event.preventDefault();
        assignAction(slot.dataset.substitutionCaseSlot, event.dataTransfer.getData("text/plain"));
      });
    });
  }

  function selectSurgeryToken(token) {
    if (!(currentLevel().surgeryTokens || []).includes(token)) return;
    state.surgeryToken = token;
    state.surgeryTarget = null;
    renderCanvas();
    tone(430, .04);
  }

  function applySurgery(target, draggedToken = null) {
    const token = draggedToken || state.surgeryToken;
    if (!(currentLevel().surgeryTokens || []).includes(token)) {
      log("先从变量材料中选择一个名字，再把它放到树上的虚线位置。", false, "等待变量");
      return;
    }
    state.surgeryToken = token;
    state.surgeryTarget = target;
    renderCanvas();
    tone(520, .05);
  }

  function renderLogicOverview(canvas) {
    if (currentLevel().modelExistenceTheoremOverview) {
      canvas.innerHTML = `
        <article class="logic-overview model-existence-theorem-overview" aria-labelledby="modelExistenceTheoremTitle">
          <section class="logic-overview-hero model-existence-theorem-hero">
            <span class="logic-overview-kicker">Henkin 施工 · 总成果</span>
            <h2 id="modelExistenceTheoremTitle">没有语法矛盾，就存在一个满足理论的世界</h2>
            <p>前面的每一关只完成一段桥梁。现在整座桥第一次同时出现。</p>
          </section>
          <section class="model-existence-theorem-statement">
            <article><small>证明系统中的事实</small><b>S 相容</b><span>不存在从 S 推出 ⊥ 的证明</span></article>
            <div><em>模型存在定理</em><i>Henkin 构造</i><strong>→</strong></div>
            <article><small>模型中的事实</small><b>存在 𝔐，使 𝔐⊨S</b><span>S 的每句话都在同一个模型中成立</span></article>
          </section>
          <section class="model-existence-construction-map">
            <header><span>你已经完成的证明</span><h3>四个动作，把相容的理论造出模型</h3></header>
            <div class="model-existence-four-steps">
              <article class="existence-step existence-step-expand">
                <span class="existence-step-number">1</span><small>扩张理论</small>
                <h3>S 相容</h3><i>↓</i><code>S⊆H</code>
                <p>逐步决定每个句子，并为存在句加入见证，同时保持相容。</p>
              </article>
              <article class="existence-step existence-step-build">
                <span class="existence-step-number">2</span><small>构造项模型</small>
                <h3>Henkin 理论 H</h3><i>↓</i><code>项模型 𝔐ᴴ</code>
                <p>用闭项造对象，再让函数与谓词的解释直接读取 H。</p>
              </article>
              <article class="existence-step existence-step-verify">
                <span class="existence-step-number">3</span><small>证明模型正确</small>
                <h3>任取 A∈S</h3><code>A∈H ⇔ 𝔐ᴴ⊨A</code>
                <b>所以 𝔐ᴴ⊨S</b>
                <p>S 的每一句都属于 H；真值引理把“属于 H”变成“在模型中为真”。</p>
              </article>
              <article class="existence-step existence-step-reduct">
                <span class="existence-step-number">4</span><small>回到原语言</small>
                <h3>忘掉辅助常元</h3><code>𝔐=𝔐ᴴ↾L</code>
                <b>𝔐⊨S</b>
                <p>S 只使用原语言 L；忘掉施工时增加的名字，不改变它的真假。</p>
              </article>
              <i class="model-existence-map-arrow arrow-12" aria-hidden="true">→</i>
              <i class="model-existence-map-arrow arrow-23" aria-hidden="true">↓</i>
              <i class="model-existence-map-arrow arrow-34" aria-hidden="true">←</i>
            </div>
          </section>
          <section class="model-existence-next-use">
            <header><small>下一关为什么需要它</small><h3>把“无法证明”变成一个真正的反模型</h3></header>
            <div>
              <article><span>反设留下相容理论</span><code>T∪{¬A} 相容</code></article>
              <i><b>模型存在定理</b>→</i>
              <article><span>于是确实存在一个世界</span><code>𝔐⊨T　且　𝔐⊭A</code></article>
            </div>
            <p>这座桥让语法中的“没有矛盾”，最终成为语义中的“有模型”。</p>
          </section>
          <footer class="logic-overview-footer"><b>模型存在定理已经获得。</b><span>下一关第一次把它作为整座桥来使用。</span></footer>
        </article>`;
      return;
    }
    if (currentLevel().completenessLanguageReductOverview) {
      canvas.innerHTML = `
        <article class="logic-overview language-reduct-overview" aria-labelledby="languageReductTitle">
          <section class="logic-overview-hero language-reduct-hero">
            <span class="logic-overview-kicker">模型存在 · 回到原语言</span>
            <h2 id="languageReductTitle">辅助名字完成了使命，现在可以忘掉</h2>
            <p>项模型是在扩充语言 L* 中造出的。原理论 S 只会读取 L 中的符号，所以删去辅助常元的解释不会改变 S 中任何句子的真假。</p>
          </section>
          <section class="language-reduct-track">
            <article><small>扩充语言 L* 的模型</small><h3>𝔐ᴴ</h3><code>原符号：c, f, P, Q, R<br>辅助名字：d₀,d₁,d₂,…</code></article>
            <div><span>只略去辅助名字的解释</span><b>𝔐ᴴ↾L</b></div>
            <article><small>原语言 L 的模型</small><h3>𝔐</h3><code>原符号：c, f, P, Q, R<br>辅助名字：不再属于语言</code></article>
          </section>
          <section class="language-reduct-keeps">
            <article><small>保持不变</small><b>同一个论域</b></article>
            <article><small>保持不变</small><b>全部原符号的解释</b></article>
            <article><small>唯一略去</small><b>Henkin 辅助常元的解释</b></article>
          </section>
          <section class="language-reduct-truth"><span>A 是原语言 L 的句子</span><code>𝔐ᴴ⊨A　⇔　𝔐⊨A</code><p>A 的公式树里没有辅助名字，求值时自然不会读取它们。</p></section>
          <section class="language-reduct-result"><code>𝔐ᴴ⊨S</code><i>⇒</i><code>𝔐=𝔐ᴴ↾L ⊨ S</code><strong>相容的原语言理论 S 已经得到原语言模型</strong></section>
          <section class="language-reduct-theorem-seal"><small>至此正式得到</small><b>模型存在定理</b><code>S 相容　⇒　存在 𝔐，使 𝔐⊨S</code></section>
          <footer class="logic-overview-footer"><b>证明的最后一步已经完成。</b><span>下一关将拉远视角，完整展示这座从语法通往语义的桥。</span></footer>
        </article>`;
      return;
    }
    if (currentLevel().completenessTermQuotientOverview) {
      canvas.innerHTML = `
        <article class="logic-overview term-quotient-overview" aria-labelledby="termQuotientTitle">
          <section class="logic-overview-hero term-quotient-hero">
            <span class="logic-overview-kicker">项模型 · 论域</span>
            <h2 id="termQuotientTitle">把等名的一整组当作一个对象</h2>
            <p>认识名字如何合并，再逐个认识公式中的记号。</p>
          </section>
          <section class="quotient-everyday-example">
            <header><small>杯子与盘子的具体类比</small><h3>三张名字标签，最后只得到两个对象</h3><p>假设 H 认定 c 与 d 指向同一个杯子，而 f(c) 指向盘子。</p></header>
            <div class="quotient-animation-source" aria-label="三个闭项名字">
              <article><code>c</code><span class="dish-icon cup" aria-hidden="true"></span><b>杯子的名字</b></article>
              <article><code>d</code><span class="dish-icon cup" aria-hidden="true"></span><b>同一杯子的另一个名字</b></article>
              <article><code>f(c)</code><span class="dish-icon plate" aria-hidden="true"></span><b>盘子的名字</b></article>
            </div>
            <div class="quotient-animation-cue"><code>t∼u ⇔ H⊢t=u</code><span>按可证明相等合并</span><i>↓</i></div>
            <div class="quotient-animation-result" aria-label="合并后的两个对象">
              <article><span class="dish-icon cup" aria-hidden="true"></span><code>[c]=[d]</code><b>一个杯子对象</b></article>
              <article><span class="dish-icon plate" aria-hidden="true"></span><code>[f(c)]</code><b>一个盘子对象</b></article>
            </div>
            <p class="quotient-example-boundary">这只是帮助理解“多个名字合成一个对象”的具体类比。下一关还要正式证明 f(d) 与 f(c) 属于同一个等价类。</p>
          </section>
          <section class="quotient-notation-steps">
            <article><small>全部名字</small><code>T₀</code><p>膨胀语言 L* 中全部闭项的集合。下标 0 不是“第零阶段”。</p></article>
            <article><small>一个名字组</small><code>[t]</code><p>所有与 t 可证明相等的闭项。方括号不是语言中新添的项。</p></article>
            <article><small>全部名字组</small><code>T₀/∼</code><p>把 T₀ 按 ∼ 分组得到的商集。斜线表示分组，不是除法。</p></article>
            <article><small>模型的对象集合</small><code>Dᴴ</code><p>由 H 构造的项模型的论域。上标 H 表示来源，不是乘方。</p></article>
          </section>
          <section class="quotient-set-builder">
            <header><small>集合描述符</small><h3>花括号里收集什么？条件又是什么？</h3></header>
            <div><article><code>[t]</code><b>收进集合的对象</b><span>闭项 t 所属的整个等价类</span></article><i>｜</i><article><code>t∈T₀</code><b>t 要满足的条件</b><span>t 是膨胀语言中的闭项</span></article></div>
            <p>竖线读作“使得”。不同 t 若落入同一个等价类，集合中只保留同一个对象。</p>
          </section>
          <section class="quotient-final-equation">
            <code>Dᴴ</code><i>=</i><code>T₀/∼</code><i>=</i><code>{ [t]｜t∈T₀ }</code>
            <p><span>项模型的论域</span><span>按 ∼ 分组后的 T₀</span><span>所有闭项的等价类组成的集合</span></p>
          </section>
          <footer class="logic-overview-footer"><b>项模型的每个对象都是一整组等名，而不是某个代表元字符串。</b><span>下一关证明函数换用同一组中的另一个名字，结果仍代表同一个对象。</span></footer>
        </article>`;
      return;
    }
    if (currentLevel().completenessNegationTruthOverview) {
      canvas.innerHTML = `
        <article class="logic-overview negation-truth-overview" aria-labelledby="negationTruthTitle">
          <section class="logic-overview-hero negation-truth-hero">
            <span class="logic-overview-kicker">真值引理 · 否定根</span>
            <h2 id="negationTruthTitle">模型中的“假”，必须在 H 中留下否定</h2>
            <p>认识极大一致性怎样使得命题“不成立”与“否定属于 H”相等同。</p>
          </section>
          <section class="negation-concrete-case">
            <header><small>先看杯子与盘子的具体世界</small><h3>“盘子是杯子”为假，H 就留下它的否定</h3></header>
            <div class="negation-concrete-flow">
              <article class="negation-everyday-world">
                <header><b>这个世界中</b><code>P(·)：“·是杯子”</code></header>
                <div>
                  <section class="is-cup"><span class="dish-icon cup" aria-hidden="true"></span><b>杯子</b><code>c、d</code><small>P 成立</small></section>
                  <section><span class="dish-icon plate" aria-hidden="true"></span><b>盘子</b><code>f(c)、f(d)</code><small>P 不成立</small></section>
                </div>
                <strong><code>P(f(c))</code><span>“盘子是杯子”</span><b>假</b></strong>
              </article>
              <i>⇒</i>
              <article class="negation-bridge-card"><small>原子真值引理</small><code>P(f(c))∉H</code><p>模型中不成立，对应原子句不在 H 中。</p></article>
              <i>⇒</i>
              <article class="negation-choice-card"><small>H 对这一句恰留一面</small><s>P(f(c))</s><strong>¬P(f(c))</strong><b>留在 H 中</b></article>
            </div>
          </section>
          <section class="negation-two-directions">
            <header><small>现在推广到任意子公式 A</small><h3>同一条桥，必须从两个方向都能走通</h3><p>处理 ¬A 时，A 是它唯一且更小的子公式；归纳方法因此允许使用已经对 A 证明的对应。</p></header>
            <article>
              <b>从 H 走向模型</b>
              <div><code>¬A∈H</code><span>相容性</span><code>A∉H</code><span>A 的已有对应</span><code>𝔐ᴴ⊭A</code><span>否定语义</span><code>𝔐ᴴ⊨¬A</code></div>
              <p>H 已留下 ¬A 时，相容性禁止它同时留下 A。</p>
            </article>
            <article>
              <b>从模型走回 H</b>
              <div><code>𝔐ᴴ⊨¬A</code><span>否定语义</span><code>𝔐ᴴ⊭A</code><span>A 的已有对应</span><code>A∉H</code><span>判定性</span><code>¬A∈H</code></div>
              <p>A 已经不在 H 中时，判定性禁止 A 与 ¬A 两面都缺席。</p>
            </article>
          </section>
          <section class="negation-maximality-roles">
            <article><span>相容性</span><b>不能两面都留</b><code>¬A∈H ⇒ A∉H</code></article>
            <article><span>判定性</span><b>不能两面都空</b><code>A∉H ⇒ ¬A∈H</code></article>
            <strong>合在一起</strong>
            <code>¬A∈H ⇔ A∉H</code>
          </section>
          <section class="negation-truth-result"><span>否定的模型语义</span><i>＋</i><span>已经对较小子公式 A 证明的对应</span><i>＋</i><span>H 的极大一致性</span><b>⇒</b><code>𝔐ᴴ⊨¬A ⇔ ¬A∈H</code></section>
          <footer class="logic-overview-footer"><b>否定根已经保持“模型为真 ⇔ 公式属于 H”。</b><span>相容性负责一个方向，判定性负责另一个方向；二者缺一不可。</span></footer>
        </article>`;
      return;
    }
    if (currentLevel().completenessQuantifierTruthOverview) {
      canvas.innerHTML = `
        <article class="logic-overview quantifier-truth-overview" aria-labelledby="quantifierTruthTitle">
          <section class="logic-overview-hero quantifier-truth-hero">
            <span class="logic-overview-kicker">真值引理 · 量词根</span>
            <h2 id="quantifierTruthTitle">模型中的对象，都能由闭项叫出名字</h2>
            <p>这正是项模型适合处理量词的原因：模型中的对象见证与 H 中的闭项见证可以沿同一个名字来回对应。</p>
          </section>
          <section class="quantifier-everyday-example">
            <header><small>杯子与盘子的具体世界</small><h3>P(·) 仍然读作“·是杯子”</h3></header>
            <div class="quantifier-everyday-world">
              <article class="cup-object"><span class="dish-icon cup" aria-hidden="true"></span><b>杯子</b><code>[c]=[d]</code><small>闭项名字：c、d</small><strong>P 成立</strong></article>
              <article><span class="dish-icon plate" aria-hidden="true"></span><b>盘子</b><code>[f(c)]=[f(d)]</code><small>闭项名字：f(c)、f(d)</small><strong>P 不成立</strong></article>
            </div>
            <div class="quantifier-everyday-judgments">
              <article class="true"><code>∃xP(x)</code><span>“有一个对象是杯子”</span><b>杯子 [c] 作见证　✓</b></article>
              <article class="false"><code>∀xP(x)</code><span>“每个对象都是杯子”</span><b>盘子 [f(c)] 是反例　×</b></article>
            </div>
          </section>
          <section class="quantifier-smaller-formula-note">
            <div><code>∃xA(x)</code><span>或</span><code>∀xA(x)</code></div><i>取一个闭项名字 t，查看量词下面的公式</i><div><code>A(t)</code><b>更小的公式</b></div>
            <p>归纳方法已经允许我们使用这条先前证明的对应：<code>𝔐ᴴ⊨A(t) ⇔ A(t)∈H</code>。它不是新规则，也不是新节点。</p>
          </section>
          <section class="quantifier-truth-section existential">
            <header><span>存在量词</span><h3>一个闭项见证，在 H 与模型之间来回通行</h3></header>
            <article class="quantifier-proof-lane"><b>从 H 到模型</b><div><code>∃xA(x)∈H</code><i>Henkin 性</i><code>某个闭项 t<br>A(t)∈H</code><i>A(t) 的已有对应</i><code>𝔐ᴴ⊨A(t)</code><i>[t] 是模型对象</i><code>𝔐ᴴ⊨∃xA(x)</code></div></article>
            <article class="quantifier-proof-lane"><b>从模型到 H</b><div><code>𝔐ᴴ⊨∃xA(x)</code><i>见证对象有闭项名字 t</i><code>𝔐ᴴ⊨A(t)</code><i>A(t) 的已有对应</i><code>A(t)∈H</code><i>∃I；H 收下可证明结果</i><code>∃xA(x)∈H</code></div></article>
            <strong class="quantifier-section-result">𝔐ᴴ⊨∃xA(x) ⇔ ∃xA(x)∈H</strong>
          </section>
          <section class="quantifier-truth-section universal">
            <header><span>全称量词</span><h3>每个闭项都通过，才是每个对象都通过</h3></header>
            <article class="quantifier-proof-lane"><b>全称属于 H</b><div><code>∀xA(x)∈H</code><i>对每个闭项 t 使用 ∀E</i><code>A(t)∈H</code><i>A(t) 的已有对应</i><code>𝔐ᴴ⊨A(t)</code><i>每个对象都是某个 [t]</i><code>𝔐ᴴ⊨∀xA(x)</code></div></article>
            <article class="quantifier-proof-lane counterexample"><b>全称不属于 H</b><div><code>∀xA(x)∉H</code><i>判定性</i><code>¬∀xA(x)∈H</code><i>K25 的量词对偶</i><code>∃x¬A(x)∈H</code><i>存在步骤给出模型反例</i><code>𝔐ᴴ⊭∀xA(x)</code></div><p>反过来说：模型若满足全称句，它就不可能缺席于 H。这样补齐另一个方向。</p></article>
            <strong class="quantifier-section-result">𝔐ᴴ⊨∀xA(x) ⇔ ∀xA(x)∈H</strong>
          </section>
          <footer class="logic-overview-footer"><b>两个量词根都已保持“模型为真 ⇔ 公式属于 H”。</b><span>存在靠闭项见证；全称靠所有闭项实例，并在失败时由 K25 找出反例。</span></footer>
        </article>`;
      return;
    }
    if (currentLevel().completenessAtomicTruthOverview) {
      canvas.innerHTML = `
        <article class="logic-overview atomic-truth-overview" aria-labelledby="atomicTruthTitle">
          <section class="logic-overview-hero atomic-truth-hero">
            <span class="logic-overview-kicker">从语法到语义</span>
            <h2 id="atomicTruthTitle">项模型是把 H 变成一个世界的方法</h2>
            <p>完备性不能只说“应该存在一个模型”，而要从相容理论 H 亲手造出一个。𝔐ᴴ 就是前几关已经搭好的这个模型。</p>
          </section>
          <section class="atomic-truth-purpose">
            <article><small>它是什么</small><h3>由闭项搭成的模型</h3><p>闭项的等价类 [t] 充当对象；函数沿项的构造运行；谓词与关系直接读取 H 中保留了哪些原子句。</p></article>
            <i>→</i>
            <article><small>为什么要它</small><h3>给 H 找到一个语义世界</h3><p>目标是让 H 中的每句话都在 𝔐ᴴ 中为真，从而把“理论相容”变成“理论拥有模型”。</p></article>
          </section>
          <section class="atomic-truth-bridge"><code>相容的 H</code><i>构造</i><code>项模型 𝔐ᴴ</code><i>最终证明</i><code>𝔐ᴴ⊨H</code></section>
          <section class="atomic-truth-grid">
            <article><small>一元谓词</small><code>𝔐ᴴ⊨P(t)<br>⇔ [t]∈Pᴴ<br>⇔ P(t)∈H</code></article>
            <article><small>二元关系</small><code>𝔐ᴴ⊨R(t,u)<br>⇔ ⟨[t],[u]⟩∈Rᴴ<br>⇔ R(t,u)∈H</code></article>
            <article><small>等号</small><code>𝔐ᴴ⊨t=u<br>⇔ [t]=[u]<br>⇔ t=u∈H</code></article>
          </section>
          <section class="henkin-construction-summary"><span>项取值引理</span><i>＋</i><span>按 H 定义解释</span><b>⇒</b><code>原子 A：𝔐ᴴ⊨A ⇔ A∈H</code></section>
          <footer class="logic-overview-footer"><b>项模型的目的已经明确，原子层也已兑现。</b><span>接下来证明这种对应会沿连接词与量词传播到所有句子。</span></footer>
        </article>`;
      return;
    }
    if (currentLevel().completenessMaximalHenkinOverview) {
      canvas.innerHTML = `
        <article class="logic-overview maximal-henkin-overview" aria-labelledby="maximalHenkinTitle">
          <section class="logic-overview-hero maximal-henkin-hero">
            <span class="logic-overview-kicker">完备性施工 · 模型蓝图</span>
            <h2 id="maximalHenkinTitle">我们需要一个极大一致 Henkin 集</h2>
            <p>我们希望模型能直接按照 H 解释真假与存在。H 因此必须同时解决两个不同的问题。</p>
          </section>
          <section class="henkin-purpose-problems">
            <article><small>真假不能留白</small><h3>一句话的两面必须选定</h3><p>如果 B 与 ¬B 都不在 H，今后便无法从 H 读出 B 在模型里应真还是应假。</p></article>
            <article><small>存在不能只有承诺</small><h3>见证必须拥有闭项名字</h3><p>如果 ∃xφ(x) 在 H 中，却没有任何 φ(t)，以闭项为对象的模型就找不到见证。</p></article>
          </section>
          <section class="henkin-two-solutions">
            <article><span>极大一致</span><code>对每个 B，恰有 B、¬B 之一在 H 中</code><p>相容保证两面不会同时出现；逐句判定保证不会两面都缺席。</p></article>
            <article><span>Henkin 性</span><code>∃xφ(x)∈H ⇒ 某个 φ(t)∈H</code><p>每个被保留的存在句，都有一个闭项 t 明确叫出它的见证。</p></article>
          </section>
          <section class="henkin-collection-strip"><span>S₀ ⊆ S₁ ⊆ S₂ ⊆ ⋯</span><b>收集各阶段保留的句子</b><code>B∈H ⇔ 存在 n，使 B∈Sₙ</code></section>
          <section class="henkin-consistency-compact">
            <header><small>为什么收集以后仍然相容</small><h3>有限证明不可能把矛盾藏在无限远处</h3></header>
            <div><span>假设</span><code>H⊢⊥</code><i>⇒</i><span>证明只用有限片前提</span><i>⇒</i><span>它们全在某个 Sᴺ</span><i>⇒</i><code>Sᴺ⊢⊥　矛盾</code></div>
          </section>
          <section class="henkin-blueprint-grid">
            <article><small>闭项</small><b>成为对象</b></article>
            <article><small>原子句属于 H</small><b>决定谓词与关系</b></article>
            <article><small>极大一致</small><b>处理连接词真假</b></article>
            <article><small>闭项见证</small><b>处理存在量词</b></article>
          </section>
          <footer class="logic-overview-footer"><b>H 是包含 S₀ 的极大一致 Henkin 集。</b><span>下一关先证明：H 已经能证明的句子，也一定写在 H 中。</span></footer>
        </article>`;
      return;
    }
    if (currentLevel().completenessEnumerationOverview) {
      canvas.innerHTML = `
        <article class="logic-overview completeness-enumeration-overview" aria-labelledby="enumerationOverviewTitle">
          <section class="logic-overview-hero completeness-enumeration-hero">
            <span class="logic-overview-kicker">完备性施工表</span>
            <h2 id="enumerationOverviewTitle">每个句子都会轮到</h2>
            <p>未来的理论必须对语言中的每个句子作出一次选择。第一步不是发明枚举器，而是证明有限公式树能够排成一列。</p>
            <code class="enumeration-main-sequence">σ₀　σ₁　σ₂　σ₃　…</code>
          </section>
          <section class="enumeration-rank-board">
            <header><span>先按公式秩分层</span><h3>有限构造给每个句子一个有限层数</h3><p>原子句位于起始层；每使用一次连接词或量词，根的秩只比直接子公式高一层。</p></header>
            <div>
              <article><small>秩 0</small><code>P(c)　R(c,c)　c=c</code><p>闭原子公式</p></article>
              <i>↓</i>
              <article><small>秩 1</small><code>¬P(c)　P(c)→Q(c)<br>∀xP(x)</code><p>在更低层公式上增加一个根</p></article>
              <i>↓</i>
              <article><small>秩 2、3、…</small><code>¬∀xP(x)<br>∀x(P(x)→Q(x))　…</code><p>任何有限公式树都停在某一层</p></article>
            </div>
          </section>
          <section class="enumeration-two-orders">
            <article><small>层与层之间</small><h3>先处理较低的秩</h3><p>秩给出第一重次序，保证有限公式不会被无限深的公式挡在后面。</p></article>
            <article><small>同一层之内</small><h3>沿符号与子公式次序排列</h3><p>语言符号已经能够排成一列；有限个位置组成的构造记录也能依次排列。</p></article>
          </section>
          <section class="enumeration-result-strip"><span>每个句子都是有限构造</span><i>＋</i><span>每层内部都有固定次序</span><b>⇒</b><code>全部句子：σ₀,σ₁,σ₂,…</code></section>
          <section class="enumeration-boundary-note"><b>这不是语言内部的编号。</b><p>σₙ 是元理论中的排队记号；玩家不会得到一个“生成任意句子”的新节点。下一关只取队首的一个具体句子，观察一次真正的判定。</p></section>
          <footer class="logic-overview-footer"><b>施工表已经覆盖全部有限句子。</b><span>现在可以逐句扩张相容理论。</span></footer>
        </article>`;
      return;
    }
    if (currentLevel().consistencyOverview) {
      canvas.innerHTML = `
        <article class="logic-overview consistency-overview" aria-labelledby="consistencyOverviewTitle">
          <section class="logic-overview-hero consistency-overview-hero">
            <span class="logic-overview-kicker">可靠性的第一个用途</span>
            <h2 id="consistencyOverviewTitle">两种“没有坏掉”</h2>
            <p>模型与证明从不同方向检验同一个理论。它们不是同一个定义，但可靠性已经让其中一个方向成立。</p>
          </section>
          <section class="consistency-two-definitions">
            <article><small>语义侧</small><h3>可满足</h3><code>存在 𝔐，使 𝔐⊨T</code><p>至少有一个世界能同时实现 T 的全部要求。</p></article>
            <article><small>语法侧</small><h3>相容</h3><code>T⊬⊥</code><p>不存在一份从 T 的公理出发推到矛盾的形式证明。</p></article>
          </section>
          <section class="consistency-known-direction">
            <header><span>刚刚证明的方向</span><h3>一个模型足以排除矛盾证明</h3></header>
            <div><code>存在 𝔐⊨T</code><i>＋</i><code>可靠性：T⊢A ⇒ T⊨A</code><b>⇒</b><code>T⊬⊥</code></div>
            <p>因为 ⊥ 在任何模型中都为假。若 T 能推出 ⊥，可靠性就会强迫每个 T 的模型满足 ⊥，与手中的模型直接冲突。</p>
          </section>
          <section class="consistency-open-direction">
            <div><small>已经拥有</small><code>可满足 ⇒ 相容</code><span>可靠性给出</span></div>
            <div><small>仍待解决</small><code>相容 ⇒ 可满足　?</code><span>怎样仅凭“推不出矛盾”，造出一个完整模型？</span></div>
          </section>
          <section class="consistency-next-road">
            <span>完备性的模型存在路线</span>
            <div><b>相容理论</b><i>→</i><b>逐句扩张</b><i>→</i><b>加入见证</b><i>→</i><b>项模型</b></div>
            <p>这些还不是已经获得的零件，只是下一章需要逐步完成的施工顺序。</p>
          </section>
          <footer class="logic-overview-footer"><b>可靠性不仅保证已有证明，也让反模型成为不可证明性的证据。</b><span>下一次进入元理论时，将从缺失的反方向开始。</span></footer>
        </article>`;
      return;
    }
    if (currentLevel().soundnessOverview) {
      canvas.innerHTML = `
        <article class="logic-overview soundness-overview" aria-labelledby="soundnessOverviewTitle">
          <section class="logic-overview-hero soundness-overview-hero">
            <span class="logic-overview-kicker">第一个元定理</span>
            <h2 id="soundnessOverviewTitle">证明不会超出语义</h2>
            <p>语法后承说存在一棵形式证明；语义后承说所有满足前提的模型都满足结论。可靠性把前一种保证送到后一种保证。</p>
            <code class="soundness-main-theorem">Γ ⊢ A　⇒　Γ ⊨ A</code>
          </section>
          <section class="soundness-two-sides">
            <article><small>语法侧</small><h3>Γ ⊢ A</h3><p>存在一棵从 Γ 的公式出发、只使用已构造规则并以 A 为根的有限证明树。</p></article>
            <i aria-hidden="true">保持真</i>
            <article><small>语义侧</small><h3>Γ ⊨ A</h3><p>任取模型与赋值，只要它满足 Γ，就一定也满足 A。</p></article>
          </section>
          <section class="soundness-induction-proof">
            <header><span>对证明高度作归纳</span><h3>把 R8 的两条依赖链写成完整证明</h3><p>对任意公式集 Γ、公式 A 和一份证明 π，证明：只要 π 建立了 Γ⊢A，就一定有 Γ⊨A。</p></header>
            <div class="soundness-induction-property">
              <div><small>归纳命题</small><code>若 π 是 Γ⊢A 的证明，<br>那么 Γ⊨A</code></div>
              <div><small>证明高度</small><code>h(前提叶)=0　h(r())=1<br>k≥1 时，h(r(π₁,…,πₖ))=1+max h(πᵢ)</code></div>
            </div>
            <div class="soundness-induction-cases">
              <article class="base-case">
                <header><small>归纳基础</small><h4>高度 h(π)=0</h4></header>
                <div class="soundness-premise-pair"><code>A∈Γ</code><span>并且</span><code>𝔐,s⊨Γ</code></div>
                <i aria-hidden="true">↓</i>
                <strong>𝔐,s⊨A</strong>
                <p>高度为 0 时没有规则步骤，π 只有一片来自 Γ 的前提叶。模型满足整个 Γ，自然就满足其中的 A。</p>
              </article>
              <article class="step-case">
                <header><small>归纳推步</small><h4>高度 h(π)=n+1</h4></header>
                <div class="soundness-last-rule"><span>π₁　…　πₖ</span><b></b><code>Γ₁⊢B₁　…　Γₖ⊢Bₖ<br>──────────── r<br>Γ⊢A</code></div>
                <ol>
                  <li><b>直接子证明更矮</b><code>若有 πᵢ，则 h(πᵢ)≤n；零前提规则在这里没有子证明</code></li>
                  <li><b>使用归纳假设</b><span>对每份直接子证明得到 Γᵢ⊨Bᵢ</span></li>
                  <li><b>使用 r 的局部保真</b><span>把这些语义后承合成最后结论 Γ⊨A</span></li>
                </ol>
              </article>
            </div>
            <div class="soundness-induction-result"><span>高度 0 成立</span><i>＋</i><span>从不超过 n 推到 n+1</span><b>因此每个有限高度都成立</b><code>只要 Γ⊢A，就有 Γ⊨A</code></div>
          </section>
          <section class="soundness-local-ledger">
            <header><span>最后规则为什么保持真</span><h3>归纳统一传播；语义逐类提供局部依据</h3><p>归纳推步中的 r 可以是系统里的任意规则。下面不是四个新零件，而是玩家已经构造过的规则及其语义来源。</p></header>
            <div>
              <article><small>真值条件</small><h4>∧I/E　∨I　→E　¬E　⊥E</h4><p>直接展开连接词的真假条件：只要规则上方全真，下方就不可能为假。</p></article>
              <article><small>临时范围</small><h4>→I　¬I　∨E　RAA</h4><p>子证明可以暂时使用扩大的公式集；规则结束时再解除对应依赖。</p><code class="soundness-scope-example">Γ∪{A}⊢B<br>归纳假设：Γ∪{A}⊨B<br>→I：Γ⊨A→B</code><p>∨E、¬I 同样处理临时依赖；RAA 还使用经典二值语义。</p></article>
              <article><small>对象与 Flag</small><h4>∀I/E　∃I/E</h4><p>实例和见证来自论域；任意名字与临时见证的 Flag 保证结论没有偷带固定对象。</p></article>
              <article><small>同一对象</small><h4>=I　=E</h4><p>=I 使用论域上的自环；=E 把相同指称换入同一公式位置，真假不会改变。</p></article>
            </div>
          </section>
          <section class="soundness-boundary">
            <article><small>已经证明</small><code>Γ⊢A ⇒ Γ⊨A</code><p>有证明，就不可能找到满足 Γ 而推翻 A 的模型。</p></article>
            <article><small>尚未声称</small><code>Γ⊨A ⇒ Γ⊢A</code><p>从所有模型中的必然成立反向构造证明，是之后的完备性问题。</p></article>
          </section>
          <footer class="logic-overview-footer"><b>形式规则已经获得语义保证。</b><span>可靠性完成；完备性仍保持为一个真正不同的问题。</span></footer>
        </article>`;
      return;
    }
    if (currentLevel().firstOrderOverview) {
      canvas.innerHTML = `
        <article class="logic-overview first-order-system-overview" aria-labelledby="firstOrderOverviewTitle">
          <section class="logic-overview-hero">
            <span class="logic-overview-kicker">第二门完整逻辑</span>
            <h2 id="firstOrderOverviewTitle">无等号一阶逻辑</h2>
            <p>命题逻辑中的整块命题已经展开成对象、项与谓词。你构造出的语言现在既能描述一个世界，也能在其中求值并进行形式推导。</p>
            <div class="logic-architecture" aria-label="无等号一阶逻辑的四个层次">
              <div class="logic-architecture-root"><small>共同研究的对象</small><b>一阶公式</b></div>
              <div class="logic-architecture-branches four-way"><article><b>项</b><span>指向对象</span></article><article><b>公式</b><span>作出陈述</span></article><article><b>模型</b><span>给予意义</span></article><article><b>证明</b><span>保存推理</span></article></div>
            </div>
          </section>

          <section class="logic-overview-chapter language-chapter">
            <header><span>语法</span><h3>项进入谓词位置，公式继续组成公式</h3><p>项本身没有真假；原子公式是公式树的起点，连接词与量词让树继续生长。</p></header>
            <div class="fol-inventory-grid">
              <article><small>项</small><code>x　c　f(x)　f(f(x))</code><p>变量、常元和函数项最终指向论域对象。</p></article>
              <article><small>原子公式</small><code>P(x)　R(f(x),c)</code><p>谓词接收规定数量的项，第一次形成可真可假的公式。</p></article>
              <article><small>公式构造</small><code>¬A　A∧B　A∨B　A→B</code><p>命题逻辑中已经构造的连接词完整保留。</p></article>
              <article><small>变量绑定</small><code>∀xA　∃xA</code><p>量词只绑定自己的辖域；全部自由变量被绑定后得到句子。</p></article>
            </div>
          </section>

          <section class="logic-overview-chapter workings-chapter">
            <header><span>语义</span><h3>同一棵公式树进入一个模型</h3><p>模型解释非逻辑符号；变量赋值只为自由变量安排当前对象。两者各司其职。</p></header>
            <div class="fol-semantics-flow">
              <article><small>论域</small><code>D={杯子,盘子}</code><p>公式正在谈论的全部对象。</p></article><i>＋</i>
              <article><small>模型解释</small><code>cᴹ　fᴹ　Pᴹ　Rᴹ</code><p>常元指向对象，函数作用于对象，谓词与关系规定何时成立。</p></article><i>＋</i>
              <article><small>变量赋值</small><code>s：x↦杯子</code><p>开公式的自由变量从这里取得当前所指。</p></article>
            </div>
            <div class="logic-language-statement fol-satisfaction-line"><code>项 → 论域对象</code><span>然后</span><code>公式 → 成立或不成立</code></div>
          </section>

          <section class="logic-overview-chapter achievements-chapter">
            <header><span>自然演绎</span><h3>证明规则已经覆盖连接词与量词</h3><p>公式代入控制换入项的位置；两种 flag 控制只能临时使用的名字。</p></header>
            <div class="logic-rule-inventory fol-rule-inventory"><div>
              <p><b>命题规则</b><code>∧I/E　∨I/E　→I/E　¬I/E　⊥E　RAA</code></p>
              <p><b>量词规则</b><code>∀I/E　∃I/E</code></p>
              <p><b>名字纪律</b><code>任意 flag　见证 flag</code></p>
              <p><b>安全代入</b><code>φ[t/x]</code></p>
            </div></div>
            <div class="fol-boundary-note"><b>这里还没有等号。</b><p>这并不是残缺的半成品：无等号一阶逻辑已经是一门完整语言。下一章将把等号作为具有固定模型意义与专门推理规则的扩展加入。</p></div>
          </section>

          <footer class="logic-overview-footer"><b>语法、语义与证明已经第一次完整汇合。</b><span>继续进入等号扩展。</span></footer>
        </article>`;
      return;
    }
    if (currentLevel().semanticLesson === "coincidence-lemma") {
      canvas.innerHTML = `
        <article class="logic-overview semantic-lesson-overview" aria-labelledby="coincidenceLemmaTitle">
          <section class="logic-overview-hero semantic-lesson-hero">
            <span class="logic-overview-kicker">变量与绑定 · 合同引理</span>
            <h2 id="coincidenceLemmaTitle">公式只读取它的自由变量</h2>
            <p>两个赋值可以在许多变量上不同；只要它们在公式真正自由出现的变量上相同，同一个模型就会给出相同的满足判断。</p>
            <code class="model-overview-equation">s｜FV(φ)=t｜FV(φ)　⇒　(𝔐,s⊨φ ⇔ 𝔐,t⊨φ)</code>
          </section>
          <section class="coincidence-dependency-board">
            <article><code>P(x)</code><span>自由变量</span><b>{x}</b><p>从初始赋值读取 x</p></article>
            <article><code>∀xP(x)</code><span>自由变量</span><b>∅</b><p>x 已由量词接管，不再读取初始赋值</p></article>
            <article><code>∀xR(x,y)</code><span>自由变量</span><b>{y}</b><p>只从初始赋值读取 y</p></article>
          </section>
          <section class="coincidence-boundary-note">
            <div><span>现在获得</span><h3>合同引理的陈述与用法</h3><p>它统一解释了开公式依赖自由变量、句子不依赖初始赋值等现象。</p></div>
            <div><span>以后补上</span><h3>对公式树的结构归纳证明</h3><p>证明工具尚未构造，因此这里不把几个例子冒充一般证明。</p></div>
          </section>
          <footer class="logic-overview-footer"><b>合同现象已经概括为一般陈述。</b><span>它的结构归纳证明留到元理论；现在返回模型与语义主线。</span></footer>
        </article>`;
      return;
    }
    if (currentLevel().semanticLesson === "quantifier-paths") {
      canvas.innerHTML = `
        <article class="logic-overview semantic-lesson-overview" aria-labelledby="quantifierPathsTitle">
          <section class="logic-overview-hero semantic-lesson-hero">
            <span class="logic-overview-kicker">量词语义 · 赋值更新</span>
            <h2 id="quantifierPathsTitle">x 不是同时指向所有对象</h2>
            <p>论域 D={a,b}。量词保留原赋值的其他部分，分别把 x 改指向 a、b，于是同一个公式产生两条求值路径。</p>
            <code class="model-overview-equation">s[x↦a]　　s[x↦b]</code>
          </section>
          <section class="quantifier-path-board">
            <header><span>同一个公式 φ</span><b>让 x 依次经过整个论域</b></header>
            <div class="assignment-paths">
              <article><small>第一条路径</small><code>s[x↦a]</code><div><span>x</span><i>↦</i><b>a</b></div><p>在这份更新后的赋值下考察 φ</p></article>
              <div class="path-divider" aria-hidden="true">D={a,b}</div>
              <article><small>第二条路径</small><code>s[x↦b]</code><div><span>x</span><i>↦</i><b>b</b></div><p>在这份更新后的赋值下考察 φ</p></article>
            </div>
          </section>
          <section class="quantifier-meaning-grid">
            <article><span>∀xφ</span><h3>每条路径都必须成立</h3><p>a、b 以及论域中的其他任何对象都不能遗漏。</p></article>
            <article><span>∃xφ</span><h3>找到一条成立的路径</h3><p>提供这条路径的对象叫作一个见证。</p></article>
          </section>
          <footer class="logic-overview-footer"><b>量词操作的是变量赋值。</b><span>有限论域让路径可以全部画出，但全称与存在并不是合取、析取零件。</span></footer>
        </article>`;
      return;
    }
    if (currentLevel().semanticLesson === "closed-sentence") {
      canvas.innerHTML = `
        <article class="logic-overview semantic-lesson-overview" aria-labelledby="closedSentenceTitle">
          <section class="logic-overview-hero semantic-lesson-hero">
            <span class="logic-overview-kicker">闭公式 · 赋值退出</span>
            <h2 id="closedSentenceTitle">量词接管了 x 和 y</h2>
            <p>开公式会保留自由变量的初始所指；句子 ∀x∃yR(x,y) 没有自由变量，因此初始赋值不会改变它的真假。</p>
            <code class="model-overview-equation">𝔐 ⊨ ∀x∃yR(x,y)</code>
          </section>
          <section class="sentence-binding-board">
            <div class="discarded-assignments">
              <article><small>一种初始赋值</small><code>s：x↦a，y↦b</code></article>
              <article><small>另一种初始赋值</small><code>t：x↦b，y↦a</code></article>
              <span>都会被覆盖</span>
            </div>
            <div class="binding-arrow" aria-hidden="true">→</div>
            <div class="binding-stack">
              <article><b>∀x</b><span>令 x 依次指向论域中的每个对象</span></article>
              <article><b>∃y</b><span>为当前的 x 寻找一个 y</span></article>
              <article><b>R(x,y)</b><span>判断所得对象对是否在 Rᴹ 中</span></article>
            </div>
          </section>
          <section class="sentence-result-strip"><span>没有自由变量留下</span><b>同一个模型中，所有初始赋值都会得到同一结果</b><code>𝔐⊨σ　或　𝔐⊭σ</code></section>
          <footer class="logic-overview-footer"><b>这就是为什么句子可以省略变量赋值。</b><span>下一关将反过来为这个句子构造一个满足它的关系模型。</span></footer>
        </article>`;
      return;
    }
    if (currentLevel().modelOverview) {
      canvas.innerHTML = `
        <article class="logic-overview model-overview" aria-labelledby="modelOverviewTitle">
          <section class="logic-overview-hero model-overview-hero">
            <span class="logic-overview-kicker">模型与语义 · 第一座世界</span>
            <h2 id="modelOverviewTitle">模型 𝔐 已经完整</h2>
            <p>语言提供 P、Q、R；模型指定它们在一个由 a、b 组成的世界里分别适用于什么。</p>
            <code class="model-overview-equation">𝔐=(D, Pᴹ, Qᴹ, Rᴹ)</code>
          </section>

          <section class="logic-overview-chapter model-ledger-section">
            <header><span>抽象记录</span><h3>这个模型里有什么</h3><p>每一项都来自刚才已经完成的构造，没有新增的装配操作。</p></header>
            <div class="model-ledger">
              <article><small>世界中的全部对象</small><b>论域</b><code>D={a,b}</code></article>
              <article><small>P 适用于哪些对象</small><b>一元谓词 P</b><code>Pᴹ={a}</code></article>
              <article><small>Q 适用于哪些对象</small><b>一元谓词 Q</b><code>Qᴹ={a,b}</code></article>
              <article><small>R 适用于哪些对象对</small><b>二元谓词 R</b><code>Rᴹ={⟨a,b⟩,⟨b,a⟩}</code></article>
            </div>
          </section>

          <section class="logic-overview-chapter everyday-model-section">
            <header><span>日常解释</span><h3>把它读成杯子和盘子</h3><p>给符号指定日常含义后，同一份抽象记录就描述了桌上的两个对象。</p></header>
            <div class="model-translation">
              <div class="model-vocabulary">
                <div><code>a</code><span><b>杯子</b><small>论域中的一个对象</small></span></div>
                <div><code>b</code><span><b>盘子</b><small>论域中的另一个对象</small></span></div>
                <div><code>P(x)</code><span><b>x 有把手</b><small>只适用于杯子</small></span></div>
                <div><code>Q(x)</code><span><b>x 是餐具</b><small>适用于杯子和盘子</small></span></div>
                <div><code>R(x,y)</code><span><b>x 放在 y 旁边</b><small>描述两个对象之间的位置关系</small></span></div>
              </div>
              <div class="tabletop-world" aria-label="杯子和盘子组成的日常模型">
                <article class="table-object"><span>a</span><div class="object-pictogram cup-pictogram" aria-hidden="true"></div><h4>杯子</h4><p><i>P</i><i>Q</i></p><small>有把手，也是餐具</small></article>
                <div class="table-relation" aria-label="杯子与盘子互相放在对方旁边"><b>R</b><span aria-hidden="true">↔</span><small>放在旁边</small></div>
                <article class="table-object"><span>b</span><div class="object-pictogram plate-pictogram" aria-hidden="true"></div><h4>盘子</h4><p><i>Q</i></p><small>是餐具，没有把手</small></article>
              </div>
            </div>
            <div class="model-reading-result">
              <p><b>Pᴹ={a}</b><span>只有杯子有把手</span></p>
              <p><b>Qᴹ={a,b}</b><span>杯子和盘子都是餐具</span></p>
              <p><b>Rᴹ={⟨a,b⟩,⟨b,a⟩}</b><span>杯子在盘子旁边，盘子也在杯子旁边</span></p>
            </div>
            <p class="logic-language-statement">P、Q、R 像语言里的词汇；论域是它谈论的世界；模型解释则规定这些词汇在这个世界中指什么。</p>
          </section>
        </article>`;
      return;
    }
    if (currentLevel().semanticOverview) {
      canvas.innerHTML = `
        <article class="logic-overview semantics-overview" aria-labelledby="semanticsOverviewTitle">
          <section class="logic-overview-hero">
            <span class="logic-overview-kicker">一阶逻辑 · 第二章</span>
            <h2 id="semanticsOverviewTitle">让公式进入一个世界</h2>
            <p>P(x) 的语法树已经完成，但仅凭这棵树还不能知道它是真是假。</p>
            <div class="logic-architecture">
              <div class="logic-architecture-root"><small>已经拥有</small><b>P(x)</b></div>
              <div class="logic-architecture-branches">
                <article><b>模型 𝔐</b><span>世界里有什么，P、Q、R 分别表示什么</span></article>
                <article><b>变量赋值 s</b><span>自由变量 x、y 当前指向哪个对象</span></article>
              </div>
            </div>
          </section>
          <section class="logic-overview-chapter language-chapter">
            <header><span>模型的两层材料</span><h3>先造对象范围，再解释符号</h3><p>符号不会自行获得意义；同一个符号可以在不同模型中得到不同解释。</p></header>
            <div class="logic-language-parts semantics-parts">
              <div class="logic-language-group"><small>论域</small><div><code>D={a,b}</code></div><p>当前世界中全部对象组成的非空集合。</p></div>
              <i aria-hidden="true">＋</i>
              <div class="logic-language-group constructors"><small>符号解释</small><div><code>Pᴹ,Qᴹ⊆D</code><code>Rᴹ⊆D×D</code></div><p>一元谓词成为对象集合，二元谓词成为有序边集合。</p></div>
            </div>
          </section>
          <section class="logic-overview-chapter workings-chapter">
            <header><span>开公式还多一层</span><h3>x 必须先指向某个对象</h3><p>赋值 s 是变量到论域的函数；它与模型分工不同。</p></header>
            <div class="logic-working-grid">
              <article class="logic-working-card semantic-working"><h4>变量项求值</h4><div class="logic-valuation-example"><span>s(x)=a</span><span>a∈D</span></div><p>语法中的项 x 经由赋值，落到论域对象 a。</p></article>
              <article class="logic-working-card semantic-working"><h4>原子公式成立</h4><div class="logic-valuation-example"><span>s(x)=a</span><span>a∈Pᴹ</span></div><p>两步合在一起，才得到 𝔐,s⊨P(x)。</p></article>
            </div>
          </section>
        </article>`;
      return;
    }
    canvas.innerHTML = `
      <article class="logic-overview" aria-labelledby="logicOverviewTitle">
        <section class="logic-overview-hero">
          <span class="logic-overview-kicker">第一门完整逻辑</span>
          <h2 id="logicOverviewTitle">经典命题逻辑</h2>
          <p>你已经构造了一套能够形成公式、计算经典真值并进行形式证明的系统。</p>
          <div class="logic-architecture" aria-label="经典命题逻辑的三个组成部分">
            <div class="logic-architecture-root"><small>共同研究的对象</small><b>命题公式</b></div>
            <div class="logic-architecture-branches">
              <article><b>经典二值语义</b><span>公式在一次赋值下的真值</span></article>
              <article><b>自然演绎系统</b><span>公式怎样由已有公式得到</span></article>
            </div>
          </div>
        </section>

        <section class="logic-overview-chapter language-chapter">
          <header><span>公式语言</span><h3>什么可以写成公式</h3><p>从明确的起点出发，反复使用已经构造过的连接词。</p></header>
          <div class="logic-language-parts">
            <div class="logic-language-group"><small>公式的起点</small><div><code>P</code><code>Q</code><code>⊥</code></div></div>
            <i aria-hidden="true">＋</i>
            <div class="logic-language-group constructors"><small>形成新公式的方法</small><div><code>¬A</code><code>A∧B</code><code>A∨B</code><code>A→B</code></div></div>
          </div>
          <p class="logic-language-statement">从 P、Q、⊥ 出发，有限次使用这些构造，得到的正是当前语言中的公式。</p>
          <div class="logic-formula-example">
            <div class="logic-mini-tree" aria-label="公式 (P 或 Q) 蕴含 (Q 或 P) 的语法树">
              <div class="logic-mini-node root">→</div>
              <div class="logic-mini-children">
                <div class="logic-mini-subtree"><div class="logic-mini-node">∨</div><div class="logic-mini-leaves"><span>P</span><span>Q</span></div></div>
                <div class="logic-mini-subtree"><div class="logic-mini-node">∨</div><div class="logic-mini-leaves"><span>Q</span><span>P</span></div></div>
              </div>
            </div>
            <div><small>一棵已经构造过的公式树</small><code>(P∨Q)→(Q∨P)</code><p>连接词决定树的分叉方式；P、Q 位于叶子。</p></div>
          </div>
        </section>

        <section class="logic-overview-chapter workings-chapter">
          <header><span>同一批公式</span><h3>两种不同的工作方式</h3><p>语义为公式计算真值；证明系统记录哪些推理步骤被允许。</p></header>
          <div class="logic-working-grid">
            <article class="logic-working-card semantic-working">
              <h4>经典二值语义</h4>
              <p>先为原子公式选择真或假，再从叶子向根求值。</p>
              <div class="logic-valuation-example"><span>P：真</span><span>Q：假</span></div>
              <div class="logic-evaluation-tree">
                <div class="logic-eval-root"><b>P∧Q</b><em>假</em></div>
                <div class="logic-eval-children"><span><b>P</b><em>真</em></span><span><b>Q</b><em>假</em></span></div>
              </div>
              <div class="logic-connective-functions"><span>¬</span><span>∧</span><span>∨</span><span>→</span><p>你已经分别构造了四个真值函数。</p></div>
            </article>

            <article class="logic-working-card proof-working">
              <h4>自然演绎系统</h4>
              <p>推导可以使用来自 Γ 的前提，也可以暂时采用一个公式并在之后解除依赖。</p>
              <div class="logic-proof-origins"><span>来自 Γ</span><span>假设</span></div>
              <div class="logic-fitch-sample" aria-label="P 蕴含 P 且 P 的 Fitch 证明">
                <div class="scoped"><b>1</b><code>P</code><span>假设</span></div>
                <div class="scoped end"><b>2</b><code>P∧P</code><span>∧I 1,1</span></div>
                <div><b>3</b><code>P→(P∧P)</code><span>→I 1–2</span></div>
              </div>
              <div class="logic-proof-layouts"><span>Gentzen：分叉证明树</span><span>Fitch：带范围的线性证明</span></div>
            </article>
          </div>

          <div class="logic-rule-inventory">
            <h4>现在可以使用的推理规则</h4>
            <div>
              <p><b>合取</b><code>∧I　∧E₁　∧E₂</code></p>
              <p><b>析取</b><code>∨I₁　∨I₂　∨E</code></p>
              <p><b>蕴含</b><code>→I　→E</code></p>
              <p><b>否定与矛盾</b><code>¬I　¬E　⊥E</code></p>
              <p class="classical"><b>经典反证</b><code>RAA</code></p>
            </div>
          </div>
        </section>

        <section class="logic-overview-chapter achievements-chapter">
          <header><span>你的证明档案</span><h3>这些结果是怎样得到的</h3><p>每一条都对应一种已经使用过的证明结构。</p></header>
          <div class="logic-achievement-list">
            <article><div><span>解除临时前提</span><code>⊢ P→(P∧P)</code></div><p>假设 P，构造 P∧P，再用 →I 解除这项依赖，得到第一条无前提定理。</p></article>
            <article><div><span>否定证明</span><code>⊢ ¬(P∧¬P)</code></div><p>假设 P∧¬P 后可以同时得到 P 与 ¬P；矛盾产生 ⊥，于是 ¬I 得到原式的否定。</p></article>
            <article><div><span>分类讨论</span><code>⊢ (P∨Q)→(Q∨P)</code></div><p>分别考虑 P 与 Q 两种情况，两条分支都得到 Q∨P；∨E 合并分支，→I 再关闭外层范围。</p></article>
            <article class="classical"><div><span>经典反证法</span><code>¬¬P ⊢ P</code></div><p>假设 ¬P 会与前提 ¬¬P 产生矛盾；RAA 解除这项临时假设并得到 P。</p></article>
          </div>
        </section>

        <footer class="logic-overview-footer"><b>公式已经能够形成、求值与推导。</b><span>经典命题逻辑这一章到此完成。</span></footer>
      </article>`;
  }

  function setFormulaView(view) {
    const options = currentLevel().formulaViewOptions || ["construction", "syntax", "evaluation"];
    if (!currentLevel().formulaViews || !options.includes(view)) return;
    state.formulaView = view;
    renderFormulaWorkspace();
  }

  function setProofView(view) {
    const level = currentLevel();
    if (!level.proofViews || !["construction", "gentzen", "fitch"].includes(view)) return;
    if (view === "fitch" && !level.fitchView) return;
    state.proofView = view;
    renderFormulaWorkspace();
  }

  function toggleValuation(name) {
    if (!Object.prototype.hasOwnProperty.call(state.valuation, name)) return;
    state.valuation[name] = !state.valuation[name];
    renderFormulaWorkspace();
  }

  function renderFormulaWorkspace() {
    const level = currentLevel();
    const proofEnabled = Boolean(level.proofViews);
    const formulaEnabled = Boolean(level.formulaViews);
    const inspectorMode = (proofEnabled && state.proofView !== "construction") || (formulaEnabled && state.formulaView !== "construction");
    $("#canvasWrap").classList.toggle("inspector-mode", inspectorMode);
    $("#formulaInspector").hidden = !formulaEnabled || state.formulaView === "construction";
    $("#proofInspector").hidden = !proofEnabled || state.proofView === "construction";
    document.querySelectorAll("[data-formula-view]").forEach((button) => button.classList.toggle("active", button.dataset.formulaView === state.formulaView));
    document.querySelectorAll("[data-proof-view]").forEach((button) => button.classList.toggle("active", button.dataset.proofView === state.proofView));
    if (proofEnabled && state.proofView !== "construction") { renderProofWorkspace(); return; }
    if (!formulaEnabled || state.formulaView === "construction") return;

    const evaluation = state.formulaView === "evaluation";
    if (level.modal) { renderModalFormulaWorkspace(evaluation); return; }
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

  function proofRuleLabel(rule) {
    if (rule === "diamondIntro") return "◇I";
    if (rule === "diamondElim") return "◇E · 解除临时世界依据";
    if (rule === "diamondWitness") return "临时见证的公式依据";
    if (rule === "witnessAccess") return "临时见证的可达条件";
    if (rule === "boxElim") return "□E";
    if (rule === "boxIntro") return "□I · 收回任意可达世界";
    if (rule === "worldAssumption") return "任意可达世界的临时条件";
    return ({ given: "来自 Γ", assumption: "假设", existsFlag: "存在 flag", inconsistencyAssumption: "暂设扩张理论不相容", entailmentInstance: "语义后承的定义", modelExistence: "模型存在定理", andElim1: "∧E₁", andElim2: "∧E₂", andIntro: "∧I", orIntro1: "∨I₁", orIntro2: "∨I₂", orElim: "∨E", impElim: "→E", impIntro: "→I", notElim: "¬E", bottomElim: "⊥E", notIntro: "¬I", raa: "RAA", forallElim: "∀E", existsIntro: "∃I", forallIntro: "∀I", existsElim: "∃E", equalityIntro: "=I", equalityElim: "=E", freshRename: "撤去新鲜常元" })[rule] || rule;
  }

  function renderGentzenProof(proof) {
    if (!proof || proof.kind !== "proof") return `<p class="formula-tree-empty">证明树尚未完整。</p>`;
    if (proof.rule === "equalityIntro") {
      return `<div class="proof-derivation equality-intro-derivation"><div class="proof-premises empty"></div><div class="proof-rule-line"></div><div class="proof-conclusion"><b>${escapeHtml(prettyFormula(proof.conclusion))}</b><small>=I</small></div></div>`;
    }
    if (!proof.children || !proof.children.length) {
      const temporary = ["assumption", "existsFlag", "worldAssumption", "diamondWitness", "witnessAccess"].includes(proof.rule);
      const formula = temporary ? `[${proofJudgement(proof)}]` : proofJudgement(proof);
      const origin = proof.backgroundCondition ? `系统条件 · ${proof.backgroundCondition}` : (proof.rule === "assumption" ? "假设" : (proof.rule === "existsFlag" ? `见证 flag · ${proof.flagName}` : proofRuleLabel(proof.rule)));
      return `<div class="proof-leaf ${temporary ? "temporary" : ""} ${proof.rule === "existsFlag" ? "witness-flag-leaf" : ""}"><div class="proof-card"><b>${escapeHtml(formula)}</b><small>${escapeHtml(origin)}</small></div></div>`;
    }
    const label = proof.rule === "impIntro" ? "→I · 解除临时假设"
      : (proof.rule === "notIntro" ? "¬I · 解除临时假设"
        : (proof.rule === "raa" ? "RAA · 解除临时假设"
          : (proof.rule === "forallIntro" ? `∀I · 收回任意 ${proof.flagName}`
            : (proof.rule === "existsElim" ? `∃E · 收回见证 ${proof.flagName}` : proofRuleLabel(proof.rule)))));
    const worldCondition = proof.rule === "boxIntro" ? `<div class="proof-leaf temporary"><div class="proof-card"><b>[${escapeHtml(proof.worldFrom)}R${escapeHtml(proof.worldTo)}]</b><small>任意可达世界 · 临时条件已解除</small></div></div>` : "";
    return `<div class="proof-derivation"><div class="proof-premises">${worldCondition}${proof.children.map(renderGentzenProof).join("")}</div><div class="proof-rule-line"></div><div class="proof-conclusion"><b>${escapeHtml(proofJudgement(proof))}</b><small>${escapeHtml(label)}</small></div></div>`;
  }

  function collectFitchPremises(proof, collected = new Map()) {
    if (!proof || proof.kind !== "proof") return collected;
    if (proof.rule === "given") collected.set(proofJudgementKey(proof), proof);
    if (proof.witnessSource) collectFitchPremises(proof.witnessSource, collected);
    (proof.children || []).forEach((child) => collectFitchPremises(child, collected));
    return collected;
  }

  function compileFitchProof(proof) {
    const rows = [], premiseRefs = new Map(), assumptionRefs = new Map(), proofRefs = new Map();
    let nextLine = 1;
    const addRow = (formula, justification, scopes = [], extra = {}) => {
      const row = {
        number: nextLine++, formula: clone(formula), displayText: extra.displayText || "", justification, scopes: [...scopes],
        starts: [...(extra.starts || [])], ends: [...(extra.ends || [])], assumption: Boolean(extra.assumption), final: false
      };
      rows.push(row);
      return { line: row.number, row };
    };

    const premises = [...collectFitchPremises(proof).values()];
    premises.forEach((premise) => {
      const ref = addRow(premise.conclusion, premise.backgroundCondition ? `系统条件 · ${premise.backgroundCondition}` : "前提", [], { displayText: proofJudgement(premise) });
      premiseRefs.set(proofJudgementKey(premise), ref);
    });
    const premiseEnd = rows.length;

    const withSubproof = (scopeId, assumption, parentScopes, build) => {
      const scopes = [...parentScopes, scopeId];
      const previous = assumptionRefs.get(scopeId);
      const assumptionRef = addRow(assumption, "临时假设", scopes, { starts: [scopeId], assumption: true });
      assumptionRefs.set(scopeId, assumptionRef);
      const result = build(scopes);
      const lastRow = rows[rows.length - 1];
      if (lastRow && !lastRow.ends.includes(scopeId)) lastRow.ends.push(scopeId);
      if (previous) assumptionRefs.set(scopeId, previous); else assumptionRefs.delete(scopeId);
      return { start: assumptionRef.line, end: lastRow ? lastRow.number : assumptionRef.line, result };
    };

    const withFlagScope = (scopeId, name, parentScopes, build) => {
      const scopes = [...parentScopes, scopeId];
      const flagRef = addRow(null, "全称 flag", scopes, { starts: [scopeId], displayText: `⚑ 任意 ${name}` });
      const result = build(scopes);
      const lastRow = rows[rows.length - 1];
      if (lastRow && !lastRow.ends.includes(scopeId)) lastRow.ends.push(scopeId);
      return { start: flagRef.line, end: lastRow ? lastRow.number : flagRef.line, result };
    };

    const withWitnessScope = (scopeId, from, to, formula, source, parentScopes, build) => {
      const sourceRef = emit(source, parentScopes), scopes = [...parentScopes, scopeId];
      const relationKey = `${scopeId}:relation`, formulaKey = `${scopeId}:formula`;
      const oldRelation = assumptionRefs.get(relationKey), oldFormula = assumptionRefs.get(formulaKey);
      const relationRef = addRow(null, `临时见证 · 由 ${sourceRef.line} 授权`, scopes, { starts: [scopeId], displayText: `${from}R${to}` });
      const formulaRef = addRow(formula, "见证满足的临时公式", scopes, { assumption: true, displayText: `${to}:${prettyFormula(formula)}` });
      assumptionRefs.set(relationKey, relationRef); assumptionRefs.set(formulaKey, formulaRef);
      const result = build(scopes), lastRow = rows[rows.length - 1];
      lastRow.ends.push(scopeId);
      if (oldRelation) assumptionRefs.set(relationKey, oldRelation); else assumptionRefs.delete(relationKey);
      if (oldFormula) assumptionRefs.set(formulaKey, oldFormula); else assumptionRefs.delete(formulaKey);
      return { start: relationRef.line, end: lastRow.number, result, sourceRef };
    };

    const emit = (current, scopes = []) => {
      if (!current || current.kind !== "proof") throw new Error("Fitch 视图只能排版完整证明。");
      if (current.rule === "given") {
        const ref = premiseRefs.get(proofJudgementKey(current));
        if (!ref) throw new Error("Fitch 前提行缺失。");
        return ref;
      }
      if (current.rule === "assumption") {
        const ref = assumptionRefs.get(current.scopeId) || [...assumptionRefs.values()].find((item) => current.world ? item.row.displayText === proofJudgement(current) : equalFormula(item.row.formula, current.conclusion));
        if (!ref) return addRow(current.conclusion, "临时假设", scopes, { assumption: true, displayText: proofJudgement(current) });
        return ref;
      }
      if (current.rule === "existsFlag") {
        const ref = assumptionRefs.get(current.scopeId);
        if (!ref) return addRow(current.conclusion, `见证 flag · ${current.flagName}`, scopes, { assumption: true });
        return ref;
      }

      const memoKey = `${JSON.stringify(current)}|${scopes.join(",")}`;
      if (proofRefs.has(memoKey)) return proofRefs.get(memoKey);

      if (current.rule === "diamondWitness" || current.rule === "witnessAccess") {
        const ref = assumptionRefs.get(`${current.scopeId}:${current.rule === "witnessAccess" ? "relation" : "formula"}`);
        if (!ref) throw new Error("临时见证依据只能在已授权的见证范围内使用。");
        return ref;
      }
      if (current.rule === "diamondElim") {
        const range = withWitnessScope(current.witnessScopeId, current.witnessFrom, current.witnessWorld, current.witnessFormula, current.children[0], scopes, (innerScopes) => emit(current.children[1], innerScopes));
        const ref = addRow(current.conclusion, `◇E ${range.sourceRef.line}, ${range.start}–${range.end}`, scopes, { displayText: proofJudgement(current) });
        proofRefs.set(memoKey, ref);
        return ref;
      }

      if (current.rule === "worldAssumption") {
        const ref = assumptionRefs.get(current.scopeId);
        if (!ref) throw new Error("临时可达条件不能在世界范围外使用。");
        return ref;
      }
      if (current.rule === "boxIntro") {
        const scopeId = current.worldScopeId, innerScopes = [...scopes, scopeId];
        const previous = assumptionRefs.get(scopeId);
        const entry = addRow(null, "任意可达世界", innerScopes, { starts: [scopeId], displayText: `${current.worldFrom}R${current.worldTo} · ${current.worldTo} 任意`, assumption: true });
        assumptionRefs.set(scopeId, entry);
        emit(current.children[0], innerScopes);
        const last = rows[rows.length - 1];
        last.ends.push(scopeId);
        if (previous) assumptionRefs.set(scopeId, previous); else assumptionRefs.delete(scopeId);
        const ref = addRow(current.conclusion, `□I ${entry.line}–${last.number}`, scopes, { displayText: proofJudgement(current) });
        proofRefs.set(memoKey, ref);
        return ref;
      }

      if (current.rule === "impIntro" || current.rule === "notIntro" || current.rule === "raa") {
        const scopeId = current.dischargedScopeId || `fitch-scope-${rows.length + 1}`;
        const range = withSubproof(scopeId, current.discharged, scopes, (innerScopes) => emit(current.children[0], innerScopes));
        if (current.world) rows.find((row) => row.number === range.start).displayText = `${current.world}:${prettyFormula(current.discharged)}`;
        const rule = current.rule === "impIntro" ? "→I" : (current.rule === "notIntro" ? "¬I" : "RAA");
        const ref = addRow(current.conclusion, `${rule} ${range.start}–${range.end}`, scopes, { displayText: proofJudgement(current) });
        proofRefs.set(memoKey, ref);
        return ref;
      }

      if (current.rule === "forallIntro") {
        const scopeId = current.flagScopeId || `fitch-forall-${rows.length + 1}`;
        const range = withFlagScope(scopeId, current.flagName, scopes, (innerScopes) => emit(current.children[0], innerScopes));
        const ref = addRow(current.conclusion, `∀I ${range.start}–${range.end}`, scopes);
        proofRefs.set(memoKey, ref);
        return ref;
      }

      if (current.rule === "existsElim") {
        const source = current.children[0], inner = current.children[1];
        const sourceRef = emit(source, scopes);
        const scopeId = current.dischargedScopeId || `fitch-exists-${rows.length + 1}`;
        const assumption = current.discharged;
        const range = withSubproof(scopeId, assumption, scopes, (innerScopes) => emit(inner, innerScopes));
        const ref = addRow(current.conclusion, `∃E ${sourceRef.line}, ${range.start}–${range.end}`, scopes);
        proofRefs.set(memoKey, ref);
        return ref;
      }

      if (current.rule === "orElim") {
        const source = current.children[0], left = current.children[1], right = current.children[2];
        const sourceRef = emit(source, scopes);
        const recorded = current.dischargedScopes || [];
        const leftDependency = recorded[0] || (left.openScopes || [])[0] || { id: `fitch-left-${rows.length + 1}`, formula: source.conclusion.left };
        const rightDependency = recorded[1] || (right.openScopes || [])[0] || { id: `fitch-right-${rows.length + 1}`, formula: source.conclusion.right };
        const leftRange = withSubproof(leftDependency.id, leftDependency.formula, scopes, (innerScopes) => emit(left, innerScopes));
        const rightRange = withSubproof(rightDependency.id, rightDependency.formula, scopes, (innerScopes) => emit(right, innerScopes));
        const ref = addRow(current.conclusion, `∨E ${sourceRef.line}, ${leftRange.start}–${leftRange.end}, ${rightRange.start}–${rightRange.end}`, scopes);
        proofRefs.set(memoKey, ref);
        return ref;
      }

      const childRefs = (current.children || []).map((child) => emit(child, scopes));
      const references = childRefs.length ? ` ${childRefs.map((ref) => ref.line).join(",")}` : "";
      const ref = addRow(current.conclusion, `${proofRuleLabel(current.rule)}${references}`, scopes, { displayText: proofJudgement(current) });
      proofRefs.set(memoKey, ref);
      return ref;
    };

    let finalRef;
    const openScopes = (proof.openScopes || []).filter((item) => !item.modalWitness);
    const openWitnesses = (proof.openScopes || []).filter((item) => item.modalWitness);
    const openWorlds = (proof.accessibilityDeps || []).filter((item) => item.scopeId && !item.witness);
    const emitWithOpenWitnesses = (index, scopes) => {
      if (index >= openWitnesses.length) return emit(proof, scopes);
      const dependency = openWitnesses[index];
      return withWitnessScope(dependency.id, dependency.from, dependency.world, dependency.formula, dependency.source, scopes, (innerScopes) => emitWithOpenWitnesses(index + 1, innerScopes)).result;
    };
    const emitWithOpenWorlds = (index, scopes) => {
      if (index >= openWorlds.length) return emitWithOpenWitnesses(0, scopes);
      const dependency = openWorlds[index], scopeId = dependency.scopeId;
      const innerScopes = [...scopes, scopeId];
      const entry = addRow(null, "任意可达世界 · 条件仍开放", innerScopes, { starts: [scopeId], displayText: `${dependency.from}R${dependency.to} · ${dependency.to} 任意`, assumption: true });
      assumptionRefs.set(scopeId, entry);
      const result = emitWithOpenWorlds(index + 1, innerScopes);
      rows[rows.length - 1].ends.push(scopeId);
      assumptionRefs.delete(scopeId);
      return result;
    };
    const emitWithOpenScopes = (index, scopes) => {
      if (index >= openScopes.length) return emitWithOpenWorlds(0, scopes);
      const dependency = openScopes[index];
      const range = withSubproof(dependency.id, dependency.formula, scopes, (innerScopes) => emitWithOpenScopes(index + 1, innerScopes));
      if (dependency.world) rows.find((row) => row.number === range.start).displayText = `${dependency.world}:${prettyFormula(dependency.formula)}`;
      return range.result;
    };
    finalRef = emitWithOpenScopes(0, []);
    const finalRow = rows.find((row) => row.number === finalRef.line);
    if (finalRow) finalRow.final = true;
    return { rows, premiseEnd, hasPremises: premises.length > 0, hasFormulaPremises: premises.some((item) => !item.backgroundCondition), systemConditions: [...new Set(premises.filter((item) => item.backgroundCondition).map((item) => item.backgroundCondition))], maxDepth: rows.reduce((max, row) => Math.max(max, row.scopes.length), 0) };
  }

  function renderFitchProof(proof) {
    const documentModel = compileFitchProof(proof);
    const rows = documentModel.rows.map((row, index) => {
      const rails = row.scopes.map((scopeId) => {
        const classes = ["fitch-rail"];
        if (row.starts.includes(scopeId)) classes.push("start");
        if (row.ends.includes(scopeId)) classes.push("end");
        return `<i class="${classes.join(" ")}" aria-hidden="true"></i>`;
      }).join("");
      const assumptionBar = row.assumption
        ? `<i class="fitch-assumption-bar" style="--bar-left:${42 + Math.max(0, row.scopes.length - 1) * 22 + 11}px" aria-hidden="true"></i>`
        : "";
      const classes = ["fitch-row"];
      if (row.assumption) classes.push("assumption");
      if (row.final) classes.push("final");
      if (row.starts.length) classes.push("scope-start");
      if (index === documentModel.premiseEnd - 1) classes.push("last-premise");
      const formulaText = row.displayText || prettyFormula(row.formula);
      return `<div class="${classes.join(" ")}">${assumptionBar}<span class="fitch-number">${row.number}</span><span class="fitch-rails">${rails}</span><b class="fitch-formula">${escapeHtml(formulaText)}</b><span class="fitch-justification">${escapeHtml(row.justification)}</span></div>`;
    }).join("");
    const premiseLabel = documentModel.systemConditions.length ? `${documentModel.hasFormulaPremises ? "前提 Γ" : "无开放公式前提"} · ${documentModel.systemConditions.join("、")}` : (documentModel.hasPremises ? "前提 Γ" : "Γ = ∅ · 无前提");
    return `<section class="fitch-document" style="--max-depth:${documentModel.maxDepth}"><header><span>FITCH DERIVATION</span><b>${escapeHtml(premiseLabel)}</b></header><div class="fitch-rows">${rows}</div></section>`;
  }

  function renderProofWorkspace() {
    const fitch = state.proofView === "fitch";
    $("#proofTree").classList.toggle("fitch-mode", fitch);
    $("#proofInspector").classList.toggle("fitch-view", fitch);
    if (currentLevel().id === "modal-proof-worlds" || currentLevel().parallelProofs) {
      $("#proofTree").innerHTML = currentLevel().multiGoals.map((id) => {
        const node = state.nodes.find((item) => item.id === id);
        let content;
        try { const proof = evaluateNode(id); content = fitch ? renderFitchProof(proof) : renderGentzenProof(proof); }
        catch (_) { content = '<p class="formula-tree-empty">这个世界的推导尚未完成。</p>'; }
        return `<section class="modal-local-proof"><h3>${escapeHtml(node.glyph)}</h3>${content}</section>`;
      }).join("");
      $("#proofInspectorNote").textContent = currentLevel().proofComparisonNote || "两个世界分别使用 →E；相同的公式名称不会抹去世界位置。";
      return;
    }
    let proof;
    const proofTarget = currentLevel().runTarget || "goal";
    try { proof = evaluateNode(proofTarget); }
    catch (_) {
      $("#proofTree").innerHTML = `<p class="formula-tree-empty">先在构造网络中完成推导。</p>`;
      $("#proofInspectorNote").textContent = "推导树从当前可用的公式出发，由已经定义的规则逐步生长。";
      return;
    }
    $("#proofTree").innerHTML = fitch ? renderFitchProof(proof) : renderGentzenProof(proof);
    const persistent = proof.open || [];
    const temporary = proof.openScopes || [];
    const persistentText = persistent.length ? `来自 Γ：${persistent.map(prettyFormula).join("、")}` : "来自 Γ：无";
    const temporaryText = temporary.length ? `开放的临时假设：${temporary.map((scope) => prettyFormula(scope.formula)).join("、")}` : "开放的临时假设：无";
    $("#proofInspectorNote").textContent = proof.world ? `当前结论 ${proofJudgement(proof)}；外部公式前提 ${(proof.worldOpen || []).map((item) => `${item.world}:${prettyFormula(item.formula)}`).join("、") || "无"}；临时公式假设 ${temporary.map((item) => `${item.world || proof.world}:${prettyFormula(item.formula)}`).join("、") || "无"}；可达条件 ${(proof.accessibilityDeps || []).map((item) => `${item.from}R${item.to}`).join("、") || "无"}。` : `当前结论 ${prettyFormula(proof.conclusion)}；${persistentText}；${temporaryText}。`;
  }

  function syntaxTreeNote(formula) {
    if (formula.kind === "prop") return `${formula.name} 是不能继续分解的原子公式，因此语法树只有一片叶子。`;
    if (formula.kind === "schema") return `${formula.name} 是任意公式的槽位；替换内容会变化，但它在模式中的位置保持不变。`;
    if (formula.kind === "bottom") return "⊥ 是没有子公式的矛盾常元；它是一条公式，不是真值“假”本身。";
    if (formula.kind === "var") return `${formula.name} 是一枚项叶子；它还不是公式，必须先送进谓词位置。`;
    if (formula.kind === "const") return `${formula.name} 是没有输入位置的常元项；模型以后会为它指定一个固定对象。`;
    if (formula.kind === "func") return `${prettyFormula(formula.argument)} 填入函数符号 ${formula.name} 的唯一项位置；得到的 ${prettyFormula(formula)} 仍然是项。`;
    if (formula.kind === "pred") return `${prettyFormula(formula.term)} 填入谓词符号 ${formula.name} 的唯一项位置；整个 ${prettyFormula(formula)} 才是一片原子公式。`;
    if (formula.kind === "rel") return `${prettyFormula(formula.left)}、${prettyFormula(formula.right)} 依次填入谓词符号 ${formula.name} 的两个项位置；交换位置会得到另一条原子公式。`;
    if (formula.kind === "not") return `¬ 是拥有一个子公式的根；${prettyFormula(formula.body)} 是它下方唯一的子树。`;
    if (formula.kind === "box") return `□ 是拥有一个子公式的根；${prettyFormula(formula.body)} 是它下方完整的子树。`;
    if (formula.kind === "diamond") return `◇ 是拥有一个子公式的根；${prettyFormula(formula.body)} 是它下方完整的子树。`;
    if (formula.kind === "and") return `${prettyFormula(formula.left)}、${prettyFormula(formula.right)} 是左右子树；∧ 是拥有两个子公式的根。`;
    if (formula.kind === "or") return `${prettyFormula(formula.left)}、${prettyFormula(formula.right)} 是左右子树；∨ 是把它们接到一起的根。`;
    if (formula.kind === "imp") return `${prettyFormula(formula.left)} 是前件子树，${prettyFormula(formula.right)} 是后件子树；→ 保留了两侧的方向。`;
    if (formula.kind === "forall") return `∀${formula.variable} 是量词根；${prettyFormula(formula.body)} 是它的辖域子树，变量 ${formula.variable} 在其中被绑定。`;
    if (formula.kind === "exists") return `∃${formula.variable} 是量词根；${prettyFormula(formula.body)} 是它的辖域子树，变量 ${formula.variable} 在其中被绑定。`;
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
    if (formula.kind === "schema") return Boolean(valuation[formula.name]);
    if (formula.kind === "bottom") return false;
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

  const schemaValuations = [
    { A: false, B: false },
    { A: false, B: true },
    { A: true, B: false },
    { A: true, B: true }
  ];

  function sameInferenceRule(left, right) {
    return Boolean(left && right && left.kind === "rule" && right.kind === "rule"
      && equal(left.premises, right.premises) && equalFormula(left.conclusion, right.conclusion));
  }

  function ruleCounterexample(rule) {
    return schemaValuations.find((valuation) => rule.premises.every((formula) => evaluatePropositional(formula, valuation))
      && !evaluatePropositional(rule.conclusion, valuation)) || null;
  }

  function schemaValuationText(valuation) {
    return `A=${truthText(valuation.A)}、B=${truthText(valuation.B)}`;
  }

  function validateForgedRule(value, expected, name, successMessage) {
    if (!value || value.kind !== "rule" || !Array.isArray(value.premises) || !value.conclusion) {
      return fail("请补全横线上方的每个已有公式，以及横线下方的新结论。");
    }
    if (contains(value.premises, value.conclusion)) {
      return fail(`这条规则把结论 ${prettyFormula(value.conclusion)} 直接放在了横线上方；它没有从其他依据得到新公式。`);
    }
    const counterexample = ruleCounterexample(value);
    if (counterexample) {
      return fail(`${schemaValuationText(counterexample)} 时，横线上方全部为真，结论 ${prettyFormula(value.conclusion)} 却为假。这是一条反例。`);
    }
    if (!sameInferenceRule(value, expected)) {
      return fail(`当前提议能够保真，但它不是本关要构造的 ${name}：请检查上方所需公式与下方结论的形状。`);
    }
    return pass(successMessage, "4 种赋值均无反例");
  }

  function validateForgedRuleSet(value, expected, successMessage, mismatchMessage = "当前两条规则能够保真，但还没有分别从 A∧B 取回 A 与 B。") {
    if (!Array.isArray(value) || !value.length || value.some((rule) => !rule || rule.kind !== "rule")) {
      return fail("请把两条横线上方和下方的全部公式都补充完整。");
    }
    for (const rule of value) {
      if (contains(rule.premises, rule.conclusion)) {
        return fail(`规则 ${formatInferenceRule(rule)} 把结论直接放在了横线上方。`);
      }
      const counterexample = ruleCounterexample(rule);
      if (counterexample) {
        return fail(`${formatInferenceRule(rule)} 在 ${schemaValuationText(counterexample)} 时出现真依据、假结论。`);
      }
    }
    const complete = value.length === expected.length && expected.every((target) => value.some((rule) => sameInferenceRule(rule, target)));
    return complete
      ? pass(successMessage, "2 条规则均无反例")
      : fail(mismatchMessage);
  }

  function proofUsesRule(proof, rule) {
    if (!proof || proof.kind !== "proof") return false;
    if (proof.rule === rule) return true;
    return (proof.children || []).some((child) => proofUsesRule(child, rule));
  }

  function countProofRule(proof, rule) {
    if (!proof || proof.kind !== "proof") return 0;
    return (proof.rule === rule ? 1 : 0) + (proof.children || []).reduce((count, child) => count + countProofRule(child, rule), 0);
  }

  function hasScopeDependency(proof, scopeId, formula) {
    return Boolean(proof && (proof.openScopes || []).some((scope) => scope.id === scopeId && equalFormula(scope.formula, formula)));
  }

  function validScopeDischarge(value, scopeId, assumption, conclusion, persistentOpen) {
    return Boolean(value && value.kind === "proof" && value.rule === "impIntro"
      && value.dischargedScopeId === scopeId && equalFormula(value.discharged, assumption)
      && equalFormula(value.conclusion, conclusion) && equal(value.open, persistentOpen)
      && (!value.openScopes || value.openScopes.length === 0));
  }

  function validCombinedProof(value) {
    return Boolean(value && value.kind === "proof" && value.rule === "andIntro" && equalFormula(value.conclusion, conjunctionFormula)
      && value.open.length === 1 && contains(value.open, combinedPremiseFormula)
      && (!value.openScopes || value.openScopes.length === 0)
      && ["andElim1", "andElim2", "impElim", "andIntro"].every((rule) => proofUsesRule(value, rule)));
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
    if (formula.kind === "eq") return "= 是拥有两个项子树的根；两侧项本身没有真假，整个等式是一条原子公式。";
    return "求值沿语法树从叶子逐层到达根。";
  }

  function formulaTreeHeight(formula) {
    if (["prop", "schema", "bottom", "var", "const", "termSchema"].includes(formula.kind)) return 0;
    if (formula.kind === "func") return 1 + formulaTreeHeight(formula.argument);
    if (formula.kind === "pred") return 1 + formulaTreeHeight(formula.term);
    if (formula.kind === "rel" || formula.kind === "eq") return 1 + Math.max(formulaTreeHeight(formula.left), formulaTreeHeight(formula.right));
    if (["not", "box", "diamond"].includes(formula.kind)) return 1 + formulaTreeHeight(formula.body);
    if (["and", "or", "imp"].includes(formula.kind)) return 1 + Math.max(formulaTreeHeight(formula.left), formulaTreeHeight(formula.right));
    if (formula.kind === "forall" || formula.kind === "exists") return 1 + formulaTreeHeight(formula.body);
    return 0;
  }

  function renderFormulaTreeNode(formula, evaluation, totalHeight = formulaTreeHeight(formula), depth = 0) {
    const leaf = ["prop", "schema", "bottom", "var", "const", "termSchema"].includes(formula.kind);
    const symbol = formula.kind === "bottom" ? "⊥" : (["prop", "schema", "var", "const", "termSchema"].includes(formula.kind)
      ? formula.name
      : ({ func: `${formula.name}(·)`, pred: `${formula.name}(·)`, rel: `${formula.name}(·,·)`, eq: "=", not: "¬", box: "□", diamond: "◇", and: "∧", or: "∨", imp: "→", forall: `∀${formula.variable}`, exists: `∃${formula.variable}` })[formula.kind]);
    const truth = evaluation ? evaluatePropositional(formula, state.valuation) : null;
    const delay = evaluation ? Math.max(0, totalHeight - depth) * 280 : 0;
    const detail = formula.kind === "prop" ? "命题变元" : (formula.kind === "schema" ? "任意公式元变量" : (formula.kind === "bottom" ? "矛盾常元" : (formula.kind === "var" ? "项 · 变量" : (formula.kind === "termSchema" ? "任意项元记号" : (formula.kind === "const" ? "项 · 常元" : (formula.kind === "func" ? "项 · 函数形成" : prettyFormula(formula)))))));
    const badge = evaluation ? `<em class="${truth ? "true" : "false"}">${truth ? "真" : "假"}</em>` : "";
    const unary = ["func", "not", "box", "diamond", "pred", "forall", "exists"].includes(formula.kind);
    const childFormulas = leaf ? [] : (unary ? [formula.kind === "func" ? formula.argument : (formula.kind === "pred" ? formula.term : formula.body)] : [formula.left, formula.right]);
    const children = childFormulas.length
      ? `<div class="formula-tree-children ${childFormulas.length === 1 ? "unary" : "binary"}">${childFormulas.map((child) => renderFormulaTreeNode(child, evaluation, totalHeight, depth + 1)).join("")}</div>`
      : "";
    return `<div class="formula-tree-node"><div class="formula-tree-card" style="--eval-delay:${delay}ms"><b>${escapeHtml(symbol)}</b><small>${escapeHtml(detail)}</small>${badge}</div>${children}</div>`;
  }

  function equalityOccurrencePickerMarkup(node) {
    const equalityLink = state.connections.find((connection) => connection.to === node.id && connection.input === 0);
    const formulaLink = state.connections.find((connection) => connection.to === node.id && connection.input === 1);
    if (!equalityLink || !formulaLink) return `<span class="equality-picker-waiting">接入等式与旧公式后选择替换位置</span>`;
    try {
      const identity = proofInputs(evaluateNode(equalityLink.from));
      const oldProof = proofInputs(evaluateNode(formulaLink.from));
      if (!identity.conclusion || identity.conclusion.kind !== "eq") return `<span class="equality-picker-waiting">第一个输入需要已证明的等式</span>`;
      const source = identity.conclusion.left, target = identity.conclusion.right;
      let occurrence = 0;
      const renderTerm = (term, bound) => {
        const blocked = [...freeVariableNames(source)].some((name) => bound.has(name));
        if (equalFormula(term, source) && !blocked) {
          const index = occurrence++;
          const selected = node.replacementOccurrence === index;
          return `<button type="button" class="equality-occurrence ${selected ? "selected" : ""}" data-equality-occurrence="${index}" title="把这一处 ${escapeHtml(prettyFormula(source))} 换成 ${escapeHtml(prettyFormula(target))}">${escapeHtml(prettyFormula(term))}</button>`;
        }
        if (term && term.kind === "func") return `${escapeHtml(term.name)}(${renderTerm(term.argument, bound)})`;
        return escapeHtml(prettyFormula(term));
      };
      const renderFormula = (formula, bound = new Set()) => {
        if (formula.kind === "pred") return `${escapeHtml(formula.name)}(${renderTerm(formula.term, bound)})`;
        if (formula.kind === "rel") return `${escapeHtml(formula.name)}(${renderTerm(formula.left, bound)},${renderTerm(formula.right, bound)})`;
        if (formula.kind === "eq") return `${renderTerm(formula.left, bound)}=${renderTerm(formula.right, bound)}`;
        if (formula.kind === "not") return `¬${renderFormula(formula.body, bound)}`;
        if (["and", "or", "imp"].includes(formula.kind)) {
          const symbol = { and: "∧", or: "∨", imp: "→" }[formula.kind];
          return `(${renderFormula(formula.left, bound)} ${symbol} ${renderFormula(formula.right, bound)})`;
        }
        if (["forall", "exists"].includes(formula.kind)) {
          const nestedBound = new Set(bound);
          nestedBound.add(formula.variable);
          return `${formula.kind === "forall" ? "∀" : "∃"}${escapeHtml(formula.variable)} ${renderFormula(formula.body, nestedBound)}`;
        }
        return escapeHtml(prettyFormula(formula));
      };
      const formulaMarkup = renderFormula(oldProof.conclusion);
      if (!occurrence) return `<span class="equality-picker-waiting">旧公式中没有可替换的 ${escapeHtml(prettyFormula(source))}</span>`;
      return `<div class="equality-occurrence-picker"><small>点击本步要替换的位置</small><code>${formulaMarkup}</code><span>${escapeHtml(prettyFormula(source))} → ${escapeHtml(prettyFormula(target))}</span></div>`;
    } catch (_) {
      return `<span class="equality-picker-waiting">先完成输入端的两条证明</span>`;
    }
  }

  function sourceUnlocked(node) {
    if (!node || !node.unlockWhen) return true;
    try {
      const prerequisite = evaluateNode(node.unlockWhen);
      return !Object.prototype.hasOwnProperty.call(node, "unlockValue") || equal(prerequisite, node.unlockValue);
    } catch (_) {
      return false;
    }
  }

  function createNodeElement(node) {
    const def = node.type === "source" || node.type === "goal" ? node : registry[node.type];
    const lockedSource = node.type === "source" && !sourceUnlocked(node);
    let witnessLocked = false;
    if (node.type === "modalDiamondAccess") {
      try { evaluateNode(node.id); } catch (_) { witnessLocked = true; }
    }
    const el = document.createElement("article");
    el.className = `logic-node ${node.fixed ? "fixed" : ""} ${node.goal ? "goal" : ""} ${lockedSource ? "locked-source" : ""} ${node.finaleArtifact ? "finale-artifact" : ""} ${node.earnedModule ? "earned-module" : ""} ${node.ruleSlot ? `rule-slot ${node.ruleSlot}` : ""} ${node.scopeSlot ? `scope-slot ${node.scopeSlot}` : ""} ${node.scopeAssumption ? "scope-assumption-node" : ""} ${node.scopeDischarge ? "scope-discharge-node" : ""} ${node.scopeBound ? "scope-bound-node" : ""} ${node.dependencyForgeNode ? "dependency-forge-node" : ""} ${node.inductionCoverageNode ? "induction-coverage-node" : ""} ${node.metaProofBoard ? "meta-proof-board" : ""} ${node.quantifierFlag ? `quantifier-flag-node ${node.quantifierFlag}` : ""} ${node.quantifierFlagExit ? `quantifier-flag-exit ${node.quantifierFlagExit}` : ""}`;
    el.dataset.id = node.id;
    if (currentLevel().branch === "modal") el.classList.add("modal-route-node");
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    let nodeBody = lockedSource ? escapeHtml(node.lockedBody || "先完成前置构造") : outputPreview(node);
    if (witnessLocked) nodeBody = "先给同一见证入口接入 ◇A 的证明";
    if (node.goal) nodeBody = node.slotBody || "把最终结果接到这里";
    else if (node.earnedModule) nodeBody = `<small>前面已经得到的成果 · ${escapeHtml(node.earnedModule)}</small><b>${escapeHtml(node.moduleContract || "")}</b>`;
    else if (node.inductionCoverageNode) nodeBody = `<div class="coverage-node-chain"><b>0</b><i>→</i><b>1</b><i>→</i><b>2</b><i>→</i><b>…</b></div><small>填入起点依据与可重复步骤</small>`;
    else if (node.type === "equalityElim") nodeBody = equalityOccurrencePickerMarkup(node);
    else if (node.type === "termAssignmentS") nodeBody = "x ↦ 杯子";
    else if (node.type === "termFunctionF") nodeBody = "杯子 ↦ 盘子；盘子 ↦ 杯子";
    else if (node.type === "termConstantMeaning") nodeBody = "c ↦ 盘子";
    else if (node.quantifierFlag === "universal") nodeBody = "接入一个不受外部前提指定的新名字";
    else if (node.quantifierFlag === "existential") nodeBody = "由存在证明授权，并在旗内暂称见证";
    else if (node.quantifierFlagExit === "universal") nodeBody = "收回任意名字，得到全称结论";
    else if (node.quantifierFlagExit === "existential") nodeBody = "收回见证名字，只留下无关结论";
    else if (node.scopeAssumption) nodeBody = node.world ? `在世界 ${escapeHtml(node.world)} 临时采用接入的公式` : "接入后作为临时假设使用";
    else if (node.scopeDischarge) nodeBody = node.type === "notIntro" ? "解除依赖并得到否定" : (node.type === "raa" ? "解除临时假设并得到原公式" : "把临时依赖写进蕴含");
    else if (node.dependencyForgeNode) nodeBody = dependencyForgePreview(node);
    if (currentLevel().branch === "modal" && node.scopeDischarge) {
      try { nodeBody = escapeHtml(proofJudgement(evaluateNode(node.id))); } catch (_) { /* Keep the instruction before the proof is connected. */ }
    }
    let scopeBadge = "";
    if (node.scopeBound) {
      const frame = (currentLevel().scopeFrames || []).find((item) => item.id === node.scopeId);
      let scopeText = frame && frame.flagKind === "universal" ? "位于全称 flag 内" : (frame && frame.flagKind === "existential" ? "位于存在 flag 内" : "位于子证明内");
      if (!frame || !frame.flagKind) {
        try {
          const currentValue = evaluateNode(node.id);
          const dependency = (currentValue.openScopes || []).find((scope) => scope.id === node.scopeId);
          scopeText = dependency ? `依赖临时假设 ${prettyFormula(dependency.formula)}` : "尚未使用临时假设";
        } catch (_) { /* An incomplete node only needs its location marker. */ }
      }
      scopeBadge = `<small class="scope-chip">${escapeHtml(scopeText)}</small>`;
    }
    el.innerHTML = `<div class="node-head"><span>${escapeHtml(node.label || def.label)}</span><code>${escapeHtml(node.glyph || def.glyph)}</code></div><div class="node-body">${nodeBody}${scopeBadge}</div>`;

    el.querySelectorAll("[data-equality-occurrence]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        node.replacementOccurrence = Number(button.dataset.equalityOccurrence);
        renderCanvas();
        log("已选择这一处自由出现；=E 将只替换这里。", true, "替换位置已记录");
      });
    });

    (node.inputs || []).forEach((inputDef, index) => {
      const port = document.createElement("button");
      const source = state.nodes.find((item) => item.id === state.selectedOutput);
      const compatibility = source ? (isCompatibleType(source.out, inputDef.type) ? "compatible" : "incompatible") : "";
      port.className = `port input ${isInputConnected(node.id, index) ? "connected" : ""} ${compatibility}`;
      port.style.top = node.dependencyForgeNode ? `${34 + index * 48}px` : (node.inductionCoverageNode ? `${54 + index * 48}px` : `${24 + ((index + 1) * 42 / ((node.inputs || []).length + 1))}px`);
      port.setAttribute("aria-label", `${inputDef.label} · ${typeName(inputDef.type)}`);
      port.appendChild(portLabel(`${inputDef.label} · ${typeName(inputDef.type)}`));
      port.addEventListener("click", (event) => { event.stopPropagation(); connectTo(node.id, index, inputDef); });
      el.appendChild(port);
    });
    if (node.out) {
      const port = document.createElement("button");
      port.className = `port output ${state.selectedOutput === node.id ? "selected" : ""}`;
      port.disabled = lockedSource || witnessLocked;
      const outputLabel = node.outLabel || def.outLabel || node.label || "输出";
      port.setAttribute("aria-label", `${outputLabel} · ${typeName(node.out)}`);
      port.appendChild(portLabel(`${outputLabel} · ${typeName(node.out)}`));
      port.addEventListener("click", (event) => {
        event.stopPropagation();
        if (lockedSource) {
          log(node.lockedBody || "先完成前置构造。", false, "尚未解锁");
          return;
        }
        selectOutput(node.id);
      });
      el.appendChild(port);
    }
    if (!node.fixed) {
      const del = document.createElement("button");
      del.className = "delete-node"; del.textContent = "×"; del.title = "移除节点";
      del.addEventListener("click", (event) => { event.stopPropagation(); deleteNode(node.id); });
      el.appendChild(del);
    }
    el.querySelector(".node-body").addEventListener("click", (event) => { event.stopPropagation(); inspectNode(node); });
    if (!node.fixed && !node.ruleSlot && !node.scopeSlot && !node.scopeAssumption && !node.scopeDischarge && !node.dependencyForgeNode && !node.inductionCoverageNode) enableDrag(el, node);
    return el;
  }

  function typeName(type) {
    if (type === "accessibility" || type === "accessibilityPattern") return "可达条件";
    return ({ object: "对象", set: "集合", context: "公式集", consistency: "相容性", term: "项", formula: "公式", model: "模型", proof: "公式", evidence: "性质依据", inductionStepInstance: "步骤实例", inductionClause: "归纳步骤", induction: "归纳方法", soundnessMembership: "前提叶事实", soundnessGammaSatisfied: "满足前提集", soundnessSmallerProofs: "更矮的子证明", soundnessLocalPreservation: "规则的语义依据", truthDecision: "H 的判定性", truthConsistency: "H 的相容性", truthIH: "子公式归纳假设", truthWitness: "Henkin 见证性", truthTermDomain: "闭项论域", truthDuality: "量词对偶", truthAtomic: "原子情形", truthConnectives: "连接词情形", truthQuantifiers: "量词情形", modelExtension: "理论扩张", modelTruth: "真值引理", finalEntailment: "语义后承", finalModelPremises: "前提的模型", finalModelNegation: "结论的反面" })[type] || type;
  }

  function isCompatibleType(outputType, inputType) {
    if (inputType === "object") return Boolean(outputType);
    if (inputType === "context" && outputType === "set") return true;
    return outputType === inputType;
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
    if (currentLevel().branch === "modal" && (node.out === "proof" || node.out === "accessibility")) {
      try { return escapeHtml(proofJudgement(evaluateNode(node.id))); } catch (_) { /* Incomplete rules retain their familiar symbol. */ }
    }
    return escapeHtml(node.glyph || registry[node.type].glyph);
  }

  function dependencyForgePreview(node) {
    let antecedent = "□", consequent = "□";
    const antecedentLink = state.connections.find((connection) => connection.to === node.id && connection.input === 0);
    const consequentLink = state.connections.find((connection) => connection.to === node.id && connection.input === 1);
    try {
      if (antecedentLink) antecedent = prettyFormula(evaluateNode(antecedentLink.from));
    } catch (_) { /* An incomplete antecedent remains blank. */ }
    try {
      if (consequentLink) consequent = prettyFormula(proofInputs(evaluateNode(consequentLink.from)).conclusion);
    } catch (_) { /* An incomplete proof remains blank. */ }
    const complete = antecedent !== "□" && consequent !== "□";
    if (node.type === "notIntroForge") {
      return `<div class="dependency-formula-preview"><strong><em>¬</em>${escapeHtml(antecedent)}</strong><small>${complete ? `由临时 ${escapeHtml(antecedent)} 已推出 ⊥` : "否定：假设它，并推出 ⊥"}</small></div>`;
    }
    return `<div class="dependency-formula-preview"><strong>${escapeHtml(antecedent)} <em>→</em> ${escapeHtml(consequent)}</strong><small>${complete ? "蕴含已经补完" : "蕴含：前件 → 后件"}</small></div>`;
  }

  function selectOutput(nodeId) {
    const node = state.nodes.find((item) => item.id === nodeId);
    if (node && node.type === "source" && !sourceUnlocked(node)) {
      log(node.lockedBody || "先完成前置构造。", false, "尚未解锁");
      return;
    }
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
    const lockedConnection = state.connections.find((connection) => connection.to === targetId && connection.input === inputIndex && connection.locked);
    if (lockedConnection) {
      state.selectedOutput = null;
      log("这条橙色连接是上一关已经完成的推导，不需要重新接线。", true, "既有推导");
      renderCanvas();
      return;
    }
    if (!isCompatibleType(source.out, inputDef.type)) {
      if (currentLevel().dependencyForge && source.out === "proof" && inputDef.type === "formula") {
        log(currentLevel().dependencyForgeKind === "negation"
          ? "这份 ⊥ 推导应当接到“由临时 A 推导出的矛盾”端口；准备否定的 A 要接入公式端口。"
          : "这份 P 推导应当接到“蕴含后件”端口：出口会从同一份推导中读取结论 P，不需要第二张 P。", false, "请检查出口端口");
        tone(130, .08);
        renderCanvas();
        return;
      }
      if (currentLevel().dependencyForge && source.out === "formula" && inputDef.type === "proof") {
        log(currentLevel().dependencyForgeKind === "negation"
          ? "准备否定的 P 应当接到第一个端口；第二个端口需要子证明中那份仍依赖 P 的 ⊥ 推导。"
          : "假设的 P∧Q 应当接到“蕴含前件”端口；后件需要接入子证明中那份仍带依赖的 P 推导。", false, "请检查出口端口");
        tone(130, .08);
        renderCanvas();
        return;
      }
      log(`端口类型不匹配：${typeName(source.out)}不能接入“${inputDef.label}”。`, false, "类型错误");
      tone(130, .08);
      renderCanvas();
      return;
    }
    state.connections = state.connections.filter((c) => !(c.to === targetId && c.input === inputIndex));
    state.connections.push({ from: source.id, to: targetId, input: inputIndex });
    const targetNode = state.nodes.find((node) => node.id === targetId);
    if (targetNode && targetNode.type === "equalityElim") delete targetNode.replacementOccurrence;
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
      if (node.dependencyForgeNode) {
        const value = evaluateNode(node.id);
        const negation = value.kind === "negationDependencyRule";
        log(`这是${negation ? "否定" : "蕴含"}公式 ${prettyFormula(value.conclusion)}；本关正在构造的是得到它的规则 ${negation ? "¬I" : "→I"}。`, true, `${negation ? "否定" : "蕴含"}模式已补完`);
        return;
      }
      if (node.metaProofBoard) {
        if (node.goal) {
          const connected = (node.inputs || []).filter((_, index) => isInputConnected(node.id, index)).length;
          log(`${node.label}要说明 ${node.glyph}；当前已经连接 ${connected}/${(node.inputs || []).length} 条必要依据。`, connected === (node.inputs || []).length, "归纳证明板");
        } else {
          log(`${node.glyph} 是归纳证明板上已经写明的依据；它不是可以带到其他关卡使用的新零件。`, true, "元理论陈述");
        }
        return;
      }
      if (node.symbolic) {
        log(`${node.label} 是符号输入 ${node.glyph}；运行时会代入不同的测试对象。`, true, "符号输入");
        return;
      }
      const value = evaluateNode(node.id);
      const valueType = node.out || (node.inputs && node.inputs[0] && node.inputs[0].type);
      log(`${node.label || registry[node.type].label} 当前结果：${formatValue(valueType, value, node)}`, true);
    } catch (error) {
      log(error.message, false, "节点尚未完成");
    }
  }

  function formatValue(type, value, node = null) {
    if (type === "accessibility") return `${proofJudgement(value)}；${value.backgroundCondition ? `由系统条件 ${value.backgroundCondition} 得到，不是开放公式前提` : (value.scopeId ? "世界范围内的临时条件" : "已给出的可达条件")}`;
    if (type === "accessibilityPattern") return `${value.from}R${value.to}；规则的可达条件`;
    if (type === "set") {
      if (value && value.kind === "inductionPathEndpoint") return value.expression;
      if (state.displayMode === "semantic" && node && node.type === "source") return node.glyph;
      if (state.displayMode === "semantic" && node && node.type === "ord") {
        const [first, second] = decodeOrderedPair(value);
        return `⟨${prettyCurrentSet(first)},${prettyCurrentSet(second)}⟩`;
      }
      return state.displayMode === "encoding" ? formatEncodedSet(value, node) : prettyCurrentSet(value);
    }
    if (type === "context") return formatContext(value);
    if (type === "consistency") return value && value.label ? value.label : "尚未得到相容性";
    if (type === "term" || type === "formula") return prettyFormula(value);
    if (type === "evidence") {
      const index = value && value.kind === "inductionEvidence" ? zermeloIndex(value.target) : -1;
      return value && value.kind === "inductionEvidence" ? `𝒜(${index >= 0 ? index : value.target})` : "未形成性质依据";
    }
    if (type === "inductionStepInstance") {
      const index = value && value.kind === "inductionStepInstance" ? zermeloIndex(value.number) : -1;
      return index >= 0 ? `𝒜(${index})⇒𝒜(${index + 1})；只记录步骤形状` : "未形成步骤实例";
    }
    if (type === "inductionClause") return value && value.general ? "任意 n：𝒜(n)⇒𝒜(S(n))" : (value ? `${value.from}⇒${value.to}；只能使用一次` : "未形成归纳步骤");
    if (type === "induction") return "归纳基础＋任意后继步骤";
    if (type === "model") {
      const parts = [`D=${prettyCurrentSet(value.domain)}`];
      if (value.P) parts.push(`Pᴹ=${prettyCurrentSet(value.P)}`);
      if (value.Q) parts.push(`Qᴹ=${prettyCurrentSet(value.Q)}`);
      if (value.R) parts.push(`Rᴹ=${prettyCurrentSet(value.R)}`);
      return parts.join("，");
    }
    if (type === "proof") {
      const formula = proofJudgement(value);
      if (value.rule === "given") return `${formula}；来自 Γ，可以直接用于推理`;
      if (value.rule === "assumption") return `${formula}；只在子证明内可用，尚未解除`;
      if (value.rule === "existsFlag") return `${formula}；只在存在 flag 内暂时可用，见证名字是 ${value.flagName}`;
      const persistent = (value.open || []).length;
      const temporary = (value.openScopes || []).map((scope) => prettyFormula(scope.formula)).join("、") || "无";
      return `${formula}；由 ${proofRuleLabel(value.rule)} 得到；来自 Γ 的依赖 ${persistent} 条，开放的临时假设 ${temporary}`;
    }
    return String(value);
  }

  function formatContext(context) {
    return `Γ={${(context || []).map((formula) => prettyFormula(formula)).join(", ")}}`;
  }

  function formatInferenceRule(rule) {
    if (!rule || rule.kind !== "rule") return "未完成的规则";
    const premises = rule.premises.map((formula) => prettyFormula(formula)).join("，") || "无前提";
    return `{${premises}} ⟹ ${prettyFormula(rule.conclusion)}`;
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
        const offset = canvasContentOffset();
        const scopeFrame = node.scopeBound && (currentLevel().scopeFrames || []).find((frame) => frame.id === node.scopeId);
        const minX = scopeFrame ? scopeFrame.x + 12 : 5;
        const maxX = scopeFrame ? scopeFrame.x + scopeFrame.width - 166 : wrap.width - 160 - offset.x;
        const minY = scopeFrame ? scopeFrame.y + 28 : 5;
        const maxY = scopeFrame ? scopeFrame.y + scopeFrame.height - 82 : wrap.height - 82 - offset.y;
        node.x = Math.max(minX, Math.min(maxX, originX + e.clientX - startX));
        node.y = Math.max(minY, Math.min(maxY, originY + e.clientY - startY));
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
      group.setAttribute("class", `wire-group ${connection.locked ? "locked" : ""}`);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", "wire"); path.setAttribute("d", pathData);
      const hit = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hit.setAttribute("class", "wire-hit"); hit.setAttribute("d", pathData);
      if (!connection.locked) {
        hit.addEventListener("click", () => {
          state.connections = state.connections.filter((item) => item !== connection);
          renderCanvas();
          log("连接已移除。", true, "画布已更新");
        });
      }
      group.append(path, hit); svg.appendChild(group);
    });
  }

  function evaluateNode(id, context = {}, stack = new Set()) {
    if (stack.has(id)) throw new Error("检测到环路：集合构造不能依赖自身。");
    const node = state.nodes.find((item) => item.id === id);
    if (!node) throw new Error("连接指向了不存在的节点。");
    if (node.type === "source") {
      if (!sourceUnlocked(node)) throw new Error(node.lockedBody || "这个结果还没有由前置构造解锁。");
      return Object.prototype.hasOwnProperty.call(context, node.id) ? context[node.id] : clone(node.value);
    }
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
    return def.compute(values, node, { context, stack: new Set(stack) });
  }

  function evaluateRuleFrame(frame) {
    const premises = frame.premises.map((id) => evaluateNode(id));
    const conclusion = evaluateNode(frame.conclusion);
    if (frame.modalRule) {
      const link = state.connections.find((item) => item.to === frame.premises[0] && item.input === 1);
      if (!link) throw new Error("规则横线上方还需要接入可达条件 wRu。");
      const relation = evaluateNode(link.from);
      if (relation.from !== frame.from || relation.to !== frame.to) throw new Error("可达条件必须与横线上下的世界位置对应。");
      return { kind: "modalRule", premises, conclusion, from: frame.from, to: frame.to, relation };
    }
    return inferenceRule(premises, conclusion);
  }

  function closeModalWorld(source, node) {
    proofInputs(source);
    const frame = (currentLevel().scopeFrames || []).find((item) => item.id === node.scopeId && item.worldScope);
    if (!frame || source.world !== frame.to) throw new Error("范围出口需要在这个任意可达世界内真正得到的结论。");
    if ((source.openScopes || []).some((item) => item.world === frame.to)) throw new Error("先解除这个世界内的临时公式假设，再收回世界范围；不能从临时的 P 推出 □P。");
    if ((source.worldOpen || []).some((item) => item.world === frame.to)) throw new Error("这个世界名字必须是新鲜的，不能由外部前提指定它具有某个性质。");
    const remaining = (source.accessibilityDeps || []).filter((item) => item.scopeId !== frame.id);
    if (remaining.some((item) => item.from === frame.to || item.to === frame.to)) throw new Error("新世界的名字不能出现在仍开放的外部可达条件中。");
    return proofObject("boxIntro", F.box(source.conclusion), source.open, [source], {
      world: frame.from, openScopes: source.openScopes, accessibilityDeps: remaining,
      worldScopeId: frame.id, worldFrom: frame.from, worldTo: frame.to
    });
  }

  function modalWitnessFrame(node) {
    const frame = (currentLevel().scopeFrames || []).find((item) => item.id === node.scopeId && item.witnessScope);
    if (!frame) throw new Error("这个节点需要已经定义的临时见证范围。");
    return frame;
  }

  function closeModalWitness(inner, node, environment) {
    proofInputs(inner);
    const frame = modalWitnessFrame(node);
    const witness = evaluateNode(frame.entry, environment?.context || {}, new Set(environment?.stack || []));
    const source = witness.witnessSource;
    if (inner.world !== frame.from || inner.conclusion.kind === "accessibility") throw new Error("出口需要回到出发世界 w 的公式结论；不能把临时世界 u 的公式直接带出。");
    const scopes = mergeOpenScopes(source, inner).filter((item) => item.id !== frame.id);
    const relations = uniqueModalDependencies([...(source.accessibilityDeps || []), ...(inner.accessibilityDeps || [])]).filter((item) => item.scopeId !== frame.id);
    const external = uniqueModalDependencies([...(source.worldOpen || []), ...(inner.worldOpen || [])]);
    if (scopes.some((item) => item.world === frame.to) || external.some((item) => item.world === frame.to) || relations.some((item) => item.from === frame.to || item.to === frame.to)) throw new Error("临时见证名字不能出现在其余开放前提或可达条件中；出口只解除这次授权的两条临时依据。");
    return proofObject("diamondElim", inner.conclusion, mergeOpen(source, inner), [source, inner], { world: frame.from, openScopes: scopes, accessibilityDeps: relations, worldOpen: external, witnessScopeId: frame.id, witnessFrom: frame.from, witnessWorld: frame.to, witnessFormula: witness.conclusion });
  }

  function evaluateScopeSchema(schema) {
    return {
      kind: "scopeRule",
      scopeId: schema.scopeId,
      assumption: evaluateNode(schema.assumption),
      result: evaluateNode(schema.result),
      conclusion: evaluateNode(schema.conclusion)
    };
  }

  function evaluateDependencyForge(schema) {
    return evaluateNode(schema.forge);
  }

  function evaluateCaseTutorial(schema) {
    return { source: evaluateNode(schema.source), left: evaluateNode(schema.left), right: evaluateNode(schema.right) };
  }

  function evaluateCaseRuleSchema(schema) {
    return {
      source: evaluateNode(schema.source), leftAssumption: evaluateNode(schema.leftAssumption), leftResult: evaluateNode(schema.leftResult),
      rightAssumption: evaluateNode(schema.rightAssumption), rightResult: evaluateNode(schema.rightResult), conclusion: evaluateNode(schema.conclusion)
    };
  }

  function evaluateRaaSchema(schema) {
    return { assumption: evaluateNode(schema.assumption), result: evaluateNode(schema.result), conclusion: evaluateNode(schema.conclusion) };
  }

  function animateDependencyPackaging() {
    const wrap = $("#canvasWrap");
    wrap.classList.remove("dependency-packaged");
    void wrap.offsetWidth;
    wrap.classList.add("dependency-packaged");
    const scope = $("#ruleForgeBackdrop .scope-frame.dependency-discovery");
    const boundary = scope && scope.querySelector(".scope-boundary");
    if (scope) scope.classList.add("resolved");
    if (boundary) boundary.innerHTML = currentLevel().dependencyForgeKind === "negation"
      ? "<b>¬I</b><span>熟悉否定的引入规则已经构造</span>"
      : "<b>→I</b><span>熟悉蕴含的引入规则已经构造</span>";
  }

  function run() {
    try {
      const level = currentLevel();
      if (level.overview) {
        const target = resolvedNext(level);
        state.completed.add(level.id);
        saveProgress();
        tone(523, .08); setTimeout(() => tone(659, .08), 90); setTimeout(() => tone(784, .14), 180);
        renderRail();
        if (target) loadLevel(target); else openMap();
        return;
      }
      if (level.formulaSurgery) {
        const value = { token: state.surgeryToken, target: state.surgeryTarget, routes: { ...state.surgeryRoutes } };
        const result = level.validate({ value, nodes: state.nodes, connections: state.connections });
        log(result.message, result.ok, result.count);
        if (result.ok) {
          tone(523, .08); setTimeout(() => tone(659, .08), 90); setTimeout(() => tone(784, .14), 180);
          setTimeout(() => showSuccess(result.message), 420);
        } else tone(145, .12);
        return;
      }
      if (level.soundnessInductionBoard) {
        const result = level.validate({ connections: state.connections, nodes: state.nodes });
        log(result.message, result.ok, result.count);
        if (result.ok) {
          tone(523, .08); setTimeout(() => tone(659, .08), 90); setTimeout(() => tone(784, .14), 180);
          setTimeout(() => showSuccess(result.message), 420);
        } else tone(145, .12);
        return;
      }
      const evaluateGoal = (context = {}) => evaluateNode(level.runTarget || "goal", context);
      const rules = (level.ruleFrames || []).map((frame) => evaluateRuleFrame(frame));
      let value, values;
      if (level.multiGoals) {
        values = Object.fromEntries(level.multiGoals.map((id) => [id, evaluateNode(id)]));
        value = values;
      } else if (level.raaSchema) value = evaluateRaaSchema(level.raaSchema);
      else if (level.caseRuleSchema) value = evaluateCaseRuleSchema(level.caseRuleSchema);
      else if (level.caseTutorial) value = evaluateCaseTutorial(level.caseTutorial);
      else if (rules.length) value = rules[0];
      else if (level.dependencyForge) value = evaluateDependencyForge(level.dependencyForge);
      else if (level.scopeSchema) value = evaluateScopeSchema(level.scopeSchema);
      else value = evaluateGoal();
      const result = level.validate({ value, values, rules, evaluateGoal, nodes: state.nodes, connections: state.connections, truthTableRows: state.truthTableRows });
      log(result.message, result.ok, result.count);
      if (result.ok) {
        tone(523, .08); setTimeout(() => tone(659, .08), 90); setTimeout(() => tone(784, .14), 180);
        if (level.dependencyForge) animateDependencyPackaging();
        setTimeout(() => showSuccess(result.message), level.dependencyForge ? 820 : 420);
      } else tone(145, .12);
    } catch (error) {
      log(error.message, false);
      tone(130, .09);
    }
  }

  function log(message, ok) {
    $("#consoleBody").innerHTML = `<span class="prompt">›</span><span class="console-message ${ok ? "ok" : "error"}">${escapeHtml(message)}</span>`;
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
    $("#successTitle").textContent = level.ruleForge ? "规则构造。" : (isLast ? (level.proofViews ? "证明核验通过。" : "构造完成。") : "构造成立。");
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
      : (!isAvailable(target) ? "查看前置关卡 <b>↗</b>" : (level.id === "vn-run-successor" && target !== "ordered-pair" ? "返回策梅洛主干 <b>→</b>" : "进入下一关 <b>→</b>"));
    renderRail();
    $("#successDialog").showModal();
  }

  function nextLevel() {
    const target = resolvedNext();
    $("#successDialog").close();
    if (target && isAvailable(target)) loadLevel(target); else openMap(target);
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
    $("#tutorialNext").innerHTML = first ? "下一步 <b>→</b>" : "开始本关 <b>→</b>";
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
      : (numeralExample ? "现在换回你造出的冯·诺依曼数字，观察同一个操作如何作用在 1 和 2 上。" : "现在把第三个对象单独装箱，观察并集族如何把三个对象收进同一个集合。");
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
    $("#unionTutorialNext").innerHTML = symbolic ? "查看本关例子 <b>→</b>" : "开始本关 <b>→</b>";
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
