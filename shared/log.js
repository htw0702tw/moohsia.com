/**
 * Operational log for the Worker.
 * Only a fixed code and the error name are recorded.
 * Call sites must pass a literal code, never request data or thrown text.
 * @param {string} code
 * @param {unknown} error
 */
export function logFailure(code, error) {
  const name = error instanceof Error && error.name ? error.name : "Error";
  console.error(JSON.stringify({ message: code, name }));
}

/** Fixed operational code only. Never pass request data or page text. */
export function logEvent(code) {
  if (!/^[a-z0-9_]{1,40}$/.test(code)) return;
  console.log(JSON.stringify({ message: code }));
}
