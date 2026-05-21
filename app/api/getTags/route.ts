import { proxyRequest } from '@/lib/server-proxy'

const API_BASE = 'https://generator.ryuu.lol/files'

function extractTagsFromGame(game: any): string[] {
  const tags = new Set<string>()

  // common patterns in game manifests
  if (Array.isArray(game.tags)) {
    for (const t of game.tags) if (t) tags.add(String(t))
  }

  if (game.tags && typeof game.tags === 'object' && !Array.isArray(game.tags)) {
    // object with tagName: true
    for (const [k, v] of Object.entries(game.tags)) if (v) tags.add(k)
  }

  if (Array.isArray(game.genres)) {
    for (const t of game.genres) if (t) tags.add(String(t))
  }

  if (Array.isArray(game.categories)) {
    for (const t of game.categories) if (t) tags.add(String(t))
  }

  // fallback fields
  if (typeof game.tags_string === 'string') {
    for (const t of game.tags_string.split(',').map((s: string) => s.trim()).filter(Boolean)) tags.add(t)
  }

  if (typeof game.type === 'string') tags.add(game.type)

  return Array.from(tags)
}

export async function GET() {
  try {
    const resp = await proxyRequest(`${API_BASE}/games.json`)
    const allGames = resp.data as any[]

    const tagSet = new Set<string>()
    for (const g of allGames) {
      const tags = extractTagsFromGame(g)
      for (const t of tags) tagSet.add(t)
    }

    const tags = Array.from(tagSet).sort((a, b) => a.localeCompare(b))

    return Response.json({ tags })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return Response.json({ error: message }, { status: 500 })
  }
}
