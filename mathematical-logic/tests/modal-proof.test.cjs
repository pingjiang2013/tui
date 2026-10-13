const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Exercise the real graph evaluator without starting the browser UI.
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const sandbox = { localStorage: { getItem: () => null }, console };
vm.runInNewContext(source.replace(/  init\(\);\s*\}\)\(\);\s*$/, '  globalThis.game = { levels, registry, state, F, proofObject, worldGiven, accessProof, closeModalWorld, closeModalWitness, evaluateNode, evaluateRuleFrame, compileFitchProof, renderGentzenProof, renderFitchProof, levelMarker, mapGroups, orderedPair, set, modalModelForLevel, evaluateModalFormula, TRUTH_TRUE, TRUTH_FALSE };\n})();'), sandbox);
const g = sandbox.game;
assert.ok(g, 'test seam must replace startup, not production code');
const P = g.F.prop('P'), Q = g.F.prop('Q');
let level, serial = 0;
const copy = (value) => JSON.parse(JSON.stringify(value));
function enter(id) {
  level = g.levels.find((item) => item.id === id);
  assert.ok(level, id);
  g.state.currentLevelId = id;
  g.state.nodes = copy(level.nodes);
  g.state.connections = copy(level.connections || []);
}
function wire(from, to, input = 0) {
  g.state.connections = g.state.connections.filter((item) => item.to !== to || item.input !== input);
  g.state.connections.push({ from, to, input });
}
function add(type, from = []) {
  const id = `test-${serial++}`, def = g.registry[type];
  g.state.nodes.push({ id, type, inputs: def.inputs, out: def.out });
  from.forEach((item, index) => wire(item, id, index));
  return id;
}
function check() {
  const rules = (level.ruleFrames || []).map(g.evaluateRuleFrame);
  const values = level.multiGoals && Object.fromEntries(level.multiGoals.map((id) => [id, g.evaluateNode(id)]));
  const value = values || rules[0] || g.evaluateNode(level.runTarget || 'goal');
  const result = level.validate({ value, values, rules, nodes: g.state.nodes, connections: g.state.connections });
  assert.ok(result.ok, result.message);
  return value;
}
function proofViews(proof) {
  assert.match(g.renderGentzenProof(proof), /proof-/);
  assert.match(g.renderFitchProof(proof), /fitch-document/);
  return g.compileFitchProof(proof);
}

enter('modal-proof-worlds');
wire(add('impElim', ['modal-w-imp', 'modal-w-p']), 'modal-world-q');
wire(add('impElim', ['modal-u-imp', 'modal-u-q']), 'modal-world-p');
const twoWorlds = check();
proofViews(twoWorlds['modal-world-q']); proofViews(twoWorlds['modal-world-p']);
assert.throws(() => g.registry.impElim.compute([g.worldGiven('w', g.F.imp(P, Q)), g.worldGiven('u', P)]), /同一个世界/);
assert.throws(() => g.registry.andIntro.compute([g.worldGiven('w', P), g.worldGiven('u', P)]), /同一个世界/);
const bothP = g.proofObject('display-test', g.F.and(P, P), [], [g.worldGiven('w', P), g.worldGiven('u', P)]);
assert.equal(g.compileFitchProof(bothP).premiseEnd, 2, 'world-labelled premises must not collapse');

enter('modal-forge-box-elim');
const a = add('schemaA'), boxA = add('modalBox', [a]), boxBoxA = add('modalBox', [boxA]);
wire(boxA, 'modal-box-premise'); wire(a, 'modal-box-result');
wire(boxBoxA, 'modal-box2-premise'); wire(boxA, 'modal-box2-result');
assert.throws(() => g.evaluateRuleFrame(level.ruleFrames[0]), /可达条件/);
wire('modal-rule-access', 'modal-box-premise', 1); wire('modal-rule-access', 'modal-box2-premise', 1);
check();
wire(a, 'modal-box2-result');
assert.equal(level.validate({ rules: level.ruleFrames.map(g.evaluateRuleFrame) }).ok, false, 'cannot remove two boxes');

enter('modal-apply-box-elim');
const uImp = add('modalBoxElim', ['modal-double-imp', 'modal-w-u']);
const uP = add('modalBoxElim', ['modal-double-p', 'modal-w-u']);
const vImp = add('modalBoxElim', [uImp, 'modal-u-v']);
const vP = add('modalBoxElim', [uP, 'modal-u-v']);
wire(add('impElim', [vImp, vP]), 'goal');
const vQ = check();
assert.equal(vQ.accessibilityDeps.length, 2);
proofViews(vQ);
assert.throws(() => g.registry.modalBoxElim.compute([g.evaluateNode('modal-double-p'), g.evaluateNode('modal-u-v')]), /同一个出发世界/);
assert.throws(() => g.registry.modalBoxElim.compute([g.worldGiven('w', P), g.accessProof('w', 'u')]), /一次只取掉/);

