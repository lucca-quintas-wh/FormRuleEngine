<?php
/**
 * O segundo formato do `options_when`: uma lista, como a do `label_when`. Cada
 * item tem uma condição (qualquer uma da DSL) e a chave `options`.
 *
 * Quando NENHUMA regra casa, o plugin restaura as opções originais do HTML —
 * ele fotografa a lista inicial na primeira avaliação.
 */

return [
    'name' => 'formOpcoesCond',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'UfOpc', 'label' => 'UF', 'type' => 'select', 'col' => 4,
                'options' => ['SP' => 'SP', 'RJ' => 'RJ'],
            ],
            [
                'name' => 'Porte', 'label' => 'Porte', 'type' => 'select', 'col' => 4,
                'options' => ['pequeno' => 'Pequeno', 'grande' => 'Grande'],
            ],
            [
                'name' => 'Regime', 'label' => 'Regime tributário', 'type' => 'select', 'col' => 4,
                'placeholder_option' => '.:Escolha:.',
                'options' => [
                    'lr' => 'Lucro real', 'lp' => 'Lucro presumido', 'sn' => 'Simples Nacional',
                ],
                'options_when' => [
                    ['AND' => [['UfOpc' => 'SP'], ['Porte' => 'grande']],
                     'options' => ['lr' => 'Lucro real', 'lp' => 'Lucro presumido']],
                    ['Porte' => 'pequeno',
                     'options' => ['sn' => 'Simples Nacional', 'mei' => 'MEI']],
                ],
                'hint' => 'Com RJ + grande nenhuma regra casa, e as opções originais voltam.',
            ],
        ],
    ]],
];
