# Form Rule Engine

Motor declarativo de comportamento de formulário para projetos legados.

Você descreve o formulário **e o comportamento dele** como configuração. Nada de
escrever JS de formulário à mão para mostrar/esconder campo, tornar obrigatório,
mascarar, calcular, cascatear combo ou validar no servidor. E, se você usa PHP,
nada de escrever o HTML dos campos também.

## Em PHP: configure o array, receba o formulário

```php
echo FormRenderer::renderForm([
    'name'     => 'frmCliente',
    'sections' => [[
        'title'  => 'Identificação',
        'fields' => [
            ['name' => 'TipoPessoa', 'label' => 'Tipo', 'type' => 'select', 'col' => 4,
             'options' => ['F' => 'Física', 'J' => 'Jurídica']],

            ['name' => 'Cpf', 'label' => 'CPF', 'col' => 4,
             'visible_when' => ['TipoPessoa' => 'F'],
             'mask_when'    => ['mask' => '000.000.000-00']],

            ['name' => 'Cnpj', 'label' => 'CNPJ', 'col' => 4,
             'visible_when'  => ['TipoPessoa' => 'J'],
             'required_when' => ['TipoPessoa' => 'J']],
        ],
    ]],
    'buttons' => [['label' => 'Salvar', 'type' => 'submit', 'class' => 'primary']],
]);

echo FormRenderer::renderScripts($config);   // carrega só os plugins que a config usa
```

Sai o formulário inteiro (seções, grid de 12 colunas, rótulos, controles) com as
regras já penduradas no lugar certo. **Zero linha de JavaScript e zero linha de HTML.**

## Em qualquer outra stack: gere os atributos

O gerador PHP é conveniência. O que a engine realmente consome são atributos HTML,
então qualquer backend serve: Django, Rails, ASP.NET, JSP ou string concatenada:

```html
<form data-form-visibility="true">
  <input name="TipoPessoa" value="F">

  <div data-visible-when='{"TipoPessoa":"F"}'>
    <label>CPF</label>
    <input name="Cpf" data-mask-when='{"mask":"000.000.000-00"}'>
  </div>

  <!-- a regra vai no WRAPPER, nunca no <input>; ver "Armadilha do wrapper" -->
  <div data-visible-when='{"TipoPessoa":"J"}' data-required-when='{"TipoPessoa":"J"}'>
    <label>CNPJ</label>
    <input name="Cnpj">
  </div>
</form>
```

---

## Estado atual do repositório

**Extraída de um CRM em produção, e já divergindo dele.** A primeira versão deste
repositório era cópia literal dos arquivos do CRM onde a engine nasceu
(Ilumimais/Conecta Corretora), para permitir `diff` contra a origem. Essa
propriedade acabou: corrigir as falhas silenciosas, extrair o tema, fechar a
fronteira do host e traduzir as mensagens são todas mudanças de comportamento, e
`src/` foi reescrito em 24 arquivos.

A rede de segurança passou a ser a suíte de testes, não a comparação com a
origem. `tests/paridade-php.php` ainda compara o interpretador com o trait de
lá, e registra as **divergências deliberadas** como asserções: cada uma afirma
que a origem produz o resultado antigo e que nós produzimos o novo. É o que
mantém distinguíveis "consertei" e "quebrei". Comparação literal só sobrevive em
`reference/php/`, que segue intocado.

O que ainda **não** está resolvido:

- **Não há build, nem pacote npm, nem pacote Composer.** São scripts carregados
  por `<script src>` e uma classe PHP para `require`.
- **Há quatro testes** (`npm test`): smoke do runtime, paridade do interpretador
  contra o trait de origem, um cruzado PHP→JS da DSL, e um ponta a ponta que sai
  de uma config, gera o formulário e o exercita no DOM. Cobertura por plugin é o
  item 1 do roadmap.
- **Não há build.** Os arquivos são carregados por `<script src>` na ordem
  documentada; falta empacotar (ESM/UMD/IIFE).
- **12 plugins usam jQuery.** É a dependência a remover, e a menos urgente: o
  público-alvo quase sempre já a tem na página.

O que **já** está resolvido, e antes não estava:

- a licença é [MIT](LICENSE), sem restrição de uso;
- os nomes de classe, o shell do host e os textos são configuráveis
  (ver "Adaptando ao seu projeto");
