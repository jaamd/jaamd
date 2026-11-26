import { defineJaabConfig } from '@jaamd/jaab'

export default defineJaabConfig({
    site: 'https://blog.example.com',
    title: 'Fixture blog',
    description: 'Build fixture for the jaab package tests.',
    perPage: 2,
    author: 'ada',
    authors: {
        ada: { name: 'Ada Lovelace' },
        grace: { name: 'Grace Hopper', url: 'https://example.com/grace' },
    },
})
