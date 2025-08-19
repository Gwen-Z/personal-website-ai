module.exports = {
  extends: ['react-app', 'react-app/jest'],
  root: true,  // 防止向上查找配置
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn'
  }
};
