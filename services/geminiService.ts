
import { GoogleGenAI, Chat } from "@google/genai";
import { fileToBase64, resizeImage } from "./fileUtils";
import { SolverResponse } from "../types";

const SYSTEM_INSTRUCTION = `
You are the Universal Problem Solver — an advanced multimodal reasoning agent.
Your job is to identify, explain, and solve any problem the user provides using images, text, audio, or combined inputs.

Output format must strictly follow this structure:

1. Problem Identification
[Short explanation of what the problem is]

2. Root Cause Analysis
[Why this issue is happening]

3. Solution
[Step-by-step instructions. Use markdown list syntax like 1., 2., 3.]

4. Highlighted Issue Area
[If an image is provided, describe specifically where in the image the issue is visible in 1-3 sentences. If no image, write "N/A".]

5. Confidence Score
[Provide a single percentage (0-100%) reflecting your certainty, followed by a label (Low/Medium/High). Format: "85% - High"]

6. Additional Notes
[Only if necessary. Risks, safety warnings, or alternative fixes]

7. Follow-Up Questions
[If you need more info to be certain, list 1-3 specific, diagnostic questions. If analysis is clear, write "No additional information needed — analysis is sufficiently clear."]

8. Quick Actions
Tools: [Comma separated list of tools required, or "None required"]
Tests: [1-3 simple diagnostic tests to confirm the issue, or "None"]
Severity: [Low/Moderate/High/Critical] - [Brief explanation of urgency/impact]

Critical Behavior Rules:
- If code is shown, detect errors and produce correct code.
- If mechanical object, detect physical issues.
- If electronics, check wiring/polarity.
- If dangerous, add safety warning.
- Be concise but intelligent.
`;

