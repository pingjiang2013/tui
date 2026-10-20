import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Check,
  Search,
  FlaskConical,
  ChartNoAxesCombined,
  Route,
  Network,
  TextCursorInput,
  Focus,
  Layers,
  Sparkles,
  PanelLeftClose,
  Menu,
  X,
  Compass,
  GraduationCap,
  Clock,
  Play,
  Code2,
  MousePointer2,
  GitBranch,
  Info,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  Waypoints,
  Lightbulb,
  ExternalLink,
} from "lucide-react";
import { lessons, parts, stages, labs, type Lesson } from "./curriculum";
import type { Progress } from "./types";
import { readProgress, saveProgress, validProgress, download } from "./storage";
import Experiment from "./Experiment";

const icons = [
  ChartNoAxesCombined,
  Route,
  Network,
  TextCursorInput,
  Focus,
  Layers,
  Sparkles,
];
const navigate = (path: string) => {
  location.hash = "/" + path;
};
function useRoute() {
  const [route, setRoute] = useState(location.hash.slice(2));
  useEffect(() => {
    const update = () => setRoute(location.hash.slice(2));
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}
function Icon({ part, size = 20 }: { part: number; size?: number }) {
  const I = icons[part] || BookOpen;
  return <I size={size} strokeWidth={1.65} />;
}
function HeroVisual() {
  return (
    <div
      className="hero-visual"
      aria-label="课程结构示意：从数据，经过模型与训练，走向文字生成"
    >
      <div className="visual-top">
        <span>
          <i /> 一个小模型的诞生
        </span>
        <span>LEARNING BY BUILDING</span>
      </div>
      <div className="visual-workspace">
        <div className="visual-dots" />
        <div className="visual-data">
          <small>01 / 从几个例子开始</small>
          <svg viewBox="0 0 150 100" role="img" aria-label="数据样本示意">
            <path d="M15 10 V85 H140" fill="none" stroke="#ced4c6" />
            <path
              d="M25 76 Q70 62 130 20"
              fill="none"
              stroke="#719e77"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            {[
              [32, 72],
              [52, 55],
              [77, 60],
              [99, 31],
              [125, 27],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="4" fill="#cf9a67" />
            ))}
          </svg>
          <span>发现输入与输出的关系</span>
        </div>
        <svg className="connector c-one" viewBox="0 0 90 70">
          <path
            d="M0 10 C40 10 40 60 85 60"
            fill="none"
            stroke="#a8bba0"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        </svg>
        <div className="visual-model">
          <span className="model-icon">
            <Network size={24} strokeWidth={1.3} />
          </span>
          <small>02 / 搭起一个模型</small>
          <div className="mini-network">
            <svg viewBox="0 0 140 72">
              {[18, 54].flatMap((y) =>
                [10, 36, 62].map((z) => (
                  <line
                    key={y + ":" + z}
                    x1="20"
                    y1={y}
                    x2="70"
                    y2={z}
                    stroke="#a9bda0"
                  />
                )),
              )}
              {[10, 36, 62].map((y) => (
                <line
                  key={y}
                  x1="70"
                  y1={y}
                  x2="120"
                  y2="36"
                  stroke="#a9bda0"
                />
              ))}
              {[
                [20, 18],
                [20, 54],
                [70, 10],
                [70, 36],
                [70, 62],
                [120, 36],
              ].map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="6"
                  fill={i === 5 ? "#d5a070" : "#f5f8ef"}
                  stroke="#91ab85"
                />
              ))}
            </svg>
          </div>
        </div>
        <div className="visual-learning">
          <span>
            <Route size={14} /> 训练，让预测一点点改善
          </span>
          <svg viewBox="0 0 110 30">
            <path
              d="M2 3 C10 4 10 20 23 18 S37 28 50 25 S75 28 107 27"
              fill="none"
              stroke="#bb8b55"
              strokeWidth="1.8"
            />
          </svg>
        </div>
        <svg className="connector c-two" viewBox="0 0 90 70">
          <path
            d="M0 10 C40 10 40 60 85 60"
            fill="none"
            stroke="#a8bba0"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        </svg>
        <div className="visual-output">
          <span className="output-star">
            <Sparkles size={16} />
          </span>
          <small>03 / 写出下一个字</small>
          <div>
            <span>小</span>
            <span>猫</span>
            <span className="next-token">？</span>
          </div>
          <p>从概率，到新的文字</p>
        </div>
      </div>
      <div className="visual-bottom">
        <span>
          <MousePointer2 size={12} /> 每一步，都可以亲手探索
        </span>
        <span>课程结构示意</span>
      </div>
    </div>
  );
}
function Sidebar({
  progress,
  active,
  open,
  onClose,
}: {
  progress: Progress;
  active?: Lesson;
  open: boolean;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState<number[]>(
    active ? [active.part] : [0],
  );
  const completed = lessons.filter((l) => progress.passed[l.id]).length;
  const sideRef = useRef<HTMLElement>(null),
    [smallScreen, setSmallScreen] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 680px)");
    setSmallScreen(media.matches);
    const change = () => setSmallScreen(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!open || !smallScreen || !sideRef.current) return;
    const before = document.activeElement as HTMLElement;
    const root = sideRef.current;
    root.querySelector<HTMLElement>("a")?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const controls = Array.from(
        root.querySelectorAll<HTMLElement>("a,button:not(:disabled)"),
      );
      const first = controls[0],
        last = controls.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      before?.focus();
    };
  }, [open, smallScreen]);
  useEffect(() => {
    if (active)
      setExpanded((p) => (p.includes(active.part) ? p : [...p, active.part]));
  }, [active?.part]);
  return (
    <>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="关闭导航"
          onClick={onClose}
        />
      )}
      <aside
        ref={sideRef}
        inert={smallScreen && !open}
        className={`sidebar ${open ? "is-open" : ""}`}
      >
        <a className="brand" href="#/">
          <span>
            <Waypoints size={24} />
          </span>
          <strong>
            知微<span>INSIDE AI</span>
          </strong>
        </a>
        <div className="sidebar-tagline">把 AI 的每一步，看清楚。</div>
        <nav aria-label="主要导航" className="main-nav">
          <a
            className={
              !location.hash.includes("lab") &&
              !location.hash.includes("progress")
                ? "active"
                : ""
            }
            href="#/"
            onClick={onClose}
          >
            <Compass size={17} />
            学习路径 <span>01</span>
          </a>
          <a
            className={location.hash.includes("lab") ? "active" : ""}
            href="#/labs"
            onClick={onClose}
          >
            <FlaskConical size={17} />
            交互实验室 <span>06</span>
          </a>
          <a
            className={location.hash.includes("progress") ? "active" : ""}
            href="#/progress"
            onClick={onClose}
          >
            <ChartNoAxesCombined size={17} />
            我的学习
          </a>
        </nav>
        <div className="catalog-heading">
          <span>从零构建语言模型</span>
          <span>课程主线</span>
        </div>
        <nav className="catalog" aria-label="课程章节">
          {parts.map((p, i) => (
            <div className="catalog-part" key={p.title}>
              <button
                onClick={() =>
                  setExpanded((s) =>
                    s.includes(i) ? s.filter((n) => n !== i) : [...s, i],
                  )
                }
                aria-expanded={expanded.includes(i)}
                className={active?.part === i ? "current" : ""}
              >
                <span className={`part-number ${p.color}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{p.title}</span>
                <ChevronDown
                  size={13}
                  className={expanded.includes(i) ? "rotated" : ""}
                />
              </button>
              {expanded.includes(i) && (
                <div className="catalog-lessons">
                  {lessons
                    .filter((l) => l.part === i)
                    .map((l) => (
                      <a
                        key={l.id}
                        className={active?.id === l.id ? "active" : ""}
                        href={`#/learn/${l.id}`}
                        onClick={onClose}
                      >
                        {progress.passed[l.id] ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <i
                            className={progress.visited[l.id] ? "visited" : ""}
                          />
                        )}
                        <span>{l.title}</span>
                      </a>
                    ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="learning-progress">
            <div>
              <span>你的学习足迹</span>
              <strong>
                {completed} <small>/ 24</small>
              </strong>
            </div>
            <div className="progress-track">
              <i style={{ width: `${(completed / 24) * 100}%` }} />
            </div>
            <p>
              {completed
                ? "每一次理解，都离目标更近。"
                : "不用赶进度，理解比速度重要。"}
            </p>
          </div>
          <div className="sidebar-foot">
            <span className="user-avatar">学</span>
            <div>
              <strong>好奇心是最好的起点</strong>
              <span>进度仅保存在此浏览器</span>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
    </>
  );
}
function Home({ progress }: { progress: Progress }) {
  const current = lessons.find((l) => l.id === progress.current) || lessons[0];
  return (
    <>
      <div className="page-top">
        <span>
          学习路径 <ChevronRight size={12} /> 从零构建语言模型
        </span>
        <span className="top-note">
          <span className="online-dot" /> 免费探索 · 无需机器学习基础
        </span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">
            <i /> 从好奇出发，用理解抵达
          </span>
          <h1>
            从一个预测，
            <br />
            到一整个 <em>AI。</em>
          </h1>
          <p>
            不止认识术语，更要看清它如何工作。
            <br />
            用交互实验和真实计算，一步步构建你的第一个语言模型。
          </p>
          <div className="hero-buttons">
            <a className="button primary" href={`#/learn/${current.id}`}>
              {progress.current ? "继续我的学习" : "开始第一课"}
              <ArrowRight size={17} />
            </a>
            <button
              className="button plain"
              onClick={() =>
                document
                  .getElementById("learning-path")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              探索课程路线
              <ChevronDown size={15} />
            </button>
          </div>
          <div className="hero-reassurance">
            <span>
              <Check size={13} /> 从直觉到实现
            </span>
            <span>
              <Check size={13} /> 浏览器里真实运行
            </span>
            <span>
              <Check size={13} /> 按你的节奏
            </span>
          </div>
        </div>
        <HeroVisual />
      </section>
      <div className="course-stats">
        {[
          [BookOpen, "7", "个学习阶段"],
          [MousePointer2, "24", "节引导课程"],
          [FlaskConical, "6", "个交互实验室"],
          [Network, "1", "个真实语言模型"],
        ].map(([I, n, t], i) => {
          const C = I as typeof BookOpen;
          return (
            <div key={i}>
              <C size={20} strokeWidth={1.5} />
              <strong>{n as string}</strong>
              <span>{t as string}</span>
            </div>
          );
        })}
      </div>
      <section className="path-section" id="learning-path">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR LEARNING JOURNEY</span>
            <h2>一条连贯的路，把知识串起来</h2>
            <p>每一站，解决一个新问题；每一步，为你的 AI 增加一种能力。</p>
          </div>
          <span className="section-aside">
            <GitBranch size={14} />
            循序渐进 · 随时回看
          </span>
        </div>
        <div className="course-grid">
          {parts.map((p, i) => {
            const sectionLessons = lessons.filter((l) => l.part === i),
              done = sectionLessons.filter((l) => progress.passed[l.id]).length;
            return (
              <a
                href={`#/learn/${sectionLessons[0].id}`}
                className={`course-card ${i === 0 ? "first" : ""}`}
                key={p.title}
              >
                <div className="course-card-top">
                  <span className={`course-icon ${p.color}`}>
                    <Icon part={i} size={23} />
                  </span>
                  <span className="chapter-label">
                    CHAPTER {String(i + 1).padStart(2, "0")}
                  </span>
                  {i === 0 && <span className="start-badge">从这里开始</span>}
                  <ArrowUpRight className="card-arrow" size={18} />
                </div>
                <h3>{p.title}</h3>
                <p>{p.subtitle}</p>
                <div className="course-topics">
                  {sectionLessons.slice(0, 3).map((l) => (
                    <span key={l.id}>
                      {l.title.replace(/[？。，]/g, "").slice(0, 9)}
                    </span>
                  ))}
                </div>
                <div className="course-card-bottom">
                  <span>
                    <BookOpen size={13} />
                    {p.count} 节课
                  </span>
                  <span>
                    {done ? `${done} 节通过理解检查` : "观察 · 探索 · 实现"}
                    <ChevronRight size={13} />
                  </span>
                </div>
              </a>
            );
          })}
          <div className="course-destination">
            <div>
              <Sparkles size={23} />
              <span>终点，也是新的起点</span>
            </div>
            <h3>
              这一次，
              <br />
              让理解真的发生。
            </h3>
            <p>最终你将运行一个能生成文字的小模型，并能解释每一步计算。</p>
            <a href="#/labs/language">
              先看看最终模型
              <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </section>
      <section className="approach">
        <div className="section-heading">
          <div>
            <span className="eyebrow">HOW YOU WILL LEARN</span>
            <h2>看见，不止于看过</h2>
          </div>
        </div>
        <div className="approach-grid">
          {[
            [
              Lightbulb,
              "01",
              "先建立直觉",
              "先知道要解决什么，再理解为什么需要这个机制。",
            ],
            [
              MousePointer2,
              "02",
              "亲手追踪计算",
              "改变一个输入，观察每个中间值与结果怎样变化。",
            ],
            [
              Code2,
              "03",
              "把理解变成实现",
              "让公式、图形和代码中的数字，一一对应起来。",
            ],
          ].map(([I, n, t, d]) => {
            const C = I as typeof Lightbulb;
            return (
              <div key={n as string}>
                <span>
                  <C size={18} />
                </span>
                <small>{n as string}</small>
                <h3>{t as string}</h3>
                <p>{d as string}</p>
              </div>
            );
          })}
        </div>
      </section>
      <Footer />
    </>
  );
}
function Footer() {
  return (
    <footer>
      <span>
        <Waypoints size={15} />
        知微 · INSIDE AI
      </span>
      <p>让复杂的原理，有迹可循。</p>
      <a href="./python/engine.py" download>
        计算源码 <ArrowUpRight size={12} />
      </a>
    </footer>
  );
}
function Knowledge({ lesson }: { lesson: Lesson }) {
  const index = lessons.indexOf(lesson);
  return (
    <aside className="knowledge-card">
      <span className="eyebrow">把这一课放回整条路</span>
      <h3>
        <GitBranch size={16} />
        知识怎样连接？
      </h3>
      {index > 0 && (
        <div>
          <small>上一步的基础</small>
          <a href={`#/learn/${lessons[index - 1].id}`}>
            {lessons[index - 1].title}
            <ArrowUpRight size={12} />
          </a>
        </div>
      )}
      <div className="current">
        <small>现在正在解决</small>
        <strong>{lesson.question}</strong>
      </div>
      <div>
        <small>最终目标</small>
        <span>从输入文字，解释到下一字的概率</span>
      </div>
      {index < lessons.length - 1 && (
        <div>
          <small>接下来</small>
          <a href={`#/learn/${lessons[index + 1].id}`}>
            {lessons[index + 1].title}
            <ArrowRight size={12} />
          </a>
        </div>
      )}
    </aside>
  );
}
function LessonPage({
  lesson,
  step,
  progress,
  onProgress,
}: {
  lesson: Lesson;
  step?: string;
  progress: Progress;
  onProgress: (p: Progress) => void;
}) {
  const initial =
    step !== undefined
      ? Math.max(0, Math.min(6, Number(step) || 0))
      : progress.stages[lesson.id] || 0;
  const [stage, setStage] = useState(initial),
    [answer, setAnswer] = useState<number | null>(null),
    [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    setStage(initial);
    setAnswer(null);
    setSubmitted(false);
    onProgress({
      ...progress,
      current: lesson.id,
      visited: { ...progress.visited, [lesson.id]: true },
    });
  }, [lesson.id]);
  useEffect(() => {
    if (step !== undefined)
      setStage(Math.max(0, Math.min(6, Number(step) || 0)));
  }, [step]);
  const go = (n: number) => {
    setStage(n);
    onProgress({
      ...progress,
      current: lesson.id,
      stages: { ...progress.stages, [lesson.id]: n },
    });
    history.replaceState(null, "", `#/learn/${lesson.id}/${n}`);
    document
      .querySelector(".lesson-content")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const pass = () => {
    setSubmitted(true);
    if (answer === lesson.correct)
      onProgress({
        ...progress,
        passed: { ...progress.passed, [lesson.id]: true },
      });
  };
  const next = lessons[lessons.indexOf(lesson) + 1];
  return (
    <>
      <div className="page-top">
        <span>
          <a href="#/">学习路径</a>
          <ChevronRight size={12} />
          {parts[lesson.part].title}
        </span>
        <span className="top-note">
          第 {lessons.indexOf(lesson) + 1} / 24 课
        </span>
      </div>
      <header className="lesson-header">
        <div className="lesson-overline">
          <span className={`course-icon ${parts[lesson.part].color}`}>
            <Icon part={lesson.part} />
          </span>
          <span>
            CHAPTER {String(lesson.part + 1).padStart(2, "0")}
            <i />
            从零构建语言模型
          </span>
          {progress.passed[lesson.id] && (
            <span className="passed-badge">
              <CheckCircle2 size={14} />
              理解检查已通过
            </span>
          )}
        </div>
        <h1>{lesson.title}</h1>
        <p>{lesson.question}</p>
      </header>
      <nav className="stage-nav" aria-label="本课学习步骤">
        {stages.map((s, i) => (
          <button
            key={s}
            className={`${stage === i ? "active" : ""} ${i < stage ? "previous" : ""}`}
            onClick={() => go(i)}
            aria-current={stage === i ? "step" : undefined}
          >
            <span>{i < stage ? <Check size={12} /> : i + 1}</span>
            {s}
          </button>
        ))}
      </nav>
      <div className="lesson-layout">
        <div className="lesson-content">
          <section className="lesson-explanation">
            <span className="eyebrow">
              {String(stage + 1).padStart(2, "0")} / {stages[stage]}
            </span>
            <h2>
              {
                [
                  lesson.question,
                  "先观察，输入怎样影响结果",
                  "带着一个问题，动手试一试",
                  "每个数字，都有它的来处",
                  "给刚才的观察，一个精确表达",
                  "你也可以实现同样的计算",
                  "换一种情况，还能解释吗？",
                ][stage]
              }
            </h2>
            <p>
              {stage === 0
                ? lesson.intro
                : stage === 1
                  ? lesson.observe
                  : stage === 2
                    ? lesson.task
                    : stage === 3
                      ? lesson.mechanism
                      : stage === 4
                        ? lesson.why
                        : stage === 5
                          ? "代码是刚才机制的另一种表达。先读懂它和图形的对应关系，再尝试修改；不写代码也可以继续学习。"
                          : "自由调整输入、比较结果，再回答下面的问题，检查自己能否把理解用到新的情况。"}
            </p>
          </section>
          {stage === 0 ? (
            <>
              <div className="lesson-goal">
                <span className="goal-icon">
                  <Focus size={21} />
                </span>
                <div>
                  <h3>这节课，要获得什么能力？</h3>
                  <p>{lesson.mechanism}</p>
                </div>
              </div>
              <div className="before-you-start">
                <span className="eyebrow">学习不是记住一个名字</span>
                <h3>带着问题进入实验</h3>
                <div>
                  <span>01</span>
                  <p>先想一想：{lesson.question}</p>
                </div>
                <div>
                  <span>02</span>
                  <p>接下来你将观察：{lesson.observe}</p>
                </div>
                <div>
                  <span>03</span>
                  <p>学完后，用自己的话解释每个数字从哪里来。</p>
                </div>
              </div>
              <p className="quiet-note">
                <Info size={15} />
                只需要四则运算和一点好奇心。新的数学工具会在用到时解释。
              </p>
            </>
          ) : (
            <Experiment
              key={lesson.id}
              lesson={lesson}
              stage={stage}
              onTask={() => {
                if (!progress.tasks[lesson.id])
                  onProgress({
                    ...progress,
                    tasks: { ...progress.tasks, [lesson.id]: true },
                  });
              }}
            />
          )}
          {stage === 6 && (
            <section className="quiz-card">
              <span className="eyebrow">CHECK YOUR UNDERSTANDING</span>
              <h3>把刚才的理解，用到一个新问题</h3>
              <p>{lesson.quiz}</p>
              <div className="quiz-answers">
                {lesson.answers.map((a, i) => (
                  <button
                    key={a}
                    className={`${answer === i ? "selected" : ""} ${submitted && answer === i ? (i === lesson.correct ? "correct" : "incorrect") : ""}`}
                    onClick={() => {
                      setAnswer(i);
                      setSubmitted(false);
                    }}
                  >
                    <span>{String.fromCharCode(65 + i)}</span>
                    {a}
                    {submitted && answer === i && i === lesson.correct && (
                      <CheckCircle2 size={17} />
                    )}
                  </button>
                ))}
              </div>
              <button
                className="button primary small"
                disabled={answer === null}
                onClick={pass}
              >
                检查我的理解
                <ArrowRight size={14} />
              </button>
              {submitted && (
                <div
                  className={`quiz-feedback ${answer === lesson.correct ? "correct" : ""}`}
                  role="status"
                >
                  <strong>
                    {answer === lesson.correct
                      ? "这一步，你理解了。"
                      : "再沿着计算想一想。"}
                  </strong>
                  <p>{lesson.explanation}</p>
                </div>
              )}
              <div className="lesson-summary">
                <strong>这一课，带走什么？</strong>
                <p>{lesson.mechanism}</p>
                {next && (
                  <p>
                    下一步，我们会继续解决：
                    <a href={`#/learn/${next.id}`}>{next.question}</a>
                  </p>
                )}
              </div>
            </section>
          )}
          <div className="lesson-navigation">
            <button
              className="button"
              disabled={stage === 0}
              onClick={() => go(stage - 1)}
            >
              <ArrowLeft size={15} />
              上一步
            </button>
            <span>{stage + 1} / 7 · 可以随时回看</span>
            {stage < 6 ? (
              <button className="button primary" onClick={() => go(stage + 1)}>
                {
                  [
                    "开始观察",
                    "动手试试",
                    "拆开计算",
                    "理解公式",
                    "看看代码",
                    "进入自由探索",
                  ][stage]
                }
                <ArrowRight size={15} />
              </button>
            ) : next ? (
              <a className="button primary" href={`#/learn/${next.id}`}>
                进入下一课
                <ArrowRight size={15} />
              </a>
            ) : (
              <a className="button primary" href="#/progress">
                回看我的学习
                <ArrowRight size={15} />
              </a>
            )}
          </div>
        </div>
        <Knowledge lesson={lesson} />
      </div>
      <Footer />
    </>
  );
}
function Labs({
  selected,
  progress,
}: {
  selected?: string;
  progress: Progress;
}) {
  const lab = labs.find((l) => l.kind === selected);
  const lesson = lab && lessons.find((l) => l.id === lab.lesson);
  return (
    <>
      <div className="page-top">
        <span>
          <a href="#/labs">交互实验室</a>
          {lab && (
            <>
              <ChevronRight size={12} />
              {lab.title}
            </>
          )}
        </span>
        <span className="top-note">真实计算 · 自由探索</span>
      </div>
      <header className="labs-header">
        <span className="hero-eyebrow">
          <FlaskConical size={15} /> 让理解，经得起你的实验
        </span>
        <h1>{lab ? lab.title : "把“如果”变成一次实验。"}</h1>
        <p>
          {lab
            ? lab.description
            : "改变一个条件，追踪每一步变化。这里与你的课程，共用同一套真实计算。"}
        </p>
      </header>
      {lab && lesson ? (
        <>
          <div className="lab-tabs">
            {labs.map((l) => (
              <a
                className={l.kind === selected ? "active" : ""}
                key={l.kind}
                href={`#/labs/${l.kind}`}
              >
                {l.title.replace("实验室", "")}
              </a>
            ))}
          </div>
          {!progress.passed[lesson.id] && (
            <div className="prerequisite">
              <Info size={17} />
              <span>建议先学「{lesson.title}」，理解控制项再自由实验。</span>
              <a href={`#/learn/${lesson.id}`}>
                回到课程
                <ArrowRight size={14} />
              </a>
            </div>
          )}
          <Experiment key={selected} lesson={lesson} labMode />
        </>
      ) : (
        <div className="lab-grid">
          {labs.map((l, i) => (
            <a className="lab-card" key={l.kind} href={`#/labs/${l.kind}`}>
              <span className={`course-icon ${parts[i === 5 ? 6 : i].color}`}>
                <Icon part={i === 5 ? 6 : i} />
              </span>
              <span className="lab-label">
                LAB / {String(i + 1).padStart(2, "0")}
              </span>
              <h2>{l.title}</h2>
              <p>{l.description}</p>
              <div>
                <span>
                  {progress.passed[l.lesson]
                    ? "已具备推荐基础"
                    : "附带前置课程入口"}
                </span>
                <ArrowRight size={17} />
              </div>
            </a>
          ))}
        </div>
      )}
      <Footer />
    </>
  );
}
function ProgressPage({
  progress,
  onProgress,
}: {
  progress: Progress;
  onProgress: (p: Progress) => void;
}) {
  const file = useRef<HTMLInputElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    [notice, setNotice] = useState("");
  return (
    <>
      <div className="page-top">
        <span>我的学习</span>
        <span className="top-note">记录理解，不催促进度</span>
      </div>
      <header className="labs-header">
        <span className="hero-eyebrow">
          <GraduationCap size={16} /> 每一步理解，都值得留下
        </span>
        <h1>你走过的路，看得见。</h1>
        <p>
          访问课程、完成操作和通过理解检查分别记录。它们是学习足迹，不是能力认证。
        </p>
      </header>
      <div className="progress-summary">
        {[
          [
            "访问过的课程",
            Object.values(progress.visited).filter(Boolean).length,
          ],
          [
            "尝试过的实验",
            Object.values(progress.tasks).filter(Boolean).length,
          ],
          [
            "通过的理解检查",
            Object.values(progress.passed).filter(Boolean).length,
          ],
        ].map(([s, n]) => (
          <div key={s}>
            <span>{s}</span>
            <strong>
              {n}
              <small>/24</small>
            </strong>
          </div>
        ))}
      </div>
      <div className="progress-list">
        {parts.map((p, i) => (
          <section key={p.title}>
            <h2>
              <span className={`course-icon ${p.color}`}>
                <Icon part={i} />
              </span>
              {p.title}
            </h2>
            {lessons
              .filter((l) => l.part === i)
              .map((l) => (
                <a key={l.id} href={`#/learn/${l.id}`}>
                  <span>{l.title}</span>
                  <div>
                    {progress.visited[l.id] && <small>已访问</small>}
                    {progress.tasks[l.id] && <small>已操作</small>}
                    {progress.passed[l.id] ? (
                      <strong>
                        <CheckCircle2 size={14} />
                        理解检查通过
                      </strong>
                    ) : (
                      <small>理解检查待完成</small>
                    )}
                    <ChevronRight size={15} />
                  </div>
                </a>
              ))}
          </section>
        ))}
      </div>
      <div className="button-row progress-tools">
        <button
          className="button small"
          onClick={() =>
            download(
              "inside-ai-progress.json",
              JSON.stringify(progress, null, 2),
            )
          }
        >
          <Download size={15} />
          导出学习记录
        </button>
        <button className="button small" onClick={() => file.current?.click()}>
          <Upload size={15} />
          导入学习记录
        </button>
        <button
          className="button small danger"
          onClick={() => dialog.current?.showModal()}
        >
          <RotateCcw size={15} />
          重置学习进度
        </button>
        <input
          type="file"
          hidden
          ref={file}
          accept="application/json"
          onChange={async (e) => {
            try {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 1e6) throw Error("文件过大");
              const p = JSON.parse(await f.text());
              if (!validProgress(p)) throw Error("不是有效的学习记录");
              onProgress(p);
              setNotice("学习记录已导入。");
            } catch (e) {
              setNotice(String(e));
            } finally {
              e.target.value = "";
            }
          }}
        />
      </div>
      {notice && (
        <p role="status" className="quiet-note">
          {notice}
        </p>
      )}
      <dialog ref={dialog} className="confirm-dialog">
        <h2>重置课程进度？</h2>
        <p>
          这会清除本浏览器中的课程访问、操作和理解检查记录。你可以先导出记录。保存的模型和实验保留。
        </p>
        <div className="button-row">
          <button className="button" onClick={() => dialog.current?.close()}>
            保留记录
          </button>
          <button
            className="button primary"
            onClick={() => {
              onProgress({
                version: 1,
                stages: {},
                tasks: {},
                passed: {},
                visited: {},
              });
              dialog.current?.close();
              setNotice("课程进度已重置。");
            }}
          >
            确认重置
          </button>
        </div>
      </dialog>
      <Footer />
    </>
  );
}
function SearchDialog({
  dialog,
}: {
  dialog: React.RefObject<HTMLDialogElement | null>;
}) {
  const [term, setTerm] = useState("");
  const matches = lessons.filter((l) =>
    (l.title + l.question + l.intro + l.kind)
      .toLowerCase()
      .includes(term.toLowerCase()),
  );
  return (
    <dialog ref={dialog} className="search-dialog">
      <div className="search-input">
        <Search size={19} />
        <input
          autoFocus
          placeholder="寻找问题、机制或课程…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <button
          className="icon-button"
          aria-label="关闭搜索"
          onClick={() => dialog.current?.close()}
        >
          <X size={18} />
        </button>
      </div>
      <div className="search-results">
        {matches.map((l) => (
          <a
            key={l.id}
            href={`#/learn/${l.id}`}
            onClick={() => dialog.current?.close()}
          >
            <span className={`course-icon ${parts[l.part].color}`}>
              <Icon part={l.part} size={17} />
            </span>
            <div>
              <strong>{l.title}</strong>
              <small>{l.question}</small>
            </div>
            <ArrowRight size={15} />
          </a>
        ))}
        {!matches.length && (
          <p>没有找到匹配课程。试试“预测”“误差”“注意力”或“生成”。</p>
        )}
      </div>
      <div className="search-footer">
        搜索全部 24 节课程 <span>ESC 关闭</span>
      </div>
    </dialog>
  );
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="fatal">
        <h1>页面遇到了一次意外。</h1>
        <p>学习记录仍保存在本浏览器。请刷新页面后重试。</p>
        <button className="button primary" onClick={() => location.reload()}>
          刷新页面
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const route = useRoute(),
    segments = route.split("/"),
    [progress, setProgress] = useState(readProgress),
    [mobile, setMobile] = useState(false),
    [storageWarning, setStorageWarning] = useState(false);
  const search = useRef<HTMLDialogElement>(null);
  const active =
    segments[0] === "learn"
      ? lessons.find((l) => l.id === segments[1])
      : undefined;
  const update = (p: Progress) => {
    setProgress(p);
    setStorageWarning(!saveProgress(p));
  };
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        search.current?.showModal();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    setMobile(false);
    document.title = active
      ? `${active.title} · 知微`
      : "知微 · 看见 AI 的每一步";
  }, [route.split("/").slice(0, 2).join("/")]);
  return (
    <Boundary>
      <Sidebar
        progress={progress}
        active={active}
        open={mobile}
        onClose={() => setMobile(false)}
      />
      <div className="app-main">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="打开课程导航"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <span className="topbar-label">AI 原理 · 交互式学习</span>
            <span className="beta-badge">从零开始</span>
          </div>
          <div>
            <button
              className="search-trigger"
              onClick={() => search.current?.showModal()}
            >
              <Search size={15} />
              <span>搜索课程</span>
              <kbd>Ctrl K</kbd>
            </button>
            <a className="topbar-lab" href="#/labs">
              <FlaskConical size={15} />
              <span>打开实验室</span>
              <ArrowUpRight size={13} />
            </a>
          </div>
        </header>
        {storageWarning && (
          <div className="storage-warning" role="status">
            浏览器暂时无法保存进度，请在“我的学习”导出记录。
          </div>
        )}
        <main className={`page ${active ? "lesson-page" : ""}`}>
          {active ? (
            <LessonPage
              key={active.id}
              lesson={active}
              step={segments[2]}
              progress={progress}
              onProgress={update}
            />
          ) : segments[0] === "labs" ? (
            <Labs selected={segments[1]} progress={progress} />
          ) : segments[0] === "progress" ? (
            <ProgressPage progress={progress} onProgress={update} />
          ) : (
            <Home progress={progress} />
          )}
        </main>
      </div>
      <SearchDialog dialog={search} />
    </Boundary>
  );
}
