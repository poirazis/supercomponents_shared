<script>
  import { createEventDispatcher, getContext, onMount } from "svelte";
  import fsm from "svelte-fsm";

  const { processStringSync } = getContext("sdk");
  const context = getContext("context");
  const dispatch = createEventDispatcher();

  export let value;
  export let formattedValue;
  export let cellOptions;
  export let autofocus;

  let originalValue = value;
  let inEdit;
  let localValue = value;
  let editor;

  $: inEdit = $cellState == "Editing";
  $: inline = cellOptions.role == "inlineInput";
  $: isDirty = inEdit && originalValue != localValue;
  $: formattedValue = cellOptions.template
    ? processStringSync(cellOptions.template, {
        ...$context,
        value: localValue,
      })
    : undefined;

  $: placeholder =
    cellOptions.readonly || cellOptions.disabled
      ? ""
      : cellOptions.placeholder || "";

  export let cellState = fsm(cellOptions.initialState ?? "View", {
    "*": {
      goTo(state) {
        return state;
      },
    },
    View: {
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) return "Editing";
      },
    },
    Hovered: {
      cancel: () => {
        return "View";
      },
    },
    Focused: {
      unfocus() {
        return "View";
      },
    },
    Error: { check: "View" },
    Editing: {
      _enter() {
        originalValue = localValue;
        editor?.focus();
        dispatch("enteredit");
      },
      _exit() {
        dispatch("exitedit");
      },
      focusout() {
        if (isDirty && !cellOptions.debounce) dispatch("change", localValue);

        dispatch("focusout");
        return "View";
      },
      clear() {
        if (cellOptions.debounce) dispatch("change", null);
        localValue = null;
      },
      cancel() {
        value = originalValue;
      },
    },
  });

  let timer;
  const debounce = (e) => {
    // Abort Invalid Keys
    if (
      (e.key.length === 1 && e.key !== "." && isNaN(e.key) && !e.ctrlKey) ||
      e.keyCode == 32 ||
      (e.key === "." && e.target.value.toString().indexOf(".") > -1)
    ) {
      e.preventDefault();
      return;
    }
    if (cellOptions.debounce) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        dispatch("change", localValue);
      }, cellOptions.debounce ?? 0);
    }
  };

  function focus(element) {
    setTimeout(element?.focus(), 10);
  }

  onMount(() => {
    if (autofocus)
      setTimeout(() => {
        cellState.focus();
        editor?.focus();
      }, 30);
  });
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="superCell"
  class:error={cellOptions.error}
  class:readonly={cellOptions.readonly}
  class:disabled={cellOptions.disabled}
  class:inEdit
  class:isDirty
  class:inline
  class:tableCell={cellOptions?.role == "tableCell"}
  class:formInput={cellOptions?.role == "formInput"}
  style:color={cellOptions?.color}
  style:background={inEdit
    ? "var(--spectrum-global-color-gray-50)"
    : cellOptions?.background}
  style:font-weight={cellOptions?.fontWeight}
  tabIndex={cellOptions.disabled ? "-1" : 0}
  on:focusin={cellState.focus}
>
  {#if cellOptions?.icon}
    <i class={cellOptions.icon + " icon"}></i>
  {/if}

  {#if $cellState == "Editing"}
    <input
      class="editor"
      class:placeholder={!localValue}
      type="text"
      style:padding-right={"32px"}
      style:text-align={cellOptions.align == "flex-start"
        ? "left"
        : cellOptions.align == "center"
          ? "center"
          : "right "}
      placeholder={cellOptions?.placeholder}
      bind:value={localValue}
      on:keydown={(e) => debounce(e)}
      on:focusout={cellState.focusout}
      use:focus
    />
    <i class="ri-close-line clearIcon" on:mousedown|self={cellState.clear}> </i>
  {:else}
    <div
      class="value"
      style:padding-right={"12px"}
      class:placeholder={!value && !formattedValue}
      style:justify-content={cellOptions.align}
    >
      {formattedValue || value || placeholder}
    </div>
  {/if}
</div>

<style>
  .value {
    flex: auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    box-sizing: border-box;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
</style>
