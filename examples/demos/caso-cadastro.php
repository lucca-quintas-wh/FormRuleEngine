<?php
/**
 * Cadastro de cliente, o formulário "pão com manteiga".
 *
 * Mostra as regras de campo que não precisam de servidor:
 *   visible_when · required_when · disabled_when · label_when · options_when
 *   mask_when · computed_when · set_value_when · action (botões) · confirm_submit
 *
 * Cada chave `*_when` daqui vira um atributo `data-*-when` no wrapper do campo.
 * Abra a aba "HTML gerado" na página para ver a correspondência linha a linha.
 */

return [
    'name'   => 'formCadastro',
    'action' => 'api.php?acao=salvar',
    'method' => 'post',

    // Vira <input type="hidden" name="__form_param_modo">. Nas condições:
    // ['form_param_modo' => 'edicao'].
    'params' => [
        'modo' => 'inclusao',
    ],

    'sections' => [

        [
            'title'  => 'Identificação',
            'fields' => [
                [
                    'name'    => 'TipoPessoa',
                    'label'   => 'Tipo de pessoa',
                    'type'    => 'select',
                    'col'     => 4,
                    'options' => ['F' => 'Pessoa física', 'J' => 'Pessoa jurídica'],
                ],

                /* Um campo, três comportamentos: o rótulo muda, a máscara muda,
                   e ele é sempre obrigatório. É o caso que mais aparece em
                   formulário de cadastro brasileiro. */
                [
                    'name'  => 'Documento',
                    'label' => 'Documento',
                    'type'  => 'text',
                    'col'   => 4,
                    'label_when' => [
                        ['TipoPessoa' => 'F', 'label' => 'CPF'],
                        ['TipoPessoa' => 'J', 'label' => 'CNPJ'],
                    ],
                    'mask_when' => [
                        ['TipoPessoa' => 'F', 'mask' => '000.000.000-00'],
                        ['TipoPessoa' => 'J', 'mask' => '00.000.000/0000-00'],
                    ],
                    'required_when' => ['TipoPessoa' => ['!=' => '']],
                ],

                [
                    'name'  => 'Nascimento',
                    'label' => 'Data de nascimento',
                    'type'  => 'text',
                    'col'   => 4,
                    'placeholder' => 'dd/mm/aaaa',
                    'value' => '15/06/1990',
                    // Só existe para pessoa física.
                    'visible_when'  => ['TipoPessoa' => 'F'],
                    'required_when' => ['TipoPessoa' => 'F'],
                    'mask_when'     => [['TipoPessoa' => 'F', 'mask' => '00/00/0000']],
                ],

                /* Campo calculado. Repare que `target` nomeia o campo de
                   destino: a regra pode morar em qualquer wrapper. */
                [
                    'name'     => 'Idade',
                    'label'    => 'Idade',
                    'type'     => 'text',
                    'col'      => 3,
                    'readonly' => true,
                    'visible_when'  => ['TipoPessoa' => 'F'],
                    'computed_when' => [
                        'target' => 'Idade',
                        'type'   => 'age',
                        'source' => 'Nascimento',
                    ],
                ],

                [
                    'name'  => 'RazaoSocial',
                    'label' => 'Razão social',
                    'type'  => 'text',
                    'col'   => 6,
                    'visible_when'  => ['TipoPessoa' => 'J'],
                    'required_when' => ['TipoPessoa' => 'J'],
                ],

                /* `copy_when` espelha a razão social; desmarcar a caixa devolve
                   o valor original. Diferente de `set_value_when`, que
                   sobrescreveria o que o usuário digitasse. */
                [
                    'name'           => 'UsarMesmoNome',
                    'type'           => 'checkbox',
                    'col'            => 6,
                    'checkbox_label' => 'Nome fantasia igual à razão social',
                    'checked'        => true,
                    'visible_when'   => ['TipoPessoa' => 'J'],
                ],
                [
                    'name'  => 'NomeFantasia',
                    'label' => 'Nome fantasia',
                    'type'  => 'text',
                    'col'   => 6,
                    'visible_when' => ['TipoPessoa' => 'J'],
                    'copy_when'    => [
                        'source'    => 'RazaoSocial',
                        'condition' => ['UsarMesmoNome' => 'S'],
                    ],
                    'hint' => 'Espelha a razão social enquanto a caixa estiver marcada.',
                ],

                /* Inscrição estadual: obrigatória para PJ, exceto quando
                   marcada como isenta, e nesse caso fica desabilitada. */
                [
                    'name'           => 'IsentoIe',
                    'type'           => 'checkbox',
                    'col'            => 4,
                    'checkbox_label' => 'Isento de inscrição estadual',
                    'visible_when'   => ['TipoPessoa' => 'J'],
                ],
                [
                    'name'  => 'InscricaoEstadual',
                    'label' => 'Inscrição estadual',
                    'type'  => 'text',
                    'col'   => 4,
                    'visible_when'  => ['TipoPessoa' => 'J'],
                    'disabled_when' => ['IsentoIe' => 'S'],
                    'required_when' => ['AND' => [
                        ['TipoPessoa' => 'J'],
                        ['IsentoIe'   => 'N'],
                    ]],
                ],
            ],
        ],

        [
            'title'        => 'Classificação',
            'description'  => 'Combos dependentes sem ir ao servidor: todo o conjunto de opções está no atributo.',
            'fields' => [
                [
                    'name'    => 'Categoria',
                    'label'   => 'Categoria',
                    'type'    => 'select',
                    'col'     => 4,
                    'placeholder_option' => '.:Escolha:.',
                    'options' => [
                        'veiculo' => 'Veículo',
                        'imovel'  => 'Imóvel',
                        'vida'    => 'Vida',
                    ],
                ],
                [
                    'name'  => 'Subcategoria',
                    'label' => 'Subcategoria',
                    'type'  => 'select',
                    'col'   => 4,
                    'placeholder_option' => '.:Escolha:.',
                    'options_when' => [
                        'depends_on' => 'Categoria',
                        'options'    => [
                            'veiculo' => ['auto' => 'Automóvel', 'moto' => 'Motocicleta', 'frota' => 'Frota'],
                            'imovel'  => ['residencial' => 'Residencial', 'comercial' => 'Comercial'],
                            'vida'    => ['individual' => 'Individual', 'coletivo' => 'Coletivo'],
                        ],
                    ],
                ],
                [
                    'name'  => 'Observacao',
                    'label' => 'Observação',
                    'type'  => 'textarea',
                    'col'   => 4,
                    'rows'  => 2,
                    // Duas condições: precisa de AND explícito. Escrever
                    // ['Categoria'=>'veiculo','Subcategoria'=>'frota'] faria o
                    // runtime avaliar SÓ a primeira chave.
                    'visible_when' => ['AND' => [
                        ['Categoria'    => 'veiculo'],
                        ['Subcategoria' => 'frota'],
                    ]],
                    'hint' => 'Aparece só em Veículo + Frota.',
                ],
            ],
        ],

        [
            'title' => 'Valores',
            'fields' => [
                [
                    'name' => 'Quantidade', 'label' => 'Quantidade', 'type' => 'number',
                    'col' => 3, 'value' => 3, 'min' => 0,
                ],
                [
                    'name' => 'ValorUnitario', 'label' => 'Valor unitário', 'type' => 'number',
                    'col' => 3, 'value' => '149.90', 'step' => '0.01',
                ],
                [
                    'name' => 'PercentualDesconto', 'label' => 'Desconto (%)', 'type' => 'number',
                    'col' => 3, 'value' => 0, 'min' => 0, 'max' => 100,
                ],

                /* Cadeia de cálculo em DOIS wrappers, de propósito: pôr as duas
                   regras no mesmo atributo faria `Subtotal` virar dependência do
                   próprio elemento que o escreve, laço infinito. */
                [
                    'name' => 'Subtotal', 'label' => 'Subtotal', 'type' => 'text',
                    'col' => 3, 'readonly' => true,
                    'computed_when' => [
                        'target'     => 'Subtotal',
                        'expression' => '{Quantidade} * {ValorUnitario}',
                        // Sem formatar, 3 × 149,90 aparece como 449.70000000000005.
                        'format'     => 'br',
                    ],
                ],
                [
                    'name' => 'Total', 'label' => 'Total', 'type' => 'text',
                    'col' => 3, 'readonly' => true,
                    'computed_when' => [
                        'target'     => 'Total',
                        'expression' => '{Subtotal} - ({Subtotal} * {PercentualDesconto} / 100)',
                        // `parse` porque o subtotal agora chega como "449,70".
                        'parse'      => 'br',
                        'format'     => 'br',
                    ],
                ],

                /* Cópia CRUA do subtotal, sem formatação.
                   Motivo: os comparadores numéricos da DSL usam parseFloat, e
                   parseFloat("1.234,56") devolve 1.234: o ponto vira decimal.
                   Um campo formatado serve para MOSTRAR; para COMPARAR, mantenha
                   a versão crua. É barato: um hidden e uma regra. */
                [
                    'name' => 'SubtotalRaw',
                    'type' => 'hidden',
                    'computed_when' => [
                        'target'     => 'SubtotalRaw',
                        'expression' => '{Quantidade} * {ValorUnitario}',
                    ],
                ],

                /* Aprovação exigida acima de um teto. `prevent_submit_when`
                   bloqueia o envio quando os campos listados estiverem vazios. */
                [
                    'name'  => 'Aprovador',
                    'label' => 'Aprovador',
                    'type'  => 'text',
                    'col'   => 4,
                    'visible_when' => ['SubtotalRaw' => ['>' => 1000]],
                    'prevent_submit_when' => [
                        'condition' => ['SubtotalRaw' => ['>' => 1000]],
                        'fields'    => ['Aprovador'],
                        'message'   => 'Pedidos acima de R$ 1.000 exigem aprovador.',
                    ],
                    'hint' => 'Obrigatório acima de R$ 1.000: bloqueia o envio se vazio.',
                ],
            ],
        ],
    ],

    'buttons' => [
        [
            'label' => 'Salvar',
            'type'  => 'submit',
            'class' => 'primary',
            // Duas chaves, UM atributo: data-action-when.
            'enabled_when' => ['Documento' => ['!=' => '']],
        ],
        [
            'label' => 'Excluir',
            'type'  => 'button',
            // Só existe em modo de edição: parâmetro do formulário, não campo.
            'visible_when'   => ['form_param_modo' => 'edicao'],
            'confirm_submit' => [
                'message' => 'Excluir este cadastro? A ação não pode ser desfeita.',
            ],
        ],
    ],
];
