#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_PROJECT_OWNER = "warleymendeslopes";
const DEFAULT_PROJECT_OWNER_TYPE = "user";
const DEFAULT_PROJECT_NUMBER = "3";
const DEFAULT_STATUS_FIELD = "Status";
const DEFAULT_BACKLOG_STATUS = "Backlog";
const DEFAULT_READY_STATUS = "Ready";
const GRAPHQL_URL = "https://api.github.com/graphql";
const REST_URL = "https://api.github.com";

loadEnvFile(".env.github.local");

const args = parseArgs(process.argv.slice(2));

if (args.help || args.command === "help") {
  printHelp();
  process.exit(0);
}

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!token) {
  fail(
    "Missing GITHUB_TOKEN or GH_TOKEN. Create .env.github.local or export one before running this script.",
  );
}

const projectOwner =
  args.owner || process.env.GITHUB_PROJECT_OWNER || DEFAULT_PROJECT_OWNER;
const projectOwnerType = normalize(
  args.ownerType ||
    process.env.GITHUB_PROJECT_OWNER_TYPE ||
    DEFAULT_PROJECT_OWNER_TYPE,
);
const projectNumber = Number(
  args.project || process.env.GITHUB_PROJECT_NUMBER || DEFAULT_PROJECT_NUMBER,
);

if (!["user", "organization", "org"].includes(projectOwnerType)) {
  fail('Project owner type must be "user" or "organization".');
}

if (!Number.isInteger(projectNumber) || projectNumber <= 0) {
  fail("Project number must be a positive integer.");
}

try {
  if (args.command === "info" || !args.command) {
    const project = await getProject(projectOwner, projectNumber, projectOwnerType);
    printProjectInfo(project);
    process.exit(0);
  }

  const status = resolveStatus(args);
  const title = args.title;
  const body = args.body || "";

  if (!title) {
    fail("Missing --title. Run `npm run github:project -- help` for examples.");
  }

  const project = await getProject(projectOwner, projectNumber, projectOwnerType);
  const statusField = findField(
    project,
    args.field || process.env.GITHUB_PROJECT_STATUS_FIELD || DEFAULT_STATUS_FIELD,
  );
  const statusOption = findStatusOption(project, statusField, status);

  const useDraft = Boolean(args.draft);
  const repo = useDraft
    ? null
    : args.repo || process.env.GITHUB_REPO || inferRepoFromGit();

  const created = repo
    ? await createIssueAndAddToProject(project, repo, title, body)
    : await createDraftIssue(project, title, body);

  await updateProjectStatus(
    project.id,
    created.itemId,
    statusField.id,
    statusOption.id,
  );

  console.log(`Created ${created.kind}: ${created.url || created.title}`);
  console.log(`Project: ${project.title} (${project.url})`);
  console.log(`Status: ${statusOption.name}`);
} catch (error) {
  fail(error.message);
}

function parseArgs(rawArgs) {
  const parsed = { _: [] };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (!arg.startsWith("--")) {
      parsed._.push(arg);
      continue;
    }

    const option = arg.slice(2);
    const equalsIndex = option.indexOf("=");
    const key = equalsIndex === -1 ? option : option.slice(0, equalsIndex);
    const inlineValue =
      equalsIndex === -1 ? undefined : option.slice(equalsIndex + 1);
    const nextValue = rawArgs[index + 1];
    const booleanFlag =
      inlineValue === undefined && (!nextValue || nextValue.startsWith("--"));

    parsed[toCamelCase(key)] = booleanFlag
      ? true
      : inlineValue ?? rawArgs[++index];
  }

  return {
    ...parsed,
    command: parsed._[0],
    help: Boolean(parsed.help || parsed.h),
  };
}

function resolveStatus(args) {
  const command = normalize(args.command);

  if (command === "backlog") {
    return process.env.GITHUB_PROJECT_BACKLOG_STATUS || DEFAULT_BACKLOG_STATUS;
  }

  if (command === "ready") {
    return process.env.GITHUB_PROJECT_READY_STATUS || DEFAULT_READY_STATUS;
  }

  const status = args.status;
  if (!status) {
    fail("Missing status. Use `backlog`, `ready`, or `add --status <name>`.");
  }

  return status;
}

async function getProject(owner, number, ownerType) {
  const ownerField = ownerType === "user" ? "user" : "organization";
  const query = `
    query Project($login: String!, $number: Int!) {
      ${ownerField}(login: $login) {
        projectV2(number: $number) {
          ...ProjectFields
        }
      }
    }

    fragment ProjectFields on ProjectV2 {
      id
      title
      url
      fields(first: 100) {
        nodes {
          ... on ProjectV2Field {
            id
            name
            dataType
          }
          ... on ProjectV2IterationField {
            id
            name
            dataType
          }
          ... on ProjectV2SingleSelectField {
            id
            name
            dataType
            options {
              id
              name
            }
          }
        }
      }
    }
  `;

  const data = await githubGraphql(query, { login: owner, number });
  const project = data[ownerField]?.projectV2;

  if (!project) {
    fail(`Project ${owner}/${number} was not found or the token cannot access it.`);
  }

  return project;
}

async function createIssueAndAddToProject(project, repo, title, body) {
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    fail(`Invalid repo "${repo}". Use owner/name, for example warleymendeslopes/EduConnect.`);
  }

  const issue = await githubRest("POST", `/repos/${owner}/${name}/issues`, {
    title,
    body,
  });

  const mutation = `
    mutation AddItem($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item {
          id
        }
      }
    }
  `;

  const data = await githubGraphql(mutation, {
    projectId: project.id,
    contentId: issue.node_id,
  });

  return {
    kind: "issue",
    itemId: data.addProjectV2ItemById.item.id,
    title: issue.title,
    url: issue.html_url,
  };
}

