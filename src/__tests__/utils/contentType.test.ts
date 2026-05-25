import { describe, it, expect } from 'vitest';
import { hasHtmlMarkup, resolveContentType } from '#utils/contentType.js';

describe('hasHtmlMarkup', () => {
  it('detects simple opening tags', () => {
    expect(hasHtmlMarkup('Hello <b>world</b>')).toBe(true);
    expect(hasHtmlMarkup('Click <a href="/x">here</a>')).toBe(true);
    expect(hasHtmlMarkup('<br/>')).toBe(true);
    expect(hasHtmlMarkup('<span class="x">text</span>')).toBe(true);
  });

  it('returns false for plain text', () => {
    expect(hasHtmlMarkup('Hello world')).toBe(false);
    expect(hasHtmlMarkup('')).toBe(false);
    expect(hasHtmlMarkup('A Customer’s continued use')).toBe(false);
    expect(hasHtmlMarkup('Multi-line\ntext')).toBe(false);
  });

  it('does not match bare angle brackets without a tag name', () => {
    expect(hasHtmlMarkup('5 < 10')).toBe(false);
    expect(hasHtmlMarkup('a < b > c')).toBe(false);
    expect(hasHtmlMarkup('<>')).toBe(false);
  });

  it('does not match ICU-style placeholders', () => {
    expect(hasHtmlMarkup('Hello {name}')).toBe(false);
    expect(hasHtmlMarkup('{count, plural, one {# item} other {# items}}')).toBe(false);
  });
});

describe('resolveContentType', () => {
  it('upgrades plain default to text/html when markup is present', () => {
    expect(resolveContentType('Click <a>here</a>', 'text/plain')).toBe('text/html');
  });

  it('keeps the default when no markup is present', () => {
    expect(resolveContentType('Hello', 'text/plain')).toBe('text/plain');
    expect(resolveContentType('Hello', 'text/html')).toBe('text/html');
  });

  it('returns text/html for markup regardless of the default', () => {
    expect(resolveContentType('<b>bold</b>', 'text/html')).toBe('text/html');
    expect(resolveContentType('<b>bold</b>', 'text/plain')).toBe('text/html');
  });
});
