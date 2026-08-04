<?php
/**
 * Quando NENHUMA regra da lista casa, o plugin chama unmask(): é como se libera
 * um campo que aceita formato livre em determinado contexto.
 */

return [
    'name' => 'formMascaraSome',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'TipoTelefone', 'label' => 'Tipo de telefone', 'type' => 'select', 'col' => 5,
                'options' => [
                    'fixo' => 'Fixo', 'celular' => 'Celular',
                    'internacional' => 'Internacional (sem máscara)',
                ],
            ],
            [
                'name' => 'Telefone', 'label' => 'Telefone', 'type' => 'text', 'col' => 5,
                'mask_when' => [
                    ['TipoTelefone' => 'fixo',    'mask' => '(00) 0000-0000'],
                    ['TipoTelefone' => 'celular', 'mask' => '(00) 00000-0000'],
                ],
            ],
        ],
    ]],
];
