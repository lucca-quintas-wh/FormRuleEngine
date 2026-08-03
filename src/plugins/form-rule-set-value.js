/**
 * Plugin: set_value_when
 * Copia ou define valores declarativamente quando dependências mudam.
 */
window.FormRuleSetValuePlugin = window.FormRuleSetValuePlugin || class FormRuleSetValuePlugin extends window.FormRulePlugin {
    constructor() {
        super('set-value');
    }

    extractDependencies(rules) {
        const fields = new Set();
        const configs = Array.isArray(rules) ? rules : [rules];

        configs.forEach(rule => {
            Object.values(rule.values || {}).forEach(template => {
                const matches = String(template || '').match(/\{(\w+)\}/g);
                if (matches) matches.forEach(m => fields.add(m.replace(/[{}]/g, '')));
            });
            if (rule.condition) this.extractFieldNames(rule.condition).forEach(f => fields.add(f));
        });

        return Array.from(fields);
    }

    apply(element, rules) {
        const configs = Array.isArray(rules) ? rules : [rules];

        configs.forEach(rule => {
            if (rule.condition && !this.evaluateCondition(rule.condition)) return;
            Object.entries(rule.values || {}).forEach(([fieldName, template]) => {
                this.engine.setFieldValue(fieldName, this.engine.resolveTemplate(String(template)));
            });
        });
    }
};
