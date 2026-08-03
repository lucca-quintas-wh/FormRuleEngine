/**
 * Plugin: label_when
 * Altera label do campo dinamicamente
 */
window.FormRuleLabelPlugin = window.FormRuleLabelPlugin || class FormRuleLabelPlugin extends window.FormRulePlugin {
    constructor() {
        super('label');
    }
    
    extractDependencies(rules) {
        const fields = new Set();
        
        if (!Array.isArray(rules)) {
            return this.extractFieldNames(rules);
        }
        
        rules.forEach(rule => {
            Object.keys(rule).forEach(key => {
                if (key !== 'label') fields.add(key);
            });
        });
        
        return Array.from(fields);
    }
    
    apply(element, rules) {
        const matchedLabel = this.evaluateLabelCondition(rules);
        this.updateLabel(element, matchedLabel);
    }
    
    evaluateLabelCondition(rules) {
        if (!Array.isArray(rules)) {
            return this.evaluateCondition(rules) ? 'matched' : null;
        }
        
        for (const rule of rules) {
            const label = rule.label;
            const conditions = { ...rule };
            delete conditions.label;
            
            if (this.evaluateCondition(conditions)) {
                return label;
            }
        }
        
        return null;
    }
    
    updateLabel(element, newLabel) {
        const label = this.findLabel(element);
        if (!label) return;
        
        const defaultLabel = label.dataset.labelDefault;
        const labelText = newLabel || defaultLabel;
        
        if (labelText) {
            if (label.tagName === 'LABEL') {
                label.textContent = labelText;
            } else {
                label.innerHTML = labelText;
            }
        }
    }
};
