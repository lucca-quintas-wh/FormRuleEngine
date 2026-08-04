<?php
/**
 * confirm_submit envolve um BOTÃO. Ele verifica as validações remotas, pede
 * confirmação, e só então executa: as ações de `action`, ou o onclick original
 * do botão, que ele remove e passa a controlar.
 *
 * Armadilha: quando `condition` é falsa o handler retorna sem fazer NADA
 * inclusive sem executar o onclick que removeu. Se o botão tinha onclick e a
 * regra é condicional, declare as ações em `action`, para o comportamento não
 * depender de qual ramo caiu.
 */

return [
    'name' => 'formConfirm',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            ['name' => 'Motivo', 'label' => 'Motivo do cancelamento', 'type' => 'text', 'col' => 6],
            [
                'name' => 'StatusPedido', 'label' => 'Status', 'type' => 'select', 'col' => 6,
                'options' => ['aberto' => 'Aberto', 'faturado' => 'Faturado'],
            ],
            ['name' => 'Cancelado', 'label' => 'Cancelado', 'type' => 'text', 'col' => 4, 'readonly' => true],
        ],
    ]],
    'buttons' => [[
        'label' => 'Cancelar pedido',
        'type'  => 'button',
        'confirm_submit' => [
            'condition' => ['StatusPedido' => 'faturado'],
            'message'   => 'Este pedido já foi faturado. Cancelar mesmo assim?',
            'action'    => [
                ['set_value'    => ['Cancelado' => 'S']],
                ['show_message' => ['type' => 'info', 'message' => 'Pedido cancelado.']],
            ],
        ],
    ]],
];
