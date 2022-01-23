module.exports = {
  projects: [
    {
      displayName: 'test',
      preset: 'ts-jest',
      coveragePathIgnorePatterns: ['/node_modules/', '/example/'],
      coverageThreshold: {
        global: {
          lines: 90,
        },
      },
    },
    {
      displayName: 'lint',
      runner: 'jest-runner-eslint',
      testMatch: ['<rootDir>/{example,lib}/**/*.{ts,tsx}', '<rootDir>/*.{ts,tsx}'],
    },
  ],
};
