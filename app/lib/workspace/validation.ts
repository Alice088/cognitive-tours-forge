import type { Tour, Waypoint } from '@/app/lib/workspace/types';

export interface FieldIssue {
  field: 'label' | 'file' | 'name';
  message: string;
}

export function waypointIssues(patch: Partial<Waypoint>): FieldIssue[] {
  const issues: FieldIssue[] = [];
  if (patch.label !== undefined && patch.label.trim() === '') {
    issues.push({ field: 'label', message: 'A waypoint needs a label.' });
  }
  if (patch.file !== undefined && patch.file.trim() !== '' && isAbsolute(patch.file.trim())) {
    issues.push({
      field: 'file',
      message: 'Give a path relative to the project root, not an absolute one.',
    });
  }
  return issues;
}

export function tourIssues(patch: Partial<Tour>): FieldIssue[] {
  if (patch.name !== undefined && patch.name.trim() === '') {
    return [{ field: 'name', message: 'A tour needs a name.' }];
  }
  return [];
}

function isAbsolute(value: string): boolean {
  return value.startsWith('/') || value.startsWith('\\') || /^[a-zA-Z]:[\\/]/.test(value);
}
