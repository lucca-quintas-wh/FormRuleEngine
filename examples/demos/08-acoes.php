<?php
/**
 * on_success aceita a mesma lista de ações de runActions() — a mesma que
 * on_fail, on_empty e confirm_submit usam.
 *
 * Nos templates, {response} é a resposta inteira e {response.campo.sub} navega
 * por ela.
 */

return [
    'name' => 'formAcoes',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'Cep2', 'label' => 'CEP (com ações)', 'type' => 'text', 'col' => 4,
                'placeholder' => '20040020',
                'fetch_when' => [
                    'event'    => 'blur',
                    'method'   => 'GET',
                    'url'      => 'api.php?acao=cep',
                    'data'     => ['cep' => '{value}'],
                    'sanitize' => 'digits',
                    'on_success' => [
                        ['set_value' => ['RegiaoDetectada' => '{response.uf}']],
                        ['show_message' => ['type' => 'info', 'message' => 'Endereço em {response.cidade}/{response.uf}.']],
                        ['conditional' => [
                            'condition' => ['RegiaoDetectada' => 'SP'],
                            'then' => [['set_value' => ['CentroDistribuicao' => 'CD-Barueri']]],
                            'else' => [['set_value' => ['CentroDistribuicao' => 'CD-Duque de Caxias']]],
                        ]],
                    ],
                    'on_fail' => [['show_message' => ['type' => 'error', 'message' => 'Não achei esse CEP.']]],
                ],
            ],
            ['name' => 'RegiaoDetectada',   'label' => 'UF detectada',          'type' => 'text', 'col' => 4, 'readonly' => true],
            ['name' => 'CentroDistribuicao','label' => 'Centro de distribuição','type' => 'text', 'col' => 4, 'readonly' => true],
        ],
    ]],
];
