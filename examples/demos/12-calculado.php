<?php
/**
 * Campo calculado dentro da fila.
 *
 * `sequence_keep` protege o valor da limpeza a jusante. O caso real: a data de
 * nascimento calcula a faixa etária, e a faixa vem DEPOIS dela na fila, sem a
 * marca, a limpeza dos posteriores apagaria, um instante depois, o valor que a
 * regra de cálculo acabou de escrever.
 */

return [
    'name' => 'formSequenciaCalc',
    'sequence_config' => ['clear_downstream' => true],
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'Nasc2', 'label' => '1 · Data de nascimento', 'type' => 'text', 'col' => 4,
                'sequence' => 1, 'placeholder' => 'dd/mm/aaaa',
                'computed_when' => ['target' => 'Faixa2', 'type' => 'age_band', 'source' => 'Nasc2'],
                'hint' => 'Digite <code>15/06/1990</code> e saia do campo.',
            ],
            [
                'name' => 'Faixa2', 'label' => '2 · Faixa etária', 'type' => 'select', 'col' => 4,
                'sequence' => 2, 'sequence_keep' => true,
                'placeholder_option' => '.:Escolha:.',
                'options' => [
                    '0.18' => '0 a 18 anos',   '19.23' => '19 a 23 anos', '24.28' => '24 a 28 anos',
                    '29.33' => '29 a 33 anos', '34.38' => '34 a 38 anos', '39.43' => '39 a 43 anos',
                    '44.48' => '44 a 48 anos', '49.53' => '49 a 53 anos', '54.58' => '54 a 58 anos',
                    '59.199' => '59 anos ou mais',
                ],
            ],
            [
                'name' => 'Plano2', 'label' => '3 · Plano', 'type' => 'select', 'col' => 4,
                'sequence' => 3,
                'placeholder_option' => '.:Escolha:.',
                'options' => ['a' => 'Ambulatorial', 'h' => 'Hospitalar'],
            ],
        ],
    ]],
];
