'use client'

import { useApp } from '@/lib/app-context'
import { GamesPage } from '@/components/pages/games-page'
import { LibraryPage } from '@/components/pages/library-page'
import { SettingsPage } from '@/components/pages/settings-page'

export function MainContent() {
  const { currentNav } = useApp()

  switch (currentNav) {
    case 'games':
      return <GamesPage />
    case 'library':
      return <LibraryPage />
    case 'settings':
      return <SettingsPage />
    default:
      return <GamesPage />
  }
}
