<?php
/**
 * FormFieldFactory
 * Cria instâncias de SField a partir de arrays declarativos.
 * Mantém compatibilidade total com os 60+ helpers existentes.
 */
class FormFieldFactory
{
    /**
     * Mapeamento de tipos declarativos para classes SField.
     */
    protected static array $typeMap = [
        // Textuais
        'text'          => 'SFieldText',
        'textarea'      => 'SFieldTextArea',
        'email'         => 'SFieldEmail',
        'password'      => 'SFieldPass',
        'pass'          => 'SFieldPass',

        // Numéricos
        'number'        => 'SFieldNumber',
        'float'         => 'SFieldFloat',
        'money'         => 'SFieldMoney',

        // Data / Hora
        'date'          => 'SFieldDate',
        'datepicker'    => 'SFieldDatePicker',
        'daypicker'     => 'SFieldDayPicker',
        'time'          => 'SFieldTime',
        'timepicker'    => 'SFieldTimePicker',

        // Seleção
        'select'        => 'SFieldCombo',
        'combo'         => 'SFieldCombo',
        'multiselect'   => 'SFieldMultiple',
        'multiple'      => 'SFieldMultiple',

        // Booleanos / Toggle
        'sn'            => 'SFieldSN',
        'toggle'        => 'SFieldToggle',
        'checkbox'      => 'SFieldCheck',
        'check'         => 'SFieldCheck',
        'checkboxlist'  => 'SFieldCheckBoxList',

        // Outros
        'hidden'        => 'SFieldHidden',
        'color'         => 'SFieldColor',
        'html'          => 'SFieldQuill',
        'htmleditor'    => 'SFieldQuill',
        'quill'         => 'SFieldQuill',
        'info'          => 'SFieldInfo',
        'token_list'    => 'SFieldTokenList',
        'weekdays'      => 'SFieldWeekdays',

        // Documentos
        'cpf'           => 'SFieldCpf',
        'cnpj'          => 'SFieldCnpj',
        'cpf_cnpj'      => 'SFieldCpfCnpj',
        'cpfcnpj'       => 'SFieldCpfCnpj',

        // Endereço
        'cep'           => 'SFieldCep',

        // Auto-complete / Busca
        'autocomplete'          => 'SFieldAutoComplete',
        'combo_busca'           => 'SFieldComboBusca',
        'combo_busca_multipla'  => 'SFieldComboBuscaMultipla',
        'multisearch'           => 'SFieldComboBuscaMultipla',
        /* Multi-seleção com busca sem Select2 — mesmo widget e mesmo nome de
           type dos filtros do bento ('combo-busca-multipla'), e mesmo contrato
           de POST do combo_busca_multipla (<select multiple name="X[]">). */
        'combo-busca-multipla'  => 'SFieldMultiSelectBusca',
        'select_busca'          => 'SFieldSelectBusca',
        'combo_busca_tom'       => 'SFieldComboBuscaTom',
        'suggest'               => 'SFieldComboSuggest',
        'upload'                => 'SFieldUpload',
        /* Área de arrastar-e-soltar (Dropzone). Existia só fora do form-builder,
           montada à mão nas views de importação; como DropzoneUpload já é um
           SField, declarar o type aqui é o que faltava para usá-la em renderForm. */
        'dropzone'              => 'DropzoneUpload',
        'pesquisa'              => 'SFieldPesquisa',
        'search'                => 'SFieldPesquisa',
        'pesquisa_multiple'     => 'SFieldPesquisaMultiple',

        // Botões
        'button'                => 'SFieldButton',
        'button_add'            => 'SFieldButtonAdd',
        'button_calc'           => 'SFieldButtonCalc',
        'button_pessoas'        => 'SFieldButtonPessoas',
        'submit'                => 'SFieldSubmit',

        // Telefone / Contato
        'phone'                 => 'SFieldPhone',

        // Range / Slider / Spinner
        'range'                 => 'SFieldRange',
        'slider'                => 'SFieldSlider',
        'spinner'               => 'SFieldSpinner',

        // Documentos adicionais
        'rg'                    => 'SFieldRg',

        // Outros
        'ano'                   => 'SFieldAno',
        'avatar'                => 'SFieldAvatar',
        'date_period'           => 'SFieldDatePeriod',
        'multiple_jquery'       => 'SFieldMultipleJQuery',
        'sn2'                   => 'SFieldSN2',
        'switch'                => 'SFieldSwitch',

        // Variantas Bootstrap (sufixo _b)
        'cep_b'                 => 'SFieldCepB',
        'cnpj_b'                => 'SFieldCnpjB',
        'combo_b'               => 'SFieldComboB',
        'cpf_b'                 => 'SFieldCpfB',
        'date_b'                => 'SFieldDateB',
        'email_b'               => 'SFieldEmailB',
        'money_b'               => 'SFieldMoneyB',
        'number_b'              => 'SFieldNumberB',
        'pesquisa_b'            => 'SFieldPesquisaB',
        'phone_b'               => 'SFieldPhoneB',
        'text_b'                => 'SFieldTextB',
        'textarea_b'            => 'SFieldTextAreaB',
    ];

