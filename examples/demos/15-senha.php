<?php
/**
 * Política de senha.
 *
 * O plugin faz um POST para `source` e monta o checklist a partir da resposta:
 * critério cujo limite é 0 (ou ausente) não entra na lista. Trocar a política é
 * trocar a resposta de uma rota, nenhuma regra de senha fica no JavaScript.
 *
 * O painel é inserido em largura cheia no FIM da grid (o plugin procura um
 * .ilu-form-compact__grid ancestral), e não dentro do wrapper do campo: um
 * wrapper de 3 colunas quebraria o texto em uma palavra por linha.
 */

return [
    'name' => 'formSenha',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'Senha', 'label' => 'Senha', 'type' => 'password', 'col' => 6,
                'password_policy' => [
                    'source'        => 'api.php?acao=politica-senha',
                    'confirm_field' => 'SenhaConf',
                    'meter'         => true,
                    'block_submit'  => true,
                ],
            ],
            ['name' => 'SenhaConf', 'label' => 'Confirme a senha', 'type' => 'password', 'col' => 6],
        ],
    ]],
    'buttons' => [['label' => 'Tentar enviar', 'type' => 'submit', 'class' => 'primary']],
];
