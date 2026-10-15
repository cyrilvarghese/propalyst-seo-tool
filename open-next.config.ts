import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";

// No incremental cache: every page and API route here is dynamic, and property
// data lives in Supabase.
export default defineCloudflareConfig({});
