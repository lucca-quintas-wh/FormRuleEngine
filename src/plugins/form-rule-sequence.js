/**
 * Plugin: sequence — liberação progressiva de campos (gating sequencial)
 *
 * Todos os campos ficam VISÍVEIS, mas só o próximo da fila fica habilitado:
 * cada um espera os anteriores aplicáveis estarem preenchidos. Ao mudar um passo,
 * os posteriores são limpos. É o padrão do cotador (Lead/gerarOrcamento), portado
 * do motor do indev em GerarOrcamentoLEAD.phtml:113-172.
 *
 * NÃO confundir com o plugin `step`, que é wizard por SEÇÕES — mostra uma seção
 * por vez com navegação e submit no fim. Aqui nada é escondido e a liberação é
 * campo a campo.
 *
 * Uso (PHP):
 *
 *   // no campo — a ordem da fila
 *   ['name' => 'ufIBGE', 'type' => 'combo', 'properties' => ['data-sequence' => '2']],
 *
 *   // campo que só participa da fila sob condição (senão é pulado)
 *   ['name' => 'profissao', 'properties' => ['data-sequence' => '4'],
 *    'sequence_when' => ['tipoPlano' => '1']],
 *
 *   // no form — hidden com a configuração
 *   '<input type="hidden" data-sequence-config=\'{"clear_downstream":true,
 *      "warn_on_empty":"Selecione uma opção!","always_enabled":["QtdVidas"],
 *      "active_when":{"geraOrcamentoBy":"C"}}\'>'
 *
 * Config aceita:
 *   clear_downstream (bool, default true) — limpa o valor dos passos posteriores
 *   warn_on_empty    (string)             — aviso ao esvaziar um passo
 *   always_enabled   (array de names)     — campos fora da fila, sempre liberados
 *   active_when      (condição)           — só aplica o gating quando verdadeira
 */
