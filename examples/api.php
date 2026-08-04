<?php
/**
 * api.php — o "outro lado" das regras que falam com o servidor.
 *
 * `fetch_when`, `populate_when`, `remote_validate_when` e o plugin `password`
 * não inventam formato: cada um espera uma resposta com uma forma específica.
 * Este controller devolve exatamente essas formas, então ele serve tanto de
 * backend dos exemplos quanto de especificação do que implementar no seu.
 *
 * Uma rota por `?acao=`. Sem framework, sem banco — arrays em memória.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$acao   = $_GET['acao'] ?? '';
$params = array_merge($_GET, $_POST);

/** Atraso artificial: sem ele o debounce e o estado de carregando somem da tela. */
usleep(220000);

switch ($acao) {

    /* ─────────────────────────────────────────────────────────────────────
       CEP — consumido por `fetch_when` com `map`.
       Contrato: objeto plano. O `map` da regra decide qual chave vai em qual
       campo: {"Logradouro":"logradouro","Bairro":"bairro"}.
       ───────────────────────────────────────────────────────────────────── */
    case 'cep':
        $ceps = [
            '01310100' => ['logradouro' => 'Avenida Paulista',      'bairro' => 'Bela Vista', 'cidade' => 'São Paulo',      'uf' => 'SP'],
            '20040020' => ['logradouro' => 'Rua da Assembleia',     'bairro' => 'Centro',     'cidade' => 'Rio de Janeiro', 'uf' => 'RJ'],
            '30130010' => ['logradouro' => 'Avenida Afonso Pena',   'bairro' => 'Centro',     'cidade' => 'Belo Horizonte', 'uf' => 'MG'],
        ];
        $cep = preg_replace('/\D/', '', (string) ($params['cep'] ?? $params['value'] ?? ''));
        if (!isset($ceps[$cep])) {
            http_response_code(404);
            echo json_encode(['erro' => 'CEP não encontrado'], JSON_UNESCAPED_UNICODE);
            break;
        }
        echo json_encode($ceps[$cep], JSON_UNESCAPED_UNICODE);
        break;

    /* ─────────────────────────────────────────────────────────────────────
       CNPJ — consumido por `populate_when`, que espalha a resposta por vários
       campos de uma vez. Mesmo contrato do CEP: objeto plano + `map`.
       ───────────────────────────────────────────────────────────────────── */
    case 'cnpj':
        $empresas = [
            '11222333000181' => [
                'razao'    => 'Trustimage Tecnologia LTDA',
                'fantasia' => 'Trustimage',
                'email'    => 'contato@exemplo.com.br',
                'cep'      => '01310-100',
                'abertura' => '10/03/2014',
                'porte'    => 'ME',
            ],
            '99888777000166' => [
                'razao'    => 'Conecta Corretora de Seguros S/A',
                'fantasia' => 'Conecta',
                'email'    => 'atendimento@exemplo.com.br',
                'cep'      => '20040-020',
                'abertura' => '02/08/2001',
                'porte'    => 'EPP',
            ],
        ];
        $cnpj = preg_replace('/\D/', '', (string) ($params['cnpj'] ?? $params['value'] ?? ''));
        echo json_encode($empresas[$cnpj] ?? ['erro' => 'CNPJ não encontrado'], JSON_UNESCAPED_UNICODE);
        break;

    /* ─────────────────────────────────────────────────────────────────────
       Cascata de combos — consumido por `fetch_when` com `map_options`.
       Contrato: {"data": [{"VALUE": …, "DISPLAY": …}, …]}.
       As chaves são configuráveis (`value_key`/`label_key`) e o caminho da
       lista dentro da resposta também (`path`, padrão "data").
       ───────────────────────────────────────────────────────────────────── */
    case 'estados':
        echo json_encode(['data' => [
            ['VALUE' => 'SP', 'DISPLAY' => 'São Paulo'],
            ['VALUE' => 'RJ', 'DISPLAY' => 'Rio de Janeiro'],
            ['VALUE' => 'MG', 'DISPLAY' => 'Minas Gerais'],
        ]], JSON_UNESCAPED_UNICODE);
        break;

    case 'cidades':
        $cidades = [
            'SP' => [['VALUE' => '3550308', 'DISPLAY' => 'São Paulo'], ['VALUE' => '3509502', 'DISPLAY' => 'Campinas'], ['VALUE' => '3548708', 'DISPLAY' => 'Santos']],
            'RJ' => [['VALUE' => '3304557', 'DISPLAY' => 'Rio de Janeiro'], ['VALUE' => '3301702', 'DISPLAY' => 'Niterói']],
            'MG' => [['VALUE' => '3106200', 'DISPLAY' => 'Belo Horizonte'], ['VALUE' => '3170206', 'DISPLAY' => 'Uberlândia']],
        ];
        echo json_encode(['data' => $cidades[$params['uf'] ?? ''] ?? []], JSON_UNESCAPED_UNICODE);
        break;

    case 'bairros':
        $bairros = [
            '3550308' => [['VALUE' => 'pinheiros', 'DISPLAY' => 'Pinheiros'], ['VALUE' => 'moema', 'DISPLAY' => 'Moema'], ['VALUE' => 'se', 'DISPLAY' => 'Sé']],
            '3509502' => [['VALUE' => 'cambui', 'DISPLAY' => 'Cambuí'], ['VALUE' => 'barao', 'DISPLAY' => 'Barão Geraldo']],
            '3548708' => [['VALUE' => 'gonzaga', 'DISPLAY' => 'Gonzaga']],
            '3304557' => [['VALUE' => 'copacabana', 'DISPLAY' => 'Copacabana'], ['VALUE' => 'tijuca', 'DISPLAY' => 'Tijuca']],
            '3301702' => [['VALUE' => 'icarai', 'DISPLAY' => 'Icaraí']],
            '3106200' => [['VALUE' => 'savassi', 'DISPLAY' => 'Savassi'], ['VALUE' => 'pampulha', 'DISPLAY' => 'Pampulha']],
            '3170206' => [['VALUE' => 'centro', 'DISPLAY' => 'Centro']],
        ];
        echo json_encode(['data' => $bairros[$params['cidade'] ?? ''] ?? []], JSON_UNESCAPED_UNICODE);
        break;

    /* ─────────────────────────────────────────────────────────────────────
       Detalhe de lead — consumido por `populate_when` com `chain`.
       Mesmo contrato do CNPJ: objeto plano, e o `map` da regra escolhe o que
       vai em qual campo.
       ───────────────────────────────────────────────────────────────────── */
    case 'lead':
        $leads = [
            '1' => ['email' => 'ana@exemplo.com',   'razao' => 'Ana Souza',  'cidade' => 'São Paulo', 'estado' => 'SP', 'telefone' => '11988887777'],
            '2' => ['email' => 'bruno@exemplo.com', 'razao' => 'Bruno Lima', 'cidade' => 'Niterói',   'estado' => 'RJ', 'telefone' => '21977776666'],
        ];
        $cod = (string) ($params['cod'] ?? $params['value'] ?? '');
        echo json_encode($leads[$cod] ?? ['erro' => 'Lead não encontrado'], JSON_UNESCAPED_UNICODE);
        break;

    /* ─────────────────────────────────────────────────────────────────────
       Validação remota — consumida por `remote_validate_when`.
       Contrato padrão: {"valid": bool, "message": string}. Os caminhos são
       configuráveis por `valid_path` e `message_path`.

       O runtime aceita como "válido": true, "S", 1 e a string "0" — esta
       última porque rotas legadas devolviam 0 = sem erro.
       ───────────────────────────────────────────────────────────────────── */
    case 'valida-email':
        $emUso = ['joao@exemplo.com', 'maria@exemplo.com', 'admin@exemplo.com'];
        $email = strtolower(trim((string) ($params['value'] ?? $params['email'] ?? '')));
        $ocupado = in_array($email, $emUso, true);
        echo json_encode([
            'valid'   => !$ocupado,
            'message' => $ocupado ? 'Este e-mail já está cadastrado.' : '',
        ], JSON_UNESCAPED_UNICODE);
        break;

    /* Formato legado separado por "|" — `response_type: "pipe"`.
       "mensagem|codigo", onde codigo 0 significa OK. */
    case 'valida-cpf-pipe':
        header('Content-Type: text/plain; charset=utf-8');
        $cpf = preg_replace('/\D/', '', (string) ($params['value'] ?? ''));
        echo $cpf === '11111111111' ? 'CPF já cadastrado|1' : 'ok|0';
        break;

    /* ─────────────────────────────────────────────────────────────────────
       Cascata por LINHA da tabela dinâmica.
       Formato do iluDynamicTable: um ARRAY direto (não `{data: […]}`), com
       VALUE/DISPLAY ou value/display — as rotas legadas não eram consistentes
       no caso das chaves, e o plugin lê as duas formas.
       ───────────────────────────────────────────────────────────────────── */
    case 'planos':
        $planos = [
            'amil'       => [['VALUE' => 'amil-400', 'DISPLAY' => 'Amil 400'], ['VALUE' => 'amil-700', 'DISPLAY' => 'Amil 700']],
            'bradesco'   => [['VALUE' => 'bra-nacional', 'DISPLAY' => 'Nacional Flex']],
            'sulamerica' => [['VALUE' => 'sul-exato', 'DISPLAY' => 'Exato'], ['VALUE' => 'sul-especial', 'DISPLAY' => 'Especial 100']],
        ];
        echo json_encode($planos[$params['operadora'] ?? ''] ?? [], JSON_UNESCAPED_UNICODE);
        break;

    /* ─────────────────────────────────────────────────────────────────────
       Política de senha — consumida pelo plugin `password`.
       Limites numéricos + os rótulos aviso1..aviso5, exatamente como no CRM
       de origem. O plugin monta o checklist a partir disto: critério cujo
       limite é 0 nem aparece na lista.
       ───────────────────────────────────────────────────────────────────── */
    case 'politica-senha':
        echo json_encode([
            'regra'     => 'Sua senha precisa atender a todos os critérios abaixo.',
            'minLength' => 8,
            'maxLength' => 32,
            'numbers'   => 1,
            'upperCase' => 1,
            'especials' => 1,
            'aviso1'    => 'Pelo menos 8 caracteres.',
            'aviso2'    => 'Pelo menos 1 número.',
            'aviso3'    => 'Pelo menos 1 letra maiúscula.',
            'aviso4'    => 'Pelo menos 1 caractere especial.',
            'aviso5'    => 'As senhas coincidem.',
        ], JSON_UNESCAPED_UNICODE);
        break;

    /* ─────────────────────────────────────────────────────────────────────
       Recebe o formulário. Devolve o que chegou, para dar para conferir o que
       de fato foi serializado — inclusive o que NÃO chegou: campo `disabled`
       (por `disabled_when` ou `lock_when`) não é enviado pelo navegador.
       ───────────────────────────────────────────────────────────────────── */
    case 'salvar':
        echo json_encode([
            'sucesso'  => true,
            'mensagem' => 'Recebido.',
            'recebido' => $_POST,
        ], JSON_UNESCAPED_UNICODE);
        break;

    default:
        http_response_code(400);
        echo json_encode(['erro' => 'ação desconhecida: ' . $acao], JSON_UNESCAPED_UNICODE);
}
