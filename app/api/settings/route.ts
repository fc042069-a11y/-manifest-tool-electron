import { NextRequest } from 'next/server'
import { AppSettings } from '@/lib/types'
import fs from 'fs/promises'
import path from 'path'

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'settings.json')

const defaultSettings: AppSettings = {
  theme: 'dark',
  gameCardSize: '75%',
  downloadPath: 'G:\\SteamCracked\\',
}

async function readSettings(): Promise<AppSettings> {
  try {
    const content = await fs.readFile(SETTINGS_PATH, 'utf-8')
    return { ...defaultSettings, ...JSON.parse(content) }
  } catch {
    return defaultSettings
  }
}

async function writeSettings(settings: AppSettings): Promise<void> {
  await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true })
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2))
}

// GET /api/settings - Get current settings
export async function GET() {
  const settings = await readSettings()
  return Response.json(settings)
}

// POST /api/settings - Update settings
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const current = await readSettings()
    const updated = { ...current, ...payload }
    await writeSettings(updated)
    return Response.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return Response.json({ error: message }, { status: 500 })
  }
}
