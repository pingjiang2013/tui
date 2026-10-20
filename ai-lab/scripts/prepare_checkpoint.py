"""Build the distributed checkpoint from original, bundled teaching text."""
import sys, json, hashlib, time
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'public'/'python'))
from engine import TinyTransformer,TRAIN_TEXT,VALID_TEXT

m=TinyTransformer()
initial=m.evaluate()
start=time.perf_counter()
losses=[]
for i in range(1200):
    losses.append(m.train_step(.035))
    if (i+1)%200==0:
        print(f'step={i+1} loss={losses[-1]:.4f} val={m.evaluate():.4f}',flush=True)
m.source='pretrained'
state=m.checkpoint()
metadata=dict(description='Original Chinese teaching sentences; locally trained with the bundled engine.',
              training_text=TRAIN_TEXT,validation_text=VALID_TEXT,
              corpus_sha256=hashlib.sha256(TRAIN_TEXT.encode()).hexdigest(),
              steps=m.step,rate=.035,initial_validation=initial,final_validation=m.evaluate(),
              final_training=m.evaluate(TRAIN_TEXT),elapsed_seconds=time.perf_counter()-start,
              engine_sha256=hashlib.sha256((root/'public'/'python'/'engine.py').read_bytes()).hexdigest())
out=root/'public'/'models';out.mkdir(exist_ok=True)
(out/'tiny-pretrained.json').write_text(json.dumps(dict(metadata=metadata,model=state),ensure_ascii=False,separators=(',',':')),encoding='utf8')
print(json.dumps(metadata,ensure_ascii=True),flush=True)
