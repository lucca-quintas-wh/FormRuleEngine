<?php
/**
 * Um campo controlando vários blocos.
 *
 * A engine monta um mapa `campo → elementos que dependem dele` no registro do
 * plugin; ao mudar um campo, reavalia só os elementos que o citam. Não há
 * varredura do formulário a cada tecla.
 */

return [
    'name' => 'formVariosBlocos',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name'    => 'Plano', 'label' => 'Plano', 'type' => 'radio', 'col' => 12,
                'value'   => 'basico',
                'options' => ['basico' => 'Básico', 'pro' => 'Pro', 'enterprise' => 'Enterprise'],
            ],
            [
                'name' => 'Sso', 'label' => 'Domínio para SSO', 'type' => 'text', 'col' => 6,
                'visible_when' => ['Plano' => ['pro', 'enterprise', 'ilimitado']],
                'demo_name'    => 'SSO (pro ou enterprise)',
            ],
            [
                'name' => 'Gestor', 'label' => 'Gestor de conta', 'type' => 'text', 'col' => 6,
                'visible_when' => ['Plano' => 'enterprise'],
                'demo_name'    => 'gestor (enterprise)',
            ],
            [
                'type' => 'raw', 'col' => 12,
                'visible_when' => ['Plano' => 'basico'],
                'demo_name'    => 'aviso (básico)',
                'html' => '<p class="hint">O plano básico não inclui recursos avançados.</p>',
            ],
        ],
    ]],
];
