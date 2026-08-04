<?php
/**
 * Layout e helper de demonstração.
 *
 * A ideia do port: cada exemplo desta documentação é uma CONFIGURAÇÃO PHP
 * (`demos/*.php`), não HTML escrito à mão. A página mostra as três camadas:
 *
 *   1. o formulário funcionando  ← gerado pelo FormRenderer
 *   2. a config PHP que o gerou  ← o fonte do arquivo, lido do disco
 *   3. o HTML gerado             ← a saída de FormRenderer::renderForm()
 *
 * Como as três vêm da MESMA fonte, elas não podem divergir. Era a propriedade
 * que a versão em HTML garantia clonando um <template>, e aqui fica mais forte,
 * porque a fonte agora é a config, e não o markup.
 */

require_once __DIR__ . '/form_builder.php';

/** Configs renderizadas nesta página; decide quais plugins carregar no rodapé. */
$GLOBALS['fre_demos_da_pagina'] = [];

/**
 * Renderiza um demo.
 *
 * @param string $slug   arquivo em demos/ (sem .php)
 * @param array  $opcoes 'aberto' => abre o <details> da config
 *                       'titulo_config' / 'titulo_html' => rótulos dos <details>
 */
function fre_demo(string $slug, array $opcoes = []): string
{
    $arquivo = __DIR__ . '/../demos/' . $slug . '.php';
    if (!is_file($arquivo)) {
        return '<div class="warn"><p>Demo não encontrado: <code>' . fre_e($slug) . '</code></p></div>';
    }

    $config = require $arquivo;
    $GLOBALS['fre_demos_da_pagina'][] = $config;

    $html = fre_render_form($config);

    $fonte = file_get_contents($arquivo);
    // O cabeçalho `<?php` e o comentário de topo não acrescentam nada na página:
    // o que interessa é o array. Cortamos até o `return [`.
    $corte = strpos($fonte, 'return [');
    if ($corte !== false) {
        $fonte = substr($fonte, $corte);
    }

    ob_start(); ?>
<div class="demo">
  <div class="demo-live"><?= $html ?></div>

  <details class="demo-code"<?= !empty($opcoes['aberto']) ? ' open' : '' ?>>
    <summary><?= fre_e($opcoes['titulo_config'] ?? 'A config PHP: demos/' . $slug . '.php') ?></summary>
    <pre><code><?= fre_e($fonte) ?></code></pre>
  </details>

  <details class="demo-code">
    <summary><?= fre_e($opcoes['titulo_html'] ?? 'O HTML compilado') ?></summary>
    <pre><code><?= fre_e($html) ?></code></pre>
  </details>
</div>
<?php
    return ob_get_clean();
}

/** Renderiza um demo já como array (para casos que a página monta na hora). */
function fre_demo_inline(array $config, string $rotulo = 'A config PHP'): string
{
    $GLOBALS['fre_demos_da_pagina'][] = $config;
    $html = fre_render_form($config);

    ob_start(); ?>
<div class="demo">
  <div class="demo-live"><?= $html ?></div>
  <details class="demo-code">
    <summary><?= fre_e($rotulo) ?></summary>
    <pre><code><?= fre_e(var_export($config, true)) ?></code></pre>
  </details>
  <details class="demo-code">
    <summary>O HTML compilado</summary>
    <pre><code><?= fre_e($html) ?></code></pre>
  </details>
</div>
<?php
    return ob_get_clean();
}

/** Cabeçalho da página, com a navegação anterior/próximo derivada do índice. */
function fre_pagina_inicio(string $slug): void
{
    $indice  = require __DIR__ . '/paginas.php';
    $paginas = $indice['paginas'];
    $meta    = $paginas[$slug] ?? ['titulo' => $slug, 'n' => '', 'attrs' => ''];

    $slugs   = array_keys($paginas);
    $pos     = array_search($slug, $slugs, true);
    $anterior = $pos > 0 ? $slugs[$pos - 1] : null;
    $proxima  = ($pos !== false && $pos < count($slugs) - 1) ? $slugs[$pos + 1] : null;
    ?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= fre_e($meta['n'] . ' · ' . $meta['titulo']) ?> · Form Rule Engine</title>
<link rel="stylesheet" href="assets/demo.css">
</head>
<body>
<div class="wrap">

  <div class="topbar">
    <a href="./">← Índice</a>
    <span class="sep">/</span>
    <span><?= fre_e($meta['n'] . ' · ' . $meta['titulo']) ?></span>
    <span class="spacer"></span>
    <?php if ($anterior): ?>
      <a href="?p=<?= urlencode($anterior) ?>">← <?= fre_e($paginas[$anterior]['n']) ?></a>
    <?php endif; ?>
    <?php if ($proxima): ?>
      <a href="?p=<?= urlencode($proxima) ?>">Próximo →</a>
    <?php endif; ?>
  </div>
<?php
}

/**
 * Rodapé: painéis auxiliares e as tags <script> na ordem certa.
 *
 * A lista de plugins sai das configs renderizadas na página, o mesmo cálculo
 * que um controller faria para não mandar ao navegador o que a tela não usa.
 *
 * @param array $opcoes 'form_estado' => nome do form a espelhar no painel
 *                      'sem_paineis' => true em páginas só de texto
 *                      'script'      => JS extra da página
 */
function fre_pagina_fim(array $opcoes = []): void
{
    $demos = $GLOBALS['fre_demos_da_pagina'];

    // União dos plugins de todas as configs da página.
    $plugins = [];
    foreach ($demos as $config) {
        foreach (fre_plugins_usados($config) as $plugin) {
            $plugins[$plugin] = true;
        }
    }
    $plugins = array_keys($plugins);

    // Estes plugins falam com jQuery; se algum estiver na página, o substituto
    // mínimo precisa estar carregado antes do núcleo.
    $comJquery = ['fetch', 'populate', 'remote-validate', 'mask', 'copy',
                  'revert', 'trigger', 'dynamic-table', 'password',
                  'behavior', 'submit-handler'];
    $precisaJquery = (bool) array_intersect($plugins, $comJquery);

    if (!empty($opcoes['sem_paineis'])) {
        echo '</div>';
    } else {
        ?>
  <div class="panels">
    <div data-demo-log></div>
    <div data-demo-state></div>
  </div>
</div>
        <?php
    }
    ?>

<script src="assets/demo.js"></script>
<?php if ($precisaJquery): ?>
<!-- Substituto mínimo de jQuery: no seu projeto, carregue o jQuery de verdade. -->
<script src="assets/jquery-shim.js"></script>
<?php endif; ?>

<script src="../src/form-rule-engine.js"></script>
<script src="../src/plugins/form-rule-base.js"></script>
<?php foreach ($plugins as $plugin): ?>
<script src="../src/plugins/form-rule-<?= fre_e($plugin) ?>.js"></script>
<?php endforeach; ?>
<script src="../src/form-visibility-v2.js"></script>

<script>
  Demo.installMessaging();
<?php if (!empty($opcoes['form_estado'])): ?>
  Demo.state('form[name="<?= fre_e($opcoes['form_estado']) ?>"]');
  Demo.watchEngineEvents('form[name="<?= fre_e($opcoes['form_estado']) ?>"]');
<?php endif; ?>
</script>
<?= $opcoes['script'] ?? '' ?>
</body>
</html>
<?php
}
