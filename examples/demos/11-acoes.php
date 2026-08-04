<?php
/**
 * runActions() ao vivo, sem depender de AJAX.
 *
 * O truque: um `confirm_submit` SEM `message` não abre diálogo nenhum — só
 * executa a lista de ações. É a forma mais curta de pendurar ações num botão.
 */

return [
    'name' => 'formAcoesBotao',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'Uf2', 'label' => 'UF', 'type' => 'select', 'col' => 4,
                'options' => ['SP' => 'SP', 'RJ' => 'RJ'],
            ],
            ['name' => 'Frete', 'label' => 'Frete calculado', 'type' => 'text', 'col' => 4, 'readonly' => true],
            ['name' => 'Prazo', 'label' => 'Prazo',           'type' => 'text', 'col' => 4, 'readonly' => true],
        ],
    ]],
    'buttons' => [
        [
            'label' => 'Calcular frete', 'type' => 'button', 'class' => 'primary',
            'confirm_submit' => ['action' => [
                ['conditional' => [
                    'condition' => ['Uf2' => 'SP'],
                    'then' => [['set_value' => ['Frete' => '12,90', 'Prazo' => '2 dias úteis']]],
                    'else' => [['set_value' => ['Frete' => '24,50', 'Prazo' => '5 dias úteis']]],
                ]],
                ['show_message' => ['type' => 'info', 'message' => 'Frete para {Uf2} calculado.']],
            ]],
        ],
        [
            'label' => 'Limpar', 'type' => 'button',
            'confirm_submit' => ['action' => [['clear' => ['Frete', 'Prazo']]]],
        ],
    ],
];
