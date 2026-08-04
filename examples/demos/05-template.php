<?php
/**
 * set_value_when: `values` é um mapa campo → template.
 * No template, {OutroCampo} é substituído pelo valor atual daquele campo.
 */

return [
    'name' => 'formTemplate',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            ['name' => 'Nome',      'label' => 'Nome',      'type' => 'text', 'col' => 4, 'value' => 'Ana'],
            ['name' => 'Sobrenome', 'label' => 'Sobrenome', 'type' => 'text', 'col' => 4, 'value' => 'Souza'],
            [
                'name' => 'NomeCompleto', 'label' => 'Nome completo (pela regra)',
                'type' => 'text', 'col' => 4, 'readonly' => true,
                'set_value_when' => ['values' => ['NomeCompleto' => '{Nome} {Sobrenome}']],
            ],
        ],
    ]],
];
