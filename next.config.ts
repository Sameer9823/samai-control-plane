import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false },
  // samai-sdk lazily `import()`s each provider's peer dependency (openai,
  // @anthropic-ai/sdk, @google/generative-ai, @aws-sdk/client-bedrock-runtime)
  // only when that provider is actually used. Since this build only installs
  // the OpenAI peer dep, keep samai-sdk external to webpack so those
  // unused dynamic imports aren't statically resolved at build time.
  serverExternalPackages: ["samai-sdk"],
};

export default nextConfig;
