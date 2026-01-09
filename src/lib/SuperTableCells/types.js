/**
 * @fileoverview Shared type definitions for SuperTableCells components using JSDoc
 * These types provide IntelliSense and type checking for both JavaScript and TypeScript files.
 *
 * Uses a unified CellOptions type with common base properties and optional type-specific extensions.
 */

// ============================================================================
// ENUMS & PRIMITIVE TYPES
// ============================================================================

/**
 * Cell role determines the rendering context and styling
 * @typedef {"formInput" | "tableCell" | "inlineInput"} CellRole
 */

/**
 * Cell state for FSM. Represents reachable states in the cell component finite state machines.
 * - View: Default read-only display state
 * - Editing: User is actively editing the cell value
 * - Loading: Data is being fetched (used by cells with data dependencies)
 * @typedef {"View" | "Editing" | "Loading"} CellState
 */

/**
 * Text alignment options
 * @typedef {"flex-start" | "center" | "flex-end"} CellAlign
 */

/**
 * Control type union covering all cell variants
 * @typedef {"input" | "textarea" | "switch" | "checkbox" | "pills" | "text" | "links" | "list" | "buttons" | "radio" | "grid" | "carousel" | "expanded" | "inputSelect"} CellControlType
 */

// ============================================================================
// UNIFIED CELL OPTIONS
// ============================================================================

/**
 * Unified options for all Cell components.
 * Contains common base properties and optional type-specific extensions.
 *
 * @typedef {Object} CellOptions
 *
 * ---------------------------------------------------------------------------
 * COMMON PROPERTIES (used by all/most cells)
 * ---------------------------------------------------------------------------
 * @property {CellRole} [role="formInput"] - Role determines the rendering context and styling
 * @property {CellState} [initialState="View"] - Initial FSM state
 * @property {number} [debounce] - Debounce delay in milliseconds for change events
 * @property {boolean} [readonly] - Whether the cell is read-only
 * @property {boolean} [disabled] - Whether the cell is disabled
 * @property {string} [placeholder] - Placeholder text when empty
 * @property {string} [template] - Template string for formatting display value (uses processStringSync)
 * @property {string} [icon] - Icon CSS class to display (e.g., "ph ph-warning")
 * @property {boolean} [error] - Whether the cell has an error state
 * @property {boolean} [showDirty] - Whether to show dirty/modified indicator
 * @property {CellAlign} [align] - Text/content alignment
 * @property {string} [color] - Text color (CSS value)
 * @property {string} [background] - Background color (CSS value)
 * @property {string | number} [fontWeight] - Font weight
 * @property {CellControlType} [controlType] - Control type variant for the cell
 * @property {boolean} [clearIcon] - Whether to show clear/reset icon
 *
 * ---------------------------------------------------------------------------
 * NUMBER PROPERTIES
 * ---------------------------------------------------------------------------
 * @property {number} [defaultValue] - Default numeric value
 * @property {boolean} [showStepper] - Whether to show increment/decrement stepper controls
 * @property {number} [stepSize] - Step increment value for stepper
 * @property {number} [min] - Minimum allowed value
 * @property {number} [max] - Maximum allowed value
 * @property {number} [decimals] - Number of decimal places to display
 * @property {string} [thousandsSeparator] - Thousands separator character (e.g., ",")
 * @property {string} [clearValueIcon] - Icon for clearing numeric value
 * @property {boolean} [enableWheel] - Whether to enable mouse wheel for value changes
 *
 * ---------------------------------------------------------------------------
 * BOOLEAN PROPERTIES
 * ---------------------------------------------------------------------------
 * @property {string} [inlineLabel] - Label to display inline with boolean control
 * @property {boolean} [showFalse] - Whether to show icon/indicator for false value
 *
 * ---------------------------------------------------------------------------
 * OPTIONS/SELECT PROPERTIES
 * ---------------------------------------------------------------------------
 * @property {"pills" | "text" | "links" | "list" | "buttons" | "radio"} [optionsViewMode] - View mode for options display
 * @property {"schema" | "custom" | "data"} [optionsSource] - Data source type for options
 * @property {Array<{label: string, value: any, color?: string}>} [customOptions] - Custom options array
 * @property {boolean} [reorderOnly] - Whether to only allow reordering (no add/remove)
 * @property {boolean} [showColors] - Whether to show option colors
 * @property {boolean} [autocomplete] - Whether to enable autocomplete filtering
 * @property {string} [valueColumn] - Column name for option values (datasource mode)
 * @property {string} [labelColumn] - Column name for option labels (datasource mode)
 * @property {string} [colorColumn] - Column name for option colors (datasource mode)
 * @property {string} [sortColumn] - Column to sort options by
 * @property {"ascending" | "descending"} [sortOrder] - Sort order for options
 * @property {Object} [datasource] - Datasource configuration for options
 * @property {Array} [filter] - Filter array for datasource options
 *
 * ---------------------------------------------------------------------------
 * DATETIME PROPERTIES
 * ---------------------------------------------------------------------------
 * @property {"default" | "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" | "MMM DD, YYYY" | "DD MMM YYYY"} [dateFormat] - Date format string
 * @property {boolean} [showTime] - Whether to show time picker
 *
 * ---------------------------------------------------------------------------
 * JSON PROPERTIES
 * ---------------------------------------------------------------------------
 * @property {boolean} [multiline] - Whether to enable multiline JSON editing
 *
 * ---------------------------------------------------------------------------
 * LINK/RELATIONSHIP PROPERTIES
 * ---------------------------------------------------------------------------
 * @property {"pills" | "text"} [relViewMode] - View mode for relationship display
 * @property {boolean} [simpleView] - Use simple text view for links
 * @property {number} [limit] - Limit number of related records to fetch
 * @property {string} [search] - Search term for filtering related records
 * @property {string} [ownId] - Current row ID (for self-referencing relationships)
 * @property {string} [joinColumn] - Join column for SQL relationships
 *
 * ---------------------------------------------------------------------------
 * ATTACHMENT PROPERTIES
 * ---------------------------------------------------------------------------
 * @property {"landscape" | "portrait" | "square"} [imageRatio] - Image aspect ratio
 * @property {number} [gridColumns] - Number of grid columns (for grid mode)
 * @property {boolean} [isGallery] - Whether in gallery mode
 * @property {"view" | "download" | "none"} [onClickAction] - Action on attachment click
 * @property {boolean} [slotted] - Whether using slot content
 * @property {boolean} [carouselDots] - Show carousel navigation dots
 * @property {boolean} [carouselArrows] - Show carousel navigation arrows
 * @property {boolean} [carouselInfinite] - Enable infinite carousel loop
 * @property {boolean} [carouselAutoplay] - Enable carousel autoplay
 * @property {number} [carouselAutoplaySpeed] - Autoplay speed in milliseconds
 * @property {number} [carouselItemsToShow] - Number of items to show in carousel
 * @property {number} [carouselItemsToScroll] - Number of items to scroll per action
 * @property {"standard" | "marquee"} [carouselMode] - Carousel animation mode
 *
 * ---------------------------------------------------------------------------
 * ICON PROPERTIES
 * ---------------------------------------------------------------------------
 * @property {boolean} [showCategories] - Whether to show icon category tabs
 *
 * ---------------------------------------------------------------------------
 * COLOR PROPERTIES
 * ---------------------------------------------------------------------------
 * @property {boolean} [allowCustom] - Whether to allow custom color input
 * @property {"circle" | "square"} [swatch] - Color swatch shape
 * @property {boolean} [themeColors] - Whether to show theme colors
 * @property {boolean} [staticColors] - Whether to show static colors
 * @property {Array<{label: string, value: string}>} [customColors] - Custom color palette
 *
 * ---------------------------------------------------------------------------
 * TAGS PROPERTIES
 * ---------------------------------------------------------------------------
 * @property {boolean} [suggestions] - Whether to show tag suggestions from datasource
 */

