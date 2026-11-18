/* =====================================================================
   MU MISTRY – app.js
   App shell: router, header, bottom navigation, notifications,
   service-worker registration, update banner and install prompt.
   Developed by Debasis Rout
   ===================================================================== */
'use strict';

const App = {
  config: null,
  catalog: null,
  installPrompt: null,
  unread: 0,

  async start() {
    this.mountShell();
    this.registerServiceWorker();
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); this.installPrompt = e; this.renderHeader(); });
    window.addEventListener('appinstalled', () => { this.installPrompt = null; UI.toast('MU MISTRY installed 🎉', 'ok'); this.renderHeader(); });
    window.addEventListener('online', () => this.renderOffline());
    window.addEventListener('offline', () => this.renderOffline());
    window.addEventListener('hashchange', () => this.route());
    this.restoreCatalog();
    this.route();
    this.loadPublicData().then(() => { if (!location.hash || location.hash === '#/' || location.hash.indexOf('#/category') === 0) this.route(); });
    this.pollNotifications();
    setInterval(() => { if (document.visibilityState === 'visible') this.pollNotifications(); }, 60000);
  },

  /* ---------------- data ---------------- */
  restoreCatalog() {
    try {
      const c = JSON.parse(localStorage.getItem('mm_catalog') || 'null');
      if (c) { this.config = c.config; this.catalog = c.catalog; }
    } catch (e) { /* ignore */ }
  },
  async loadPublicData() {
    try {
      const [config, catalog] = await Promise.all([API.call('public.config'), API.call('public.services')]);
      this.config = config; this.catalog = catalog;
      try { localStorage.setItem('mm_catalog', JSON.stringify({ config, catalog })); } catch (e) { /* ignore */ }
    } catch (err) {
      if (!this.catalog) UI.errorToast(err);
    }
  },
  async ensureCatalog() {
    if (!this.catalog || !this.config) await this.loadPublicData();
    if (!this.catalog) throw new Error('Could not load services. Please check your connection.');
  },
  allServices() {
    return this.catalog ? this.catalog.categories.reduce((a, c) => a.concat(c.services), []) : [];
  },
  findService(id) { return this.allServices().find(s => s.ServiceID === id) || null; },

  /* ---------------- shell ---------------- */
  mountShell() {
    const root = document.getElementById('app');
    UI.clear(root);
    this.$offline = UI.el('div', { class: 'offline-bar hidden', text: 'You are offline – showing saved information.' });
    this.$header = UI.el('header', { class: 'appbar' });
    this.$tabs = UI.el('div');
    this.$view = UI.el('main', { id: 'view', tabindex: '-1' });
    this.$footer = UI.el('div');
    this.$bottom = UI.el('div');
    UI.append(root, [this.$offline, this.$header, this.$tabs, this.$view, this.$footer, this.$bottom]);
    this.renderOffline();
  },
  renderOffline() { this.$offline.classList.toggle('hidden', navigator.onLine); },

  renderHeader() {
    const s = Session.get();
    const el = UI.el;
    const home = s ? this.homeFor(s.role) : '#/';
    UI.clear(this.$header).appendChild(el('div', { class: 'container' },
      el('a', { class: 'brand', href: home, 'aria-label': 'MU MISTRY home' },
        el('div', { class: 'brand-mark', text: 'MU' }),
        el('div', { class: 'brand-text' }, el('b', { text: 'MU MISTRY' }), el('span', { text: 'Your Trusted Home Service Partner' }))),
      el('div', { class: 'spacer' }),
      this.installPrompt || this.isIos() && !this.isStandalone()
        ? el('button', { class: 'icon-btn', title: 'Install app', 'aria-label': 'Install app', onclick: () => this.install() }, UI.icon('install_mobile')) : null,
      s ? el('a', { class: 'icon-btn', href: '#/notifications', 'aria-label': 'Notifications' }, UI.icon('notifications'),
        this.unread ? el('span', { class: 'dot', text: this.unread > 9 ? '9+' : String(this.unread) }) : null) : null,
      s ? el('button', { class: 'icon-btn', 'aria-label': 'Account', onclick: () => this.accountMenu() }, UI.icon('account_circle'))
        : el('a', { class: 'btn btn-sm', href: '#/login' }, 'Login')));
  },

  renderBottomNav(active) {
    const s = Session.get();
    const sets = {
      guest: [['#/', 'home', 'Home', 'home'], ['#/category/Electrician', 'grid_view', 'Services', 'services'], ['#/login', 'login', 'Login', 'login']],
      customer: [['#/customer', 'home', 'Home', 'dash'], ['#/', 'grid_view', 'Book', 'home'], ['#/customer/bookings', 'event_note', 'Bookings', 'bookings'],
        ['#/notifications', 'notifications', 'Alerts', 'alerts'], ['#/customer/profile', 'person', 'Profile', 'profile']],
      professional: [['#/pro', 'home', 'Home', 'dash'], ['#/pro/jobs', 'work', 'Jobs', 'jobs'], ['#/pro/earnings', 'payments', 'Earnings', 'earnings'],
        ['#/notifications', 'notifications', 'Alerts', 'alerts'], ['#/pro/profile', 'person', 'Profile', 'profile']],
      admin: [['#/admin', 'dashboard', 'Dashboard', 'dashboard'], ['#/admin/bookings', 'event_note', 'Bookings', 'bookings'],
        ['#/admin/payments', 'account_balance', 'Payments', 'payments'], ['#/admin/professionals', 'engineering', 'Pros', 'professionals'],
        ['#/admin/reports', 'bar_chart', 'Reports', 'reports']]
    };
    const items = sets[s ? s.role : 'guest'];
    UI.clear(this.$bottom).appendChild(UI.el('nav', { class: 'bottom-nav', 'aria-label': 'Main' },
      items.map(i => UI.el('a', { href: i[0], class: i[3] === active ? 'active' : '' }, UI.icon(i[1]), i[2]))));
  },

  renderFooter(show) {
    UI.clear(this.$footer);
    if (!show) return;
    const c = this.config || {};
    const el = UI.el;
    this.$footer.appendChild(el('footer', { class: 'footer', id: 'contact' }, el('div', { class: 'container' },
      el('div', { class: 'grid grid-3' },
        el('div', null,
          el('div', { class: 'brand' }, el('div', { class: 'brand-mark', text: 'MU' }),
            el('div', { class: 'brand-text' }, el('b', { text: 'MU MISTRY', style: { color: '#fff' } }), el('span', { text: 'Your Trusted Home Service Partner' }))),
          el('p', { style: { marginTop: '12px' }, text: 'Verified electricians, plumbers, carpenters, cleaners and more across ' + (c.city || 'Bhubaneswar') + ', ' + (c.state || 'Odisha') + '.' })),
        el('div', null, el('h4', { text: 'Contact', style: { color: '#fff' } }),
          c.supportPhone ? el('p', null, el('a', { href: 'tel:+91' + c.supportPhone }, '📞 +91 ' + c.supportPhone)) : null,
          c.supportWhatsapp ? el('p', null, el('a', { href: 'https://wa.me/91' + c.supportWhatsapp, target: '_blank', rel: 'noopener' }, '💬 WhatsApp us')) : null,
          c.supportEmail ? el('p', null, el('a', { href: 'mailto:' + c.supportEmail }, '✉ ' + c.supportEmail)) : null,
          el('p', { text: (c.city || 'Bhubaneswar') + ', Odisha, India' })),
        el('div', null, el('h4', { text: 'Quick links', style: { color: '#fff' } }),
          el('p', null, el('a', { href: '#/join' }, 'Join as a professional')),
          el('p', null, el('button', { class: 'link-btn', onclick: () => this.install() }, 'Install the app')),
          el('p', null, el('a', { href: '#/login?role=admin' }, 'Admin login')))),
      el('div', { class: 'credit' }, '© ' + new Date().getFullYear() + ' MU MISTRY · ' + (c.credit || window.MM_CONFIG.CREDIT)))));
  },

  /** Puts a page into the main area. opts: { tabs: Node, footer: bool, nav: key } */
  render(node, opts) {
    opts = opts || {};
    this.renderHeader();
    UI.clear(this.$tabs);
    if (opts.tabs) this.$tabs.appendChild(opts.tabs);
    UI.clear(this.$view).appendChild(node);
    this.renderFooter(!!opts.footer);
    this.renderBottomNav(opts.nav);
    window.scrollTo(0, 0);
  },

  /* ---------------- routing ---------------- */
  homeFor(role) { return { customer: '#/customer', professional: '#/pro', admin: '#/admin' }[role] || '#/'; },
  go(hash) { if (location.hash === hash) this.route(); else location.hash = hash; },

  parseHash() {
    const raw = (location.hash || '#/').substring(1);
    const [path, qs] = raw.split('?');
    const query = {};
    new URLSearchParams(qs || '').forEach((v, k) => { query[k] = v; });
    return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), query };
  },

  /** Redirects to login if the user is not logged in with the right role. */
  guard(role) {
    const s = Session.get();
    if (s && s.role === role) return s;
    this.go('#/login?role=' + role + '&next=' + encodeURIComponent(location.hash));
    return null;
  },

  route() {
    const { parts, query } = this.parseHash();
    const [a, b, c] = parts;
    try {
      if (!a) return Home.home();
      if (a === 'category') return Home.category(b);
      if (a === 'login') return Home.login(query);
      if (a === 'register') return Home.registerCustomer(query);
      if (a === 'join') return Home.registerProfessional();
      if (a === 'notifications') return this.notificationsPage();
      if (a === 'book') return this.guard('customer') && Customer.book(b);
      if (a === 'customer') return this.guard('customer') && Customer.route(b, c);
      if (a === 'pro') return this.guard('professional') && Professional.route(b, c);
      if (a === 'admin') return this.guard('admin') && Admin.route(b, c, query);
      return Home.home();
    } catch (err) {
      UI.errorToast(err);
    }
  },

  /* ---------------- account ---------------- */
  onLogin(data, next) {
    Session.set(data);
    UI.toast('Welcome, ' + String(data.user.FullName).split(' ')[0] + '!', 'ok');
    this.unread = 0;
    this.pollNotifications();
    this.go(next && next.indexOf('#/') === 0 && next.indexOf('#/login') !== 0 ? next : this.homeFor(data.role));
  },
  async logout() {
    try { await API.call('auth.logout'); } catch (e) { /* session may already be gone */ }
    Session.clear();
    this.unread = 0;
    UI.toast('Logged out.');
    this.go('#/');
  },
  onSessionExpired() {
    UI.toast('Your session has expired. Please log in again.', 'bad');
    this.unread = 0;
    this.renderHeader();
    if (location.hash.indexOf('#/login') !== 0) this.go('#/login');
  },
  accountMenu() {
    const s = Session.get();
    if (!s) return this.go('#/login');
    const el = UI.el;
    const m = UI.modal({
      title: s.user.FullName,
      body: el('div', { class: 'stack' },
        el('p', { class: 'muted', text: { customer: 'Customer', professional: 'Professional', admin: 'Administrator' }[s.role] + ' · ' + (s.user.Mobile || s.user.Email || '') }),
        el('a', { class: 'btn btn-ghost btn-block', href: this.homeFor(s.role), onclick: () => m.close() }, UI.icon('dashboard'), 'My dashboard'),
        el('button', { class: 'btn btn-outline btn-block', onclick: () => { m.close(); this.changePassword(); } }, UI.icon('lock'), 'Change password'),
        el('button', { class: 'btn btn-danger btn-block', onclick: () => { m.close(); this.logout(); } }, UI.icon('logout'), 'Logout')),
      actions: []
    });
  },
  changePassword() {
    const el = UI.el;
    const cur = UI.input('currentPassword', { type: 'password', autocomplete: 'current-password' });
    const nw = UI.input('newPassword', { type: 'password', autocomplete: 'new-password' });
    UI.modal({
      title: 'Change password',
      body: el('div', null, UI.field('Current password', cur), UI.field('New password', nw, 'At least 8 characters with letters and numbers (admins: 12).')),
      actions: [{ label: 'Cancel', class: 'btn btn-outline' }, { label: 'Change password', onClick: async () => {
        const r = await API.call('auth.changePassword', { currentPassword: cur.value, newPassword: nw.value });
        Session.clear();
        UI.toast(r.message, 'ok');
        this.go('#/login');
      } }]
    });
  },

  /* ---------------- notifications ---------------- */
  async pollNotifications() {
    if (!Session.get()) return;
    try {
      const r = await API.call('notifications.list', { unreadOnly: true, limit: 1 });
      if (r.unreadCount !== this.unread) { this.unread = r.unreadCount; this.renderHeader(); }
    } catch (e) { /* silent */ }
  },
  notificationsPage() {
    const s = Session.get();
    if (!s) return this.go('#/login');
    const el = UI.el;
    const box = el('div');
    const page = el('div', { class: 'container page' },
      el('div', { class: 'page-head' }, el('h1', { text: 'Notifications' }),
        el('button', { class: 'btn btn-ghost btn-sm', onclick: async () => {
          try { await API.call('notifications.markRead', { all: true }); this.unread = 0; this.notificationsPage(); } catch (e) { UI.errorToast(e); }
        } }, UI.icon('done_all'), 'Mark all read')),
      box);
    this.render(page, { nav: 'alerts' });
    const base = { customer: '#/customer/booking/', professional: '#/pro/job/', admin: '#/admin/booking/' }[s.role];
    UI.load(box, () => API.call('notifications.list', { limit: 100 }), r => {
      if (!r.notifications.length) return UI.empty('notifications_off', 'No notifications yet.');
      return el('div', null, r.notifications.map(n => el('div', {
        class: 'list-item', style: n.IsRead ? {} : { borderLeft: '4px solid var(--primary)' },
        onclick: async () => {
          if (!n.IsRead) { try { await API.call('notifications.markRead', { notificationIds: [n.NotificationID] }); } catch (e) { /* ignore */ } }
          this.pollNotifications();
          if (n.BookingID) this.go(base + encodeURIComponent(n.BookingID));
        }
      }, el('div', { class: 'cat-icon', style: { width: '42px', height: '42px', margin: 0 } }, UI.icon(this.notifIcon(n.Type))),
        el('div', { class: 'grow' }, el('h4', { text: n.Title }), el('div', { class: 'small', text: n.Message }),
          el('div', { class: 'small muted', text: UI.fmtDateTime(n.CreatedAt) })))));
    });
  },
  notifIcon(t) {
    return { NEW_BOOKING: 'event_available', BOOKING_ASSIGNED: 'assignment_ind', JOB_ACCEPTED: 'thumb_up', JOB_REJECTED: 'thumb_down',
      WORK_STARTED: 'construction', WORK_COMPLETED: 'task_alt', PAYMENT_SUBMITTED: 'payments', PAYMENT_VERIFIED: 'verified',
      BOOKING_CANCELLED: 'event_busy', ACCOUNT: 'badge' }[t] || 'notifications';
  },

  /* ---------------- PWA ---------------- */
  isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent); },
  isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; },
  async install() {
    if (this.installPrompt) {
      this.installPrompt.prompt();
      await this.installPrompt.userChoice;
      this.installPrompt = null;
      this.renderHeader();
      return;
    }
    const el = UI.el;
    UI.modal({
      title: 'Install MU MISTRY',
      body: el('div', { class: 'stack' },
        this.isStandalone() ? el('div', { class: 'alert ok', text: 'MU MISTRY is already installed on this device.' }) : null,
        el('h4', { text: 'Android (Chrome)' }),
        el('ol', null, el('li', { text: 'Tap the ⋮ menu at the top right.' }), el('li', { text: 'Tap "Install app" or "Add to Home screen".' }), el('li', { text: 'Tap Install.' })),
        el('h4', { text: 'iPhone (Safari)' }),
        el('ol', null, el('li', { text: 'Tap the Share button (square with an arrow).' }), el('li', { text: 'Tap "Add to Home Screen".' }), el('li', { text: 'Tap Add.' })),
        el('h4', { text: 'Computer (Chrome / Edge)' }),
        el('p', { text: 'Click the install icon at the right end of the address bar.' }))
    });
  },
  registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    // Reload only when the user pressed "Update" – NOT when the first service worker takes control
    // (that would wipe a form the user is typing on their very first visit).
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (this.updateRequested && !this.reloading) { this.reloading = true; location.reload(); }
    });
    navigator.serviceWorker.register('./service-worker.js').then(reg => {
      const offer = worker => this.showUpdateBanner(worker);
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); });
      });
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    }).catch(() => { /* PWA features unavailable (e.g. opened from file://) */ });
  },
  showUpdateBanner(worker) {
    if (document.querySelector('.banner')) return;
    const el = UI.el;
    const b = el('div', { class: 'banner', role: 'alert' }, UI.icon('system_update'),
      el('div', { class: 'grow', text: 'A new version of MU MISTRY is available.' }),
      el('button', { class: 'btn btn-sm', onclick: () => { this.updateRequested = true; worker.postMessage({ type: 'SKIP_WAITING' }); b.remove(); } }, 'Update'),
      el('button', { class: 'icon-btn', style: { color: '#fff' }, 'aria-label': 'Later', onclick: () => b.remove() }, UI.icon('close')));
    document.body.appendChild(b);
  }
};

document.addEventListener('DOMContentLoaded', () => App.start());
