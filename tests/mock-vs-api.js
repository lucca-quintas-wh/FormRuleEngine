/**
 * O substituto estático responde o mesmo que o backend de verdade?
 *
 * A documentação roda de dois jeitos: com `php -S`, quem atende é o `api.php`;
 * publicada no GitHub Pages, quem atende é o `assets/mock-api.js`. Se os dois
 * divergirem, a versão publicada passa a documentar um contrato que não existe,
 * e ninguém percebe, porque as duas continuam "funcionando".
 *
 * Este teste chama as duas e compara.
 */
const { JSDOM } = require('jsdom');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

let falhas = 0;
let total = 0;

function ok(condicao, nome, detalhe = '') {
    total++;
    if (condicao) {
        console.log(`  ok   | ${nome}`);
    } else {
        falhas++;
        console.log(` FALHA | ${nome}${detalhe ? '\n         ' + detalhe : ''}`);
    }
}

/** Uma chamada ao api.php, pelo CLI do PHP. */
function viaPhp(params) {
    const script = `
        $_GET = json_decode('${JSON.stringify(params)}', true);
        $_POST = [];
        ob_start();
        include '${path.join(ROOT, 'examples/api.php')}';
        $saida = ob_get_clean();
        // tira os cabeçalhos que o CLI não emite e devolve só o corpo
        echo $saida;
    `;
    return execFileSync('php', ['-r', script], { encoding: 'utf8' }).trim();
}

/** A mesma chamada, pelo mock estático. */
function criarMock() {
    const dom = new JSDOM('', { url: 'http://localhost/', runScripts: 'dangerously' });
    const s = dom.window.document.createElement('script');
    s.textContent = fs.readFileSync(path.join(ROOT, 'examples/assets/mock-api.js'), 'utf8');
    dom.window.document.head.appendChild(s);
    return dom.window;
}

const w = criarMock();

/** Devolve o corpo, ou o marcador de erro quando a promessa rejeita. */
function viaMock(params) {
    const query = new URLSearchParams(params).toString();
    return w.DemoServer.handle({ url: 'api.php?' + query, type: 'GET' })
        .then(r => (typeof r === 'string' ? r : JSON.stringify(r)))
        .catch(() => ERRO);
}

const ERRO = '__erro_http__';

/* Uma chamada representativa por rota, incluindo os caminhos de "não achei". */
const CASOS = [
    { acao: 'cep', cep: '01310100' },
    { acao: 'cep', cep: '99999999' },
    { acao: 'cnpj', cnpj: '11222333000181' },
    { acao: 'cnpj', cnpj: '00000000000000' },
    { acao: 'lead', cod: '1' },
    { acao: 'lead', cod: '99' },
    { acao: 'estados' },
    { acao: 'cidades', uf: 'MG' },
    { acao: 'cidades', uf: 'ZZ' },
    { acao: 'bairros', cidade: '3550308' },
    { acao: 'planos', operadora: 'amil' },
    { acao: 'planos', operadora: 'inexistente' },
    { acao: 'valida-email', value: 'joao@exemplo.com' },
    { acao: 'valida-email', value: 'livre@exemplo.com' },
    { acao: 'valida-cpf-pipe', value: '11111111111' },
    { acao: 'valida-cpf-pipe', value: '12345678909' },
    { acao: 'politica-senha' },
];

(async () => {
    for (const caso of CASOS) {
        const rotulo = caso.acao + (Object.keys(caso).length > 1
            ? ' ' + JSON.stringify(Object.fromEntries(Object.entries(caso).filter(([k]) => k !== 'acao')))
            : '');

        let doPhp;
        try {
            doPhp = viaPhp(caso);
        } catch (e) {
            ok(false, rotulo, 'api.php falhou: ' + e.message);
            continue;
        }
        const doMock = await viaMock(caso);

        // Quando o mock sinaliza erro de HTTP, o api.php tem de concordar que é
        // erro. O CLI do PHP não propaga o status, então a evidência é o corpo.
        if (doMock === ERRO) {
            const ehErro = /"erro"/.test(doPhp);
            ok(ehErro, rotulo + ' (os dois falham)',
               ehErro ? '' : `mock rejeitou, api.php respondeu: ${doPhp}`);
            continue;
        }

        // Compara semanticamente: a ordem das chaves do JSON não importa.
        let iguais;
        try {
            iguais = JSON.stringify(JSON.parse(doPhp)) === JSON.stringify(JSON.parse(doMock));
        } catch (e) {
            iguais = doPhp === doMock;   // rotas que devolvem texto puro
        }

        ok(iguais, rotulo, iguais ? '' : `api.php : ${doPhp}\n         mock    : ${doMock}`);
    }

    // A rota de envio devolve o que recebeu, então só o contrato importa.
    total++;
    const salvar = JSON.parse(await viaMock({ acao: 'salvar', Campo: 'X' }));
    if (salvar.sucesso === true && salvar.recebido && salvar.recebido.Campo === 'X') {
        console.log('  ok   | salvar devolve o que recebeu');
    } else {
        falhas++;
        console.log(' FALHA | salvar devolve o que recebeu');
    }

    console.log(`\n${total - falhas}/${total} passaram`);
    process.exit(falhas ? 1 : 0);
})();
