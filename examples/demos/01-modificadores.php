<?php
/**
 * Os três modificadores do plugin `visible`, lidos do dataset do elemento:
 * animate, keep_space e clear_on_hide.
 */

return [
    'name' => 'formModificadores',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name'    => 'TemDependentes',
                'label'   => 'Tem dependentes?',
                'type'    => 'select',
                'col'     => 5,
                'options' => ['N' => 'Não', 'S' => 'Sim'],
            ],
            [
                'name'          => 'NomeDependente',
                'label'         => 'Nome do dependente',
                'type'          => 'text',
                'col'           => 7,
                'placeholder'   => 'digite algo, depois volte para "Não"',
                'visible_when'  => ['TemDependentes' => 'S'],
                'clear_on_hide' => true,   // limpa os campos de dentro ao ocultar
                'animate'       => false,  // sem o fade de 0,2 s
                'demo_name'     => 'dependente (limpa ao ocultar)',
                'hint'          => 'Sem <code>clear_on_hide</code>, o valor continuaria a ser enviado, escondido.',
            ],
            [
                'type'         => 'raw',
                'col'          => 12,
                'visible_when' => ['TemDependentes' => 'S'],
                'keep_space'   => true,   // esconde com visibility, não display
                'demo_name'    => 'aviso (reserva espaço)',
                'html'         => '<p class="hint">Este bloco reserva o próprio espaço mesmo quando oculto — o layout não pula.</p>',
            ],
        ],
    ]],
];
