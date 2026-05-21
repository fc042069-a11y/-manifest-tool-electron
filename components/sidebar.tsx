'use client'

import { useApp } from '@/lib/app-context'
import {
  Gamepad2,
  Library,
  Settings,
  ChevronLeft,
} from 'lucide-react'
import { NavItem } from '@/lib/types'
import { cn } from '@/lib/utils'

const mockUser = {
  username: 'zephyr_99_',
  role: 'Reseller',
  id: '129113301648330527',
}

const navItems: { id: NavItem; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { currentNav, setCurrentNav, isSidebarCollapsed, toggleSidebar } = useApp()

  return (
    <aside
      className={cn(
        'flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 relative',
        isSidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Collapse Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <ChevronLeft
          className={cn(
            'h-4 w-4 transition-transform',
            isSidebarCollapsed && 'rotate-180'
          )}
        />
      </button>

      {/* User Profile */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
            {mockUser.username.charAt(0).toUpperCase()}
          </div>
          {!isSidebarCollapsed && (
            <div className="overflow-hidden">
              <p className="font-medium text-sm text-sidebar-foreground truncate">
                {mockUser.username}
              </p>
              <p className="text-xs text-muted-foreground">{mockUser.role}</p>
              <p className="text-xs text-muted-foreground truncate">
                ID: {mockUser.id}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = currentNav === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentNav(item.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer hint */}
      {!isSidebarCollapsed && (
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-muted-foreground">
            Press Ctrl+F to quickly jump to search
          </p>
        </div>
      )}
    </aside>
  )
}
