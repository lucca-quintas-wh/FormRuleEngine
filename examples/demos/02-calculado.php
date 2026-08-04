<?php
/**
 * Uma regra dependendo de um campo que OUTRO plugin escreve.
 *
 * `setFieldValue()` dispara `change` ao gravar, então o encadeamento acontece
 * sozinho, não há ordem de registro para acertar.
 */

return [
    'name' => 'formCalculado',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            ['name' => 'Quantidade',    'label' => 'Quantidade',     'type' => 'number', 'col' => 4, 'value' => 1],
            ['name' => 'ValorUnitario', 'label' => 'Valor unitário', 'type' => 'number', 'col' => 4, 'value' => 100],
            [
                'name' => 'Total', 'label' => 'Total (calculado)', 'type' => 'text', 'col' => 4,
                'readonly' => true,
                'computed_when' => ['target' => 'Total', 'expression' => '{Quantidade} * {ValorUnitario}'],
            ],
            [
                'name' => 'Desconto', 'label' => 'Desconto', 'type' => 'number', 'col' => 4,
                'disabled_when' => ['Total' => ['<' => 500]],
                'hint' => 'Libera quando o total chega a 500.',
            ],
        ],
    ]],
];
