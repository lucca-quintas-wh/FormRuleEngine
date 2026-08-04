<?php
/**
 * Liberação sequencial.
 *
 * A ordem vem de `sequence`, que o emissor põe no CONTROLE (não no wrapper) —
 * é ele que o plugin varre e cujo `value` ele lê. A configuração da fila vai
 * num hidden com data-sequence-config.
 *
 * `sequence_when` tira o campo da fila SEM escondê-lo: ele fica visível e
 * travado, e a fila segue para o próximo. É diferente de `visible_when`, que
 * também o pula, mas sumindo com ele.
 */

return [
    'name' => 'formSequencia',
    'sequence_config' => [
        'clear_downstream' => true,
        'warn_on_empty'    => 'Selecione uma opção para continuar.',
        'always_enabled'   => ['QtdVidas'],
    ],
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'Estado', 'label' => '1 · Estado', 'type' => 'select', 'col' => 4,
                'sequence' => 1,
                'placeholder_option' => '.:Escolha:.',
                'options' => ['SP' => 'São Paulo', 'RJ' => 'Rio de Janeiro', 'MG' => 'Minas Gerais'],
            ],
            [
                'name' => 'Cidade', 'label' => '2 · Cidade', 'type' => 'select', 'col' => 4,
                'sequence' => 2,
                'placeholder_option' => '.:Escolha:.',
                'options_when' => [
                    'depends_on' => 'Estado',
                    'options' => [
                        'SP' => ['sp' => 'São Paulo', 'cps' => 'Campinas', 'sts' => 'Santos'],
                        'RJ' => ['rio' => 'Rio de Janeiro', 'nit' => 'Niterói'],
                        'MG' => ['bh' => 'Belo Horizonte', 'udi' => 'Uberlândia'],
                    ],
                ],
            ],
            [
                'name' => 'TipoPlanoSeq', 'label' => '3 · Tipo de plano', 'type' => 'select', 'col' => 4,
                'sequence' => 3,
                'placeholder_option' => '.:Escolha:.',
                'options' => ['1' => 'Coletivo empresarial', '2' => 'Individual', '3' => 'Adesão'],
            ],
            [
                'name' => 'CnpjSeq', 'label' => '4 · CNPJ da empresa', 'type' => 'text', 'col' => 4,
                'sequence' => 4,
                'sequence_when' => ['TipoPlanoSeq' => '1'],
                'placeholder' => 'só no coletivo',
                'hint' => 'Escolha "Individual" no passo 3: este passo é <strong>pulado</strong> — fica visível e travado, mas não bloqueia o 5.',
            ],
            [
                'name' => 'NascimentoSeq', 'label' => '5 · Nascimento do titular', 'type' => 'text', 'col' => 4,
                'sequence' => 5,
                'placeholder' => 'dd/mm/aaaa',
            ],
            [
                'name' => 'QtdVidas', 'label' => 'Quantidade de vidas', 'type' => 'number', 'col' => 4,
                'value' => 1, 'min' => 1,
                'hint' => 'Fora da fila (<code>always_enabled</code>): editável a qualquer momento.',
            ],
        ],
    ]],
];
