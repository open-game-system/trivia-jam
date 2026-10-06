import { serveOgsJwks } from "./helpers/ogs";

/** One local OGS key set for the whole run (flow 13 signs game tokens against it). */
export default async function globalSetup() {
  return serveOgsJwks();
}
