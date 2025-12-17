# Using JSDoc for Type Safety in SuperTableCells

This guide demonstrates how to use JSDoc annotations for **type definitions only** (CellOptions, CellApi) - not for annotating every variable and function.

## Benefits of JSDoc

1. **No TypeScript compilation** - Pure JavaScript
2. **IntelliSense for important types** - Autocomplete for cellOptions and cellApi
3. **Simple and clean** - Only annotate what matters
4. **Better debugging** - Source code matches what runs

## What to Annotate

✅ **DO annotate:**

- `cellOptions` prop - so you get autocomplete for options
- `cellApi` export - so consumers know what methods are available
- Component props (`value`, `formattedValue`, etc.)

❌ **DON'T annotate:**

- Local variables (let timer, let editor, etc.)
- Function parameters in FSM methods
- Helper functions
- Event handlers

## Type Definitions

All types are defined in `types.js` using JSDoc `@typedef` syntax.

## JavaScript Example: CellString.svelte (Reference Implementation)

```svelte
<script>
  import { createEventDispatcher, getContext, onMount, onDestroy } from "svelte";
  import fsm from "svelte-fsm";

  /**
   * @typedef {import('./types.js').CellStringOptions} CellStringOptions
   * @typedef {import('./types.js').CellApi} CellApi
   */

  const dispatch = createEventDispatcher();
  const { processStringSync } = getContext("sdk");

  /** @type {string | null} */
  export let value;

  /** @type {string | undefined} */
  export let formattedValue = undefined;

  /** @type {CellStringOptions} */
  export let cellOptions = {
    role: "formInput",
    initialState: "Editing",
    debounce: 250,
  };

  export let autofocus = false;

  // Local state - no annotations needed
  let timer;
  let originalValue;
  let editor;
  let lastEdit;
  let localValue = value;
  let state = (cellOptions?.initialState === "Loading" ? "View" : cellOptions?.initialState) ?? "View";
  let errors = [];

  // Reactive declarations
  $: error = cellOptions?.error || errors.length > 0;
  $: inEdit = $cellState === "Editing";
  $: isDirty = !!lastEdit && originalValue !== localValue;

  // FSM - no annotations needed for methods
  export const cellState = fsm(state ?? "View", {
    "*": {
      goTo(state) {
        return state;
      },
      reset(newValue) {
        if (newValue === localValue) return;
        localValue = value;
        lastEdit = undefined;
        originalValue = undefined;
        errors = [];
        return state;
      },
    },
    View: {
      _enter() {
        localValue = value;
      },
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) {
          return "Editing";
        }
      },
    },
    Editing: {
      _enter() {
        originalValue = value;
        setTimeout(() => editor?.focus(), 50);
        dispatch("enteredit");
      },
      _exit() {
        originalValue = undefined;
        lastEdit = undefined;
        dispatch("exitedit");
      },
      focusout(e) {
        dispatch("focusout");
        this.submit();
      },
      submit() {
        if (isDirty) {
          dispatch("change", localValue);
        }
        return state;
      },
      cancel() {
        value = originalValue ?? null;
        dispatch("cancel");
        return state;
      },
      debounce(e) {
        const target = e.target;
        localValue = target.value;
        lastEdit = new Date();
        if (cellOptions?.debounce) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            dispatch("change", localValue);
          }, cellOptions.debounce ?? 0);
        }
      },
      handleKeyboard(e) {
        if (e.key === "Enter" && !e.shiftKey) {
          this.submit();
        }
        if (e.key === "Escape") {
          this.cancel();
        }
      },
    },
  });

  // Annotate the public API
  /** @type {CellApi} */
  export const cellApi = {
    focus: () => cellState.focus(),
    reset: () => cellState.reset(value),
    isEditing: () => $cellState === "Editing",
    isDirty: () => isDirty,
    getValue: () => localValue,
    setError: (err) => {
      errors = [...errors, err];
    },
    clearError: () => {
      errors = [];
    },
    setValue: (val) => {
      localValue = val;
    },
  };

  // No annotations needed for helpers
  const focus = (node) => {
    node?.focus();
  };

  onMount(() => {
    if (autofocus) {
      setTimeout(() => cellState.focus(), 50);
    }
  });

  onDestroy(() => {
    if (timer) clearTimeout(timer);
  });
</script>
```