- as arestas de falha silenciosa foram corrigidas, e o que sobrou virou aviso
  em `diagnose()`.

Veja [ROADMAP.md](ROADMAP.md) para a ordem de trabalho proposta.

---

## Como usar hoje

A documentação executável está em [`examples/`](examples/): uma página por
assunto, todas rodando de verdade no navegador. Nenhum exemplo é HTML escrito à
mão: cada um é uma **configuração PHP** gerada pelo
[`FormRenderer`](src/php/FormRenderer.php), e a página mostra as três camadas
lado a lado: a config, o HTML gerado, e o formulário funcionando.

Por isso as 19 páginas valem como teste de regressão do gerador: qualquer
mudança em `FormRenderer` que altere a saída aparece ali, em 54 formulários de
formatos diferentes.

```bash
npm run docs          # php -S localhost:8000 -t .
# http://localhost:8000/examples/
```

PHP 8.0+, sem Composer e sem banco: o backend dos exemplos é um único `api.php`
com arrays em memória, e é ele que atende as demonstrações de `fetch_when`,
`populate_when`, `remote_validate_when` e da política de senha.

Ela também é publicável no GitHub Pages: `npm run docs:build` exporta tudo para
HTML estático, e o workflow em `.github/workflows/pages.yml` faz isso a cada push.
Na versão publicada o backend é simulado em JavaScript, porque o Pages não executa
PHP; `tests/mock-vs-api.js` garante que as respostas não divirjam. Ver
[examples/README.md](examples/README.md).

Comece pelo [índice](examples/), ou direto no
[começo rápido](examples/?p=basico). A
[referência completa](examples/?p=99-referencia) reúne todos os atributos,
operadores, ações e armadilhas conhecidas em uma página.

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
carregados**: plugin ausente é ignorado em silêncio, então você paga só pelo que usa.

Inicialização é idempotente (marca `dataset.formVisibilityV2Initialized`), o que
importa em telas legadas que injetam HTML por AJAX e re-executam scripts inline.

### Dependências

- **Nenhuma obrigatória** para 22 dos 27 plugins.
- **jQuery**: usado por 12 plugins (`fetch`, `copy`, `trigger`, `remote-validate`,
  `mask`, `populate`, `sequence`, `behavior`, `submit-handler`, `dynamic-table`,
  `revert`, `password`) e pelo núcleo. É a dependência a remover primeiro; o uso é raso
  (`$(el)`, `.on`, `$.ajax`).
- **SweetAlert2** (`window.Swal`): opcional, já guardado por `typeof`. Sem ele,
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
`validate`, …) resolvem o alvo com `element.querySelector('input, select, textarea')`:
ou seja, procuram **dentro** do elemento e nunca consideram o próprio elemento.

```html
<!-- NÃO funciona: falha em silêncio, sem erro no console -->
<input name="Cnpj" data-required-when='{"TipoPessoa":"J"}'>

<!-- funciona: o atributo vai no wrapper -->
<div data-required-when='{"TipoPessoa":"J"}'>
  <input name="Cnpj">
</div>
```

`visible` é exceção: age no próprio elemento, então funciona nos dois lugares
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
**dois campos entre si**: `eq_field` e `neq_field`, onde o operando é o *nome* do
outro campo (`{"Confirmacao": {"eq_field": "Senha"}}`).

Duas armadilhas que valem mais que a tabela:

- **Só a primeira chave do objeto é lida.** `{"A":"1","B":"2"}` avalia apenas `A`
  não é um AND implícito. Para duas condições, use `AND` explicitamente.
- **Comparadores numéricos convertem, igualdade não.** `>` e `<` passam por
  `parseFloat`; `=` compara com `===` sobre o valor cru do campo, que é sempre
  string. `{"Quantidade": 1}` é falso quando o input tem `"1"`, escreva `{"Quantidade": "1"}`.

`form_param_<nome>` referencia um parâmetro do formulário inteiro, não um campo
útil para variar comportamento por contexto (modo de edição, origem da chamada).

### 3. Comportamento de formulário: `data-behavior-when`

No `<form>`, não no campo. Um **array** de objetos com `type`. É por aqui que o
formulário envia. Este é o ponto mais acoplado ao host original (ver abaixo).

```html
<form data-behavior-when='[{"type":"ajax_submit","route":"/api/salvar","expose":"submitFoo"}]'>
```

