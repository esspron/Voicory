import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import App from './App';

describe('App Smoke Test', () => {
    it('renders without crashing', () => {
        // We just want to ensure the app mounts.
        // Since App contains providers and routing, this verifies the context stack is valid.
        const { container } = render(<App />);
        expect(container).toBeInTheDocument();
    });
});
