/**
 * Detects the formatting used in file content by analyzing indentation patterns
 * and trailing newlines.
 *
 * @param content - The file content to analyze
 * @returns Object containing detected indentation (tabs or number of spaces) and trailing newline
 */
export function detectFormatting(content: string): {
  indentation: string | number;
  trailingNewline: string;
} {
  const lines = content.split('\n');
  let indentation: string | number = 2; // default

  // Detect indentation
  for (const line of lines) {
    const match = line.match(/^(\s+)\S/);
    if (match && match[1]) {
      const indent = match[1];

      // Check if it's tabs
      if (indent.includes('\t')) {
        indentation = '\t';
        break;
      }

      // Check if it's spaces
      if (indent.match(/^ +$/)) {
        indentation = indent.length;
        break;
      }
    }
  }

  // Detect trailing newline
  const trailingNewline = content.endsWith('\n') ? '\n' : '';

  return { indentation, trailingNewline };
}
