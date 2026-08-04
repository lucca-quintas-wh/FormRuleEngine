/**
 * Plugin: dynamic_table
 * Inicializa tabelas renderizadas por Controller::renderDynamicTable().
 */
window.FormRuleDynamicTablePlugin = window.FormRuleDynamicTablePlugin || class FormRuleDynamicTablePlugin extends window.FormRulePlugin {
    constructor() {
        super('dynamic-table');
    }

    extractDependencies(rules) {
        return rules && rules.condition ? this.extractFieldNames(rules.condition) : [];
    }

    apply(element, rules) {
        if (rules && rules.condition && !this.evaluateCondition(rules.condition)) return;
        window.iluDynamicTableInit(element);
    }
};

// A IIFE abaixo publica window.iluDynamicTable* e as globais de agrupamento.
// Reexecuta-la nao estoura, nao ha estado mutavel no escopo dela e bindWrapper
// ja e idempotente por `dataset.dynamicTableInitialized`, mas TROCA as funcoes
// publicadas por fechamentos novos, enquanto os listeners de uma tabela ja
// aberta continuam apontando para os antigos. Passariam a existir dois modulos
// vivos sobre o mesmo DOM; a guarda evita a divergencia.
if (!window.iluDynamicTableInit) {
(function() {
    function parseConfig(wrapper) {
        try {
            return JSON.parse(wrapper.dataset.dynamicTableConfig || '{}');
        } catch (e) {
            return {};
        }
    }

    function parseNumber(value) {
        if (value === undefined || value === null || value === '') return 0;
        if (typeof value === 'number') return value;
        var normalized = String(value)
            .replace(/[R$\s]/g, '')
            .replace(/\./g, '')
            .replace(',', '.');
        var parsed = parseFloat(normalized);
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    function formatMoney(value) {
        if (Number.prototype.formatMoney) {
            return Number(value).formatMoney(2, ',', '.');
        }
        return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function getCellValue(row, field) {
        var input = row.querySelector(
            'input[data-dt-field="' + field + '"], select[data-dt-field="' + field + '"], textarea[data-dt-field="' + field + '"]'
        );
        if (input) return input.value;

        var cell = row.querySelector('td[data-dt-field="' + field + '"]');
        if (!cell) return '';
        return cell.dataset.dtValue !== undefined && cell.dataset.dtValue !== '' ? cell.dataset.dtValue : cell.textContent;
    }

    /** Nomes vindos do tema: ver FormRuleEngine.theme. */
    function tema(nome) { return window.FormRuleEngine.theme.get(nome); }

    function getWrapper(target) {
        if (!target) return null;
        var raiz = tema('tableWrapper');
        if (target.classList && target.classList.contains(raiz.replace(/^\./, ''))) return target;
        return target.querySelector ? target.querySelector(raiz + '[data-dynamic-table-config]') : null;
    }

    function updateSummary(wrapper) {
        var config = parseConfig(wrapper);
        var table = wrapper.querySelector('table.' + tema('table'));
        if (!table) return;

        var totalsConfig = config.totals || {};
        var fields = new Set();
        var values = {};

        (table.querySelectorAll('[data-summary-field]') || []).forEach(function(cell) {
            fields.add(cell.dataset.summaryField);
        });
        Object.values(totalsConfig.targets || {}).forEach(function(field) {
            fields.add(field);
        });

        fields.forEach(function(field) {
            values[field] = 0;
        });

        table.querySelectorAll('tbody tr.' + tema('tableRow')).forEach(function(row) {
            if (fields.has('vidas')) row.setAttribute('vidas', parseNumber(getCellValue(row, 'vidas')));
            if (fields.has('valor')) row.setAttribute('valor', parseNumber(getCellValue(row, 'valor')));
            fields.forEach(function(field) {
                values[field] += parseNumber(getCellValue(row, field));
            });
        });

        table.querySelectorAll('[data-summary-field]').forEach(function(cell) {
            var field = cell.dataset.summaryField;
            var type = cell.dataset.summaryType || 'sum';
            if (type !== 'sum') return;
            cell.textContent = field === 'valor' ? 'R$ ' + formatMoney(values[field] || 0) : String(values[field] || 0);
        });

        Object.entries(totalsConfig.targets || {}).forEach(function(entry) {
            var target = document.querySelector('[name="' + entry[0] + '"], #' + entry[0]);
            if (target) target.value = values[entry[1]] || 0;
        });

        if (totalsConfig.footer) {
            var footer = totalsConfig.footer
                .replace(/\{valor\}/g, formatMoney(values.valor || 0))
                .replace(/\{vidas\}/g, String(values.vidas || 0));
            var footerCell = wrapper.querySelector('.totalItens');
            if (footerCell) footerCell.textContent = footer;
        }

        table.dispatchEvent(new CustomEvent('iluDynamicTable:changed', { detail: { totals: values, tableId: table.id } }));
    }

    function removeRow(wrapper, button) {
        var config = parseConfig(wrapper);
        var row = button.closest('tr');
        if (!row) return;

        var doRemove = function() {
            row.remove();
            updateSummary(wrapper);
        };

        if (!config.remove_confirm) {
            doRemove();
            return;
        }

        window.FormRuleEngine.host.confirm({
            text: config.remove_confirm,
            confirmText: window.FormRuleEngine.t('sim'),
        }).then(function (confirmado) {
            if (confirmado) doRemove();
        });
    }

    /**
     * Adiciona uma linha a partir do <template data-dt-row-template> emitido pelo
     * dynamic-table.phtml.
     *
     * O clone preserva os `name` declarados no PHP, inclusive os terminados em
     * "[]", porque o backend legado lê as linhas como arrays paralelos indexados
     * (ex.: AcaoLead::daoInsert percorre operadoraMulti[] e casa por índice com
     * planoMulti[], QuantMult[] etc.). É por isso que o repeater não serve aqui:
     * ele indexa o nome (campo0, campo1) e quebraria esse contrato.
     */
    function addRow(wrapper) {
        var tpl = wrapper.querySelector('template[data-dt-row-template]');
        var tbody = wrapper.querySelector('table.' + tema('table') + ' tbody');
        if (!tpl || !tbody) return null;

        var emptyRow = tbody.querySelector('tr.' + tema('tableEmptyRow'));
        if (emptyRow) emptyRow.remove();

        var fragment = tpl.content.cloneNode(true);
        var row = fragment.querySelector('tr');
        if (!row) return null;

        row.dataset.index = String(tbody.querySelectorAll('tr.' + tema('tableRow')).length);
        tbody.appendChild(fragment);

        var appended = tbody.lastElementChild;
        updateSummary(wrapper);
        wrapper.dispatchEvent(new CustomEvent('iluDynamicTable:rowAdded', {
            bubbles: true,
            detail: { row: appended, tableId: (wrapper.querySelector('table.' + tema('table')) || {}).id }
        }));
        return appended;
    }

    /**
     * Cascatas por linha.
     *
     * O fetch_when do form-rule-engine casa campo por `name`, o que não serve aqui:
     * numa tabela dinâmica todas as linhas repetem name="x[]". Estas funções
     * resolvem sempre dentro da <tr> de origem, então a linha 3 nunca repopula o
     * combo da linha 1.
     */

    function cellControl(row, field) {
        if (!row) return null;
        return row.querySelector(
            'select[data-dt-field="' + field + '"], input[data-dt-field="' + field + '"]'
        );
    }

    // As rotas legadas não são consistentes no caso das chaves: comboAdministradora
    // devolve VALUE/DISPLAY e comboOperadora devolve value/display. Ler os dois.
    function optionValue(item, cascade) {
        if (!item || typeof item !== 'object') return '';
        var key = cascade.value_key;
        if (key && item[key] !== undefined) return item[key];
        return item.VALUE !== undefined ? item.VALUE
             : item.value !== undefined ? item.value
             : (item.ID !== undefined ? item.ID : '');
    }

    function optionLabel(item, cascade) {
        if (!item || typeof item !== 'object') return '';
        var key = cascade.label_key;
        if (key && item[key] !== undefined) return item[key];
        return item.DISPLAY !== undefined ? item.DISPLAY
             : item.display !== undefined ? item.display
             : (item.NOME !== undefined ? item.NOME : '');
    }

    function resetCascadeTarget(row, cascade) {
        var target = cellControl(row, cascade.target);
        if (!target || target.tagName !== 'SELECT') return null;
        target.innerHTML = '';
        var placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = cascade.placeholder || window.FormRuleEngine.t('escolha');
        target.appendChild(placeholder);
        return target;
    }

    function runCascade(wrapper, row, cascade) {
        var target = resetCascadeTarget(row, cascade);
        if (!target) return;

        // Monta os parâmetros a partir das OUTRAS células da mesma linha.
        var params = {};
        var missingRequired = false;
        Object.keys(cascade.params || {}).forEach(function(paramName) {
            var sourceField = cascade.params[paramName];
            var control = cellControl(row, sourceField);
            var value = control ? control.value : '';
            params[paramName] = value;
            if ((cascade.require || []).indexOf(sourceField) !== -1 && !value) {
                missingRequired = true;
            }
        });

        // Sem a dependência obrigatória preenchida, fica só no placeholder, é o
        // que o indev faz (`if (!val) return;` em comboAdministradora/filtraItem).
        if (missingRequired) {
            target.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }

        window.jQuery.ajax({
            type: cascade.method || 'POST',
            url: cascade.url,
            data: params,
            dataType: 'json'
        }).done(function(data) {
            var items = Array.isArray(data) ? data : (data ? [data] : []);
            items.forEach(function(item) {
                var value = optionValue(item, cascade);
                if (value === '' || value === undefined || value === null) return;
                var option = document.createElement('option');
                option.value = value;
                option.textContent = optionLabel(item, cascade);
                target.appendChild(option);
            });
            // Dispara change para encadear o próximo nível da cascata.
            target.dispatchEvent(new Event('change', { bubbles: true }));
        }).fail(function() {
            if (window.console && console.warn) {
                console.warn('[iluDynamicTable] falha na cascata', cascade.url);
            }
        });
    }

    function bindCascades(wrapper) {
        var config = parseConfig(wrapper);
        var cascades = config.cascades || [];
        if (!cascades.length || !window.jQuery) return;

        wrapper.addEventListener('change', function(event) {
            var control = event.target.closest('[data-dt-field]');
            if (!control) return;
            var field = control.dataset.dtField;
            var row = control.closest('tr');
            if (!row) return;

            cascades.forEach(function(cascade) {
                var triggers = cascade.trigger || Object.values(cascade.params || {});
                if (triggers.indexOf(field) === -1) return;
                if (cascade.target === field) return;
                runCascade(wrapper, row, cascade);
            });
        });
    }

    function bindWrapper(wrapper) {
        if (!wrapper || wrapper.dataset.dynamicTableInitialized === 'true') return;
        wrapper.dataset.dynamicTableInitialized = 'true';

        wrapper.addEventListener('click', function(event) {
            var button = event.target.closest('[data-dt-action="remove"]');
            if (button) { removeRow(wrapper, button); return; }

            var addBtn = event.target.closest('[data-dt-action="add"]');
            if (addBtn) { addRow(wrapper); }
        });

        wrapper.addEventListener('input', function(event) {
            if (event.target.matches('[data-dt-field]')) updateSummary(wrapper);
        });
        wrapper.addEventListener('change', function(event) {
            if (event.target.matches('[data-dt-field]')) updateSummary(wrapper);
        });

        bindCascades(wrapper);
        updateSummary(wrapper);
    }

    window.iluDynamicTableInit = function(root) {
        var wrapper = getWrapper(root);
        if (wrapper) bindWrapper(wrapper);
        if (root && root.querySelectorAll) {
            root.querySelectorAll(tema('tableWrapper') + '[data-dynamic-table-config]').forEach(bindWrapper);
        }
    };

    window.iluDynamicTableUpdateSummary = function(tableId) {
        var wrapper = document.getElementById(tableId + '_wrapper') || (document.getElementById(tableId) || {}).parentNode;
        if (wrapper) updateSummary(wrapper);
    };

    window.iluDynamicTableAddRow = function(tableId) {
        var wrapper = document.getElementById(tableId + '_wrapper');
        return wrapper ? addRow(wrapper) : null;
    };

    window.iluDynamicTableGetRowCount = function(tableId) {
        var table = document.getElementById(tableId);
        return table ? table.querySelectorAll('tbody tr.' + tema('tableRow')).length : 0;
    };

    window.calcularTotalAgrupamento = function() {
        window.iluDynamicTableUpdateSummary('bodyManterItens');
    };

    window.removeLinhaAgrupamento = function(id) {
        var row = document.querySelector('.linhaAgrupamento_' + id);
        var wrapper = document.getElementById('bodyManterItens_wrapper');
        if (row && wrapper) {
            removeRow(wrapper, row.querySelector('[data-dt-action="remove"]') || row);
        }
    };

    window.addLinhaAgrupamento = function() {
        window.iluDynamicTableUpdateSummary('bodyManterItens');
    };

    window.atualizaLinhaAgrupamento = function(id, campo, valor) {
        var row = document.querySelector('.linhaAgrupamento_' + id);
        if (!row) return;
        var cell = row.querySelector('[data-dt-field="' + campo + '"]');
        if (cell) {
            if (/^(INPUT|SELECT|TEXTAREA)$/.test(cell.tagName)) cell.value = valor;
            else cell.dataset.dtValue = valor;
        }
        window.iluDynamicTableUpdateSummary('bodyManterItens');
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { window.iluDynamicTableInit(document); });
    } else {
        window.iluDynamicTableInit(document);
    }
})();
} else {
    // Reinjecao: o modulo ja existe, mas a tabela pode ser NOVA (veio no HTML
    // que reinjetou o script). Religa o que ainda nao foi religado, bindWrapper
    // pula wrapper ja inicializado.
    window.iluDynamicTableInit(document);
}
