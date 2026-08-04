/**
 * Plugin: remote_validate_when
 * Executa validações AJAX declarativas e registra bloqueio no engine.
 */
window.FormRuleRemoteValidatePlugin = window.FormRuleRemoteValidatePlugin || class FormRuleRemoteValidatePlugin extends window.FormRulePlugin {
    constructor() {
        super('remote-validate');
        this.debounceTimers = new Map();
    }

    extractDependencies(rules) {
        const fields = new Set();
        const configs = Array.isArray(rules) ? rules : [rules];

        configs.forEach(rule => {
            [rule.url, ...Object.values(rule.data || {})].forEach(template => {
                const matches = String(template || '').match(/\{(\w+)\}/g);
                if (matches) matches.forEach(m => fields.add(m.replace(/[{}]/g, '')));
            });
            if (rule.condition) this.extractFieldNames(rule.condition).forEach(f => fields.add(f));
        });

        return Array.from(fields).filter(field => field !== 'value');
    }

    apply(element, rules) {
        const input = this.findInput(element);
        if (!input) return;

        const configs = Array.isArray(rules) ? rules : [rules];
        const event = configs[0].event || 'blur';
        const $input = $(input);

        $input.off('.remotevalidatewhen');
        $input.on(event + '.remotevalidatewhen', () => this.execute(input, configs));
    }

    execute(input, configs) {
        configs.forEach(rule => {
            if (rule.condition && !this.evaluateCondition(rule.condition)) return;

            const value = input.value || '';
            if (!value && rule.skip_empty !== false) return;
            const name = rule.name || input.name;

            clearTimeout(this.debounceTimers.get(name));
            const delay = rule.debounce || 0;
            const timer = setTimeout(() => this.request(input, rule, name, value), delay);
            this.debounceTimers.set(name, timer);
        });
    }

    request(input, rule, name, value) {
        $.ajax({
            type: rule.method || 'POST',
            url: this.engine.resolveTemplate(rule.url, value),
            dataType: rule.data_type || 'json',
            data: this.engine.resolveData(rule.data || { value: '{value}' }, value),
        }).done(response => {
            let isValid, message;

            if (rule.response_type === 'pipe') {
                const parts = String(response).split('|');
                const validIndex = parseInt(rule.valid_path || '1', 10);
                const msgIndex = parseInt(rule.message_path || '0', 10);
                isValid = parts[validIndex] === '0' || parts[validIndex] === 'S';
                message = parts[msgIndex] || rule.message || '';
            } else {
                const validPath = rule.valid_path || 'valid';
                const messagePath = rule.message_path || 'message';
                isValid = this.engine.getResponsePath(response, validPath);
                message = this.engine.getResponsePath(response, messagePath) || rule.message || '';
            }

            const normalizedValid = isValid === true || isValid === 'S' || isValid === 1 || isValid === '0';

            if (!normalizedValid && rule.then_if_invalid) {
                this.requestChained(input, rule, name, value, message);
                return;
            }

            this.engine.registerRemoteValidation(name, normalizedValid, message);
            input.classList.toggle(this.temaClasses('invalid')[0], this.engine.remoteValidations.has(name));
            input.title = this.engine.remoteValidations.has(name) ? message : '';
        }).fail(() => {
            this.engine.registerRemoteValidation(name, false, rule.message_fail || window.FormRuleEngine.t('validacaoRemotaFalhou'));
        });
    }

    requestChained(input, rule, name, value, firstMessage) {
        const chained = rule.then_if_invalid;
        $.ajax({
            type: chained.method || rule.method || 'POST',
            url: this.engine.resolveTemplate(chained.url, value),
            dataType: chained.data_type || rule.data_type || 'json',
            data: this.engine.resolveData(chained.data || rule.data || { value: '{value}' }, value),
        }).done(chainedResponse => {
            let chainedValid, chainedMessage;

            if (chained.response_type === 'pipe') {
                const parts = String(chainedResponse).split('|');
                const validIndex = parseInt(chained.valid_path || '1', 10);
                const msgIndex = parseInt(chained.message_path || '0', 10);
                chainedValid = parts[validIndex] === '0' || parts[validIndex] === 'S';
                chainedMessage = parts[msgIndex] || chained.message || firstMessage;
            } else {
                const validPath = chained.valid_path || 'valid';
                const messagePath = chained.message_path || 'message';
                chainedValid = this.engine.getResponsePath(chainedResponse, validPath);
                chainedMessage = this.engine.getResponsePath(chainedResponse, messagePath) || chained.message || firstMessage;
            }

            const normalized = chainedValid === true || chainedValid === 'S' || chainedValid === 1 || chainedValid === '0';
            this.engine.registerRemoteValidation(name, normalized, chainedMessage);
            input.classList.toggle(this.temaClasses('invalid')[0], this.engine.remoteValidations.has(name));
            input.title = this.engine.remoteValidations.has(name) ? chainedMessage : '';

            const context = { response: chainedResponse, value, input };
            if (!normalized && chained.on_fail) {
                this.engine.runActions(chained.on_fail, context);
            }
            if (normalized && chained.on_success) {
                this.engine.runActions(chained.on_success, context);
            }
        }).fail(() => {
            this.engine.registerRemoteValidation(name, false, chained.message_fail || rule.message_fail || window.FormRuleEngine.t('validacaoRemotaFalhou'));
        });
    }
};
