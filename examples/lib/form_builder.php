<?php
/**
 * Renderizador declarativo dos exemplos — versão autônoma, sem framework.
 *
 * Recebe um array de configuração (ver examples/demos/*.php) e devolve o
 * HTML do formulário com os atributos `data-*-when` que o runtime JS consome.
 *
 * A tradução config → atributo NÃO é feita aqui: quem faz é
 * `src/php/FormRuleCompiler.php`, o interpretador do pacote. Este arquivo é só
 * o emissor de markup — o análogo enxuto de reference/php/form-builder.phtml,
 * que depende do framework do CRM de origem e não roda isolado.
 *
 * A regra de ouro que este arquivo demonstra: TODO atributo de regra é emitido
 * no <div> WRAPPER do campo, nunca no <input>. Os plugins procuram o campo com
 * `element.querySelector('input, select, textarea')` — atributo no próprio input
 * não é encontrado e a regra falha em silêncio. É por isso que, no projeto de
 * origem, a armadilha nunca apareceu: o gerador sempre acertou o lugar.
 */

require_once __DIR__ . '/../../src/php/FormRuleCompiler.php';

/** Escape para conteúdo e atributos. */
function fre_e($value): string
{
    return htmlspecialchars((string) ($value ?? ''), ENT_QUOTES, 'UTF-8');
}

/** JSON de configuração (não é condição: não passa pelo normalizador). */
function fre_json($value): string
{
    $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return $json === false ? '{}' : $json;
}

/** Monta ` chave="valor"` para um mapa de atributos, pulando vazios. */
function fre_attrs(array $attrs): string
{
    $out = '';
    foreach ($attrs as $key => $value) {
        if ($value === null || $value === false || $value === '') {
            continue;
        }
        $out .= $value === true
            ? ' ' . $key
            : ' ' . $key . '="' . fre_e($value) . '"';
    }
    return $out;
}

/**
 * Nomes de regra que o FormRuleCompiler conhece, na ordem em que ele os emite.
 * Serve só para descobrir quais PLUGINS carregar; a emissão em si é dele.
 */
