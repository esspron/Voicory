# @voicory/widget

Embeddable AI voice and chat widget for websites. Allow your visitors to interact with your AI assistants directly on your website.

## Features

- 🎙️ **Voice Mode** - Real-time voice conversations with AI
- 💬 **Chat Mode** - Text-based messaging interface
- 🎨 **Customizable** - Themes, colors, sizes, and positions
- 📱 **Responsive** - Works on desktop and mobile
- 🔒 **Secure** - Domain allowlists, rate limiting
- ⚡ **Lightweight** - ~75KB gzipped

## Installation

### Script Tag (Easiest)

Add this code before the closing `</body>` tag:

```html
<script>
  window.VoicoryConfig = {
    apiKey: 'your-api-key',
    assistantId: 'your-assistant-id'
  };
</script>
<script src="https://cdn.voicory.com/widget/v1/voicory-widget.iife.js" async></script>
```

### NPM Package

```bash
npm install @voicory/widget
```

```typescript
import { VoicoryWidget } from '@voicory/widget';

const widget = new VoicoryWidget({
  apiKey: 'your-api-key',
  assistantId: 'your-assistant-id',
});
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | *required* | Your Voicory public API key |
| `assistantId` | string | *required* | The assistant to use |
| `backendUrl` | string | `'https://api.voicory.com'` | Override backend URL (for self-hosted or staging) |
| `mode` | 'voice' \| 'chat' \| 'both' | 'both' | Widget interaction mode |
| `theme` | 'light' \| 'dark' \| 'auto' | 'dark' | Color theme |
| `position` | 'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left' | 'bottom-right' | Widget position |
| `size` | 'small' \| 'medium' \| 'large' | 'medium' | Widget size |
| `colors.primary` | string | '#0ea5e9' | Primary color (hex) |
| `colors.background` | string | - | Background color override |
| `colors.text` | string | - | Text color override |
| `text.greeting` | string | 'Hi! How can I help you today?' | Welcome message |
| `text.inputPlaceholder` | string | 'Type a message...' | Input placeholder |
| `text.startCallText` | string | 'Start Call' | Voice call button text |
| `showBranding` | boolean | true | Show "Powered by Voicory" |
| `autoOpen` | boolean | false | Auto-open after page load |
| `autoOpenDelay` | number | 3000 | Delay before auto-open (ms) |
| `soundEffects` | boolean | true | Play notification sounds |
| `zIndex` | number | 999999 | CSS z-index |
| `assistantName` | string | - | Display name for assistant |
| `avatarUrl` | string | - | Custom avatar image URL |
| `variables` | object | - | Dynamic variables for prompts |

## Methods

```typescript
// Open/close widget
widget.open();
widget.close();
widget.toggle();

// Check state
widget.isOpen();

// Voice controls
widget.startCall();
widget.endCall();

// Chat controls
widget.sendMessage('Hello!');

// Get data
widget.getMessages();      // All chat messages
widget.getTranscript();    // Voice call transcript

// Update at runtime
widget.updateConfig({ theme: 'light' });
widget.setVariables({ userName: 'John' });

// Cleanup
widget.destroy();
```

## Events

```typescript
widget.on('ready', () => {
  console.log('Widget initialized');
});

widget.on('open', () => {
  console.log('Widget opened');
});

widget.on('close', () => {
  console.log('Widget closed');
});

widget.on('message', (event) => {
  console.log('New message:', event.data);
  // { role: 'user' | 'assistant', content: '...', timestamp: Date }
});

widget.on('call-start', (event) => {
  console.log('Call started:', event.data.sessionId);
});

widget.on('call-end', (event) => {
  console.log('Call ended:', event.data);
  // { sessionId, duration, transcript }
});

widget.on('mode-change', (event) => {
  console.log('Mode changed to:', event.data.mode);
});

widget.on('error', (event) => {
  console.error('Error:', event.data);
});

// Remove listener
const unsubscribe = widget.on('message', handler);
unsubscribe();
```

## Custom Styling

Override default styles with CSS variables:

```css
.voicory-widget {
  --voicory-primary: #your-color;
  --voicory-background: #your-background;
  --voicory-text: #your-text;
  --voicory-radius: 16px;
}
```

Or provide a custom container:

```typescript
const widget = new VoicoryWidget({
  apiKey: '...',
  assistantId: '...',
  container: document.getElementById('my-widget-container'),
});
```

## Framework Examples

### React

```tsx
import { useEffect, useRef } from 'react';
import { VoicoryWidget } from '@voicory/widget';

function ChatWidget() {
  const widgetRef = useRef<VoicoryWidget | null>(null);

  useEffect(() => {
    widgetRef.current = new VoicoryWidget({
      apiKey: process.env.VOICORY_API_KEY,
      assistantId: 'your-assistant-id',
    });

    return () => {
      widgetRef.current?.destroy();
    };
  }, []);

  return null; // Widget renders itself
}
```

### Vue

```vue
<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { VoicoryWidget } from '@voicory/widget';

const widget = ref(null);

onMounted(() => {
  widget.value = new VoicoryWidget({
    apiKey: import.meta.env.VITE_VOICORY_API_KEY,
    assistantId: 'your-assistant-id',
  });
});

onUnmounted(() => {
  widget.value?.destroy();
});
</script>
```

### Next.js

```tsx
'use client';

import { useEffect, useRef } from 'react';
import type { VoicoryWidget } from '@voicory/widget';

export function VoicoryChat() {
  const widgetRef = useRef<VoicoryWidget | null>(null);

  useEffect(() => {
    // Dynamic import for client-side only
    import('@voicory/widget').then(({ VoicoryWidget }) => {
      widgetRef.current = new VoicoryWidget({
        apiKey: process.env.NEXT_PUBLIC_VOICORY_API_KEY!,
        assistantId: 'your-assistant-id',
      });
    });

    return () => {
      widgetRef.current?.destroy();
    };
  }, []);

  return null;
}
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

## Security

- Always use public API keys (not secret keys)
- Configure domain allowlists in the Voicory dashboard
- Widget validates origin before making API calls

## Support

- 📚 [Documentation](https://docs.voicory.com/widget)
- 💬 [Discord Community](https://discord.gg/voicory)
- 📧 [Email Support](mailto:support@voicory.com)

## License

MIT © [Voicory](https://voicory.com)
