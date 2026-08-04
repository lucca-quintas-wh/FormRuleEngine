<?php
/**
 * Visibilidade: o caso básico.
 *
 * `type => 'group'` propaga a condição para cada campo filho. É o que o
 * gerador do projeto de origem faz. Não existe "wrapper de grupo" no HTML
 * final: cada campo sai com o seu próprio `data-visible-when`.
 */

return [
    'name' => 'formVisibilidade',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name'    => 'TipoPessoa',
                'label'   => 'Tipo de pessoa',
                'type'    => 'select',
                'col'     => 5,
                'options' => ['F' => 'Pessoa física', 'J' => 'Pessoa jurídica'],
            ],

            [
                'type'         => 'group',
                'visible_when' => ['TipoPessoa' => 'F'],
                'fields'       => [
                    ['name' => 'Cpf', 'label' => 'CPF', 'type' => 'text', 'col' => 5,
                     'demo_name' => 'campo CPF'],
                ],
            ],

            [
                'type'         => 'group',
                'visible_when' => ['TipoPessoa' => 'J'],
                'fields'       => [
                    ['name' => 'Cnpj', 'label' => 'CNPJ', 'type' => 'text', 'col' => 5,
                     'demo_name' => 'campo CNPJ'],
                    ['name' => 'InscEstadual', 'label' => 'Inscrição estadual', 'type' => 'text', 'col' => 5,
                     'demo_name' => 'campo IE'],
                ],
            ],
        ],
    ]],
];
