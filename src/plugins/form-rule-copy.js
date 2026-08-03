/**
 * Plugin: copy_when
 * Copia valor de um campo fonte para o campo alvo quando condição é satisfeita.
 *
 * Uso no PHP:
 *   'copy_when' => [
 *       'source' => 'Razao',           // Campo fonte
 *       'condition' => ['TipoPessoa' => 'F'],  // Quando copiar
 *       'event' => 'change blur',      // Eventos que disparam (padrão: change)
 *   ]
 *
 * Quando condition é satisfeita, copia o valor do source para o campo atual.
 * Quando condition deixa de ser satisfeita, limpa o campo (opcional via clear_on_unlock).
 */
window.FormRuleCopyPlugin = window.FormRuleCopyPlugin || class FormRuleCopyPlugin extends window.FormRulePlugin {
    constructor() {
        super('copy');
        this.originalValues = new Map(); // fieldName => valor original
    }

    extractDependencies(rules) {
        const deps = new Set();
        if (rules.source) deps.add(rules.source);
        if (rules.condition) this.extractFieldNames(rules.condition).forEach(f => deps.add(f));
        return Array.from(deps);
    }

    apply(element, rules) {
        const input = this.findInput(element);
        if (!input) return;

        const targetName = input.name;
        const sourceName = rules.source;
        if (!sourceName || !targetName) return;

        const events = (rules.event || 'change').split(/\s+/);
        const $input = $(input);

        // Guarda valor original na primeira vez
        if (!this.originalValues.has(targetName)) {
            this.originalValues.set(targetName, input.value);
        }

        events.forEach(evt => {
            $input.off('.copywhen');
        });

        // Observa mudanças no campo fonte também
        const sourceField = this.engine.form.querySelector(`[name="${sourceName}"]`);
        if (sourceField) {
            $(sourceField).off('.copywhen-source');
            $(sourceField).on('change.copywhen-source', () => this.evaluate(input, rules));
        }

        // Observa mudanças nos campos de condição
        const conditionDeps = this.extractDependencies(rules);
        conditionDeps.forEach(dep => {
            const depField = this.engine.form.querySelector(`[name="${dep}"]`);
            if (depField) {
                $(depField).off('.copywhen-dep');
                $(depField).on('change.copywhen-dep', () => this.evaluate(input, rules));
            }
        });

        // Avaliação inicial
        this.evaluate(input, rules);
    }

    evaluate(input, rules) {
        const targetName = input.name;
        const sourceName = rules.source;
        const conditionMet = !rules.condition || this.evaluateCondition(rules.condition);

        const sourceField = this.engine.form.querySelector(`[name="${sourceName}"]`);
        if (!sourceField) return;

        if (conditionMet) {
            const sourceValue = sourceField.value || '';
            if (input.value !== sourceValue) {
                input.value = sourceValue;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        } else if (rules.clear_on_unlock !== false) {
            // Restaura valor original ou limpa
            const originalValue = this.originalValues.get(targetName) || '';
            if (input.value !== originalValue) {
                input.value = originalValue;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }
};
