export const runtime = 'nodejs';

import { downloadManager } from '@/lib/download-manager'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { appid, name } = await request.json()

    if (!appid) {
      return Response.json({ error: 'Missing appid' }, { status: 400 })
    }

    const progress = await downloadManager.startDownload(appid)

    return Response.json({
      success: true,
      progress,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
