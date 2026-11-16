export function table(rows: string[][]): string {
  const widths = rows.reduce<number[]>((current, row) => {
    row.forEach((cell, index) => {
      current[index] = Math.max(current[index] ?? 0, cell.length);
    });
    return current;
  }, []);
  return rows
    .map(row =>
      row
        .map((cell, index) => (index === row.length - 1 ? cell : cell.padEnd(widths[index])))
        .join('  ')
        .trimEnd()
    )
    .join('\n');
}

export function pairs(entries: Array<[string, string]>): string {
  const width = entries.reduce((current, [key]) => Math.max(current, key.length), 0);
  return entries.map(([key, value]) => `${key.padEnd(width)}  ${value}`).join('\n');
}

export function line(text: string): void {
  process.stdout.write(`${text}\n`);
}

export function fail(text: string): void {
  process.stderr.write(`${text}\n`);
}
