module.exports = {
	root: true,
	env: { browser: true, es2021: true },
	parser: '@typescript-eslint/parser',
	parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
	plugins: ['@typescript-eslint'],
	extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
	settings: { react: { version: 'detect' } },
	overrides: [
		{
			files: ['*.ts', '*.tsx'],
			rules: {
				'no-unused-vars': 'off',
				'@typescript-eslint/no-unused-vars': 'off'
			}
		}
	],
	ignorePatterns: ['dist/', 'node_modules/']
};