enter('modal-counterexample-local');
const p0 = add('ord', ['modal-world-0', 'modal-truth-true']);
const p1 = add('ord', ['modal-world-1', 'modal-truth-false']);
const p2 = add('ord', ['modal-world-2', 'modal-truth-true']);
wire(add('set3', [p0, p1, p2]), 'modal-local-p');
const edge = add('ord', ['modal-world-0', 'modal-world-1']);
wire(add('pair', [edge, edge]), 'modal-local-r');
check();
let countermodels = 0;
for (let truthBits = 0; truthBits < 8; truthBits++) {
  const column = g.set(...['w₀', 'w₁', 'w₂'].map((world, index) => g.orderedPair(world, truthBits & (1 << index) ? g.TRUTH_TRUE : g.TRUTH_FALSE)));
  for (let edges = 0; edges < 512; edges++) {
    const relation = g.set(...Array.from({ length: 9 }, (_, index) => index).filter((index) => edges & (1 << index)).map((index) => g.orderedPair(['w₀', 'w₁', 'w₂'][Math.floor(index / 3)], ['w₀', 'w₁', 'w₂'][index % 3])));
    const values = { 'modal-local-p': column, 'modal-local-r': relation };
    const result = level.validate({ values });
    const expected = Boolean(truthBits & 1) && [1, 2].some((index) => (edges & (1 << index)) && !(truthBits & (1 << index)));
    assert.equal(result.ok, expected);
    if (result.ok) countermodels++;
  }
}
assert.ok(countermodels > 1);

enter('modal-forge-box-intro');
wire('modal-forge-conjunction', 'modal-forge-assume');
const left = add('andElim1', ['modal-forge-assume']), right = add('andElim2', ['modal-forge-assume']);
const swapped = add('andIntro', [right, left]);
wire(swapped, 'modal-forge-imp-exit');
wire('modal-forge-imp-exit', 'modal-forge-world-exit');
wire(add('modalBox', ['modal-forge-phi']), 'modal-forge-world-exit', 1);
wire('modal-forge-world-exit', 'goal');
const swapTheorem = check();
const swapDoc = proofViews(swapTheorem);
assert.equal(swapDoc.maxDepth, 2);
assert.ok(swapDoc.rows.some((row) => row.displayText.includes('wRu')));
assert.throws(() => g.closeModalWorld(g.evaluateNode(swapped), { scopeId: 'modal-forge-world' }), /先解除/);
assert.throws(() => g.closeModalWorld(g.worldGiven('u', P), { scopeId: 'modal-forge-world' }), /新鲜/);
assert.throws(() => g.closeModalWorld(g.worldGiven('w', P), { scopeId: 'modal-forge-world' }), /范围出口/);
const externalEdge = g.proofObject('boxElim', P, [], [g.worldGiven('w', g.F.box(P)), g.accessProof('w', 'u')], { world: 'u' });
assert.throws(() => g.closeModalWorld(externalEdge, { scopeId: 'modal-forge-world' }), /外部可达条件/);

enter('modal-prove-k');
wire('modal-k-imp-formula', 'modal-k-imp-assume'); wire('modal-k-p-formula', 'modal-k-p-assume');
const localImp = add('modalBoxElim', ['modal-k-imp-assume', 'modal-k-world-entry']);
const localP = add('modalBoxElim', ['modal-k-p-assume', 'modal-k-world-entry']);
assert.equal(proofViews(g.evaluateNode(localP)).maxDepth, 2, 'unfinished world scopes must still render');
wire(add('impElim', [localImp, localP]), 'modal-k-world-exit');
wire('modal-k-world-exit', 'modal-k-p-exit'); wire('modal-k-p-exit', 'modal-k-imp-exit'); wire('modal-k-imp-exit', 'goal');
const k = check(), kDoc = proofViews(k);
assert.equal(kDoc.maxDepth, 3);
assert.equal(kDoc.premiseEnd, 0);
assert.equal(k.openScopes.length, 0); assert.equal(k.worldOpen.length, 0); assert.equal(k.accessibilityDeps.length, 0);
assert.equal(kDoc.rows.filter((row) => row.justification.startsWith('□E')).length, 2);
assert.equal(kDoc.rows.filter((row) => row.justification.startsWith('→I')).length, 2);
assert.equal(kDoc.rows.filter((row) => row.justification.startsWith('□I')).length, 1);
assert.throws(() => g.registry.impIntro.compute([g.evaluateNode(localP)], { scopeId: 'modal-k-inner' }), /同一个世界/);
// □I permits external boxed premises at w, not just closed proofs.
const allowed = g.registry.modalBoxElim.compute([g.worldGiven('w', g.F.box(P)), g.evaluateNode('modal-k-world-entry')]);
const boxedAgain = g.closeModalWorld(allowed, { scopeId: 'modal-k-world' });
assert.equal(boxedAgain.worldOpen.length, 1);
assert.equal(boxedAgain.accessibilityDeps.length, 0);
proofViews(boxedAgain);

