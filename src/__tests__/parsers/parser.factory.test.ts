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
      expect(() => new ParserFactory('/path/to/file.MD')).not.toThrow();
      expect(() => new ParserFactory('/path/to/file.MDX')).not.toThrow();
      expect(() => new ParserFactory('/path/to/file.STRINGS')).not.toThrow();
      expect(() => new ParserFactory('/path/to/file.STRINGSDICT')).not.toThrow();
      expect(() => new ParserFactory('/path/to/file.XCSTRINGS')).not.toThrow();
      expect(() => new ParserFactory('/path/to/file.TXT')).not.toThrow();
    });

    it('should throw error for unsupported file extension', () => {
      expect(() => new ParserFactory('/path/to/file.csv')).toThrow(
        'Unsupported file extension: csv'
      );
    });

    it('should create parser for .txt files', () => {
      const factory = new ParserFactory('/path/to/file.txt');
      expect(factory).toBeInstanceOf(ParserFactory);
      const result = factory.parse('Hello World\nWelcome');
      expect(result).toEqual({ line_0: 'Hello World', line_1: 'Welcome' });
    });

    it('should throw error for file without extension', () => {
      expect(() => new ParserFactory('/path/to/file')).toThrow('Unsupported file extension:');
    });

    it('should create parser for .strings files', () => {
      const factory = new ParserFactory('/path/to/Localizable.strings');
      expect(factory).toBeInstanceOf(ParserFactory);
      const result = factory.parse('"key" = "value";');
      expect(result).toEqual({ key: 'value' });
    });

    it('should create parser for .stringsdict files', () => {
      const factory = new ParserFactory('/path/to/Localizable.stringsdict');
      expect(factory).toBeInstanceOf(ParserFactory);
    });

    it('should create parser for .xcstrings files', () => {
      const factory = new ParserFactory('/path/to/Localizable.xcstrings');
      expect(factory).toBeInstanceOf(ParserFactory);
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
