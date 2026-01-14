import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import type { Root, Node, Text } from 'mdast';
import type { Parser } from '../interface/parser.js';
import type { MarkdownParserOptionsType } from './parser.types.js';

interface TextSegment {
  node: Text;
  parentType: string;
}

/**
 * Markdown/MDX parser that extracts translatable text from the entire markdown file
 * and maintains formatting during translation.
 *
 * This parser uses remark to parse markdown into an AST, extracts text content from
 * translatable nodes (headers, paragraphs, lists, etc.) while preserving markdown
 * syntax and structure. Code blocks, inline code, URLs, and frontmatter are excluded
 * from translation.
 *
 * @example
 * ```markdown
 * # My Document
 *
 * This is a paragraph with **bold** text.
 *
 * - List item 1
 * - List item 2
 * ```
 */
export class MarkdownParser implements Parser<Record<string, unknown>, MarkdownParserOptionsType> {
  private readonly fallbackContent = '';
  private readonly processor = remark().use(remarkGfm);

  parse(content: string | Buffer): Record<string, unknown> {
    const strContent = content.toString();
    const tree = this.processor.parse(strContent) as Root;
    const textSegments = this.extractTextSegments(tree);

    const result: Record<string, unknown> = {};

    for (let i = 0; i < textSegments.length; i++) {
      const segment = textSegments[i];
      if (segment) {
        const key = `segment_${i}`;
        result[key] = segment.node.value;
      }
    }

    return result;
  }

  serialize(data: Record<string, unknown>, options: MarkdownParserOptionsType): string | Buffer {
    const { originalContent } = options;

    const strContent = originalContent.toString();
    const tree = this.processor.parse(strContent) as Root;
    const textSegments = this.extractTextSegments(tree);

    // Replace text nodes with translated content using position-based matching
    this.updateTextNodes(tree, textSegments, data);

    // Reconstruct markdown from AST
    return this.processor.stringify(tree);
  }

  getFallback(): string {
    return this.fallbackContent;
  }

  /**
   * Extracts all translatable text segments from the markdown AST.
   *
   * @param tree - The markdown AST root node
   * @returns Array of text segments
   */
  private extractTextSegments(tree: Root): TextSegment[] {
    const segments: TextSegment[] = [];
    let parentType = 'root';

    visit(tree, (node: Node, _index: number, parent: Node) => {
      if (
        node.type === 'code' ||
        node.type === 'inlineCode' ||
        node.type === 'html' ||
        node.type === 'yaml'
      ) {
        return;
      }

      if (parent) {
        parentType = parent.type;
      }

      if (node.type === 'text') {
        const textNode = node as Text;
        if (textNode.value.trim().length > 0) {
          segments.push({
            node: textNode,
            parentType,
          });
        }
      }
    });

    return segments;
  }

  /**
   * Updates text nodes in the AST with translated content.
   * Uses position-based matching to apply translations in order.
   *
   * @param tree - The markdown AST root node
   * @param _segments - Array of text segments (unused, kept for interface consistency)
   * @param translatedData - Translated content keyed by segment index
   */
  private updateTextNodes(
    tree: Root,
    _segments: TextSegment[],
    translatedData: Record<string, unknown>
  ): void {
    let segmentIndex = 0;

    visit(tree, (node: Node) => {
      // Skip code blocks, inline code, HTML, and frontmatter
      if (
        node.type === 'code' ||
        node.type === 'inlineCode' ||
        node.type === 'html' ||
        node.type === 'yaml'
      ) {
        return;
      }

      // Update text nodes
      if (node.type === 'text') {
        const textNode = node as Text;
        if (textNode.value.trim().length > 0) {
          const key = `segment_${segmentIndex}`;
          const translatedText = translatedData[key];

          if (translatedText && typeof translatedText === 'string') {
            textNode.value = translatedText;
          }
          segmentIndex++;
        }
      }
    });
  }
}
