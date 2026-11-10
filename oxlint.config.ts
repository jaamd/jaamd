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
            files: ['**/tests/**'],
            rules: { 'unicorn/consistent-function-scoping': 'off' },
        },
    ],
})
