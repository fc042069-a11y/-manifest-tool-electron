import { proxyRequest } from '@/lib/server-proxy'
import { NextRequest } from 'next/server'
import { Game } from '@/lib/types'
import fs from 'fs/promises'
import path from 'path'

const LIBRARY_PATH = path.join(process.cwd(), 'data', 'library.json')

async function readLibrary(): Promise<Game[]> {
  try {
    const content = await fs.readFile(LIBRARY_PATH, 'utf-8')
    return JSON.parse(content)
  } catch {
    return []
  }
}

async function writeLibrary(games: Game[]): Promise<void> {
  await fs.mkdir(path.dirname(LIBRARY_PATH), { recursive: true })

  await fs.writeFile(
    LIBRARY_PATH,
    JSON.stringify(games, null, 2),
  )
}

// GET /api/download — fetch library
export async function GET() {
  const games = await readLibrary()

  return Response.json({
    games,
    appids: games.map((g) => g.appid),
  })
}

// POST /api/download — proxy request OR library add/remove
export async function POST(request: NextRequest) {
  const payload = await request.json()

  // Library operations
  if (payload?.action === 'add' || payload?.action === 'remove') {
    const { games: incomingGames, action } = payload

    if (!Array.isArray(incomingGames)) {
      return Response.json(
        { error: 'Missing games array' },
        { status: 400 },
      )
    }

    const current = await readLibrary()

    let updated: Game[] = current

    if (action === 'add') {
      const existingIds = new Set(current.map(g => g.appid))

      const newGames = incomingGames
        .filter((g: Game) => !existingIds.has(g.appid))
        .map((g: Game) => ({
          ...g,
          inLibrary: true, // ✅ FORCE TRUE HERE
        }))

      updated = [
        ...current.map(g => ({ ...g, inLibrary: true })), // optional consistency fix
        ...newGames,
      ]
    }

    if (action === 'remove') {
      const removeIds = new Set(incomingGames.map(g => g.appid))

      updated = current
        .filter(g => !removeIds.has(g.appid))
        .map(g => ({
          ...g,
          inLibrary: false, // optional but consistent
        }))
    }

    await writeLibrary(updated)

    return Response.json({
      games: updated,
      appids: updated.map(g => g.appid),
    })
  }

  // Proxy request
  if (!payload?.url) {
    return Response.json(
      { error: 'Missing url or action' },
      { status: 400 },
    )
  }

  try {
    const response = await proxyRequest(payload.url, {
      method: payload.method || 'GET',
      headers: payload.headers,
      body: payload.body,
    })

    return Response.json(response.data)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown server error'

    return Response.json(
      { error: message },
      { status: 500 },
    )
  }
}