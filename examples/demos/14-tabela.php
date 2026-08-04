<?php
/**
 * Tabela dinâmica.
 *
 * Diferente de todo o resto da pasta, o markup aqui é HTML cru: a tabela é
 * emitida por um renderizador próprio no projeto de origem
 * (Controller::renderDynamicTable), e o que o `dynamic_table` faz é apenas
 * INICIALIZAR o que já está na página. Deixamos o markup à vista porque é ele
 * que documenta o contrato de seletores.
 *
 * Por que a cascata daqui não é o fetch_when: aquele casa campos por `name`, e
 * numa tabela todas as linhas repetem name="planoMulti[]" — a linha 3
 * repopularia o combo da linha 1. As funções desta tabela resolvem sempre
 * dentro da <tr> de origem.
 *
 * E por que não é o repeater: o repeater indexa os nomes (campo0, campo1), e o
 * backend legado lê as linhas como arrays paralelos casados por índice.
 * Preservar o "[]" é requisito de contrato, não detalhe.
 */

$linhaMolde = <<<'HTML'
<template data-dt-row-template>
  <tr class="ilu-dt-row">
    <td>
      <select data-dt-field="operadora" name="operadoraMulti[]">
        <option value="">.:Escolha:.</option>
        <option value="amil">Amil</option>
        <option value="bradesco">Bradesco Saúde</option>
        <option value="sulamerica">SulAmérica</option>
      </select>
    </td>
    <td>
      <select data-dt-field="plano" name="planoMulti[]">
        <option value="">.:Escolha o plano:.</option>
      </select>
    </td>
    <td><input type="number" data-dt-field="vidas" name="QuantMult[]" value="1" min="0"></td>
    <td><input data-dt-field="valor" name="ValorMult[]" value="0,00"></td>
    <td><button type="button" class="small" data-dt-action="remove">✕</button></td>
  </tr>
</template>
HTML;

$configTabela = json_encode([
    'remove_confirm' => 'Remover este item?',
    'totals' => [
        'targets' => ['TotalGeral' => 'valor', 'TotalVidas' => 'vidas'],
        'footer'  => '{vidas} vidas · R$ {valor}',
    ],
    'cascades' => [[
        'trigger'     => ['operadora'],
        'params'      => ['operadora' => 'operadora'],
        'target'      => 'plano',
        'url'         => 'api.php?acao=planos',
        'method'      => 'POST',
        'placeholder' => '.:Escolha o plano:.',
    ]],
], JSON_UNESCAPED_UNICODE);

$tabela = '<div class="ilu-dynamic-table-wrapper" id="tabelaItens_wrapper"'
        . ' data-dynamic-table-config="' . htmlspecialchars($configTabela, ENT_QUOTES, 'UTF-8') . '">'
        . '<table class="ilu-dynamic-table" id="tabelaItens">'
        . '<thead><tr><th style="width:30%">Operadora</th><th style="width:34%">Plano</th>'
        . '<th style="width:12%">Vidas</th><th style="width:18%">Valor</th><th style="width:6%"></th></tr></thead>'
        . '<tbody><tr class="ilu-dt-empty-row"><td colspan="5" class="hint">Nenhum item.</td></tr></tbody>'
        . '<tfoot><tr><td colspan="2">Totais</td>'
        . '<td data-summary-field="vidas" data-summary-type="sum">0</td>'
        . '<td data-summary-field="valor" data-summary-type="sum">0</td><td></td></tr></tfoot>'
        . '</table>'
        . $linhaMolde
        . '<p style="margin-top:14px;display:flex;gap:12px;align-items:center">'
        . '<button type="button" data-dt-action="add">+ Adicionar item</button>'
        . '<span class="totalItens hint"></span></p>'
        . '</div>';

return [
    'name' => 'formTabela',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            /* A regra vai no elemento que CONTÉM o wrapper da tabela.
               O conteúdo do objeto quase não importa — o plugin só aceita uma
               chave `condition` opcional —, mas ele precisa NÃO ser vazio:
               tanto o emissor quanto o FormRuleCompiler pulam a regra com
               `empty()`, e `empty([])` é verdadeiro. Uma regra declarada como
               array vazio é descartada em silêncio. */
            ['type' => 'raw', 'col' => 12, 'dynamic_table' => ['init' => true], 'html' => $tabela],
            ['name' => 'TotalGeral', 'type' => 'hidden'],
            ['name' => 'TotalVidas', 'type' => 'hidden'],
        ],
    ]],
];
