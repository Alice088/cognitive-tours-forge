'use client';

import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

const options = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: MonitorIcon },
] as const;

const subscribe = () => () => undefined;

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const active = mounted ? theme : undefined;
  const current = options.find(option => option.value === active) ?? options[2];
  const CurrentIcon = !mounted ? MonitorIcon : resolvedTheme === 'dark' ? MoonIcon : SunIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Theme: ${current.label}`}>
          <CurrentIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map(option => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => setTheme(option.value)}
            aria-checked={theme === option.value}
            role="menuitemradio"
          >
            <option.icon aria-hidden="true" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
