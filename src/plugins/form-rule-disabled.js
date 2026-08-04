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
            input.classList.add(...this.temaClasses('inputDisabled'));
            element.classList.add(...this.temaClasses('fieldDisabled'));
        } else {
            input.removeAttribute('disabled');
            input.classList.remove(...this.temaClasses('inputDisabled'));
            element.classList.remove(...this.temaClasses('fieldDisabled'));
        }
    }
};