const FRE_REGRA_PLUGIN = [
    'visible_when'         => 'visible',
    'required_when'        => 'required',
    'disabled_when'        => 'disabled',
    'label_when'           => 'label',
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
 * Atributos de regra do campo, que vão no WRAPPER.
 *
 * ┌ Contorno de um defeito confirmado do compilador ───────────────────────┐
 * │ `label_when` está na lista de CONDIÇÕES puras do FormRuleCompiler, mas │
 * │ o formato que o plugin `label` espera é uma LISTA de objetos com a     │
 * │ chave `label` — e uma lista sequencial vira `{"AND":[…]}` no           │
 * │ normalizador. O plugin então recebe um objeto em vez de array, cai no  │
 * │ ramo de condição simples e o rótulo nunca muda: falha silenciosa, da   │
 * │ mesma família da pertinência com 2 valores.                            │
 * │                                                                        │
 * │ Enquanto isso não se decide no roadmap, emitimos `label_when` em lista │
 * │ como JSON cru. Condição simples (não-lista) segue pelo compilador.     │
 * └────────────────────────────────────────────────────────────────────────┘
 */
function fre_rule_attrs(array $field): string
{
    $labelEmLista = isset($field['label_when'])
        && is_array($field['label_when'])
        && array_key_exists(0, $field['label_when']);

    $paraCompilador = $field;
    if ($labelEmLista) {
        unset($paraCompilador['label_when']);
    }

    $html = FormRuleCompiler::atributos($paraCompilador);

    if ($labelEmLista) {
        $html .= " data-label-when='" . fre_e(fre_json($field['label_when'])) . "'";
    }

    // Modificadores do plugin `visible`, lidos do dataset do próprio elemento.
    $html .= fre_attrs([
        'data-animate'       => (isset($field['animate']) && $field['animate'] === false) ? 'false' : null,
        'data-keep-space'    => !empty($field['keep_space']) ? 'true' : null,
        'data-clear-on-hide' => !empty($field['clear_on_hide']) ? 'true' : null,
        // Só para o painel de eventos destas páginas dar um nome ao elemento.
        'data-demo-name'     => $field['demo_name'] ?? null,
    ]);

    return $html;
}

/**
 * Atributos que vão no PRÓPRIO controle (não no wrapper).
 * São os do plugin `sequence`, que varre `[data-sequence]` e lê `el.value`.
 */
function fre_input_rule_attrs(array $field): string
{
    $attrs = [];
    if (isset($field['sequence'])) {
        $attrs['data-sequence'] = (string) $field['sequence'];
    }
    if (!empty($field['sequence_when'])) {
        $attrs['data-sequence-when'] = FormRuleCompiler::encode($field['sequence_when']);
    }
    if (!empty($field['sequence_keep'])) {
        $attrs['data-sequence-keep'] = 'true';
    }
    return fre_attrs($attrs) . fre_attrs($field['attrs'] ?? []);
}

/** Renderiza o controle de um campo, por `type`. */
function fre_render_control(array $field): string
{
    $type  = $field['type'] ?? 'text';
    $name  = $field['name'] ?? '';
    $id    = $field['id'] ?? $name;
    $value = $field['value'] ?? '';

    $comuns = fre_attrs([
        'name'        => $name,
        'id'          => $id,
        'placeholder' => $field['placeholder'] ?? null,
        'readonly'    => !empty($field['readonly']),
        'required'    => !empty($field['required']),
        'disabled'    => !empty($field['disabled']),
    ]) . fre_input_rule_attrs($field);

    switch ($type) {
        case 'hidden':
            return '<input type="hidden"' . $comuns . ' value="' . fre_e($value) . '">';

        case 'textarea':
            return '<textarea' . $comuns . ' rows="' . (int) ($field['rows'] ?? 3) . '">'
                 . fre_e($value) . '</textarea>';

        case 'select':
            $html = '<select' . $comuns
                  . fre_attrs(['data-placeholder' => $field['placeholder_option'] ?? null]) . '>';
            if (array_key_exists('placeholder_option', $field)) {
                $html .= '<option value="">' . fre_e($field['placeholder_option']) . '</option>';
            }
            foreach (($field['options'] ?? []) as $opcaoValor => $opcaoRotulo) {
                $html .= '<option value="' . fre_e($opcaoValor) . '"'
                       . ((string) $opcaoValor === (string) $value ? ' selected' : '') . '>'
                       . fre_e($opcaoRotulo) . '</option>';
            }
            return $html . '</select>';

        case 'checkbox':
            /* `value` explícito e sempre: sem ele o navegador usa "on" como
               padrão, e `getFieldValue()` — que faz `field.value || 'S'` —
               devolve "on". A condição {"Campo":"S"} então nunca casa, em
               silêncio. É a razão de a armadilha não aparecer no projeto de
               origem: o gerador sempre emitiu o value. */
            return '<label class="fre-inline"><input type="checkbox"' . $comuns
                 . ' value="' . fre_e($field['checked_value'] ?? 'S') . '"'
                 . (!empty($field['checked']) ? ' checked' : '') . '> '
                 . fre_e($field['checkbox_label'] ?? $field['label'] ?? '') . '</label>';

        case 'radio':
            $html = '';
            foreach (($field['options'] ?? []) as $opcaoValor => $opcaoRotulo) {
                $html .= '<label class="fre-inline"><input type="radio"'
                       . fre_attrs(['name' => $name]) . fre_input_rule_attrs($field)
                       . ' value="' . fre_e($opcaoValor) . '"'
                       . ((string) $opcaoValor === (string) $value ? ' checked' : '') . '> '
                       . fre_e($opcaoRotulo) . '</label> ';
            }
            return $html;

        case 'static':
            return '<div class="fre-static">' . ($field['html'] ?? fre_e($value)) . '</div>';

        default: // text, number, date, email, password, tel…
            return '<input type="' . fre_e($type) . '"' . $comuns
                 . ' value="' . fre_e($value) . '"'
                 . fre_attrs([
                     'step' => $field['step'] ?? null,
                     'min'  => $field['min'] ?? null,
                     'max'  => $field['max'] ?? null,
                 ]) . '>';
    }
}

/** Renderiza o campo inteiro: wrapper + rótulo + controle + dica. */
function fre_render_field(array $field): string
{
    $type = $field['type'] ?? 'text';

    /* Grupo: propaga a condição de visibilidade para cada campo filho, que é o
       que o gerador do projeto de origem faz (FormRenderer, 'type'=>'group').
       Não existe "wrapper de grupo" no HTML final — cada campo carrega a regra.
       É o motivo de você ver a mesma condição repetida em campos vizinhos. */
    if ($type === 'group') {
        $html = '';
        foreach (($field['fields'] ?? []) as $filho) {
            foreach (['visible_when', 'required_when', 'disabled_when'] as $herdavel) {
                if (!empty($field[$herdavel]) && empty($filho[$herdavel])) {
                    $filho[$herdavel] = $field[$herdavel];
                }
            }
            $html .= fre_render_field($filho);
        }
        return $html;
    }

    // Bloco de HTML cru dentro da grid — para markup que não é campo (a tabela
    // dinâmica, o laboratório da DSL, um aviso no meio do formulário).
    if ($type === 'raw') {
        $col = (int) ($field['col'] ?? 12);
        return '<div class="ilu-form-compact__field ilu-form-compact__field--col-' . $col . '"'
             . fre_rule_attrs($field) . '>' . ($field['html'] ?? '') . '</div>';
    }

    // Hidden não tem wrapper visível — mas ainda pode carregar regra, então o
    // wrapper existe sem classe de coluna quando há regra a pendurar.
    if ($type === 'hidden') {
        $regras = fre_rule_attrs($field);
        return $regras === ''
            ? fre_render_control($field)
            : '<div' . $regras . '>' . fre_render_control($field) . '</div>';
    }

    $col = (int) ($field['col'] ?? 12);
    $classes = 'ilu-form-compact__field ilu-form-compact__field--col-' . $col;
    if (!empty($field['wrapper_class'])) {
        $classes .= ' ' . $field['wrapper_class'];
    }

    /* `regra_no_input` existe só para DEMONSTRAR a armadilha do wrapper: emite
       os atributos de regra no próprio controle, onde os plugins não os acham.
       Nenhum formulário real deve usar isto. */
    $noInput = !empty($field['regra_no_input']);

    $html = '<div class="' . fre_e($classes) . '"' . ($noInput ? '' : fre_rule_attrs($field)) . '>';

    // O rótulo precisa da classe `ilu-form-label` — é por ela que os plugins
    // `required` (asterisco) e `label` (troca de texto) o encontram.
    if ($type !== 'checkbox' && !empty($field['label'])) {
        $html .= '<label class="ilu-form-label"'
               . fre_attrs([
                   'for' => $field['id'] ?? $field['name'] ?? null,
                   'data-label-default' => $field['label'],
               ]) . '>' . fre_e($field['label']) . '</label>';
    }

    $controle = fre_render_control($field);
    if ($noInput) {
        // injeta os atributos de regra dentro da tag do controle
        $controle = preg_replace('/^<(input|select|textarea)/', '<$1' . fre_rule_attrs($field), $controle, 1);
    }
    $html .= $controle;

    if (!empty($field['hint'])) {
        $html .= '<p class="hint">' . $field['hint'] . '</p>';
    }

    return $html . '</div>';
}

/**
 * Quais plugins este formulário exige.
 * O bootstrap ignora plugin ausente em silêncio, então listar só o necessário
 * é o que mantém a página leve — mesmo raciocínio do gerador de origem.
 */
function fre_plugins_usados(array $config): array
{
    $usados = [];

    foreach (($config['sections'] ?? []) as $section) {
        if (!empty($section['visible_when'])) {
            $usados['visible'] = true;
        }
        if (isset($section['step'])) {
            $usados['step'] = true;
        }
        foreach (($section['fields'] ?? []) as $field) {
            foreach (FRE_REGRA_PLUGIN as $chave => $plugin) {
                if (!empty($field[$chave])) {
                    $usados[$plugin] = true;
                }
            }
            if (isset($field['sequence'])) {
                $usados['sequence'] = true;
            }
        }
    }

    foreach (($config['buttons'] ?? []) as $button) {
        if (!empty($button['visible_when']) || !empty($button['enabled_when'])) {
            $usados['action'] = true;
        }
        if (!empty($button['confirm_submit'])) {
            $usados['confirm-submit'] = true;
        }
    }

    if (!empty($config['behaviors']))       { $usados['behavior'] = true; }
    if (!empty($config['submit_handler']))  { $usados['submit-handler'] = true; }
    if (!empty($config['step_config']))     { $usados['step'] = true; }
    if (!empty($config['sequence_config'])) { $usados['sequence'] = true; }

    return array_keys($usados);
}

/** Renderiza o formulário completo a partir da configuração. */
function fre_render_form(array $config): string
{
    ob_start();
    include __DIR__ . '/../views/form-builder.phtml';
    return ob_get_clean();
}

/** Emite as tags <script> na ordem correta: núcleo → plugins → bootstrap. */
function fre_render_scripts(array $config, string $base = '../..'): string
{
    $plugins = fre_plugins_usados($config);

    $html  = '<script src="' . $base . '/src/form-rule-engine.js"></script>' . "\n";
    $html .= '<script src="' . $base . '/src/plugins/form-rule-base.js"></script>' . "\n";
    foreach ($plugins as $plugin) {
        $html .= '<script src="' . $base . '/src/plugins/form-rule-' . $plugin . '.js"></script>' . "\n";
    }
    // Por último, sempre: é ele que instancia a engine e registra o que achar.
    $html .= '<script src="' . $base . '/src/form-visibility-v2.js"></script>' . "\n";

    return $html;
}
