import nx from '@nx/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
    ...nx.configs['flat/base'],
    ...nx.configs['flat/typescript'],
    ...nx.configs['flat/javascript'],
    {
        ignores: ['**/dist', '**/out-tsc', '**/generated/prisma'],
    },
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
        rules: {
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    enforceBuildableLibDependency: true,
                    allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
                    depConstraints: [
                        {
                            sourceTag: 'scope:backend',
                            onlyDependOnLibsWithTags: ['scope:backend', 'scope:shared'],
                        },
                        {
                            sourceTag: 'scope:frontend',
                            onlyDependOnLibsWithTags: ['scope:frontend', 'scope:shared'],
                        },
                        {
                            sourceTag: 'scope:shared',
                            onlyDependOnLibsWithTags: ['scope:shared'],
                        },
                        {
                            sourceTag: 'type:app',
                            onlyDependOnLibsWithTags: ['type:util', 'type:ui', 'type:feature'],
                        },
                        {
                            sourceTag: 'type:util',
                            onlyDependOnLibsWithTags: ['type:util'],
                        },
                    ],
                },
            ],
        },
    },
    {
        files: [
            '**/*.ts',
            '**/*.tsx',
            '**/*.cts',
            '**/*.mts',
            '**/*.js',
            '**/*.jsx',
            '**/*.cjs',
            '**/*.mjs',
        ],
        // Override or add rules here
        rules: {},
    },
    // Debe ir al final: desactiva las reglas de estilo de ESLint que
    // compitan con Prettier (indentación, comillas, comas finales, etc.),
    // dejando el formateo exclusivamente en manos de Prettier — así ambas
    // herramientas nunca se contradicen. No se usa eslint-plugin-prettier
    // (correr Prettier como regla de ESLint) a propósito: es más lento y
    // Prettier ya se ejecuta aparte (`prettier --write`).
    eslintConfigPrettier,
];
