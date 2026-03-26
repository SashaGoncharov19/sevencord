#!/usr/bin/env bun
/**
 * postBuild.ts — Electrobun post-build hook
 * Patches the macOS app's Info.plist to allow plain HTTP connections
 * (disables App Transport Security for the desktop client,
 *  since users may self-host over HTTP).
 */
import { $ } from "bun";
import { join } from "path";

const buildDir = process.env.ELECTROBUN_BUILD_DIR;
const appName = process.env.ELECTROBUN_APP_NAME ?? "7cord";

// PlistBuddy is macOS-only — skip ATS patching on other platforms
if (process.platform !== "darwin") {
  console.log("[postBuild] Non-macOS platform detected, skipping ATS patch.");
  process.exit(0);
}

if (!buildDir) {
  console.log("ELECTROBUN_BUILD_DIR not set — skipping ATS patch");
  process.exit(0);
}

const plistPath = join(buildDir, `${appName}.app`, "Contents", "Info.plist");

console.log(`[postBuild] Patching ATS in: ${plistPath}`);

try {
  // Allow all HTTP connections (needed for self-hosted servers over plain HTTP)
  await $`/usr/libexec/PlistBuddy -c "Add :NSAppTransportSecurity dict" "${plistPath}"`.quiet();
} catch {
  // Key might already exist — that's fine
}

await $`/usr/libexec/PlistBuddy -c "Add :NSAppTransportSecurity:NSAllowsArbitraryLoads bool true" "${plistPath}"`.quiet().catch(() => {
  // If it already exists, set it instead
  return $`/usr/libexec/PlistBuddy -c "Set :NSAppTransportSecurity:NSAllowsArbitraryLoads true" "${plistPath}"`.quiet();
});

// Also allow WebSockets (ws://) which follow the same ATS rules
await $`/usr/libexec/PlistBuddy -c "Add :NSAppTransportSecurity:NSAllowsArbitraryLoadsInWebContent bool true" "${plistPath}"`.quiet().catch(() =>
  $`/usr/libexec/PlistBuddy -c "Set :NSAppTransportSecurity:NSAllowsArbitraryLoadsInWebContent true" "${plistPath}"`.quiet()
);

console.log("[postBuild] ✅ ATS exception applied — plain HTTP/WS connections allowed");
