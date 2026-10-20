import sys
import unittest
import json
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'public' / 'python'))
from engine import Tensor, attention, cross_entropy, layer_norm, softmax, experiment, TinyTransformer, VOCAB


def numerical_gradient(array, func, index, eps=1e-5):
    old = float(array[index])
    array[index] = old + eps
    plus = func()
    array[index] = old - eps
    minus = func()
    array[index] = old
    return (plus - minus) / (2 * eps)


class MathTests(unittest.TestCase):
    def test_linear_known_values(self):
        r = experiment('linear', dict(weight=2, bias=0))
        self.assertEqual(r['output'], 6)
        self.assertAlmostEqual(r['loss'], 0.4)
        self.assertAlmostEqual(r['gradient'][0], 3.2)

    def test_unseen_input_is_predicted_without_using_its_unknown_answer(self):
        first=experiment('linear',dict(query=6,weight=2,bias=.5))
        second=experiment('linear',dict(query=7,weight=2,bias=.5))
        self.assertAlmostEqual(first['query_prediction'],12.5)
        self.assertAlmostEqual(second['query_prediction'],14.5)
        self.assertEqual(first['loss'],second['loss'])

    def test_gradient_update_lowers_default_loss(self):
        r = experiment('gradient')
        after = experiment('gradient', dict(weight=r['next'][0], bias=r['next'][1]))
        self.assertLess(after['loss'], r['loss'])

    def test_too_large_learning_rate_can_fail(self):
        r = experiment('gradient', dict(rate=1))
        after = experiment('gradient', dict(weight=r['next'][0], bias=r['next'][1]))
        self.assertGreater(after['loss'], r['loss'])

    def test_network_gradient(self):
        r = experiment('network', dict(weight=1.2, input=0.8, bias=0.5))
        eps = 1e-5
        g = (experiment('network', dict(weight=1.2+eps))['loss'] - experiment('network', dict(weight=1.2-eps))['loss'])/(2*eps)
        self.assertAlmostEqual(r['gradient'][0], g, places=7)

    def test_broadcast_and_repeated_embedding_gradient(self):
        x, b = Tensor([[1,2],[3,4]]), Tensor([0.2,0.3])
        loss = ((x+b)**2).mean()
        loss.backward()
        np.testing.assert_allclose(b.grad, [2.2,3.3])
        e = Tensor(np.arange(6).reshape(3,2))
        e[[1,1,2]].sum().backward()
        np.testing.assert_array_equal(e.grad, [[0,0],[2,2],[1,1]])

    def test_softmax_is_stable(self):
        p = softmax(Tensor([10000,10001,-10000])).data
        self.assertTrue(np.isfinite(p).all())
        self.assertAlmostEqual(float(p.sum()), 1)
        np.testing.assert_allclose(p, softmax(Tensor([0,1,-20000])).data)

    def test_cross_entropy_gradient(self):
        z = Tensor([[0.2,0.6,-0.4]])
        loss = cross_entropy(z, np.array([1]))
        loss.backward()
        expected = softmax(z).data.copy()
        expected[0,1] -= 1
        np.testing.assert_allclose(z.grad, expected)

    def test_attention_values_and_gradients(self):
        q = Tensor([[0.3,0.7],[0.2,-0.1]])
        k = Tensor([[0.8,0.2],[-0.4,0.5]])
        v = Tensor([[1.,2.],[3.,4.]])
        out, _, weights = attention(q,k,v)
        np.testing.assert_allclose(weights.data.sum(-1), 1)
        np.testing.assert_allclose(out.data, weights.data @ v.data)
        (out**2).sum().backward()
        analytic = q.grad[0,0]
        numeric = numerical_gradient(q.data, lambda:float((attention(q,k,v)[0].data**2).sum()), (0,0))
        self.assertAlmostEqual(analytic,numeric,places=7)

    def test_causal_mask_prevents_future_influence(self):
        q, k, v = [Tensor(np.array([[.2,.4],[.5,.3],[.1,.7]])) for _ in range(3)]
        first, _, weights = attention(q,k,v,True)
        self.assertEqual(weights.data[0,1],0)
        self.assertEqual(weights.data[0,2],0)
        original=first.data[0].copy()
        k.data[2] += 20
        v.data[2] -= 40
        np.testing.assert_allclose(attention(q,k,v,True)[0].data[0],original)

    def test_layernorm_gradient(self):
        x = Tensor([[0.2,0.5,0.9]])
        g,b=Tensor([1.2,.8,1.]),Tensor([.1,.2,.3])
        (layer_norm(x,g,b)**2).sum().backward()
        analytic=x.grad[0,1]
        numeric=numerical_gradient(x.data,lambda:float((layer_norm(x,g,b).data**2).sum()),(0,1))
        self.assertAlmostEqual(analytic,numeric,places=5)

    def test_transformer_gradients_all_parameter_families(self):
        m=TinyTransformer(dim=8,heads=2,layers=1,context=8)
        x,y=np.array([[1,2,3]]),np.array([[2,3,4]])
        loss=cross_entropy(m.forward(x)[0],y)
        loss.backward()
        for name,index in [('embedding',(1,2)),('position',(0,2)),('0.qkv',(2,1)),('0.out',(1,2)),('0.ff1',(2,1)),('0.ff2',(1,2)),('0.ln1.g',(2,)),('0.ln2.b',(1,)),('head',(1,2)),('final.g',(2,))]:
            p=m.params[name]
            analytic=float(p.grad[index])
            numeric=numerical_gradient(p.data,lambda:float(cross_entropy(m.forward(x)[0],y).data),index)
            self.assertAlmostEqual(analytic,numeric,places=5,msg=name)

    def test_transformer_causality(self):
        m=TinyTransformer(dim=8,heads=2,layers=2,context=8)
        a=m.forward([[1,2,3]])[0].data
        b=m.forward([[1,2,4]])[0].data
        np.testing.assert_allclose(a[:,:2],b[:,:2],atol=1e-12)

    def test_training_checkpoint_and_sampling_reproducibility(self):
        m=TinyTransformer(dim=8,heads=2,layers=1,context=8)
        initial=m.evaluate()
        for _ in range(60):
            m.train_step(.05)
        self.assertLess(m.evaluate(), initial)
        saved=json.loads(json.dumps(m.checkpoint()))
        first=m.inspect('小猫',sample=True)
        loss=m.train_step()
        m.restore(saved)
        self.assertEqual(first['output'],m.inspect('小猫',sample=True)['output'])
        self.assertAlmostEqual(loss,m.train_step(),places=12)

    def test_unknown_input_is_explained(self):
        m=TinyTransformer()
        with self.assertRaisesRegex(ValueError,'词表中没有'):
            m.inspect('机器人')

    def test_invalid_checkpoint_does_not_partially_overwrite_model(self):
        model=TinyTransformer()
        before=model.checkpoint()
        invalid=json.loads(json.dumps(before))
        invalid['params']['head'][0][0]+=1
        invalid['rng']={'invalid':True}
        with self.assertRaisesRegex(ValueError,'随机状态无效'):
            model.restore(invalid)
        self.assertEqual(before,model.checkpoint())

    def test_all_teaching_experiments_serialize(self):
        for kind in ['linear','gradient','network','tokens','embedding','probability','attention','transformer']:
            r=experiment(kind)
            json.dumps(r,allow_nan=False)
            self.assertGreater(len(r['trace']),0)

    def test_two_heads_use_different_real_projections(self):
        first=experiment('attention',dict(heads=2,head=0))
        second=experiment('attention',dict(heads=2,head=1))
        self.assertFalse(np.allclose(first['matrix'],second['matrix']))
        np.testing.assert_allclose(first['output'],second['output'])
        self.assertEqual(len(first['trace']),10)

    def test_position_information_changes_computation(self):
        before=experiment('attention')
        after=experiment('attention',dict(position=True))
        self.assertFalse(np.allclose(before['output'],after['output']))

    def test_attention_cell_inspection_matches_outputs(self):
        r=experiment('attention',dict(heads=2,head=1))
        details=r['details']
        np.testing.assert_allclose(np.sum(details['products'],axis=-1),details['dots'])
        np.testing.assert_allclose(np.sum(details['contributions'],axis=1),r['mixed'])
        np.testing.assert_allclose(np.asarray(details['exponentials'])/np.asarray(details['denominators'])[:,None],r['matrix'])


if __name__=='__main__':
    unittest.main(verbosity=2)
