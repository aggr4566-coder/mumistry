/* =====================================================================
   MU MISTRY – professional.js
   Professional dashboard: approval status, job requests (accept /
   reject), start work, before/after photos, complete with final amount,
   confirm cash, earnings & settlements, profile, photo and ID document.
   Developed by Debasis Rout
   ===================================================================== */
'use strict';

const Professional = (() => {
  const el = UI.el;

  const TABS = [
    { key: 'dash', label: 'Home', icon: 'home', href: '#/pro' },
    { key: 'jobs', label: 'Jobs', icon: 'work', href: '#/pro/jobs' },
    { key: 'earnings', label: 'Earnings', icon: 'payments', href: '#/pro/earnings' },
    { key: 'profile', label: 'Profile & documents', icon: 'badge', href: '#/pro/profile' }
  ];
  function shell(active, content) {
    App.render(el('div', { class: 'container page' }, content), { tabs: UI.tabs(TABS, active), nav: active });
  }

  function route(section, id) {
    if (!section) return dashboard();
    if (section === 'jobs') return jobs(id || 'new');
    if (section === 'job') return jobDetail(id);
    if (section === 'earnings') return earnings();
    if (section === 'profile') return profile();
    return dashboard();
  }

  function statusBanner(status, remarks, profileComplete) {
    if (status === 'Approved') return null;
    return el('div', { class: 'alert warn' }, UI.icon('hourglass_top'), el('div', null,
      el('b', { text: 'Your account is waiting for approval.' }),
      el('div', { text: profileComplete ? 'MU MISTRY is verifying your documents. You will be notified once approved.'
        : 'Upload your profile photo and an ID document so we can verify you.' }),
      remarks ? el('div', { class: 'small', text: 'Note from admin: ' + remarks }) : null,
      !profileComplete ? el('a', { class: 'btn btn-sm', href: '#/pro/profile', style: { marginTop: '8px' } }, 'Upload documents') : null));
  }

  function jobItem(b) {
    return el('div', { class: 'list-item', onclick: () => App.go('#/pro/job/' + encodeURIComponent(b.BookingID)) },
      el('div', { class: 'cat-icon', style: { margin: 0 } }, UI.icon('construction')),
      el('div', { class: 'grow' },
        el('h4', { text: b.ServiceName }),
        el('div', { class: 'small muted', text: UI.fmtDay(b.PreferredDate) + ' · ' + b.PreferredSlot + ' · ' + b.Locality }),
        el('div', { class: 'row', style: { marginTop: '6px', gap: '6px' } }, UI.badge(b.Status),
          b.Status === 'Completed' ? UI.badge(b.PaymentStatus) : null)),
      UI.icon('chevron_right'));
  }

  /* ---------------- DASHBOARD ---------------- */
  function dashboard() {
    const box = el('div');
    const s = Session.get();
    shell('dash', el('div', null, el('h1', { text: 'Namaskar, ' + String(s.user.FullName).split(' ')[0] + ' 🙏' }), box));
    UI.load(box, () => API.call('professional.dashboard'), d => el('div', { class: 'stack' },
      statusBanner(d.status, d.adminRemarks, d.profileComplete),
      el('div', { class: 'grid grid-4' },
        UI.stat('New requests', d.counts.newRequests, 'notification_important', 'blue'),
        UI.stat('Active jobs', d.counts.active, 'construction'),
        UI.stat('Completed', d.counts.completed, 'task_alt'),
        UI.stat('Rating', d.ratingCount ? '★ ' + d.rating : '—', 'star')),
      d.counts.cashToConfirm ? el('div', { class: 'alert info' }, UI.icon('payments'),
        el('div', { text: d.counts.cashToConfirm + ' completed job(s) waiting for payment. If the customer paid cash, confirm it in the job.' })) : null,
      el('div', { class: 'card' }, el('div', { class: 'card-title' }, el('h3', { text: "Today's jobs" }), el('a', { href: '#/pro/jobs/active', text: 'All jobs' })),
        d.todayJobs.length ? d.todayJobs.map(jobItem) : UI.empty('event_available', 'No jobs scheduled for today.')),
      el('div', { class: 'grid grid-2' },
        UI.stat('Commission you owe MU MISTRY', UI.money(d.balances.commissionDueToPlatform), 'account_balance'),
        UI.stat('MU MISTRY owes you (UPI jobs)', UI.money(d.balances.payoutDueToProfessional), 'savings'))));
  }

  /* ---------------- JOBS ---------------- */
  function jobs(group) {
    const box = el('div');
    const groups = [['new', 'New requests'], ['active', 'Active'], ['completed', 'Completed'], ['all', 'All']];
    shell('jobs', el('div', null, el('h1', { text: 'My jobs' }),
      el('div', { class: 'seg' }, groups.map(g => el('button', { type: 'button', class: g[0] === group ? 'active' : '', onclick: () => App.go('#/pro/jobs/' + g[0]) }, g[1]))),
      box));
    UI.load(box, () => API.call('booking.list', { group }), list => list.length ? el('div', null, list.map(jobItem))
      : UI.empty('work_off', group === 'new' ? 'No new job requests right now.' : 'No jobs here.'));
  }

  function jobDetail(id) {
    const box = el('div');
    shell('jobs', el('div', null, el('a', { href: '#/pro/jobs', class: 'small' }, '← All jobs'), box));
    const reload = () => jobDetail(id);
    UI.load(box, () => API.call('booking.get', { bookingId: id }), b => {
      const a = b.actions || {};
      const address = [b.AddressLine, b.Landmark, b.Locality, b.City, b.Pincode].filter(Boolean).join(', ');
      const act = (action, payload, msg) => async e => {
        if (e && e.target) e.target.disabled = true;
        try { await API.call(action, Object.assign({ bookingId: b.BookingID }, payload || {})); UI.toast(msg, 'ok'); reload(); }
        catch (err) { UI.errorToast(err); if (e && e.target) e.target.disabled = false; }
      };
      const upload = kind => UI.filePicker(kind === 'before' ? 'Add before photo' : 'Add after photo', 'image/*', async f => {
        const file = await UI.fileForUpload(f, false);
        await API.call('job.uploadPhoto', { bookingId: b.BookingID, kind, file });
        UI.toast('Photo uploaded.', 'ok'); reload();
      }, 'environment');

      const buttons = el('div', { class: 'row' });
      if (a.accept) buttons.appendChild(el('button', { class: 'btn btn-ok', onclick: act('job.accept', null, 'Job accepted.') }, UI.icon('check'), 'Accept job'));
      if (a.reject) buttons.appendChild(el('button', { class: 'btn btn-outline', style: { color: 'var(--bad)' }, onclick: async () => {
        const reason = await UI.promptDialog('Reject job', 'Reason', { okText: 'Reject', danger: true, placeholder: 'e.g. Not available at that time' });
        if (reason) act('job.reject', { reason }, 'Job rejected.')();
      } }, UI.icon('close'), 'Reject'));
      if (a.start) buttons.appendChild(el('button', { class: 'btn', onclick: act('job.start', null, 'Work started.') }, UI.icon('play_arrow'), 'Start work'));
      if (b.Status === 'Accepted' && !a.start) buttons.appendChild(el('div', { class: 'small muted', text: 'You can start this job on ' + UI.fmtDay(b.PreferredDate) + '.' }));
      if (a.complete) buttons.appendChild(el('button', { class: 'btn btn-ok', onclick: async () => {
        const amt = await UI.promptDialog('Complete job', 'Final amount to collect (₹)', { type: 'number', value: String(b.EstimatedAmount), okText: 'Mark completed',
          hint: 'Include service charge and any spare parts. The customer will see this amount.' });
        if (amt) act('job.complete', { finalAmount: Number(amt) }, 'Job completed.')();
      } }, UI.icon('task_alt'), 'Mark completed'));
      if (a.confirmCash) buttons.appendChild(el('button', { class: 'btn', onclick: async () => {
        if (!(await UI.confirmDialog('Confirm you received ' + UI.money(b.FinalAmount) + ' in cash from the customer?', 'Yes, cash received'))) return;
        act('payment.confirmCash', { amount: b.FinalAmount }, 'Cash payment recorded.')();
      } }, UI.icon('payments'), 'Confirm cash received'));

      return el('div', { class: 'grid grid-2', style: { alignItems: 'start', marginTop: '10px' } },
        el('div', { class: 'card' },
          el('div', { class: 'row between' }, el('div', null, el('h2', { text: b.ServiceName, style: { marginBottom: '2px' } }), el('div', { class: 'small muted', text: b.BookingID })),
            el('div', { class: 'row' }, UI.badge(b.Status), b.Status === 'Completed' ? UI.badge(b.PaymentStatus) : null)),
          el('div', { style: { marginTop: '14px' } }, UI.kv([
            ['Date', UI.fmtDay(b.PreferredDate)], ['Time', b.PreferredSlot], ['Customer', b.customer && b.customer.name],
            ['Mobile', b.customer && b.customer.mobile ? el('a', { href: 'tel:+91' + b.customer.mobile, text: '+91 ' + b.customer.mobile }) : null],
            ['Address', b.AddressLine ? address : b.Locality + ' (full address after you accept)'],
            ['Work', b.Requirements], ['Payment', b.PaymentMethod], ['Estimate', UI.money(b.EstimatedAmount)],
            ['Final amount', b.FinalAmount !== null ? UI.money(b.FinalAmount) : null]])),
          b.AddressLine ? el('a', { class: 'btn btn-ghost btn-sm', style: { marginTop: '12px' }, target: '_blank', rel: 'noopener',
            href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address) }, UI.icon('map'), 'Open in Google Maps') : null),
        el('div', { class: 'stack' },
          el('div', { class: 'card stack' }, el('h3', { text: 'Actions' }), buttons.childNodes.length ? buttons : el('p', { class: 'muted', text: 'No action needed.' })),
          el('div', { class: 'card stack' }, el('h3', { text: 'Work photos' }),
            el('h4', { text: 'Before' }), b.beforePhotos.length ? el('div', { class: 'photo-grid' }, b.beforePhotos.map(p => UI.privateImage(p))) : el('p', { class: 'small muted', text: 'None yet.' }),
            a.beforePhoto ? upload('before') : null,
            el('h4', { text: 'After' }), b.afterPhotos.length ? el('div', { class: 'photo-grid' }, b.afterPhotos.map(p => UI.privateImage(p))) : el('p', { class: 'small muted', text: 'None yet.' }),
            a.afterPhoto ? upload('after') : null),
          b.payments && b.payments.length ? el('div', { class: 'card' }, el('h3', { text: 'Payment' }), b.payments.map(p => UI.kv([
            ['Method', p.PaymentMethod], ['Amount', UI.money(p.Amount)], ['Status', UI.badge(p.PaymentStatus)],
            ['Commission', UI.money(p.CommissionAmount) + ' (' + p.CommissionRate + '%)'], ['Your earnings', UI.money(p.ProfessionalEarnings)]]))) : null));
    });
  }

  /* ---------------- EARNINGS ---------------- */
  function earnings() {
    const box = el('div');
    shell('earnings', el('div', null, el('h1', { text: 'Earnings' }), box));
    UI.load(box, () => API.call('professional.earnings'), d => el('div', { class: 'stack' },
      el('div', { class: 'grid grid-4' },
        UI.stat('Total job value', UI.money(d.balances.gross), 'receipt_long', 'blue'),
        UI.stat('Your earnings', UI.money(d.balances.earnings), 'savings'),
        UI.stat('Platform commission', UI.money(d.balances.commission), 'percent'),
        UI.stat('Paid jobs', d.balances.jobsPaid, 'task_alt')),
      el('div', { class: 'grid grid-2' },
        UI.stat('You owe MU MISTRY (cash jobs)', UI.money(d.balances.commissionDueToPlatform), 'account_balance'),
        UI.stat('MU MISTRY owes you (UPI jobs)', UI.money(d.balances.payoutDueToProfessional), 'payments')),
      el('div', { class: 'alert info' }, UI.icon('info'), el('div', { text: 'Commission is ' + d.commissionRate + '% of each job. For cash jobs you keep the cash and pay the commission to MU MISTRY. For UPI jobs MU MISTRY pays your share to you.' })),
      el('h3', { text: 'Job-wise ledger' }),
      UI.table([
        { label: 'Date', render: r => UI.fmtDay(r.CreatedAt) }, { label: 'Booking', key: 'BookingID' }, { label: 'Method', key: 'PaymentMethod' },
        { label: 'Amount', render: r => UI.money(r.GrossAmount) }, { label: 'Commission', render: r => UI.money(r.CommissionAmount) },
        { label: 'Your earning', render: r => UI.money(r.ProfessionalEarnings) }, { label: 'Pending', render: r => UI.money(r.Due) },
        { label: 'Status', render: r => UI.badge(r.Status) }], d.entries),
      el('h3', { text: 'Settlements' }),
      UI.table([
        { label: 'Date', render: r => UI.fmtDateTime(r.CreatedAt) }, { label: 'Type', key: 'EntryType' }, { label: 'Amount', render: r => UI.money(r.Amount) },
        { label: 'Method', key: 'Method' }, { label: 'Reference', key: 'Reference' }], d.settlements)));
  }

  /* ---------------- PROFILE ---------------- */
  async function profile() {
    const page = el('div', null, UI.spinner());
    shell('profile', page);
    let me;
    try { await App.ensureCatalog(); me = (await API.call('auth.me')).user; Session.updateUser(me); }
    catch (err) { UI.clear(page).appendChild(UI.empty('cloud_off', err.message)); return; }
    const cats = App.catalog.categories.map(c => c.name);
    const areas = App.config.serviceAreas || [];
    const split = v => String(v || '').split(',').map(x => x.trim()).filter(Boolean);
    const skills = UI.checkList('skills', cats, split(me.Skills));
    const areaList = UI.checkList('serviceAreas', areas, split(me.ServiceAreas));
    const form = el('form', { class: 'card' },
      el('h3', { text: 'Profile' }),
      UI.field('Full name', UI.input('fullName', { value: me.FullName })),
      UI.field('Mobile', UI.input('mobile', { value: me.Mobile, disabled: true }), 'Login ID – contact support to change.'),
      UI.field('Email', UI.input('email', { type: 'email', value: me.Email || '' })),
      UI.field('Home locality', UI.select('locality', areas, me.Locality)),
      UI.field('Main service', UI.select('primaryCategory', cats, me.PrimaryCategory)),
      el('div', { class: 'field' }, el('span', { text: 'Skills' }), skills),
      UI.field('Experience (years)', UI.input('experienceYears', { type: 'number', min: 0, max: 50, value: String(me.ExperienceYears || 0) })),
      el('div', { class: 'field' }, el('span', { text: 'Service areas' }), areaList),
      UI.field('Availability', UI.input('availability', { value: me.Availability || '' })),
      el('label', { class: 'switch field' }, el('input', { type: 'checkbox', name: 'isAvailable', checked: me.IsAvailable !== false && me.IsAvailable !== 'FALSE' }), 'Available for new jobs'),
      el('button', { class: 'btn', type: 'submit' }, 'Save profile'));
    UI.onSubmit(form, async v => {
      const r = await API.call('professional.updateProfile', { fullName: v.fullName, email: v.email, locality: v.locality,
        primaryCategory: v.primaryCategory, skills: UI.checkedValues(skills), experienceYears: Number(v.experienceYears),
        serviceAreas: UI.checkedValues(areaList), availability: v.availability, isAvailable: !!v.isAvailable });
      Session.updateUser(r.user);
      UI.toast('Profile saved.', 'ok');
    });

    const docType = UI.select('docType', ['Aadhaar Card', 'Voter ID', 'Driving Licence', 'PAN Card'], me.IdDocType || 'Aadhaar Card');
    const docs = el('div', { class: 'card stack' },
      el('h3', { text: 'Photo & verification' }),
      el('div', { class: 'row' }, me.PhotoFileId ? UI.privateImage(me.PhotoFileId, 'avatar', 'Profile photo') : el('div', { class: 'avatar', text: UI.initials(me.FullName) }),
        el('div', { class: 'grow' }, el('b', { text: 'Profile photo' }), el('div', { class: 'small muted', text: 'Customers see this photo after you are assigned.' })),
        UI.filePicker(me.PhotoFileId ? 'Change' : 'Upload', 'image/*', async f => {
          await API.call('professional.uploadPhoto', { file: await UI.fileForUpload(f, false) });
          UI.toast('Photo uploaded.', 'ok'); profile();
        }, 'user')),
      el('div', { class: 'alert info' }, UI.icon('lock'), el('div', { text: 'Your ID document is stored privately and seen only by MU MISTRY admins. Do not type your ID number anywhere.' })),
      UI.field('Document type', docType),
      el('div', { class: 'row' },
        me.IdDocFileId ? el('span', { class: 'chip' }, UI.icon('check'), (me.IdDocType || 'Document') + ' uploaded') : el('span', { class: 'chip gray', text: 'Not uploaded' }),
        UI.filePicker(me.IdDocFileId ? 'Replace document' : 'Upload document', 'image/*,application/pdf', async f => {
          await API.call('professional.uploadIdDoc', { docType: docType.value, file: await UI.fileForUpload(f, true) });
          UI.toast('Document uploaded for verification.', 'ok'); profile();
        })),
      el('div', { class: 'small muted', text: 'Status: ' + me.Status + (me.AdminRemarks ? ' · ' + me.AdminRemarks : '') }));

    UI.clear(page).appendChild(el('div', { class: 'grid grid-2', style: { alignItems: 'start' } }, form,
      el('div', { class: 'stack' }, docs, el('div', { class: 'card row' },
        el('button', { class: 'btn btn-outline', onclick: () => App.changePassword() }, UI.icon('lock'), 'Change password'),
        el('button', { class: 'btn btn-danger', onclick: () => App.logout() }, UI.icon('logout'), 'Logout')))));
  }

  return { route };
})();
