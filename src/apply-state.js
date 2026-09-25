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
  error: "",
};

export function selectedPositions() {
  return applyDraft.positions.slice(0, 2);
}