// Regression: ordinary unlabelled natural deduction still compiles unchanged.
const ordinaryAssumption = g.registry.scopeAssumption.compute([g.F.and(P, Q)], { scopeId: 'old-scope' });
const ordinaryLeft = g.registry.andElim1.compute([ordinaryAssumption]);
const ordinaryTheorem = g.registry.impIntro.compute([ordinaryLeft], { scopeId: 'old-scope' });
const ordinaryDoc = proofViews(ordinaryTheorem);
assert.equal(ordinaryDoc.maxDepth, 1);
assert.ok(ordinaryDoc.rows.every((row) => !row.displayText.includes('undefined:')));
const oldGiven = g.proofObject('given', P, [P]);
assert.equal(g.compileFitchProof(oldGiven).premiseEnd, 1);

enter('modal-forge-diamond-intro');
const diA = add('schemaA'), diBox = add('modalBox', [diA]), diDiamond = add('modalDiamond', [diA]);
wire(diBox, 'modal-di-box-premise'); wire(diA, 'modal-di-box-result');
wire(diA, 'modal-di-premise'); wire(diDiamond, 'modal-di-result');
wire('modal-di-rule-access', 'modal-di-box-premise', 1); wire('modal-di-rule-access', 'modal-di-premise', 1);
check();
wire(diA, 'modal-di-result');
assert.equal(level.validate({ rules: level.ruleFrames.map(g.evaluateRuleFrame) }).ok, false);

enter('modal-apply-diamond-intro');
const diLocalImp = add('modalBoxElim', ['modal-di-given-box', 'modal-di-given-edge']);
const diLocalQ = add('impElim', [diLocalImp, 'modal-di-given-p']);
wire(add('modalDiamondIntro', [diLocalQ, 'modal-di-given-edge']), 'goal');
proofViews(check());
assert.throws(() => g.registry.modalDiamondIntro.compute([g.worldGiven('w', P), g.accessProof('w', 'u')]), /到达世界/);

enter('modal-forge-diamond-elim');
assert.throws(() => g.evaluateNode('modal-di-forge-access'), /缺少输入/);
wire('modal-di-forge-source', 'modal-di-forge-entry');
const witnessP = add('andElim1', ['modal-di-forge-entry']), witnessQ = add('andElim2', ['modal-di-forge-entry']);
const possibleP = add('modalDiamondIntro', [witnessP, 'modal-di-forge-access']);
const possibleQ = add('modalDiamondIntro', [witnessQ, 'modal-di-forge-access']);
const twoPossibilities = add('andIntro', [possibleP, possibleQ]);
assert.equal(proofViews(g.evaluateNode(twoPossibilities)).maxDepth, 1, 'the two witness assumptions share one scope');
wire(twoPossibilities, 'modal-di-forge-exit'); wire('modal-di-forge-exit', 'goal');
const diamondDistribution = check(), distributionDoc = proofViews(diamondDistribution);
assert.equal(distributionDoc.maxDepth, 1);
assert.equal(distributionDoc.premiseEnd, 1);
assert.equal(distributionDoc.rows.filter((row) => row.justification.startsWith('◇I')).length, 2);
assert.equal(distributionDoc.rows.filter((row) => row.justification.startsWith('◇E')).length, 1);
assert.throws(() => g.closeModalWitness(g.evaluateNode(witnessP), { scopeId: 'modal-di-forge-scope' }), /回到出发世界/);
const contaminated = copy(g.evaluateNode(twoPossibilities));
contaminated.worldOpen.push({ world: 'u', formula: P });
assert.throws(() => g.closeModalWitness(contaminated, { scopeId: 'modal-di-forge-scope' }), /其余开放/);
const extraAssumption = copy(g.evaluateNode(twoPossibilities));
extraAssumption.openScopes.push({ id: 'another-assumption', world: 'u', formula: Q });
assert.throws(() => g.closeModalWitness(extraAssumption, { scopeId: 'modal-di-forge-scope' }), /其余开放/);
assert.throws(() => g.registry.modalDiamondWitness.compute([g.worldGiven('w', P)], { scopeId: 'modal-di-forge-scope' }), /◇A 证明授权/);
const unFresh = g.worldGiven('w', g.F.diamond(P));
unFresh.worldOpen.push({ world: 'u', formula: Q });
assert.throws(() => g.registry.modalDiamondWitness.compute([unFresh], { scopeId: 'modal-di-forge-scope' }), /新鲜/);
// The exit preserves unrelated assumptions; it only discharges its own witness.
const otherWorld = copy(g.evaluateNode(twoPossibilities));
otherWorld.openScopes.push({ id: 'external-assumption', world: 'w', formula: Q });
assert.equal(g.closeModalWitness(otherWorld, { scopeId: 'modal-di-forge-scope' }).openScopes.length, 1);
// An implicit entry/access dependency must participate in cycle detection.
wire(possibleP, 'modal-di-forge-entry');
assert.throws(() => g.evaluateNode('modal-di-forge-access'), /环路/);

