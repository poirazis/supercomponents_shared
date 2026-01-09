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
  export let isUserSelect;

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
      reset(val) {
        localValue = undefined;
      },
    },
    View: {
      _enter() {},
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) return "Editing";
      },
    },
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
        if (
          anchor?.contains(e?.relatedTarget) ||
          popup?.contains(e?.relatedTarget)
        )
          return;

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
        localValue = JSON.parse(originalValue);
        anchor?.blur();
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
  $: isUser = fieldSchema?.type?.includes("bb_reference") || isUserSelect;
  $: pills = cellOptions.relViewMode == "pills";
  $: valueIcon =
    fieldSchema.type == "link" ? "ri-edit-box-line" : "ri-user-line";
  $: links = cellOptions.relViewMode == "links" && !isUser;
  $: ownId = ownId || cellOptions?.ownId;

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
  $: placeholder = cellOptions.placeholder || "";
  $: readonly = cellOptions.readonly || cellOptions.disabled;

  const handleKeyboard = (e) => {
    if (e.key == "Escape" && $editorState == "Open") {
      editorState.close();
      return;
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
      anchor.focus();
    }
  };

  const enrichValue = (x) => {
    if (fieldSchema.relationshipType == "self" && x && !Array.isArray(x)) {
      API.fetchRow(fieldSchema.tableId, x, true)
        .then((row) => {
          localValue = [
            {
              _id: row.id,
              primaryDisplay: fieldSchema.primaryDisplay
                ? row[fieldSchema.primaryDisplay]
                : row.name || row.id,
            },
          ];
        })
        .catch((e) => {
          localValue = [];
        });
      return localValue || [];
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
  tabindex={cellOptions?.disabled ? -1 : 0}
  bind:this={anchor}
  class:isDirty={isDirty && cellOptions.showDirty}
  class:inEdit
  class:inline
  class:multirow
  class:tableCell={cellOptions.role == "tableCell"}
  class:formInput={cellOptions.role == "formInput"}
  class:disabled={cellOptions.disabled}
  class:readonly
  class:error={cellOptions.error}
  style:color={cellOptions.color}
  style:background={cellOptions.background}
  on:mousedown={editorState.toggle}
  on:focusin={cellState.focus}
  on:keydown|self={handleKeyboard}
  on:focusout={cellState.focusout}
>
  {#if cellOptions?.icon}
    <i class={cellOptions.icon + " field-icon"}></i>
  {/if}

  <div class="value" class:placeholder={localValue?.length < 1}>
    {#if localValue?.length < 1}
      <span> {placeholder} </span>
    {:else if pills || links}
      <div
        class="items"
        class:pills
        class:links
        class:isUser
        class:withCount={localValue.length > 5}
        class:inEdit
      >
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
              <i class={valueIcon}></i>
              <span>{val.primaryDisplay}</span>
            </div>
          {/if}
        {/each}
        {#if localValue.length > 5}
          <span class="count">
            (+ {localValue.length - 5})
          </span>
        {/if}
      </div>
    {:else}
      <span>
        {#if cellOptions.role == "formInput" && localValue.length > 1}
          ({localValue.length})
        {/if}
        {localValue.map((v) => v.primaryDisplay).join(", ")}
      </span>
    {/if}
  </div>
  {#if !readonly && (cellOptions.role == "formInput" || inEdit)}
    <i class="ph ph-caret-down control-icon"></i>
  {/if}
</div>

{#if inEdit}
  <SuperPopover
    {anchor}
    useAnchorWidth
    open={$editorState == "Open"}
    on:close={cellState.cancel}
    bind:popup
  >
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="picker-container"
      on:keydown={(e) => {
        if (e.key == "Escape" || e.key == "Tab") {
          anchor.focus();
          editorState.close();
          e.preventDefault();
        }
      }}
    >
      {#if fieldSchema.recursiveTable}
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
        />
      {/if}
    </div>
  </SuperPopover>
{/if}
