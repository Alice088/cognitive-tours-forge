import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { workspaceHome } from '@/app/lib/workspace/registry';
import { WorkspaceError } from '@/app/lib/workspace/service';
import { prepareProject } from '../commands/init';
import { resolveServeTarget, startServing } from '../commands/serve';
import { buildStatus } from '../commands/status';
import { runDoctor } from '../commands/doctor';
import { installAgent, serveProtocol } from '../commands/mcp';
import { exportWorkspace, importWorkspace } from '../commands/workspace';
import { fail, line } from './output';
import {
  doctorLines,
  statusTable,
  toDoctorJson,
  toStatusJson,
  toWorkspaceExportJson,
  toWorkspaceImportJson,
  workspaceExportLines,
  workspaceImportLines,
} from './report';
import { findPackageRoot } from './server';
import { NoPortError } from './port';
import { TargetError } from './target';
import { VERSION } from './version';

export class UsageError extends Error {}

const COMMANDS = ['init', 'serve', 'status', 'doctor', 'mcp', 'workspace'] as const;
type CommandName = (typeof COMMANDS)[number];

export const HELP = `ctour ${VERSION}

  init [folder]     create .ctour/ with a map, register the project, open the interface
  serve [project]   open the interface without creating anything
  status            list the registered projects and their maps
  doctor            check folders, maps and the workspace; fix nothing
  mcp               speak the map protocol on standard input and output
  mcp install       connect the agent found on this machine
  workspace export  write this machine's workspace to one file
  workspace import  bring such a file into this machine

options
  --port <n>        the first address to try (init, serve)
  --project <n>=<f> point a project at a folder (workspace import)
  --skip <name>     leave a project out (workspace import)
  --json            machine-readable output (status, doctor, workspace)
  --help            this list
  --version         the version`;

type Parsed = {
  command: CommandName | null;
  argument: string | undefined;
  rest: string[];
  port: number | undefined;
  projects: string[];
  skips: string[];
  json: boolean;
  help: boolean;
  version: boolean;
};

export function parseArgs(argv: string[]): Parsed {
  const parsed: Parsed = {
    command: null,
    argument: undefined,
    rest: [],
    port: undefined,
    projects: [],
    skips: [],
    json: false,
    help: false,
    version: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      parsed.help = true;
    } else if (token === '--version' || token === '-v') {
      parsed.version = true;
    } else if (token === '--json') {
      parsed.json = true;
    } else if (token === '--port') {
      const value = argv[index + 1];
      const port = Number(value);
      if (!value || !Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new UsageError('--port needs a number between 1 and 65535');
      }
      parsed.port = port;
      index += 1;
    } else if (token === '--project') {
      const value = argv[index + 1];
      const separator = value ? value.indexOf('=') : -1;
      if (!value || separator <= 0 || separator === value.length - 1) {
        throw new UsageError('--project needs name=folder');
      }
      parsed.projects.push(value);
      index += 1;
    } else if (token === '--skip') {
      const value = argv[index + 1];
      if (!value) {
        throw new UsageError('--skip needs a project name');
      }
      parsed.skips.push(value);
      index += 1;
    } else if (token.startsWith('-')) {
      throw new UsageError(`unknown option ${token}`);
    } else if (parsed.command === null) {
      if (!COMMANDS.includes(token as CommandName)) {
        throw new UsageError(`unknown command ${token}`);
      }
      parsed.command = token as CommandName;
    } else if (parsed.argument === undefined) {
      parsed.argument = token;
    } else if (parsed.command === 'workspace') {
      parsed.rest.push(token);
    } else {
      throw new UsageError(`unexpected argument ${token}`);
    }
  }

  if (parsed.json && !['status', 'doctor', 'workspace'].includes(parsed.command ?? '')) {
    throw new UsageError('--json works with status, doctor and workspace');
  }

  return parsed;
}

function exitCodeFor(error: unknown): number {
  if (error instanceof UsageError) {
    return 2;
  }
  if (error instanceof WorkspaceError) {
    return error.code === 'unknown-project' ? 2 : 3;
  }
  if (error instanceof NoPortError) {
    return 4;
  }
  if (error instanceof TargetError) {
    return 3;
  }
  return 3;
}

export type Overrides = { cwd?: string; home?: string; userHome?: string; packageRoot?: string };

