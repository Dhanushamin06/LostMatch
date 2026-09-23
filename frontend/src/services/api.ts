const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

class ApiClient {
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private refreshPromise: Promise<string> | null = null

  setTokens(access: string | null, refresh: string | null) {
    this.accessToken = access
    this.refreshToken = refresh
    if (typeof window !== 'undefined') {
      if (access && refresh) {
        localStorage.setItem('auth_access_token', access)
        localStorage.setItem('auth_refresh_token', refresh)
      } else {
        localStorage.removeItem('auth_access_token')
        localStorage.removeItem('auth_refresh_token')
      }
    }
  }

  getAccessToken(): string | null {
    if (this.accessToken) return this.accessToken
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_access_token')
    }
    return null
  }

  getRefreshToken(): string | null {
    if (this.refreshToken) return this.refreshToken
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_refresh_token')
    }
    return null
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise

    const refreshToken = this.getRefreshToken()
    if (!refreshToken) return null

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })

        if (!response.ok) {
          this.setTokens(null, null)
          return null
        }

        const data = await response.json()
        this.setTokens(data.access_token, data.refresh_token)
        return data.access_token
      } catch {
        this.setTokens(null, null)
        return null
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retry = true
  ): Promise<T> {
    let accessToken = this.getAccessToken()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (accessToken) {
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (response.status === 401 && retry && !endpoint.includes('/auth/')) {
      const newToken = await this.refreshAccessToken()
      if (newToken) {
        return this.request(endpoint, options, false)
      }
      this.setTokens(null, null)
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const accessToken = this.getAccessToken()
    const headers: HeadersInit = {}
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // Auth-specific methods
  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Login failed' }))
      throw new Error(error.detail || 'Login failed')
    }

    const data = await response.json()
    this.setTokens(data.access_token, data.refresh_token)
    return data
  }

  async register(fullName: string, email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, email, password }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Registration failed' }))
      throw new Error(error.detail || 'Registration failed')
    }

    const data = await response.json()
    this.setTokens(data.access_token, data.refresh_token)
    return data
  }

  logout() {
    this.setTokens(null, null)
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken()
  }
}

export const api = new ApiClient()