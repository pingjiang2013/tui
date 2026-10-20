type Listener = (message: string) => void;
class PythonEngine {
  private worker?: Worker;
  private pending = new Map<
    number,
    {
      resolve: (v: any) => void;
      reject: (e: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private serial = 0;
  private ready?: Promise<void>;
  status = "idle";
  onStatus?: Listener;
  start() {
    if (this.ready) return this.ready;
    this.status = "loading";
    this.onStatus?.("loading");
    this.ready = new Promise<void>((resolve, reject) => {
      const worker = new Worker(
        new URL("./python.worker.ts", import.meta.url),
        { type: "module" },
      );
      this.worker = worker;
      const timer = setTimeout(() => {
        reject(new Error("Python 加载超时，请检查网络后重试。"));
        this.dispose();
      }, 90000);
      worker.onmessage = ({ data }) => {
        if (data.type === "ready") {
          clearTimeout(timer);
          this.status = "ready";
          this.onStatus?.("ready");
          resolve();
          return;
        }
        if (data.type === "init-error") {
          clearTimeout(timer);
          reject(new Error(data.error));
          this.dispose();
          return;
        }
        const job = this.pending.get(data.id);
        if (!job) return;
        clearTimeout(job.timer);
        this.pending.delete(data.id);
        data.error
          ? job.reject(new Error(data.error))
          : job.resolve(data.result);
      };
      worker.onerror = (e) => {
        clearTimeout(timer);
        reject(new Error(e.message || "Python 后台线程启动失败"));
        this.dispose();
      };
    });
    return this.ready;
  }
  async call<T = any>(
    payload: Record<string, unknown>,
    timeout = 30000,
  ): Promise<T> {
    await this.start();
    const id = ++this.serial;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("计算超过时间限制，已停止。请恢复最近的检查点。"));
        this.dispose();
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.worker!.postMessage({ id, payload });
    });
  }
  dispose() {
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = undefined;
    this.status = "idle";
    this.onStatus?.("idle");
    for (const j of this.pending.values()) {
      clearTimeout(j.timer);
      j.reject(new Error("执行已停止；可以重新运行。"));
    }
    this.pending.clear();
  }
}
export const engine = new PythonEngine();
export const runner = new PythonEngine();
