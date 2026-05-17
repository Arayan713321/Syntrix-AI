const { z } = require("zod");

// Schema for matching Resume with Job Description
const matchJDSchema = z.object({
  body: z.object({
    resumeText: z.string({
      required_error: "resumeText is required in request body",
    }).min(1, "resumeText cannot be empty"),
    jdText: z.string({
      required_error: "jdText is required in request body",
    }).min(1, "jdText cannot be empty"),
  }),
});

// Schema for Chat RAG vector query
const chatSchema = z.object({
  body: z.object({
    question: z.string({
      required_error: "question is required in request body",
    }).min(1, "question cannot be empty"),
    resumeText: z.string().optional().default(""),
    jdText: z.string().optional().default(""),
    history: z.array(
      z.object({
        role: z.enum(["user", "ai", "assistant"]),
        content: z.string().min(1),
      })
    ).optional().default([]),
  }),
});

// Schema for Generating tailored Interview Questions
const generateQuestionsSchema = z.object({
  body: z.object({
    resumeText: z.string().optional().default(""),
    jdText: z.string().optional().default(""),
  }),
});

// Schema for Evaluating Interview response answers
const submitAnswerSchema = z.object({
  body: z.object({
    question: z.string({
      required_error: "question is required in request body",
    }).min(1, "question cannot be empty"),
    answer: z.string({
      required_error: "answer is required in request body",
    }).min(1, "answer cannot be empty"),
    resumeText: z.string().optional().default(""),
    jdText: z.string().optional().default(""),
  }),
});

module.exports = {
  matchJDSchema,
  chatSchema,
  generateQuestionsSchema,
  submitAnswerSchema,
};
