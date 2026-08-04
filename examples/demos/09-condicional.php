<?php
/**
 * `condition` impede a consulta fora de contexto; `debounce` agrupa disparos;
 * `skip_empty` (padrão true) evita consultar com o campo vazio.
 */

return [
    'name' => 'formPopulateCond',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'TipoBusca', 'label' => 'Tipo de busca', 'type' => 'select', 'col' => 4,
                'placeholder_option' => 'Desligada',
                'options' => ['lead' => 'Por código de lead'],
            ],
            [
                'name' => 'BuscaCondicional', 'label' => 'Código', 'type' => 'text', 'col' => 4,
                'placeholder' => '1',
                'populate_when' => [
                    'event'     => 'input',
                    'debounce'  => 500,
                    'condition' => ['TipoBusca' => 'lead'],
                    'method'    => 'POST',
                    'url'       => 'api.php?acao=lead',
                    'data'      => ['cod' => '{value}'],
                    'map'       => ['NomeCondicional' => 'razao'],
                ],
                'hint' => 'Com o tipo em "Desligada" nada acontece, mesmo digitando.',
            ],
            ['name' => 'NomeCondicional', 'label' => 'Nome encontrado', 'type' => 'text', 'col' => 4, 'readonly' => true],
        ],
    ]],
];
