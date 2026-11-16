'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';

export function CreateMapDialog({
  open,
  onOpenChange,
  projectName,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onCreate(name);
      setName('');
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That map could not be created.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create a map</DialogTitle>
          <DialogDescription>
            A map holds the waypoints and tours for {projectName}. It is stored in the project as{' '}
            .ctour/&lt;name&gt;.tour.json.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="map-name">Map name</Label>
          <Input
            id="map-name"
            value={name}
            placeholder="main"
            onChange={event => setName(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && name.trim()) {
                void submit();
              }
            }}
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy || !name.trim()} onClick={submit}>
            {busy ? 'Creating' : 'Create map'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
