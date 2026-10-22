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
    'contact': { url: localized('shared/contact.html'), name: 'Prendre rendez-vous' }
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
    frag.querySelectorAll('[data-text]').forEach(function (el) {
      var value = el.innerHTML.trim();
      if (el.dataset.encoding === 'base64') {
        try { value = atob(el.textContent.trim()); } catch (e) { value = ''; }
      }
      texts[el.dataset.text] = value;
    });
  }).catch(function () {});  // missing file: built-in fallbacks
  function T(key, fallback) { return has(texts, key) ? texts[key] : fallback; }
  function pageName(id) { return plain(T('menu-' + id, PAGES[id].name)); }

  // ---------- Phone and email ----------
  function phoneLinks(node) {
    var number = plain(T('tel', '')), target = plain(T('tel-lien', ''));
    var email = plain(T('courriel', ''));
    function links(selector, scheme, value) {
      node.querySelectorAll(selector).forEach(function (a) {
        if (value) {
          a.href = scheme + value;
          a.removeAttribute('aria-disabled');
        } else {
          a.removeAttribute('href');
          a.setAttribute('aria-disabled', 'true');
        }
      });
    }
    links('[data-tel]', 'tel:', target);
    links('[data-sms]', 'sms:', target);
    links('[data-mail]', 'mailto:', email);
    node.querySelectorAll('[data-phone]').forEach(function (el) { el.textContent = number; });
    node.querySelectorAll('[data-email]').forEach(function (el) { el.textContent = email; });
  }

  // Shared pointer tracking covers contact and discovery buttons fetched by the router.
  var glowSelector = '.btn[data-tel], .btn[data-sms], .btn-discover';
  function moveButtonGlow(event) {
    if (event.pointerType === 'touch' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var button = event.target.closest(glowSelector);
    if (!button) return;
    var rect = button.getBoundingClientRect();
    button.style.setProperty('--cursor-x', (event.clientX - rect.left) + 'px');
    button.style.setProperty('--cursor-y', (event.clientY - rect.top) + 'px');
  }
  document.addEventListener('pointerover', moveButtonGlow);
  document.addEventListener('pointermove', moveButtonGlow);
  document.addEventListener('pointerout', function (event) {
    var button = event.target.closest(glowSelector);
    if (!button || (event.relatedTarget && button.contains(event.relatedTarget))) return;
    button.style.removeProperty('--cursor-x');
    button.style.removeProperty('--cursor-y');
  });
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

  // Leave the edge tab reachable; pause closing while the panel is in use.
  var preferences = document.querySelector('.preferences');
  var preferencesToggle = document.querySelector('.preferences-toggle');
  var displayControls = document.getElementById('display-controls');
  var preferencesTimer;
  var manuallyOpened = false;
  var preferencesHovered = false;
  function cancelPreferencesClose() {
    clearTimeout(preferencesTimer);
    preferences.classList.remove('is-intro');
  }
  function setPreferences(open) {
    if (!open) clearTimeout(preferencesTimer);
    preferences.classList.toggle('is-collapsed', !open);
    preferencesToggle.setAttribute('aria-expanded', String(open));
    displayControls.inert = !open;
    displayControls.setAttribute('aria-hidden', String(!open));
  }
  function schedulePreferencesClose() {
    clearTimeout(preferencesTimer);
    if (preferencesToggle.getAttribute('aria-expanded') !== 'true') return;
    preferencesTimer = setTimeout(function () {
      // Keyboard users can finish choosing without the panel disappearing.
      if (preferences.querySelector(':focus-visible')) return;
      preferences.classList.toggle('is-intro', !manuallyOpened);
      setPreferences(false);
    }, manuallyOpened ? 2000 : 1000);
  }
  setPreferences(true);
  schedulePreferencesClose();
  preferences.addEventListener('pointerenter', function () {
    preferencesHovered = true;
    cancelPreferencesClose();
  });
  preferences.addEventListener('pointerleave', function () {
    preferencesHovered = false;
    schedulePreferencesClose();
  });
  preferences.addEventListener('pointerdown', cancelPreferencesClose);
  preferences.addEventListener('focusin', cancelPreferencesClose);
  preferences.addEventListener('focusout', function (event) {
    if (!preferencesHovered && !preferences.contains(event.relatedTarget)) schedulePreferencesClose();
  });
  preferencesToggle.addEventListener('click', function () {
    cancelPreferencesClose();
    var open = preferencesToggle.getAttribute('aria-expanded') !== 'true';
    manuallyOpened = open;
    setPreferences(open);
  });
  preferences.addEventListener('keydown', function (event) {
    cancelPreferencesClose();
    if (event.key === 'Escape') {
      preferencesToggle.focus();
      setPreferences(false);
    }
  });
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
    var languageItem = menu.querySelector('.language-item');
    menu.innerHTML = ORDER.map(function (id) {
      var hash = id === 'accueil' ? '#/' : '#/' + id;
      return '<li><a href="' + escapeHtml(link(hash)) + '" data-page="' + id + '">' + escapeHtml(pageName(id)) + '</a></li>';
    }).join('');
    if (languageItem) menu.appendChild(languageItem);
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
  function priceHtml(line) {
    if (line.evaluation) return T('sur-evaluation', 'Sur évaluation');
    if (line.taux === 'horaire') return T('taux-horaire', 'Au taux horaire');
    return '<span class="montant">' + formatPrice(line.prix) + '</span>' + (line.unite === 'heure' ? ' ' + T('unite-heure', 'de l’heure') : '');
  }
  function lineHtml(line) {
    return '<tr role="row"><th scope="row" role="rowheader">' + L(line.nom) + (line.note ? '<br><small class="note">' + L(line.note) + '</small>' : '') +
      '</th><td role="cell">' + priceHtml(line) + '</td></tr>';
  }
  // Explicit roles: Safari stops announcing a table once the phone layout shows its rows as blocks
  function tarifsHtml(data) {
    return data.groupes.map(function (g) {
      // The group title is a heading above the table, not a <caption>: on phones the table is shown as blocks and a caption lands inside its box
      return '<h2 class="tarifs-titre" id="titre-' + escapeHtml(g.id) + '">' + L(g.titre) + '</h2>' +
        (g.description ? '<p>' + L(g.description) + '</p>' : '') +
        (g.note ? '<p class="note"><strong>' + L(g.note) + '</strong></p>' : '') +
        '<table class="tarifs" id="' + escapeHtml(g.id) + '" role="table" aria-labelledby="titre-' + escapeHtml(g.id) + '">' +
        '<thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">' + T('col-service', 'Service') +
        '</th><th scope="col" role="columnheader">' + T('col-prix', 'Prix') + '</th></tr></thead>' +
        '<tbody role="rowgroup">' + g.lignes.map(lineHtml).join('') + '</tbody></table>';
    }).join('');
  }
  // The page keeps its text if the prices cannot load: the slot says so instead
  FILL.tarifs = function (frag) {
    var slots = frag.querySelectorAll('[data-tarifs]');
    if (!slots.length) return null;
    return fetchText(TARIFS).then(JSON.parse).then(function (data) {
      slots.forEach(function (slot) {
        var base = slot.getAttribute('data-tarifs') === 'base';
        var groups = data.groupes.filter(function (g) {
          return base ? g.id === 'main-oeuvre' : g.id !== 'main-oeuvre';
        });
        if (base) {
          slot.innerHTML = '<ul class="cards services-cards price-cards">' + groups[0].lignes.map(function (line) {
            return '<li class="card"><h2>' + L(line.nom) + '</h2><p class="price-amount">' +
              priceHtml(line) + '</p>' + (line.note ? '<p>' + L(line.note) + '</p>' : '') + '</li>';
          }).join('') + '</ul>';
        } else slot.innerHTML = tarifsHtml({ groupes: groups });
      });
      var labour = data.groupes.find(function (g) { return g.id === 'main-oeuvre'; });
      var hourly = labour.lignes.find(function (line) { return line.id === 'taux-horaire'; }).prix;
      var small = labour.lignes.find(function (line) { return line.id === 'petit-travail'; }).prix;
      var examples = { small: small, hour: hourly, ninety: hourly * 1.5 };
      frag.querySelectorAll('[data-price-example]').forEach(function (el) {
        el.innerHTML = formatPrice(examples[el.getAttribute('data-price-example')]);
      });
    }).catch(function () {
      slots.forEach(function (slot) {
        slot.innerHTML = '<p class="error">' + T('erreur-tarifs', 'Les tarifs n’ont pas pu être chargés. Appelez-nous pour les connaître.') + '</p>';
      });
    });
  };
  // The public Formspree endpoint lives in shared/formulaire.json; no mail credentials in the browser.
  function bookingForm(form, endpoint) {
    var button = form.querySelector('[type="submit"]');
    var status = form.querySelector('[data-form-status]');
    var validEndpoint = /^https:\/\/formspree\.io\/f\/[a-z0-9]+$/i.test(endpoint || '');
    var sending = false;
    var submitted = false;
    var fields = Array.prototype.slice.call(form.querySelectorAll('input[name]:not([name="_gotcha"]), select[name], textarea[name]'));
    function fieldMessage(field) {
      if (field.validity.valueMissing) return form.dataset.requiredError;
      if (field.validity.typeMismatch) return form.dataset.emailError;
      if (field.maxLength > -1 && field.value.length > field.maxLength) return form.dataset.lengthError;
      return field.validity.valid ? '' : form.dataset.fieldError;
    }
    function markField(field, message) {
      var error = form.querySelector('[data-field-error="' + field.name + '"]');
      if (message) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
      error.textContent = message;
      error.hidden = !message;
    }
    function focusInvalidField() {
      var first = form.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
    }
    fields.forEach(function (field) {
      function edited() {
        if (field.getAttribute('aria-invalid') === 'true') markField(field, fieldMessage(field));
        if (!form.querySelector('[aria-invalid="true"]') && status.textContent === form.dataset.validationError) {
          status.textContent = '';
          status.classList.remove('error');
        }
      }
      field.addEventListener('input', edited);
      field.addEventListener('change', edited);
    });
    if (validEndpoint) {
      form.action = endpoint;
      button.disabled = false;
    } else status.textContent = form.dataset.unavailable;
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!validEndpoint || sending || submitted) return;
      fields.forEach(function (field) { markField(field, fieldMessage(field)); });
      if (form.querySelector('[aria-invalid="true"]')) {
        status.textContent = form.dataset.validationError;
        status.classList.add('error');
        focusInvalidField();
        return;
      }
      sending = true;
      button.disabled = true;
      form.setAttribute('aria-busy', 'true');
      status.textContent = form.dataset.sending;
      status.classList.remove('error');
      var controller = new AbortController();
      var timeout = setTimeout(function () { controller.abort(); }, 30000);
      fetch(endpoint, {
        method: 'POST', body: new FormData(form),
        headers: { Accept: 'application/json' }, signal: controller.signal
      }).then(function (response) {
        if (!response.ok) {
          return response.json().catch(function () { return {}; }).then(function (data) {
            (Array.isArray(data.errors) ? data.errors : []).forEach(function (error) {
              var field = form.elements.namedItem(error.field);
              if (fields.indexOf(field) < 0) return;
              var code = String(error.code || '');
              var message = /REQUIRED/i.test(code) ? form.dataset.requiredError :
                /EMAIL/i.test(code) ? form.dataset.emailError : form.dataset.fieldError;
              markField(field, message);
            });
            throw new Error('Submission not confirmed');
          });
        }
        submitted = true;
        fields.forEach(function (field) { field.disabled = true; });
        status.textContent = form.dataset.success;
        status.tabIndex = -1;
        status.focus({ preventScroll: true });
      }).catch(function () {
        status.textContent = form.querySelector('[aria-invalid="true"]') ? form.dataset.validationError : form.dataset.error;
        status.classList.add('error');
        focusInvalidField();
      }).finally(function () {
        clearTimeout(timeout);
        sending = false;
        button.disabled = submitted;
        form.removeAttribute('aria-busy');
      });
    });
  }
  FILL.contact = function (frag) {
    var form = frag.querySelector('[data-booking-form]');
    if (!form) return null;
    return fetchText(ROOT + 'shared/formulaire.json').then(JSON.parse).catch(function () {
      return {};
    }).then(function (config) { bookingForm(form, config && config.endpoint); });
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
    if (target) {
      target.tabIndex = -1;
      target.scrollIntoView();
      target.focus({ preventScroll: true });
    } else { window.scrollTo(0, 0); view.focus({ preventScroll: true }); }
  }
  function showLoadError(err) {
    console.error(err);  // the technical detail is for the console, not the reader
    view.innerHTML = '<p class="error">' + T('erreur-chargement', 'Impossible de charger le contenu. Rechargez la page.') + '</p>';
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
