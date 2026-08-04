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

    /**
     * Roda as verificações que precedem o envio e devolve
     * `{ valid, message }`. É o mesmo caminho para quem usa o `submit` nativo
     * e para quem usa o `sendForm` do host.
     */
    validateBeforeSubmit() {
        const formName = this.form.getAttribute('name') || this.form.id;

        const preventPlugin = this.plugins.get('prevent-submit');
        if (preventPlugin && typeof preventPlugin.validateBeforeSubmit === 'function') {
            const result = preventPlugin.validateBeforeSubmit(formName);
            if (!result.valid) return result;
        }

        if (this.hasRemoteValidationErrors()) {
            return { valid: false, message: Array.from(this.remoteValidations.values())[0] };
        }

        return { valid: true };
    }

    registerSubmitGuard() {
        // O guarda nativo vale para todo mundo. Antes, `prevent_submit_when` e a
        // validação remota só bloqueavam quando existia um `window.sendForm`
        // (o host de origem); fora dele as regras eram registradas e ninguém as
        // consultava, o que é a pior forma de falhar: silenciosa e no envio.
        this.form.addEventListener('submit', (event) => {
            const resultado = this.validateBeforeSubmit();
            if (!resultado.valid) {
                event.preventDefault();
                event.stopPropagation();
                this.showMessage('error', resultado.message);
            }
        });

        const formName = this.form.getAttribute('name') || this.form.id;
        if (!formName) return;

        window.__formRuleEnginesByName = window.__formRuleEnginesByName || {};
        window.__formRuleEnginesByName[formName] = this;

        if (window.__formRuleSubmitGuardInstalled || typeof window.sendForm !== 'function') return;

        const originalSendForm = window.sendForm;
        window.sendForm = function(formRef) {
            const engine = window.__formRuleEnginesByName && window.__formRuleEnginesByName[formRef];
            if (engine) {
                const resultado = engine.validateBeforeSubmit();
                if (!resultado.valid) {
                    engine.showMessage('error', resultado.message);
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
        // jQuery e NÃO chega em addEventListener, por isso escolher uma cidade
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
            console.error(`[FormRuleEngine] Erro ao judge ${ruleType}:`, e);
        }
    }
    
    getFieldValue(fieldName) {
        let field = this.form.querySelector(`[name="${fieldName}"]`);
        
        if (!field && fieldName.startsWith('form_param_')) {
            field = this.form.querySelector(`[name="__${fieldName}"]`);
        }
        
        if (!field) return null;
        
        if (field.type === 'checkbox') {
            if (!field.checked) return 'N';
            // Sem o atributo `value`, o HTML define "on" como padrão, e o
            // fallback `|| 'S'` nunca acontecia: {"Aceite":"S"} ficava
            // permanentemente falso, sem aviso. Quem declara `value` continua
            // mandando no valor lido.
            return field.hasAttribute('value') ? field.value : 'S';
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
            ? field.closest(FormRuleEngine.theme.get('autocompleteWrap'))
            : null;
        if (autocompleteWrapper && (displayValue !== undefined || field.value === '')) {
            const display = displayValue === undefined || displayValue === null ? '' : displayValue;
            const textField = autocompleteWrapper.querySelector(FormRuleEngine.theme.get('autocompleteText'));
            const displayField = autocompleteWrapper.querySelector(FormRuleEngine.theme.get('autocompleteDisplay'));
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
            const wrapper = field.closest(FormRuleEngine.theme.get('autocompleteWrap'));
            if (!wrapper) return false;

            const items = (Array.isArray(options) ? options : []).map(option => ({
                id: option && typeof option === 'object' ? (option[valueKey] ?? option.value ?? '') : option,
                name: option && typeof option === 'object' ? (option[labelKey] ?? option.label ?? option.display ?? option.DISPLAY ?? '') : option,
                secondDisplay: option && typeof option === 'object' ? (option.SECOND_DISPLAY ?? option.secondDisplay ?? '') : '',
                ignore: false
            }));

            const prevValue = field.value;
            const prevDisplay = wrapper.querySelector(FormRuleEngine.theme.get('autocompleteDisplay'));
            const prevDisplayVal = prevDisplay ? prevDisplay.value : '';

            const valueExists = prevValue && items.some(it => String(it.id) === String(prevValue));

            wrapper.setAttribute('data-autocomplete-source', JSON.stringify(items));

            if (!valueExists) {
                field.value = '';
                const textField = wrapper.querySelector(FormRuleEngine.theme.get('autocompleteText'));
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
                const textField2 = wrapper.querySelector(FormRuleEngine.theme.get('autocompleteText'));
                if (textField2) textField2.value = prevDisplayVal;
                const displayField2 = wrapper.querySelector(FormRuleEngine.theme.get('autocompleteDisplay'));
                if (displayField2) displayField2.value = prevDisplayVal;
            }

            return true;
        }

        const currentValue = field.value;
        field.innerHTML = '';

        if (includeEmpty) {
            const empty = document.createElement('option');
            empty.value = '';
            empty.textContent = window.FormRuleEngine.t('escolha');
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
        // Vem depois da restauração de currentValue de propósito, repopular o combo
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
            this.remoteValidations.set(name, message || window.FormRuleEngine.t('validacaoRemotaPendente'));
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
                // Comparação entre DOIS campos, o operando é o nome do outro.
                // Sem isso, "o tipo escolhido difere do já cotado" e "confirmação
                // igual à senha" só dá para escrever em JS solto.
                case 'eq_field':  return actualValue === this.getFieldValue(value);
                case 'neq_field': return actualValue !== this.getFieldValue(value);
                case '>': return parseFloat(actualValue) > parseFloat(value);
                case '<': return parseFloat(actualValue) < parseFloat(value);
                case '>=': return parseFloat(actualValue) >= parseFloat(value);
                case '<=': return parseFloat(actualValue) <= parseFloat(value);
                case 'regex': return new RegExp(value).test(actualValue);
                // `in`/`not_in` são a escrita natural para pertinência, e o
                // compilador PHP sempre os deixou passar. Sem eles no runtime, a
                // condição caía no `default` e virava falso silencioso.
                case 'in':     return Array.isArray(value) && value.includes(actualValue);
                case 'not_in': return Array.isArray(value) && !value.includes(actualValue);
                default:
                    if (window.FormRuleEngine && window.FormRuleEngine.debug) {
                        console.warn(`[FormRuleEngine] operador desconhecido "${operator}":` +
                                     ' a condição devolve falso, sempre.');
                    }
                    return false;
            }
        }
        
        if (Array.isArray(expectedValue)) {
            return expectedValue.includes(actualValue);
        }
        
        return actualValue === expectedValue;
    }
    
    /* ── diagnóstico ──────────────────────────────────────────────────────
       As regras falham em SILÊNCIO: atributo no lugar errado, campo com nome
       errado, condição com duas chaves. Quem conhece a engine acha em minutos;
       quem não conhece desiste. `diagnose()` percorre o que foi registrado e
       transforma cada uma dessas situações em aviso no console.

       Ligue com `FormRuleEngine.debug = true` antes do bootstrap, ou com
       `data-form-debug="true"` no <form>.                                    */

    /** Plugins que procuram o controle DENTRO do elemento (a armadilha do wrapper). */
    static get PLUGINS_DE_WRAPPER() {
        return ['required', 'disabled', 'label', 'options', 'mask', 'validate',
                'copy', 'fetch', 'populate', 'remote-validate', 'trigger',
                'revert', 'password'];
    }

    diagnose() {
        const avisos = [];
        const nomeDoForm = this.form.getAttribute('name') || this.form.id || '(sem nome)';
        const wrapper = FormRuleEngine.PLUGINS_DE_WRAPPER;

        this.elements.forEach((els, ruleType) => {
            els.forEach(el => {
                // 1. atributo no próprio controle, onde findInput() não olha
                if (wrapper.includes(ruleType) && el.matches && el.matches('input, select, textarea')) {
                    avisos.push(`data-${ruleType}-when está no próprio <${el.tagName.toLowerCase()}` +
                                ` name="${el.name || ''}">. Os plugins procuram o controle DENTRO` +
                                ` do elemento, então esta regra nunca dispara. Mova para o wrapper.`);
                }

                let rules;
                try {
                    rules = JSON.parse(el.getAttribute(`data-${ruleType}-when`));
                } catch (e) {
                    avisos.push(`data-${ruleType}-when não é JSON válido: ${e.message}`);
                    return;
                }

                // 2. campos citados que não existem no formulário
                const plugin = this.plugins.get(ruleType);
                let citados = [];
                try { citados = plugin.extractDependencies(rules) || []; } catch (e) { /* plugin sem deps */ }
                citados.forEach(nome => {
                    if (nome.startsWith('form_param_')) return;
                    if (this.form.querySelector(`[name="${nome}"], [name="${nome}[]"], [name="__${nome}"]`)) return;
                    avisos.push(`data-${ruleType}-when cita o campo "${nome}", que não existe` +
                                ` no formulário. getFieldValue() devolve null e a condição não casa.`);
                });

                // 3. condição com mais de uma chave: o runtime lê só a primeira
                this.avisarChavesIgnoradas(rules, ruleType, avisos);
            });
        });

        if (avisos.length) {
            console.warn(`[FormRuleEngine] ${avisos.length} problema(s) em "${nomeDoForm}":`);
            avisos.forEach(a => console.warn('  •', a));
        }

        return avisos;
    }

    avisarChavesIgnoradas(rules, ruleType, avisos) {
        if (!rules || typeof rules !== 'object') return;
        if (Array.isArray(rules)) {
            rules.forEach(r => this.avisarChavesIgnoradas(r, ruleType, avisos));
            return;
        }
        if (rules.AND || rules.OR) {
            (rules.AND || rules.OR).forEach(r => this.avisarChavesIgnoradas(r, ruleType, avisos));
            return;
        }
        // Só condições puras: um objeto de configuração (fetch_when, lock_when…)
        // tem várias chaves de propósito.
        if (!['visible', 'required', 'disabled'].includes(ruleType)) return;

        const chaves = Object.keys(rules);
        if (chaves.length > 1) {
            avisos.push(`data-${ruleType}-when tem ${chaves.length} chaves (${chaves.join(', ')})` +
                        ` no mesmo objeto. O runtime avalia só a primeira. Use {"AND":[…]}.`);
        }
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

/* ===========================================================================
   TEMA: os nomes de classe e seletores que a engine aplica e procura.

   Antes, todos estavam embutidos nos plugins, e eram os do design system do CRM
   de origem (`ilu-*`, `crm-*`). Quem usava Bootstrap ou Tailwind tinha de adotar
   nomes alheios ou aplicar patch em cada plugin.

   Agora ficam aqui, num único mapa. Os padrões são os nomes históricos, então
   nada muda para quem já usa. Para adaptar:

       FormRuleEngine.theme.set({ label: '.form-label',
                                  labelRequired: 'is-required' });

   ou, para largar de vez a nomenclatura do projeto de origem:

       FormRuleEngine.theme.preset('neutro');   // tudo vira form-rule-*

   Os nomes marcados PROCURA são contrato com o SEU markup: a engine só encontra
   o elemento se ele existir com esse nome. Os marcados APLICA são o contrário:
   ela escreve, e o seu CSS decide o que fazer com eles.
   =========================================================================== */
window.FormRuleEngine.theme = window.FormRuleEngine.theme || (function () {
    const PADRAO = {
        // PROCURA
        label:              '.ilu-form-label',
        fieldWrapper:       '.ilu-form-compact__field',
        grid:               '.ilu-form-compact__grid',
        lockWrapper:        '.ilu-form-field, .drawer-form-field, .form-group',
        stepChrome:         '.ilu-form-compact--steps',
        stepFieldWrapper:   '.ilu-form-compact__field, .conta-wizard-v2__field, .form-group',
        autocompleteWrap:   '.crm-autocomplete-wrapper',
        autocompleteValue:  '.crm-autocomplete-value',
        autocompleteText:   '.crm-autocomplete-text',
        autocompleteDisplay:'.crm-autocomplete-display-value',
        autocompleteClear:  '.crm-autocomplete-clear',

        // APLICA
        hidden:             'form-rule-hidden',
        hiddenLegacy:       'is-hidden',
        inputRequired:      'ilu-input--required required',
        labelRequired:      'ilu-form-label--required',
        inputDisabled:      'ilu-input--disabled',
        fieldDisabled:      'ilu-form-field--disabled form-rule-disabled',
        locked:             'form-rule-locked',
        lockedInput:        'form-rule-locked-input',
        validated:          'form-rule-validated',
        invalid:            'form-rule-invalid',
        preventSubmitError: 'form-rule-prevent-submit-error',
        passwordError:      'ilu-field-error',
        passwordSlot:       'ilu-form-compact__field ilu-form-compact__field--col-12 ilu-password-policy-slot',
        stepHidden:         'form-step-hidden',
        stepCurrent:        'form-step-current',
        stepComplete:       'form-step-complete',
        stepFieldError:     'form-step-field-error',

        // Raiz do painel de senha. Os filhos são derivados em BEM a partir dela
        // (`__meter`, `__bar`, `__rule`…), então basta trocar esta.
        passwordPanel:      'ilu-password-policy',

        // Tabela dinâmica: contrato com o markup que o SEU renderizador emite.
        tableWrapper:       '.ilu-dynamic-table-wrapper',
        table:              'ilu-dynamic-table',
        tableRow:           'ilu-dt-row',
        tableEmptyRow:      'ilu-dt-empty-row',
    };

    /** Sem nada do projeto de origem: só `form-rule-*`. */
    const NEUTRO = {
        label:              '.form-rule-label',
        fieldWrapper:       '.form-rule-field',
        grid:               '.form-rule-grid',
        lockWrapper:        '.form-rule-field',
        stepChrome:         '.form-rule-steps',
        stepFieldWrapper:   '.form-rule-field',
        autocompleteWrap:   '.form-rule-autocomplete',
        autocompleteValue:  '.form-rule-autocomplete-value',
        autocompleteText:   '.form-rule-autocomplete-text',
        autocompleteDisplay:'.form-rule-autocomplete-display',
        autocompleteClear:  '.form-rule-autocomplete-clear',
        inputRequired:      'form-rule-required',
        labelRequired:      'form-rule-label-required',
        inputDisabled:      'form-rule-input-disabled',
        fieldDisabled:      'form-rule-disabled',
        passwordError:      'form-rule-invalid',
        passwordSlot:       'form-rule-field form-rule-password-slot',
        passwordPanel:      'form-rule-password',
        tableWrapper:       '.form-rule-table-wrapper',
        table:              'form-rule-table',
        tableRow:           'form-rule-row',
        tableEmptyRow:      'form-rule-row-empty',
    };

    let atual = Object.assign({}, PADRAO);

    return {
        /** O valor de um nome. Nome desconhecido devolve string vazia. */
        get(nome) {
            if (!(nome in atual)) {
                console.warn(`[FormRuleEngine.theme] nome desconhecido: "${nome}"`);
                return '';
            }
            return atual[nome];
        },
        /** Lista de classes, para classList.add(...) / remove(...). */
        classes(nome) {
            return String(this.get(nome)).split(/\s+/).filter(Boolean);
        },
        set(overrides) {
            Object.keys(overrides || {}).forEach(k => {
                if (!(k in PADRAO)) {
                    console.warn(`[FormRuleEngine.theme] nome desconhecido em set(): "${k}"`);
                }
            });
            atual = Object.assign(atual, overrides);
            return this;
        },
        preset(nome) {
            if (nome === 'neutro') { atual = Object.assign({}, PADRAO, NEUTRO); return this; }
            if (nome === 'ilu' || nome === 'padrao') { atual = Object.assign({}, PADRAO); return this; }
            console.warn(`[FormRuleEngine.theme] preset desconhecido: "${nome}"`);
            return this;
        },
        /** Tudo, para inspecionar ou documentar. */
        todos() { return Object.assign({}, atual); },
    };
})();

/* ===========================================================================
   HOST: a fronteira com o shell da aplicação.

   Cinco plugins citavam por nome funções que só existem no CRM de origem
   (`DrawerService`, `sendForm`, `refreshTarget`, `openLink`,
   `openLinkDiv`, `Swal`). Fora dele, `prevent_submit_when` não bloqueava nada e
   `behavior`/`submit_handler` eram inertes.

   Agora esses nomes aparecem em UM lugar: o adaptador padrão abaixo. Ele delega
   às globais do host QUANDO ELAS EXISTEM, e cai em comportamento vanilla quando
   não existem. Assim o CRM de origem não muda, e quem não o tem passa a ter
   confirmação, mensagem e envio funcionando.

   Para plugar o seu shell:

       FormRuleEngine.host.set({
           confirm:    opcoes => meuModal.perguntar(opcoes),
           closePanel: ()     => meuDrawer.fechar(),
       });
   =========================================================================== */
window.FormRuleEngine.host = window.FormRuleEngine.host || (function () {
    const padrao = {
        /** @return {Promise<boolean>} */
        confirm(opcoes) {
            const o = opcoes || {};
            if (window.Swal && typeof window.Swal.fire === 'function') {
                return window.Swal.fire({
                    title: o.title || window.FormRuleEngine.t('atencao'),
                    text: o.text || '',
                    icon: o.icon || 'warning',
                    showCancelButton: o.showCancel !== false,
                    confirmButtonText: o.confirmText || window.FormRuleEngine.t('confirmar'),
                    cancelButtonText: o.cancelText || window.FormRuleEngine.t('cancelar'),
                }).then(r => !!r.isConfirmed);
            }
            return Promise.resolve(window.confirm(o.text || o.title || window.FormRuleEngine.t('confirmarPergunta')));
        },

        toast(tipo, texto, duracao) {
            if (!texto) return;
            if (typeof window.communicate === 'function') return window.communicate(texto, tipo);
            if (typeof window.alerta === 'function') return window.alerta(tipo || 'info', texto);
            if (typeof window.message === 'function') return window.message(texto, duracao || 3500, tipo || 'info');
            if (tipo === 'error') console.error(texto); else console.info(texto);
        },

        /** @return {Promise<any>} */
        submit(config) {
            const c = config || {};
            if (window.jQuery && window.jQuery.ajax) {
                return new Promise((resolve, reject) => {
                    window.jQuery.ajax(c).done(resolve).fail(reject);
                });
            }
            const metodo = String(c.type || c.method || 'POST').toUpperCase();
            const corpo = typeof c.data === 'string'
                ? c.data
                : new URLSearchParams(c.data || {}).toString();
            const url = metodo === 'GET' && corpo ? c.url + (c.url.includes('?') ? '&' : '?') + corpo : c.url;
            return fetch(url, {
                method: metodo,
                headers: metodo === 'GET' ? {} : { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: metodo === 'GET' ? undefined : corpo,
            }).then(r => (c.dataType === 'text' ? r.text() : r.json()));
        },

        /** Recarrega uma região da tela depois de uma mutação. */
        refresh(config, gatilho, escopo) {
            if (typeof window.refreshTarget === 'function') {
                return window.refreshTarget(config, gatilho, escopo);
            }
            const alvo = config && (config.target || config.id);
            const el = alvo && (escopo || document).querySelector(`#${alvo}, [data-refresh="${alvo}"]`);
            if (el) el.dispatchEvent(new CustomEvent('form-rule:refresh', { bubbles: true, detail: config }));
        },

        closePanel() {
            if (typeof window.DrawerService !== 'undefined'
                && typeof window.DrawerService.closeTop === 'function') {
                window.DrawerService.closeTop();
                return true;
            }
            document.dispatchEvent(new CustomEvent('form-rule:close-panel'));
            return false;
        },

        openPanel(config) {
            if (typeof window.DrawerService !== 'undefined'
                && typeof window.DrawerService.open === 'function') {
                return window.DrawerService.open(config);
            }
            document.dispatchEvent(new CustomEvent('form-rule:open-panel', { detail: config }));
        },

        /** Navega para uma rota. */
        navigate(rota, query) {
            if (typeof window.openLink === 'function') return window.openLink(rota, query);
            window.location.href = rota + (query ? (rota.includes('?') ? '&' : '?') + query : '');
        },

        /** Carrega uma rota dentro de um contêiner da página. */
        loadInto(alvo, rota, params) {
            if (typeof window.openLinkDiv === 'function') return window.openLinkDiv(rota, params, alvo);
            document.dispatchEvent(new CustomEvent('form-rule:load-into', {
                detail: { alvo, rota, params },
            }));
        },
    };

    const host = Object.assign({}, padrao);
    host.set = function (overrides) { Object.assign(host, overrides || {}); return host; };
    host.reset = function () { Object.assign(host, padrao); return host; };
    return host;
})();

/* ===========================================================================
   I18N: os textos que a engine mostra.

   Estavam embutidos em português no meio do código, o que obrigava quem falasse
   outra língua a editar os plugins. Agora ficam num dicionário substituível.

       FormRuleEngine.i18n.locale('en');
       FormRuleEngine.i18n.set({ camposObrigatorios: 'Fill the required fields' });

   Os `{marcadores}` são substituídos pelos parâmetros de `t()`.
   =========================================================================== */
window.FormRuleEngine.i18n = window.FormRuleEngine.i18n || (function () {
    const DICIONARIOS = {
        'pt-BR': {
            confirmar:            'Confirmar',
            cancelar:             'Cancelar',
            atencao:              'Atenção',
            confirmarOperacao:    'Confirmar operação',
            confirmarPergunta:    'Confirmar?',
            sim:                  'Sim, continuar!',

            campoObrigatorio:     'Campo obrigatório',
            camposObrigatorios:   'Campos obrigatórios não preenchidos',
            camposObrigatoriosLista: 'Campos obrigatórios não preenchidos: {campos}',
            camposDaEtapa:        'Preencha os campos obrigatórios desta etapa',

            validacaoRemotaPendente: 'Validação remota pendente',
            validacaoRemotaFalhou:   'Falha na validação remota',
            naoFoiPossivelSalvar:    'Não foi possível salvar.',

            etapa:                'Etapa {n}',
            etapaDeTotal:         '{atual} de {total} - {rotulo}',
            anterior:             'Anterior',
            proximo:              'Próximo',
            salvar:               'Salvar',

            escolha:              '.:Escolha:.',

            senhaTamanhoMinimo:   'Tamanho mínimo de senha {n}',
            senhaNumeros:         'Quantidade mínima de números {n}.',
            senhaMaiusculas:      'Quantidade mínima de caracteres maiúsculos {n}.',
            senhaEspeciais:       'Quantidade mínima de caracteres especiais {n}. Caracteres permitidos',
            senhasCoincidem:      'Senhas coincidem.',
        },
        en: {
            confirmar:            'Confirm',
            cancelar:             'Cancel',
            atencao:              'Warning',
            confirmarOperacao:    'Confirm operation',
            confirmarPergunta:    'Are you sure?',
            sim:                  'Yes, continue',

            campoObrigatorio:     'Required field',
            camposObrigatorios:   'Required fields are empty',
            camposObrigatoriosLista: 'Required fields are empty: {campos}',
            camposDaEtapa:        'Fill in the required fields of this step',

            validacaoRemotaPendente: 'Remote validation pending',
            validacaoRemotaFalhou:   'Remote validation failed',
            naoFoiPossivelSalvar:    'Could not save.',

            etapa:                'Step {n}',
            etapaDeTotal:         '{atual} of {total} - {rotulo}',
            anterior:             'Previous',
            proximo:              'Next',
            salvar:               'Save',

            escolha:              '.:Select:.',

            senhaTamanhoMinimo:   'Minimum length {n}',
            senhaNumeros:         'At least {n} digit(s).',
            senhaMaiusculas:      'At least {n} uppercase letter(s).',
            senhaEspeciais:       'At least {n} special character(s). Allowed',
            senhasCoincidem:      'Passwords match.',
        },
    };

    let idioma = 'pt-BR';
    let extras = {};

    return {
        /** Texto da chave, com `{marcadores}` substituídos. */
        t(chave, params) {
            const base = Object.assign({}, DICIONARIOS['pt-BR'], DICIONARIOS[idioma] || {}, extras);
            let texto = base[chave];
            if (texto === undefined) {
                console.warn(`[FormRuleEngine.i18n] chave desconhecida: "${chave}"`);
                return chave;
            }
            Object.entries(params || {}).forEach(([k, v]) => {
                texto = texto.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
            });
            return texto;
        },
        locale(nome) {
            if (nome === undefined) return idioma;
            if (!DICIONARIOS[nome]) console.warn(`[FormRuleEngine.i18n] idioma sem dicionário: "${nome}"`);
            idioma = nome;
            return this;
        },
        /** Sobrescreve textos avulsos, ou registra um idioma novo inteiro. */
        set(textos) { extras = Object.assign(extras, textos || {}); return this; },
        registrar(nome, dicionario) { DICIONARIOS[nome] = dicionario; return this; },
        chaves() { return Object.keys(DICIONARIOS['pt-BR']); },
    };
})();

/** Atalho: FormRuleEngine.t('chave', {n: 3}) */
window.FormRuleEngine.t = function (chave, params) {
    return window.FormRuleEngine.i18n.t(chave, params);
};
