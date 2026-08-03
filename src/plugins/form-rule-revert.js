/**
 * Plugin: revert_when — recusa uma escolha e devolve o campo ao valor anterior.
 *
 * É a regra do tipo "já existe X aqui, exclua antes de trocar": diferente de
 * `prevent_submit_when` (que deixa escolher e barra no fim) e de `disabled_when`
 * (que impede escolher). Aqui a escolha é feita, avaliada e DESFEITA na hora,
 * com a mensagem explicando por quê — foi o que o cotador fazia à mão em
 * validaTipoPlano(), e o mesmo padrão existe em contrato e proposta.
 *
 * Uso (PHP):
 *
 *   'revert_when' => [[
 *       'condition'   => ['AND' => [
 *           ['tipoPlanoDefinido' => ['!=' => '']],
 *           ['tipoPlano' => ['neq_field' => 'tipoPlanoDefinido']],
 *           ['__itens_incluidos' => ['>' => 0]],
 *       ]],
 *       'message_map' => ['1' => 'Já existe um Plano Coletivo Empresarial cotado…'],
 *       'restore_from'=> 'tipoPlanoDefinido',   // ou omita: volta ao valor anterior
 *       'remember_in' => 'tipoPlanoDefinido',   // quando NÃO reverte, grava a escolha
 *   ]]
 */
window.FormRuleRevertPlugin = window.FormRuleRevertPlugin || class FormRuleRevertPlugin extends window.FormRulePlugin {
    constructor() {
        super('revert');
        this.anteriores = new WeakMap();
    }

    extractDependencies(rules) {
        // A regra não é reavaliada por mudança de terceiros: ela julga o ato de
        // escolher ESTE campo. Declarar dependência aqui faria a reavaliação
        // reverter um valor que ninguém acabou de mexer.
        return [];
    }

    apply(element, rules) {
        const input = this.findInput(element);
        if (!input) return;

        this.anteriores.set(input, input.value);
        if (input.dataset.revertBound === 'true') return;
        input.dataset.revertBound = 'true';

        const configs = Array.isArray(rules) ? rules : [rules];

        $(input).on('change.revertwhen', (event) => {
            // Só julga ação do usuário. Repopular um combo por cascata dispara
            // change com valor vazio, e reverter aí seria brigar com a cascata.
            if (!event.originalEvent) {
                this.anteriores.set(input, input.value);
                return;
            }
            this.avaliar(input, configs);
        });
    }

    avaliar(input, configs) {
        const anterior = this.anteriores.get(input);
        const escolhido = input.value;

        for (const regra of configs) {
            if (!regra || !regra.condition) continue;
            if (!this.evaluateCondition(regra.condition)) continue;

            const mensagem = (regra.message_map && regra.message_map[escolhido]) || regra.message || '';
            if (mensagem) this.engine.showMessage(regra.type || 'error', mensagem);

            const destino = regra.restore_from
                ? this.engine.getFieldValue(regra.restore_from)
                : anterior;

            // Sem disparar change: a reversão não é uma escolha, e cascatear a
            // partir dela repopularia combos com o valor que o usuário recusou.
            input.value = destino === null || destino === undefined ? '' : destino;
            if (window.jQuery && window.jQuery(input).data('select2')) {
                window.jQuery(input).trigger('change.select2');
            }
            this.anteriores.set(input, input.value);
            return;
        }

        // Escolha aceita.
        this.anteriores.set(input, escolhido);
        configs.forEach(regra => {
            if (regra && regra.remember_in && escolhido !== '') {
                this.engine.setFieldValue(regra.remember_in, escolhido, false);
            }
        });
    }
};
