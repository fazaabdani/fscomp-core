import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const tempDir = await mkdtemp(join(tmpdir(), "fscomp-wa-ai-"));

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit"
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, [
  "node_modules/typescript/bin/tsc",
  "lib/wa-ai-policy.ts",
  "--target",
  "ES2022",
  "--module",
  "NodeNext",
  "--moduleResolution",
  "NodeNext",
  "--skipLibCheck",
  "--strict",
  "--outDir",
  tempDir
]);

const policyModule = await import(pathToFileURL(join(tempDir, "wa-ai-policy.js")).href);
const {
  decideWaAiPolicy,
  inferWaAiIntent,
  isWithinOperationalHours,
  defaultStoreOperationalHours
} = policyModule;

const baseInput = {
  customerPolicy: "AUTO_SAFE",
  status: "OPEN",
  leadScore: "COLD",
  riskLevel: "SAFE",
  intent: "CATALOG",
  aiTakeoverAllowed: true,
  now: new Date("2026-06-23T03:00:00.000Z"),
  settings: {
    operationalHours: defaultStoreOperationalHours
  }
};

test("safe catalog can auto reply", () => {
  const decision = decideWaAiPolicy(baseInput);
  assert.equal(decision.action, "AUTO_REPLY");
  assert.equal(decision.allowSafeCatalog, true);
  assert.equal(decision.notifyAdmin, false);
});

test("hot lead bridges and waits for admin", () => {
  const decision = decideWaAiPolicy({
    ...baseInput,
    leadScore: "HOT",
    intent: "HOT_LEAD"
  });
  assert.equal(decision.action, "BRIDGE_AND_HANDOVER");
  assert.equal(decision.nextStatus, "WAITING_ADMIN");
  assert.equal(decision.notifyAdmin, true);
});

test("risk intent hands over to admin", () => {
  const decision = decideWaAiPolicy({
    ...baseInput,
    intent: "COMPLAINT",
    riskLevel: "RISK"
  });
  assert.equal(decision.action, "HANDOVER_ADMIN");
  assert.equal(decision.nextStatus, "WAITING_ADMIN");
  assert.equal(decision.notifyAdmin, true);
});

test("admin only customer cannot get auto reply", () => {
  const decision = decideWaAiPolicy({
    ...baseInput,
    customerPolicy: "ADMIN_ONLY"
  });
  assert.equal(decision.action, "HANDOVER_ADMIN");
  assert.equal(decision.allowSafeCatalog, false);
});

test("blocked customer blocks AI", () => {
  const decision = decideWaAiPolicy({
    ...baseInput,
    customerPolicy: "BLOCKED_AI"
  });
  assert.equal(decision.action, "BLOCK_AI");
  assert.equal(decision.notifyAdmin, false);
});

test("admin response blocks AI unless takeover allowed", () => {
  const decision = decideWaAiPolicy({
    ...baseInput,
    lastAdminResponseAt: new Date("2026-06-23T02:00:00.000Z"),
    aiTakeoverAllowed: false
  });
  assert.equal(decision.action, "HANDOVER_ADMIN");
  assert.equal(decision.reason, "admin_already_responded");
});

test("outside hours are detected", () => {
  assert.equal(isWithinOperationalHours(new Date("2026-06-22T16:30:00.000Z"), defaultStoreOperationalHours), false);
});

test("intent inference detects payment and complaint safely", () => {
  assert.equal(inferWaAiIntent("mau transfer DP booking"), "PAYMENT");
  assert.equal(inferWaAiIntent("laptop rusak dan saya komplain"), "COMPLAINT");
});

await rm(tempDir, { recursive: true, force: true });
