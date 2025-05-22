<script>
  import { createEventDispatcher, getContext } from "svelte";
  import fsm from "svelte-fsm";
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";
  import CellLinkPickerSelect from "./CellLinkPickerSelect.svelte";
  import CellLinkPickerTree from "./CellLinkPickerTree.svelte";
  const dispatch = createEventDispatcher();
  const { API } = getContext("sdk");

  export let value;
  export let fieldSchema;
  export let cellOptions;
  export let simpleView = true;
  export let filter = [];
  export let limit = 100;

  // In case of a self referencing relationship, the current row cannot be the parent of itself
  export let ownId;

  let originalValue = JSON.stringify(value);
  let anchor;
  let popup;
  let search;
  let pickerApi;

  export let cellState = fsm(cellOptions.initialState ?? "View", {
    "*": {
      goTo(state) {
        return state;
      },
    },
    View: {
      _enter() {},
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
      focusout(e) {
        if (popup?.contains(e?.relatedTarget)) return;
        this.submit();
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

        return "View";
      },
      cancel() {
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

  $: multi = !fieldSchema?.type?.includes("_single");
  $: isUser = fieldSchema?.type?.includes("bb_reference");
  $: pills = cellOptions.relViewMode == "pills" && !isUser;
  $: valueIcon =
    fieldSchema.type == "link" ? "ri-edit-box-line" : "ri-user-line";
  $: links = cellOptions.relViewMode == "links" && !isUser;

  $: localValue = enrichValue(value);
  $: inEdit = $cellState == "Editing";
  $: isDirty = inEdit && originalValue != JSON.stringify(localValue);
  $: simpleView = cellOptions.relViewMode == "text";
  $: inline = cellOptions.role == "inlineInput";
  $: multirow =
    cellOptions.controlType == "expanded" && (localValue?.length > 1 || inEdit);
  $: singleSelect =
    fieldSchema?.relationshipType == "one-to-many" ||
    fieldSchema?.relationshipType == "self" ||
    !multi;

  $: returnSingle = isUser && !multi;
  $: placeholder =
    cellOptions.disabled || cellOptions.readonly
      ? ""
      : cellOptions.placeholder || "";

  const handleKeyboard = (e) => {
    if (e.key == "Escape" && $editorState == "Open") {
      editorState.close();
    } else if (e.key == "Escape") {
      cellState.cancel();
    } else if (e.keyCode == 32 && $cellState == "Editing") {
      editorState.toggle();
    } else if (e.key == "Tab" && $editorState == "Open") {
      cellState.focusout();
    } else if ($editorState == "Open") {
      pickerApi?.focus();
    }
  };

  const handleChange = (e) => {
    localValue = e.detail;

    if (singleSelect) {
      editorState.close();
    }
  };

  const enrichValue = (x) => {
    if (fieldSchema.relationshipType == "self" && x) {
      API.fetchRow(fieldSchema.tableId, x).then((row) => {
        localValue = [
          { _id: row.id, primaryDisplay: row.name ?? Object.values(row)[0] },
        ];
      });
      return [];
    } else if (multi) {
      return value ? [...value] : [];
    } else {
      return value ? [value] : [];
    }
  };
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="superCell"
  tabindex={cellOptions?.disabled ? "-1" : "0"}
  bind:this={anchor}
  class:isDirty={isDirty && cellOptions.showDirty}
  class:inEdit
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
  on:mousedown={editorState.toggle}
  on:focusin={cellState.focus}
  on:keydown|self={handleKeyboard}
  on:focusout={cellState.focusout}
>
  {#if cellOptions?.icon}
    <i class={cellOptions.icon + " icon"}></i>
  {/if}

  <div
    class="value"
    class:with-icon={cellOptions?.icon}
    class:placeholder={localValue?.length < 1}
  >
    {#if localValue?.length < 1 && placeholder}
      <span> {placeholder} </span>
    {:else}
      <div class="items" class:pills class:links class:isUser>
        {#each localValue as val, idx}
          {#if idx < 5}
            <div
              class="item"
              on:click={links
                ? () => {
                    dispatch("linkClick", val);
                  }
                : null}
            >
              <i class={valueIcon} />
              <span>{val.primaryDisplay}</span>
            </div>
          {/if}
        {/each}

        {#if localValue.length > 5}
          <span class="item-count">
            {localValue.length}
          </span>
        {/if}
      </div>
    {/if}

    {#if inEdit && localValue?.length}
      <i
        class="ri-close-line clearIcon"
        style:right={"28px"}
        on:mousedown|preventDefault={cellState.clear}
      ></i>
    {/if}
    {#if !cellOptions.readonly && (cellOptions.role == "formInput" || inEdit)}
      <i class="ri-arrow-down-s-line controlIcon"></i>
    {/if}
  </div>
</div>

{#if inEdit}
  <SuperPopover
    {anchor}
    useAnchorWidth
    bind:popup
    open={$editorState == "Open"}
  >
    {#if fieldSchema.recursiveTable || ownId}
      <CellLinkPickerTree
        {fieldSchema}
        filter={filter ?? []}
        {search}
        {limit}
        joinColumn={cellOptions.joinColumn}
        value={localValue}
        {ownId}
        multi={fieldSchema.relationshipType == "many-to-many" ||
          fieldSchema.relationshipType == "many-to-one"}
        on:change={handleChange}
      />
    {:else}
      <CellLinkPickerSelect
        bind:api={pickerApi}
        {fieldSchema}
        filter={filter ?? []}
        {singleSelect}
        value={localValue}
        {search}
        wide={cellOptions.wide && !singleSelect}
        on:change={handleChange}
        on:close={() => {
          cellState.focusout();
        }}
      />
    {/if}
  </SuperPopover>
{/if}
