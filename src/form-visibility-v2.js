/**
 * FormVisibilityManager v2.0
 * Orchestrator que inicializa FormRuleEngine com todos os plugins
 * Backward compatible com v1.1 (usa mesma API pública)
 */
(function() {
    function registerPluginIfAvailable(engine, name, className) {
        const PluginClass = window[className];
        if (typeof PluginClass === 'function') {
            const plugin = new PluginClass();
            engine.registerPlugin(name, plugin);
            return plugin;
        }
        return null;
    }

    function initFormVisibilityV2(root) {
        const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
        scope.querySelectorAll('[data-form-visibility="true"]').forEach(form => {
            if (form.dataset.formVisibilityV2Initialized === 'true') return;
            if (typeof window.FormRuleEngine !== 'function') return;

            const engine = new FormRuleEngine(form);
            if (!engine.form) return;

            form.dataset.formVisibilityV2Initialized = 'true';

            // Registra plugins (ordem importa para dependências)
            registerPluginIfAvailable(engine, 'visible', 'FormRuleVisiblePlugin');
            registerPluginIfAvailable(engine, 'required', 'FormRuleRequiredPlugin');
            registerPluginIfAvailable(engine, 'disabled', 'FormRuleDisabledPlugin');
            registerPluginIfAvailable(engine, 'label', 'FormRuleLabelPlugin');
            registerPluginIfAvailable(engine, 'options', 'FormRuleOptionsPlugin');
            registerPluginIfAvailable(engine, 'mask', 'FormRuleMaskPlugin');
            registerPluginIfAvailable(engine, 'validate', 'FormRuleValidatePlugin');
            registerPluginIfAvailable(engine, 'action', 'FormRuleActionPlugin');
            registerPluginIfAvailable(engine, 'fetch', 'FormRuleFetchPlugin');
            registerPluginIfAvailable(engine, 'remote-validate', 'FormRuleRemoteValidatePlugin');
            registerPluginIfAvailable(engine, 'trigger', 'FormRuleTriggerPlugin');
            registerPluginIfAvailable(engine, 'set-value', 'FormRuleSetValuePlugin');
            registerPluginIfAvailable(engine, 'computed', 'FormRuleComputedPlugin');
            registerPluginIfAvailable(engine, 'confirm-submit', 'FormRuleConfirmSubmitPlugin');
            registerPluginIfAvailable(engine, 'dynamic-table', 'FormRuleDynamicTablePlugin');
            registerPluginIfAvailable(engine, 'behavior', 'FormRuleBehaviorPlugin');
            registerPluginIfAvailable(engine, 'lock', 'FormRuleLockPlugin');
            registerPluginIfAvailable(engine, 'prevent-submit', 'FormRulePreventSubmitPlugin');
            registerPluginIfAvailable(engine, 'populate', 'FormRulePopulatePlugin');
            registerPluginIfAvailable(engine, 'copy', 'FormRuleCopyPlugin');
            registerPluginIfAvailable(engine, 'revert', 'FormRuleRevertPlugin');
            registerPluginIfAvailable(engine, 'submit-handler', 'FormRuleSubmitHandlerPlugin');
            registerPluginIfAvailable(engine, 'repeater-init', 'FormRuleRepeaterInitPlugin');
            registerPluginIfAvailable(engine, 'password', 'FormRulePasswordPlugin');
            const stepPlugin = registerPluginIfAvailable(engine, 'step', 'FormRuleStepPlugin');
            const sequencePlugin = registerPluginIfAvailable(engine, 'sequence', 'FormRuleSequencePlugin');

            engine.refresh();
            if (stepPlugin && typeof stepPlugin.init === 'function') {
                stepPlugin.init(engine);
            }
            // Depois do refresh(): a fila lê visibilidade computada para saber quais
            // campos são aplicáveis, então precisa do DOM já resolvido pelo visible.
            if (sequencePlugin && typeof sequencePlugin.init === 'function') {
                sequencePlugin.init(engine);
            }

            // Registra componentes externos com data-visible-when fora do <form>
            // (ex: accordions de drawer declarados com visible_when no controller).
            // IMPORTANTE: só adota elementos que NÃO pertencem a outro form. Sem essa
            // guarda, ao abrir um drawer aninhado o engine do form de dentro "adota" as
            // seções condicionais do form do drawer pai (que referenciam campos que ele
            // não tem) e as esconde indevidamente.
            scope.querySelectorAll('[data-visible-when]').forEach(function(el) {
                if (form.contains(el)) {
                    return;
                }
                var ownerForm = el.closest('[data-form-visibility="true"]');
                if (ownerForm && ownerForm !== form) {
                    return;
                }
                engine.addElement(el, 'visible');
            });

            // Notifica middlewares (ex: aggregate tabs fora do form) que o engine está pronto
            form.dispatchEvent(new CustomEvent('form-rule-engine:ready', {
                detail: { engine: engine },
                bubbles: true
            }));
        
            // API pública backward compatible
            window.formVisibilityManager = {
                refresh: () => engine.refresh(),
                addElement: (el, type) => engine.addElement(el, type),
                engine: engine // Acesso direto se necessário
            };
        });
    }

    window.initFormVisibilityV2 = initFormVisibilityV2;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initFormVisibilityV2(document));
    } else {
        initFormVisibilityV2(document);
    }
})();

// Backward compatibility: exporta FormVisibilityManager como alias
window.FormVisibilityManager = window.FormRuleEngine;
