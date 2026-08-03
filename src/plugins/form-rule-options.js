/**
 * Plugin: options_when
 * Filtra/reconstrói options de selects dinamicamente
 */
window.FormRuleOptionsPlugin = window.FormRuleOptionsPlugin || class FormRuleOptionsPlugin extends window.FormRulePlugin {
    constructor() {
        super('options');
        this.originalOptions = new Map(); // Guarda options originais
    }
    
    extractDependencies(rules) {
        // options_when tem formato especial: { depends_on: 'campo', options: {...} }
        if (rules.depends_on) {
            return [rules.depends_on];
        }
        // Ou formato array de condições
        return this.extractFieldNames(rules);
    }
    
    apply(element, rules) {
        const select = this.findInput(element);
        if (!select || select.tagName !== 'SELECT') return;
        
        // Guarda options originais na primeira execução
        if (!this.originalOptions.has(select)) {
            this.originalOptions.set(select, Array.from(select.options).map(o => ({
                value: o.value,
                text: o.text,
                selected: o.selected
            })));
        }
        
        const config = this.resolveConfig(rules);
        if (!config) {
            // Restaura options originais
            this.restoreOriginalOptions(select);
            return;
        }
        
        this.rebuildOptions(select, config);
    }
    
    resolveConfig(rules) {
        // Formato 1: { depends_on: 'campo', options: { valor1: {opt1: 'txt1'}, valor2: {...} } }
        if (rules.depends_on) {
            const parentValue = this.engine.getFieldValue(rules.depends_on);
            return rules.options[parentValue];
        }
        
        // Formato 2: array de condições [{campo: 'valor', options: {...}}, ...]
        if (Array.isArray(rules)) {
            for (const rule of rules) {
                const options = rule.options;
                const conditions = { ...rule };
                delete conditions.options;
                
                if (this.evaluateCondition(conditions)) {
                    return options;
                }
            }
        }
        
        return null;
    }
    
    rebuildOptions(select, options) {
        const currentValue = select.value;
        select.innerHTML = '';
        
        // Adiciona placeholder se necessário
        if (select.dataset.placeholder) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = select.dataset.placeholder;
            select.appendChild(opt);
        }
        
        // Adiciona novas options
        Object.entries(options).forEach(([value, text]) => {
            const opt = document.createElement('option');
            opt.value = value;
            opt.textContent = text;
            if (value === currentValue) opt.selected = true;
            select.appendChild(opt);
        });
        
        // Se valor atual não existe mais, seleciona o primeiro
        if (!Array.from(select.options).some(o => o.value === currentValue)) {
            select.selectedIndex = 0;
        }
        
        // Dispara evento para notificar possíveis dependentes
        select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    restoreOriginalOptions(select) {
        const original = this.originalOptions.get(select);
        if (!original) return;
        
        const currentValue = select.value;
        select.innerHTML = '';
        
        original.forEach(optData => {
            const opt = document.createElement('option');
            opt.value = optData.value;
            opt.textContent = optData.text;
            opt.selected = optData.value === currentValue || optData.selected;
            select.appendChild(opt);
        });
    }
};
