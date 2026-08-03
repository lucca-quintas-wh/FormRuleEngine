<?php
/**
 * Paridade entre o interpretador extraído (src/php/FormRuleCompiler.php) e o
 * trait de origem (reference/php/FormRenderer.php).
 *
 * O trait não roda sozinho — é um trait, e seus métodos citam System, SField*,
 * UiNode, RenderSchema. Mas PHP resolve isso na CHAMADA, não na composição:
 * dá para compor o trait numa classe de teste e exercitar só os métodos do
 * interpretador, que não tocam em nada disso. É o que este harness faz, e é o
 * que permite comparar os dois lado a lado em vez de confiar na leitura.
 */

require __DIR__ . '/../src/php/FormRuleCompiler.php';
require __DIR__ . '/../reference/php/FormRenderer.php';

/** Harness: compõe o trait e supre as duas dependências que ele espera do Controller. */
final class OrigemHarness
{
    use FormRenderer;

    protected function isSequentialArray(array $value): bool
    {
        return $value === [] || array_keys($value) === range(0, count($value) - 1);
    }

    protected function isAssocArray(array $items)
    {
        return array_keys($items) !== range(0, count($items) - 1);
    }

    public function encode($rule): string
    {
        return $this->encodeFormRuleCondition($rule);
    }
}

$origem = new OrigemHarness();

$casos = [
    'igualdade simples'          => ['Tipo' => 'F'],
    'array = pertence a'         => ['Uf' => ['SP', 'RJ']],
    'operador explícito'         => ['Status' => ['!=' => 'C']],
    'alias = vira eq'            => ['Status' => ['=' => 'A']],
    'alias <> vira !='           => ['Status' => ['<>' => 'A']],
    'alias neq vira !='          => ['Status' => ['neq' => 'A']],
    'alias == vira eq'           => ['Status' => ['==' => 'A']],
    'operador numérico'          => ['Valor' => ['>' => 100]],
    'par posicional'             => ['Valor' => ['>=', 50]],
    'trinca posicional'          => ['Valor', '>', 10],
    'forma verbosa'              => ['field' => 'Valor', 'op' => '<', 'value' => 7],
    'forma verbosa c/ operator'  => ['field' => 'Valor', 'operator' => '<>', 'value' => 7],
    'AND explícito'              => ['AND' => [['A' => '1'], ['B' => '2']]],
    'OR explícito'               => ['OR' => [['A' => '1'], ['B' => '2']]],
    'lista = AND implícito'      => [['A' => '1'], ['B' => '2']],
    'aninhado AND dentro de OR'  => ['OR' => [['A' => '1'], ['AND' => [['B' => '2'], ['C' => '3']]]]],
    'form_param'                 => ['form_param_origem' => 'externo'],
    'eq_field entre campos'      => ['Confirmacao' => ['eq_field' => 'Senha']],
    'regex'                      => ['Cep' => ['regex' => '^\\d{5}-\\d{3}$']],
    'condição vazia'             => [],
    'acento (JSON_UNESCAPED)'    => ['Situacao' => 'Não informado'],
    'barra (não escapada)'       => ['Rota' => 'a/b'],
];

$falhas = 0;
$total  = 0;

foreach ($casos as $nome => $entrada) {
    $total++;
    $esperado = $origem->encode($entrada);
    $obtido   = FormRuleCompiler::encode($entrada);

    if ($esperado === $obtido) {
        printf("  ok   | %-28s %s\n", $nome, $obtido);
        continue;
    }

    $falhas++;
    printf(" FALHA | %-28s\n         origem  : %s\n         extraído: %s\n", $nome, $esperado, $obtido);
}

// A geração do atributo HTML é nova (o trait emite via .phtml), então aqui a
// checagem é de contrato, não de paridade: o valor tem de sobreviver ao parser
// HTML e voltar como JSON válido.
$total++;
$attr = FormRuleCompiler::atributos(['visible_when' => ['Obs' => "d'Ávila"]]);
if (strpos($attr, "d&#39;Ávila") !== false && strpos($attr, ' data-visible-when=') === 0) {
    printf("  ok   | %-28s %s\n", 'apóstrofo vira entidade', trim($attr));
} else {
    $falhas++;
    printf(" FALHA | %-28s %s\n", 'apóstrofo vira entidade', $attr);
}

$total++;
$attr = FormRuleCompiler::atributos([
    'visible_when'   => ['A' => '1'],
    'set_value_when' => ['values' => ['B' => 'X'], 'condition' => ['A' => '1']],
]);
// set_value_when NÃO pode ser normalizado: 'values' viraria nome de campo.
if (strpos($attr, '"values":{"B":"X"}') !== false && strpos($attr, 'data-set-value-when=') !== false) {
    printf("  ok   | %-28s\n", 'regra-objeto não normalizada');
} else {
    $falhas++;
    printf(" FALHA | %-28s %s\n", 'regra-objeto não normalizada', $attr);
}

printf("\n%d/%d passaram\n", $total - $falhas, $total);
exit($falhas > 0 ? 1 : 0);
