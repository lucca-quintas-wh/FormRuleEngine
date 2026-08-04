/**
 * As falhas SILENCIOSAS, uma a uma.
 *
 * Cada caso aqui era um bug que não escrevia nada no console: a regra
 * simplesmente não disparava, e quem não conhecia a engine não tinha por onde
 * começar a procurar. Este arquivo existe para que voltem a falhar alto se
 * alguém reintroduzir qualquer um deles.
 */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

let falhas = 0;
let total = 0;

function ok(condicao, nome, detalhe = '') {
    total++;
    if (condicao) {
        console.log(`  ok   | ${nome}`);
    } else {
        falhas++;
        console.log(` FALHA | ${nome}${detalhe ? '\n         ' + detalhe : ''}`);
    }
}

/** Um formulário isolado, com os plugins pedidos, já inicializado. */
function montar(html, plugins = [], antes = null) {
    const dom = new JSDOM('', {
        url: 'http://localhost/',
        runScripts: 'dangerously',
        pretendToBeVisual: true,
    });
    const { window } = dom;
    const carregar = rel => {
        const s = window.document.createElement('script');
        s.textContent = fs.readFileSync(path.join(ROOT, rel), 'utf8');
        window.document.head.appendChild(s);
    };

    window.document.body.innerHTML = html;
    if (antes) antes(window);

    carregar('src/form-rule-engine.js');
    carregar('src/plugins/form-rule-base.js');
    plugins.forEach(p => carregar(`src/plugins/form-rule-${p}.js`));
    carregar('src/form-visibility-v2.js');
    window.initFormVisibilityV2(window.document);

    return window;
}

const nomeDoForm = f => f.getAttribute('name');

/* ── 1. checkbox sem atributo `value` ──────────────────────────────────────
   O HTML define "on" como valor padrão, então `field.value || 'S'` nunca caía
   no fallback e {"Aceite":"S"} era permanentemente falso.                   */
{
    const w = montar(`
      <form data-form-visibility="true" name="f">
        <input type="checkbox" name="SemValue">
        <input type="checkbox" name="ComValue" value="X">
        <div data-visible-when='{"SemValue":"S"}' id="alvo"><input name="Dep"></div>
      </form>`, ['visible']);

    const engine = w.__formRuleEnginesByName.f;
    const semValue = w.document.querySelector('[name="SemValue"]');
    const comValue = w.document.querySelector('[name="ComValue"]');

    ok(engine.getFieldValue('SemValue') === 'N', 'checkbox desmarcado lê "N"');

    semValue.checked = true;
    ok(engine.getFieldValue('SemValue') === 'S',
       'checkbox sem value marcado lê "S" (era "on")',
       `leu ${JSON.stringify(engine.getFieldValue('SemValue'))}`);

    comValue.checked = true;
    ok(engine.getFieldValue('ComValue') === 'X',
       'checkbox com value explícito continua mandando no valor');

    semValue.dispatchEvent(new w.Event('change', { bubbles: true }));
    ok(!w.document.getElementById('alvo').classList.contains('form-rule-hidden'),
       'condição sobre checkbox sem value passa a casar');
}

/* ── 2. trigger_when lançava TypeError ─────────────────────────────────────
   findInput() recebia o NOME do campo (string) e só faz element.querySelector,
   então a exceção subia dentro do handler e o alvo não recebia nada.        */
{
    const w = montar(`
      <form data-form-visibility="true" name="f">
        <div data-trigger-when='[{"fire":[{"field":"Alvo","event":"change"}]}]'>
          <input name="Origem">
        </div>
        <input name="Alvo">
      </form>`, ['trigger'], win => {
        // shim mínimo de jQuery: só o que o plugin usa
        const reg = new WeakMap();
        const $ = el => ({
            on(spec, fn) {
                String(spec).split(/\s+/).forEach(s => {
                    const tipo = s.split('.')[0];
                    if (!reg.has(el)) reg.set(el, new Set());
                    if (!reg.get(el).has(tipo)) {
                        reg.get(el).add(tipo);
                        el.addEventListener(tipo, fn);
                    }
                });
                return this;
            },
            off() { return this; },
            trigger(tipo) {
                el.dispatchEvent(new win.Event(String(tipo).split('.')[0], { bubbles: true }));
                return this;
            },
            data() { return undefined; },
        });
        win.$ = win.jQuery = $;
    });

    let recebeu = 0;
    w.document.querySelector('[name="Alvo"]').addEventListener('change', () => recebeu++);

    let excecao = null;
    w.addEventListener('error', e => { excecao = e.message; });
    const origem = w.document.querySelector('[name="Origem"]');
    origem.value = 'x';
    try {
        origem.dispatchEvent(new w.Event('change', { bubbles: true }));
    } catch (e) {
        excecao = e.message;
    }

    ok(excecao === null, 'trigger_when não lança exceção', String(excecao));
    ok(recebeu > 0, 'trigger_when entrega o evento ao campo alvo',
       `o alvo recebeu ${recebeu} evento(s)`);
}

