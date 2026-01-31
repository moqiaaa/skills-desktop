import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import ErrorBoundary from './components/common/ErrorBoundary.tsx'

console.log('main.tsx loaded');

const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

if (rootElement) {
  console.log('Creating React root...');
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
    console.log('React app rendered');
  } catch (error) {
    console.error('React render error:', error);
  }
} else {
  console.error('Root element not found!');
}
