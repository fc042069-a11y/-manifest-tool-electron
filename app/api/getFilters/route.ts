import { proxyRequest } from '@/lib/server-proxy'

const API_BASE = 'https://generator.ryuu.lol/files'

export async function GET() {
  try {
    const response = await proxyRequest(`${API_BASE}/filter.json`)
    return Response.json(response.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return Response.json({ error: message }, { status: 500 })
  }
}
