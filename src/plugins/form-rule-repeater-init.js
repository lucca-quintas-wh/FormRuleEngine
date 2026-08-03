/**
 * Plugin: repeater-init
 * Reinicializa os plugins do FormRuleEngine em linhas adicionadas dinamicamente pelo IluRepeater.
 *
 * Funciona automaticamente para qualquer formulário que use IluRepeater + FormRuleEngine.
 * Escuta o evento 'ilu:repeater:row-added' que borbulha até o document e chama
 * engine.addElement() em cada novo elemento com atributos data-*-when.
 */
window.FormRuleRepeaterInitPlugin = window.FormRuleRepeaterInitPlugin || class FormRuleRepeaterInitPlugin extends window.FormRulePlugin {
    constructor() {
        super('repeater-init');
    }

    extractDependencies(rules) { return []; }
    apply(element, rules) {}
};

// A guarda `||` acima protege a CLASSE; ela nao protege o que o arquivo executa
// no topo. Sem esta bandeira, cada reinjecao do plugin (drawer reaberto, form
// injetado por AJAX) acrescenta OUTRO listener — funcao nova, referencia nova, o
// navegador nao dedupa — e cada linha nova do repeater passa a ser registrada N
// vezes no engine. addElement() nao e idempotente: empilha o elemento em
// this.elements e em dependencyMaps, entao a regra avalia N vezes por mudanca —
// em fetch_when/remote_validate_when isso e N requisicoes.
if (!window.__iluRepeaterRowAddedBound) {
    window.__iluRepeaterRowAddedBound = true;
    document.addEventListener('ilu:repeater:row-added', function (e) {
        const row = e.detail && e.detail.row;
        if (!row) return;

        const form = row.closest('form');
        if (!form) return;

        const formName = form.getAttribute('name') || form.id;
        const engine = window.__formRuleEnginesByName && window.__formRuleEnginesByName[formName];
        if (!engine) return;

        engine.plugins.forEach(function (plugin, pluginName) {
            const attr = 'data-' + pluginName + '-when';
            row.querySelectorAll('[' + attr + ']').forEach(function (el) {
                engine.addElement(el, pluginName);
            });
        });
    });
}
