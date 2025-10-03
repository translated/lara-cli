import Ora, { Ora as OraType } from 'ora';

class ProgressWithOra {
  public spinner!: OraType;
  private done = 0;
  private total = 0;
  private totalKeys = 0;
  private processedKeys = 0;
  private readonly width = 40;
  private readonly batchTimes: number[] = [];
  private readonly MAX_SAMPLES = 10;
  private readonly MIN_SAMPLES_FOR_ETA = 5;

  public init({ message, spinner }: { message?: string; spinner?: OraType }): void {
    if (spinner) {
      this.spinner = spinner;
      return;
    }

    this.spinner = Ora({ text: message ?? 'Processing...', color: 'yellow' }).start();
  }

  public start({ message, total, totalKeys }: { message: string; total: number; totalKeys?: number }): void {
    if (!this.spinner) {
      this.init({ message });
    }

    if (total <= 0) {
      throw new Error('Progress total must be greater than 0');
    }

    this.total = total;
    this.done = 0;
    this.totalKeys = totalKeys ?? total;
    this.processedKeys = 0;
    this.batchTimes.length = 0;

    this.setText(message);
    process.stdout.write('\n');
    this.renderProgress();
  }

  public tick(count: number = 1, keysProcessed?: number, batchTime?: number): void {
    this.done = Math.min(this.done + count, this.total);
    
    if (keysProcessed && keysProcessed > 0) {
      this.processedKeys += keysProcessed;
      
      if (batchTime && batchTime > 0) {
        const timePerKey = batchTime / keysProcessed;
        this.batchTimes.push(timePerKey);
        
        if (this.batchTimes.length > this.MAX_SAMPLES) {
          this.batchTimes.shift();
        }
      }
    }
    
    this.renderProgress();
  }

  public setText(text: string): void {
    this.spinner.text = text;
  }

  public reset({ total, done, totalKeys }: { total: number; done?: number; totalKeys?: number }): void {
    if (total <= 0) {
      throw new Error('Progress total must be greater than 0');
    }

    this.total = total;
    this.done = done ?? 0;
    this.totalKeys = totalKeys ?? total;
    this.processedKeys = 0;
    this.batchTimes.length = 0;
    this.renderProgress();
  }

  private renderProgress(): void {
    const ratio = this.done / this.total;
    const filled = Math.round(ratio * this.width);
    const empty = this.width - filled;
    const percent = (ratio * 100).toFixed(1);
    const progress = `${this.done}/${this.total}`;
    const eta = this.calculateETA();
    const bar = `|${'█'.repeat(filled)}${'-'.repeat(empty)}| ${percent}% (${progress}) ${eta}`;

    process.stdout.write('\x1b[1B');
    process.stdout.write('\x1b[2K\r');
    process.stdout.write(`Progress: ${bar}`);
    process.stdout.write('\x1b[1A');
  }

  private calculateETA(): string {
    if (this.batchTimes.length < this.MIN_SAMPLES_FOR_ETA) {
      return '';
    }

    if (this.processedKeys === 0 || this.processedKeys >= this.totalKeys) {
      return '';
    }

    const movingAvgTimePerKey = this.batchTimes.reduce((sum, val) => sum + val, 0) / this.batchTimes.length;
    const remainingKeys = this.totalKeys - this.processedKeys;
    const remainingMs = movingAvgTimePerKey * remainingKeys;

    if (!isFinite(remainingMs) || remainingMs < 0) {
      return '';
    }

    const totalMinutes = Math.ceil(remainingMs / 1000 / 60);

    if (totalMinutes < 1) {
      return '(<1m)';
    }

    return `(~${totalMinutes}m)`;
  }

  public stop(message: string = 'Completed!', type: 'succeed' | 'fail' = 'succeed'): void {
    this.done = this.total;
    this.renderProgress();

    process.stdout.write('\x1b[1B');
    process.stdout.write('\x1b[2K\r');
    process.stdout.write('\x1b[1A');

    this.spinner[type](message);
  }
}

export const progressWithOra = new ProgressWithOra();
