const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(projectRoot, 'app.js'), 'utf8');
const testApp = app.replace(/  init\(\);\s*\}\)\(\);\s*$/, '  globalThis.game = { state, readSiteStorage, saveProgress };\n})();');
function load(initial) {
  const data = new Map(Object.entries(initial));
  const sandbox = { localStorage: {
    getItem: (key) => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value))
  } };
  vm.runInNewContext(testApp, sandbox);
  return { game: sandbox.game, data };
}

const oldSave = JSON.stringify({ completedIds: ['ignite-empty'], currentLevelId: 'ignite-empty' });
const legacy = load({
  'logic-foundry-progress-v20': oldSave,
  'logic-foundry-display-mode-v1': 'encoding',
  'logic-foundry-display-coach-v1': 'done',
  'logic-foundry-multiwire-tip-v2': 'seen'
});
assert.ok(legacy.game.state.completed.has('ignite-empty'));
assert.equal(legacy.game.state.displayMode, 'encoding');
assert.equal(legacy.data.get('mathematical-logic-progress-v20'), oldSave);
assert.equal(legacy.data.get('mathematical-logic-display-mode-v1'), 'encoding');
assert.equal(legacy.game.readSiteStorage('mathematical-logic-display-coach-v1'), 'done');
assert.equal(legacy.game.readSiteStorage('mathematical-logic-multiwire-tip-v2'), 'seen');
assert.equal(legacy.data.get('mathematical-logic-display-coach-v1'), 'done');
assert.equal(legacy.data.get('mathematical-logic-multiwire-tip-v2'), 'seen');
legacy.game.saveProgress();
assert.equal(legacy.data.get('logic-foundry-progress-v20'), oldSave, 'old data is retained');
assert.ok(JSON.parse(legacy.data.get('mathematical-logic-progress-v20')).completedIds.includes('ignite-empty'));

const newSave = JSON.stringify({ completedIds: [], currentLevelId: 'ignite-empty' });
const current = load({
  'logic-foundry-progress-v20': oldSave,
  'mathematical-logic-progress-v20': newSave,
  'logic-foundry-display-mode-v1': 'encoding',
  'mathematical-logic-display-mode-v1': 'semantic'
});
assert.equal(current.game.state.completed.size, 0, 'new save takes priority');
assert.equal(current.game.state.displayMode, 'semantic');
assert.equal(current.data.get('mathematical-logic-progress-v20'), newSave);
assert.equal(current.data.get('logic-foundry-progress-v20'), oldSave);
assert.equal(load({}).game.readSiteStorage('mathematical-logic-progress-v20'), null);

const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
assert.match(html, /<title>数理逻辑/);
assert.match(html, /MATHEMATICAL LOGIC/);
assert.doesNotMatch(html, /逻辑铸造厂|LOGIC FOUNDRY/);
assert.ok(fs.existsSync(path.join(projectRoot, 'styles.css')));
const redirect = fs.readFileSync(path.join(projectRoot, '..', 'logic-foundry', 'index.html'), 'utf8');
assert.match(redirect, /http-equiv="refresh"/);
assert.match(redirect, /\.\.\/mathematical-logic\//);
assert.equal(new URL('../mathematical-logic/', 'https://pingjiang2013.github.io/tui/logic-foundry/').href, 'https://pingjiang2013.github.io/tui/mathematical-logic/');
console.log('PASS: renamed branding/path, legacy progress/preferences migration, new-save priority, old data preservation and redirect.');
