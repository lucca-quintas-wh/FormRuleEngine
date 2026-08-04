<?php
/**
 * FormRenderer — o gerador de formulários.
 *
 * Você passa um array de configuração e recebe o formulário pronto: seções,
 * grid de 12 colunas, rótulos, controles e os atributos `data-*-when` que o
 * runtime JS consome. Não se escreve HTML de campo à mão.
 *
 *     echo FormRenderer::renderForm([
 *         'name'     => 'frmCliente',
 *         'sections' => [[
 *             'title'  => 'Identificação',
 *             'fields' => [
 *                 ['name' => 'TipoPessoa', 'label' => 'Tipo', 'type' => 'select', 'col' => 4,
 *                  'options' => ['F' => 'Física', 'J' => 'Jurídica']],
 *                 ['name' => 'Cpf',  'label' => 'CPF',  'col' => 4,
 *                  'visible_when' => ['TipoPessoa' => 'F'], 'mask_when' => ['mask' => '000.000.000-00']],
 *                 ['name' => 'Cnpj', 'label' => 'CNPJ', 'col' => 4,
 *                  'visible_when' => ['TipoPessoa' => 'J'], 'required_when' => ['TipoPessoa' => 'J']],
 *             ],
 *         ]],
 *         'buttons' => [['label' => 'Salvar', 'type' => 'submit', 'class' => 'primary']],
 *     ]);
 *     echo FormRenderer::renderScripts($config);   // só os plugins que a config usa
 *
 * Divisão de trabalho: este arquivo emite MARKUP; quem traduz a config de regra
 * no JSON canônico é o FormRuleCompiler. Os dois juntos são o lado servidor.
 *
 * Regra de ouro, e o motivo de existir um gerador: TODO atributo de regra sai no
 * <div> WRAPPER do campo, nunca no <input>. Os plugins procuram o controle com
 * `element.querySelector('input, select, textarea')`, então atributo no próprio
 * input não é encontrado e a regra falha em silêncio. O gerador acerta o lugar
 * sempre — é por isso que a armadilha nunca apareceu no projeto de origem.
 *
 * @see FormRuleCompiler  a tradução config → data-*-when
 * @see reference/php/FormRenderer.php  o equivalente acoplado ao framework de origem
 */

require_once __DIR__ . '/FormRuleCompiler.php';

