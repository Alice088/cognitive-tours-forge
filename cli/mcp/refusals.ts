export type RefusalCode =
  | 'project-unknown'
  | 'project-ambiguous'
  | 'project-gone'
  | 'workspace-unreadable'
  | 'map-unknown'
  | 'map-required'
  | 'map-missing'
  | 'map-unreadable'
  | 'map-changed'
  | 'type-unknown'
  | 'label-empty'
  | 'waypoint-unknown'
  | 'waypoint-ambiguous'
  | 'nothing-to-update'
  | 'self-link'
  | 'link-unknown'
  | 'stop-unknown'
  | 'stop-duplicate'
  | 'tour-unknown'
  | 'name-empty'
  | 'path-outside'
  | 'invalid-argument';

const SENTENCES: Record<RefusalCode, string> = {
  'project-unknown': 'no project matches "{detail}"',
  'project-ambiguous': '"{detail}" matches more than one project',
  'project-gone': 'the folder for "{detail}" is gone',
  'workspace-unreadable': '{detail} cannot be read',
  'map-unknown': 'no map named "{detail}"',
  'map-required': '"{detail}" holds more than one map, so name one',
  'map-missing': 'the map "{detail}" is gone',
  'map-unreadable': '{detail}',
  'map-changed': 'the map "{detail}" changed after it was read',
  'type-unknown': '"{detail}" is not a waypoint type',
  'label-empty': 'a waypoint needs a label',
  'waypoint-unknown': 'no waypoint matches "{detail}"',
  'waypoint-ambiguous': '"{detail}" matches more than one waypoint',
  'nothing-to-update': 'nothing to change',
  'self-link': 'a waypoint cannot link to itself',
  'link-unknown': 'no link runs from "{detail}"',
  'stop-unknown': 'no waypoint matches "{detail}" as a tour stop',
  'stop-duplicate': '"{detail}" appears twice in the tour',
  'tour-unknown': 'no tour matches "{detail}"',
  'name-empty': 'a tour needs a name',
  'path-outside': '"{detail}" is outside the project',
  'invalid-argument': '{detail}',
};

export type RefusalDetails = {
  allowed?: string[];
  state?: string;
  map?: unknown;
};

export class Refusal extends Error {
  readonly code: RefusalCode;
  readonly allowed: string[];
  readonly state: string | undefined;
  readonly map: unknown;

  constructor(code: RefusalCode, detail: string, details: RefusalDetails = {}) {
    super(SENTENCES[code].replace('{detail}', detail));
    this.name = 'Refusal';
    this.code = code;
    this.allowed = details.allowed ?? [];
    this.state = details.state;
    this.map = details.map;
  }
}

export function refusalText(refusal: Refusal): string {
  const sentence = `${refusal.message}.`;
  return refusal.allowed.length > 0 ? `${sentence} Valid: ${refusal.allowed.join(', ')}.` : sentence;
}

export function toStructured(refusal: Refusal): Record<string, unknown> {
  const structured: Record<string, unknown> = { code: refusal.code, message: refusal.message };
  if (refusal.allowed.length > 0) {
    structured.allowed = refusal.allowed;
  }
  if (refusal.state !== undefined) {
    structured.state = refusal.state;
  }
  if (refusal.map !== undefined) {
    structured.map = refusal.map;
  }
  return structured;
}
