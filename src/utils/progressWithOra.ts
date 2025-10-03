import Ora, { Ora as OraType } from 'ora';

interface ProgressState {
  done: number;
  total: number;
  startTime: number;
}

class ProgressWithOra {
  public spinner!: OraType;
  private global: ProgressState = { done: 0, total: 0, startTime: 0 };
  private local: ProgressState = { done: 0, total: 0, startTime: 0 };
  private readonly width = 40;

  public init({ message, spinner }: { message?: string; spinner?: OraType }): void {
    if (spinner) {
      this.spinner = spinner;
      return;
    }

    this.spinner = Ora({ text: message ?? 'Processing...', color: 'yellow' }).start();
  }

  public startGlobal({ message, total }: { message: string; total: number }): void {
    if (!this.spinner) {
      this.init({ message });
    }

    if (total <= 0) {
      throw new Error('Progress total must be greater than 0');
    }

    this.global = { done: 0, total, startTime: Date.now() };
    this.setText(message);
    process.stdout.write('\n\n');
    this.renderDualProgress();
  }

  public startLocal({ message, total }: { message: string; total: number }): void {
    if (total <= 0) {
      throw new Error('Progress total must be greater than 0');
    }

    this.local = { done: 0, total, startTime: Date.now() };
    this.setText(message);
    this.renderDualProgress();
  }

  public tickGlobal(count: number = 1): void {
    this.global.done = Math.min(this.global.done + count, this.global.total);
    this.renderDualProgress();
  }

  public tickLocal(count: number = 1): void {
    this.local.done = Math.min(this.local.done + count, this.local.total);
    this.renderDualProgress();
  }

  public tickBoth(count: number = 1): void {
    this.global.done = Math.min(this.global.done + count, this.global.total);
    this.local.done = Math.min(this.local.done + count, this.local.total);
    this.renderDualProgress();
  }

  public setText(text: string): void {
    this.spinner.text = text;
  }

  private renderDualProgress(): void {
    const globalBar = this.buildProgressBar(this.global, 'All Files    ');
    const localBar = this.buildProgressBar(this.local, 'Current File ');

    process.stdout.write('\x1b[1B');
    process.stdout.write('\x1b[2K\r');
    process.stdout.write(globalBar);
    process.stdout.write('\x1b[1B');
    process.stdout.write('\x1b[2K\r');
    process.stdout.write(localBar);
    process.stdout.write('\x1b[2A');
  }

  private buildProgressBar(state: ProgressState, label: string): string {
    if (state.total === 0) return `${label}: N/A`;

    const ratio = state.done / state.total;
    const filled = Math.round(ratio * this.width);
    const empty = this.width - filled;
    const percent = (ratio * 100).toFixed(1);
    const eta = this.calculateETA(state);
    const progress = `${state.done}/${state.total}`;
    
    return `${label}: |${'█'.repeat(filled)}${'-'.repeat(empty)}| ${percent}% (${progress}) ${eta}`;
  }

  private calculateETA(state: ProgressState): string {
    if (state.done === 0) return '';

    const elapsed = Date.now() - state.startTime;
    const rate = state.done / elapsed;
    const remaining = (state.total - state.done) / rate;

    if (!isFinite(remaining) || remaining < 0) return '';

    const seconds = Math.ceil(remaining / 1000);
    if (seconds < 60) return `(~${seconds}s)`;
    
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `(~${minutes}m ${secs}s)`;
  }

  public stop(message: string = 'Completed!', type: 'succeed' | 'fail' = 'succeed'): void {
    this.global.done = this.global.total;
    this.local.done = this.local.total;
    this.renderDualProgress();

    process.stdout.write('\x1b[1B');
    process.stdout.write('\x1b[2K\r');
    process.stdout.write('\x1b[1B');
    process.stdout.write('\x1b[2K\r');
    process.stdout.write('\x1b[2A');

    this.spinner[type](message);
  }
}

export const progressWithOra = new ProgressWithOra();
