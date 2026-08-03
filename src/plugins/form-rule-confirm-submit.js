/**
 * Plugin: confirm_submit
 * Envolve botões de submit com confirmação/validação declarativa.
 */
window.FormRuleConfirmSubmitPlugin = window.FormRuleConfirmSubmitPlugin || class FormRuleConfirmSubmitPlugin extends window.FormRulePlugin {
    constructor() {
        super('confirm-submit');
    }

    extractDependencies(rules) {
        return rules.condition ? this.extractFieldNames(rules.condition) : [];
    }

    apply(element, rules) {
        const button = element.tagName === 'BUTTON' ? element : element.querySelector('button');
        if (!button || button.dataset.confirmSubmitBound === 'true') return;

        button.dataset.confirmSubmitBound = 'true';
        const originalClick = button.getAttribute('onclick') || '';
        button.removeAttribute('onclick');

        button.addEventListener('click', event => {
            if (rules.condition && !this.evaluateCondition(rules.condition)) return;
            if (this.engine.hasRemoteValidationErrors()) {
                event.preventDefault();
                this.engine.showMessage('error', Array.from(this.engine.remoteValidations.values())[0]);
                return;
            }
            if (rules.message && !window.confirm(rules.message)) return;
            if (rules.action) {
                this.engine.runActions(rules.action);
            } else if (originalClick) {
                Function(originalClick).call(button);
            }
        });
    }
};
