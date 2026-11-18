/* =====================================================================
   MU MISTRY – admin.js
   Admin panel: analytics dashboard, bookings & assignment, professionals
   (approve / reject / suspend), customers, services & prices, UPI
   verification, cash monitoring, settlements & refunds, complaints,
   reviews, reports with CSV export, business settings, audit logs.
   Developed by Debasis Rout
   ===================================================================== */
'use strict';

const Admin = (() => {
  const el = UI.el;
  const STATUSES = ['Open', 'New', 'Rejected', 'Assigned', 'Accepted', 'In Progress', 'Completed', 'Cancelled'];

  const TABS = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '#/admin' },
    { key: 'bookings', label: 'Bookings', icon: 'event_note', href: '#/admin/bookings' },
    { key: 'professionals', label: 'Professionals', icon: 'engineering', href: '#/admin/professionals' },
    { key: 'customers', label: 'Customers', icon: 'group', href: '#/admin/customers' },
    { key: 'services', label: 'Services & prices', icon: 'sell', href: '#/admin/services' },
    { key: 'payments', label: 'Payments', icon: 'account_balance', href: '#/admin/payments' },
    { key: 'settlements', label: 'Settlements', icon: 'currency_exchange', href: '#/admin/settlements' },
    { key: 'complaints', label: 'Complaints', icon: 'report', href: '#/admin/complaints' },
    { key: 'reviews', label: 'Reviews', icon: 'reviews', href: '#/admin/reviews' },
    { key: 'reports', label: 'Reports', icon: 'bar_chart', href: '#/admin/reports' },
    { key: 'settings', label: 'Settings', icon: 'settings', href: '#/admin/settings' },
    { key: 'audit', label: 'Audit log', icon: 'policy', href: '#/admin/audit' }
  ];
  function shell(active, content) {
    App.render(el('div', { class: 'container page' }, content), { tabs: UI.tabs(TABS, active), nav: active });
  }
  function head(title, extra) {
    return el('div', { class: 'page-head' }, el('h1', { text: title }), extra || null);
  }

  function route(section, id, query) {
    const map = { bookings, professionals, customers, services, payments, settlements, complaints, reviews, reports, settings, audit };
    if (section === 'booking') return bookingDetail(id);
    if (map[section]) return map[section](query || {});
    return dashboard();
  }

  /* ================= DASHBOARD ================= */
  function dashboard() {
    const box = el('div');
    shell('dashboard', el('div', null, head('Admin dashboard', el('button', { class: 'btn btn-ghost btn-sm', onclick: dashboard }, UI.icon('refresh'), 'Refresh')), box));
    UI.load(box, () => API.call('admin.dashboard'), d => {
      const f = d.finance, b = d.bookings, u = d.users;
      const max = Math.max(1, ...d.last7Days.map(x => x.bookings));
      const maxCat = Math.max(1, ...d.byCategory.map(x => x.bookings));
      const link = (href, node) => el('a', { href, style: { color: 'inherit' } }, node);
      return el('div', { class: 'stack' },
        b.newBookings || b.needsReassignment || f.upiPendingCount || u.pendingProfessionals ? el('div', { class: 'alert warn' }, UI.icon('priority_high'), el('div', null,
          el('b', { text: 'Needs your attention: ' }),
          [b.newBookings ? b.newBookings + ' new booking(s) to assign' : '', b.needsReassignment ? b.needsReassignment + ' rejected job(s) to reassign' : '',
            f.upiPendingCount ? f.upiPendingCount + ' UPI payment(s) to verify' : '', u.pendingProfessionals ? u.pendingProfessionals + ' professional(s) to approve' : '',
            d.openComplaints ? d.openComplaints + ' open complaint(s)' : ''].filter(Boolean).join(' · '))) : null,
        el('h3', { text: 'Bookings' }),
        el('div', { class: 'grid grid-4' },
          link('#/admin/bookings', UI.stat('Total bookings', b.total, 'event_note', 'blue')),
          link('#/admin/bookings?status=New', UI.stat('New', b.newBookings, 'fiber_new')),
          link('#/admin/bookings?status=Open', UI.stat('Pending (open)', b.pending, 'pending_actions')),
          link('#/admin/bookings?status=Assigned', UI.stat('Assigned / in work', b.assigned, 'assignment_ind')),
          link('#/admin/bookings?status=Completed', UI.stat('Completed', b.completed, 'task_alt')),
          link('#/admin/bookings?status=Cancelled', UI.stat('Cancelled', b.cancelled, 'event_busy')),
          link('#/admin/bookings?status=Rejected', UI.stat('Rejected – reassign', b.needsReassignment, 'sync_problem')),
          UI.stat("Today's open jobs", b.today, 'today')),
        el('h3', { text: 'Money' }),
        el('div', { class: 'grid grid-4' },
          UI.stat('Total business revenue', UI.money(f.totalRevenue), 'currency_rupee', 'blue'),
          UI.stat('Platform commission (' + d.commissionRate + '%)', UI.money(f.totalCommission), 'percent'),
          UI.stat('Professional earnings', UI.money(f.professionalEarnings), 'engineering'),
          UI.stat('Net revenue (after refunds)', UI.money(f.netRevenue), 'account_balance_wallet'),
          UI.stat('Cash collections', UI.money(f.cashCollections), 'payments'),
          UI.stat('UPI collections (verified)', UI.money(f.upiCollections), 'qr_code_2'),
          link('#/admin/payments', UI.stat('UPI waiting verification', UI.money(f.upiPendingVerification) + ' (' + f.upiPendingCount + ')', 'hourglass_top')),
          UI.stat('Refunds', UI.money(f.refunds), 'undo')),
        el('div', { class: 'grid grid-2' },
          link('#/admin/settlements', UI.stat('Commission to collect from professionals', UI.money(f.outstandingCommissionFromProfessionals), 'call_received')),
          link('#/admin/settlements', UI.stat('Payouts due to professionals', UI.money(f.outstandingPayoutsToProfessionals), 'call_made'))),
        el('h3', { text: 'People' }),
        el('div', { class: 'grid grid-4' },
          link('#/admin/customers', UI.stat('Customers', u.totalCustomers, 'group')),
          link('#/admin/professionals', UI.stat('Professionals', u.totalProfessionals, 'engineering')),
          link('#/admin/professionals?status=Approved', UI.stat('Approved', u.approvedProfessionals, 'verified')),
          link('#/admin/professionals?status=Pending', UI.stat('Pending approval', u.pendingProfessionals, 'hourglass_top'))),
        el('div', { class: 'grid grid-2' },
          el('div', { class: 'card' }, el('h3', { text: 'Bookings – last 7 days' }),
            el('div', { class: 'bars' }, d.last7Days.map(x => el('div', { class: 'bar' }, el('b', { text: x.bookings }),
              el('i', { style: { height: Math.round(x.bookings / max * 100) + '%' } }), el('span', { text: x.date.substring(8) + '/' + x.date.substring(5, 7) }))))),
          el('div', { class: 'card' }, el('h3', { text: 'Bookings by category' }),
            d.byCategory.length ? d.byCategory.map(x => el('div', { class: 'hbar' }, el('span', { text: x.category }),
              el('i', null, el('em', { style: { width: Math.round(x.bookings / maxCat * 100) + '%' } })), el('b', { text: x.bookings })))
              : el('p', { class: 'muted', text: 'No bookings yet.' }))));
    });
  }

  /* ================= BOOKINGS ================= */
  function bookings(query) {
    const status = UI.select('status', [{ value: '', label: 'All statuses' }].concat(STATUSES.map(s => ({ value: s, label: s }))), query.status || '');
    const from = UI.input('from', { type: 'date' });
    const to = UI.input('to', { type: 'date' });
    const q = UI.input('q', { type: 'search', placeholder: 'Booking ID, name, mobile, locality' });
    const box = el('div');
    const run = () => UI.load(box, () => API.call('booking.list', { status: status.value, from: from.value, to: to.value, q: q.value.trim() }),
      list => el('div', null, el('p', { class: 'small muted', text: list.length + ' booking(s)' }), UI.table([
        { label: 'Booking', render: r => el('div', null, el('b', { text: r.BookingID }), el('div', { class: 'small muted', text: UI.fmtDateTime(r.CreatedAt) })) },
        { label: 'Service', render: r => el('div', null, r.ServiceName, el('div', { class: 'small muted', text: r.Locality })) },
        { label: 'Customer', render: r => r.customer ? el('div', null, r.customer.name, el('div', { class: 'small muted', text: r.customer.mobile })) : '—' },
        { label: 'Slot', render: r => UI.fmtDay(r.PreferredDate) + ' ' + r.PreferredSlot },
        { label: 'Professional', render: r => r.professional ? r.professional.name : el('span', { class: 'muted', text: 'Not assigned' }) },
        { label: 'Status', render: r => UI.badge(r.Status) },
        { label: 'Payment', render: r => el('div', null, UI.badge(r.PaymentStatus), el('div', { class: 'small muted', text: r.PaymentMethod })) },
        { label: 'Amount', render: r => UI.money(r.FinalAmount !== null ? r.FinalAmount : r.EstimatedAmount) }
      ], list, r => App.go('#/admin/booking/' + encodeURIComponent(r.BookingID)))));
    const filters = el('form', { class: 'card grid grid-4', style: { alignItems: 'end', marginBottom: '14px' } },
      UI.field('Status', status), UI.field('From (slot date)', from), UI.field('To', to),
      el('div', null, UI.field('Search', q), el('button', { class: 'btn btn-block', type: 'submit' }, UI.icon('search'), 'Search')));
    filters.addEventListener('submit', e => { e.preventDefault(); run(); });
    status.addEventListener('change', run);
    shell('bookings', el('div', null, head('Bookings'), filters, box));
    run();
  }

  function bookingDetail(id) {
    const box = el('div');
    shell('bookings', el('div', null, el('a', { href: '#/admin/bookings', class: 'small' }, '← All bookings'), box));
    UI.load(box, () => API.call('booking.get', { bookingId: id }), b => {
      const a = b.actions || {};
      const photos = (t, ids) => ids.length ? el('div', null, el('h4', { text: t }), el('div', { class: 'photo-grid' }, ids.map(p => UI.privateImage(p)))) : null;
      return el('div', { class: 'grid grid-2', style: { alignItems: 'start', marginTop: '10px' } },
        el('div', { class: 'stack' },
          el('div', { class: 'card' },
            el('div', { class: 'row between' }, el('div', null, el('h2', { text: b.ServiceName, style: { marginBottom: '2px' } }), el('div', { class: 'small muted', text: b.BookingID + ' · ' + b.CategoryName })),
              el('div', { class: 'row' }, UI.badge(b.Status), UI.badge(b.PaymentStatus))),
            el('div', { style: { marginTop: '14px' } }, UI.kv([
              ['Customer', b.customer ? b.customer.name + ' (' + b.customer.mobile + ')' : b.CustomerID],
              ['Address', [b.AddressLine, b.Landmark, b.Locality, b.City, b.Pincode].filter(Boolean).join(', ')],
              ['Date & slot', UI.fmtDay(b.PreferredDate) + ' · ' + b.PreferredSlot],
              ['Requirements', b.Requirements], ['Payment method', b.PaymentMethod],
              ['Estimate', UI.money(b.EstimatedAmount)], ['Final amount', b.FinalAmount !== null ? UI.money(b.FinalAmount) : null],
              ['Professional', b.professional ? b.professional.name + ' (' + b.professional.mobile + ')' : null],
              ['Booked', UI.fmtDateTime(b.CreatedAt)], ['Assigned', UI.fmtDateTime(b.AssignedAt)], ['Accepted', UI.fmtDateTime(b.AcceptedAt)],
              ['Started', UI.fmtDateTime(b.StartedAt)], ['Completed', UI.fmtDateTime(b.CompletedAt)],
              ['Cancelled', b.CancelledAt ? UI.fmtDateTime(b.CancelledAt) + ' by ' + b.CancelledBy + ' – ' + b.CancelReason : null],
              ['Reschedules', b.RescheduleCount ? String(b.RescheduleCount) : null],
              ['Rejections', b.RejectionHistory]]))),
          b.beforePhotos.length || b.afterPhotos.length ? el('div', { class: 'card stack' }, photos('Before', b.beforePhotos), photos('After', b.afterPhotos)) : null,
          b.payments.length ? el('div', { class: 'card' }, el('h3', { text: 'Payments' }), UI.table([
            { label: 'ID', key: 'PaymentID' }, { label: 'Method', key: 'PaymentMethod' }, { label: 'Amount', render: r => UI.money(r.Amount) },
            { label: 'UTR', key: 'UTR' }, { label: 'Status', render: r => UI.badge(r.PaymentStatus) },
            { label: 'Commission', render: r => UI.money(r.CommissionAmount) }], b.payments)) : null),
        el('div', { class: 'stack' },
          a.assign ? assignPanel(b) : null,
          el('div', { class: 'card row' },
            a.cancel ? el('button', { class: 'btn btn-outline', style: { color: 'var(--bad)' }, onclick: async () => {
              const reason = await UI.promptDialog('Cancel booking ' + b.BookingID, 'Reason (sent to the customer)', { danger: true, okText: 'Cancel booking' });
              if (!reason) return;
              try { await API.call('booking.cancel', { bookingId: b.BookingID, reason }); UI.toast('Cancelled.'); bookingDetail(id); } catch (e) { UI.errorToast(e); }
            } }, UI.icon('event_busy'), 'Cancel booking') : null,
            ['Cash Collected', 'Verified'].indexOf(b.PaymentStatus) >= 0 ? el('button', { class: 'btn btn-outline', onclick: () => adjustmentModal(b.BookingID, () => bookingDetail(id)) },
              UI.icon('undo'), 'Refund / adjustment') : null)));
    });
  }

  function assignPanel(b) {
    const box = el('div', { class: 'card' }, el('h3', { text: b.professional ? 'Reassign professional' : 'Assign a professional' }), UI.spinner());
    API.call('admin.booking.candidates', { bookingId: b.BookingID }).then(list => {
      UI.clear(box).appendChild(el('h3', { text: b.professional ? 'Reassign professional' : 'Assign a professional' }));
      if (!list.length) { box.appendChild(UI.empty('person_search', 'No approved professional offers ' + b.CategoryName + ' yet.')); return; }
      box.appendChild(el('p', { class: 'small muted', text: 'Best matches first: same locality, free in this slot, fewer active jobs, higher rating.' }));
      list.forEach(c => box.appendChild(el('div', { class: 'list-item', style: { cursor: 'default', boxShadow: 'none', border: '1px solid var(--line)' } },
        el('div', { class: 'grow' }, el('h4', { text: c.FullName }),
          el('div', { class: 'small muted', text: c.Mobile + ' · ★ ' + c.Rating + ' · ' + c.CompletedJobs + ' jobs · ' + c.activeJobs + ' active' }),
          el('div', { class: 'row', style: { gap: '4px', marginTop: '4px' } },
            c.areaMatch ? el('span', { class: 'chip', text: 'Serves ' + b.Locality }) : el('span', { class: 'chip gray', text: 'Other area' }),
            c.busyInSlot ? el('span', { class: 'badge b-rejected', text: 'Busy in this slot' }) : null,
            !c.IsAvailable ? el('span', { class: 'badge b-unpaid', text: 'Marked unavailable' }) : null,
            c.rejectedBefore ? el('span', { class: 'badge b-cancelled', text: 'Rejected this job before' }) : null)),
        el('button', { class: 'btn btn-sm', disabled: c.ProfessionalID === b.ProfessionalID && b.Status !== 'Rejected', onclick: async e => {
          e.target.disabled = true;
          try { await API.call('admin.booking.assign', { bookingId: b.BookingID, professionalId: c.ProfessionalID }); UI.toast('Assigned to ' + c.FullName, 'ok'); bookingDetail(b.BookingID); }
          catch (err) { UI.errorToast(err); e.target.disabled = false; }
        } }, c.ProfessionalID === b.ProfessionalID ? 'Assigned' : 'Assign'))));
    }).catch(err => UI.clear(box).appendChild(el('p', { text: err.message })));
    return box;
  }

  /* ================= PROFESSIONALS ================= */
  function professionals(query) {
    const status = query.status || '';
    const q = UI.input('q', { type: 'search', placeholder: 'Name, mobile, skill, area' });
    const box = el('div');
    const run = () => UI.load(box, () => API.call('admin.professionals', { status, q: q.value.trim() }), list => UI.table([
      { label: 'Name', render: r => el('div', null, el('b', { text: r.FullName }), el('div', { class: 'small muted', text: r.ProfessionalID })) },
      { label: 'Mobile', key: 'Mobile' }, { label: 'Main service', key: 'PrimaryCategory' },
      { label: 'Exp.', render: r => r.ExperienceYears + ' yrs' }, { label: 'Locality', key: 'Locality' },
      { label: 'Docs', render: r => (r.hasPhoto ? '📷 ' : '') + (r.hasIdDoc ? '🪪' : '—') },
      { label: 'Rating', render: r => r.RatingCount ? '★ ' + r.Rating + ' (' + r.RatingCount + ')' : '—' },
      { label: 'Jobs', key: 'CompletedJobs' }, { label: 'Status', render: r => UI.badge(r.Status) }
    ], list, r => professionalModal(r.ProfessionalID, run)));
    const form = el('form', { class: 'row', style: { marginBottom: '12px' } }, el('div', { class: 'grow' }, q), el('button', { class: 'btn', type: 'submit' }, 'Search'));
    form.addEventListener('submit', e => { e.preventDefault(); run(); });
    shell('professionals', el('div', null, head('Professionals'),
      el('div', { class: 'seg', style: { maxWidth: '620px' } }, [['', 'All'], ['Pending', 'Pending'], ['Approved', 'Approved'], ['Suspended', 'Suspended'], ['Rejected', 'Rejected']]
        .map(s => el('button', { type: 'button', class: s[0] === status ? 'active' : '', onclick: () => App.go('#/admin/professionals' + (s[0] ? '?status=' + s[0] : '')) }, s[1]))),
      form, box));
    run();
  }

  async function professionalModal(id, after) {
    let p;
    try { p = await API.call('admin.professional.get', { professionalId: id }); } catch (e) { return UI.errorToast(e); }
    const setStatus = (status, needReason) => async () => {
      let remarks = '';
      if (needReason) {
        remarks = await UI.promptDialog(status + ' ' + p.FullName, 'Reason (the professional will see this)', { danger: status !== 'Approved', okText: status });
        if (!remarks) return true;
      }
      const r = await API.call('admin.professional.setStatus', { professionalId: id, status, remarks });
      UI.toast(p.FullName + ' is now ' + status + '.', 'ok');
      if (r.jobsToReassign && r.jobsToReassign.length) UI.toast('Reassign these jobs: ' + r.jobsToReassign.join(', '), 'bad');
      if (after) after();
    };
    const actions = [{ label: 'Close', class: 'btn btn-outline' }];
    if (p.Status === 'Pending') actions.push({ label: 'Reject', class: 'btn btn-danger', onClick: setStatus('Rejected', true) }, { label: 'Approve', class: 'btn btn-ok', onClick: setStatus('Approved', false) });
    if (p.Status === 'Approved') actions.push({ label: 'Suspend', class: 'btn btn-danger', onClick: setStatus('Suspended', true) });
    if (p.Status === 'Suspended' || p.Status === 'Rejected') actions.push({ label: 'Approve / reinstate', class: 'btn btn-ok', onClick: setStatus('Approved', false) });
    UI.modal({
      title: p.FullName, wide: true, actions,
      body: el('div', { class: 'stack' },
        el('div', { class: 'row' }, p.PhotoFileId ? UI.privateImage(p.PhotoFileId, 'avatar') : el('div', { class: 'avatar', text: UI.initials(p.FullName) }),
          el('div', { class: 'grow' }, el('b', { text: p.FullName }), el('div', { class: 'small muted', text: p.ProfessionalID + ' · ' + p.Mobile })), UI.badge(p.Status)),
        p.IdDocFileId ? el('button', { class: 'btn btn-ghost', onclick: () => UI.openFile(p.IdDocFileId).catch(UI.errorToast) }, UI.icon('badge'), 'View ' + (p.IdDocType || 'ID document'))
          : el('div', { class: 'alert warn' }, UI.icon('warning'), el('div', { text: 'No ID document uploaded yet – cannot approve.' })),
        UI.kv([['Main service', p.PrimaryCategory], ['Skills', p.Skills], ['Experience', p.ExperienceYears + ' years'], ['Service areas', p.ServiceAreas],
          ['Home locality', p.Locality], ['Availability', p.Availability + (p.IsAvailable ? '' : ' (currently unavailable)')], ['Email', p.Email],
          ['Rating', p.RatingCount ? '★ ' + p.Rating + ' (' + p.RatingCount + ')' : '—'], ['Completed jobs', String(p.CompletedJobs || 0)],
          ['Active jobs', p.activeJobs.join(', ')], ['Commission due', UI.money(p.balances.commissionDueToPlatform)],
          ['Payout due', UI.money(p.balances.payoutDueToProfessional)], ['Registered', UI.fmtDateTime(p.CreatedAt)],
          ['Admin remarks', p.AdminRemarks]]))
    });
  }

  /* ================= CUSTOMERS ================= */
  function customers() {
    const q = UI.input('q', { type: 'search', placeholder: 'Name, mobile, email, ID' });
    const box = el('div');
    const run = () => UI.load(box, () => API.call('admin.customers', { q: q.value.trim() }), list => UI.table([
      { label: 'Name', render: r => el('div', null, el('b', { text: r.FullName }), el('div', { class: 'small muted', text: r.CustomerID })) },
      { label: 'Mobile', key: 'Mobile' }, { label: 'Email', key: 'Email' }, { label: 'Bookings', key: 'bookings' },
      { label: 'Joined', render: r => UI.fmtDay(r.CreatedAt) }, { label: 'Status', render: r => UI.badge(r.Status) },
      { label: '', render: r => el('button', { class: 'btn btn-sm ' + (r.Status === 'Active' ? 'btn-outline' : 'btn-ok'), onclick: async e => {
        e.stopPropagation();
        const next = r.Status === 'Active' ? 'Blocked' : 'Active';
        if (!(await UI.confirmDialog((next === 'Blocked' ? 'Block ' : 'Unblock ') + r.FullName + '?', next === 'Blocked' ? 'Block' : 'Unblock', next === 'Blocked'))) return;
        try { await API.call('admin.customer.setStatus', { customerId: r.CustomerID, status: next }); run(); } catch (err) { UI.errorToast(err); }
      } }, r.Status === 'Active' ? 'Block' : 'Unblock') }
    ], list));
    const form = el('form', { class: 'row', style: { marginBottom: '12px' } }, el('div', { class: 'grow' }, q), el('button', { class: 'btn', type: 'submit' }, 'Search'));
    form.addEventListener('submit', e => { e.preventDefault(); run(); });
    shell('customers', el('div', null, head('Customers'), form, box));
    run();
  }

  /* ================= SERVICES ================= */
  function services() {
    const box = el('div');
    const run = () => UI.load(box, () => API.call('admin.services'), list => UI.table([
      { label: 'Category', key: 'CategoryName' },
      { label: 'Service', render: r => el('div', null, el('b', { text: r.ServiceName }), el('div', { class: 'small muted', text: r.Description })) },
      { label: 'Price', render: r => UI.money(r.BasePrice) + ' ' + r.PriceUnit }, { label: 'Visit', render: r => UI.money(r.VisitCharge) },
      { label: 'Popular', render: r => r.IsPopular ? '★' : '' }, { label: 'Active', render: r => UI.badge(r.IsActive ? 'Active' : 'Hidden') },
      { label: 'Order', key: 'SortOrder' }
    ], list, r => serviceModal(r, run)));
    shell('services', el('div', null, head('Services & prices', el('button', { class: 'btn', onclick: () => serviceModal(null, run) }, UI.icon('add'), 'Add service')),
      el('p', { class: 'muted small', text: 'Every price in the app comes from this list. Click a row to edit. Untick "Active" to hide a service.' }), box));
    run();
  }

  function serviceModal(s, after) {
    s = s || {};
    const cats = App.catalog ? App.catalog.categories.map(c => c.name) : ['Electrician', 'Plumber', 'Carpenter', 'Mason', 'Painter', 'AC Technician', 'House Cleaning', 'Appliance Repair', 'RO Technician', 'Other Home Services'];
    const f = el('form', null,
      UI.field('Category', UI.select('categoryName', cats, s.CategoryName)),
      UI.field('Service name', UI.input('serviceName', { value: s.ServiceName || '' })),
      UI.field('Description', UI.textarea('description', { value: s.Description || '' })),
      el('div', { class: 'grid grid-2' },
        UI.field('Base price (₹)', UI.input('basePrice', { type: 'number', min: 0, value: s.BasePrice !== undefined ? String(s.BasePrice) : '' })),
        UI.field('Price unit', UI.input('priceUnit', { value: s.PriceUnit || 'per visit' })),
        UI.field('Visit charge (₹)', UI.input('visitCharge', { type: 'number', min: 0, value: String(s.VisitCharge || 0) })),
        UI.field('Estimated duration', UI.input('estimatedDuration', { value: s.EstimatedDuration || '' })),
        UI.field('Sort order', UI.input('sortOrder', { type: 'number', value: String(s.SortOrder || 0) }))),
      el('label', { class: 'switch field' }, el('input', { type: 'checkbox', name: 'isPopular', checked: !!s.IsPopular }), 'Show in popular services'),
      el('label', { class: 'switch field' }, el('input', { type: 'checkbox', name: 'isActive', checked: s.IsActive !== false }), 'Active (customers can book)'));
    UI.modal({
      title: s.ServiceID ? 'Edit service' : 'Add service', body: f,
      actions: [{ label: 'Cancel', class: 'btn btn-outline' }, { label: 'Save', onClick: async () => {
        const v = UI.formValues(f);
        await API.call('admin.service.save', Object.assign({ serviceId: s.ServiceID || '' }, v, {
          basePrice: Number(v.basePrice), visitCharge: Number(v.visitCharge || 0), sortOrder: Number(v.sortOrder || 0) }));
        UI.toast('Service saved.', 'ok');
        App.loadPublicData();
        after();
      } }]
    });
  }

  /* ================= PAYMENTS ================= */
  function payments(query) {
    const status = UI.select('status', [{ value: 'UPI Submitted', label: 'UPI – waiting verification' }, { value: '', label: 'All payments' },
      { value: 'Verified', label: 'UPI – verified' }, { value: 'Rejected', label: 'UPI – rejected' }, { value: 'Cash Collected', label: 'Cash collected' }], query.status || 'UPI Submitted');
    const box = el('div');
    const run = () => UI.load(box, () => API.call('admin.payments', { status: status.value }), list => el('div', null,
      el('p', { class: 'small muted', text: list.length + ' payment(s) · total ' + UI.money(list.reduce((s, p) => s + Number(p.Amount || 0), 0)) }),
      UI.table([
        { label: 'Date', render: r => UI.fmtDateTime(r.CreatedAt) },
        { label: 'Booking', render: r => el('a', { href: '#/admin/booking/' + encodeURIComponent(r.BookingID), text: r.BookingID, onclick: e => e.stopPropagation() }) },
        { label: 'Customer', render: r => el('div', null, r.customerName, el('div', { class: 'small muted', text: r.customerMobile })) },
        { label: 'Professional', key: 'professionalName' }, { label: 'Method', key: 'PaymentMethod' },
        { label: 'Amount', render: r => el('b', { text: UI.money(r.Amount) }) }, { label: 'UTR', key: 'UTR' },
        { label: 'Commission', render: r => UI.money(r.CommissionAmount) }, { label: 'Status', render: r => UI.badge(r.PaymentStatus) },
        { label: '', render: r => r.PaymentStatus === 'UPI Submitted' ? el('button', { class: 'btn btn-sm', onclick: e => { e.stopPropagation(); verifyModal(r, run); } }, 'Verify') : '' }
      ], list)));
    status.addEventListener('change', run);
    shell('payments', el('div', null, head('Payments'),
      el('div', { class: 'alert warn', style: { marginBottom: '12px' } }, UI.icon('gpp_maybe'),
        el('div', { text: 'A UTR typed by a customer is NOT proof of payment. Verify only after you see the money credited in the MU MISTRY bank account / UPI app statement.' })),
      el('div', { class: 'card', style: { marginBottom: '12px', maxWidth: '420px' } }, UI.field('Show', status)), box));
    run();
  }

  function verifyModal(p, after) {
    const check = el('input', { type: 'checkbox' });
    const remarks = UI.textarea('remarks', { placeholder: 'Remarks (required to reject)' });
    UI.modal({
      title: 'Verify UPI payment',
      body: el('div', { class: 'stack' },
        UI.kv([['Booking', p.BookingID], ['Customer', p.customerName + ' (' + p.customerMobile + ')'], ['Amount', el('b', { text: UI.money(p.Amount) })],
          ['UTR', el('b', { text: p.UTR })], ['Submitted', UI.fmtDateTime(p.SubmittedAt)]]),
        el('div', { class: 'alert info' }, UI.icon('account_balance'), el('div', { text: 'Open your bank / UPI business app and search for UTR ' + p.UTR + '. Check the amount is exactly ' + UI.money(p.Amount) + '.' })),
        el('label', { class: 'switch' }, check, 'I checked the bank statement and this money is credited.'),
        UI.field('Remarks', remarks)),
      actions: [
        { label: 'Cancel', class: 'btn btn-outline' },
        { label: 'Reject', class: 'btn btn-danger', onClick: async () => {
          await API.call('admin.payment.verify', { paymentId: p.PaymentID, decision: 'Rejected', remarks: remarks.value });
          UI.toast('Payment rejected – customer notified.'); after();
        } },
        { label: 'Verify payment', class: 'btn btn-ok', onClick: async () => {
          if (!check.checked) { UI.toast('Tick the box after checking the bank statement.', 'bad'); return true; }
          await API.call('admin.payment.verify', { paymentId: p.PaymentID, decision: 'Verified', bankChecked: true, remarks: remarks.value });
          UI.toast('Payment verified.', 'ok'); after();
        } }]
    });
  }

  /* ================= SETTLEMENTS & REFUNDS ================= */
  function settlements() {
    const box = el('div');
    const adjBox = el('div');
    const run = () => {
      UI.load(box, () => API.call('admin.settlements'), d => el('div', { class: 'stack' },
        el('div', { class: 'grid grid-2' },
          UI.stat('Commission to collect from professionals (cash jobs)', UI.money(d.totals.commissionDueToPlatform), 'call_received', 'blue'),
          UI.stat('Payouts due to professionals (UPI jobs)', UI.money(d.totals.payoutDueToProfessional), 'call_made')),
        UI.table([
          { label: 'Professional', render: r => el('div', null, el('b', { text: r.FullName }), el('div', { class: 'small muted', text: r.Mobile })) },
          { label: 'Paid jobs', key: 'jobsPaid' }, { label: 'Job value', render: r => UI.money(r.gross) },
          { label: 'Owes commission', render: r => UI.money(r.commissionDueToPlatform) },
          { label: 'To receive', render: r => UI.money(r.payoutDueToProfessional) },
          { label: 'Net', render: r => el('b', { text: (r.net >= 0 ? 'Pay ' : 'Collect ') + UI.money(Math.abs(r.net)) }) }
        ], d.professionals, r => ledgerModal(r.ProfessionalID, run))));
      UI.load(adjBox, () => API.call('admin.adjustments'), list => UI.table([
        { label: 'Date', render: r => UI.fmtDateTime(r.CreatedAt) }, { label: 'Booking', key: 'BookingID' }, { label: 'Type', key: 'Type' },
        { label: 'Amount', render: r => UI.money(r.Amount) }, { label: 'Reason', key: 'Reason' }, { label: 'By', key: 'RecordedBy' }], list));
    };
    shell('settlements', el('div', null, head('Settlements'),
      el('p', { class: 'muted small', text: 'Click a professional to see the ledger and record money received or paid. Cash jobs: the professional owes commission. UPI jobs: MU MISTRY owes the professional their share.' }),
      box, el('div', { class: 'page-head', style: { marginTop: '24px' } }, el('h2', { text: 'Refunds & adjustments' }),
        el('button', { class: 'btn btn-outline btn-sm', onclick: () => adjustmentModal('', run) }, UI.icon('add'), 'Record')), adjBox));
    run();
  }

  async function ledgerModal(proId, after) {
    let d;
    try { d = await API.call('admin.ledger', { professionalId: proId }); } catch (e) { return UI.errorToast(e); }
    const type = UI.select('entryType', [{ value: 'Commission Received', label: 'Commission received from professional' }, { value: 'Payout To Professional', label: 'Payout sent to professional' }]);
    const amount = UI.input('amount', { type: 'number', min: 1 });
    const fill = () => { amount.value = String(type.value === 'Commission Received' ? d.balances.commissionDueToPlatform : d.balances.payoutDueToProfessional); };
    type.addEventListener('change', fill); fill();
    const method = UI.select('method', ['Cash', 'UPI', 'Bank Transfer']);
    const ref = UI.input('reference', { placeholder: 'UTR / receipt no.' });
    const notes = UI.input('notes');
    UI.modal({
      title: 'Ledger – ' + d.professional.FullName, wide: true,
      body: el('div', { class: 'stack' },
        el('div', { class: 'grid grid-2' }, UI.stat('Owes commission', UI.money(d.balances.commissionDueToPlatform), 'call_received'),
          UI.stat('To receive', UI.money(d.balances.payoutDueToProfessional), 'call_made')),
        el('div', { class: 'card', style: { boxShadow: 'none', border: '1px solid var(--line)' } }, el('h4', { text: 'Record a settlement' }),
          el('div', { class: 'grid grid-2' }, UI.field('Type', type), UI.field('Amount (₹)', amount), UI.field('Method', method), UI.field('Reference', ref)),
          UI.field('Notes', notes)),
        el('h4', { text: 'Ledger entries' }),
        UI.table([{ label: 'Date', render: r => UI.fmtDay(r.CreatedAt) }, { label: 'Booking', key: 'BookingID' }, { label: 'Method', key: 'PaymentMethod' },
          { label: 'Amount', render: r => UI.money(r.GrossAmount) }, { label: 'Commission', render: r => UI.money(r.CommissionAmount) },
          { label: 'Earnings', render: r => UI.money(r.ProfessionalEarnings) }, { label: 'Pending', render: r => UI.money(r.Due) }, { label: 'Status', render: r => UI.badge(r.Status) }], d.entries),
        el('h4', { text: 'Settlement history' }),
        UI.table([{ label: 'Date', render: r => UI.fmtDateTime(r.CreatedAt) }, { label: 'Type', key: 'EntryType' }, { label: 'Amount', render: r => UI.money(r.Amount) },
          { label: 'Method', key: 'Method' }, { label: 'Reference', key: 'Reference' }], d.settlements)),
      actions: [{ label: 'Close', class: 'btn btn-outline' }, { label: 'Record settlement', onClick: async () => {
        await API.call('admin.settlement.record', { professionalId: proId, entryType: type.value, amount: Number(amount.value), method: method.value, reference: ref.value, notes: notes.value });
        UI.toast('Settlement recorded.', 'ok'); after();
      } }]
    });
  }

  function adjustmentModal(bookingId, after) {
    const f = el('form', null,
      UI.field('Booking ID', UI.input('bookingId', { value: bookingId || '', placeholder: 'MM-YYMMDD-0001' })),
      UI.field('Type', UI.select('type', ['Refund', 'Adjustment'])),
      UI.field('Amount (₹)', UI.input('amount', { type: 'number' }), 'Refund: money returned to the customer. Adjustment: any correction (use minus for deductions).'),
      UI.field('Reason', UI.textarea('reason')));
    UI.modal({
      title: 'Refund / adjustment', body: f,
      actions: [{ label: 'Cancel', class: 'btn btn-outline' }, { label: 'Record', onClick: async () => {
        const v = UI.formValues(f);
        await API.call('admin.adjustment.record', { bookingId: v.bookingId, type: v.type, amount: Number(v.amount), reason: v.reason });
        UI.toast('Recorded.', 'ok'); after();
      } }]
    });
  }

  /* ================= COMPLAINTS ================= */
  function complaints() {
    const box = el('div');
    const run = () => UI.load(box, () => API.call('admin.complaints'), list => UI.table([
      { label: 'Date', render: r => UI.fmtDateTime(r.CreatedAt) }, { label: 'ID', key: 'ComplaintID' },
      { label: 'Customer', render: r => el('div', null, r.customerName, el('div', { class: 'small muted', text: r.customerMobile })) },
      { label: 'Booking', key: 'BookingID' }, { label: 'Subject', key: 'Subject' }, { label: 'Status', render: r => UI.badge(r.Status) }
    ], list, r => {
      const st = UI.select('status', ['Open', 'In Review', 'Resolved', 'Closed'], r.Status);
      const resp = UI.textarea('response', { value: r.AdminResponse || '' });
      UI.modal({
        title: 'Complaint ' + r.ComplaintID,
        body: el('div', { class: 'stack' }, UI.kv([['Customer', r.customerName + ' (' + r.customerMobile + ')'], ['Booking', r.BookingID], ['Professional', r.ProfessionalID], ['Subject', r.Subject]]),
          el('div', { class: 'alert info', text: r.Description }), UI.field('Status', st), UI.field('Response to customer', resp)),
        actions: [{ label: 'Cancel', class: 'btn btn-outline' }, { label: 'Save', onClick: async () => {
          await API.call('admin.complaint.update', { complaintId: r.ComplaintID, status: st.value, response: resp.value });
          UI.toast('Complaint updated – customer notified.', 'ok'); run();
        } }]
      });
    }));
    shell('complaints', el('div', null, head('Complaints'), box));
    run();
  }

  /* ================= REVIEWS ================= */
  function reviews() {
    const box = el('div');
    const run = () => UI.load(box, () => API.call('admin.reviews'), list => UI.table([
      { label: 'Date', render: r => UI.fmtDay(r.CreatedAt) }, { label: 'Booking', key: 'BookingID' },
      { label: 'Customer', key: 'customerName' }, { label: 'Professional', key: 'professionalName' },
      { label: 'Rating', render: r => el('span', { style: { color: 'var(--accent)' }, text: UI.starsText(r.Rating) }) },
      { label: 'Comment', key: 'Comment' }, { label: 'Status', render: r => UI.badge(r.Status) },
      { label: '', render: r => el('button', { class: 'btn btn-outline btn-sm', onclick: async () => {
        try { await API.call('admin.review.setStatus', { reviewId: r.ReviewID, status: r.Status === 'Published' ? 'Hidden' : 'Published' }); run(); } catch (e) { UI.errorToast(e); }
      } }, r.Status === 'Published' ? 'Hide' : 'Publish') }], list));
    shell('reviews', el('div', null, head('Reviews'), el('p', { class: 'muted small', text: 'Hidden reviews do not count in the professional rating and do not appear on the homepage.' }), box));
    run();
  }

  /* ================= REPORTS ================= */
  function reports() {
    const types = [['bookings-daily', 'Daily bookings'], ['bookings-weekly', 'Weekly bookings'], ['bookings-monthly', 'Monthly bookings'],
      ['service-wise', 'Service-wise bookings'], ['professional-wise', 'Professional-wise bookings'], ['customer-wise', 'Customer-wise bookings'],
      ['revenue', 'Revenue'], ['commission', 'Commission'], ['cash', 'Cash collection'], ['upi', 'UPI collection'], ['pending-settlements', 'Pending settlements']];
    const type = UI.select('type', types.map(t => ({ value: t[0], label: t[1] })));
    const from = UI.input('from', { type: 'date', value: UI.todayIst(-30) });
    const to = UI.input('to', { type: 'date', value: UI.todayIst(0) });
    const box = el('div');
    const form = el('form', { class: 'card grid grid-4', style: { alignItems: 'end', marginBottom: '14px' } },
      UI.field('Report', type), UI.field('From', from), UI.field('To', to), el('button', { class: 'btn', type: 'submit', style: { marginBottom: '14px' } }, UI.icon('play_arrow'), 'Run report'));
    form.addEventListener('submit', e => {
      e.preventDefault();
      UI.load(box, () => API.call('admin.report', { type: type.value, from: from.value, to: to.value }), r => el('div', { class: 'stack' },
        el('div', { class: 'row between' }, el('div', null, el('h3', { text: r.title, style: { margin: 0 } }), el('div', { class: 'small muted', text: r.from + ' to ' + r.to + ' · ' + r.rows.length + ' rows' })),
          el('button', { class: 'btn btn-ok', disabled: !r.rows.length, onclick: () => UI.downloadCsv('MU-MISTRY_' + r.type + '_' + r.from + '_to_' + r.to + '.csv', r.columns, r.rows) },
            UI.icon('download'), 'Export CSV (Excel)')),
        r.rows.length ? el('div', { class: 'table-wrap report-wrap' }, el('table', { class: 'table' },
          el('thead', null, el('tr', null, r.columns.map(c => el('th', { text: c })))),
          el('tbody', null, r.rows.map(row => el('tr', null, row.map(v => el('td', { text: v }))))))) : UI.empty('bar_chart', 'No data for this period.')));
    });
    shell('reports', el('div', null, head('Reports'), form, box));
  }

  /* ================= SETTINGS ================= */
  function settings() {
    const box = el('div');
    const dbBox = el('div');
    UI.load(box, () => API.call('admin.settings'), list => {
      const f = el('form', { class: 'card' }, list.map(s => {
        const long = s.key === 'SERVICE_AREAS' || s.key === 'BOOKING_SLOTS';
        const ctl = long ? UI.textarea(s.key, { value: s.value, rows: 4 })
          : s.key === 'BOOKINGS_ENABLED' ? UI.select(s.key, ['TRUE', 'FALSE'], s.value) : UI.input(s.key, { value: s.value });
        return UI.field(s.key.replace(/_/g, ' '), ctl, s.description);
      }), el('button', { class: 'btn', type: 'submit' }, 'Save settings'));
      UI.onSubmit(f, async v => {
        const r = await API.call('admin.settings.update', { settings: v });
        UI.toast(r.changed.length ? 'Saved: ' + r.changed.join(', ') : 'No changes.', 'ok');
        App.loadPublicData();
      });
      return f;
    });
    shell('settings', el('div', { style: { maxWidth: '760px' } }, head('Business settings'),
      el('div', { class: 'alert warn', style: { marginBottom: '12px' } }, UI.icon('info'), el('div', { text: 'Changing COMMISSION PERCENT affects only payments recorded after the change. Old payments keep their rate.' })),
      box,
      el('div', { class: 'card' }, el('div', { class: 'card-title' }, el('h3', { text: 'Database health' }),
        el('button', { class: 'btn btn-ghost btn-sm', onclick: () => UI.load(dbBox, () => API.call('admin.dbStatus'), d => el('div', { class: 'stack' },
          el('div', { class: 'alert ' + (d.healthy ? 'ok' : 'bad'), text: (d.healthy ? 'Healthy' : 'Problem found') + ' · DB version ' + d.dbVersion + ' / ' + d.targetVersion + ' · ' + d.spreadsheetTimeZone }),
          UI.table([{ label: 'Sheet', key: 'name' }, { label: 'Records', key: 'records' }, { label: 'Missing columns', render: r => r.missingColumns.join(', ') || '—' }], d.sheets))) }, 'Check')),
        dbBox)));
  }

  /* ================= AUDIT ================= */
  function audit() {
    const q = UI.input('q', { type: 'search', placeholder: 'Action, user ID, record ID, result' });
    const box = el('div');
    const run = () => UI.load(box, () => API.call('admin.auditLogs', { q: q.value.trim() }), list => UI.table([
      { label: 'Time', render: r => UI.fmtDateTime(r.Timestamp) }, { label: 'Who', render: r => r.ActorRole + ' ' + r.ActorID },
      { label: 'Action', key: 'Action' }, { label: 'Record', render: r => r.EntityType + ' ' + r.EntityID },
      { label: 'Result', render: r => UI.badge(r.Result) }, { label: 'Details', render: r => el('span', { class: 'small muted', text: r.Details }) }], list));
    const form = el('form', { class: 'row', style: { marginBottom: '12px' } }, el('div', { class: 'grow' }, q), el('button', { class: 'btn', type: 'submit' }, 'Search'));
    form.addEventListener('submit', e => { e.preventDefault(); run(); });
    shell('audit', el('div', null, head('Audit log'), form, box));
    run();
  }

  return { route };
})();
