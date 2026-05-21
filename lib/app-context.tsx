'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { Game, AppSettings, NavItem, SortOption, TypeFilter, FilterData } from '@/lib/types'
import { getCached, setCache, clearCache } from '@/lib/cache'

const API_BASE = 'https://generator.ryuu.lol/files'

interface AppContextType {
    games: Game[]
    libraryGames: Game[]
    libraryAppIds: Set<string>
    filteredGames: Game[]
    settings: AppSettings
    currentNav: NavItem
    isLoading: boolean
    isSidebarCollapsed: boolean
    searchQuery: string
    currentPage: number
    perPage: number
    totalGames: number
    sortOption: SortOption
    typeFilter: TypeFilter
    showNsfw: boolean
    showDrm: boolean
    showDelisted: boolean
    selectedTags: string[]
    hideLibrary: boolean
    allTags: string[]
    toast: { message: string; visible: boolean }
    filterData: FilterData | null
    setCurrentNav: (nav: NavItem) => void
    toggleSidebar: () => void
    addToLibrary: (appid: string) => void
    removeFromLibrary: (appid: string) => void
    updateSettings: (settings: Partial<AppSettings>) => void
    setSearchQuery: (query: string) => void
    setCurrentPage: (page: number) => void
    setPerPage: (perPage: number) => void
    setSortOption: (option: SortOption) => void
    setTypeFilter: (filter: TypeFilter) => void
    setShowNsfw: (show: boolean) => void
    setShowDrm: (show: boolean) => void
    setShowDelisted: (show: boolean) => void
    setSelectedTags: (tags: string[]) => void
    setHideLibrary: (hide: boolean) => void
    selectedGameIds: string[]
    toggleGameSelection: (appid: string) => void
    clearSelection: () => void
    addSelectedToLibrary: () => void
    refreshGames: () => void
    showToast: (message: string) => void
    hideToast: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const defaultSettings: AppSettings = {
    theme: 'dark',
    gameCardSize: '75%',
    downloadPath: 'G:\\SteamCracked\\',
    proxy: '',
    ryuuApiKey: '',
}

const FILTERS_STORAGE_KEY = 'manifest-tool-filters'

interface StoredFilters {
    sortOption: SortOption
    typeFilter: TypeFilter
    showNsfw: boolean
    showDrm: boolean
    showDelisted: boolean
    selectedTags: string[]
    hideLibrary: boolean
    perPage: number
}

function loadStoredFilters(): Partial<StoredFilters> {
    if (typeof window === 'undefined') return {}
    try {
        const stored = localStorage.getItem(FILTERS_STORAGE_KEY)
        return stored ? JSON.parse(stored) : {}
    } catch {
        return {}
    }
}

function saveFilters(filters: StoredFilters): void {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
    } catch {
        // ignore storage errors
    }
}