```svelte
<script>
  // @ts-check - Enable TypeScript checking in JavaScript
  import { createEventDispatcher, getContext, onMount, onDestroy } from "svelte";
  import fsm from "svelte-fsm";

  // Import types for IntelliSense (no runtime impact)
  /**
   * @typedef {import('./types.js').CellStringOptions} CellStringOptions
   * @typedef {import('./types.js').CellApi} CellApi
   */

  const { processStringSync } = getContext("sdk");
  const dispatch = createEventDispatcher();

  // Typed props with JSDoc
  /** @type {string | null} */
  export let value;

  /** @type {string | undefined} */
  export let formattedValue = undefined;

  /** @type {CellStringOptions} */
  export let cellOptions = {
    role: "formInput",
    initialState: "Editing",
    debounce: 250,
  };

  /** @type {boolean} */
  export let autofocus = false;

  // Typed local variables
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;

  /** @type {string | null | undefined} */
  let originalValue;

  /** @type {HTMLInputElement | HTMLTextAreaElement | undefined} */
  let editor;

  /** @type {Date | undefined} */
  let lastEdit;

  /** @type {string | null} */
  let localValue = value;

  /** @type {"View" | "Editing"} */
  let state = (cellOptions?.initialState === "Loading" ? "View" : cellOptions?.initialState) ?? "View";

  /** @type {string[]} */
  let errors = [];

  // Reactive declarations
  $: error = cellOptions?.error || errors.length > 0;
  $: icon = error ? "ph ph-warning" : cellOptions?.icon;
  $: inEdit = $cellState === "Editing";
  $: isDirty = !!lastEdit && originalValue !== localValue;

  // FSM with typed transitions
  export const cellState = fsm(state ?? "View", {
    "*": {
      /** @param {string} state */
      goTo(state) {
        return state;
      },
      /** @param {string | null} newValue */
      reset(newValue) {
        if (newValue === localValue) return;
        localValue = value;
        lastEdit = undefined;
        originalValue = undefined;
        errors = [];
        return state;
      },
    },
    View: {
      _enter() {
        localValue = value;
      },
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) {
          return "Editing";
        }
      },
    },
    Editing: {
      _enter() {
        originalValue = value;
        setTimeout(() => editor?.focus(), 50);
        dispatch("enteredit");
      },
      _exit() {
        originalValue = undefined;
        lastEdit = undefined;
        dispatch("exitedit");
      },
      /** @param {FocusEvent} e */
      focusout(e) {
        dispatch("focusout");
        this.submit();
      },
      submit() {
        if (isDirty) {
          dispatch("change", localValue);
        }
        return state;
      },
      cancel() {
        value = originalValue ?? null;
        dispatch("cancel");
        return state;
      },
      /** @param {Event} e */
      debounce(e) {
        const target = /** @type {HTMLInputElement | HTMLTextAreaElement} */ (e.target);
        localValue = target.value;
        lastEdit = new Date();
        if (cellOptions?.debounce) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            dispatch("change", localValue);
          }, cellOptions.debounce ?? 0);
        }
      },
      /** @param {KeyboardEvent} e */
      handleKeyboard(e) {
        if (e.key === "Enter" && !e.shiftKey) {
          this.submit();
        }
        if (e.key === "Escape") {
          this.cancel();
        }
      },
    },
  });

  // Typed API object
  /** @type {CellApi} */
  export const cellApi = {
    focus: () => cellState.focus(),
    reset: () => cellState.reset(value),
    isEditing: () => $cellState === "Editing",
    isDirty: () => isDirty,
    getValue: () => localValue,
    /** @param {string} err */
    setError: (err) => {
      errors = [...errors, err];
    },
    clearError: () => {
      errors = [];
    },
    /** @param {string | null} val */
    setValue: (val) => {
      localValue = val;
    },
  };

  // Lifecycle
  onMount(() => {
    if (autofocus) {
      setTimeout(() => cellState.focus(), 50);
    }
  });

  onDestroy(() => {
    if (timer) clearTimeout(timer);
  });
</script>
```

