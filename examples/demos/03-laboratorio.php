<?php
/**
 * O laboratório: campos de todo tipo + uma caixa para escrever a condição.
 *
 * Quem avalia é `engine.evaluateCondition()`, a mesma função que os plugins
 * chamam — não há reimplementação da DSL nesta página.
 *
 * Repare no `checked_value` do checkbox: o emissor sempre escreve um `value`
 * explícito. Sem ele o navegador usa "on" como padrão e a condição
 * {"Aceite":"S"} nunca casa.
 */

return [
    'name' => 'formLab',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'Status', 'label' => 'Status', 'type' => 'select', 'col' => 4,
                'options' => ['A' => 'A — ativo', 'I' => 'I — inativo', 'P' => 'P — pendente'],
            ],
            ['name' => 'Idade', 'label' => 'Idade', 'type' => 'number', 'col' => 4, 'value' => 20],
            ['name' => 'Email', 'label' => 'E-mail', 'type' => 'text', 'col' => 4, 'value' => 'ana@empresa.com'],
            ['name' => 'Senha',       'label' => 'Senha',       'type' => 'text', 'col' => 4, 'value' => 'abc'],
            ['name' => 'Confirmacao', 'label' => 'Confirmação', 'type' => 'text', 'col' => 4, 'value' => 'abc'],
            [
                'name' => 'Aceite', 'type' => 'checkbox', 'col' => 4,
                'checkbox_label' => 'Aceite (checkbox)',
                'checked_value'  => 'S',
            ],
            [
                'type' => 'raw', 'col' => 12,
                'html' => '<label for="lab">Condição (JSON)</label>'
                        . '<textarea id="lab" rows="3" spellcheck="false">'
                        . '{"AND":[{"Status":["A","P","X"]},{"Idade":{"&gt;=":18}},{"Confirmacao":{"eq_field":"Senha"}}]}'
                        . '</textarea>'
                        . '<p id="labResultado" style="margin:12px 0 0;font-family:ui-monospace,monospace"></p>'
                        . '<p class="hint" style="margin-top:12px">Exemplos para colar:</p>'
                        . '<div id="labExemplos" style="display:flex;flex-wrap:wrap;gap:6px"></div>',
            ],
        ],
    ]],
];