    /**
     * Cria um campo SField a partir de configuração declarativa.
     *
     * @param array $config Configuração do campo:
     *   - name: string (obrigatório)
     *   - type: string (default: 'text')
     *   - label: string
     *   - value: mixed
     *   - required: bool
     *   - readonly: bool
     *   - disabled: bool
     *   - data: array (opções para select/multiselect)
     *   - none_option: string|array ['label','value']
     *   - visible_none: bool
     *   - style: array|string
     *   - class: string
     *   - persist: bool (remove classe apagavel via persistValue)
     *   - attr: array|string
     *   - properties: array|string
     *   - title: string
     *   - help: string
     *   - onclick: string
     *   - onchange: string
     *   - onblur: string
     *   - id: string
     *   - editable: bool
     *   - show_response: bool (SFieldSN)
     *   - function_click: string (SFieldSN)
     *   - placeholder: string (mapeado para property)
     *   - maxlength: int|string (mapeado para property)
     *   - rows: int (textarea)
     *   - cols: int (textarea)
     *   - max_height: string (textarea: altura máxima de expansão, ex: '400px', 'none')
     *   - percentual: int (SFieldMoney: 0=sem ícone, 1=dólar, 2=porcento)
     *   - image_upload: bool (SFieldHtmlEditor)
     *   - texto: string (SFieldCheck)
     *   - mostra_value: string (SFieldCheck)
     *   - not_block: bool (SFieldButton)
     *   - ignore_class: string (SFieldButton: 'N'|'S')
     *   - v5_style: bool (SFieldButton: ativa estilo v5)
     *   - v5_style_variant: string (SFieldButton: 'primary'|'secondary'|...)
     *   - v5_style_size: string (SFieldButton: 'sm'|'md'|'lg')
     *   - new_option: array (SFieldComboBuscaMultipla: ['name','value'])
     *   - number_type: int (SFieldNumberB)
     *   - money_class: string (SFieldMoneyB)
     *   - shortcuts: bool (SFieldWeekdays: mostra "Dias úteis"/"Fim de semana")
     *   - max_files/only_excel: (DropzoneUpload)
     *   - tokens: array (SFieldTokenList: [['token','label','description'], ...]
     *             ou a forma curta '{TOKEN}' => 'Rótulo')
     *
     * @return SField
     */
    public static function make(array $config): SField
    {
        $type = strtolower((string) ($config['type'] ?? 'text'));
        $className = self::$typeMap[$type] ?? 'SFieldText';

        // Instanciar o campo
        if ($type === 'money' && isset($config['percentual'])) {
            $field = new $className((int) $config['percentual']);
        } elseif ($type === 'money_b' && isset($config['percentual'])) {
            $moneyClass = $config['money_class'] ?? 'money';
            $field = new $className((int) $config['percentual'], $moneyClass);
        } elseif ($type === 'number' && isset($config['number_type'])) {
            $field = new $className((int) $config['number_type']);
        } elseif ($type === 'number_b' && isset($config['number_type'])) {
            $field = new $className((int) $config['number_type']);
        } elseif ($type === 'pesquisa' || $type === 'search') {
            $editavel = $config['editavel'] ?? ($config['editable'] ?? false);
            $field = new $className((bool) $editavel);
        } elseif ($type === 'button' || $type === 'button_add' || $type === 'button_calc' || $type === 'button_pessoas' || $type === 'submit') {
            $notBlock = $config['not_block'] ?? false;
            $ignClass = $config['ignore_class'] ?? 'N';
            $field = new $className((bool) $notBlock, $ignClass);
        } elseif ($type === 'upload' && isset($config['num'])) {
            $field = new $className($config['num']);
        } elseif ($type === 'select_busca') {
            $field = new $className((bool) ($config['multiple'] ?? false));
        } else {
            $field = new $className();
        }

        // Upload: image_preview e has_trash devem ser aplicados antes de setValue/setLabel
        if ($field instanceof SFieldUpload) {
            if (!empty($config['image_preview'])) {
                $field->setImagePreview();
            }
            if (isset($config['has_trash'])) {
                $field->hasUploadTrash($config['has_trash'] ? 'true' : 'false');
            }
        }

        // Nome e ID
        if (!empty($config['name'])) {
            $field->setName($config['name']);
        }
        if (!empty($config['id'])) {
            $field->setId($config['id']);
        }

        // Label (com tradução automática via setLabel)
        if (!empty($config['label']) && method_exists($field, 'setLabel')) {
            $field->setLabel($config['label']);
        }

        // Value
        if (array_key_exists('value', $config)) {
            $field->setValue($config['value']);
        }
        if (array_key_exists('display', $config) && method_exists($field, 'setDisplay')) {
            $field->setDisplay($config['display']);
        }
        if ($type === 'info' && array_key_exists('html', $config)) {
            $field->setValue($config['html']);
        }
        if ($type === 'token_list' && array_key_exists('tokens', $config)) {
            $field->setTokens($config['tokens']);
        }
        if ($type === 'weekdays' && array_key_exists('shortcuts', $config)) {
            $field->setShortcuts($config['shortcuts']);
        }
        if ($type === 'dropzone') {
            if (array_key_exists('max_files', $config)) {
                $field->maxFiles((string) $config['max_files']);
            }
            if (array_key_exists('only_excel', $config)) {
                $field->onlyExcel((bool) $config['only_excel']);
            }
        }

        // Required
        if (!empty($config['required']) && method_exists($field, 'required')) {
            $field->required();
        }

        // Data (opções)
        if (isset($config['data']) && method_exists($field, 'setData')) {
            $field->setData($config['data']);
        }

        // Dropzone: limites e nome do hidden de índice. Os setters não seguem o
        // padrão setX(), então precisam do mapeamento explícito.
        if ($field instanceof DropzoneUpload) {
            if (isset($config['max_files'])) {
                $field->maxFiles($config['max_files']);
            }
            if (isset($config['only_excel'])) {
                $field->onlyExcel($config['only_excel']);
            }
            if (isset($config['indice_anexo'])) {
                $field->indiceAnexo($config['indice_anexo']);
            }
            if (isset($config['max_file_size'])) {
                $field->setMaxFileSize($config['max_file_size']);
            }
        }

        // Tipo de retorno do autocomplete (number/text)
        if (isset($config['return_val']) && method_exists($field, 'setReturnVal')) {
            $field->setReturnVal((string) $config['return_val']);
        }

        // URL remota para busca server-side no autocomplete
        if (!empty($config['remote_url']) && method_exists($field, 'setRemoteUrl')) {
            $field->setRemoteUrl((string) $config['remote_url']);
        }

        // Autocomplete: renderForm oculta a lupa por padrão (opt-in via 'search_icon' => true)
        if (method_exists($field, 'setShowSearchIcon')) {
            $field->setShowSearchIcon(array_key_exists('search_icon', $config) ? (bool) $config['search_icon'] : false);
        }

        // None option
        if (array_key_exists('none_option', $config) && method_exists($field, 'setNoneOption')) {
            $none = $config['none_option'];
            if (is_array($none)) {
                $field->setNoneOption($none['label'] ?? ($none[0] ?? 'Selecione...'), $none['value'] ?? ($none[1] ?? ''));
            } else {
                $field->setNoneOption($none, $config['none_value'] ?? '');
            }
        }

        // Visible none
        if (isset($config['visible_none']) && method_exists($field, 'setVisibleNone')) {
            $field->setVisibleNone((bool) $config['visible_none']);
        }

        // Show response (SFieldSN)
        if (isset($config['show_response']) && method_exists($field, 'setShowResp')) {
            $field->setShowResp((bool) $config['show_response']);
        }

        // Function click (SFieldSN)
        if (!empty($config['function_click']) && method_exists($field, 'setFunctionClick')) {
            $field->setFunctionClick($config['function_click']);
        }

        // Title
        if (!empty($config['title']) && method_exists($field, 'setTitle')) {
            $field->setTitle($config['title']);
        }

        // Help
        if (!empty($config['help']) && method_exists($field, 'setHelp')) {
            $field->setHelp($config['help']);
        }

        // Readonly
        if (!empty($config['readonly']) && method_exists($field, 'readonly')) {
            $field->readonly();
        }

        // Editable
        if (array_key_exists('editable', $config) && method_exists($field, 'setEditable')) {
            $field->setEditable((bool) $config['editable']);
        }

        // Disabled
        if (!empty($config['disabled'])) {
            if (method_exists($field, 'disabled')) {
                $field->disabled();
            } elseif (method_exists($field, 'setEditable')) {
                $field->setEditable(false);
            }
        }

        // Default placeholder for date fields
        if (empty($config['placeholder']) && in_array($type, ['date', 'datepicker', 'date_b'], true)) {
            $config['placeholder'] = 'dd/mm/aaaa';
        }

        // Placeholder
        if (!empty($config['placeholder'])) {
            if (method_exists($field, 'setPlaceholder')) {
                $field->setPlaceholder($config['placeholder']);
            } elseif (method_exists($field, 'addProperty')) {
                $field->addProperty('placeholder', $config['placeholder']);
            }
        }

        // Maxlength como property
        if (isset($config['maxlength']) && method_exists($field, 'addProperty')) {
            $field->addProperty('maxlength', (string) $config['maxlength']);
        }

        // Style
        self::applyStyles($field, $config['style'] ?? null);

        // Classes extras
        if (!empty($config['class']) && method_exists($field, 'addClass')) {
            $field->addClass($config['class']);
        }

        // Preserva valor quando rotinas legadas limpam campos com classe "apagavel"
        if (!empty($config['persist']) && method_exists($field, 'persistValue')) {
            $field->persistValue();
        }

        // Attrs
        self::applyEntries($field, $config['attr'] ?? ($config['attrs'] ?? null), 'addAttr');

        // Properties
        self::applyEntries($field, $config['properties'] ?? null, 'addProperty');

        // Eventos
        foreach (['onclick', 'onchange', 'onblur', 'onfocus', 'onkeydown', 'onkeyup'] as $evt) {
            if (!empty($config[$evt]) && method_exists($field, 'addProperty')) {
                $field->addProperty($evt, $config[$evt]);
            }
        }

        foreach (['setPrefixo' => 'prefix', 'setStep' => 'step', 'setMin' => 'min', 'setMax' => 'max'] as $method => $key) {
            if (array_key_exists($key, $config) && method_exists($field, $method)) {
                $field->$method($config[$key]);
            }
        }

        foreach (['setUnit' => 'unit', 'setScript' => 'script', 'setNum' => 'num', 'setTamanhoMax' => 'max_size', 'setAccept' => 'accept'] as $method => $key) {
            if (array_key_exists($key, $config) && method_exists($field, $method)) {
                $field->$method($config[$key]);
            }
        }

        // SFieldCheck específicos
        if ($field instanceof SFieldCheck) {
            if (isset($config['texto'])) {
                $field->setTexto($config['texto']);
            }
            if (isset($config['mostra_value'])) {
                $field->mostraValue($config['mostra_value']);
            }
        }

        // SFieldUpload específicos
        if ($field instanceof SFieldUpload) {
            if (isset($config['limit'])) {
                $field->setLimit((int) $config['limit']);
            }
        }

        // SFieldHtmlEditor específicos
        if ($field instanceof SFieldHtmlEditor) {
            if (isset($config['image_upload'])) {
                $field->setImageUpload((bool) $config['image_upload']);
            }
            if (isset($config['disable'])) {
                $field->setDisable((bool) $config['disable']);
            }
        }

        // SFieldQuill específicos
        if ($field instanceof SFieldQuill) {
            if (isset($config['image_upload'])) {
                $field->setImageUpload((bool) $config['image_upload']);
            }
            if (isset($config['disable'])) {
                $field->setDisable((bool) $config['disable']);
            }
            if (isset($config['toolbar']) && is_array($config['toolbar'])) {
                $field->setToolbar($config['toolbar']);
            }
            if (!empty($config['placeholder'])) {
                $field->setPlaceholder((string) $config['placeholder']);
            }
            if (isset($config['height'])) {
                $field->setEditorHeight((int) $config['height']);
            }
            // Style height mapeia para editorHeight
            if (isset($config['style']) && is_array($config['style']) && isset($config['style']['height'])) {
                $h = (int) preg_replace('/[^0-9]/', '', $config['style']['height']);
                if ($h > 0) {
                    $field->setEditorHeight($h);
                }
            }
        }

        // SFieldPesquisa específicos
        if ($field instanceof SFieldPesquisa) {
            if (isset($config['path'])) {
                $field->setPath($config['path']);
            }
            if (isset($config['form'])) {
                $field->setForm($config['form']);
            }
            if (isset($config['display'])) {
                $field->setDisplay($config['display']);
            }
            if (!empty($config['cant_type'])) {
                $field->cantType();
            }
            if (isset($config['param']) && is_array($config['param'])) {
                foreach ($config['param'] as $pName => $pValue) {
                    $field->setParam($pName, $pValue);
                }
            }
            if (isset($config['onclick']) && method_exists($field, 'setOnClick')) {
                $field->setOnClick($config['onclick']);
            }
            if (!empty($config['use_drawer']) && method_exists($field, 'useDrawer')) {
                $field->useDrawer();
            }
        }

        // SFieldToggle específicos
        if ($field instanceof SFieldToggle) {
            if (isset($config['label_on'])) {
                $field->setLabelOn($config['label_on']);
            }
            if (isset($config['label_off'])) {
                $field->setLabelOff($config['label_off']);
            }
            if (!empty($config['checked'])) {
                $field->addProperty('checked', 'checked');
            }
        }

        // SFieldButton específicos
        if ($field instanceof SFieldButton) {
            if (isset($config['v5_style'])) {
                $variant = $config['v5_style_variant'] ?? 'secondary';
                $size = $config['v5_style_size'] ?? 'sm';
                $field->setV5Style($variant, $size);
            }
            if (!empty($config['icon'])) {
                $field->setIcon($config['icon']);
            }
            if (!empty($config['pill'])) {
                $field->setPillStyle(true);
            }
        }

        // SFieldTextArea específicos
        if ($field instanceof SFieldTextArea) {
            if (isset($config['max_height']) && method_exists($field, 'setMaxHeight')) {
                $field->setMaxHeight((string) $config['max_height']);
            }
        }

        // SFieldComboBuscaMultipla específicos
        if ($field instanceof SFieldComboBuscaMultipla) {
            if (isset($config['new_option'])) {
                $newOpt = $config['new_option'];
                if (is_array($newOpt)) {
                    $field->setNewOption($newOpt['name'] ?? $newOpt[0] ?? '', $newOpt['value'] ?? $newOpt[1] ?? '');
                }
            }
        }

        // SFieldCheckBoxList específicos
        if ($field instanceof SFieldCheckBoxList && isset($config['items']) && is_array($config['items'])) {
            $field->setItems($config['items']);
        }

        return $field;
    }

