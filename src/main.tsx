import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as echarts from 'echarts';
import './index.css';
import App from './App.tsx';
import { initLogger } from './utils/logger';

initLogger();

const echartsWithLogging = echarts as unknown as {
  setLogLevel?: (level: 'error' | 'warning' | 'info' | 'silent' | string) => void;
};
if (typeof echartsWithLogging.setLogLevel === 'function') {
  echartsWithLogging.setLogLevel('error');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
