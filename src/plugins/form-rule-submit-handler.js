/**
 * Plugin: submit_handler
 * Intercepta submit do formulário para execução customizada via AJAX.
 *
 * Uso no PHP:
 *   'submit_handler' => [
 *       'url' => 'Conta/daoGerandoOportunidade',
 *       'method' => 'POST',
 *       'confirm' => [
 *           'type' => 'swal',
 *           'title' => 'Op. Gerada {response.sucesso}',
 *           'text' => 'Deseja abrir a Oportunidade?',
 *           'icon' => 'success',
 *           'show_cancel' => true,
 *           'confirm_text' => 'Abrir Oportunidade',
 *           'cancel_text' => 'Permanecer Aqui',
 *       ],
 *       'on_success' => [
 *           ['action' => 'message', 'text' => 'Oportunidade gerada!', 'duration' => 2500],
 *           ['action' => 'close_drawer'],
 *           ['action' => 'open_modal', 'route' => 'Oportunidade/edit', 'params' => 'cod={response.codigoOportunidade}'],
 *       ],
 *       'on_fail' => [
 *           ['action' => 'message', 'text' => 'Erro ao gerar oportunidade', 'type' => 'error'],
 *       ],
 *   ]
 *
 * Quando declarado no form (não em campo), intercepta o submit do formulário.
 */