    /**
     * Cria múltiplos campos de uma vez.
     *
     * @param array $fields Array de configs
     * @return array Array de SField objects
     */
    public static function makeMany(array $fields): array
    {
        $result = [];
        foreach ($fields as $config) {
            if (empty($config)) {
                continue;
            }
            if (is_object($config) && method_exists($config, 'compilate')) {
                $result[] = $config;
                continue;
            }
            if (is_array($config)) {
                $result[] = self::make($config);
            }
        }
        return $result;
    }

    /**
     * Aplica estilos inline a um campo.
     */
    protected static function applyStyles(SField $field, $style): void
    {
        if (empty($style)) {
            return;
        }
        if (is_string($style)) {
            // Parse "width:100px;height:50px"
            $pairs = array_filter(array_map('trim', explode(';', $style)));
            foreach ($pairs as $pair) {
                if (strpos($pair, ':') === false) {
                    continue;
                }
                [$name, $value] = array_map('trim', explode(':', $pair, 2));
                if (method_exists($field, 'addStyle')) {
                    $field->addStyle($name, $value);
                }
            }
        } elseif (is_array($style)) {
            foreach ($style as $name => $value) {
                if (method_exists($field, 'addStyle')) {
                    $field->addStyle($name, $value);
                }
            }
        }
    }

    /**
     * Aplica atributos ou propriedades genéricas.
     */
    protected static function applyEntries(SField $field, $entries, string $method): void
    {
        if (empty($entries) || !method_exists($field, $method)) {
            return;
        }
        if (is_string($entries)) {
            $field->$method($entries, '');
        } elseif (is_array($entries)) {
            foreach ($entries as $key => $value) {
                if (is_int($key)) {
                    $field->$method($value, '');
                } else {
                    $field->$method($key, $value);
                }
            }
        }
    }
}
