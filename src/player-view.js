const state = {
  section: "rank",
  season: 0,
  match: "",
  tab: "data",
  queue: "classic",
  chartSeason: "all",
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
  const next = id || "";
  if (state.match === next) {
    state.match = "";
    return;
  }
  state.match = next;
  state.tab = "data";
}

export function setPlayerQueue(queue) {
  state.queue = queue === "magic" ? "magic" : "classic";
}

export function setPlayerTab(tab) {
  state.tab = tab || "board";
}

export function setChartSeason(value) {
  state.chartSeason = value === "season" ? "season" : "all";
}