// ============================================================================
// BACKWARD-COMPATIBLE TYPE ALIASES
// These allow existing imports to continue working during migration
// ============================================================================

/** @typedef {CellOptions} BaseCellOptions - @deprecated Use CellOptions instead */
/** @typedef {CellOptions} CellStringOptions - @deprecated Use CellOptions instead */
/** @typedef {CellOptions} CellNumberOptions - @deprecated Use CellOptions instead */
/** @typedef {CellOptions} CellBooleanOptions - @deprecated Use CellOptions instead */
/** @typedef {CellOptions} CellOptionsOptions - @deprecated Use CellOptions instead */
/** @typedef {CellOptions} CellAttachmentOptions - @deprecated Use CellOptions instead */
/** @typedef {CellOptions} CellDatetimeOptions - @deprecated Use CellOptions instead */
/** @typedef {CellOptions} CellJSONOptions - @deprecated Use CellOptions instead */
/** @typedef {CellOptions} CellLinkOptions - @deprecated Use CellOptions instead */
/** @typedef {CellOptions} CellColorOptions - @deprecated Use CellOptions instead */
/** @typedef {CellOptions} CellIconOptions - @deprecated Use CellOptions instead */
/** @typedef {CellOptions} CellTagsOptions - @deprecated Use CellOptions instead */

/**
 * Common API interface for all cell components
 * @template T
 * @typedef {Object} CellApi
 * @property {() => void} focus - Focus the cell and enter edit mode
 * @property {() => void} reset - Reset the cell to its initial state
 * @property {() => boolean} isEditing - Check if cell is currently editing
 * @property {() => boolean} isDirty - Check if cell value has been modified
 * @property {() => T} getValue - Get the current local value
 * @property {(err: string) => void} setError - Set an error on the cell
 * @property {() => void} clearError - Clear all errors
 * @property {(val: T) => void} setValue - Set the cell value
 */

/**
 * Common event types dispatched by cell components
 * @template T
 * @typedef {Object} CellEvents
 * @property {void} enteredit - Fired when entering edit mode
 * @property {void} exitedit - Fired when exiting edit mode
 * @property {void} focusout - Fired when focus leaves the cell
 * @property {T} change - Fired when value changes
 * @property {void} cancel - Fired when edit is cancelled
 * @property {null} clear - Fired when value is cleared
 */

/**
 * Field schema from Budibase
 * @typedef {Object} FieldSchema
 * @property {string} type - Field type
 * @property {string} [name] - Field name
 * @property {Object} [constraints] - Field constraints
 * @property {string} [constraints.type] - Constraint type
 * @property {boolean} [constraints.presence] - Whether field is required
 * @property {Object} [constraints.numericality] - Numeric constraints
 * @property {number} [constraints.numericality.greaterThanOrEqualTo] - Min value
 * @property {number} [constraints.numericality.lessThanOrEqualTo] - Max value
 * @property {"one-to-many" | "many-to-one" | "many-to-many"} [relationshipType] - Relationship type
 * @property {string} [tableId] - Related table ID
 * @property {string} [fieldName] - Related field name
 */

// Export empty object to make this a module
export {};
