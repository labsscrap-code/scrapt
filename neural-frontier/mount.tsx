import { createRoot } from 'react-dom/client';
import Home from './app/page';

// The original HUD owns its full document and its simulation lifecycle.
createRoot(document.getElementById('neural-root')!).render(<Home />);
