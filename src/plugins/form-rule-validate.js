/**
 * Plugin: validate_when
 * Adiciona validações customizadas client-side
 * Integra com validate() global do main.js
 */
window.FormRuleValidatePlugin = window.FormRuleValidatePlugin || class FormRuleValidatePlugin extends window.FormRulePlugin {
    constructor() {
        super('validate');
        this.validators = new Map();
        this.registerBuiltInValidators();
    }
    
    extractDependencies(rules) {
        if (!Array.isArray(rules)) {
            return this.extractFieldNames(rules);
        }
        
        const fields = new Set();
        rules.forEach(rule => {
            Object.keys(rule).forEach(key => {
                if (!['rule', 'params', 'message'].includes(key)) {
                    fields.add(key);
                }
            });
        });
        
        return Array.from(fields);
    }
    
    apply(element, rules) {
        const input = this.findInput(element);
        if (!input) return;
        
        const validation = this.resolveValidation(rules);
        
        if (validation) {
            input.dataset.validateRule = validation.rule;
            input.dataset.validateParams = JSON.stringify(validation.params || {});
            input.dataset.validateMessage = validation.message || '';
            input.classList.add('form-rule-validated');
        } else {
            delete input.dataset.validateRule;
            delete input.dataset.validateParams;
            delete input.dataset.validateMessage;
            input.classList.remove('form-rule-validated');
        }
    }
    
    resolveValidation(rules) {
        if (!Array.isArray(rules)) {
            return this.evaluateCondition(rules) ? {
                rule: rules.rule,
                params: rules.params,
                message: rules.message
            } : null;
        }
        
        for (const rule of rules) {
            const validation = {
                rule: rule.rule,
                params: rule.params,
                message: rule.message
            };
            const conditions = { ...rule };
            delete conditions.rule;
            delete conditions.params;
            delete conditions.message;
            
            if (this.evaluateCondition(conditions)) {
                return validation;
            }
        }
        
        return null;
    }
    
    registerBuiltInValidators() {
        // idade_minima: { min: 18 }
        this.validators.set('idade_minima', (value, params) => {
            const dataNasc = new Date(value.split('/').reverse().join('-'));
            const hoje = new Date();
            const idade = hoje.getFullYear() - dataNasc.getFullYear();
            return idade >= (params.min || 18);
        });
        
        // data_futura: não permite datas no futuro
        this.validators.set('data_futura', (value) => {
            const data = new Date(value.split('/').reverse().join('-'));
            return data <= new Date();
        });
        
        // data_passada: não permite datas no passado
        this.validators.set('data_passada', (value) => {
            const data = new Date(value.split('/').reverse().join('-'));
            return data >= new Date();
        });
        
        // regex: { pattern: '^[A-Z]+$' }
        this.validators.set('regex', (value, params) => {
            return new RegExp(params.pattern).test(value);
        });
        
        // tamanho_min: { min: 3 }
        this.validators.set('tamanho_min', (value, params) => {
            return value.length >= (params.min || 0);
        });
        
        // tamanho_max: { max: 100 }
        this.validators.set('tamanho_max', (value, params) => {
            return value.length <= (params.max || Infinity);
        });
    }
    
    registerValidator(name, fn) {
        this.validators.set(name, fn);
    }
    
    // Método chamado pelo validate() global
    validateField(input) {
        if (!input.classList.contains('form-rule-validated')) return true;
        
        const ruleName = input.dataset.validateRule;
        const params = JSON.parse(input.dataset.validateParams || '{}');
        const message = input.dataset.validateMessage;
        
        const validator = this.validators.get(ruleName);
        if (!validator) {
            console.warn(`[FormRuleValidate] Validador '${ruleName}' não encontrado`);
            return true;
        }
        
        const isValid = validator(input.value, params);
        
        if (!isValid) {
            input.classList.add('form-rule-invalid');
            input.style.border = '1px solid #e74c3c';
            if (message) {
                // Pode adicionar tooltip/mensagem
                input.title = message;
            }
        } else {
            input.classList.remove('form-rule-invalid');
            input.style.border = '';
            input.title = '';
        }
        
        return isValid;
    }
};
