import { describe, expect, it } from 'vitest';
import { tourIssues, waypointIssues } from '@/app/lib/workspace/validation';

describe('waypoint validation', () => {
  it('accepts a plain label and a relative path', () => {
    expect(waypointIssues({ label: 'Goal', file: 'app/components/shell/AppShell.tsx' })).toEqual([]);
    expect(waypointIssues({ file: '' })).toEqual([]);
  });

  it('refuses an empty label', () => {
    expect(waypointIssues({ label: '   ' })).toEqual([{ field: 'label', message: 'A waypoint needs a label.' }]);
  });

  it('refuses an absolute path', () => {
    for (const file of ['/etc/passwd', 'C:\\Users\\me\\map.ts', '\\\\server\\share']) {
      const issues = waypointIssues({ file });
      expect(issues, file).toHaveLength(1);
      expect(issues[0].field).toBe('file');
    }
  });

  it('checks nothing it was not given', () => {
    expect(waypointIssues({ notes: 'text' })).toEqual([]);
  });
});

describe('tour validation', () => {
  it('refuses an empty name', () => {
    expect(tourIssues({ name: ' ' })).toEqual([{ field: 'name', message: 'A tour needs a name.' }]);
  });

  it('accepts a name', () => {
    expect(tourIssues({ name: 'Why this exists' })).toEqual([]);
  });
});
