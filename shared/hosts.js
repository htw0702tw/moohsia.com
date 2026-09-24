const ADMIN_HOSTS = new Set(["admin.moohsia.com", "admin.localhost"]);

/** @param {string} hostname */
export function isAdminHost(hostname) {
  const host = String(hostname || "")
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
  return ADMIN_HOSTS.has(host);
}
