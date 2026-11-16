import path from 'node:path';
import type { MapDocument, Position, Tour, Waypoint } from '@/app/lib/workspace/types';
import {
  checkLabel,
  checkProjectPath,
  checkType,
  commit,
  findTour,
  findWaypoint,
  readStrict,
  readView,
  readProjects,
  resolveMap,
  slugId,
} from './access';
import type { Omitted } from './access';
import { freePosition } from './placement';
import { Refusal, refusalText } from './refusals';

type JsonProperty = {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  nullable?: boolean;
};

export type JsonSchema = {
  type: 'object';
  properties: Record<string, JsonProperty>;
  required: string[];
  additionalProperties: false;
};

export type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: Record<string, unknown>;
  isError: boolean;
};

export type ToolContext = { home: string };

export type Tool = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  run: (input: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
};

const project: JsonProperty = { type: 'string', description: 'Project id, name or absolute folder.' };
const map: JsonProperty = { type: 'string', description: 'Map file name, for example main.tour.json.' };
const state: JsonProperty = { type: 'string', description: 'The state token from the read this change is based on.' };

function schema(properties: Record<string, JsonProperty>, required: string[]): JsonSchema {
  return { type: 'object', properties, required, additionalProperties: false };
}

function describe(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function done(structured: Record<string, unknown>, body: string): ToolResult {
  return { content: [{ type: 'text', text: body }], structuredContent: structured, isError: false };
}

function outcome(commitResult: { changed: boolean }, structured: Record<string, unknown>, body: string): ToolResult {
  return done({ changed: commitResult.changed, ...structured }, body);
}

function field(input: Record<string, unknown>, name: string): unknown {
  return Object.prototype.hasOwnProperty.call(input, name) ? input[name] : undefined;
}

function requiredString(input: Record<string, unknown>, name: string): string {
  const value = field(input, name);
  if (typeof value !== 'string' || value === '') {
    throw new Refusal('invalid-argument', `"${name}" must be a non-empty string`);
  }
  return value;
}

function optionalString(input: Record<string, unknown>, name: string): string | undefined {
  const value = field(input, name);
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return '';
  }
  if (typeof value !== 'string') {
    throw new Refusal('invalid-argument', `"${name}" must be a string`);
  }
  return value;
}

function relativeFile(input: Record<string, unknown>, projectFolder: string): string | undefined {
  const value = field(input, 'file');
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === '') {
    return '';
  }
  if (typeof value !== 'string') {
    throw new Refusal('invalid-argument', '"file" must be a string');
  }
  const inside = checkProjectPath({ id: '', name: '', folder: projectFolder }, value);
  return path.relative(projectFolder, inside).split(path.sep).join('/');
}

function positionOf(value: unknown): Position | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'object' || value === null) {
    throw new Refusal('invalid-argument', '"position" must be an object with numeric x and y');
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.x !== 'number' || typeof candidate.y !== 'number') {
    throw new Refusal('invalid-argument', '"position" must be an object with numeric x and y');
  }
  return { x: candidate.x, y: candidate.y };
}

function stopsOf(value: unknown): Array<{ waypoint: string; narrative?: string }> {
  if (!Array.isArray(value)) {
    throw new Refusal('invalid-argument', '"stops" must be an array');
  }
  return value.map(entry => {
    const stop = (entry ?? {}) as Record<string, unknown>;
    if (typeof stop.waypoint !== 'string' || stop.waypoint === '') {
      throw new Refusal('invalid-argument', 'each stop needs a "waypoint"');
    }
    if (stop.narrative !== undefined && stop.narrative !== null && typeof stop.narrative !== 'string') {
      throw new Refusal('invalid-argument', '"narrative" must be a string');
    }
    const narrative = typeof stop.narrative === 'string' ? stop.narrative : undefined;
    return narrative === undefined ? { waypoint: stop.waypoint } : { waypoint: stop.waypoint, narrative };
  });
}

