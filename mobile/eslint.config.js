const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expo,
  { ignores: ['dist-validacao/**', '.expo/**'] },
  { files: ['scripts/*.mjs'], languageOptions: { globals: { process: 'readonly', Buffer: 'readonly' } } },
]);
