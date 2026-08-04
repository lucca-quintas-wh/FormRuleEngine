<?php
/**
 * revert_when: a escolha é feita, avaliada e DESFEITA na hora, com a mensagem
 * explicando por quê.
 *
 * `remember_in` grava a escolha aceita num campo auxiliar; `restore_from` diz
 * de onde vem o valor de volta (sem ele, volta ao valor anterior do campo).
 */

return [
    'name' => 'formReverter',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'tipoPlano', 'label' => 'Tipo de plano', 'type' => 'select', 'col' => 6,
                'placeholder_option' => '.:Escolha:.',
                'options' => ['1' => 'Coletivo empresarial', '2' => 'Individual', '3' => 'Adesão'],
                'revert_when' => [[
                    'condition' => ['AND' => [
                        ['tipoPlanoDefinido' => ['!=' => '']],
                        ['tipoPlano'         => ['neq_field' => 'tipoPlanoDefinido']],
                        ['itens'             => ['>' => 0]],
                    ]],
                    'restore_from' => 'tipoPlanoDefinido',
                    'remember_in'  => 'tipoPlanoDefinido',
                    'message_map'  => [
                        '1' => 'Já existe um Coletivo Empresarial cotado. Remova os itens antes de trocar.',
                        '2' => 'Já existe um plano Individual cotado. Remova os itens antes de trocar.',
                        '3' => 'Já existe um plano por Adesão cotado. Remova os itens antes de trocar.',
                    ],
                ]],
            ],
            ['name' => 'tipoPlanoDefinido', 'type' => 'hidden'],
            ['name' => 'itens', 'type' => 'hidden', 'value' => 0],
            [
                'type' => 'raw', 'col' => 12,
                'html' => '<p style="margin-top:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">'
                        . '<button type="button" id="btnAddItem">Adicionar item à cotação</button>'
                        . '<button type="button" class="secondary" id="btnZerarItens">Remover todos</button>'
                        . '<span id="contadorItens" class="hint"></span></p>'
                        . '<p class="hint">Escolha um tipo, adicione um item, e então tente trocar o tipo.</p>',
            ],
        ],
    ]],
];