const parseResponse = (text: string): SolverResponse => {
  // Robust regex parsing to handle potential Markdown formatting (e.g. **1. Header**, 1. **Header**)
  // and variations in spacing/punctuation.

  // 1. Identification
  const identificationRegex = /(?:^|\n)(?:[*#\s]*)(?:1\.?)?\s*(?:\*\*|__)?\s*Problem Identification\s*(?:\*\*|__)?(?:[:\s]*)([\s\S]*?)(?=(?:^|\n)(?:[*#\s]*)(?:2\.?)?\s*(?:\*\*|__)?\s*Root Cause)/i;

  // 2. Root Cause
  const rootCauseRegex = /(?:^|\n)(?:[*#\s]*)(?:2\.?)?\s*(?:\*\*|__)?\s*Root Cause(?: Analysis)?\s*(?:\*\*|__)?(?:[:\s]*)([\s\S]*?)(?=(?:^|\n)(?:[*#\s]*)(?:3\.?)?\s*(?:\*\*|__)?\s*Solution)/i;

  // 3. Solution
  const solutionRegex = /(?:^|\n)(?:[*#\s]*)(?:3\.?)?\s*(?:\*\*|__)?\s*Solution\s*(?:\*\*|__)?(?:[:\s]*)([\s\S]*?)(?=(?:^|\n)(?:[*#\s]*)(?:4\.?)?\s*(?:\*\*|__)?\s*Highlighted Issue Area|(?=(?:^|\n)(?:[*#\s]*)(?:5\.?)?\s*(?:\*\*|__)?\s*Confidence Score)|(?=(?:^|\n)(?:[*#\s]*)(?:6\.?)?\s*(?:\*\*|__)?\s*(?:Additional )?Notes)|(?=(?:^|\n)(?:[*#\s]*)(?:7\.?)?\s*(?:\*\*|__)?\s*Follow-Up Questions)|(?=(?:^|\n)(?:[*#\s]*)(?:8\.?)?\s*(?:\*\*|__)?\s*Quick Actions)|$)/i;

  // 4. Highlighted Issue Area
  const highlightedAreaRegex = /(?:^|\n)(?:[*#\s]*)(?:4\.?)?\s*(?:\*\*|__)?\s*Highlighted Issue Area\s*(?:\*\*|__)?(?:[:\s]*)([\s\S]*?)(?=(?:^|\n)(?:[*#\s]*)(?:5\.?)?\s*(?:\*\*|__)?\s*Confidence Score|(?=(?:^|\n)(?:[*#\s]*)(?:6\.?)?\s*(?:\*\*|__)?\s*(?:Additional )?Notes)|(?=(?:^|\n)(?:[*#\s]*)(?:7\.?)?\s*(?:\*\*|__)?\s*Follow-Up Questions)|(?=(?:^|\n)(?:[*#\s]*)(?:8\.?)?\s*(?:\*\*|__)?\s*Quick Actions)|$)/i;

  // 5. Confidence Score
  const confidenceRegex = /(?:^|\n)(?:[*#\s]*)(?:5\.?)?\s*(?:\*\*|__)?\s*Confidence Score\s*(?:\*\*|__)?(?:[:\s]*)([\s\S]*?)(?=(?:^|\n)(?:[*#\s]*)(?:6\.?)?\s*(?:\*\*|__)?\s*(?:Additional )?Notes|(?=(?:^|\n)(?:[*#\s]*)(?:7\.?)?\s*(?:\*\*|__)?\s*Follow-Up Questions)|(?=(?:^|\n)(?:[*#\s]*)(?:8\.?)?\s*(?:\*\*|__)?\s*Quick Actions)|$)/i;

  // 6. Notes
  const notesRegex = /(?:^|\n)(?:[*#\s]*)(?:6\.?)?\s*(?:\*\*|__)?\s*(?:Additional )?Notes\s*(?:\*\*|__)?(?:[:\s]*)([\s\S]*?)(?=(?:^|\n)(?:[*#\s]*)(?:7\.?)?\s*(?:\*\*|__)?\s*Follow-Up Questions|(?=(?:^|\n)(?:[*#\s]*)(?:8\.?)?\s*(?:\*\*|__)?\s*Quick Actions)|$)/i;

  // 7. Follow-Up Questions
  const followUpRegex = /(?:^|\n)(?:[*#\s]*)(?:7\.?)?\s*(?:\*\*|__)?\s*Follow-Up Questions\s*(?:\*\*|__)?(?:[:\s]*)([\s\S]*?)(?=(?:^|\n)(?:[*#\s]*)(?:8\.?)?\s*(?:\*\*|__)?\s*Quick Actions|$)/i;

  // 8. Quick Actions
  const quickActionsRegex = /(?:^|\n)(?:[*#\s]*)(?:8\.?)?\s*(?:\*\*|__)?\s*Quick Actions\s*(?:\*\*|__)?(?:[:\s]*)([\s\S]*?$)/i;

  const identificationMatch = text.match(identificationRegex);
  const rootCauseMatch = text.match(rootCauseRegex);
  const solutionMatch = text.match(solutionRegex);
  const highlightedAreaMatch = text.match(highlightedAreaRegex);
  const confidenceMatch = text.match(confidenceRegex);
  const notesMatch = text.match(notesRegex);
  const followUpMatch = text.match(followUpRegex);
  const quickActionsMatch = text.match(quickActionsRegex);

  const identification = identificationMatch ? identificationMatch[1].trim() : "Could not identify problem section. The model response format may have varied.";
  const rootCause = rootCauseMatch ? rootCauseMatch[1].trim() : "Could not identify root cause section.";
  
  const rawSolution = solutionMatch ? solutionMatch[1].trim() : "";
  // Split solution by newlines that start with a number or bullet
  const solution = rawSolution
    .split(/\n/)
    .filter(line => line.trim().length > 0)
    .map(line => line.trim());

  const highlightedArea = highlightedAreaMatch ? highlightedAreaMatch[1].trim() : undefined;
  
  // Parse Confidence
  let confidence: { score: number; label: string } | undefined = undefined;
  if (confidenceMatch) {
    const confidenceText = confidenceMatch[1].trim();
    // Look for a number followed by %
    const scoreMatch = confidenceText.match(/(\d{1,3})%/);
    if (scoreMatch) {
      const score = Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)));
      // Determine label based on text or score if text is missing
      let label = "Medium Confidence";
      if (confidenceText.toLowerCase().includes("high")) label = "High Confidence";
      else if (confidenceText.toLowerCase().includes("low")) label = "Low Confidence";
      else if (confidenceText.toLowerCase().includes("medium")) label = "Medium Confidence";
      else {
        // Fallback based on score
        if (score >= 75) label = "High Confidence";
        else if (score >= 40) label = "Medium Confidence";
        else label = "Low Confidence";
      }
      confidence = { score, label };
    }
  }

  const notes = notesMatch ? notesMatch[1].trim() : "";
  const followUpQuestions = followUpMatch ? followUpMatch[1].trim() : "";

  // Parse Quick Actions
  let quickActions = {
    tools: "None required",
    tests: "None",
    severity: { level: "Low", explanation: "No severity info provided." }
  };

  if (quickActionsMatch) {
    const qaText = quickActionsMatch[1];
    
    // Extract Tools
    const toolsMatch = qaText.match(/Tools:\s*(.*?)(?=\n|Tests:|Severity:|$)/i);
    if (toolsMatch) quickActions.tools = toolsMatch[1].trim();

    // Extract Tests
    const testsMatch = qaText.match(/Tests:\s*(.*?)(?=\n|Tools:|Severity:|$)/i);
    if (testsMatch) quickActions.tests = testsMatch[1].trim();

    // Extract Severity
    const severityMatch = qaText.match(/Severity:\s*(.*?)(?=\n|Tools:|Tests:|$)/i);
    if (severityMatch) {
      const rawSeverity = severityMatch[1].trim();
      // Try to split "Level - Explanation"
      const parts = rawSeverity.split(/[-:–]/);
      let level = parts[0].trim();
      let explanation = parts.length > 1 ? parts.slice(1).join('-').trim() : rawSeverity;
      
      // Normalize level
      const lowerLevel = level.toLowerCase();
      if (lowerLevel.includes("critical")) level = "Critical";
      else if (lowerLevel.includes("high")) level = "High";
      else if (lowerLevel.includes("moderate") || lowerLevel.includes("medium")) level = "Moderate";
      else level = "Low";

      quickActions.severity = { level, explanation };
    }
  }

  return {
    rawText: text,
    sections: {
      identification,
      rootCause,
      solution,
      highlightedArea,
      confidence,
      notes,
      followUpQuestions,
      quickActions
    }
  };
};

export const solveProblem = async (
  text: string,
  images: File[],
  audioBlob: Blob | null
): Promise<{ response: SolverResponse; chat: Chat }> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Copy .env.example to .env.local and add your key."
      );
    }
    const ai = new GoogleGenAI({ apiKey });
    
    const parts: any[] = [];

    // Add Text
    if (text) {
      parts.push({ text });
    }

    // Add Images
    if (images && images.length > 0) {
      for (const img of images) {
        // Resize large images to avoid payload limits/latency
        const base64Image = await resizeImage(img);
        parts.push({
          inlineData: {
            mimeType: img.type,
            data: base64Image
          }
        });
      }
    }

    // Add Audio
    if (audioBlob) {
      const base64Audio = await fileToBase64(audioBlob);
      parts.push({
        inlineData: {
          mimeType: "audio/webm;codecs=opus", // Common browser recorder format
          data: base64Audio
        }
      });
    }

    if (parts.length === 0) {
      throw new Error("Please provide at least one input (Text, Image, or Audio).");
    }

    // Create a chat session to maintain context for follow-up questions
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4,
      }
    });

    // Send the initial problem as the first message
    const response = await chat.sendMessage({
      message: parts
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response generated from the model.");
    }

    return {
      response: parseResponse(resultText),
      chat
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export type FollowUpResult = 
  | { type: 'revised'; data: SolverResponse }
  | { type: 'confirmation'; text: string };

export const submitMultimodalFollowUp = async (
  chat: Chat, 
  text: string,
  images: File[],
  audioBlob: Blob | null
): Promise<FollowUpResult> => {
  try {
    const parts: any[] = [];

    // Add Prompt Instruction
    const promptText = `
    [SYSTEM NOTE: The user is providing additional follow-up information]
    
    User Context: ${text || "(See attached media)"}

    INSTRUCTIONS:
    Evaluate if this new information (text/images/audio) changes your previous diagnosis, root cause, or solution.
    
    SCENARIO A: If the new information reveals a DIFFERENT problem, a NEW root cause, or requires a SIGNIFICANTLY MODIFIED solution:
    - Output the FULL standard response format starting strictly with "1. Problem Identification".
    - Update all sections (1-8) based on the combined context.
    
    SCENARIO B: If the new information simply CONFIRMS your previous analysis or asks for minor clarification:
    - Do NOT use the numbered sections.
    - Respond conversationally and concisely explaining why the original diagnosis remains valid.
    `;

    parts.push({ text: promptText });

    // Add Follow-up Images
    if (images && images.length > 0) {
      for (const img of images) {
        const base64Image = await resizeImage(img);
        parts.push({
          inlineData: {
            mimeType: img.type,
            data: base64Image
          }
        });
      }
    }

    // Add Follow-up Audio
    if (audioBlob) {
      const base64Audio = await fileToBase64(audioBlob);
      parts.push({
        inlineData: {
          mimeType: "audio/webm;codecs=opus",
          data: base64Audio
        }
      });
    }

    const response = await chat.sendMessage({
      message: parts
    });

    const resultText = response.text || "I couldn't generate a response.";
    
    // Check if the model returned a structured update (starts with the standard header)
    // We look for "1. Problem Identification" or "Problem Identification" near the start
    const isStructured = /(?:^|\n)(?:[*#\s]*)(?:1\.?)?\s*(?:\*\*|__)?\s*Problem Identification/i.test(resultText);

    if (isStructured) {
      return { type: 'revised', data: parseResponse(resultText) };
    } else {
      return { type: 'confirmation', text: resultText };
    }

  } catch (error) {
    console.error("Gemini Follow-up Error:", error);
    throw error;
  }
};