function stopWaypoint(document: MapDocument, reference: string) {
  try {
    return findWaypoint(document, reference);
  } catch {
    throw new Refusal('stop-unknown', reference);
  }
}

function omittedLine(omitted: Omitted): string {
  const parts: string[] = [];
  if (omitted.waypoints > 0) parts.push(`${omitted.waypoints} waypoints`);
  if (omitted.links > 0) parts.push(`${omitted.links} links`);
  if (omitted.stops > 0) parts.push(`${omitted.stops} stops`);
  if (omitted.paths > 0) parts.push(`${omitted.paths} file paths`);
  if (omitted.unknownTypes > 0) parts.push(`${omitted.unknownTypes} unknown types`);
  return parts.length > 0 ? `left out ${parts.join(', ')}` : 'nothing left out';
}

function waypointLine(document: MapDocument): string {
  return `${document.waypoints.length} waypoints, ${document.edges.length} links, ${document.tours.length} tours`;
}

async function contextFor(input: Record<string, unknown>, context: ToolContext) {
  const target = await resolveMap(
    context.home,
    requiredString(input, 'project'),
    optionalString(input, 'map') || undefined
  );
  return { target, current: await readStrict(target) };
}

export const TOOLS: Tool[] = [
  {
    name: 'list_projects',
    description:
      'Every project this machine knows about, with its folder and the maps it holds. Start here when you do not know which project or map a question is about.',
    inputSchema: schema({}, []),
    async run(input, context) {
      const projects = await readProjects(context.home);
      const body =
        projects.length === 0
          ? 'no projects yet'
          : projects
              .map(entry => {
                const maps = entry.maps.map(one => `${one.file} (${one.waypoints} waypoints, ${one.tours} tours)`);
                const folder = entry.available ? entry.folder : `${entry.folder} (folder gone)`;
                return `${entry.id}  ${entry.name}  ${folder}  ${maps.length > 0 ? maps.join('; ') : 'no maps'}`;
              })
              .join('\n');
      return done({ projects }, body);
    },
  },
  {
    name: 'read_map',
    description:
      'One map in full: every waypoint, link and tour, the state token to send back with a change, and how many entries the reader could not represent. Works whether or not the interface is open.',
    inputSchema: schema({ project, map }, ['project']),
    async run(input, context) {
      const target = await resolveMap(
        context.home,
        requiredString(input, 'project'),
        optionalString(input, 'map') || undefined
      );
      const view = await readView(target);
      const header = [
        `${view.map} in ${view.project}`,
        `state ${view.state}`,
        `saved ${view.savedAt}`,
        waypointLine(view.document),
        omittedLine(view.omitted),
      ].join('\n');
      return done({ ...view }, `${header}\n\n${describe(view.document)}`);
    },
  },
  {
    name: 'create_waypoint',
    description:
      'Adds one waypoint with a label and one of the ten types. The answer carries the new state token. A refusal means nothing was written.',
    inputSchema: schema(
      {
        project,
        map,
        state,
        label: { type: 'string', description: "What the waypoint says, in the person's words." },
        type: { type: 'string', description: 'One of the ten waypoint types.' },
        description: { type: 'string', description: 'What it means, as prose.' },
        notes: { type: 'string', description: 'Anything else worth keeping.' },
        file: { type: 'string', description: 'A path inside the project this waypoint is about.' },
        position: { type: 'object', description: 'Where to draw it. Left out, a free slot is chosen.' },
      },
      ['project', 'state', 'label', 'type']
    ),
    async run(input, context) {
      const { target, current } = await contextFor(input, context);
      const label = checkLabel(field(input, 'label'));
      const type = checkType(field(input, 'type'));
      const waypoint: Waypoint = {
        id: slugId(
          label,
          current.document.waypoints.map(entry => entry.id),
          'w-'
        ),
        label,
        type,
        position: positionOf(field(input, 'position')) ?? freePosition(current.document),
      };
      const description = optionalString(input, 'description');
      if (description !== undefined) waypoint.description = description;
      const notes = optionalString(input, 'notes');
      if (notes !== undefined) waypoint.notes = notes;
      const file = relativeFile(input, target.project.folder);
      if (file !== undefined) waypoint.file = file;

      const document = { ...current.document, waypoints: [...current.document.waypoints, waypoint] };
      const commitResult = await commit(target, document, requiredString(input, 'state'));
      return outcome(
        commitResult,
        { state: commitResult.state, savedAt: commitResult.savedAt, id: waypoint.id, waypoint },
        `added "${waypoint.label}" as ${waypoint.id}, ${waypoint.type}, at ${waypoint.position.x},${waypoint.position.y}`
      );
    },
  },
  {
    name: 'update_waypoint',
    description:
      'Changes only the fields you name on one waypoint. Send null to clear a field. A refusal means nothing was written.',
    inputSchema: schema(
      {
        project,
        map,
        state,
        waypoint: { type: 'string', description: 'Waypoint id or exact label.' },
        label: { type: 'string', description: 'A new label.', nullable: true },
        type: { type: 'string', description: 'A new type.', nullable: true },
        description: { type: 'string', description: 'A new description.', nullable: true },
        notes: { type: 'string', description: 'New notes.', nullable: true },
        file: { type: 'string', description: 'A new path inside the project.', nullable: true },
        position: { type: 'object', description: 'A new position.', nullable: true },
      },
      ['project', 'state', 'waypoint']
    ),
    async run(input, context) {
      const { target, current } = await contextFor(input, context);
      const waypoint = findWaypoint(current.document, requiredString(input, 'waypoint'));
      const names = ['label', 'type', 'description', 'notes', 'file', 'position'];
      const given = names.filter(name => field(input, name) !== undefined);
      if (given.length === 0) {
        throw new Refusal('nothing-to-update', '', { allowed: names });
      }

      const next: Waypoint = { ...waypoint };
      if (given.includes('label')) next.label = checkLabel(field(input, 'label'));
      if (given.includes('type')) next.type = checkType(field(input, 'type'));
      if (given.includes('description')) next.description = optionalString(input, 'description') || undefined;
      if (given.includes('notes')) next.notes = optionalString(input, 'notes') || undefined;
      if (given.includes('file')) {
        const file = relativeFile(input, target.project.folder);
        next.file = file || undefined;
      }
      if (given.includes('position')) {
        const position = positionOf(field(input, 'position'));
        next.position = position ?? next.position;
      }

      const document = {
        ...current.document,
        waypoints: current.document.waypoints.map(entry => (entry.id === waypoint.id ? next : entry)),
      };
      const commitResult = await commit(target, document, requiredString(input, 'state'));
      return outcome(
        commitResult,
        { state: commitResult.state, savedAt: commitResult.savedAt, id: next.id, waypoint: next },
        `changed ${next.id}${given.length > 0 ? `: ${given.join(', ')}` : ''}`
      );
    },
  },
  {
    name: 'delete_waypoint',
    description:
      'Removes one waypoint together with its links and its tour stops, and says how many of each went. A refusal means nothing was written.',
    inputSchema: schema(
      { project, map, state, waypoint: { type: 'string', description: 'Waypoint id or exact label.' } },
      ['project', 'state', 'waypoint']
    ),
    async run(input, context) {
      const { target, current } = await contextFor(input, context);
      const waypoint = findWaypoint(current.document, requiredString(input, 'waypoint'));
      const links = current.document.edges.filter(edge => edge.source === waypoint.id || edge.target === waypoint.id);
      const tours = current.document.tours.map(tour => ({
        ...tour,
        stops: tour.stops.filter(stop => stop.waypointId !== waypoint.id),
      }));
      const stops = current.document.tours.reduce(
        (count, tour) => count + tour.stops.filter(stop => stop.waypointId === waypoint.id).length,
        0
      );
      const document = {
        ...current.document,
        waypoints: current.document.waypoints.filter(entry => entry.id !== waypoint.id),
        edges: current.document.edges.filter(edge => !links.includes(edge)),
        tours,
      };
      const commitResult = await commit(target, document, requiredString(input, 'state'));
      return outcome(
        commitResult,
        {
          state: commitResult.state,
          savedAt: commitResult.savedAt,
          waypoint: waypoint.id,
          removed: { ways: 1, links: links.length, stops },
        },
        `removed ${waypoint.id} with ${links.length} links and ${stops} tour stops`
      );
    },
  },
  {
    name: 'connect_waypoints',
    description: 'Links two waypoints, optionally with a label on the link. A refusal means nothing was written.',
    inputSchema: schema(
      {
        project,
        map,
        state,
        source: { type: 'string', description: 'Waypoint id or exact label.' },
        target: { type: 'string', description: 'Waypoint id or exact label.' },
        label: { type: 'string', description: 'What the link means.' },
      },
      ['project', 'state', 'source', 'target']
    ),
    async run(input, context) {
      const { target: mapTarget, current } = await contextFor(input, context);
      const source = findWaypoint(current.document, requiredString(input, 'source'));
      const destination = findWaypoint(current.document, requiredString(input, 'target'));
      if (source.id === destination.id) {
        throw new Refusal('self-link', source.id);
      }
      const label = optionalString(input, 'label');
      const edge = {
        id: slugId(
          `${source.id}-${destination.id}`,
          current.document.edges.map(entry => entry.id),
          'e-'
        ),
        source: source.id,
        target: destination.id,
        ...(label ? { label } : {}),
      };
      const document = { ...current.document, edges: [...current.document.edges, edge] };
      const commitResult = await commit(mapTarget, document, requiredString(input, 'state'));
      return outcome(
        commitResult,
        { state: commitResult.state, savedAt: commitResult.savedAt, id: edge.id, edge },
        `linked ${source.id} to ${destination.id} as ${edge.id}`
      );
    },
  },
  {
    name: 'disconnect_waypoints',
    description: 'Removes the link between two waypoints. A refusal means nothing was written.',
    inputSchema: schema(
      {
        project,
        map,
        state,
        source: { type: 'string', description: 'Waypoint id or exact label.' },
        target: { type: 'string', description: 'Waypoint id or exact label.' },
      },
      ['project', 'state', 'source', 'target']
    ),
    async run(input, context) {
      const { target: mapTarget, current } = await contextFor(input, context);
      const source = findWaypoint(current.document, requiredString(input, 'source'));
      const destination = findWaypoint(current.document, requiredString(input, 'target'));
      const edge = current.document.edges.find(
        entry =>
          (entry.source === source.id && entry.target === destination.id) ||
          (entry.source === destination.id && entry.target === source.id)
      );
      if (!edge) {
        throw new Refusal('link-unknown', `${source.id} to ${destination.id}`);
      }
      const document = {
        ...current.document,
        edges: current.document.edges.filter(entry => entry.id !== edge.id),
      };
      const commitResult = await commit(mapTarget, document, requiredString(input, 'state'));
      return outcome(
        commitResult,
        { state: commitResult.state, savedAt: commitResult.savedAt, id: edge.id },
        `removed the link ${edge.id}`
      );
    },
  },
  {
    name: 'create_tour',
    description:
      'Creates one empty tour with a name, and optionally a description and an author. Add stops with set_tour_stops.',
    inputSchema: schema(
      {
        project,
        map,
        state,
        name: { type: 'string', description: 'How the tour is called.' },
        description: { type: 'string', description: 'What the walk through the map is for.' },
        author: { type: 'string', description: 'Who wrote it.' },
      },
      ['project', 'state', 'name']
    ),
    async run(input, context) {
      const { target, current } = await contextFor(input, context);
      const name = optionalString(input, 'name')?.trim();
      if (!name) {
        throw new Refusal('name-empty', '');
      }
      const tour: Tour = {
        id: slugId(
          name,
          current.document.tours.map(entry => entry.id),
          't-'
        ),
        name,
        stops: [],
      };
      const description = optionalString(input, 'description');
      if (description) tour.description = description;
      const author = optionalString(input, 'author');
      if (author) tour.author = author;
      const document = { ...current.document, tours: [...current.document.tours, tour] };
      const commitResult = await commit(target, document, requiredString(input, 'state'));
      return outcome(
        commitResult,
        { state: commitResult.state, savedAt: commitResult.savedAt, id: tour.id, tour },
        `created the tour ${tour.id} "${tour.name}"`
      );
    },
  },
  {
    name: 'set_tour_stops',
    description:
      "Replaces a tour's stops, in order, each with an optional narrative. An empty list clears the stops. A refusal means nothing was written.",
    inputSchema: schema(
      {
        project,
        map,
        state,
        tour: { type: 'string', description: 'Tour id or exact name.' },
        stops: { type: 'array', description: 'The complete ordered list: [{ waypoint, narrative }].' },
      },
      ['project', 'state', 'tour', 'stops']
    ),
    async run(input, context) {
      const { target, current } = await contextFor(input, context);
      const tour = findTour(current.document, requiredString(input, 'tour'));
      const requested = stopsOf(field(input, 'stops'));
      const seen: string[] = [];
      const stops = requested.map(stop => {
        const waypoint = stopWaypoint(current.document, stop.waypoint);
        if (seen.includes(waypoint.id)) {
          throw new Refusal('stop-duplicate', waypoint.id);
        }
        seen.push(waypoint.id);
        return stop.narrative === undefined
          ? { waypointId: waypoint.id }
          : { waypointId: waypoint.id, narrative: stop.narrative };
      });
      const next: Tour = { ...tour, stops };
      const document = {
        ...current.document,
        tours: current.document.tours.map(entry => (entry.id === tour.id ? next : entry)),
      };
      const commitResult = await commit(target, document, requiredString(input, 'state'));
      return outcome(
        commitResult,
        { state: commitResult.state, savedAt: commitResult.savedAt, id: tour.id, stops: next.stops },
        `set ${stops.length} stops on ${tour.id}`
      );
    },
  },
];

