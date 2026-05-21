import { downloadManager } from '@/lib/download-manager'

export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json(downloadManager.getAllProgress())
}
