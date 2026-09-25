export const applyDraft = {
  rank: "",
  uid: "",
  nickname: "",
  email: "",
  gender: "",
  ageBand: "",
  motivation: "",
  positions: [],
  weekday: "",
  holiday: "",
  practice: "",
  conduct: false,
  status: "",
  /** null when there is no error; "" for the generic line; otherwise an API code. */
  errorCode: null,
  field: "",
  mailDelayed: false,
};

/** Mapped API `code`, or the generic line when the response has no known code. */
export function applyErrorText(page, code) {
  const known = page && typeof page.errors === "object" && page.errors && typeof code === "string" ? page.errors[code] : "";
  if (typeof known === "string" && known) return known;
  return page && typeof page.fail === "string" ? page.fail : "";
}

export function selectedPositions() {
  return applyDraft.positions.slice(0, 2);
}
