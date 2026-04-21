import fs from "node:fs";
import path from "node:path";

const allowNonPr = process.argv.includes("--allow-non-pr");
const eventName = process.env.GITHUB_EVENT_NAME || "";
const eventPath = process.env.GITHUB_EVENT_PATH || "";
const reportPath =
  process.env.PR_HYGIENE_REPORT_PATH || path.join("tmp", "ci", "pr-hygiene-report.json");

fs.mkdirSync(path.dirname(reportPath), { recursive: true });

if (!["pull_request", "pull_request_target"].includes(eventName)) {
  if (allowNonPr) {
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          skipped: true,
          reason: `event ${eventName || "unknown"} does not provide pull request metadata`
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  console.error("PR hygiene check only supports pull_request or pull_request_target events.");
  process.exit(1);
}

if (!eventPath || !fs.existsSync(eventPath)) {
  console.error("GITHUB_EVENT_PATH is required for PR hygiene validation.");
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(eventPath, "utf8"));
const pullRequest = payload.pull_request || {};
const title = String(pullRequest.title || "").trim();
const body = String(pullRequest.body || "");

const errors = [];

if (title.length < 10) {
  errors.push("Pull request title must be descriptive and at least 10 characters long.");
}

for (const heading of ["## Summary", "## Validation", "## Notes"]) {
  if (!new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "im").test(body)) {
    errors.push(`Pull request body must include the heading "${heading}".`);
  }
}

if (!/- \[[ xX]\]/.test(body)) {
  errors.push("Pull request body must include at least one checklist item under Validation.");
}

const report = {
  title,
  errors,
  valid: errors.length === 0
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}
