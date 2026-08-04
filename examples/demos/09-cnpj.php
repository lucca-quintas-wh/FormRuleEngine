<?php
/**
 * populate_when: uma resposta, muitos campos.
 *
 * `map` é campo do formulário → caminho na resposta. O caminho aceita ponto
 * ("endereco.cidade"). Chave ausente na resposta é ignorada: o campo fica como
 * estava, não é limpo.
 *
 * CNPJs que existem no api.php: 11222333000181 e 99888777000166.
 */

return [
    'name' => 'formPopulate',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'CnpjConsulta', 'label' => 'CNPJ', 'type' => 'text', 'col' => 4,
                'placeholder' => '11222333000181',
                'populate_when' => [
                    'event'  => 'blur',
                    'method' => 'POST',
                    'url'    => 'api.php?acao=cnpj',
                    'data'   => ['cnpj' => '{value}'],
                    'map'    => [
                        'Razao'        => 'razao',
                        'Fantasia'     => 'fantasia',
                        'EmailEmpresa' => 'email',
                        'CepEmpresa'   => 'cep',
                        'Abertura'     => 'abertura',
                        'Porte'        => 'porte',
                    ],
                ],
                'hint' => 'Digite e saia do campo.',
            ],
            ['name' => 'Razao',        'label' => 'Razão social',  'type' => 'text', 'col' => 8],
            ['name' => 'Fantasia',     'label' => 'Nome fantasia', 'type' => 'text', 'col' => 4],
            ['name' => 'EmailEmpresa', 'label' => 'E-mail',        'type' => 'text', 'col' => 4],
            ['name' => 'CepEmpresa',   'label' => 'CEP',           'type' => 'text', 'col' => 4],
            ['name' => 'Abertura',     'label' => 'Abertura',      'type' => 'text', 'col' => 2],
            ['name' => 'Porte',        'label' => 'Porte',         'type' => 'text', 'col' => 2],
        ],
    ]],
];
