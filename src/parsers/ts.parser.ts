import { flatten as flat, unflatten as unflat } from 'flat';
import type { Parser } from '../interface/parser.js';
import type { TsParserOptionsType } from './parser.types.js';
import { deepMerge, markNumericKeyObjects, restoreNumericKeys } from '#utils/parser.js';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import * as t from '@babel/types';
import type { NodePath } from '@babel/traverse';

const traverse = traverseModule.default || traverseModule;

export class TsParser implements Parser<Record<string, unknown>, TsParserOptionsType> {
  private readonly fallbackContent = 'const messages = {};\n\nexport default messages;';
  private delimiter = '\0';

  parse(content: string | Buffer, options?: TsParserOptionsType): Record<string, unknown> {
    const strContent = content.toString();
    const messagesObj = this.extractMessagesObject(strContent);

    if (!messagesObj) {
      return {};
    }

    // Mark numeric keys and flatten the whole object
    const marked = markNumericKeyObjects(messagesObj);
    const flattened = flat(marked, { delimiter: this.delimiter }) as Record<string, unknown>;

    // If a specific locale is requested, filter and unprefix
    if (options?.targetLocale) {
      const localePrefix = options.targetLocale + this.delimiter;
      const filtered: Record<string, unknown> = {};

      for (const key in flattened) {
        if (key === options.targetLocale) {
          // Exact match (unlikely for locale root but possible)
          filtered[key] = flattened[key];
        } else if (key.startsWith(localePrefix)) {
          // Remove the locale prefix to make it relative to the locale
          const relativeKey = key.substring(localePrefix.length);
          filtered[relativeKey] = flattened[key];
        }
      }
      return filtered;
    }

    return flattened;
  }

  serialize(data: Record<string, unknown>, options: TsParserOptionsType): string | Buffer {
    const { originalContent } = options;
    if (!originalContent) {
      throw new Error('Original content is required for TS serialization');
    }
    const strContent = originalContent.toString();
    let messagesObj = this.extractMessagesObject(strContent) || {};

    // If options.locale is set, prefix keys back
    let dataToMerge = data;
    const locale = options?.targetLocale;

    if (locale) {
      const prefixed: Record<string, unknown> = {};
      for (const key in data) {
        prefixed[`${locale}${this.delimiter}${key}`] = data[key];
      }
      dataToMerge = prefixed;
    }

    const unflattenedData = restoreNumericKeys(
      unflat(dataToMerge, { delimiter: this.delimiter })
    ) as Record<string, unknown>;

    // If a locale is specified, replace that locale's content entirely (to handle key removal)
    // Otherwise, merge with existing messages
    if (locale && unflattenedData[locale] !== undefined) {
      messagesObj[locale] = unflattenedData[locale];
    } else {
      messagesObj = deepMerge(messagesObj, unflattenedData);
    }

    // Serialize the object back to string
    const serializedObj = JSON.stringify(messagesObj, null, 4);

    // Replace in original content
    return this.replaceMessagesObject(strContent, serializedObj);
  }

  getFallback(): string {
    return this.fallbackContent;
  }

  private extractMessagesObject(content: string): Record<string, unknown> | null {
    try {
      // Parse the TypeScript file into an AST
      const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'objectRestSpread'],
        allowReturnOutsideFunction: true,
      });

      let messagesObject: Record<string, unknown> | null = null;
      const self = this;

      // Traverse the AST to find the messages declaration
      traverse(ast, {
        VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
          const { node } = path;
          if (t.isIdentifier(node.id) && node.id.name === 'messages' && node.init) {
            messagesObject = self.extractObjectFromAST(node.init);
            path.stop();
          }
        },
      });

      return messagesObject;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to parse messages object in TS file', errorMessage);
      return null;
    }
  }

  /**
   * Safely extracts a JavaScript object from an AST node.
   * Only handles object literals, arrays, and primitive values.
   */
  private extractObjectFromAST(node: t.Node): Record<string, unknown> | null {
    if (t.isObjectExpression(node)) {
      const result: Record<string, unknown> = {};

      for (const prop of node.properties) {
        if (t.isObjectProperty(prop)) {
          const key = this.getObjectKey(prop.key);
          if (key !== null) {
            result[key] = this.extractValueFromAST(prop.value);
          }
        } else if (t.isObjectMethod(prop) || t.isSpreadElement(prop)) {
          // Skip methods and spread elements for security
          continue;
        }
      }

      return result;
    }

    return null;
  }

  /**
   * Extracts a value from an AST node (object, array, or primitive).
   */
  private extractValueFromAST(node: t.Node): unknown {
    if (t.isObjectExpression(node)) {
      return this.extractObjectFromAST(node);
    } else if (t.isArrayExpression(node)) {
      return node.elements
        .filter((el): el is t.Expression => el !== null && !t.isSpreadElement(el))
        .map((el) => this.extractValueFromAST(el));
    } else if (t.isStringLiteral(node)) {
      return node.value;
    } else if (t.isNumericLiteral(node)) {
      return node.value;
    } else if (t.isBooleanLiteral(node)) {
      return node.value;
    } else if (t.isNullLiteral(node)) {
      return null;
    } else if (t.isTemplateLiteral(node)) {
      // Convert template literals to strings (simple case only)
      if (node.expressions.length === 0) {
        return node.quasis[0]?.value.cooked || '';
      }
      // For template literals with expressions, return empty string for safety
      return '';
    } else {
      // For any other node type (identifiers, function calls, etc.), return null
      // This prevents code execution
      return null;
    }
  }

  /**
   * Extracts the key from an object property.
   */
  private getObjectKey(key: t.Node): string | null {
    if (t.isIdentifier(key)) {
      return key.name;
    } else if (t.isStringLiteral(key)) {
      return key.value;
    } else if (t.isNumericLiteral(key)) {
      return String(key.value);
    }
    return null;
  }

  private replaceMessagesObject(content: string, newObjStr: string): string {
    const match = content.match(/const\s+messages\s*=\s*/);
    if (!match) return content;

    const startIndex = match.index! + match[0].length;
    let braceCount = 0;
    let foundStart = false;
    let endIndex = -1;

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];

      // Skip single-line comments
      if (char === '/' && content[i + 1] === '/') {
        const newlineIdx = content.indexOf('\n', i);
        i = newlineIdx === -1 ? content.length - 1 : newlineIdx;
        continue;
      }

      // Skip block comments
      if (char === '/' && content[i + 1] === '*') {
        const closeIdx = content.indexOf('*/', i + 2);
        i = closeIdx === -1 ? content.length - 1 : closeIdx + 1;
        continue;
      }

      // Skip string literals (single quote, double quote, backtick)
      if (char === "'" || char === '"' || char === '`') {
        const quote = char;
        i++;
        while (i < content.length) {
          if (content[i] === '\\') {
            i++; // skip escaped character
          } else if (content[i] === quote) {
            break;
          }
          i++;
        }
        continue;
      }

      if (char === '{') {
        braceCount++;
        foundStart = true;
      } else if (char === '}') {
        braceCount--;
      }

      if (foundStart && braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }

    if (endIndex === -1) return content;

    return content.substring(0, startIndex) + newObjStr + content.substring(endIndex);
  }
}
