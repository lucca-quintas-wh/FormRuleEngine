<?php
/**
 * Dentro de cada item da lista cabe a DSL inteira, inclusive AND/OR.
 * O extrator de dependências sabe ignorar a chave `label` ao descobrir de quais
 * campos a regra depende.
 */

return [
    'name' => 'formRotuloComposto',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'Pais', 'label' => 'País', 'type' => 'select', 'col' => 4,
                'options' => ['BR' => 'Brasil', 'US' => 'Estados Unidos'],
            ],
            [
                'name' => 'Perfil', 'label' => 'Perfil', 'type' => 'select', 'col' => 4,
                'options' => ['PF' => 'Pessoa física', 'PJ' => 'Empresa'],
            ],
            [
                'name' => 'IdFiscal', 'label' => 'Identificação fiscal', 'type' => 'text', 'col' => 4,
                'label_when' => [
                    ['AND' => [['Pais' => 'BR'], ['Perfil' => 'PJ']], 'label' => 'CNPJ'],
                    ['AND' => [['Pais' => 'BR'], ['Perfil' => 'PF']], 'label' => 'CPF'],
                    ['Pais' => 'US', 'label' => 'Taxpayer ID (EIN/SSN)'],
                ],
            ],
        ],
    ]],
];
