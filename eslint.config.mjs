import js from '@eslint/js';
import jest from 'eslint-plugin-jest';
import prettier from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // The `lint` script names src and bin, which is the whole TypeScript source.
  // These keep generated output out of any run that reaches wider than that.
  // A bare `eslint .` still fails on jest.config.js, which no config here gives
  // CommonJS globals to.
  { ignores: ['dist/', 'lib/', 'coverage/'] },
  // The old config had eslint-comments/no-unused-disable at error. Its
  // replacement defaults to warn, and `lint` runs with --quiet, so the default
  // would hide every stale directive - including one over `camelcase`, which is
  // the reason that rule is still here.
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // The base rule cannot see TypeScript's own scopes (enums, type
      // parameters), so the typed replacement takes over.
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',

      // These two came from eslint-plugin-github and are kept by hand.
      // `camelcase` because src/main.ts has a live disable pair around the
      // snake_case keys the Google credential object needs, which would go
      // stale if the rule went away with the plugin; `eqeqeq` on the same
      // options it had there, because it is the one rule in that set that
      // catches a real bug rather than a preference.
      camelcase: 'error',
      eqeqeq: ['error', 'smart'],

      // Severity kept at the level the previous toolchain used. The rule was a
      // warning under typescript-eslint 5 and became an error in 8; the `any`s
      // it points at are deliberate and untangling them is not a toolchain bump.
      '@typescript-eslint/no-explicit-any': 'warn',

      // `!process.env.TEST && run()` at the bottom of src/main.ts is the entry
      // point guard, not a mistake. Nothing in the previous config flagged it.
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true },
      ],

      // New in eslint 10's recommended set. Attaching `cause` to the errors
      // src/lib.ts rethrows would change what the action throws at runtime,
      // which this dependency-only change is not allowed to do. Worth doing on
      // its own, later.
      'preserve-caught-error': 'off',
    },
  },
  {
    // Spread first: upstream carries no `files` key today, but if it ever gains
    // one it would overwrite this scoping silently and leak the jest rules onto
    // the source files.
    ...jest.configs['flat/recommended'],
    files: ['**/*.test.ts'],
  },
  // Last, so formatting wins over any stylistic rule above it.
  prettier
);
