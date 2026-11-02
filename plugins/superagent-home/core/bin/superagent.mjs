#!/usr/bin/env node
import { AlreadyRunning } from "../src/lock.ts";
import { ConfigError } from "../src/config.ts";
import { main } from "../src/cli.ts";

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (e) {
  if (e instanceof AlreadyRunning || e instanceof ConfigError) {
    console.error(e.message);
    process.exitCode = 1;
  } else {
    throw e;
  }
}
