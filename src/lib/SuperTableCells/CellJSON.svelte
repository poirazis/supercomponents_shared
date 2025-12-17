<script>
  import { createEventDispatcher, getContext, onMount } from "svelte";
  import fsm from "svelte-fsm";
  const dispatch = createEventDispatcher();
  const { processStringSync } = getContext("sdk");
  const context = getContext("context");

  export let value = null;
  export let formattedValue;
  export let cellOptions = {
    role: "formInput",
    initialState: "Editing",
    debounce: 250,
    multiline: true,
  };
  export let autofocus;

  let timer;
  let originalValue;
  let localValue = null;
  let isValidJson = true;

  let editor;
  let lastEdit;

  // Validate JSON string or object
  const validateJson = (input) => {
    if (input === null || input === undefined || input === "") return true; // Allow empty/null/undefined
    try {
      if (typeof input === "string") {
        JSON.parse(input);
      } else {
        // If it's an object, ensure it can be stringified and parsed
        JSON.parse(JSON.stringify(input));
      }
      return true;
    } catch {
      return false;
    }
  };

  // Convert value to JSON string for internal use
  $: normalizedValue =
    value && validateJson(value) && typeof value !== "string"
      ? JSON.stringify(value)
      : value;

  // Format JSON for display
  $: displayValue = (() => {
    if (!normalizedValue || (normalizedValue === "" && placeholder))
      return placeholder;
    if (!validateJson(normalizedValue)) return "Invalid JSON";
    return cellOptions.multiline
      ? JSON.stringify(JSON.parse(normalizedValue), null, 2)
      : JSON.stringify(JSON.parse(normalizedValue));
  })();

  export let cellState = fsm(cellOptions?.initialState ?? "View", {
    "*": {
      goTo(state) {
        return state;
      },
      reset() {
        localValue = normalizedValue;
        lastEdit = undefined;
        isValidJson = true;
      },
    },
    View: {
      _enter() {
        localValue = normalizedValue;
        isValidJson = validateJson(value);
      },
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) return "Editing";
      },
    },
    Editing: {
      _enter() {
        originalValue = normalizedValue;
        localValue = normalizedValue;
        isValidJson = validateJson(value);
        dispatch("enteredit");
      },
      _exit() {
        originalValue = undefined;
        dispatch("exitedit");
        dispatch("focusout");
      },
      clear() {
        if (cellOptions.debounce) dispatch("change", null);
        value = null;
        localValue = null;
        isValidJson = true;
      },
      focusout(e) {
        this.submit();
      },
      submit() {
        if (isDirty && isValidJson) {
          dispatch("change", localValue);
        }
        return "View";
      },
      cancel() {
        value = originalValue;
        dispatch("cancel");
        return "View";
      },
      handleKeyboard(e) {
        if (e.key == "Enter" && !cellOptions.multiline) this.submit();
        if (e.key == "Escape") this.cancel();
      },
    },
  });

  $: cellState.reset(normalizedValue);
  $: inEdit = $cellState == "Editing";
  $: isDirty = lastEdit && originalValue !== localValue;
  $: formattedValue =
    !formattedValue && cellOptions?.template
      ? processStringSync(cellOptions.template, { value: normalizedValue })
      : formattedValue;

  $: placeholder =
    cellOptions.readonly || cellOptions.disabled
      ? ""
      : cellOptions.placeholder || "";

  const debounce = (e) => {
    const newValue = e.target.value;
    isValidJson = validateJson(newValue);
    localValue = newValue;
    lastEdit = new Date();
    if (cellOptions?.debounce && isValidJson) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        dispatch("change", localValue);
      }, cellOptions.debounce ?? 0);
    }
  };

  const focus = (node) => {
    node?.focus();
  };

  onMount(() => {
    if (autofocus)
      setTimeout(() => {
        cellState.focus();
      }, 50);
  });
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="superCell multirow"
  class:inEdit
  class:isDirty={isDirty && cellOptions.showDirty}
  class:focused={inEdit}
  class:inline={cellOptions.role == "inlineInput"}
  class:tableCell={cellOptions.role == "tableCell"}
  class:formInput={cellOptions.role == "formInput"}
  class:disabled={cellOptions.disabled}
  class:readonly={cellOptions.readonly}
  class:error={cellOptions.error || !isValidJson}
  class:multirow={cellOptions.multiline}
  style:color={cellOptions.color}
  style:background={cellOptions.background}
  style:font-weight={cellOptions.fontWeight}
>
  {#if cellOptions.icon && !cellOptions.multiline}
    <i class={cellOptions.icon + " icon"}></i>
  {/if}

  {#if inEdit}
    {#if cellOptions.multiline}
      <textarea
        bind:this={editor}
        tabindex="0"
        class="editor"
        class:with-icon={cellOptions.icon}
        class:placeholder={!value && !formattedValue && !localValue}
        value={displayValue}
        placeholder={cellOptions?.placeholder ?? ""}
        style:text-align={cellOptions.align == "center"
          ? "center"
          : cellOptions.align == "flex-end"
            ? "right"
            : "left"}
        style:padding-right={cellOptions.align != "flex-start"
          ? "2rem"
          : "0.75rem"}
        style:white-space="pre-wrap"
        style:overflow-wrap="break-word"
        style:min-height="8rem"
        style:overflow-y="auto"
        style:resize="vertical"
        on:input={debounce}
        on:focusout={cellState.focusout}
        on:keydown={cellState.handleKeyboard}
        use:focus
      />
    {:else}
      <input
        bind:this={editor}
        tabindex="0"
        class="editor"
        class:with-icon={cellOptions.icon}
        class:placeholder={!value && !formattedValue && !localValue}
        value={localValue ?? ""}
        placeholder={cellOptions?.placeholder ?? ""}
        style:text-align={cellOptions.align == "center"
          ? "center"
          : cellOptions.align == "flex-end"
            ? "right"
            : "left"}
        style:padding-right={cellOptions.align != "flex-start"
          ? "2rem"
          : "0.75rem"}
        on:input={debounce}
        on:focusout={cellState.focusout}
        on:keydown={cellState.handleKeyboard}
        use:focus
      />
    {/if}
    {#if localValue && cellOptions?.clearIcon !== false}
      <i
        class="ri-close-line clearIcon"
        on:mousedown|self|preventDefault={cellState.clear}
      />
    {/if}
  {:else}
    <div
      class="value"
      class:multiline={cellOptions.multiline}
      tabindex={cellOptions.readonly || cellOptions.disabled ? "-1" : "0"}
      class:with-icon={cellOptions.icon}
      class:placeholder={!value}
      style:justify-content={cellOptions.align}
      on:focusin={cellState.focus}
    >
      <span>
        {displayValue}
      </span>
    </div>
  {/if}
</div>

<style>
  .superCell .value.multiline {
    white-space: pre-wrap !important;
    text-overflow: unset !important;
    overflow: auto !important;
    font-family: monospace;
  }
  .superCell .value.multiline span {
    white-space: pre-wrap !important;
    text-overflow: unset !important;
    overflow: visible !important;
    height: 8rem;
    width: 100%;
  }
  .superCell .editor {
    width: 100%;
    box-sizing: border-box;
  }
</style>
