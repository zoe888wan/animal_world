/**
 * 应用入口
 * 功能：挂载 React 根组件，包裹 BrowserRouter，注入全局样式
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

/** 使用 createRoot 挂载到 #root，StrictMode 用于开发阶段严格检查 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
