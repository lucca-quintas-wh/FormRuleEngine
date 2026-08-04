<?php
/**
 * O exemplo mínimo: um formulário inteiro sem uma linha de JavaScript próprio.
 *
 * Quatro plugins, nenhuma dependência externa, nenhum servidor. Se você só for
 * ler um arquivo desta pasta, leia este.
 */

return [
    'name' => 'formBasico',
    'sections' => [

        [
            'title'  => '1. Visibilidade + obrigatoriedade condicional',
            'fields' => [
                [
                    'name' => 'TipoPessoa', 'label' => 'Tipo de pessoa', 'type' => 'select', 'col' => 4,
                    'options' => ['F' => 'Pessoa física', 'J' => 'Pessoa jurídica'],
                ],
                [
                    'type' => 'group',
                    'visible_when' => ['TipoPessoa' => 'F'],
                    'fields' => [
                        ['name' => 'Cpf', 'label' => 'CPF', 'type' => 'text', 'col' => 4,
                         'required_when' => ['TipoPessoa' => 'F'],
                         'demo_name' => 'CPF'],
                    ],
                ],
                [
                    'type' => 'group',
                    'visible_when' => ['TipoPessoa' => 'J'],
                    'fields' => [
                        ['name' => 'Cnpj', 'label' => 'CNPJ', 'type' => 'text', 'col' => 4,
                         'required_when' => ['TipoPessoa' => 'J'],
                         'demo_name' => 'CNPJ'],
                        ['name' => 'InscEstadual', 'label' => 'Inscrição estadual', 'type' => 'text', 'col' => 4,
                         'demo_name' => 'IE'],
                    ],
                ],
            ],
        ],

        [
            'title'  => '2. Condição composta',
            'fields' => [
                [
                    'name' => 'Uf', 'label' => 'UF', 'type' => 'select', 'col' => 4,
                    'placeholder_option' => 'Selecione…',
                    'options' => ['SP' => 'São Paulo', 'RJ' => 'Rio de Janeiro', 'MG' => 'Minas Gerais'],
                ],
                ['name' => 'Faturamento', 'label' => 'Faturamento anual (R$)', 'type' => 'number', 'col' => 4, 'value' => 0],
                [
                    'name' => 'Regime', 'label' => 'Regime tributário especial', 'type' => 'select', 'col' => 4,
                    'options' => ['LR' => 'Lucro real', 'LP' => 'Lucro presumido'],
                    'visible_when' => ['AND' => [
                        ['Uf'          => ['SP', 'RJ', 'MG']],
                        ['Faturamento' => ['>' => 100000]],
                    ]],
                    'demo_name' => 'regime especial',
                    'hint' => 'Só com UF na lista <em>e</em> faturamento acima de 100.000.',
                ],
            ],
        ],

        [
            'title'  => '3. Campo calculado + habilitação',
            'fields' => [
                ['name' => 'Quantidade',    'label' => 'Quantidade',     'type' => 'number', 'col' => 4, 'value' => 1],
                ['name' => 'ValorUnitario', 'label' => 'Valor unitário', 'type' => 'number', 'col' => 4, 'value' => 100],
                [
                    'name' => 'Total', 'label' => 'Total (calculado)', 'type' => 'text', 'col' => 4, 'readonly' => true,
                    'computed_when' => ['target' => 'Total', 'expression' => '{Quantidade} * {ValorUnitario}'],
                    'hint' => 'A regra nomeia o <code>target</code>: escreve num campo pelo nome, não no elemento onde está.',
                ],
                [
                    'name' => 'Desconto', 'label' => 'Desconto', 'type' => 'number', 'col' => 4,
                    'disabled_when' => ['Total' => ['<' => 500]],
                    'hint' => 'Desabilitado enquanto o total for menor que 500.',
                ],
            ],
        ],
    ],
];
