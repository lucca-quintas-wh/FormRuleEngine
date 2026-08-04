/**
 * Substituto do `api.php`, para a versão ESTÁTICA da documentação.
 *
 * O GitHub Pages serve arquivos, não executa PHP. As demonstrações de
 * `fetch_when`, `populate_when`, `remote_validate_when`, política de senha e as
 * cascatas da tabela dinâmica precisam de um servidor, então na build estática
 * este arquivo responde no lugar dele, com os MESMOS dados e os MESMOS formatos.
 *
 * Ele é injetado apenas pelo exportador (tools/exportar-estatico.php). Rodando
 * localmente com `php -S`, quem responde é o `api.php` de verdade, e é assim que
 * as demonstrações continuam honestas: se o contrato com o servidor estiver
 * errado, elas quebram no desenvolvimento.
 *
 * Se você alterar uma rota no `api.php`, altere aqui também. O teste
 * `tools/conferir-mock.php` compara as duas respostas.
 */
(function () {
  'use strict';

  var LATENCIA = 220;   // o mesmo usleep do api.php, para o debounce continuar visível

  var CEPS = {
    '01310100': { logradouro: 'Avenida Paulista',    bairro: 'Bela Vista', cidade: 'São Paulo',      uf: 'SP' },
    '20040020': { logradouro: 'Rua da Assembleia',   bairro: 'Centro',     cidade: 'Rio de Janeiro', uf: 'RJ' },
    '30130010': { logradouro: 'Avenida Afonso Pena', bairro: 'Centro',     cidade: 'Belo Horizonte', uf: 'MG' }
  };

  var EMPRESAS = {
    '11222333000181': {
      razao: 'Trustimage Tecnologia LTDA', fantasia: 'Trustimage',
      email: 'contato@exemplo.com.br', cep: '01310-100', abertura: '10/03/2014', porte: 'ME'
    },
    '99888777000166': {
      razao: 'Conecta Corretora de Seguros S/A', fantasia: 'Conecta',
      email: 'atendimento@exemplo.com.br', cep: '20040-020', abertura: '02/08/2001', porte: 'EPP'
    }
  };

  var LEADS = {
    '1': { email: 'ana@exemplo.com',   razao: 'Ana Souza',  cidade: 'São Paulo', estado: 'SP', telefone: '11988887777' },
    '2': { email: 'bruno@exemplo.com', razao: 'Bruno Lima', cidade: 'Niterói',   estado: 'RJ', telefone: '21977776666' }
  };

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

  var PLANOS = {
    amil:       [{ VALUE: 'amil-400', DISPLAY: 'Amil 400' }, { VALUE: 'amil-700', DISPLAY: 'Amil 700' }],
    bradesco:   [{ VALUE: 'bra-nacional', DISPLAY: 'Nacional Flex' }],
    sulamerica: [{ VALUE: 'sul-exato', DISPLAY: 'Exato' }, { VALUE: 'sul-especial', DISPLAY: 'Especial 100' }]
  };

  var EMAILS_EM_USO = ['joao@exemplo.com', 'maria@exemplo.com', 'admin@exemplo.com'];

  /** As mesmas rotas do api.php, com as mesmas respostas. */
  function responder(acao, p) {
    switch (acao) {
      case 'cep': {
        var cep = String(p.cep || p.value || '').replace(/\D/g, '');
        if (!CEPS[cep]) return { __status: 404, corpo: { erro: 'CEP não encontrado' } };
        return { corpo: CEPS[cep] };
      }
      case 'cnpj': {
        var cnpj = String(p.cnpj || p.value || '').replace(/\D/g, '');
        return { corpo: EMPRESAS[cnpj] || { erro: 'CNPJ não encontrado' } };
      }
      case 'lead':
        return { corpo: LEADS[String(p.cod || p.value || '')] || { erro: 'Lead não encontrado' } };

      case 'estados':
        return { corpo: { data: [
          { VALUE: 'SP', DISPLAY: 'São Paulo' },
          { VALUE: 'RJ', DISPLAY: 'Rio de Janeiro' },
          { VALUE: 'MG', DISPLAY: 'Minas Gerais' }
        ] } };
      case 'cidades': return { corpo: { data: CIDADES[p.uf] || [] } };
      case 'bairros': return { corpo: { data: BAIRROS[p.cidade] || [] } };
      case 'planos':  return { corpo: PLANOS[p.operadora] || [] };

      case 'valida-email': {
        var email = String(p.value || p.email || '').toLowerCase().trim();
        var ocupado = EMAILS_EM_USO.indexOf(email) !== -1;
        return { corpo: { valid: !ocupado, message: ocupado ? 'Este e-mail já está cadastrado.' : '' } };
      }
      case 'valida-cpf-pipe': {
        var cpf = String(p.value || '').replace(/\D/g, '');
        return { texto: cpf === '11111111111' ? 'CPF já cadastrado|1' : 'ok|0' };
      }

      case 'politica-senha':
        return { corpo: {
          regra: 'Sua senha precisa atender a todos os critérios abaixo.',
          minLength: 8, maxLength: 32, numbers: 1, upperCase: 1, especials: 1,
          aviso1: 'Pelo menos 8 caracteres.',
          aviso2: 'Pelo menos 1 número.',
          aviso3: 'Pelo menos 1 letra maiúscula.',
          aviso4: 'Pelo menos 1 caractere especial.',
          aviso5: 'As senhas coincidem.'
        } };

      case 'salvar':
        return { corpo: {
          sucesso: true,
          mensagem: 'Recebido. (build estática: nada foi enviado a lugar nenhum)',
          recebido: p
        } };

      default:
        return { __status: 400, corpo: { erro: 'ação desconhecida: ' + acao } };
    }
  }

  function paramsDe(url, dados) {
    var p = {};
    var q = String(url).split('?')[1] || '';
    new URLSearchParams(q).forEach(function (v, k) { p[k] = v; });
    if (typeof dados === 'string') {
      new URLSearchParams(dados).forEach(function (v, k) { p[k] = v; });
    } else if (dados && typeof dados === 'object') {
      Object.keys(dados).forEach(function (k) { p[k] = dados[k]; });
    }
    return p;
  }

  /* ── 1. o $.ajax do shim consulta este objeto antes de ir à rede ────────── */
  window.DemoServer = {
    canHandle: function (caminho) {
      return String(caminho).replace(/^.*\//, '') === 'api.php';
    },
    handle: function (config) {
      var p = paramsDe(config.url, config.data);
      var r = responder(p.acao, p);
      if (window.Demo) {
        Demo.log('→ ' + (config.type || 'GET') + ' api.php?acao=' + p.acao + ' (build estática)');
      }
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          if (r.__status && r.__status >= 400) return reject({ status: r.__status });
          resolve(r.texto !== undefined ? r.texto : r.corpo);
        }, LATENCIA);
      });
    }
  };

  /* ── 2. as páginas que enviam o formulário chamam fetch() direto ────────── */
  var fetchOriginal = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (url, opcoes) {
    if (!window.DemoServer.canHandle(String(url).split('?')[0])) {
      return fetchOriginal ? fetchOriginal(url, opcoes) : Promise.reject(new Error('sem fetch'));
    }
    var p = paramsDe(url, (opcoes || {}).body);
    var r = responder(p.acao, p);
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve({
          ok: !(r.__status >= 400),
          status: r.__status || 200,
          json: function () { return Promise.resolve(r.corpo); },
          text: function () { return Promise.resolve(r.texto !== undefined ? r.texto : JSON.stringify(r.corpo)); }
        });
      }, LATENCIA);
    });
  };
})();
