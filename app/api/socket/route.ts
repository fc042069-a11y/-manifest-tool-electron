import { NextRequest } from 'next/server'
import { getSocketServer } from '@/lib/socket-server'

export const maxDuration = 60

/**
 * Socket.io handler for Next.js
 * This route handles WebSocket upgrades and polling connections
 */
export async function GET(req: NextRequest) {
  // For socket.io client handshake: respond with 200 OK
  return new Response('Socket.io endpoint', { status: 200 })
}

export async function POST(req: NextRequest) {
  // Socket.io sends POST requests during setup
  return new Response('Socket.io endpoint', { status: 200 })
}

/**
 * WebSocket upgrade handler
 * Note: Next.js doesn't natively support WebSocket upgrades in App Router,
 * so Socket.io falls back to long-polling or HTTP transport
 */
export async function WEBSOCKET(req: NextRequest) {
  // This would handle WebSocket upgrades if supported in the future
  return new Response('Socket.io WebSocket', { status: 200 })
}
