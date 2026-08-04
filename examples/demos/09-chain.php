<?php
/**
 * `chain` aqui NÃO é uma segunda requisição (isso é o fetch_when): é uma lista
 * de ações no formulário, executadas em ordem depois do `map`.
 *
 *   set_value  field + value (fixo) ou path (da resposta)
 *   trigger    dispara um evento num campo — acorda um fetch_when vizinho
 *   refresh    engine.evaluateAll(): reavalia todas as regras
 *
 * Códigos de lead que existem no api.php: 1 e 2.
 */

return [
    'name' => 'formPopulateChain',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'CodigoLead', 'label' => 'Código do lead', 'type' => 'text', 'col' => 4,
                'placeholder' => '1 ou 2',
                'populate_when' => [
                    'event'  => 'blur',
                    'method' => 'POST',
                    'url'    => 'api.php?acao=lead',
                    'data'   => ['cod' => '{value}'],
                    'map'    => [
                        'NomeLead'   => 'razao',
                        'EmailLead'  => 'email',
                        'CidadeLead' => 'cidade',
                        'UfLead'     => 'estado',
                    ],
                    'chain' => [
                        ['action' => 'set_value', 'field' => 'OrigemLead',   'value' => 'importado'],
                        ['action' => 'set_value', 'field' => 'TelefoneLead', 'path'  => 'telefone'],
                        ['action' => 'refresh'],
                    ],
                ],
            ],
            ['name' => 'NomeLead',     'label' => 'Nome',     'type' => 'text', 'col' => 4],
            ['name' => 'EmailLead',    'label' => 'E-mail',   'type' => 'text', 'col' => 4],
            ['name' => 'TelefoneLead', 'label' => 'Telefone', 'type' => 'text', 'col' => 4],
            ['name' => 'CidadeLead',   'label' => 'Cidade',   'type' => 'text', 'col' => 4],
            ['name' => 'UfLead',       'label' => 'UF',       'type' => 'text', 'col' => 2],
            ['name' => 'OrigemLead',   'label' => 'Origem',   'type' => 'text', 'col' => 3, 'readonly' => true],
            [
                'type' => 'raw', 'col' => 12,
                'visible_when' => ['OrigemLead' => 'importado'],
                'demo_name'    => 'aviso de importado',
                'html' => '<p class="hint">Este bloco só aparece depois do <code>chain</code>. '
                        . 'É o <code>refresh</code> que o torna visível sem esperar um novo <code>change</code>.</p>',
            ],
        ],
    ]],
];
