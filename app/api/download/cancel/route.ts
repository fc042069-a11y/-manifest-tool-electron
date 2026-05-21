import { downloadManager } from '@/lib/download-manager'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { appid } = await request.json()

    if (!appid) {
      return Response.json({ error: 'Missing appid' }, { status: 400 })
    }

    const cancelled = downloadManager.cancelDownload(appid)

    return Response.json({
      success: cancelled,
      message: cancelled ? 'Download cancelled' : 'No active download found',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
