/**
 * Servidor falso dos exemplos — NÃO faz parte da engine.
 *
 * O `$.ajax` do shim (assets/jquery-shim.js) cai aqui em vez de ir à rede, para
 * que os exemplos de `fetch_when`, `populate_when`, `remote_validate_when`,
 * `password` e das cascatas da tabela dinâmica funcionem offline.
 *
 * Cada rota devolve exatamente o formato que o plugin correspondente espera —
 * então este arquivo também serve de especificação do que o SEU backend precisa
 * responder. Veja o comentário em cima de cada rota.
 */
window.DemoServer = (function () {
  'use strict';

  var LATENCIA = 260; // ms — para dar para ver o debounce e o loading agindo

  var routes = {};

  /** Registra uma rota. `path` casa por igualdade ou por prefixo terminado em "/". */
  function on(path, handler) { routes[path] = handler; }

  function resolve(path) {
    if (routes[path]) return { handler: routes[path], rest: '' };
    var chaves = Object.keys(routes).filter(function (k) { return k.slice(-1) === '/'; });
    chaves.sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < chaves.length; i++) {
      if (path.indexOf(chaves[i]) === 0) {
        return { handler: routes[chaves[i]], rest: path.slice(chaves[i].length) };
      }
    }
    return null;
  }

  function normalizaParams(data, queryString) {
    var params = {};
    new URLSearchParams(queryString || '').forEach(function (v, k) { params[k] = v; });
    if (typeof data === 'string') {
      new URLSearchParams(data).forEach(function (v, k) { params[k] = v; });
    } else if (data && typeof data === 'object') {
      Object.keys(data).forEach(function (k) { params[k] = data[k]; });
    }
    return params;
  }

  function handle(config) {
    var url = String(config.url || '');
    var partes = url.split('?');
    var path = partes[0];
    var params = normalizaParams(config.data, partes[1]);
    var achado = resolve(path);

    if (window.Demo) {
      Demo.log('→ ' + (config.type || 'GET') + ' ' + path +
               (Object.keys(params).length ? ' ' + JSON.stringify(params) : ''));
    }

    return new Promise(function (resolve_, reject) {
      setTimeout(function () {
        if (!achado) {
          if (window.Demo) Demo.log('← 404 ' + path);
          reject({ status: 404, path: path });
          return;
        }
        try {
          var resposta = achado.handler(params, achado.rest, config);
          if (resposta && resposta.__erro) {
            if (window.Demo) Demo.log('← erro ' + path);
            reject(resposta);
            return;
          }
          if (window.Demo) Demo.log('← 200 ' + path + ' ' + JSON.stringify(resposta).slice(0, 90));
          resolve_(resposta);
        } catch (e) {
          reject(e);
        }
      }, LATENCIA);
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     ROTAS
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * CEP — usado por fetch_when com `map`.
   * Contrato: um objeto plano; o `map` da regra escolhe qual chave vai em qual
   * campo (`"Logradouro": "logradouro"`).
   */
  var CEPS = {
    '01310100': { logradouro: 'Avenida Paulista', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' },
    '20040020': { logradouro: 'Rua da Assembleia', bairro: 'Centro', cidade: 'Rio de Janeiro', uf: 'RJ' },
    '30130010': { logradouro: 'Avenida Afonso Pena', bairro: 'Centro', cidade: 'Belo Horizonte', uf: 'MG' }
  };
  on('/api/cep/', function (params, rest) {
    var cep = String(rest || '').replace(/\D/g, '');
    if (!CEPS[cep]) return { __erro: true, mensagem: 'CEP não encontrado' };
    return CEPS[cep];
  });

  /**
   * CNPJ — usado por populate_when (vários campos de uma resposta só).
   */
  var CNPJS = {
    '11222333000181': {
      razao: 'Trustimage Tecnologia LTDA', fantasia: 'Trustimage',
      email: 'contato@exemplo.com.br', cep: '01310-100',
      abertura: '10/03/2014', porte: 'ME'
    },
    '99888777000166': {
      razao: 'Conecta Corretora de Seguros S/A', fantasia: 'Conecta',
      email: 'atendimento@exemplo.com.br', cep: '20040-020',
      abertura: '02/08/2001', porte: 'EPP'
    }
  };
  on('/api/cnpj', function (params) {
    var cnpj = String(params.cnpj || params.value || '').replace(/\D/g, '');
    if (!CNPJS[cnpj]) return { __erro: true, mensagem: 'CNPJ não encontrado' };
    return CNPJS[cnpj];
  });

  /**
   * Cascata de combos — usado por fetch_when com `map_options`.
   * Contrato padrão: `{ data: [ {VALUE, DISPLAY}, ... ] }`.
   * As chaves são configuráveis por `value_key` / `label_key`, e o caminho da
   * lista dentro da resposta por `path`.
   */
  var ESTADOS = [
    { VALUE: 'SP', DISPLAY: 'São Paulo' },
    { VALUE: 'RJ', DISPLAY: 'Rio de Janeiro' },
    { VALUE: 'MG', DISPLAY: 'Minas Gerais' }
  ];
  var CIDADES = {
    SP: [{ VALUE: '3550308', DISPLAY: 'São Paulo' }, { VALUE: '3509502', DISPLAY: 'Campinas' }, { VALUE: '3548708', DISPLAY: 'Santos' }],
    RJ: [{ VALUE: '3304557', DISPLAY: 'Rio de Janeiro' }, { VALUE: '3301702', DISPLAY: 'Niterói' }],
    MG: [{ VALUE: '3106200', DISPLAY: 'Belo Horizonte' }, { VALUE: '3170206', DISPLAY: 'Uberlândia' }]
  };
  var BAIRROS = {
    '3550308': [{ VALUE: 'pinheiros', DISPLAY: 'Pinheiros' }, { VALUE: 'moema', DISPLAY: 'Moema' }, { VALUE: 'se', DISPLAY: 'Sé' }],
    '3509502': [{ VALUE: 'cambui', DISPLAY: 'Cambuí' }, { VALUE: 'barao', DISPLAY: 'Barão Geraldo' }],
    '3548708': [{ VALUE: 'gonzaga', DISPLAY: 'Gonzaga' }],
    '3304557': [{ VALUE: 'copacabana', DISPLAY: 'Copacabana' }, { VALUE: 'tijuca', DISPLAY: 'Tijuca' }],
    '3301702': [{ VALUE: 'icarai', DISPLAY: 'Icaraí' }],
    '3106200': [{ VALUE: 'savassi', DISPLAY: 'Savassi' }, { VALUE: 'pampulha', DISPLAY: 'Pampulha' }],
    '3170206': [{ VALUE: 'centro', DISPLAY: 'Centro' }]
  };

  on('/api/estados', function () { return { data: ESTADOS }; });
  on('/api/cidades', function (params) { return { data: CIDADES[params.uf] || [] }; });
  on('/api/bairros', function (params) { return { data: BAIRROS[params.cidade] || [] }; });

  /**
   * Validação remota — usado por remote_validate_when.
   * Contrato padrão: `{ valid: bool, message: string }` (caminhos ajustáveis por
   * `valid_path` / `message_path`). Também aceita o legado "pipe": ver a rota
   * /api/valida-cpf-pipe abaixo.
   */
  var EMAILS_EM_USO = ['joao@exemplo.com', 'maria@exemplo.com', 'admin@exemplo.com'];
  on('/api/valida-email', function (params) {
    var email = String(params.value || params.email || '').toLowerCase().trim();
    var emUso = EMAILS_EM_USO.indexOf(email) !== -1;
    return {
      valid: !emUso,
      message: emUso ? 'Este e-mail já está cadastrado.' : ''
    };
  });

  /** Formato legado separado por "|": "mensagem|codigo". response_type: "pipe". */
  on('/api/valida-cpf-pipe', function (params) {
    var cpf = String(params.value || '').replace(/\D/g, '');
    return cpf === '11111111111' ? 'CPF já cadastrado|1' : 'ok|0';
  });

  /**
   * Detalhe de lead — usado por populate_when.
   */
  var LEADS = {
    '1': { email: 'ana@exemplo.com', razao: 'Ana Souza', cidade: 'São Paulo', estado: 'SP', telefone: '11988887777' },
    '2': { email: 'bruno@exemplo.com', razao: 'Bruno Lima', cidade: 'Niterói', estado: 'RJ', telefone: '21977776666' }
  };
  on('/api/lead/detalhe', function (params) {
    var cod = String(params.cod || params.value || '');
    return LEADS[cod] || { __erro: true, mensagem: 'Lead não encontrado' };
  });

  /**
   * Política de senha — usado pelo plugin `password`.
   * O contrato é o do CRM de origem: limites numéricos + rótulos aviso1..aviso5.
   */
  on('/api/politica-senha', function () {
    return {
      regra: 'Sua senha precisa atender a todos os critérios abaixo.',
      minLength: 8,
      maxLength: 32,
      numbers: 1,
      upperCase: 1,
      especials: 1,
      aviso1: 'Pelo menos 8 caracteres.',
      aviso2: 'Pelo menos 1 número.',
      aviso3: 'Pelo menos 1 letra maiúscula.',
      aviso4: 'Pelo menos 1 caractere especial.',
      aviso5: 'As senhas coincidem.'
    };
  });

  /**
   * Cascatas por LINHA da tabela dinâmica (formato do iluDynamicTable):
   * devolve um ARRAY direto, com VALUE/DISPLAY ou value/display.
   */
  var OPERADORAS = [
    { VALUE: 'amil', DISPLAY: 'Amil' },
    { VALUE: 'bradesco', DISPLAY: 'Bradesco Saúde' },
    { VALUE: 'sulamerica', DISPLAY: 'SulAmérica' }
  ];
  var PLANOS = {
    amil: [{ VALUE: 'amil-400', DISPLAY: 'Amil 400', preco: 320.5 }, { VALUE: 'amil-700', DISPLAY: 'Amil 700', preco: 540.9 }],
    bradesco: [{ VALUE: 'bra-nacional', DISPLAY: 'Nacional Flex', preco: 480 }],
    sulamerica: [{ VALUE: 'sul-exato', DISPLAY: 'Exato', preco: 299.9 }, { VALUE: 'sul-especial', DISPLAY: 'Especial 100', preco: 720 }]
  };
  on('/api/operadoras', function () { return OPERADORAS; });
  on('/api/planos', function (params) { return PLANOS[params.operadora] || []; });

  /** Endpoint que sempre falha — para exercitar on_fail / clear_on_fail. */
  on('/api/sempre-falha', function () { return { __erro: true, mensagem: 'Serviço indisponível' }; });

  return { on: on, handle: handle, routes: routes };
})();