window.FormRuleSubmitHandlerPlugin = window.FormRuleSubmitHandlerPlugin || class FormRuleSubmitHandlerPlugin extends window.FormRulePlugin {
    constructor() {
        super('submit-handler');
        this.handlers = new Map(); // formName => config
    }

    extractDependencies(rules) {
        return [];
    }

    apply(element, rules) {
        const form = this.engine.form;
        const formName = form.getAttribute('name') || form.id;
        if (!formName) return;

        // Só aplica uma vez por formulário
        if (this.handlers.has(formName)) return;
        this.handlers.set(formName, rules);

        // Intercepta submit do formulário
        const originalSubmit = form.onsubmit;
        form.onsubmit = (e) => {
            e.preventDefault();
            this.handleSubmit(form, rules);
            return false;
        };

        // Também intercepta cliques em botões de submit
        form.querySelectorAll('button[type="submit"], input[type="submit"]').forEach(btn => {
            $(btn).off('.submithandler');
            $(btn).on('click.submithandler', (e) => {
                e.preventDefault();
                this.handleSubmit(form, rules);
                return false;
            });
        });
    }

    handleSubmit(form, rules) {
        const formName = form.getAttribute('name') || form.id;

        const validator = formName && window.__iluValidationForms ? window.__iluValidationForms[formName] : null;
        if (validator && typeof validator.validateAll === 'function' && !validator.validateAll()) {
            return;
        }
        if (typeof window.validate === 'function' && formName && !window.validate(formName)) {
            return;
        }

        const formData = $(form).serialize();

        if (rules.loading && window.LoadingManager) {
            LoadingManager.show();
        }

        let url = rules.url || '';
        if (url && !url.match(/^https?:\/\//) && !url.startsWith('/')) {
            url = (window.syspath || '') + url;
        }

        $.ajax({
            type: rules.method || 'POST',
            url: url,
            dataType: rules.data_type || 'json',
            data: formData,
        }).done(response => {
            if (rules.loading && window.LoadingManager) {
                LoadingManager.hide();
            }

            if (response && (response.erro || response.error)) {
                this.executeActions(rules.on_fail, response);
                return;
            }

            if (rules.confirm) {
                this.showConfirm(rules.confirm, response, rules.on_success);
            } else {
                this.executeActions(rules.on_success, response);
            }
        }).fail((xhr, status, error) => {
            if (rules.loading && window.LoadingManager) {
                LoadingManager.hide();
            }
            this.executeActions(rules.on_fail, { error: error });
        });
    }

    showConfirm(config, response, onSuccess) {
        const title = this.resolveTemplate(config.title || '', response);
        const text = this.resolveTemplate(config.text || '', response);

        // Quem desenha o diálogo é o host: SweetAlert2 se houver, confirm nativo
        // se não, ou o que você injetar em FormRuleEngine.host.confirm.
        window.FormRuleEngine.host.confirm({
            title: title,
            text: text,
            icon: config.icon || 'success',
            showCancel: config.show_cancel !== false,
            confirmText: config.confirm_text || window.FormRuleEngine.t('confirmar'),
            cancelText: config.cancel_text || window.FormRuleEngine.t('cancelar'),
        }).then(confirmado => {
            if (confirmado) {
                this.executeActions(onSuccess, response);
            } else if (config.on_cancel) {
                this.executeActions(config.on_cancel, response);
            }
        });
    }

    executeActions(actions, response) {
        if (!actions || !Array.isArray(actions)) return;

        actions.forEach(action => {
            if (!action || !action.action) return;

            switch (action.action) {
                case 'message':
                    const msgText = this.resolveTemplate(action.text || '', response);
                    if (typeof message === 'function') {
                        message(msgText, action.duration || 3000, action.type || 'ok');
                    }
                    break;

                case 'close_drawer':
                    window.FormRuleEngine.host.closePanel();
                    break;

                case 'close_dialog':
                    if (action.target && typeof closeDialog === 'function') {
                        closeDialog(action.target);
                    }
                    break;

                case 'open_modal':
                    const modalRoute = this.resolveTemplate(action.route || '', response);
                    const modalParams = this.resolveTemplate(action.params || '', response);
                    if (typeof window.openModalFromFactory === 'function') {
                        window.openModalFromFactory({
                            title: action.title || '',
                            route: modalRoute,
                            params: modalParams,
                            target: action.target || 'nivel2',
                            size: action.size || 'md',
                        });
                    } else {
                        window.FormRuleEngine.host.loadInto(action.target || 'nivel2', modalRoute, modalParams);
                    }
                    break;

                case 'open_drawer':
                    const drawerRoute = this.resolveTemplate(action.route || '', response);
                    const drawerParams = this.resolveTemplate(action.params || '', response);
                    if (typeof window.openDrawerFromFactory === 'function') {
                        window.openDrawerFromFactory({
                            title: action.title || '',
                            route: drawerRoute,
                            params: drawerParams,
                            fullWidth: action.full_width === true,
                            width: action.width || '',
                        });
                    } else {
                        window.FormRuleEngine.host.openPanel({
                            title: action.title || '',
                            route: drawerRoute,
                            params: drawerParams,
                            fullWidth: action.full_width === true,
                            width: action.width || '',
                        });
                    }
                    break;

                case 'trigger_click':
                    const selector = this.resolveTemplate(action.selector || '', response);
                    const delay = parseInt(action.delay, 10) || 0;
                    const trigger = () => {
                        const $el = selector ? $(selector) : [];
                        if ($el.length) {
                            $el.trigger('click');
                        }
                    };
                    if (delay > 0) {
                        setTimeout(trigger, delay);
                    } else {
                        trigger();
                    }
                    break;

                case 'redirect':
                    const redirectUrl = this.resolveTemplate(action.url || '', response);
                    window.location.href = redirectUrl;
                    break;

                case 'reload':
                    window.location.reload();
                    break;

                case 'set_value':
                    const val = this.resolveTemplate(String(action.value || ''), response);
                    this.engine.setFieldValue(action.field, val);
                    break;

                case 'refresh':
                    this.engine.refresh();
                    break;

                case 'call':
                    if (typeof window[action.function] === 'function') {
                        window[action.function](response);
                    }
                    break;
            }
        });
    }

    resolveTemplate(template, response) {
        if (typeof template !== 'string') return template;
        return template.replace(/\{([^{}]+)\}/g, (_, token) => {
            if (token.startsWith('response.')) {
                const path = token.substring(9);
                let value = response;
                path.split('.').forEach(key => {
                    if (value !== undefined && value !== null) value = value[key];
                });
                return value !== undefined && value !== null ? value : '';
            }
            return this.engine.getFieldValue(token) || '';
        });
    }
};
