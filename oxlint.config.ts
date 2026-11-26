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
        // Every body in braces, one statement per line: guards and callbacks included.
        curly: ['error', 'all'],
        'arrow-body-style': ['error', 'always'],
        'typescript/consistent-type-imports': 'error',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', fix: { imports: 'safe-fix' } }],
        'import/no-unassigned-import': ['error', { allow: ['**/*.css'] }],
        // A module that reads a virtual module references the file declaring it, so a
        // project that type-checks the published sources gets the declarations too.
        'typescript/triple-slash-reference': ['error', { path: 'always', types: 'prefer-import', lib: 'always' }],
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
