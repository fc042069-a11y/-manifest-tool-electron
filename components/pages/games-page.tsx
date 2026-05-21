'use client'

import { useApp } from '@/lib/app-context'
import { GameCard, GameCardSkeleton } from '@/components/game-card'
import { SearchBar, ActionButtons, Pagination } from '@/components/search-pagination'
import { useDownloadProgress } from '@/lib/use-download-progress'

export function GamesPage() {
  const { games: filteredGames, isLoading } = useApp()
  const { getDownloadProgress, startDownload, cancelDownload } = useDownloadProgress()

  const handleDownload = (appid: string) => {
    startDownload(appid)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto p-6">
      <h2 className="text-2xl font-bold text-foreground">Games</h2>

      {/* Search and Actions */}
      <div className="flex items-center gap-4">
        <SearchBar />
        <ActionButtons />
      </div>

      {/* Pagination */}
      <Pagination />

      {/* Games List */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <>
            <GameCardSkeleton />
            <GameCardSkeleton />
            <GameCardSkeleton />
            <GameCardSkeleton />
          </>
        ) : filteredGames.length > 0 ? (
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
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            No games found
          </div>
        )}
      </div>
    </div>
  )
}
