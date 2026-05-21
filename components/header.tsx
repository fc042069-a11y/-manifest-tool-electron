'use client'

import { Minus, X } from 'lucide-react'

export function Header() {
  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-semibold text-foreground">
          {"Ryuu's Manifest Tool"}
        </h1>
        <span className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
          v1.3.2
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button className="flex h-8 w-8 items-center justify-center rounded hover:bg-secondary transition-colors">
          <Minus className="h-4 w-4 text-muted-foreground" />
        </button>
        <button className="flex h-8 w-8 items-center justify-center rounded hover:bg-destructive hover:text-destructive-foreground transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  )
}
