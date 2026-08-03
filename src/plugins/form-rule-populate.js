/**
 * Plugin: populate_when
 * Popula múltiplos campos do formulário a partir de uma resposta AJAX.
 *
 * Uso no PHP:
 *   'populate_when' => [
 *       'event' => 'change',
 *       'url' => 'Lead/detalheJson',
 *       'method' => 'POST',
 *       'data' => ['cod' => '{value}'],
 *       'data_type' => 'json',
 *       'condition' => ['Tipo' => 'S'],
 *       'map' => [
 *           'Email' => 'email',
 *           'Razao' => 'razao',
 *           'Fantasia' => 'fantasia',
 *           'Cep' => 'cep',
 *           'Municipio' => 'cidade',
 *           'Logradouro' => 'rua',
 *           'Numero' => 'numero',
 *           'Complemento' => 'comple',
 *           'Bairro' => 'bairro',
 *           'Uf' => 'estado',
 *       ],
 *       'chain' => [
 *           ['action' => 'set_value', 'field' => 'Tipo', 'value' => 'S'],
 *           ['action' => 'trigger', 'field' => 'Cep', 'event' => 'blur'],
 *       ],
 *   ]
 */
window.FormRulePopulatePlugin = window.FormRulePopulatePlugin || class FormRulePopulatePlugin extends window.FormRulePlugin {
    constructor() {
        super('populate');
        this.debounceTimers = new Map();
    }

    extractDependencies(rules) {
        const fields = new Set();
        if (rules.map) {
            Object.keys(rules.map).forEach(f => fields.add(f));
        }
        if (rules.chain) {
            rules.chain.forEach(step => {
                if (step.field) fields.add(step.field);
                if (step.target) fields.add(step.target);
            });
        }
        return Array.from(fields);
    }

    apply(element, rules) {
        const input = this.findInput(element);
        if (!input) return;

        const event = rules.event || 'change';
        const $input = $(input);

        $input.off('.populatewhen');
        $input.on(event + '.populatewhen', () => this.execute(input, rules));
    }

    execute(input, rules) {
        if (rules.condition && !this.evaluateCondition(rules.condition)) return;

        const value = input.value || '';
        if (!value && rules.skip_empty !== false) return;

        clearTimeout(this.debounceTimers.get(input.name));
        const delay = rules.debounce || 0;
        const timer = setTimeout(() => this.request(input, rules, value), delay);
        this.debounceTimers.set(input.name, timer);
    }

    request(input, rules, value) {
        const ajaxConfig = {
            type: rules.method || 'POST',
            url: this.engine.resolveTemplate(rules.url, value),
            dataType: rules.data_type || 'json',
        };

        if (rules.data) {
            ajaxConfig.data = this.engine.resolveData(rules.data, value);
        }

        $.ajax(ajaxConfig).done(response => {
            this.populateFields(rules.map || {}, response);
            this.runChain(rules.chain || [], response);
        }).fail(() => {
            console.error('[FormRulePopulate] Falha ao carregar dados');
        });
    }

    populateFields(map, response) {
        Object.entries(map).forEach(([fieldName, path]) => {
            const val = this.engine.getResponsePath(response, path);
            if (val !== undefined && val !== null) {
                this.engine.setFieldValue(fieldName, val);
            }
        });
    }

    runChain(chain, response) {
        chain.forEach(step => {
            switch (step.action) {
                case 'set_value':
                    const val = step.value !== undefined ? step.value : this.engine.getResponsePath(response, step.path);
                    this.engine.setFieldValue(step.field, val);
                    break;
                case 'trigger':
                    const field = this.engine.form.querySelector(`[name="${step.field}"]`);
                    if (field) {
                        field.dispatchEvent(new Event(step.event || 'change', { bubbles: true }));
                    }
                    break;
                case 'refresh':
                    this.engine.refresh();
                    break;
            }
        });
    }
};
