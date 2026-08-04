<?php
/**
 * Obrigatoriedade condicional.
 *
 * O rótulo sai com a classe `ilu-form-label` — é por ela que o plugin
 * `required` encontra o label para pendurar o asterisco.
 */

return [
    'name' => 'formObrigatorio',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'TipoPessoa', 'label' => 'Tipo de pessoa', 'type' => 'select', 'col' => 4,
                'options' => ['F' => 'Pessoa física', 'J' => 'Pessoa jurídica'],
            ],
            [
                'name' => 'Cpf', 'label' => 'CPF', 'type' => 'text', 'col' => 4,
                'required_when' => ['TipoPessoa' => 'F'],
            ],
            [
                'name' => 'Cnpj', 'label' => 'CNPJ', 'type' => 'text', 'col' => 4,
                'required_when' => ['TipoPessoa' => 'J'],
            ],
            [
                'type' => 'raw', 'col' => 12,
                'html' => '<p class="hint">Troque o tipo e repare no asterisco mudando de lugar. '
                        . 'Tente enviar com o campo obrigatório vazio: a validação nativa do '
                        . 'navegador barra, porque o atributo <code>required</code> é de verdade.</p>',
            ],
        ],
    ]],
    'buttons' => [
        ['label' => 'Enviar (validação nativa)', 'type' => 'submit', 'class' => 'primary'],
    ],
];