final class FormRenderer
{
    /**
     * Nome da regra na config → plugin que a executa.
     * Usado para descobrir quais plugins carregar. A emissão é do compilador.
     */
    public const REGRA_PLUGIN = [
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

    /** Renderiza o formulário completo a partir da configuração. */
    public static function renderForm(array $config): string
    {
        ob_start();
        include __DIR__ . '/templates/form.phtml';

        return (string) ob_get_clean();
    }

    /**
     * Emite as tags <script> na ordem obrigatória: núcleo → base → plugins →
     * bootstrap. O bootstrap tem de vir por último: é ele que instancia a engine
     * e registra os plugins que encontrar carregados.
     *
     * @param string $base caminho até a raiz do pacote, visto pela página
     */
    public static function renderScripts(array $config, string $base = '.'): string
    {
        $html  = '<script src="' . $base . '/src/form-rule-engine.js"></script>' . "\n";
        $html .= '<script src="' . $base . '/src/plugins/form-rule-base.js"></script>' . "\n";

        foreach (self::pluginsUsados($config) as $plugin) {
            $html .= '<script src="' . $base . '/src/plugins/form-rule-' . $plugin . '.js"></script>' . "\n";
        }

        $html .= '<script src="' . $base . '/src/form-visibility-v2.js"></script>' . "\n";

        return $html;
    }

    /**
     * Quais plugins esta configuração exige. Plugin ausente é ignorado em
     * silêncio pelo bootstrap, então carregar só o necessário mantém a página leve.
     *
     * @return string[]
     */
    public static function pluginsUsados(array $config): array
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
                foreach (self::REGRA_PLUGIN as $chave => $plugin) {
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

    // ─── emissão de markup ────────────────────────────────────────────────────

    /** Escape para conteúdo e atributos. */
    public static function e($value): string
    {
        return htmlspecialchars((string) ($value ?? ''), ENT_QUOTES, 'UTF-8');
    }

    /** JSON de configuração (não é condição: não passa pelo normalizador). */
    public static function json($value): string
    {
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return $json === false ? '{}' : $json;
    }

    /** Monta ` chave="valor"` para um mapa de atributos, pulando vazios. */
    public static function attrs(array $attrs): string
    {
        $out = '';
        foreach ($attrs as $key => $value) {
            if ($value === null || $value === false || $value === '') {
                continue;
            }
            $out .= $value === true
                ? ' ' . $key
                : ' ' . $key . '="' . self::e($value) . '"';
        }

        return $out;
    }

    /**
     * Atributos de regra do campo, que vão no WRAPPER.
     *
     * Contorno de um defeito confirmado do compilador: `label_when` está na lista
     * de condições puras, mas o formato que o plugin `label` espera é uma LISTA
     * de objetos com a chave `label` — e lista sequencial vira `{"AND":[…]}` no
     * normalizador. O plugin receberia objeto onde espera array, cairia no ramo
     * de condição simples, e o rótulo nunca mudaria: falha silenciosa, da mesma
     * família da pertinência com 2 valores. Enquanto o roadmap não decide, a
     * forma de lista é emitida como JSON cru; condição simples segue pelo compilador.
     */
    public static function ruleAttrs(array $field): string
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
            $html .= " data-label-when='" . self::e(self::json($field['label_when'])) . "'";
        }

        // Modificadores do plugin `visible`, lidos do dataset do próprio elemento.
        $html .= self::attrs([
            'data-animate'       => (isset($field['animate']) && $field['animate'] === false) ? 'false' : null,
            'data-keep-space'    => !empty($field['keep_space']) ? 'true' : null,
            'data-clear-on-hide' => !empty($field['clear_on_hide']) ? 'true' : null,
            'data-demo-name'     => $field['demo_name'] ?? null,
        ]);

        return $html;
    }

    /**
     * Atributos que vão no PRÓPRIO controle, não no wrapper.
     * São os do plugin `sequence`, que varre `[data-sequence]` e lê `el.value`.
     */
    public static function inputRuleAttrs(array $field): string
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

