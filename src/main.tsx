import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const container = document.getElementById('root')!;

const tree = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 构建时已把首屏渲染为静态 HTML，存在子节点时复用它，避免首屏重建造成的闪烁
if (container.hasChildNodes()) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
