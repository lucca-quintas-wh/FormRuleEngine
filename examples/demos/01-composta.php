<?php
/**
 * Condição composta. A DSL inteira está na página 03; aqui só o formato.
 *
 * Note `['Uf' => ['SP','RJ','MG']]`: pertinência com TRÊS valores. Com
 * exatamente dois, o compilador confundiria a lista com um par posicional
 * ['operador', valor], ver a armadilha no README de referência.
 */

return [
    'name' => 'formComposta',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name'    => 'Uf', 'label' => 'UF', 'type' => 'select', 'col' => 4,
                'placeholder_option' => 'Selecione…',
                'options' => ['SP' => 'São Paulo', 'RJ' => 'Rio de Janeiro', 'MG' => 'Minas Gerais'],
            ],
            [
                'name' => 'Faturamento', 'label' => 'Faturamento anual (R$)',
                'type' => 'number', 'col' => 4, 'value' => 0,
            ],
            [
                'name'    => 'Regime', 'label' => 'Regime tributário especial',
                'type'    => 'select', 'col' => 4,
                'options' => ['LR' => 'Lucro real', 'LP' => 'Lucro presumido'],
                'visible_when' => ['AND' => [
                    ['Uf'          => ['SP', 'RJ', 'MG']],
                    ['Faturamento' => ['>' => 100000]],
                ]],
                'demo_name' => 'regime especial (AND)',
                'hint'      => 'UF na lista <em>e</em> faturamento acima de 100.000.',
            ],
        ],
    ]],
];
