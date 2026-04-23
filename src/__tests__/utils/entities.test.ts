import { describe, it, expect } from 'vitest';
import { normalizeEntities } from '#utils/entities.js';

const NBSP = ' ';

describe('normalizeEntities', () => {
  describe('when source has no entities', () => {
    it('returns translated unchanged when translated also has no entities', () => {
      expect(normalizeEntities('Hello world', 'Ciao mondo')).toBe('Ciao mondo');
    });

    it('decodes &nbsp; inserted by the translator', () => {
      const result = normalizeEntities(
        'Is Lara Translate free to use?',
        'Lara&nbsp;Translate è gratuito?'
      );
      expect(result).toBe(`Lara${NBSP}Translate è gratuito?`);
    });

    it('decodes &amp; into an ampersand', () => {
      expect(normalizeEntities('Terms and conditions', 'Termini &amp; condizioni')).toBe(
        'Termini & condizioni'
      );
    });

    it('decodes &lt; &gt; &quot; &apos;', () => {
      expect(normalizeEntities('a b c d', '&lt;&gt;&quot;&apos;')).toBe('<>"\'');
    });

    it('decodes named entities case-insensitively', () => {
      expect(normalizeEntities('x', '&AMP;&NbSp;')).toBe(`&${NBSP}`);
    });

    it('decodes decimal numeric entities', () => {
      expect(normalizeEntities("Don't go", 'Non &#39; andare')).toBe("Non ' andare");
    });

    it('decodes hex numeric entities', () => {
      expect(normalizeEntities('space', '&#xa0;&#x26;')).toBe(`${NBSP}&`);
    });

    it('decodes hex numeric entities with uppercase X', () => {
      expect(normalizeEntities('angle', '&#X3C;&#XA0;')).toBe(`<${NBSP}`);
    });

    it('leaves unknown named entities untouched', () => {
      expect(normalizeEntities('foo', 'bar &notARealEntity; baz')).toBe('bar &notARealEntity; baz');
    });

    it('leaves out-of-range numeric entities untouched', () => {
      expect(normalizeEntities('foo', '&#9999999999;')).toBe('&#9999999999;');
    });

    it('does not treat URL query strings as entities (no trailing semicolon)', () => {
      const url = 'https://example.com/?foo=1&bar=2';
      expect(normalizeEntities('link', url)).toBe(url);
    });
  });

  describe('when source already contains entities', () => {
    it('returns translated verbatim so user-authored markup is preserved', () => {
      const source = 'Read our &amp; conditions';
      const translated = 'Leggi le nostre &amp; condizioni';
      expect(normalizeEntities(source, translated)).toBe(translated);
    });

    it('preserves spurious entities the translator adds when source is already markup-like', () => {
      const source = '<b>Hello</b> &amp; welcome';
      const translated = '<b>Ciao</b>&nbsp;&amp; benvenuto';
      expect(normalizeEntities(source, translated)).toBe(translated);
    });
  });

  it('is stable across repeated calls (regex state is not leaked)', () => {
    const source = 'plain';
    const translated = 'foo &nbsp; bar';
    const first = normalizeEntities(source, translated);
    const second = normalizeEntities(source, translated);
    expect(first).toBe(second);
    expect(first).toBe(`foo ${NBSP} bar`);
  });
});
