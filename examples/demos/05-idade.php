<?php
/**
 * Idade e faixa etária.
 *
 * `type: 'age'` conta anos COMPLETOS a partir de dd/mm/aaaa, rejeita data
 * inexistente (31/02 devolve vazio em vez de virar 03/03) e considera o
 * aniversário do ano corrente.
 *
 * `type: 'age_band'` sem a chave `bands` lê as faixas das OPÇÕES do campo de
 * destino, cujo valor codifica o intervalo ("24.28"). Trocar a tabela de faixas
 * é trocar as opções, nenhuma linha de JS muda.
 */

return [
    'name' => 'formIdade',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'Nascimento', 'label' => 'Data de nascimento', 'type' => 'text', 'col' => 4,
                'value' => '04/02/1978', 'placeholder' => 'dd/mm/aaaa',
            ],
            [
                'name' => 'Idade', 'label' => 'Idade', 'type' => 'text', 'col' => 2, 'readonly' => true,
                'computed_when' => ['target' => 'Idade', 'type' => 'age', 'source' => 'Nascimento'],
            ],
            [
                'name' => 'Faixa', 'label' => 'Faixa etária', 'type' => 'select', 'col' => 6,
                'placeholder_option' => '.:Escolha:.',
                'options' => [
                    '0.18' => '0 a 18 anos',   '19.23' => '19 a 23 anos', '24.28' => '24 a 28 anos',
                    '29.33' => '29 a 33 anos', '34.38' => '34 a 38 anos', '39.43' => '39 a 43 anos',
                    '44.48' => '44 a 48 anos', '49.53' => '49 a 53 anos', '54.58' => '54 a 58 anos',
                    '59.199' => '59 anos ou mais',
                ],
                'computed_when' => ['target' => 'Faixa', 'type' => 'age_band', 'source' => 'Nascimento'],
            ],
        ],
    ]],
];