window.FormRuleSequencePlugin = window.FormRuleSequencePlugin || class FormRuleSequencePlugin extends window.FormRulePlugin {
    constructor() {
        super('sequence');
        this.config = {};
        this.limpando = false;
    }

    extractDependencies(rules) {
        return this.extractFieldNames(rules);
    }

    /**
     * Chamado quando muda uma dependência de `sequence_when` — a aplicabilidade
     * de um campo mudou, então a fila inteira precisa ser reavaliada.
     */
    apply() {
        this.reavaliar();
    }

    init(engine) {
        const form = engine && engine.form;
        if (!form) return;

        const cfgEl = form.querySelector('[data-sequence-config]');
        if (cfgEl) {
            try { this.config = JSON.parse(cfgEl.getAttribute('data-sequence-config')) || {}; }
            catch (e) { this.config = {}; }
        }

        this.form = form;

        // Escuta QUALQUER change do form, não só dos campos da fila: `active_when`
        // costuma depender de um campo de fora dela (no cotador, o "Orçar por"),
        // e sem isso escolher esse campo nunca reavaliava a fila.
        const aoMudar = (alvo, doUsuario) => {
            if (this.limpando) return;

            const naFila = alvo && alvo.getAttribute && alvo.hasAttribute('data-sequence');
            if (naFila && this.ativo()) {
                // Só avisa em ação do usuário. As cascatas repopulam combos e
                // avisam a mudança com valor vazio; sem esse filtro o alerta
                // pipocava a cada recarga de opção.
                if (doUsuario && this.vazio(alvo) && this.config.warn_on_empty) {
                    this.avisar(this.config.warn_on_empty);
                }
                if (this.config.clear_downstream !== false) {
                    this.limparPosteriores(alvo);
                }
            }
            // setTimeout: deixa os plugins visible/options do engine rodarem antes,
            // senão a aplicabilidade é lida de um DOM desatualizado.
            setTimeout(() => this.reavaliar(), 0);
        };

        // Delegação por jQuery, não addEventListener: o autocomplete e o Select2
        // emitem o change com $.trigger(), que NÃO aciona listener nativo. Ligar
        // no nativo fazia a Cidade (autocomplete) nunca liberar o passo seguinte.
        // O nativo entra só como reserva quando não há jQuery na página.
        // `originalEvent` só existe quando o evento veio do navegador; um
        // $.trigger('change') programático não o tem. É o que distingue "o usuário
        // escolheu" de "a cascata repopulou o combo".
        if (window.jQuery) {
            window.jQuery(form)
                .off('change.formRuleSequence')
                .on('change.formRuleSequence', function(event) {
                    aoMudar(event.target, !!event.originalEvent);
                });
        } else {
            form.addEventListener('change', (event) => aoMudar(event.target, event.isTrusted));
        }

        this.reavaliar();
    }

    // ── estado ──────────────────────────────────────────────────────────────

    ativo() {
        if (!this.config.active_when) return true;
        try { return this.evaluateCondition(this.config.active_when); }
        catch (e) { return true; }
    }

    passos() {
        if (!this.form) return [];
        return Array.from(this.form.querySelectorAll('[data-sequence]')).sort(
            (a, b) => this.ordem(a) - this.ordem(b)
        );
    }

    ordem(el) {
        return parseInt(el.getAttribute('data-sequence'), 10) || 0;
    }

    vazio(el) {
        const v = el.value;
        return v === '' || v === null || v === undefined;
    }

    /**
     * Um campo escondido (por visible_when) não participa da fila: fica travado,
     * mas não impede os seguintes de liberar. Mesma regra dos saltos do indev,
     * onde Profissão e Categoria são puladas conforme o tipo de plano.
     */
    aplicavel(el) {
        const wrap = el.closest('.ilu-form-compact__field') || el;
        if (wrap.offsetParent === null) return false;
        if (getComputedStyle(wrap).display === 'none') return false;

        // `data-sequence-when` tira o campo da fila SEM escondê-lo — é diferente
        // de visible_when. O caso é a Categoria do cotador: fora do Coletivo
        // Empresarial ela fica visível e travada, e a fila segue para o próximo
        // (indev, GerarOrcamentoLEAD.phtml:151 e 159).
        const cond = el.getAttribute('data-sequence-when');
        if (cond) {
            try {
                if (!this.evaluateCondition(JSON.parse(cond))) return false;
            } catch (e) { /* condição malformada não deve travar a fila */ }
        }
        return true;
    }

    // ── ações ───────────────────────────────────────────────────────────────

    habilitar(el, ligado) {
        const wrap = el.closest('.ilu-form-compact__field');
        const auto = el.closest('.crm-autocomplete-wrapper');
        if (auto && window.jQuery) {
            window.jQuery(auto)
                .find('.crm-autocomplete-text, .crm-autocomplete-clear')
                .prop('disabled', !ligado);
        }
        el.disabled = !ligado;
        if (wrap) {
            wrap.classList.toggle('form-rule-disabled', !ligado);
            wrap.classList.toggle('ilu-form-field--disabled', !ligado);
        }
    }

    limparCampo(el) {
        const auto = el.closest('.crm-autocomplete-wrapper');
        if (auto) {
            // Autocomplete guarda o rótulo num attr e o texto num input irmão;
            // limpar só o value deixaria o nome visível na tela.
            el.value = '';
            el.removeAttribute('label');
            const texto = auto.querySelector('.crm-autocomplete-text');
            if (texto) texto.value = '';
            return;
        }
        el.value = '';
        // Select2 desenha a partir do <select> nativo e não observa mudança de
        // propriedade — só o evento do jQuery faz repintar.
        if (window.jQuery && window.jQuery(el).data('select2')) {
            window.jQuery(el).trigger('change.select2');
        }
    }

    /**
     * Limpa o VALOR dos passos posteriores. Não dispara `change` neles — o indev
     * também não — para não disparar em cadeia as cascatas dos campos limpos.
     * A flag `limpando` evita reentrância pelo próprio listener.
     */
    limparPosteriores(el) {
        const base = this.ordem(el);
        if (!base) return;

        this.limpando = true;
        try {
            this.passos().forEach((campo) => {
                if (this.ordem(campo) <= base) return;
                if (this.vazio(campo)) return;
                // `data-sequence-keep` protege campo PREENCHIDO por outro passo, não
                // pelo usuário. No cotador é a Faixa Etária: o onChange da Data de
                // Nascimento a seleciona, e sem essa guarda a limpeza a jusante
                // apagava logo em seguida o valor que acabara de ser posto.
                if (campo.hasAttribute('data-sequence-keep')) return;
                this.limparCampo(campo);
            });
        } finally {
            this.limpando = false;
        }
    }

    reavaliar() {
        if (!this.form) return;

        const fila = this.passos();
        if (!fila.length) return;

        // Sem `active_when` a fila vale sempre. Com ele falso, NÃO liberamos tudo —
        // isso deixava a tela toda aberta enquanto o campo de controle estivesse
        // vazio; apenas não mexemos, porque os campos da fila pertencem a um bloco
        // que nesse caso está escondido de qualquer forma.
        if (!this.ativo()) return;

        let anterioresOk = true;
        fila.forEach((el, indice) => {
            // O primeiro da fila nunca depende de ninguém.
            if (indice === 0) {
                this.habilitar(el, true);
                if (this.vazio(el)) anterioresOk = false;
                return;
            }
            if (!this.aplicavel(el)) {
                this.habilitar(el, false);   // travado, mas não bloqueia a fila
                return;
            }
            this.habilitar(el, anterioresOk);
            if (this.vazio(el)) anterioresOk = false;
        });

        (this.config.always_enabled || []).forEach((nome) => {
            const el = this.form.querySelector('[name="' + nome + '"]');
            if (el) this.habilitar(el, true);
        });
    }

    avisar(mensagem) {
        if (window.Swal && typeof window.Swal.fire === 'function') {
            window.Swal.fire({ icon: 'warning', title: 'Oops...', text: mensagem });
        } else if (typeof window.communicate === 'function') {
            window.communicate(mensagem, 'warning');
        }
    }
};
