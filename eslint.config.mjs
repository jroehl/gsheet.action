import js from '@eslint/js';
import jest from 'eslint-plugin-jest';
import prettier from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // The `lint` script points eslint at src and bin only; this is the belt to
  // that braces, so a bare `npx eslint .` never walks generated output.
  { ignores: ['dist/', 'lib/', 'coverage/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // The base rule cannot see TypeScript's own scopes (enums, type
      // parameters), so the typed replacement takes over.
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',

      // Came from eslint-plugin-github and is kept by hand: src/main.ts has a
      // live disable pair around the snake_case keys the Google credential
      // object needs, which would go stale if the rule went away with the
      // plugin.
      camelcase: 'error',

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
    files: ['**/*.test.ts'],
    ...jest.configs['flat/recommended'],
  },
  // Last, so formatting wins over any stylistic rule above it.
  prettier
);
