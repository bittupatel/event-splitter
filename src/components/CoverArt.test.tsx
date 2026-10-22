import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CoverArt } from './CoverArt';
import { THEME_KEYS } from '@/lib/themes';

describe('CoverArt', () => {
  for (const theme of THEME_KEYS) {
    it(`renders the ${theme} theme cleanly and deterministically`, () => {
      const a = renderToStaticMarkup(<CoverArt theme={theme} seed="abc-123" />);
      const b = renderToStaticMarkup(<CoverArt theme={theme} seed="abc-123" />);
      expect(a).toBe(b);
      expect(a.startsWith('<svg')).toBe(true);
      expect(a).not.toMatch(/NaN|undefined|Infinity/);
      expect(a.length).toBeGreaterThan(800);
    });
  }

  it('varies with the seed', () => {
    expect(renderToStaticMarkup(<CoverArt theme="lantern" seed="one" />)).not.toBe(
      renderToStaticMarkup(<CoverArt theme="lantern" seed="two" />),
    );
  });

  it('falls back to a valid theme for unknown keys', () => {
    expect(renderToStaticMarkup(<CoverArt theme="nope" seed="x" />)).toContain('<svg');
  });
});
