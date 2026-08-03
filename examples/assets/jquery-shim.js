/**
 * ATENÇÃO — este arquivo NÃO faz parte da engine e NÃO é jQuery.
 *
 * É um substituto mínimo, só para estes exemplos rodarem offline, cobrindo
 * exatamente a superfície de jQuery que os 12 plugins acoplados usam:
 *
 *   $(el).on/off com namespace   ·   $(el).trigger   ·   $(el).find/prop/val
 *   $(el).data('select2')        ·   $.ajax (done/fail/always/abort)
 *   $.fn.mask / $.fn.unmask      ·   $(form).serialize()
 *
 * No seu projeto, carregue o jQuery de verdade. Se a página já tem jQuery,
 * NÃO carregue este arquivo — ele sobrescreveria window.$.
 *
 * A parte que realmente importa entender: `.trigger('change')` executa apenas
 * os handlers registrados por aqui e NÃO dispara `addEventListener`. É a mesma
 * assimetria do jQuery real, e é a razão de o núcleo da engine manter uma ponte
 * separada para o barramento do jQuery (ver form-rule-engine.js, bindEvents).
 */
(function () {
  'use strict';

  if (window.jQuery) return; // jQuery real presente: não faz nada.

  var handlers = new WeakMap(); // element -> [{type, ns, fn, nativeBound}]
  var nativeBound = new WeakMap(); // element -> Set(type)

  function listOf(el) {
    var l = handlers.get(el);
    if (!l) { l = []; handlers.set(el, l); }
    return l;
  }

  function parseSpec(spec) {
    var dot = spec.indexOf('.');
    if (dot === -1) return { type: spec, ns: '' };
    return { type: spec.slice(0, dot), ns: spec.slice(dot + 1) };
  }

  function wrapEvent(type, target, currentTarget, native) {
    return {
      type: type,
      target: target,
      currentTarget: currentTarget,
      originalEvent: native || undefined,   // ← ausente = disparo programático
      isTrusted: native ? native.isTrusted : false,
      preventDefault: function () { if (native) native.preventDefault(); },
      stopPropagation: function () { if (native) native.stopPropagation(); }
    };
  }

  function fire(el, type, ns, target, native) {
    listOf(el).slice().forEach(function (h) {
      if (h.type !== type) return;
      if (ns && h.ns !== ns) return;
      h.fn.call(el, wrapEvent(type, target, el, native));
    });
  }

  function bindNative(el, type) {
    var set = nativeBound.get(el);
    if (!set) { set = new Set(); nativeBound.set(el, set); }
    if (set.has(type)) return;
    set.add(type);
    el.addEventListener(type, function (native) {
      // O evento nativo já borbulhou até `el`; só repassamos aos handlers daqui.
      fire(el, type, '', native.target, native);
    });
  }

  function Collection(nodes) {
    this.nodes = nodes;
    this.length = nodes.length;
    for (var i = 0; i < nodes.length; i++) this[i] = nodes[i];
  }

  Collection.prototype.each = function (fn) {
    this.nodes.forEach(function (n, i) { fn.call(n, i, n); });
    return this;
  };

  Collection.prototype.on = function (spec, fn) {
    var specs = String(spec).split(/\s+/).filter(Boolean);
    this.nodes.forEach(function (el) {
      specs.forEach(function (s) {
        var p = parseSpec(s);
        listOf(el).push({ type: p.type, ns: p.ns, fn: fn });
        bindNative(el, p.type);
      });
    });
    return this;
  };

  Collection.prototype.off = function (spec) {
    var specs = String(spec || '').split(/\s+/).filter(Boolean);
    this.nodes.forEach(function (el) {
      if (!specs.length) { handlers.set(el, []); return; }
      specs.forEach(function (s) {
        var p = parseSpec(s);
        handlers.set(el, listOf(el).filter(function (h) {
          var typeMatch = !p.type || h.type === p.type;
          var nsMatch = !p.ns || h.ns === p.ns;
          return !(typeMatch && nsMatch);
        }));
      });
    });
    return this;
  };

  /**
   * Dispara handlers registrados por este shim, subindo pelos ancestrais
   * (delegação). Não emite evento nativo — é o comportamento do jQuery para
   * `change`, e é justamente o que os comentários dos plugins descrevem.
   */
  Collection.prototype.trigger = function (spec) {
    var p = parseSpec(String(spec));
    this.nodes.forEach(function (target) {
      var el = target;
      while (el) {
        fire(el, p.type, p.ns, target, null);
        el = el.parentElement;
      }
    });
    return this;
  };

  Collection.prototype.find = function (sel) {
    var out = [];
    this.nodes.forEach(function (el) {
      Array.prototype.push.apply(out, el.querySelectorAll(sel));
    });
    return new Collection(out);
  };

  Collection.prototype.prop = function (name, value) {
    if (value === undefined) return this.nodes[0] ? this.nodes[0][name] : undefined;
    this.nodes.forEach(function (el) { el[name] = value; });
    return this;
  };

  Collection.prototype.attr = function (name, value) {
    if (value === undefined) return this.nodes[0] ? this.nodes[0].getAttribute(name) : null;
    this.nodes.forEach(function (el) { el.setAttribute(name, value); });
    return this;
  };

  Collection.prototype.val = function (value) {
    if (value === undefined) return this.nodes[0] ? this.nodes[0].value : undefined;
    this.nodes.forEach(function (el) { el.value = value === null ? '' : value; });
    return this;
  };

  // Sem Select2 nos exemplos: sempre undefined, que é o caminho "vanilla".
  Collection.prototype.data = function () { return undefined; };

  /* ── máscara (substituto mínimo do jquery.mask) ────────────────────────── */

  var maskState = new WeakMap();

  function applyPattern(value, pattern) {
    var out = '';
    var vi = 0;
    for (var pi = 0; pi < pattern.length && vi < value.length; pi++) {
      var p = pattern[pi];
      var c = value[vi];
      if (p === '0' || p === '9') {
        if (!/[0-9]/.test(c)) { vi++; pi--; continue; }
        out += c; vi++;
      } else if (p === 'A') {
        if (!/[0-9a-zA-Z]/.test(c)) { vi++; pi--; continue; }
        out += c; vi++;
      } else if (p === 'S') {
        if (!/[a-zA-Z]/.test(c)) { vi++; pi--; continue; }
        out += c; vi++;
      } else {
        out += p;
        if (c === p) vi++;
      }
    }
    return out;
  }

  Collection.prototype.mask = function (pattern) {
    this.nodes.forEach(function (el) {
      if (maskState.has(el)) el.removeEventListener('input', maskState.get(el));
      var handler = function () {
        var pos = el.selectionStart === el.value.length;
        el.value = applyPattern(el.value, pattern);
        if (pos) el.setSelectionRange(el.value.length, el.value.length);
      };
      maskState.set(el, handler);
      el.addEventListener('input', handler);
      if (el.value) el.value = applyPattern(el.value, pattern);
      el.setAttribute('data-mask-ativa', pattern);
    });
    return this;
  };

  Collection.prototype.unmask = function () {
    this.nodes.forEach(function (el) {
      var handler = maskState.get(el);
      if (handler) el.removeEventListener('input', handler);
      maskState.delete(el);
      el.removeAttribute('data-mask-ativa');
    });
    return this;
  };

  Collection.prototype.serialize = function () {
    var form = this.nodes[0];
    if (!form) return '';
    return new URLSearchParams(new FormData(form)).toString();
  };

  /* ── seletor ───────────────────────────────────────────────────────────── */

  function $(target) {
    if (target instanceof Collection) return target;
    if (typeof target === 'string') return new Collection(Array.from(document.querySelectorAll(target)));
    if (!target) return new Collection([]);
    if (target.nodeType || target === window || target === document) return new Collection([target]);
    if (target.length !== undefined) return new Collection(Array.from(target));
    return new Collection([target]);
  }

  $.fn = Collection.prototype;

  /* ── $.ajax sobre o servidor falso (assets/mock-server.js) ─────────────── */

  $.ajax = function (config) {
    var deferred = {
      readyState: 1,
      _done: [], _fail: [], _always: [], _aborted: false,
      done: function (fn) { this._done.push(fn); return this; },
      fail: function (fn) { this._fail.push(fn); return this; },
      always: function (fn) { this._always.push(fn); return this; },
      abort: function () { this._aborted = true; this.readyState = 4; }
    };

    var server = window.DemoServer;
    var run = server
      ? server.handle(config)
      : Promise.reject(new Error('DemoServer não carregado'));

    run.then(function (data) {
      deferred.readyState = 4;
      if (deferred._aborted) return;
      deferred._done.forEach(function (fn) { fn(data); });
      deferred._always.forEach(function (fn) { fn(); });
    }, function (err) {
      deferred.readyState = 4;
      if (deferred._aborted) return;
      deferred._fail.forEach(function (fn) { fn(err); });
      deferred._always.forEach(function (fn) { fn(); });
    });

    return deferred;
  };

  window.$ = window.jQuery = $;
})();
