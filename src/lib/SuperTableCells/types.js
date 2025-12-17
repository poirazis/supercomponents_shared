/**
 * @fileoverview Shared type definitions for SuperTableCells components using JSDoc
 * These types provide IntelliSense and type checking for both JavaScript and TypeScript files.
 */

/**
 * Cell role determines the rendering context and styling
 * @typedef {"formInput" | "tableCell" | "inlineInput"} CellRole
 */

/**
 * Cell state for FSM
 * @typedef {"View" | "Editing" | "Loading"} CellState
 */

/**
 * Text alignment options
 * @typedef {"flex-start" | "center" | "flex-end"} CellAlign
 */

/**
 * Common options available to all cell components
 * @typedef {Object} BaseCellOptions
 * @property {CellRole} [role] - Role determines the rendering context
 * @property {CellState} [initialState] - Initial FSM state
 * @property {number} [debounce] - Debounce delay in milliseconds for change events
 * @property {boolean} [readonly] - Whether the cell is read-only
 * @property {boolean} [disabled] - Whether the cell is disabled
 * @property {string} [placeholder] - Placeholder text when empty
 * @property {string} [template] - Template string for formatting display value
 * @property {string} [icon] - Icon to display (CSS class)
 * @property {boolean} [error] - Whether the cell has an error
 * @property {boolean} [showDirty] - Whether to show dirty indicator
 * @property {CellAlign} [align] - Text/content alignment
 * @property {string} [color] - Text color
 * @property {string} [background] - Background color
 */

/**
 * Options specific to CellString component
 * @typedef {Object} CellStringOptions
 * @property {CellRole} [role] - Role determines the rendering context
 * @property {CellState} [initialState] - Initial FSM state
 * @property {number} [debounce] - Debounce delay in milliseconds
 * @property {boolean} [readonly] - Whether the cell is read-only
 * @property {boolean} [disabled] - Whether the cell is disabled
 * @property {string} [placeholder] - Placeholder text when empty
 * @property {string} [template] - Template string for formatting display value
 * @property {string} [icon] - Icon to display (CSS class)
 * @property {boolean} [error] - Whether the cell has an error
 * @property {boolean} [showDirty] - Whether to show dirty indicator
 * @property {CellAlign} [align] - Text/content alignment
 * @property {string} [color] - Text color
 * @property {string} [background] - Background color
 * @property {"input" | "textarea"} [controlType] - Control type for input
 * @property {boolean} [clearIcon] - Whether to show clear icon
 */

/**
 * Options specific to CellNumber component
 * @typedef {Object} CellNumberOptions
 * @property {CellRole} [role] - Role determines the rendering context
 * @property {CellState} [initialState] - Initial FSM state
 * @property {number} [debounce] - Debounce delay in milliseconds
 * @property {boolean} [readonly] - Whether the cell is read-only
 * @property {boolean} [disabled] - Whether the cell is disabled
 * @property {string} [placeholder] - Placeholder text when empty
 * @property {string} [template] - Template string for formatting display value
 * @property {string} [icon] - Icon to display (CSS class)
 * @property {boolean} [error] - Whether the cell has an error
 * @property {boolean} [showDirty] - Whether to show dirty indicator
 * @property {CellAlign} [align] - Text/content alignment
 * @property {string} [color] - Text color
 * @property {string} [background] - Background color
 * @property {number} [defaultValue] - Default value for the cell
 * @property {boolean} [showStepper] - Whether to show stepper controls
 * @property {number} [stepSize] - Step increment value
 * @property {number} [min] - Minimum value
 * @property {number} [max] - Maximum value
 * @property {number} [decimals] - Decimal places to show
 * @property {string} [thousandsSeparator] - Thousands separator character
 * @property {string} [clearValueIcon] - Icon to clear value
 * @property {boolean} [enableWheel] - Whether to enable mouse wheel
 */

/**
 * Options specific to CellBoolean component
 * @typedef {Object} CellBooleanOptions
 * @property {CellRole} [role] - Role determines the rendering context
 * @property {CellState} [initialState] - Initial FSM state
 * @property {number} [debounce] - Debounce delay in milliseconds
 * @property {boolean} [readonly] - Whether the cell is read-only
 * @property {boolean} [disabled] - Whether the cell is disabled
 * @property {string} [placeholder] - Placeholder text when empty
 * @property {string} [template] - Template string for formatting display value
 * @property {string} [icon] - Icon to display (CSS class)
 * @property {boolean} [error] - Whether the cell has an error
 * @property {boolean} [showDirty] - Whether to show dirty indicator
 * @property {CellAlign} [align] - Text/content alignment
 * @property {string} [color] - Text color
 * @property {string} [background] - Background color
 * @property {string | number} [fontWeight] - Font weight
 * @property {"switch" | "checkbox"} [controlType] - Control type: switch or checkbox
 * @property {string} [inlineLabel] - Label to display inline with control
 */

/**
 * Options specific to CellOptions/CellOptionsAdvanced components
 * @typedef {Object} CellOptionsOptions
 * @property {CellRole} [role] - Role determines the rendering context
 * @property {CellState} [initialState] - Initial FSM state
 * @property {number} [debounce] - Debounce delay in milliseconds
 * @property {boolean} [readonly] - Whether the cell is read-only
 * @property {boolean} [disabled] - Whether the cell is disabled
 * @property {string} [placeholder] - Placeholder text when empty
 * @property {string} [template] - Template string for formatting display value
 * @property {string} [icon] - Icon to display (CSS class)
 * @property {boolean} [error] - Whether the cell has an error
 * @property {boolean} [showDirty] - Whether to show dirty indicator
 * @property {CellAlign} [align] - Text/content alignment
 * @property {string} [color] - Text color
 * @property {string} [background] - Background color
 * @property {string | number} [fontWeight] - Font weight
 * @property {"pills" | "text" | "links" | "list" | "buttons" | "radio"} [optionsViewMode] - View mode for options display
 * @property {boolean} [reorderOnly] - Whether to allow reordering
 * @property {boolean} [showColors] - Whether to show colors
 * @property {"schema" | "custom" | "datasource"} [optionsSource] - Data source type
 * @property {Array<{label: string, value: any, color?: string}>} [customOptions] - Custom options array
 */

