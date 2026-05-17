const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Basic Resume Analyzer for ATS Score & Feedback
 */
const analyzeResume = async (resumeText) => {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an elite AI resume analyzer and ATS expert.",
      },
      {
        role: "user",
        content: `
Analyze this resume professionally.

Return:
1. ATS Score out of 100
2. Top strengths
3. Weaknesses
4. Missing skills
5. Improvement suggestions

Resume:
${resumeText}
        `,
      },
    ],
  });

  return response.choices[0].message.content;
};

/**
 * Compare Resume against pasted Job Description (JD Matcher)
 * Returns structured JSON for high-fidelity frontend rendering
 */
const matchResumeWithJD = async (resumeText, jdText) => {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an elite ATS algorithm simulator. Compare the candidate's resume text against the target job description. 
Return a valid JSON object matching EXACTLY this schema:
{
  "matchPercentage": 85,
  "explanation": "A concise explanation of the overall fit.",
  "strengths": ["list of matching key accomplishments or tech stack items"],
  "missingSkills": ["list of critical missing skills, tools, or experiences"],
  "recommendations": ["clear, actionable steps to improve match percentage"]
}`,
      },
      {
        role: "user",
        content: `
Resume:
${resumeText}

Job Description:
${jdText}
        `,
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
};

module.exports = {
  analyzeResume,
  matchResumeWithJD,
};