/* ── 3. prevent_submit_when sem window.sendForm ────────────────────────────
   O guarda só era instalado quando existia o sendForm do host de origem. Fora
   dele, a regra era registrada e ninguém a consultava.                      */
{
    const w = montar(`
      <form data-form-visibility="true" name="f">
        <select name="Operacao"><option value="C">C</option><option value="V">V</option></select>
        <div data-prevent-submit-when='{"condition":{"Operacao":"C"},"fields":["Ie"],"message":"Informe a IE."}'>
          <input name="Ie">
        </div>
        <button type="submit">Enviar</button>
      </form>`, ['prevent-submit']);

    ok(typeof w.sendForm !== 'function', 'o cenário não tem window.sendForm');

    const form = w.document.querySelector('form');
    let enviou = false;
    form.addEventListener('submit', () => { enviou = true; });

    const ev = new w.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(ev);
    ok(ev.defaultPrevented, 'submit é bloqueado com o campo exigido vazio');

    w.document.querySelector('[name="Ie"]').value = 'ISENTO';
    const ev2 = new w.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(ev2);
    ok(!ev2.defaultPrevented, 'submit passa depois de preencher');

    ok(w.__formRuleEnginesByName.f.validateBeforeSubmit().valid === true,
       'validateBeforeSubmit() é público e concorda');
}

/* ── 4. diagnose(): torna audível o que era silencioso ─────────────────── */
{
    const w = montar(`
      <form data-form-visibility="true" name="f" data-form-debug="true">
        <select name="Tipo"><option value="F">F</option></select>

        <!-- (a) regra no próprio input: findInput() não olha para o elemento -->
        <input name="Rg" data-required-when='{"Tipo":"F"}'>

        <!-- (b) campo citado que não existe -->
        <div data-visible-when='{"CampoQueNaoExiste":"S"}'><input name="X"></div>

        <!-- (c) duas chaves no mesmo objeto: o runtime lê só a primeira.
             Os dois campos existem, para o aviso ficar isolado. -->
        <input name="Outro" value="1">
        <div data-visible-when='{"Tipo":"F","Outro":"1"}'><input name="Y"></div>
      </form>`, ['visible', 'required']);

    const avisos = w.__formRuleEnginesByName.f.diagnose();
    const tem = trecho => avisos.some(a => a.includes(trecho));

    ok(tem('está no próprio <input'), 'diagnose() acusa regra no input em vez do wrapper');
    ok(tem('CampoQueNaoExiste'), 'diagnose() acusa campo citado que não existe');
    ok(tem('chaves'), 'diagnose() acusa condição com mais de uma chave');
    ok(avisos.length === 3, 'diagnose() não inventa avisos', `foram ${avisos.length}`);
}

/* ── 5. diagnose() cala a boca quando está tudo certo ────────────────────── */
{
    const w = montar(`
      <form data-form-visibility="true" name="f">
        <select name="Tipo"><option value="F">F</option></select>
        <div data-required-when='{"Tipo":"F"}'><input name="Cpf"></div>
        <div data-visible-when='{"AND":[{"Tipo":"F"},{"Cpf":{"!=":""}}]}'><input name="Z"></div>
      </form>`, ['visible', 'required']);

    ok(w.__formRuleEnginesByName.f.diagnose().length === 0,
       'formulário correto não gera aviso nenhum');
}

