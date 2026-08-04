<?php
/**
 * Cotação, fluxo guiado.
 *
 *   sequence   liberação progressiva: cada campo espera o anterior
 *   lock_when  força um valor e tranca o campo
 *   revert_when desfaz uma escolha proibida na hora, com mensagem
 *   computed_when (age / age_band) idade e faixa etária a partir da data
 *
 * É o formulário que mais parece com a tela real que originou a engine: um
 * cotador em que a ordem de preenchimento importa e trocar de trilho depois de
 * começar precisa ser recusado.
 */

return [
    'name'   => 'formCotacao',
    'action' => 'api.php?acao=salvar',
    'method' => 'post',

    /* Config do plugin `sequence`. Vira um hidden com data-sequence-config.
       Diferente do wizard: aqui NADA é escondido, todos os campos ficam
       visíveis, e só o próximo da fila fica habilitado. */
    'sequence_config' => [
        'clear_downstream' => true,
        'warn_on_empty'    => 'Selecione uma opção para continuar.',
        'always_enabled'   => ['QtdVidas'],
    ],

    'sections' => [

        [
            'title'       => 'Fila de preenchimento',
            'description' => 'Os números em <code>data-sequence</code> definem a ordem. Um campo só libera quando todos os anteriores <em>aplicáveis</em> estão preenchidos; ao mudar um passo, os posteriores são limpos.',
            'fields' => [
                [
                    'name'     => 'EstadoCot',
                    'label'    => 'Estado',
                    'type'     => 'select',
                    'col'      => 4,
                    'sequence' => 1,
                    'placeholder_option' => '.:Escolha:.',
                    'options'  => ['SP' => 'São Paulo', 'RJ' => 'Rio de Janeiro', 'MG' => 'Minas Gerais'],
                ],
                [
                    'name'     => 'CidadeCot',
                    'label'    => 'Cidade',
                    'type'     => 'select',
                    'col'      => 4,
                    'sequence' => 2,
                    'placeholder_option' => '.:Escolha:.',
                    'options_when' => [
                        'depends_on' => 'EstadoCot',
                        'options'    => [
                            'SP' => ['sp' => 'São Paulo', 'cps' => 'Campinas', 'sts' => 'Santos'],
                            'RJ' => ['rio' => 'Rio de Janeiro', 'nit' => 'Niterói'],
                            'MG' => ['bh' => 'Belo Horizonte', 'udi' => 'Uberlândia'],
                        ],
                    ],
                ],
                [
                    'name'     => 'TipoPlano',
                    'label'    => 'Tipo de plano',
                    'type'     => 'select',
                    'col'      => 4,
                    'sequence' => 3,
                    'placeholder_option' => '.:Escolha:.',
                    'options'  => [
                        '1' => 'Coletivo empresarial',
                        '2' => 'Individual',
                        '3' => 'Adesão',
                    ],

                    /* Recusa a troca depois que a cotação já tem itens.
                       `remember_in` guarda a escolha aceita; `restore_from`
                       diz de onde vem o valor de volta. */
                    'revert_when' => [[
                        'condition' => ['AND' => [
                            ['TipoPlanoDefinido' => ['!=' => '']],
                            ['TipoPlano'         => ['neq_field' => 'TipoPlanoDefinido']],
                            ['ItensIncluidos'    => ['>' => 0]],
                        ]],
                        'restore_from' => 'TipoPlanoDefinido',
                        'remember_in'  => 'TipoPlanoDefinido',
                        'message_map'  => [
                            '1' => 'Já existe um Coletivo Empresarial cotado. Remova os itens antes de trocar.',
                            '2' => 'Já existe um plano Individual cotado. Remova os itens antes de trocar.',
                            '3' => 'Já existe um plano por Adesão cotado. Remova os itens antes de trocar.',
                        ],
                    ]],
                ],

                /* Participa da fila SÓ em plano coletivo. Fora disso continua
                   visível e travado, e a fila segue para o próximo. É o que
                   `sequence_when` faz, e é diferente de `visible_when`. */
                [
                    'name'          => 'Cnpj',
                    'label'         => 'CNPJ da empresa',
                    'type'          => 'text',
                    'col'           => 4,
                    'sequence'      => 4,
                    'sequence_when' => ['TipoPlano' => '1'],
                    'placeholder'   => 'obrigatório só no coletivo',
                ],
                [
                    'name'     => 'NascimentoCot',
                    'label'    => 'Data de nascimento do titular',
                    'type'     => 'text',
                    'col'      => 4,
                    'sequence' => 5,
                    'placeholder' => 'dd/mm/aaaa',
                    'computed_when' => [
                        ['target' => 'IdadeCot', 'type' => 'age',      'source' => 'NascimentoCot'],
                        ['target' => 'FaixaCot', 'type' => 'age_band', 'source' => 'NascimentoCot'],
                    ],
                ],
                [
                    'name'     => 'IdadeCot',
                    'label'    => 'Idade',
                    'type'     => 'text',
                    'col'      => 2,
                    'readonly' => true,
                ],

                /* Sem a chave `bands`, as faixas saem das PRÓPRIAS opções deste
                   campo: o valor "24.28" é o intervalo. Trocar a tabela de
                   faixas é trocar as opções, nenhuma linha de JS muda.

                   `sequence_keep` protege o valor: quem o preenche é a regra de
                   cálculo, não o usuário, e sem essa marca a limpeza a jusante
                   apagaria logo em seguida o que acabou de ser escrito. */
                [
                    'name'          => 'FaixaCot',
                    'label'         => 'Faixa etária',
                    'type'          => 'select',
                    'col'           => 6,
                    'sequence'      => 6,
                    'sequence_keep' => true,
                    'placeholder_option' => '.:Escolha:.',
                    'options' => [
                        '0.18'   => '0 a 18 anos',
                        '19.23'  => '19 a 23 anos',
                        '24.28'  => '24 a 28 anos',
                        '29.33'  => '29 a 33 anos',
                        '34.38'  => '34 a 38 anos',
                        '39.43'  => '39 a 43 anos',
                        '44.48'  => '44 a 48 anos',
                        '49.53'  => '49 a 53 anos',
                        '54.58'  => '54 a 58 anos',
                        '59.199' => '59 anos ou mais',
                    ],
                ],

                /* Fora da fila: `always_enabled` no sequence_config o mantém
                   liberado o tempo todo. */
                [
                    'name'  => 'QtdVidas',
                    'label' => 'Quantidade de vidas',
                    'type'  => 'number',
                    'col'   => 4,
                    'value' => 1,
                    'min'   => 1,
                    'hint'  => 'Fora da fila (<code>always_enabled</code>): editável a qualquer momento.',
                ],

                // Estado auxiliar da regra de reversão.
                ['name' => 'TipoPlanoDefinido', 'type' => 'hidden'],
                ['name' => 'ItensIncluidos',    'type' => 'hidden', 'value' => 0],
            ],
        ],

        [
            'title'       => 'Travar campo sob condição',
            'description' => '<code>lock_when</code> age pelo <code>target</code>: o atributo pode morar em qualquer wrapper: aqui, num campo escondido.',
            'fields' => [
                [
                    'name'    => 'Rural',
                    'label'   => 'Produtor rural?',
                    'type'    => 'select',
                    'col'     => 4,
                    'options' => ['N' => 'Não', 'S' => 'Sim'],
                ],
                [
                    'name'    => 'TipoPessoaCot',
                    'label'   => 'Tipo de pessoa',
                    'type'    => 'select',
                    'col'     => 4,
                    'options' => ['F' => 'Pessoa física', 'J' => 'Pessoa jurídica'],
                    'wrapper_class' => 'ilu-form-field',
                    'hint'    => 'Marque "produtor rural" e veja o campo ser forçado para física e trancado.',
                ],
                [
                    'name' => 'AncoraLock',
                    'type' => 'hidden',
                    'lock_when' => [
                        'target'            => 'TipoPessoaCot',
                        'value'             => 'F',
                        'restore_on_unlock' => true,
                        'condition'         => ['Rural' => 'S'],
                    ],
                ],
            ],
        ],
    ],

    'buttons' => [
        ['label' => 'Cotar', 'type' => 'submit', 'class' => 'primary',
         'enabled_when' => ['FaixaCot' => ['!=' => '']]],
    ],
];
