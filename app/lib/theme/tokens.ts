export const WAYPOINT_TYPES = [
  'Goal',
  'User Need',
  'Feature',
  'ADR',
  'Code Component',
  'Test',
  'Risk',
  'AI Instruction',
  'Open Question',
  'Deprecated',
] as const;

export type WaypointType = (typeof WAYPOINT_TYPES)[number];

export const WAYPOINT_TYPE_TOKEN: Record<WaypointType, string> = {
  Goal: 'goal',
  'User Need': 'user-need',
  Feature: 'feature',
  ADR: 'adr',
  'Code Component': 'code-component',
  Test: 'test',
  Risk: 'risk',
  'AI Instruction': 'ai-instruction',
  'Open Question': 'open-question',
  Deprecated: 'deprecated',
};

export type TokenSet = Record<string, string>;

export const TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['foreground', 'background'],
  ['foreground', 'card'],
  ['foreground', 'canvas'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['rail-foreground', 'rail'],
  ['dock-foreground', 'dock'],
  ['muted-foreground', 'muted'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'card'],
  ['muted-foreground', 'canvas'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['accent-foreground', 'accent'],
  ['destructive-foreground', 'destructive'],
  ...Object.values(WAYPOINT_TYPE_TOKEN).map(token => [`waypoint-${token}-foreground`, `waypoint-${token}`] as const),
];

export const UI_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['input', 'background'],
  ['input', 'card'],
  ['ring', 'background'],
  ['ring', 'card'],
  ['ring', 'canvas'],
];

export const TEXT_MINIMUM = 4.5;
export const UI_MINIMUM = 3;

export function parseTokenSets(css: string): { light: TokenSet; dark: TokenSet } {
  const withoutTheme = css.replace(/@theme[^{]*\{[\s\S]*?\n\}/g, '');
  const light = readBlock(withoutTheme, ':root');
  const dark = readBlock(withoutTheme, '.dark');
  return { light, dark };
}

function readBlock(css: string, selector: string): TokenSet {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) {
    return {};
  }
  const open = css.indexOf('{', start);
  const close = css.indexOf('\n}', open);
  const body = css.slice(open + 1, close);
  const tokens: TokenSet = {};
  for (const line of body.split('\n')) {
    const match = line.match(/^\s*--([\w-]+):\s*([^;]+);\s*$/);
    if (match) {
      tokens[match[1]] = match[2].trim();
    }
  }
  return tokens;
}
