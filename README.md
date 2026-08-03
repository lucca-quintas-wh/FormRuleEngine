# Form Rule Engine

Motor declarativo de comportamento de formulário para projetos legados.

Você descreve o comportamento como **atributos HTML**; a engine executa no browser.
Nada de escrever JS de formulário à mão para mostrar/esconder campo, tornar
obrigatório, mascarar, calcular, cascatear combo ou validar no servidor.

```html
<form data-form-visibility="true">
  <input name="TipoPessoa" value="F">

  <div data-visible-when='{"TipoPessoa":"F"}'>
    <input name="Cpf" data-mask-when='{"mask":"000.000.000-00"}'>
  </div>

  <div data-visible-when='{"TipoPessoa":"J"}'>
    <input name="Cnpj" data-required-when='{"TipoPessoa":"J"}'>
  </div>
</form>
```

Sem uma linha de JavaScript. O backend só precisa saber gerar atributo HTML —
PHP, Django, Rails, ASP.NET, JSP ou string concatenada, tanto faz.

---

## Estado atual do repositório

**Extração inicial, verbatim.** Os arquivos foram copiados sem modificação do CRM
onde a engine nasceu (Ilumimais/Conecta Corretora), de propósito: manter os nomes e
o conteúdo idênticos permite `diff` contra a origem enquanto a extração amadurece.

O que isso significa na prática, e que ainda **não** está resolvido:

- **Não há build, nem pacote npm, nem pacote Composer.** São scripts carregados
  por `<script src>` e uma classe PHP para `require`.
- **Há três testes** (`npm test`) — smoke do runtime, paridade do interpretador
  PHP contra o trait de origem, e um cruzado PHP→JS. Cobertura por plugin é o
  item 1 do roadmap.
- **5 dos 27 plugins ainda dependem do host original** (ver "Fronteira do host").
- **Mensagens de erro estão em português**, embutidas no código.

Veja [ROADMAP.md](ROADMAP.md) para a ordem de trabalho proposta.

---

## Como usar hoje

Há um exemplo funcional e sem dependência nenhuma em
[`examples/basico.html`](examples/basico.html) — sirva a pasta por HTTP
(`python3 -m http.server`) e abra.

Carregue o núcleo, os plugins que você vai usar, e o bootstrap **por último**:

```html
<script src="src/form-rule-engine.js"></script>

<script src="src/plugins/form-rule-base.js"></script>   <!-- obrigatório: classe base -->
<script src="src/plugins/form-rule-visible.js"></script>
<script src="src/plugins/form-rule-required.js"></script>
<!-- ...só os plugins que o seu formulário usa... -->

<script src="src/form-visibility-v2.js"></script>       <!-- por último: registra e inicializa -->
```

O bootstrap varre o documento atrás de `form[data-form-visibility="true"]`,
instancia uma engine por formulário e registra **os plugins que encontrar
carregados** — plugin ausente é ignorado em silêncio, então você paga só pelo que usa.

Inicialização é idempotente (marca `dataset.formVisibilityV2Initialized`), o que
importa em telas legadas que injetam HTML por AJAX e re-executam scripts inline.

### Dependências

- **Nenhuma obrigatória** para 22 dos 27 plugins.
- **jQuery** — usado por 12 plugins (`fetch`, `copy`, `trigger`, `remote-validate`,
  `mask`, `populate`, `sequence`, `behavior`, `submit-handler`, `dynamic-table`,
  `revert`, `password`) e pelo núcleo. É a dependência a remover primeiro; o uso é raso
  (`$(el)`, `.on`, `$.ajax`).
- **SweetAlert2** (`window.Swal`) — opcional, já guardado por `typeof`. Sem ele,
  os plugins que confirmam ação simplesmente não mostram o diálogo.

---

## O contrato

Duas metades independentes.

### 1. Regra por campo: `data-<regra>-when`

Um atributo no elemento (campo, `<div>` de campo, ou seção inteira) contendo JSON.
A engine lê o atributo, resolve as dependências, e reavalia sempre que um campo
citado na condição muda.