async function runWorkspace(parsed: Parsed, context: { home: string; cwd: string }): Promise<number> {
  const subcommand = parsed.argument;
  if (parsed.rest.length > 1) {
    throw new UsageError('workspace takes one file');
  }

  if (subcommand === 'export') {
    if (parsed.projects.length > 0 || parsed.skips.length > 0) {
      throw new UsageError('--project and --skip work with workspace import');
    }
    const report = await exportWorkspace({
      file: parsed.rest[0],
      cwd: context.cwd,
      home: context.home,
    });
    if (parsed.json) {
      line(toWorkspaceExportJson(report));
      return 0;
    }
    line(`ctour ${VERSION}`);
    for (const text of workspaceExportLines(report)) {
      line(text);
    }
    return 0;
  }

  if (subcommand === 'import') {
    if (parsed.rest.length !== 1) {
      throw new UsageError('workspace import needs one file');
    }
    const report = await importWorkspace({
      file: parsed.rest[0],
      projects: parsed.projects,
      skip: parsed.skips,
      cwd: context.cwd,
      home: context.home,
    });
    const leftOut = report.missing + report.skipped;
    if (parsed.json) {
      line(toWorkspaceImportJson(report));
      return leftOut > 0 ? 1 : 0;
    }
    line(`ctour ${VERSION}`);
    for (const text of workspaceImportLines(report)) {
      line(text);
    }
    return leftOut > 0 ? 1 : 0;
  }

  throw new UsageError('workspace needs export or import');
}

async function packageRoot(overrides: Overrides): Promise<string> {
  if (overrides.packageRoot) {
    return overrides.packageRoot;
  }
  return findPackageRoot(path.dirname(fileURLToPath(import.meta.url)));
}

export async function main(argv: string[], overrides: Overrides = {}): Promise<number> {
  const home = overrides.home ?? workspaceHome();
  const userHome = overrides.userHome ?? homedir();
  const cwd = overrides.cwd ?? process.cwd();

  let parsed: Parsed;
  try {
    parsed = parseArgs(argv);
  } catch (error) {
    fail(error instanceof Error ? error.message : 'that command could not be read');
    fail(HELP);
    return 2;
  }

  if (parsed.help) {
    line(HELP);
    return 0;
  }
  if (parsed.version) {
    line(`ctour ${VERSION}`);
    return 0;
  }
  if (!parsed.command) {
    fail('name a command');
    fail(HELP);
    return 2;
  }

  try {
    if (parsed.command === 'init') {
      line(`ctour ${VERSION}`);
      const prepared = await prepareProject(parsed.argument ?? cwd, home);
      if (prepared.recoveredFrom) {
        line(`from     the workspace was damaged; moved to ${prepared.recoveredFrom}`);
      }
      line(`project  ${prepared.project.name}`);
      line(`folder   ${prepared.root}`);
      const relative = path.posix.join('.ctour', prepared.mapFile);
      line(prepared.created ? `map      ${relative}` : `unchanged ${relative}`);
      const root = await packageRoot(overrides);
      return await startServing(prepared.project, {
        port: parsed.port,
        packageRoot: root,
        mapFile: prepared.mapFile,
        onReady: address => {
          line(`serving  ${address.slice(0, address.indexOf('/p/'))}`);
          line(`open     ${address}`);
        },
      });
    }

    if (parsed.command === 'serve') {
      const target = await resolveServeTarget(parsed.argument, cwd, home);
      if (target.recoveredFrom) {
        line(`from     the workspace was damaged; moved to ${target.recoveredFrom}`);
      }
      const root = await packageRoot(overrides);
      return await startServing(target.project, {
        port: parsed.port,
        packageRoot: root,
        onReady: address => {
          if (target.project) {
            line(`project  ${target.project.name}`);
          } else {
            line('note     this folder is not a project yet');
          }
          line(`serving  ${address}`);
          line(`open     ${address}`);
        },
      });
    }

    if (parsed.command === 'mcp') {
      if (parsed.argument === 'install') {
        return await installAgent({ home, userHome });
      }
      if (parsed.argument !== undefined) {
        throw new UsageError(`unknown mcp subcommand ${parsed.argument}`);
      }
      return await serveProtocol({ home });
    }

    if (parsed.command === 'workspace') {
      return await runWorkspace(parsed, { home, cwd });
    }

    if (parsed.command === 'status') {
      const result = await buildStatus(home);
      if (result.workspaceProblem) {
        fail(result.workspaceProblem);
        return 1;
      }
      if (parsed.json) {
        line(toStatusJson(result.rows));
      } else if (result.rows.length === 0) {
        line('no projects yet');
        line('run ctour init in a project folder');
      } else {
        line(statusTable(result.rows));
      }
      return 0;
    }

    const report = await runDoctor(home, userHome);
    if (parsed.json) {
      line(toDoctorJson(report));
    } else {
      for (const text of doctorLines(report)) {
        line(text);
      }
    }
    return report.ok ? 0 : 1;
  } catch (error) {
    fail(error instanceof Error ? error.message : 'that did not work');
    return exitCodeFor(error);
  }
}
