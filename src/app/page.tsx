"use client";
import { useState } from "react";
import { generateCode } from "@/lib/gemini";

export default function Home() {
    const [generatedCode, setGeneratedCode] = useState("");
    const [files, setFiles] = useState<Record<string, string>>({});
    const [inputValue, setInputValue] = useState("");

    const getCode = async () => {
        const result = await generateCode(inputValue);
        setFiles(result.files || {});
        setGeneratedCode(result.code);
    };

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <h1 style={{ fontSize: "24px", color: "#ff6200" }}>
                Your seeing the working on project bolt.inAction
            </h1>
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type something..."
                style={{
                    height: "40px",
                    width: "300px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    padding: "8px",
                    marginBottom: "16px",
                }}
            />
            <button
                onClick={getCode}
                style={{
                    backgroundColor: "#007bff",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    border: "none",
                    cursor: "pointer",
                }}
            >
                Generate Code
            </button>
            <h2 style={{ fontSize: "20px", marginTop: "30px" }}>
                Generated Code:
            </h2>
            {Object.keys(files).length > 0 ? (
                Object.entries(files).map(([filePath, content]) => (
                    <div key={filePath} style={{ marginBottom: "20px" }}>
                        <h3 style={{ fontSize: "18px", color: "#333" }}>
                            {filePath}
                        </h3>
                        <pre
                            style={{
                                backgroundColor: "#f4f4f4",
                                padding: "15px",
                                borderRadius: "5px",
                                overflowX: "auto",
                                whiteSpace: "pre-wrap",
                                fontFamily: "monospace",
                            }}
                        >
                            {content}
                        </pre>
                    </div>
                ))
            ) : (
                <pre style={{ fontFamily: "monospace" }}>
                    {generatedCode || "Click 'Generate Code' to see the result..."}
                </pre>
            )}
        </div>
    );
}