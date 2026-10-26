module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'test/(integration|contract|e2e)/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@nestjs/graphql$': '<rootDir>/test/mocks/mock-graphql.js',
    '^@nestjs/apollo$': '<rootDir>/test/mocks/mock-graphql.js',
  },
  testEnvironment: 'node',
};
