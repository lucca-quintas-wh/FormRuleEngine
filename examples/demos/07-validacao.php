<?php
/**
 * validate_when não valida na hora: MARCA o input com a regra que deve valer,
 * gravando data-validate-rule / -params / -message e a classe
 * form-rule-validated. Quem executa é o seu validador de formulário, chamando
 * plugin.validateField(input).
 */

return [
    'name' => 'formValidacao',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'Perfil', 'label' => 'Perfil', 'type' => 'select', 'col' => 4,
                'options' => ['titular' => 'Titular', 'dependente' => 'Dependente'],
            ],
            [
                'name' => 'NascimentoVal', 'label' => 'Data de nascimento', 'type' => 'text', 'col' => 4,
                'value' => '10/05/2015',
                'validate_when' => [
                    ['Perfil' => 'titular', 'rule' => 'idade_minima', 'params' => ['min' => 18],
                     'message' => 'O titular precisa ter 18 anos ou mais.'],
                    ['Perfil' => 'dependente', 'rule' => 'data_futura',
                     'message' => 'Data de nascimento não pode estar no futuro.'],
                ],
            ],
            [
                'name' => 'NomeVal', 'label' => 'Nome completo', 'type' => 'text', 'col' => 4, 'value' => 'Jo',
                'validate_when' => [
                    ['Perfil' => 'titular', 'rule' => 'tamanho_min', 'params' => ['min' => 3],
                     'message' => 'Nome muito curto.'],
                ],
            ],
            [
                'name' => 'Matricula', 'label' => 'Matrícula', 'type' => 'text', 'col' => 4, 'value' => 'ab-12',
                'validate_when' => [
                    ['Perfil' => 'titular', 'rule' => 'regex', 'params' => ['pattern' => '^[A-Z]{3}-[0-9]{4}$'],
                     'message' => 'Use o formato ABC-1234.'],
                ],
            ],
            [
                'name' => 'CpfVal', 'label' => 'CPF (validador customizado)', 'type' => 'text', 'col' => 4,
                'value' => '111.111.111-11',
                'validate_when' => [
                    ['Perfil' => ['titular', 'dependente', 'terceiro'], 'rule' => 'cpf',
                     'message' => 'CPF inválido.'],
                ],
            ],
            [
                'type' => 'raw', 'col' => 12,
                'html' => '<p style="margin-top:14px"><button type="button" id="btnValidar" class="primary">'
                        . 'Validar campos marcados</button></p>'
                        . '<p class="hint">Troque para "Dependente" e valide de novo: as regras mudam, '
                        . 'e a matrícula deixa de ser validada (nenhuma regra casa → as marcações saem do input).</p>',
            ],
        ],
    ]],
];
