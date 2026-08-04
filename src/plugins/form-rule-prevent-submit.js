/**
 * Plugin: prevent_submit_when
 * Previne submit do form quando condições de negócio não são satisfeitas.
 *
 * Uso no PHP:
 *   'prevent_submit_when' => [
 *       'condition' => ['AND' => [['Tipo' => 'C'], ['TipoPessoa' => 'J']]],
 *       'fields' => ['Ie'],           // Campos que devem estar preenchidos
 *       'message' => 'Informar IE ou ISENTO',
 *   ]
 *
 * Quando condition é satisfeita, verifica se todos os campos em 'fields' estão preenchidos.
 * Se algum estiver isEmpty, bloqueia o submit e exibe a mensagem.
 */
window.FormRulePreventSubmitPlugin = window.FormRulePreventSubmitPlugin || class FormRulePreventSubmitPlugin extends window.FormRulePlugin {
    constructor() {
        super('prevent-submit');
        this.rulesByForm = new Map(); // formName => [rules]
    }

    extractDependencies(rules) {
        return this.extractFieldNames(rules.condition || {});
    }

    apply(element, rules) {
        const formName = this.engine.form.getAttribute('name') || this.engine.form.id;
        if (!formName) return;

        if (!this.rulesByForm.has(formName)) {
            this.rulesByForm.set(formName, []);
        }

        const formRules = this.rulesByForm.get(formName);
        // Evita duplicatas comparando JSON
        const ruleKey = JSON.stringify(rules);
        if (!formRules.some(r => JSON.stringify(r) === ruleKey)) {
            formRules.push({
                condition: rules.condition || {},
                fields: rules.fields || [],
                target: rules.target || null,
                message: rules.message || window.FormRuleEngine.t('camposObrigatorios'),
                skip_empty: rules.skip_empty !== false, // default true
            });
        }
    }

    /**
     * Validação executada antes do submit.
     * Retorna { valid: true } ou { valid: false, message: '...' }
     */
    validateBeforeSubmit(formName) {
        const rules = this.rulesByForm.get(formName) || [];

        for (const rule of rules) {
            // Avalia se a condição está ativa
            if (!this.evaluateCondition(rule.condition)) {
                continue; // Condição não satisfeita, não aplica esta regra
            }

            // Verifica campos obrigatórios
            const emptyFields = [];
            const fieldsToCheck = rule.fields || (rule.target ? [rule.target] : []);

            for (const fieldName of fieldsToCheck) {
                const value = this.engine.getFieldValue(fieldName);
                const isEmpty = value === null || value === undefined || String(value).trim() === '';
                if (isEmpty) {
                    emptyFields.push(fieldName);
                }
            }

            if (emptyFields.length > 0) {
                // Destaca campos vazios
                emptyFields.forEach(fieldName => {
                    const field = this.engine.form.querySelector(`[name="${fieldName}"]`);
                    if (field) {
                        const marca = this.temaClasses('preventSubmitError');
                        field.classList.add(...marca);
                        // Remove classe após 3s
                        setTimeout(() => {
                            field.classList.remove(...marca);
                        }, 3000);
                    }
                });

                return {
                    valid: false,
                    message: rule.message,
                    fields: emptyFields
                };
            }
        }

        return { valid: true };
    }
};
