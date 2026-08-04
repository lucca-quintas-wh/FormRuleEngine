<?php
/**
 * `chain`: requisições disparadas DEPOIS da principal, com acesso à resposta
 * dela pelos templates {response.…}.
 */

return [
    'name' => 'formChain',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'CepChain', 'label' => 'CEP (encadeado)', 'type' => 'text', 'col' => 4,
                'placeholder' => '30130010',
                'fetch_when' => [
                    'event'    => 'blur',
                    'method'   => 'GET',
                    'url'      => 'api.php?acao=cep',
                    'data'     => ['cep' => '{value}'],
                    'sanitize' => 'digits',
                    'map'      => ['MunicipioChain' => 'cidade'],
                    'chain'    => [[
                        'method' => 'GET',
                        'url'    => 'api.php?acao=cidades',
                        'data'   => ['uf' => '{response.uf}'],
                        'map_options' => ['field' => 'CidadesDaUf', 'path' => 'data'],
                    ]],
                ],
            ],
            ['name' => 'MunicipioChain', 'label' => 'Município', 'type' => 'text', 'col' => 4, 'readonly' => true],
            [
                'name' => 'CidadesDaUf', 'label' => 'Outras cidades da UF', 'type' => 'select', 'col' => 4,
                'placeholder_option' => '—',
            ],
        ],
    ]],
];
