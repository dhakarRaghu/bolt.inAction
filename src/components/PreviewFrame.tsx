"use client";
import { WebContainer } from '@webcontainer/api';
import React, { useEffect, useState } from 'react';
import { FileItem } from '@/lib/types';

interface PreviewFrameProps {
  files: FileItem[];
  webContainer: WebContainer;
}

export function PreviewFrame({ files, webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function setupPreview() {
      if (!webContainer) {
        setError("WebContainer not initialized");
        return;
      }

      try {
        // Convert FileItem[] to WebContainer file system structure with proper nesting
        const mountStructure: Record<string, any> = {};
        files.forEach(file => {
          const parts = file.path.split('/');
          let current = mountStructure;
          parts.forEach((part, index) => {
            if (index === parts.length - 1) {
              current[part] = { file: { contents: file.content || '' } };
            } else {
              current[part] = current[part] || { directory: {} };
              current = current[part].directory;
            }
          });
        });
        console.log('Mount Structure:', JSON.stringify(mountStructure, null, 2));

        // Mount files
        await webContainer.mount(mountStructure);

        // Write package.json to ensure scripts are correct
        await webContainer.fs.writeFile(
          'package.json',
          JSON.stringify({
            name: "generated-react-project",
            version: "1.0.0",
            scripts: { dev: "vite" },
            dependencies: { react: "^18.2.0", "react-dom": "^18.2.0" },
            devDependencies: { vite: "^5.4.2", "@vitejs/plugin-react": "^4.0.0" }
          }, null, 2)
        );

        // Write vite.config.ts
        await webContainer.fs.writeFile(
          'vite.config.ts',
          `
            import { defineConfig } from 'vite';
            import react from '@vitejs/plugin-react';

            export default defineConfig({
              plugins: [react()],
              server: {
                port: 3002,
                open: true,
              },
              resolve: {
                extensions: ['.js', '.ts', '.tsx'],
              },
            });
          `
        );

        // Install dependencies
        const installProcess = await webContainer.spawn('npm', ['install']);
        installProcess.output.pipeTo(new WritableStream({
          write(data) { console.log('npm install:', data); }
        }));
        const installExitCode = await installProcess.exit;
        if (installExitCode !== 0) {
          throw new Error('Dependency installation failed');
        }

        // Start dev server
        const devProcess = await webContainer.spawn('npm', ['run', 'dev']);
        devProcess.output.pipeTo(new WritableStream({
          write(data) { console.log('npm run dev:', data); }
        }));

        // Listen for server-ready event
        webContainer.on('server-ready', (port, url) => {
          console.log(`Server ready on port ${port} with URL: ${url}`);
          setUrl(url);
        });

        webContainer.on('error', (err) => {
          console.error('WebContainer Error:', err);
          setError(`Preview failed: ${err.message}`);
        });
      } catch (err) {
        console.error('Preview setup error:', err);
        setError(`Preview setup failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    setupPreview();
  }, [files, webContainer]);

  if (error) return <div className="text-red-500 text-center">{error}</div>;
  if (!url) return <div className="text-center text-gray-400">Loading preview...</div>;
  return <iframe width="100%" height="100%" src={url} title="Preview" />;
}