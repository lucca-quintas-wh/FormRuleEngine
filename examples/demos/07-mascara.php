<?php
/**
 * Máscara condicional — o caso clássico: o mesmo campo recebe CPF ou CNPJ.
 * A máscara é reaplicada apenas quando MUDA: o plugin lembra a última aplicada
 * por input e sai cedo se for a mesma.
 */

return [
    'name' => 'formMascara',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'TipoPessoaMask', 'label' => 'Tipo de pessoa', 'type' => 'select', 'col' => 5,
                'options' => ['F' => 'Pessoa física', 'J' => 'Pessoa jurídica'],
            ],
            [
                'name' => 'Documento', 'label' => 'Documento', 'type' => 'text', 'col' => 5,
                'placeholder' => 'digite só números',
                'mask_when' => [
                    ['TipoPessoaMask' => 'F', 'mask' => '000.000.000-00'],
                    ['TipoPessoaMask' => 'J', 'mask' => '00.000.000/0000-00'],
                ],
                'hint' => 'Digite números e troque o tipo de pessoa no meio.',
            ],
        ],
    ]],
];
