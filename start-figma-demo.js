#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动Figma前端设计演示...\n');

// 启动前端开发服务器
console.log('📱 启动前端开发服务器...');
const frontendProcess = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

// 启动后端服务器
console.log('🔧 启动后端服务器...');
const backendProcess = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...');
  frontendProcess.kill();
  backendProcess.kill();
  process.exit(0);
});

// 处理错误
frontendProcess.on('error', (error) => {
  console.error('❌ 前端服务器启动失败:', error.message);
});

backendProcess.on('error', (error) => {
  console.error('❌ 后端服务器启动失败:', error.message);
});

console.log('\n✅ 服务器启动完成！');
console.log('🌐 前端地址: http://localhost:3000');
console.log('🔗 后端地址: http://localhost:5000');
console.log('\n💡 提示: 按 Ctrl+C 停止服务器'); 