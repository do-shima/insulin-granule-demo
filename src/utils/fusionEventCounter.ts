export interface FusionEventCounts {
  readonly total: number;
  readonly recent: number;
}

const RECENT_WINDOW_SECONDS = 10;

export class FusionEventCounter {
  private readonly eventTimes: number[] = [];
  private total = 0;
  private elapsed = 0;

  public recordEvent(): void {
    this.total += 1;
    this.eventTimes.push(this.elapsed);
    this.pruneRecentEvents();
  }

  public update(deltaTime: number): void {
    this.elapsed += deltaTime;
    this.pruneRecentEvents();
  }

  public reset(): void {
    this.total = 0;
    this.elapsed = 0;
    this.eventTimes.length = 0;
  }

  public getCounts(): FusionEventCounts {
    this.pruneRecentEvents();

    return {
      total: this.total,
      recent: this.eventTimes.length
    };
  }

  private pruneRecentEvents(): void {
    const cutoff = this.elapsed - RECENT_WINDOW_SECONDS;

    while (this.eventTimes.length > 0 && this.eventTimes[0] < cutoff) {
      this.eventTimes.shift();
    }
  }
}
