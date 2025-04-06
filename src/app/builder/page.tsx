"use client";
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { generateCode } from '@/lib/gemini';
import { CodeEditor } from '@/components/CodeEditor';
import { FileExplorer } from '@/components/FileExplorer';
import { TabView } from '@/components/TabView';
import { PreviewFrame } from '@/components/PreviewFrame';
import { FileItem , Step } from '@/lib/types';
import { Loader } from '@/components/Loader';
import { useWebContainer } from '@/lib/useWebContainer';
import { parseXml} from '@/lib/parseXml';

export default function Builder() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('prompt') || "";
  
  const [userPrompt, setUserPrompt] = useState(initialPrompt);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [steps, setSteps] = useState<Step[]>([]);
  const { webcontainer, error: webcontainerError } = useWebContainer();

  useEffect(() => {
    if (initialPrompt) {
      fetchCode(initialPrompt);
    }
  }, [initialPrompt]);

  const fetchCode = async (input: string) => {
    setLoading(true);
    try {
      const result = await generateCode(input);
      console.log('Raw Result from generateCode:', result);

      const generatedFiles = result.files || {};
      const generatedSteps = parseXml(result.code || '');
      console.log('Parsed Steps:', generatedSteps);

      if (result.framework === 'react' && !generatedFiles['package.json']) {
        generatedFiles['package.json'] = JSON.stringify({
          name: "generated-react-project",
          version: "1.0.0",
          scripts: { dev: "vite" },
          dependencies: { react: "^18.2.0", "react-dom": "^18.2.0" },
          devDependencies: { vite: "^5.4.2", "@vitejs/plugin-react": "^4.0.0" }
        }, null, 2);
      }
      if (result.framework === 'react' && !generatedFiles['vite.config.ts']) {
        generatedFiles['vite.config.ts'] = `
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
        `;
      }
      if (result.framework === 'react' && !generatedFiles['index.html']) {
        generatedFiles['index.html'] = `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Generated App</title>
            </head>
            <body>
              <div id="root"></div>
              <script type="module" src="/src/main.tsx"></script>
            </body>
          </html>
        `;
      }
      if (result.framework === 'react' && !generatedFiles['src/main.tsx']) {
        generatedFiles['src/main.tsx'] = `
          import { StrictMode } from 'react';
          import { createRoot } from 'react-dom/client';
          import App from './App';
          import './index.css';

          createRoot(document.getElementById('root')!).render(
            <StrictMode>
              <App />
            </StrictMode>
          );
        `;
      }
      if (result.framework === 'react' && !generatedFiles['src/App.tsx']) {
        generatedFiles['src/App.tsx'] = `
          import React from 'react';

          export default function App() {
            return <h1>Welcome to the Todo App</h1>;
          }
        `;
      }
      if (result.framework === 'react' && !generatedFiles['src/index.css']) {
        generatedFiles['src/index.css'] = `
          body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif; }
        `;
      }

      console.log('Generated Files:', generatedFiles);
      setFiles(generatedFiles);
      setSteps(generatedSteps);

      const fileItems: FileItem[] = [];
      const folderMap: Record<string, FileItem> = {};

      Object.entries(generatedFiles).forEach(([path, content]) => {
        const parts = path.split('/');
        let currentLevel = fileItems;

        parts.forEach((part, index) => {
          const fullPath = parts.slice(0, index + 1).join('/');
          if (index === parts.length - 1) {
            currentLevel.push({
              name: part,
              path: fullPath,
              content,
              type: 'file',
            });
          } else {
            if (!folderMap[fullPath]) {
              const folder: FileItem = {
                name: part,
                path: fullPath,
                type: 'folder',
                children: [],
              };
              folderMap[fullPath] = folder;
              currentLevel.push(folder);
            }
            currentLevel = folderMap[fullPath].children!;
          }
        });
      });

      console.log('File Items:', fileItems);
      setFileItems(fileItems);
    } catch (error) {
      console.error("Error fetching code:", error);
      const errorMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setFiles({ "error.txt": errorMessage });
      setFileItems([{ name: "error.txt", path: "error.txt", content: errorMessage, type: 'file' }]);
      setSteps([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (userPrompt.trim()) {
      fetchCode(userPrompt);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col text-gray-100">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-xl font-semibold">Website Builder</h1>
        {initialPrompt && (
          <p className="text-sm text-gray-400 mt-1">Initial Prompt: {initialPrompt}</p>
        )}
      </header>

      <main className="flex-1 p-6 grid grid-cols-4 gap-6">
        <div className="col-span-1 space-y-6">
          <FileExplorer files={fileItems} onFileSelect={setSelectedFile} />
        </div>
        <div className="col-span-3 space-y-6">
          <div className="flex items-center gap-4">
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Enter a new prompt or modify the existing one..."
              className="flex-1 p-4 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-24 text-gray-100 placeholder-gray-500"
            />
            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {loading ? "Generating..." : "Generate Code"}
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 h-[calc(100vh-16rem)]">
            <TabView activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="h-[calc(100%-4rem)]">
              {loading ? (
                <Loader />
              ) : activeTab === 'code' ? (
                <CodeEditor file={selectedFile} />
              ) : webcontainer ? (
                <PreviewFrame files={fileItems} webContainer={webcontainer} />
              ) : (
                <div className="text-red-500 text-center">{webcontainerError || 'WebContainer not initialized'}</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}