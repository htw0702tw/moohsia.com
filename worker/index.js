import { handleApi } from "../shared/api.js";

/**
 * Marketing site for moohsia.com (暮霞｜MOS).
 * This Worker is `moohsia-com`. It does not replace `moohsia-cloud`,
 * the separate AI/chat API Worker.
 *
 * @typedef {Object} Env
 * @property {Fetcher} ASSETS
 * @property {string} [DISCORD_INVITE_URL]
 */

export default {
  /** @param {Request} request @param {Env} env */
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
        return await handleApi(request, env);
      }
      return await env.ASSETS.fetch(request);
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "worker_error",
          name: error instanceof Error ? error.name : "Error",
        }),
      );
      return new Response("Service unavailable", {
        status: 500,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }
  },
};
