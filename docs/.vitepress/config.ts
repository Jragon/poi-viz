import { execSync } from "node:child_process";
import { defineConfig } from "vitepress";

function getCommitHash(): string {
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA.slice(0, 7);
  }

  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "UNCONFIRMED";
  }
}

const commitHash = getCommitHash();

export default defineConfig({
  title: "Poi Visualiser Docs",
  description: "Executable documentation for engine math, VTG generation, and deterministic validation.",
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: "Guide", link: "/" },
      { text: "API", link: "/api/index.html" }
    ],
    sidebar: [
      {
        text: "Core",
        items: [
          { text: "Overview", link: "/" },
          { text: "Math Model", link: "/math-model" },
          { text: "Engine Architecture", link: "/engine-architecture" },
          { text: "VTG Layer", link: "/vtg-layer" },
          { text: "Validation", link: "/validation" }
        ]
      },
      {
        text: "Reference",
        items: [
          { text: "Glossary", link: "/glossary" },
          { text: "Style Guide", link: "/style" },
          { text: "TypeDoc API", link: "/api/index.html" }
        ]
      }
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/jragon/poi-viz" }],
    footer: {
      message: `Built from commit ${commitHash}`,
      copyright: "Documentation tracks executable code and tests in this repository."
    }
  }
});
