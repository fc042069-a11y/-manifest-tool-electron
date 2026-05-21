/**
 * Next.js instrumentation hook for Socket.io initialization
 * This runs when the Next.js server starts (both dev and production)
 */
export async function register() {
  console.log('[Instrumentation] Register called, NEXT_RUNTIME:', process.env.NEXT_RUNTIME)
  
  // Initialize Socket.io server immediately
  const { initializeSocketServer } = await import('@/lib/socket-server')
  try {
    console.log('[Instrumentation] Initializing Socket.io server...')
    await initializeSocketServer()
    console.log('[Instrumentation] Socket.io server initialized successfully')
  } catch (error) {
    console.error('[Instrumentation] Failed to initialize Socket.io:', error)
  }
}

export const onRequestError = () => {}
export const onRequestWarning = () => {}
