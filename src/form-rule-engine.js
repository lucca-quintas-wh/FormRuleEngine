/**
 * FormRuleEngine v2.0
 * Core extensível para regras condicionais declarativas
 */
window.FormRuleEngine = window.FormRuleEngine || class FormRuleEngine {
    constructor(formRef) {
        this.form = typeof formRef === 'string' ? document.getElementById(formRef) : formRef;
        if (!this.form) return;
        
        this.plugins = new Map();
        this.dependencyMaps = new Map();
        this.elements = new Map();
        this.remoteValidations = new Map();
        
        this.init();
    }
    
    init() {
        this.registerSubmitGuard();
        this.bindEvents();
        this.evaluateAll();
    }

    registerSubmitGuard() {
        const formName = this.form.getAttribute('name') || this.form.id;
        if (!formName) return;

        window.__formRuleEnginesByName = window.__formRuleEnginesByName || {};
        window.__formRuleEnginesByName[formName] = this;

        if (window.__formRuleSubmitGuardInstalled || typeof window.sendForm !== 'function') return;

        const originalSendForm = window.sendForm;
        window.sendForm = function(formRef) {
            const engine = window.__formRuleEnginesByName && window.__formRuleEnginesByName[formRef];
            if (engine) {
                // Valida prevent_submit_when
                const preventPlugin = engine.plugins.get('prevent-submit');
                if (preventPlugin && typeof preventPlugin.validateBeforeSubmit === 'function') {
                    const result = preventPlugin.validateBeforeSubmit(formRef);
                    if (!result.valid) {
                        if (typeof engine.showMessage === 'function') {
                            engine.showMessage('error', result.message);
                        } else if (typeof message === 'function') {
                            message(result.message, 5000, 'error');
                        }
                        return false;
                    }
                }

                if (engine.hasRemoteValidationErrors()) {
                    engine.showMessage('error', Array.from(engine.remoteValidations.values())[0]);
                    return false;
                }
            }
            return originalSendForm.apply(this, arguments);
        };
        window.__formRuleSubmitGuardInstalled = true;
    }
    
    registerPlugin(name, plugin) {
        if (this.plugins.has(name)) {
            console.warn(`[FormRuleEngine] Plugin '${name}' já registrado, sobrescrevendo`);
        }
        this.plugins.set(name, plugin);
        plugin.engine = this;
        
        // Scan por elementos com esta regra
        const attr = `data-${name}-when`;
        const els = Array.from(this.form.querySelectorAll(`[${attr}]`));
        if (this.form.hasAttribute(attr)) {
            els.unshift(this.form);
        }
        this.elements.set(name, els);
        this.dependencyMaps.set(name, this.buildDependencyMap(els, name));
    }
    
    buildDependencyMap(elements, ruleType) {
        const map = new Map();
        const plugin = this.plugins.get(ruleType);
        
        elements.forEach(el => {
            try {
                const attrName = `data-${ruleType}-when`;
                const rulesJson = el.getAttribute(attrName);
                if (!rulesJson) return;

                const rules = JSON.parse(rulesJson);
                const fields = plugin.extractDependencies(rules);
                
                fields.forEach(fieldName => {
                    if (!map.has(fieldName)) map.set(fieldName, []);
                    map.get(fieldName).push({ element: el, ruleType });
                });
            } catch (e) {
                console.error(`[FormRuleEngine] Erro ao parsear regra ${ruleType}:`, e);
            }
        });
        
        return map;
    }
    
    camelCase(str) {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }
    
    bindEvents() {
        this.form.addEventListener('change', (e) => this.onFieldChange(e));
        this.form.addEventListener('input', (e) => this.onFieldChange(e));
        this.form.addEventListener('click', (e) => {
            if (e.target.type === 'radio') this.onFieldChange(e);
        });

        // Ponte para o change PROGRAMÁTICO do jQuery. O autocomplete e o Select2
        // avisam a mudança com $.trigger('change'), que percorre só o barramento do
        // jQuery e NÃO chega em addEventListener — por isso escolher uma cidade
        // (autocomplete) nunca reavaliava as regras que dependem dela.
        // `originalEvent` só existe quando o evento nasceu no navegador; esses já
        // vieram pelo listener nativo acima e reprocessá-los dispararia cada regra
        // (e cada AJAX de cascata) duas vezes.
        if (window.jQuery) {
            window.jQuery(this.form)
                .off('change.formRuleEngine')
                .on('change.formRuleEngine', (event) => {
                    if (event.originalEvent) return;
                    this.onFieldChange(event);
                });
        }
    }
    
    onFieldChange(e) {
        const fieldName = e.target.name;
        if (!fieldName) return;
        
        this.dependencyMaps.forEach((map, ruleType) => {
            if (map.has(fieldName)) {
                map.get(fieldName).forEach(({ element }) => {
                    this.evaluateElement(element, ruleType);
                });
            }
        });
        
        if (fieldName.startsWith('__form_param_')) {
            this.evaluateAll();
        }
    }
    
    evaluateAll() {
        this.elements.forEach((els, ruleType) => {
            els.forEach(el => this.evaluateElement(el, ruleType));
        });
    }
    
    evaluateElement(el, ruleType) {
        const plugin = this.plugins.get(ruleType);
        if (!plugin) return;
        
        try {
            const attrName = `data-${ruleType}-when`;
            const rulesJson = el.getAttribute(attrName);
            if (!rulesJson) return;

            const rules = JSON.parse(rulesJson);
            plugin.apply(el, rules);
        } catch (e) {
            console.error(`[FormRuleEngine] Erro ao avaliar ${ruleType}:`, e);
        }
    }
    
    getFieldValue(fieldName) {
        let field = this.form.querySelector(`[name="${fieldName}"]`);
        
        if (!field && fieldName.startsWith('form_param_')) {
            field = this.form.querySelector(`[name="__${fieldName}"]`);
        }
        
        if (!field) return null;
        
        if (field.type === 'checkbox') {
            return field.checked ? (field.value || 'S') : 'N';
        }
        if (field.type === 'radio') {
            const checked = this.form.querySelector(`[name="${fieldName}"]:checked`);
            return checked ? checked.value : null;
        }
        if (field.tagName === 'SELECT' && field.multiple) {
            return Array.from(field.selectedOptions).map(o => o.value);
        }
        
        return field.value;
    }

    setFieldValue(fieldName, value, triggerChange = true, displayValue = undefined) {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (!field) return false;

        field.value = value === undefined || value === null ? '' : value;
        const autocompleteWrapper = field.closest
            ? field.closest('.crm-autocomplete-wrapper')
            : null;
        if (autocompleteWrapper && (displayValue !== undefined || field.value === '')) {
            const display = displayValue === undefined || displayValue === null ? '' : displayValue;
            const textField = autocompleteWrapper.querySelector('.crm-autocomplete-text');
            const displayField = autocompleteWrapper.querySelector('.crm-autocomplete-display-value');
            if (textField) textField.value = display;
            if (displayField) displayField.value = display;
        }
        const pesquisaWrapper = field.nextElementSibling
            && field.nextElementSibling.classList
            && field.nextElementSibling.classList.contains('frmbox_pesquisa_wrap')
            ? field.nextElementSibling
            : null;
        if (pesquisaWrapper && (displayValue !== undefined || field.value === '')) {
            const display = displayValue === undefined || displayValue === null ? '' : displayValue;
            const pesquisaDisplay = pesquisaWrapper.querySelector(`[name="p_${fieldName}"]`);
            if (pesquisaDisplay) pesquisaDisplay.value = display;
        }
        if (triggerChange) {
            field.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return true;
    }

    clearField(fieldName, triggerChange = true) {
        return this.setFieldValue(fieldName, '', triggerChange);
    }

    /**
     * @param {boolean} selectFirst Seleciona a primeira opção real (ignorando o
     *   ".:Escolha:."), como o legado faz ao repopular um combo derivado de outro
     *   campo (ex.: LeadJs.phtml:1279 marca data[0] com selected). Sem isso o
     *   combo fica no placeholder e qualquer map_selected lê a opção vazia.
     */
    setFieldOptions(fieldName, options, valueKey = 'VALUE', labelKey = 'DISPLAY', includeEmpty = true, selectFirst = false) {
        const field = this.form.querySelector(`[name="${fieldName}"], [name="${fieldName}[]"]`);
        if (!field) return false;

        if (field.tagName !== 'SELECT') {
            const wrapper = field.closest('.crm-autocomplete-wrapper');
            if (!wrapper) return false;

            const items = (Array.isArray(options) ? options : []).map(option => ({
                id: option && typeof option === 'object' ? (option[valueKey] ?? option.value ?? '') : option,
                name: option && typeof option === 'object' ? (option[labelKey] ?? option.label ?? option.display ?? option.DISPLAY ?? '') : option,
                secondDisplay: option && typeof option === 'object' ? (option.SECOND_DISPLAY ?? option.secondDisplay ?? '') : '',
                ignore: false
            }));

            const prevValue = field.value;
            const prevDisplay = wrapper.querySelector('.crm-autocomplete-display-value');
            const prevDisplayVal = prevDisplay ? prevDisplay.value : '';

            const valueExists = prevValue && items.some(it => String(it.id) === String(prevValue));

            wrapper.setAttribute('data-autocomplete-source', JSON.stringify(items));

            if (!valueExists) {
                field.value = '';
                const textField = wrapper.querySelector('.crm-autocomplete-text');
                if (textField) textField.value = '';
                if (prevDisplay) prevDisplay.value = '';
            }

            if (typeof window.destroyModernAutocomplete === 'function') {
                window.destroyModernAutocomplete($(wrapper));
            }
            if (typeof window.initDataAttributeAutocompletes === 'function') {
                window.initDataAttributeAutocompletes(wrapper.parentNode || this.form);
            }

            if (valueExists) {
                field.value = prevValue;
                const textField2 = wrapper.querySelector('.crm-autocomplete-text');
                if (textField2) textField2.value = prevDisplayVal;
                const displayField2 = wrapper.querySelector('.crm-autocomplete-display-value');
                if (displayField2) displayField2.value = prevDisplayVal;
            }

            return true;
        }

        const currentValue = field.value;
        field.innerHTML = '';

        if (includeEmpty) {
            const empty = document.createElement('option');
            empty.value = '';
            empty.textContent = '.:Escolha:.';
            field.appendChild(empty);
        }

        (Array.isArray(options) ? options : []).forEach(option => {
            const opt = document.createElement('option');
            opt.value = option && typeof option === 'object' ? (option[valueKey] ?? option.value ?? '') : option;
            opt.textContent = option && typeof option === 'object' ? (option[labelKey] ?? option.label ?? option.display ?? option.DISPLAY ?? opt.value) : option;
            if (option && typeof option === 'object') {
                Object.entries(option).forEach(([key, val]) => {
                    if (val !== null && val !== undefined && typeof val !== 'object') {
                        opt.dataset[key] = String(val);
                    }
                });
            }
            field.appendChild(opt);
        });

        if (!field.multiple && currentValue) field.value = currentValue;

        // Auto-seleção: só faz sentido em select simples e quando há opção real.
        // Vem depois da restauração de currentValue de propósito — repopular o combo
        // significa que a origem mudou, então o valor anterior não vale mais.
        if (selectFirst && !field.multiple) {
            const primeiraReal = Array.from(field.options).find(o => o.value !== '');
            if (primeiraReal) field.value = primeiraReal.value;
        }

        // Select2 listens to jQuery events, not native DOM events.
        // For <select multiple> (combo_busca_multipla) always use jQuery trigger so
        // Select2 rebuilds its dropdown from the updated native <select> options.
        if (typeof window.$ !== 'undefined' && window.$(field).data('select2')) {
            if (field.multiple) window.$(field).val(null);
            window.$(field).trigger('change');
        } else {
            field.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return true;
    }

    resolveTemplate(template, value = '', response = null) {
        if (typeof template !== 'string') return template;

        return template.replace(/\{([^{}]+)\}/g, (_, token) => {
            if (token === 'value') return value;
            if (token === 'response') {
                return response !== undefined && response !== null ? response : '';
            }
            if (token.startsWith('response.')) {
                const responseValue = this.getResponsePath(response, token.substring(9));
                return responseValue !== undefined && responseValue !== null ? responseValue : '';
            }
            return this.getFieldValue(token) ?? '';
        });
    }

    resolveData(dataTemplate, value = '', response = null) {
        if (typeof dataTemplate === 'string') return this.resolveTemplate(dataTemplate, value, response);
        if (!dataTemplate || typeof dataTemplate !== 'object') return undefined;

        const result = {};
        Object.entries(dataTemplate).forEach(([key, val]) => {
            result[key] = typeof val === 'string' ? this.resolveTemplate(val, value, response) : val;
        });
        return result;
    }

    getResponsePath(response, path) {
        if (!path || path === '.') return response;

        let value = response;
        String(path).split('.').forEach(key => {
            if (value === undefined || value === null) return;
            value = value[key];
        });
        return value;
    }

    runActions(actions, context = {}) {
        if (!actions) return;
        const list = Array.isArray(actions) ? actions : [actions];
        const resolve = template => this.resolveTemplate(String(template), context.value || '', context.response || null);

        list.forEach(action => {
            if (!action || typeof action !== 'object') return;

            if (action.set_value) {
                Object.entries(action.set_value).forEach(([field, template]) => {
                    this.setFieldValue(field, resolve(template));
                });
            }
            if (action.set_options) {
                Object.entries(action.set_options).forEach(([fieldName, config]) => {
                    const options = this.getResponsePath(context.response, config.path || 'data');
                    this.setFieldOptions(
                        fieldName,
                        options,
                        config.value_key || 'VALUE',
                        config.label_key || 'DISPLAY',
                        config.include_empty !== false
                    );
                    if (config.value) {
                        this.setFieldValue(fieldName, resolve(config.value));
                    }
                });
            }
            if (action.set_html) {
                Object.entries(action.set_html).forEach(([selector, template]) => {
                    this.form.querySelectorAll(selector).forEach(element => {
                        element.innerHTML = resolve(template);
                    });
                });
            }
            if (action.toggle) {
                const toggles = Array.isArray(action.toggle) ? action.toggle : [action.toggle];
                toggles.forEach(toggle => {
                    if (!toggle || !toggle.selector) return;
                    const show = toggle.show !== false;
                    this.form.querySelectorAll(toggle.selector).forEach(element => {
                        element.style.display = show ? '' : 'none';
                    });
                });
            }
            if (action.toggle_by_response) {
                const toggles = Array.isArray(action.toggle_by_response) ? action.toggle_by_response : [action.toggle_by_response];
                toggles.forEach(toggle => {
                    if (!toggle || !toggle.selector || !toggle.path) return;
                    const actual = this.getResponsePath(context.response, toggle.path);
                    let show;
                    if (toggle.hasOwnProperty('gt'))  show = actual > toggle.gt;
                    else if (toggle.hasOwnProperty('gte')) show = actual >= toggle.gte;
                    else if (toggle.hasOwnProperty('neq')) show = actual !== toggle.neq;
                    else show = actual === toggle.equals;
                    this.form.querySelectorAll(toggle.selector).forEach(element => {
                        element.style.display = show ? '' : 'none';
                    });
                });
            }
            if (action.message_by_response) {
                const messages = Array.isArray(action.message_by_response) ? action.message_by_response : [action.message_by_response];
                messages.forEach(message => {
                    if (!message || !message.path) return;
                    const actual = this.getResponsePath(context.response, message.path);
                    if (actual !== message.equals) return;
                    const text = message.message_path
                        ? this.getResponsePath(context.response, message.message_path)
                        : resolve(message.message || '');
                    this.showMessage(message.type || 'info', text);
                });
            }
            if (action.clear) {
                (Array.isArray(action.clear) ? action.clear : [action.clear]).forEach(field => this.clearField(field));
            }
            if (action.trigger) {
                const field = this.form.querySelector(`[name="${action.trigger}"]`);
                if (field) field.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (action.call && typeof window[action.call] === 'function') {
                const args = (action.args || []).map(arg => typeof arg === 'string' ? resolve(arg) : arg);
                window[action.call].apply(window, args);
            }
            if (action.show_message) {
                this.showMessage(action.show_message.type || 'info', resolve(action.show_message.message || ''));
            }
            if (action.conditional) {
                const cond = action.conditional;
                const matches = !cond.condition || this.evaluateCondition(cond.condition);
                if (matches && cond.then) this.runActions(cond.then, context);
                else if (!matches && cond.else) this.runActions(cond.else, context);
            }
        });
    }

    showMessage(type, message) {
        if (!message) return;
        if (typeof window.communicate === 'function') {
            window.communicate(message);
            return;
        }
        if (typeof window.alerta === 'function') {
            window.alerta(type || 'info', message);
            return;
        }
        if (typeof window.message === 'function') {
            window.message(message, 3500, type || 'info');
            return;
        }
        if (type === 'error') console.error(message);
    }

    registerRemoteValidation(name, isValid, message = '') {
        if (!name) return;
        if (isValid) {
            this.remoteValidations.delete(name);
        } else {
            this.remoteValidations.set(name, message || 'Validação remota pendente');
        }
    }

    hasRemoteValidationErrors() {
        // Limpa validações de campos que não estão mais visíveis no DOM
        for (const [name] of this.remoteValidations) {
            const field = this.form.querySelector(`[name="${name}"]`);
            if (!field || !field.offsetParent) {
                this.remoteValidations.delete(name);
            }
        }
        return this.remoteValidations.size > 0;
    }
    
    evaluateCondition(rules) {
        if (rules.AND) {
            return rules.AND.every(r => this.evaluateCondition(r));
        }
        if (rules.OR) {
            return rules.OR.some(r => this.evaluateCondition(r));
        }
        
        const entries = Object.entries(rules);
        if (entries.length === 0) return true;
        
        const [fieldName, expectedValue] = entries[0];
        const actualValue = this.getFieldValue(fieldName);
        
        if (expectedValue !== null && typeof expectedValue === 'object' && !Array.isArray(expectedValue)) {
            const operator = Object.keys(expectedValue)[0];
            const value = expectedValue[operator];
            
            switch (operator) {
                case 'eq': return actualValue === value;
                case '!=': return actualValue !== value;
                // Comparação entre DOIS campos — o operando é o nome do outro.
                // Sem isso, "o tipo escolhido difere do já cotado" e "confirmação
                // igual à senha" só dá para escrever em JS solto.
                case 'eq_field':  return actualValue === this.getFieldValue(value);
                case 'neq_field': return actualValue !== this.getFieldValue(value);
                case '>': return parseFloat(actualValue) > parseFloat(value);
                case '<': return parseFloat(actualValue) < parseFloat(value);
                case '>=': return parseFloat(actualValue) >= parseFloat(value);
                case '<=': return parseFloat(actualValue) <= parseFloat(value);
                case 'regex': return new RegExp(value).test(actualValue);
                default: return false;
            }
        }
        
        if (Array.isArray(expectedValue)) {
            return expectedValue.includes(actualValue);
        }
        
        return actualValue === expectedValue;
    }
    
    // API pública
    refresh() { this.evaluateAll(); }
    
    addElement(element, ruleType) {
        const plugin = this.plugins.get(ruleType);
        if (!plugin) return;
        
        const attrName = `data-${ruleType}-when`;
        const rulesJson = element.getAttribute(attrName);
        if (!rulesJson) return;
        
        const els = this.elements.get(ruleType) || [];
        els.push(element);
        this.elements.set(ruleType, els);
        
        const rules = JSON.parse(rulesJson);
        const fields = plugin.extractDependencies(rules);
        const map = this.dependencyMaps.get(ruleType);
        
        fields.forEach(fieldName => {
            if (!map.has(fieldName)) map.set(fieldName, []);
            map.get(fieldName).push({ element, ruleType });
        });
        
        this.evaluateElement(element, ruleType);
    }
};
