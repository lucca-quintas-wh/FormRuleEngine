<?php
/**
 * O índice das páginas — fonte única do hub, da navegação anterior/próximo e do
 * <title> de cada uma. Acrescentar uma página é acrescentar uma entrada aqui e
 * um arquivo em views/.
 */

return [

    'grupos' => [
        'fundamentos' => 'Fundamentos',
        'campo'       => 'Campo a campo',
        'servidor'    => 'Servidor',
        'fluxos'      => 'Fluxos',
        'referencia'  => 'Referência',
    ],

    'paginas' => [

        'basico' => [
            'n'      => '00',
            'grupo'  => 'fundamentos',
            'titulo' => 'Começo rápido',
            'resumo' => 'O exemplo mínimo: um formulário sem uma linha de JS próprio.',
            'attrs'  => 'visible · required · disabled · computed',
        ],
        '01-visibilidade' => [
            'n'      => '01',
            'grupo'  => 'fundamentos',
            'titulo' => 'Visibilidade',
            'resumo' => 'Mostrar e esconder campos e seções inteiras, com fade, reserva de espaço e limpeza ao ocultar.',
            'attrs'  => 'visible_when',
        ],
        '02-obrigatorio-desabilitado' => [
            'n'      => '02',
            'grupo'  => 'fundamentos',
            'titulo' => 'Obrigatório e desabilitado',
            'resumo' => 'Alternar obrigatoriedade e habilitação — e a armadilha do wrapper, que derruba todo mundo uma vez.',
            'attrs'  => 'required_when · disabled_when',
        ],
        '03-dsl-condicoes' => [
            'n'      => '03',
            'grupo'  => 'fundamentos',
            'titulo' => 'A DSL de condições',
            'resumo' => 'A gramática inteira, operador por operador, com um laboratório para testar condições ao vivo.',
            'attrs'  => 'AND · OR · eq_field · regex · form_param',
        ],

        '04-rotulo-opcoes' => [
            'n'      => '04',
            'grupo'  => 'campo',
            'titulo' => 'Rótulo e opções',
            'resumo' => 'Trocar o texto do label e o conjunto de <option> conforme o contexto.',
            'attrs'  => 'label_when · options_when',
        ],
        '05-valores-calculados' => [
            'n'      => '05',
            'grupo'  => 'campo',
            'titulo' => 'Valores e cálculos',
            'resumo' => 'Definir valor por template, expressões aritméticas, idade, faixa etária e diferença de datas.',
            'attrs'  => 'set_value_when · computed_when',
        ],
        '06-copiar-travar-reverter' => [
            'n'      => '06',
            'grupo'  => 'campo',
            'titulo' => 'Copiar, travar, reverter',
            'resumo' => 'Espelhar um campo em outro, travar com valor fixo, e desfazer uma escolha proibida na hora.',
            'attrs'  => 'copy_when · lock_when · revert_when',
        ],
        '07-mascara-validacao' => [
            'n'      => '07',
            'grupo'  => 'campo',
            'titulo' => 'Máscara e validação',
            'resumo' => 'Máscara que muda com o tipo de documento e validadores client-side embutidos.',
            'attrs'  => 'mask_when · validate_when',
        ],

        '08-fetch-cascata' => [
            'n'      => '08',
            'grupo'  => 'servidor',
            'titulo' => 'AJAX declarativo',
            'resumo' => 'Busca por CEP, cascata de combos em três níveis, pré-requisitos, encadeamento e tratamento de falha.',
            'attrs'  => 'fetch_when',
        ],
        '09-populate' => [
            'n'      => '09',
            'grupo'  => 'servidor',
            'titulo' => 'Preencher vários campos',
            'resumo' => 'Uma resposta AJAX que espalha valores por meio formulário, com encadeamento pós-resposta.',
            'attrs'  => 'populate_when',
        ],
        '10-validacao-remota' => [
            'n'      => '10',
            'grupo'  => 'servidor',
            'titulo' => 'Validação remota e bloqueio de envio',
            'resumo' => 'Checagem assíncrona que trava o submit, regras de bloqueio por campo vazio e confirmação antes de enviar.',
            'attrs'  => 'remote_validate_when · prevent_submit_when · confirm_submit',
        ],

        '11-botoes-gatilhos' => [
            'n'      => '11',
            'grupo'  => 'fluxos',
            'titulo' => 'Botões e gatilhos',
            'resumo' => 'Visibilidade e habilitação de botões; disparar eventos em outros campos.',
            'attrs'  => 'action_when · trigger_when',
        ],
        '12-sequencia' => [
            'n'      => '12',
            'grupo'  => 'fluxos',
            'titulo' => 'Liberação sequencial',
            'resumo' => 'Uma fila de campos: cada um só libera quando o anterior está preenchido.',
            'attrs'  => 'data-sequence',
        ],
        '13-wizard' => [
            'n'      => '13',
            'grupo'  => 'fluxos',
            'titulo' => 'Wizard multi-etapa',
            'resumo' => 'Seções viram etapas, com stepper, validação por etapa e pulos condicionais.',
            'attrs'  => 'data-step',
        ],
        '14-tabela-dinamica' => [
            'n'      => '14',
            'grupo'  => 'fluxos',
            'titulo' => 'Tabela dinâmica e repeater',
            'resumo' => 'Linhas add/remove com totalizadores e cascata por linha; e regras em linhas criadas depois.',
            'attrs'  => 'dynamic_table · repeater-init',
        ],
        '15-senha' => [
            'n'      => '15',
            'grupo'  => 'fluxos',
            'titulo' => 'Política de senha',
            'resumo' => 'Medidor de força e checklist montados a partir da política que o servidor devolve.',
            'attrs'  => 'password_policy',
        ],
        '16-comportamento-form' => [
            'n'      => '16',
            'grupo'  => 'fluxos',
            'titulo' => 'Comportamento do formulário',
            'resumo' => 'Envio por AJAX e afins — e onde exatamente está a fronteira com o host.',
            'attrs'  => 'behavior_when · submit_handler',
        ],

        '17-casos-completos' => [
            'n'      => '17',
            'grupo'  => 'referencia',
            'titulo' => 'Casos completos',
            'resumo' => 'Quatro formulários inteiros, do jeito que sairiam de um controller de verdade.',
            'attrs'  => 'cadastro · endereço · cotação · wizard',
        ],
        '99-referencia' => [
            'n'      => '99',
            'grupo'  => 'referencia',
            'titulo' => 'Referência completa',
            'resumo' => 'Todos os atributos, todas as chaves de configuração, operadores, ações e armadilhas conhecidas em uma página.',
            'attrs'  => 'cheat sheet',
        ],
    ],
];
