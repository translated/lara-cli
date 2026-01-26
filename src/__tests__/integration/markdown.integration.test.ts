import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, readFile, rm, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { executeCommand } from './test-helpers.js';
import initCommand from '../../cli/cmd/init/init.js';
import translateCommand from '../../cli/cmd/translate/translate.js';
import { ConfigProvider } from '#modules/config/config.provider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Markdown Repository Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalExit: typeof process.exit;

  beforeEach(async () => {
    // Save original cwd and env
    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    originalExit = process.exit;

    // Mock process.exit to prevent tests from actually exiting
    process.exit = vi.fn() as any;

    // Create a temporary directory for each test
    testDir = path.join(__dirname, '..', '..', '..', 'tmp', `test-md-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    await mkdir(testDir, { recursive: true });

    // Change to test directory
    process.chdir(testDir);

    // Set up mock API credentials
    process.env.LARA_ACCESS_KEY_ID = 'test-key-id';
    process.env.LARA_ACCESS_KEY_SECRET = 'test-key-secret';

    // Reset ConfigProvider singleton
    (ConfigProvider as any).instance = null;
  });

  afterEach(async () => {
    // Restore original cwd, env, and exit
    process.chdir(originalCwd);
    process.env = originalEnv;
    process.exit = originalExit;

    // Clean up test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }

    // Clean up lara.lock file from project root if it was created during tests
    const lockFilePath = path.join(originalCwd, 'lara.lock');
    if (existsSync(lockFilePath)) {
      await unlink(lockFilePath).catch(() => {
        // Ignore errors if file doesn't exist or can't be deleted
      });
    }

    // Reset ConfigProvider singleton
    (ConfigProvider as any).instance = null;
  });

  it('should handle a Markdown documentation repository', async () => {
    // Set up Markdown repository structure
    await mkdir(path.join(testDir, 'docs', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'docs', 'en', 'getting-started.md'),
      `# Getting Started

Welcome to our documentation.

## Installation

Follow these steps to install the application.

## Configuration

Configure your settings here.
`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'docs/[locale]/getting-started.md',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const content = await readFile(path.join(testDir, 'docs', 'it', 'getting-started.md'), 'utf-8');
    expect(content).toContain('[it] Getting Started');
    expect(content).toContain('[it] Welcome to our documentation');
    expect(content).toContain('[it] Installation');
    expect(content).toContain('[it] Configure your settings here');
    // Verify Markdown structure is preserved
    expect(content).toContain('#');
    expect(content).toContain('##');
  });

  it('should handle Markdown with lists and code blocks', async () => {
    // Set up Markdown with various elements
    await mkdir(path.join(testDir, 'docs', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'docs', 'en', 'guide.md'),
      `# User Guide

This is a comprehensive guide.

## Features

- Feature one
- Feature two
- Feature three

## Code Example

\`\`\`javascript
console.log('Hello');
\`\`\`

## Conclusion

Thank you for reading.
`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'docs/[locale]/guide.md',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const content = await readFile(path.join(testDir, 'docs', 'it', 'guide.md'), 'utf-8');
    expect(content).toContain('[it] User Guide');
    expect(content).toContain('[it] Feature one');
    expect(content).toContain('[it] Thank you for reading');
    // Code blocks should be preserved (not translated)
    expect(content).toContain('```javascript');
    expect(content).toContain("console.log('Hello');");
  });

  it('should add new lines to Markdown file when source is changed', async () => {
    // Set up Markdown repository structure
    await mkdir(path.join(testDir, 'docs', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'docs', 'en', 'guide.md'),
      `# User Guide`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'docs/[locale]/guide.md',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const content = await readFile(path.join(testDir, 'docs', 'it', 'guide.md'), 'utf-8');
    expect(content).toContain('[it] User Guide');
    expect(content).not.toContain('[it] This is a comprehensive guide.');

    await writeFile(
      path.join(testDir, 'docs', 'en', 'guide.md'),
      `# User Guide

This is a comprehensive guide.
`
    );

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const newContent = await readFile(path.join(testDir, 'docs', 'it', 'guide.md'), 'utf-8');
    expect(newContent).toContain('[it] User Guide');
    expect(newContent).toContain('[it] This is a comprehensive guide.');
  });

  it('should remove lines from Markdown file when source is changed', async () => {
    // Set up Markdown repository structure
    await mkdir(path.join(testDir, 'docs', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'docs', 'en', 'guide.md'),
      `# User Guide

This is a comprehensive guide.
    `
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'docs/[locale]/guide.md',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const content = await readFile(path.join(testDir, 'docs', 'it', 'guide.md'), 'utf-8');
    expect(content).toContain('[it] User Guide');
    expect(content).toContain('[it] This is a comprehensive guide.');

    await writeFile(
      path.join(testDir, 'docs', 'en', 'guide.md'),
      `# User Guide
    `
    );

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const newContent = await readFile(path.join(testDir, 'docs', 'it', 'guide.md'), 'utf-8');
    expect(newContent).toContain('[it] User Guide');
    expect(newContent).not.toContain('[it] This is a comprehensive guide.');
  });

  it('should maintain Markdown structure when source content changes', async () => {
    // Set up initial Markdown with specific structure
    await mkdir(path.join(testDir, 'docs', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'docs', 'en', 'documentation.md'),
      `# Main Title

Introduction paragraph here.

## Section One

Content for section one.

### Subsection

Details about subsection.

## Section Two

- First item
- Second item
- Third item

\`\`\`javascript
const code = 'example';
\`\`\`

Final paragraph.
`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'docs/[locale]/documentation.md',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate initial version
    await executeCommand(translateCommand, []);

    // Verify initial structure is preserved
    const initialContent = await readFile(path.join(testDir, 'docs', 'it', 'documentation.md'), 'utf-8');
    expect(initialContent).toContain('#');
    expect(initialContent).toContain('##');
    expect(initialContent).toContain('###');
    // Remark normalizes list markers to *, so check for that
    expect(initialContent).toMatch(/^\s*[\*\-]\s/m);
    expect(initialContent).toContain('```javascript');
    expect(initialContent).toContain("const code = 'example';");

    // Change source content (different text but same structure)
    await writeFile(
      path.join(testDir, 'docs', 'en', 'documentation.md'),
      `# Updated Title

New introduction paragraph.

## Updated Section One

Different content for section one.

### Updated Subsection

New details about subsection.

## Updated Section Two

- New first item
- New second item
- New third item

\`\`\`javascript
const code = 'example';
\`\`\`

Updated final paragraph.
`
    );

    // Translate updated version
    await executeCommand(translateCommand, []);

    // Verify structure is still maintained after content change
    const updatedContent = await readFile(path.join(testDir, 'docs', 'it', 'documentation.md'), 'utf-8');
    
    // Verify headings structure is preserved
    expect(updatedContent).toContain('#');
    expect(updatedContent).toContain('##');
    expect(updatedContent).toContain('###');
    
    // Verify list structure is preserved (remark normalizes to *)
    expect(updatedContent).toMatch(/^\s*[\*\-]\s/m);
    
    // Verify code block structure is preserved
    expect(updatedContent).toContain('```javascript');
    expect(updatedContent).toContain("const code = 'example';");
    
    // Verify translated content is present
    expect(updatedContent).toContain('[it] Updated Title');
    expect(updatedContent).toContain('[it] New introduction paragraph');
    expect(updatedContent).toContain('[it] Updated Section One');
    expect(updatedContent).toContain('[it] Updated Subsection');
    expect(updatedContent).toContain('[it] Updated Section Two');
    expect(updatedContent).toContain('[it] New first item');
    expect(updatedContent).toContain('[it] Updated final paragraph');
    
    // Verify structure elements appear in correct order
    const lines = updatedContent.split('\n');
    const h1Index = lines.findIndex(line => line.startsWith('# ') && !line.startsWith('##'));
    const h2Index = lines.findIndex(line => line.startsWith('## ') && !line.startsWith('###'));
    const h3Index = lines.findIndex(line => line.startsWith('### '));
    // Check for both * and - as list markers (remark normalizes to *)
    const listIndex = lines.findIndex(line => line.trim().match(/^[\*\-]\s/));
    const codeBlockIndex = lines.findIndex(line => line.trim().startsWith('```'));
    
    // Verify structure order is maintained
    expect(h1Index).toBeGreaterThan(-1);
    expect(h2Index).toBeGreaterThan(h1Index);
    expect(h3Index).toBeGreaterThan(h2Index);
    expect(listIndex).toBeGreaterThan(h3Index);
    expect(codeBlockIndex).toBeGreaterThan(listIndex);
  });

  it('should handle MDX files with JSX components and frontmatter', async () => {
    // Set up MDX repository structure
    await mkdir(path.join(testDir, 'content', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'content', 'en', 'article.mdx'),
      `---
title: Getting Started Guide
author: John Doe
---

import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

# Getting Started

Welcome to our documentation. This is a comprehensive guide.

<Card title="Important Notice">
  Please read this carefully before proceeding.
</Card>

## Installation Steps

Follow these steps to install the application:

<Button variant="primary">Get Started</Button>

## Features

- Feature one: Easy to use
- Feature two: Fast performance
- Feature three: Great support

\`\`\`javascript
const example = 'code should not be translated';
\`\`\`

<Card>
  <h3>Additional Information</h3>
  <p>This is important information inside a component.</p>
</Card>

Thank you for reading!
`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'content/[locale]/article.mdx',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const content = await readFile(path.join(testDir, 'content', 'it', 'article.mdx'), 'utf-8');
    
    // Verify frontmatter is preserved (not translated)
    // Note: remark may transform frontmatter, so we check for the content
    expect(content).toContain('title: Getting Started Guide');
    expect(content).toContain('author: John Doe');
    
    // Verify import statements are preserved
    expect(content).toContain("import { Card } from '@/components/Card';");
    expect(content).toContain("import { Button } from '@/components/Button';");
    
    // Verify JSX components are preserved
    expect(content).toContain('<Card title="Important Notice">');
    expect(content).toContain('</Card>');
    expect(content).toContain('<Button variant="primary">');
    expect(content).toContain('</Button>');
    expect(content).toContain('<h3>');
    expect(content).toContain('<p>');
    
    // Verify markdown structure is preserved
    expect(content).toContain('#');
    expect(content).toContain('##');
    
    // Verify text content is translated
    expect(content).toContain('[it] Getting Started');
    expect(content).toContain('[it] Welcome to our documentation');
    expect(content).toContain('[it] Installation Steps');
    expect(content).toContain('[it] Follow these steps to install the application');
    expect(content).toContain('[it] Features');
    expect(content).toContain('[it] Feature one: Easy to use');
    expect(content).toContain('[it] Feature two: Fast performance');
    expect(content).toContain('[it] Feature three: Great support');
    expect(content).toContain('[it] Thank you for reading');
    
    // Verify text inside JSX components is preserved (not translated)
    // The parser skips HTML/JSX nodes, so text inside them is not extracted for translation
    expect(content).toContain('Please read this carefully before proceeding');
    expect(content).toContain('Additional Information');
    expect(content).toContain('This is important information inside a component');
    
    // Note: Some JSX text may be translated if it's parsed as a text node
    // This depends on how remark parses the JSX structure
    
    // Verify code blocks are preserved (not translated)
    expect(content).toContain('```javascript');
    expect(content).toContain("const example = 'code should not be translated';");
    
    // Verify JSX component structure is maintained
    const cardOpenIndex = content.indexOf('<Card');
    const cardCloseIndex = content.lastIndexOf('</Card>');
    expect(cardOpenIndex).toBeGreaterThan(-1);
    expect(cardCloseIndex).toBeGreaterThan(cardOpenIndex);
  });

  it('should handle markdown files with links', async () => {
    // Set up Markdown file with links
    await mkdir(path.join(testDir, 'docs', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'docs', 'en', 'links.md'),
      `# Useful Links

For more information, visit [our website](https://example.com).

Check out [GitHub](https://github.com/example) for the latest updates.

Some inline links: see [Section One](#section-one) or [Contact](mailto:info@example.com).

<aside>
This is an aside with a [link inside](https://aside-link.com).
</aside>
`
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'docs/[locale]/links.md',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const content = await readFile(path.join(testDir, 'docs', 'it', 'links.md'), 'utf-8');
    
    // Headings are translated
    expect(content).toContain('[it] Useful Links');

    // Link texts are translated, but URLs are preserved
    // The parser translates text nodes inside links, so the translation prefix appears inside the brackets
    expect(content).toContain('[\\[it\\] our website](https://example.com)');
    expect(content).toContain('[\\[it\\] GitHub](https://github.com/example)');
    expect(content).toContain('[\\[it\\] Section One](#section-one)');
    expect(content).toContain('[\\[it\\] Contact](mailto:info@example.com)');

    // Surrounding text is also translated
    expect(content).toContain('[it] For more information, visit');
    expect(content).toContain('[it] Check out');
    expect(content).toContain('[it] Some inline links: see');

    // Markdown structure is preserved
    expect(content).toContain('[');
    expect(content).toContain('](');

    // Text within HTML/JSX nodes is skipped (not translated)
    expect(content).toContain('<aside>');
    expect(content).toContain('This is an aside with a [link inside](https://aside-link.com).');
    expect(content).not.toContain('[it] This is an aside'); // Make sure it's not translated
  });

  it('should handle empty markdown files', async () => {
    // Set up Markdown repository structure
    await mkdir(path.join(testDir, 'docs', 'en'), { recursive: true });
    await writeFile(
      path.join(testDir, 'docs', 'en', 'guide.md'),
      ``
    );

    // Initialize
    await executeCommand(initCommand, [
      '--non-interactive',
      '--source',
      'en',
      '--target',
      'it',
      '--paths',
      'docs/[locale]/guide.md',
    ]);

    (ConfigProvider as any).instance = null;

    // Translate
    await executeCommand(translateCommand, []);

    // Verify translation
    const content = await readFile(path.join(testDir, 'docs', 'it', 'guide.md'), 'utf-8');
    expect(content).toEqual('');
  });
  
});
