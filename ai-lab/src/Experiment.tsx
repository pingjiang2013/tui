import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Check,
  Download,
  Upload,
  Save,
  GitCompareArrows,
  Info,
  LoaderCircle,
  RefreshCw,
  MousePointer2,
} from "lucide-react";
import { engine } from "./engine";
import { defaultSettings, type Settings, type Snapshot } from "./types";
import type { Lesson } from "./curriculum";
import { db, download } from "./storage";
const CodeEditor = lazy(() => import("./CodeEditor"));

export const fmt = (x: unknown): string =>
  typeof x === "number"
    ? Math.abs(x) > 1e6
      ? x.toExponential(2)
      : Number(x.toFixed(4)).toString()
    : Array.isArray(x)
      ? "[" + x.map((v) => fmt(v)).join(", ") + "]"
      : String(x);
export function PredictionChart({
  data,
  selected = 2,
  onSelect,
  compact = false,
}: {
  data: Snapshot;
  selected?: number;
  onSelect?: (i: number) => void;
  compact?: boolean;
}) {
  const pts = data.points || [],
    max = Math.max(11, ...pts.map((p) => Math.max(p.pred, p.target))),
    min = Math.min(0, ...pts.map((p) => p.pred));
  const X = (v: number) => 52 + v * 77,
    Y = (v: number) => 228 - ((v - min) / (max - min)) * 190;
  return (
    <svg
      className={`prediction-chart ${compact ? "compact" : ""}`}
      viewBox="0 0 520 274"
      role="img"
      aria-label="预测直线与真实样本；竖线表示预测误差"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <line
            x1="52"
            x2="490"
            y1={38 + i * 47.5}
            y2={38 + i * 47.5}
            stroke="#e6eae4"
            strokeDasharray="3 5"
          />
          <text
            x="38"
            y={42 + i * 47.5}
            textAnchor="end"
            className="axis-label"
          >
            {((max - min) * (1 - i / 4) + min).toFixed(0)}
          </text>
        </g>
      ))}
      <line x1="52" x2="490" y1="228" y2="228" stroke="#c8d1c5" />
      {[0, 1, 2, 3, 4, 5].map((v) => (
        <text
          className="axis-label"
          key={v}
          x={X(v)}
          y="249"
          textAnchor="middle"
        >
          {v}
        </text>
      ))}
      <text className="axis-label" x="270" y="269" textAnchor="middle">
        练习时长（小时）
      </text>
      <text className="axis-label" x="52" y="18">
        完成题数
      </text>
      {pts.length > 1 && (
        <path
          d={`M ${X(0)} ${Y(pts[0].pred - (pts[1].pred - pts[0].pred))} L ${X(5.6)} ${Y(pts[4].pred + 0.6 * (pts[1].pred - pts[0].pred))}`}
          stroke="#418565"
          strokeWidth="2.5"
          fill="none"
        />
      )}
      {pts.map((p, i) => (
        <g
          key={i}
          className={onSelect ? "point-select" : ""}
          role={onSelect ? "button" : undefined}
          tabIndex={onSelect ? 0 : undefined}
          aria-label={`样本 ${i + 1}，实际 ${p.target}，预测 ${fmt(p.pred)}`}
          onClick={() => onSelect?.(i)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect?.(i);
            }
          }}
        >
          <line
            x1={X(p.x)}
            x2={X(p.x)}
            y1={Y(p.target)}
            y2={Y(p.pred)}
            stroke={i === selected ? "#cb8957" : "#c6cfc4"}
            strokeWidth={i === selected ? 2 : 1.5}
            strokeDasharray="4 4"
          />
          {i === selected && (
            <circle
              cx={X(p.x)}
              cy={Y(p.target)}
              r="14"
              fill="#ecb37a"
              opacity=".17"
            />
          )}
          <circle
            cx={X(p.x)}
            cy={Y(p.pred)}
            r="4"
            fill="#fff"
            stroke="#418565"
            strokeWidth="1.7"
          />
          <circle
            cx={X(p.x)}
            cy={Y(p.target)}
            r={i === selected ? 6 : 5}
            fill="#d99965"
            stroke="#fff"
            strokeWidth="2"
          />
        </g>
      ))}
    </svg>
  );
}
function LossChart({
  data,
  weight,
  history,
}: {
  data: Snapshot;
  weight: number;
  history: number[];
}) {
  const curve = data.curve || [];
  const max = Math.max(1, ...curve.map((p) => p.y)),
    cx = (x: number) => 42 + ((x + 1) / 5) * 435,
    cy = (y: number) => 165 - (y / max) * 140;
  return (
    <div className="loss-chart">
      <p className="mini-heading">
        {history.length ? "真实训练记录" : "损失随 w 的变化"}{" "}
        <span>
          {history.length
            ? "每点是一次实际更新后的损失"
            : "固定 b，只观察一个参数方向"}
        </span>
      </p>
      <svg viewBox="0 0 520 200" role="img" aria-label="真实损失曲线">
        {[0, 1, 2].map((i) => (
          <line
            key={i}
            x1="42"
            x2="477"
            y1={25 + i * 70}
            y2={25 + i * 70}
            stroke="#e7ebe5"
          />
        ))}
        {history.length ? (
          <polyline
            points={history
              .map(
                (v, i) =>
                  `${42 + (i / Math.max(1, history.length - 1)) * 435},${165 - (v / Math.max(...history, 1)) * 140}`,
              )
              .join(" ")}
            fill="none"
            stroke="#b88552"
            strokeWidth="2.5"
          />
        ) : (
          <>
            <polyline
              points={curve.map((p) => `${cx(p.x)},${cy(p.y)}`).join(" ")}
              fill="none"
              stroke="#b88552"
              strokeWidth="2.5"
            />
            {data.loss !== undefined && weight >= -1 && weight <= 4 && (
              <circle cx={cx(weight)} cy={cy(data.loss)} r="5" fill="#3e7c5d" />
            )}
          </>
        )}
        <text x="42" y="190" className="axis-label">
          {history.length ? "第 1 步" : "w = −1"}
        </text>
        <text x="477" y="190" textAnchor="end" className="axis-label">
          {history.length ? `第 ${history.length} 步` : "w = 4"}
        </text>
      </svg>
    </div>
  );
}
function Network({
  data,
  weight,
  onSelect,
}: {
  data: Snapshot;
  weight: number;
  onSelect: (i: number) => void;
}) {
  const nodes = data.nodes || [0, 0, 0, 0],
    coords = [
      [70, 140],
      [250, 70],
      [250, 210],
      [440, 140],
    ];
  return (
    <svg
      className="network-view"
      viewBox="0 0 520 285"
      role="img"
      aria-label="真实神经网络：一个输入、两个隐藏节点、一个输出"
    >
      <defs>
        <marker
          id="arr"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6" fill="#b9c5b5" />
        </marker>
      </defs>
      {[
        [0, 1, String(weight)],
        [0, 2, "−0.8"],
        [1, 3, "1.1"],
        [2, 3, "−0.7"],
      ].map(([a, b, w], i) => {
        const p = coords[Number(a)],
          q = coords[Number(b)];
        return (
          <g key={i}>
            <line
              x1={p[0] + 22}
              y1={p[1]}
              x2={q[0] - 25}
              y2={q[1]}
              stroke={i === 0 ? "#488567" : "#bdc9b8"}
              strokeWidth={i === 0 ? 2.5 : 1.5}
              markerEnd="url(#arr)"
            />
            <text
              x={(p[0] + q[0]) / 2}
              y={(p[1] + q[1]) / 2 - 12}
              className="network-weight"
            >
              {w}
            </text>
          </g>
        );
      })}
      {coords.map(([x, y], i) => (
        <g
          key={i}
          onClick={() => onSelect(i === 0 ? 0 : i === 3 ? 3 : i)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSelect(i === 3 ? 3 : i);
          }}
          aria-label={`查看${["输入", "隐藏节点一", "隐藏节点二", "输出"][i]}的计算`}
          className="point-select"
        >
          <circle
            cx={x}
            cy={y}
            r="32"
            fill={i === 3 ? "#e9e5f5" : i === 0 ? "#f6eadb" : "#e8f0e5"}
            stroke={i === 3 ? "#a295c2" : "#99b591"}
          />
          <text x={x} y={y + 5} textAnchor="middle" className="node-value">
            {fmt(nodes[i])}
          </text>
          <text x={x} y={y + 52} textAnchor="middle" className="axis-label">
            {["输入 x", "隐藏 h₁", "隐藏 h₂", "输出 ŷ"][i]}
          </text>
        </g>
      ))}
    </svg>
  );
}
function Matrix({
  data,
  selected,
  onSelect,
}: {
  data: Snapshot;
  selected: [number, number];
  onSelect: (v: [number, number]) => void;
}) {
  const labels = data.labels || [];
  return (
    <div className="attention-view">
      <div className="mini-heading">
        每个位置从哪里读取信息？ <span>点击一个格子，检查它的混合比例</span>
      </div>
      <div className="matrix-scroll">
        <table className="attention-matrix">
          <caption>行：当前位置 · 列：被读取的位置</caption>
          <thead>
            <tr>
              <th>读取 →</th>
              {labels.map((s, i) => (
                <th key={i}>{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.matrix?.map((row, i) => (
              <tr key={i}>
                <th>{labels[i]}</th>
                {row.map((v, j) => (
                  <td key={j}>
                    <button
                      className={
                        selected[0] === i && selected[1] === j ? "selected" : ""
                      }
                      style={{
                        backgroundColor: `rgba(62,125,91,${0.05 + v * 0.65})`,
                      }}
                      onClick={() => onSelect([i, j])}
                      aria-label={`${labels[i]} 读取 ${labels[j]} 的比例 ${fmt(v)}`}
                    >
                      {v.toFixed(3)}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="matrix-feedback">
        位置「{labels[selected[0]]}」从「{labels[selected[1]]}」读取的比例为{" "}
        <strong>{fmt(data.matrix?.[selected[0]]?.[selected[1]] ?? 0)}</strong>
        。本行总和为{" "}
        {fmt(data.matrix?.[selected[0]]?.reduce((a, b) => a + b, 0) ?? 0)}。
      </p>
      <AttentionInspection data={data} row={selected[0]} column={selected[1]} />
    </div>
  );
}
function Probabilities({ data }: { data: Snapshot }) {
  return (
    <div className="probabilities">
      <div className="mini-heading">
        下一个字符的可能性 <span>分数经过真实 Softmax 计算</span>
      </div>
      {data.probabilities?.map((p) => (
        <div className="probability-row" key={p.label}>
          <span>{p.label}</span>
          <div>
            <i style={{ width: `${p.value * 100}%` }} />
          </div>
          <strong>{(p.value * 100).toFixed(1)}%</strong>
          <small>分数 {fmt(p.logit)}</small>
        </div>
      ))}
    </div>
  );
}
function AttentionInspection({
  data,
  row,
  column,
}: {
  data: Snapshot;
  row: number;
  column: number;
}) {
  const d = data.details;
  if (!d) return null;
  return (
    <details className="attention-inspection">
      <summary>这个格子的数字，从哪里来？</summary>
      <div>
        <h4>1. 对应分量相乘，再相加</h4>
        <p>
          Q：<code>{fmt(data.q?.[row])}</code>　K：
          <code>{fmt(data.k?.[column])}</code>
        </p>
        <p>
          逐项乘积 <code>{fmt(d.products[row][column])}</code>，相加得到{" "}
          <strong>{fmt(d.dots[row][column])}</strong>；再除以 √2 ≈{" "}
          {fmt(d.scale)}。
        </p>
        <h4>2. 把这一行的分数变成比例</h4>
        <p>
          {(data.scores?.[row]?.[column] ?? 0) < -1e8
            ? "这个位置在未来，分数已用 −10⁹ 遮住。"
            : "当前格子的缩放后分数：" + fmt(data.scores?.[row]?.[column])}{" "}
          本行先减最大分数再取指数，得到 <code>{fmt(d.exponentials[row])}</code>
          。
        </p>
        <p>
          当前项的指数 {fmt(d.exponentials[row][column])} ÷ 本行指数总和{" "}
          {fmt(d.denominators[row])} ={" "}
          <strong>{fmt(data.matrix?.[row]?.[column])}</strong>。
        </p>
        <h4>3. 比例真正改变了什么？</h4>
        <p>
          这个格子对应 V：<code>{fmt(data.v?.[column])}</code>，加权后贡献{" "}
          <code>{fmt(d.contributions[row][column])}</code>。
        </p>
        <p>
          本行三个加权贡献：<code>{fmt(d.contributions[row])}</code>
          。按分量相加，得到当前头的输出{" "}
          <strong>{fmt(data.mixed?.[row])}</strong>。
        </p>
      </div>
    </details>
  );
}
function Embedding({ data }: { data: Snapshot }) {
  return (
    <div className="embedding-view">
      <svg
        viewBox="0 0 400 240"
        role="img"
        aria-label="手工设置的二维向量，非训练得到的语义空间"
      >
        <line x1="60" y1="190" x2="360" y2="190" stroke="#c5d0c1" />
        <line x1="60" y1="210" x2="60" y2="30" stroke="#c5d0c1" />
        <text x="350" y="212" className="axis-label">
          分量 1
        </text>
        <text x="15" y="30" className="axis-label">
          分量 2
        </text>
        {data.embeddings?.map(([x, y], i) => (
          <g key={i}>
            <line
              x1="60"
              y1="190"
              x2={60 + x * 120}
              y2={190 - y * 120}
              stroke={["#4e8568", "#b69bcb", "#ca985c"][i]}
              strokeWidth="2"
            />
            <circle
              cx={60 + x * 120}
              cy={190 - y * 120}
              r="6"
              fill={["#4e8568", "#b69bcb", "#ca985c"][i]}
            />
            <text x={70 + x * 120} y={185 - y * 120} className="axis-label">
              {data.labels?.[i]} [{fmt(x)}, {fmt(y)}]
            </text>
          </g>
        ))}
      </svg>
      <p className="caption">
        这是真实二维计算，但向量是手工设置的，不代表已学到的语义关系。
      </p>
    </div>
  );
}
function Slider({
  label,
  value,
  min,
  max,
  step = 0.1,
  onChange,
  description,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className="slider-control">
      <span>
        {label}
        <output>{fmt(value)}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
      />
      {description && <small>{description}</small>}
    </label>
  );
}

function ModelInformation() {
  const [info, setInfo] = useState<{
      training_text: string;
      validation_text: string;
      vocab: string[];
      parameters: number;
    } | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  return (
    <details
      className="model-info"
      onToggle={async (e) => {
        if (!e.currentTarget.open || info || loading) return;
        setLoading(true);
        try {
          setInfo(await engine.call({ op: "model_info" }));
        } catch (e) {
          setError(String(e));
        } finally {
          setLoading(false);
        }
      }}
    >
      <summary>这个模型用什么数据训练？共有多少参数？</summary>
      {loading ? (
        <p>正在读取模型实际配置…</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        info && (
          <div>
            <p>
              <strong>
                {info.parameters.toLocaleString()} 个可训练参数 ·{" "}
                {info.vocab.length} 个词表项
              </strong>
            </p>
            <h4>原创教学训练语料</h4>
            <p>{info.training_text}</p>
            <h4>保留验证语料（不用于参数更新）</h4>
            <p>{info.validation_text}</p>
            <h4>完整词表</h4>
            <p>{info.vocab.join(" ")}</p>
            <p>
              批次训练使用长度 16 的片段、每批 4
              条。固定片段评估与随机小批次损失不是同一指标。1200
              步预训练参数可能记住训练句子；请对照验证结果理解过拟合。
            </p>
          </div>
        )
      )}
    </details>
  );
}

export default function Experiment({
  lesson,
  stage = 6,
  onTask,
  labMode = false,
}: {
  lesson: Lesson;
  stage?: number;
  onTask?: () => void;
  labMode?: boolean;
}) {
  const kind = lesson.kind;
  const [settings, setSettings] = useState<Settings>({
    ...defaultSettings,
    text: kind === "tokens" ? "小猫喜欢晒太阳。" : "小猫",
    causal: lesson.id === "causal",
  });
  const [data, setData] = useState<Snapshot | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [training, setTraining] = useState(false),
    [trace, setTrace] = useState(0),
    [playing, setPlaying] = useState(false),
    [matrix, setMatrix] = useState<[number, number]>([0, 0]),
    [history, setHistory] = useState<number[]>([]),
    [past, setPast] = useState<Settings[]>([]),
    [baseline, setBaseline] = useState<Snapshot | null>(null),
    [notice, setNotice] = useState(""),
    [validation, setValidation] = useState<{
      training: number;
      validation: number;
    } | null>(null),
    [prediction, setPrediction] = useState("");
  const traceData = data
    ? {
        ...data,
        trace:
          lesson.part === 0
            ? data.trace.slice(0, lesson.id === "error" ? 4 : 3)
            : lesson.id === "loss"
              ? data.trace.slice(0, 6)
              : lesson.id === "slope"
                ? data.trace.slice(0, 7)
                : kind === "network" && lesson.id !== "backprop"
                  ? data.trace.slice(0, 5)
                  : lesson.id === "context"
                    ? data.trace.filter((_, i) => [0, 3, 4].includes(i))
                    : data.trace,
      }
    : null;
  const epoch = useRef(0),
    stop = useRef(false),
    inputFile = useRef<HTMLInputElement>(null),
    initialSettings = useRef(settings);
  const update = (key: keyof Settings, value: Settings[keyof Settings]) => {
    setBusy(true);
    setSettings((s) => ({ ...s, [key]: value }));
    if (key !== "sample" && key !== "text") {
      onTask?.();
      setNotice("计算已更新。对照操作前后的数值，再解释变化原因。");
    }
  };
  const compute = async () => {
    const version = ++epoch.current;
    setBusy(true);
    setError("");
    try {
      const snap = await engine.call<Snapshot>(
        kind === "language"
          ? {
              op: "inspect",
              text: settings.text,
              temperature: settings.temperature,
            }
          : { op: "compute", kind, settings },
      );
      if (version === epoch.current) {
        setData(snap);
        setTrace((t) => Math.min(t, snap.trace.length - 1));
      }
    } catch (e) {
      if (version === epoch.current) setError(String(e));
    } finally {
      if (version === epoch.current) setBusy(false);
    }
  };
  useEffect(() => {
    if (training) return;
    const t = setTimeout(compute, 65);
    return () => {
      clearTimeout(t);
      epoch.current++;
    };
  }, [settings]);
  useEffect(
    () => () => {
      stop.current = true;
      epoch.current++;
    },
    [],
  );
  useEffect(() => {
    if (!playing || !traceData) return;
    const t = setInterval(
      () =>
        setTrace((n) => {
          if (n >= traceData.trace.length - 1) {
            setPlaying(false);
            return n;
          }
          return n + 1;
        }),
      1800,
    );
    return () => clearInterval(t);
  }, [playing, traceData]);
  const train = async (count: number) => {
    if (training || busy) return;
    setTraining(true);
    stop.current = false;
    setError("");
    try {
      if (kind === "language") {
        for (let i = 0; i < count && !stop.current; i++) {
          const r = await engine.call<{ loss: number; step: number }>({
            op: "train",
            rate: settings.rate,
          });
          setHistory((h) => [...h, r.loss].slice(-300));
          setNotice(`已真实训练 ${r.step} 步；当前小批次损失 ${fmt(r.loss)}`);
          await new Promise((r) => setTimeout(r, 0));
        }
        const snap = await engine.call<Snapshot>({
          op: "inspect",
          text: settings.text,
          temperature: settings.temperature,
        });
        setData(snap);
        await db("set", "last-model", await engine.call({ op: "checkpoint" }));
      } else {
        let current = settings;
        for (let i = 0; i < count && !stop.current; i++) {
          const before = await engine.call<Snapshot>({
            op: "compute",
            kind,
            settings: current,
          });
          if (!before.next) break;
          setPast((h) => [...h, current].slice(-20));
          current = {
            ...current,
            weight: before.next[0],
            bias: before.next[1],
          };
          const after = await engine.call<Snapshot>({
            op: "compute",
            kind,
            settings: current,
          });
          setHistory((h) => [...h, after.loss ?? 0].slice(-300));
          setData(after);
          setSettings(current);
          await new Promise((r) => setTimeout(r, 60));
        }
        setSettings(current);
      }
      onTask?.();
    } catch (e) {
      setError(String(e));
    } finally {
      setTraining(false);
    }
  };
  const modelAction = async (op: string) => {
    setBusy(true);
    setError("");
    try {
      if (op === "pretrained") {
        const res = await fetch("./models/tiny-pretrained.json");
        if (!res.ok) throw Error("预训练检查点加载失败");
        const checkpoint = await res.json();
        const state = checkpoint.model || checkpoint;
        const snap = await engine.call<Snapshot>({
          op: "restore",
          state,
          text: settings.text,
          temperature: settings.temperature,
        });
        setData(snap);
        setHistory([]);
        setNotice(`已载入预训练参数：${state.step} 步。当前前向计算实时执行。`);
      } else if (op === "saved") {
        const state = await db("get", "last-model");
        if (!state)
          throw Error("尚无自动保存的训练检查点。请先训练或保存一次。");
        setData(
          await engine.call<Snapshot>({
            op: "restore",
            state,
            text: settings.text,
            temperature: settings.temperature,
          }),
        );
        setNotice("已恢复最近保存的参数与随机状态。");
      } else if (op === "save") {
        const state = await engine.call({ op: "checkpoint" });
        await db("set", "last-model", state);
        download("tiny-transformer.json", JSON.stringify(state));
        setNotice("检查点已保存并下载，包含参数与随机状态。");
      } else if (op === "evaluate") {
        setValidation(await engine.call({ op: "evaluate" }));
      } else {
        setData(
          await engine.call<Snapshot>({
            op,
            text: settings.text,
            temperature: settings.temperature,
          }),
        );
        setHistory([]);
        setValidation(null);
        setNotice("已恢复种子 42 的随机参数。");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      const snap = await engine.call<Snapshot>({
        op: "generate",
        text: settings.text,
        temperature: settings.temperature,
      });
      setData(snap);
      setNotice(
        `刚才前缀「${snap.text}」抽到「${snap.output}」。下方概率对应这次抽样；点“接到前缀”后计算下一步。`,
      );
      onTask?.();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  const saveExperiment = async () => {
    try {
      await db("set", "experiment:" + kind, { settings, data });
      setNotice("已保存输入、控制设置与结果。语言模型权重请使用“保存检查点”另存。");
    } catch {
      setError("浏览器存储不可用；请下载记录保留。");
    }
  };
  const restoreExperiment = async () => {
    try {
      const saved = await db("get", "experiment:" + kind);
      if (!saved) throw Error("此实验还没有保存记录");
      setSettings(saved.settings);
      setBaseline(saved.data);
      setNotice("已恢复输入；当前结果重新计算，历史记录用于对照。");
    } catch (e) {
      setError(String(e));
    }
  };
  const isNumeric = ["linear", "gradient", "network"].includes(kind),
    free = stage === 6,
    controls = stage >= 2,
    computingDisabled = training || busy;
  const canTrain =
    [
      "descent",
      "generalization",
      "backprop",
      "train-model",
      "generation",
    ].includes(lesson.id) || labMode;
  const knowsGradient =
    ["slope", "descent", "generalization", "backprop"].includes(lesson.id) ||
    labMode;
  return (
    <div className="experiment-shell">
      <div className="experiment-heading">
        <div>
          <FlaskConical size={16} />
          <strong>
            {kind === "language" ? "真实的小型语言模型" : "交互实验"}
          </strong>
          <span className="live-tag">
            <i />
            {busy ? "正在计算" : "Python 实时计算"}
          </span>
        </div>
        <button
          className="icon-button"
          title="恢复本实验初始输入"
          disabled={training}
          onClick={() => {
            setSettings(initialSettings.current);
            setHistory([]);
            setPast([]);
            setTrace(0);
            setNotice("已恢复初始输入。语言模型参数请使用“随机初始化”重置。");
          }}
        >
          <RotateCcw size={15} />
        </button>
      </div>
      <div className="experiment-context">
        <span>观察重点</span>
        <p>{lesson.observe}</p>
      </div>
      {stage === 2 && (
        <div className="guided-task">
          <span className="task-icon">
            <MousePointer2 size={17} />
          </span>
          <div>
            <strong>先猜一猜，再动手</strong>
            <p>{lesson.task}</p>
            <div className="prediction-input">
              <label>
                我的预测
                <input
                  placeholder="先用自己的话写下预期变化…"
                  value={prediction}
                  onChange={(e) => setPrediction(e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="error-message" role="alert">
          <Info size={17} />
          <div>
            <strong>这次没有得到有效结果</strong>
            <p>{error}</p>
            <button onClick={compute} className="text-button">
              <RefreshCw size={13} />
              重新计算
            </button>
          </div>
        </div>
      )}
      {!data && !error && (
        <div className="loading-panel" role="status">
          <LoaderCircle size={24} className="spin" />
          <strong>正在准备真实计算环境</strong>
          <p>
            首次需要下载 Python 和
            NumPy。讲解可继续阅读，数值会在计算完成后出现。
          </p>
          <small>运行环境来自版本固定的 jsDelivr CDN · 不需要 API 密钥</small>
        </div>
      )}
      {data && (busy || error) && (
        <p className="result-status" role="status">
          {busy
            ? "正在重新计算；下方暂时保留上一次有效结果。"
            : "当前输入未能计算；下方是上一次有效结果，请勿当作当前结果。"}
        </p>
      )}
      {data && (
        <>
          <div
            className={`experiment-canvas ${busy ? "updating" : ""}`}
            aria-busy={busy}
          >
            {(kind === "linear" || kind === "gradient") && (
              <PredictionChart
                data={data}
                selected={settings.sample}
                onSelect={(i) => update("sample", i)}
              />
            )}
            {kind === "gradient" && stage >= 3 && (
              <LossChart
                data={data}
                weight={settings.weight}
                history={history}
              />
            )}
            {kind === "network" && (
              <Network
                data={data}
                weight={settings.weight}
                onSelect={setTrace}
              />
            )}
            {kind === "tokens" && (
              <div className="token-list">
                {data.tokens?.map((t, i) => (
                  <button
                    key={i}
                    className={`token ${t.id === 0 ? "unknown" : ""}`}
                    onClick={() => setTrace(i)}
                  >
                    <strong>{t.label}</strong>
                    <span>#{t.id}</span>
                  </button>
                ))}
              </div>
            )}
            {kind === "embedding" && <Embedding data={data} />}
            {(kind === "attention" || kind === "transformer") && (
              <Matrix data={data} selected={matrix} onSelect={setMatrix} />
            )}
            {kind === "probability" && <Probabilities data={data} />}
            {kind === "language" && (
              <>
                <div className="model-topline">
                  <span className="badge">
                    {data.source === "random"
                      ? "随机参数起步"
                      : data.source === "pretrained"
                        ? "预训练参数起步"
                        : "导入检查点起步"}
                  </span>
                  <span>2 层 · 4 头 · 32 维 · 32 字上下文</span>
                  <strong>已训练 {data.step} 步</strong>
                </div>
                <div className="model-prefix">
                  <small>当前计算使用的前缀</small>
                  <strong>{data.text}</strong>
                  <ArrowRight size={20} />
                  <span>{data.output}</span>
                  <small>{data.trace.at(-1)?.expression}</small>
                </div>
                <Probabilities data={data} />
                <ModelInformation />
                {history.length > 0 && (
                  <LossChart
                    data={{ ...data, curve: [] }}
                    weight={0}
                    history={history}
                  />
                )}
              </>
            )}
          </div>
          {isNumeric && (
            <div className="experiment-metrics">
              <div>
                <span>选中样本的预测</span>
                <strong>{fmt(data.output)}</strong>
              </div>
              <div>
                <span>
                  {lesson.part === 0
                    ? "当前样本的误差"
                    : kind === "network"
                      ? "单样本平方损失"
                      : "5 个样本的平均平方损失"}
                </span>
                <strong>
                  {fmt(
                    lesson.part === 0 && data.points
                      ? data.points[settings.sample].pred -
                          data.points[settings.sample].target
                      : data.loss,
                  )}
                </strong>
              </div>
              {stage >= 3 && knowsGradient && (
                <div>
                  <span>
                    损失对 w 的{lesson.id === "slope" ? "局部斜率" : "梯度"}
                  </span>
                  <strong>{fmt(data.gradient?.[0])}</strong>
                </div>
              )}
              <span className="metric-note">来自当前实际计算</span>
            </div>
          )}
        </>
      )}
      {(kind === "linear" || kind === "gradient") && data && (
        <div className="chart-legend">
          <span>
            <i className="dot orange" />
            实际记录
          </span>
          <span>
            <i className="line" />
            模型预测
          </span>
          <span>
            <i className="dashed" />
            误差
          </span>
          <small>点击样本查看它的计算</small>
        </div>
      )}
      {kind === "linear" && data && (
        <div className="unseen-prediction">
          <span>试一个未见输入</span>
          <p>
            练习 <strong>{fmt(data.query_input)}</strong> 小时{" "}
            <ArrowRight size={14} /> 预测完成{" "}
            <strong>{fmt(data.query_prediction)}</strong> 题
          </p>
          <small>
            这次没有实际答案，所以只给预测，不把它计入已有样本的误差。
          </small>
        </div>
      )}
      <div className="experiment-controls">
        {kind === "linear" && controls && (
          <Slider
            label="新的练习时长（小时）"
            value={settings.query}
            min={0}
            max={8}
            step={0.5}
            onChange={(v) => update("query", v)}
            description="用已有规则预测未见输入；实际答案仍未知"
          />
        )}
        {controls && isNumeric && lesson.id !== "first-prediction" && (
          <>
            <Slider
              label="每单位增加量 w"
              value={settings.weight}
              min={-2}
              max={4}
              step={0.01}
              onChange={(v) => update("weight", v)}
              disabled={training}
              description={
                kind === "network"
                  ? "第一个隐藏神经元的连接权重"
                  : "控制预测直线的倾斜程度"
              }
            />
            <Slider
              label="起点 b"
              value={settings.bias}
              min={-3}
              max={4}
              step={0.01}
              onChange={(v) => update("bias", v)}
              disabled={training}
              description="乘法之后，加上的固定数值"
            />
          </>
        )}
        {kind === "network" && controls && (
          <Slider
            label="输入 x"
            value={settings.input}
            min={-2}
            max={2}
            step={0.05}
            onChange={(v) => update("input", v)}
            disabled={training}
          />
        )}
        {["embedding", "attention", "transformer"].includes(kind) &&
          controls && (
            <Slider
              label="第一个输入向量的分量 1"
              value={settings.weight}
              min={-1}
              max={2}
              step={0.05}
              onChange={(v) => update("weight", v)}
              description="其余输入与投影矩阵保持不变，追踪下游变化"
            />
          )}
        {kind === "probability" && controls && (
          <>
            <Slider
              label="「猫」的分数"
              value={settings.weight}
              min={-4}
              max={5}
              onChange={(v) => update("weight", v)}
            />
            <Slider
              label="「狗」的分数"
              value={settings.bias}
              min={-4}
              max={5}
              onChange={(v) => update("bias", v)}
            />
          </>
        )}
        {kind === "tokens" && (
          <label className="text-control">
            要切分的文字
            <input
              maxLength={32}
              value={settings.text}
              onChange={(e) => {
                update("text", e.target.value);
                onTask?.();
              }}
            />
            <small>最多 32 字；未知字符使用编号 0</small>
          </label>
        )}
        {kind === "language" && (
          <label className="text-control wide">
            输入前缀
            <input
              maxLength={96}
              value={settings.text}
              disabled={training}
              onChange={(e) => update("text", e.target.value)}
            />
            <small>
              可用示例：小猫、太阳出来了、小鸟、天空很蓝。超过 32 字使用末尾 32
              字。
            </small>
          </label>
        )}
        {((kind === "language" && controls) ||
          (kind === "probability" && free)) && (
          <Slider
            label="生成温度 Temperature"
            value={settings.temperature}
            min={kind === "language" ? 0 : 0.1}
            max={2}
            onChange={(v) => update("temperature", v)}
            disabled={training}
            description="改变生成分布；不更新模型参数"
          />
        )}
        {["attention", "transformer"].includes(kind) && controls && (
          <label className="toggle-control">
            <input
              type="checkbox"
              checked={settings.causal}
              onChange={(e) => update("causal", e.target.checked)}
            />
            <span>
              因果遮罩<small>当前位置只能读取自己和前面的内容</small>
            </span>
          </label>
        )}
        {lesson.id === "heads-position" && controls && (
          <>
            <label className="toggle-control">
              <input
                type="checkbox"
                checked={settings.heads === 2}
                onChange={(e) => {
                  update("heads", e.target.checked ? 2 : 1);
                  update("head", 0);
                }}
              />
              <span>
                并行使用两个真实注意力头
                <small>各自投影，拼接后再计算输出</small>
              </span>
            </label>
            <label className="toggle-control">
              <input
                type="checkbox"
                checked={settings.position}
                onChange={(e) => update("position", e.target.checked)}
              />
              <span>
                加入位置信息<small>给不同位置加不同的固定教学向量</small>
              </span>
            </label>
            {settings.heads === 2 && (
              <label className="text-control">
                查看哪个头的混合比例？
                <select
                  value={settings.head}
                  onChange={(e) => update("head", Number(e.target.value))}
                >
                  <option value={0}>第一个头</option>
                  <option value={1}>第二个头</option>
                </select>
              </label>
            )}
          </>
        )}
        {canTrain &&
          (((kind === "gradient" || kind === "network") && stage >= 3) ||
            (kind === "language" && controls)) && (
            <Slider
              label="更新步幅（学习率）"
              value={settings.rate}
              min={0.001}
              max={kind === "network" ? 1 : kind === "language" ? 0.2 : 0.3}
              step={0.001}
              disabled={training}
              onChange={(v) => update("rate", v)}
              description="每一步按梯度方向移动多少"
            />
          )}
      </div>
      {canTrain &&
        (kind === "gradient" || kind === "network") &&
        stage >= 3 && (
          <div className="button-row">
            <button
              className="button primary small"
              disabled={!data || computingDisabled}
              onClick={() => train(1)}
            >
              <ArrowRight size={15} />
              更新一步
            </button>
            <button
              className="button small"
              disabled={!data || computingDisabled}
              onClick={() => train(10)}
            >
              <Play size={14} />
              连续 10 步
            </button>
            {training && (
              <button
                className="button small"
                onClick={() => (stop.current = true)}
              >
                <Pause size={14} />
                暂停
              </button>
            )}
            <button
              className="button small"
              disabled={!past.length || training}
              onClick={() => {
                setSettings(past.at(-1)!);
                setPast((h) => h.slice(0, -1));
                setHistory((h) => h.slice(0, -1));
              }}
            >
              <ArrowLeft size={14} />
              撤销一步
            </button>
            <span className="caption">
              {history.length
                ? `已记录 ${history.length} 次真实更新`
                : "先选择合适的步幅，再试着更新"}
            </span>
          </div>
        )}
      {kind === "language" && controls && (
        <div className="model-actions">
          <div className="button-row">
            <button
              className="button primary small"
              disabled={computingDisabled || !data}
              onClick={() => train(20)}
            >
              <Play size={14} />
              训练 20 步
            </button>
            {training ? (
              <button
                className="button small"
                onClick={() => (stop.current = true)}
              >
                <Pause size={14} />
                本步结束后暂停
              </button>
            ) : (
              <button
                className="button small"
                disabled={busy || !data}
                onClick={generate}
              >
                生成一个字 <ArrowRight size={14} />
              </button>
            )}
            {data?.trace.at(-1)?.expression === "按概率抽样" && (
              <button
                className="button small"
                onClick={() => update("text", settings.text + data.output)}
              >
                接到前缀，再算下一步
              </button>
            )}
            <button
              className="button small"
              disabled={computingDisabled}
              onClick={() => modelAction("evaluate")}
            >
              评估当前模型
            </button>
          </div>
          <div className="button-row secondary-actions">
            <button
              disabled={computingDisabled}
              onClick={() => modelAction("reset_model")}
            >
              <RotateCcw size={13} />
              随机初始化
            </button>
            <button
              disabled={computingDisabled}
              onClick={() => modelAction("pretrained")}
            >
              <Download size={13} />
              载入预训练参数
            </button>
            <button
              disabled={computingDisabled}
              onClick={() => modelAction("save")}
            >
              <Save size={13} />
              保存检查点
            </button>
            <button
              disabled={computingDisabled}
              onClick={() => modelAction("saved")}
            >
              <RefreshCw size={13} />
              恢复最近保存
            </button>
            <button
              disabled={computingDisabled}
              onClick={() => inputFile.current?.click()}
            >
              <Upload size={13} />
              导入
            </button>
            <input
              ref={inputFile}
              hidden
              type="file"
              accept="application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                try {
                  if (file.size > 4e6) throw Error("检查点超过 4 MB");
                  const state = JSON.parse(await file.text());
                  setData(
                    await engine.call<Snapshot>({
                      op: "restore",
                      state,
                      text: settings.text,
                      temperature: settings.temperature,
                    }),
                  );
                  setHistory([]);
                  setNotice("已导入检查点；参数与随机状态已恢复。");
                } catch (e) {
                  setError(String(e));
                } finally {
                  setBusy(false);
                  e.target.value = "";
                }
              }}
            />
          </div>
          {validation && (
            <div className="validation-card">
              <strong>固定训练片段损失 {fmt(validation.training)}</strong>
              <strong>保留验证片段损失 {fmt(validation.validation)}</strong>
              <p>
                这两个值都由当前参数重新计算。语料很小，不能据此推断通用语言能力。
              </p>
            </div>
          )}
        </div>
      )}
      {notice && (
        <p className="experiment-notice" role="status">
          <Info size={14} />
          {notice}
        </p>
      )}
      {stage >= 3 && stage !== 5 && traceData && (
        <section className="trace-section">
          <div className="trace-heading">
            <div>
              <span className="eyebrow">FOLLOW THE NUMBERS</span>
              <h3>拆开这一次计算</h3>
            </div>
            <div className="trace-nav">
              <button
                className="icon-button"
                aria-label="上一个计算步骤"
                disabled={trace <= 0}
                onClick={() => setTrace((n) => n - 1)}
              >
                <ArrowLeft size={16} />
              </button>
              <span>
                {trace + 1} / {traceData.trace.length}
              </span>
              <button
                className="icon-button"
                aria-label="下一个计算步骤"
                disabled={trace >= traceData.trace.length - 1}
                onClick={() => setTrace((n) => n + 1)}
              >
                <ArrowRight size={16} />
              </button>
              <button
                className="icon-button"
                aria-label={playing ? "暂停回放" : "回放实际计算"}
                onClick={() => {
                  if (trace >= traceData.trace.length - 1) setTrace(0);
                  setPlaying(!playing);
                }}
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
            </div>
          </div>
          <div className="trace-content">
            <div className="trace-steps">
              {traceData.trace.map((s, i) => (
                <button
                  key={i}
                  className={trace === i ? "active" : ""}
                  onClick={() => setTrace(i)}
                >
                  <span>{i + 1}</span>
                  {s.label}
                  <ChevronRight size={13} />
                </button>
              ))}
            </div>
            <div className="trace-detail">
              <span className="badge">实际计算记录 · 第 {trace + 1} 步</span>
              <h4>{traceData.trace[trace]?.label}</h4>
              <p>{traceData.trace[trace]?.expression}</p>
              <pre>{fmt(traceData.trace[trace]?.value)}</pre>
              <small>播放仅逐步展示这次真实计算。修改输入会重新计算。</small>
            </div>
          </div>
        </section>
      )}
      {stage === 4 && traceData && (
        <div className="formula-panel">
          <span className="eyebrow">把现象写得更精确</span>
          <h3>{lesson.formula}</h3>
          <p>{lesson.why}</p>
          <div className="formula-links">
            {traceData.trace.map((t, i) => (
              <button
                key={i}
                onClick={() => {
                  setTrace(i);
                  document
                    .querySelector(".trace-section")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                {t.label}
                <span>
                  {typeof t.value === "number" ? fmt(t.value) : "查看数值"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {stage === 5 && (
        <>
          <div className="code-intro">
            <h3>把刚才的机制，写成能运行的代码</h3>
            <p>
              示例使用当前参数。先找到与画面对应的乘法、求和或更新，再修改一处，预测输出，然后运行。深层算法可下载完整源码继续阅读。
            </p>
          </div>
          <Suspense
            fallback={<p className="quiet-note">正在加载代码编辑器…</p>}
          >
            <CodeEditor kind={kind} settings={settings} />
          </Suspense>
        </>
      )}
      {free && data && (
        <div className="comparison-tools">
          <div className="button-row">
            <button
              className="button small"
              onClick={() => {
                setBaseline(data);
                setNotice("已记住当前结果，接下来修改一个条件进行比较。");
              }}
            >
              <GitCompareArrows size={14} />
              记住这次结果
            </button>
            <button className="button small" onClick={saveExperiment}>
              <Save size={14} />
              保存实验
            </button>
            <button className="button small" onClick={restoreExperiment}>
              恢复实验
            </button>
            <button
              className="icon-button"
              title="下载本次输入与结果"
              onClick={() =>
                download(
                  `${kind}-experiment.json`,
                  JSON.stringify({ kind, settings, result: data }, null, 2),
                )
              }
            >
              <Download size={16} />
            </button>
          </div>
          {baseline && (
            <div className="comparison-grid">
              <div>
                <span>之前 · 历史记录</span>
                <strong>{fmt(baseline.output)}</strong>
                {baseline.loss !== undefined && (
                  <small>损失 {fmt(baseline.loss)}</small>
                )}
              </div>
              <ArrowRight size={20} />
              <div>
                <span>现在 · 现场计算</span>
                <strong>{fmt(data.output)}</strong>
                {data.loss !== undefined && (
                  <small>损失 {fmt(data.loss)}</small>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      <p className="experiment-boundary">
        <Info size={13} />
        {kind === "language"
          ? "实时前向、反向和训练；小语料、字符级模型。分量只展示选中切片。"
          : ["attention", "embedding", "transformer"].includes(kind)
            ? "真实小规模计算；三个教学 Token 按词展示，最终模型按字符切分。向量与权重为手工设置，不代表真实词义。"
            : kind === "network"
              ? "单样本、两个隐藏节点；仅更新第一个节点的 w、b，其余连接固定。最终语言模型更新全部参数。"
              : "小规模教学数据；所有数值均由当前 Python 运算返回。显示值经过舍入。"}
      </p>
    </div>
  );
}
