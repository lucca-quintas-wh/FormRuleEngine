# Exemplos

Documentação executável da Form Rule Engine. Uma página por assunto, cada uma
rodando de verdade no navegador.

Nenhum exemplo é HTML escrito à mão: cada um é uma **configuração PHP** em
`demos/`, compilada pelo [`FormRuleCompiler`](../src/php/FormRuleCompiler.php).
Cada página mostra as três camadas lado a lado — a config, o HTML compilado, e o
formulário funcionando. Como as três saem da mesma fonte, não podem divergir.

```
demos/01-basico.php          ← a config que você escreve
        ↓  FormRuleCompiler::atributos()
<div data-visible-when='{"TipoPessoa":"F"}'>   ← o atributo compilado
        ↓  form-visibility-v2.js
o campo aparece e some sozinho                 ← o runtime
```

## Como rodar

A partir da **raiz do repositório**:

```bash
php -S localhost:8000 -t .
# http://localhost:8000/examples/
```

PHP 8.0+. Não há dependências, nem Composer, nem banco — o backend dos exemplos
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
├── views/
│   ├── form-builder.phtml  o emissor: config → <form>, seções, campos, botões
│   └── NN-*.phtml          as páginas: prosa + chamadas a fre_demo()
├── demos/                  uma config PHP por demonstração
├── lib/
│   ├── paginas.php         o índice (hub, navegação, títulos)
│   ├── pagina.php          layout + fre_demo()
│   └── form_builder.php    helpers de markup e mapa regra → plugin
└── assets/
    ├── demo.css            design system (claymorfismo) + CONTRATO VISUAL da engine
    ├── demo.js             painéis de log e de estado, toast
    └── jquery-shim.js      substituto mínimo de jQuery — só para os exemplos
```

### Por que `.phtml` não é ponto de entrada

O servidor embutido do PHP (`php -S`) só executa `.php` — um `.phtml` requisitado
diretamente sairia como texto. E, no projeto de origem, `.phtml` sempre foi *view
partial* renderizada por um controller, nunca URL. As duas razões apontam para o
mesmo desenho: `index.php` roteia, `views/*.phtml` renderizam.

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
sem baixar nada, há um substituto mínimo — `$(el).on/off/trigger`, `$.ajax` sobre
`fetch()`, uma máscara simples. Ele é carregado **só nas páginas que precisam**
(a lista sai dos plugins que a config exige) e não sobrescreve `window.jQuery` se
ele já existir.

**No seu projeto, carregue o jQuery de verdade.**

## Achados ao escrever estes exemplos

Cinco defeitos confirmados empiricamente, todos de falha **silenciosa** — a regra
não dispara e nada aparece no console. Estão no [ROADMAP](../ROADMAP.md) e
detalhados nas páginas indicadas; a [referência](index.php?p=99-referencia) reúne estes e
mais treze tropeços numa tabela de sintoma → causa → conserto.

1. **`trigger_when` não funciona.** Em `src/plugins/form-rule-trigger.js:49` o alvo
   é resolvido com `findInput(targetField)`, mas `targetField` é o *nome* do campo
   (string) e `findInput()` espera um elemento do DOM →
   `TypeError: element.querySelector is not a function` dentro do handler.
   Conserto de uma linha; alternativa que funciona hoje na página 11.

2. **Checkbox sem `value` explícito.** `getFieldValue()` faz
   `field.checked ? (field.value || 'S') : 'N'`, mas o HTML já define `"on"` como
   valor padrão — então `{"Aceite":"S"}` é sempre falso. O emissor escreve o
   `value` sempre, que é por que a armadilha não aparece gerando do servidor.

3. **`label_when` em forma de lista é mal compilado**: lista sequencial vira
   `{"AND":[…]}` e o plugin `label` deixa de reconhecer o formato. Mesma família
   da pertinência com dois valores. `lib/form_builder.php` contorna, com o motivo
   escrito no comentário.

4. **`fetch_when` com `event: 'load'` precisa de `skip_empty: false`** — senão o
   guarda de valor vazio aborta o carregamento inicial do combo.

5. **Regra declarada como array vazio é descartada.** `empty([])` é verdadeiro em
   PHP, e tanto o emissor quanto o compilador pulam a chave com `empty()`.
