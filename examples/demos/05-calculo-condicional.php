<?php
/**
 * Cálculo condicional: fora da condição, o plugin devolve undefined e
 * setFieldValue() nem é chamado — o campo fica como estava.
 */

return [
    'name' => 'formCalculoCondicional',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'TipoCobranca', 'label' => 'Tipo de cobrança', 'type' => 'select', 'col' => 4,
                'options' => ['mensal' => 'Mensal', 'anual' => 'Anual (10% off)'],
            ],
            ['name' => 'Mensalidade', 'label' => 'Mensalidade', 'type' => 'number', 'col' => 4, 'value' => 200],
            [
                'name' => 'ValorCobrado', 'label' => 'Valor cobrado', 'type' => 'text', 'col' => 4, 'readonly' => true,
                'computed_when' => [
                    ['target' => 'ValorCobrado', 'condition' => ['TipoCobranca' => 'mensal'],
                     'expression' => '{Mensalidade}'],
                    ['target' => 'ValorCobrado', 'condition' => ['TipoCobranca' => 'anual'],
                     'expression' => '{Mensalidade} * 12 * 0.9'],
                ],
            ],
        ],
    ]],
];
