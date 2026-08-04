/**
 * Pilha completa: FormRenderer gera o formulário, o runtime o executa.
 *
 * Os outros testes cobrem pedaços: o compilador contra o trait de origem, o
 * runtime contra HTML escrito à mão, e o cruzado só a condição. Este parte de
 * uma CONFIG, como um usuário real, e verifica o comportamento no DOM. É o que
 * pega erro de posicionamento de atributo: o compilador pode emitir o JSON certo
 * e o gerador pendurá-lo no elemento errado, e os dois testes anteriores passam.
 *
 * Pula (sem falhar) se o PHP não estiver disponível.
 */
const { JSDOM } = require('jsdom');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const CONFIG_PHP = `[
    'name'     => 'frmTeste',
    'params'   => ['origem' => 'externo'],
    'sections' => [
        [
            'title'  => 'Identificação',
            'fields' => [
                ['name' => 'TipoPessoa', 'label' => 'Tipo', 'type' => 'select', 'col' => 4,
                 'options' => ['F' => 'Física', 'J' => 'Jurídica'], 'value' => 'F'],

                ['name' => 'Cpf', 'label' => 'CPF', 'col' => 4,
                 'visible_when' => ['TipoPessoa' => 'F']],

                ['name' => 'Cnpj', 'label' => 'CNPJ', 'col' => 4,
                 'visible_when'  => ['TipoPessoa' => 'J'],
                 'required_when' => ['TipoPessoa' => 'J']],

                ['name' => 'Aceite', 'type' => 'checkbox', 'label' => 'Aceito', 'col' => 12],

                ['name' => 'Interno', 'label' => 'Campo interno', 'col' => 6,
                 'visible_when' => ['form_param_origem' => 'interno']],

                ['type' => 'group', 'visible_when' => ['TipoPessoa' => 'J'], 'fields' => [
                    ['name' => 'Socio1', 'label' => 'Sócio 1', 'col' => 6],
                    ['name' => 'Socio2', 'label' => 'Sócio 2', 'col' => 6],
                ]],

                ['name' => 'Quantidade',   'type' => 'number', 'col' => 4, 'value' => 2],
                ['name' => 'ValorUnitario','type' => 'number', 'col' => 4, 'value' => 150],
                ['name' => 'Total', 'label' => 'Total', 'col' => 4, 'readonly' => true,
                 'computed_when' => ['target' => 'Total', 'expression' => '{Quantidade} * {ValorUnitario}']],
            ],
        ],
    ],
    'buttons' => [['label' => 'Salvar', 'type' => 'submit', 'class' => 'primary']],
]`;

function gerar() {
    const script = `<?php
require '${path.join(ROOT, 'src/php/FormRenderer.php')}';
$config = ${CONFIG_PHP};
echo json_encode([
  'html'    => FormRenderer::renderForm($config),
  'plugins' => FormRenderer::pluginsUsados($config),
]);`;
    const tmp = path.join(os.tmpdir(), 'fre-gerador.php');
    fs.writeFileSync(tmp, script);
    try {
        return JSON.parse(execFileSync('php', [tmp], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }));
    } finally {
        fs.unlinkSync(tmp);
    }
}

let gerado;
try {
    gerado = gerar();
} catch (e) {
    console.log('PHP indisponível, teste do gerador pulado.');
    console.log(`(${e.message.split('\n')[0]})`);
    process.exit(0);
}

const dom = new JSDOM(`<body>${gerado.html}</body>`,
    { url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true });
const { window } = dom;
const { document } = window;

for (const rel of [
    'src/form-rule-engine.js',
    'src/plugins/form-rule-base.js',
    'src/plugins/form-rule-visible.js',
    'src/plugins/form-rule-required.js',
    'src/plugins/form-rule-computed.js',
    'src/form-visibility-v2.js',
]) {
    const s = document.createElement('script');
    s.textContent = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    document.head.appendChild(s);
}

const campo = n => document.querySelector(`[name="${n}"]`);
const wrapperDe = n => campo(n).closest('[data-visible-when], [data-required-when]');
const oculto = el => el.style.display === 'none'
    || el.classList.contains('is-hidden')
    || el.classList.contains('form-rule-hidden');

const r = [];
const check = (label, got, want) => r.push({ ok: String(got) === String(want), label, got, want });

function set(nome, valor) {
    const el = campo(nome);
    el.value = valor;
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
}

(async () => {
    if (document.readyState === 'loading') {
        await new Promise(res => window.addEventListener('DOMContentLoaded', res, { once: true }));
    }

    // --- estrutura: o atributo tem de estar no WRAPPER, não no controle -------
    check('regra NÃO fica no <input>', campo('Cnpj').hasAttribute('data-required-when'), 'false');
    check('regra fica no wrapper',
        campo('Cnpj').closest('[data-required-when]') !== null, 'true');
    check('checkbox tem value explícito', campo('Aceite').getAttribute('value'), 'S');
    check('param vira hidden __form_param_',
        document.querySelector('[name="__form_param_origem"]').value, 'externo');
    check('engine inicializou',
        document.querySelector('form').dataset.formVisibilityV2Initialized, 'true');

    // --- comportamento -------------------------------------------------------
    check('CPF visível (Tipo=F)',  oculto(wrapperDe('Cpf')),  'false');
    check('CNPJ oculto (Tipo=F)',  oculto(wrapperDe('Cnpj')), 'true');

    set('TipoPessoa', 'J');
    check('CPF oculto após J',     oculto(wrapperDe('Cpf')),  'true');
    check('CNPJ visível após J',   oculto(wrapperDe('Cnpj')), 'false');
    check('CNPJ virou obrigatório', campo('Cnpj').required,   'true');

    // grupo: a condição do grupo foi propagada para cada filho
    check('grupo: Socio1 visível com J', oculto(wrapperDe('Socio1')), 'false');
    set('TipoPessoa', 'F');
    check('grupo: Socio1 oculto com F',  oculto(wrapperDe('Socio1')), 'true');
    check('grupo: Socio2 oculto com F',  oculto(wrapperDe('Socio2')), 'true');

    // form_param como dependência de condição
    check('campo por form_param segue oculto', oculto(wrapperDe('Interno')), 'true');

    // computed atravessou gerador + compilador + runtime
    check('Total calculado (2 * 150)', campo('Total').value, '300');
    set('Quantidade', '5');
    check('Total recalculado (5 * 150)', campo('Total').value, '750');

    // --- seleção de plugins --------------------------------------------------
    const p = gerado.plugins.sort().join(',');
    check('plugins detectados', p, 'computed,required,visible');

    let falhas = 0;
    for (const x of r) {
        if (!x.ok) falhas++;
        console.log(`${x.ok ? '  ok  ' : ' FALHA'} | ${x.label}${x.ok ? '' : `  → obtido="${x.got}" esperado="${x.want}"`}`);
    }
    console.log(`\n${r.length - falhas}/${r.length} passaram`);
    process.exit(falhas ? 1 : 0);
})();
