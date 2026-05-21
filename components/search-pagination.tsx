'use client'

import { useApp } from '@/lib/app-context'
import { Search, Filter, ArrowUpDown, RefreshCw, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { SortOption, TypeFilter } from '@/lib/types'

const GAMES_PER_PAGE_OPTIONS = [10, 25, 50, 100]

export function SearchBar() {
  const { searchQuery, setSearchQuery } = useApp()
  const inputRef = useRef<HTMLInputElement>(null)

  // Handle Ctrl+F keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search by name or App ID..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-input pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function ActionButtons() {
  const { 
    refreshGames, 
    isLoading, 
    sortOption, 
    setSortOption,
    typeFilter,
    setTypeFilter,
    showNsfw,
    setShowNsfw,
    showDrm,
    setShowDrm,
    showDelisted,
    setShowDelisted,
    hideLibrary,
    setHideLibrary,
    selectedTags,
    setSelectedTags,
    allTags,
    selectedGameIds,
    addSelectedToLibrary,
    clearSelection,
  } = useApp()
  
  const [showFilters, setShowFilters] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const filterRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false)
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSort(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'appid-asc', label: 'App ID (Low to High)' },
    { value: 'appid-desc', label: 'App ID (High to Low)' },
  ]

  const typeOptions: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'application', label: 'Application' },
    { value: 'beta', label: 'Beta' },
    { value: 'config', label: 'Config' },
    { value: 'dlc', label: 'DLC' },
    { value: 'demo', label: 'Demo' },
    { value: 'game', label: 'Game' },
    { value: 'music', label: 'Music' },
    { value: 'tool', label: 'Tool' },
    { value: 'media', label: 'Media' },
  ]

  // Count active filters
  const activeFilters = [
    typeFilter !== 'all',
    showNsfw,
    !showDrm,
    showDelisted,
    hideLibrary,
    selectedTags.length > 0,
  ].filter(Boolean).length

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const filteredTags = allTags.filter(tag => 
    tag.toLowerCase().includes(tagSearch.toLowerCase())
  )

  return (
    <div className="flex items-center gap-2 relative">
      <div className="relative" ref={filterRef}>
        <button 
          onClick={() => {
            setShowFilters(!showFilters)
            setShowSort(false)
          }}
          className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilters > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {activeFilters}
            </span>
          )}
        </button>
        {showFilters && (
          <div className="absolute top-full left-0 mt-2 z-50 w-80 max-h-[80vh] overflow-y-auto rounded-lg border border-border bg-card p-4 shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium text-foreground">Filters</span>
              <button onClick={() => setShowFilters(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                  className="w-full h-9 rounded border border-border bg-input px-2 text-sm text-foreground"
                >
                  {typeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="border-t border-border pt-3 space-y-3">
                <label className="text-sm text-muted-foreground block">Content Filters</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showNsfw"
                    checked={showNsfw}
                    onChange={(e) => setShowNsfw(e.target.checked)}
                    className="rounded border-border h-4 w-4"
                  />
                  <label htmlFor="showNsfw" className="text-sm text-foreground">Show NSFW</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showDrm"
                    checked={showDrm}
                    onChange={(e) => setShowDrm(e.target.checked)}
                    className="rounded border-border h-4 w-4"
                  />
                  <label htmlFor="showDrm" className="text-sm text-foreground">Show DRM Protected</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showDelisted"
                    checked={showDelisted}
                    onChange={(e) => setShowDelisted(e.target.checked)}
                    className="rounded border-border h-4 w-4"
                  />
                  <label htmlFor="showDelisted" className="text-sm text-foreground">Show Delisted</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hideLibrary"
                    checked={hideLibrary}
                    onChange={(e) => setHideLibrary(e.target.checked)}
                    className="rounded border-border h-4 w-4"
                  />
                  <label htmlFor="hideLibrary" className="text-sm text-foreground">Hide in Library</label>
                </div>
              </div>
              <div className="border-t border-border pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">Tags</label>
                  {selectedTags.length > 0 && (
                    <button 
                      onClick={() => setSelectedTags([])}
                      className="text-xs text-primary hover:text-primary/80"
                    >
                      Clear all ({selectedTags.length})
                    </button>
                  )}
                </div>
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground hover:bg-primary/80"
                      >
                        {tag}
                        <X className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search tags..."
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    className="w-full h-8 rounded border border-border bg-input pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {filteredTags.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No tags found</p>
                  ) : (
                    filteredTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-secondary transition-colors ${
                          selectedTags.includes(tag) ? 'text-primary bg-secondary' : 'text-foreground'
                        }`}
                      >
                        {tag}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="relative" ref={sortRef}>
        <button 
          onClick={() => {
            setShowSort(!showSort)
            setShowFilters(false)
          }}
          className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          <ArrowUpDown className="h-4 w-4" />
          Sort
        </button>
        {showSort && (
          <div className="absolute top-full left-0 mt-2 z-50 w-56 rounded-lg border border-border bg-card p-2 shadow-lg">
            {sortOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  setSortOption(opt.value)
                  setShowSort(false)
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-secondary transition-colors ${
                  sortOption === opt.value ? 'text-primary bg-secondary' : 'text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedGameIds.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={addSelectedToLibrary}
            className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 transition-colors"
          >
            Add Selected ({selectedGameIds.length})
          </button>
          <button
            onClick={clearSelection}
            className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Clear Selection
          </button>
        </div>
      )}
      <button
        onClick={refreshGames}
        disabled={isLoading}
        className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? 'Loading...' : 'Refresh'}
      </button>
    </div>
  )
}

export function Pagination() {
  const { currentPage, setCurrentPage, perPage, setPerPage, totalGames } = useApp()
  const totalPages = Math.max(1, Math.ceil(totalGames / perPage))

  return (
    <div className="flex items-center justify-center gap-4 rounded-lg border border-border bg-card p-3">
      <button
        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        &larr; Previous
      </button>
      <div className="flex items-center gap-2">
        <select
          value={perPage}
          onChange={(e) => {
            setPerPage(Number(e.target.value))
            setCurrentPage(1)
          }}
          className="h-8 rounded border border-border bg-input px-2 text-sm text-foreground"
        >
          {GAMES_PER_PAGE_OPTIONS.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">
          of {totalGames.toLocaleString()} games
        </span>
      </div>
      <span className="text-sm text-muted-foreground">|</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Page</span>
        <input
          type="number"
          value={currentPage}
          onChange={(e) => {
            const page = Math.max(1, Math.min(totalPages, Number(e.target.value)))
            setCurrentPage(page)
          }}
          min={1}
          max={totalPages}
          className="h-8 w-16 rounded border border-border bg-input px-2 text-center text-sm text-foreground"
        />
        <span className="text-sm text-muted-foreground">
          of {totalPages.toLocaleString()}
        </span>
      </div>
      <button
        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next &rarr;
      </button>
    </div>
  )
}
