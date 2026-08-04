<?php
/**
 * Front controller dos exemplos.
 *
 * Sem `?p=`, mostra o índice. Com, inclui a view correspondente.
 *
 * Por que um controller em vez de abrir `01-visibilidade.phtml` direto: o
 * servidor embutido do PHP (`php -S`) só executa `.php` — um `.phtml` requisitado
 * diretamente sairia como texto. E, no projeto de origem, `.phtml` sempre foi
 * *view partial* renderizada por um controller, nunca ponto de entrada. As duas
 * razões apontam para o mesmo desenho.
 *
 *   php -S localhost:8000 -t .
 *   http://localhost:8000/examples/
 */

require_once __DIR__ . '/lib/pagina.php';

$indice  = require __DIR__ . '/lib/paginas.php';
$paginas = $indice['paginas'];
$slug    = $_GET['p'] ?? null;

if ($slug !== null) {
    $view = __DIR__ . '/views/' . basename((string) $slug) . '.phtml';
    if (isset($paginas[$slug]) && is_file($view)) {
        include $view;
        exit;
    }
    http_response_code(404);
}
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Form Rule Engine — exemplos</title>
<link rel="stylesheet" href="assets/demo.css">
</head>
<body>
<div class="wrap">

  <div class="topbar">
    <strong>Form Rule Engine</strong>
    <span class="sep">/</span>
    <span>exemplos</span>
    <span class="spacer"></span>
    <a href="?p=99-referencia">Referência completa</a>
  </div>

  <h1>Exemplos</h1>
  <p class="lead">
    Uma página por assunto, cada uma rodando de verdade no navegador. Nenhum
    exemplo é HTML escrito à mão: cada um é uma <strong>configuração PHP</strong>
    compilada pelo <code>FormRuleCompiler</code> — e a página mostra as três
    camadas lado a lado, a config, o HTML compilado e o formulário funcionando.
  </p>

  <?php if ($slug !== null): ?>
    <div class="warn"><p>Página não encontrada: <code><?= fre_e($slug) ?></code></p></div>
  <?php endif; ?>

  <div class="note">
    <p><strong>Como rodar</strong>, a partir da raiz do repositório:</p>
    <pre><code>php -S localhost:8000 -t .
# depois: http://localhost:8000/examples/</code></pre>
    <p>
      Não há dependências, nem Composer, nem banco — o backend dos exemplos é um
      único <code>api.php</code> com arrays em memória.
    </p>
  </div>

<?php foreach ($indice['grupos'] as $chaveGrupo => $tituloGrupo): ?>
  <h2><?= fre_e($tituloGrupo) ?></h2>
  <div class="cards">
    <?php foreach ($paginas as $chave => $meta): ?>
      <?php if ($meta['grupo'] !== $chaveGrupo) continue; ?>
      <a class="card" href="?p=<?= urlencode($chave) ?>">
        <span class="n"><?= fre_e($meta['n']) ?></span>
        <span class="t"><?= fre_e($meta['titulo']) ?></span>
        <span class="d"><?= $meta['resumo'] ?></span>
        <span class="attrs"><?= fre_e($meta['attrs']) ?></span>
      </a>
    <?php endforeach; ?>
  </div>
<?php endforeach; ?>

  <h2>Como isto está montado</h2>
  <p>
    A engine não sabe que existe PHP: ela lê atributos HTML. O que existe do lado
    do servidor é um <strong>compilador</strong> — configuração declarativa entra,
    <code>data-*-when</code> sai. Cada demo desta documentação passa por ele:
  </p>
  <pre><code>demos/01-basico.php          ← a config que você escreve
        ↓  FormRuleCompiler::atributos()
&lt;div data-visible-when='{"TipoPessoa":"F"}'&gt;   ← o atributo compilado
        ↓  form-visibility-v2.js
o campo aparece e some sozinho                ← o runtime</code></pre>

  <div class="table-scroll">
    <table>
      <tr><th>Arquivo</th><th>Papel</th></tr>
      <tr><td><code>src/php/FormRuleCompiler.php</code></td><td>O interpretador. Traduz as formas idiomáticas de PHP para a forma canônica da DSL. É do pacote, não desta pasta.</td></tr>
      <tr><td><code>examples/views/form-builder.phtml</code></td><td>O emissor de markup: config → <code>&lt;form&gt;</code>, seções, campos, botões.</td></tr>
      <tr><td><code>examples/demos/*.php</code></td><td>Uma config por demonstração.</td></tr>
      <tr><td><code>examples/views/*.phtml</code></td><td>As páginas: prosa + chamadas a <code>fre_demo()</code>.</td></tr>
      <tr><td><code>examples/api.php</code></td><td>O backend: CEP, cascata, validação remota, política de senha.</td></tr>
    </table>
  </div>

  <h2>Três coisas para saber antes de começar</h2>

  <h3>1. Ordem de carregamento</h3>
  <p>
    Núcleo, depois os plugins que você usa, e o bootstrap <strong>por último</strong>.
    O bootstrap registra só os plugins que encontrar carregados — plugin ausente é
    ignorado em silêncio, então você paga apenas pelo que usa. Nestas páginas a
    lista sai de <code>fre_plugins_usados()</code>, calculada a partir das configs
    renderizadas: é o que um controller de verdade faria.
  </p>

  <h3>2. O formulário precisa se declarar</h3>
  <p>
    O bootstrap só olha para <code>form[data-form-visibility="true"]</code>. Sem esse
    atributo nada acontece, e não há aviso.
  </p>

  <h3>3. Comparação é de string</h3>
  <p>
    O valor de um campo é sempre string. <code>{"Quantidade": 1}</code> é falso quando
    o input contém <code>"1"</code> — escreva <code>{"Quantidade": "1"}</code>. Os
    comparadores numéricos (<code>&gt;</code>, <code>&lt;</code>, <code>&gt;=</code>,
    <code>&lt;=</code>) são exceção: passam por <code>parseFloat</code>.
  </p>

  <div class="warn">
    <p>
      <strong>Nota de honestidade.</strong> 12 dos 27 plugins usam jQuery. Para os
      exemplos rodarem sem baixar nada, esta pasta traz um
      <em>substituto mínimo</em> em <code>assets/jquery-shim.js</code>, carregado
      só nas páginas que precisam. Ele não faz parte da engine — no seu projeto,
      carregue o jQuery de verdade.
    </p>
  </div>

</div>
<script src="assets/demo.js"></script>
</body>
</html>
