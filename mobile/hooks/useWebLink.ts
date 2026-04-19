// ─────────────────────────────────────────────────────────────────────────────
// useWebLink.ts — Hook for opening Voicory web app URLs
//
// Uses expo-web-browser for an in-app browser experience on both iOS and
// Android, with a graceful Linking.openURL fallback.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import { colors } from '../lib/theme';
import { webLinks, WebLinkKey } from '../lib/webLinks';

export interface OpenWebOptions {
  /** Use system browser instead of in-app browser sheet */
  external?: boolean;
}

export function useWebLink() {
  /**
   * Open a known web link by key name.
   * e.g. openLink('assistants') → opens app.voicory.com/assistants
   */
  const openLink = useCallback(
    async (key: WebLinkKey, options: OpenWebOptions = {}) => {
      const url = webLinks[key];
      await openUrl(url, options);
    },
    [],
  );

  /**
   * Open any arbitrary URL with the same in-app browser logic.
   */
  const openUrl = useCallback(async (url: string, options: OpenWebOptions = {}) => {
    try {
      if (options.external) {
        await Linking.openURL(url);
        return;
      }
      await WebBrowser.openBrowserAsync(url, {
        toolbarColor: colors.bg,
        controlsColor: colors.primary,
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        enableBarCollapsing: true,
        showTitle: true,
        createTask: false,
      });
    } catch {
      // Fallback to system browser
      await Linking.openURL(url).catch(() => {});
    }
  }, []);

  return { openLink, openUrl };
}
