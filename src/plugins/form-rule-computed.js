/**
 * Plugin: computed_when
 * Calcula campos a partir de expressões simples.
 */
window.FormRuleComputedPlugin = window.FormRuleComputedPlugin || class FormRuleComputedPlugin extends window.FormRulePlugin {
    constructor() {
        super('computed');
    }

    extractDependencies(rules) {
        const fields = new Set();
        const configs = Array.isArray(rules) ? rules : [rules];

        configs.forEach(rule => {
            if (rule.start) fields.add(rule.start);
            if (rule.end) fields.add(rule.end);
            if (rule.source) fields.add(rule.source);
            const expr = rule.expression || rule.value || '';
            const matches = String(expr).match(/\{(\w+)\}/g);
            if (matches) matches.forEach(m => fields.add(m.replace(/[{}]/g, '')));
            if (rule.condition) this.extractFieldNames(rule.condition).forEach(f => fields.add(f));
        });

        return Array.from(fields);
    }

    apply(element, rules) {
        const configs = Array.isArray(rules) ? rules : [rules];

        configs.forEach(rule => {
            if (!rule.target) return;
            if (rule.condition && !this.evaluateCondition(rule.condition)) return;

            const value = this.compute(rule);
            if (value !== undefined) {
                this.engine.setFieldValue(rule.target, value);
            }
        });
    }

    compute(rule) {
        // Idade em anos COMPLETOS a partir de uma data (dd/mm/aaaa).
        if (rule.type === 'age') {
            const anos = this.ageInYears(this.engine.getFieldValue(rule.source || rule.start));
            return anos === null ? '' : anos;
        }

        // Idade → faixa etária. Sem `bands`, a faixa sai das OPÇÕES do próprio
        // campo de destino, cujo valor já codifica o intervalo ("24.28"): assim
        // a regra vale para qualquer conjunto de faixas que o produto trouxer,
        // em vez de depender de uma tabela fixa no código que fica errada no dia
        // em que um modelo de agrupamento usar outros cortes.
        if (rule.type === 'age_band') {
            const idade = this.ageInYears(this.engine.getFieldValue(rule.source));
            if (idade === null || idade < 0) return undefined;   // undefined = não mexe no campo

            const faixas = Array.isArray(rule.bands) && rule.bands.length
                ? rule.bands
                : this.bandsFromField(rule.target);

            const achada = faixas.find(faixa => {
                if (faixa.lt !== undefined)  return idade < Number(faixa.lt);
                const min = faixa.min !== undefined ? Number(faixa.min) : -Infinity;
                const max = faixa.max !== undefined ? Number(faixa.max) : Infinity;
                return idade >= min && idade <= max;
            });
            return achada ? achada.value : undefined;
        }

        if (rule.type === 'days_between') {
            const start = this.parseDate(this.engine.getFieldValue(rule.start));
            const end = this.parseDate(this.engine.getFieldValue(rule.end));
            if (!start || !end) return '';
            return Math.max(0, Math.round((end - start) / 86400000));
        }

        if (rule.expression) {
            let expression = this.engine.resolveTemplate(rule.expression);
            if (rule.parse === 'br') {
                // Normaliza números no formato BR ("1.234,56" -> "1234.56") antes de judge
                expression = expression.replace(/\d{1,3}(?:\.\d{3})+,\d+|\d+,\d+/g, m => m.replace(/\./g, '').replace(',', '.'));
            }
            if (/^[0-9+\-*/ ().,]+$/.test(expression)) {
                try {
                    const result = Function('"use strict"; return (' + expression.replace(/,/g, '.') + ');')();
                    if (rule.format === 'br' && typeof result === 'number' && isFinite(result)) {
                        return result.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    }
                    return result;
                } catch (e) {
                    return undefined;
                }
            }
            return expression;
        }

        return rule.value !== undefined ? this.engine.resolveTemplate(String(rule.value)) : undefined;
    }

    /**
     * Idade em anos completos. Rejeita data inexistente (31/02 vira 03/03 no
     * construtor do Date) e conta o aniversário do ano corrente, o cálculo do
     * legado dividia o intervalo por 360 dias e somava um mês por usar o mês
     * base-zero sem descontar 1, o que dava um ano a mais em vários nascimentos.
     * Faixa etária define preço, então o erro era cobrado do cliente.
     */
    ageInYears(texto) {
        const partes = String(texto || '').split('/');
        if (partes.length !== 3) return null;

        const dia = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10);
        const ano = parseInt(partes[2], 10);
        if (!dia || !mes || !ano) return null;

        const nasc = new Date(ano, mes - 1, dia);
        if (nasc.getFullYear() !== ano || nasc.getMonth() !== mes - 1 || nasc.getDate() !== dia) {
            return null;
        }

        const hoje = new Date();
        let anos = hoje.getFullYear() - nasc.getFullYear();
        const difMes = hoje.getMonth() - nasc.getMonth();
        if (difMes < 0 || (difMes === 0 && hoje.getDate() < nasc.getDate())) anos--;
        return anos;
    }

    /**
     * Lê as faixas das opções do campo: o valor "24.28" é o próprio intervalo.
     * Opção que não tem essa forma (o ".:Escolha:.") é ignorada.
     */
    bandsFromField(nomeCampo) {
        const campo = this.engine.form.querySelector(`[name="${nomeCampo}"]`);
        if (!campo || campo.tagName !== 'SELECT') return [];

        return Array.from(campo.options).reduce((faixas, opcao) => {
            const casa = String(opcao.value || '').match(/^(\d+)\.(\d+)$/);
            if (casa) faixas.push({ min: casa[1], max: casa[2], value: opcao.value });
            return faixas;
        }, []);
    }

    parseDate(value) {
        if (!value) return null;
        const parts = String(value).split('/');
        if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
        const iso = new Date(value);
        return Number.isNaN(iso.getTime()) ? null : iso;
    }
};
