<?php
/**
 * Busca enquanto digita: `event: input` + `debounce` + `min_length`.
 * Espera o usuário parar e ignora buscas curtas demais.
 */

return [
    'name' => 'formDebounce',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'CepIncremental', 'label' => 'CEP (busca ao digitar)', 'type' => 'text', 'col' => 5,
                'placeholder' => 'digite 8 dígitos',
                'fetch_when' => [
                    'event'      => 'input',
                    'debounce'   => 400,
                    'min_length' => 8,
                    'method'     => 'GET',
                    'url'        => 'api.php?acao=cep',
                    'data'       => ['cep' => '{value}'],
                    'sanitize'   => 'digits',
                    'map'        => ['PreviaEndereco' => 'logradouro'],
                ],
                'hint' => 'Olhe o painel de eventos: sai uma requisição só, 400 ms depois da última tecla.',
            ],
            ['name' => 'PreviaEndereco', 'label' => 'Prévia', 'type' => 'text', 'col' => 7, 'readonly' => true],
        ],
    ]],
];
