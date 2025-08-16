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
  $: checkbox = cellOptions?.controlType == "checkbox";

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
  class:isDirty={isDirty && cellOptions.showDirty}
  class:inline
  class:naked-field={checkbox}
  class:tableCell={cellOptions.role == "tableCell"}
  class:formInput={!checkbox && cellOptions.role == "formInput"}
  class:disabled={cellOptions.disabled}
  class:readonly={cellOptions.readonly}
  style:color={cellOptions.color}
  style:background={$cellState == "Editing" && cellOptions.role != "inline"
    ? "var(--spectrum-global-color-gray-50)"
    : cellOptions.background}
  style:font-weight={cellOptions.fontWeight}
>
  {#if cellOptions.icon}
    <i class={cellOptions.icon + " icon"}></i>
  {/if}

  {#if $cellState == "Editing" || cellOptions.role != "tableCell"}
    <div
      class="editor"
      class:with-icon={cellOptions.icon}
      class:naked-field={checkbox}
      style:justify-content={cellOptions.align ?? "center"}
      on:mousedown|self|preventDefault|stopPropagation={$cellState == "Editing"
        ? () => {
            value = !value;
          }
        : () => {
            cellState.focus();
          }}
    >
      {#if !checkbox}
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
      {:else}
        <input
          class="checkbox"
          bind:checked={value}
          bind:this={editor}
          type="checkbox"
          disabled={cellOptions.disabled || cellOptions.readonly}
          on:focusin={cellState.focus}
          on:focusout={cellState.submit}
          on:change={cellState.change}
          use:focus
        />
      {/if}
    </div>
  {:else}
    <div
      class="value"
      tabIndex="0"
      style:justify-content={cellOptions.align ?? "center"}
      class:with-icon={cellOptions.icon}
      on:focusin={cellState.focus}
    >
      {#if formattedValue}
        {formattedValue}
      {:else if value}
        <i class="ri-check-line valueicon"></i>
      {:else if cellOptions.showFalse}
        <i class="ri-close-line valueicon"></i>
      {/if}
    </div>
  {/if}
</div>

<style>
  .valueicon {
    font-size: 16px;
    color: var(--spectrum-global-color-green-400);
  }

  .checkbox {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 2px;
    position: relative;
    background: var(--spectrum-global-color-gray-50);
    border: 1px solid var(--spectrum-global-color-gray-500);
  }
  .checkbox:checked::before {
    content: "\2713";
    position: absolute;
    top: 0px;
    left: 2px;
    color: var(--spectrum-global-color-green-400);
    font-size: 12px;
  }

  .checkbox:focus {
    outline: none;
    border: 1px solid var(--spectrum-global-color-blue-400);
  }

  .naked-field {
    background-color: unset !important;
    padding-left: unset !important;
    border-color: transparent !important;
    border-width: 0px !important;

    &.with-icon {
      padding-left: 32px !important;
    }
  }
</style>
