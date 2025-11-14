import Ora, { Ora as OraType } from 'ora';
import stringWidth from 'string-width';

/**
 * Formats a list of locales for display in a user-friendly way.
 * For small lists (≤maxDisplay), shows all locales.
 * For large lists (>maxDisplay), shows first few and count of remaining.
 *
 * @param locales - Array of locale codes
 * @param maxDisplay - Maximum number of locales to display before truncating (default: 5)
 * @returns Formatted string representation
 *
 * @example
 * formatLocaleList(['es', 'fr', 'it']) // 'es, fr, it'
 * formatLocaleList(['es', 'fr', 'it', 'de', 'pt', 'nl'], 3) // 'es, fr, it (+3 more)'
 */
export function formatLocaleList(locales: string[], maxDisplay: number = 5): string {
  if (locales.length === 0) {
    return '';
  }

  if (locales.length <= maxDisplay) {
    return locales.join(', ');
  }

  const displayed = locales.slice(0, maxDisplay);
  const remaining = locales.length - maxDisplay;
  return `${displayed.join(', ')} (+${remaining} more)`;
}

/**
 * Displays a formatted table of locales for better readability with large lists.
 * Groups locales into columns for compact display in the terminal.
 * Uses Ora for consistent logging following project standards.
 *
 * @param locales - Array of locale codes to display
 * @param title - Title for the list
 * @param columns - Number of columns to display (default: 4)
 *
 * @example
 * displayLocaleTable(['es', 'fr', 'it', 'de', 'pt', 'nl'], 'Available locales')
 * // Output:
 * // ℹ Available locales:
 * //   es      fr      it      de
 * //   pt      nl
 */

type DisplayLocaleTableOptions = {
  locales: string[];
  title: string;
  columns?: number;
  spinner?: OraType;
  type?: 'info' | 'succeed';
};

export function displayLocaleTable({
  locales,
  title,
  columns = 4,
  spinner,
  type = 'info',
}: DisplayLocaleTableOptions): void {
  const rows: string[][] = [];

  for (let i = 0; i < locales.length; i += columns) {
    rows.push(locales.slice(i, i + columns));
  }

  const formattedRows = rows.map((row) => `  ${row.map((locale) => locale.padEnd(8)).join('')}`);

  const tableOutput = `${title}:\n${formattedRows.join('\n')}`;

  if (spinner) {
    spinner[type](tableOutput);
  } else {
    Ora()[type](tableOutput);
  }
}

/**
 * Displays a summary box with statistics using box-drawing characters.
 * Creates a perfectly aligned box that handles emojis and wide characters correctly.
 *
 * @param title - Title to display at the top of the box
 * @param items - Array of [label, value] tuples to display in the box
 * @param footer - Footer message to display at the bottom of the box
 *
 * @example
 * displaySummaryBox({
 *   title: '📦 Localization Summary',
 *   items: [['Files localized', '5 files'], ['Target locales', '3 locales']],
 *   footer: '✓ All done! Happy coding!'
 * })
 * // Output:
 * // ╔══════════════════════════════════════════════╗
 * // ║       📦 Localization Summary                ║
 * // ╠══════════════════════════════════════════════╣
 * // ║  Files localized: 5 files                    ║
 * // ║  Target locales: 3 locales                   ║
 * // ╠══════════════════════════════════════════════╣
 * // ║       ✓ All done! Happy coding!              ║
 * // ╚══════════════════════════════════════════════╝
 */
type DisplaySummaryBoxOptions = {
  title: string;
  items: Array<[string, string]>;
  footer: string;
};

export function displaySummaryBox({ title, items, footer }: DisplaySummaryBoxOptions): void {
  const boxWidth = 50;
  const topBorder = `╔${'═'.repeat(boxWidth - 1)}╗`;
  const bottomBorder = `╚${'═'.repeat(boxWidth - 1)}╝`;
  const separator = `╠${'═'.repeat(boxWidth - 1)}╣`;

  const centerText = (text: string): string => {
    const visualLength = stringWidth(text);
    const padding = boxWidth - 4 - visualLength;
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return `║ ${' '.repeat(leftPad)}${text}${' '.repeat(rightPad + 1)} ║`;
  };

  const alignText = (label: string, value: string): string => {
    const content = `${label}: ${value}`;
    const visualLength = stringWidth(content);
    const padding = boxWidth - 4 - visualLength;
    return `║  ${content}${' '.repeat(padding)} ║`;
  };

  const lines = [
    '',
    topBorder,
    centerText(title),
    separator,
    ...items.map(([label, value]) => alignText(label, value)),
    separator,
    centerText(footer),
    bottomBorder,
    '',
  ];

  const summaryBox = lines.join('\n');

  // Use console.log to display without the checkmark icon
  console.log(summaryBox);
}
