import React from 'react';

/**
 * A utility to wrap React.lazy for better resilience against deployment changes.
 * When a new version is deployed, the old JS chunk hashes in the user's browser
 * will fail to fetch. This utility catches that error and triggers a one-time 
 * hard reload of the page to fetch the new index.html and fresh chunk names.
 */
export const lazyRetry = (componentImport) => {
  return React.lazy(async () => {
    const pageHasAlreadyBeenReloaded = JSON.parse(
      window.sessionStorage.getItem('page-has-been-reloaded') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-reloaded', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenReloaded) {
        // We haven't reloaded yet, so let's try a fresh fetch of the whole app
        window.sessionStorage.setItem('page-has-been-reloaded', 'true');
        console.warn('Chunk load error detected. Forcing app refresh to fetch latest assets...');
        window.location.reload();
        // Return a dummy component to prevent React.lazy from throwing while waiting for reload
        return { default: () => null };
      }

      // If we already reloaded and it still fails, it's a real coding error
      throw error;
    }
  });
};
