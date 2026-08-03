/**
 * Plugin: behavior
 * Comportamentos client-side declarativos para forms controller-first.
 */
window.FormRuleBehaviorPlugin = window.FormRuleBehaviorPlugin || class FormRuleBehaviorPlugin extends window.FormRulePlugin {
    constructor() {
        super('behavior');
    }

    extractDependencies() {
        return [];
    }

    apply(element, rules) {
        const behaviors = Array.isArray(rules) ? rules : [rules];

        behaviors.forEach(behavior => {
            if (!behavior || typeof behavior !== 'object') return;

            if (behavior.type === 'token_insert') {
                this.bindTokenInsert(element, behavior);
            }

            if (behavior.type === 'ajax_submit') {
                this.bindAjaxSubmit(behavior);
            }

            if (behavior.type === 'ajax_mutations') {
                this.bindAjaxMutations(element, behavior);
            }

            if (behavior.type === 'intl_phone') {
                this.initializeIntlPhone(element);
            }

            if (behavior.type === 'prevent_enter') {
                this.bindPreventEnter(element);
            }
        });
    }

    /**
     * Enter não submete. Vale para formulário que monta uma lista antes de
     * enviar (o cotador inclui itens): ali o Enter no meio do preenchimento
     * dispararia o envio com a lista pela metade. Fora do textarea, onde a
     * quebra de linha é o comportamento esperado.
     */
    bindPreventEnter(element) {
        const form = this.engine.form;
        if (!form || form.dataset.behaviorPreventEnterBound === 'true') return;
        form.dataset.behaviorPreventEnterBound = 'true';

        form.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;
            const alvo = event.target;
            if (alvo && (alvo.tagName === 'TEXTAREA' || alvo.type === 'submit' || alvo.type === 'button')) return;
            event.preventDefault();
        });
    }

    initializeIntlPhone(element) {
        if (element.dataset.behaviorIntlPhoneInitialized === 'true') return;
        element.dataset.behaviorIntlPhoneInitialized = 'true';

        if (typeof window.loadIntlTelInput === 'function') {
            window.loadIntlTelInput(element);
        }
    }

    bindTokenInsert(element, behavior) {
        if (element.dataset.behaviorTokenInsertBound === 'true') return;

        const triggerSelector = behavior.trigger || '[data-template-token]';
        const tokenAttr = behavior.token_attr || 'templateToken';
        const targetName = behavior.target || '';

        element.addEventListener('click', event => {
            const trigger = event.target.closest(triggerSelector);
            if (!trigger || !element.contains(trigger)) return;

            const token = trigger.dataset[tokenAttr] || trigger.getAttribute('data-template-token') || '';
            const field = this.findField(targetName);
            if (!field || !token) return;

            const start = field.selectionStart || 0;
            const end = field.selectionEnd || 0;
            const value = String(field.value || '');

            field.value = value.substring(0, start) + token + value.substring(end);
            field.focus();
            field.selectionStart = field.selectionEnd = start + token.length;
            field.dispatchEvent(new Event('input', { bubbles: true }));
        });

        element.dataset.behaviorTokenInsertBound = 'true';
    }

    bindAjaxSubmit(behavior) {
        const expose = behavior.expose || '';
        if (!expose) return;

        window[expose] = () => this.submitAjax(behavior);
    }

    /**
     * `modes`: o mesmo botão submete de formas diferentes conforme o estado do
     * formulário (no cotador, "Orçar por" Tabela/Operadora/Cotação muda rota e
     * corpo). Vence o primeiro modo cuja `when` casa; o que o modo declara
     * sobrescreve o comportamento base. Sem isto, cada modo vira um `if` num
     * JS de view — que é exatamente o que estamos removendo.
     */
    resolverModo(behavior) {
        const modos = Array.isArray(behavior.modes) ? behavior.modes : [];
        if (!modos.length) return behavior;

        const escolhido = modos.find(modo => !modo.when || this.engine.evaluateCondition(modo.when));
        return escolhido ? Object.assign({}, behavior, escolhido) : behavior;
    }

    /**
     * Guardas antes de enviar: condição que, verdadeira, ABORTA com mensagem.
     * É o "Favor incluir um item" — uma regra de negócio, não de campo.
     */
    guardasReprovam(behavior) {
        const guardas = Array.isArray(behavior.guards) ? behavior.guards : [];
        return guardas.some(guarda => {
            if (!guarda || !guarda.condition) return false;
            if (!this.engine.evaluateCondition(guarda.condition)) return false;
            if (guarda.message) this.showLegacyMessage(guarda.message, 3000, 'error');
            return true;
        });
    }

    submitAjax(behaviorBase) {
        const form = this.engine.form;
        if (!form) return false;

        const behavior = this.resolverModo(behaviorBase);
        if (this.guardasReprovam(behavior)) return false;

        const formId = form.id || form.getAttribute('name');
        const validator = this.getControllerFirstValidator(formId);
        if (validator && !validator.validateAll()) {
            this.showValidationMessage();
            this.scrollFirstValidationError(form);
            return false;
        }

        if (typeof window.validate === 'function' && formId && !window.validate(formId)) {
            return false;
        }

        if (this.engine.hasRemoteValidationErrors()) {
            this.engine.showMessage('error', Array.from(this.engine.remoteValidations.values())[0]);
            return false;
        }

        // `payload` troca a serialização do form por um corpo declarado campo a
        // campo (modo Tabela do cotador manda 4 valores, não a tela inteira).
        const data = behavior.payload
            ? Object.assign(this.engine.resolveData(behavior.payload), behavior.append_data || {})
            : this.buildSubmitData(form, behavior.append_data || {}, behavior.serialize_extra);
        const isFormData = (typeof FormData !== 'undefined') && (data instanceof FormData);

        $.ajax({
            type: behavior.method || 'POST',
            url: (window.syspath || '') + (behavior.route || form.getAttribute('action') || ''),
            data: data,
            // Upload (multipart): deixa o browser montar o boundary. serialize() dropa files.
            processData: isFormData ? false : true,
            contentType: isFormData ? false : 'application/x-www-form-urlencoded; charset=UTF-8',
            dataType: behavior.data_type || 'json',
            beforeSend: function() {
                if (typeof window.LoadingManager !== 'undefined') {
                    LoadingManager.show();
                }
            },
            complete: function() {
                if (typeof window.LoadingManager !== 'undefined') {
                    LoadingManager.hide();
                }
            },
            success: response => this.handleSubmitSuccess(response, behavior),
            error: xhr => {
                if (window.console && typeof console.error === 'function') {
                    console.error('[FormRuleBehavior] Falha no submit AJAX', xhr);
                }
                this.showLegacyMessage(behavior.error_message || 'Não foi possível salvar.', 3000, 'error');
            }
        });

        return false;
    }

    getControllerFirstValidator(formId) {
        if (!formId || !window.__iluValidationForms) {
            return null;
        }

        const validator = window.__iluValidationForms[formId];
        if (!validator || typeof validator.validateAll !== 'function') {
            return null;
        }

        return validator;
    }

    /**
     * Nomes dos campos reprovados. A versao anterior so olhava o <label> dentro
     * de um wrapper conhecido e, nao achando NENHUM, dizia "Preencha os campos
     * em destaque" — pedindo uma acao impossivel quando o campo reprovado esta
     * escondido, desabilitado ou fora do wrapper esperado (nao ha destaque para
     * o usuario ver). Agora ha degraus de fallback ate o `name` do input, que
     * sempre existe: a mensagem pode ficar tecnica, mas nunca vazia.
     */
    coletarCamposInvalidos() {
        const form = this.engine && this.engine.form;
        if (!form) return { nomes: [], escondidos: [] };

        const nomes = [];
        const escondidos = [];
        const marcados = form.querySelectorAll('.ilu-field-error');

        marcados.forEach((el) => {
            const wrapper = el.closest('.form-group, .ilu-form-compact__field, [class*="col-"], .field-wrapper, .crm-autocomplete-wrapper');
            const campo = (el.matches && el.matches('input, select, textarea'))
                ? el
                : (wrapper ? wrapper.querySelector('input, select, textarea') : null);

            let texto = '';
            const label = wrapper && wrapper.querySelector('label, .ilu-form-compact__label');
            if (label) texto = label.textContent.replace(/\s*\*+$/, '').trim();
            if (!texto && campo) {
                texto = campo.getAttribute('aria-label')
                    || campo.getAttribute('placeholder')
                    || campo.getAttribute('name')
                    || '';
            }
            if (!texto) texto = el.getAttribute('name') || el.id || '';
            if (!texto) return;

            if (nomes.indexOf(texto) === -1) nomes.push(texto);

            // Reprovado E invisivel: o usuario nao tem como corrigir. Vale dizer
            // isso em voz alta, porque e defeito de regra, nao do preenchimento.
            const alvo = wrapper || campo || el;
            const invisivel = !alvo.offsetParent
                || (campo && campo.disabled)
                || (alvo.getBoundingClientRect && alvo.getBoundingClientRect().height === 0);
            if (invisivel && escondidos.indexOf(texto) === -1) escondidos.push(texto);
        });

        return { nomes, escondidos };
    }

    showValidationMessage() {
        const messageField = document.getElementById('msg_empty');
        const customMessage = messageField && messageField.value;

        if (this.engine && typeof this.engine.showMessage === 'function') {
            if (customMessage) {
                this.engine.showMessage('error', customMessage);
                return;
            }

            const { nomes, escondidos } = this.coletarCamposInvalidos();

            if (nomes.length) {
                this.engine.showMessage('error', 'Campos obrigatórios não preenchidos: ' + nomes.join(', '));
            } else {
                // Nem o name existia: sobra o generico, mas com o rastro no console.
                this.engine.showMessage('error', 'Preencha os campos em destaque');
            }

            if (escondidos.length && window.console) {
                console.warn('[FormRule] Validação reprovou campo(s) que o usuário não vê: '
                    + escondidos.join(', ')
                    + '. Isso e defeito de regra (required em campo escondido/desabilitado), '
                    + 'nao falta de preenchimento.');
            }
            return;
        }

        this.showLegacyMessage(customMessage || 'Preencha os campos em destaque', 3000, 'error');
    }

    scrollFirstValidationError(form) {
        const firstError = form.querySelector('.ilu-field-error');
        if (!firstError) {
            return;
        }

        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof firstError.focus === 'function') {
            firstError.focus();
        }
    }

    buildSubmitData(form, appendData, serializeExtra) {
        // Forms com upload (file input ou enctype multipart) precisam de FormData:
        // $(form).serialize() ignora <input type=file>. Mantém string p/ o resto.
        const enctype = (form.getAttribute('enctype') || '').toLowerCase();
        const hasFile = !!form.querySelector('input[type="file"]');
        if (hasFile || enctype.indexOf('multipart/form-data') !== -1) {
            const fd = new FormData(form);
            Object.entries(appendData || {}).forEach(([key, value]) => {
                fd.append(key, value);
            });
            return fd;
        }

        let data = $(form).serialize();

        // `serialize_extra`: elementos FORA do <form> que fazem parte do envio.
        // No cotador a tabela de itens incluídos é um componente irmão do form,
        // então serialize() não a enxerga e a cotação ia sem os itens.
        (Array.isArray(serializeExtra) ? serializeExtra : []).forEach(seletor => {
            const extra = $(seletor).find(':input').serialize();
            if (extra) data += (data ? '&' : '') + extra;
        });

        Object.entries(appendData || {}).forEach(([key, value]) => {
            data += (data ? '&' : '') + encodeURIComponent(key) + '=' + encodeURIComponent(value);
        });

        return data;
    }

    handleSubmitSuccess(response, behavior) {
        if (response && response.erro) {
            this.showLegacyMessage(response.erro, 3000, 'error');
            return;
        }

        if (response && response.success === false) {
            this.showLegacyMessage(response.message || 'Não foi possível salvar.', 3000, 'error');
            return;
        }

        // `sucesso` aparece nos dois papéis neste codebase: texto da mensagem em
        // uns endpoints, booleano de status em outros (Lead/daoGerarOrcamento).
        // Sem distinguir, o toast exibia literalmente "true".
        if (response && response.sucesso === false) {
            this.showLegacyMessage(response.mensagem || behavior.error_message || 'Não foi possível salvar.', 3000, 'error');
            return;
        }

        const successMessage = (response && typeof response.sucesso === 'string' && response.sucesso)
            || (response && response.message)
            || (response && response.sucesso === true ? behavior.success_message : '');
        if (successMessage) {
            this.showLegacyMessage(successMessage, 2500, 'ok');
        }

        if (behavior.success_callback && typeof window[behavior.success_callback] === 'function') {
            window[behavior.success_callback](response, behavior, this.engine.form);
        }

        // Ações declarativas no sucesso (mesmo vocabulário do fetch_when):
        // set_value, clear, call com argumentos, show_message, conditional…
        if (behavior.success_actions) {
            this.engine.runActions(behavior.success_actions, { response });
        }

        if (behavior.success_drawer) {
            this.abrirDrawerAposSucesso(behavior.success_drawer, response);
        }

        const targetRoute = behavior.success_redirect || '';
        const returnQuery = behavior.return_query || '';

        if (targetRoute) {
            if (typeof window.openLink === 'function' && $('#conteudo').length) {
                window.openLink((window.syspath || '') + targetRoute, returnQuery);
            } else {
                window.location.href = (window.syspath || '') + targetRoute + (returnQuery ? '&' + returnQuery : '');
            }
        }

        if (behavior.success_refresh && (!response || response.refresh !== false)) {
            const refreshConfig = JSON.parse(JSON.stringify(behavior.success_refresh));
            const highlightCod = response && (response.cod || response.Codigo || response.id || '');
            if (highlightCod && refreshConfig.data && !refreshConfig.data.__highlight) {
                refreshConfig.data.__highlight = String(highlightCod);
            }
            this.refreshMutationTarget(refreshConfig, null, document);
        }

        if (behavior.close_drawer && (!response || response.close !== false) && typeof DrawerService !== 'undefined' && typeof DrawerService.closeTop === 'function') {
            DrawerService.closeTop();
            document.dispatchEvent(new CustomEvent('crm:drawer:saved', { detail: { behavior: behavior, response: response } }));
        }
    }

    /**
     * Abre um drawer com o registro recém-criado ("cadastrou → já abre para
     * editar"). É o equivalente moderno do sendForm(...,'daoInsert','edit',...)
     * do legado, e vinha sendo reescrito à mão em cada módulo — no contrato era
     * uma função própria, com um setTimeout de 80ms para contornar a corrida com
     * o fechamento do drawer atual. Aqui a espera é pelo EVENTO de fechamento,
     * não por um palpite de tempo.
     *
     * Config (dentro de ajax_submit):
     *   'success_drawer' => [
     *       'title'  => 'Editar Contrato',
     *       'route'  => 'Contrato/edit',
     *       'params' => 'cod={cod}&drawer=1',   // {x} = campo da RESPOSTA
     *       'width'  => 'full',
     *       'close_current' => 'nivel2',        // fecha o de cima antes
     *       'require' => 'cod',                 // sem isso na resposta, não abre
     *   ]
     */
    abrirDrawerAposSucesso(config, response) {
        if (!config || !config.route) return;

        const dado = (chave) => {
            if (!response) return '';
            // Aceita as varias grafias que os daoInsert deste sistema devolvem.
            if (chave === 'cod') {
                return response.cod || response.Codigo || response.codigo || response.id || '';
            }
            return response[chave] !== undefined && response[chave] !== null ? response[chave] : '';
        };

        if (config.require && !dado(config.require)) return;

        const resolver = (texto) => String(texto || '').replace(/\{(\w+)\}/g, (todo, chave) => {
            return encodeURIComponent(dado(chave));
        });

        const abrir = () => {
            if (typeof window.openDrawerFromFactory !== 'function') return;
            window.openDrawerFromFactory({
                title: config.title || '',
                route: config.route,
                params: resolver(config.params || ''),
                width: config.width || undefined,
                fullWidth: config.full_width === true || config.width === 'full',
            });
        };

        if (!config.close_current) { abrir(); return; }

        // Espera o fechamento REAL do drawer atual. O módulo do contrato usava
        // setTimeout(80): funciona até a máquina estar lenta ou a animação mudar,
        // e aí o novo drawer abre por baixo do que está saindo.
        let aberto = false;
        const aoFechar = () => {
            if (aberto) return;
            aberto = true;
            document.removeEventListener('crm:drawer:closed', aoFechar);
            abrir();
        };
        document.addEventListener('crm:drawer:closed', aoFechar);
        // Rede: se o evento não vier (drawer já fechado, por exemplo), abre assim mesmo.
        window.setTimeout(aoFechar, 400);

        if (typeof DrawerService !== 'undefined' && typeof DrawerService.closeTop === 'function') {
            DrawerService.closeTop();
        }
    }

    bindAjaxMutations(element, behavior) {
        if (element.dataset.behaviorAjaxMutationsBound === 'true') return;

        const scope = element.closest('.drawer-form-container') || document;
        const mutations = Array.isArray(behavior.mutations) ? behavior.mutations : [];

        mutations.forEach(mutation => {
            if (!mutation || !mutation.trigger) return;

            scope.addEventListener('click', event => {
                const trigger = event.target.closest(mutation.trigger);
                if (!trigger || !scope.contains(trigger)) return;

                event.preventDefault();
                this.runAjaxMutation(mutation, trigger, scope);
            });
        });

        element.dataset.behaviorAjaxMutationsBound = 'true';
    }

    runAjaxMutation(mutation, trigger, scope) {
        if (!this.validateMutation(mutation)) {
            return;
        }

        this.confirmMutation(mutation).then(confirmed => {
            if (!confirmed) {
                return;
            }

            $.ajax({
                type: mutation.method || 'POST',
                url: this.resolveRoute(mutation.route || ''),
                data: this.resolvePayload(mutation.payload || {}, trigger),
                dataType: mutation.data_type || 'json',
                beforeSend: function() {
                    if (mutation.loading !== false && typeof window.LoadingManager !== 'undefined') {
                        LoadingManager.show();
                    }
                },
                complete: function() {
                    if (mutation.loading !== false && typeof window.LoadingManager !== 'undefined') {
                        LoadingManager.hide();
                    }
                },
                success: response => {
                    if (response && response.erro) {
                        this.showLegacyMessage(response.erro, 3000, 'error');
                        return;
                    }

                    if (response && response.success === false) {
                        this.showLegacyMessage(response.message || 'Não foi possível executar a operação.', 3000, 'error');
                        return;
                    }

                    const successMessage = response && (response.sucesso || response.message);
                    if (successMessage) {
                        this.showLegacyMessage(successMessage, 3000, 'ok');
                    }

                    this.clearFields(mutation.clear);
                    this.refreshMutationTarget(mutation.success_refresh, trigger, scope);
                },
                error: xhr => {
                    if (window.console && typeof console.error === 'function') {
                        console.error('[FormRuleBehavior] Falha na mutação AJAX', xhr);
                    }
                    this.showLegacyMessage(mutation.error_message || 'Não foi possível executar a operação.', 3000, 'error');
                }
            });
        });
    }

    confirmMutation(mutation) {
        if (!mutation.confirm) {
            return Promise.resolve(true);
        }

        if (window.Swal && typeof window.Swal.fire === 'function') {
            return window.Swal.fire({
                icon: mutation.confirm_icon || 'warning',
                title: mutation.confirm_title || 'Confirmar operação',
                text: mutation.confirm,
                showCancelButton: true,
                confirmButtonText: mutation.confirm_button || 'Confirmar',
                cancelButtonText: mutation.cancel_button || 'Cancelar',
                confirmButtonColor: mutation.confirm_button_color || '#dc3545'
            }).then(result => !!result.isConfirmed);
        }

        return this.openInlineConfirm(mutation);
    }

    openInlineConfirm(mutation) {
        return new Promise(resolve => {
            const previous = document.querySelector('.form-rule-behavior-confirm');
            if (previous) {
                previous.remove();
            }

            const overlay = document.createElement('div');
            overlay.className = 'form-rule-behavior-confirm';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(17,24,39,.45);display:flex;align-items:center;justify-content:center;padding:16px;';

            const dialog = document.createElement('div');
            dialog.style.cssText = 'width:100%;max-width:380px;background:#fff;border-radius:8px;box-shadow:0 18px 45px rgba(15,23,42,.22);font-family:inherit;color:#1f2937;overflow:hidden;';

            const body = document.createElement('div');
            body.style.cssText = 'padding:20px 22px 16px;';

            const title = document.createElement('div');
            title.textContent = mutation.confirm_title || 'Confirmar operação';
            title.style.cssText = 'font-size:16px;font-weight:600;margin-bottom:8px;';

            const text = document.createElement('div');
            text.textContent = mutation.confirm;
            text.style.cssText = 'font-size:14px;line-height:1.4;color:#4b5563;';

            const footer = document.createElement('div');
            footer.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;padding:12px 22px 18px;';

            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.textContent = mutation.cancel_button || 'Cancelar';
            cancelButton.style.cssText = 'border:1px solid #d1d5db;background:#fff;color:#374151;border-radius:4px;padding:7px 12px;font-size:13px;cursor:pointer;';

            const confirmButton = document.createElement('button');
            confirmButton.type = 'button';
            confirmButton.textContent = mutation.confirm_button || 'Confirmar';
            confirmButton.style.cssText = 'border:1px solid #dc3545;background:#dc3545;color:#fff;border-radius:4px;padding:7px 12px;font-size:13px;cursor:pointer;';

            const close = confirmed => {
                document.removeEventListener('keydown', onKeydown);
                overlay.remove();
                resolve(confirmed);
            };

            const onKeydown = event => {
                if (event.key === 'Escape') {
                    close(false);
                }
            };

            overlay.addEventListener('click', event => {
                if (event.target === overlay) {
                    close(false);
                }
            });
            cancelButton.addEventListener('click', () => close(false));
            confirmButton.addEventListener('click', () => close(true));
            document.addEventListener('keydown', onKeydown);

            body.appendChild(title);
            body.appendChild(text);
            footer.appendChild(cancelButton);
            footer.appendChild(confirmButton);
            dialog.appendChild(body);
            dialog.appendChild(footer);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            cancelButton.focus();
        });
    }

    validateMutation(mutation) {
        const required = Array.isArray(mutation.required) ? mutation.required : [];

        for (const rule of required) {
            if (!rule || !rule.field) continue;
            if (!this.getSelectorValue(rule.field)) {
                this.showLegacyMessage(rule.message || 'Preencha os campos obrigatórios.', 3000, 'error');
                return false;
            }
        }

        return true;
    }

    /**
     * F4.4 — aceita a forma NOVA `{node: 'table:Conta'}` ao lado da antiga
     * `{target, route, data}`. As duas convivem de proposito: 252 arquivos usam
     * a antiga, e depreciar seria pedir para editar todos.
     *
     * F4.8 — a degradacao vive dentro do pedirNode: se o no nao existir na
     * arvore desta execucao (deploy mudou a estrutura, filtro removeu a regiao,
     * permissao esconde o pedaco), ele chama de volta o caminho antigo. A tela
     * NUNCA fica sem atualizar em silencio — modo de falha que este repo ja
     * pagou caro.
     */
    refreshMutationTarget(refreshConfig, trigger, scope) {
        if (refreshConfig && refreshConfig.node
            && window.IluEnvelope && typeof window.IluEnvelope.pedirNode === 'function') {
            const antigo = (refreshConfig.target || refreshConfig.route)
                ? () => this.refreshMutationTargetLegado(refreshConfig, trigger, scope)
                : null;

            // O MESMO `data` que o caminho legado postaria vai como estado de
            // tela (F4.5). Sem isso o re-render por no reproduziria a pagina de
            // quando a tela carregou e perderia o `__highlight` da linha mutada:
            // a grid voltaria para a primeira pagina e sem o glow, justamente nos
            // casos em que o caminho antigo acerta.
            if (window.IluEnvelope.pedirNode(refreshConfig.node, antigo, refreshConfig.data)) { return; }
        }

        return this.refreshMutationTargetLegado(refreshConfig, trigger, scope);
    }

    refreshMutationTargetLegado(refreshConfig, trigger, scope) {
        if (!refreshConfig || !refreshConfig.target || !refreshConfig.route) return;

        const payload = this.resolvePayload(refreshConfig.data || {}, trigger);
        const targetSelector = String(refreshConfig.target || '');
        const simpleIdTarget = targetSelector.charAt(0) === '#' && targetSelector.indexOf(' ', 1) === -1
            ? targetSelector.substring(1)
            : '';

        if (simpleIdTarget && typeof window.openLinkDiv === 'function') {
            window.openLinkDiv(
                this.resolveRoute(refreshConfig.route),
                $.param(payload),
                simpleIdTarget
            );
            return;
        }

        $.ajax({
            type: refreshConfig.method || 'GET',
            url: this.resolveRoute(refreshConfig.route),
            data: payload,
            success: html => {
                const target = scope.querySelector(refreshConfig.target) || document.querySelector(refreshConfig.target);
                if (target) {
                    target.innerHTML = html;
                }
            },
            error: xhr => {
                if (window.console && typeof console.error === 'function') {
                    console.error('[FormRuleBehavior] Falha ao atualizar alvo da mutação', xhr);
                }
                this.showLegacyMessage(refreshConfig.error_message || 'Não foi possível atualizar a lista.', 3000, 'error');
            }
        });
    }

    resolvePayload(payload, trigger) {
        const data = {};

        Object.entries(payload || {}).forEach(([key, value]) => {
            data[key] = this.resolvePayloadValue(value, trigger);
        });

        return data;
    }

    resolvePayloadValue(value, trigger) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            if (Object.prototype.hasOwnProperty.call(value, 'field')) {
                return this.getSelectorValue(value.field);
            }
            if (Object.prototype.hasOwnProperty.call(value, 'attr')) {
                return this.getTriggerAttribute(trigger, value.attr);
            }
            if (Object.prototype.hasOwnProperty.call(value, 'value')) {
                return value.value;
            }
        }

        return value;
    }

    getTriggerAttribute(trigger, attr) {
        if (!trigger || !attr) return '';
        if (trigger.dataset && Object.prototype.hasOwnProperty.call(trigger.dataset, attr)) {
            return trigger.dataset[attr];
        }
        return trigger.getAttribute('data-' + String(attr).replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())) || trigger.getAttribute(attr) || '';
    }

    clearFields(fields) {
        (Array.isArray(fields) ? fields : (fields ? [fields] : [])).forEach(field => {
            this.setSelectorValue(field, '');
        });
    }

    resolveRoute(route) {
        if (!route) return '';
        if (/^(https?:)?\/\//.test(route) || route.charAt(0) === '/') return route;
        return (window.syspath || '') + route;
    }

    getSelectorValue(selector) {
        if (!selector) return '';
        const field = this.findField(selector) || document.querySelector(selector);
        return field ? field.value : '';
    }

    setSelectorValue(selector, value) {
        if (!selector) return;
        const field = this.findField(selector) || document.querySelector(selector);
        if (!field) return;
        field.value = value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
    }

    showLegacyMessage(text, timeout, type) {
        if (typeof window.communicate === 'function') {
            window.communicate(text, type);
            return;
        }
        if (typeof window.message === 'function') {
            window.message(text, timeout, type);
            return;
        }

        if (type === 'error' && window.console && typeof console.error === 'function') {
            console.error(text);
        }
    }

    findField(name) {
        if (!name) return null;

        return this.engine.form.querySelector('[id="' + this.escapeAttr(name) + '"]')
            || this.engine.form.querySelector('[name="' + this.escapeAttr(name) + '"]');
    }

    escapeAttr(value) {
        return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }
};
