/**
 * Plugin: disabled_when
 * Habilita/desabilita campos dinamicamente
 */
window.FormRuleDisabledPlugin = window.FormRuleDisabledPlugin || class FormRuleDisabledPlugin extends window.FormRulePlugin {
    constructor() {
        super('disabled');
    }
    
    extractDependencies(rules) {
        return this.extractFieldNames(rules);
    }
    
    apply(element, rules) {
        const isDisabled = this.evaluateCondition(rules);
        this.toggleDisabled(element, isDisabled);
    }
    
    toggleDisabled(element, isDisabled) {
        const input = this.findInput(element);
        
        if (!input) return;
        
        if (isDisabled) {
            input.setAttribute('disabled', 'disabled');
            input.classList.add('ilu-input--disabled');
            element.classList.add('ilu-form-field--disabled', 'form-rule-disabled');
        } else {
            input.removeAttribute('disabled');
            input.classList.remove('ilu-input--disabled');
            element.classList.remove('ilu-form-field--disabled', 'form-rule-disabled');
        }
    }
};
