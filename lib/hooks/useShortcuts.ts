import { useEffect } from 'react';
import scopeConfig from '../scope.config.json';

type ShortcutHandlers = Record<string, () => void>;

/**
 * Registers global keyboard shortcuts defined in scope.config.json.
 * `handlers` maps action IDs (e.g. "new-element") to callbacks.
 */
export function useShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in an input/textarea/contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      for (const shortcut of scopeConfig.shortcuts) {
        const modPressed = shortcut.mod ? (e.metaKey || e.ctrlKey) : true;
        if (modPressed && e.key.toLowerCase() === shortcut.key.toLowerCase()) {
          const handler = handlers[shortcut.action];
          if (handler) {
            e.preventDefault();
            handler();
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
