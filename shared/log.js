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
