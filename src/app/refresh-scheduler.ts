import type { AppContext } from './app-context';

interface ScheduledTask {
  name: string;
  fn: () => Promise<void>;
  intervalMs: number;
  timerId?: ReturnType<typeof setTimeout>;
  failures: number;
}

export class RefreshScheduler {
  private tasks: ScheduledTask[] = [];
  private ctx: AppContext;
  private hidden = false;

  constructor(ctx: AppContext) {
    this.ctx = ctx;
    document.addEventListener('visibilitychange', () => {
      this.hidden = document.hidden;
    });
  }

  register(name: string, fn: () => Promise<void>, intervalMs: number): void {
    this.tasks.push({ name, fn, intervalMs, failures: 0 });
  }

  start(): void {
    for (const task of this.tasks) {
      this.scheduleNext(task);
    }
  }

  private scheduleNext(task: ScheduledTask): void {
    if (this.ctx.isDestroyed) return;

    // ±10% jitter
    const jitter = task.intervalMs * 0.1 * (Math.random() * 2 - 1);
    // Hidden tab: 10x slowdown
    const penalty = this.hidden ? 10 : 1;
    // Exponential backoff on failures (max 4x)
    const backoff = Math.min(Math.pow(2, task.failures), 4);
    const delay = (task.intervalMs + jitter) * penalty * backoff;

    task.timerId = setTimeout(async () => {
      try {
        await task.fn();
        task.failures = 0;
      } catch {
        task.failures = Math.min(task.failures + 1, 5);
      }
      this.scheduleNext(task);
    }, delay);
  }

  stop(): void {
    for (const task of this.tasks) {
      if (task.timerId != null) clearTimeout(task.timerId);
    }
    this.tasks = [];
  }
}
