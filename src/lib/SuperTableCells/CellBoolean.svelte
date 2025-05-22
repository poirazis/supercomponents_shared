<script>
  import { createEventDispatcher, getContext } from "svelte";
  import fsm from "svelte-fsm";
  import "./CellCommon.css";

  export let value;
  export let formattedValue;
  export let cellOptions;

  let originalValue = value;
  let editor;

  const dispatch = createEventDispatcher();
  const { processStringSync } = getContext("sdk");

  export let cellState = fsm(cellOptions.initialState ?? "View", {
    "*": {
      goTo(state) {
        return state;
      },
    },
    View: {
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) return "Editing";
        editor?.focus();
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
        originalValue = value;
        editor?.focus();
        dispatch("enteredit");
      },
      _exit() {
        dispatch("exitedit");
      },
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) return "Editing";
        editor?.focus();
      },
      change(e) {
        if (cellOptions.debounce) dispatch("change", value);
      },
      submit() {
        if (value !== originalValue) {
          dispatch("change", value);
        }
        dispatch("focusout");
        return "View";
      },
      cancel() {
        value = originalValue;
        return "View";
      },
    },
  });

  $: formattedValue = cellOptions.template
    ? processStringSync(cellOptions.template, { value })
    : undefined;

  $: inline = cellOptions.role == "inlineInput";
  $: inEdit = $cellState == "Editing";
  $: isDirty = inEdit && originalValue !== value;

  const focus = (node) => {
    if (cellOptions.role == "tableCell") node.focus();
  };
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="superCell"
  class:inEdit
  class:isDirty
  class:inline
  class:tableCell={cellOptions.role == "tableCell"}
  class:formInput={cellOptions.role == "formInput"}
  class:disabled={cellOptions.disabled}
  class:readonly={cellOptions.readonly}
  style:color={cellOptions.color}
  style:background={$cellState == "Editing" && cellOptions.role != "inline"
    ? "var(--spectrum-global-color-gray-50)"
    : cellOptions.background}
  style:font-weight={cellOptions.fontWeight}
  style:padding-top={"unset"}
  style:padding-bottom={"unset"}
>
  {#if cellOptions.icon}
    <i class={cellOptions.icon + " frontIcon"}></i>
  {/if}

  {#if $cellState == "Editing" || cellOptions.role != "tableCell"}
    <div
      class="editor"
      style:padding-left={cellOptions.icon ? "32px" : cellOptions.padding}
      style:padding-right={cellOptions.clearValueIcon
        ? "32px"
        : cellOptions.padding}
      style:justify-content={cellOptions.align ?? "center"}
    >
      <div
        class="spectrum-Switch spectrum-Switch--emphasized"
        style:--spectrum-switch-height={"22px"}
        style:margin={0}
      >
        <input
          class="spectrum-Switch-input"
          bind:checked={value}
          bind:this={editor}
          type="checkbox"
          disabled={cellOptions.disabled || cellOptions.readonly}
          on:focusin={cellState.focus}
          on:focusout={cellState.submit}
          on:change={cellState.change}
          use:focus
        />
        <span class="spectrum-Switch-switch" />
      </div>
    </div>
  {:else}
    <div
      class="value"
      tabIndex="0"
      style:justify-content={cellOptions.align ?? "center"}
      style:padding-left={cellOptions.icon ? "32px" : cellOptions.padding}
      on:focusin={cellState.focus}
    >
      {#if formattedValue}
        {formattedValue}
      {:else if value}
        <i class="ri-check-line icon"></i>
      {:else if cellOptions.showFalse}
        <i class="ri-close-line icon"></i>
      {/if}
    </div>
  {/if}
</div>

<style>
  .icon {
    font-size: 16px;
    color: var(--spectrum-global-color-green-400);
  }
</style>
