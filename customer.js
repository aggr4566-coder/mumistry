/* =====================================================================
   MU MISTRY – customer.js
   Customer dashboard: book a service, track bookings, view the assigned
   professional, cancel / reschedule, pay (cash or UPI + UTR), review,
   addresses, profile and complaints.
   Developed by Debasis Rout
   ===================================================================== */
'use strict';

const Customer = (() => {
  const el = UI.el;

  const TABS = [
    { key: 'dash', label: 'Home', icon: 'home', href: '#/customer' },
    { key: 'bookings', label: 'My bookings', icon: 'event_note', href: '#/customer/bookings' },
    { key: 'addresses', label: 'Addresses', icon: 'home_pin', href: '#/customer/addresses' },
    { key: 'support', label: 'Help & complaints', icon: 'support_agent', href: '#/customer/support' },
    { key: 'profile', label: 'Profile', icon: 'person', href: '#/customer/profile' }
  ];
  function shell(active, content) {
    App.render(el('div', { class: 'container page' }, content), { tabs: UI.tabs(TABS, active), nav: active });
  }

  function route(section, id) {
    if (!section) return dashboard();
    if (section === 'bookings') return bookings();
    if (section === 'booking') return bookingDetail(id);
    if (section === 'addresses') return addresses();
    if (section === 'profile') return profile();
    if (section === 'support') return support();
    return dashboard();
  }

  function bookingItem(b) {
    return el('div', { class: 'list-item', onclick: () => App.go('#/customer/booking/' + encodeURIComponent(b.BookingID)) },
      el('div', { class: 'cat-icon', style: { margin: 0 } }, UI.icon('home_repair_service')),
      el('div', { class: 'grow' },
        el('h4', { text: b.ServiceName }),
        el('div', { class: 'small muted', text: b.BookingID + ' · ' + UI.fmtDay(b.PreferredDate) + ' · ' + b.PreferredSlot }),
        el('div', { class: 'row', style: { marginTop: '6px', gap: '6px' } }, UI.badge(b.Status),
          b.Status === 'Completed' ? UI.badge(b.PaymentStatus) : null)),
      UI.icon('chevron_right'));
  }

  /* ---------------- DASHBOARD ---------------- */
  function dashboard() {
    const box = el('div');
    const s = Session.get();
    shell('dash', el('div', null,
      el('div', { class: 'page-head' }, el('div', null, el('h1', { text: 'Hello, ' + String(s.user.FullName).split(' ')[0] + ' 👋' }),
        el('p', { class: 'muted', text: 'What can we fix for you today?' })),
        el('a', { class: 'btn', href: '#/' }, UI.icon('add'), 'Book a service')),
      box));
    UI.load(box, () => API.call('customer.dashboard'), d => el('div', { class: 'stack' },
      el('div', { class: 'grid grid-4' },
        UI.stat('Open bookings', d.counts.open, 'pending_actions', 'blue'),
        UI.stat('Completed', d.counts.completed, 'task_alt'),
        UI.stat('To pay', d.counts.awaitingPayment, 'payments'),
        UI.stat('Total bookings', d.counts.total, 'event_note')),
      d.awaitingPayment.length ? el('div', { class: 'card' }, el('div', { class: 'card-title' }, el('h3', { text: 'Waiting for your payment' })),
        d.awaitingPayment.map(bookingItem)) : null,
      el('div', { class: 'card' }, el('div', { class: 'card-title' }, el('h3', { text: 'Upcoming' }), el('a', { href: '#/customer/bookings', text: 'See all' })),
        d.upcoming.length ? d.upcoming.map(bookingItem) : UI.empty('event_available', 'No upcoming bookings.', el('a', { class: 'btn btn-ghost', href: '#/' }, 'Browse services')))));
  }

  /* ---------------- BOOK A SERVICE ---------------- */
  async function book(serviceId) {
    const page = el('div', { class: 'container page' }, UI.spinner());
    App.render(page, { nav: 'home' });
    let addrs;
    try {
      await App.ensureCatalog();
      addrs = await API.call('customer.addresses');
    } catch (err) { UI.clear(page).appendChild(UI.empty('cloud_off', err.message)); return; }
    const svc = App.findService(serviceId);
    if (!svc) { UI.clear(page).appendChild(UI.empty('search_off', 'This service is not available.', el('a', { class: 'btn', href: '#/' }, 'Back to services'))); return; }
    const cfg = App.config;
    if (!cfg.bookingsEnabled) { UI.clear(page).appendChild(UI.empty('pause_circle', 'New bookings are paused right now. Please try again later.')); return; }

    const requestId = API.newRequestId(); // same ID if the user taps twice → only one booking
    const areas = cfg.serviceAreas || [];
    const newAddr = el('div', { class: addrs.length ? 'hidden' : '' },
      UI.field('House / flat / street', UI.input('addressLine', { placeholder: 'e.g. Plot 23, Lane 4' })),
      UI.field('Landmark (optional)', UI.input('landmark', { placeholder: 'Near …' })),
      el('div', { class: 'grid grid-2' },
        UI.field('Locality', UI.select('locality', areas, Home.area())),
        UI.field('PIN code', UI.input('pincode', { inputmode: 'numeric', maxlength: 6, placeholder: '7510xx' }))),
      el('label', { class: 'switch' }, el('input', { type: 'checkbox', name: 'saveAddress', checked: true }), 'Save this address'));
    const addrChoice = el('div', { class: 'stack' },
      addrs.map((a, i) => el('label', { class: 'radio-card', style: { display: 'flex', gap: '10px' } },
        el('input', { type: 'radio', name: 'addressId', value: a.AddressID, checked: i === 0 }),
        el('div', null, el('b', { text: a.Label }), el('div', { class: 'small muted', text: a.AddressLine + (a.Landmark ? ', ' + a.Landmark : '') + ', ' + a.Locality + ' – ' + a.Pincode })))),
      addrs.length ? el('label', { class: 'radio-card', style: { display: 'flex', gap: '10px' } },
        el('input', { type: 'radio', name: 'addressId', value: '' }), el('b', { text: '+ Use a new address' })) : null);
    addrChoice.addEventListener('change', () => {
      const v = (addrChoice.querySelector('input[name=addressId]:checked') || {}).value;
      newAddr.classList.toggle('hidden', !!v);
    });

    const dateInput = UI.input('preferredDate', { type: 'date', min: UI.todayIst(0), max: UI.todayIst(cfg.maxAdvanceBookingDays || 30), value: UI.todayIst(1), required: true });
    const slotSel = UI.select('preferredSlot', cfg.bookingSlots || []);
    const refreshSlots = () => {
      const today = dateInput.value === UI.todayIst(0);
      const now = new Date();
      const nowMins = Number(now.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false })) * 60 +
        Number(now.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', minute: '2-digit' }));
      Array.from(slotSel.options).forEach(o => {
        const p = o.value.split('-')[0].split(':');
        o.disabled = today && (Number(p[0]) * 60 + Number(p[1]) - nowMins < 60);
      });
      if (slotSel.selectedOptions[0] && slotSel.selectedOptions[0].disabled) {
        const first = Array.from(slotSel.options).find(o => !o.disabled);
        slotSel.value = first ? first.value : '';
      }
    };
    dateInput.addEventListener('change', refreshSlots);
    refreshSlots();

    const form = el('form', { class: 'stack' },
      el('div', { class: 'card' },
        el('div', { class: 'row between' }, el('div', null, el('span', { class: 'chip gray', text: svc.CategoryName }), el('h2', { text: svc.ServiceName, style: { marginTop: '8px' } }),
          el('p', { class: 'muted small', text: svc.Description })),
          el('div', { class: 'price' }, UI.money(svc.BasePrice), el('small', { text: ' ' + svc.PriceUnit })))),
      el('div', { class: 'card' }, el('h3', { text: '1. Address' }), addrChoice, newAddr),
      el('div', { class: 'card' }, el('h3', { text: '2. Date & time' }),
        el('div', { class: 'grid grid-2' }, UI.field('Date', dateInput), UI.field('Time slot', slotSel))),
      el('div', { class: 'card' }, el('h3', { text: '3. Describe the work' }),
        UI.field('Requirements (optional)', UI.textarea('requirements', { maxlength: 1000, placeholder: 'e.g. 2 switches not working in bedroom, fan makes noise…' }))),
      el('div', { class: 'card' }, el('h3', { text: '4. Payment method' }),
        el('div', { class: 'radio-row' },
          el('label', { class: 'radio-card' }, el('input', { type: 'radio', name: 'paymentMethod', value: 'Cash', checked: true }), el('b', { text: ' Cash' }),
            el('div', { class: 'small muted', text: 'Pay the professional after the work' })),
          el('label', { class: 'radio-card' }, el('input', { type: 'radio', name: 'paymentMethod', value: 'UPI' }), el('b', { text: ' UPI' }),
            el('div', { class: 'small muted', text: 'Pay MU MISTRY by any UPI app after the work' })))),
      el('div', { class: 'card' },
        el('div', { class: 'row between' }, el('span', { text: 'Starting price' }), el('b', { text: UI.money(svc.BasePrice) })),
        svc.VisitCharge ? el('div', { class: 'row between' }, el('span', { text: 'Visit charge' }), el('b', { text: UI.money(svc.VisitCharge) })) : null,
        el('div', { class: 'row between', style: { borderTop: '1px solid var(--line)', marginTop: '8px', paddingTop: '8px' } },
          el('b', { text: 'Estimated total' }), el('b', { class: 'price', text: UI.money(svc.BasePrice + svc.VisitCharge) })),
        el('p', { class: 'small muted', style: { marginTop: '8px' }, text: 'Final amount is confirmed by the professional after inspection (spare parts extra). You pay only after the work is done.' }),
        el('button', { class: 'btn btn-block', type: 'submit' }, 'Confirm booking')));

    UI.onSubmit(form, async v => {
      const payload = { serviceId: svc.ServiceID, preferredDate: v.preferredDate, preferredSlot: v.preferredSlot,
        requirements: v.requirements, paymentMethod: v.paymentMethod };
      if (v.addressId) payload.addressId = v.addressId;
      else Object.assign(payload, { addressLine: v.addressLine, landmark: v.landmark, locality: v.locality, pincode: v.pincode, saveAddress: !!v.saveAddress });
      const r = await API.call('booking.create', payload, { requestId });
      UI.modal({
        title: 'Booking confirmed 🎉',
        body: el('div', { class: 'center' }, el('div', { class: 'cat-icon', style: { background: 'var(--ok-50)', color: 'var(--ok)' } }, UI.icon('check_circle')),
          el('p', { text: 'Your booking ID is' }), el('h2', { text: r.booking.BookingID }),
          el('p', { class: 'muted', text: 'We will assign a verified professional and notify you.' })),
        actions: [{ label: 'View booking', onClick: () => App.go('#/customer/booking/' + encodeURIComponent(r.booking.BookingID)) }]
      });
    });
    UI.clear(page).appendChild(el('div', { style: { maxWidth: '720px', margin: '0 auto' } }, el('h1', { text: 'Book a service' }), form));
  }

  /* ---------------- BOOKINGS LIST ---------------- */
  function bookings() {
    const box = el('div');
    shell('bookings', el('div', null, el('div', { class: 'page-head' }, el('h1', { text: 'My bookings' })), box));
    UI.load(box, () => API.call('booking.list'), list => list.length ? el('div', null, list.map(bookingItem))
      : UI.empty('event_note', 'You have no bookings yet.', el('a', { class: 'btn', href: '#/' }, 'Book a service')));
  }

  /* ---------------- BOOKING DETAIL ---------------- */
  function timeline(b) {
    const steps = [['New', 'Booking received', b.CreatedAt], ['Assigned', 'Professional assigned', b.AssignedAt],
      ['Accepted', 'Professional confirmed', b.AcceptedAt], ['In Progress', 'Work started', b.StartedAt], ['Completed', 'Work completed', b.CompletedAt]];
    if (b.Status === 'Cancelled') return el('div', { class: 'alert bad' }, UI.icon('cancel'), el('div', { text: 'Cancelled on ' + UI.fmtDateTime(b.CancelledAt) + (b.CancelReason ? ' – ' + b.CancelReason : '') }));
    const order = ['New', 'Rejected', 'Assigned', 'Accepted', 'In Progress', 'Completed'];
    const cur = b.Status === 'Rejected' ? 'Assigned' : b.Status;
    const idx = steps.findIndex(s => s[0] === cur);
    return el('ul', { class: 'timeline' }, steps.map((s, i) => el('li', { class: i < idx || (i === idx && cur === 'Completed') ? 'done' : (i === idx ? 'now' : '') },
      el('b', { text: s[1] }), s[2] && i <= idx ? el('div', { class: 'small muted', text: UI.fmtDateTime(s[2]) }) : null)),
      order.indexOf(b.Status) >= 0 && b.Status === 'Rejected' ? el('li', { class: 'now', text: 'Finding another professional for you…' }) : null);
  }

  function photos(title, ids) {
    if (!ids || !ids.length) return null;
    return el('div', null, el('h4', { text: title }), el('div', { class: 'photo-grid' }, ids.map(id => UI.privateImage(id, '', title))));
  }

  function bookingDetail(id) {
    const box = el('div');
    shell('bookings', el('div', null, el('a', { href: '#/customer/bookings', class: 'small' }, '← All bookings'), box));
    UI.load(box, () => API.call('booking.get', { bookingId: id }), b => {
      const p = b.professional;
      return el('div', { class: 'grid grid-2', style: { alignItems: 'start', marginTop: '10px' } },
        el('div', null,
          el('div', { class: 'card' },
            el('div', { class: 'row between' }, el('div', null, el('h2', { text: b.ServiceName, style: { marginBottom: '2px' } }), el('div', { class: 'small muted', text: b.BookingID })),
              el('div', { class: 'row' }, UI.badge(b.Status), b.Status === 'Completed' ? UI.badge(b.PaymentStatus) : null)),
            el('div', { style: { marginTop: '14px' } }, UI.kv([
              ['Date', UI.fmtDay(b.PreferredDate)], ['Time', b.PreferredSlot],
              ['Address', [b.AddressLine, b.Landmark, b.Locality, b.City + ' – ' + b.Pincode].filter(Boolean).join(', ')],
              ['Requirements', b.Requirements], ['Payment', b.PaymentMethod],
              ['Estimated', UI.money(b.EstimatedAmount)], ['Final amount', b.FinalAmount !== null ? UI.money(b.FinalAmount) : null]]))),
          p ? el('div', { class: 'card' }, el('h3', { text: 'Your professional' }),
            el('div', { class: 'row' }, p.photoFileId ? UI.privateImage(p.photoFileId, 'avatar', p.name) : el('div', { class: 'avatar', text: UI.initials(p.name) }),
              el('div', { class: 'grow' }, el('b', { text: p.name }),
                el('div', { class: 'small muted', text: p.category + ' · ' + p.experienceYears + (p.experienceYears === 1 ? ' yr' : ' yrs') + ' exp' }),
                el('div', { class: 'small', text: p.ratingCount ? '★ ' + p.rating + ' (' + p.ratingCount + ' reviews)' : 'New on MU MISTRY' })),
              p.mobile ? el('a', { class: 'btn btn-ghost btn-sm', href: 'tel:+91' + p.mobile }, UI.icon('call'), 'Call') : null),
            !p.mobile ? el('p', { class: 'small muted', style: { marginTop: '8px' }, text: 'Contact number appears after the professional confirms.' }) : null) : null,
          b.beforePhotos.length || b.afterPhotos.length ? el('div', { class: 'card stack' }, photos('Before work', b.beforePhotos), photos('After work', b.afterPhotos)) : null),
        el('div', null,
          el('div', { class: 'card' }, el('h3', { text: 'Status' }), timeline(b)),
          actionsCard(b)));
    });
  }

  function actionsCard(b) {
    const a = b.actions || {};
    const card = el('div', { class: 'card stack' });
    if (a.pay) card.appendChild(payPanel(b));
    else if (b.PaymentStatus === 'UPI Submitted') card.appendChild(el('div', { class: 'alert info' }, UI.icon('hourglass_top'), el('div', { text: 'UPI payment submitted. MU MISTRY will confirm after checking the bank account.' })));
    else if (b.PaymentStatus === 'Verified' || b.PaymentStatus === 'Cash Collected') card.appendChild(el('div', { class: 'alert ok' }, UI.icon('verified'), el('div', { text: 'Payment received – thank you!' })));
    if (a.review) card.appendChild(reviewPanel(b));
    else if (b.review) card.appendChild(el('div', null, el('h4', { text: 'Your review' }), el('div', { class: 'stars', style: { color: 'var(--accent)' }, text: UI.starsText(b.review.rating) }), el('p', { class: 'small', text: b.review.comment })));
    const btns = el('div', { class: 'row' });
    if (a.reschedule) btns.appendChild(el('button', { class: 'btn btn-outline btn-sm', onclick: () => reschedule(b) }, UI.icon('event_repeat'), 'Reschedule'));
    if (a.cancel) btns.appendChild(el('button', { class: 'btn btn-outline btn-sm', style: { color: 'var(--bad)' }, onclick: () => cancel(b) }, UI.icon('event_busy'), 'Cancel'));
    btns.appendChild(el('button', { class: 'btn btn-outline btn-sm', onclick: () => complaint(b.BookingID) }, UI.icon('report'), 'Raise complaint'));
    card.appendChild(btns);
    return card;
  }

  function payPanel(b) {
    const box = el('div', null, el('h3', { text: 'Pay ' + UI.money(b.FinalAmount) }), UI.spinner());
    API.call('payment.info', { bookingId: b.BookingID }).then(info => {
      UI.clear(box);
      const utr = UI.input('utr', { inputmode: 'numeric', maxlength: 22, placeholder: '12-digit UTR / reference no.' });
      UI.append(box, [
        el('h3', { text: 'Pay ' + UI.money(info.amount) }),
        b.PaymentStatus === 'Payment Rejected' ? el('div', { class: 'alert bad' }, UI.icon('error'), el('div', { text: 'Your last UPI reference could not be confirmed. Please check and submit again.' })) : null,
        el('div', { class: 'alert info' }, UI.icon('payments'), el('div', { text: 'Paying cash? Just pay the professional – they confirm it in their app.' })),
        info.upiAvailable ? el('div', { class: 'stack' },
          el('h4', { text: 'Pay by UPI' }),
          UI.kv([['UPI ID', el('span', null, info.upiId, ' ', el('button', { class: 'link-btn small', onclick: () => {
            navigator.clipboard && navigator.clipboard.writeText(info.upiId).then(() => UI.toast('UPI ID copied'));
          } }, 'Copy'))], ['Name', info.payeeName], ['Amount', UI.money(info.amount)], ['Note', 'MU MISTRY ' + b.BookingID]]),
          el('a', { class: 'btn btn-ghost btn-block', href: info.upiLink }, UI.icon('open_in_new'), 'Open UPI app (phone)'),
          UI.field('After paying, enter the UTR / reference number', utr, info.note),
          el('button', { class: 'btn btn-block', onclick: async e => {
            e.target.disabled = true;
            try {
              await API.call('payment.submitUpi', { bookingId: b.BookingID, utr: utr.value });
              UI.toast('Payment submitted for verification.', 'ok');
              bookingDetail(b.BookingID);
            } catch (err) { UI.errorToast(err); } finally { e.target.disabled = false; }
          } }, 'Submit UPI payment')) : null
      ]);
    }).catch(err => { UI.clear(box).appendChild(el('p', { class: 'muted', text: err.message })); });
    return box;
  }

  function reviewPanel(b) {
    const comment = UI.textarea('comment', { maxlength: 500, placeholder: 'How was the service?' });
    const stars = UI.starInput();
    return el('div', null, el('h3', { text: 'Rate your experience' }), stars, UI.field('Comment', comment),
      el('button', { class: 'btn btn-sm', onclick: async e => {
        if (!stars.getValue()) return UI.toast('Please choose a star rating.', 'bad');
        e.target.disabled = true;
        try {
          await API.call('review.submit', { bookingId: b.BookingID, rating: stars.getValue(), comment: comment.value });
          UI.toast('Thank you for your review!', 'ok');
          bookingDetail(b.BookingID);
        } catch (err) { UI.errorToast(err); e.target.disabled = false; }
      } }, 'Submit review'));
  }

  async function cancel(b) {
    const reason = await UI.promptDialog('Cancel booking', 'Why are you cancelling?', { okText: 'Cancel booking', danger: true, placeholder: 'e.g. Not at home' });
    if (!reason) return;
    try { await API.call('booking.cancel', { bookingId: b.BookingID, reason }); UI.toast('Booking cancelled.'); bookingDetail(b.BookingID); }
    catch (err) { UI.errorToast(err); }
  }

  function reschedule(b) {
    const cfg = App.config || {};
    const d = UI.input('preferredDate', { type: 'date', min: UI.todayIst(0), max: UI.todayIst(cfg.maxAdvanceBookingDays || 30), value: b.PreferredDate });
    const s = UI.select('preferredSlot', cfg.bookingSlots || [], b.PreferredSlot);
    UI.modal({
      title: 'Reschedule ' + b.BookingID,
      body: el('div', null, UI.field('New date', d), UI.field('New time slot', s)),
      actions: [{ label: 'Close', class: 'btn btn-outline' }, { label: 'Reschedule', onClick: async () => {
        await API.call('booking.reschedule', { bookingId: b.BookingID, preferredDate: d.value, preferredSlot: s.value });
        UI.toast('Booking rescheduled.', 'ok');
        bookingDetail(b.BookingID);
      } }]
    });
  }

  function complaint(bookingId) {
    const subject = UI.input('subject', { maxlength: 100 });
    const desc = UI.textarea('description', { maxlength: 1000 });
    UI.modal({
      title: 'Raise a complaint',
      body: el('div', null, bookingId ? el('p', { class: 'small muted', text: 'Booking ' + bookingId }) : null,
        UI.field('Subject', subject), UI.field('What happened?', desc, 'At least 10 characters.')),
      actions: [{ label: 'Cancel', class: 'btn btn-outline' }, { label: 'Submit', onClick: async () => {
        const r = await API.call('complaint.submit', { bookingId: bookingId || '', subject: subject.value, description: desc.value });
        UI.toast('Complaint ' + r.complaintId + ' submitted.', 'ok');
        if (location.hash.indexOf('#/customer/support') === 0) support();
      } }]
    });
  }

  /* ---------------- ADDRESSES ---------------- */
  function addresses() {
    const box = el('div');
    shell('addresses', el('div', null, el('div', { class: 'page-head' }, el('h1', { text: 'Saved addresses' }),
      el('button', { class: 'btn', onclick: () => editAddress(null) }, UI.icon('add'), 'Add address')), box));
    UI.load(box, () => API.call('customer.addresses'), list => list.length ? el('div', null, list.map(a =>
      el('div', { class: 'list-item', style: { cursor: 'default' } }, el('div', { class: 'cat-icon', style: { margin: 0 } }, UI.icon('home_pin')),
        el('div', { class: 'grow' }, el('h4', null, a.Label, a.IsDefault ? el('span', { class: 'chip', style: { marginLeft: '6px' }, text: 'Default' }) : null),
          el('div', { class: 'small muted', text: a.AddressLine + (a.Landmark ? ', ' + a.Landmark : '') + ', ' + a.Locality + ', ' + a.City + ' – ' + a.Pincode })),
        el('button', { class: 'icon-btn', 'aria-label': 'Edit', onclick: () => editAddress(a) }, UI.icon('edit')),
        el('button', { class: 'icon-btn', 'aria-label': 'Delete', onclick: async () => {
          if (!(await UI.confirmDialog('Delete this address?', 'Delete', true))) return;
          try { await API.call('customer.deleteAddress', { addressId: a.AddressID }); addresses(); } catch (err) { UI.errorToast(err); }
        } }, UI.icon('delete')))))
      : UI.empty('home_pin', 'No saved addresses yet.'));
  }

  function editAddress(a) {
    a = a || {};
    const areas = (App.config && App.config.serviceAreas) || [];
    const f = el('form', null,
      UI.field('Label', UI.input('label', { value: a.Label || 'Home', maxlength: 30 })),
      UI.field('House / flat / street', UI.input('addressLine', { value: a.AddressLine || '' })),
      UI.field('Landmark', UI.input('landmark', { value: a.Landmark || '' })),
      UI.field('Locality', UI.select('locality', areas, a.Locality || Home.area())),
      UI.field('PIN code', UI.input('pincode', { value: a.Pincode || '', inputmode: 'numeric', maxlength: 6 })),
      el('label', { class: 'switch' }, el('input', { type: 'checkbox', name: 'isDefault', checked: !!a.IsDefault }), 'Make default'));
    UI.modal({
      title: a.AddressID ? 'Edit address' : 'Add address', body: f,
      actions: [{ label: 'Cancel', class: 'btn btn-outline' }, { label: 'Save', onClick: async () => {
        const v = UI.formValues(f);
        await API.call('customer.saveAddress', Object.assign({ addressId: a.AddressID || '' }, v));
        UI.toast('Address saved.', 'ok');
        addresses();
      } }]
    });
  }

  /* ---------------- PROFILE ---------------- */
  function profile() {
    const s = Session.get();
    const u = s.user;
    const form = el('form', { class: 'card' },
      UI.field('Full name', UI.input('fullName', { value: u.FullName })),
      UI.field('Mobile number', UI.input('mobile', { value: u.Mobile, disabled: true }), 'Your login ID. Contact support to change it.'),
      UI.field('Email', UI.input('email', { type: 'email', value: u.Email || '' })),
      el('button', { class: 'btn', type: 'submit' }, 'Save changes'));
    UI.onSubmit(form, async v => {
      const r = await API.call('customer.updateProfile', { fullName: v.fullName, email: v.email });
      Session.updateUser(r.user);
      UI.toast('Profile updated.', 'ok');
    });
    shell('profile', el('div', { style: { maxWidth: '560px' } }, el('h1', { text: 'My profile' }), form,
      el('div', { class: 'card row' },
        el('button', { class: 'btn btn-outline', onclick: () => App.changePassword() }, UI.icon('lock'), 'Change password'),
        el('button', { class: 'btn btn-danger', onclick: () => App.logout() }, UI.icon('logout'), 'Logout'))));
  }

  /* ---------------- SUPPORT ---------------- */
  function support() {
    const box = el('div');
    const cfg = App.config || {};
    shell('support', el('div', null,
      el('div', { class: 'page-head' }, el('h1', { text: 'Help & complaints' }),
        el('button', { class: 'btn', onclick: () => complaint('') }, UI.icon('add'), 'New complaint')),
      el('div', { class: 'card row' }, UI.icon('support_agent'), el('div', { class: 'grow' }, el('b', { text: 'MU MISTRY support' }),
        el('div', { class: 'small muted', text: [cfg.supportPhone ? '+91 ' + cfg.supportPhone : '', cfg.supportEmail].filter(Boolean).join(' · ') || 'Contact details coming soon' })),
        cfg.supportPhone ? el('a', { class: 'btn btn-ghost btn-sm', href: 'tel:+91' + cfg.supportPhone }, 'Call') : null),
      el('h3', { text: 'My complaints', style: { marginTop: '18px' } }), box));
    UI.load(box, () => API.call('complaint.mine'), list => list.length ? el('div', null, list.map(c => el('div', { class: 'card' },
      el('div', { class: 'row between' }, el('b', { text: c.Subject }), UI.badge(c.Status)),
      el('div', { class: 'small muted', text: c.ComplaintID + (c.BookingID ? ' · ' + c.BookingID : '') + ' · ' + UI.fmtDateTime(c.CreatedAt) }),
      el('p', { class: 'small', style: { marginTop: '8px' }, text: c.Description }),
      c.AdminResponse ? el('div', { class: 'alert info' }, UI.icon('reply'), el('div', { text: c.AdminResponse })) : null)))
      : UI.empty('sentiment_satisfied', 'No complaints. We hope you are happy with MU MISTRY!'));
  }

  return { route, book };
})();
