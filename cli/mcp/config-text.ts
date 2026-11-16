export type JsonMember = { key: string; valueStart: number; valueEnd: number };

function skipWhitespace(text: string, index: number): number {
  let cursor = index;
  while (cursor < text.length && /\s/.test(text[cursor])) cursor += 1;
  return cursor;
}

function scanString(text: string, start: number): number {
  let cursor = start + 1;
  while (cursor < text.length) {
    if (text[cursor] === '\\') {
      cursor += 2;
      continue;
    }
    if (text[cursor] === '"') {
      return cursor + 1;
    }
    cursor += 1;
  }
  throw new Error('unterminated string');
}

export function scanValue(text: string, start: number): number {
  const cursor = skipWhitespace(text, start);
  const first = text[cursor];
  if (first === '"') return scanString(text, cursor);
  if (first === '{' || first === '[') {
    let depth = 0;
    let index = cursor;
    while (index < text.length) {
      const character = text[index];
      if (character === '"') {
        index = scanString(text, index);
        continue;
      }
      if (character === '{' || character === '[') depth += 1;
      if (character === '}' || character === ']') {
        depth -= 1;
        if (depth === 0) return index + 1;
      }
      index += 1;
    }
    throw new Error('unterminated value');
  }
  let index = cursor;
  while (index < text.length && !/[,}\]\s]/.test(text[index])) index += 1;
  return index;
}

export function members(text: string, open: number): JsonMember[] {
  const close = scanValue(text, open) - 1;
  const found: JsonMember[] = [];
  let index = open + 1;
  while (index < close) {
    index = skipWhitespace(text, index);
    if (index >= close || text[index] === '}') break;
    if (text[index] === ',') {
      index += 1;
      continue;
    }
    const keyEnd = scanString(text, index);
    const key = JSON.parse(text.slice(index, keyEnd)) as string;
    let cursor = skipWhitespace(text, keyEnd);
    if (text[cursor] !== ':') throw new Error('expected a colon');
    cursor = skipWhitespace(text, cursor + 1);
    const valueEnd = scanValue(text, cursor);
    found.push({ key, valueStart: cursor, valueEnd });
    index = valueEnd;
  }
  return found;
}

export function rootObject(text: string): number {
  const index = skipWhitespace(text, 0);
  if (text[index] !== '{') throw new Error('the file does not start with an object');
  return index;
}

export function findEntry(text: string, path: string[]): { valueStart: number; valueEnd: number } | null {
  let open = rootObject(text);
  let entry: { valueStart: number; valueEnd: number } | null = null;
  for (const key of path) {
    const member = members(text, open).find(one => one.key === key);
    if (!member) return null;
    entry = { valueStart: member.valueStart, valueEnd: member.valueEnd };
    if (key === path[path.length - 1]) break;
    open = member.valueStart;
    if (text[open] !== '{') return null;
  }
  return entry;
}

export function insertEntry(text: string, path: string[], value: unknown): string {
  const encoded = JSON.stringify(value);
  const root = rootObject(text);
  if (path.length === 2) {
    const group = members(text, root).find(member => member.key === path[0]);
    if (group) {
      if (text[group.valueStart] !== '{') {
        throw new Error(`"${path[0]}" is not an object`);
      }
      const open = group.valueStart;
      const inside = members(text, open);
      const insertAt = open + 1;
      const body = inside.length === 0 ? `"${path[1]}": ${encoded}` : `"${path[1]}": ${encoded}, `;
      return `${text.slice(0, insertAt)}${body}${text.slice(insertAt)}`;
    }
    const separator = members(text, root).length > 0 ? ',' : '';
    return `${text.slice(0, root + 1)}"${path[0]}": {"${path[1]}": ${encoded}}${separator} ${text.slice(root + 1)}`;
  }
  throw new Error('unsupported entry path');
}

export function replaceEntry(text: string, path: string[], value: unknown): string {
  const entry = findEntry(text, path);
  if (!entry) throw new Error(`no entry at ${path.join('.')}`);
  return `${text.slice(0, entry.valueStart)}${JSON.stringify(value)}${text.slice(entry.valueEnd)}`;
}

export function verifyJson(before: string, after: string, path: string[], expected: unknown): boolean {
  const previous = JSON.parse(before) as Record<string, unknown>;
  const current = JSON.parse(after) as Record<string, unknown>;
  for (const key of Object.keys(previous)) {
    if (key === path[0]) continue;
    if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) return false;
  }
  const previousGroup = (previous[path[0]] ?? {}) as Record<string, unknown>;
  const currentGroup = (current[path[0]] ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(previousGroup)) {
    if (key === path[1]) continue;
    if (JSON.stringify(previousGroup[key]) !== JSON.stringify(currentGroup[key])) return false;
  }
  return JSON.stringify(currentGroup[path[1]]) === JSON.stringify(expected);
}

export type TomlEntry = { command: string; args: string[] };

export function tomlHeader(entryPath: string[]): string {
  return `[${entryPath.join('.')}]`;
}

export function readTomlEntry(text: string, entryPath: string[]): TomlEntry | null {
  const header = tomlHeader(entryPath);
  const lines = text.split('\n');
  const start = lines.findIndex(line => line.trim() === header);
  if (start === -1) return null;
  let command: string | null = null;
  let args: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line.startsWith('[')) break;
    const commandMatch = line.match(/^command\s*=\s*"([^"]*)"/);
    if (commandMatch) command = commandMatch[1];
    const argsMatch = line.match(/^args\s*=\s*\[(.*)\]/);
    if (argsMatch) {
      args = argsMatch[1]
        .split(',')
        .map(part => part.trim().replace(/^"|"$/g, ''))
        .filter(part => part !== '');
    }
  }
  return command === null ? null : { command, args };
}

export function inlineTomlEntries(text: string): boolean {
  return /^\s*mcp_servers\s*=/m.test(text) || /^\s*mcp_servers\s*\./m.test(text);
}

export function appendTomlEntry(text: string, entryPath: string[], entry: TomlEntry): string {
  const block = [
    tomlHeader(entryPath),
    `command = ${JSON.stringify(entry.command)}`,
    `args = [${entry.args.map(arg => JSON.stringify(arg)).join(', ')}]`,
  ].join('\n');
  const trimmed = text.replace(/\s*$/, '');
  return trimmed === '' ? `${block}\n` : `${trimmed}\n\n${block}\n`;
}

export function replaceTomlEntry(text: string, entryPath: string[], entry: TomlEntry): string {
  const header = tomlHeader(entryPath);
  const lines = text.split('\n');
  const start = lines.findIndex(line => line.trim() === header);
  if (start === -1) throw new Error(`no entry at ${entryPath.join('.')}`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].trim().startsWith('[')) {
      end = index;
      break;
    }
  }
  const block = [
    header,
    `command = ${JSON.stringify(entry.command)}`,
    `args = [${entry.args.map(arg => JSON.stringify(arg)).join(', ')}]`,
  ];
  return [...lines.slice(0, start), ...block, ...lines.slice(end)].join('\n');
}
