// API Client Helper
const Api = {
  async request(endpoint, options = {}) {
    const url = new URL(endpoint, window.location.origin);
    if (options.params) {
      Object.keys(options.params).forEach(key => {
        if (options.params[key] !== undefined && options.params[key] !== null) {
          url.searchParams.append(key, options.params[key]);
        }
      });
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url.toString(), config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes('/api/auth/login')) {
          State.setUser(null);
          State.setShift(null);
          window.location.hash = '#/login';
        }
        throw new Error(data.error || `HTTP Error ${response.status}`);
      }

      return data;
    } catch (err) {
      throw err;
    }
  },

  get(endpoint, params) {
    return this.request(endpoint, { method: 'GET', params });
  },

  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body });
  },

  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body });
  },

  patch(endpoint, body) {
    return this.request(endpoint, { method: 'PATCH', body });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};
