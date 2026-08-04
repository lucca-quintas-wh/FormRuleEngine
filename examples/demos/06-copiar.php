<?php
/**
 * copy_when mora no wrapper do campo de DESTINO e aponta a `source`.
 * Enquanto a condição vale, o destino espelha a origem a cada mudança dela.
 *
 * Repare no `checked_value`: o emissor sempre escreve um value explícito no
 * checkbox. Sem ele o navegador usa "on" e a condição {"...":"S"} nunca casa.
 */

return [
    'name' => 'formCopiar',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            ['name' => 'RazaoSocial', 'label' => 'Razão social', 'type' => 'text', 'col' => 6],
            [
                'name' => 'UsarMesmoNome', 'type' => 'checkbox', 'col' => 6,
                'checkbox_label' => 'Nome fantasia igual à razão social',
                'checked_value'  => 'S',
                'checked'        => true,
            ],
            [
                'name' => 'NomeFantasia', 'label' => 'Nome fantasia', 'type' => 'text', 'col' => 6,
                'copy_when' => [
                    'source'    => 'RazaoSocial',
                    'condition' => ['UsarMesmoNome' => 'S'],
                ],
                'hint' => 'Digite na razão social e veja o espelho. Desmarque a caixa: o destino volta ao valor <strong>original</strong> — o plugin o guarda na primeira avaliação.',
            ],
        ],
    ]],
];
