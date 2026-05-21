'use client'

import { useApp } from '@/lib/app-context'
import { GameCard } from '@/components/game-card'
import { SearchBar, ActionButtons } from '@/components/search-pagination'
import { useDownloadProgress } from '@/lib/use-download-progress'

export function LibraryPage() {
  const { libraryGames, searchQuery } = useApp()
  const { getDownloadProgress, startDownload, cancelDownload } = useDownloadProgress()

  const filteredGames = libraryGames.filter(game =>
    game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    game.appid.includes(searchQuery)
  )

  const handleDownload = (appid: string) => {
    startDownload(appid)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto p-6">
      <h2 className="text-2xl font-bold text-foreground">Library</h2>

      {/* Search and Actions */}
      <div className="flex items-center gap-4">
        <SearchBar />
        <ActionButtons />
      </div>

      {/* Games Count */}
      <div className="flex items-center justify-center rounded-lg border border-border bg-card p-3">
        <span className="text-sm text-muted-foreground">
          Showing {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Library Games List */}
      <div className="flex flex-col gap-3">
        {filteredGames.length > 0 ? (
          filteredGames.map(game => (
            <GameCard
              key={game.appid}
              game={game}
              downloadProgress={getDownloadProgress(game.appid)}
              onDownload={handleDownload}
              onCancelDownload={cancelDownload}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <p>No games in your library</p>
            <p className="text-sm">Add games from the Games tab to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}
