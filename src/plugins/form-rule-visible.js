/**
 * Plugin: visible_when
 * Mostra/oculta elementos baseado em condições
 */
window.FormRuleVisiblePlugin = window.FormRuleVisiblePlugin || class FormRuleVisiblePlugin extends window.FormRulePlugin {
    constructor() {
        super('visible');
    }
    
    extractDependencies(rules) {
        return this.extractFieldNames(rules);
    }
    
    apply(element, rules) {
        const isVisible = this.evaluateCondition(rules);
        this.toggleVisibility(element, isVisible);
    }
    
    toggleVisibility(element, show) {
        const shouldAnimate = element.dataset.animate !== 'false';
        const keepSpace = element.dataset.keepSpace === 'true';
        
        if (show) {
            element.classList.remove('is-hidden', 'form-rule-hidden');
            if (element.classList.contains('form-step-hidden')) {
                element.style.display = 'none';
                return;
            }
            if (keepSpace) {
                element.style.visibility = '';
                element.style.opacity = '';
            }
            if (shouldAnimate) {
                element.style.display = '';
                element.style.opacity = '0';
                requestAnimationFrame(() => {
                    element.style.transition = 'opacity 0.2s ease';
                    element.style.opacity = '1';
                });
            } else {
                element.style.display = '';
            }
        } else {
            element.classList.add('is-hidden', 'form-rule-hidden');
            
            if (keepSpace) {
                element.style.visibility = 'hidden';
                element.style.opacity = '0';
            } else {
                element.style.display = 'none';
            }
            
            if (element.dataset.clearOnHide === 'true') {
                this.clearFields(element);
            }
        }
        
        // Dispara evento customizado
        element.dispatchEvent(new CustomEvent('visibility:changed', { 
            detail: { visible: show },
            bubbles: true
        }));
    }
    
    clearFields(container) {
        container.querySelectorAll('input, select, textarea').forEach(field => {
            if (field.type === 'checkbox' || field.type === 'radio') {
                field.checked = false;
            } else if (field.tagName === 'SELECT') {
                field.selectedIndex = 0;
            } else {
                field.value = '';
            }
            field.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }
};
