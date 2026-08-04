<?php
/**
 * Wizard: cada seção vira uma etapa.
 *
 * O plugin `step` lê a configuração do VALUE de campos ocultos marcados com
 * data-step-config e data-step-rules: o inverso do `sequence`, que lê o
 * atributo. O emissor cuida da diferença.
 *
 * `skip` usa um formato próprio, mais simples que a DSL: `when` é um mapa
 * campo → LISTA de valores, e a etapa é pulada quando o valor atual está na
 * lista. Não aceita AND/OR nem operadores. Para lógica mais rica, esconda a
 * seção com visible_when: o plugin trata etapa escondida como inexistente.
 */

return [
    'name' => 'formWizard',
    'step_config' => [
        'steps' => [
            ['label' => 'Conta',   'icon' => '①'],
            ['label' => 'Perfil',  'icon' => '②'],
            ['label' => 'Empresa', 'icon' => '③'],
            ['label' => 'Revisão', 'icon' => '④'],
        ],
        'show_stepper' => true,
        'show_nav'     => true,
        'show_submit'  => true,
        'submit_label' => 'Concluir',
        // Avanço automático ao preencher: bom para wizards de um campo por
        // etapa, ruim para o resto.
        'auto_advance' => false,
        'skip' => [
            ['step' => 3, 'when' => ['TipoConta' => ['pessoal']]],
        ],
    ],
    'sections' => [
        [
            'title' => 'Dados de acesso', 'step' => 1,
            'fields' => [
                ['name' => 'EmailAcesso', 'label' => 'E-mail', 'type' => 'email', 'col' => 6, 'required' => true],
                ['name' => 'SenhaWiz',    'label' => 'Senha',  'type' => 'password', 'col' => 6, 'required' => true],
            ],
        ],
        [
            'title' => 'Perfil', 'step' => 2,
            'fields' => [
                [
                    'name' => 'TipoConta', 'label' => 'Tipo de conta', 'type' => 'select', 'col' => 4,
                    'required' => true,
                    'placeholder_option' => 'Selecione…',
                    'options' => ['pessoal' => 'Pessoal', 'empresa' => 'Empresa'],
                    'hint' => 'Escolha "Pessoal" e avance: a etapa 3 é pulada, e também some do stepper.',
                ],
                ['name' => 'NomeWiz', 'label' => 'Nome completo', 'type' => 'text', 'col' => 8, 'required' => true],
            ],
        ],
        [
            'title' => 'Dados da empresa', 'step' => 3,
            'fields' => [
                ['name' => 'RazaoWiz', 'label' => 'Razão social', 'type' => 'text', 'col' => 8, 'required' => true],
                [
                    'name' => 'CnpjWiz', 'label' => 'CNPJ', 'type' => 'text', 'col' => 4, 'required' => true,
                    'mask_when' => [['TipoConta' => 'empresa', 'mask' => '00.000.000/0000-00']],
                ],
            ],
        ],
        [
            'title' => 'Revisão', 'step' => 4,
            'fields' => [
                [
                    'name' => 'Resumo', 'label' => 'Resumo', 'type' => 'text', 'col' => 8, 'readonly' => true,
                    'set_value_when' => ['values' => ['Resumo' => '{NomeWiz} · {EmailAcesso}']],
                ],
                [
                    'name' => 'Aceite', 'type' => 'checkbox', 'col' => 4,
                    'checkbox_label' => 'Li e aceito os termos', 'checked_value' => 'S',
                ],
            ],
        ],
    ],
    /* `data-step-only` funciona inclusive FORA do formulário: o plugin
       re-consulta o documento a cada mudança de etapa. Nasceu de um botão que
       só faz sentido na etapa de dados pessoais. */
    'after_form' =>
        '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">'
      . '<span class="deps" data-step-only="1" data-step-for="formWizard">'
      . 'Fora do &lt;form&gt;, visível só na etapa 1</span>'
      . '<span class="deps" data-step-only="3,4" data-step-for="formWizard">'
      . 'E este, nas etapas 3 e 4</span></div>',
];
