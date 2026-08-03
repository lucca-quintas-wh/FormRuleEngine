/**
 * Utilitários dos exemplos — NÃO fazem parte da engine.
 *
 * Fornecem três coisas:
 *   1. Demo.hydrate()  — cada bloco <template data-src> é clonado para virar o
 *                        exemplo vivo E impresso como código-fonte logo abaixo.
 *                        Assim o que você lê é literalmente o que está rodando.
 *   2. Demo.log()      — painel de eventos, para ver a engine reagindo.
 *   3. Demo.state()    — painel com o valor atual de cada campo do formulário.
 *
 * Este arquivo é carregado ANTES do bootstrap da engine, porque a hidratação
 * precisa acontecer enquanto o documento ainda está sendo montado (o bootstrap
 * varre o DOM no DOMContentLoaded).
 */
window.Demo = (function () {
  'use strict';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** Remove a indentação comum, para o código impresso não sair todo deslocado. */
  function dedent(text) {
    var lines = text.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
    var indent = lines.reduce(function (min, line) {
      if (!line.trim()) return min;
      var m = line.match(/^\s*/)[0].length;
      return m < min ? m : min;
    }, Infinity);
    if (!isFinite(indent)) indent = 0;
    return lines.map(function (l) { return l.slice(indent); }).join('\n');
  }

  /**
   * Clona cada <template data-src> para dentro do documento e imprime o fonte.
   * O atributo data-src pode conter um rótulo ("HTML do exemplo" é o padrão).
   */
  function hydrate(root) {
    var scope = root || document;
    Array.prototype.forEach.call(scope.querySelectorAll('template[data-src]'), function (tpl) {
      var raw = dedent(tpl.innerHTML);

      var live = document.createElement('div');
      live.className = 'demo-live';
      live.appendChild(tpl.content.cloneNode(true));
      tpl.parentNode.insertBefore(live, tpl.nextSibling);

      var details = document.createElement('details');
      details.className = 'demo-code';
      if (tpl.hasAttribute('data-open')) details.open = true;
      details.innerHTML =
        '<summary>' + escapeHtml(tpl.getAttribute('data-src') || 'HTML do exemplo') + '</summary>' +
        '<pre><code></code></pre>';
      details.querySelector('code').textContent = raw;
      live.parentNode.insertBefore(details, live.nextSibling);
    });
  }

  /* ── painel de log ────────────────────────────────────────────────────── */

  var logBody = null;

  function ensureLog() {
    if (logBody) return logBody;
    var host = document.querySelector('[data-demo-log]');
    if (!host) return null;
    host.innerHTML = '<h4>Eventos</h4><div class="body"></div>';
    host.className = 'panel';
    logBody = host.querySelector('.body');
    return logBody;
  }

  function log(message) {
    var body = ensureLog();
    if (!body) return;
    var now = new Date();
    var stamp = String(now.getMinutes()).padStart(2, '0') + ':' +
                String(now.getSeconds()).padStart(2, '0');
    var line = document.createElement('div');
    line.innerHTML = '<span class="t">' + stamp + '</span> ' + escapeHtml(message);
    body.insertBefore(line, body.firstChild);
    while (body.children.length > 60) body.removeChild(body.lastChild);
  }

  /* ── toast ────────────────────────────────────────────────────────────── */

  /**
   * A engine mostra mensagens por `showMessage(tipo, texto)`, que procura, nesta
   * ordem, as globais `communicate`, `alerta` e `message` — e cai em
   * `console.error` se nenhuma existir. Ou seja: a integração com o seu sistema de
   * notificação é definir UMA dessas funções. Aqui definimos `communicate` para
   * que as mensagens dos exemplos fiquem visíveis.
   */
  function toast(text, type) {
    var host = document.getElementById('demo-toasts');
    if (!host) {
      host = document.createElement('div');
      host.id = 'demo-toasts';
      host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99;' +
        'display:flex;flex-direction:column;gap:8px;max-width:320px';
      document.body.appendChild(host);
    }
    var box = document.createElement('div');
    var cor = type === 'error' ? '#c92a2a' : type === 'warning' ? '#b45309' : '#2f6fed';
    box.style.cssText = 'background:' + cor + ';color:#fff;padding:9px 13px;' +
      'border-radius:7px;font-size:13.5px;box-shadow:0 4px 14px rgba(0,0,0,.18)';
    box.textContent = text;
    host.appendChild(box);
    setTimeout(function () { box.remove(); }, 4200);
    log('mensagem (' + (type || 'info') + '): ' + text);
  }

  /** Instala o toast como a global que a engine procura. */
  function installMessaging() {
    window.communicate = function (text, type) { toast(text, type); };
  }

  /* ── painel de estado ─────────────────────────────────────────────────── */

  /**
   * Espelha o valor de cada campo nomeado do formulário. Útil para enxergar o
   * que a DSL está lendo: a condição compara STRING crua do campo, e ver o valor
   * ao lado explica metade dos "por que a regra não disparou".
   */
  function state(formSelector, fields) {
    var host = document.querySelector('[data-demo-state]');
    var form = document.querySelector(formSelector);
    if (!host || !form) return;

    host.className = 'panel';
    host.innerHTML = '<h4>Estado dos campos</h4><div class="body"></div>';
    var body = host.querySelector('.body');

    function render() {
      var names = fields || Array.prototype.map
        .call(form.querySelectorAll('[name]'), function (el) { return el.name; })
        .filter(function (n, i, arr) { return n && arr.indexOf(n) === i; });

      body.innerHTML = names.map(function (name) {
        var el = form.querySelector('[name="' + name + '"]');
        var value;
        if (!el) value = '—';
        else if (el.type === 'checkbox') value = el.checked ? (el.value || 'S') : 'N';
        else if (el.type === 'radio') {
          var checked = form.querySelector('[name="' + name + '"]:checked');
          value = checked ? checked.value : '';
        } else value = el.value;
        var empty = value === '' || value === null || value === undefined;
        return '<div class="state-row"><span class="k">' + escapeHtml(name) + '</span>' +
               '<span class="v' + (empty ? ' empty' : '') + '">' +
               escapeHtml(empty ? '(vazio)' : value) + '</span></div>';
      }).join('');
    }

    form.addEventListener('input', render);
    form.addEventListener('change', render);
    document.addEventListener('DOMContentLoaded', render);
    setInterval(render, 700); // pega mudanças feitas por AJAX/plugins sem evento
    render();
  }

  /** Loga os eventos que a própria engine emite. */
  function watchEngineEvents(formSelector) {
    document.addEventListener('DOMContentLoaded', function () {
      var form = document.querySelector(formSelector);
      if (!form) return;
      form.addEventListener('visibility:changed', function (e) {
        var el = e.target;
        var label = el.getAttribute('data-demo-name') ||
                    (el.getAttribute('data-visible-when') || '').slice(0, 42);
        log((e.detail.visible ? 'visível  ' : 'oculto   ') + label);
      });
      form.addEventListener('step:change', function (e) {
        log('step:change → etapa ' + e.detail.step);
      });
      form.addEventListener('form-rule-engine:ready', function () {
        log('engine pronta');
      });
    });
  }

  hydrate(document);

  return {
    hydrate: hydrate,
    log: log,
    toast: toast,
    installMessaging: installMessaging,
    state: state,
    watchEngineEvents: watchEngineEvents,
    escapeHtml: escapeHtml
  };
})();
