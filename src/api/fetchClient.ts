import { useAuthStore } from '@/store/authStore'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5000/api'

export class ApiRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: Record<string, string | undefined>
}

function buildUrl(path: string, params?: Record<string, string | undefined>): string {
  const url = new URL(BASE_URL.replace(/\/$/, '') + path)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value)
    }
  }
  return url.toString()
}

function extractMessage(json: unknown): string | undefined {
  if (json && typeof json === 'object' && 'message' in json) {
    const message = (json as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return undefined
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options
  const token = useAuthStore.getState().token

  const headers: Record<string, string> = {}
  if (token) headers.Authorization = token

  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const response = await fetch(buildUrl(path, params), { method, headers, body: payload })

  if (response.status === 401 || response.status === 403) {
    useAuthStore.getState().logout()
  }

  const text = await response.text()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
  }

  if (!response.ok) {
    throw new ApiRequestError(extractMessage(json) ?? `Request failed with status ${response.status}`, response.status)
  }

  return json as T
}
