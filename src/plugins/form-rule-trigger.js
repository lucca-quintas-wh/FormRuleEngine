/**
 * Plugin: trigger_when
 * Dispara eventos em campos alvo quando o campo monitorado satisfaz uma condição.
 *
 * Formato:
 *   trigger_when: [
 *     {
 *       condition: { op: 'not_empty' },          // opcional — condição sobre o valor do campo
 *       fire: [
 *         { field: 'CampoAlvo', event: 'change' },
 *         { field: 'OutroCampo', event: 'change', delay: 50 }
 *       ]
 *     }
 *   ]
 */
window.FormRuleTriggerPlugin = window.FormRuleTriggerPlugin || class FormRuleTriggerPlugin extends window.FormRulePlugin {
    constructor() {
        super('trigger');
    }

    extractDependencies(rules) {
        const deps = new Set();
        const configs = Array.isArray(rules) ? rules : [rules];
        configs.forEach(rule => {
            if (rule.condition) this.extractFieldNames(rule.condition).forEach(f => deps.add(f));
        });
        return Array.from(deps);
    }

    apply(element, rules) {
        const input = this.findInput(element);
        if (!input) return;

        const configs = Array.isArray(rules) ? rules : [rules];
        const $input = $(input);

        $input.off('.triggerwhen');
        $input.on('change.triggerwhen input.triggerwhen', () => {
            configs.forEach(rule => {
                if (rule.condition && !this.evaluateCondition(rule.condition)) return;

                const targets = Array.isArray(rule.fire) ? rule.fire : [rule.fire];
                targets.forEach(target => {
                    if (!target) return;
                    const targetField = typeof target === 'string' ? target : target.field;
                    const event      = (typeof target === 'object' ? target.event : null) || 'change';
                    const delay      = (typeof target === 'object' ? target.delay : null) || 0;

                    const el = this.findInput(targetField);
                    if (!el) return;
                    if (delay > 0) {
                        setTimeout(() => $(el).trigger(event), delay);
                    } else {
                        $(el).trigger(event);
                    }
                });
            });
        });
    }
};
