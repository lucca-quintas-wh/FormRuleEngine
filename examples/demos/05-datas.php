<?php
/**
 * `type: 'days_between'` devolve dias inteiros entre start e end, nunca
 * negativo. Aceita dd/mm/aaaa e também o que o Date nativo entender, inclusive
 * o aaaa-mm-dd de um <input type="date">.
 */

return [
    'name' => 'formDatas',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            ['name' => 'DataInicio', 'label' => 'Início', 'type' => 'date', 'col' => 4, 'value' => '2026-01-10'],
            ['name' => 'DataFim',    'label' => 'Fim',    'type' => 'date', 'col' => 4, 'value' => '2026-03-01'],
            [
                'name' => 'Dias', 'label' => 'Dias de vigência', 'type' => 'text', 'col' => 4, 'readonly' => true,
                'computed_when' => ['target' => 'Dias', 'type' => 'days_between', 'start' => 'DataInicio', 'end' => 'DataFim'],
            ],
        ],
    ]],
];
