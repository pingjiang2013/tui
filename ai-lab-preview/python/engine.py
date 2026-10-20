"""Small, inspectable numerical models. Used unchanged in the browser and tests."""
import json
import math
import numpy as np


def unbroadcast(g, shape):
    while g.ndim > len(shape):
        g = g.sum(axis=0)
    for i, size in enumerate(shape):
        if size == 1:
            g = g.sum(axis=i, keepdims=True)
    return g.reshape(shape)


class Tensor:
    """Reverse-mode autodiff; each operation records its real local derivative."""
    def __init__(self, data, parents=(), backward=None):
        self.data = np.asarray(data, dtype=np.float64)
        self.grad = np.zeros_like(self.data)
        self.parents = parents
        self._backward = backward or (lambda: None)

    def __add__(self, other):
        other = as_tensor(other)
        out = Tensor(self.data + other.data, (self, other))
        def backward():
            self.grad += unbroadcast(out.grad, self.data.shape)
            other.grad += unbroadcast(out.grad, other.data.shape)
        out._backward = backward
        return out

    __radd__ = __add__

    def __neg__(self):
        return self * -1

    def __sub__(self, other):
        return self + -as_tensor(other)

    def __rsub__(self, other):
        return as_tensor(other) + -self

    def __mul__(self, other):
        other = as_tensor(other)
        out = Tensor(self.data * other.data, (self, other))
        def backward():
            self.grad += unbroadcast(out.grad * other.data, self.data.shape)
            other.grad += unbroadcast(out.grad * self.data, other.data.shape)
        out._backward = backward
        return out

    __rmul__ = __mul__

    def __pow__(self, power):
        out = Tensor(self.data ** power, (self,))
        def backward():
            self.grad += out.grad * power * self.data ** (power - 1)
        out._backward = backward
        return out

    def __truediv__(self, other):
        return self * as_tensor(other) ** -1

    def __matmul__(self, other):
        other = as_tensor(other)
        out = Tensor(self.data @ other.data, (self, other))
        def backward():
            self.grad += unbroadcast(out.grad @ np.swapaxes(other.data, -1, -2), self.data.shape)
            other.grad += unbroadcast(np.swapaxes(self.data, -1, -2) @ out.grad, other.data.shape)
        out._backward = backward
        return out

    def sum(self, axis=None, keepdims=False):
        out = Tensor(self.data.sum(axis=axis, keepdims=keepdims), (self,))
        def backward():
            g = out.grad
            if axis is not None and not keepdims:
                g = np.expand_dims(g, axis=axis)
            self.grad += np.broadcast_to(g, self.data.shape)
        out._backward = backward
        return out

    def mean(self, axis=None, keepdims=False):
        count = self.data.size if axis is None else self.data.shape[axis]
        return self.sum(axis, keepdims) / count

    def exp(self):
        out = Tensor(np.exp(self.data), (self,))
        def backward():
            self.grad += out.grad * out.data
        out._backward = backward
        return out

    def log(self):
        out = Tensor(np.log(self.data), (self,))
        def backward():
            self.grad += out.grad / self.data
        out._backward = backward
        return out

    def relu(self):
        out = Tensor(np.maximum(self.data, 0), (self,))
        def backward():
            self.grad += out.grad * (self.data > 0)
        out._backward = backward
        return out

    def tanh(self):
        out = Tensor(np.tanh(self.data), (self,))
        def backward():
            self.grad += out.grad * (1 - out.data ** 2)
        out._backward = backward
        return out

    def reshape(self, *shape):
        out = Tensor(self.data.reshape(*shape), (self,))
        def backward():
            self.grad += out.grad.reshape(self.data.shape)
        out._backward = backward
        return out

    def transpose(self, *axes):
        out = Tensor(self.data.transpose(*axes), (self,))
        def backward():
            self.grad += out.grad.transpose(*np.argsort(axes))
        out._backward = backward
        return out

    def __getitem__(self, index):
        out = Tensor(self.data[index], (self,))
        def backward():
            np.add.at(self.grad, index, out.grad)
        out._backward = backward
        return out

    def backward(self):
        order, seen = [], set()
        def visit(node):
            if id(node) not in seen:
                seen.add(id(node))
                for parent in node.parents:
                    visit(parent)
                order.append(node)
        visit(self)
        for node in order:
            node.grad = np.zeros_like(node.data)
        self.grad = np.ones_like(self.data)
        for node in reversed(order):
            node._backward()


