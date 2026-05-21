'use client'

import { Game } from '@/lib/types'
import { useApp } from '@/lib/app-context'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { DownloadProgress, formatBytes, formatEta } from '@/lib/use-download-progress'

interface GameCardProps {
  game: Game
  downloadProgress?: DownloadProgress
  onDownload?: (appid: string) => void
  onCancelDownload?: (appid: string) => void
}

export function GameCard({ game, downloadProgress, onDownload, onCancelDownload }: GameCardProps) {
  const { addToLibrary, removeFromLibrary, selectedGameIds, toggleGameSelection, filterData, libraryAppIds } = useApp()
  const [imgError, setImgError] = useState(false)

  const isInLibrary = libraryAppIds.has(game.appid)
  const isDownloading = downloadProgress?.status === 'downloading' || downloadProgress?.status === 'pending'
  const downloadComplete = downloadProgress?.status === 'completed'
  const downloadError = downloadProgress?.status === 'error'

  // Check if game is in special filter categories
  const isNsfw = game.nsfw || (filterData?.nsfw && filterData.nsfw.includes(game.appid))
  const hasDrm = game.drm || (filterData?.drm && filterData.drm.includes(game.appid))
  const isDelisted = filterData?.delisted && filterData.delisted.includes(game.appid)
  const dlcCount = game.dlc ? Object.keys(game.dlc).length : 0

  const handleDownload = () => {
    if (onDownload) {
      onDownload(game.appid)
    }
  }

  useEffect(() => {
    if (downloadComplete && !isInLibrary) {
      addToLibrary(game.appid)
    }
  }, [addToLibrary, downloadComplete, game.appid, isInLibrary])

  const handleCancelDownload = () => {
    if (onCancelDownload) {
      onCancelDownload(game.appid)
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
      <div className="relative">
        <div className="relative h-28 w-52 overflow-hidden rounded bg-secondary">
          <Checkbox
            checked={selectedGameIds.includes(game.appid)}
            onCheckedChange={() => toggleGameSelection(game.appid)}
            className="absolute left-2 top-2 z-20 h-6 w-6 border-2 border-foreground rounded bg-card/95 hover:bg-card/100 cursor-pointer"
            aria-label={`Select ${game.name}`}
          />
          {!imgError ? (
            <Image
              src={game.image}
              alt={game.name}
              fill
              className="object-cover"
              unoptimized
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary text-xs text-muted-foreground">
              No Image
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <h3 className="font-medium text-foreground">{game.name}</h3>
        <p className="text-sm text-muted-foreground">{game.appid}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {game.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
              {tag}
            </span>
          ))}
          {isNsfw && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">
              NSFW
            </span>
          )}
          {hasDrm && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500">
              DRM
            </span>
          )}
          {isDelisted && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              Delisted
            </span>
          )}
          {dlcCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
              {dlcCount} DLC
            </span>
          )}
        </div>
        
        {/* Download Progress Bar */}
        {isDownloading && (
          <div className="mt-2 space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${downloadProgress?.progress ?? 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
              <span>
                {downloadProgress?.status === 'pending' ? 'Starting...' : `${Math.round(downloadProgress?.progress ?? 0)}%`}
              </span>
              {downloadProgress?.totalSize !== undefined && (
                <span>{formatBytes(downloadProgress.totalSize)}</span>
              )}
              {downloadProgress?.speed !== undefined && downloadProgress.speed > 0 && (
                <span>{formatBytes(downloadProgress.speed)}/s</span>
              )}
              {downloadProgress?.eta !== undefined && downloadProgress.eta > 0 && (
                <span>ETA: {formatEta(downloadProgress.eta)}</span>
              )}
            </div>
          </div>
        )}

        {/* Download Error */}
        {downloadError && (
          <div className="mt-2 text-xs text-destructive">
            Download failed: {downloadProgress?.error || 'Unknown error'}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {isDownloading ? (
          <button
            onClick={handleCancelDownload}
            className="rounded bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        ) : downloadComplete || isInLibrary ? (
          <button
            onClick={() => removeFromLibrary(game.appid)}
            className="rounded bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors cursor-pointer"
          >
            Uninstall
          </button>
        ) : (
          <button
            onClick={handleDownload}
            className="rounded bg-success px-6 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 transition-colors cursor-pointer"
          >
            Download
          </button>
        )}
      </div>
    </div>
  )
}

export function GameCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 animate-pulse">
      <div className="h-28 w-52 rounded bg-secondary" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-5 w-48 rounded bg-secondary" />
        <div className="h-4 w-24 rounded bg-secondary" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-20 rounded bg-secondary" />
      </div>
    </div>
  )
}
