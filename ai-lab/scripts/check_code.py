import sys,json,io,contextlib
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'public'/'python'))
from engine import experiment,TinyTransformer
fixtures=json.loads((root/'.cache'/'code-fixtures.json').read_text('utf8'))
for item in fixtures:
    kind,settings=item['kind'],item['settings']
    ns={}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(item['code'],ns)
    if kind=='language':
        model=TinyTransformer(seed=42)
        for _ in range(3):model.train_step(.03)
        np.testing.assert_allclose(ns['model'].params['head'].data,model.params['head'].data)
        continue
    expected=experiment(kind,settings)
    if kind in ('linear','gradient'):
        np.testing.assert_allclose(ns['prediction'],[p['pred'] for p in expected['points']])
        np.testing.assert_allclose(ns['loss'],expected['loss'])
        np.testing.assert_allclose([ns['grad_w'],ns['grad_b']],expected['gradient'])
    elif kind=='network':
        np.testing.assert_allclose(ns['output'].data,expected['output'])
        np.testing.assert_allclose(ns['loss'].data,expected['loss'])
        np.testing.assert_allclose(ns['weight'].grad,expected['gradient'][0])
    elif kind=='tokens':
        assert ns['ids']==[t['id'] for t in expected['tokens']]
    elif kind=='probability':
        np.testing.assert_allclose(ns['probs'].data,[p['value'] for p in expected['probabilities']])
        np.testing.assert_allclose(ns['loss'].data,expected['loss'])
    else:
        actual=ns['combined'] if settings['heads']==2 else ns['residual']+ns['ff'] if kind=='transformer' else ns['output']
        np.testing.assert_allclose(actual.data[0],expected['output'])
report=dict(examples=len(fixtures),result='passed',method='Execute exact UI Python examples; compare actual arrays, losses, gradients and model weights')
(root/'evidence'/'code.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report))
