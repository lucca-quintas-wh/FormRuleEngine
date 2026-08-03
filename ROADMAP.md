# Roadmap

Ordem proposta para transformar a extração verbatim em pacote consumível.
Cada etapa é independentemente útil — dá para parar em qualquer ponto.

## 1. Rede de segurança (antes de qualquer refactor)

São ~5.200 linhas sem nenhum teste. Hoje a validação é abrir uma tela do CRM de
origem; num pacote público isso não existe, e sem isso ninguém adota.

- [x] Harness mínimo em jsdom (`tests/smoke.js`, `npm test`) — 15 asserções sobre
      `visible` / `required` / `disabled` / `computed`, incluindo condição composta
      `AND` + array + operador, e o encadeamento computed → disabled. Prova que o
      núcleo roda fora do projeto de origem sem jQuery.
- [ ] Migrar para vitest e um caso por plugin, começando pelos 22 sem acoplamento
      (não precisam de mock).
- [ ] Testes da DSL de condição: operadores, `eq_field`/`neq_field`, `regex`,
      arrays, `AND`/`OR` aninhado, `form_param_*`.

## 1b. Arestas já identificadas

- [ ] **`findInput()` ignora o próprio elemento.** `required_when`/`disabled_when`
      e afins num `<input>` direto falham em silêncio (ver README, "Armadilha do
      wrapper"). Correção: se o elemento já casa com `input, select, textarea`,
      devolvê-lo. Baixo risco — hoje esse caso é no-op, então tolerá-lo não muda
      comportamento existente. **Precisa de teste antes**, porque o gerador PHP
      da origem depende do caminho do wrapper.
- [ ] **Só a primeira chave do objeto de condição é avaliada.** `{"A":"1","B":"2"}`
      ignora `B` silenciosamente. Decidir entre tratar como `AND` implícito
      (mudança de comportamento) ou avisar no console em modo dev.

**Por que primeiro:** todo item abaixo é mudança de comportamento. Sem teste, não
há como distinguir "extraí" de "quebrei".

## 2. Host adapter

Fechar a fronteira descrita no README.

- [ ] Definir a interface: `confirm()`, `toast()`, `submit()`, `refresh()`, `closePanel()`.
- [ ] Implementação padrão em vanilla (`confirm()` nativo, toast mínimo, `fetch()`).
- [ ] Migrar `behavior`, `submit-handler`, `sequence`, `dynamic-table`, `revert`
      para consumir o adapter em vez de citar `DrawerService`/`Swal`/`refreshMutationTarget`.
- [ ] Adapter do CRM de origem, injetando o shell existente.

**Critério de pronto:** `grep -rE 'DrawerService|refreshMutationTarget|openLinkDiv' src/`
não retorna nada.

## 3. O CRM de origem passa a consumir o pacote

O passo que decide se o projeto sobrevive. Enquanto o CRM mantiver a própria cópia
em `layout/js/plugins/`, as duas versões divergem e o repo público morre.

- [ ] Apontar o `form-builder.phtml` para os arquivos do pacote.
- [ ] Remover as cópias da origem.

## 4. Empacotamento

- [ ] Build (ESM + UMD + IIFE) — o alvo é legado com `<script src>`, então a
      build IIFE não é opcional.
- [ ] `package.json`, publicação npm, versionamento semântico.
- [ ] Manter os globais (`window.FormRuleEngine`) na build IIFE por compatibilidade.

## 5. Internacionalização

As mensagens de erro estão em português, embutidas. Extrair para um dicionário
substituível, com `pt-BR` e `en` de origem.

## 6. Remover jQuery

Último porque é o mais invasivo e o menos urgente: o público-alvo (legado) quase
sempre já tem jQuery na página. O uso é raso — `$(el)`, `.on`, `$.ajax` — mas
está em 12 plugins.

---

## Pendências que não são código

- [ ] **Titularidade.** A engine foi escrita dentro do repositório de um produto
      de empresa. O `LICENSE` está com o titular em branco de propósito —
      preencher exige uma decisão que não é técnica, e publicar é irreversível.
- [ ] **Nome.** `FormRuleEngine` é descritivo mas genérico; verificar disponibilidade
      no npm antes de fixar.
