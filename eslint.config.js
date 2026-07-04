// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      // The project's mandated "as const object + derived union type of the same
      // name" pattern (see CLAUDE.md) is a legal value+type pairing in TS, but
      // @typescript-eslint/no-redeclare has no option to allow it (its
      // ignoreDeclarationMerge only covers interface/namespace/class/function/enum
      // merges). Genuine redeclarations are still caught by the TS compiler
      // (TS2451/TS2300/TS2393) via the required `tsc --noEmit` gate, so disabling
      // this rule removes false positives without losing real protection.
      '@typescript-eslint/no-redeclare': 'off',
    },
  },
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*'],
  },
]);
