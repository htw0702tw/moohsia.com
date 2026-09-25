const empty = {
  heroes: [],
  modes: [],
  roles: [],
  fetchedAt: "",
  source: "",
  attribution: null,
};

let catalog = empty;
let role = "all";

export function getCatalog() {
  return catalog;
}

export function setCatalog(next) {
  if (!next || !Array.isArray(next.heroes)) {
    catalog = empty;
    return;
  }
  catalog = {
    heroes: next.heroes,
    modes: Array.isArray(next.modes) ? next.modes : [],
    roles: Array.isArray(next.roles) ? next.roles : [],
    fetchedAt: typeof next.fetchedAt === "string" ? next.fetchedAt : "",
    source: typeof next.source === "string" ? next.source : "",
    attribution: next.attribution && typeof next.attribution === "object" ? next.attribution : null,
  };
}

export function getRoleFilter() {
  return role;
}

export function setRoleFilter(next) {
  role = typeof next === "string" && next ? next : "all";
}
