<?php
/**
 * remote_validate_when dispara no evento escolhido, consulta o servidor e
 * REGISTRA o resultado no engine. Enquanto houver validação reprovada,
 * engine.hasRemoteValidationErrors() devolve true.
 *
 * Campo reprovado ganha a classe form-rule-invalid e a mensagem no title.
 * O registro é feito por NOME. Use a chave `name` quando quiser um
 * identificador diferente do nome do campo.
 *
 * E-mails já cadastrados no api.php: joao@, maria@, admin@exemplo.com.
 */

return [
    'name' => 'formRemoto',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'Email', 'label' => 'E-mail', 'type' => 'email', 'col' => 6,
                'placeholder' => 'voce@exemplo.com',
                'remote_validate_when' => [
                    'event'        => 'blur',
                    'method'       => 'POST',
                    'url'          => 'api.php?acao=valida-email',
                    'data'         => ['value' => '{value}'],
                    'valid_path'   => 'valid',
                    'message_path' => 'message',
                    'debounce'     => 250,
                    'message_fail' => 'Não consegui validar agora. Tente de novo.',
                ],
            ],
            [
                'name' => 'CpfRemoto', 'label' => 'CPF (rota no formato legado "mensagem|codigo")',
                'type' => 'text', 'col' => 6,
                'placeholder' => '111.111.111-11 para ver a recusa',
                'remote_validate_when' => [
                    'event'         => 'blur',
                    'method'        => 'POST',
                    'url'           => 'api.php?acao=valida-cpf-pipe',
                    'data'          => ['value' => '{value}'],
                    'data_type'     => 'text',
                    'response_type' => 'pipe',
                    // Índices dentro do texto separado por "|".
                    'valid_path'    => '1',
                    'message_path'  => '0',
                ],
            ],
        ],
    ]],
];
