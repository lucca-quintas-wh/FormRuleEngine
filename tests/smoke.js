const { JSDOM } = require('jsdom');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const dom = new JSDOM('', {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
});

const { window } = dom;
const { document } = window;

function load(rel) {
    const s = document.createElement('script');
    s.textContent = require('fs').readFileSync(path.join(ROOT, rel), 'utf8');
    document.head.appendChild(s);
}

document.body.innerHTML = `
<form data-form-visibility="true">
  <select name="TipoPessoa"><option value="F">F</option><option value="J">J</option></select>

  <div id="boxCpf" data-visible-when='{"TipoPessoa":"F"}'>
    <div data-required-when='{"TipoPessoa":"F"}'><input name="Cpf"></div>
  </div>
  <div id="boxCnpj" data-visible-when='{"TipoPessoa":"J"}'>
    <input name="Cnpj">
  </div>

  <select name="Uf"><option value="">-</option><option value="SP">SP</option><option value="MG">MG</option></select>
  <input type="number" name="Faturamento" value="0">
  <div id="boxRegime" data-visible-when='{"AND":[{"Uf":["SP","RJ"]},{"Faturamento":{">":100000}}]}'>
    <input name="Regime">
  </div>

  <input type="number" name="Quantidade" value="1">
  <input type="number" name="ValorUnitario" value="100">
  <input name="Total" data-computed-when='{"target":"Total","expression":"{Quantidade} * {ValorUnitario}"}'>
  <div data-disabled-when='{"Total":{"<":500}}'><input type="number" name="Desconto"></div>
</form>`;

load('src/form-rule-engine.js');
load('src/plugins/form-rule-base.js');
load('src/plugins/form-rule-visible.js');
load('src/plugins/form-rule-required.js');
load('src/plugins/form-rule-disabled.js');
load('src/plugins/form-rule-computed.js');
load('src/form-visibility-v2.js');

// O bootstrap adia a init para DOMContentLoaded quando o documento ainda está
// carregando (é o caso aqui, com os scripts injetados de forma síncrona).
async function esperarInit() {
    if (document.readyState === 'loading') {
        await new Promise(r => window.addEventListener('DOMContentLoaded', r, { once: true }));
    }
}

const $ = sel => document.querySelector(sel);
const field = n => document.querySelector(`[name="${n}"]`);
const hidden = el => el.style.display === 'none' || el.classList.contains('is-hidden') || el.classList.contains('form-rule-hidden');

function set(name, value) {
    const el = field(name);
    el.value = value;
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
}

(async () => {
await esperarInit();

const results = [];
const check = (label, got, want) => {
    const ok = String(got) === String(want);
    results.push({ ok, label, got, want });
};

// A engine inicializou?
check('engine registrada no form', $('form').dataset.formVisibilityV2Initialized, 'true');

// 1. visibilidade condicional — estado inicial (TipoPessoa=F)
check('CPF visível com TipoPessoa=F', hidden($('#boxCpf')), 'false');
check('CNPJ oculto com TipoPessoa=F', hidden($('#boxCnpj')), 'true');
check('CPF obrigatório com TipoPessoa=F', field('Cpf').required, 'true');

// 1b. trocar para J inverte
set('TipoPessoa', 'J');
check('CPF oculto após TipoPessoa=J', hidden($('#boxCpf')), 'true');
check('CNPJ visível após TipoPessoa=J', hidden($('#boxCnpj')), 'false');
check('CPF deixou de ser obrigatório', field('Cpf').required, 'false');

// 2. condição composta AND + array + operador >
check('Regime oculto no início', hidden($('#boxRegime')), 'true');
set('Uf', 'SP');
check('Regime ainda oculto (só UF ok)', hidden($('#boxRegime')), 'true');
set('Faturamento', '250000');
check('Regime visível (UF in [SP,RJ] AND fat > 100k)', hidden($('#boxRegime')), 'false');
set('Uf', 'MG');
check('Regime oculto de novo (UF fora da lista)', hidden($('#boxRegime')), 'true');

// 3. computed + disabled encadeado
check('Total calculado no load (1 * 100)', field('Total').value, '100');
check('Desconto desabilitado (total < 500)', field('Desconto').disabled, 'true');
set('Quantidade', '8');
check('Total recalculado (8 * 100)', field('Total').value, '800');
check('Desconto habilitado (total >= 500)', field('Desconto').disabled, 'false');

// relatório
let falhas = 0;
for (const r of results) {
    if (!r.ok) falhas++;
    console.log(`${r.ok ? '  ok  ' : ' FALHA'} | ${r.label}${r.ok ? '' : `  → obtido="${r.got}" esperado="${r.want}"`}`);
}
console.log(`\n${results.length - falhas}/${results.length} passaram`);
process.exit(falhas ? 1 : 0);
})();
