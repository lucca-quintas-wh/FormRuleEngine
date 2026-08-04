<?php
/**
 * Visível e obrigatório são regras INDEPENDENTES.
 *
 * Repetir a condição nos dois lugares é o padrão, e é intencional: um campo
 * pode ser visível e opcional, ou obrigatório dentro de um bloco que só
 * aparece em outro contexto.
 */

return [
    'name' => 'formVisivelObrigatorio',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'Modalidade', 'label' => 'Modalidade de contratação',
                'type' => 'select', 'col' => 5,
                'placeholder_option' => 'Selecione…',
                'options' => ['PJ' => 'Pessoa jurídica', 'CLT' => 'CLT', 'EST' => 'Estágio'],
            ],
            [
                'name' => 'Contrato', 'label' => 'Número do contrato', 'type' => 'text', 'col' => 5,
                // Aparece em PJ e CLT; obrigatório SÓ em PJ.
                'visible_when'  => ['Modalidade' => ['PJ', 'CLT', 'PJ_EXTERIOR']],
                'required_when' => ['Modalidade' => 'PJ'],
                'demo_name'     => 'contrato',
                'hint' => 'Aparece em PJ e CLT; é obrigatório <strong>só</strong> em PJ.',
            ],
            [
                'name' => 'Instituicao', 'label' => 'Instituição de ensino', 'type' => 'text', 'col' => 5,
                'visible_when'  => ['Modalidade' => 'EST'],
                'required_when' => ['Modalidade' => 'EST'],
                'demo_name'     => 'instituição',
            ],
        ],
    ]],
];
