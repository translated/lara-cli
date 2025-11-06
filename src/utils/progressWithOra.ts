import Ora, { Ora as OraType } from 'ora';
import { Messages } from '#messages/messages.js';

class ProgressWithOra {
  public spinner!: OraType;
  private done = 0;
  private total = 0;
  private readonly width = 40;

  public init({ message, spinner }: { message?: string; spinner?: OraType }): void {
    if (spinner) {
      this.spinner = spinner;
      return;
    }

    this.spinner = Ora({ text: message ?? Messages.errors.processing, color: 'yellow' }).start();
  }

  public start({ message, total }: { message: string; total: number }): void {
    if (!this.spinner) {
      this.init({ message });
    }

    if (total <= 0) {
      throw new Error(Messages.errors.progressTotalInvalid);
    }

    this.total = total;
    this.done = 0;

    this.setText(message);
    process.stdout.write('\n');
    this.renderProgress();
  }

  public tick(count: number = 1): void {
    this.done = Math.min(this.done + count, this.total);
    this.renderProgress();
  }

  public setText(text: string): void {
    this.spinner.text = text;
  }

  public reset({ total, done }: { total: number; done?: number }): void {
    if (total <= 0) {
      throw new Error(Messages.errors.progressTotalInvalid);
    }

    this.total = total;
    this.done = done ?? 0;
    this.renderProgress();
  }

  private renderProgress(): void {
    const ratio = this.done / this.total;
    const filled = Math.round(ratio * this.width);
    const empty = this.width - filled;
    const percent = (ratio * 100).toFixed(1);
    const progress = `${this.done}/${this.total}`;
    const bar = `|${'█'.repeat(filled)}${'-'.repeat(empty)}| ${percent}% (${progress})`;

    process.stdout.write('\x1b[1B');
    process.stdout.write('\x1b[2K\r');
    process.stdout.write(`Progress: ${bar}`);
    process.stdout.write('\x1b[1A');
  }

  public stop(
    message: string = Messages.success.completed,
    type: 'succeed' | 'fail' = 'succeed'
  ): void {
    this.done = this.total;
    this.renderProgress();

    process.stdout.write('\x1b[1B');
    process.stdout.write('\x1b[2K\r');
    process.stdout.write('\x1b[1A');

    this.spinner[type](message);
  }
}

export const progressWithOra = new ProgressWithOra();
