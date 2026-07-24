import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const source = path.resolve("../yauum-site-content/images");
const destination = path.resolve("public/uploads");

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });
await rm(path.join(destination, ".DS_Store"), { force: true });
console.log("Synced content-library images to public/uploads");
