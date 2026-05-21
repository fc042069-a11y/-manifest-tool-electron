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
  await fs.writeFile(LIBRARY_PATH, JSON.stringify(games, null, 2))
}

// GET /api/library - Get all library games
export async function GET() {
  const games = await readLibrary()

  return Response.json({
    games,
    appids: games.map((g) => g.appid),
    total: games.length,
  })
}

// POST /api/library - Add games to library
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const { games: incomingGames } = payload

    if (!Array.isArray(incomingGames)) {
      return Response.json(
        { error: 'Missing games array' },
        { status: 400 }
      )
    }

    const current = await readLibrary()
    const existingIds = new Set(current.map((g) => g.appid))

    const newGames = incomingGames
      .filter((g: Game) => !existingIds.has(g.appid))

    const updated = [...current, ...newGames]

    await writeLibrary(updated)

    return Response.json({
      games: updated,
      appids: updated.map((g) => g.appid),
      total: updated.length,
      added: newGames.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return Response.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/library - Remove games from library
export async function DELETE(request: NextRequest) {
  try {
    const payload = await request.json()
    const { appids } = payload

    if (!Array.isArray(appids)) {
      return Response.json(
        { error: 'Missing appids array' },
        { status: 400 }
      )
    }

    const current = await readLibrary()
    const removeIds = new Set(appids.map(String))

    const updated = current.filter((g) => !removeIds.has(g.appid))

    await writeLibrary(updated)

    return Response.json({
      games: updated,
      appids: updated.map((g) => g.appid),
      total: updated.length,
      removed: current.length - updated.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return Response.json({ error: message }, { status: 500 })
  }
}
