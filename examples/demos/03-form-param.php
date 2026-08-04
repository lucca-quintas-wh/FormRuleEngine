<?php
/**
 * Parâmetro de formulário.
 *
 * A chave `params` vira `<input type="hidden" name="__form_param_<nome>">`.
 * Nas condições você o cita como `form_param_<nome>`: o núcleo procura primeiro
 * o nome exato e depois a versão com os dois underscores.
 *
 * Mudar um deles reavalia TODAS as regras do formulário, não só as dependentes
 *: é o gancho para "esta tela inteira se comporta diferente em modo de edição".
 */

return [
    'name'   => 'formParametros',
    'params' => ['origem' => 'interno'],
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'type' => 'raw', 'col' => 12,
                'visible_when' => ['form_param_origem' => 'externo'],
                'demo_name'    => 'bloco externo',
                'html' => '<p class="hint">Bloco que só existe quando o formulário é aberto de fora.</p>',
            ],
            [
                'name' => 'ResponsavelInterno', 'label' => 'Responsável interno',
                'type' => 'text', 'col' => 6,
                'visible_when' => ['form_param_origem' => 'interno'],
                'demo_name'    => 'bloco interno',
            ],
            [
                'type' => 'raw', 'col' => 12,
                'html' => '<button type="button" id="btnTrocaParam" class="small">'
                        . 'Alternar o parâmetro (interno ⇄ externo)</button>',
            ],
        ],
    ]],
];
