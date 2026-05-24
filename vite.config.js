import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  
  // 解决 Vant4 在 Vite 中的兼容性问题
  optimizeDeps: {
    include: ['vant']
  },
  
  // 构建配置（Cloudflare Pages）
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('vant')) {
              return 'vant-vendor'
            }
            return 'vue-vendor'
          }
        }
      }
    }
  },
  
  // 开发服务器配置
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false
  },
  
  // 路径别名
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  
  // 环境变量
  envPrefix: 'VITE_'
})
