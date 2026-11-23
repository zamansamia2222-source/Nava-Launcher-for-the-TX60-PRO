/* Nava TV launcher: UI logic. Plain ES5/ES6 without newer syntax so older Android WebViews run it. */
(function () {
  'use strict';

  var N = window.NavaNative || null;
  var VERSION = '1.0.0';
  var $ = function (id) { return document.getElementById(id); };

  // ---------------------------------------------------------------- storage (localStorage with in-memory fallback)
  var mem = {};
  function sget(k, d) {
    try { var v = localStorage.getItem('nava.' + k); if (v !== null) return JSON.parse(v); } catch (e) {}
    return mem.hasOwnProperty(k) ? mem[k] : d;
  }
  function sset(k, v) { mem[k] = v; try { localStorage.setItem('nava.' + k, JSON.stringify(v)); } catch (e) {} }

  // ---------------------------------------------------------------- icons
  var P = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9"/>',
    apps: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
    wifi: '<path d="M3.5 9.5a12 12 0 0 1 17 0"/><path d="M6.5 12.8a7.8 7.8 0 0 1 11 0"/><path d="M9.4 16a3.6 3.6 0 0 1 5.2 0"/><path d="M12 19.2v.1"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17"/>',
    bluetooth: '<path d="m7 7.5 10 9-5 4.2V3.3l5 4.2-10 9"/>',
    display: '<rect x="3.5" y="5" width="17" height="11" rx="2"/><path d="M9 20h6M12 16v4"/>',
    volume: '<path d="M4.5 9.5v5h3.5l4.5 3.5v-12L8 9.5z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
    spark: '<path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.5l-1.8-5.9L4.5 10.8 10.2 9z"/>',
    star: '<path d="m12 4 2.4 5 5.4.7-4 3.8 1 5.4L12 16.2 7.2 18.9l1-5.4-4-3.8 5.4-.7z"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.1"/>',
    trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l.8 12.5h8.4L17 7"/>',
    play: '<path d="M8 5.5v13l11-6.5z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    go: '<path d="M9 6l6 6-6 6"/>',
    plug: '<path d="M8 3.5v5M16 3.5v5M6 8.5h12v3.5a6 6 0 0 1-12 0z"/><path d="M12 18v3"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>'
  };
  function ic(n, s, w) { return '<svg class="ic" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" style="stroke-width:' + (w || 1.8) + '">' + P[n] + '</svg>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // ---------------------------------------------------------------- state
  var S = {
    apps: [], byPkg: {},
    view: 'home',                 // 'home' | 'apps'
    zone: 'rows',                 // 'rows' | 'top'
    r: 0, c: 0, tab: 0,
    rows: [], rowEls: [],
    panelOpen: false, pi: 0,
    modal: null,                  // null | 'search' | 'opts'
    q: '', sz: 'osk', kr: 0, kc: 0, ri: 0, results: [],
    opts: null, oi: 0,
    okDown: false, okLong: false,
    last: Date.now(), saver: false, booting: true,
    blur: !!sget('blur', false),
    vol: 50, net: 'none', isHome: false,
    mouse: { x: -1, y: -1 }
  };

  var TABS = [
    { id: 'home', t: 'Home', i: 'home' },
    { id: 'apps', t: 'Apps', i: 'apps' },
    { id: 'search', t: 'Search', i: 'search' },
    { id: 'settings', t: 'Settings', i: 'gear' }
  ];

  // Android ApplicationInfo.category -> group
  var GROUPS = [
    { id: 'video', t: 'Movies & TV' },
    { id: 'audio', t: 'Music' },
    { id: 'game', t: 'Games' },
    { id: 'social', t: 'Social' },
    { id: 'other', t: 'Apps' }
  ];
  function groupOf(a) {
    switch (a.cat) {
      case 2: return 'video';
      case 1: return 'audio';
      case 0: return 'game';
      case 4: return 'social';
      default: return 'other';
    }
  }
  function groupName(id) { for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].id === id) return GROUPS[i].t; return 'Apps'; }

  // ---------------------------------------------------------------- data
  function hueOf(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
  function monoOf(n) { var m = n.replace(/[^A-Za-z0-9Ѐ-ӿ]/g, ''); return (m.charAt(0) || '?').toUpperCase(); }
  function bgOf(a) { var h = hueOf(a.name); return 'linear-gradient(150deg,hsl(' + h + ',72%,76%),hsl(' + ((h + 24) % 360) + ',56%,56%))'; }

  function loadApps() {
    var list = [];
    try { list = JSON.parse(N.getApps()); } catch (e) { list = []; }
    list.forEach(function (a) { a.g = groupOf(a); });
    list.sort(function (a, b) { return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
    S.apps = list; S.byPkg = {};
    list.forEach(function (a) { S.byPkg[a.pkg] = a; });
  }
  function favs() { return sget('favs', []).filter(function (p) { return S.byPkg[p]; }); }
  function recents() { return sget('recent', []).filter(function (p) { return S.byPkg[p]; }); }
  function isFav(pkg) { return sget('favs', []).indexOf(pkg) >= 0; }
  function toggleFav(pkg) {
    var f = sget('favs', []), i = f.indexOf(pkg);
    if (i >= 0) f.splice(i, 1); else f.push(pkg);
    sset('favs', f);
  }
  function pushRecent(pkg) {
    var r = sget('recent', []).filter(function (p) { return p !== pkg; });
    r.unshift(pkg); sset('recent', r.slice(0, 16));
  }

  function chunk(arr, n) { var o = []; for (var i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; }

  function buildRows() {
    var rows = [], a;
    if (S.view === 'home') {
      var rec = recents().map(function (p) { return S.byPkg[p]; }).slice(0, 12);
      if (rec.length) rows.push({ t: 'Continue', s: 'Recently opened', items: rec });
      var fv = favs().map(function (p) { return S.byPkg[p]; });
      if (fv.length) rows.push({ t: 'Favorites', s: '', items: fv });
      GROUPS.forEach(function (g) {
        var items = S.apps.filter(function (x) { return x.g === g.id; });
        items.sort(function (x, y) { return (y.tv ? 1 : 0) - (x.tv ? 1 : 0); });   // stable enough: TV apps first, name order kept by browser's stable sort
        chunk(items, 12).forEach(function (part, i) {
          rows.push({ t: i === 0 ? g.t : 'More ' + g.t.toLowerCase(), s: i === 0 ? items.length + (items.length === 1 ? ' app' : ' apps') : '', items: part });
        });
      });
    } else {
      chunk(S.apps, 8).forEach(function (part, i) {
        rows.push({ t: i === 0 ? 'All apps' : '', s: i === 0 ? S.apps.length + ' installed' : '', items: part, nh: i > 0 });
      });
    }
    S.rows = rows.filter(function (r) { return r.items.length; });
  }

  // ---------------------------------------------------------------- rendering
  function tileHTML(a, ri, ci) {
    return '<div class="item" data-r="' + ri + '" data-c="' + ci + '"><div class="ring" style="background:' + bgOf(a) + '"><div class="sheen"></div>' +
      (isFav(a.pkg) ? '<span class="fav">' + ic('star', 22, 2) + '</span>' : '') +
      '<span class="mono">' + esc(monoOf(a.name)) + '</span>' +
      (a.icon ? '<img class="ico" alt="" draggable="false" src="' + esc(a.icon) + '">' : '') +
      (a.tv && S.view === 'apps' ? '<span class="tvb">TV</span>' : '') +
      '</div><div class="cap"><b>' + esc(a.name) + '</b></div></div>';
  }

  function render() {
    buildRows();
    document.body.classList.toggle('apps', S.view === 'apps');
    var html = '';
    S.rows.forEach(function (row, ri) {
      html += '<section class="row' + (row.nh ? ' nh' : '') + '">' + (row.t ? '<h2>' + esc(row.t) + (row.s ? ' <span>' + esc(row.s) + '</span>' : '') + '</h2>' : '') +
        '<div class="track">';
      row.items.forEach(function (a, ci) { html += tileHTML(a, ri, ci); });
      html += '</div></section>';
    });
    var rowsEl = $('rows');
    rowsEl.innerHTML = html;
    S.rowEls = rowsEl.children;
    $('empty').style.display = S.rows.length ? 'none' : 'block';
    $('heroText').style.visibility = S.rows.length ? 'visible' : 'hidden';
    var imgs = rowsEl.querySelectorAll('img.ico');
    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        img.addEventListener('load', function () { if (img.parentNode && img.parentNode.parentNode) img.parentNode.parentNode.classList.add('has'); });
        img.addEventListener('error', function () { if (img.parentNode) img.parentNode.removeChild(img); });
        if (img.complete && img.naturalWidth > 0) img.parentNode.parentNode.classList.add('has');
      })(imgs[i]);
    }
    renderTabs();
    if (S.r >= S.rows.length) S.r = Math.max(0, S.rows.length - 1);
    setFocus(S.r, S.c, true);
  }

  function renderTabs() {
    var h = '';
    TABS.forEach(function (t, i) {
      var sel = (t.id === S.view);
      h += '<div class="tab' + (sel ? ' sel' : '') + (S.zone === 'top' && S.tab === i && !S.panelOpen && !S.modal ? ' on' : '') + '" data-t="' + i + '">' + ic(t.i, 22, 2) + '<span>' + t.t + '</span></div>';
    });
    $('tabs').innerHTML = h;
  }

  function itemEl(r, c) {
    var row = S.rowEls[r];
    if (!row) return null;
    var tr = row.querySelector('.track');
    return tr ? tr.children[c] : null;
  }
  function cur() { var row = S.rows[S.r]; return row ? row.items[S.c] : null; }

  var lastPkg = null, heroTimer = 0, tintFlip = false;

  function setFocus(r, c, instant) {
    if (!S.rows.length) { S.r = 0; S.c = 0; return; }
    r = Math.max(0, Math.min(S.rows.length - 1, r));
    c = Math.max(0, Math.min(S.rows[r].items.length - 1, c));
    var old = itemEl(S.r, S.c);
    if (old) old.classList.remove('on');
    S.r = r; S.c = c;
    if (S.zone === 'rows') { var el = itemEl(r, c); if (el) el.classList.add('on'); }
    place(instant);
    hero();
  }

  function place(instant) {
    var sc = $('scroller');
    var row = S.rowEls[S.r];
    var ty = 0;
    if (row && S.r > 0) {
      ty = Math.min(0, -(row.offsetTop - (S.view === 'home' ? 250 : 190)));
      var maxScroll = sc.offsetHeight - 940;       // do not scroll past the last row
      ty = maxScroll > 0 ? Math.max(ty, -maxScroll) : 0;
    }
    if (instant) { sc.style.transition = 'none'; }
    sc.style.transform = 'translateY(' + ty + 'px)';
    // horizontal: keep the focused tile inside the window
    for (var i = 0; i < S.rowEls.length; i++) {
      var tr = S.rowEls[i].querySelector('.track');
      if (!tr) continue;
      var shift = 0;
      if (i === S.r) {
        var it = tr.children[S.c];
        if (it) shift = Math.max(0, it.offsetLeft + it.offsetWidth + 32 - 1800);
      } else {
        var m = /translateX\(-(\d+)px\)/.exec(tr.style.transform || '');
        shift = m ? parseInt(m[1], 10) : 0;
      }
      if (instant) tr.style.transition = 'none';
      tr.style.transform = 'translateX(-' + shift + 'px)';
    }
    if (instant) {
      void sc.offsetHeight;
      sc.style.transition = '';
      for (var j = 0; j < S.rowEls.length; j++) { var t2 = S.rowEls[j].querySelector('.track'); if (t2) t2.style.transition = ''; }
    }
    $('heroText').style.opacity = (S.r === 0 || S.view !== 'home') ? '' : '0';
  }

  function hero() {
    var a = cur();
    if (!a) return;
    // wallpaper tint follows the focused app
    var h = hueOf(a.name);
    var next = tintFlip ? $('tintA') : $('tintB'), prev = tintFlip ? $('tintB') : $('tintA');
    if (a.pkg !== lastPkg) {
      next.style.background = 'linear-gradient(120deg,hsl(' + h + ',62%,74%),hsl(' + ((h + 40) % 360) + ',62%,58%))';
      next.classList.add('show'); prev.classList.remove('show'); tintFlip = !tintFlip;
    }
    if (S.view !== 'home') { lastPkg = a.pkg; return; }
    if (a.pkg === lastPkg) return;
    lastPkg = a.pkg;
    var box = $('heroText');
    box.classList.add('out');
    clearTimeout(heroTimer);
    heroTimer = setTimeout(function () {
      var f = isFav(a.pkg);
      $('hEy').textContent = groupName(a.g);
      $('hT').textContent = a.name;
      $('hM').innerHTML = '<span>' + esc(a.pkg) + '</span>' + (a.tv ? '<span class="dot"></span><span class="badge">TV</span>' : '');
      $('hD').textContent = f ? 'Pinned to Favorites. Press OK to open, hold OK for options.'
        : (a.tv ? 'Made for Android TV. Press OK to open, hold OK to pin it or see app info.' : 'Press OK to open. Hold OK to pin it, see app info or uninstall.');
      box.classList.remove('out');
    }, 120);
  }

  // ---------------------------------------------------------------- actions
  var toastT = 0;
  function toast(msg, icon) {
    $('tIc').innerHTML = ic(icon || 'info', 18, 2.4);
    $('tTx').textContent = msg;
    var t = $('toast'); t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2800);
  }

  function launch(a) {
    if (!a) return;
    var ok = false;
    try { ok = N.launch(a.pkg); } catch (e) {}
    if (ok) { pushRecent(a.pkg); }
    else toast('Couldn’t open ' + a.name, 'x');
  }

  function openSetting(kind) {
    var ok = false;
    try { ok = N.openSettings(kind); } catch (e) {}
    if (!ok) toast(kind === 'home' ? 'Press Home on the remote and choose Nava TV → Always' : 'That screen isn’t available on this device', 'info');
    return ok;
  }

  function setView(v) {
    S.view = v; S.zone = 'rows'; S.r = 0; S.c = 0; lastPkg = null;
    $('rows').classList.remove('enter'); void $('rows').offsetWidth; $('rows').classList.add('enter');
    render();
    hero();
  }

  function goHome() {
    closeModal(true); closePanel(true);
    S.zone = 'rows'; S.tab = 0;
    if (S.view !== 'home') setView('home');
    else { S.r = 0; S.c = 0; render(); }
  }

  // ---------------------------------------------------------------- quick settings panel
  var PT = [
    { id: 'wifi', i: 'wifi', t: 'Wi‑Fi', s: function () { return S.net === 'wifi' ? 'Connected' : S.net === 'none' ? 'Not connected' : 'Open settings'; }, k: 'wifi' },
    { id: 'network', i: 'plug', t: 'Network', s: function () { return S.net === 'ethernet' ? 'Ethernet connected' : 'Ethernet & more'; }, k: 'network' },
    { id: 'bt', i: 'bluetooth', t: 'Bluetooth', s: function () { return 'Remotes & audio'; }, k: 'bluetooth' },
    { id: 'display', i: 'display', t: 'Display', s: function () { return 'Resolution & HDR'; }, k: 'display' },
    { id: 'sound', i: 'volume', t: 'Sound', s: function () { return 'Output & effects'; }, k: 'sound' },
    { id: 'date', i: 'clock', t: 'Date & time', s: function () { return 'Clock & timezone'; }, k: 'date' },
    { id: 'home', i: 'home', t: 'Home app', s: function () { return S.isHome ? 'Nava TV is default' : 'Set Nava TV default'; }, k: 'home', act: function () { return S.isHome; } },
    { id: 'all', i: 'gear', t: 'All settings', s: function () { return 'System settings'; }, k: 'all' },
    { id: 'saver', i: 'moon', t: 'Screensaver', s: function () { return 'Start now'; }, fn: function () { closePanel(); startSaver(); } },
    { id: 'blur', i: 'spark', t: 'Glass blur', s: function () { return S.blur ? 'On' : 'Off (faster)'; }, act: function () { return S.blur; }, fn: function () { S.blur = !S.blur; sset('blur', S.blur); document.body.classList.toggle('blur', S.blur); renderPanel(); } }
  ];
  var SLIDER = PT.length;

  function renderPanel() {
    var h = '';
    PT.forEach(function (t, i) {
      var on = S.panelOpen && S.pi === i, act = t.act && t.act();
      h += '<div class="tg' + (act ? ' act' : '') + (on ? ' on' : '') + '" data-p="' + i + '"><div class="r">' + ic(t.i, 26, 1.8) + '<b>' + t.t + '</b></div><i>' + esc(t.s()) + '</i></div>';
    });
    $('pGrid').innerHTML = h;
    $('pSl').innerHTML = '<div class="sl' + (S.panelOpen && S.pi === SLIDER ? ' on' : '') + '" data-p="' + SLIDER + '">' + ic('volume', 30, 1.8) +
      '<div class="bar"><div style="width:' + S.vol + '%"></div></div><span class="v">' + S.vol + '</span></div>';
    $('pVer').textContent = 'nava tv · ' + VERSION;
  }

  function openPanel() {
    if (S.modal) closeModal(true);
    try { S.vol = N.getVolume(); S.isHome = N.isDefaultHome(); } catch (e) {}
    pollNet();
    S.panelOpen = true; S.pi = 0;
    clock();
    renderPanel(); renderTabs();
    $('panel').classList.add('open');
    document.body.classList.add('pn');
  }
  function closePanel(quiet) {
    if (!S.panelOpen) return;
    S.panelOpen = false; $('panel').classList.remove('open'); document.body.classList.remove('pn'); renderTabs();
  }
  function panelKey(k) {
    if (k === 'Back' || k === 'Menu') return closePanel();
    var i = S.pi;
    if (k === 'Up') { if (i === SLIDER) i = SLIDER - 2; else i = i - 2; if (i < 0) i = S.pi; }
    else if (k === 'Down') { if (i >= SLIDER - 2 && i < SLIDER) i = SLIDER; else if (i < SLIDER) i = i + 2; }
    else if (k === 'Left') { if (i === SLIDER) return volStep(-5); if (i % 2 === 1) i--; }
    else if (k === 'Right') { if (i === SLIDER) return volStep(5); if (i % 2 === 0 && i + 1 < SLIDER) i++; }
    else if (k === 'OK') {
      if (i === SLIDER) return;
      var t = PT[i];
      if (t.fn) t.fn();
      else if (t.k) { if (openSetting(t.k)) closePanel(); }
      return;
    }
    S.pi = i; renderPanel();
  }
  function volStep(d) {
    S.vol = Math.max(0, Math.min(100, S.vol + d));
    try { N.setVolume(S.vol); S.vol = N.getVolume(); } catch (e) {}
    renderPanel();
  }

  // ---------------------------------------------------------------- modal: search + options
  var OSK = (function () {
    var rows = [];
    ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'].forEach(function (s) {
      rows.push(s.split('').map(function (ch) { return { l: ch, t: 'ch', w: 1 }; }));
    });
    rows[2].push({ l: '⌫', t: 'bk', w: 1.5, sp: true });
    rows[3].push({ l: '.', t: 'ch', w: 1 }, { l: '-', t: 'ch', w: 1 });
    rows.push([{ l: 'Space', t: 'ch', ch: ' ', w: 4, sp: true }, { l: 'Clear', t: 'clr', w: 2, sp: true }, { l: 'Results', t: 'done', w: 2, sp: true, dn: true }]);
    return rows;
  })();

  function renderOsk() {
    var h = '';
    OSK.forEach(function (row, ri) {
      h += '<div class="osk-row">';
      row.forEach(function (k, ci) {
        h += '<div class="osk-k' + (k.sp ? ' sp' : '') + (k.dn ? ' dn' : '') + (S.sz === 'osk' && S.kr === ri && S.kc === ci ? ' on' : '') + '" data-kr="' + ri + '" data-kc="' + ci + '" style="flex:' + k.w + ' 1 0">' + esc(k.l) + '</div>';
      });
      h += '</div>';
    });
    var o = $('osk'); o.innerHTML = h; o.classList.toggle('idle', S.sz !== 'osk');
  }

  function score(name, q) {
    var n = name.toLowerCase(), i = n.indexOf(q);
    if (i === 0) return 0;
    if (i > 0) return n.charAt(i - 1) === ' ' ? 1 : 2;
    return -1;
  }

  function computeResults() {
    var q = S.q.toLowerCase().trim(), out = [];
    if (!q) {
      var seen = {};
      recents().concat(favs()).concat(S.apps.map(function (a) { return a.pkg; })).forEach(function (p) { if (!seen[p] && out.length < 6) { seen[p] = 1; out.push(S.byPkg[p]); } });
      return out;
    }
    var sc = [];
    S.apps.forEach(function (a) { var s = score(a.name, q); if (s < 0) s = (a.pkg.toLowerCase().indexOf(q) >= 0) ? 4 : -1; if (s >= 0) sc.push({ a: a, s: s }); });
    sc.sort(function (x, y) { return x.s - y.s; });
    return sc.slice(0, 6).map(function (x) { return x.a; });
  }

  function hl(name, q) {
    var i = q ? name.toLowerCase().indexOf(q.toLowerCase().trim()) : -1;
    if (i < 0 || !q.trim()) return esc(name);
    var L = q.trim().length;
    return esc(name.slice(0, i)) + '<mark>' + esc(name.slice(i, i + L)) + '</mark>' + esc(name.slice(i + L));
  }

  function renderSearch() {
    S.results = computeResults();
    if (S.ri >= S.results.length) S.ri = Math.max(0, S.results.length - 1);
    $('sbox').innerHTML = ic('search', 34, 1.8) + '<div class="q' + (S.q ? '' : ' ph') + '">' + (S.q ? esc(S.q) : 'Search apps') + '<u></u></div>';
    var h = '<div class="lbl">' + (S.q.trim() ? 'Apps' : 'Suggestions') + '</div>';
    if (!S.results.length) h += '<div class="none">No app called “' + esc(S.q) + '”</div>';
    S.results.forEach(function (a, i) {
      h += '<div class="res' + (S.sz === 'res' && S.ri === i ? ' on' : '') + '" data-ri="' + i + '"><div class="th" style="background:' + bgOf(a) + '">' + esc(monoOf(a.name)) +
        (a.icon ? '<img alt="" src="' + esc(a.icon) + '" onerror="this.remove()" style="position:absolute">' : '') + '</div>' +
        '<div class="tx"><b>' + hl(a.name, S.q) + '</b><i>' + esc(groupName(a.g)) + ' · ' + esc(a.pkg) + '</i></div><span class="go">' + ic('go', 28, 2.2) + '</span></div>';
    });
    $('sres').innerHTML = h;
    renderOsk();
  }

  function openSearch(first) {
    closePanel();
    S.modal = 'search'; S.q = first || ''; S.sz = 'osk'; S.kr = 1; S.kc = 0; S.ri = 0;
    var m = $('modal'); m.className = 'layer modal search';
    void m.offsetWidth; m.classList.add('open');
    renderSearch(); renderTabs();
  }

  function openOpts(a) {
    if (!a) return;
    var items = [{ t: 'Open', i: 'play', fn: function () { closeModal(); launch(a); } },
      { t: isFav(a.pkg) ? 'Remove from Favorites' : 'Pin to Favorites', i: 'star', fn: function () { toggleFav(a.pkg); closeModal(); keepFocus(a.pkg); } },
      { t: 'App info', i: 'info', fn: function () { closeModal(); if (!N.appInfo(a.pkg)) toast('Couldn’t open app info', 'x'); } }];
    if (!a.sys) items.push({ t: 'Uninstall', i: 'trash', danger: true, fn: function () { closeModal(); if (!N.uninstall(a.pkg)) toast('Couldn’t start uninstall', 'x'); } });
    S.opts = { app: a, items: items }; S.oi = 0; S.modal = 'opts';
    var m = $('modal'); m.className = 'layer modal opts';
    void m.offsetWidth; m.classList.add('open');
    renderOpts(); renderTabs();
  }
  function renderOpts() {
    var o = S.opts, a = o.app, h = '<h3>' + esc(a.name) + '</h3><div class="sub">' + esc(a.pkg) + '</div><div class="items">';
    o.items.forEach(function (it, i) {
      h += '<div class="res' + (S.oi === i ? ' on' : '') + (it.danger ? ' danger' : '') + '" data-oi="' + i + '"><div class="th">' + ic(it.i, 28, 1.9) + '</div><div class="tx"><b>' + it.t + '</b></div><span class="go">' + ic('go', 28, 2.2) + '</span></div>';
    });
    $('sheet').innerHTML = h + '</div>';
  }

  function closeModal(quiet) {
    if (!S.modal) return;
    S.modal = null;
    var m = $('modal'); m.classList.remove('open');
    renderTabs();
  }

  function keepFocus(pkg) {
    render();
    for (var r = 0; r < S.rows.length; r++) for (var c = 0; c < S.rows[r].items.length; c++)
      if (S.rows[r].items[c].pkg === pkg) { lastPkg = null; setFocus(r, c, true); return; }
  }

  function oskPress() {
    var k = OSK[S.kr][S.kc];
    if (k.t === 'ch') S.q += (k.ch || k.l);
    else if (k.t === 'bk') S.q = S.q.slice(0, -1);
    else if (k.t === 'clr') S.q = '';
    else if (k.t === 'done') { if (S.results.length) S.sz = 'res'; }
    S.ri = 0; renderSearch();
  }

  function modalKey(k) {
    if (S.modal === 'opts') {
      var n = S.opts.items.length;
      if (k === 'Back' || k === 'Menu') return closeModal();
      if (k === 'Up') S.oi = (S.oi + n - 1) % n;
      else if (k === 'Down') S.oi = (S.oi + 1) % n;
      else if (k === 'OK') return S.opts.items[S.oi].fn();
      return renderOpts();
    }
    // search
    if (k === 'Back') {
      return closeModal();
    }
    if (k === 'Search' || k === 'Menu') return closeModal();
    if (S.sz === 'res') {
      if (k === 'Up') { if (S.ri > 0) S.ri--; else S.sz = 'osk'; }
      else if (k === 'Down') { if (S.ri < S.results.length - 1) S.ri++; else { S.sz = 'osk'; S.kr = 0; } }
      else if (k === 'OK') { var a = S.results[S.ri]; closeModal(); return launch(a); }
      return renderSearch();
    }
    var row = OSK[S.kr];
    if (k === 'Left') S.kc = Math.max(0, S.kc - 1);
    else if (k === 'Right') S.kc = Math.min(row.length - 1, S.kc + 1);
    else if (k === 'Up') {
      if (S.kr === 0) { if (S.results.length) { S.sz = 'res'; S.ri = S.results.length - 1; } }
      else { var nr = OSK[S.kr - 1]; S.kc = Math.round(S.kc / Math.max(1, row.length - 1) * (nr.length - 1)); S.kr--; }
    } else if (k === 'Down') {
      if (S.kr < OSK.length - 1) { var nd = OSK[S.kr + 1]; S.kc = Math.round(S.kc / Math.max(1, row.length - 1) * (nd.length - 1)); S.kr++; }
    } else if (k === 'OK') return oskPress();
    renderSearch();
  }

  // ---------------------------------------------------------------- key handling
  function wake() { S.last = Date.now(); }

  function key(k) {
    var wasSaver = S.saver;
    wake();
    if (wasSaver) { stopSaver(); if (k === 'OKdown') S.okDown = false; return; }
    if (S.booting) return;

    if (k === 'OKdown') { S.okDown = true; S.okLong = false; return; }
    if (k === 'OKlong') {
      if (!S.okDown) return;
      S.okLong = true;
      if (!S.modal && !S.panelOpen && S.zone === 'rows') openOpts(cur());
      return;
    }
    if (k === 'OKup') {
      var was = S.okDown; S.okDown = false;
      if (!was || S.okLong) return;
      k = 'OK';
    }
    if (k === 'Home') return goHome();

    if (S.modal) return modalKey(k);
    if (S.panelOpen) return panelKey(k);

    if (k === 'Menu') return openPanel();
    if (k === 'Search') return openSearch();
    if (k === 'Back') {
      if (S.zone === 'top') { S.zone = 'rows'; renderTabs(); return setFocus(S.r, S.c, true); }
      if (S.view !== 'home') return setView('home');
      if (S.r || S.c) { S.r = 0; S.c = 0; return setFocus(0, 0); }
      return;
    }

    if (S.zone === 'top') {
      if (k === 'Left') S.tab = Math.max(0, S.tab - 1);
      else if (k === 'Right') S.tab = Math.min(TABS.length - 1, S.tab + 1);
      else if (k === 'Down') { S.zone = 'rows'; renderTabs(); return setFocus(S.r, S.c, true); }
      else if (k === 'OK') {
        var id = TABS[S.tab].id;
        if (id === 'home' || id === 'apps') { S.zone = 'rows'; S.r = 0; S.c = 0; return setView(id); }
        if (id === 'search') return openSearch();
        return openPanel();
      }
      return renderTabs();
    }

    // rows
    if (!S.rows.length) { if (k === 'Up') { S.zone = 'top'; renderTabs(); } return; }
    if (k === 'Left') setFocus(S.r, S.c - 1);
    else if (k === 'Right') setFocus(S.r, S.c + 1);
    else if (k === 'Down') { if (S.r < S.rows.length - 1) setFocus(S.r + 1, Math.min(S.c, S.rows[S.r + 1].items.length - 1)); }
    else if (k === 'Up') {
      if (S.r > 0) setFocus(S.r - 1, Math.min(S.c, S.rows[S.r - 1].items.length - 1));
      else { var it = itemEl(S.r, S.c); if (it) it.classList.remove('on'); S.zone = 'top'; S.tab = S.view === 'apps' ? 1 : 0; renderTabs(); place(); }
    } else if (k === 'OK') launch(cur());
  }

  // physical keyboard / desktop preview (in the app, d-pad keys are intercepted natively and never reach here)
  var held = false;
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    var k = e.key, m = null;
    if (k === 'ArrowUp') m = 'Up'; else if (k === 'ArrowDown') m = 'Down'; else if (k === 'ArrowLeft') m = 'Left'; else if (k === 'ArrowRight') m = 'Right';
    else if (k === 'Escape' || k === 'BrowserBack') m = 'Back';
    else if (k === 'Tab' || k === 'ContextMenu') m = 'Menu';
    else if (k === 'Home') m = 'Home';
    else if (k === '/' && S.modal !== 'search') m = 'Search';
    if (m) { e.preventDefault(); return key(m); }
    if (k === 'Enter' || (k === ' ' && S.modal !== 'search')) {
      e.preventDefault();
      if (!e.repeat) { held = true; return key('OKdown'); }
      if (held === true) { held = 'long'; key('OKlong'); }
      return;
    }
    if (S.saver) { stopSaver(); wake(); return; }
    if (S.booting) { wake(); return; }
    if (k === 'Backspace') { e.preventDefault(); if (S.modal === 'search') { S.q = S.q.slice(0, -1); S.ri = 0; renderSearch(); } return; }
    if (k.length === 1 && /\S| /.test(k)) {
      if (S.modal === 'search') { S.q += k; S.ri = 0; S.sz = 'osk'; renderSearch(); }
      else if (!S.modal && !S.panelOpen && /[A-Za-z0-9Ѐ-ӿ]/.test(k)) openSearch(k);
    }
  });
  document.addEventListener('keyup', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { if (held) { held = false; key('OKup'); } else if (e.key === 'Enter') { key('OKup'); } }
  });

  // pointer (air-mouse remotes)
  var cursorT = 0;
  function showCursor() { document.body.classList.remove('nocursor'); clearTimeout(cursorT); cursorT = setTimeout(function () { document.body.classList.add('nocursor'); }, 3000); }
  function pt(e) { return e.target && e.target.closest ? e.target : null; }
  document.addEventListener('mousemove', function (e) {
    if (e.clientX === S.mouse.x && e.clientY === S.mouse.y) return;
    S.mouse.x = e.clientX; S.mouse.y = e.clientY; showCursor(); wake();
    if (S.saver) return stopSaver();
    var t = pt(e); if (!t || S.booting) return;
    var item = t.closest('.item');
    if (item && !S.modal && !S.panelOpen) { S.zone = 'rows'; renderTabs(); setFocus(+item.getAttribute('data-r'), +item.getAttribute('data-c')); return; }
    var tab = t.closest('.tab');
    if (tab && !S.modal && !S.panelOpen) { var old = itemEl(S.r, S.c); if (old) old.classList.remove('on'); S.zone = 'top'; S.tab = +tab.getAttribute('data-t'); renderTabs(); return; }
    var tg = t.closest('[data-p]');
    if (tg && S.panelOpen) { S.pi = +tg.getAttribute('data-p'); renderPanel(); return; }
    var rs = t.closest('[data-ri]');
    if (rs && S.modal === 'search') { S.sz = 'res'; S.ri = +rs.getAttribute('data-ri'); renderSearch(); return; }
    var ok = t.closest('[data-kr]');
    if (ok && S.modal === 'search') { S.sz = 'osk'; S.kr = +ok.getAttribute('data-kr'); S.kc = +ok.getAttribute('data-kc'); renderSearch(); return; }
    var oi = t.closest('[data-oi]');
    if (oi && S.modal === 'opts') { S.oi = +oi.getAttribute('data-oi'); renderOpts(); }
  });
  document.addEventListener('mousedown', function (e) {
    wake(); if (S.saver) { stopSaver(); return; }
    var t = pt(e); if (!t || S.booting) return;
    if (e.button === 2) { var it = t.closest('.item'); if (it && !S.modal) { e.preventDefault(); openOpts(cur()); } return; }
    var item = t.closest('.item');
    if (item && !S.modal && !S.panelOpen) { setFocus(+item.getAttribute('data-r'), +item.getAttribute('data-c')); return key('OKdown'), key('OKup'); }
    if (t.closest('.tab')) { S.zone = 'top'; S.tab = +t.closest('.tab').getAttribute('data-t'); return key('OKdown'), key('OKup'); }
    if (S.modal === 'search') {
      if (t.closest('[data-ri]') || t.closest('[data-kr]')) { key('OKdown'); key('OKup'); return; }
      if (t.closest('.scrim')) closeModal();
      return;
    }
    if (S.modal === 'opts') { if (t.closest('[data-oi]')) { key('OKdown'); key('OKup'); } else if (!t.closest('.sheet')) closeModal(); return; }
    if (S.panelOpen) { if (t.closest('[data-p]')) { key('OKdown'); key('OKup'); } else if (!t.closest('#panel')) closePanel(); return; }
  });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('wheel', function (e) {
    if (S.modal || S.panelOpen || S.saver) return;
    key(e.deltaY > 0 ? 'Down' : 'Up');
  }, { passive: true });

  // ---------------------------------------------------------------- clock, status, screensaver, hint
  var dFmt = null;
  function clock() {
    var d = new Date(), t, dt;
    try { t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); dt = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }); }
    catch (e) { t = pad(d.getHours()) + ':' + pad(d.getMinutes()); dt = d.toDateString(); }
    $('sTime').textContent = t; $('sDate').textContent = d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
    $('pTime').textContent = t; $('pDate').textContent = dt;
    $('svTime').textContent = t; $('svDate').textContent = dt;
  }
  function pollNet() {
    try { S.net = N.getNetwork(); } catch (e) { S.net = 'none'; }
    var icn = S.net === 'ethernet' ? 'plug' : S.net === 'none' ? 'x' : 'wifi';
    var txt = S.net === 'ethernet' ? 'Ethernet' : S.net === 'wifi' ? 'Wi‑Fi' : S.net === 'none' ? 'Offline' : 'Online';
    $('netPill').innerHTML = ic(icn, 18, 2.2) + txt;
    if (S.panelOpen) renderPanel();
  }
  function startSaver() { S.saver = true; $('saver').classList.add('on'); }
  function stopSaver() { S.saver = false; $('saver').classList.remove('on'); }
  setInterval(function () {
    clock();
    if (!S.saver && !S.booting && Date.now() - S.last > 5 * 60 * 1000) startSaver();
  }, 15000);
  setInterval(pollNet, 30000);

  function fit() {
    var w = window.innerWidth, h = window.innerHeight, s = Math.min(w / 1920, h / 1080);
    $('stage').style.transform = 'translate(' + ((w - 1920 * s) / 2) + 'px,' + ((h - 1080 * s) / 2) + 'px) scale(' + s + ')';
  }
  window.addEventListener('resize', fit);

  function showHint() {
    var h = $('hint');
    h.innerHTML = '<span><kbd>← ↑ → ↓</kbd> navigate</span><span><kbd>OK</kbd> open</span><span><kbd>Hold OK</kbd> options</span><span><kbd>Back</kbd> top</span>';
    h.classList.remove('hide');
    setTimeout(function () { h.classList.add('hide'); }, 9000);
  }

  // ---------------------------------------------------------------- public API (called from Java)
  var refreshT = 0;
  window.Nava = {
    key: key,
    refresh: function () {
      clearTimeout(refreshT);
      refreshT = setTimeout(function () {
        var pkg = cur() && cur().pkg;
        loadApps();
        if (S.modal === 'search') renderSearch();
        render();
        if (pkg && S.byPkg[pkg]) keepFocus(pkg);
      }, 500);
    },
    resume: function () {
      if (S.booting) return;
      wake(); if (S.saver) stopSaver();
      loadApps(); pollNet(); clock();
      goHome();
    },
    home: function () { wake(); if (S.saver) stopSaver(); goHome(); }
  };

  // ---------------------------------------------------------------- boot
  function init() {
    if (!N) { document.title = 'Nava TV'; }
    document.body.classList.toggle('blur', S.blur);
    fit(); clock();
    loadApps(); pollNet();
    S.tab = 0;
    render();
    setTimeout(function () {
      $('boot').classList.add('gone'); S.booting = false; wake();
      $('rows').classList.add('enter'); showHint();
    }, 1100);
  }
  init();
})();
