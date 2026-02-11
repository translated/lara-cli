import { describe, it, expect, beforeEach } from 'vitest';
import { MarkdownParser } from '../../parsers/markdown.parser.js';

describe('MarkdownParser', () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser();
  });

  describe('parse', () => {
    it('should parse a simple heading', () => {
      const content = '# Hello World';
      const result = parser.parse(content);

      expect(result).toEqual({ segment_0: 'Hello World' });
    });

    it('should parse multiple headings', () => {
      const content = `# First Heading

## Second Heading

### Third Heading`;
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'First Heading',
        segment_1: 'Second Heading',
        segment_2: 'Third Heading',
      });
    });

    it('should parse paragraphs', () => {
      const content = `This is the first paragraph.

This is the second paragraph.`;
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'This is the first paragraph.',
        segment_1: 'This is the second paragraph.',
      });
    });

    it('should parse unordered lists', () => {
      const content = `- Item 1
- Item 2
- Item 3`;
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'Item 1',
        segment_1: 'Item 2',
        segment_2: 'Item 3',
      });
    });

    it('should parse ordered lists', () => {
      const content = `1. First item
2. Second item
3. Third item`;
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'First item',
        segment_1: 'Second item',
        segment_2: 'Third item',
      });
    });

    it('should parse blockquotes', () => {
      const content = `> This is a quote.

> Another quote.`;
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'This is a quote.',
        segment_1: 'Another quote.',
      });
    });

    it('should parse multiline blockquotes as single segment', () => {
      const content = `> This is a quote.
> It spans multiple lines.`;
      const result = parser.parse(content);

      // Multiline blockquotes are combined into a single text node
      expect(result).toEqual({
        segment_0: 'This is a quote.\nIt spans multiple lines.',
      });
    });

    it('should parse text with bold formatting', () => {
      const content = 'This is **bold** text.';
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'This is ',
        segment_1: 'bold',
        segment_2: ' text.',
      });
    });

    it('should parse text with italic formatting', () => {
      const content = 'This is *italic* text.';
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'This is ',
        segment_1: 'italic',
        segment_2: ' text.',
      });
    });

    it('should parse text with links', () => {
      const content = 'Check out [this link](https://example.com) for more.';
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'Check out ',
        segment_1: 'this link',
        segment_2: ' for more.',
      });
    });

    it('should exclude code blocks from parsing', () => {
      const content = `# Title

\`\`\`javascript
const hello = "world";
\`\`\`

Some paragraph text.`;
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'Title',
        segment_1: 'Some paragraph text.',
      });
      expect(Object.values(result)).not.toContain('const hello = "world";');
    });

    it('should exclude inline code from parsing', () => {
      const content = 'Use the `console.log()` function to debug.';
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'Use the ',
        segment_1: ' function to debug.',
      });
      expect(Object.values(result)).not.toContain('console.log()');
    });

    it('should handle frontmatter-like content', () => {
      // Note: Without remark-frontmatter plugin, YAML frontmatter is parsed as thematic break + text
      // The parser treats --- as a thematic break (horizontal rule)
      const content = `---
title: My Document
---

# Hello World`;
      const result = parser.parse(content);

      // The content after the frontmatter should be parsed
      expect(Object.values(result)).toContain('Hello World');
    });

    it('should handle empty content', () => {
      const content = '';
      const result = parser.parse(content);

      expect(result).toEqual({});
    });

    it('should handle content with only whitespace', () => {
      const content = '   \n\n   \n';
      const result = parser.parse(content);

      expect(result).toEqual({});
    });

    it('should parse nested lists', () => {
      const content = `- Parent item
  - Child item 1
  - Child item 2
- Another parent`;
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'Parent item',
        segment_1: 'Child item 1',
        segment_2: 'Child item 2',
        segment_3: 'Another parent',
      });
    });

    it('should parse tables (GFM)', () => {
      const content = `| Header 1 | Header 2 |
| --- | --- |
| Cell 1 | Cell 2 |
| Cell 3 | Cell 4 |`;
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'Header 1',
        segment_1: 'Header 2',
        segment_2: 'Cell 1',
        segment_3: 'Cell 2',
        segment_4: 'Cell 3',
        segment_5: 'Cell 4',
      });
    });

    it('should parse strikethrough text (GFM)', () => {
      const content = 'This is ~~deleted~~ text.';
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'This is ',
        segment_1: 'deleted',
        segment_2: ' text.',
      });
    });

    it('should parse task lists (GFM)', () => {
      const content = `- [x] Completed task
- [ ] Incomplete task`;
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'Completed task',
        segment_1: 'Incomplete task',
      });
    });

    it('should handle complex document with mixed elements', () => {
      const content = `# Welcome

This is an introduction paragraph.

## Features

- Feature one
- Feature two
- Feature three

> Note: This is important.

\`\`\`bash
npm install
\`\`\`

For more info, see [the docs](https://docs.example.com).`;
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'Welcome',
        segment_1: 'This is an introduction paragraph.',
        segment_2: 'Features',
        segment_3: 'Feature one',
        segment_4: 'Feature two',
        segment_5: 'Feature three',
        segment_6: 'Note: This is important.',
        segment_7: 'For more info, see ',
        segment_8: 'the docs',
        segment_9: '.',
      });
    });

    it('should parse Buffer content', () => {
      const content = Buffer.from('# Hello World');
      const result = parser.parse(content);

      expect(result).toEqual({ segment_0: 'Hello World' });
    });

    it('should handle special characters', () => {
      const content = '# Héllo Wörld! こんにちは';
      const result = parser.parse(content);

      expect(result).toEqual({ segment_0: 'Héllo Wörld! こんにちは' });
    });

    it('should handle HTML elements (exclude them)', () => {
      const content = `# Title

<div class="custom">
  <p>HTML content</p>
</div>

Regular paragraph.`;
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'Title',
        segment_1: 'Regular paragraph.',
      });
    });
  });

  describe('serialize', () => {
    it('should serialize with translated content', () => {
      const originalContent = '# Hello World';
      const translatedData = { segment_0: 'Ciao Mondo' };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });

      expect(result.toString()).toContain('Ciao Mondo');
      expect(result.toString()).not.toContain('Hello World');
    });

    it('should preserve markdown structure when serializing', () => {
      const originalContent = `# Title

This is a paragraph.

- List item 1
- List item 2`;
      const translatedData = {
        segment_0: 'Titolo',
        segment_1: 'Questo è un paragrafo.',
        segment_2: 'Elemento 1',
        segment_3: 'Elemento 2',
      };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });
      const resultStr = result.toString();

      expect(resultStr).toContain('# Titolo');
      expect(resultStr).toContain('Questo è un paragrafo.');
      expect(resultStr).toContain('* Elemento 1');
      expect(resultStr).toContain('* Elemento 2');
    });

    it('should preserve code blocks when serializing', () => {
      const originalContent = `# Title

\`\`\`javascript
const x = 1;
\`\`\`

Text after code.`;
      const translatedData = {
        segment_0: 'Titolo',
        segment_1: 'Testo dopo codice.',
      };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });
      const resultStr = result.toString();

      expect(resultStr).toContain('```javascript');
      expect(resultStr).toContain('const x = 1;');
      expect(resultStr).toContain('Titolo');
      expect(resultStr).toContain('Testo dopo codice.');
    });

    it('should preserve inline code when serializing', () => {
      const originalContent = 'Use `npm install` to install.';
      const translatedData = {
        segment_0: 'Usa ',
        segment_1: ' per installare.',
      };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });
      const resultStr = result.toString();

      expect(resultStr).toContain('`npm install`');
      expect(resultStr).toContain('Usa');
      expect(resultStr).toContain('per installare.');
    });

    it('should preserve links when serializing', () => {
      const originalContent = 'Visit [our site](https://example.com) for more.';
      const translatedData = {
        segment_0: 'Visita ',
        segment_1: 'il nostro sito',
        segment_2: ' per altro.',
      };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });
      const resultStr = result.toString();

      expect(resultStr).toContain('[il nostro sito](https://example.com)');
      expect(resultStr).toContain('Visita');
      expect(resultStr).toContain('per altro.');
    });

    it('should preserve bold formatting when serializing', () => {
      const originalContent = 'This is **important** text.';
      const translatedData = {
        segment_0: 'Questo è ',
        segment_1: 'importante',
        segment_2: ' testo.',
      };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });
      const resultStr = result.toString();

      expect(resultStr).toContain('**importante**');
    });

    it('should preserve italic formatting when serializing', () => {
      const originalContent = 'This is *emphasized* text.';
      const translatedData = {
        segment_0: 'Questo è ',
        segment_1: 'enfatizzato',
        segment_2: ' testo.',
      };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });
      const resultStr = result.toString();

      expect(resultStr).toContain('*enfatizzato*');
    });

    it('should handle missing translations gracefully', () => {
      const originalContent = '# Hello World';
      const translatedData = {}; // No translations provided

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });
      const resultStr = result.toString();

      // Should keep original content when translation is missing
      expect(resultStr).toContain('Hello World');
    });

    it('should handle partial translations', () => {
      const originalContent = `# Title

Paragraph text.`;
      const translatedData = {
        segment_0: 'Titolo',
        // segment_1 is missing
      };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });
      const resultStr = result.toString();

      expect(resultStr).toContain('Titolo');
      expect(resultStr).toContain('Paragraph text.'); // Original kept
    });

    it('should preserve tables when serializing', () => {
      const originalContent = `| Name | Age |
| --- | --- |
| John | 30 |`;
      const translatedData = {
        segment_0: 'Nome',
        segment_1: 'Età',
        segment_2: 'Giovanni',
        segment_3: '30',
      };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });
      const resultStr = result.toString();

      expect(resultStr).toContain('Nome');
      expect(resultStr).toContain('Età');
      expect(resultStr).toContain('Giovanni');
    });

    it('should preserve blockquotes when serializing', () => {
      const originalContent = '> This is a quote.';
      const translatedData = {
        segment_0: 'Questa è una citazione.',
      };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });
      const resultStr = result.toString();

      expect(resultStr).toContain('> Questa è una citazione.');
    });

    it('should handle Buffer originalContent', () => {
      const originalContent = Buffer.from('# Hello');
      const translatedData = { segment_0: 'Ciao' };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });

      expect(result.toString()).toContain('Ciao');
    });

    it('should serialize complex document correctly', () => {
      const originalContent = `# Welcome to Our App

This is the introduction.

## Getting Started

1. Install the package
2. Configure settings
3. Run the app

> **Note:** Make sure you have Node.js installed.

For help, contact [support](mailto:support@example.com).`;

      const translatedData = {
        segment_0: 'Benvenuto nella Nostra App',
        segment_1: "Questa è l'introduzione.",
        segment_2: 'Per Iniziare',
        segment_3: 'Installa il pacchetto',
        segment_4: 'Configura le impostazioni',
        segment_5: "Esegui l'app",
        segment_6: 'Nota:',
        segment_7: ' Assicurati di avere Node.js installato.',
        segment_8: 'Per aiuto, contatta ',
        segment_9: 'supporto',
        segment_10: '.',
      };

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });
      const resultStr = result.toString();

      expect(resultStr).toContain('# Benvenuto nella Nostra App');
      expect(resultStr).toContain('## Per Iniziare');
      expect(resultStr).toContain('Installa il pacchetto');
      expect(resultStr).toContain('[supporto](mailto:support@example.com)');
    });

    it('should handle non-string translation values by ignoring them', () => {
      const originalContent = '# Hello World';
      const translatedData = { segment_0: 123 as unknown }; // Invalid type

      const result = parser.serialize(translatedData, { originalContent, targetLocale: 'it' });
      const resultStr = result.toString();

      // Should keep original since translation is not a string
      expect(resultStr).toContain('Hello World');
    });
  });

  describe('getFallback', () => {
    it('should return empty string', () => {
      const result = parser.getFallback();

      expect(result).toBe('');
    });
  });

  describe('parse and serialize roundtrip', () => {
    it('should maintain structure through parse and serialize', () => {
      const originalContent = `# Document Title

Introduction paragraph.

## Section One

- Point A
- Point B

## Section Two

Conclusion.`;

      const parsed = parser.parse(originalContent);
      const serialized = parser.serialize(parsed, { originalContent, targetLocale: 'en' });
      const reparsed = parser.parse(serialized);

      // Keys should match
      expect(Object.keys(reparsed)).toEqual(Object.keys(parsed));

      // Values should match (content might have minor formatting differences)
      for (const key of Object.keys(parsed)) {
        expect(reparsed[key]).toBe(parsed[key]);
      }
    });

    it('should correctly apply translations in roundtrip', () => {
      const originalContent = `# Hello

Welcome to the app.

- Feature 1
- Feature 2`;

      const translations = {
        segment_0: 'Ciao',
        segment_1: "Benvenuto nell'app.",
        segment_2: 'Funzione 1',
        segment_3: 'Funzione 2',
      };

      const serialized = parser.serialize(translations, { originalContent, targetLocale: 'it' });
      const reparsed = parser.parse(serialized);

      expect(reparsed.segment_0).toBe('Ciao');
      expect(reparsed.segment_1).toBe("Benvenuto nell'app.");
      expect(reparsed.segment_2).toBe('Funzione 1');
      expect(reparsed.segment_3).toBe('Funzione 2');
    });
  });

  describe('edge cases', () => {
    it('should handle text that is only whitespace with actual content', () => {
      const content = '   # Hello   ';
      const result = parser.parse(content);

      expect(result).toEqual({ segment_0: 'Hello' });
    });

    it('should handle multiple blank lines between elements', () => {
      const content = `# Title



Paragraph after many blank lines.`;
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'Title',
        segment_1: 'Paragraph after many blank lines.',
      });
    });

    it('should handle deeply nested blockquotes', () => {
      const content = `> Level 1
>> Level 2
>>> Level 3`;
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'Level 1',
        segment_1: 'Level 2',
        segment_2: 'Level 3',
      });
    });

    it('should handle emphasis within links', () => {
      const content = 'Click [**here**](https://example.com) now.';
      const result = parser.parse(content);

      // The text segments depend on the AST structure
      expect(Object.values(result)).toContain('here');
    });

    it('should handle images (alt text is not a text node)', () => {
      const content = '![Alt text](image.png)';
      const result = parser.parse(content);

      // Image alt text is stored as an attribute, not a text node
      // So it's not extracted as a translatable segment
      expect(result).toEqual({});
    });

    it('should handle images with surrounding text', () => {
      const content = 'Here is an image: ![Alt text](image.png) and some text after.';
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'Here is an image: ',
        segment_1: ' and some text after.',
      });
    });

    it('should handle horizontal rules (no text content)', () => {
      const content = `Before

---

After`;
      const result = parser.parse(content);

      expect(result).toEqual({
        segment_0: 'Before',
        segment_1: 'After',
      });
    });

    it('should handle autolinks (GFM)', () => {
      const content = 'Visit https://example.com for more info.';
      const result = parser.parse(content);

      expect(result).toHaveProperty('segment_0');
    });
  });
});
