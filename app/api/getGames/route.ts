import { proxyRequest } from '@/lib/server-proxy'
import { NextRequest } from 'next/server'

const API_BASE = 'https://generator.ryuu.lol/files'

function extractTagsFromGame(game: any): string[] {
  const tags = new Set<string>()

  if (Array.isArray(game.tags)) {
    for (const t of game.tags) if (t) tags.add(String(t))
  }

  if (game.tags && typeof game.tags === 'object' && !Array.isArray(game.tags)) {
    for (const [k, v] of Object.entries(game.tags)) if (v) tags.add(k)
  }

  if (Array.isArray(game.genres)) {
    for (const t of game.genres) if (t) tags.add(String(t))
  }

  if (Array.isArray(game.categories)) {
    for (const t of game.categories) if (t) tags.add(String(t))
  }

  if (typeof game.tags_string === 'string') {
    for (const t of game.tags_string.split(',').map((s: string) => s.trim()).filter(Boolean)) tags.add(t)
  }

  return Array.from(tags)
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get('perPage')) || 25))
    // filter semantics:
    // - `filters=dlc,nsfw` => include only items present in any of these arrays (union)
    // - `filter=dlc` => same as single `filters`
    // - `exclude=nsfw,delisted` => remove items present in any of these arrays
    const filtersParam = (searchParams.get('filters') || searchParams.get('filter') || '').toLowerCase().trim()
    const excludeParam = (searchParams.get('exclude') || '').toLowerCase().trim()
    const typesParam = (searchParams.get('types') || searchParams.get('type') || '').trim()
    const tagsParam = (searchParams.get('tags') || '').trim()
    
    const response = await proxyRequest(`${API_BASE}/games.json`)
    let allGames = response.data as any[]

    // Apply optional type filter first (server-side)
    if (typesParam) {
      const wanted = new Set(typesParam.split(',').map(s => s.trim().toLowerCase()).filter(Boolean))
      if (wanted.size > 0) {
        allGames = allGames.filter(g => {
          const t = String(g.type ?? g.type_name ?? g.app_type ?? '').toLowerCase()
          return wanted.has(t)
        })
      }
    }

    // Apply tag filtering - games must have ALL selected tags
    if (tagsParam) {
      const wantedTags = tagsParam.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      if (wantedTags.length > 0) {
        allGames = allGames.filter(g => {
          const gameTags = extractTagsFromGame(g).map(t => t.toLowerCase())
          return wantedTags.every(tag => gameTags.includes(tag))
        })
      }
    }

    // Apply optional filters before pagination
    if (filtersParam || excludeParam) {
      try {
        const filtersResp = await proxyRequest(`${API_BASE}/filter.json`)
        const filters = filtersResp.data || {}

        const makeSetFor = (key: string) => Array.isArray(filters[key]) ? new Set(filters[key].map(String)) : new Set<string>()

        // Build include set (union of requested filter arrays)
        let includeSet: Set<string> | null = null
        if (filtersParam) {
          const keys = filtersParam.split(',').map(s => s.trim()).filter(Boolean)
          includeSet = new Set<string>()
          for (const k of keys) {
            const s = makeSetFor(k)
            for (const v of s) includeSet.add(v)
          }
        }

        // Build exclude set (union)
        let excludeSet: Set<string> | null = null
        if (excludeParam) {
          const keys = excludeParam.split(',').map(s => s.trim()).filter(Boolean)
          excludeSet = new Set<string>()
          for (const k of keys) {
            const s = makeSetFor(k)
            for (const v of s) excludeSet.add(v)
          }
        }

        allGames = allGames.filter(g => {
          const id = String(g.appid ?? g.id ?? '')
          if (excludeSet && excludeSet.has(id)) return false
          if (includeSet) return includeSet.has(id)
          return true
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown filter fetch error'
        return Response.json({ error: message }, { status: 500 })
      }
    }
    
    const startIdx = (page - 1) * perPage
    const endIdx = startIdx + perPage
    const paginatedGames = allGames.slice(startIdx, endIdx)
    
    return Response.json({
      games: paginatedGames,
      page,
      perPage,
      total: allGames.length,
      totalPages: Math.ceil(allGames.length / perPage),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return Response.json({ error: message }, { status: 500 })
  }
}
