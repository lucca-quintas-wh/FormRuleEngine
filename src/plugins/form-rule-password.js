/**
 * Plugin: password
 *
 * Medidor de força + checklist de política de senha, declarado no PHP como:
 *
 *   ['type' => 'password', 'name' => 'Senha', 'password_policy' => [
 *       'source'        => 'Usuario/RegraPassword', // rota que devolve a política
 *       'confirm_field' => 'SenhaConf',             // opcional
 *       'meter'         => true,                    // opcional (default true)
 *       'block_submit'  => true,                    // opcional (default true)
 *   ]]
 *
 * Contrato esperado da rota `source` (JSON):
 *   minLength, maxLength, numbers, upperCase, especials  → limites numéricos
 *   aviso1..aviso4                                       → rótulo de cada critério
 *   aviso5                                               → rótulo do "senhas coincidem"
 *   regra                                                → texto de cabeçalho
 *
 * Substitui o par legado checkPassword()/loadPassFormat(), cujo JS inline
 * apontava para markup (#scorebar/#passRule*) que só existia na tela de
 * "Alterar Senha", nas telas de add/edit o handler rodava contra DOM inexistente.
 */
(function () {
    'use strict';

    var SPECIAL_CHARS = '_+-.,!@#$%^&*();|<>';

    // Cache de política por URL: várias instâncias (senha + confirmação, ou
    // add reaberto via AJAX) compartilham o mesmo fetch.
    var policyCache = {};

    function fetchPolicy(url) {
        if (policyCache[url]) {
            return policyCache[url];
        }

        policyCache[url] = new Promise(function (resolve, reject) {
            jQuery.ajax({
                type: 'POST',
                url: (window.syspath || '') + url,
                dataType: 'json',
                success: resolve,
                error: reject
            });
        }).catch(function (xhr) {
            // Não deixa a promise rejeitada em cache: uma falha de rede não pode
            // desligar o checador para o resto da sessão.
            delete policyCache[url];
            throw xhr;
        });

        return policyCache[url];
    }

    function countMatches(value, regex) {
        var m = String(value).match(regex);
        return m ? m.length : 0;
    }

    function escapeHtml(str) {
        return String(str === null || str === undefined ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    class FormRulePasswordPlugin extends window.FormRulePlugin {
        constructor() {
            super('password');
        }

        extractDependencies() {
            // Não depende de condição do DSL: reage ao próprio input e ao confirm.
            return [];
        }

        apply(element, config) {
            if (!element || !config) {
                return;
            }

            var input = this.findInput(element);
            if (!input) {
                return;
            }

            // Idempotência: conteúdo é reinjetado por AJAX e os scripts inline
            // re-executam a cada render parcial.
            if (element.dataset.passwordPolicyInitialized === 'true') {
                return;
            }
            element.dataset.passwordPolicyInitialized = 'true';

            var source = config.source || config.url;
            if (!source) {
                return;
            }

            var panel = this.buildPanel(element, config);
            var self = this;

            fetchPolicy(source).then(function (policy) {
                self.bind(element, input, panel, policy || {}, config);
            }).catch(function () {
                // Sem política não há o que checar: some com o painel em vez de
                // deixar um bloco isEmpty na tela.
                if (panel && panel.parentNode) {
                    panel.parentNode.removeChild(panel);
                }
                element.dataset.passwordPolicyInitialized = 'false';
            });
        }

        /**
         * Onde o painel é inserido. O wrapper do campo pode ser estreito (col-3),
         * e herdar essa largura quebra o texto em uma palavra por linha. Por padrão
         * criamos um slot col-12 na MESMA grid da seção, logo após o campo, para o
         * painel ocupar a largura inteira da coluna. `panel_target` (seletor CSS)
         * sobrescreve isso quando a tela quiser posicionar em outro lugar.
         */
        resolvePanelHost(element, config) {
            if (config.panel_target) {
                var form = this.engine && this.engine.form ? this.engine.form : document;
                var explicit = form.querySelector(config.panel_target) || document.querySelector(config.panel_target);
                if (explicit) {
                    return explicit;
                }
            }

            var grid = element.closest(this.tema('grid'));
            if (grid) {
                var slot = document.createElement('div');
                slot.className = this.tema('passwordSlot');
                // No FIM da grid, não logo após o campo: um col-12 inserido no meio
                // quebra a linha e empurra os campos seguintes (Confirme a Senha,
                // Alterar no primeiro logon) para baixo do painel.
                grid.appendChild(slot);
                return slot;
            }

            // form-builder padrão (grid 12-col por row) ou contexto desconhecido:
            // cai para dentro do próprio wrapper, comportamento anterior.
            return element;
        }

        buildPanel(element, config) {
            var b = this.tema('passwordPanel');   // raiz BEM, configurável
            var panel = document.createElement('div');
            panel.className = b;
            panel.style.display = 'none';

            var meterHtml = '';
            if (config.meter !== false) {
                meterHtml =
                    '<div class="' + b + '__meter">' +
                      '<div class="' + b + '__bar" data-pw-bar></div>' +
                      '<span class="' + b + '__score" data-pw-score>0%</span>' +
                    '</div>';
            }

            panel.innerHTML =
                meterHtml +
                '<p class="' + b + '__headline" data-pw-headline></p>' +
                '<ul class="' + b + '__rules" data-pw-rules></ul>';

            this.resolvePanelHost(element, config).appendChild(panel);
            return panel;
        }

        /** Monta a lista de critérios a partir da política do servidor. */
        buildRules(policy, config) {
            var rules = [];
            var minLength = parseInt(policy.minLength, 10) || 0;
            var numbers = parseInt(policy.numbers, 10) || 0;
            var upperCase = parseInt(policy.upperCase, 10) || 0;
            var especials = parseInt(policy.especials, 10) || 0;

            if (minLength > 0) {
                rules.push({
                    label: policy.aviso1 || window.FormRuleEngine.t('senhaTamanhoMinimo', { n: minLength }),
                    test: function (v) { return v.length >= minLength; }
                });
            }
            if (numbers > 0) {
                rules.push({
                    label: policy.aviso2 || window.FormRuleEngine.t('senhaNumeros', { n: numbers }),
                    test: function (v) { return countMatches(v, /[0-9]/g) >= numbers; }
                });
            }
            if (upperCase > 0) {
                rules.push({
                    label: policy.aviso3 || window.FormRuleEngine.t('senhaMaiusculas', { n: upperCase }),
                    test: function (v) { return countMatches(v, /[A-Z]/g) >= upperCase; }
                });
            }
            if (especials > 0) {
                rules.push({
                    label: (policy.aviso4 || window.FormRuleEngine.t('senhaEspeciais', { n: especials })) + ' ' + SPECIAL_CHARS,
                    test: function (v) { return countMatches(v, /[_+\-.,!@#$%^&*();|<>]/g) >= especials; }
                });
            }
            if (config.confirm_field) {
                var confirmName = config.confirm_field;
                rules.push({
                    label: policy.aviso5 || window.FormRuleEngine.t('senhasCoincidem'),
                    test: function (v, form) {
                        var other = form.querySelector('[name="' + confirmName + '"]');
                        return !!other && other.value === v;
                    }
                });
            }

            return rules;
        }

        bind(element, input, panel, policy, config) {
            var self = this;
            var form = this.engine && this.engine.form ? this.engine.form : input.form;
            if (!form) {
                return;
            }

            var rules = this.buildRules(policy, config);
            var maxLength = parseInt(policy.maxLength, 10) || 0;
            if (maxLength > 0) {
                input.setAttribute('maxlength', String(maxLength));
            }

            var list = panel.querySelector('[data-pw-rules]');
            var b = this.tema('passwordPanel');
            list.innerHTML = rules.map(function (rule, i) {
                return '<li class="' + b + '__rule" data-pw-rule="' + i + '">' +
                           '<span class="' + b + '__icon" data-pw-icon></span>' +
                           '<span class="' + b + '__label">' + escapeHtml(rule.label) + '</span>' +
                       '</li>';
            }).join('');

            var headline = panel.querySelector('[data-pw-headline]');
            headline.textContent = policy.regra || '';

            var evaluate = function () {
                self.evaluate(input, panel, rules, form, config);
            };

            input.addEventListener('input', evaluate);
            if (config.confirm_field) {
                var confirmInput = form.querySelector('[name="' + config.confirm_field + '"]');
                if (confirmInput) {
                    confirmInput.addEventListener('input', evaluate);
                }
            }

            evaluate();
        }

        evaluate(input, panel, rules, form, config) {
            var value = input.value || '';

            // Campo isEmpty: esconde o painel e não bloqueia (obrigatoriedade é
            // responsabilidade do required/required_when, não deste plugin).
            if (value === '') {
                panel.style.display = 'none';
                this.setValidity(input, true, config);
                return;
            }

            panel.style.display = '';

            var passed = 0;
            rules.forEach(function (rule, i) {
                var ok = false;
                try {
                    ok = !!rule.test(value, form);
                } catch (e) {
                    ok = false;
                }
                if (ok) { passed++; }

                var li = panel.querySelector('[data-pw-rule="' + i + '"]');
                if (!li) { return; }
                li.classList.toggle('is-ok', ok);
                li.classList.toggle('is-error', !ok);
                var icon = li.querySelector('[data-pw-icon]');
                if (icon) { icon.textContent = ok ? '✔' : '✘'; }
            });

            var pct = rules.length ? Math.round((passed / rules.length) * 100) : 100;
            var bar = panel.querySelector('[data-pw-bar]');
            var score = panel.querySelector('[data-pw-score]');
            if (bar) {
                bar.style.width = pct + '%';
                bar.classList.toggle('is-weak', pct < 50);
                bar.classList.toggle('is-medium', pct >= 50 && pct < 100);
                bar.classList.toggle('is-strong', pct === 100);
            }
            if (score) { score.textContent = pct + '%'; }

            this.setValidity(input, passed === rules.length, config);
        }

        setValidity(input, valid, config) {
            // 'data-erro' é a convenção que o guard de submit legado já lê.
            input.setAttribute('data-erro', valid ? 'false' : 'true');
            input.classList.toggle(this.temaClasses('passwordError')[0], !valid);

            if (config.block_submit === false) {
                input.setAttribute('data-erro', 'false');
                input.classList.remove(...this.temaClasses('passwordError'));
            }
        }
    }

    // Guarda `||` como nos demais plugins: a classe vive dentro da IIFE, entao
    // reinjetar nao estoura, mas SUBSTITUIRIA a classe publicada, e instancia
    // antiga deixa de passar em `instanceof` sem que nada acuse. (O policyCache
    // do fechamento novo tambem nasceria isEmpty, refazendo o fetch da politica.)
    window.FormRulePasswordPlugin = window.FormRulePasswordPlugin || FormRulePasswordPlugin;
})();
