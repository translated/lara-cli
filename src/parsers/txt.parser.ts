import type { Parser } from '../interface/parser.js';
import type { TxtParserOptionsType } from './parser.types.js';

/**
 * Plain text parser that extracts translatable lines from .txt files.
 *
 * Each non-empty line becomes a translatable segment keyed as `line_0`, `line_1`, etc.
 * Empty and whitespace-only lines are preserved structurally but not translated.
 *
 * @example
 * ```text
 * Hello World
 *
 * Welcome to our application.
 * ```
 *
 * Parsed as:
 * - `line_0`: "Hello World"
 * - `line_1`: "Welcome to our application."
 */
export class TxtParser implements Parser<Record<string, unknown>, TxtParserOptionsType> {
  private readonly fallbackContent = '';

  parse(content: string | Buffer): Record<string, unknown> {
    const strContent = content.toString();
    const lines = strContent.split('\n');
    const result: Record<string, unknown> = {};

    let segmentIndex = 0;
    for (const line of lines) {
      if (line.trim().length > 0) {
        result[`line_${segmentIndex}`] = line;
        segmentIndex++;
      }
    }

    return result;
  }

  serialize(data: Record<string, unknown>, options: TxtParserOptionsType): string {
    const { originalContent } = options;

    const strContent = originalContent.toString();
    const originalLines = strContent.split('\n');
    const resultLines: string[] = [];

    let segmentIndex = 0;
    for (const originalLine of originalLines) {
      if (originalLine.trim().length > 0) {
        const key = `line_${segmentIndex}`;
        const translatedValue = data[key];

        if (translatedValue !== undefined && typeof translatedValue === 'string') {
          resultLines.push(translatedValue);
        } else {
          resultLines.push(originalLine);
        }
        segmentIndex++;
      } else {
        resultLines.push(originalLine);
      }
    }

    return resultLines.join('\n');
  }

  getFallback(): string {
    return this.fallbackContent;
  }
}
