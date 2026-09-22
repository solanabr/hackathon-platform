export class SemaphoreTimeout extends Error {
  constructor() { super("semaphore timeout"); this.name = "SemaphoreTimeout"; }
}

type Waiter = { resolve: (release: () => void) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

// Best effort per serverless instance: the upstream allows 2 requests in
// flight per token and Vercel may run several instances at once, so this
// smooths bursts inside one instance while the cache and Retry-After
// handling are what actually keep us under the limit.
export class Semaphore {
  private active = 0;
  private queue: Waiter[] = [];
  constructor(private readonly slots: number) {}

  get inFlight(): number { return this.active; }

  acquire(timeoutMs: number): Promise<() => void> {
    if (this.active < this.slots) { this.active += 1; return Promise.resolve(this.releaser()); }
    return new Promise((resolve, reject) => {
      const waiter: Waiter = {
        resolve, reject,
        timer: setTimeout(() => {
          this.queue = this.queue.filter((w) => w !== waiter);
          reject(new SemaphoreTimeout());
        }, timeoutMs),
      };
      this.queue.push(waiter);
    });
  }

  private releaser(): () => void {
    let done = false;
    return () => {
      if (done) return;
      done = true;
      const next = this.queue.shift();
      if (next) { clearTimeout(next.timer); next.resolve(this.releaser()); return; }
      this.active -= 1;
    };
  }
}