/* ── 6. fetch_when com event "load" não é barrado por skip_empty ─────────── */
{
    let pedidos = 0;
    const w = montar(`
      <form data-form-visibility="true" name="f">
        <div data-fetch-when='{"event":"load","url":"/api/estados","map_options":{"field":"Uf","path":"data"}}'>
          <select name="Uf"><option value="">-</option></select>
        </div>
      </form>`, ['fetch'], win => {
        win.$ = win.jQuery = el => ({ on() { return this; }, off() { return this; }, data() {} });
        win.$.ajax = () => {
            pedidos++;
            return { done() { return this; }, fail() { return this; }, always() { return this; } };
        };
    });

    ok(pedidos === 1,
       'combo vazio com event "load" dispara a busca inicial',
       `saíram ${pedidos} requisição(ões)`);
}

/* ── 7. tema: os nomes do design system são configuráveis ────────────────── */
{
    // O tema precisa ser configurado depois do núcleo e ANTES do bootstrap, que
    // é quando os plugins leem os nomes. Por isso este caso monta à mão em vez
    // de usar montar().
    const dom = new JSDOM('', { url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true });
    const win = dom.window;
    const carregar = rel => {
        const s2 = win.document.createElement('script');
        s2.textContent = fs.readFileSync(path.join(ROOT, rel), 'utf8');
        win.document.head.appendChild(s2);
    };
    win.document.body.innerHTML = `
      <form data-form-visibility="true" name="f">
        <select name="Tipo"><option value="F">F</option><option value="J">J</option></select>
        <div data-required-when='{"Tipo":"F"}'>
          <label class="meu-rotulo" for="a">A</label><input id="a" name="A">
        </div>
      </form>`;
    carregar('src/form-rule-engine.js');
    win.FormRuleEngine.theme.set({ label: '.meu-rotulo', labelRequired: 'obrigatorio' });
    carregar('src/plugins/form-rule-base.js');
    carregar('src/plugins/form-rule-required.js');
    carregar('src/form-visibility-v2.js');
    win.initFormVisibilityV2(win.document);

    const rotulo = win.document.querySelector('.meu-rotulo');
    ok(rotulo.classList.contains('obrigatorio'),
       'tema: rótulo e classe customizados são respeitados',
       `classes: ${rotulo.className}`);
    ok(!rotulo.classList.contains('ilu-form-label--required'),
       'tema: a classe do projeto de origem não é aplicada');
}

/* ── 8. i18n: os textos são substituíveis ────────────────────────────────── */
{
    const w = montar(`<form data-form-visibility="true" name="f"><input name="A"></form>`, []);
    const i18n = w.FormRuleEngine.i18n;

    ok(i18n.t('campoObrigatorio') === 'Campo obrigatório', 'i18n: padrão é pt-BR');
    i18n.locale('en');
    ok(i18n.t('campoObrigatorio') === 'Required field', 'i18n: troca para en');
    ok(i18n.t('etapa', { n: 3 }) === 'Step 3', 'i18n: interpola parâmetros');
    i18n.set({ campoObrigatorio: 'Champ requis' });
    ok(i18n.t('campoObrigatorio') === 'Champ requis', 'i18n: sobrescrita avulsa');
    i18n.locale('pt-BR');
}

/* ── 9. host: o adaptador é injetável ────────────────────────────────────── */
{
    const w = montar(`<form data-form-visibility="true" name="f"><input name="A"></form>`, []);
    let pediu = null;
    w.FormRuleEngine.host.set({ confirm: o => { pediu = o.text; return Promise.resolve(true); } });

    return w.FormRuleEngine.host.confirm({ text: 'apagar?' }).then(r => {
        ok(r === true && pediu === 'apagar?', 'host: confirm() injetado é usado');
        console.log(`\n${total - falhas}/${total} passaram`);
        process.exit(falhas ? 1 : 0);
    });
}

console.log(`\n${total - falhas}/${total} passaram`);
process.exit(falhas ? 1 : 0);
