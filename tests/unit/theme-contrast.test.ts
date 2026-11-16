import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '@/app/lib/theme/contrast';
import { TEXT_MINIMUM, TEXT_PAIRS, UI_MINIMUM, UI_PAIRS, parseTokenSets, type TokenSet } from '@/app/lib/theme/tokens';

const css = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');
const sets = parseTokenSets(css);

const modes: Array<[string, TokenSet]> = [
  ['light', sets.light],
  ['dark', sets.dark],
];

describe('design tokens', () => {
  it('defines the same colour tokens in both themes', () => {
    const colors = (tokens: TokenSet) =>
      Object.keys(tokens)
        .filter(key => tokens[key].startsWith('#'))
        .sort();
    const lightKeys = colors(sets.light);
    const darkKeys = colors(sets.dark);
    expect(lightKeys.length).toBeGreaterThan(30);
    expect(darkKeys).toEqual(lightKeys);
  });

  for (const [mode, tokens] of modes) {
    it(`meets AA for text pairs in ${mode}`, () => {
      for (const [foreground, background] of TEXT_PAIRS) {
        const fg = tokens[foreground];
        const bg = tokens[background];
        expect(fg, `${mode} missing --${foreground}`).toBeDefined();
        expect(bg, `${mode} missing --${background}`).toBeDefined();
        const ratio = contrastRatio(fg, bg);
        expect(ratio, `${mode}: --${foreground} on --${background} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
          TEXT_MINIMUM
        );
      }
    });

    it(`meets 3:1 for interactive borders in ${mode}`, () => {
      for (const [foreground, background] of UI_PAIRS) {
        const fg = tokens[foreground];
        const bg = tokens[background];
        expect(fg, `${mode} missing --${foreground}`).toBeDefined();
        expect(bg, `${mode} missing --${background}`).toBeDefined();
        const ratio = contrastRatio(fg, bg);
        expect(ratio, `${mode}: --${foreground} on --${background} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
          UI_MINIMUM
        );
      }
    });
  }
});
