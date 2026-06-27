// ESLint config for the Score-Adda app. Extends Expo's shared config (TypeScript + React Native
// aware) and surfaces explicit `any` as a warning so it can be driven down over time without
// blocking the build. Bump `no-explicit-any` to "error" once the existing occurrences are typed.
module.exports = {
  root: true,
  extends: ['expo'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'web-build/',
    'android/',
    'ios/',
    'src/api/generated/',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
