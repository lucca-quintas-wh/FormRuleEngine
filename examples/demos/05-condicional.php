<?php
/**
 * set_value_when sob condição.
 *
 * A regra é uma LISTA e TODOS os itens são avaliados, não só o primeiro que
 * casa. É por isso que a última linha (condição valor vazio) consegue limpar
 * quando o usuário volta ao placeholder: sem ela, o plugin não desfaz nada.
 */

return [
    'name' => 'formSetCondicional',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'Canal', 'label' => 'Canal de atendimento', 'type' => 'select', 'col' => 4,
                'placeholder_option' => 'Selecione…',
                'options' => ['whatsapp' => 'WhatsApp', 'email' => 'E-mail', 'telefone' => 'Telefone'],
            ],
            [
                'name' => 'Sla', 'label' => 'SLA', 'type' => 'text', 'col' => 4, 'readonly' => true,
                'set_value_when' => [
                    ['condition' => ['Canal' => 'whatsapp'], 'values' => ['Sla' => '2 horas',      'Fila' => 'comercial-wpp']],
                    ['condition' => ['Canal' => 'email'],    'values' => ['Sla' => '1 dia útil',   'Fila' => 'comercial-mail']],
                    ['condition' => ['Canal' => 'telefone'], 'values' => ['Sla' => 'imediato',     'Fila' => 'call-center']],
                    ['condition' => ['Canal' => ''],         'values' => ['Sla' => '',             'Fila' => '']],
                ],
            ],
            ['name' => 'Fila', 'label' => 'Fila', 'type' => 'text', 'col' => 4, 'readonly' => true],
        ],
    ]],
];
