/**
 * Plugin: mask_when
 * Aplica/remove máscaras dinamicamente
 * Requer: jQuery Mask (jquery.mask.js)
 */
window.FormRuleMaskPlugin = window.FormRuleMaskPlugin || class FormRuleMaskPlugin extends window.FormRulePlugin {
    constructor() {
        super('mask');
        this.appliedMasks = new Map(); // Track masks aplicadas
    }
    
    extractDependencies(rules) {
        if (!Array.isArray(rules)) {
            return this.extractFieldNames(rules);
        }
        
        const fields = new Set();
        rules.forEach(rule => {
            Object.keys(rule).forEach(key => {
                if (key !== 'mask') fields.add(key);
            });
        });
        
        return Array.from(fields);
    }
    
    apply(element, rules) {
        const input = this.findInput(element);
        if (!input) return;
        
        const mask = this.resolveMask(rules);
        
        if (mask) {
            this.applyMask(input, mask);
        } else {
            this.removeMask(input);
        }
    }
    
    resolveMask(rules) {
        if (!Array.isArray(rules)) {
            return this.evaluateCondition(rules) ? rules.mask : null;
        }
        
        for (const rule of rules) {
            const mask = rule.mask;
            const conditions = { ...rule };
            delete conditions.mask;
            
            if (this.evaluateCondition(conditions)) {
                return mask;
            }
        }
        
        return null;
    }
    
    applyMask(input, mask) {
        const $input = $(input);
        const currentMask = this.appliedMasks.get(input);
        
        // Só reaplica se a máscara mudou
        if (currentMask === mask) return;
        
        // Remove máscara anterior
        if (currentMask) {
            $input.unmask();
        }
        
        // Aplica nova máscara
        if (typeof mask === 'string') {
            $input.mask(mask);
        } else if (typeof mask === 'object' && mask.pattern) {
            // Formato avançado: { pattern: '##/##/####', translation: {...} }
            $input.mask(mask.pattern, mask.options || {});
        } else if (typeof mask === 'function') {
            mask($input);
        }
        
        this.appliedMasks.set(input, mask);
    }
    
    removeMask(input) {
        const currentMask = this.appliedMasks.get(input);
        if (!currentMask) return;
        
        $(input).unmask();
        this.appliedMasks.delete(input);
    }
};
