import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const rootElement = document.getElementById('app');
if (!rootElement) throw new Error('Root element #app not found');

createRoot(rootElement).render(
  <StrictMode>
    <div>
      <h1>tododoro</h1>
    </div>
  </StrictMode>
);
