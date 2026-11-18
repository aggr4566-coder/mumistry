/* =====================================================================
   MU MISTRY – api.js
   Talks to the Google Apps Script backend.
   • POST with Content-Type text/plain → a "simple" CORS request (no
     pre-flight), which Apps Script supports.
   • The session token travels in the JSON body, never in the URL.
   Developed by Debasis Rout
   ===================================================================== */
'use strict';

const Session = {
  KEY: 'mm_session',
  get() {
    try {
      const s = JSON.parse(localStorage.getItem(this.KEY) || 'null');
      if (s && s.token && new Date(s.expiresAt) > new Date()) return s;
    } catch (e) { /* storage blocked or corrupt */ }
    return null;
  },
  set(data) {
    const s = { token: data.token, role: data.role, expiresAt: data.expiresAt, user: data.user };
    try { localStorage.setItem(this.KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
    return s;
  },
  updateUser(user) {
    const s = this.get();
    if (s) { s.user = user; try { localStorage.setItem(this.KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } }
  },
  clear() { try { localStorage.removeItem(this.KEY); } catch (e) { /* ignore */ } }
};

class ApiError extends Error {
  constructor(code, message, field) {
    super(message);
    this.code = code;
    this.field = field || null;
  }
}

const API = {
  /** Random ID used for duplicate-request protection. */
  newRequestId() {
    const a = new Uint8Array(12);
    crypto.getRandomValues(a);
    return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * call('booking.create', {...}, { requestId })
   * requestId: pass the same ID when retrying the same form so the server
   *            returns the first result instead of creating a duplicate.
   */
  async call(action, payload = {}, opts = {}) {
    const url = window.MM_CONFIG.API_URL;
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url)) {
      throw new ApiError('CONFIG', 'The app is not connected yet. Set API_URL in js/config.js.');
    }
    const body = Object.assign({}, payload, { clientRequestId: opts.requestId || API.newRequestId() });
    const s = Session.get();
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, token: s ? s.token : '', payload: body }),
        redirect: 'follow',
        cache: 'no-store'
      });
    } catch (e) {
      throw new ApiError('NETWORK', navigator.onLine
        ? 'Could not reach the MU MISTRY server. Please try again.'
        : 'You are offline. Please check your internet connection.');
    }
    let data;
    try { data = await res.json(); } catch (e) {
      throw new ApiError('BAD_RESPONSE', 'Unexpected server response. Please try again.');
    }
    if (!data.ok) {
      const err = data.error || {};
      if (err.code === 'AUTH_REQUIRED' && s) {
        Session.clear();
        if (window.App) App.onSessionExpired();
      }
      throw new ApiError(err.code || 'ERROR', err.message || 'Request failed.', err.field);
    }
    return data.data;
  }
};
