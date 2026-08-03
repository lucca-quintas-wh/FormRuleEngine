/**
 * Plugin: action_when (enabled_when)
 * Controla visibilidade e habilitação de botões de ação
 */
window.FormRuleActionPlugin = window.FormRuleActionPlugin || class FormRuleActionPlugin extends window.FormRulePlugin {
    constructor() {
        super('action');
    }
    
    extractDependencies(rules) {
        const fields = new Set();
        
        if (rules.visible_when) {
            this.extractFieldNames(rules.visible_when).forEach(f => fields.add(f));
        }
        if (rules.enabled_when) {
            this.extractFieldNames(rules.enabled_when).forEach(f => fields.add(f));
        }
        
        return Array.from(fields);
    }
    
    apply(element, rules) {
        // element é o botão (não wrapper)
        if (rules.visible_when) {
            const isVisible = this.evaluateCondition(rules.visible_when);
            this.toggleVisibility(element, isVisible);
        }
        
        if (rules.enabled_when) {
            const isEnabled = this.evaluateCondition(rules.enabled_when);
            this.toggleEnabled(element, isEnabled);
        }
    }
    
    toggleVisibility(element, show) {
        if (show) {
            element.classList.remove('form-rule-hidden');
            element.style.display = '';
        } else {
            element.classList.add('form-rule-hidden');
            element.style.display = 'none';
        }
    }
    
    toggleEnabled(element, enabled) {
        if (enabled) {
            element.removeAttribute('disabled');
            element.classList.remove('disabled');
        } else {
            element.setAttribute('disabled', 'disabled');
            element.classList.add('disabled');
        }
    }
};
