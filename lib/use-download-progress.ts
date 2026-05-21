'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

export interface DownloadProgress {
  appid: string
  name?: string
  status: 'pending' | 'downloading' | 'completed' | 'error' | 'cancelled'
  progress: number
  speed: number
  eta: number
  error?: string
  totalSize?: number
  downloadedSize?: number
}

export function useDownloadProgress() {
  const [downloads, setDownloads] = useState<Map<string, DownloadProgress>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const subscriptionsRef = useRef<Set<string>>(new Set())
  const connectPromiseRef = useRef<Promise<void> | null>(null)

  const connectSocket = useCallback((): Promise<void> => {
    // Return existing connection promise if already connecting
    if (connectPromiseRef.current) return connectPromiseRef.current
    
    // Return immediately if already connected
    if (socketRef.current?.connected) {
      return Promise.resolve()
    }

    // Create new connection promise
    connectPromiseRef.current = new Promise((resolve) => {
      // Determine Socket.io server URL
      const socketUrl = `${window.location.protocol}//${window.location.hostname}:${process.env.NEXT_PUBLIC_SOCKET_PORT || '3001'}`
      
      console.log('[Socket.io] Connecting to', socketUrl)

      const socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      })

      socket.on('connect', () => {
        console.log('[Socket.io] Connected with ID:', socket.id)
        setIsConnected(true)
        // Resubscribe to all active downloads
        subscriptionsRef.current.forEach(appid => {
          console.log('[Socket.io] Resubscribing to:', appid)
          socket.emit('subscribe-progress', appid)
        })
        resolve()
      })

      socket.on('disconnect', () => {
        console.log('[Socket.io] Disconnected')
        setIsConnected(false)
        connectPromiseRef.current = null
      })

      socket.on('progress-update', (progress: DownloadProgress) => {
        console.log('[Socket.io] Progress update:', progress.appid, progress.progress + '%')
        setDownloads(prev => {
          const next = new Map(prev)
          next.set(progress.appid, progress)
          return next
        })
      })

      socket.on('all-progress', (progressList: DownloadProgress[]) => {
        console.log('[Socket.io] All progress:', progressList.length, 'downloads')
        const next = new Map<string, DownloadProgress>()
        progressList.forEach(progress => {
          next.set(progress.appid, progress)
        })
        setDownloads(next)
      })

      socket.on('all-progress-update', (progress: DownloadProgress) => {
        console.log('[Socket.io] All progress update:', progress.appid, progress.progress + '%')
        setDownloads(prev => {
          const next = new Map(prev)
          next.set(progress.appid, progress)
          return next
        })
      })

      socket.on('error', (error) => {
        console.error('[Socket.io] Error:', error)
      })

      socketRef.current = socket
    })

    return connectPromiseRef.current
  }, [])

  const activeDownloadCount = Array.from(downloads.values()).filter(progress =>
    progress.status === 'pending' || progress.status === 'downloading'
  ).length

  useEffect(() => {
    if (activeDownloadCount > 0 || subscriptionsRef.current.size > 0) {
      connectSocket()
    }
  }, [activeDownloadCount, connectSocket])

  const startDownload = useCallback(async (appid: string, name?: string) => {
    try {
      // Immediately inject a pending entry
      setDownloads(prev => {
        const next = new Map(prev)
        next.set(appid, { appid, name, status: 'pending', progress: 0, speed: 0, eta: 0 })
        return next
      })

      // Add to subscriptions BEFORE connecting
      subscriptionsRef.current.add(appid)

      // Ensure socket is connected and subscribed
      await connectSocket()
      
      // Now emit subscription after confirmed connection
      if (socketRef.current?.connected) {
        console.log('[Socket.io] Emitting subscribe-progress for:', appid)
        socketRef.current.emit('subscribe-progress', appid)
        // Give socket a moment to process the subscription
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      const response = await fetch('/api/download/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appid, name }),
      })

      if (!response.ok) {
        console.error('[Download] Start failed:', response.status)
        setDownloads(prev => { const next = new Map(prev); next.delete(appid); return next })
        subscriptionsRef.current.delete(appid)
        return false
      }

      // Update state with actual progress from server
      try {
        const data = await response.json()
        if (data.progress) {
          console.log('[Download] Initial progress:', data.progress)
          setDownloads(prev => {
            const next = new Map(prev)
            next.set(appid, data.progress)
            return next
          })
        }
      } catch (e) {
        console.error('[Download] Failed to parse response:', e)
      }

      return true
    } catch (e) {
      console.error('[Download] Start error:', e)
      setDownloads(prev => { const next = new Map(prev); next.delete(appid); return next })
      subscriptionsRef.current.delete(appid)
      return false
    }
  }, [connectSocket])

  const cancelDownload = useCallback(async (appid: string) => {
    try {
      const response = await fetch('/api/download/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appid }),
      })
      if (!response.ok) return false
      subscriptionsRef.current.delete(appid)
      if (socketRef.current?.connected) {
        socketRef.current.emit('unsubscribe-progress', appid)
      }
      return true
    } catch {
      return false
    }
  }, [])

  const getDownloadProgress = useCallback((appid: string): DownloadProgress | undefined => {
    return downloads.get(appid)
  }, [downloads])

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  return {
    downloads,
    isConnected,
    startDownload,
    cancelDownload,
    getDownloadProgress,
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export function formatEta(seconds: number): string {
  if (!seconds || seconds <= 0) return '--:--'
  if (seconds > 86400) return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`
  if (seconds > 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 60)}m`
  if (seconds > 60) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`
  return `${Math.floor(seconds)}s`
}