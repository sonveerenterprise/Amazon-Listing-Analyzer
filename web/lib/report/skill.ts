// Locates the skill (the repository's SKILL.md, references, template and
// scripts) and copies it into a report's working folder, so the agent reads
// the same instructions Claude Code would. Editing the skill changes the app.
import fs from "node:fs";
import path from "node:path";

export const skillDir = () => path.resolve(process.env.SKILL_DIR || path.join(process.cwd(), ".."));

export function skillAvailable(): boolean {
  return fs.existsSync(path.join(skillDir(), "SKILL.md")) && fs.existsSync(path.join(skillDir(), "assets", "report_template.html"));
}

export function readSkill(): string {
  // Drop the YAML front matter; it is configuration for Claude Code, not instructions.
  return fs.readFileSync(path.join(skillDir(), "SKILL.md"), "utf8").replace(/^---\n[\s\S]*?\n---\n/, "").trim();
}

export function copySkillInto(workDir: string) {
  const dest = path.join(workDir, "skill");
  fs.mkdirSync(dest, { recursive: true });
  for (const name of ["SKILL.md", "config.yaml"]) {
    const src = path.join(skillDir(), name);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dest, name));
  }
  for (const dir of ["references", "assets", "scripts"]) {
    const src = path.join(skillDir(), dir);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(dest, dir), { recursive: true });
  }
}
