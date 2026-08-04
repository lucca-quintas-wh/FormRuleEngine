<?php
/**
 * Regras em linhas criadas DEPOIS da carga.
 *
 * A engine monta o mapa de dependências no registro do plugin, varrendo o DOM
 * daquele momento. Uma linha adicionada depois traz atributos data-*-when que
 * ninguém leu, as regras dela simplesmente não existem.
 *
 * O plugin `repeater-init` escuta `ilu:repeater:row-added` (que borbulha até o
 * document) e chama engine.addElement() para cada elemento com regra dentro da
 * linha nova. Aqui a linha é montada por um script da página, para mostrar o
 * contrato do evento.
 */

return [
    'name' => 'formRepeater',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'type' => 'raw', 'col' => 12,
                'html' => '<div id="listaDependentes"></div>'
                        . '<p style="margin-top:12px"><button type="button" id="btnAddDependente">'
                        . '+ Adicionar dependente</button></p>'
                        . '<p class="hint">Cada linha tem um <code>data-visible-when</code> próprio. '
                        . 'Adicione uma e troque o parentesco para "Filho(a)": o campo de idade aparece. '
                        . 'É a prova de que a regra foi registrada depois da carga.</p>',
            ],
        ],
    ]],
];
