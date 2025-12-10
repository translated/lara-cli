import { describe, it, expect } from 'vitest';
import { ParserFactory } from '../../parsers/parser.factory.js';

describe('ParserFactory', () => {
  describe('constructor', () => {
    it('should create factory with file extension', () => {
      const factory = new ParserFactory('/path/to/file.json');
      expect(factory).toBeInstanceOf(ParserFactory);
    });

    it('should handle case-insensitive file extensions', () => {
      expect(() => new ParserFactory('/path/to/file.JSON')).not.toThrow();
      expect(() => new ParserFactory('/path/to/file.PO')).not.toThrow();
      expect(() => new ParserFactory('/path/to/file.TS')).not.toThrow();
      expect(() => new ParserFactory('/path/to/file.VUE')).not.toThrow();
    });

    it('should throw error for unsupported file extension', () => {
      expect(() => new ParserFactory('/path/to/file.txt')).toThrow(
        'Unsupported file extension: txt. Supported extensions: json, po, ts, vue'
      );
    });

    it('should throw error for file without extension', () => {
      expect(() => new ParserFactory('/path/to/file')).toThrow(
        'Unsupported file extension: /path/to/file. Supported extensions: json, po, ts, vue'
      );
    });

    it('should throw error for empty string', () => {
      expect(() => new ParserFactory('')).toThrow('File path is required');
    });

    it('should handle files with multiple dots in name', () => {
      const factory = new ParserFactory('/path/to/file.name.json');
      expect(factory).toBeInstanceOf(ParserFactory);
    });

    it('should handle relative paths', () => {
      expect(() => new ParserFactory('./file.json')).not.toThrow();
      expect(() => new ParserFactory('../file.po')).not.toThrow();
    });
  });
});
