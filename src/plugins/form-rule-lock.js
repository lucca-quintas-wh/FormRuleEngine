/**
 * Plugin: lock_when
 * Trava um campo, define um valor fixo e opcionalmente restaura ao desbloquear.
 *
 * Uso no PHP:
 *   'lock_when' => [
 *       'target' => 'TipoPessoa',
 *       'value' => 'F',
 *       'restore_on_unlock' => true,
 *       'condition' => ['Rural' => 'S'],
 *   ]
 *
 * Quando condition é satisfeita:
 *   - Guarda valor original em dataset.lockOriginalValue
 *   - Define valor para 'value'
 *   - Adiciona readonly/disabled
 *   - Adiciona classe .form-rule-locked
 *
 * Quando condition deixa de ser satisfeita:
 *   - Restaura valor original (se restore_on_unlock=true)
 *   - Remove readonly/disabled
 *   - Remove classe .form-rule-locked
 */
window.FormRuleLockPlugin = window.FormRuleLockPlugin || class FormRuleLockPlugin extends window.FormRulePlugin {
    constructor() {
        super('lock');
    }

    extractDependencies(rules) {
        const deps = new Set();

        // Campos da condição
        if (rules.condition) {
            this.extractFieldNames(rules.condition).forEach(f => deps.add(f));
        }

        // O próprio target também é uma dependência implícita
        // (para reavaliar quando o target muda, embora raro)
        if (rules.target) {
            deps.add(rules.target);
        }

        return Array.from(deps);
    }

    apply(element, rules) {
        const isLocked = this.evaluateCondition(rules.condition || {});
        const targetName = rules.target;
        const lockValue = rules.value;
        const restoreOnUnlock = rules.restore_on_unlock !== false;

        if (!targetName) {
            console.warn('[FormRuleLock] "target" é obrigatório');
            return;
        }

        const targetField = this.findField(targetName);
        if (!targetField) {
            console.warn(`[FormRuleLock] Campo target "${targetName}" não encontrado`);
            return;
        }

        const wrapper = targetField.closest('.ilu-form-field, .drawer-form-field, .form-group');

        if (isLocked) {
            this.lockField(targetField, wrapper, lockValue, restoreOnUnlock);
        } else {
            this.unlockField(targetField, wrapper, restoreOnUnlock);
        }
    }

    findField(fieldName) {
        return this.engine.form.querySelector(`[name="${fieldName}"]`);
    }

    lockField(field, wrapper, lockValue, restoreOnUnlock) {
        // Guarda valor original apenas uma vez
        if (restoreOnUnlock && !field.dataset.lockOriginalValueSaved) {
            field.dataset.lockOriginalValue = field.value;
            field.dataset.lockOriginalValueSaved = 'true';
        }

        // Define valor travado (sem disparar evento para evitar loop)
        if (lockValue !== undefined && field.value !== String(lockValue)) {
            field.value = lockValue;
            // Dispara change silencioso para outros plugins reagirem
            field.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Trava edição
        field.setAttribute('readonly', 'readonly');
        field.setAttribute('disabled', 'disabled');

        // Adiciona classe visual
        if (wrapper) {
            wrapper.classList.add('form-rule-locked');
        }
        field.classList.add('form-rule-locked-input');
    }

    unlockField(field, wrapper, restoreOnUnlock) {
        // Restaura valor original
        if (restoreOnUnlock && field.dataset.lockOriginalValueSaved) {
            const originalValue = field.dataset.lockOriginalValue;
            if (field.value !== originalValue) {
                field.value = originalValue;
                field.dispatchEvent(new Event('change', { bubbles: true }));
            }
            delete field.dataset.lockOriginalValue;
            delete field.dataset.lockOriginalValueSaved;
        }

        // Remove travamento
        field.removeAttribute('readonly');
        field.removeAttribute('disabled');

        // Remove classe visual
        if (wrapper) {
            wrapper.classList.remove('form-rule-locked');
        }
        field.classList.remove('form-rule-locked-input');
    }
};
