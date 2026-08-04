<?php
/**
 * Rótulo condicional.
 *
 * `label_when` é uma LISTA: cada item é uma condição normal mais a chave
 * `label`. A avaliação para no primeiro acerto — ordem importa, e a condição
 * mais específica vem primeiro.
 *
 * `data-label-default` (que o emissor escreve a partir de `label`) é o texto de
 * volta quando nenhuma regra casa.
 */

return [
    'name' => 'formRotulo',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'TipoDoc', 'label' => 'Tipo de documento', 'type' => 'select', 'col' => 5,
                'options' => ['F' => 'Pessoa física', 'J' => 'Pessoa jurídica', 'E' => 'Estrangeiro'],
            ],
            [
                'name' => 'Documento', 'label' => 'Documento', 'type' => 'text', 'col' => 5,
                'label_when' => [
                    ['TipoDoc' => 'F', 'label' => 'CPF'],
                    ['TipoDoc' => 'J', 'label' => 'CNPJ'],
                    ['TipoDoc' => 'E', 'label' => 'Passaporte'],
                ],
            ],
        ],
    ]],
];
