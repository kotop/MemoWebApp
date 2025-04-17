import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { initSearchDebugger } from './components/SearchDebug';

// Инициализируем отладчик поиска
if (process.env.NODE_ENV === 'development') {
  initSearchDebugger();
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);