<?php
/**
 * Opções dependentes de outro campo — o formato mais direto do `options_when`.
 *
 * `depends_on` aponta o campo pai; `options` é um dicionário
 * "valor do pai → conjunto de opções", e cada conjunto é um mapa valor: rótulo.
 *
 * `placeholder_option` vira o atributo `data-placeholder` no <select>, que faz o
 * plugin recriar a opção vazia no topo a cada reconstrução.
 */

return [
    'name' => 'formOpcoes',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'Categoria', 'label' => 'Categoria', 'type' => 'select', 'col' => 5,
                'placeholder_option' => '.:Escolha:.',
                'options' => ['veiculo' => 'Veículo', 'imovel' => 'Imóvel', 'vida' => 'Vida'],
            ],
            [
                'name' => 'Subcategoria', 'label' => 'Subcategoria', 'type' => 'select', 'col' => 5,
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
        ],
    ]],
];