export function AppProvider({ children }: { children: ReactNode }) {
    const [allGames, setAllGames] = useState<Game[]>([])
    const [filterData, setFilterData] = useState<FilterData | null>(null)
    const [filtersLoaded, setFiltersLoaded] = useState(false)

    const [libraryAppIds, setLibraryAppIds] = useState<Set<string>>(new Set())
    const [libraryGamesState, setLibraryGamesState] = useState<Game[]>([])

    const [settings, setSettings] = useState<AppSettings>(defaultSettings)
    const [currentNav, setCurrentNav] = useState<NavItem>('games')
    const [isLoading, setIsLoading] = useState(true)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [perPage, setPerPage] = useState(25)
    const [sortOption, setSortOption] = useState<SortOption>('name-asc')
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
    const [showNsfw, setShowNsfw] = useState(false)
    const [showDrm, setShowDrm] = useState(true)
    const [showDelisted, setShowDelisted] = useState(false)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [hideLibrary, setHideLibrary] = useState(false)
    const [selectedGameIds, setSelectedGameIds] = useState<string[]>([])
    const [toast, setToast] = useState({ message: '', visible: false })
    const [allTags, setAllTags] = useState<string[]>([])
    const [totalGameCount, setTotalGameCount] = useState(0)

    // Load stored filters from localStorage on mount
    useEffect(() => {
        const stored = loadStoredFilters()
        if (stored.sortOption) setSortOption(stored.sortOption)
        if (stored.typeFilter) setTypeFilter(stored.typeFilter)
        if (typeof stored.showNsfw === 'boolean') setShowNsfw(stored.showNsfw)
        if (typeof stored.showDrm === 'boolean') setShowDrm(stored.showDrm)
        if (typeof stored.showDelisted === 'boolean') setShowDelisted(stored.showDelisted)
        if (Array.isArray(stored.selectedTags)) setSelectedTags(stored.selectedTags)
        if (typeof stored.hideLibrary === 'boolean') setHideLibrary(stored.hideLibrary)
        if (stored.perPage) setPerPage(stored.perPage)
        setFiltersLoaded(true)
    }, [])

    // Save filters to localStorage whenever they change
    useEffect(() => {
        if (!filtersLoaded) return
        saveFilters({
            sortOption,
            typeFilter,
            showNsfw,
            showDrm,
            showDelisted,
            selectedTags,
            hideLibrary,
            perPage,
        })
    }, [filtersLoaded, sortOption, typeFilter, showNsfw, showDrm, showDelisted, selectedTags, hideLibrary, perPage])

    // Load settings from server on mount
    useEffect(() => {
        fetch('/api/settings')
            .then((r) => r.json())
            .then((data) => {
                if (data && !data.error) {
                    setSettings(prev => ({ ...prev, ...data }))
                }
            })
            .catch((err) => console.error('Failed to load settings:', err))
    }, [])

    useEffect(() => {
        fetch('/api/library')
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data.games)) {
                    setLibraryGamesState(data.games)
                    setLibraryAppIds(new Set(data.games.map((g: Game) => g.appid)))
                }
            })
            .catch((err) => console.error('Failed to load library:', err))
    }, [])

    const fetchTags = useCallback(async () => {
        try {
            const response = await fetch('/api/getTags')
            const data = await response.json()
            setAllTags(data.tags || [])
        } catch (error) {
            console.error('Failed to fetch tags:', error)
        }
    }, [])

    const fetchFilterData = useCallback(async () => {
        try {
            const response = await fetch('/api/getFilters')
            const data: FilterData = await response.json()
            setFilterData(data)
        } catch (error) {
            console.error('Failed to fetch filter data:', error)
        }
    }, [])

    const fetchGames = useCallback(async (page: number = 1, pageSize: number = 25, skipCache: boolean = false) => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams()
            params.set('page', String(page))
            params.set('perPage', String(pageSize))

            const excludeList = []
            if (!showNsfw) excludeList.push('nsfw')
            if (!showDrm) excludeList.push('drm')
            if (!showDelisted) excludeList.push('delisted')
            if (excludeList.length > 0) params.set('exclude', excludeList.join(','))

            if (typeFilter !== 'all') params.set('types', typeFilter)
            if (searchQuery) params.set('query', searchQuery)
            if (selectedTags.length > 0) params.set('tags', selectedTags.join(','))

            const endpoint = searchQuery
                ? `/api/search?${params.toString()}`
                : `/api/getGames?${params.toString()}`

            // Create a cache key based on the query
            const cacheKey = `games:${endpoint}`

            // Try to get cached data if skipCache is false
            if (!skipCache) {
                const cached = getCached<any>(cacheKey)
                if (cached) {
                    console.log('[Cache] Using cached games data')
                    const games: Game[] = (cached.games || cached).map((game: any) => ({
                        appid: game.appid,
                        name: game.name,
                        image: game.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
                        type: game?.type?.toLowerCase() || 'unknown',
                        tags: game.tags || [],
                        nsfw: game.nsfw,
                        drm: game.drm,
                        dlc: game.dlc || {},
                    }))
                    setAllGames(games)
                    setTotalGameCount(cached.total || games.length)
                    setIsLoading(false)
                    return
                }
            }

            // Fetch from API if not cached or skipCache is true
            console.log('[Cache] Fetching games from API')
            const response = await fetch(endpoint)
            const data = await response.json()

            // Cache the response for 1 hour
            setCache(cacheKey, data, 3600000)

            const games: Game[] = (data.games || data).map((game: any) => ({
                appid: game.appid,
                name: game.name,
                image: game.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
                type: game?.type?.toLowerCase() || 'unknown',
                tags: game.tags || [],
                nsfw: game.nsfw,
                drm: game.drm,
                dlc: game.dlc || {},
            }))

            setAllGames(games)
            setTotalGameCount(data.total || games.length)
        } catch (error) {
            console.error('Failed to fetch games:', error)
            showToastMessage('Failed to load games')
        } finally {
            setIsLoading(false)
        }
    }, [searchQuery, showNsfw, showDrm, showDelisted, typeFilter, selectedTags])

    useEffect(() => {
        fetchGames(1, perPage)
        fetchFilterData()
        fetchTags()
    }, []) // eslint-disable-line

    useEffect(() => {
        if (currentPage > 0) {
            fetchGames(currentPage, perPage)
        }
    }, [currentPage, perPage, searchQuery, typeFilter, showNsfw, showDrm, showDelisted, selectedTags, fetchGames])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, typeFilter, showNsfw, showDrm, showDelisted, sortOption, hideLibrary, selectedTags])

    const games = allGames

    const filteredGames = games
        .filter(game => !(hideLibrary && libraryAppIds.has(game.appid)))
        .sort((a, b) => {
            const aInLib = libraryAppIds.has(a.appid)
            const bInLib = libraryAppIds.has(b.appid)
            if (aInLib !== bInLib) return aInLib ? -1 : 1
            switch (sortOption) {
                case 'name-asc': return a.name.localeCompare(b.name)
                case 'name-desc': return b.name.localeCompare(a.name)
                case 'appid-asc': return parseInt(a.appid) - parseInt(b.appid)
                case 'appid-desc': return parseInt(b.appid) - parseInt(a.appid)
                default: return 0
            }
        })

    const libraryGames =
        libraryGamesState.length > 0
            ? libraryGamesState
            : games.filter(game => libraryAppIds.has(game.appid))

    const totalGames = totalGameCount

    const showToastMessage = (message: string) => {
        setToast({ message, visible: true })
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000)
    }

    const toggleSidebar = useCallback(() => {
        setIsSidebarCollapsed(prev => !prev)
    }, [])

    const addToLibrary = useCallback(async (appid: string) => {
        try {
            const game = games.find(g => g.appid === appid)
            if (!game) return

            const res = await fetch('/api/library', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    games: [game],
                }),
            })

            const data = await res.json()

            if (data.games) {
                setLibraryGamesState(data.games)
                setLibraryAppIds(new Set(data.games.map((g: Game) => g.appid)))
            }

            showToastMessage('Game added to library')
        } catch {
            showToastMessage('Failed to add game')
        }
    }, [games])

    const removeFromLibrary = useCallback(async (appid: string) => {
        try {
            const res = await fetch('/api/library', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appids: [appid],
                }),
            })

            const data = await res.json()

            if (data.games) {
                setLibraryGamesState(data.games)
                setLibraryAppIds(new Set(data.games.map((g: Game) => g.appid)))
            }

            showToastMessage('Game removed from library')
        } catch {
            showToastMessage('Failed to remove game')
        }
    }, [])

    const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
        const updated = { ...settings, ...newSettings }
        setSettings(updated)
        // Save to server
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings),
            })
        } catch {
            // ignore save errors
        }
    }, [settings])

    const toggleGameSelection = useCallback((appid: string) => {
        setSelectedGameIds(prev =>
            prev.includes(appid) ? prev.filter(id => id !== appid) : [...prev, appid]
        )
    }, [])

    const clearSelection = useCallback(() => setSelectedGameIds([]), [])

    const addSelectedToLibrary = useCallback(async () => {
        if (selectedGameIds.length === 0) return

        try {
            const selectedGames = games.filter(g =>
                selectedGameIds.includes(g.appid)
            )

            const res = await fetch('/api/library', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    games: selectedGames,
                }),
            })

            const data = await res.json()

            if (data.games) {
                setLibraryGamesState(data.games)
                setLibraryAppIds(new Set(data.games.map((g: Game) => g.appid)))
            }

            showToastMessage(
                `Added ${selectedGameIds.length} selected game${selectedGameIds.length === 1 ? '' : 's'} to library`
            )
        } catch {
            showToastMessage('Failed to add selected games')
        }

        setSelectedGameIds([])
    }, [selectedGameIds, games])

    const refreshGames = useCallback(async () => {
        // Clear all game caches to force refresh
        console.log('[Cache] Clearing game cache')
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key?.startsWith('cache:games:')) {
                localStorage.removeItem(key)
            }
        }
        // Fetch with skipCache=true to bypass any in-memory cache
        await fetchGames(currentPage, perPage, true)
        await fetchFilterData()
    }, [fetchGames, fetchFilterData, currentPage, perPage])

    const showToast = useCallback((message: string) => showToastMessage(message), [])
    const hideToast = useCallback(() => setToast(prev => ({ ...prev, visible: false })), [])

    return (
        <AppContext.Provider
            value={{
                games,
                libraryGames,
                libraryAppIds,
                filteredGames,
                settings,
                currentNav,
                isLoading,
                isSidebarCollapsed,
                searchQuery,
                currentPage,
                perPage,
                totalGames,
                sortOption,
                typeFilter,
                showNsfw,
                showDrm,
                showDelisted,
                selectedTags,
                hideLibrary,
                allTags,
                toast,
                filterData,
                setCurrentNav,
                toggleSidebar,
                addToLibrary,
                removeFromLibrary,
                updateSettings,
                setSearchQuery,
                setCurrentPage,
                setPerPage,
                setSortOption,
                setTypeFilter,
                setShowNsfw,
                setShowDrm,
                setShowDelisted,
                setSelectedTags,
                setHideLibrary,
                selectedGameIds,
                toggleGameSelection,
                clearSelection,
                addSelectedToLibrary,
                refreshGames,
                showToast,
                hideToast,
            }}
        >
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    const context = useContext(AppContext)
    if (!context) throw new Error('useApp must be used within AppProvider')
    return context
}
