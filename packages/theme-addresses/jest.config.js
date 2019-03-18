module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.txt$': 'jest-raw-loader',
    '^.+\\.html$': 'jest-raw-loader',
  },
};