async function createDraftIssue(project, title, body) {
  const mutation = `
    mutation AddDraft($projectId: ID!, $title: String!, $body: String) {
      addProjectV2DraftIssue(input: { projectId: $projectId, title: $title, body: $body }) {
        projectItem {
          id
          content {
            ... on DraftIssue {
              title
            }
          }
        }
      }
    }
  `;

  const data = await githubGraphql(mutation, {
    projectId: project.id,
    title,
    body,
  });

  const projectItem = data.addProjectV2DraftIssue.projectItem;

  return {
    kind: "draft issue",
    itemId: projectItem.id,
    title: projectItem.content?.title || title,
    url: null,
  };
}

async function updateProjectStatus(projectId, itemId, fieldId, optionId) {
  const mutation = `
    mutation UpdateStatus(
      $projectId: ID!
      $itemId: ID!
      $fieldId: ID!
      $optionId: String!
    ) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: { singleSelectOptionId: $optionId }
        }
      ) {
        projectV2Item {
          id
        }
      }
    }
  `;

  await githubGraphql(mutation, {
    projectId,
    itemId,
    fieldId,
    optionId,
  });
}

async function githubGraphql(query, variables = {}) {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: githubHeaders(),
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `GitHub GraphQL error ${response.status}: ${JSON.stringify(payload)}`,
    );
  }

  if (payload.errors?.length) {
    const message = payload.errors.map((error) => error.message).join("; ");
    const permissionHint =
      "Resource not accessible by personal access token. For user-owned Projects, use a classic personal access token with the project scope and repo/public_repo access.";

    throw new Error(
      message.includes("Resource not accessible by personal access token")
        ? permissionHint
        : message,
    );
  }

  return payload.data;
}

async function githubRest(method, path, body) {
  const response = await fetch(`${REST_URL}${path}`, {
    method,
    headers: githubHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`GitHub REST error ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function findField(project, fieldName) {
  const normalizedName = normalize(fieldName);
  const field = project.fields.nodes.find(
    (node) => node && normalize(node.name) === normalizedName,
  );

  if (!field) {
    fail(
      `Field "${fieldName}" was not found. Available fields: ${project.fields.nodes
        .filter(Boolean)
        .map((node) => node.name)
        .join(", ")}`,
    );
  }

  if (!Array.isArray(field.options)) {
    fail(`Field "${field.name}" is not a single-select field.`);
  }

  return field;
}

function findStatusOption(project, field, statusName) {
  const normalizedStatus = normalize(statusName);
  const option = field.options.find(
    (item) => normalize(item.name) === normalizedStatus,
  );

  if (!option) {
    fail(
      `Status "${statusName}" was not found in ${project.title}. Available statuses: ${field.options
        .map((item) => item.name)
        .join(", ")}`,
    );
  }

  return option;
}

function printProjectInfo(project) {
  const fields = project.fields.nodes.filter(Boolean);

  console.log(`${project.title}`);
  console.log(`${project.url}`);
  console.log("");
  console.log("Fields:");

  for (const field of fields) {
    const options = field.options?.map((option) => option.name).join(", ");
    console.log(`- ${field.name}${options ? `: ${options}` : ""}`);
  }
}

function inferRepoFromGit() {
  try {
    const remote = execFileSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    const sshMatch = remote.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
    const httpsMatch = remote.match(/^https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/);
    const match = sshMatch || httpsMatch;

    return match ? `${match[1]}/${match[2]}` : null;
  } catch {
    return null;
  }
}

function loadEnvFile(fileName) {
  const path = join(process.cwd(), fileName);

  if (!existsSync(path)) {
    return;
  }

  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = stripQuotes(rawValue);
  }
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function printHelp() {
  console.log(`
Create or inspect demands in GitHub Projects.

Defaults:
  project owner: ${DEFAULT_PROJECT_OWNER}
  project number: ${DEFAULT_PROJECT_NUMBER}
  repo: inferred from git remote origin

Environment:
  GITHUB_TOKEN=github_pat_...
  GITHUB_PROJECT_OWNER=${DEFAULT_PROJECT_OWNER}
  GITHUB_PROJECT_OWNER_TYPE=${DEFAULT_PROJECT_OWNER_TYPE}
  GITHUB_PROJECT_NUMBER=${DEFAULT_PROJECT_NUMBER}
  GITHUB_PROJECT_STATUS_FIELD=${DEFAULT_STATUS_FIELD}
  GITHUB_PROJECT_BACKLOG_STATUS=${DEFAULT_BACKLOG_STATUS}
  GITHUB_PROJECT_READY_STATUS=${DEFAULT_READY_STATUS}
  GITHUB_REPO=warleymendeslopes/EduConnect

Commands:
  info
    Read the project fields and status options.

  backlog --title "Title" --body "Details"
    Create a repo issue, add it to the project, and set Status=Backlog.

  ready --title "Title" --body "Details"
    Create a repo issue, add it to the project, and set Status=Ready.

  add --status "Custom status" --title "Title"
    Create a demand with any available status option.

Options:
  --draft
    Create a draft issue in the project instead of a repository issue.

  --repo owner/name
    Override the repository used for issue creation.

Examples:
  npm run github:project -- info
  npm run backlog:add -- --title "Criar painel do professor" --body "Detalhes da demanda"
  npm run ready:add -- --title "Ajustar login do aluno" --body "Detalhes da demanda"
  npm run github:project -- add --status "In Progress" --title "Nova demanda"
  npm run github:project -- backlog --draft --title "Ideia sem issue no repo"
`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