def as_tensor(x):
    return x if isinstance(x, Tensor) else Tensor(x)


def softmax(x):
    x = as_tensor(x)
    ex = (x - x.data.max(axis=-1, keepdims=True)).exp()
    return ex / ex.sum(axis=-1, keepdims=True)


def cross_entropy(logits, targets):
    shifted = logits - logits.data.max(axis=-1, keepdims=True)
    log_probs = shifted - shifted.exp().sum(axis=-1, keepdims=True).log()
    flat = log_probs.reshape(-1, logits.data.shape[-1])
    return -flat[np.arange(np.asarray(targets).size), np.asarray(targets).reshape(-1)].mean()


def layer_norm(x, gain, bias):
    centered = x - x.mean(axis=-1, keepdims=True)
    variance = (centered ** 2).mean(axis=-1, keepdims=True)
    return centered / (variance + 1e-5) ** 0.5 * gain + bias


def attention(q, k, v, causal=False):
    scores = (q @ k.transpose(*range(k.data.ndim - 2), k.data.ndim - 1, k.data.ndim - 2)) / math.sqrt(q.data.shape[-1])
    if causal:
        t = scores.data.shape[-1]
        scores = scores + np.where(np.triu(np.ones((t, t)), 1), -1e9, 0)
    weights = softmax(scores)
    return weights @ v, scores, weights


TRAIN_TEXT = ('小猫喜欢晒太阳。小狗喜欢在草地上跑。小鸟喜欢在树上唱歌。'
              '太阳出来了，小猫坐在窗边。月亮出来了，小狗睡着了。'
              '风吹过草地，小鸟飞向天空。雨落在树上，小猫回到家。'
              '小猫和小狗一起看星星。天空很蓝，草地很绿。')
VALID_TEXT = '小狗坐在窗边。小猫看着天空。小鸟在唱歌。月亮出来了。'
VOCAB = ['□'] + sorted(set(TRAIN_TEXT + VALID_TEXT))
CHAR_TO_ID = {c: i for i, c in enumerate(VOCAB)}


