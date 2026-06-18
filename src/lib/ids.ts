import { randomBytes } from "node:crypto";

export function shortId(prefix = "") {
  return prefix + randomBytes(6).toString("hex");
}