Tipos: `ajax_submit`, `ajax_mutations`, `token_insert`, `intl_phone`.

---

## Adaptando ao seu projeto

Três coisas eram, até aqui, o que impedia alguém de usar a engine fora do CRM
onde ela nasceu: a marcação era opinativa, o envio dependia de funções do host, e
os textos eram em português. As três agora se configuram, e os padrões continuam
sendo o comportamento histórico, então nada muda para quem já usa.

### Tema: os nomes de classe

A engine **aplica** classes (`ilu-input--required`) e **procura** seletores
(`.ilu-form-label`, `.ilu-form-compact__grid`). Os nomes estavam embutidos em cada
plugin. Agora vivem num mapa só:

```js
FormRuleEngine.theme.set({
  label:         '.form-label',      // onde ela PROCURA o rótulo
  labelRequired: 'is-required',      // o que ela APLICA nele
  fieldWrapper:  '.form-group',
});

FormRuleEngine.theme.preset('neutro');   // larga `ilu-*` e `crm-*`: tudo vira form-rule-*
FormRuleEngine.theme.todos();            // o mapa inteiro, para inspecionar
```

Os seletores marcados como PROCURA são contrato com o **seu** markup: se o
elemento não existir com esse nome, a engine não o encontra. Os aplicados são o
contrário: ela escreve, o seu CSS decide.

### Host: a fronteira com o shell

Cinco plugins citavam `DrawerService`, `sendForm`, `refreshMutationTarget`,
`openLink`, `openLinkDiv` e `Swal`. Esses nomes agora aparecem em um lugar só, o
adaptador padrão, que **delega às globais do host quando elas existem** e cai em
comportamento vanilla quando não existem.

```js
FormRuleEngine.host.set({
  confirm:    opcoes => meuModal.perguntar(opcoes),   // → Promise<boolean>
  toast:      (tipo, texto) => meuToast(tipo, texto),
  submit:     config => fetch(config.url, …),         // → Promise
  refresh:    (config, gatilho, escopo) => …,
  closePanel: () => meuDrawer.fechar(),
  openPanel:  config => meuDrawer.abrir(config),
  navigate:   (rota, query) => …,
  loadInto:   (alvo, rota, params) => …,
});
```

O CRM de origem não precisa fazer nada: o padrão detecta as globais dele. Quem
não as tem passa a ter confirmação (`window.confirm`), mensagem e envio
(`fetch`) funcionando.

Consequência prática: `prevent_submit_when` e a validação remota **bloqueiam o
envio para todo mundo**. Antes, o guarda só era instalado quando existia um
`window.sendForm`; fora dele as regras eram registradas e ninguém as consultava.
Agora o núcleo escuta o `submit` nativo, e `engine.validateBeforeSubmit()` é
público para quem envia por AJAX.

### Idioma

```js
FormRuleEngine.i18n.locale('en');
FormRuleEngine.i18n.set({ campoObrigatorio: 'Champ requis' });
FormRuleEngine.i18n.registrar('es', { … });
```

Acompanham `pt-BR` (padrão) e `en`. Os identificadores internos do código foram
renomeados para inglês; a documentação segue em português, o que é decisão de
público-alvo e não pendência técnica.

### Quando a regra não dispara

As falhas da engine eram silenciosas por natureza: a condição não casa, e não há
erro. `diagnose()` percorre as regras registradas e acusa o que costuma estar
errado.

```js
FormRuleEngine.debug = true;          // antes do bootstrap
// ou <form data-form-debug="true">
```

Ele reporta regra pendurada no `<input>` em vez do wrapper, campo citado que não
existe no formulário, condição com mais de uma chave (o runtime lê só a primeira)
e JSON inválido no atributo. Do lado do PHP, `FormRuleCompiler::avisos()` devolve
os problemas encontrados na compilação.

---

## O lado do servidor

São duas peças, com responsabilidades separadas: o **gerador** emite markup, o
**interpretador** traduz as regras. Dá para usar o interpretador sozinho, se você
já tem o seu próprio gerador de formulários e só quer as regras.

### `src/php/FormRenderer.php`, o gerador

`renderForm($config)` devolve o formulário completo. `renderScripts($config)`
devolve as `<script>` na ordem obrigatória, **só dos plugins que a config usa**
formulário sem máscara não baixa o plugin de máscara.

