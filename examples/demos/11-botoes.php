<?php
/**
 * action_when é o único plugin cujo atributo vai no PRÓPRIO botão, não num
 * wrapper — ele age no elemento onde está. E carrega DUAS regras dentro do
 * mesmo atributo: visible_when e enabled_when.
 *
 * Na config isso aparece como duas chaves do botão; o emissor as junta em
 * data-action-when. Abra "o HTML compilado" para ver.
 */

return [
    'name' => 'formBotoes',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'Status', 'label' => 'Status do documento', 'type' => 'select', 'col' => 6,
                'options' => ['rascunho' => 'Rascunho', 'enviado' => 'Enviado', 'aprovado' => 'Aprovado'],
            ],
            [
                'name' => 'Perfil', 'label' => 'Seu perfil', 'type' => 'select', 'col' => 6,
                'options' => ['operador' => 'Operador', 'gestor' => 'Gestor'],
            ],
        ],
    ]],
    'buttons' => [
        [
            'label' => 'Editar', 'type' => 'button',
            'enabled_when' => ['Status' => 'rascunho'],
        ],
        [
            'label' => 'Enviar para aprovação', 'type' => 'button',
            'visible_when' => ['Status' => 'rascunho'],
        ],
        [
            'label' => 'Aprovar', 'type' => 'button', 'class' => 'primary',
            'visible_when' => ['AND' => [['Status' => 'enviado'], ['Perfil' => 'gestor']]],
            'enabled_when' => ['Perfil' => 'gestor'],
        ],
        [
            'label' => 'Excluir', 'type' => 'button',
            'visible_when' => ['OR' => [['Status' => 'rascunho'], ['Perfil' => 'gestor']]],
        ],
    ],
];
