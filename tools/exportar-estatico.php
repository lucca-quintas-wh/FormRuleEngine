<?php
/**
 * Exporta a documentação para HTML estático, para publicar no GitHub Pages.
 *
 *     php tools/exportar-estatico.php [destino]      # padrão: dist/
 *
 * O GitHub Pages serve arquivos e não executa PHP, então três coisas mudam em
 * relação ao `php -S`:
 *
 *   1. as URLs `?p=slug` viram arquivos `slug.html`, e os links são reescritos;
 *   2. o runtime (`src/`) é copiado para dentro do destino, porque `../src/`
 *      apontaria para fora da raiz publicada;
 *   3. o `api.php` é substituído por `assets/mock-api.js`, que responde as
 *      mesmas rotas com os mesmos dados.
 *
 * O que se perde: o backend deixa de ser real. É o preço de publicar de graça, e
 * está dito na página. Rodando localmente com `php -S`, continua tudo de pé.
 */

$raiz    = dirname(__DIR__);
$destino = $argv[1] ?? ($raiz . '/dist');

require_once $raiz . '/examples/lib/pagina.php';
$indice  = require $raiz . '/examples/lib/paginas.php';
$paginas = array_keys($indice['paginas']);

/* Os casos completos são a única página com um segundo parâmetro. */
$casos = ['cadastro', 'endereco', 'cotacao', 'wizard'];

/** Nome do arquivo estático de uma página. */
function arquivoDe(string $slug, ?string $caso = null): string
{
    return $caso ? "17-casos-completos-$caso.html" : "$slug.html";
}

/** Roda o front controller e captura a saída. */
function renderizar(string $raiz, array $query): string
{
    $_GET = $query;
    $_SERVER['QUERY_STRING'] = http_build_query($query);
    $GLOBALS['fre_demos_da_pagina'] = [];

    ob_start();
    include $raiz . '/examples/index.php';
    return ob_get_clean();
}

/**
 * Reescreve o HTML para viver num diretório plano de arquivos.
 */
function ajustar(string $html, array $casos): string
{
    // ?p=17-casos-completos&caso=X  →  17-casos-completos-X.html
    foreach ($casos as $caso) {
        $html = str_replace(
            ['?p=17-casos-completos&amp;caso=' . $caso, '?p=17-casos-completos&caso=' . $caso],
            '17-casos-completos-' . $caso . '.html',
            $html
        );
    }

    // ?p=slug  →  slug.html
    $html = preg_replace('/\?p=([a-z0-9\-]+)/', '$1.html', $html);

    // href="./" (o "voltar ao índice") → index.html
    $html = str_replace('href="./"', 'href="index.html"', $html);

    // ../src/…  →  src/…   (o runtime é copiado para dentro do destino)
    $html = str_replace('"../src/', '"src/', $html);

    // No hub, troca as instruções de "como rodar" pelo aviso da build estática.
    $html = str_replace(
        '<p><strong>Como rodar</strong>, a partir da raiz do repositório:</p>',
        '<p><strong>Esta é a versão publicada</strong>, exportada para arquivos '
        . 'estáticos. Tudo funciona, mas o backend é simulado em JavaScript '
        . '(<code>assets/mock-api.js</code>), porque o GitHub Pages não executa '
        . 'PHP. Para ver a documentação com o backend de verdade, clone o '
        . 'repositório e rode:</p>',
        $html
    );
    $html = str_replace(
        'Não há dependências, nem Composer, nem banco: o backend dos exemplos é um',
        'As respostas são as mesmas nos dois modos, e um teste compara as duas '
        . '(<code>tests/mock-vs-api.js</code>). Localmente, o backend dos exemplos é um',
        $html
    );

    // o substituto do api.php entra antes de tudo que faz AJAX
    $html = str_replace(
        '<script src="assets/demo.js"></script>',
        '<script src="assets/mock-api.js"></script>' . "\n" . '<script src="assets/demo.js"></script>',
        $html
    );

    return $html;
}

/** Copia um diretório inteiro. */
function copiarDir(string $de, string $para): int
{
    @mkdir($para, 0777, true);
    $n = 0;
    $itens = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($de, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    foreach ($itens as $item) {
        $alvo = $para . '/' . $itens->getSubPathName();
        if ($item->isDir()) {
            @mkdir($alvo, 0777, true);
        } else {
            copy($item->getPathname(), $alvo);
            $n++;
        }
    }
    return $n;
}

/* ── execução ──────────────────────────────────────────────────────────── */

@mkdir($destino, 0777, true);

$gerados = 0;
foreach ($paginas as $slug) {
    $html = ajustar(renderizar($raiz, ['p' => $slug]), $casos);
    file_put_contents("$destino/" . arquivoDe($slug), $html);
    $gerados++;
}

// o hub, sem ?p=
$html = ajustar(renderizar($raiz, []), $casos);
file_put_contents("$destino/index.html", $html);
$gerados++;

// os quatro casos completos
foreach ($casos as $caso) {
    $html = ajustar(renderizar($raiz, ['p' => '17-casos-completos', 'caso' => $caso]), $casos);
    file_put_contents("$destino/" . arquivoDe('17-casos-completos', $caso), $html);
    $gerados++;
}

$assets  = copiarDir($raiz . '/examples/assets', "$destino/assets");
$runtime = copiarDir($raiz . '/src', "$destino/src");

// Sem isto o Pages roda Jekyll e ignora arquivos e pastas iniciados por "_".
file_put_contents("$destino/.nojekyll", '');

// Uma página 404 que ao menos devolve o leitor ao índice.
file_put_contents("$destino/404.html", str_replace(
    '<h1>Exemplos</h1>',
    '<h1>Página não encontrada</h1><p class="lead">O endereço não existe nesta documentação. Abaixo, tudo o que existe.</p>',
    file_get_contents("$destino/index.html")
));

printf("%d páginas, %d assets, %d arquivos de runtime em %s\n",
    $gerados, $assets, $runtime, $destino);
