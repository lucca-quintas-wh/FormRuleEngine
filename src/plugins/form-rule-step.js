/**
 * Plugin: step, Wizard com steps
 * Gerencia navegacao entre steps, validacao, skip rules.
 * Reutilizavel em qualquer form que usar 'step' => N nas sections.
 */
window.FormRuleStepPlugin = window.FormRuleStepPlugin || class FormRuleStepPlugin extends window.FormRulePlugin {
    constructor() {
        super('step');
        this.currentStep = 1;
        this.totalSteps = 0;
        this.skipRules = [];
        this.stepEls = [];
        this.labels = [];
        this.icons = [];
        this.submitOnclick = '';
        this.submitLabel = window.FormRuleEngine.t('salvar');
        this.navTarget = '';
        this.autoAdvance = false;
        this.showNav = true;
        this.showStepper = true;
        this.showSubmit = true;
        this.formName = '';
    }

    extractDependencies(rules) {
        return this.extractFieldNames(rules);
    }

    apply(element, rules) {
    }

    init(engine) {
        const form = engine.form;
        if (!form) return;

        const rulesEl = form.querySelector('[data-step-rules]');
        if (rulesEl) {
            try { this.skipRules = JSON.parse(rulesEl.value); } catch(e) {}
        }
        const configEl = form.querySelector('[data-step-config]');
        if (configEl) {
            try {
                const config = JSON.parse(configEl.value);
                this.autoAdvance = config.auto_advance === true;
                this.showNav = config.show_nav !== false;
                this.showStepper = config.show_stepper !== false;
                this.showSubmit = config.show_submit !== false;
                this.submitOnclick = config.submit_onclick || '';
                this.submitLabel = config.submit_label || window.FormRuleEngine.t('salvar');
                this.navTarget = config.nav_target || '';

                if (Array.isArray(config.steps)) {
                    this.labels = config.steps.map(step => typeof step === 'string' ? step : (step.label || ''));
                    this.icons = config.steps.map(step => typeof step === 'string' ? '' : (step.icon || ''));
                } else {
                    this.labels = Array.isArray(config.labels) ? config.labels : [];
                    this.icons = Array.isArray(config.icons) ? config.icons : [];
                }
            } catch(e) {}
        }

        this.stepEls = Array.from(form.querySelectorAll('[data-step]'));
        this.totalSteps = this.stepEls.reduce((max, el) => Math.max(max, parseInt(el.dataset.step) || 0), 0);
        if (this.totalSteps === 0) return;

        if (this.showStepper) {
            this.renderStepper(form);
        }
        this.renderProgress(form);
        if (this.showNav) {
            this.renderNav(form);
        }
        this.activateStep(this.firstVisibleStep());
        this.bindEvents(form);
    }

    isHidden(el) {
        return el.classList.contains('is-hidden') || 
               el.classList.contains('form-rule-hidden') ||
               el.style.display === 'none';
    }

    isRuleHidden(el) {
        return el.classList.contains('form-rule-hidden');
    }

    firstVisibleStep() {
        for (let i = 1; i <= this.totalSteps; i++) {
            const el = this.stepEls.find(e => parseInt(e.dataset.step) === i);
            if (el && !this.isRuleHidden(el)) return i;
        }
        return 1;
    }

    resolveChromeTarget(form) {
        return form.querySelector(this.tema('stepChrome')) || form;
    }

    renderProgress(form) {
        const bar = document.createElement('div');
        bar.className = 'step-progress-bar';
        bar.innerHTML = '<div class="step-progress-track"><div class="step-progress-fill"></div></div>';
        this.resolveChromeTarget(form).prepend(bar);
        this.progressFill = bar.querySelector('.step-progress-fill');
    }

    renderStepper(form) {
        const stepper = document.createElement('div');
        stepper.className = 'step-stepper';
        stepper.setAttribute('role', 'tablist');

        for (let i = 1; i <= this.totalSteps; i++) {
            const label = this.labels[i - 1] || window.FormRuleEngine.t('etapa', { n: i });
            const icon = this.icons[i - 1] || '';
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'step-stepper-item';
            item.dataset.stepIndex = String(i);
            item.setAttribute('role', 'tab');
            const circle = document.createElement('span');
            circle.className = 'step-stepper-circle';
            if (icon) {
                const iconEl = document.createElement('span');
                iconEl.className = 'step-stepper-icon';
                iconEl.textContent = icon;
                circle.appendChild(iconEl);
            } else {
                circle.textContent = String(i);
            }
            const labelEl = document.createElement('span');
            labelEl.className = 'step-stepper-label';
            labelEl.textContent = label;
            item.appendChild(circle);
            item.appendChild(labelEl);
            item.addEventListener('click', () => this.goTo(i));
            stepper.appendChild(item);
        }

        this.resolveChromeTarget(form).prepend(stepper);
        this.stepper = stepper;
    }

    renderNav(form) {
        // Bring-your-own-nav: se a página já declara controles de step (ex.: os
        // botões nativos do footer do drawer, marcados com data-step-prev/next/
        // submit), o plugin os ADOTA em vez de criar a própria barra .step-nav.
        // Isso deixa a navegação do wizard morar no footer sem caixa flutuante.
        if (this.adoptExistingNav(form)) {
            return;
        }

        const nav = document.createElement('div');
        nav.className = 'step-nav';
        nav.innerHTML = `
            <button type="button" class="btn btn-v5-secondary step-prev">${window.FormRuleEngine.t('anterior')}</button>
            <span class="step-nav-info"></span>
            <button type="button" class="btn btn-v5-primary step-next">${window.FormRuleEngine.t('proximo')}</button>
            <button type="button" class="btn btn-v5-primary step-submit">${window.FormRuleEngine.t('salvar')}</button>
        `;
        const target = this.resolveNavTarget(form);
        target.appendChild(nav);
        this.navPrev = nav.querySelector('.step-prev');
        this.navNext = nav.querySelector('.step-next');
        this.navSubmit = nav.querySelector('.step-submit');
        this.navInfo = nav.querySelector('.step-nav-info');
        if (this.navSubmit) {
            this.navSubmit.textContent = this.submitLabel;
        }
    }

    /**
     * Elementos que pertencem a UM passo, `data-step-only="2"` (aceita lista:
     * "2,3"). Generaliza o que os botões de nav já faziam: um controle que mora
     * FORA do form (footer do drawer) e só faz sentido em determinado passo.
     * O caso que originou: o botão "IA" lê um documento e preenche os campos de
     * dados pessoais; no passo do contrato ele não tem o que preencher.
     *
     * Re-consultado a cada activateStep porque o footer do drawer é injetado por
     * AJAX e pode nascer depois do init, o mesmo motivo que faz o resto do
     * módulo ser idempotente.
     */
    applyStepScopedVisibility() {
        const escopo = (el) => {
            const alvo = el.getAttribute('data-step-for');
            return !alvo || alvo === this.formName;
        };

        document.querySelectorAll('[data-step-only]').forEach(el => {
            if (!escopo(el)) return;
            const steps = String(el.getAttribute('data-step-only') || '')
                .split(',')
                .map(n => parseInt(n, 10))
                .filter(n => !isNaN(n));
            if (!steps.length) return;
            el.style.display = steps.indexOf(this.currentStep) !== -1 ? '' : 'none';
        });
    }

    adoptExistingNav(form) {
        const formName = form.getAttribute('name') || form.id || '';
        this.formName = formName;
        // Prefere controles marcados para ESTE form (data-step-for), senão os
        // globais. Assim conviverem dois wizards não embaralha a navegação.
        const pick = (base) => (formName && document.querySelector(`[data-${base}][data-step-for="${formName}"]`))
            || document.querySelector(`[data-${base}]`);
        const prev = pick('step-prev');
        const next = pick('step-next');
        const submit = pick('step-submit');
        if (!prev && !next && !submit) {
            return false;
        }
        this.navPrev = prev;
        this.navNext = next;
        this.navSubmit = submit;
        this.navInfo = pick('step-info');
        if (this.navSubmit && this.submitLabel) {
            this.navSubmit.textContent = this.submitLabel;
        }
        return true;
    }

    resolveNavTarget(form) {
        if (this.navTarget) {
            const explicit = document.querySelector(this.navTarget);
            if (explicit) return explicit;
        }

        const formName = form.getAttribute('name') || form.id;
        if (formName) {
            const external = document.querySelector(`[data-step-nav-target="${formName}"]`);
            if (external) return external;
        }

        return form;
    }

    bindEvents(form) {
        if (this.navPrev) {
            this.navPrev.addEventListener('click', () => this.prev());
        }
        if (this.navNext) {
            this.navNext.addEventListener('click', () => this.next());
        }
        if (this.navSubmit) {
            this.navSubmit.addEventListener('click', () => this.submit());
        }
        form.addEventListener('change', (e) => {
            const stepEl = e.target.closest('[data-step]');
            if (!stepEl) return;
            this.evaluateSkips();
            if (this.autoAdvance && e.target.dataset.stepManual !== 'true' && e.target.matches('select, input, textarea') && e.target.value !== '') {
                const selectedStep = parseInt(stepEl.dataset.step) || this.currentStep;
                if (selectedStep === this.currentStep && this.validateStep(stepEl)) {
                    this.next();
                }
            }
        });
        // Reage a mudancas de visible_when
        form.addEventListener('visibility:changed', (e) => {
            this.ensureValidStep();
        });
    }

    rebuildStepList() {
        this.stepEls = Array.from(this.engine?.form?.querySelectorAll('[data-step]') || []);
    }

    ensureValidStep() {
        const currentVisible = this.stepEls.find(e => parseInt(e.dataset.step) === this.currentStep);
        if (!currentVisible || this.isRuleHidden(currentVisible)) {
            this.activateStep(this.firstVisibleStep());
            return;
        }
        this.activateStep(this.currentStep);
    }

    activateStep(step) {
        this.rebuildStepList();
        this.currentStep = Math.max(1, Math.min(step, this.totalSteps));
        
        this.stepEls.forEach(el => {
            const s = parseInt(el.dataset.step);
            if (s === this.currentStep && !this.isRuleHidden(el)) {
                el.classList.remove('form-step-hidden');
                el.classList.toggle('form-step-current', s === this.currentStep);
                el.classList.toggle('form-step-complete', false);
                el.style.display = '';
            } else {
                el.classList.remove('form-step-current', 'form-step-complete');
                el.classList.add('form-step-hidden');
                el.style.display = 'none';
            }
        });

        if (this.navPrev) {
            this.navPrev.style.display = this.currentStep > this.firstVisibleStep() ? '' : 'none';
        }
        if (this.navNext) {
            this.navNext.style.display = this.currentStep >= this.lastVisibleStep() ? 'none' : '';
        }
        if (this.navSubmit) {
            this.navSubmit.style.display = (this.showSubmit && this.currentStep >= this.lastVisibleStep()) ? '' : 'none';
        }
        if (this.navInfo) {
            const label = this.labels[this.currentStep - 1] || window.FormRuleEngine.t('etapa', { n: this.currentStep });
            this.navInfo.textContent = window.FormRuleEngine.t('etapaDeTotal', { atual: this.currentStep, total: this.lastVisibleStep(), rotulo: label });
        }

        this.applyStepScopedVisibility();

        if (this.progressFill) {
            const first = this.firstVisibleStep();
            const last = this.lastVisibleStep();
            const total = Math.max(last - first, 1);
            const pct = ((this.currentStep - first) / total) * 100;
            this.progressFill.style.width = pct + '%';
        }

        this.updateStepper();
        this.engine?.form?.dispatchEvent(new CustomEvent('step:change', { detail: { step: this.currentStep } }));
    }

    updateStepper() {
        if (!this.stepper) return;

        Array.from(this.stepper.querySelectorAll('.step-stepper-item')).forEach(item => {
            const step = parseInt(item.dataset.stepIndex) || 0;
            const hidden = this.isStepHidden(step) || this.shouldSkip(step);
            item.classList.toggle('is-hidden', hidden);
            item.classList.toggle('is-active', step === this.currentStep);
            item.classList.toggle('is-complete', step < this.currentStep && !hidden);
            item.setAttribute('aria-selected', step === this.currentStep ? 'true' : 'false');
            item.disabled = hidden || step > this.currentStep;
        });
    }

    lastVisibleStep() {
        let last = 1;
        this.stepEls.forEach(el => {
            const s = parseInt(el.dataset.step);
            if (s > last && !this.isRuleHidden(el)) last = s;
        });
        return last;
    }

    next() {
        const currentEls = this.getStepElements(this.currentStep);
        for (const currentEl of currentEls) {
            if (!this.validateStep(currentEl)) return;
        }
        let nextStep = this.currentStep + 1;
        while (nextStep <= this.totalSteps && (this.shouldSkip(nextStep) || this.isStepHidden(nextStep))) nextStep++;
        if (nextStep > this.totalSteps) return;
        this.activateStep(nextStep);
    }

    goTo(step) {
        if (step === this.currentStep) return;
        if (step > this.currentStep) {
            let current = this.currentStep;
            while (current < step) {
                const currentEls = this.getStepElements(current);
                for (const currentEl of currentEls) {
                    if (!this.validateStep(currentEl)) return;
                }
                current++;
            }
        }
        if (this.shouldSkip(step) || this.isStepHidden(step)) return;
        this.activateStep(step);
    }

    prev() {
        let prevStep = this.currentStep - 1;
        while (prevStep > 0 && (this.shouldSkip(prevStep) || this.isStepHidden(prevStep))) prevStep--;
        if (prevStep < 1) return;
        this.activateStep(prevStep);
    }

    isStepHidden(step) {
        const els = this.getStepElements(step);
        return els.length === 0 || els.every(el => this.isRuleHidden(el));
    }

    getStepElements(step) {
        return this.stepEls.filter(e => parseInt(e.dataset.step) === step);
    }

    shouldSkip(step) {
        const form = this.engine?.form;
        if (!form) return false;
        return this.skipRules.some(rule => {
            if (rule.step !== step) return false;
            return Object.entries(rule.when).some(([fieldName, values]) => {
                const field = form.querySelector(`[name="${fieldName}"]`);
                return field && values.includes(field.value);
            });
        });
    }

    evaluateSkips() {
        if (this.isStepHidden(this.currentStep) || this.shouldSkip(this.currentStep)) {
            let nextStep = this.currentStep + 1;
            while (nextStep <= this.totalSteps && (this.shouldSkip(nextStep) || this.isStepHidden(nextStep))) nextStep++;
            this.activateStep(nextStep);
        }
    }

    validateStep(stepEl) {
        // Obrigatório por atributo [required] OU pela classe .required (convenção
        // deste app: SFieldAutoComplete/combos marcam a classe, não o atributo).
        const candidates = new Set([
            ...stepEl.querySelectorAll('[required]'),
            ...stepEl.querySelectorAll('input.required, select.required, textarea.required'),
        ]);
        let isValid = true;
        for (const field of candidates) {
            // Não valida campo oculto (seção fechada, dependente condicional off).
            if (field.offsetParent === null) continue;
            const valueEl = this.resolveValidationValueEl(field);
            if (!valueEl.value || valueEl.value === '') {
                this.setFieldError(field, window.FormRuleEngine.t('campoObrigatorio'));
                if (isValid) field.focus();
                isValid = false;
            } else {
                this.clearFieldError(field);
            }
        }
        if (!isValid && typeof message === 'function') {
            message(window.FormRuleEngine.t('camposDaEtapa'), 3000, 'error');
        }
        return isValid;
    }

    // Autocomplete: o valor SELECIONADO mora no hidden do tema (autocompleteValue)
    // validar o input de texto deixaria passar texto digitado sem escolher item.
    resolveValidationValueEl(field) {
        const wrap = field.closest(this.tema('autocompleteWrap'));
        if (wrap) {
            const hidden = wrap.querySelector(this.tema('autocompleteValue'));
            if (hidden) return hidden;
        }
        return field;
    }

    setFieldError(field, text) {
        field.setAttribute('aria-invalid', 'true');
        const wrapper = field.closest(this.tema('stepFieldWrapper')) || field.parentElement;
        if (!wrapper) return;

        wrapper.classList.add('form-step-field-error');
        let error = wrapper.querySelector('.form-step-error-msg');
        if (!error) {
            error = document.createElement('div');
            error.className = 'form-step-error-msg';
            wrapper.appendChild(error);
        }
        error.textContent = text;
    }

    clearFieldError(field) {
        field.removeAttribute('aria-invalid');
        const wrapper = field.closest(this.tema('stepFieldWrapper')) || field.parentElement;
        if (!wrapper) return;

        wrapper.classList.remove('form-step-field-error');
        const error = wrapper.querySelector('.form-step-error-msg');
        if (error) error.remove();
    }

    submit() {
        const currentEls = this.getStepElements(this.currentStep);
        for (const currentEl of currentEls) {
            if (!this.validateStep(currentEl)) return;
        }

        if (this.submitOnclick) {
            try {
                (new Function(this.submitOnclick)).call(this.navSubmit || this.engine.form);
            } catch (e) {
                console.error('[FormRuleStep] Erro ao executar submit_onclick:', e);
            }
            return;
        }

        const form = this.engine?.form;
        if (!form) return;
        if (typeof form.requestSubmit === 'function') {
            form.requestSubmit();
        } else {
            form.submit();
        }
    }
};
