import { access, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const source = path.resolve("yauum-site-content/images");
const destination = path.resolve("public/uploads");

await mkdir(destination, { recursive: true });
try {
  await access(source);
  await cp(source, destination, { recursive: true, force: true });
  console.log("Synced content-library images to public/uploads");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  console.log("Content-library images unavailable; using committed public/uploads assets");
}
await rm(path.join(destination, ".DS_Store"), { force: true });