/**
 * Options specific to CellAttachment components
 * @typedef {Object} CellAttachmentOptions
 * @property {CellRole} [role] - Role determines the rendering context
 * @property {CellState} [initialState] - Initial FSM state
 * @property {number} [debounce] - Debounce delay in milliseconds
 * @property {boolean} [readonly] - Whether the cell is read-only
 * @property {boolean} [disabled] - Whether the cell is disabled
 * @property {string} [placeholder] - Placeholder text when empty
 * @property {string} [template] - Template string for formatting display value
 * @property {string} [icon] - Icon to display (CSS class)
 * @property {boolean} [error] - Whether the cell has an error
 * @property {boolean} [showDirty] - Whether to show dirty indicator
 * @property {CellAlign} [align] - Text/content alignment
 * @property {string} [color] - Text color
 * @property {string} [background] - Background color
 * @property {string | number} [fontWeight] - Font weight
 * @property {"list" | "grid" | "carousel"} [controlType] - Control type for display
 * @property {"landscape" | "portrait" | "square"} [imageRatio] - Image aspect ratio
 * @property {number} [gridColumns] - Grid columns (for grid mode)
 * @property {boolean} [isGallery] - Whether in gallery mode
 * @property {"view" | "download" | "none"} [onClickAction] - Action on click
 * @property {boolean} [slotted] - Whether using slot content
 * @property {boolean} [carouselDots] - Show carousel dots
 * @property {boolean} [carouselArrows] - Show carousel arrows
 * @property {boolean} [carouselInfinite] - Enable infinite carousel
 * @property {boolean} [carouselAutoplay] - Enable autoplay
 * @property {number} [carouselAutoplaySpeed] - Autoplay speed in ms
 * @property {number} [carouselItemsToShow] - Number of items to show
 * @property {number} [carouselItemsToScroll] - Number of items to scroll
 * @property {"standard" | "marquee"} [carouselMode] - Carousel mode
 */

/**
 * Options specific to CellDatetime/CellDateRange components
 * @typedef {Object} CellDatetimeOptions
 * @property {CellRole} [role] - Role determines the rendering context
 * @property {CellState} [initialState] - Initial FSM state
 * @property {number} [debounce] - Debounce delay in milliseconds
 * @property {boolean} [readonly] - Whether the cell is read-only
 * @property {boolean} [disabled] - Whether the cell is disabled
 * @property {string} [placeholder] - Placeholder text when empty
 * @property {string} [template] - Template string for formatting display value
 * @property {string} [icon] - Icon to display (CSS class)
 * @property {boolean} [error] - Whether the cell has an error
 * @property {boolean} [showDirty] - Whether to show dirty indicator
 * @property {CellAlign} [align] - Text/content alignment
 * @property {string} [color] - Text color
 * @property {string} [background] - Background color
 * @property {string | number} [fontWeight] - Font weight
 * @property {"default" | "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" | "MMM DD, YYYY" | "DD MMM YYYY"} [dateFormat] - Date format string
 * @property {boolean} [showTime] - Whether to show time picker
 */

/**
 * Options specific to CellJSON component
 * @typedef {Object} CellJSONOptions
 * @property {CellRole} [role] - Role determines the rendering context
 * @property {CellState} [initialState] - Initial FSM state
 * @property {number} [debounce] - Debounce delay in milliseconds
 * @property {boolean} [readonly] - Whether the cell is read-only
 * @property {boolean} [disabled] - Whether the cell is disabled
 * @property {string} [placeholder] - Placeholder text when empty
 * @property {string} [template] - Template string for formatting display value
 * @property {string} [icon] - Icon to display (CSS class)
 * @property {boolean} [error] - Whether the cell has an error
 * @property {boolean} [showDirty] - Whether to show dirty indicator
 * @property {CellAlign} [align] - Text/content alignment
 * @property {string} [color] - Text color
 * @property {string} [background] - Background color
 * @property {string | number} [fontWeight] - Font weight
 * @property {boolean} [multiline] - Whether to enable multiline editing
 */

/**
 * Options specific to CellLink/CellLinkAdvanced/CellSQLLink components
 * @typedef {Object} CellLinkOptions
 * @property {CellRole} [role] - Role determines the rendering context
 * @property {CellState} [initialState] - Initial FSM state
 * @property {number} [debounce] - Debounce delay in milliseconds
 * @property {boolean} [readonly] - Whether the cell is read-only
 * @property {boolean} [disabled] - Whether the cell is disabled
 * @property {string} [placeholder] - Placeholder text when empty
 * @property {string} [template] - Template string for formatting display value
 * @property {string} [icon] - Icon to display (CSS class)
 * @property {boolean} [error] - Whether the cell has an error
 * @property {boolean} [showDirty] - Whether to show dirty indicator
 * @property {CellAlign} [align] - Text/content alignment
 * @property {string} [color] - Text color
 * @property {string} [background] - Background color
 * @property {string | number} [fontWeight] - Font weight
 * @property {boolean} [simpleView] - View mode for links display
 * @property {*} [filter] - Filter for relationship options
 * @property {number} [limit] - Limit number of options
 * @property {string} [search] - Search term
 */

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