        return self::attrs($attrs) . self::attrs($field['attrs'] ?? []);
    }

    /** Renderiza o controle de um campo, por `type`. */
    public static function control(array $field): string
    {
        $type  = $field['type'] ?? 'text';
        $name  = $field['name'] ?? '';
        $id    = $field['id'] ?? $name;
        $value = $field['value'] ?? '';

        $comuns = self::attrs([
            'name'        => $name,
            'id'          => $id,
            'placeholder' => $field['placeholder'] ?? null,
            'readonly'    => !empty($field['readonly']),
            'required'    => !empty($field['required']),
            'disabled'    => !empty($field['disabled']),
        ]) . self::inputRuleAttrs($field);

        switch ($type) {
            case 'hidden':
                return '<input type="hidden"' . $comuns . ' value="' . self::e($value) . '">';

            case 'textarea':
                return '<textarea' . $comuns . ' rows="' . (int) ($field['rows'] ?? 3) . '">'
                     . self::e($value) . '</textarea>';

            case 'select':
                $html = '<select' . $comuns
                      . self::attrs(['data-placeholder' => $field['placeholder_option'] ?? null]) . '>';
                if (array_key_exists('placeholder_option', $field)) {
                    $html .= '<option value="">' . self::e($field['placeholder_option']) . '</option>';
                }
                foreach (($field['options'] ?? []) as $opcaoValor => $opcaoRotulo) {
                    $html .= '<option value="' . self::e($opcaoValor) . '"'
                           . ((string) $opcaoValor === (string) $value ? ' selected' : '') . '>'
                           . self::e($opcaoRotulo) . '</option>';
                }

                return $html . '</select>';

            case 'checkbox':
                /* `value` explícito e sempre: sem ele o navegador usa "on" como
                   padrão, e `getFieldValue()` — que faz `field.value || 'S'` —
                   devolve "on". A condição {"Campo":"S"} então nunca casa, em
                   silêncio. É a razão de a armadilha não aparecer no projeto de
                   origem: o gerador sempre emitiu o value. */
                return '<label class="fre-inline"><input type="checkbox"' . $comuns
                     . ' value="' . self::e($field['checked_value'] ?? 'S') . '"'
                     . (!empty($field['checked']) ? ' checked' : '') . '> '
                     . self::e($field['checkbox_label'] ?? $field['label'] ?? '') . '</label>';

            case 'radio':
                $html = '';
                foreach (($field['options'] ?? []) as $opcaoValor => $opcaoRotulo) {
                    $html .= '<label class="fre-inline"><input type="radio"'
                           . self::attrs(['name' => $name]) . self::inputRuleAttrs($field)
                           . ' value="' . self::e($opcaoValor) . '"'
                           . ((string) $opcaoValor === (string) $value ? ' checked' : '') . '> '
                           . self::e($opcaoRotulo) . '</label> ';
                }

                return $html;

            case 'static':
                return '<div class="fre-static">' . ($field['html'] ?? self::e($value)) . '</div>';

            default: // text, number, date, email, password, tel…
                return '<input type="' . self::e($type) . '"' . $comuns
                     . ' value="' . self::e($value) . '"'
                     . self::attrs([
                         'step' => $field['step'] ?? null,
                         'min'  => $field['min'] ?? null,
                         'max'  => $field['max'] ?? null,
                     ]) . '>';
        }
    }

    /** Renderiza o campo inteiro: wrapper + rótulo + controle + dica. */
    public static function field(array $field): string
    {
        $type = $field['type'] ?? 'text';

        /* Grupo: propaga a condição para cada campo filho. Não existe "wrapper de
           grupo" no HTML final — cada campo carrega a regra. É o motivo de você
           ver a mesma condição repetida em campos vizinhos. */
        if ($type === 'group') {
            $html = '';
            foreach (($field['fields'] ?? []) as $filho) {
                foreach (['visible_when', 'required_when', 'disabled_when'] as $herdavel) {
                    if (!empty($field[$herdavel]) && empty($filho[$herdavel])) {
                        $filho[$herdavel] = $field[$herdavel];
                    }
                }
                $html .= self::field($filho);
            }

            return $html;
        }

        // Bloco de HTML cru dentro da grid — para markup que não é campo.
        if ($type === 'raw') {
            $col = (int) ($field['col'] ?? 12);

            return '<div class="ilu-form-compact__field ilu-form-compact__field--col-' . $col . '"'
                 . self::ruleAttrs($field) . '>' . ($field['html'] ?? '') . '</div>';
        }

        // Hidden não tem wrapper visível — mas ainda pode carregar regra, então o
        // wrapper existe sem classe de coluna quando há regra a pendurar.
        if ($type === 'hidden') {
            $regras = self::ruleAttrs($field);

            return $regras === ''
                ? self::control($field)
                : '<div' . $regras . '>' . self::control($field) . '</div>';
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

        $html = '<div class="' . self::e($classes) . '"' . ($noInput ? '' : self::ruleAttrs($field)) . '>';

        // O rótulo precisa da classe `ilu-form-label` — é por ela que os plugins
        // `required` (asterisco) e `label` (troca de texto) o encontram.
        if ($type !== 'checkbox' && !empty($field['label'])) {
            $html .= '<label class="ilu-form-label"'
                   . self::attrs([
                       'for' => $field['id'] ?? $field['name'] ?? null,
                       'data-label-default' => $field['label'],
                   ]) . '>' . self::e($field['label']) . '</label>';
        }

        $controle = self::control($field);
        if ($noInput) {
            $controle = preg_replace('/^<(input|select|textarea)/', '<$1' . self::ruleAttrs($field), $controle, 1);
        }
        $html .= $controle;

        if (!empty($field['hint'])) {
            $html .= '<p class="hint">' . $field['hint'] . '</p>';
        }

        return $html . '</div>';
    }
}
