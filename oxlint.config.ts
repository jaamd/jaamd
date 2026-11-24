import { defineConfig } from 'oxlint'

export default defineConfig({
    ignorePatterns: ['**/dist/**', '**/.astro/**', 'packages/create-jaad/templates/**'],
    plugins: ['typescript', 'unicorn', 'oxc', 'import'],
    categories: {
        correctness: 'error',
        suspicious: 'error',
    },
    rules: {
        'no-shadow': 'off',
        eqeqeq: ['error', 'always'],
        'typescript/consistent-type-imports': 'error',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', fix: { imports: 'safe-fix' } }],
        'import/no-unassigned-import': ['error', { allow: ['**/*.css'] }],
    },
    overrides: [
        {
            files: ['packages/core/**'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        patterns: [
                            {
                                group: [
                                    'astro',
                                    'astro/*',
                                    'astro:*',
                                    '@astrojs/*',
                                    'react',
                                    'react/*',
                                    'react-dom',
                                    'react-dom/*',
                                    '@jaamd/astro',
                                    '@jaamd/astro/*',
                                    '@jaamd/jaad',
                                    '@jaamd/jaad/*',
                                    '@jaamd/site',
                                    '@jaamd/site/*',
                                ],
                                message: 'core is framework-agnostic and sits below the adapters.',
                            },
                        ],
                    },
                ],
            },
        },
        {
            files: ['packages/site/**'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        patterns: [
                            {
                                group: ['@jaamd/jaad', '@jaamd/jaad/*', '**/jaad/**'],
                                message: 'the site shell sits below JAAD and JAAB: it may not import them.',
                            },
                        ],
                    },
                ],
            },
        },
        {
            files: ['**/tests/**'],
            rules: { 'unicorn/consistent-function-scoping': 'off' },
        },
    ],
})
