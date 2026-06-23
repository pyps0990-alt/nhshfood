/**
 * Circuit breaker for Firestore order writes.
 * Fails fast when Firestore is consistently erroring.
 */

class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private threshold: number = 5,
    private resetTimeout: number = 30000
  ) {}

  canRequest(): boolean {
    if (this.state === "closed") return true;
    if (
      this.state === "open" &&
      Date.now() - this.lastFailure > this.resetTimeout
    ) {
      this.state = "half-open";
      return true;
    }
    return this.state === "half-open";
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) this.state = "open";
  }
}

export const orderCircuitBreaker = new CircuitBreaker();
