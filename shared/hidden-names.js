/** Names of people who left the guild. Public pages say 隊友. Stats stay. */

export const HIDDEN_NAME_LABEL = "隊友";

export const DEFAULT_HIDDEN_NAMES = ["han.漢.", "han.漢", "之喝", "十轉連輸蟲", "老10人"];

const NAME_MAX = 40;
const LIST_MAX = 40;

export function cleanHiddenNames(value) {
  if (!Array.isArray(value)) return [...DEFAULT_HIDDEN_NAMES];
  const out = [];
  const seen = new Set();
  for (const item of value) {
    const text = String(item ?? "").trim().slice(0, NAME_MAX);
    if (!text || text === HIDDEN_NAME_LABEL || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= LIST_MAX) break;
  }
  return out;
}

/** Import option: omitted uses the defaults; an explicit list, including empty, is kept. */
export function namesForImport(value) {
  if (value === undefined) return [...DEFAULT_HIDDEN_NAMES];
  return cleanHiddenNames(value);
}

export function isHiddenName(value, names) {
  const text = String(value ?? "").trim();
  if (!text) return false;
  return (names || []).some((name) => name === text);
}

export function redactText(value, names) {
  let text = String(value ?? "");
  const list = [...(names || [])].filter(Boolean).sort((a, b) => b.length - a.length);
  for (const name of list) {
    if (!text.includes(name)) continue;
    text = text.split(name).join(HIDDEN_NAME_LABEL);
  }
  return text;
}

export function redactValue(value, names) {
  if (!names?.length) return value;
  if (typeof value === "string") return redactText(value, names);
  if (Array.isArray(value)) return value.map((item) => redactValue(item, names));
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) out[key] = redactValue(value[key], names);
    return out;
  }
  return value;
}

function bucketKey(row) {
  return `${row?.side || ""}|${row?.hero || ""}`;
}

function withIgn(row, stored, names) {
  let ign = String(row?.ign || "");
  if (stored?.ign === HIDDEN_NAME_LABEL) ign = HIDDEN_NAME_LABEL;
  else if (isHiddenName(ign, names) || isHiddenName(stored?.ign, names)) ign = HIDDEN_NAME_LABEL;
  if (ign === String(row?.ign || "")) return row;
  return { ...row, ign };
}

/**
 * Keep a stored 隊友 on the matching scoreboard row, and never store a hidden name.
 * Combat numbers on the row are left as they are.
 */
export function shieldBoardNames(nextBoard, prevBoard, names) {
  const list = Array.isArray(names) ? names : namesForImport(names);
  const incoming = Array.isArray(nextBoard) ? nextBoard : [];
  const buckets = new Map();
  for (const row of Array.isArray(prevBoard) ? prevBoard : []) {
    const key = bucketKey(row);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push({ row, used: false });
  }
  const claimed = new Array(incoming.length);
  incoming.forEach((row, index) => {
    const bucket = buckets.get(bucketKey(row)) || [];
    const exact = bucket.find((item) => !item.used && item.row?.ign && item.row.ign === row?.ign);
    if (!exact) return;
    exact.used = true;
    claimed[index] = exact.row;
  });
  incoming.forEach((row, index) => {
    if (claimed[index]) return;
    const bucket = buckets.get(bucketKey(row)) || [];
    const alias = bucket.find((item) => !item.used && item.row?.ign === HIDDEN_NAME_LABEL);
    const open = bucket.filter((item) => !item.used);
    const chosen = alias || (open.length === 1 ? open[0] : null);
    if (!chosen) return;
    chosen.used = true;
    claimed[index] = chosen.row;
  });
  return incoming.map((row, index) => withIgn(row, claimed[index], list));
}

/** Apply the hidden-name list to an imported match. Owner notes already stored are kept. */
export function shieldImportedMatch(match, prev, names) {
  const list = Array.isArray(names) ? names : namesForImport(names);
  const keptNote = Boolean(prev?.note?.zh || prev?.note?.en);
  const note = keptNote
    ? match.note
    : {
        zh: redactText(match.note?.zh || "", list),
        en: redactText(match.note?.en || "", list),
      };
  const highlight = match.highlight
    ? {
        ...match.highlight,
        caption: match.highlight.caption
          ? {
              zh: redactText(match.highlight.caption.zh || "", list),
              en: redactText(match.highlight.caption.en || "", list),
            }
          : match.highlight.caption,
      }
    : match.highlight;
  return {
    ...match,
    label: redactText(match.label || "", list),
    note,
    highlight,
    board: shieldBoardNames(match.board, prev?.board, list),
  };
}
