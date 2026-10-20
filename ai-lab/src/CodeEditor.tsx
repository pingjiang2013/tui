import { useEffect, useRef, useState } from "react";
import { Play, Square, RotateCcw, Download, Code2, Check } from "lucide-react";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { python } from "@codemirror/lang-python";
import { runner } from "./engine";
import { download } from "./storage";
import type { Settings } from "./types";
import type { Kind } from "./curriculum";

export function exampleCode(kind: Kind, s: Settings) {
  const setup = `import numpy as np\n\nw, b = ${s.weight}, ${s.bias}\nrate = ${s.rate}\n`;
  if (kind === "linear" || kind === "gradient")
    return (
      setup +
      `\nx = np.array([1., 2., 3., 4., 5.])\ny = np.array([2., 4., 5., 8., 9.])\nprediction = x * w + b\nerror = prediction - y\nloss = np.mean(error ** 2)\ngrad_w = np.mean(2 * error * x)\ngrad_b = np.mean(2 * error)\nprint("预测:", prediction)\nprint("损失:", loss)\nprint("梯度:", grad_w, grad_b)\nprint("下一步:", w-rate*grad_w, b-rate*grad_b)\n`
    );
  if (kind === "network")
    return (
      setup +
      `\nfrom engine import Tensor\nx = ${s.input}\nweight, bias = Tensor(w), Tensor(b)\nh1 = (weight * x + bias).tanh()\nh2 = Tensor(-0.8*x + 0.3).tanh()\noutput = h1*1.1 - h2*0.7 + 0.2\nloss = (output - x*x)**2\nloss.backward()\nprint("隐藏值:", h1.data, h2.data)\nprint("输出与损失:", output.data, loss.data)\nprint("w 的梯度:", weight.grad)\n# Tensor 的完整反向实现可下载 engine.py 查看。\n`
    );
  if (kind === "tokens")
    return `from engine import CHAR_TO_ID\n\ntext = ${JSON.stringify(s.text)}\ntokens = list(text)\nids = [CHAR_TO_ID.get(c, 0) for c in tokens]\nprint(list(zip(tokens, ids)))\n# 0 是未知字符 □；编号不表达语义大小。\n`;
  if (kind === "probability")
    return (
      setup +
      `\nfrom engine import Tensor, softmax, cross_entropy\nlogits = Tensor([w, b, -0.5])\nprobs = softmax(logits / ${Math.max(s.temperature, 0.05)})\nloss = cross_entropy(logits, np.array([0]))\nprint("猫、狗、鸟的抽样概率:", probs.data)\nprint("温度为 1 的训练损失:", loss.data)\n`
    );
  if (kind === "language")
    return `from engine import TinyTransformer, VOCAB, CHAR_TO_ID\n\n# 这是独立练习模型，不会修改课程当前检查点。\nmodel = TinyTransformer(seed=42)\nprint("参数个数:", sum(p.data.size for p in model.params.values()))\nprint("初始化验证损失:", model.evaluate())\nfor step in range(3):\n    loss = model.train_step(lr=0.03)\n    print("训练步骤", step+1, "损失", loss)\nprint(model.inspect("小猫")['probabilities'])\n# forward、train_step、Tensor 的源代码都在 engine.py。\n`;
  return (
    setup +
    `\nfrom engine import Tensor, attention, layer_norm\nE = Tensor([[w, 0.2], [0.3, 1.0], [0.8, 0.6]])\n${s.position ? "E = E + Tensor([[0,0],[0.1,-0.1],[0.2,-0.2]])\n" : ""}Q = E @ Tensor([[0.8, 0.1], [0.2, 0.9]])\nK = E @ Tensor([[0.6, 0.4], [-0.1, 0.8]])\nV = E @ Tensor([[1.0, 0.2], [0.3, 0.7]])\n# attention 内部：scores = Q @ K.T / sqrt(2)\n# weights = softmax(scores)，output = weights @ V\noutput, scores, weights = attention(Q, K, V, causal=${s.causal ? "True" : "False"})\nprint("Q:", Q.data, "\\nK:", K.data, "\\nV:", V.data)\nprint("分数:", scores.data)\nprint("混合比例:", weights.data)\nprint("混合输出:", output.data)\n${s.heads === 2 && kind === "attention" ? `Q2 = E @ Tensor([[0.1,0.8],[0.9,-0.2]])\nK2 = E @ Tensor([[0.3,-0.7],[0.8,0.5]])\nV2 = E @ Tensor([[-0.2,0.9],[0.7,0.1]])\noutput2, scores2, weights2 = attention(Q2,K2,V2,causal=${s.causal ? "True" : "False"})\njoined = Tensor(np.concatenate([output.data,output2.data],axis=-1))\ncombined = joined @ Tensor([[0.6,0.2],[0.1,0.7],[0.3,-0.1],[-0.2,0.4]])\nprint("第二个头的比例:",weights2.data)\nprint("拼接与输出投影:",combined.data)\n` : ""}${kind === "transformer" ? `residual = E + output\nz = layer_norm(residual, Tensor(np.ones(2)), Tensor(np.zeros(2)))\nff = (z @ Tensor([[0.7,-0.4,0.3],[0.2,0.8,-0.1]])).relu() @ Tensor([[0.4,0.2],[-0.3,0.6],[0.5,-0.2]])\nprint("块输出:", (residual+ff).data)\n` : ""}`
  );
}
export default function CodeEditor({
  kind,
  settings,
}: {
  kind: Kind;
  settings: Settings;
}) {
  const initial = exampleCode(kind, settings),
    host = useRef<HTMLDivElement>(null),
    view = useRef<EditorView>(null);
  const [code, setCode] = useState(initial),
    [running, setRunning] = useState(false),
    [output, setOutput] = useState(""),
    [error, setError] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      doc: initial,
      extensions: [
        basicSetup,
        python(),
        EditorView.lineWrapping,
        EditorView.updateListener.of((u) => {
          if (u.docChanged) setCode(u.state.doc.toString());
        }),
        EditorView.theme({
          "&": { fontSize: "13px", backgroundColor: "#fbfcfa" },
          ".cm-content": {
            padding: "18px 0",
            fontFamily: "Consolas, monospace",
          },
          ".cm-gutters": { backgroundColor: "#f3f5f1", border: "none" },
          ".cm-scroller": {
            minHeight: "260px",
            maxHeight: "540px",
            overflow: "auto",
          },
        }),
        EditorView.contentAttributes.of({ "aria-label": "可编辑 Python 代码" }),
      ],
      parent: host.current,
    });
    view.current = editor;
    return () => {
      editor.destroy();
      runner.dispose();
    };
  }, [kind]);
  const reset = () => {
    view.current?.dispatch({
      changes: {
        from: 0,
        to: view.current.state.doc.length,
        insert: exampleCode(kind, settings),
      },
    });
    setOutput("");
  };
  const run = async () => {
    setRunning(true);
    setError(false);
    setOutput("正在准备 Python… 首次加载需要下载运行环境。");
    try {
      await runner.start();
      setOutput("正在执行… 可随时停止。");
      const r = await runner.call<{
        stdout: string;
        stderr: string;
        result: string;
      }>({ op: "code", code }, 15000);
      setOutput(
        r.stdout + r.stderr + r.result || "代码执行完成，没有打印输出。",
      );
    } catch (e) {
      setError(true);
      setOutput(String(e));
    } finally {
      setRunning(false);
    }
  };
  return (
    <section className="code-block">
      <div className="code-toolbar">
        <span>
          <Code2 size={16} /> Python · 与当前参数对照
        </span>
        <div>
          <button className="icon-button" onClick={reset} title="恢复示例">
            <RotateCcw size={15} />
          </button>
          <button
            className="icon-button"
            onClick={() => download("experiment.py", code, "text/x-python")}
            title="下载代码"
          >
            <Download size={15} />
          </button>
          <button
            className="button small primary"
            onClick={running ? () => runner.dispose() : run}
          >
            {running ? <Square size={14} /> : <Play size={14} />}{" "}
            {running ? "停止" : "运行代码"}
          </button>
        </div>
      </div>
      <div ref={host} />
      <div className={`code-output ${error ? "error" : ""}`} aria-live="polite">
        <span>{error ? "执行反馈" : running ? "运行中" : "输出"}</span>
        <pre>{output || "修改一行代码，运行后看看数字如何变化。"}</pre>
      </div>
      <p className="caption">
        <Check size={13} />{" "}
        页面实验与代码练习分开运行；练习不会覆盖你的课程状态。
        <a href="./python/engine.py" download>
          下载完整计算源码
        </a>
      </p>
    </section>
  );
}
