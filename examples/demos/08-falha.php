<?php
/**
 * Quando a requisição falha: clear_on_fail limpa campos, message_fail avisa, e
 * on_fail roda ações.
 *
 * Detalhe que evita bug: um aborto NOSSO (chegou um gatilho mais novo numa
 * cascata) não dispara este caminho, limpar aí apagaria o resultado da busca
 * que substituiu a abortada.
 */

return [
    'name' => 'formFalha',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'GatilhoFalha', 'label' => 'Campo que consulta um serviço fora do ar',
                'type' => 'text', 'col' => 5, 'value' => 'qualquer coisa',
                'fetch_when' => [
                    'event'  => 'blur',
                    'method' => 'GET',
                    'url'    => 'api.php?acao=inexistente',
                    'clear_on_fail' => ['CampoQueSeraLimpo'],
                    'message_fail'  => 'O serviço não respondeu. Preencha manualmente.',
                    'on_fail'       => [['set_value' => ['ModoManual' => 'S']]],
                ],
            ],
            ['name' => 'CampoQueSeraLimpo', 'label' => 'Preenchido pelo serviço', 'type' => 'text', 'col' => 4, 'value' => 'valor antigo'],
            ['name' => 'ModoManual',        'label' => 'Modo manual',             'type' => 'text', 'col' => 3, 'readonly' => true],
        ],
    ]],
];
