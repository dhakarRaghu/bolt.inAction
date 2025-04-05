"use server";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { basePrompt as reactBasePrompt } from "@/defaults/reacts";
import { basePrompt as nodeBasePrompt } from "@/defaults/node";
import { BASE_PROMPT } from "@/defaults/prompts";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function generateCode(userPrompt: string) {
    try {
        // Step 1: Determine framework
        const frameworkResponse = await model.generateContent(
            `Project: ${userPrompt}. ` +
            "Return either 'node' or 'react' based on what you think this project should be. " +
            "Only return a single word: 'node' or 'react'."
        );
        
        const framework = frameworkResponse.response.text().trim().toLowerCase();
        console.log("Answer from Gemini for framework:", framework);

        // Step 2: Generate code based on framework
        let generatedCode;
        let prompt;

        if (framework === "react") {
            prompt = `${BASE_PROMPT}\n` +
                `Generate a React application that is ${userPrompt}.\n` +
                "Here is an artifact that contains all files of the project visible to you.\n" +
                "Consider the contents of ALL files in the project.\n\n" +
                `${reactBasePrompt}\n\n` +
                "Here is a list of files that exist on the file system but are not being shown to you:\n" +
                "- .gitignore\n" +
                "- package-lock.json\n" +
                "Return the complete code in a <boltArtifact> format.";
        } else if (framework === "node") {
            prompt = `${BASE_PROMPT}\n` +
                `Generate a Node.js application with Express that serves ${userPrompt}.\n` +
                "Here is an artifact that contains all files of the project visible to you.\n" +
                "Consider the contents of ALL files in the project.\n\n" +
                `${nodeBasePrompt}\n\n` +
                "Here is a list of files that exist on the file system but are not being shown to you:\n" +
                "- .gitignore\n" +
                "- package-lock.json\n" +
                "Return the complete code in a <boltArtifact> format.";
        } else {
            return {
                framework: "error",
                code: "Invalid framework selected by AI. Expected 'node' or 'react'.",
                files: {}
            };
        }

        const response = await model.generateContent(prompt);
        generatedCode = response.response.text();
        console.log(`Response from Gemini for ${framework}:`, generatedCode);

        // Clean up the response (remove ``` marks if present)
        generatedCode = generatedCode
            .replace(/```[a-z\s]*\n/g, '') // Remove ```language markers
            .replace(/```/g, '')           // Remove closing ```
            .trim();

        // Parse the <boltArtifact> string into a files object
        const files: Record<string, string> = {};
        const fileRegex = /<boltAction type="file" filePath="([^"]+)">([\s\S]*?)<\/boltAction>/g;
        let match;
        while ((match = fileRegex.exec(generatedCode)) !== null) {
            const filePath = match[1];
            const content = match[2].trim();
            files[filePath] = content;
        }

        return {
            framework,
            code: generatedCode, // Keep the raw string if needed
            files: Object.keys(files).length > 0 ? files : { "error.txt": "No valid files found in response" }
        };
    } catch (error) {
        console.error("Error generating content:", error);
        return {
            framework: "error",
            code: `Error generating code: ${error instanceof Error ? error.message : 'Unknown error'}`,
            files: { "error.txt": `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
        };
    }
}