export function listTools(): Array<{ name: string; description: string; inputSchema: JsonSchema }> {
  return TOOLS.map(tool => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema }));
}

export function checkArguments(schema: JsonSchema, input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Refusal('invalid-argument', 'arguments must be an object');
  }
  const values = input as Record<string, unknown>;
  for (const key of Object.keys(values)) {
    if (!(key in schema.properties)) {
      throw new Refusal('invalid-argument', `unknown argument "${key}"`, {
        allowed: Object.keys(schema.properties),
      });
    }
  }
  for (const key of schema.required) {
    if (values[key] === undefined || values[key] === null) {
      throw new Refusal('invalid-argument', `"${key}" is required`);
    }
  }
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) continue;
    const property = schema.properties[key];
    const expected = property.type;
    const actual = Array.isArray(value) ? 'array' : typeof value;
    if (actual !== expected) {
      throw new Refusal('invalid-argument', `"${key}" must be a ${expected}`);
    }
  }
  return values;
}

export async function callTool(name: string, input: unknown, context: ToolContext): Promise<ToolResult> {
  const tool = TOOLS.find(entry => entry.name === name);
  if (!tool) {
    throw new Refusal('invalid-argument', `unknown tool "${name}"`, { allowed: TOOLS.map(entry => entry.name) });
  }
  const values = checkArguments(tool.inputSchema, input);
  try {
    return await tool.run(values, context);
  } catch (error) {
    if (error instanceof Refusal) {
      const structured: Record<string, unknown> = { code: error.code, message: error.message };
      if (error.allowed.length > 0) structured.allowed = error.allowed;
      if (error.state !== undefined) structured.state = error.state;
      if (error.map !== undefined) structured.map = error.map;
      return {
        content: [{ type: 'text', text: refusalText(error) }],
        structuredContent: structured,
        isError: true,
      };
    }
    throw error;
  }
}

export type { Waypoint, MapDocument };
