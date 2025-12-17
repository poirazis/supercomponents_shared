/**
 * Shared TypeScript types for SuperTableCells components
 */

/**
 * Cell role determines the rendering context and styling
 */
export type CellRole = "formInput" | "tableCell" | "inlineInput";

/**
 * Cell state for FSM
 */
export type CellState = "View" | "Editing" | "Loading";

/**
 * Text alignment options
 */
export type CellAlign = "flex-start" | "center" | "flex-end";

/**
 * Common options available to all cell components
 */
export interface BaseCellOptions {
  /** Role determines the rendering context */
  role?: CellRole;
  /** Initial FSM state */
  initialState?: CellState;
  /** Debounce delay in milliseconds for change events */
  debounce?: number;
  /** Whether the cell is read-only */
  readonly?: boolean;
  /** Whether the cell is disabled */
  disabled?: boolean;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Template string for formatting display value */
  template?: string;
  /** Icon to display (CSS class) */
  icon?: string;
  /** Whether the cell has an error */
  error?: boolean;
  /** Whether to show dirty indicator */
  showDirty?: boolean;
  /** Text/content alignment */
  align?: CellAlign;
  /** Text color */
  color?: string;
  /** Background color */
  background?: string;
  /** Font weight */
  fontWeight?: string | number;
}

/**
 * Options specific to CellString component
 */
export interface CellStringOptions extends BaseCellOptions {
  /** Control type for input */
  controlType?: "input" | "textarea";
  /** Whether to show clear icon */
  clearIcon?: boolean;
}

/**
 * Options specific to CellNumber component
 */
export interface CellNumberOptions extends BaseCellOptions {
  /** Whether to show stepper controls */
  stepper?: boolean;
  /** Step increment value */
  step?: number;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Decimal precision */
  precision?: number;
  /** Whether to enable mouse wheel */
  enableWheel?: boolean;
}

/**
 * Options specific to CellBoolean component
 */
export interface CellBooleanOptions extends BaseCellOptions {
  /** Control type: switch or checkbox */
  controlType?: "switch" | "checkbox";
  /** Label to display inline with control */
  inlineLabel?: string;
}

/**
 * Options specific to CellOptions/CellOptionsAdvanced components
 */
export interface CellOptionsOptions extends BaseCellOptions {
  /** View mode for options display */
  optionsViewMode?: "pills" | "text" | "links" | "list" | "buttons" | "radio";
  /** Whether to allow reordering */
  reorderOnly?: boolean;
  /** Whether to show colors */
  showColors?: boolean;
  /** Data source type */
  optionsSource?: "schema" | "custom" | "datasource";
  /** Custom options array */
  customOptions?: Array<{ label: string; value: any; color?: string }>;
}

/**
 * Options specific to CellAttachment components
 */
export interface CellAttachmentOptions extends BaseCellOptions {
  /** Control type for display */
  controlType?: "list" | "grid" | "carousel";
  /** Image aspect ratio */
  imageRatio?: "landscape" | "portrait" | "square";
  /** Grid columns (for grid mode) */
  gridColumns?: number;
  /** Whether in gallery mode */
  isGallery?: boolean;
  /** Action on click */
  onClickAction?: "view" | "download" | "none";
  /** Whether using slot content */
  slotted?: boolean;
  /** Carousel options */
  carouselDots?: boolean;
  carouselArrows?: boolean;
  carouselInfinite?: boolean;
  carouselAutoplay?: boolean;
  carouselAutoplaySpeed?: number;
  carouselItemsToShow?: number;
  carouselItemsToScroll?: number;
  carouselMode?: "standard" | "marquee";
}

/**
 * Options specific to CellDatetime/CellDateRange components
 */
export interface CellDatetimeOptions extends BaseCellOptions {
  /** Date format string */
  dateFormat?:
    | "default"
    | "MM/DD/YYYY"
    | "DD/MM/YYYY"
    | "YYYY-MM-DD"
    | "MMM DD, YYYY"
    | "DD MMM YYYY";
  /** Whether to show time picker */
  showTime?: boolean;
}

/**
 * Options specific to CellJSON component
 */
export interface CellJSONOptions extends BaseCellOptions {
  /** Whether to enable multiline editing */
  multiline?: boolean;
}

/**
 * Options specific to CellLink/CellLinkAdvanced/CellSQLLink components
 */
export interface CellLinkOptions extends BaseCellOptions {
  /** View mode for links display */
  simpleView?: boolean;
  /** Filter for relationship options */
  filter?: any;
  /** Limit number of options */
  limit?: number;
  /** Search term */
  search?: string;
}

/**
 * Common API interface for all cell components
 */
export interface CellApi<T = any> {
  /** Focus the cell and enter edit mode */
  focus: () => void;
  /** Reset the cell to its initial state */
  reset: () => void;
  /** Check if cell is currently editing */
  isEditing: () => boolean;
  /** Check if cell value has been modified */
  isDirty: () => boolean;
  /** Get the current local value */
  getValue: () => T;
  /** Set an error on the cell */
  setError: (err: string) => void;
  /** Clear all errors */
  clearError: () => void;
  /** Set the cell value */
  setValue: (val: T) => void;
}

/**
 * Common event types dispatched by cell components
 */
export interface CellEvents<T = any> {
  /** Fired when entering edit mode */
  enteredit: void;
  /** Fired when exiting edit mode */
  exitedit: void;
  /** Fired when focus leaves the cell */
  focusout: void;
  /** Fired when value changes */
  change: T;
  /** Fired when edit is cancelled */
  cancel: void;
  /** Fired when value is cleared */
  clear: null;
}

/**
 * Field schema from Budibase
 */
export interface FieldSchema {
  type: string;
  name?: string;
  constraints?: {
    type?: string;
    presence?: boolean;
    numericality?: {
      greaterThanOrEqualTo?: number;
      lessThanOrEqualTo?: number;
    };
  };
  relationshipType?: "one-to-many" | "many-to-one" | "many-to-many";
  tableId?: string;
  fieldName?: string;
}
