/**
 * Contrato ponta a ponta: o PHP compila a condição, o JS a avalia.
 *
 * É o teste que as duas metades sozinhas não conseguem fazer. O teste PHP prova
 * que o compilador produz o JSON que ele acha certo; o smoke test JS prova que o
 * runtime entende o JSON que ELE acha certo. Só este aqui prova que são o mesmo
 * JSON, que é exatamente onde um contrato entre duas linguagens costuma rachar.
 *
 * Pula (sem falhar) se o PHP não estiver disponível.
 */
const { JSDOM } = require('jsdom');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// nome, config PHP da condição, valor do campo, visível?
const CASOS = [
    ['igualdade',                "['Tipo' => 'F']",                              'F',  true],
    ['igualdade (não bate)',     "['Tipo' => 'F']",                              'J',  false],
    ['pertence a (3 valores)',   "['Tipo' => ['A', 'B', 'C']]",                  'B',  true],
    ['pertence a (fora)',        "['Tipo' => ['A', 'B', 'C']]",                  'Z',  false],
    ['pertence a (1 valor)',     "['Tipo' => ['A']]",                            'A',  true],
    ['operador !=',              "['Tipo' => ['!=' => 'F']]",                    'J',  true],
    ['alias <> vira !=',         "['Tipo' => ['<>' => 'F']]",                    'J',  true],
    ['alias = vira eq',          "['Tipo' => ['=' => 'F']]",                     'F',  true],
    ['posicional [op, valor]',   "['Tipo' => ['!=', 'F']]",                      'J',  true],
    ['trinca posicional',        "['Tipo', '=', 'F']",                           'F',  true],
    ['forma verbosa',            "['field' => 'Tipo', 'op' => '=', 'value' => 'F']", 'F', true],
    ['numérico >',               "['Tipo' => ['>' => 100]]",                     '250', true],
    ['numérico > (não bate)',    "['Tipo' => ['>' => 100]]",                     '50', false],
    ['regex',                    "['Tipo' => ['regex' => '^[0-9]{3}$']]",        '123', true],
    ['OR explícito',             "['OR' => [['Tipo' => 'A'], ['Tipo' => 'B']]]", 'B',  true],
    ['lista = AND implícito',    "[['Tipo' => 'A'], ['Tipo' => 'A']]",           'A',  true],

    // Pertinência com 2 valores. Já foi a armadilha do compilador: a lista era
    // indistinguível de [operador, valor] e ele decidia pelo operador, emitindo
    // {"Tipo":{"a":"B"}}, condição permanentemente falsa. Hoje o par posicional
    // só é reconhecido quando o primeiro elemento É um operador conhecido.
    ['pertence a (2 valores)',   "['Tipo' => ['A', 'B']]",                       'A',  true],
    ['pertence a (2, o outro)',  "['Tipo' => ['A', 'B']]",                       'B',  true],
    ['pertence a (2, fora)',     "['Tipo' => ['A', 'B']]",                       'C',  false],
    // E o par posicional continua sendo par posicional.
    ['posicional != com 2',      "['Tipo' => ['!=', 'A']]",                      'B',  true],
    ['posicional != com 2 (b)',  "['Tipo' => ['!=', 'A']]",                      'A',  false],
];

function compilarComPhp() {
    const php = CASOS.map(([, cond]) => `  FormRuleCompiler::encode(${cond}),`).join('\n');
    const script = `<?php
require '${path.join(ROOT, 'src/php/FormRuleCompiler.php')}';
echo json_encode([
${php}
]);`;
    const tmp = path.join(require('os').tmpdir(), 'fre-cross.php');
    fs.writeFileSync(tmp, script);
    try {
        return JSON.parse(execFileSync('php', [tmp], { encoding: 'utf8' }));
    } finally {
        fs.unlinkSync(tmp);
    }
}

let compilados;
try {
    compilados = compilarComPhp();
} catch (e) {
    console.log('PHP indisponível, teste cruzado pulado.');
    console.log(`(${e.message.split('\n')[0]})`);
    process.exit(0);
}

const dom = new JSDOM('', { url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true });
const { window } = dom;
const { document } = window;

document.body.innerHTML = `<form data-form-visibility="true">
  <input name="Tipo" value="">
  ${compilados.map((json, i) =>
      `<div id="c${i}" data-visible-when='${json.replace(/'/g, '&#39;')}'></div>`).join('\n  ')}
</form>`;

for (const rel of ['src/form-rule-engine.js', 'src/plugins/form-rule-base.js', 'src/plugins/form-rule-visible.js', 'src/form-visibility-v2.js']) {
    const s = document.createElement('script');
    s.textContent = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    document.head.appendChild(s);
}

(async () => {
    if (document.readyState === 'loading') {
        await new Promise(r => window.addEventListener('DOMContentLoaded', r, { once: true }));
    }

    let falhas = 0;

    CASOS.forEach(([nome, , valor, esperado], i) => {
        const campo = document.querySelector('[name="Tipo"]');
        campo.value = valor;
        campo.dispatchEvent(new window.Event('change', { bubbles: true }));

        const el = document.getElementById(`c${i}`);
        const visivel = !(el.style.display === 'none'
            || el.classList.contains('is-hidden')
            || el.classList.contains('form-rule-hidden'));

        const ok = visivel === esperado;
        if (!ok) falhas++;
        console.log(`${ok ? '  ok  ' : ' FALHA'} | ${nome.padEnd(26)} ${compilados[i]}`);
        if (!ok) console.log(`         campo="${valor}" → visível=${visivel}, esperado=${esperado}`);
    });

    console.log(`\n${CASOS.length - falhas}/${CASOS.length} passaram`);
    process.exit(falhas ? 1 : 0);
})();
