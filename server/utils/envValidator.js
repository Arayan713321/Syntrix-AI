const { z } = require("zod");
require("dotenv").config();

const envSchema = z.object({
  OPENAI_API_KEY: z.string({
    required_error: "OPENAI_API_KEY environment variable is required",
  }).min(1, "OPENAI_API_KEY cannot be empty"),
  PORT: z.preprocess(
    (val) => (val ? parseInt(String(val), 10) : 5000),
    z.number().int().min(1000).max(65535).default(5000)
  ),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXTAUTH_SECRET: z.string().default("syntrix-ai-super-secret-key-2026"),
  NEXTAUTH_URL: z.string().default("http://localhost:3000"),
});

const validateEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment configuration:");
    result.error.errors.forEach((err) => {
      console.error(`   - ${err.path.join(".")}: ${err.message}`);
    });
    process.exit(1);
  }

  // Update process.env with parsed & typed values
  process.env.PORT = String(result.data.PORT);
  process.env.NODE_ENV = result.data.NODE_ENV;
  process.env.NEXTAUTH_SECRET = result.data.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_URL = result.data.NEXTAUTH_URL;

  console.log("✅ Environment variables validated successfully.");
};

module.exports = validateEnv;
