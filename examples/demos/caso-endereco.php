<?php
/**
 * Endereço e dados da empresa — as regras que falam com o servidor.
 *
 *   fetch_when            busca por CEP e cascata de combos em três níveis
 *   populate_when         uma resposta preenchendo meio formulário
 *   remote_validate_when  checagem assíncrona que trava o envio
 *
 * Todas conversam com `api.php` de verdade — nada de mock em memória aqui.
 * Abra o painel de rede do navegador enquanto mexe nos campos.
 */

return [
    'name'   => 'formEndereco',
    'action' => 'api.php?acao=salvar',
    'method' => 'post',

    'sections' => [

        [
            'title'       => 'Busca por CEP',
            'description' => 'CEPs que existem no <code>api.php</code>: <code>01310-100</code>, <code>20040-020</code>, <code>30130-010</code>.',
            'fields' => [
                [
                    'name'  => 'Cep',
                    'label' => 'CEP',
                    'type'  => 'text',
                    'col'   => 3,
                    'placeholder' => '00000-000',

                    /* A regra mora no campo que DISPARA a busca. `sanitize` tira
                       a máscara antes de mandar; `map` distribui a resposta;
                       `clear_on_fail` apaga o que ficou de uma busca anterior. */
                    'fetch_when' => [
                        'event'    => 'blur',
                        'method'   => 'GET',
                        'url'      => 'api.php?acao=cep',
                        'data'     => ['cep' => '{value}'],
                        'sanitize' => 'digits',
                        'map'      => [
                            'Logradouro' => 'logradouro',
                            'Bairro'     => 'bairro',
                            'Municipio'  => 'cidade',
                            'Uf'         => 'uf',
                        ],
                        'clear_on_fail' => ['Logradouro', 'Bairro', 'Municipio', 'Uf'],
                        'message_fail'  => 'CEP não encontrado.',
                        // Só limpa o campo e sai, sem bater no servidor.
                        'on_empty' => [
                            ['clear' => ['Logradouro', 'Bairro', 'Municipio', 'Uf']],
                        ],
                    ],
                    'hint' => 'Saia do campo (blur) para disparar a busca.',
                ],
                ['name' => 'Logradouro', 'label' => 'Logradouro', 'type' => 'text', 'col' => 6],
                ['name' => 'Numero',     'label' => 'Número',     'type' => 'text', 'col' => 3],
                ['name' => 'Bairro',     'label' => 'Bairro',     'type' => 'text', 'col' => 4],
                ['name' => 'Municipio',  'label' => 'Município',  'type' => 'text', 'col' => 5],
                ['name' => 'Uf',         'label' => 'UF',         'type' => 'text', 'col' => 3],
            ],
        ],

        [
            'title'       => 'Cascata de combos',
            'description' => 'Cada combo é <em>destino</em> da própria regra: <code>event: "dependency"</code> significa que quem dispara a busca é a mudança das dependências, não um evento do próprio campo.',
            'fields' => [

                /* Nível 0: carrega sozinho ao abrir a tela.
                   `event: "load"` executa uma vez, na inicialização. */
                [
                    'name'  => 'UfCascata',
                    'label' => 'Estado',
                    'type'  => 'select',
                    'col'   => 4,
                    'placeholder_option' => '.:Escolha:.',
                    'fetch_when' => [
                        'event'  => 'load',
                        // Sem isto a busca é abortada: o guarda `skip_empty`
                        // (padrão true) barra a requisição porque o VALOR do
                        // próprio campo está vazio — e num combo que ainda vai
                        // ser preenchido ele está sempre vazio.
                        'skip_empty' => false,
                        'method' => 'GET',
                        'url'    => 'api.php?acao=estados',
                        'map_options' => [
                            'field'         => 'UfCascata',
                            'path'          => 'data',
                            'value_key'     => 'VALUE',
                            'label_key'     => 'DISPLAY',
                            'include_empty' => true,
                        ],
                    ],
                ],

                /* Nível 1. `trigger` diz explicitamente quem acorda esta regra.
                   Sem ele, as dependências sairiam dos tokens do corpo — e como
                   o corpo cita o próprio destino em cascatas mais complexas,
                   isso viraria laço infinito. `require` impede a busca sem o
                   filtro e ESVAZIA o destino, para não sobrar lista velha. */
                [
                    'name'  => 'CidadeCascata',
                    'label' => 'Cidade',
                    'type'  => 'select',
                    'col'   => 4,
                    'placeholder_option' => '.:Escolha:.',
                    'disabled_when' => ['UfCascata' => ''],
                    'fetch_when' => [
                        'event'   => 'dependency',
                        'trigger' => ['UfCascata'],
                        'require' => ['UfCascata'],
                        'method'  => 'GET',
                        'url'     => 'api.php?acao=cidades',
                        'data'    => ['uf' => '{UfCascata}'],
                        'map_options' => [
                            'field'  => 'CidadeCascata',
                            'path'   => 'data',
                            // `notify` faz o destino emitir change ao ser
                            // repopulado — é o que acorda o nível seguinte.
                            'notify' => true,
                        ],
                    ],
                ],

                /* Nível 2 — só existe porque o nível 1 avisou. */
                [
                    'name'  => 'BairroCascata',
                    'label' => 'Bairro',
                    'type'  => 'select',
                    'col'   => 4,
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
                            'append' => [
                                ['value' => 'outro', 'label' => 'Outro bairro'],
                            ],
                        ],
                    ],
                ],
            ],
        ],

        [
            'title'       => 'Preencher vários campos de uma vez',
            'description' => 'CNPJs que existem: <code>11.222.333/0001-81</code> e <code>99.888.777/0001-66</code>.',
            'fields' => [
                [
                    'name'  => 'CnpjBusca',
                    'label' => 'CNPJ',
                    'type'  => 'text',
                    'col'   => 4,
                    'placeholder' => '00.000.000/0000-00',

                    /* populate_when é o irmão do fetch_when para o caso "uma
                       resposta, muitos campos". A diferença prática: ele não
                       tem map_options nem cascata — só `map` e `chain`. */
                    'populate_when' => [
                        'event'  => 'blur',
                        'method' => 'POST',
                        'url'    => 'api.php?acao=cnpj',
                        'data'   => ['cnpj' => '{value}'],
                        'map'    => [
                            'RazaoSocialEmpresa' => 'razao',
                            'FantasiaEmpresa'    => 'fantasia',
                            'EmailEmpresa'       => 'email',
                            'AberturaEmpresa'    => 'abertura',
                            'PorteEmpresa'       => 'porte',
                        ],
                        // Depois de preencher, encadeia ações no formulário.
                        'chain' => [
                            ['action' => 'set_value', 'field' => 'OrigemDados', 'value' => 'receita'],
                            ['action' => 'refresh'],
                        ],
                    ],
                ],
                ['name' => 'RazaoSocialEmpresa', 'label' => 'Razão social', 'type' => 'text', 'col' => 8],
                ['name' => 'FantasiaEmpresa',    'label' => 'Nome fantasia', 'type' => 'text', 'col' => 4],
                ['name' => 'AberturaEmpresa',    'label' => 'Abertura',      'type' => 'text', 'col' => 4],
                ['name' => 'PorteEmpresa',       'label' => 'Porte',         'type' => 'text', 'col' => 4],
                ['name' => 'OrigemDados',        'type' => 'hidden'],

                /* Validação remota: o resultado é registrado no engine e
                   BLOQUEIA o envio enquanto estiver inválido. E-mails já em
                   uso na api.php: joao@exemplo.com, maria@exemplo.com,
                   admin@exemplo.com. */
                [
                    'name'  => 'EmailEmpresa',
                    'label' => 'E-mail',
                    'type'  => 'email',
                    'col'   => 6,
                    'remote_validate_when' => [
                        'event'        => 'blur',
                        'method'       => 'POST',
                        'url'          => 'api.php?acao=valida-email',
                        'data'         => ['value' => '{value}'],
                        'valid_path'   => 'valid',
                        'message_path' => 'message',
                        'debounce'     => 250,
                        'message_fail' => 'Não foi possível validar o e-mail agora.',
                    ],
                    'hint' => 'Tente <code>joao@exemplo.com</code> para ver a recusa.',
                ],
                [
                    'name'  => 'CpfPipe',
                    'label' => 'CPF (rota no formato legado "mensagem|codigo")',
                    'type'  => 'text',
                    'col'   => 6,
                    'placeholder' => '000.000.000-00',
                    'remote_validate_when' => [
                        'event'         => 'blur',
                        'method'        => 'POST',
                        'url'           => 'api.php?acao=valida-cpf-pipe',
                        'data'          => ['value' => '{value}'],
                        'data_type'     => 'text',
                        'response_type' => 'pipe',
                        // Índices dentro do texto separado por "|".
                        'valid_path'    => '1',
                        'message_path'  => '0',
                    ],
                    'hint' => 'Use <code>111.111.111-11</code> para ver a recusa.',
                ],
            ],
        ],
    ],

    'buttons' => [
        ['label' => 'Salvar', 'type' => 'submit', 'class' => 'primary'],
    ],
];
