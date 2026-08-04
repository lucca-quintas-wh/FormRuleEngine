<?php
/**
 * trigger_when: dispara eventos em OUTROS campos.
 *
 * Serve para acordar um `fetch_when` vizinho depois que um valor é escrito por
 * código, situação em que o `change` natural não acontece.
 *
 * Esteve quebrado: o alvo era resolvido com `findInput(nome)`, que espera um
 * elemento e recebia uma string, e o TypeError subia dentro do handler de
 * change. Hoje a resolução é por `form.querySelector('[name=…]')`.
 */

return [
    'name' => 'formGatilhos',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'Cep', 'label' => 'CEP', 'type' => 'text', 'col' => 4,
                'placeholder' => '01310-100',
                'trigger_when' => [[
                    // Só dispara quando o CEP está completo.
                    'condition' => ['Cep' => ['regex' => '^\\d{5}-?\\d{3}$']],
                    'fire' => [
                        ['field' => 'Municipio', 'event' => 'change'],
                        ['field' => 'Bairro',    'event' => 'change', 'delay' => 50],
                    ],
                ]],
                'hint' => 'Digite <code>01310-100</code>: os dois campos abaixo recebem um <code>change</code>.',
            ],
            ['name' => 'Municipio', 'label' => 'Município', 'type' => 'text', 'col' => 4],
            ['name' => 'Bairro',    'label' => 'Bairro',    'type' => 'text', 'col' => 4],
            [
                'type' => 'raw', 'col' => 12,
                'html' => '<p class="hint" id="contadorGatilhos">nenhum evento recebido ainda</p>',
            ],
        ],
    ]],
];
