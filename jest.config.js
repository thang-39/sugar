module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleNameMapper: {
    // assets mapper MUST come before the general @/ mapper
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^expo-notifications$': '<rootDir>/__mocks__/expo-notifications.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
