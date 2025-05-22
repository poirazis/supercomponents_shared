<script>
  import { createEventDispatcher } from "svelte";
  import fsm from "svelte-fsm";
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";
  import CellLinkPickerTree from "../../lib/SuperTableCells/CellLinkPickerTree.svelte";
  const dispatch = createEventDispatcher();

  export let value;
  export let fieldSchema;
  export let cellOptions;
  export let simpleView = true;
  export let filter = [];
  export let limit = 100;

  let originalValue = JSON.stringify(value);
  let anchor;
  let popup;
  let search;
  let hasFocus;
  let searchTerm;

  export let cellState = fsm(cellOptions.initialState ?? "View", {
    "*": {
      goTo(state) {
        return state;
      },
    },
    View: {
      _enter() {
        search = false;
      },
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
        originalValue = JSON.stringify(localValue);
        editorState.open();
        dispatch("enteredit");
      },
      _exit() {
        editorState.close();
        dispatch("exitedit");
      },
      checkFocus() {
        return hasFocus();
      },
      focusout(e) {
        if (popup?.contains(e.relatedTarget)) return;
        this.submit();
      },
      popupfocusout(e) {
        console.log(e);
      },
      clear() {
        localValue = [];
      },
      submit() {
        if (isDirty)
          dispatch(
            "change",
            returnSingle && localValue ? localValue[0] : localValue
          );
        editorState.close();
        return "View";
      },
      cancel() {
        editorState.close();
        return "View";
      },
    },
  });

  const editorState = fsm("Closed", {
    Open: {
      close() {
        return "Closed";
      },
      toggle() {
        return "Closed";
      },
    },
    Closed: {
      open() {
        return "Open";
      },
      toggle() {
        return "Open";
      },
    },
  });

  $: pills = cellOptions.relViewMode == "pills";
  $: multi = !fieldSchema?.type?.includes("_single");
  $: isUser = fieldSchema?.type?.includes("bb_reference");
  $: localValue = enrichValue(value);
  $: inEdit = $cellState == "Editing";
  $: isDirty = inEdit && originalValue != JSON.stringify(localValue);
  $: simpleView = cellOptions.relViewMode == "text";
  $: inline = cellOptions.role == "inlineInput";
  $: expanded = cellOptions.controlType == "expanded";
  $: multirow =
    cellOptions.controlType == "expanded" && (localValue?.length > 1 || inEdit);
  $: singleSelect =
    fieldSchema?.relationshipType == "one-to-many" ||
    fieldSchema?.relationshipType == "many-to-one" ||
    fieldSchema?.relationshipType == "self" ||
    !multi;

  $: returnSingle = isUser && !multi;

  const handleKeyboard = (e) => {
    if (e.keyCode == 32 && $cellState == "Editing") {
      e.preventDefault();
      e.stopPropagation();
      editorState.toggle();
    } else if (e.key != "Tab") {
      search = true;
    }
  };

  const handleChange = (e) => {
    localValue = e.detail;
    let val = returnSingle ? (localValue[0] ?? {}) : localValue;

    if (expanded) {
      dispatch("change", val);
    }

    if (singleSelect) {
      editorState.close();
    }
  };

  const enrichValue = (x) => {
    if (fieldSchema.relationshipType == "self" && x) {
      return safeParse(x);
    } else if (multi) {
      return value ? [...value] : [];
    } else {
      return value ? [value] : [];
    }
  };

  const safeParse = (x) => {
    let res;
    try {
      res = JSON.parse(x);
    } catch {
      res = undefined;
    }
    return res;
  };
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="superCell"
  bind:this={anchor}
  tabindex={"0"}
  class:inEdit
  class:isDirty={isDirty && cellOptions.showDirty}
  class:focused={$cellState == "Editing"}
  class:inline
  class:multirow
  class:tableCell={cellOptions.role == "tableCell"}
  class:formInput={cellOptions.role == "formInput"}
  class:disabled={cellOptions.disabled}
  class:readonly={cellOptions.readonly}
  class:error={cellOptions.error}
  style:color={cellOptions.color}
  style:background={cellOptions.background}
  style:font-weight={cellOptions.fontWeight}
  on:keydown={handleKeyboard}
  on:focusin={cellState.focus}
  on:focusout={cellState.focusout}
  on:mousedown={editorState.toggle}
>
  {#if cellOptions?.icon}
    <i class={cellOptions.icon + " icon"}></i>
  {/if}

  <div
    class="value"
    class:with-icon={cellOptions?.icon}
    class:placeholder={localValue?.length < 1}
  >
    {#if localValue?.length < 1}
      <span>
        {cellOptions.placeholder ?? null}
      </span>
    {:else if localValue?.length > 0}
      <div class="items" class:pills>
        {#each localValue as val}
          <div
            class="item"
            class:rel-bb-reference={!simpleView && fieldSchema.type != "link"}
          >
            {#if !simpleView}
              <i
                class={fieldSchema.type == "link"
                  ? "ri-links-line"
                  : "ri-user-line"}
              />
            {/if}
            <span>{val.primaryDisplay}</span>
          </div>
        {/each}
      </div>
    {/if}

    {#if inEdit && localValue?.length}
      <i
        class="ri-close-line clearIcon"
        on:mousedown|preventDefault={cellState.clear}
      ></i>
    {/if}
    {#if cellOptions.role == "formInput" || inEdit}
      <i class="ri-arrow-down-s-line controlIcon"></i>
    {/if}
  </div>
</div>

{#if inEdit}
  <SuperPopover
    {anchor}
    useAnchorWidth
    open={$editorState == "Open"}
    bind:popup
    on:close={cellState.focusout}
  >
    <CellLinkPickerTree
      {fieldSchema}
      {filter}
      {search}
      {searchTerm}
      {limit}
      joinColumn={cellOptions.joinColumn}
      value={localValue}
      multi={false}
      on:change={handleChange}
      on:focusout={(e) => setTimeout(cellState.focusout, 20, e)}
    />
  </SuperPopover>
{/if}

<style>
  .rel-pills {
    background-color: var(--spectrum-global-color-gray-200);
  }
  .rel-bb-reference {
    background-color: var(--spectrum-global-color-gray-200);
  }

  .actionIcon {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 2rem;
    font-size: 16px;
    transition: all 130ms;
    margin-right: 8px;
  }
  .actionIcon:hover {
    cursor: pointer;
    background-color: var(--spectrum-global-color-gray-75);
    color: var(--spectrum-global-color-red-500);
    font-weight: 800;
  }

  .loader {
    width: 120px;
    height: 20px;
    background: linear-gradient(90deg, #0001 33%, #0005 50%, #0001 66%) #f2f2f2;
    background-size: 300% 100%;
    animation: l1 1s infinite linear;
  }
  @keyframes l1 {
    0% {
      background-position: right;
    }
  }
</style>
