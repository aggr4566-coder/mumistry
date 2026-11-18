/* =====================================================================
   MU MISTRY – home.js
   Public pages: homepage, category pages, search, login and the two
   registration forms (customer, professional).
   Developed by Debasis Rout
   ===================================================================== */
'use strict';

const Home = (() => {
  const el = UI.el;

  function area() { try { return localStorage.getItem('mm_area') || ''; } catch (e) { return ''; } }
  function setArea(v) { try { localStorage.setItem('mm_area', v); } catch (e) { /* ignore */ } }

  function serviceCard(s) {
    return el('div', { class: 'service-card' },
      el('div', { class: 'row between' }, el('span', { class: 'chip gray' }, UI.icon(s.Icon || 'home_repair_service'), s.CategoryName),
        s.IsPopular ? el('span', { class: 'chip' }, '★ Popular') : null),
      el('h3', { text: s.ServiceName }),
      el('p', { class: 'muted small', text: s.Description }),
      el('div', { class: 'row between', style: { marginTop: 'auto' } },
        el('div', null,
          el('div', { class: 'price' }, UI.money(s.BasePrice), el('small', { text: ' ' + (s.PriceUnit || '') })),
          s.VisitCharge ? el('div', { class: 'small muted', text: '+ ' + UI.money(s.VisitCharge) + ' visit charge' }) : null,
          s.EstimatedDuration ? el('div', { class: 'small muted', text: '⏱ ' + s.EstimatedDuration }) : null),
        el('a', { class: 'btn btn-sm', href: '#/book/' + encodeURIComponent(s.ServiceID) }, 'Book')));
  }

  function catGrid(categories) {
    return el('div', { class: 'cat-grid' }, categories.map(c =>
      el('a', { class: 'cat-card', href: '#/category/' + encodeURIComponent(c.name) },
        el('div', { class: 'cat-icon' }, UI.icon(c.icon)), el('b', { text: c.name }))));
  }

  /* ---------------- HOME ---------------- */
  function home() {
    const cfg = App.config || {};
    const cat = App.catalog;
    const areas = cfg.serviceAreas || [];
    const results = el('div');
    const loc = UI.select('area', [{ value: '', label: 'Select your area' }].concat(areas.map(a => ({ value: a, label: a }))), area());
    loc.addEventListener('change', () => { setArea(loc.value); UI.toast('Location set to ' + (loc.value || 'none')); });
    const search = el('input', { type: 'search', placeholder: 'Search for "fan", "AC service", "cleaning"…', 'aria-label': 'Search services' });
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      UI.clear(results);
      if (q.length < 2) return;
      const found = App.allServices().filter(s => (s.ServiceName + ' ' + s.CategoryName + ' ' + s.Description).toLowerCase().indexOf(q) >= 0);
      results.appendChild(el('div', { class: 'section', style: { paddingTop: 0 } },
        el('h3', { text: found.length + ' result' + (found.length === 1 ? '' : 's') + ' for "' + search.value.trim() + '"' }),
        found.length ? el('div', { class: 'grid grid-3' }, found.map(serviceCard)) : UI.empty('search_off', 'No service found. Try another word or call us.')));
    });

    const reviewsBox = el('div');
    const page = el('div', null,
      el('section', { class: 'hero' }, el('div', { class: 'container' },
        el('h1', { text: 'Home services in ' + (cfg.city || 'Bhubaneswar') + ', at your doorstep' }),
        el('p', { text: 'Verified professionals · Transparent prices · Pay cash or UPI after the work' }),
        el('div', { class: 'hero-tools' },
          el('div', { class: 'loc-box' }, UI.icon('location_on'), loc),
          el('div', { class: 'search-box' }, UI.icon('search'), search)))),
      el('div', { class: 'container lift' },
        el('div', { class: 'card' }, el('h3', { text: 'What do you need help with?' }),
          cat ? catGrid(cat.categories) : UI.spinner()),
        results),
      el('div', { class: 'container' },
        cat && cat.popular.length ? el('section', { class: 'section' },
          el('h2', { text: 'Popular services' }), el('p', { class: 'sub', text: 'Most booked in ' + (cfg.city || 'Bhubaneswar') }),
          el('div', { class: 'grid grid-3' }, cat.popular.slice(0, 9).map(serviceCard))) : null,
        el('section', { class: 'section' },
          el('h2', { text: 'How it works' }), el('p', { class: 'sub', text: 'Book in under a minute' }),
          el('div', { class: 'grid grid-4 steps' },
            [['Choose a service', 'Pick from 10 categories with clear prices.'],
              ['Pick date & time', 'Choose your address, date and a 2-hour slot.'],
              ['Expert arrives', 'A verified professional is assigned and confirms.'],
              ['Pay after work', 'Pay cash or UPI only after the job is done.']]
              .map(s => el('div', { class: 'step' }, el('b', { text: s[0] }), el('p', { class: 'small muted', text: s[1] }))))),
        el('section', { class: 'section why' },
          el('h2', { text: 'Why choose MU MISTRY' }), el('p', { class: 'sub', text: 'Local, trusted and transparent' }),
          el('div', { class: 'grid grid-2' },
            [['verified_user', 'Verified professionals', 'Every professional is ID-verified and approved by our team.'],
              ['currency_rupee', 'Transparent pricing', 'See the starting price before you book. No hidden charges.'],
              ['schedule', 'On-time service', 'Choose your slot. Track your booking at every step.'],
              ['support_agent', 'Local support', 'A ' + (cfg.city || 'Bhubaneswar') + ' team that answers your calls and complaints.']]
              .map(w => el('div', { class: 'card' }, el('div', { class: 'cat-icon' }, UI.icon(w[0])),
                el('div', null, el('b', { text: w[1] }), el('p', { class: 'small muted', text: w[2] })))))),
        el('section', { class: 'section' },
          el('h2', { text: 'What customers say' }), reviewsBox),
        el('section', { class: 'section' }, el('div', { class: 'card', style: { background: 'var(--primary-50)' } },
          el('div', { class: 'row between' },
            el('div', null, el('h3', { text: 'Are you a skilled professional?' }),
              el('p', { class: 'muted', text: 'Join MU MISTRY and get regular work in ' + (cfg.city || 'Bhubaneswar') + '.' })),
            el('a', { class: 'btn', href: '#/join' }, 'Join as professional'))))));
    App.render(page, { footer: true, nav: 'home' });

    API.call('public.reviews').then(list => {
      UI.clear(reviewsBox).appendChild(list.length
        ? el('div', { class: 'grid grid-3' }, list.map(r => el('div', { class: 'card review-card' },
          el('div', { class: 'stars', text: UI.starsText(r.rating) }), el('p', { text: '“' + r.comment + '”' }),
          el('div', { class: 'small muted', text: r.name + (r.service ? ' · ' + r.service : '') }))))
        : el('p', { class: 'muted', text: 'Be one of our first customers – reviews will appear here.' }));
    }).catch(() => UI.clear(reviewsBox));
  }

  /* ---------------- CATEGORY ---------------- */
  async function category(name) {
    const page = el('div', { class: 'container page' });
    App.render(page, { footer: true, nav: 'services' });
    try { await App.ensureCatalog(); } catch (err) { page.appendChild(UI.empty('cloud_off', err.message)); return; }
    const cat = App.catalog.categories.find(c => c.name === name) || App.catalog.categories[0];
    UI.append(page, [
      el('div', { class: 'tabs', style: { top: '62px' } }, el('div', { class: 'row' }, App.catalog.categories.map(c =>
        el('a', { class: 'tab' + (c.name === cat.name ? ' active' : ''), href: '#/category/' + encodeURIComponent(c.name) }, UI.icon(c.icon), c.name)))),
      el('div', { class: 'page-head', style: { marginTop: '10px' } }, el('h1', null, UI.icon(cat.icon), ' ', cat.name)),
      cat.services.length ? el('div', { class: 'grid grid-3' }, cat.services.map(serviceCard))
        : UI.empty('construction', 'Services for this category are coming soon. Call us for custom work.')
    ]);
  }

  /* ---------------- LOGIN ---------------- */
  function login(query) {
    let role = ['customer', 'professional', 'admin'].indexOf(query.role) >= 0 ? query.role : 'customer';
    const next = query.next || '';
    const page = el('div', { class: 'container page' });
    const draw = () => {
      const form = el('form', { class: 'card', autocomplete: 'on' },
        role === 'admin' ? el('h2', { text: 'Admin login' }) : el('div', { class: 'seg', role: 'tablist' },
          ['customer', 'professional'].map(r => el('button', { type: 'button', class: r === role ? 'active' : '', onclick: () => { role = r; draw(); } },
            r === 'customer' ? 'Customer' : 'Professional'))),
        UI.field(role === 'admin' ? 'Email' : 'Mobile number or email', UI.input('identifier', { autocomplete: 'username', required: true, inputmode: role === 'admin' ? 'email' : 'text' })),
        UI.field('Password', UI.input('password', { type: 'password', autocomplete: 'current-password', required: true })),
        el('button', { class: 'btn btn-block', type: 'submit' }, 'Login'),
        role === 'admin' ? null : el('p', { class: 'center small', style: { marginTop: '14px' } },
          'New here? ', el('a', { href: role === 'customer' ? '#/register?next=' + encodeURIComponent(next) : '#/join' },
            role === 'customer' ? 'Create a customer account' : 'Register as a professional')),
        el('p', { class: 'center small muted', text: 'Forgot password? Please call MU MISTRY support.' }));
      UI.onSubmit(form, async v => {
        const data = await API.call('auth.login', { role, identifier: v.identifier, password: v.password });
        App.onLogin(data, next);
      });
      UI.clear(page).appendChild(el('div', { class: 'auth-wrap' },
        el('h1', { class: 'center', text: 'Welcome back' }), el('p', { class: 'center muted', text: 'Log in to MU MISTRY' }), form));
    };
    draw();
    App.render(page, { nav: 'login' });
  }

  /* ---------------- REGISTER: CUSTOMER ---------------- */
  function registerCustomer(query) {
    const form = el('form', { class: 'card' },
      UI.field('Full name', UI.input('fullName', { autocomplete: 'name', required: true, maxlength: 80 })),
      UI.field('Mobile number', UI.input('mobile', { type: 'tel', inputmode: 'numeric', autocomplete: 'tel', required: true, placeholder: '10-digit mobile' })),
      UI.field('Email (optional)', UI.input('email', { type: 'email', autocomplete: 'email' })),
      UI.field('Password', UI.input('password', { type: 'password', autocomplete: 'new-password', required: true, minlength: 8 }), 'At least 8 characters, with letters and numbers.'),
      el('button', { class: 'btn btn-block', type: 'submit' }, 'Create account'),
      el('p', { class: 'center small', style: { marginTop: '14px' } }, 'Already registered? ', el('a', { href: '#/login' }, 'Login')));
    UI.onSubmit(form, async v => {
      const data = await API.call('customer.register', v);
      App.onLogin(data, query.next);
    });
    App.render(el('div', { class: 'container page' }, el('div', { class: 'auth-wrap' },
      el('h1', { class: 'center', text: 'Create your account' }), el('p', { class: 'center muted', text: 'Book trusted home services in minutes' }), form)));
  }

  /* ---------------- REGISTER: PROFESSIONAL ---------------- */
  async function registerProfessional() {
    const page = el('div', { class: 'container page' }, UI.spinner());
    App.render(page);
    try { await App.ensureCatalog(); } catch (err) { UI.clear(page).appendChild(UI.empty('cloud_off', err.message)); return; }
    const cats = App.catalog.categories.map(c => c.name);
    const areas = App.config.serviceAreas || [];
    const skills = UI.checkList('skills', cats, []);
    const areaList = UI.checkList('serviceAreas', areas, area() ? [area()] : []);
    const form = el('form', { class: 'card' },
      el('h3', { text: 'Personal details' }),
      UI.field('Full name', UI.input('fullName', { required: true, autocomplete: 'name' })),
      UI.field('Mobile number', UI.input('mobile', { type: 'tel', inputmode: 'numeric', required: true })),
      UI.field('Email (optional)', UI.input('email', { type: 'email' })),
      UI.field('Password', UI.input('password', { type: 'password', autocomplete: 'new-password', required: true }), 'At least 8 characters, with letters and numbers.'),
      UI.field('Your home locality', UI.select('locality', areas, area())),
      el('h3', { text: 'Work details', style: { marginTop: '10px' } }),
      UI.field('Main service', UI.select('primaryCategory', cats)),
      el('div', { class: 'field' }, el('span', { text: 'Other skills (optional)' }), skills),
      UI.field('Experience (years)', UI.input('experienceYears', { type: 'number', min: 0, max: 50, value: '1', required: true })),
      el('div', { class: 'field' }, el('span', { text: 'Areas where you can work' }), areaList),
      UI.field('Availability', UI.input('availability', { value: 'Mon–Sat, 9 AM – 7 PM' })),
      el('div', { class: 'alert info' }, UI.icon('info'), el('div', { text: 'After registering, upload your photo and an ID document. MU MISTRY verifies every professional before sending jobs.' })),
      el('button', { class: 'btn btn-block', type: 'submit', style: { marginTop: '14px' } }, 'Register'));
    UI.onSubmit(form, async v => {
      const primary = v.primaryCategory;
      const sk = UI.checkedValues(skills);
      if (sk.indexOf(primary) < 0) sk.unshift(primary);
      const payload = { fullName: v.fullName, mobile: v.mobile, email: v.email, password: v.password, locality: v.locality,
        primaryCategory: primary, skills: sk, experienceYears: Number(v.experienceYears), serviceAreas: UI.checkedValues(areaList), availability: v.availability };
      const data = await API.call('professional.register', payload);
      App.onLogin(data, '#/pro/profile');
    });
    UI.clear(page).appendChild(el('div', { class: 'auth-wrap', style: { maxWidth: '640px' } },
      el('h1', { class: 'center', text: 'Join MU MISTRY' }), el('p', { class: 'center muted', text: 'Get regular jobs in ' + (App.config.city || 'Bhubaneswar') }), form));
  }

  return { home, category, login, registerCustomer, registerProfessional, serviceCard, area };
})();
