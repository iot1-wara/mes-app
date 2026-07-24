import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: { decoratorMetadata: true },
          target: 'es2020',
        },
        minify: false,
        sourceMaps: 'inline',
      },
    ],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^node-opcua$': '<rootDir>/__mocks__/node-opcua.mock.ts',
    'order\\.entity$': '<rootDir>/__mocks__/order.entity.mock.ts',
    'material\\.entity$': '<rootDir>/__mocks__/material.entity.mock.ts',
  },
};

export default config;

