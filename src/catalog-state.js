const empty = {
  heroes: [],
  items: [],
  arcana: [],
  userSkills: [],
  modes: [],
  roles: [],
  activities: [],
  fetchedAt: "",
  source: "",
  attribution: null,
};

let catalog = empty;
let role = "all";
let itemCategory = "all";
let activityKind = "all";
let arcanaLevel = "all";
let arcanaTag = "all";
let arcanaQuery = "";
let skillSlot = "all";
let skillQuery = "";

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
    arcana: Array.isArray(next.arcana) ? next.arcana : [],
    userSkills: Array.isArray(next.userSkills) ? next.userSkills : [],
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

export function getItemFilter() {
  return itemCategory;
}

export function setItemFilter(next) {
  itemCategory = typeof next === "string" && next ? next : "all";
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

export function getArcanaLevel() {
  return arcanaLevel;
}

export function setArcanaLevel(next) {
  arcanaLevel = typeof next === "string" && next ? next : "all";
}

export function getArcanaTag() {
  return arcanaTag;
}

export function setArcanaTag(next) {
  arcanaTag = typeof next === "string" && next ? next : "all";
}

export function getArcanaQuery() {
  return arcanaQuery;
}

export function setArcanaQuery(next) {
  arcanaQuery = String(next || "").slice(0, 40);
}

export function getSkillSlot() {
  return skillSlot;
}

export function setSkillSlot(next) {
  skillSlot = typeof next === "string" && next ? next : "all";
}

export function getSkillQuery() {
  return skillQuery;
}

export function setSkillQuery(next) {
  skillQuery = String(next || "").slice(0, 40);
}