enter('modal-diamond-transfer');
wire('modal-dt-box-formula', 'modal-dt-box-assume');
wire('modal-dt-diamond-formula', 'modal-dt-diamond-assume');
wire('modal-dt-diamond-assume', 'modal-dt-entry');
const transferImp = add('modalBoxElim', ['modal-dt-box-assume', 'modal-dt-access']);
const transferQ = add('impElim', [transferImp, 'modal-dt-entry']);
const transferPossibility = add('modalDiamondIntro', [transferQ, 'modal-dt-access']);
assert.equal(proofViews(g.evaluateNode(transferPossibility)).maxDepth, 3);
wire(transferPossibility, 'modal-dt-witness-exit');
wire('modal-dt-witness-exit', 'modal-dt-inner-exit'); wire('modal-dt-inner-exit', 'modal-dt-outer-exit'); wire('modal-dt-outer-exit', 'goal');
const transferTheorem = check(), transferDoc = proofViews(transferTheorem);
assert.equal(transferDoc.maxDepth, 3);
assert.equal(transferDoc.premiseEnd, 0);
assert.equal(transferDoc.rows.filter((row) => row.justification.startsWith('→I')).length, 2);
assert.equal(transferDoc.rows.filter((row) => row.justification.startsWith('◇E')).length, 1);
assert.equal(transferTheorem.accessibilityDeps.length, 0);
assert.equal(transferTheorem.openScopes.length, 0);
assert.equal(transferTheorem.worldOpen.length, 0);

enter('modal-separate-witnesses');
const separateP = add('ord', ['modal-world-0', 'modal-world-1']);
const separateQ = add('ord', ['modal-world-0', 'modal-world-2']);
wire(add('pair', [separateP, separateQ]), 'goal');
check();
let separateCountermodels = 0;
for (let edges = 0; edges < 512; edges++) {
  const relation = g.set(...Array.from({ length: 9 }, (_, index) => index).filter((index) => edges & (1 << index)).map((index) => g.orderedPair(['w₀', 'w₁', 'w₂'][Math.floor(index / 3)], ['w₀', 'w₁', 'w₂'][index % 3])));
  const result = level.validate({ value: relation });
  assert.equal(result.ok, (edges & 6) === 6);
  if (result.ok) separateCountermodels++;
}
assert.equal(separateCountermodels, 128);

enter('modal-counterexample-t');
const tEdge = add('ord', ['modal-world-0', 'modal-world-1']);
wire(add('pair', [tEdge, tEdge]), 'goal');
check();
assert.equal(level.validate({ value: g.set() }).ok, false, 'nonempty successors are required');
let tCountermodels = 0;
for (let edges = 0; edges < 512; edges++) {
  const relation = g.set(...Array.from({ length: 9 }, (_, index) => index).filter((index) => edges & (1 << index)).map((index) => g.orderedPair(['w₀', 'w₁', 'w₂'][Math.floor(index / 3)], ['w₀', 'w₁', 'w₂'][index % 3])));
  const result = level.validate({ value: relation });
  assert.equal(result.ok, !(edges & 1) && Boolean(edges & 6));
  if (result.ok) tCountermodels++;
}
assert.equal(tCountermodels, 192);

