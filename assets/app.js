(function () {
  'use strict';

  // ---------- Language, files and helpers ----------
  var root = document.documentElement;
  // index.html is French, en/index.html is English (data-root="../" points back to the site root)
  var LANG = /^en\b/i.test(root.lang) ? 'en' : 'fr';
  var ROOT = root.getAttribute('data-root') || '';
  // Content file in the page's language: shared/x.html → shared/x.en.html in English
  function localized(path) { return ROOT + (LANG === 'en' ? path.replace(/\.html$/, '.en.html') : path); }
  // tarifs.json text fields are {"fr": …, "en": …}
  function L(v) { return v && typeof v === 'object' ? (v[LANG] || v.fr || '') : v; }

  var LABELS = localized('shared/libelles.html');
  // Pages (#/<id>[/anchor]): file and French fallback name; ORDER is the site order (the menu reads it)
  var PAGES = {
    'accueil': { url: localized('shared/accueil.html'), name: 'Accueil' },
    'services': { url: localized('shared/services.html'), name: 'Services' },
    'tarifs': { url: localized('shared/tarifs.html'), name: 'Tarifs' },
    'contact': { url: localized('shared/contact.html'), name: 'Contact' }
  };
  Object.setPrototypeOf(PAGES, null);  // so a route like #/constructor is not taken for a page
  var ORDER = ['accueil', 'services', 'tarifs', 'contact'];
  // Per-page work on the fetched fragment before it is shown (Task 4 adds tarifs)
  var FILL = Object.create(null);

  function store(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function plain(html) {
    var t = document.createElement('template');
    t.innerHTML = html;
    return t.content.textContent.trim();
  }

  // ---------- URL words (shared/slugs.json) ----------
  // Code and files use the French word; "en" gives its English word, "aliases" old ids that still lead to their page
  var SLUGS = { en: {}, aliases: {} }, SLUGS_BACK = {};
  function useSlugs(data) {
    SLUGS = data;
    Object.keys(data.en).forEach(function (w) { SLUGS_BACK[data.en[w]] = w; });
  }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function slugIn(word, lang) { return lang === 'en' && has(SLUGS.en, word) ? SLUGS.en[word] : word; }
  function slugFromAny(word) {
    if (has(SLUGS_BACK, word)) return SLUGS_BACK[word];
    return has(SLUGS.aliases, word) ? SLUGS.aliases[word] : word;
  }
  function pathIn(hash, lang) { return hash.replace(/[^/#]+/g, function (w) { return slugIn(slugFromAny(w), lang); }); }
  function link(hash) { return pathIn(hash, LANG); }

  // ---------- Fetching ----------
  function once(cache, key, make) {
    if (!cache[key]) cache[key] = make().catch(function (err) { delete cache[key]; throw err; });
    return cache[key];
  }
  var texts$ = {};
  function fetchText(url) {
    return once(texts$, url, function () {
      return fetch(url, { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error(url + ' (' + r.status + ')');
        return r.text();
      });
    });
  }
  // Content files use paths from the site root; from /en/ they need ROOT in front
  function rebase(frag) {
    if (!ROOT) return;
    frag.querySelectorAll('[src], [href]').forEach(function (el) {
      ['src', 'href'].forEach(function (attr) {
        var v = el.getAttribute(attr);
        if (v && !/^(#|\/|\?|[a-z][a-z0-9+.-]*:)/i.test(v)) el.setAttribute(attr, ROOT + v);
      });
    });
  }
  function fetchFragment(url) {
    return fetchText(url).then(function (html) {
      var t = document.createElement('template');
      t.innerHTML = html;
      rebase(t.content);
      return t.content;
    });
  }
  var slugs$ = once({}, 's', function () {
    return fetchText(ROOT + 'shared/slugs.json').then(JSON.parse).then(useSlugs).catch(function () {});  // without it, URLs keep their French words
  });

  // ---------- Editable texts ----------
  var texts = {};
  var labels$ = fetchFragment(LABELS).then(function (frag) {
    frag.querySelectorAll('[data-text]').forEach(function (el) { texts[el.dataset.text] = el.innerHTML.trim(); });
  }).catch(function () {});  // missing file: built-in fallbacks
  function T(key, fallback) { return has(texts, key) ? texts[key] : fallback; }
  function pageName(id) { return plain(T('menu-' + id, PAGES[id].name)); }

  // ---------- Phone ----------
  function phoneLinks(node) {
    var number = plain(T('tel', '418-391-1620')), target = plain(T('tel-lien', '+14183911620'));
    node.querySelectorAll('[data-tel]').forEach(function (a) { a.href = 'tel:' + target; });
    node.querySelectorAll('[data-sms]').forEach(function (a) { a.href = 'sms:' + target; });
    node.querySelectorAll('[data-phone]').forEach(function (el) { el.textContent = number; });
  }

  // ---------- Preferences ----------
  function choiceButtons(attr, key, values, fallback, apply) {
    var buttons = document.querySelectorAll('[data-' + attr + ']');
    function set(choice) {
      if (values.indexOf(choice) < 0) choice = fallback;  // an unknown saved value is the default
      apply(choice);
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-' + attr) === choice)); });
    }
    set(load(key));
    buttons.forEach(function (b) {
      b.addEventListener('click', function () { store(key, b.getAttribute('data-' + attr)); set(b.getAttribute('data-' + attr)); });
    });
  }
  function applyTheme(choice) {
    if (choice === 'light' || choice === 'dark') root.setAttribute('data-theme', choice);
    else root.removeAttribute('data-theme');
  }
  function applySize(choice) {
    if (choice === 'normale') root.removeAttribute('data-taille');
    else root.setAttribute('data-taille', choice);
  }
  choiceButtons('theme-choice', 'services-theme', ['light', 'auto', 'dark'], 'auto', applyTheme);
  choiceButtons('taille-choice', 'services-taille', ['normale', 'grande', 'tres-grande'], 'normale', applySize);

  // ---------- Language link: the same page in the other language ----------
  var langLink = document.getElementById('lang-link');
  function updateLangLink() {
    if (langLink) langLink.href = (LANG === 'fr' ? 'en/' : '../') + pathIn(location.hash, LANG === 'fr' ? 'en' : 'fr');
  }
  if (langLink) langLink.addEventListener('click', function () { updateLangLink(); store('services-lang', LANG === 'fr' ? 'en' : 'fr'); });

  // ---------- Menu and frame ----------
  var view = document.getElementById('view');
  var menu = document.getElementById('menu');
  function buildMenu() {
    menu.innerHTML = ORDER.map(function (id) {
      var hash = id === 'accueil' ? '#/' : '#/' + id;
      return '<li><a href="' + escapeHtml(link(hash)) + '" data-page="' + id + '">' + escapeHtml(pageName(id)) + '</a></li>';
    }).join('');
  }
  // What every page sets: active menu entry, tab title, focus for screen readers
  function frame(id) {
    menu.querySelectorAll('a').forEach(function (a) {
      if (a.dataset.page === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var site = plain(T('site-nom', 'Jonathan Lafleur · Technicien PC et Mac'));
    document.title = id === 'accueil' ? site : pageName(id) + ' · ' + site;
    updateLangLink();
  }
  function localizeLinks(node) {
    node.querySelectorAll('a[href^="#/"]').forEach(function (a) { a.setAttribute('href', link(a.getAttribute('href'))); });
  }

  // ---------- Prices (shared/tarifs.json) ----------
  var TARIFS = ROOT + 'shared/tarifs.json';
  // 35 → « 35 $ » / “$35”; 17.5 → « 17,50 $ » / “$17.50”
  function formatPrice(amount) {
    var n = Math.round(amount * 100) / 100;
    var s = n % 1 === 0 ? String(n) : n.toFixed(2);
    return LANG === 'en' ? '$' + s : s.replace('.', ',') + '&nbsp;$';
  }
  function hourlyRate(data) {
    var found = null;
    data.groupes.forEach(function (g) { g.lignes.forEach(function (l) { if (l.id === 'taux-horaire') found = l; }); });
    return found;
  }
  function priceHtml(line, rate) {
    if (line.evaluation) return T('sur-evaluation', 'Sur évaluation');
    if (line.taux === 'horaire') return T('taux-horaire', 'Au taux horaire') + (rate ? ' (' + priceHtml(rate) + ')' : '');
    return formatPrice(line.prix) + (line.unite === 'heure' ? ' ' + T('unite-heure', 'de l’heure') : '');
  }
  function lineHtml(line, rate) {
    return '<tr><th scope="row">' + L(line.nom) + (line.note ? '<br><small class="note">' + L(line.note) + '</small>' : '') +
      '</th><td>' + priceHtml(line, rate) + '</td></tr>';
  }
  function tarifsHtml(data) {
    var rate = hourlyRate(data);
    return data.groupes.map(function (g) {
      return '<table class="tarifs" id="' + escapeHtml(g.id) + '"><caption>' + L(g.titre) + '</caption>' +
        '<thead><tr><th scope="col">' + T('col-service', 'Service') + '</th><th scope="col">' + T('col-prix', 'Prix') + '</th></tr></thead>' +
        '<tbody>' + g.lignes.map(function (l) { return lineHtml(l, rate); }).join('') + '</tbody></table>';
    }).join('');
  }
  // The page keeps its text if the prices cannot load: the slot says so instead
  FILL.tarifs = function (frag) {
    var slot = frag.querySelector('[data-tarifs]');
    if (!slot) return null;
    return fetchText(TARIFS).then(JSON.parse).then(function (data) { slot.innerHTML = tarifsHtml(data); }).catch(function () {
      slot.innerHTML = '<p class="error">' + T('erreur-tarifs', 'Les tarifs n’ont pas pu être chargés. Appelez-nous pour les connaître.') + '</p>';
    });
  };
  window.servicesTest = { formatPrice: formatPrice };

  // ---------- Routes ----------
  function parseRoute() {
    var parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(slugFromAny);
    return { page: parts[0] || 'accueil', anchor: parts[1] || null };
  }
  // The only route table: which page a route shows (an unknown one shows the home page)
  function resolveRoute(r) { return PAGES[r.page] ? r.page : 'accueil'; }

  function show(id, frag, anchor) {
    localizeLinks(frag);
    phoneLinks(frag);
    view.innerHTML = '';
    view.appendChild(frag);
    frame(id);
    var target = anchor && document.getElementById(anchor);
    if (target) target.scrollIntoView(); else { window.scrollTo(0, 0); view.focus({ preventScroll: true }); }
  }
  function showLoadError(err) {
    view.innerHTML = '<p class="error">' + T('erreur-chargement', 'Impossible de charger le contenu. Rechargez la page.') +
      ' <small>(' + escapeHtml(err.message) + ')</small></p>';
  }
  var routeToken = 0;
  function route() {
    var token = ++routeToken;
    Promise.all([labels$, slugs$]).then(function () {
      var own = pathIn(location.hash, LANG);  // the address in the reader's language
      if (location.hash && own !== location.hash) { location.replace(own); return null; }
      var r = parseRoute(), id = resolveRoute(r);
      if (location.hash && location.hash !== '#/' && !PAGES[r.page]) { location.replace('#/'); return null; }
      return fetchFragment(PAGES[id].url).then(function (frag) {
        return Promise.resolve(FILL[id] ? FILL[id](frag) : null).then(function () { return { id: id, frag: frag, anchor: r.anchor }; });
      });
    }).then(function (x) {
      if (!x || token !== routeToken) return;  // the address was rewritten, or the reader already went elsewhere
      show(x.id, x.frag, x.anchor);
    }).catch(function (err) {
      if (token === routeToken) showLoadError(err);
    });
  }

  Promise.all([labels$, slugs$]).then(function () { buildMenu(); phoneLinks(document); route(); });
  window.addEventListener('hashchange', route);
})();
