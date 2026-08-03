/**
 * Plugin base para FormRuleEngine
 * Todos os plugins devem estender esta classe
 */
window.FormRulePlugin = window.FormRulePlugin || class FormRulePlugin {
    constructor(name) {
        this.name = name;
        this.engine = null;
    }
    
    // Extrai nomes de campos das regras (deve ser implementado)
    extractDependencies(rules) {
        throw new Error(`Plugin ${this.name} deve implementar extractDependencies()`);
    }
    
    // Aplica o efeito no elemento (deve ser implementado)
    apply(element, rules) {
        throw new Error(`Plugin ${this.name} deve implementar apply()`);
    }
    
    // Helper: extrai field names de regras condicionais padrão
    extractFieldNames(rules) {
        const fields = new Set();
        
        if (rules.AND || rules.OR) {
            const conditions = rules.AND || rules.OR;
            conditions.forEach(r => {
                this.extractFieldNames(r).forEach(f => fields.add(f));
            });
        } else if (Array.isArray(rules)) {
            rules.forEach(r => {
                Object.keys(r).forEach(key => {
                    if (!['label', 'mask', 'options', 'rule', 'params', 'class'].includes(key)) {
                        fields.add(key);
                    }
                });
            });
        } else {
            Object.keys(rules).forEach(key => {
                if (!['AND', 'OR', 'label', 'mask', 'options', 'rule', 'params'].includes(key)) {
                    fields.add(key);
                }
            });
        }
        
        return Array.from(fields);
    }
    
    // Helper: avalia condição usando o engine
    evaluateCondition(rules) {
        return this.engine.evaluateCondition(rules);
    }
    
    // Helper: encontra input dentro do wrapper
    findInput(element) {
        const autocompleteValue = element.querySelector('.crm-autocomplete-value');
        if (autocompleteValue) return autocompleteValue;

        return element.querySelector('input, select, textarea');
    }
    
    // Helper: encontra label
    findLabel(element) {
        return element.querySelector('.ilu-form-label');
    }
};
