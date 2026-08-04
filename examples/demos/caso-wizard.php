<?php
/**
 * Wizard multi-etapa + política de senha.
 *
 *   step             cada seção vira uma etapa, com stepper, progresso,
 *                    validação por etapa e pulo condicional
 *   password_policy  medidor de força e checklist montados a partir da
 *                    política que o servidor devolve
 *
 * NÃO confundir `step` com `sequence` (ver forms/cotacao.php): lá nada é
 * escondido e a liberação é campo a campo; aqui é uma seção por vez.
 */

return [
    'name'   => 'formWizard',
    'action' => 'api.php?acao=salvar',
    'method' => 'post',

    /* O plugin lê esta configuração do VALUE de um hidden marcado com
       data-step-config (e as regras de pulo de outro, data-step-rules). */
    'step_config' => [
        'steps' => [
            ['label' => 'Conta',    'icon' => '①'],
            ['label' => 'Perfil',   'icon' => '②'],
            ['label' => 'Empresa',  'icon' => '③'],
            ['label' => 'Revisão',  'icon' => '④'],
        ],
        'show_stepper' => true,
        'show_nav'     => true,
        'show_submit'  => true,
        'submit_label' => 'Concluir cadastro',
        // Avanço automático ao preencher, desligado aqui porque atrapalha
        // formulários com mais de um campo por etapa.
        'auto_advance' => false,

        /* Pulo condicional. `when` é um mapa campo → LISTA de valores; a etapa
           é pulada quando o valor atual está na lista. É um formato próprio do
           plugin `step`, mais simples que a DSL, não aceita AND/OR. */
        'skip' => [
            ['step' => 3, 'when' => ['TipoConta' => ['pessoal']]],
        ],
    ],

    'sections' => [

        [
            'title' => 'Dados de acesso',
            'step'  => 1,
            'fields' => [
                [
                    'name'  => 'EmailAcesso',
                    'label' => 'E-mail',
                    'type'  => 'email',
                    'col'   => 6,
                    'required' => true,
                ],
                [
                    'name'  => 'Senha',
                    'label' => 'Senha',
                    'type'  => 'password',
                    'col'   => 3,
                    'required' => true,
                    /* O painel é injetado pelo plugin logo abaixo, em largura
                       cheia dentro da grid, por isso o campo pode ser estreito
                       sem espremer o checklist. */
                    'password_policy' => [
                        'source'        => 'api.php?acao=politica-senha',
                        'confirm_field' => 'SenhaConf',
                        'meter'         => true,
                        'block_submit'  => true,
                    ],
                ],
                [
                    'name'  => 'SenhaConf',
                    'label' => 'Confirme a senha',
                    'type'  => 'password',
                    'col'   => 3,
                    'required' => true,
                ],
            ],
        ],

        [
            'title' => 'Perfil',
            'step'  => 2,
            'fields' => [
                [
                    'name'    => 'TipoConta',
                    'label'   => 'Tipo de conta',
                    'type'    => 'select',
                    'col'     => 4,
                    'options' => ['pessoal' => 'Pessoal', 'empresa' => 'Empresa'],
                    'hint'    => 'Escolha "Pessoal" e avance: a etapa 3 é pulada.',
                    'required' => true,
                ],
                [
                    'name'  => 'NomeCompletoWiz',
                    'label' => 'Nome completo',
                    'type'  => 'text',
                    'col'   => 8,
                    'required' => true,
                ],
                [
                    'name'  => 'Telefone',
                    'label' => 'Telefone',
                    'type'  => 'text',
                    'col'   => 4,
                    'placeholder' => '(00) 00000-0000',
                    'mask_when' => [
                        ['TipoConta' => 'pessoal', 'mask' => '(00) 00000-0000'],
                        ['TipoConta' => 'empresa', 'mask' => '(00) 0000-0000'],
                    ],
                ],
            ],
        ],

        [
            'title' => 'Dados da empresa',
            'step'  => 3,
            'fields' => [
                [
                    'name'  => 'RazaoWiz',
                    'label' => 'Razão social',
                    'type'  => 'text',
                    'col'   => 8,
                    'required' => true,
                ],
                [
                    'name'  => 'CnpjWiz',
                    'label' => 'CNPJ',
                    'type'  => 'text',
                    'col'   => 4,
                    'required' => true,
                    'mask_when' => [['TipoConta' => 'empresa', 'mask' => '00.000.000/0000-00']],
                ],
                [
                    'name'    => 'Funcionarios',
                    'label'   => 'Nº de funcionários',
                    'type'    => 'select',
                    'col'     => 4,
                    'options' => ['1-10' => '1 a 10', '11-50' => '11 a 50', '51+' => 'mais de 50'],
                ],
            ],
        ],

        [
            'title' => 'Revisão',
            'step'  => 4,
            'fields' => [
                [
                    'name'     => 'ResumoConta',
                    'label'    => 'Conta',
                    'type'     => 'text',
                    'col'      => 6,
                    'readonly' => true,
                    'set_value_when' => [
                        'values' => ['ResumoConta' => '{NomeCompletoWiz} · {EmailAcesso}'],
                    ],
                ],
                [
                    'name'     => 'ResumoEmpresa',
                    'label'    => 'Empresa',
                    'type'     => 'text',
                    'col'      => 6,
                    'readonly' => true,
                    'visible_when'   => ['TipoConta' => 'empresa'],
                    'set_value_when' => [
                        'condition' => ['TipoConta' => 'empresa'],
                        'values'    => ['ResumoEmpresa' => '{RazaoWiz} ({CnpjWiz})'],
                    ],
                ],
                [
                    'name'           => 'AceiteTermos',
                    'type'           => 'checkbox',
                    'col'            => 12,
                    'checkbox_label' => 'Li e aceito os termos de uso',
                ],
            ],
        ],
    ],

    /* Sem botões declarados aqui: o plugin `step` cria a própria barra de
       navegação (Anterior / info / Próximo / Salvar) quando não encontra
       controles marcados com data-step-prev, data-step-next ou
       data-step-submit. Para trazer os seus, declare botões com
       'step_role' => 'prev' | 'next' | 'submit'. */
];
