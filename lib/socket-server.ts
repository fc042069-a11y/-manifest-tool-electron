import { Server as SocketIOServer, Socket } from 'socket.io'

const SOCKET_PORT = parseInt(process.env.SOCKET_PORT || '3001', 10)

const g = global as typeof globalThis & {
  _socketIoInstance: SocketIOServer | null
  _socketHttpServer: import('http').Server | null
  _socketInitPromise: Promise<SocketIOServer> | null
}

g._socketIoInstance   = g._socketIoInstance   ?? null
g._socketHttpServer   = g._socketHttpServer   ?? null
g._socketInitPromise  = g._socketInitPromise  ?? null

function getIoInstance()   { return g._socketIoInstance }
function setIoInstance(io: SocketIOServer | null) { g._socketIoInstance = io }

function getHttpServer()   { return g._socketHttpServer }
function setHttpServer(s: import('http').Server | null) { g._socketHttpServer = s }

function getInitPromise()  { return g._socketInitPromise }
function setInitPromise(p: Promise<SocketIOServer> | null) { g._socketInitPromise = p }

function getCorsOrigins(): string[] {
  if (process.env.NODE_ENV === 'development') {
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ]
  }
  return (process.env.SOCKET_CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
}

export async function initializeSocketServer(): Promise<SocketIOServer> {
  if (getIoInstance()) {
    console.log('[Socket.io] Server already initialized, returning existing instance')
    return getIoInstance()!
  }

  if (getInitPromise()) {
    console.log('[Socket.io] Initialization in progress, waiting...')
    return getInitPromise()!
  }

  const promise = (async () => {
    try {
      // Lazy require keeps this file safe from Edge Runtime static analysis
      const http = require('http') as typeof import('http')
      const server = http.createServer()
      setHttpServer(server)

      const corsOrigins = getCorsOrigins()
      console.log(`[Socket.io] Initializing with CORS origins: ${corsOrigins.join(', ')}`)

      const io = new SocketIOServer(server, {
        cors: {
          origin: corsOrigins,
          credentials: true,
          methods: ['GET', 'POST'],
        },
        transports: ['websocket', 'polling'],
      })

      io.on('connection', (socket: Socket) => {
        console.log(`[Socket.io] Client connected: ${socket.id}`)

        socket.on('disconnect', () => {
          console.log(`[Socket.io] Client disconnected: ${socket.id}`)
        })

        socket.on('subscribe-progress', (appid: string) => {
          console.log(`[Socket.io] Client ${socket.id} subscribed to appid: ${appid}`)
          socket.join(`progress:${appid}`)
        })

        socket.on('unsubscribe-progress', (appid: string) => {
          console.log(`[Socket.io] Client ${socket.id} unsubscribed from appid: ${appid}`)
          socket.leave(`progress:${appid}`)
        })
      })

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Socket.io server failed to start within 5 seconds on port ${SOCKET_PORT}`))
        }, 5000)

        server.listen(SOCKET_PORT, () => {
          clearTimeout(timeout)
          console.log(`[Socket.io] Server listening on port ${SOCKET_PORT}`)
          resolve()
        })

        server.on('error', (error: NodeJS.ErrnoException) => {
          clearTimeout(timeout)
          if (error.code === 'EADDRINUSE') {
            console.error(`[Socket.io] Port ${SOCKET_PORT} is already in use`)
          }
          reject(error)
        })
      })

      setIoInstance(io)
      return io
    } catch (error) {
      console.error('[Socket.io] Initialization error:', error)
      setInitPromise(null) // allow retry on next call
      throw error
    }
  })()

  setInitPromise(promise)
  return promise
}

export function getSocketServer(): SocketIOServer {
  const io = getIoInstance()
  if (!io) {
    throw new Error('Socket.io server not initialized. Call initializeSocketServer() first.')
  }
  return io
}

export function broadcastProgress(appid: string, progress: any) {
  const io = getIoInstance()
  if (!io) {
    console.warn('[Socket.io] Cannot broadcast - server not initialized (this may happen during early startup)')
    return
  }
  console.log(`[Socket.io] Broadcasting progress for ${appid}: ${progress.progress}%`)
  io.to(`progress:${appid}`).emit('progress-update', progress)
  io.emit('all-progress-update', progress)
}

export function broadcastAllProgress(progressList: any[]) {
  const io = getIoInstance()
  if (!io) {
    console.warn('[Socket.io] Cannot broadcast all progress - server not initialized')
    return
  }
  console.log(`[Socket.io] Broadcasting all progress: ${progressList.length} downloads`)
  io.emit('all-progress', progressList)
}