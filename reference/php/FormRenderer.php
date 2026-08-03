<?php
/**
 * Extraido de sys/controller.php sem alterar uma linha do corpo dos
 * metodos — corte mecanico por scripts/reorg/extrair-traits-controller.php.
 *
 * E TRAIT, nao classe, de proposito: os metodos continuam sendo metodos do
 * Controller, com o mesmo $this, a mesma visibilidade e o mesmo acesso as
 * propriedades. Nenhum call site mudou, e a API publica (262 metodos, 12
 * propriedades) foi conferida por Reflection antes e depois.
 */
trait FormRenderer
{
    protected function renderDialogForm(array $config)
    {
        $openConfig = $this->normalizeModalOpenConfig([
            'title' => $config['label'] ?? ($config['title'] ?? ''),
            'route' => $config['route'] ?? '',
            'params' => $config['params'] ?? '',
            'target' => $config['target'] ?? 'form',
            'size' => $config['size'] ?? '',
        ]);
        $jsonConfig = json_encode($openConfig, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($jsonConfig === false) {
            $jsonConfig = '{}';
        }

        echo '<script>(function(){' . $this->buildClientModalOpenCall($jsonConfig) . '})();</script>';

        if (!empty($config['after_script'])) {
            echo $config['after_script'];
        }
    }

    /**
     * Gera o onclick de um botão sendForm lidando com DIALOG automaticamente.
     *
     * @param string $formName   Nome do formulário (ex: 'frm_Lead')
     * @param string $controller Controller de destino (ex: 'Lead')
     * @param string $action     Action de destino (ex: 'daoInsert')
     * @param string $redirect   Action de redirect após salvar (ex: 'listagem')
     * @param array  $options {
     *     nivel?:       string  Nível do dialog quando DIALOG=true (default: 'nivel3')
     *     after_exec?:  int     Código de exec fora de DIALOG (default: 5)
     *     dialog_exec?: int     Código de exec dentro de DIALOG (default: 7)
     *                           Use 8 para "salvar e adicionar"
     * }
     */
    protected function buildSendFormOnclick(
        string $formName,
        string $controller,
        string $action,
        string $redirect,
        array  $options = []
    ): string {
        $nivel      = $options['nivel']       ?? 'nivel3';
        $afterExec  = $options['after_exec']  ?? 5;
        $dialogExec = $options['dialog_exec'] ?? 7;

        if (defined('DIALOG') && DIALOG) {
            return "sendForm('{$formName}','{$controller}','{$action}','{$redirect}',{$dialogExec},'{$nivel}')";
        }

        return "sendForm('{$formName}','{$controller}','{$action}','{$redirect}',{$afterExec})";
    }

    /**
     * Constrói os campos hidden de persistência padrão (pag/max).
     * Elimina o padrão repetido de SFieldHidden para paginação.
     *
     * @param int|null $pag Página atual (default: request pag ou 1)
     * @param int|null $max Itens por página (default: request max ou 20)
     * @return array ['persist1' => HTML, 'persist2' => HTML]
     */
    protected function buildPersistFields(?int $pag = null, ?int $max = null): array
    {
        $p1 = new SFieldHidden;
        $p1->setName("pag");
        $p1->setValue($pag ?? System::request('pag', 1));

        $p2 = new SFieldHidden;
        $p2->setName("max");
        $p2->setValue($max ?? System::request('max', 20));

        return [
            'persist1' => $p1->compilate(),
            'persist2' => $p2->compilate(),
        ];
    }

    protected function extractStandardFormNameFromMarkup($tagForm)
    {
        if (!is_string($tagForm) || $tagForm === '') {
            return '';
        }

        if (preg_match('/\b(?:id|name)=["\']([^"\']+)["\']/', $tagForm, $matches)) {
            return $matches[1];
        }

        return '';
    }

    protected function normalizeStandardFormTag(array $config)
    {
        $tagForm = $config['tag_form'] ?? null;
        if (is_object($tagForm) && method_exists($tagForm, 'compilate')) {
            $tagForm = $tagForm->compilate();
        }

        if (empty($tagForm)) {
            $formName = $config['form_name'] ?? ($config['form_id'] ?? '');
            if ($formName !== '') {
                $tagForm = (new SForm($formName))->compilate();
            }
        }

        return $tagForm;
    }

    protected function applyStandardFormStyles($field, $styles)
    {
        if (empty($styles) || !method_exists($field, 'addStyle')) {
            return;
        }

        if (is_string($styles)) {
            $styles = explode(';', $styles);
        }

        if (!is_array($styles)) {
            return;
        }

        foreach ($styles as $name => $value) {
            if (is_int($name)) {
                if (!is_string($value) || strpos($value, ':') === false) {
                    continue;
                }

                list($name, $value) = array_map('trim', explode(':', $value, 2));
            }

            if ($name === '' || $value === null || $value === '') {
                continue;
            }

            $field->addStyle($name, $value);
        }
    }

    protected function applyStandardFormClasses($field, $classes)
    {
        if (empty($classes) || !method_exists($field, 'addClass')) {
            return;
        }

        if (!is_array($classes)) {
            $classes = preg_split('/\s+/', trim((string) $classes));
        }

        foreach ($classes as $className) {
            if (!empty($className)) {
                $field->addClass($className);
            }
        }
    }

    protected function applyStandardFormEntries($field, $entries, $method)
    {
        if (empty($entries) || !method_exists($field, $method) || !is_array($entries)) {
            return;
        }

        foreach ($entries as $name => $value) {
            if (is_int($name)) {
                if (is_array($value) && isset($value['name'])) {
                    $field->$method($value['name'], $value['value'] ?? '');
                }
                continue;
            }

            $field->$method($name, $value);
        }
    }

    protected function createStandardFormField(array $config)
    {
        $type = strtolower((string) ($config['type'] ?? 'text'));

        switch ($type) {
            case 'combo':
                $field = new SFieldCombo;
                break;
            case 'sn':
                $field = new SFieldSN;
                break;
            case 'hidden':
                $field = new SFieldHidden;
                break;
            case 'textarea':
                $field = new SFieldTextArea;
                break;
            case 'date':
                $field = new SFieldDate;
                break;
            case 'datepicker':
                $field = new SFieldDatePicker;
                break;
            case 'number':
                $field = new SFieldNumber;
                break;
            case 'float':
                $field = new SFieldFloat;
                break;
            case 'money':
                $field = new SFieldMoney;
                break;
            case 'email':
                $field = new SFieldEmail;
                break;
            case 'check':
            case 'checkbox':
                $field = new SFieldCheck;
                break;
            case 'pass':
            case 'password':
                $field = new SFieldPass;
                break;
            case 'time':
                $field = new SFieldTime;
                break;
            case 'timepicker':
                $field = new SFieldTimePicker;
                break;
            case 'range':
                $field = new SFieldRange;
                break;
            case 'phone':
                $field = new SFieldPhone;
                break;
            case 'upload':
                $field = new SFieldUpload($config['upload_index'] ?? '');
                if (!empty($config['image_preview'])) {
                    $field->setImagePreview();
                }
                break;
            case 'pesquisa':
                $field = new SFieldPesquisa((bool) ($config['editable'] ?? false));
                break;
            case 'cnpj':
                $field = new SFieldCnpj;
                break;
            case 'cpf':
                $field = new SFieldCpf;
                break;
            case 'cep':
                $field = new SFieldCep;
                break;
            case 'combo_busca':
                $field = new SFieldComboBusca;
                break;
            case 'combo_busca_multipla':
                $field = new SFieldComboBuscaMultipla;
                break;
            case 'button':
                $field = new SFieldButton;
                break;
            default:
                $field = new SFieldText;
                break;
        }

        if (!empty($config['name'])) {
            $field->setName($config['name']);
        }

        if (!empty($config['id'])) {
            $field->setId($config['id']);
        }

        if (!empty($config['label']) && method_exists($field, 'setLabel')) {
            $field->setLabel($config['label']);
        }

        if (array_key_exists('value', $config)) {
            $field->setValue($config['value']);
        }

        if (!empty($config['required']) && method_exists($field, 'required')) {
            $field->required();
        }

        if (isset($config['data']) && method_exists($field, 'setData')) {
            $field->setData($config['data']);
        }

        foreach (['setPrefixo' => 'prefix', 'setStep' => 'step', 'setMin' => 'min', 'setMax' => 'max'] as $method => $key) {
            if (array_key_exists($key, $config) && method_exists($field, $method)) {
                $field->$method($config[$key]);
            }
        }

        foreach (['setPath' => 'path', 'setForm' => 'form', 'setLimit' => 'limit', 'setDisplay' => 'display', 'setNum' => 'num', 'setScript' => 'script'] as $method => $key) {
            if (array_key_exists($key, $config) && method_exists($field, $method)) {
                $field->$method($config[$key]);
            }
        }

        if (!empty($config['use_drawer']) && method_exists($field, 'useDrawer')) {
            $field->useDrawer();
        }

        if (array_key_exists('none_option', $config) && method_exists($field, 'setNoneOption')) {
            $noneOption = $config['none_option'];
            if (is_array($noneOption)) {
                $field->setNoneOption(
                    $noneOption['label'] ?? ($noneOption[0] ?? 'Selecione...'),
                    $noneOption['value'] ?? ($noneOption[1] ?? '')
                );
            } else {
                $field->setNoneOption($noneOption, $config['none_value'] ?? '');
            }
        }

        if (isset($config['visible_none']) && method_exists($field, 'setVisibleNone')) {
            $field->setVisibleNone((bool) $config['visible_none']);
        }

        if (isset($config['show_response']) && method_exists($field, 'setShowResp')) {
            $field->setShowResp((bool) $config['show_response']);
        }

        if (!empty($config['function_click']) && method_exists($field, 'setFunctionClick')) {
            $field->setFunctionClick($config['function_click']);
        }

        if (!empty($config['title']) && method_exists($field, 'setTitle')) {
            $field->setTitle($config['title']);
        }

        if (!empty($config['help']) && method_exists($field, 'setHelp')) {
            $field->setHelp($config['help']);
        }

        if (!empty($config['readonly']) && method_exists($field, 'readonly')) {
            $field->readonly();
        }

        if (array_key_exists('editable', $config) && method_exists($field, 'setEditable')) {
            $field->setEditable((bool) $config['editable']);
        }

        if (!empty($config['disabled'])) {
            if (method_exists($field, 'disabled')) {
                $field->disabled();
            } elseif (method_exists($field, 'setEditable')) {
                $field->setEditable(false);
            }
        }

        $this->applyStandardFormStyles($field, $config['style'] ?? null);
        $this->applyStandardFormClasses($field, $config['class'] ?? null);
        $this->applyStandardFormEntries($field, $config['attr'] ?? ($config['attrs'] ?? null), 'addAttr');
        $this->applyStandardFormEntries($field, $config['properties'] ?? null, 'addProperty');

        if (!empty($config['onclick']) && method_exists($field, 'addProperty')) {
            $field->addProperty('onclick', $config['onclick']);
        }

        if (!empty($config['onchange']) && method_exists($field, 'addProperty')) {
            $field->addProperty('onchange', $config['onchange']);
        }

        if (!empty($config['icon']) && method_exists($field, 'setIcon')) {
            $field->setIcon($config['icon']);
        }

        // suporta tanto 'v5style' quanto 'v5_style' (convenção do FormFieldFactory)
        $v5Key = isset($config['v5_style']) ? 'v5_style' : (isset($config['v5style']) ? 'v5style' : null);
        if ($v5Key !== null && method_exists($field, 'setV5Style')) {
            $variant = $config['v5_style_variant'] ?? ($config['v5style_variant'] ?? 'secondary');
            if (!is_string($variant) || $variant === '' || $variant === true) { $variant = 'secondary'; }
            $size    = $config['v5_style_size'] ?? ($config['v5style_size'] ?? 'sm');
            $field->setV5Style($variant, $size);
        }

        return $field;
    }

    protected function compileStandardFormFragment($item)
    {
        if (empty($item) && $item !== '0') {
            return '';
        }

        if (is_string($item)) {
            return $item;
        }

        if (is_object($item) && method_exists($item, 'compilate')) {
            return $item->compilate();
        }

        if (!is_array($item)) {
            return '';
        }

        if (isset($item['input'])) {
            if (is_object($item['input']) && method_exists($item['input'], 'compilate')) {
                return $item['input']->compilate();
            }

            return is_string($item['input']) ? $item['input'] : '';
        }

        if (isset($item['name'])) {
            return $this->createStandardFormField(array_merge(['type' => $item['type'] ?? 'hidden'], $item))->compilate();
        }

        return '';
    }

    protected function normalizeStandardFormHiddenItems($items)
    {
        if (empty($items) && $items !== '0') {
            return [];
        }

        if (is_string($items) || (is_object($items) && method_exists($items, 'compilate'))) {
            $compiled = $this->compileStandardFormFragment($items);
            return $compiled !== '' ? [$compiled] : [];
        }

        if (!is_array($items)) {
            return [];
        }

        $normalized = [];

        if ($this->isAssocArray($items) && !isset($items['name']) && !isset($items['type']) && !isset($items['input'])) {
            foreach ($items as $name => $value) {
                $compiled = $this->compileStandardFormFragment(['name' => $name, 'value' => $value]);
                if ($compiled !== '') {
                    $normalized[] = $compiled;
                }
            }

            return $normalized;
        }

        foreach ($items as $item) {
            if (is_array($item) && !$this->isAssocArray($item)) {
                $normalized = array_merge($normalized, $this->normalizeStandardFormHiddenItems($item));
                continue;
            }

            $compiled = $this->compileStandardFormFragment($item);
            if ($compiled !== '') {
                $normalized[] = $compiled;
            }
        }

        return $normalized;
    }

    protected function normalizeStandardFormFields($fields)
    {
        $normalizedFields = [];
        $normalizedHidden = [];

        if (empty($fields) && $fields !== '0') {
            return [$normalizedFields, $normalizedHidden];
        }

        if (!is_array($fields)) {
            $fields = [$fields];
        }

        foreach ($fields as $field) {
            if (empty($field) && $field !== '0') {
                continue;
            }

            if (is_array($field) && !$this->isAssocArray($field)) {
                list($subFields, $subHidden) = $this->normalizeStandardFormFields($field);
                $normalizedFields = array_merge($normalizedFields, $subFields);
                $normalizedHidden = array_merge($normalizedHidden, $subHidden);
                continue;
            }

            if (is_object($field) && method_exists($field, 'compilate')) {
                $normalizedFields[] = $field;
                continue;
            }

            if (is_string($field)) {
                $normalizedFields[] = ['label' => '', 'input' => $field];
                continue;
            }

            if (!is_array($field)) {
                continue;
            }

            if (isset($field['input'])) {
                $normalizedFields[] = $field;
                continue;
            }

            if (strtolower((string) ($field['type'] ?? 'text')) === 'hidden') {
                $compiled = $this->compileStandardFormFragment($field);
                if ($compiled !== '') {
                    $normalizedHidden[] = $compiled;
                }
                continue;
            }

            $fieldObject = $this->createStandardFormField($field);
            $normalizedFields[] = [
                'label' => $field['label'] ?? $fieldObject->getLabel(),
                'input' => $fieldObject->compilate(),
            ];
        }

        return [$normalizedFields, $normalizedHidden];
    }

    protected function shouldRenderStandardFormButton($condition)
    {
        if ($condition === null || $condition === '') {
            return true;
        }

        if (is_bool($condition)) {
            return $condition;
        }

        $condition = trim((string) $condition);
        if ($condition === '!DIALOG') {
            return !defined('DIALOG') || DIALOG == false;
        }

        if ($condition === 'DIALOG') {
            return defined('DIALOG') && DIALOG != false;
        }

        return $condition !== '';
    }

    protected function normalizeStandardFormButtons($buttons)
    {
        if (empty($buttons) && $buttons !== '0') {
            return [];
        }

        if (is_string($buttons) || (is_object($buttons) && method_exists($buttons, 'compilate'))) {
            return [$buttons];
        }

        if (!is_array($buttons)) {
            return [];
        }

        $normalized = [];
        $looksLikeButton = $this->isAssocArray($buttons)
            && (isset($buttons['type']) || isset($buttons['name']) || isset($buttons['label']) || isset($buttons['value']) || isset($buttons['action']) || isset($buttons['onclick']));

        if ($looksLikeButton) {
            $buttons = [$buttons];
        }

        foreach ($buttons as $button) {
            if (empty($button) && $button !== '0') {
                continue;
            }

            if (is_array($button) && !$this->isAssocArray($button)) {
                $normalized = array_merge($normalized, $this->normalizeStandardFormButtons($button));
                continue;
            }

            if (is_string($button) || (is_object($button) && method_exists($button, 'compilate'))) {
                $normalized[] = $button;
                continue;
            }

            if (!is_array($button) || !$this->shouldRenderStandardFormButton($button['condition'] ?? null)) {
                continue;
            }

            if (!isset($button['type']) && isset($button['name'])) {
                $button['type'] = $button['name'];
            }

            if (!isset($button['label']) && isset($button['value'])) {
                $button['label'] = $button['value'];
            }

            if (!isset($button['return_mode']) && isset($button['mode'])) {
                $button['return_mode'] = $button['mode'];
            }

            if (!isset($button['extra_param']) && isset($button['extraParam'])) {
                $button['extra_param'] = $button['extraParam'];
            }

            $normalized[] = $button;
        }

        return $normalized;
    }

    /**
     * Renderiza um formulário declarativo com seções, grid 12-col e layout moderno.
     *
     * Modos suportados:
     *   - 'standard' (padrão): layout linear com seções
     *   - 'cards': layout em cards com grid responsivo
     *
     * Aceita campos em dois formatos:
     *   - sections: array aninhado de seções com fields
     *   - fields flat: array plano onde cada campo tem 'section'/'card' para agrupamento
     *
     * @param array $config
     *   - mode: string — 'standard' | 'cards'
     *   - title: string — título do formulário
     *   - subtitle: string — subtítulo opcional
     *   - form_tag: string — tag <form> customizada (ou null para auto-gerar)
     *   - form_action: string — ação do form
     *   - form_method: string — método (default: POST)
     *   - form_name: string — nome/id do form (default: 'form')
     *   - form_class: string — classe CSS do container
     *   - page_class: string — classe CSS da página
     *   - sections: array — seções com title, class, fields
     *   - fields: array — campos flat com 'section'/'card' e 'col'
     *   - hidden: array — campos hidden
     *   - persist: array — campos persist
     *   - buttons: array — botões
     *   - before_content: string
     *   - after_html: string
     *   - after_script: string
     *   - template: string — view customizada (sobrescreve mode)
     *   - controller, after_action, is_aggregate, clear_after
     */
    /**
     * Monta a arvore do formulario (F1.9). PURO: nao imprime nada.
     *
     * A captura de emitFormOutput acontece AQUI, num ponto so. emitFormOutput
     * tem ~680 linhas que ecoam por todo lado; torna-lo puro e uma reescrita
     * grande, de risco desproporcional para o ganho — e a Fase 1 promete
     * paridade byte a byte. O que a fase entrega e a FRONTEIRA: acima deste
     * ponto a arvore e pura, abaixo dele o legado ainda ecoa, e a fronteira e
     * unica e visivel em vez de espalhada por 18 helpers capture*.
     */
    protected function buildFormNode(array $config): UiNode
    {
        $nivel = ob_get_level();
        ob_start();
        try {
            $this->emitFormOutput($config);
        } catch (\Throwable $e) {
            while (ob_get_level() > $nivel) { ob_end_clean(); }
            throw $e;
        }

        return new UiNode('form', $config, array((string) ob_get_clean()));
    }

    protected function renderForm(array $config)
    {
        // Contrato informal era o buraco: chave errada nao fazia nada e
        // ninguem avisava. So reclama em desenvolvimento — ver RenderSchema.
        RenderSchema::validar('renderForm', $config, $this->_controller ?? '');

        // CONTINUA devolvendo ControllerComposableNode, e nao um UiNode nu, por
        // um motivo medido: renderForm tem 666 call sites que USAM o retorno
        // (encaixam o form numa arvore de drawer) e 966 que o IGNORAM e contam
        // com o __destruct para imprimir. Os dois padroes sao majoritarios.
        // Devolver UiNode apagaria as 966 telas em silencio; e o destrutor so
        // pode sair quando esses call sites forem migrados, o que e F5.5 e nao
        // Fase 1 — ver o registro de execucao em docs/arvore-de-renderizacao.md.
        return $this->buildComposableNode('form', $config, function (array $nodeConfig): void {
            $this->emit($this->buildFormNode($nodeConfig));
        });
    }

    protected function emitFormOutput(array $config): void
    {
        $formName = $config['form_name'] ?? ($config['form_id'] ?? 'form');
        $mode = $config['mode'] ?? 'standard';

        // Auto-gerar tag <form> se não fornecida
        $tagForm = $config['form_tag'] ?? null;
        if (empty($tagForm)) {
            $action = $config['form_action'] ?? '';
            $method = $config['form_method'] ?? 'POST';
            $tagForm = '<form name="' . $formName . '" id="' . $formName . '" action="' . $action . '" method="' . $method . '" enctype="multipart/form-data">';
        }

        // Normalizar hidden items
        $hiddenItems = $this->normalizeStandardFormHiddenItems($config['hidden'] ?? []);
        $persistItems = array_merge(
            $this->normalizeStandardFormHiddenItems($config['persist'] ?? []),
            $this->normalizeStandardFormHiddenItems($this->normalizeDrawerReturnHiddenItems())
        );

        // === INJEÇÃO DE PARÂMETROS GLOBAIS (form_params) ===
        $formParams = [];
        $paramGeral = null;
        $paramsAtivos = null;

        if (!empty($config['form_params'])) {
            $paramGeral = new ParamGeralMOD();
            $paramsAtivos = $paramGeral->getParamGeralAtivo();

            foreach ($config['form_params'] as $paramName) {
                $getter = 'get' . ucfirst($paramName);
                if (method_exists($paramsAtivos, $getter)) {
                    $formParams[$paramName] = $paramsAtivos->$getter();
                }
            }
        }

        // === DEFAULTS — valores padrão do ParamGeral para uso interno ===
        // Declarativo: ['status_abertura_oportunidade', 'status_abre_ficha']
        // Busca automaticamente via ParamGeralMOD e injeta em formParams
        if (!empty($config['defaults'])) {
            if (!$paramGeral) {
                $paramGeral = new ParamGeralMOD();
                $paramsAtivos = $paramGeral->getParamGeralAtivo();
            }

            foreach ($config['defaults'] as $defaultKey) {
                $getter = 'get' . ucfirst($defaultKey);
                if (!method_exists($paramsAtivos, $getter)) {
                    throw new \RuntimeException(
                        sprintf(
                            '[renderForm] Default "%s" não encontrado no ParamGeralMOD. ' .
                            'Método "%s" inexistente. Declare em form_params se precisar de hidden input.',
                            $defaultKey,
                            $getter
                        )
                    );
                }
                $formParams[$defaultKey] = $paramsAtivos->$getter();
            }
        }

        // Adiciona hidden inputs dos parâmetros globais (apenas form_params, não defaults)
        $hiddenParamNames = array_flip($config['form_params'] ?? []);
        foreach ($formParams as $name => $value) {
            if (!isset($hiddenParamNames[$name])) {
                continue;
            }
            $hiddenItems[] = sprintf(
                '<input type="hidden" name="__form_param_%s" value="%s">',
                htmlspecialchars($name),
                htmlspecialchars((string)$value)
            );
        }

        // Normalizar botões
        $buttons = $this->normalizeStandardFormButtons($config['buttons'] ?? []);

        // Resolver sections a partir de sections explícitas ou fields flat
        $sections = $this->normalizeFormSections(
            $config['cards'] ?? ($config['sections'] ?? []),
            $config['fields'] ?? []
        );

        // Processa step nas sections
        foreach ($sections as &$section) {
            if (!empty($section['step'])) {
                $section['__step'] = (int) $section['step'];
            }
        }
        unset($section);
        // Prepara config de step
        $stepConfig = $config['step_config'] ?? [];
        $stepRulesJson = json_encode($stepConfig['skip'] ?? []);

        $this->normalizeFormRuleMetadata($sections, $buttons, $config);

        // === PROCESSAMENTO DE NOVAS REGRAS (v2.0) ===
        foreach ($sections as &$section) {
            if (!empty($section['fields'])) {
                foreach ($section['fields'] as &$field) {
                    if (!is_array($field)) continue;

                    // Processa options_when
                    if (!empty($field['options_when'])) {
                        $field['__options_when_json'] = json_encode($field['options_when']);
                    }

                    // Processa mask_when
                    if (!empty($field['mask_when'])) {
                        $field['__mask_when_json'] = json_encode($field['mask_when']);
                    }

                    // Processa validate_when
                    if (!empty($field['validate_when'])) {
                        $field['__validate_when_json'] = json_encode($field['validate_when']);
                    }

                    // Processa fetch_when (v2.2)
                    if (!empty($field['fetch_when'])) {
                        $field['__fetch_when_json'] = json_encode($field['fetch_when']);
                    }

                    if (!empty($field['remote_validate_when'])) {
                        $field['__remote_validate_when_json'] = json_encode($field['remote_validate_when']);
                    }

                    if (!empty($field['set_value_when'])) {
                        $field['__set_value_when_json'] = json_encode($field['set_value_when']);
                    }

                    if (!empty($field['computed_when'])) {
                        $field['__computed_when_json'] = json_encode($field['computed_when']);
                    }

                    if (!empty($field['lock_when'])) {
                        $field['__lock_when_json'] = json_encode($field['lock_when']);
                    }

                    if (!empty($field['prevent_submit_when'])) {
                        $field['__prevent_submit_when_json'] = json_encode($field['prevent_submit_when']);
                    }

                    if (!empty($field['populate_when'])) {
                        $field['__populate_when_json'] = json_encode($field['populate_when']);
                    }

                    if (!empty($field['revert_when'])) {
                        $field['__revert_when_json'] = json_encode($field['revert_when']);
                    }

                    if (!empty($field['copy_when'])) {
                        $field['__copy_when_json'] = json_encode($field['copy_when']);
                    }

                    if (!empty($field['dynamic_table'])) {
                        $field['__dynamic_table_json'] = json_encode($field['dynamic_table']);
                    }

                    if (!empty($field['password_policy'])) {
                        $field['__password_policy_json'] = json_encode($field['password_policy']);
                    }
                }
            }
        }
        unset($section, $field);

        // Processa submit_handler no formulário (form-level)
        if (!empty($config['submit_handler'])) {
            $config['__submit_handler_json'] = json_encode($config['submit_handler']);
        }

        // === APLICAÇÃO DE VALORES PADRÃO (default_values) ===
        if (!empty($config['default_values']) && !empty($formParams)) {
            foreach ($config['default_values'] as $fieldName => $defaultConfig) {
                $paramName = $defaultConfig['param'] ?? null;
                if (!$paramName || !isset($formParams[$paramName])) continue;

                $defaultValue = $formParams[$paramName];

                // Procura o campo nas sections e aplica valor padrão se estiver vazio
                foreach ($sections as &$section) {
                    if (empty($section['fields'])) continue;

                    foreach ($section['fields'] as &$field) {
                        if (!is_array($field)) continue;

                        // Verifica se é o campo pelo nome
                        $fieldNameMatch = $field['name'] ?? '';
                        if ($fieldNameMatch !== $fieldName) continue;

                        // Se não tiver valor definido, aplica o padrão
                        if (!isset($field['value']) || $field['value'] === '' || $field['value'] === null) {
                            $field['value'] = $defaultValue;
                        }
                    }
                }
                unset($section, $field);
            }
        }

        // === INJEÇÃO DE SCRIPT DE VALIDAÇÃO GLOBAL ===
        $validationScript = $this->buildFormValidationScript($formName, $sections, $config);
        if ($validationScript !== '') {
            $existingAfterScript = $config['after_script'] ?? '';
            if ($existingAfterScript !== '' && stripos($existingAfterScript, '<script') === false) {
                $existingAfterScript = '<script>' . $existingAfterScript . '</script>';
            }
            $config['after_script'] = $existingAfterScript . $validationScript;
        }

        $clientBehaviorsJson = '';
        if (!empty($config['client_behaviors'])) {
            $clientBehaviorsJson = json_encode($config['client_behaviors'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($clientBehaviorsJson === false) {
                $clientBehaviorsJson = '';
            }
        }

        $params = [
            'tag_form'       => $tagForm,
            'persist'        => $persistItems,
            'hidden'         => $hiddenItems,
            'sections'       => $sections,
            'fields'         => [],
            'buttons'        => $buttons,
            'title'          => $config['title'] ?? '',
            'subtitle'       => $config['subtitle'] ?? '',
            'before_content' => $config['before_content'] ?? '',
            'after_html'     => $config['after_html'] ?? '',
            'after_script'   => $config['after_script'] ?? '',
            'form_name'      => $formName,
            'form_id'        => $config['form_id'] ?? $formName,
            'form_class'     => $config['form_class'] ?? 'ilu-form',
            'page_class'     => $config['page_class'] ?? '',
            'client_behaviors_json' => $clientBehaviorsJson,
            'controller'     => $config['controller'] ?? $this->_controller,
            'after_action'   => $config['after_action'] ?? ($config['afteract'] ?? 'listagem'),
            'is_aggregate'   => array_key_exists('is_aggregate', $config)
                ? (bool) $config['is_aggregate']
                : System::requestHas('codpai'),
            'clear_after'    => array_key_exists('clear_after', $config) ? $config['clear_after'] : true,
            'mode'           => $mode,
            'form_params'    => $formParams,
            'step_config'    => $stepConfig,
            'step_rules_json'=> $stepRulesJson,
            'load_rule_assets' => array_key_exists('load_rule_assets', $config) ? (bool) $config['load_rule_assets'] : true,
        ];

        // Merge overrides for backward compatibility with migrated controllers
        if (!empty($config['overrides']) && is_array($config['overrides'])) {
            $params = array_merge($params, $config['overrides']);
        }

        $template = $config['template'] ?? null;
        if (empty($template)) {
            if ($mode === 'cards') {
                $template = "layout/controller-first/form-builder-cards";
            } elseif ($mode === 'compact') {
                $template = "layout/controller-first/form-builder-compact";
            } else {
                $template = "layout/controller-first/form-builder";
            }
        }

        $view = $this->buildView($template, $params);
        $view->compilate2();

    }

    /**
     * Gera script de validação global para renderForm().
     *
     * Valida campos obrigatórios (required=true ou required_when) no submit,
     * ignora campos ocultos via visible_when, mostra contador em tempo real,
     * e integra com FormRuleEngine para required_when dinâmico.
     *
     * @param string $formName   Nome/id do formulário
     * @param array  $sections    Sections normalizadas do form
     * @param array  $config      Config completo do renderForm
     * @return string Script JS para injeção, ou string vazia se não houver campos obrigatórios
     */
    protected function buildFormValidationScript(string $formName, array $sections, array $config): string
    {
        $requiredFields = [];
        $requiredWhenFields = [];

        foreach ($sections as $section) {
            if (empty($section['fields']) || !is_array($section['fields'])) {
                continue;
            }
            foreach ($section['fields'] as $field) {
                if (!is_array($field)) {
                    continue;
                }
                $name = $field['name'] ?? '';
                if ($name === '') {
                    continue;
                }

                $isRequired = !empty($field['required']);
                $hasRequiredWhen = !empty($field['required_when']);
                $hasVisibleWhen = !empty($field['visible_when']);

                if ($isRequired || $hasRequiredWhen) {
                    $fieldInfo = [
                        'name' => $name,
                        'type' => $field['type'] ?? 'text',
                        'label' => $field['label'] ?? $name,
                    ];
                    if ($hasVisibleWhen) {
                        $fieldInfo['visible_when'] = true;
                    }

                    if ($hasRequiredWhen) {
                        $requiredWhenFields[] = $fieldInfo;
                    } else {
                        $requiredFields[] = $fieldInfo;
                    }
                }
            }
        }

        if (empty($requiredFields) && empty($requiredWhenFields)) {
            return '';
        }

        $requiredJson = json_encode($requiredFields, JSON_UNESCAPED_UNICODE);
        $requiredWhenJson = json_encode($requiredWhenFields, JSON_UNESCAPED_UNICODE);

        // Determina se o form está em drawer (verifica se há drawer_context nos hidden)
        $isDrawer = !empty($config['drawer_context']);
        $containerPrefix = $isDrawer ? "'#' + drawerId + ' '" : "''";
        $isDrawerJs = $isDrawer ? 'true' : 'false';

        $script = <<<JS
(function() {
    var formName = '{$formName}';
    var requiredFields = {$requiredJson};
    var requiredWhenFields = {$requiredWhenJson};
    var isDrawer = {$isDrawerJs};

    function getForm() {
        return document.getElementById(formName);
    }

    function getField(name) {
        var form = getForm();
        if (!form) return null;
        var field = form.querySelector('[name="' + name + '"]');
        if (!field) {
            field = form.querySelector('[name="' + name + '[]"]');
        }
        return field;
    }

    function isFieldVisible(field) {
        if (!field) return false;
        var el = field;
        // Para radios, checkboxes e inputs hidden, verifica visibilidade do wrapper
        if (field.type === 'radio' || field.type === 'hidden' || field.type === 'checkbox') {
            el = field.closest('.form-group, .ilu-form-compact__field, [class*="col-"], .crm-autocomplete-wrapper') || field;
        }
        return el.offsetParent !== null && getComputedStyle(el).display !== 'none';
    }

    function getFieldValue(field) {
        if (!field) return '';
        var type = field.type || field.tagName.toLowerCase();
        var value = '';

        if (type === 'radio') {
            var checked = field.closest('form').querySelector('input[name="' + field.name + '"]:checked');
            value = checked ? checked.value : '';
        } else if (type === 'checkbox') {
            if (field.name.endsWith('[]')) {
                var checked = field.closest('form').querySelectorAll('input[name="' + field.name + '"]:checked');
                value = checked.length > 0 ? 'checked' : '';
            } else {
                value = field.checked ? field.value : '';
            }
        } else if (field.classList.contains('ql-editor') || field.closest('.ql-container')) {
            var quillContainer = field.closest('.ql-container');
            if (quillContainer && quillContainer.__quill) {
                value = quillContainer.__quill.getText().trim();
            } else {
                value = field.innerText.trim();
            }
        } else if (field.classList.contains('note-editable') || field.closest('.note-editor')) {
            var summernote = field.closest('.note-editor');
            if (summernote) {
                var editable = summernote.querySelector('.note-editable');
                value = editable ? editable.innerText.trim() : '';
            }
        } else if (field.tagName.toLowerCase() === 'select') {
            value = field.value;
        } else if (field.type === 'hidden' && field.classList.contains('crm-autocomplete-value')) {
            value = field.value !== undefined ? String(field.value).trim() : '';
            if (value === '') {
                var autoWrapper = field.closest('.crm-autocomplete-wrapper');
                if (autoWrapper) {
                    var displayField = autoWrapper.querySelector('.crm-autocomplete-display-value');
                    var textField = autoWrapper.querySelector('.crm-autocomplete-text');
                    value = displayField && displayField.value !== ''
                        ? String(displayField.value).trim()
                        : (textField && textField.value !== undefined ? String(textField.value).trim() : '');
                }
            }
        } else {
            value = field.value !== undefined ? String(field.value).trim() : '';
        }

        return value;
    }

    function setFieldError(field, isError) {
        if (!field) return;
        var wrapper = field.closest('.form-group, .ilu-form-compact__field, [class*="col-"], .field-wrapper, .crm-autocomplete-wrapper') || field;
        var label = wrapper.querySelector('label, .ilu-form-compact__label');

        // Para autocomplete, aplica no input text visível também
        var visualInput = field;
        if (field.type === 'hidden' && field.classList.contains('crm-autocomplete-value')) {
            var autoWrapper = field.closest('.crm-autocomplete-wrapper');
            if (autoWrapper) {
                visualInput = autoWrapper.querySelector('.crm-autocomplete-text') || field;
            }
        }

        // Para SN toggle, aplica no switch visual (irmão anterior do input hidden)
        var snSwitch = null;
        if (field.type === 'hidden' && field.previousElementSibling && field.previousElementSibling.classList.contains('sfield-sn-switch')) {
            snSwitch = field.previousElementSibling;
        }

        // Para Select2, aplica no container visual
        var select2Container = null;
        if (field.classList && field.classList.contains('select2-hidden-accessible')) {
            var select2Id = field.getAttribute('data-select2-id');
            if (select2Id) {
                select2Container = document.querySelector('.select2-container[data-select2-id="' + select2Id + '"]');
            }
            if (!select2Container) {
                select2Container = field.nextElementSibling;
                if (select2Container && !select2Container.classList.contains('select2-container')) {
                    select2Container = null;
                }
            }
        }

        // Para TomSelect, aplica no wrapper
        var tomSelectWrapper = null;
        if (field.classList && field.classList.contains('tomselected')) {
            tomSelectWrapper = field.closest('.ts-wrapper');
        }

        if (isError) {
            field.classList.add('ilu-field-error');
            visualInput.classList.add('ilu-field-error');
            if (snSwitch) snSwitch.classList.add('ilu-field-error');
            if (select2Container) select2Container.classList.add('ilu-field-error');
            if (tomSelectWrapper) tomSelectWrapper.classList.add('ilu-field-error');
            wrapper.classList.add('ilu-field-wrapper-error');
            if (label) label.classList.add('ilu-label-error');
        } else {
            field.classList.remove('ilu-field-error');
            visualInput.classList.remove('ilu-field-error');
            if (snSwitch) snSwitch.classList.remove('ilu-field-error');
            if (select2Container) select2Container.classList.remove('ilu-field-error');
            if (tomSelectWrapper) tomSelectWrapper.classList.remove('ilu-field-error');
            wrapper.classList.remove('ilu-field-wrapper-error');
            if (label) label.classList.remove('ilu-label-error');
        }
    }

    function validateField(fieldInfo) {
        var field = getField(fieldInfo.name);
        if (!field) return true;
        if (field.disabled) return true;
        if (!isFieldVisible(field)) return true;

        var value = getFieldValue(field);
        var isEmpty = value === '' || value === null || value === undefined;

        if (fieldInfo.type === 'file' || fieldInfo.type === 'upload') {
            isEmpty = !field.files || field.files.length === 0;
        }
        if (fieldInfo.type === 'select' || fieldInfo.type === 'select2' || fieldInfo.type === 'tomselect') {
            isEmpty = value === '' || value === null;
        }
        if (fieldInfo.type === 'quill' || fieldInfo.type === 'summernote') {
            isEmpty = value === '' || value === '<p><br></p>' || value === '<br>';
        }
        if (fieldInfo.type === 'checkbox' || fieldInfo.type === 'radio') {
            isEmpty = value === '';
        }

        setFieldError(field, isEmpty);
        return !isEmpty;
    }

    function validateRequiredWhenFields() {
        var allValid = true;
        for (var i = 0; i < requiredWhenFields.length; i++) {
            var fieldInfo = requiredWhenFields[i];
            var field = getField(fieldInfo.name);
            if (!field) continue;
            if (!isFieldVisible(field)) continue;

            var isRequired = field.classList.contains('form-rule-required') ||
                           field.dataset.requiredWhen === 'true';
            if (!isRequired) {
                var wrapper = field.closest('.ilu-form-compact__field, .form-group');
                isRequired = wrapper && wrapper.querySelector('.ilu-form-compact__label--required') !== null;
            }

            if (isRequired) {
                var valid = validateField(fieldInfo);
                if (!valid) allValid = false;
            } else {
                setFieldError(field, false);
            }
        }
        return allValid;
    }

    function validateAll() {
        var allValid = true;
        var form = getForm();
        if (!form) {
            return true;
        }

        // 1. Campos required fixos
        for (var i = 0; i < requiredFields.length; i++) {
            var valid = validateField(requiredFields[i]);
            if (!valid) allValid = false;
        }

        // 2. Campos required_when dinâmicos
        if (!validateRequiredWhenFields()) {
            allValid = false;
        }

        // 3. Campos com validação customizada do FormRuleValidatePlugin
        var validatedInputs = form.querySelectorAll('.form-rule-validated');
        for (var i = 0; i < validatedInputs.length; i++) {
            var input = validatedInputs[i];
            if (!isFieldVisible(input)) continue;

            var plugin = null;
            if (window.FormRuleEngine && window.FormRuleEngine.plugins) {
                plugin = window.FormRuleEngine.plugins['validate'];
            } else if (window.FormRuleValidatePlugin) {
                plugin = window.FormRuleValidatePlugin;
            }

            if (plugin && typeof plugin.validateField === 'function') {
                if (!plugin.validateField(input)) {
                    allValid = false;
                }
            }
        }

        return allValid;
    }

    // Guarda contra injeção duplicada e registra validador no mapa global
    window.__iluValidationForms = window.__iluValidationForms || {};
    // Sempre atualiza o registro para handle drawers recarregados via AJAX
    window.__iluValidationForms[formName] = {
        getForm: getForm,
        validateAll: validateAll
    };

    var form = getForm();
    if (!form) {
        return;
    }

    // Validação em tempo real (blur + change)
    function handleFieldValidation(e) {
        var target = e.target;
        if (!target || !target.name) return;

        for (var i = 0; i < requiredFields.length; i++) {
            if (requiredFields[i].name === target.name) {
                target.classList.add('ilu-field-dirty');
                validateField(requiredFields[i]);
                break;
            }
        }
        for (var i = 0; i < requiredWhenFields.length; i++) {
            if (requiredWhenFields[i].name === target.name) {
                target.classList.add('ilu-field-dirty');
                validateRequiredWhenFields();
                break;
            }
        }

        // Se for um switch SN ou campo que afeta visible_when,
        // valida todos os campos required visíveis e vazios para feedback instantâneo
        if (e.type === 'change') {
            for (var i = 0; i < requiredFields.length; i++) {
                var fieldInfo = requiredFields[i];
                if (fieldInfo.name === target.name) continue;
                var field = getField(fieldInfo.name);
                if (field && isFieldVisible(field) && !field.classList.contains('ilu-field-dirty')) {
                    var value = getFieldValue(field);
                    if (value === '' || value === null || value === undefined) {
                        validateField(fieldInfo);
                    }
                }
            }
            validateRequiredWhenFields();
        }
    }

    form.addEventListener('blur', handleFieldValidation, true);
    form.addEventListener('change', handleFieldValidation, true);

    // Validação no submit nativo (fallback)
    form.addEventListener('submit', function(e) {
        if (!validateAll()) {
            e.preventDefault();
            e.stopPropagation();

            var firstError = form.querySelector('.ilu-field-error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstError.focus();
            }
            return false;
        }

        if (typeof window.validate === 'function') {
            try {
                if (!window.validate(formName)) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            } catch (err) {}
        }
    });

    // === INTERCEPTAÇÃO DE sendForm (global, uma vez só) ===
    if (typeof window.sendForm === 'function' && !window.__iluValidateSendFormWrapped) {
        var originalSendForm = window.sendForm;
        window.__iluValidateSendFormWrapped = true;

        window.sendForm = function(sendFormName, ctl, act, afteract, afterexec, diag, diag2) {
            var validators = window.__iluValidationForms || {};
            var validator = validators[sendFormName];

            if (validator && typeof validator.validateAll === 'function') {
                if (!validator.validateAll()) {
                    var formEl = validator.getForm ? validator.getForm() : document.getElementById(sendFormName);
                    if (formEl) {
                        var firstError = formEl.querySelector('.ilu-field-error');
                        if (firstError) {
                            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            firstError.focus();
                        }
                    }
                    return false;
                }
            }

            return originalSendForm.apply(this, arguments);
        };
    }
})();

JS;

        return '<script>' . $script . '</script>';
    }

    /**
     * @deprecated Use buildFormNode(). Mantido porque o dispatcher e varios
     *             pontos ainda o chamam; some em F1.20.
     */
    protected function captureFormOutput(array $config): string
    {
        // renderChildren, nao renderToString: o no ja carrega o HTML nos
        // filhos, e renderToString o devolveria ao handler de 'form', que
        // chama este metodo — recursao infinita (ver F1.8).
        return UiRenderer::renderChildren($this->buildFormNode($config));
    }

    protected function captureFormFragment(array $config): string
    {
        $mode = $config['mode'] ?? 'standard';
        $sections = $this->normalizeFormSections(
            $config['cards'] ?? ($config['sections'] ?? []),
            $config['fields'] ?? []
        );
        $buttons = [];
        $this->normalizeFormRuleMetadata($sections, $buttons, $config);

        if ($mode === 'cards') {
            return $this->captureViewOutput('layout/controller-first/form-builder-cards', [
                'tag_form' => '',
                'persist' => [],
                'hidden' => [],
                'sections' => $sections,
                'buttons' => [],
                'title' => $config['title'] ?? '',
                'subtitle' => $config['subtitle'] ?? '',
                'before_content' => $config['before_content'] ?? '',
                'after_html' => $config['after_html'] ?? '',
                'after_script' => $config['after_script'] ?? '',
                'form_name' => $config['form_name'] ?? ($config['form_id'] ?? 'form-fragment'),
                'form_id' => $config['form_id'] ?? ($config['form_name'] ?? 'form-fragment'),
                'form_class' => $config['form_class'] ?? 'ilu-form',
                'page_class' => $config['page_class'] ?? 'ilu-form-fragment--cards',
                'controller' => $config['controller'] ?? $this->_controller,
                'after_action' => $config['after_action'] ?? ($config['afteract'] ?? 'listagem'),
                'is_aggregate' => false,
                'clear_after' => false,
                'mode' => $mode,
            ]);
        }

        if ($mode === 'compact') {
            return $this->captureViewOutput('layout/controller-first/form-builder-compact', [
                'tag_form' => '',
                'persist' => [],
                'hidden' => [],
                'sections' => $sections,
                'buttons' => [],
                'title' => $config['title'] ?? '',
                'subtitle' => $config['subtitle'] ?? '',
                'before_content' => $config['before_content'] ?? '',
                'after_html' => $config['after_html'] ?? '',
                'after_script' => $config['after_script'] ?? '',
                'form_name' => $config['form_name'] ?? ($config['form_id'] ?? 'form-fragment'),
                'form_id' => $config['form_id'] ?? ($config['form_name'] ?? 'form-fragment'),
                'form_class' => $config['form_class'] ?? '',
                'page_class' => $config['page_class'] ?? '',
                'controller' => $config['controller'] ?? $this->_controller,
                'after_action' => $config['after_action'] ?? ($config['afteract'] ?? 'listagem'),
                'is_aggregate' => false,
                'clear_after' => false,
                'mode' => $mode,
            ]);
        }

        return $this->captureViewOutput('layout/controller-first/components/form/form-fragment', [
            'sections' => $sections,
            'title' => $config['title'] ?? '',
            'subtitle' => $config['subtitle'] ?? '',
            'className' => $config['className'] ?? '',
            'show_section_titles' => array_key_exists('show_section_titles', $config)
                ? (bool) $config['show_section_titles']
                : true,
        ]);
    }

    protected function normalizeFormRuleMetadata(array &$sections, array &$buttons = [], array &$config = []): void
    {
        foreach ($sections as &$section) {
            if (!empty($section['visible_when'])) {
                $section['__visible_when_json'] = $this->encodeFormRuleCondition($section['visible_when']);
            }

            if (empty($section['fields'])) {
                continue;
            }

            foreach ($section['fields'] as &$field) {
                if (!is_array($field)) {
                    continue;
                }

                if (!empty($field['visible_when'])) {
                    $field['__visible_when_json'] = $this->encodeFormRuleCondition($field['visible_when']);
                }
                if (!empty($field['required_when'])) {
                    $field['__required_when_json'] = $this->encodeFormRuleCondition($field['required_when']);
                }
                if (!empty($field['disabled_when'])) {
                    $field['__disabled_when_json'] = $this->encodeFormRuleCondition($field['disabled_when']);
                }
                if (!empty($field['label_when'])) {
                    $field['__label_when_json'] = $this->encodeFormRuleCondition($field['label_when']);
                }
            }
            unset($field);
        }
        unset($section);

        foreach ($buttons as &$button) {
            if (!is_array($button)) {
                continue;
            }

            if (!empty($button['visible_when'])) {
                $button['__visible_when_json'] = $this->encodeFormRuleCondition($button['visible_when']);
            }
            if (!empty($button['enabled_when'])) {
                $button['__enabled_when_json'] = $this->encodeFormRuleCondition($button['enabled_when']);
            }
            if (!empty($button['confirm_submit'])) {
                $button['__confirm_submit_json'] = json_encode($button['confirm_submit']);
            }
        }
        unset($button);
    }

    protected function encodeFormRuleCondition($rule): string
    {
        $json = json_encode($this->normalizeFormRuleCondition($rule), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return $json === false ? '{}' : $json;
    }

    protected function normalizeFormRuleCondition($rule)
    {
        if (!is_array($rule)) {
            return $rule;
        }

        if (isset($rule['field']) && array_key_exists('value', $rule)) {
            $operator = $this->normalizeFormRuleOperator($rule['op'] ?? ($rule['operator'] ?? 'eq'));
            return [(string) $rule['field'] => [$operator => $rule['value']]];
        }

        if (
            array_key_exists(0, $rule)
            && array_key_exists(1, $rule)
            && array_key_exists(2, $rule)
            && count($rule) === 3
            && is_scalar($rule[0])
            && is_scalar($rule[1])
        ) {
            return [(string) $rule[0] => [$this->normalizeFormRuleOperator($rule[1]) => $rule[2]]];
        }

        if ($this->isSequentialArray($rule)) {
            return ['AND' => array_map(function ($condition) {
                return $this->normalizeFormRuleCondition($condition);
            }, $rule)];
        }

        $normalized = [];
        foreach ($rule as $field => $value) {
            if ($field === 'AND' || $field === 'OR') {
                $conditions = is_array($value) ? $value : [];
                $normalized[$field] = array_map(function ($condition) {
                    return $this->normalizeFormRuleCondition($condition);
                }, $conditions);
                continue;
            }

            if (is_array($value) && array_key_exists(0, $value) && array_key_exists(1, $value) && count($value) === 2) {
                $normalized[$field] = [$this->normalizeFormRuleOperator($value[0]) => $value[1]];
                continue;
            }

            if (is_array($value) && count($value) === 1) {
                $operator = array_key_first($value);
                if (is_string($operator)) {
                    $normalized[$field] = [$this->normalizeFormRuleOperator($operator) => $value[$operator]];
                    continue;
                }
            }

            $normalized[$field] = $value;
        }

        return $normalized;
    }

    protected function normalizeFormRuleOperator($operator): string
    {
        $operator = strtolower(trim((string) $operator));
        $aliases = [
            '=' => 'eq',
            '==' => 'eq',
            '===' => 'eq',
            'eq' => 'eq',
            '!=' => '!=',
            '<>' => '!=',
            '!==' => '!=',
            'neq' => '!=',
            'not_eq' => '!=',
        ];

        return $aliases[$operator] ?? $operator;
    }

    /**
     * Expande "field-groups": um campo declarado como
     *   ['type'=>'group', 'title'=>'Características', 'fields'=>[...], 'visible_when'=>...]
     * é achatado em um subtítulo (campo html full-width) seguido dos fields
     * aninhados. O visible_when do grupo é propagado para o subtítulo e para cada
     * field aninhado que ainda não tenha o próprio — o grupo inteiro mostra/esconde
     * junto. Reusa o suporte a fields type=html (nenhuma mudança de template/CSS).
     */
    protected function expandFormFieldGroups(array $sections): array
    {
        foreach ($sections as &$section) {
            if (empty($section['fields']) || !is_array($section['fields'])) {
                continue;
            }

            $expanded = [];
            foreach ($section['fields'] as $field) {
                if (!is_array($field) || ($field['type'] ?? '') !== 'group') {
                    $expanded[] = $field;
                    continue;
                }

                $groupVisible = $field['visible_when'] ?? null;

                if (!empty($field['title'])) {
                    // Cores via tokens do design system (trocam no tema escuro), não hex fixo.
                    $headingHtml = '<div class="ilu-form-group-heading" style="font-weight:600;font-size:12px;'
                        . 'letter-spacing:.02em;text-transform:uppercase;color:var(--ilu-text-secondary,#616161);margin:8px 0 2px;'
                        . 'padding-bottom:5px;border-bottom:1px solid var(--ilu-border-subtle,#e8e8e8);">'
                        . htmlspecialchars((string) $field['title'], ENT_QUOTES, 'UTF-8')
                        . '</div>';
                    $heading = ['type' => 'html', 'html' => $headingHtml, 'col' => 12];
                    if ($groupVisible) {
                        $heading['visible_when'] = $groupVisible;
                    }
                    $expanded[] = $heading;
                }

                foreach (($field['fields'] ?? []) as $sub) {
                    if (is_array($sub) && $groupVisible && empty($sub['visible_when'])) {
                        $sub['visible_when'] = $groupVisible;
                    }
                    $expanded[] = $sub;
                }
            }

            $section['fields'] = $expanded;
        }
        unset($section);

        return $sections;
    }

    protected function normalizeFormSections(array $sections = [], array $flatFields = []): array
    {
        if (empty($sections) && !empty($flatFields)) {
            $sections = $this->groupFlatFieldsIntoSections($flatFields);
        }

        // Açúcar de layout: campos type=group viram um subtítulo (html full-width)
        // + os fields aninhados. Feito ANTES do processamento p/ não cair no
        // FormFieldFactory::make (que faria fallback p/ text input).
        $sections = $this->expandFormFieldGroups($sections);

        foreach ($sections as &$section) {
            if (!isset($section['fields'])) {
                $section['fields'] = [];
                continue;
            }

            foreach ($section['fields'] as $idx => $fieldDef) {
                if (is_object($fieldDef) && method_exists($fieldDef, 'compilate')) {
                    continue;
                }

                if (is_array($fieldDef)) {
                    if (isset($fieldDef['tag']) && !isset($fieldDef['input'])) {
                        $fieldDef['input'] = $fieldDef['tag'];
                    }

                    if (isset($fieldDef['field']) && !isset($fieldDef['input'])) {
                        $fieldDef['input'] = $fieldDef['field'];
                    }

                    if (isset($fieldDef['html']) && !isset($fieldDef['input'])) {
                        $fieldDef['input'] = $fieldDef['html'];
                    }

                    if (!isset($fieldDef['input']) && isset($fieldDef['type'])) {
                        $fieldDef['input'] = FormFieldFactory::make($fieldDef);
                    }

                    if (isset($fieldDef['input']) && is_object($fieldDef['input'])) {
                        if (empty($fieldDef['label']) && method_exists($fieldDef['input'], 'getLabel')) {
                            $lbl = $fieldDef['input']->getLabel();
                            if (is_string($lbl) && trim($lbl) !== '') {
                                // SFieldUpload stores button HTML as label — extract text
                                if (stripos($lbl, '<input') !== false && preg_match("/value='([^']+)'/", $lbl, $m)) {
                                    $lbl = $m[1];
                                } elseif (stripos($lbl, '<input') !== false && preg_match('/value="([^"]+)"/', $lbl, $m)) {
                                    $lbl = $m[1];
                                } elseif (stripos($lbl, '<') === 0) {
                                    $lbl = strip_tags($lbl);
                                }
                                $fieldDef['label'] = $lbl;
                            }
                        }
                        if (empty($fieldDef['name']) && method_exists($fieldDef['input'], 'getName')) {
                            $fieldDef['name'] = $fieldDef['input']->getName();
                        }
                    }

                    $section['fields'][$idx] = $fieldDef;
                }
            }
        }
        unset($section);

        return $sections;
    }

    /**
     * Agrupa campos flat em sections baseado em 'section' ou 'card'.
     * Preserva a ordem de aparecimento dos campos.
     */
    protected function groupFlatFieldsIntoSections(array $flatFields): array
    {
        $groups = [];
        foreach ($flatFields as $fieldDef) {
            if (empty($fieldDef)) {
                continue;
            }
            if (is_object($fieldDef) && method_exists($fieldDef, 'getName')) {
                $secName = 'Geral';
            } elseif (is_array($fieldDef)) {
                $secName = $fieldDef['section'] ?? ($fieldDef['card'] ?? 'Geral');
            } else {
                continue;
            }
            if (!isset($groups[$secName])) {
                $groups[$secName] = ['title' => $secName, 'fields' => []];
            }
            $groups[$secName]['fields'][] = $fieldDef;
        }
        return array_values($groups);
    }

    public function formataData($date, $separador = '/', $exibir_hora = false)
    {
        $d = explode('-', $date);
        $d2 = null;
        if(strpos($date,':') === false){
            $d2 = $d[2].$separador.$d[1].$separador.$d[0];
        }else{
            $d[2] = explode(' ',$d[2]);
            $h = $d[2][1];
            $d2 = $exibir_hora === false ? $d[2][0].$separador.$d[1].$separador.$d[0] : $d[2][0].$separador.$d[1].$separador.$d[0].' '.$h;
        }

        return $d2;
    }

    public function formataDataDb($date)
    {
        $d = explode('/', $date);
        $d2 = null;
        if(strpos($date,':') === false){
            $d2 = sprintf("%s-%s-%s",$d[2],$d[1],$d[0]);
        }else{
            $d[2] = explode(' ',$d[2]);
            $h = $d[2][1];
            $d2 = sprintf("%s-%s-%s %s",$d[2][0], $d[1], $d[0], $h);
        }

        return $d2;
    }
}
