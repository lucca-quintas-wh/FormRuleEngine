<?php
/**
 * Ponte de compatibilidade dos exemplos.
 *
 * O gerador deixou de morar aqui: virou `src/php/FormRenderer.php`, parte do
 * pacote. Este arquivo só mantém os nomes `fre_*` que as 54 páginas de demo já
 * usavam, delegando tudo à classe.
 *
 * Por que a ponte em vez de reescrever os demos: com ela, a saída das páginas é
 * comparável byte a byte antes e depois da promoção — o que transforma os 19
 * exemplos num teste de regressão do gerador, em vez de 54 arquivos para revisar
 * no diff. Código novo deve chamar `FormRenderer::` direto.
 */

require_once __DIR__ . '/../../src/php/FormRenderer.php';

function fre_e($value): string                  { return FormRenderer::e($value); }
function fre_json($value): string               { return FormRenderer::json($value); }
function fre_attrs(array $attrs): string        { return FormRenderer::attrs($attrs); }
function fre_rule_attrs(array $field): string   { return FormRenderer::ruleAttrs($field); }
function fre_input_rule_attrs(array $f): string { return FormRenderer::inputRuleAttrs($f); }
function fre_render_control(array $f): string   { return FormRenderer::control($f); }
function fre_render_field(array $field): string { return FormRenderer::field($field); }
function fre_plugins_usados(array $c): array    { return FormRenderer::pluginsUsados($c); }
function fre_render_form(array $config): string { return FormRenderer::renderForm($config); }

function fre_render_scripts(array $config, string $base = '../..'): string
{
    return FormRenderer::renderScripts($config, $base);
}
