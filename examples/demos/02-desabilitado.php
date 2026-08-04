<?php
/**
 * Habilitação condicional.
 *
 * O plugin alterna o atributo `disabled` no input e marca o wrapper com
 * `ilu-form-field--disabled` + `form-rule-disabled`, para você estilizar o
 * campo inteiro e não só a caixa de texto.
 */

return [
    'name' => 'formDesabilitado',
    'sections' => [[
        'bare'   => true,
        'fields' => [
            [
                'name' => 'TipoFrete', 'label' => 'Tipo de frete', 'type' => 'select', 'col' => 5,
                'options' => ['CIF' => 'CIF (por conta do vendedor)', 'FOB' => 'FOB (por conta do comprador)'],
            ],
            [
                'name' => 'Transportadora', 'label' => 'Transportadora', 'type' => 'text', 'col' => 5,
                'disabled_when' => ['TipoFrete' => 'CIF'],
                'hint' => 'Só editável em FOB. E, como campo desabilitado não é serializado, ele também não chega ao servidor.',
            ],
        ],
    ]],
];
