const empty = {
  heroes: [],
  items: [],
  modes: [],
  roles: [],
  activities: [],
  fetchedAt: "",
  source: "",
  attribution: null,
};

let catalog = empty;
let role = "all";
let activityKind = "all";
let itemCategory = "all";

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
    items: Array.isArray(next.items) ? next.items : [],
    modes: Array.isArray(next.modes) ? next.modes : [],
    roles: Array.isArray(next.roles) ? next.roles : [],
    activities: Array.isArray(next.activities) ? next.activities : [],
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

export function getActivityFilter() {
  return activityKind;
}

export function setActivityFilter(next) {
  activityKind = typeof next === "string" && next ? next : "all";
}

export function getItemCategory() {
  return itemCategory;
}

export function setItemCategory(next) {
  itemCategory = typeof next === "string" && next ? next : "all";
}
