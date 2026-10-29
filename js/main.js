/* Villa CDE V2: page behaviour (no dependencies). */
(function () {
  'use strict';

  /* ---------- Site settings: edit these ---------- */
  var CONFIG = {
    maxGuests: 14,                         // counter + guest field limit
    nightlyRate: 65000,                    // KES, used only for the WhatsApp message estimate (not shown on the page)
    currency: 'KES',
    whatsappNumber: '254713234606'         // digits only, no "+" — wa.me recipient
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mobile nav ---------- */
  var navToggle = $('#nav-toggle');
  var mnav = $('#mobile-menu');
  var mnavPanel = mnav && $('.mnav-panel', mnav);
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
  var navTimer = null;

  function navIsOpen() { return !!mnav && !mnav.hidden; }
  function navItems() {
    return $$(FOCUSABLE, mnavPanel).filter(function (el) { return el.offsetWidth > 0 || el.offsetHeight > 0; });
  }
  function openNav() {
    clearTimeout(navTimer);
    mnav.hidden = false;
    document.body.classList.add('lb-open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Close menu');
    function reveal() { mnav.classList.add('is-open'); }
    if (reduced) reveal(); else requestAnimationFrame(reveal);
    var items = navItems();
    if (items.length) items[0].focus();
  }
  function closeNav(keepFocus) {
    if (!navIsOpen()) return;
    mnav.classList.remove('is-open');
    document.body.classList.remove('lb-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
    if (!keepFocus) navToggle.focus();
    clearTimeout(navTimer);
    navTimer = setTimeout(function () { mnav.hidden = true; }, reduced ? 0 : 320);
  }

  if (navToggle && mnav) {
    navToggle.addEventListener('click', function () { if (navIsOpen()) closeNav(); else openNav(); });
    mnav.addEventListener('click', function (e) {
      /* backdrop / close button, then any link in the panel */
      if (e.target.closest('[data-mnav="close"]') || e.target.closest('a[href]')) closeNav();
    });
    document.addEventListener('keydown', function (e) {
      if (!navIsOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); closeNav(); return; }
      if (e.key !== 'Tab') return;
      var items = navItems();
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1], on = document.activeElement;
      if (e.shiftKey && (on === first || !mnavPanel.contains(on))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && on === last) { e.preventDefault(); first.focus(); }
    });
    var wide = window.matchMedia('(min-width: 900px)');
    var onWide = function (m) { if (m.matches) closeNav(true); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
    else if (wide.addListener) wide.addListener(onWide);
  }

  /* ---------- Hero video: force muted autoplay (iOS / Safari) ---------- */
  var video = $('#hero-video');
  if (video) {
    video.muted = true;
    video.defaultMuted = true;
    var pv = video.play();
    if (pv && pv.catch) pv.catch(function () { /* poster stays visible */ });
  }

  /* ---------- Animated counters ---------- */
  var guestStat = $('#stats [data-guests]');
  if (guestStat) guestStat.setAttribute('data-count', String(CONFIG.maxGuests));
  var guestInput = $('#v2gu');
  if (guestInput) guestInput.max = String(CONFIG.maxGuests);

  var counters = $$('#stats [data-count]');
  function paint(el, v) { el.textContent = v + (el.getAttribute('data-suffix') || ''); }
  function runCounters() {
    if (reduced) { counters.forEach(function (el) { paint(el, +el.getAttribute('data-count')); }); return; }
    var dur = 1800, t0 = performance.now();
    (function step(now) {
      var t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
      counters.forEach(function (el) { paint(el, Math.round(+el.getAttribute('data-count') * e)); });
      if (t < 1) requestAnimationFrame(step);
    })(t0);
  }
  var stats = $('#stats');
  if (stats && counters.length) {
    if (!reduced) counters.forEach(function (el) { paint(el, 0); });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); runCounters(); }
      }, { threshold: 0.35 });
      io.observe(stats);
    } else { runCounters(); }
  }

  /* ---------- Amenity tabs (WAI-ARIA tabs pattern) ---------- */
  var tabs = $$('[role="tab"]');
  function selectTab(i, focus) {
    tabs.forEach(function (tab, j) {
      var on = i === j;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (focus) tabs[i].focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(i); });
    tab.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); selectTab((i + 1) % tabs.length, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); selectTab((i - 1 + tabs.length) % tabs.length, true); }
    });
  });

  /* ---------- Reviews carousel ---------- */
  var reviews = $$('#reviews-track .review');
  var rvCount = $('#reviews-count');
  var rv = 0;
  function showReview(i) {
    rv = (i + reviews.length) % reviews.length;
    reviews.forEach(function (r, j) { r.hidden = j !== rv; });
    if (rvCount) rvCount.textContent = (rv + 1) + ' / ' + reviews.length;
  }
  $$('[data-rv]').forEach(function (btn) {
    btn.addEventListener('click', function () { showReview(rv + (btn.getAttribute('data-rv') === 'next' ? 1 : -1)); });
  });
  if (reviews.length) showReview(0);

  /* ---------- Lightbox (gallery + rooms) ----------
     Triggers carry data-lb-group, so the rooms grid and the gallery are two
     separate runs: opening a room steps through the six rooms and the four
     en-suite shots, never into the gallery. data-title / data-desc are
     optional; the caption is hidden when a trigger has none. */
  var triggers = $$('.js-lightbox');
  var lb = $('#lightbox'), lbImg = $('#lightbox-img'), lbCount = $('#lightbox-count');
  var lbCap = $('#lightbox-cap'), lbTitle = $('#lightbox-title'), lbDesc = $('#lightbox-desc');
  var lbFig = $('#lightbox-figure');
  var photos = [], current = -1, lastFocus = null;

  function groupOf(b) { return b.getAttribute('data-lb-group') || 'gallery'; }
  function membersOf(g) { return triggers.filter(function (b) { return groupOf(b) === g; }); }

  function show(i) {
    if (!photos.length) return;
    current = (i + photos.length) % photos.length;
    var p = photos[current];
    lbImg.src = p.src;
    lbImg.alt = p.alt;
    if (p.title) {
      lbTitle.textContent = p.title;
      lbDesc.textContent = p.desc;
      lbDesc.hidden = !p.desc;
      lbCap.hidden = false;
      if (lbFig) lbFig.classList.add('has-cap');
    } else {
      lbCap.hidden = true;
      if (lbFig) lbFig.classList.remove('has-cap');
    }
    lbCount.textContent = (current + 1) + ' / ' + photos.length;
  }
  function openLb(group, i, trigger) {
    /* Remember the trigger itself rather than document.activeElement: clicking a
       button does not focus it in every browser (Safari), and focus must come back. */
    lastFocus = trigger || document.activeElement;
    photos = membersOf(group).map(function (b) {
      var img = $('img', b);
      return {
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt'),
        title: b.getAttribute('data-title') || '',
        desc: b.getAttribute('data-desc') || ''
      };
    });
    show(i);
    lb.hidden = false;
    document.body.classList.add('lb-open');
    $('[data-lb="close"][aria-label="Close"]', lb).focus();
  }
  function closeLb() {
    lb.hidden = true;
    document.body.classList.remove('lb-open');
    if (lastFocus) lastFocus.focus();
  }
  if (lb) {
    triggers.forEach(function (b) {
      b.addEventListener('click', function () {
        var g = groupOf(b);
        openLb(g, membersOf(g).indexOf(b), b);
      });
    });
    lb.addEventListener('click', function (e) {
      var a = e.target.closest('[data-lb]');
      if (!a) return;
      var act = a.getAttribute('data-lb');
      if (act === 'close') closeLb();
      if (act === 'prev') show(current - 1);
      if (act === 'next') show(current + 1);
    });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
  }

  /* ---------- Booking date range picker ----------
     Replaces the two native date inputs with one field. Clicking anywhere on
     the field (not just an icon) opens a two-month calendar. First click sets
     check-in, second sets check-out. The hidden check_in / check_out inputs
     keep the submitted payload identical to before. */
  var drTrigger = $('#dr-trigger'), drCal = $('#dr-cal');
  var drText = $('#dr-text'), drNights = $('#dr-nights');
  var drIn = $('#v2ci'), drOut = $('#v2co');

  if (drTrigger && drCal && drIn && drOut) {
    var DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];

    var drStart = null, drEnd = null, drHover = null;
    var now = new Date();
    var drMin = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var drView = new Date(drMin.getFullYear(), drMin.getMonth(), 1);
    var drOpen = false, drFocus = null;

    function iso(d) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
             '-' + String(d.getDate()).padStart(2, '0');
    }
    function parseISO(v) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
      return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
    }
    function sameDay(a, b) { return !!a && !!b && a.getTime() === b.getTime(); }
    function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
    function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
    function fmt(d) {
      return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear();
    }
    function drCount() {
      if (!drStart || !drEnd) return 0;
      return Math.round((drEnd - drStart) / 86400000);
    }
    function hintText() {
      if (!drStart) return 'Select your check-in date';
      if (!drEnd) return 'Select your check-out date';
      var n = drCount();
      return n + (n === 1 ? ' night' : ' nights') + ' selected';
    }

    function paintField() {
      var n = drCount();
      if (drStart && drEnd) {
        drText.textContent = fmt(drStart) + '  →  ' + fmt(drEnd);
        drText.classList.remove('is-placeholder');
        drNights.textContent = n + (n === 1 ? ' night' : ' nights');
      } else if (drStart) {
        drText.textContent = fmt(drStart) + '  →  check-out?';
        drText.classList.remove('is-placeholder');
        drNights.textContent = '';
      } else {
        drText.textContent = 'Add your dates';
        drText.classList.add('is-placeholder');
        drNights.textContent = '';
      }
      drIn.value = drStart ? iso(drStart) : '';
      drOut.value = drEnd ? iso(drEnd) : '';
      $('.dr-field').classList.remove('is-invalid');
    }

    function monthHTML(base) {
      var y = base.getFullYear(), m = base.getMonth();
      var first = new Date(y, m, 1);
      var lead = (first.getDay() + 6) % 7;             // Monday-first
      var len = new Date(y, m + 1, 0).getDate();
      var cells = '';
      for (var i = 0; i < lead; i++) cells += '<button type="button" class="dr-empty" tabindex="-1" aria-hidden="true"></button>';
      for (var d = 1; d <= len; d++) {
        var day = new Date(y, m, d);
        var disabled = day < drMin;
        var cls = [];
        if (sameDay(day, drMin)) cls.push('is-today');
        if (sameDay(day, drStart)) cls.push('is-start');
        if (sameDay(day, drEnd)) cls.push('is-end');
        var tail = drEnd || (drStart && drHover && drHover > drStart ? drHover : null);
        if (drStart && tail && day > drStart && day < tail) cls.push('in-range');
        cells += '<button type="button" data-date="' + iso(day) + '"' +
                 (disabled ? ' disabled' : '') +
                 ' tabindex="-1"' +
                 ' aria-label="' + d + ' ' + MONTHS[m] + ' ' + y + '"' +
                 (cls.indexOf('is-start') > -1 || cls.indexOf('is-end') > -1 ? ' aria-pressed="true"' : '') +
                 (cls.length ? ' class="' + cls.join(' ') + '"' : '') + '>' + d + '</button>';
      }
      return '<div class="dr-month"><p class="dr-month-name">' + MONTHS[m] + ' ' + y + '</p>' +
             '<div class="dr-dow">' + DOW.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' +
             '<div class="dr-days">' + cells + '</div></div>';
    }

    function render() {
      var atMin = drView.getFullYear() === drMin.getFullYear() && drView.getMonth() === drMin.getMonth();
      drCal.innerHTML =
        '<div class="dr-cal-head">' +
          '<button type="button" class="dr-nav" data-dr="prev" aria-label="Previous month"' + (atMin ? ' disabled' : '') + '>' +
            '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg>' +
          '</button>' +
          '<span class="dr-hint">' + hintText() + '</span>' +
          '<button type="button" class="dr-nav" data-dr="next" aria-label="Next month">' +
            '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>' +
          '</button>' +
        '</div>' +
        '<div class="dr-months">' + monthHTML(drView) + monthHTML(addMonths(drView, 1)) + '</div>' +
        '<div class="dr-foot">' +
          '<button type="button" class="dr-clear" data-dr="clear">Clear dates</button>' +
          '<button type="button" class="dr-done" data-dr="done">Done</button>' +
        '</div>';
      markFocus();
    }

    /* roving tabindex so arrow keys walk the grid */
    function markFocus() {
      var days = $$('.dr-days button[data-date]:not([disabled])', drCal);
      if (!days.length) return;
      var target = days[0];
      if (drFocus) {
        for (var i = 0; i < days.length; i++) {
          if (days[i].getAttribute('data-date') === drFocus) { target = days[i]; break; }
        }
      }
      days.forEach(function (b) { b.tabIndex = -1; });
      target.tabIndex = 0;
      return target;
    }

    function openCal() {
      if (drOpen) return;
      drOpen = true;
      drCal.hidden = false;
      drTrigger.setAttribute('aria-expanded', 'true');
      if (drStart) drView = new Date(drStart.getFullYear(), drStart.getMonth(), 1);
      drFocus = iso(drStart || drMin);
      render();
      var t = markFocus();
      if (t) t.focus();
      document.addEventListener('mousedown', outside, true);
    }
    function closeCal(returnFocus) {
      if (!drOpen) return;
      drOpen = false;
      drCal.hidden = true;
      drTrigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('mousedown', outside, true);
      if (returnFocus) drTrigger.focus();
    }
    function outside(e) { if (!drCal.contains(e.target) && !drTrigger.contains(e.target)) closeCal(false); }

    function pick(d) {
      if (!drStart || drEnd || d <= drStart) { drStart = d; drEnd = null; drHover = null; }
      else { drEnd = d; }
      drFocus = iso(d);
      paintField();
      render();
      if (drStart && drEnd) {
        var t = markFocus(); if (t) t.focus();
      }
    }

    /* Click anywhere on the field, not just the icon. */
    drTrigger.addEventListener('click', function () { drOpen ? closeCal(true) : openCal(); });

    drCal.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-dr]');
      if (nav) {
        var a = nav.getAttribute('data-dr');
        if (a === 'prev') { drView = addMonths(drView, -1); render(); }
        if (a === 'next') { drView = addMonths(drView, 1); render(); }
        if (a === 'clear') { drStart = drEnd = drHover = null; paintField(); render(); }
        if (a === 'done') closeCal(true);
        return;
      }
      var cell = e.target.closest('button[data-date]');
      if (cell && !cell.disabled) pick(parseISO(cell.getAttribute('data-date')));
    });

    /* live range preview while choosing the check-out */
    drCal.addEventListener('mouseover', function (e) {
      var cell = e.target.closest('button[data-date]');
      if (!cell || cell.disabled || !drStart || drEnd) return;
      var d = parseISO(cell.getAttribute('data-date'));
      if (drHover && sameDay(d, drHover)) return;
      drHover = d; render();
    });
    drCal.addEventListener('mouseleave', function () {
      if (drStart && !drEnd && drHover) { drHover = null; render(); }
    });

    drCal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); closeCal(true); return; }
      var cur = parseISO(drFocus); if (!cur) return;
      var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      var next = null;
      if (step) next = addDays(cur, step);
      else if (e.key === 'PageUp') next = addMonths(new Date(cur.getFullYear(), cur.getMonth(), 1), -1);
      else if (e.key === 'PageDown') next = addMonths(new Date(cur.getFullYear(), cur.getMonth(), 1), 1);
      else if (e.key === 'Home') next = addDays(cur, -((cur.getDay() + 6) % 7));
      else if (e.key === 'End') next = addDays(cur, 6 - ((cur.getDay() + 6) % 7));
      else return;
      e.preventDefault();
      if (next < drMin) next = drMin;
      drFocus = iso(next);
      var vm = drView.getFullYear() * 12 + drView.getMonth();
      var nm = next.getFullYear() * 12 + next.getMonth();
      if (nm < vm) drView = new Date(next.getFullYear(), next.getMonth(), 1);
      if (nm > vm + 1) drView = addMonths(new Date(next.getFullYear(), next.getMonth(), 1), -1);
      render();
      var t = markFocus(); if (t) t.focus();
    });

    window.__drPaint = paintField;
    window.__drReset = function () { drStart = drEnd = drHover = null; closeCal(false); paintField(); };
    window.__drCount = drCount;
    window.__drInvalid = function () { $('.dr-field').classList.add('is-invalid'); drTrigger.focus(); };
  }

  /* ---------- Booking form ---------- */
  var form = $('#booking-form'), thanks = $('#booking-thanks'), reset = $('#booking-reset');
  function money(v) { return CONFIG.currency + ' ' + Math.round(v).toLocaleString('en-US'); }
  function nights() {
    var ci = form.elements.check_in.value, co = form.elements.check_out.value;
    if (!ci || !co) return 0;
    var d = (new Date(co) - new Date(ci)) / 86400000;
    return d > 0 ? Math.round(d) : 0;
  }

  /* No backend behind this form — it hands the request to WhatsApp instead.
     The visitor still has to tap send in WhatsApp; wa.me can only pre-fill. */
  function buildWhatsAppMessage(data) {
    var lines = [
      'New booking request — Villa CDE',
      '',
      'Name: ' + data.name,
      'Dates: ' + data.check_in + ' → ' + data.check_out + ' (' + data.nights + (data.nights === 1 ? ' night' : ' nights') + ')',
      'Guests: ' + data.guests,
      'Estimate: ' + money(data.estimate)
    ];
    if (data.phone) lines.push('Phone: ' + data.phone);
    if (data.message) lines.push('Occasion/requests: ' + data.message);
    return lines.join('\n');
  }

  function submitBooking(data) {
    var url = 'https://wa.me/' + CONFIG.whatsappNumber + '?text=' + encodeURIComponent(buildWhatsAppMessage(data));
    window.open(url, '_blank', 'noopener');
    return Promise.resolve();
  }

  if (form) {
    /* check_in / check_out are hidden inputs now; the range picker owns them. */
    if (window.__drPaint) window.__drPaint();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (nights() < 1) {
        /* A hidden input cannot be focused or reported by reportValidity(),
           so flag the range field itself. */
        if (window.__drInvalid) window.__drInvalid();
        return;
      }
      var data = Object.fromEntries(new FormData(form).entries());
      data.nights = nights();
      data.estimate = data.nights * CONFIG.nightlyRate;
      submitBooking(data).then(function () {
        form.hidden = true;
        thanks.hidden = false;
        thanks.focus();
      });
    });
  }
  if (reset) {
    reset.addEventListener('click', function () {
      form.reset();
      if (window.__drReset) window.__drReset();
      thanks.hidden = true;
      form.hidden = false;
    });
  }
})();
