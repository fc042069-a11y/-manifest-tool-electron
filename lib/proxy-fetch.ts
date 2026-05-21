import { ProxySettings } from './types'
import axios, { AxiosRequestConfig } from 'axios'
import path from 'path'
import fs from 'fs-extra'

interface ProxyRoutePayload {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: any
}

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'settings.json')

type AppSettings = {
  theme: string
  gameCardSize: string
  downloadPath: string
  proxy?: string
  ryuuApiKey?: string
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  gameCardSize: '75%',
  downloadPath: 'G:\\SteamCracked\\',
  proxy: '',
  ryuuApiKey: ''
}

async function readSettings(): Promise<AppSettings> {
  try {
    const content = await fs.readFile(SETTINGS_PATH, 'utf-8')
    return { ...defaultSettings, ...JSON.parse(content) }
  } catch {
    return defaultSettings
  }
}

function normalizeHeaders(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {}
  if (headers instanceof Headers) {
    const normalized: Record<string, string> = {}
    headers.forEach((value, key) => {
      normalized[key] = value
    })
    return normalized
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }
  return headers as Record<string, string>
}

async function loadProxySettings(): Promise<ProxySettings> {
  if (typeof window !== 'undefined') {
    throw new Error('Proxy configuration must be loaded server-side only.')
  }

  const settings = await readSettings()

  if (!settings.proxy) {
    return {
      enabled: false,
      host: '',
      port: '',
      username: '',
      password: ''
    }
  }

  try {
    const url = new URL(settings.proxy)

    return {
      enabled: true,
      host: url.hostname,
      port: url.port || '8080',
      username: url.username || '',
      password: url.password || ''
    }
  } catch {
    return {
      enabled: false,
      host: '',
      port: '',
      username: '',
      password: ''
    }
  }
}

async function buildAxiosConfig(
  url: string,
  options?: RequestInit
): Promise<AxiosRequestConfig> {
  const proxySettings = await loadProxySettings()

  if (!proxySettings.enabled || !proxySettings.host || !proxySettings.port) {
    throw new Error('Proxy is required and must be enabled with host and port')
  }

  return {
    url,
    method: (options?.method as string) || 'GET',
    headers: normalizeHeaders(options?.headers),
    data: options?.body,
    proxy: {
      host: proxySettings.host,
      port: parseInt(proxySettings.port, 10),
      protocol: 'http',
      ...(proxySettings.username && proxySettings.password && {
        auth: {
          username: proxySettings.username,
          password: proxySettings.password,
        },
      }),
    },
    timeout: 30000,
    responseType: 'arraybuffer',
    validateStatus: () => true,
  }
}

export async function proxyFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const isBrowser = typeof window !== 'undefined'

  if (isBrowser) {
    const payload: ProxyRoutePayload = {
      url,
      method: (options?.method as string) || 'GET',
      headers: normalizeHeaders(options?.headers),
      body: options?.body,
    }

    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Server proxy request failed: ${response.status} ${response.statusText} ${text}`)
    }

    return response
  }

  const axiosConfig = await buildAxiosConfig(url, options)
  const response = await axios(axiosConfig)

  return new Response(Buffer.from(response.data), {
    status: response.status,
    headers: response.headers as unknown as HeadersInit
  })
}

export async function axiosWithProxy<T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const proxySettings = await loadProxySettings()

  if (!proxySettings.enabled || !proxySettings.host || !proxySettings.port) {
    throw new Error('Proxy is required and must be enabled with host and port')
  }

  const axiosConfig: AxiosRequestConfig = {
    ...config,
    url,
    timeout: config?.timeout ?? 30000,
    proxy: {
      host: proxySettings.host,
      port: parseInt(proxySettings.port, 10),
      protocol: 'http',
      ...(proxySettings.username && proxySettings.password && {
        auth: {
          username: proxySettings.username,
          password: proxySettings.password,
        },
      }),
    },
  }

  const response = await axios(axiosConfig)
  return response.data
}

export async function testProxyConnection(): Promise<{ success: boolean; message: string }> {
  const proxySettings = await loadProxySettings()

  if (!proxySettings.enabled || !proxySettings.host || !proxySettings.port) {
    return { success: false, message: 'Proxy is not enabled or configured in settings.json' }
  }

  try {
    const response = await proxyFetch('https://httpbin.org/ip')
    const data = await response.json()
    return { success: true, message: `Connected via proxy. IP: ${data.origin}` }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, message: `Connection failed: ${errorMessage}` }
  }
}