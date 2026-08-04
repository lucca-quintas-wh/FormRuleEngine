<?php
/**
 * A armadilha do wrapper, reproduzida de propósito.
 *
 * `regra_no_input` é uma chave que só existe nestes exemplos: manda o gerador
 * pôr o atributo de regra no PRÓPRIO controle, em vez do wrapper. Os plugins
 * procuram o campo com `element.querySelector('input, select, textarea')`
 * dentro do elemento, então não o encontram, e a regra nunca dispara.
 *
 * Nenhum formulário real deve usar isto. Está aqui para você reconhecer o
 * sintoma quando escrever o HTML à mão.
 */

return [
    'name' => 'formArmadilha',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'TipoPessoaArm', 'label' => 'Tipo de pessoa', 'type' => 'select', 'col' => 4,
                'options' => ['F' => 'Pessoa física', 'J' => 'Pessoa jurídica'],
            ],
            [
                'name' => 'Rg', 'label' => 'RG', 'type' => 'text', 'col' => 4,
                'required_when'  => ['TipoPessoaArm' => 'F'],
                'regra_no_input' => true,   // ← o erro, deliberado
                'hint' => 'Nunca fica obrigatório, escolha o tipo que escolher.',
            ],
        ],
    ]],
];
