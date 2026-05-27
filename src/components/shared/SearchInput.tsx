'use client';

import { useId } from 'react';
import { Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
}: SearchInputProps) {
  const id = useId();
  return (
    <div className={cn('relative w-full', className)}>
      <Search
        className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-text-muted"
        aria-hidden="true"
      />
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="ps-9"
      />
    </div>
  );
}
