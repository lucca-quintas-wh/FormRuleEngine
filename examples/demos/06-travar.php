<?php
/**
 * lock_when age pelo `target`: o elemento que carrega a regra é irrelevante,
 * só precisa estar dentro do formulário. Aqui ela mora num hidden.
 *
 * O wrapper que recebe a classe visual é procurado com
 * closest('.ilu-form-field, .drawer-form-field, .form-group') a partir do campo
 * alvo, daí o `wrapper_class` no campo travado.
 */

return [
    'name' => 'formTravar',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'Rural', 'label' => 'Produtor rural?', 'type' => 'select', 'col' => 5,
                'options' => ['N' => 'Não', 'S' => 'Sim'],
            ],
            [
                'name' => 'TipoPessoaLock', 'label' => 'Tipo de pessoa', 'type' => 'select', 'col' => 5,
                'options' => ['F' => 'Pessoa física', 'J' => 'Pessoa jurídica'],
                'wrapper_class' => 'ilu-form-field',
                'hint' => 'Escolha "Pessoa jurídica", depois marque produtor rural.',
            ],
            [
                'name' => 'AncoraLock', 'type' => 'hidden',
                'lock_when' => [
                    'target'            => 'TipoPessoaLock',
                    'value'             => 'F',
                    'restore_on_unlock' => true,
                    'condition'         => ['Rural' => 'S'],
                ],
            ],
        ],
    ]],
];
