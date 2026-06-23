/**
 * Concurrency limiter to prevent overwhelming Firestore
 * with too many simultaneous order writes.
 */

class ConcurrencyLimiter {
  private running = 0;
  private queue: (() => void)[] = [];

  constructor(private maxConcurrent: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return;
    }
    return new Promise<void>((resolve) =>
      this.queue.push(() => {
        this.running++;
        resolve();
      })
    );
  }

  release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) next();
  }
}

/** Max 50 concurrent order writes to Firestore */
export const orderLimiter = new ConcurrencyLimiter(50);
