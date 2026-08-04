# Exemplos

Documentação executável da Form Rule Engine. Uma página por assunto, cada uma
rodando de verdade no navegador.

Nenhum exemplo é HTML escrito à mão: cada um é uma **configuração PHP** em
`demos/`, gerada pelo [`FormRenderer`](../src/php/FormRenderer.php), a mesma API
que o pacote oferece a quem o usa, não um andaime de demonstração. Cada página
mostra as três camadas lado a lado: a config, o HTML gerado, e o formulário
funcionando. Como as três saem da mesma fonte, não podem divergir.

```
demos/01-basico.php                       ← a config que você escreve
        ↓  FormRenderer::renderForm()                markup
           └ FormRuleCompiler::atributos()           regras
<div class="…" data-visible-when='{"TipoPessoa":"F"}'>  ← o formulário pronto
  <input name="Cpf">
</div>
        ↓  form-visibility-v2.js
o campo aparece e some sozinho                          ← o runtime
```

Por isso estas 19 páginas valem como **teste de regressão do gerador**: qualquer
mudança em `FormRenderer` que altere a saída aparece aqui, em 54 formulários de
formatos diferentes.

## Como rodar

A partir da **raiz do repositório**:

```bash
php -S localhost:8000 -t .
# http://localhost:8000/examples/
```

PHP 8.0+. Não há dependências, nem Composer, nem banco: o backend dos exemplos
é um único `api.php` com arrays em memória.

## O que tem aqui

| | Página | Assunto |
|---|---|---|
| 00 | `?p=basico` | O exemplo mínimo, sem nenhuma dependência |
| 01 | `?p=01-visibilidade` | `visible_when`, fade, reserva de espaço, limpeza ao ocultar |
| 02 | `?p=02-obrigatorio-desabilitado` | `required_when`, `disabled_when` e a armadilha do wrapper |
| 03 | `?p=03-dsl-condicoes` | A gramática das condições, com laboratório ao vivo |
| 04 | `?p=04-rotulo-opcoes` | `label_when`, `options_when` |
| 05 | `?p=05-valores-calculados` | `set_value_when`, `computed_when` (idade, faixa etária, datas) |
| 06 | `?p=06-copiar-travar-reverter` | `copy_when`, `lock_when`, `revert_when` |
| 07 | `?p=07-mascara-validacao` | `mask_when`, `validate_when` |
| 08 | `?p=08-fetch-cascata` | `fetch_when`: CEP, cascata, encadeamento, falhas |
| 09 | `?p=09-populate` | `populate_when` |
| 10 | `?p=10-validacao-remota` | `remote_validate_when`, `prevent_submit_when`, `confirm_submit` |
| 11 | `?p=11-botoes-gatilhos` | `action_when`, `trigger_when`, catálogo de ações |
| 12 | `?p=12-sequencia` | Liberação sequencial de campos |
| 13 | `?p=13-wizard` | Wizard multi-etapa |
| 14 | `?p=14-tabela-dinamica` | Tabela dinâmica e regras em linhas novas |
| 15 | `?p=15-senha` | Política de senha vinda do servidor |
| 16 | `?p=16-comportamento-form` | `behaviors`, `submit_handler` e a fronteira do host |
| 17 | `?p=17-casos-completos` | Quatro formulários inteiros, do tamanho real |
| 99 | `?p=99-referencia` | Referência completa em uma página |

## Estrutura

```
examples/
├── index.php               front controller: hub e roteamento por ?p=
├── api.php                 backend: CEP, cascata, validação remota, senha, salvar
├── views/NN-*.phtml        as páginas: prosa + chamadas a fre_demo()
├── demos/                  uma config PHP por demonstração
├── lib/
│   ├── paginas.php         o índice (hub, navegação, títulos)
│   ├── pagina.php          layout + fre_demo()
│   └── form_builder.php    ponte fina para os nomes fre_* (o gerador é do pacote)
└── assets/
    ├── demo.css            design system (claymorfismo) + CONTRATO VISUAL da engine
    ├── demo.js             painéis de log e de estado, toast
    └── jquery-shim.js      substituto mínimo de jQuery, só para os exemplos
```

O gerador **não mora aqui**. Ele é do pacote:

```
src/php/FormRenderer.php        renderForm() · renderScripts() · pluginsUsados()
src/php/templates/form.phtml    o template, separado da lógica
src/php/FormRuleCompiler.php    a tradução config de regra → data-*-when
```

`lib/form_builder.php` é só uma ponte que mantém os nomes `fre_*` que as páginas
já usavam. Código novo deve chamar `FormRenderer::` direto.

### Os dois usos de `.phtml`, e por que nenhum é URL

Há `.phtml` em dois lugares, com papéis diferentes:

| Arquivo | Papel |
|---|---|
| `src/php/templates/form.phtml` | **Template de geração.** Recebe a config e emite o `<form>`. É o único lugar com marcação de formulário, trocar a aparência dos campos é mexer só aqui. |
| `examples/views/NN-*.phtml` | **Views de página.** Prosa (que é HTML estático) mais um punhado de chamadas a `fre_demo()`. |

Nenhum dos dois é requisitado diretamente, por duas razões que apontam para o
mesmo desenho. `php -S` só executa `.php`, então um `.phtml` pedido pela URL
sairia como texto; e no projeto de origem `.phtml` sempre foi *view partial*
renderizada por um controller. Então `index.php` roteia, `views/*.phtml`
renderizam, e `FormRenderer` inclui o template dele.

O que **não** existe mais é `.phtml` com formulário escrito à mão: essa era a
duplicação que o gerador eliminou.

### `assets/demo.css`

O bloco no fim do arquivo, marcado **CONTRATO VISUAL**, é o único pedaço que
importa para o seu projeto: são as classes que a engine realmente aplica
(`form-rule-hidden`, `ilu-form-label--required`, `form-rule-invalid`, o stepper do
wizard, o painel de senha…). Copie esse bloco e mapeie para o seu design system.
O resto é a estética destes exemplos.

Atenção a `.ilu-form-compact__grid` e `.ilu-form-compact__field`: esses dois nomes
**não** são decorativos. O plugin `password` procura o primeiro para inserir o
painel em largura cheia, e o `sequence` procura o segundo para marcar o campo
inteiro como travado.

### `assets/jquery-shim.js`

Não faz parte da engine. 12 dos 27 plugins usam jQuery; para os exemplos rodarem
sem baixar nada, há um substituto mínimo: `$(el).on/off/trigger`, `$.ajax` sobre
`fetch()`, uma máscara simples. Ele é carregado **só nas páginas que precisam**
(a lista sai dos plugins que a config exige) e não sobrescreve `window.jQuery` se
ele já existir.

**No seu projeto, carregue o jQuery de verdade.**

## Achados ao escrever estes exemplos

Cinco defeitos foram encontrados escrevendo esta documentação, todos de falha
**silenciosa**: a regra não disparava e nada aparecia no console. Os cinco estão
corrigidos, e cobertos em `tests/falhas-silenciosas.js`.

| Era | Virou |
|---|---|
| `trigger_when` lançava `TypeError` e o evento nunca chegava ao alvo | o alvo é resolvido por `form.querySelector('[name=…]')` |
| checkbox sem `value` lia `"on"`, e `{"Aceite":"S"}` era sempre falso | sem o atributo, marcado lê `"S"` |
| `label_when` em lista virava `{"AND":[…]}` e o rótulo nunca mudava | é regra-objeto no compilador, e chega como lista |
| `fetch_when` com `event: 'load'` nunca carregava, barrado por `skip_empty` | `load` é tratado como `dependency` |
| regra declarada como `[]` era descartada, porque `empty([])` é `true` | a checagem é de presença da chave |

E mais dois que já estavam no roadmap:

| Era | Virou |
|---|---|
| pertinência com **exatamente** dois valores compilava para um operador inexistente | o par posicional só é reconhecido quando o primeiro elemento é operador |
| `in`/`not_in` passavam pelo compilador e viravam `false` no runtime | implementados no `evaluateCondition` |

O que **não** dava para corrigir, virou aviso. `FormRuleEngine.debug = true` (ou
`data-form-debug="true"` no formulário) liga o `diagnose()`, que acusa regra
pendurada no `<input>`, campo citado que não existe, condição com mais de uma
chave e JSON inválido. A [referência](index.php?p=99-referencia) tem a lista do
que ainda exige atenção.