```svelte
<script>
  import { createEventDispatcher, getContext, onMount, onDestroy } from "svelte";
  import fsm from "svelte-fsm";

  // Import types for IntelliSense (no runtime impact)
  /**
   * @typedef {import('./types.js').CellBooleanOptions} CellBooleanOptions
   * @typedef {import('./types.js').CellApi<boolean>} CellBooleanApi
   * @typedef {import('./types.js').CellEvents<boolean>} CellBooleanEvents
   */

  const { processStringSync } = getContext("sdk");
  const dispatch = createEventDispatcher();

  // Typed props with JSDoc
  /** @type {boolean | null} */
  export let value;

  /** @type {string | undefined} */
  export let formattedValue;

  /** @type {CellBooleanOptions} */
  export let cellOptions;

  /** @type {boolean} */
  export let autofocus;

  // Typed local variables
  /** @type {boolean | null} */
  let originalValue = value;

  /** @type {boolean} */
  let localValue = value ?? false;

  // FSM with typed states
  export let cellState = fsm(cellOptions.initialState ?? "View", {
    "*": {
      /** @param {string} state */
      goTo(state) {
        return state;
      },
    },
    View: {
      _enter() {
        localValue = value ?? false;
        originalValue = value;
      },
      /** @param {boolean | null} val */
      reset(val) {
        localValue = val ?? false;
        originalValue = val;
        return cellOptions.initialState ?? "View";
      },
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) return "Editing";
      },
    },
    Editing: {
      _enter() {
        dispatch("enteredit");
      },
      _exit() {
        dispatch("exitedit");
      },
      submit() {
        value = localValue;
        dispatch("change", localValue);
        return "View";
      },
      cancel() {
        localValue = originalValue ?? false;
        dispatch("cancel");
        return "View";
      },
    },
  });

  // Typed API object
  /** @type {CellBooleanApi} */
  export const cellApi = {
    focus: () => cellState.focus(),
    reset: () => cellState.reset(value),
    isEditing: () => cellState.current === "Editing",
    isDirty: () => localValue !== originalValue,
    getValue: () => localValue,
    /** @param {string} err */
    setError: (err) => {},
    clearError: () => {},
    /** @param {boolean} val */
    setValue: (val) => {
      localValue = val;
    },
  };

  // Typed event handlers
  /** @param {Event} e */
  const handleClick = (e) => {
    if (cellState.current === "View") {
      cellState.focus();
    }
  };

  /** @param {KeyboardEvent} e */
  const handleKeyboard = (e) => {
    if (e.key === "Escape") {
      cellState.cancel();
    } else if (e.key === "Enter") {
      cellState.submit();
    } else if (e.key === " ") {
      e.preventDefault();
      localValue = !localValue;
    }
  };
</script>
```

## TypeScript Example: CellString.svelte

**Note:** We recommend using JSDoc instead of TypeScript for simplicity. This example is shown for comparison only.

```svelte
<script lang="ts">
  import { createEventDispatcher, getContext, onMount, onDestroy } from "svelte";
  import fsm from "svelte-fsm";
  import type { CellStringOptions, CellApi, CellEvents } from "./types";

  const { processStringSync } = getContext("sdk");
  const dispatch = createEventDispatcher<CellEvents<string | null>>();

  export let value: string | null;
  export let formattedValue: string | undefined;
  export let cellOptions: CellStringOptions;
  export let autofocus: boolean;

  let originalValue: string | null = value;
  let localValue: string = value ?? "";
  let editor: HTMLInputElement | HTMLTextAreaElement;

  export let cellState = fsm(cellOptions.initialState ?? "View", {
    "*": {
      goTo(state: string) {
        return state;
      },
    },
    View: {
      _enter() {
        localValue = value ?? "";
        originalValue = value;
      },
      reset(val: string | null) {
        localValue = val ?? "";
        originalValue = val;
        return cellOptions.initialState ?? "View";
      },
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) return "Editing";
      },
    },
    Editing: {
      _enter() {
        dispatch("enteredit");
        editor?.focus();
      },
      _exit() {
        dispatch("exitedit");
      },
      submit() {
        value = localValue || null;
        dispatch("change", value);
        return "View";
      },
      cancel() {
        localValue = originalValue ?? "";
        dispatch("cancel");
        return "View";
      },
    },
  });

  export const cellApi: CellApi<string> = {
    focus: () => cellState.focus(),
    reset: () => cellState.reset(value),
    isEditing: () => cellState.current === "Editing",
    isDirty: () => localValue !== originalValue,
    getValue: () => localValue,
    setError: (err: string) => {},
    clearError: () => {},
    setValue: (val: string) => {
      localValue = val;
    },
  };
</script>
```

