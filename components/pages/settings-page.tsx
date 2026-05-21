'use client'

import { useApp } from '@/lib/app-context'
import { ChevronDown } from 'lucide-react'

export function SettingsPage() {
  const { settings, updateSettings } = useApp()

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-auto p-6">
      <h2 className="text-2xl font-bold text-foreground">Settings</h2>

      {/* Appearance Section */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Appearance</h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Theme</label>
            <div className="relative">
              <select
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value as 'dark' | 'light' })}
                className="h-10 w-full appearance-none rounded-lg border border-border bg-input px-4 pr-10 text-sm text-foreground"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Game Card Size</label>
            <div className="relative">
              <select
                value={settings.gameCardSize}
                onChange={(e) => updateSettings({ gameCardSize: e.target.value as '50%' | '75%' | '100%' })}
                className="h-10 w-full appearance-none rounded-lg border border-border bg-input px-4 pr-10 text-sm text-foreground"
              >
                <option value="50%">50%</option>
                <option value="75%">75% (Default)</option>
                <option value="100%">100%</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>
      </section>

      {/* Paths Section */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Paths</h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Download Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.downloadPath}
                onChange={(e) => updateSettings({ downloadPath: e.target.value })}
                className="h-10 flex-1 rounded-lg border border-border bg-input px-4 text-sm text-foreground"
              />
              <button className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
                Browse...
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* New API Section */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">API Configuration</h3>

        <div className="space-y-4">

          {/* Ryuu API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Ryuu Generator API Key</label>
            <input
              type="password"
              value={settings.ryuuApiKey || ''}
              onChange={(e) => updateSettings({ ryuuApiKey: e.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-input px-4 text-sm text-foreground"
              placeholder="Enter API key"
            />
          </div>

          {/* Proxy */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Proxy</label>
            <input
              type="text"
              value={settings.proxy || ''}
              onChange={(e) => updateSettings({ proxy: e.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-input px-4 text-sm text-foreground"
              placeholder="http://user:pass@host:port"
            />
          </div>

        </div>
      </section>
    </div>
  )
}