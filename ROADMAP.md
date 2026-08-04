# Roadmap

Ordem proposta para transformar a extração verbatim em pacote consumível.
Cada etapa é independentemente útil, dá para parar em qualquer ponto.

## 1. Rede de segurança (antes de qualquer refactor)

São ~5.200 linhas sem nenhum teste. Hoje a validação é abrir uma tela do CRM de
origem; num pacote público isso não existe, e sem isso ninguém adota.

- [x] Harness mínimo em jsdom (`tests/smoke.js`, `npm test`), 15 asserções sobre
      `visible` / `required` / `disabled` / `computed`, incluindo condição composta
      `AND` + array + operador, e o encadeamento computed → disabled. Prova que o
      núcleo roda fora do projeto de origem sem jQuery.
- [ ] Migrar para vitest e um caso por plugin, começando pelos 22 sem acoplamento
      (não precisam de mock).
- [ ] Testes da DSL de condição: operadores, `eq_field`/`neq_field`, `regex`,
      arrays, `AND`/`OR` aninhado, `form_param_*`.

## 1b. Arestas já identificadas ✅

Todas fechadas. Cada uma falhava em **silêncio**, que é o que as tornava caras:
a regra não disparava e não havia por onde começar a procurar. Estão cobertas em
`tests/falhas-silenciosas.js`.

- [x] **Pertinência com 2 valores era mal compilada.** `['Uf' => ['SP','RJ']]`
      colidia com o par posicional `[operador, valor]` e virava
      `{"Uf":{"sp":"RJ"}}`, condição eternamente falsa. Corrigido como a própria
      proposta descrevia: o ramo de 2 elementos só trata como par posicional
      quando o primeiro elemento É um operador conhecido. `['!=', '']` continua
      funcionando (é a forma usada em `LocalEntregaCTL:356`), e `['SP','RJ']`
      passa a ser lista. Os dois casos estão fixados em `tests/cross-php-js.js`.

- [x] **Não existia operador `in`/`not_in` no runtime**, embora o compilador os
      deixasse passar. Implementados no `switch` do `evaluateCondition` e
      reconhecidos pelo compilador.

- [x] **`findInput()` ignora o próprio elemento.** A tolerância no `findInput()`
      continua pendente por ser mudança de comportamento, mas o silêncio acabou:
      `engine.diagnose()` acusa a regra pendurada no input, com o nome do campo e
      a instrução de mover para o wrapper.

- [x] **Só a primeira chave do objeto de condição é avaliada.** O comportamento
      não mudou, a decisão de tratar como `AND` implícito segue em aberto. Mas
      agora avisa dos dois lados: `FormRuleCompiler::avisos()` na compilação e
      `diagnose()` no runtime.

- [x] **`trigger_when` estava quebrado.** `findInput()` recebia o nome do campo
      (string) onde esperava um elemento, e o `TypeError` subia dentro do handler.
      Corrigido para `form.querySelector('[name=…]')`.

- [x] **`data-submit-handler` nunca era lido.** O gerador emite
      `data-submit-handler-when`, que é o que o `registerPlugin` procura.

- [x] **Checkbox sem `value` explícito quebrava a condição.** O HTML define
      `"on"` como padrão, então o fallback `|| 'S'` nunca acontecia. Agora, sem o
      atributo `value`, marcado lê `"S"`; com o atributo, o valor declarado manda.

- [x] **`label_when` em forma de lista era mal compilado.** Movido para
      `REGRAS_OBJETO`: a lista chega ao plugin como lista. Divergência deliberada
      do trait de origem, fixada em `tests/paridade-php.php`.

- [x] **`fetch_when` com `event: 'load'` nunca carregava.** O guarda `skip_empty`
      barrava a requisição porque o valor do próprio campo estava vazio, e num
      combo que ainda vai ser preenchido ele está sempre vazio. `load` passou a
      ser tratado como `dependency`: o valor do campo é irrelevante.

- [x] **Regra declarada como array vazio era descartada.** `empty([])` é
      verdadeiro em PHP. A checagem passou a ser de presença da chave.

**Por que primeiro:** todo item abaixo é mudança de comportamento. Sem teste, não
há como distinguir "extraí" de "quebrei".

## 2. Host adapter ✅

- [x] Interface definida: `confirm()`, `toast()`, `submit()`, `refresh()`,
      `closePanel()`, `openPanel()`, `navigate()`, `loadInto()`.
- [x] Implementação padrão em `FormRuleEngine.host`: usa SweetAlert2 e as globais
      do host **quando existem**, e cai em `window.confirm` / `fetch()` / eventos
      de DOM quando não existem. O CRM de origem não muda; quem não o tem passa a
      ter confirmação, mensagem e envio funcionando.
- [x] `behavior`, `submit-handler`, `sequence` e `dynamic-table` consomem o
      adaptador.
- [x] O adapter do CRM de origem é o próprio padrão: ele detecta as globais.

**Critério de pronto:** atingido. `grep -rE 'DrawerService|refreshMutationTarget|openLinkDiv' src/plugins/`
não retorna nada; os nomes existem só no adaptador, que é o arquivo cujo trabalho
é nomeá-los.

Faltou: `prevent_submit_when` dependia de `window.sendForm` para bloquear
qualquer coisa. Agora o núcleo instala um listener de `submit` nativo, e
`engine.validateBeforeSubmit()` é público.

## 3. O CRM de origem passa a consumir o pacote

O passo que decide se o projeto sobrevive. Enquanto o CRM mantiver a própria cópia
em `layout/js/plugins/`, as duas versões divergem e o repo público morre.

- [ ] Apontar o `form-builder.phtml` para os arquivos do pacote.
- [ ] Remover as cópias da origem.

## 4. Empacotamento

- [ ] Build (ESM + UMD + IIFE): o alvo é legado com `<script src>`, então a
      build IIFE não é opcional.
- [ ] `package.json`, publicação npm, versionamento semântico.
- [ ] Manter os globais (`window.FormRuleEngine`) na build IIFE por compatibilidade.

## 5. Internacionalização ✅

- [x] Dicionário em `FormRuleEngine.i18n`, com `pt-BR` (padrão) e `en`.
      `FormRuleEngine.t('chave', {n: 3})` interpola parâmetros.
- [x] Textos de usuário roteados pelo dicionário: botões do wizard, campo
      obrigatório, validação remota, critérios de senha, confirmações.
- [x] Identificadores internos renomeados para inglês (`faixasDoCampo` virou
      `bandsFromField`, `esvaziarDestinos` virou `clearTargets`, e assim por
      diante). São métodos privados: nada disso aparece na config nem nos
      atributos.

Falta: a documentação e os comentários continuam em português. É uma decisão de
público-alvo, não uma pendência técnica.

## 6. Remover jQuery

Último porque é o mais invasivo e o menos urgente: o público-alvo (legado) quase
sempre já tem jQuery na página. O uso é raso (`$(el)`, `.on`, `$.ajax`) mas
está em 12 plugins.

---

## Pendências que não são código

- [x] **Titularidade.** Resolvida: MIT, titular Lucca Quintas. A engine nasceu
      dentro do repositório de um produto de empresa, então quem for adotá-la em
      contexto corporativo pode querer confirmar a cadeia de direitos antes; o
      texto da licença, porém, já concede uso, cópia, modificação e redistribuição
      sem restrição.
- [ ] **Nome.** `FormRuleEngine` é descritivo mas genérico; verificar disponibilidade
      no npm antes de fixar.
