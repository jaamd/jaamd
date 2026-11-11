import { defineConfig } from 'oxlint'

export default defineConfig({
    ignorePatterns: ['**/dist/**', '**/.astro/**', 'packages/create-jaad/templates/**', '_import/**'],
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
                                    '@jaamd/jaamd',
                                    '@jaamd/jaamd/*',
                                    '@jaamd/jaad',
                                    '@jaamd/jaad/*',
                                ],
                                message: 'core is framework-agnostic and sits below the adapters.',
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
