<?php
/**
 * Cascata de três níveis. Cada combo é DESTINO da própria regra:
 * `event: dependency` significa que quem dispara a busca é a mudança das
 * dependências, não um evento do próprio campo.
 *
 * `trigger` diz explicitamente quem acorda a regra. Sem ele, as dependências
 * sairiam dos tokens do corpo, e como o corpo às vezes cita o próprio destino,
 * isso viraria laço infinito.
 *
 * `require` impede a busca sem o filtro e ESVAZIA o destino: deixar a lista
 * anterior no ar mostraria opções de um contexto que não vale mais.
 *
 * `notify: true` faz o destino emitir change ao ser repopulado. É o que acorda
 * o nível seguinte.
 */

return [
    'name' => 'formCascata',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'UfCascata', 'label' => 'Estado', 'type' => 'select', 'col' => 4,
                'placeholder_option' => '.:Escolha:.',
                'fetch_when' => [
                    'event'  => 'load',
                    // Sem isto a busca é abortada: o guarda `skip_empty` (padrão
                    // true) barra a requisição porque o valor do PRÓPRIO campo
                    // está vazio, e num combo que ainda vai ser preenchido ele
                    // está sempre vazio.
                    'skip_empty' => false,
                    'method' => 'GET',
                    'url'    => 'api.php?acao=estados',
                    'map_options' => ['field' => 'UfCascata', 'path' => 'data'],
                ],
            ],
            [
                'name' => 'CidadeCascata', 'label' => 'Cidade', 'type' => 'select', 'col' => 4,
                'placeholder_option' => '.:Escolha:.',
                'disabled_when' => ['UfCascata' => ''],
                'fetch_when' => [
                    'event'   => 'dependency',
                    'trigger' => ['UfCascata'],
                    'require' => ['UfCascata'],
                    'method'  => 'GET',
                    'url'     => 'api.php?acao=cidades',
                    'data'    => ['uf' => '{UfCascata}'],
                    'map_options' => ['field' => 'CidadeCascata', 'path' => 'data', 'notify' => true],
                ],
            ],
            [
                'name' => 'BairroCascata', 'label' => 'Bairro', 'type' => 'select', 'col' => 4,
                'placeholder_option' => '.:Escolha:.',
                'disabled_when' => ['CidadeCascata' => ''],
                'fetch_when' => [
                    'event'   => 'dependency',
                    'trigger' => ['CidadeCascata'],
                    'require' => ['CidadeCascata'],
                    'method'  => 'GET',
                    'url'     => 'api.php?acao=bairros',
                    'data'    => ['cidade' => '{CidadeCascata}'],
                    'map_options' => [
                        'field'  => 'BairroCascata',
                        'path'   => 'data',
                        'notify' => true,
                        // Opções fixas somadas às do servidor.
                        'append' => [['value' => 'outro', 'label' => 'Outro bairro']],
                    ],
                ],
                'hint' => 'Troque o estado depois de escolher tudo: os níveis abaixo são esvaziados, não deixados com a lista velha.',
            ],
        ],
    ]],
];
