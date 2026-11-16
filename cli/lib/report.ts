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

export type WorkspaceExportReport = {
  path: string;
  projects: number;
  maps: number;
  lastView: string | null;
  recoveredFrom: string | null;
};

export type WorkspaceProjectLine = {
  name: string;
  action: string;
  folder: string | null;
  recorded: string | null;
  text: string;
  maps: number;
};

export type WorkspaceImportReport = {
  file: string;
  added: number;
  alreadyAdded: number;
  missing: number;
  skipped: number;
  mapsWritten: number;
  lastViewApplied: boolean;
  lastView: string | null;
  lastViewNote: string | null;
  projects: WorkspaceProjectLine[];
};

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

export function workspaceExportLines(report: WorkspaceExportReport): string[] {
  const lines: string[] = [];
  if (report.recoveredFrom) {
    lines.push(`from     the workspace was damaged; moved to ${report.recoveredFrom}`);
  }
  lines.push(`wrote    ${report.path}`);
  const parts = [`${report.projects} projects`, `${report.maps} maps`];
  if (report.lastView) {
    parts.push(`last view ${report.lastView}`);
  }
  lines.push(parts.join(', '));
  return lines;
}

export function toWorkspaceExportJson(report: WorkspaceExportReport): string {
  return JSON.stringify(
    {
      path: report.path,
      projects: report.projects,
      maps: report.maps,
      lastView: report.lastView,
    },
    null,
    2
  );
}

function mapsFor(project: WorkspaceProjectLine): string {
  return `${project.maps} ${project.maps === 1 ? 'map' : 'maps'}`;
}

export function workspaceImportLines(report: WorkspaceImportReport): string[] {
  const entries = report.projects.filter(project => project.action !== 'ignored-flag');
  const flagLines = report.projects.filter(project => project.action === 'ignored-flag');
  const actionWidth = entries.reduce((width, project) => Math.max(width, project.action.length), 0) + 2;
  const nameWidth = entries.reduce((width, project) => Math.max(width, project.name.length), 0) + 2;
  const lines: string[] = [];

  for (const project of entries) {
    const head = `${project.action.padEnd(actionWidth)}${project.name.padEnd(nameWidth)}`;
    if (project.action === 'add' || project.action === 'relink') {
      lines.push(`${head}${project.folder ?? ''}  ${mapsFor(project)}`);
      continue;
    }
    if (project.action === 'already-added') {
      lines.push(`${head}${project.folder ?? ''}  already in your workspace`);
      continue;
    }
    if (project.action === 'missing-folder') {
      lines.push(`${head}${project.text}`);
      lines.push(`${' '.repeat(actionWidth + nameWidth)}rerun with --project ${project.name}=<folder>`);
      continue;
    }
    lines.push(`${head}${project.text}`);
  }

  for (const project of flagLines) {
    lines.push(`note       ${project.name}: ${project.text}`);
  }

  if (report.lastViewApplied && report.lastView) {
    lines.push(`last view  ${report.lastView}`);
  } else if (report.lastViewNote) {
    lines.push(`last view  ${report.lastViewNote}`);
  }

  const left = report.missing + report.skipped;
  const projectWord = report.added === 1 ? 'project' : 'projects';
  const mapWord = report.mapsWritten === 1 ? 'map' : 'maps';
  lines.push(`${report.added} ${projectWord} added, ${report.mapsWritten} ${mapWord} copied, ${left} left out`);
  return lines;
}

export function toWorkspaceImportJson(report: WorkspaceImportReport): string {
  return JSON.stringify(
    {
      added: report.added,
      alreadyAdded: report.alreadyAdded,
      missing: report.missing,
      skipped: report.skipped,
      mapsWritten: report.mapsWritten,
      lastViewApplied: report.lastViewApplied,
      projects: report.projects.map(project => ({
        name: project.name,
        action: project.action,
        folder: project.folder,
        text: project.text,
      })),
    },
    null,
    2
  );
}
