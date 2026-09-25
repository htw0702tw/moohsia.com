const state = {
  section: "battle",
  season: 0,
  match: "",
  tab: "board",
};

export function getPlayerView() {
  return state;
}

export function setPlayerSection(section) {
  state.section = section || "battle";
}

export function setPlayerSeason(index) {
  state.season = Number.isInteger(index) && index >= 0 ? index : 0;
}

export function setPlayerMatch(id) {
  state.match = id || "";
  state.tab = "board";
}

export function setPlayerTab(tab) {
  state.tab = tab || "board";
}