class TinyTransformer:
    def __init__(self, seed=42, dim=32, heads=4, layers=2, context=32):
        self.config = dict(dim=dim, heads=heads, layers=layers, context=context, seed=seed)
        self.rng = np.random.default_rng(seed)
        self.params = {}
        self.step = 0
        self.source = 'random'
        def add(name, shape, scale=None, ones=False):
            data = np.ones(shape) if ones else np.zeros(shape) if scale == 0 else self.rng.normal(0, scale or 1 / math.sqrt(dim), shape)
            self.params[name] = Tensor(data)
        add('embedding', (len(VOCAB), dim), 0.1)
        add('position', (context, dim), 0.05)
        for i in range(layers):
            for n in ('ln1', 'ln2'):
                add(f'{i}.{n}.g', (dim,), ones=True)
                add(f'{i}.{n}.b', (dim,), 0)
            for n, shape in [('qkv', (dim, dim * 3)), ('out', (dim, dim)), ('ff1', (dim, dim * 2)), ('ff2', (dim * 2, dim))]:
                add(f'{i}.{n}', shape)
        add('final.g', (dim,), ones=True)
        add('final.b', (dim,), 0)
        add('head', (dim, len(VOCAB)))

    def forward(self, ids, trace=False):
        ids = np.asarray(ids, dtype=int)
        if ids.ndim == 1:
            ids = ids[None, :]
        batch, t = ids.shape
        d, h = self.config['dim'], self.config['heads']
        if t > self.config['context']:
            raise ValueError('输入超过当前模型的上下文长度')
        p = self.params
        x = p['embedding'][ids] + p['position'][np.arange(t)]
        records = [('词向量 + 位置向量', x.data.copy())]
        attn_map = None
        for i in range(self.config['layers']):
            z = layer_norm(x, p[f'{i}.ln1.g'], p[f'{i}.ln1.b'])
            qkv = (z @ p[f'{i}.qkv']).reshape(batch, t, 3, h, d // h)
            q = qkv[:, :, 0].transpose(0, 2, 1, 3)
            k = qkv[:, :, 1].transpose(0, 2, 1, 3)
            v = qkv[:, :, 2].transpose(0, 2, 1, 3)
            mixed, _, weights = attention(q, k, v, True)
            mixed = mixed.transpose(0, 2, 1, 3).reshape(batch, t, d)
            x = x + mixed @ p[f'{i}.out']
            records.append((f'第 {i+1} 层 Attention 与残差', x.data.copy()))
            z = layer_norm(x, p[f'{i}.ln2.g'], p[f'{i}.ln2.b'])
            x = x + (z @ p[f'{i}.ff1']).relu() @ p[f'{i}.ff2']
            records.append((f'第 {i+1} 层前馈与残差', x.data.copy()))
            attn_map = weights.data[0, 0].copy()
        logits = layer_norm(x, p['final.g'], p['final.b']) @ p['head']
        return logits, records, attn_map

    def train_step(self, lr=0.03):
        if not 0 < lr <= 2:
            raise ValueError('训练步幅须在 0 与 2 之间')
        text = np.array([CHAR_TO_ID[c] for c in TRAIN_TEXT * 4])
        t = min(16, self.config['context'])
        starts = self.rng.integers(0, len(text)-t-1, 4)
        x = np.stack([text[s:s+t] for s in starts])
        y = np.stack([text[s+1:s+t+1] for s in starts])
        logits, _, _ = self.forward(x)
        loss = cross_entropy(logits, y)
        loss.backward()
        if not np.isfinite(loss.data) or any(not np.isfinite(p.grad).all() for p in self.params.values()):
            raise ValueError('数值发散：这次更新没有应用。请恢复检查点并减小步幅。')
        for p in self.params.values():
            p.data -= lr * p.grad
        self.step += 1
        return float(loss.data)

    def evaluate(self, text=VALID_TEXT):
        ids = [CHAR_TO_ID.get(c, 0) for c in text]
        t = min(len(ids)-1, self.config['context'])
        logits, _, _ = self.forward(ids[:t])
        return float(cross_entropy(logits, np.array(ids[1:t+1])).data)

    def checkpoint(self):
        return dict(version=1, config=self.config, vocab=VOCAB, step=self.step, source=self.source,
                    rng=self.rng.bit_generator.state,
                    params={k: v.data.tolist() for k, v in self.params.items()})

    def restore(self, state):
        if state.get('version') != 1 or state.get('vocab') != VOCAB or state.get('config') != self.config:
            raise ValueError('检查点的版本、结构或词表与当前模型不匹配')
        arrays = {k: np.asarray(state['params'][k], dtype=float) for k in self.params}
        if any(v.shape != self.params[k].data.shape or not np.isfinite(v).all() for k, v in arrays.items()):
            raise ValueError('检查点参数的形状或数值无效')
        step=state.get('step')
        if type(step) is not int or step < 0:
            raise ValueError('检查点训练步数无效')
        restored_rng=np.random.default_rng()
        try:
            restored_rng.bit_generator.state=state['rng']
        except Exception as exc:
            raise ValueError('检查点随机状态无效；当前模型没有改变') from exc
        for k, v in arrays.items():
            self.params[k].data = v
        self.step = step
        self.rng = restored_rng
        self.source = state.get('source', 'imported')

    def inspect(self, text='小猫', temperature=1, sample=False):
        if not text:
            raise ValueError('请先输入至少一个字符')
        unknown = sorted(set(text) - set(CHAR_TO_ID))
        if unknown:
            raise ValueError('词表中没有：' + '、'.join(unknown) + '。请使用教学语料中的字符。')
        text = text[-self.config['context']:]
        ids = [CHAR_TO_ID[c] for c in text]
        logits, records, weights = self.forward(ids, True)
        raw = logits.data[0, -1]
        if temperature <= 0:
            probs = np.eye(len(VOCAB))[np.argmax(raw)]
        else:
            probs = softmax(Tensor(raw / temperature)).data
        order = np.argsort(-probs)[:8]
        chosen = int(self.rng.choice(len(VOCAB), p=probs)) if sample else int(order[0])
        return dict(kind='language', text=text, output=VOCAB[chosen], step=self.step, source=self.source,
                    probabilities=[dict(label=VOCAB[i], value=float(probs[i]), logit=float(raw[i])) for i in order],
                    matrix=weights.tolist(), labels=list(text),
                    trace=[dict(label=name, expression='最后一个位置的前 4 个分量', value=arr[0,-1,:4].tolist()) for name, arr in records]
                         + [dict(label='输出分数', expression='最后表示 × 输出权重', value=raw[order[:4]].tolist()),
                            dict(label='下一个字符', expression='按概率抽样' if sample else '当前概率最高的字符（尚未抽样）', value=VOCAB[chosen])])


def scalar(v):
    return float(np.asarray(v))


def experiment(kind, settings=None):
    s = settings or {}
    w, b = float(s.get('weight', 1.2)), float(s.get('bias', 0.5))
    lr = float(s.get('rate', 0.03))
    xs = np.array([1., 2., 3., 4., 5.])
    ys = np.array([2., 4., 5., 8., 9.])
    if kind in ('linear', 'gradient'):
        pred = xs*w+b
        errors = pred-ys
        loss = float(np.mean(errors**2))
        gw, gb = float(np.mean(2*errors*xs)), float(np.mean(2*errors))
        selected = min(4, max(0, int(s.get('sample', 2))))
        x, y, p, e = map(float, [xs[selected], ys[selected], pred[selected], errors[selected]])
        query=float(s.get('query',6))
        return dict(kind=kind, output=p, loss=loss, gradient=[gw,gb], next=[w-lr*gw,b-lr*gb],
                    query_input=query,query_prediction=query*w+b,
                    points=[dict(x=float(a),target=float(c),pred=float(d)) for a,c,d in zip(xs,ys,pred)],
                    curve=[dict(x=float(v),y=float(np.mean((xs*v+b-ys)**2))) for v in np.linspace(-1,4,80)],
                    trace=[dict(label='读取一个样本',expression='输入 x；实际值 y',value=[x,y]),
                           dict(label='乘以参数',expression=f'{x:g} × {w:g}',value=x*w),
                           dict(label='加上起点',expression=f'{x*w:g} + {b:g}',value=p),
                           dict(label='比较预测与实际',expression=f'{p:g} − {y:g}',value=e),
                           dict(label='平方误差',expression=f'({e:g})²',value=e*e),
                           dict(label='汇总 5 个样本',expression='所有平方误差相加，再除以 5',value=loss),
                           dict(label='损失对 w 的斜率',expression='平均 2 × 误差 × 输入',value=gw),
                           dict(label='更新参数 w',expression=f'{w:g} − {lr:g} × ({gw:.4f})',value=w-lr*gw)])
    if kind == 'network':
        x = float(s.get('input', 0.8))
        weight = Tensor(w)
        bias = Tensor(b)
        h1 = (weight*x+bias).tanh()
        h2 = Tensor(-0.8*x+0.3).tanh()
        out = h1*1.1+h2*(-0.7)+0.2
        target = x*x
        loss = (out-target)**2
        loss.backward()
        return dict(kind=kind, output=scalar(out.data),loss=scalar(loss.data),gradient=[scalar(weight.grad),scalar(bias.grad)],
                    next=[w-lr*scalar(weight.grad),b-lr*scalar(bias.grad)],
                    nodes=[x,scalar(h1.data),scalar(h2.data),scalar(out.data)],
                    trace=[dict(label='第一个神经元：乘加',expression=f'{x:g} × {w:g} + {b:g}',value=x*w+b),
                           dict(label='激活函数',expression='tanh 把数值平滑压到 −1 与 1 之间',value=scalar(h1.data)),
                           dict(label='第二个神经元',expression=f'tanh({x:g} × −0.8 + 0.3)',value=scalar(h2.data)),
                           dict(label='输出层',expression='h₁ × 1.1 + h₂ × (−0.7) + 0.2',value=scalar(out.data)),
                           dict(label='目标与损失',expression=f'(输出 − x²)²；目标 = {target:.4f}',value=scalar(loss.data)),
                           dict(label='误差回到 w',expression='2(输出−目标) × 1.1 × (1−h₁²) × x',value=scalar(weight.grad)),
                           dict(label='更新 w',expression='w − 步幅 × 梯度',value=w-lr*scalar(weight.grad))])
    if kind == 'tokens':
        text = str(s.get('text', '小猫喜欢晒太阳。'))[:32]
        ids = [CHAR_TO_ID.get(c, 0) for c in text]
        return dict(kind=kind, output=len(ids),tokens=[dict(label=c,id=i) for c,i in zip(text,ids)],
                    trace=[dict(label=c,expression='字符 → 词表编号；未知字符映射到 □' if i==0 else '字符 → 词表编号（编号本身不表示含义）',value=i) for c,i in zip(text,ids)])
    if kind in ('embedding', 'attention', 'transformer'):
        tokens = ['小猫','喜欢','太阳']
        embeddings = Tensor([[1,0.2],[0.3,1],[0.8,0.6]])
        embeddings.data[0,0] = w
        if s.get('position', False):
            embeddings = embeddings + Tensor([[0,0],[0.1,-0.1],[0.2,-0.2]])
        wq = Tensor([[0.8,0.1],[0.2,0.9]])
        wk = Tensor([[0.6,0.4],[-0.1,0.8]])
        wv = Tensor([[1,0.2],[0.3,0.7]])
        q,k,v = embeddings@wq,embeddings@wk,embeddings@wv
        mixed,scores,weights=attention(q,k,v,bool(s.get('causal',False)))
        result=mixed
        trace=[dict(label='查出表示',expression='按 Token 编号读取可学习向量；本例为手工设置的 2 维数值',value=embeddings.data.tolist()),
               dict(label='得到 Q、K、V',expression='输入分别乘以三个不同权重矩阵',value=q.data.tolist()),
               dict(label='计算相关分数',expression='Q × Kᵀ / √2；因果遮罩时不看未来位置',value=scores.data.tolist()),
               dict(label='变成混合比例',expression='每行减最大值、取指数，再除以本行指数之和',value=weights.data.tolist()),
               dict(label='混合信息',expression='每行的比例 × V，再相加',value=mixed.data.tolist())]
        if int(s.get('heads', 1)) == 2 and kind == 'attention':
            q2=embeddings@Tensor([[0.1,0.8],[0.9,-0.2]])
            k2=embeddings@Tensor([[0.3,-0.7],[0.8,0.5]])
            v2=embeddings@Tensor([[-0.2,0.9],[0.7,0.1]])
            mixed2,scores2,weights2=attention(q2,k2,v2,bool(s.get('causal',False)))
            joined=np.concatenate([mixed.data,mixed2.data],axis=-1)
            result=Tensor(joined)@Tensor([[0.6,0.2],[0.1,0.7],[0.3,-0.1],[-0.2,0.4]])
            for record in trace[1:]:
                record['label']='第一个头 · '+record['label']
            trace += [dict(label='第二个头 · Q',expression='输入乘第二组查询投影；K、V 使用各自第二组投影',value=q2.data.tolist()),
                      dict(label='第二个头 · 分数',expression='Q₂ × K₂ᵀ / √2，再应用所选遮罩',value=scores2.data.tolist()),
                      dict(label='第二个头 · 比例',expression='对这个头的每一行独立做 Softmax',value=weights2.data.tolist()),
                      dict(label='第二个头 · 混合信息',expression='第二个头的比例 × V₂',value=mixed2.data.tolist()),
                      dict(label='拼接并输出投影',expression='两个头的输出拼接成 4 维，再乘 4×2 权重',value=result.data.tolist())]
            if int(s.get('head',0)) == 1:
                q,k,v,scores,weights,mixed=q2,k2,v2,scores2,weights2,mixed2
        if kind=='transformer':
            residual=embeddings+mixed
            normalized=layer_norm(residual,Tensor(np.ones(2)),Tensor(np.zeros(2)))
            ff=(normalized@Tensor([[0.7,-0.4,0.3],[0.2,0.8,-0.1]])).relu()@Tensor([[0.4,0.2],[-0.3,0.6],[0.5,-0.2]])
            result=residual+ff
            trace += [dict(label='残差相加',expression='保留输入，并加上新提取的信息',value=residual.data.tolist()),
                      dict(label='归一化',expression='减去均值，再除以标准差（含稳定项）',value=normalized.data.tolist()),
                      dict(label='前馈与第二条残差',expression='残差 + ReLU(归一化结果 × W₁) × W₂',value=result.data.tolist())]
        exponentials=np.exp(scores.data-scores.data.max(axis=-1,keepdims=True))
        details=dict(products=(q.data[:,None,:]*k.data[None,:,:]).tolist(),
                     dots=(q.data@k.data.T).tolist(),scale=math.sqrt(q.data.shape[-1]),
                     exponentials=exponentials.tolist(),denominators=exponentials.sum(axis=-1).tolist(),
                     contributions=(weights.data[:,:,None]*v.data[None,:,:]).tolist())
        return dict(kind=kind,output=result.data[0].tolist(),matrix=weights.data.tolist(),labels=tokens,details=details,
                    embeddings=embeddings.data.tolist(),q=q.data.tolist(),k=k.data.tolist(),v=v.data.tolist(),
                    scores=scores.data.tolist(),mixed=mixed.data.tolist(),trace=trace)
    if kind=='probability':
        logits=Tensor([w,b,-0.5])
        temperature=max(float(s.get('temperature',1)),0.05)
        probs=softmax(logits/temperature)
        loss=cross_entropy(logits,np.array([0]))
        return dict(kind=kind,output=scalar(probs.data[0]),loss=scalar(loss.data),
                    probabilities=[dict(label=c,value=float(p),logit=float(z)) for c,p,z in zip(['猫','狗','鸟'],probs.data,logits.data)],
                    trace=[dict(label='模型输出分数',expression='三个候选字符的原始分数',value=logits.data.tolist()),
                           dict(label='温度影响分布',expression='分数除以 Temperature，再做 Softmax',value=probs.data.tolist()),
                           dict(label='训练时的错误计分',expression='训练使用温度 1：−log P(正确字符「猫」)',value=scalar(loss.data))])
    raise ValueError('未知实验：'+kind)


MODEL = None


def dispatch(payload):
    global MODEL
    request=json.loads(payload)
    op=request.get('op','compute')
    if op=='compute':
        return json.dumps(experiment(request['kind'], request.get('settings')),ensure_ascii=False,allow_nan=False)
    if MODEL is None:
        MODEL=TinyTransformer()
    if op=='model_info':
        return json.dumps(dict(training_text=TRAIN_TEXT,validation_text=VALID_TEXT,vocab=VOCAB,
                               parameters=sum(p.data.size for p in MODEL.params.values()),config=MODEL.config),ensure_ascii=False)
    if op=='reset_model':
        MODEL=TinyTransformer(seed=int(request.get('seed',42)))
    elif op=='train':
        loss=MODEL.train_step(float(request.get('rate',0.03)))
        return json.dumps(dict(loss=loss,step=MODEL.step),allow_nan=False)
    elif op=='checkpoint':
        return json.dumps(MODEL.checkpoint(),ensure_ascii=False,allow_nan=False)
    elif op=='restore':
        MODEL.restore(request['state'])
    elif op=='evaluate':
        return json.dumps(dict(validation=MODEL.evaluate(),training=MODEL.evaluate(TRAIN_TEXT)))
    return json.dumps(MODEL.inspect(request.get('text','小猫'),float(request.get('temperature',1)),op=='generate'),ensure_ascii=False,allow_nan=False)