| Atributo | Plugin | O que faz |
|---|---|---|
| `data-visible-when` | visible | mostra/esconde o elemento (com fade opcional) |
| `data-required-when` | required | alterna obrigatoriedade |
| `data-disabled-when` | disabled | habilita/desabilita |
| `data-label-when` | label | troca o texto do rótulo |
| `data-options-when` | options | troca o conjunto de `<option>` (estático) |
| `data-mask-when` | mask | aplica/remove máscara de input |
| `data-validate-when` | validate | validação no cliente |
| `data-set-value-when` | set-value | define valor fixo ou templado (`{OutroCampo}`) |
| `data-computed-when` | computed | calcula o valor a partir de outros campos |
| `data-copy-when` | copy | copia o valor de um campo de origem |
| `data-lock-when` | lock | força valor e trava o campo enquanto a condição vale |
| `data-fetch-when` | fetch | AJAX declarativo (CEP/CNPJ/cascata de combo) |
| `data-remote-validate-when` | remote-validate | validação assíncrona no servidor, trava o submit |
| `data-populate-when` | populate | preenche vários campos de uma resposta AJAX |
| `data-trigger-when` | trigger | dispara eventos em campos-alvo |
| `data-prevent-submit-when` | prevent-submit | bloqueia o submit enquanto a condição vale |
| `data-confirm-submit` | confirm-submit | diálogo de confirmação antes de enviar |
| `data-action-when` / `data-enabled-when` | action | visibilidade/habilitação de **botões** |
| `data-revert-when` | revert | desfaz alterações sob condição |
| `data-password-when` | password | regras de força/confirmação de senha |
| `data-step-when` | step | navegação e validação de wizard multi-etapa |
| `data-sequence-when` | sequence | liberação sequencial de campos (um libera o próximo) |

E dois que não são "regra de campo": `dynamic-table` (tabelas repetíveis com
totalizadores), `repeater-init` (linhas add/remove).

#### Armadilha do wrapper

Os plugins que **alteram o input** (`required`, `disabled`, `label`, `mask`,
`validate`, …) resolvem o alvo com `element.querySelector('input, select, textarea')`
— ou seja, procuram **dentro** do elemento e nunca consideram o próprio elemento.

```html
<!-- NÃO funciona: falha em silêncio, sem erro no console -->
<input name="Cnpj" data-required-when='{"TipoPessoa":"J"}'>

<!-- funciona: o atributo vai no wrapper -->
<div data-required-when='{"TipoPessoa":"J"}'>
  <input name="Cnpj">
</div>
```

`visible` é exceção: age no próprio elemento, então funciona nos dois lugares —
o que torna a armadilha pior, porque o primeiro plugin que a pessoa experimenta
funciona como esperado.

No CRM de origem isso nunca apareceu: o gerador PHP sempre emite o atributo no
`<div>` do campo. É uma dívida herdada de um contexto onde só existia um gerador,
e está no roadmap para virar tolerância no `findInput()`.

### 2. Gramática das condições (a DSL)

A mesma para **todo** `*_when`:

```js
{"Campo": "S"}                              // igualdade (comparação estrita de string)
{"Campo": ["A", "B"]}                       // array = pertence a
{"Campo": {"!=": "S"}}                      // forma com operador
{"AND": [{"A": "1"}, {"B": "2"}]}           // conjunção
{"OR":  [{"A": "1"}, {"AND": [...]}]}       // disjunção, aninhável
{"form_param_origem": "externo"}            // parâmetro global do formulário
```

Operadores aceitos: `eq`, `!=`, `>`, `<`, `>=`, `<=`, `regex`, e dois que comparam
**dois campos entre si** — `eq_field` e `neq_field`, onde o operando é o *nome* do
outro campo (`{"Confirmacao": {"eq_field": "Senha"}}`).

Duas armadilhas que valem mais que a tabela:

- **Só a primeira chave do objeto é lida.** `{"A":"1","B":"2"}` avalia apenas `A` —
  não é um AND implícito. Para duas condições, use `AND` explicitamente.
- **Comparadores numéricos convertem, igualdade não.** `>` e `<` passam por
  `parseFloat`; `=` compara com `===` sobre o valor cru do campo, que é sempre
  string. `{"Quantidade": 1}` é falso quando o input tem `"1"` — escreva `{"Quantidade": "1"}`.

`form_param_<nome>` referencia um parâmetro do formulário inteiro, não um campo —
útil para variar comportamento por contexto (modo de edição, origem da chamada).

### 3. Comportamento de formulário: `data-behavior-when`

No `<form>`, não no campo. Um **array** de objetos com `type`. É por aqui que o
formulário envia. Este é o ponto mais acoplado ao host original (ver abaixo).

```html
<form data-behavior-when='[{"type":"ajax_submit","route":"/api/salvar","expose":"submitFoo"}]'>
```

Tipos: `ajax_submit`, `ajax_mutations`, `token_insert`, `intl_phone`.

---

## Fronteira do host

O núcleo é limpo. O acoplamento ao CRM de origem está concentrado e é conhecido:

