<?php
/**
 * prevent_submit_when não é obrigatoriedade: é a regra "nesta situação, estes
 * campos precisam estar preenchidos". A condição diz quando a regra vale;
 * `fields` diz o que checar.
 *
 * Os campos vazios recebem a classe form-rule-prevent-submit-error por 3 s.
 */

return [
    'name' => 'formPrevent',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'Operacao', 'label' => 'Operação', 'type' => 'select', 'col' => 4,
                'options' => ['V' => 'Venda', 'C' => 'Compra'],
            ],
            [
                'name' => 'TipoPessoaEnvio', 'label' => 'Tipo de pessoa', 'type' => 'select', 'col' => 4,
                'options' => ['F' => 'Pessoa física', 'J' => 'Pessoa jurídica'],
            ],
            [
                'name' => 'Ie', 'label' => 'Inscrição estadual', 'type' => 'text', 'col' => 4,
                'prevent_submit_when' => [
                    'condition' => ['AND' => [['Operacao' => 'C'], ['TipoPessoaEnvio' => 'J']]],
                    'fields'    => ['Ie'],
                    'message'   => 'Informe a inscrição estadual ou escreva ISENTO.',
                ],
                'hint' => 'Só é exigida em <strong>Compra + Pessoa jurídica</strong>. Escolha essa combinação, deixe vazio e tente enviar.',
            ],
        ],
    ]],
    'buttons' => [['label' => 'Enviar', 'type' => 'submit', 'class' => 'primary']],
];
