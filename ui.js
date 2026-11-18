/* =====================================================================
   MU MISTRY – ui.js
   Small UI toolkit. SECURITY: every piece of text is inserted with
   textContent (never innerHTML), so data from users can't run as code.
   Developed by Debasis Rout
   ===================================================================== */
'use strict';

const UI = (() => {
  /** el('div', {class:'x', onclick: fn, text:'hi'}, child1, [child2, ...]) */
  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(k => {
        const v = props[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = String(v);
        else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
        else if (k.indexOf('on') === 0 && typeof v === 'function') n.addEventListener(k.substring(2), v);
        else if (k === 'dataset') Object.assign(n.dataset, v);
        else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') n[k] = v;
        else n.setAttribute(k, v === true ? '' : String(v));
      });
    }
    append(n, kids);
    return n;
  }
  function append(n, kids) {
    kids.flat(Infinity).forEach(k => {
      if (k === null || k === undefined || k === false) return;
      n.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
    });
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  function icon(name, extra) { return el('span', { class: 'ms' + (extra ? ' ' + extra : ''), 'aria-hidden': 'true', text: name }); }

  const money = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  function fmtDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso);
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function fmtDay(ymd) {
    if (!ymd) return '';
    const p = String(ymd).substring(0, 10).split('-');
    if (p.length !== 3) return String(ymd);
    const d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return d.toLocaleDateString('en-IN', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  }
  function todayIst(offsetDays) {
    const d = new Date(Date.now() + (offsetDays || 0) * 86400000);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // yyyy-mm-dd
  }
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const badge = s => el('span', { class: 'badge b-' + slug(s), text: s || '—' });
  const initials = name => String(name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

  /* ---------- toast / banner ---------- */
  function toast(msg, type) {
    let box = document.querySelector('.toasts');
    if (!box) { box = el('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(box); }
    const t = el('div', { class: 'toast ' + (type || ''), text: msg });
    box.appendChild(t);
    setTimeout(() => t.remove(), type === 'bad' ? 5500 : 3200);
  }
  function errorToast(err) { toast(err && err.message ? err.message : 'Something went wrong.', 'bad'); }

  /* ---------- modal ---------- */
  /** modal({title, body: Node, actions:[{label, class, onClick: async () => true|false}], wide}) */
  function modal(opts) {
    const back = el('div', { class: 'modal-back' });
    const close = () => { back.remove(); document.removeEventListener('keydown', esc); };
    const esc = e => { if (e.key === 'Escape') close(); };
    const foot = el('div', { class: 'modal-foot' });
    (opts.actions || [{ label: 'Close', class: 'btn btn-outline' }]).forEach(a => {
      const b = el('button', { class: a.class || 'btn', type: 'button', text: a.label });
      b.addEventListener('click', async () => {
        if (!a.onClick) return close();
        const all = foot.querySelectorAll('button');
        all.forEach(x => { x.disabled = true; });
        try {
          const keepOpen = await a.onClick(close);
          if (keepOpen !== true) close();
        } catch (err) { errorToast(err); }
        finally { all.forEach(x => { x.disabled = false; }); }
      });
      foot.appendChild(b);
    });
    const box = el('div', { class: 'modal' + (opts.wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true' },
      el('div', { class: 'modal-head' }, el('h3', { text: opts.title || '' }),
        el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onclick: close }, icon('close'))),
      el('div', { class: 'modal-body' }, opts.body || ''),
      foot);
    back.appendChild(box);
    back.addEventListener('click', e => { if (e.target === back) close(); });
    document.addEventListener('keydown', esc);
    document.body.appendChild(back);
    const first = box.querySelector('input, select, textarea');
    if (first) setTimeout(() => first.focus(), 50);
    return { close, root: box };
  }
  function confirmDialog(message, okText, danger) {
    return new Promise(resolve => {
      let answered = false;
      const m = modal({
        title: 'Please confirm', body: el('p', { text: message }),
        actions: [
          { label: 'Cancel', class: 'btn btn-outline', onClick: () => { answered = true; resolve(false); } },
          { label: okText || 'Yes', class: 'btn ' + (danger ? 'btn-danger' : ''), onClick: () => { answered = true; resolve(true); } }
        ]
      });
      const obs = new MutationObserver(() => { if (!document.body.contains(m.root)) { obs.disconnect(); if (!answered) resolve(false); } });
      obs.observe(document.body, { childList: true });
    });
  }
  /** Asks for one text value. Resolves null if cancelled. */
  function promptDialog(title, label, opts) {
    opts = opts || {};
    return new Promise(resolve => {
      let done = false;
      const input = opts.multiline ? el('textarea', { class: 'input', placeholder: opts.placeholder || '' })
        : el('input', { class: 'input', type: opts.type || 'text', placeholder: opts.placeholder || '', value: opts.value || '' });
      const m = modal({
        title, body: field(label, input, opts.hint),
        actions: [
          { label: 'Cancel', class: 'btn btn-outline', onClick: () => { done = true; resolve(null); } },
          { label: opts.okText || 'Submit', class: 'btn ' + (opts.danger ? 'btn-danger' : ''), onClick: () => {
            const v = input.value.trim();
            if (opts.required !== false && !v) { input.classList.add('invalid'); toast('This field is required.', 'bad'); return true; }
            done = true; resolve(v); return false;
          } }
        ]
      });
      const obs = new MutationObserver(() => { if (!document.body.contains(m.root)) { obs.disconnect(); if (!done) resolve(null); } });
      obs.observe(document.body, { childList: true });
    });
  }

  /* ---------- forms ---------- */
  function field(label, control, hint) {
    return el('label', { class: 'field' }, el('span', { text: label }), control, hint ? el('small', { text: hint }) : null);
  }
  function input(name, attrs) { return el('input', Object.assign({ class: 'input', name }, attrs || {})); }
  function textarea(name, attrs) { return el('textarea', Object.assign({ class: 'input', name }, attrs || {})); }
  /** options: ['a','b'] or [{value,label}] */
  function select(name, options, value, attrs) {
    const s = el('select', Object.assign({ class: 'input', name }, attrs || {}));
    options.forEach(o => {
      const opt = typeof o === 'object' ? o : { value: o, label: o };
      s.appendChild(el('option', { value: opt.value, text: opt.label }));
    });
    // Only apply a value that exists – otherwise keep the first option selected (never a blank select).
    if (value !== undefined && value !== null && Array.from(s.options).some(o => o.value === String(value))) s.value = String(value);
    return s;
  }
  function checkList(name, options, selected) {
    const sel = selected || [];
    return el('div', { class: 'checks', dataset: { name } }, options.map(o =>
      el('label', null, el('input', { type: 'checkbox', value: o, checked: sel.indexOf(o) >= 0 }), o)));
  }
  function checkedValues(container) {
    return Array.from(container.querySelectorAll('input[type=checkbox]:checked')).map(i => i.value);
  }
  /** Collects named inputs of a form into an object. */
  function formValues(form) {
    const out = {};
    form.querySelectorAll('[name]').forEach(n => {
      if (n.type === 'checkbox') out[n.name] = n.checked;
      else if (n.type === 'radio') { if (n.checked) out[n.name] = n.value; }
      else out[n.name] = n.value.trim();
    });
    return out;
  }
  /** Shows a server validation error next to the field if we can find it. */
  function showFieldError(form, err) {
    form.querySelectorAll('.invalid').forEach(x => x.classList.remove('invalid'));
    if (err && err.field) {
      const map = { Password: 'password', Email: 'email', 'Mobile number': 'mobile', Pincode: 'pincode' };
      const name = map[err.field] || err.field;
      const target = form.querySelector('[name="' + name + '"]');
      if (target) { target.classList.add('invalid'); target.focus(); }
    }
    errorToast(err);
  }
  /** Disables the submit button while an async handler runs (prevents double submits). */
  function onSubmit(form, handler) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btns = form.querySelectorAll('button[type=submit]');
      btns.forEach(b => { b.disabled = true; b.dataset.label = b.textContent; b.textContent = 'Please wait…'; });
      try { await handler(formValues(form)); }
      catch (err) { showFieldError(form, err); }
      finally { btns.forEach(b => { b.disabled = false; b.textContent = b.dataset.label; }); }
    });
    return form;
  }

  /* ---------- misc components ---------- */
  const spinner = () => el('div', { class: 'spinner', role: 'progressbar', 'aria-label': 'Loading' });
  function empty(iconName, text, action) {
    return el('div', { class: 'empty' }, icon(iconName), el('p', { text }), action || null);
  }
  /** Renders into container while loading data; shows errors with a retry button. */
  async function load(container, loader, render) {
    clear(container).appendChild(spinner());
    try {
      const data = await loader();
      clear(container);
      append(container, [render(data)]);
    } catch (err) {
      clear(container).appendChild(empty('cloud_off', err.message || 'Could not load.',
        el('button', { class: 'btn btn-ghost', onclick: () => load(container, loader, render), text: 'Try again' })));
    }
  }
  /** columns: [{label, key | render(row)}] */
  function table(columns, rows, onRow) {
    if (!rows.length) return empty('inbox', 'Nothing to show.');
    return el('div', { class: 'table-wrap' }, el('table', { class: 'table' },
      el('thead', null, el('tr', null, columns.map(c => el('th', { text: c.label })))),
      el('tbody', null, rows.map(r => el('tr', { class: onRow ? 'clickable' : null, onclick: onRow ? () => onRow(r) : null },
        columns.map(c => {
          const v = c.render ? c.render(r) : r[c.key];
          return el('td', { 'data-label': c.label }, v === undefined || v === null || v === '' ? '—' : v);
        }))))));
  }
  function kv(pairs) {
    const dl = el('dl', { class: 'kv' });
    pairs.forEach(p => { if (p && p[1] !== undefined && p[1] !== null && p[1] !== '') { dl.appendChild(el('dt', { text: p[0] })); dl.appendChild(el('dd', null, p[1])); } });
    return dl;
  }
  function stat(label, value, iconName, cls) {
    return el('div', { class: 'stat ' + (cls || '') }, el('div', { class: 'label' }, iconName ? icon(iconName) : null, label), el('div', { class: 'value', text: value }));
  }
  function tabs(items, active) {
    return el('nav', { class: 'tabs', 'aria-label': 'Sections' }, el('div', { class: 'container' }, el('div', { class: 'row' },
      items.map(i => el('a', { class: 'tab' + (i.key === active ? ' active' : ''), href: i.href }, icon(i.icon), i.label)))));
  }
  function starsText(n) { const r = Math.round(Number(n) || 0); return '★'.repeat(r) + '☆'.repeat(5 - r); }
  function starInput(onChange) {
    let value = 0;
    const wrap = el('div', { class: 'stars-input', role: 'radiogroup', 'aria-label': 'Rating' });
    const btns = [1, 2, 3, 4, 5].map(i => el('button', { type: 'button', text: '★', 'aria-label': i + ' star', onclick: () => {
      value = i; btns.forEach((b, j) => b.classList.toggle('on', j < i)); if (onChange) onChange(i);
    } }));
    append(wrap, btns);
    wrap.getValue = () => value;
    return wrap;
  }

  /* ---------- files ---------- */
  function readAsBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1]);
      r.onerror = () => reject(new Error('Could not read the file.'));
      r.readAsDataURL(file);
    });
  }
  /** Shrinks a photo to max 1280px JPEG (~150–400 KB) before upload – saves data and Drive space. */
  function compressImage(file, maxDim, quality) {
    maxDim = maxDim || 1280; quality = quality || 0.8;
    return new Promise((resolve, reject) => {
      if (!/^image\//.test(file.type)) return reject(new Error('Please choose a photo.'));
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        const dataUrl = c.toDataURL('image/jpeg', quality);
        resolve({ name: file.name.replace(/\.\w+$/, '') + '.jpg', mimeType: 'image/jpeg', data: dataUrl.split(',')[1] });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This photo could not be opened.')); };
      img.src = url;
    });
  }
  async function fileForUpload(file, allowPdf) {
    if (allowPdf && file.type === 'application/pdf') {
      if (file.size > 4 * 1024 * 1024) throw new Error('PDF must be under 4 MB.');
      return { name: file.name, mimeType: 'application/pdf', data: await readAsBase64(file) };
    }
    return compressImage(file);
  }
  /** A file picker button. onFile(file) is awaited. */
  function filePicker(label, accept, onFile, capture) {
    const inp = el('input', { type: 'file', accept, class: 'sr', capture: capture || null });
    const btn = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => inp.click() }, icon('upload'), label);
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      btn.disabled = true; const old = btn.lastChild.textContent; btn.lastChild.textContent = 'Uploading…';
      try { await onFile(f); } catch (err) { errorToast(err); }
      finally { btn.disabled = false; btn.lastChild.textContent = old; inp.value = ''; }
    });
    return el('span', null, inp, btn);
  }
  const fileCache = new Map();
  /** Loads a private Drive file through the API (ownership checked by the server). */
  async function fetchFile(fileId) {
    if (fileCache.has(fileId)) return fileCache.get(fileId);
    const p = API.call('files.get', { fileId }).then(f => ({ mimeType: f.mimeType, url: 'data:' + f.mimeType + ';base64,' + f.data }));
    fileCache.set(fileId, p);
    p.catch(() => fileCache.delete(fileId));
    return p;
  }
  function privateImage(fileId, cls, alt) {
    const img = el('img', { class: cls || '', alt: alt || 'Photo', loading: 'lazy' });
    if (!fileId) return el('div', { class: 'photo-ph' });
    fetchFile(fileId).then(f => { if (/^image\//.test(f.mimeType)) img.src = f.url; }).catch(() => { img.alt = 'Not available'; });
    return img;
  }
  async function openFile(fileId) {
    const f = await fetchFile(fileId);
    if (/^image\//.test(f.mimeType)) {
      modal({ title: 'Document', wide: true, body: el('img', { src: f.url, alt: 'Document', style: { width: '100%', borderRadius: '12px' } }) });
    } else {
      const bin = atob(f.url.split(',')[1]);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blobUrl = URL.createObjectURL(new Blob([bytes], { type: f.mimeType }));
      window.open(blobUrl, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    }
  }

  /* ---------- CSV export (Excel compatible) ---------- */
  function csvCell(v) {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s; // stop formula injection in Excel
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function downloadCsv(filename, columns, rows) {
    const lines = [columns.map(csvCell).join(',')].concat(rows.map(r => r.map(csvCell).join(',')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = el('a', { href: URL.createObjectURL(blob), download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }

  return { el, append, clear, icon, money, fmtDateTime, fmtDay, todayIst, badge, initials, toast, errorToast, modal, confirmDialog,
    promptDialog, field, input, textarea, select, checkList, checkedValues, formValues, onSubmit, showFieldError, spinner, empty, load,
    table, kv, stat, tabs, starsText, starInput, fileForUpload, filePicker, fetchFile, privateImage, openFile, downloadCsv };
})();
