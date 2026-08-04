<?php
/**
 * Modo clássico: a regra mora no campo que DISPARA a busca.
 *
 * `sanitize: digits` tira a máscara antes de mandar; `map` distribui a resposta
 * pelos campos; `clear_on_fail` apaga o que sobrou de uma busca anterior;
 * `on_empty` roda ações e aborta quando o campo é esvaziado.
 *
 * CEPs que existem no api.php: 01310100, 20040020, 30130010.
 */

return [
    'name' => 'formCep',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'Cep', 'label' => 'CEP', 'type' => 'text', 'col' => 4,
                'placeholder' => '01310100',
                'fetch_when' => [
                    'event'    => 'blur',
                    'method'   => 'GET',
                    'url'      => 'api.php?acao=cep',
                    'data'     => ['cep' => '{value}'],
                    'sanitize' => 'digits',
                    'map'      => [
                        'Logradouro' => 'logradouro',
                        'Bairro'     => 'bairro',
                        'Municipio'  => 'cidade',
                        'UfEnd'      => 'uf',
                    ],
                    'clear_on_fail' => ['Logradouro', 'Bairro', 'Municipio', 'UfEnd'],
                    'message_fail'  => 'CEP não encontrado.',
                    'on_empty'      => [['clear' => ['Logradouro', 'Bairro', 'Municipio', 'UfEnd']]],
                ],
                'hint' => 'Saia do campo (blur) para disparar a busca.',
            ],
            ['name' => 'Logradouro', 'label' => 'Logradouro', 'type' => 'text', 'col' => 8],
            ['name' => 'Bairro',     'label' => 'Bairro',     'type' => 'text', 'col' => 4],
            ['name' => 'Municipio',  'label' => 'Município',  'type' => 'text', 'col' => 5],
            ['name' => 'UfEnd',      'label' => 'UF',         'type' => 'text', 'col' => 3],
        ],
    ]],
];