enter('modal-reflexive-extension');
const beforeModel = g.modalModelForLevel();
assert.equal(beforeModel.relation.length, 1, 'the original relation remains visible before construction');
assert.equal(beforeModel.relationKnown, false, 'draft relation is not prematurely declared complete');
const self0 = add('ord', ['modal-world-0', 'modal-world-0']);
const self1 = add('ord', ['modal-world-1', 'modal-world-1']);
const self2 = add('ord', ['modal-world-2', 'modal-world-2']);
const diagonal = add('set3', [self0, self1, self2]);
const family = add('pair', ['modal-reflexive-original', diagonal]);
wire(add('union', [family]), 'goal');
const reflexiveRelation = check();
const afterModel = g.modalModelForLevel(level, { goal: reflexiveRelation });
assert.equal(g.evaluateModalFormula(P, afterModel, 'w₀'), false);
assert.equal(g.evaluateModalFormula(g.F.box(P), afterModel, 'w₀'), false);
assert.equal(g.evaluateModalFormula(level.modal.formula, afterModel, 'w₀'), true);
const originalModel = { ...afterModel, relation: level.modal.baseRelation, relationKnown: true };
assert.equal(g.evaluateModalFormula(P, originalModel, 'w₀'), false);
assert.equal(g.evaluateModalFormula(g.F.box(P), originalModel, 'w₀'), true);
assert.equal(g.evaluateModalFormula(level.modal.formula, originalModel, 'w₀'), false);
assert.equal(level.validate({ value: g.evaluateNode(diagonal) }).ok, false, 'must preserve original edge');
assert.equal(level.validate({ value: g.set(...reflexiveRelation, g.orderedPair('w₁', 'w₂')) }).ok, false, 'no unrelated edges');

enter('modal-prove-t');
wire('modal-t-box-formula', 'modal-t-box-assume');
wire('modal-t-p-formula', 'modal-t-p-assume');
const actualP = add('modalBoxElim', ['modal-t-box-assume', 'modal-t-self']);
const possibleActualP = add('modalDiamondIntro', ['modal-t-p-assume', 'modal-t-self']);
wire(actualP, 'modal-t-box-exit'); wire(possibleActualP, 'modal-t-p-exit');
wire('modal-t-box-exit', 'modal-t-box-goal'); wire('modal-t-p-exit', 'modal-t-diamond-goal');
const tProofs = check();
for (const proof of Object.values(tProofs)) {
  const doc = proofViews(proof);
  assert.equal(doc.maxDepth, 1);
  assert.equal(doc.hasFormulaPremises, false);
  assert.equal(doc.systemConditions.join(), 'R 自反');
  assert.match(g.renderGentzenProof(proof), /系统条件/);
  assert.match(g.renderFitchProof(proof), /无开放公式前提/);
  assert.equal(proof.openScopes.length, 0);
  assert.equal(proof.worldOpen.length, 0);
  assert.equal(proof.accessibilityDeps.length, 1, 'the system condition must remain');
  assert.equal(proof.accessibilityDeps[0].backgroundCondition, 'R 自反');
}
const missingCondition = copy(tProofs);
missingCondition['modal-t-box-goal'].accessibilityDeps = [];
assert.equal(level.validate({ values: missingCondition }).ok, false, 'do not pretend this is a closed K theorem');
wire(actualP, 'modal-t-box-goal');
assert.equal(level.validate({ values: Object.fromEntries(level.multiGoals.map((id) => [id, g.evaluateNode(id)])) }).ok, false, 'ordinary assumptions must be discharged');

const modalLevels = g.levels.filter((item) => item.branch === 'modal');
assert.equal(modalLevels.length, 21);
modalLevels.forEach((item, index) => {
  assert.equal(g.levelMarker(item), `L${index + 1}`);
  assert.ok(item.definition && item.hint && item.validate);
  if (index < 20) assert.equal(item.next, modalLevels[index + 1].id);
  for (const type of item.tools) assert.ok(g.registry[type], type);
});
assert.equal(g.levels.length, 255);
assert.equal(new Set(g.levels.map((item) => item.id)).size, 255);
console.log(`PASS: fourteen modal graph constructions, 4096 local countermodel cases (${countermodels} solutions), 512 separate-witness relations (${separateCountermodels} solutions), 512 T-countermodel relations (${tCountermodels} solutions), reflexive extension and system-condition safeguards, Gentzen/Fitch, ordinary proof regression, 255-level route.`);