A estrutura da config: `sections[] → fields[]`, cada campo com `name`, `label`,
`type`, `col` (grid de 12) e as chaves de regra (`visible_when`, `required_when`,
…). Tipos de campo: `text`, `number`, `date`, `email`, `password`, `tel`,
`select`, `textarea`, `checkbox`, `radio`, `hidden`, `static`, `raw` (HTML cru
dentro da grid) e `group` (propaga a condição para os filhos).

O template do formulário fica separado da lógica em
[`src/php/templates/form.phtml`](src/php/templates/form.phtml), trocar a marcação
(outro framework de CSS, outra estrutura de seção) é editar esse arquivo, sem
tocar em regra nenhuma.

**Por que usar o gerador em vez de montar o HTML:** ele acerta sozinho as duas
armadilhas documentadas abaixo: põe o atributo de regra no wrapper, e emite
`value` explícito em checkbox. As duas falham em silêncio quando feitas à mão.

### `src/php/FormRuleCompiler.php`, o interpretador

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
para lista sequencial de condições: este último é capacidade só do compilador,
já que o runtime avalia apenas a primeira chave de um objeto.

Duas famílias de regra, tratadas diferente de propósito:

- **condição pura** (`visible_when`, `required_when`, `disabled_when`, `label_when`,
  `enabled_when`), passa pelo normalizador;
- **objeto rico** (`set_value_when`, `fetch_when`, `computed_when`, `lock_when`, …):
  vai como está. Normalizar quebraria a estrutura: em
  `set_value_when => ['values' => [...], 'condition' => [...]]`, `values` viraria
  nome de campo.

#### Armadilha: pertinência com exatamente 2 valores

`['Uf' => ['SP','RJ']]` é **indistinguível** de `['Cliente' => ['!=', '']]`, os dois
são "array de 2 escalares". O compilador resolve a favor do par posicional, então
o teste de pertinência com 2 valores compila para `{"Uf":{"sp":"RJ"}}`, o runtime
não conhece o operador `sp`, e a condição fica **permanentemente falsa**.

Com 1 ou 3+ valores funciona. Só 2 quebra, o que a torna pior que um erro
consistente. `{"Uf":{"in":[...]}}` também não salva, não existe operador `in`
no runtime. Enquanto isso não muda, escreva:

```php
['OR' => [['Uf' => 'SP'], ['Uf' => 'RJ']]]
```

Está fixado nos testes como comportamento **conhecido**, não desejado, e é o
primeiro item do roadmap. Varri o CRM de origem: nenhuma tela cai nela hoje.

### `src/php/templates/form.phtml`: a marcação

O template que o `renderForm()` inclui. Está separado da classe de propósito:
trocar a marcação (outro framework de CSS, outra estrutura de grid) não deve
exigir tocar em regra. É o único arquivo do pacote com HTML de formulário.

### `reference/php/`: o resto, verbatim

Não é pacote e não roda isolado; está aqui para responder *"como eu gero isso do
meu backend?"* e para permitir `diff` contra a origem.

- `FormRenderer.php`: o trait de onde o interpretador foi extraído. Contém o
  render completo (`renderForm`, `emitFormOutput`, `buildFormValidationScript`,
  normalização de seções/campos/botões) e depende de `Controller`, `View`, `SField*`.
- `form-builder.phtml`: o emissor de lá, acoplado ao framework: `sections[] → fields[] → data-*-when`
- `form-builder-compact.phtml` / `form-builder-cards.phtml`, variantes de layout
- `FormFieldFactory.php`: fábrica de campo por `type`

---

## Licença

[MIT](LICENSE). Use, copie, modifique, redistribua e venda, com ou sem alteração,
em projeto aberto ou fechado. A única condição é manter o aviso de copyright e o
texto da licença nas cópias.

Não há garantia de espécie alguma: a engine roda em produção no CRM de origem,
mas as arestas conhecidas estão listadas na
[referência](examples/?p=99-referencia) justamente porque você vai encontrá-las.

---

## Origem

Extraído de um CRM multi-tenant em PHP 8.2, onde substituiu o JS de formulário
escrito à mão em centenas de telas. As regras foram descobertas a partir de
comportamento real de produção, não desenhadas no papel, o que explica a
cobertura incomum (senha, wizard, gating sequencial, tabela dinâmica) e também
as arestas listadas acima.