| Arquivo | Símbolos externos | Natureza |
|---|---|---|
| `plugins/form-rule-behavior.js` | `DrawerService`, `refreshMutationTarget`, `openLinkDiv`, `openLink`, `crm:drawer:*` | **real** — precisa virar adapter |
| `plugins/form-rule-submit-handler.js` | `sendForm`, `DrawerService` | **real** |
| `plugins/form-rule-sequence.js` | `Swal`, `select2` | parcial — `Swal` já é opcional |
| `plugins/form-rule-dynamic-table.js` | `Swal` | opcional, já guardado |
| `plugins/form-rule-revert.js` | `select2` | parcial |
| `form-rule-engine.js` | `window.sendForm` | já degrada sozinho (`typeof !== 'function' → return`) |

Os outros **23 arquivos** (22 plugins + o bootstrap) **não referenciam nada externo**.

O desenho proposto é um **host adapter**: uma interface com `confirm()`, `toast()`,
`submit()`, `refresh()`, `closePanel()`. Implementação padrão em vanilla; quem tem
um shell próprio (drawer, modal, SPA) injeta o seu. Assim os 5 arquivos acima
deixam de citar símbolo de projeto e o CRM de origem passa a **consumir** o pacote
em vez de mantê-lo forkado.

---

## O lado do servidor

### `src/php/FormRuleCompiler.php` — o interpretador

PHP puro, sem dependência de framework. Traduz config declarativa nos atributos
que o runtime lê, e principalmente **normaliza a DSL**: aceita as várias formas
que um autor escreve e emite a única forma que o JS entende.

```php
FormRuleCompiler::atributos([
    'name'         => 'Cnpj',
    'visible_when' => ['TipoPessoa' => 'J'],
    'mask_when'    => ['mask' => '00.000.000/0000-00'],
]);
// →  data-visible-when='{"TipoPessoa":"J"}' data-mask-when='{"mask":"00.000.000\/0000-00"}'
```

Formas aceitas para uma condição, todas equivalentes a `{"Valor":{">":10}}`:

```php
['Valor' => ['>' => 10]]                          // canônica
['Valor' => ['>', 10]]                            // par posicional
['Valor', '>', 10]                                // trinca posicional
['field' => 'Valor', 'op' => '>', 'value' => 10]  // verbosa
```

Mais: aliases de operador (`=`, `==`, `<>`, `neq` → `eq`/`!=`) e **`AND` implícito**
para lista sequencial de condições — este último é capacidade só do compilador,
já que o runtime avalia apenas a primeira chave de um objeto.

Duas famílias de regra, tratadas diferente de propósito:

- **condição pura** (`visible_when`, `required_when`, `disabled_when`, `label_when`,
  `enabled_when`) — passa pelo normalizador;
- **objeto rico** (`set_value_when`, `fetch_when`, `computed_when`, `lock_when`, …)
  — vai como está. Normalizar quebraria a estrutura: em
  `set_value_when => ['values' => [...], 'condition' => [...]]`, `values` viraria
  nome de campo.

#### Armadilha: pertinência com exatamente 2 valores

`['Uf' => ['SP','RJ']]` é **indistinguível** de `['Cliente' => ['!=', '']]` — os dois
são "array de 2 escalares". O compilador resolve a favor do par posicional, então
o teste de pertinência com 2 valores compila para `{"Uf":{"sp":"RJ"}}`, o runtime
não conhece o operador `sp`, e a condição fica **permanentemente falsa**.

Com 1 ou 3+ valores funciona. Só 2 quebra, o que a torna pior que um erro
consistente. `{"Uf":{"in":[...]}}` também não salva — não existe operador `in`
no runtime. Enquanto isso não muda, escreva:

```php
['OR' => [['Uf' => 'SP'], ['Uf' => 'RJ']]]
```

Está fixado nos testes como comportamento **conhecido**, não desejado, e é o
primeiro item do roadmap. Varri o CRM de origem: nenhuma tela cai nela hoje.

### `reference/php/` — o resto, verbatim

Não é pacote e não roda isolado; está aqui para responder *"como eu gero isso do
meu backend?"* e para permitir `diff` contra a origem.

- `FormRenderer.php` — o trait de onde o interpretador foi extraído. Contém o
  render completo (`renderForm`, `emitFormOutput`, `buildFormValidationScript`,
  normalização de seções/campos/botões) e depende de `Controller`, `View`, `SField*`.
- `form-builder.phtml` — o emissor: `sections[] → fields[] → data-*-when`
- `form-builder-compact.phtml` / `form-builder-cards.phtml` — variantes de layout
- `FormFieldFactory.php` — fábrica de campo por `type`

---

## Origem

Extraído de um CRM multi-tenant em PHP 8.2, onde substituiu o JS de formulário
escrito à mão em centenas de telas. As regras foram descobertas a partir de
comportamento real de produção, não desenhadas no papel — o que explica a
cobertura incomum (senha, wizard, gating sequencial, tabela dinâmica) e também
as arestas listadas acima.
