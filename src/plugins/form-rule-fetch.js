/**
 * Plugin: fetch_when
 * Dispara requisições AJAX declarativas (autocomplete, CNPJ, CEP, etc.)
 * Suporta: eventos (blur/change/input), debounce, chain, condições
 */
window.FormRuleFetchPlugin = window.FormRuleFetchPlugin || class FormRuleFetchPlugin extends window.FormRulePlugin {
    constructor() {
        super('fetch');
        this.debounceTimers = new Map();
        this.inFlight = new Map();
    }

    extractDependencies(rules) {
        const deps = [];
        const configs = Array.isArray(rules) ? rules : [rules];
        const collect = value => {
            const matches = String(value || '').match(/\{(\w+)\}/g);
            if (matches) matches.forEach(m => deps.push(m.replace(/[{}]/g, '')));
        };

        configs.forEach(rule => {
            // `trigger` explícito manda: a cascata do cotador manda no corpo o valor
            // do PRÓPRIO alvo (a Administradora envia `administradora`), e derivar a
            // dependência dos tokens faria o campo disparar a busca que o repopula
            // laço infinito. Quem declara trigger diz exatamente quem o acorda.
            if (Array.isArray(rule.trigger) && rule.trigger.length) {
                deps.push(...rule.trigger);
                if (rule.condition) deps.push(...this.extractFieldNames(rule.condition));
                (rule.require || []).forEach(campo => deps.push(campo));
                return;
            }

            collect(rule.url);
            Object.values(rule.data || {}).forEach(collect);

            if (rule.condition) {
                deps.push(...this.extractFieldNames(rule.condition));
            }
            if (rule.chain) {
                rule.chain.forEach(step => {
                    collect(step.url);
                    Object.values(step.data || {}).forEach(collect);
                });
            }
        });
        return [...new Set(deps.filter(dep => dep !== 'value'))];
    }

    apply(element, rules) {
        const input = this.findInput(element);
        if (!input) return;

        const $input = $(input);
        const configs = Array.isArray(rules) ? rules : [rules];
        const event = configs[0].event || 'blur';

        // Remove handler anterior para evitar duplicação
        $input.off('.fetchwhen');

        // event: 'dependency', CASCATA. A regra mora no campo de DESTINO (o combo
        // que será populado) e não escuta o próprio change: a engine já reavalia o
        // elemento quando qualquer dependência muda, e é essa reavaliação que
        // executa a busca. É o que substitui os carrega*/seed* soltos na view.
        if (event === 'dependency') {
            const primeiraAvaliacao = element.dataset.fetchDependencyBound !== 'true';
            element.dataset.fetchDependencyBound = 'true';
            // No init a engine avalia todo mundo uma vez; buscar aí encheria os
            // combos antes de o usuário escolher a origem (e com filtro isEmpty).
            if (primeiraAvaliacao && !configs.some(rule => rule.immediate)) return;
            this.executeFetch(input, configs);
            return;
        }

        if (event === 'input' && configs[0].debounce) {
            $input.on('input.fetchwhen', () => {
                const val = input.value || '';
                const minLen = configs[0].min_length || 0;
                if (minLen && val.length < minLen) return;

                clearTimeout(this.debounceTimers.get(input));
                const timer = setTimeout(() => this.executeFetch(input, configs), configs[0].debounce);
                this.debounceTimers.set(input, timer);
            });
        } else {
            $input.on(event + '.fetchwhen', () => this.executeFetch(input, configs));
        }

        if ((configs[0].event === 'load' || configs.some(rule => rule.immediate)) && element.dataset.fetchImmediateExecuted !== 'true') {
            element.dataset.fetchImmediateExecuted = 'true';
            this.executeFetch(input, configs);
        }
    }

    executeFetch(input, rulesConfig) {
        const rulesList = Array.isArray(rulesConfig) ? rulesConfig : [rulesConfig];
        rulesList.forEach(rules => this.executeFetchRule(input, rules));
    }

    executeFetchRule(input, rules) {
        // `dependency` e `load` populam o PRÓPRIO campo: o valor dele é
        // irrelevante e os guardas de valor isEmpty abaixo não se aplicam. Sem
        // isto, um combo com `event: "load"` nunca carregava, porque nasce
        // isEmpty e `skip_empty` (padrão true) abortava a requisição.
        const cascata = rules.event === 'dependency' || rules.event === 'load';
        let value = input.value || '';
        if (rules.sanitize === 'digits') {
            value = value.replace(/[^0-9]/g, '');
        }

        // Numa cascata o valor do próprio campo é irrelevante: ele é o destino,
        // não a origem. Os guardas de valor isEmpty abaixo valem só para o modo
        // clássico (fetch disparado pelo blur/change do próprio campo).
        if (!cascata) {
            // on_empty: run actions and abort AJAX when value is empty
            if (!value && rules.on_empty) {
                this.engine.runActions(rules.on_empty, { value, input });
                return;
            }

            if (!value && rules.skip_empty !== false) return;
        }

        // `require`: nomes de campos que precisam estar preenchidos para a busca
        // fazer sentido. Faltando algum, o destino é ESVAZIADO, deixar a lista
        // anterior no ar mostraria opções de um filtro que não vale mais.
        if (Array.isArray(rules.require) && rules.require.length) {
            const faltando = rules.require.some(campo => {
                const v = this.engine.getFieldValue(campo);
                return v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length);
            });
            if (faltando) {
                this.clearTargets(rules);
                return;
            }
        }

        // Verifica condição
        if (rules.condition && !this.evaluateCondition(rules.condition)) {
            if (cascata) this.clearTargets(rules);
            return;
        }

        // Substitui {value} e {campo} na URL
        let url = this.engine.resolveTemplate(rules.url, value);
        if (!url) return;

        const ajaxConfig = {
            type: rules.method || 'GET',
            url: url,
            dataType: rules.data_type || 'json',
        };

        if (rules.data) {
            ajaxConfig.data = this.engine.resolveData(rules.data, value);
        }

        // Numa cascata vários gatilhos mudam no mesmo instante (repopular a
        // Operadora limpa a Acomodação, que também é gatilho do Produto), e a
        // requisição sairia idêntica duas vezes. Vale a última: a anterior é
        // abortada, senão a resposta atrasada sobrescreve a nova.
        // A engine faz JSON.parse do atributo a cada avaliação, então o objeto
        // `rules` é novo toda vez, a chave precisa vir do CONTEÚDO da regra.
        let inFlight = null;
        if (cascata) {
            const chave = JSON.stringify(rules);
            const assinatura = ajaxConfig.type + ' ' + url + ' ' + JSON.stringify(ajaxConfig.data || {});
            const anterior = this.inFlight.get(chave);
            if (anterior && anterior.xhr && anterior.xhr.readyState !== 4) {
                // Mesma busca já a caminho: não há o que fazer. Sair AQUI, antes
                // de abrir o token de loading, é o ponto do conserto, a versão
                // anterior já tinha chamado show() acima e retornava sem hide(),
                // prendendo o "Carregando" para sempre. Numa cascata este ramo é
                // rotina, não exceção: repopular a Operadora limpa a Acomodação,
                // que também é gatilho do Produto, então a mesma busca dispara
                // duas vezes no mesmo instante.
                if (anterior.assinatura === assinatura) return;
                anterior.abortada = true;
                anterior.xhr.abort();
                if (anterior.tokenLoading != null && window.LoadingManager) {
                    LoadingManager.hide(anterior.tokenLoading);
                    anterior.tokenLoading = null;
                }
            }
            inFlight = { assinatura, xhr: null, abortada: false, tokenLoading: null };
            this.inFlight.set(chave, inFlight);
        }

        // Loading só depois de todos os guardas: a partir daqui a requisição
        // sai de fato, e todo caminho de saída passa pelo .always() abaixo.
        let tokenLoading = null;
        if (rules.loading && window.LoadingManager) {
            tokenLoading = LoadingManager.show({ label: 'fetch_when ' + url });
        }
        if (inFlight) inFlight.tokenLoading = tokenLoading;

        const requisicao = $.ajax(ajaxConfig)
            .done((response) => {
                this.applyMap(response, rules.map);
                this.applyOptionsMap(response, rules.map_options);
                this.applySelectionMap(rules.map_selected);
                this.engine.runActions(rules.on_success, { response, value, input });

                // Chain
                if (rules.chain && Array.isArray(rules.chain)) {
                    rules.chain.forEach(step => this.executeChainStep(step, response));
                }
            })
            .fail(() => {
                // Aborto nosso (chegou gatilho mais novo) não é falha do servidor:
                // limpar o destino aqui apagaria o resultado da busca que o substituiu.
                if (inFlight && inFlight.abortada) return;
                if (rules.clear_on_fail) {
                    (Array.isArray(rules.clear_on_fail) ? rules.clear_on_fail : [rules.clear_on_fail])
                        .forEach(fieldName => this.engine.clearField(fieldName));
                }
                this.engine.runActions(rules.on_fail, { value, input });
                if (rules.message_fail) this.engine.showMessage('error', rules.message_fail);
            })
            .always(() => {
                // Fechar POR TOKEN é idempotente: se o abort acima já fechou
                // este, aqui vira no-op. Não é mais preciso adivinhar de quem
                // era o hide(), que era como um decremento acabava sobrando ou
                // faltando quando a cascata abortava a requisição anterior.
                if (tokenLoading != null && window.LoadingManager) {
                    LoadingManager.hide(tokenLoading);
                }
                if (inFlight && inFlight.tokenLoading === tokenLoading) {
                    inFlight.tokenLoading = null;
                }
            });

        if (inFlight) inFlight.xhr = requisicao;
    }

    /**
     * Esvazia os combos de destino de uma cascata, deixando só o placeholder.
     * Chamado quando um `require` não está satisfeito ou a `condition` reprova.
     */
    clearTargets(rules) {
        const lista = Array.isArray(rules.map_options)
            ? rules.map_options
            : (rules.map_options ? [rules.map_options] : []);

        lista.forEach(config => {
            if (!config || !config.field) return;
            this.engine.setFieldOptions(
                config.field, [],
                config.value_key || 'VALUE',
                config.label_key || 'DISPLAY',
                config.include_empty !== false,
                false
            );
            this.notifyTarget(config);
        });
    }

    /**
     * Avisa quem depende do destino que ele mudou. Sem isso, repopular um combo
     * é invisível para as outras regras: a liberação sequencial continuaria lendo
     * "preenchido" um campo que acabou de ser esvaziado, e a cascata seguinte
     * nunca dispararia. Só com `notify: true`, sem ele o comportamento é o
     * histórico (quem quiser encadeia por on_success/trigger).
     */
    notifyTarget(config) {
        if (!config || config.notify !== true || !config.field) return;
        const alvo = this.engine.form.querySelector(
            `[name="${config.field}"], [name="${config.field}[]"]`
        );
        if (!alvo) return;
        alvo.dispatchEvent(new Event('change', { bubbles: true }));
    }

    applyMap(response, map) {
        if (!map || typeof map !== 'object') return;

        Object.entries(map).forEach(([fieldName, config]) => {
            const valuePath = config && typeof config === 'object' ? config.value : config;
            const displayPath = config && typeof config === 'object' ? config.display : undefined;
            const value = this.engine.getResponsePath(response, valuePath);
            const displayValue = displayPath === undefined
                ? undefined
                : this.engine.getResponsePath(response, displayPath);
            this.engine.setFieldValue(
                fieldName,
                value !== undefined && value !== null ? value : '',
                true,
                displayValue
            );
        });
    }

    applyOptionsMap(response, mapOptions) {
        if (!mapOptions) return;
        const list = Array.isArray(mapOptions) ? mapOptions : [mapOptions];

        list.forEach(config => {
            if (!config || !config.field) return;
            let options = this.engine.getResponsePath(response, config.path || 'data');
            if (options && typeof options === 'object' && !Array.isArray(options)) {
                options = Object.values(options);
            }
            this.engine.setFieldOptions(
                config.field,
                options,
                config.value_key || 'VALUE',
                config.label_key || 'DISPLAY',
                config.include_empty !== false,
                config.select_first === true
            );
            this.appendFixedOptions(config);
            this.notifyTarget(config);
        });
    }

    /**
     * Opções fixas acrescentadas depois das que vieram do servidor, é a
     * "Nenhuma" que o cotador põe no fim da lista de administradoras.
     */
    appendFixedOptions(config) {
        const fixas = []
            .concat((config.prepend || []).map(item => ({ item, inicio: true })))
            .concat((config.append || []).map(item => ({ item, inicio: false })));
        if (!fixas.length) return;

        const alvo = this.engine.form.querySelector(`[name="${config.field}"]`);
        if (!alvo || alvo.tagName !== 'SELECT') return;

        // Quantas opções REAIS vieram do servidor (fora o placeholder isEmpty):
        // é o que decide um ".:Todos:." que só faz sentido com mais de uma.
        const reais = Array.from(alvo.options).filter(o => o.value !== '').length;

        fixas.forEach(({ item, inicio }) => {
            if (!item) return;
            if (item.min_options !== undefined && reais < Number(item.min_options)) return;

            const opcao = document.createElement('option');
            opcao.value = item.value !== undefined ? item.value : (item.VALUE || '');
            opcao.textContent = item.label !== undefined ? item.label : (item.DISPLAY || '');

            if (inicio) {
                // depois do placeholder, antes das opções do servidor
                const placeholder = alvo.options[0] && alvo.options[0].value === '' ? alvo.options[0] : null;
                alvo.insertBefore(opcao, placeholder ? placeholder.nextSibling : alvo.firstChild);
            } else {
                alvo.appendChild(opcao);
            }
        });
    }

    executeChainStep(step, parentResponse) {
        if (!step || !step.url) return;

        let url = this.engine.resolveTemplate(step.url, '', parentResponse);
        if (!url) return;

        const ajaxConfig = {
            type: step.method || 'GET',
            url: url,
            dataType: step.data_type || 'json',
        };

        if (step.data) {
            ajaxConfig.data = this.engine.resolveData(step.data, '', parentResponse);
        }

        $.ajax(ajaxConfig)
            .done((response) => {
                this.applyMap(response, step.map);
                this.applyOptionsMap(response, step.map_options);
                this.applySelectionMap(step.map_selected);
                this.engine.runActions(step.on_success, { response });
            });
    }

    applySelectionMap(mapSelected) {
        if (!mapSelected || typeof mapSelected !== 'object') return;

        Object.entries(mapSelected).forEach(([fieldName, config]) => {
            const field = this.engine.form.querySelector(`[name="${fieldName}"]`);
            if (!field || field.tagName !== 'SELECT') return;

            const selected = field.selectedOptions && field.selectedOptions[0];
            Object.entries(config || {}).forEach(([targetField, dataKey]) => {
                this.engine.setFieldValue(targetField, selected ? (selected.dataset[dataKey] || '') : '');
            });
        });
    }
};