## Usage in Parent Components

### JavaScript Parent

```svelte
<script>
  import { CellString } from "@poirazis/supercomponents-shared";

  /**
   * @typedef {import('@poirazis/supercomponents-shared').CellStringOptions} CellStringOptions
   * @typedef {import('@poirazis/supercomponents-shared').CellApi<string>} CellStringApi
   */

  /** @type {string | null} */
  let value = "Hello";

  /** @type {CellStringOptions} */
  const options = {
    role: "tableCell",
    placeholder: "Enter text...",
    debounce: 300,
    align: "flex-start",
  };

  /** @type {CellStringApi} */
  let api;

  function handleChange(event) {
    console.log("Value changed:", event.detail);
  }

  function focusCell() {
    api?.focus();
  }
</script>

<CellString
  bind:value
  bind:cellApi={api}
  cellOptions={options}
  on:change={handleChange}
/>
```

### TypeScript Parent

```svelte
<script lang="ts">
  import { CellString, type CellStringOptions, type CellApi } from "@poirazis/supercomponents-shared";

  let value: string | null = "Hello";

  const options: CellStringOptions = {
    role: "tableCell",
    placeholder: "Enter text...",
    debounce: 300,
    align: "flex-start",
  };

  let api: CellApi<string>;

  function handleChange(event: CustomEvent<string | null>) {
    console.log("Value changed:", event.detail);
  }

  function focusCell() {
    api?.focus();
  }
</script>

<CellString
  bind:value
  bind:cellApi={api}
  cellOptions={options}
  on:change={handleChange}
/>
```

## Common Patterns

### Minimal JSDoc - Just the Essentials

````javascript
/**
 * @typedef {import('./types.js').CellNumberOptions} CellNumberOptions
 * @typedef {import('./types.js').CellApi} CellApi
 */

/** @type {number | null} */
export let value;

/** @type {CellNumberOptions} */
export let cellOptions = {};

// Everything else - no annotations
let localValue = value;
let editor;

export const cellState = fsm("View", {
  View: {
    focus() {
      return "Editing";
    }
  }
});

/** @type {CellApi} */
export const cellApi = {
  focus: () => cellState.focus(),
  getValue: () => localValue,
  // ... other methods
};
## Type Enforcement

### VS Code Settings

Add to `.vscode/settings.json`:

```json
{
  "js/ts.implicitProjectConfig.checkJs": true,
  "javascript.validate.enable": true,
  "typescript.tsdk": "node_modules/typescript/lib"
}
````

### Component-Level Enforcement

Add to top of JavaScript files:

```javascript
// @ts-check
```

This enables TypeScript checking in JavaScript files.

## Migration Strategy

1. **Add typedef imports** at top of script
2. **Annotate cellOptions prop** with component-specific options type
3. **Annotate cellApi export** with CellApi type
4. **Annotate main props** (value, formattedValue)
5. **Done!** - Don't annotate anything else

## IntelliSense Benefits

With just these 3-4 JSDoc annotations, you get:

- **Autocomplete for cellOptions** - VS Code shows all available options
- **cellApi IntelliSense** - Consumers see all available methods
- **Prop type checking** - Errors if wrong types are passed
- **Clean code** - No clutter from over-annotation

## Best Practices

1. **Only annotate public interfaces** - cellOptions and cellApi
2. **Keep it minimal** - Less is more
3. **No @ts-check needed** - Too strict, unnecessary noise
4. **Trust JavaScript** - Let Svelte handle the rest
