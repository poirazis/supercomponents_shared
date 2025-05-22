// Sizing temaplates for the Adobe Spectrum Table look
export const sizingMap = {
  S: {
    cellPadding: "0.4rem",
    rowFontSize: 12,
    rowHeight: 32,
    headerFontSize: 10,
    headerHeight: 32,
    checkboxSize: 12,
  },
  M: {
    cellPadding: "0.5rem",
    rowFontSize: 13,
    rowHeight: 36,
    headerFontSize: 11,
    headerHeight: 38,
    checkboxSize: 14,
  },
  L: {
    cellPadding: "0.85rem",
    rowFontSize: 15,
    rowHeight: 42,
    headerFontSize: 12,
    headerHeight: 48,
    checkboxSize: 14,
  },
};

export const defaultOperatorMap = {
  string: "fuzzy",
  longform: "fuzzy",
  formula: "fuzzy",
  array: "contains",
  options: "equal",
  datetime: "rangeLow",
  boolean: "equal",
  number: "equal",
  bigint: "equal",
  link: "fuzzy",
  bb_reference_single: "equal",
  bb_reference: "equal",
};

export const supportFilteringMap = {
  string: true,
  longform: true,
  array: true,
  options: true,
  datetime: true,
  boolean: true,
  number: true,
  bigint: true,
  link: true,
  bb_reference_single: false,
  bb_reference: false,
};

export const supportSortingMap = {
  string: true,
  longform: true,
  formula: true,
  array: true,
  options: true,
  datetime: true,
  boolean: true,
  number: true,
  bigint: true,
};

export const supportEditingMap = {
  string: true,
  longform: true,
  array: true,
  link: true,
  json: true,
  bb_reference: true,
  bb_reference_single: true,
  options: true,
  datetime: true,
  boolean: true,
  number: true,
  bigint: true,
  attachment: true,
  attachment_single: true,
};
