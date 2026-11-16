import { table } from './output';

export type StatusState = 'ok' | 'missing' | 'unreadable' | 'no-map';

export type StatusRow = {
  id: string;
  name: string;
  path: string;
  state: StatusState;
  maps: number | null;
  waypoints: number | null;
  tours: number | null;
  problem: string | null;
};

export type DoctorCheck = {
  id: string;
  target: string;
  ok: boolean;
  reason: string | null;
  fix: string | null;
};

export type DiagnosticReport = { ok: boolean; checks: DoctorCheck[] };

const STATUS_VERSION = 1;

function amount(value: number | null): string {
  return value === null ? '-' : String(value);
}

export function statusTable(rows: StatusRow[]): string {
  const header = ['NAME', 'STATE', 'MAPS', 'WAYPOINTS', 'TOURS', 'PATH'];
  const body = rows.map(row => [
    row.name,
    row.state,
    amount(row.maps),
    amount(row.waypoints),
    amount(row.tours),
    row.path,
  ]);
  return table([header, ...body]);
}

export function toStatusJson(rows: StatusRow[]): string {
  return JSON.stringify({ version: STATUS_VERSION, projects: rows }, null, 2);
}

export function doctorLines(report: DiagnosticReport): string[] {
  const lines = report.checks.flatMap(check => {
    const head = `${check.ok ? 'ok  ' : 'FAIL'}  ${check.id.padEnd(16)}  ${check.target}`;
    if (check.ok) {
      return [head];
    }
    const detail = [check.reason ? `${head}: ${check.reason}` : head];
    if (check.fix) {
      detail.push(`      fix: ${check.fix}`);
    }
    return detail;
  });
  return lines;
}

export function toDoctorJson(report: DiagnosticReport): string {
  return JSON.stringify({ version: STATUS_VERSION, ok: report.ok, checks: report.checks }, null, 2);
}

export function isReportOk(checks: DoctorCheck[]): boolean {
  return checks.every(check => check.ok);
}
