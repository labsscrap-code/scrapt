import EdgeDiscovery from './components/edge-discovery';
import { createRoot } from 'react-dom/client';
import Home from './app/page';

// The original HUD owns its full document and its simulation lifecycle.
createRoot(document.getElementById('neural-root')!).render(<Home />);

// UI-only release. No opportunity feed, synthetic candidates or second simulation.
createRoot(document.getElementById('edge-root')!).render(<EdgeDiscovery />);
