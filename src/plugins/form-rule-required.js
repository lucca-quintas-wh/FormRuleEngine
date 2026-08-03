/**
 * Plugin: required_when
 * Torna campos obrigatórios/opcionais dinamicamente
 */
window.FormRuleRequiredPlugin = window.FormRuleRequiredPlugin || class FormRuleRequiredPlugin extends window.FormRulePlugin {
    constructor() {
        super('required');
    }
    
    extractDependencies(rules) {
        return this.extractFieldNames(rules);
    }
    
    apply(element, rules) {
        const isRequired = this.evaluateCondition(rules);
        this.toggleRequired(element, isRequired);
    }
    
    toggleRequired(element, isRequired) {
        const input = this.findInput(element);
        const label = this.findLabel(element);
        
        if (!input) return;
        
        if (isRequired) {
            input.setAttribute('required', 'required');
            input.classList.add('ilu-input--required', 'required');
            if (label) label.classList.add('ilu-form-label--required');
        } else {
            input.removeAttribute('required');
            input.classList.remove('ilu-input--required', 'required');
            if (label && !input.dataset.alwaysRequired) {
                label.classList.remove('ilu-form-label--required');
            }
        }
    }
};
