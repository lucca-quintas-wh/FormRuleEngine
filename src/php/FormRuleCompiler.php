<?php
/**
 * FormRuleCompiler — o lado servidor da Form Rule Engine.
 *
 * Traduz config declarativa PHP nos atributos `data-*-when` que o runtime JS lê.
 * É o "interpretador": aceita as várias formas soltas que um autor escreve e
 * normaliza para o único JSON canônico que a engine entende.
 *
 * Extraído do trait FormRenderer do CRM de origem (ver reference/php/FormRenderer.php),
 * preservando a semântica método a método. Diferença: aqui não há dependência
 * nenhuma de framework — nem Controller, nem View, nem SField. É PHP puro, sem
 * estado, e roda em qualquer projeto.
 *
 * @see reference/php/FormRenderer.php  o original, com o resto do render
 */
final class FormRuleCompiler
{
    /**
     * Regras que são CONDIÇÃO pura e passam pelo normalizador.
     * A chave é o nome no config; o valor, o atributo data-* gerado.
     */
    private const REGRAS_CONDICAO = [
        'visible_when'  => 'visible',
        'required_when' => 'required',
        'disabled_when' => 'disabled',
        'label_when'    => 'label',
        'enabled_when'  => 'enabled',
    ];

    /**
     * Regras que carregam um OBJETO mais rico (a condição é uma chave interna,
     * ao lado de target/values/route/...). Vão para o JSON como estão.
     *
     * A distinção não é cosmética: normalizar estas quebraria a estrutura que o
     * plugin espera — `set_value_when` tem `values` + `condition`, e tratar o
     * objeto inteiro como condição transformaria `values` num nome de campo.
     */
    private const REGRAS_OBJETO = [
        'options_when'         => 'options',
        'mask_when'            => 'mask',
        'validate_when'        => 'validate',
        'fetch_when'           => 'fetch',
        'remote_validate_when' => 'remote-validate',
        'set_value_when'       => 'set-value',
        'computed_when'        => 'computed',
        'lock_when'            => 'lock',
        'prevent_submit_when'  => 'prevent-submit',
        'populate_when'        => 'populate',
        'revert_when'          => 'revert',
        'copy_when'            => 'copy',
        'trigger_when'         => 'trigger',
        'confirm_submit'       => 'confirm-submit',
        'dynamic_table'        => 'dynamic-table',
        'password_policy'      => 'password',
    ];

    /**
     * Compila as regras de um campo/seção/botão em atributos HTML prontos.
     *
     * @param  array $config  o campo declarativo (['name'=>..,'visible_when'=>..])
     * @return string  ex.: ` data-visible-when='{"Tipo":"F"}'`  (vazio se não há regra)
     */
    public static function atributos(array $config): string
    {
        $html = '';

        foreach (self::REGRAS_CONDICAO as $chave => $attr) {
            if (empty($config[$chave])) {
                continue;
            }
            $html .= sprintf(' data-%s-when=\'%s\'', $attr, self::escapar(self::encode($config[$chave])));
        }

        foreach (self::REGRAS_OBJETO as $chave => $attr) {
            if (empty($config[$chave])) {
                continue;
            }
            $json = json_encode($config[$chave], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $html .= sprintf(' data-%s-when=\'%s\'', $attr, self::escapar($json === false ? '{}' : $json));
        }

        return $html;
    }

    /**
     * Normaliza uma condição e devolve o JSON canônico.
     */
    public static function encode($rule): string
    {
        $json = json_encode(self::normalize($rule), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return $json === false ? '{}' : $json;
    }

    /**
     * O coração do interpretador: aceita as formas que o autor escreve e devolve
     * a forma que o JS lê.
     *
     *   ['field'=>'A','op'=>'>','value'=>10]  →  ['A' => ['>' => 10]]
     *   ['A', '>', 10]                        →  ['A' => ['>' => 10]]
     *   [cond, cond]                          →  ['AND' => [cond, cond]]   (sequencial = AND implícito)
     *   ['A' => ['>', 10]]                    →  ['A' => ['>' => 10]]
     *   ['A' => 'S']                          →  inalterado
     *
     * @return mixed
     */
    public static function normalize($rule)
    {
        if (!is_array($rule)) {
            return $rule;
        }

        // Forma verbosa: ['field' => .., 'op' => .., 'value' => ..]
        if (isset($rule['field']) && array_key_exists('value', $rule)) {
            $operator = self::normalizeOperator($rule['op'] ?? ($rule['operator'] ?? 'eq'));

            return [(string) $rule['field'] => [$operator => $rule['value']]];
        }

        // Trinca posicional: ['Campo', '>', 10]
        if (
            array_key_exists(0, $rule)
            && array_key_exists(1, $rule)
            && array_key_exists(2, $rule)
            && count($rule) === 3
            && is_scalar($rule[0])
            && is_scalar($rule[1])
        ) {
            return [(string) $rule[0] => [self::normalizeOperator($rule[1]) => $rule[2]]];
        }

        // Lista de condições = AND implícito. Note que isto é uma capacidade do
        // COMPILADOR, não do runtime: o JS só avalia a primeira chave de um
        // objeto, então o AND precisa ser explicitado aqui.
        if (self::ehSequencial($rule)) {
            return ['AND' => array_map([self::class, 'normalize'], $rule)];
        }

        $normalized = [];
        foreach ($rule as $field => $value) {
            if ($field === 'AND' || $field === 'OR') {
                $conditions = is_array($value) ? $value : [];
                $normalized[$field] = array_map([self::class, 'normalize'], $conditions);
                continue;
            }

            // ['Campo' => ['>', 10]]
            if (is_array($value) && array_key_exists(0, $value) && array_key_exists(1, $value) && count($value) === 2) {
                $normalized[$field] = [self::normalizeOperator($value[0]) => $value[1]];
                continue;
            }

            // ['Campo' => ['>' => 10]] — só normaliza o nome do operador
            if (is_array($value) && count($value) === 1) {
                $operator = array_key_first($value);
                if (is_string($operator)) {
                    $normalized[$field] = [self::normalizeOperator($operator) => $value[$operator]];
                    continue;
                }
            }

            $normalized[$field] = $value;
        }

        return $normalized;
    }

    /**
     * Aliases de operador. Existem porque autores escrevem `=`, `==` e `<>` por
     * hábito, e o runtime só conhece `eq` e `!=`.
     */
    public static function normalizeOperator($operator): string
    {
        $operator = strtolower(trim((string) $operator));

        $aliases = [
            '='      => 'eq',
            '=='     => 'eq',
            '==='    => 'eq',
            'eq'     => 'eq',
            '!='     => '!=',
            '<>'     => '!=',
            '!=='    => '!=',
            'neq'    => '!=',
            'not_eq' => '!=',
        ];

        return $aliases[$operator] ?? $operator;
    }

    private static function ehSequencial(array $value): bool
    {
        if ($value === []) {
            return true;
        }

        return array_keys($value) === range(0, count($value) - 1);
    }

    /**
     * O atributo é delimitado por aspas SIMPLES (o JSON usa as duplas), então
     * só o apóstrofo precisa virar entidade. `htmlspecialchars` com ENT_QUOTES
     * escaparia as aspas duplas do JSON e quebraria o JSON.parse do cliente.
     */
    private static function escapar(string $json): string
    {
        return str_replace("'", '&#39;', $json);
    }
}
