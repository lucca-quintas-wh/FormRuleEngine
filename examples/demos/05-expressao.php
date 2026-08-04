<?php
/**
 * Expressões aritméticas, e a razão de a cadeia estar em DOIS campos.
 *
 * As dependências são calculadas por ELEMENTO. Se as duas regras morassem no
 * mesmo wrapper, `Subtotal` viraria dependência do próprio elemento que o
 * escreve: gravar dispara change → reavalia o elemento → grava de novo. Laço
 * infinito, e a aba trava.
 *
 * A regra prática: agrupe no mesmo atributo apenas cálculos IRMÃOS (que leem as
 * mesmas origens); separe os que formam uma CADEIA.
 *
 * `format: 'br'` não é enfeite: 3 × 149,90 em ponto flutuante dá
 * 449.70000000000005, e sem formatar é isso que o usuário vê. Como o subtotal
 * passa a ser um número em formato brasileiro, o total precisa de `parse: 'br'`
 * para conseguir calcular a partir dele.
 */

return [
    'name' => 'formExpressao',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            ['name' => 'Quantidade',    'label' => 'Quantidade',     'type' => 'number', 'col' => 4, 'value' => 3],
            ['name' => 'ValorUnitario', 'label' => 'Valor unitário', 'type' => 'number', 'col' => 4, 'value' => '149.90', 'step' => '0.01'],
            ['name' => 'Desconto',      'label' => 'Desconto (%)',   'type' => 'number', 'col' => 4, 'value' => 10],
            [
                'name' => 'Subtotal', 'label' => 'Subtotal', 'type' => 'text', 'col' => 6, 'readonly' => true,
                'computed_when' => [
                    'target' => 'Subtotal', 'expression' => '{Quantidade} * {ValorUnitario}', 'format' => 'br',
                ],
            ],
            [
                'name' => 'Total', 'label' => 'Total', 'type' => 'text', 'col' => 6, 'readonly' => true,
                'computed_when' => [
                    'target'     => 'Total',
                    'expression' => '{Subtotal} - ({Subtotal} * {Desconto} / 100)',
                    'parse'      => 'br',
                    'format'     => 'br',
                ],
            ],
        ],
    ]],
];
