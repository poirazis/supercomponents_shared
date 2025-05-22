<script>
  import { createEventDispatcher, getContext } from "svelte";
  import fsm from "svelte-fsm";
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";
  import "./CellCommon.css";

  export let value;
  export let formattedValue;
  export let cellOptions;
  export let fieldSchema;

  let originalValue = value;
  let anchor;
  let picker;
  let open;
  let focusedOptionIdx;

  $: multi = fieldSchema?.type?.includes("single") !== true;
  $: localvalue = value && multi ? value : value ? [value] : [];

  const dispatch = createEventDispatcher();
  const { processStringSync } = getContext("sdk");

  export let cellState = fsm(cellOptions.initialState ?? "View", {
    "*": {
      goTo(state) {
        return state;
      },
    },
    View: {
      _enter() {
        open = false;
      },
      focus() {
        if (!cellOptions.readonly) return "Editing";
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
        dispatch("enteredit");
      },
      _exit() {
        dispatch("exitedit");
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
    ? processStringSync(cellOptions.template, { Value: value })
    : undefined;

  $: placeholder =
    cellOptions.readonly || cellOptions.disabled
      ? ""
      : cellOptions.placeholder || "";

  const focus = (node) => {
    node.focus();
  };
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="superCell"
  bind:this={anchor}
  class:inEdit={$cellState == "Editing"}
  class:inline={cellOptions.role == "inline"}
  class:tableCell={cellOptions.role == "tableCell"}
  class:formInput={cellOptions.role == "formInput"}
  class:disabled={cellOptions.disabled}
  class:readonly={cellOptions.readonly}
  style:color={cellOptions.color}
  style:background={$cellState == "Editing" && cellOptions.role != "inline"
    ? "var(--spectrum-global-color-gray-50)"
    : cellOptions.background}
>
  {#if cellOptions.icon}
    <i class={cellOptions.icon + " frontIcon"}></i>
  {/if}

  {#if $cellState == "Editing"}
    <div
      tabindex="0"
      class="editor"
      style:padding-left={cellOptions.icon ? "32px" : cellOptions.padding}
      style:padding-right={cellOptions.padding}
      style:justify-content={cellOptions.align ?? "flex-start"}
      style:cursor="pointer"
      on:focusout={cellState.submit}
      on:click={() => (open = !open)}
      use:focus
    >
      <div class="items">
        {#each localvalue as file}
          {#if file}
            <div
              class="item pill"
              style:border={"1px solid var(--spectrum-global-color-gray-500)"}
            >
              <span>{file?.extension?.toUpperCase()}</span>
            </div>
          {/if}
        {/each}
      </div>

      <i class="ri-add-line"></i>
    </div>
  {:else}
    <div
      tabindex={cellOptions.readonly || cellOptions.disabled ? "-1" : "0"}
      on:focusin={cellState.focus}
      style:padding-left={cellOptions.icon ? "32px" : cellOptions.padding}
      style:padding-right={cellOptions.clearValueIcon
        ? "32px"
        : cellOptions.padding}
      class="value"
      class:placeholder={localvalue.length < 1}
    >
      {#if localvalue.length}
        <div class="items">
          {#each localvalue as file}
            {#if file}
              <div
                class="item pill"
                style:border={"1px solid var(--spectrum-global-color-gray-300)"}
              >
                <span>{file?.extension?.toUpperCase()}</span>
              </div>
            {/if}
          {/each}
        </div>
      {:else}
        <span>{placeholder}</span>
      {/if}
    </div>
  {/if}
</div>

{#if $cellState == "Editing"}
  <SuperPopover
    {anchor}
    dismissible={false}
    {open}
    useAnchorWidth
    minWidth={340}
  >
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      bind:this={picker}
      class="options"
      on:wheel={(e) => e.stopPropagation()}
      on:mouseleave={() => (focusedOptionIdx = -1)}
    >
      {#if localvalue?.length}
        {#each localvalue as option, idx (idx)}
          <div
            class="option"
            class:focused={focusedOptionIdx === idx}
            on:mouseenter={() => (focusedOptionIdx = idx)}
          >
            <div class="pill">{option.extension?.toUpperCase()}</div>
            <a href={option.url} class="filename">{option.name}</a>
            <i class="ri-delete-bin-line icon" />
          </div>
        {/each}
        <div style="height: 1rem;"></div>
      {/if}
      <div class="new">Select Files</div>
    </div>
  </SuperPopover>
{/if}

<style>
  .wrapper {
    flex: auto;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;
  }

  .pill {
    border: 1px solid var(--spectrum-global-color-gray-500);
    padding: 0rem 0.25rem;
    border-radius: 3px;
    font-size: 11px;
    display: flex;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    justify-content: center;
  }

  a.filename {
    width: 100%;
    line-height: 22px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    text-decoration: underline;
    color: var(--spectrum-global-color-blue-700);
  }

  .icon {
    aspect-ratio: 1;
    color: var(--spectrum-global-color-gray-500);
  }
  .icon:hover {
    aspect-ratio: 1;
    cursor: pointer;
  }

  .option {
    display: flex;
    align-items: center;
    justify-content: stretch;
    gap: 0.5rem;
    padding: 0.25rem 0.25rem;
  }
  .option:hover {
    background-color: var(--spectrum-global-color-gray-100);
  }

  .option:hover > .icon {
    color: var(--spectrum-global-color-red-500);
  }
  .option:hover > .pill {
    color: var(--spectrum-global-color-gray-800);
    background-color: var(--spectrum-global-color-gray-50);
    border: 1px solid var(--spectrum-global-color-gray-800);
  }
  .options {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 0.25rem;
    min-width: 15rem;
  }
  .attachment {
    display: flex;
    align-items: center;
    border: 1px solid darkcyan;
    border-radius: 4px;
    height: 50%;
    padding: 0 0.5rem 0 0.5rem;
    min-width: 15rem;
  }
  .attachment:hover {
    border: 1px solid lime;
  }

  .new {
    text-align: center;
    padding: 0.5rem 1rem;
    color: var(--spectrum-global-color-blue-700);
    text-decoration: underline;
    border: 1px dashed var(--spectrum-global-color-blue-400);
  }
</style>
