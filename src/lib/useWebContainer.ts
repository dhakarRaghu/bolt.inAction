"use client";
import { useEffect, useState } from "react";
import { WebContainer } from '@webcontainer/api';

export function useWebContainer() {
  const [webcontainer, setWebcontainer] = useState<WebContainer | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function main() {
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          console.log(`Attempting to boot WebContainer (Attempt ${attempts + 1})...`);
          const webcontainerInstance = await WebContainer.boot();
          console.log('WebContainer booted successfully:', webcontainerInstance);
          setWebcontainer(webcontainerInstance);
          setError(null);
          break;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          console.error(`Failed to boot WebContainer (Attempt ${attempts + 1}):`, errorMessage);
          attempts++;
          if (attempts === maxAttempts) {
            setError(`WebContainer initialization failed after ${maxAttempts} attempts: ${errorMessage}`);
          } else {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          }
        }
      }
    }
    main();
  }, []);

  return { webcontainer, error };
}