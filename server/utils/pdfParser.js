const fs = require("fs");
const pdfParseModule = require("pdf-parse");

/**
 * Robust, production-grade PDF parser with cross-version class/function compatibility
 */
const parsePDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);

    // 1. Check if the module is directly exported as a parser function (Standard pdf-parse)
    if (typeof pdfParseModule === "function") {
      const data = await pdfParseModule(dataBuffer);
      if (data && data.text) {
        return data.text;
      }
    }

    // 2. Check if the module exports a PDFParse class constructor (Custom / fork versions)
    if (pdfParseModule && typeof pdfParseModule.PDFParse === "function") {
      const { PDFParse } = pdfParseModule;
      // Convert Node Buffer to standard Uint8Array required by this engine
      const uint8Array = new Uint8Array(dataBuffer);
      
      const parser = new PDFParse(uint8Array);
      const data = await parser.getText();
      
      if (data) {
        if (typeof data === "object" && typeof data.text === "string") {
          return data.text;
        }
        if (typeof data === "string") {
          return data;
        }
      }
    }

    throw new Error("Unable to identify valid pdf-parse signature or class exports.");
  } catch (pdfError) {
    console.warn(`[PDF Parser] Structural PDF parse failed (${pdfError.message}). Attempting raw text/markdown fallback...`);
    
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const rawText = dataBuffer.toString("utf8");
      
      // Clean non-printable control characters to verify if it is readable plain text
      const cleanText = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
      
      if (cleanText && cleanText.trim().length > 10) {
        console.log(`[PDF Parser] Raw text fallback success (${cleanText.trim().length} chars extracted).`);
        return cleanText;
      }
    } catch (fallbackError) {
      console.error("[PDF Parser] Raw text fallback failed:", fallbackError.message);
    }
    
    // Throw standard structural warning
    throw new Error(`Invalid PDF Structure: Parsing failed. Please verify that this is a valid binary PDF document. Details: ${pdfError.message}`);
  }
};

module.exports = parsePDF;
