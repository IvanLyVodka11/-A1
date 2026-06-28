const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000') + '/api';

/**
 * HTTP client for the Authenticator API.
 */
class ApiService {
  constructor() {
    this.baseUrl = API_BASE;
  }

  /**
   * Get stored tokens from localStorage.
   */
  getTokens() {
    return {
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
    };
  }

  /**
   * Store tokens in localStorage.
   */
  setTokens(accessToken, refreshToken) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  /**
   * Clear stored tokens.
   */
  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  /**
   * Make an authenticated request. Auto-refreshes token if expired.
   */
  async request(endpoint, options = {}) {
    const { accessToken } = this.getTokens();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
      ...options,
    };

    let response = await fetch(`${this.baseUrl}${endpoint}`, config);

    // If 401, try refreshing the token
    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        const { accessToken: newToken } = this.getTokens();
        config.headers.Authorization = `Bearer ${newToken}`;
        response = await fetch(`${this.baseUrl}${endpoint}`, config);
      } else {
        this.clearTokens();
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  /**
   * Refresh the access token using the refresh token.
   */
  async refreshAccessToken() {
    const { refreshToken } = this.getTokens();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      this.setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  // ── Auth ──
  async register(email, password) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // ── Accounts ──
  async getAccounts() {
    return this.request('/accounts');
  }

  async addAccount(accountData) {
    return this.request('/accounts', {
      method: 'POST',
      body: JSON.stringify(accountData),
    });
  }

  async updateAccount(id, data) {
    return this.request(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAccount(id) {
    return this.request(`/accounts/${id}`, {
      method: 'DELETE',
    });
  }

  // ── Backups ──
  async createBackup() {
    return this.request('/backups', { method: 'POST' });
  }

  async getBackups() {
    return this.request('/backups');
  }

  async restoreBackup(id) {
    return this.request(`/backups/${id}/restore`, { method: 'POST' });
  }

  async downloadBackup(id) {
    return this.request(`/backups/${id}/download`);
  }
}

export const api = new ApiService();
