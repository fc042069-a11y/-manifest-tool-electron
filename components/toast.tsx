'use client'

import { useApp } from '@/lib/app-context'
import { X } from 'lucide-react'

export function Toast() {
  const { toast, hideToast } = useApp()

  if (!toast.visible) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
      <span className="text-sm text-foreground">{toast.message}</span>
      <button
        onClick={hideToast}
        className="flex h-5 w-5 items-center justify-center rounded hover:bg-secondary transition-colors"
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  )
}
