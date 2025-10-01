/**
 * Shared cooldown management for bulk search operations
 *
 * **Next.js SSR Concept:**
 * This Map lives in Node.js server memory and is shared across API routes
 * in the same process. Moving it out of the route file is necessary because
 * Next.js route files can only export specific route handlers (GET, POST, etc.)
 * and configuration options, not arbitrary variables.
 *
 * Key: requestId (unique identifier for each cooldown)
 * Value: resolve function that wakes up the waiting server
 */
export const pendingCooldowns = new Map<string, () => void>()
