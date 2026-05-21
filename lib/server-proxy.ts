import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { ProxySettings } from './types'
import proxyConfig from '../config.json'

function normalizeHeaders(headers: Record<string, string> = {}): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  )
}

function getProxySettings(): ProxySettings {
  const config = (proxyConfig as { proxy: ProxySettings }).proxy
  if (!config.enabled || !config.host || !config.port) {
    throw new Error('Proxy must be enabled and configured in config.json')
  }
  return config
}

function getProxyAgent(proxySettings: ProxySettings) {
  const proxyAuth = proxySettings.username && proxySettings.password
    ? `${encodeURIComponent(proxySettings.username)}:${encodeURIComponent(proxySettings.password)}@`
    : ''

  const proxyUrl = `http://${proxyAuth}${proxySettings.host}:${proxySettings.port}`
  return new HttpsProxyAgent(proxyUrl)
}

export async function proxyRequest(
  url: string,
  options: RequestInit = {}
): Promise<AxiosResponse<any>> {
  const proxySettings = getProxySettings()
  const agent = getProxyAgent(proxySettings)
  const axiosConfig: AxiosRequestConfig = {
    url,
    method: (options.method as string) || 'GET',
    headers: normalizeHeaders(options.headers as Record<string, string> | undefined),
    data: options.body,
    httpAgent: agent,
    httpsAgent: agent,
    timeout: 30000,
    validateStatus: () => true,
  }

  return axios(axiosConfig)
}

export function axiosResponseToNextResponse(response: AxiosResponse<any>) {
  const headers = new Headers()
  Object.entries(response.headers || {}).forEach(([key, value]) => {
    if (value == null) return
    if (Array.isArray(value)) {
      value.forEach(item => headers.append(key, item))
    } else {
      headers.set(key, String(value))
    }
  })
  const body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
  headers.set('Content-Type', 'application/json')
  return new Response(body, {
    status: response.status,
    headers,
  })
}
