<script>
  import { createEventDispatcher, getContext } from "svelte";
  import fsm from "svelte-fsm";
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";
  import CellSQLLinkPicker from "./CellSQLLinkPicker.svelte";
  import CellLinkPickerTree from "../../lib/SuperTableCells/CellLinkPickerTree.svelte";
  const dispatch = createEventDispatcher();
  const { API } = getContext("sdk");

  export let value;
  export let fieldSchema;
  export let cellOptions;
  export let simpleView = true;
  export let filter = [];
  export let limit = 100;
  export let multi = false;

  // In case of a self referencing relationship, the current row cannot be the parent of itself
  export let ownId;

  let originalValue = JSON.stringify(value);
  let anchor;
  let popup;
  let search;
  let pickerApi;
  let isLoading = false;
  let localValue;

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
      toggle() {
        return;
      },
      focus(e) {
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
      toggle(e) {
        editorState.toggle();
      },
      focusout(e) {
        if (popup?.contains(e?.relatedTarget)) return;
        this.submit();
      },
      popupfocusout(e) {
        if (anchor != e?.relatedTarget) {
          this.submit();
        }
      },
      clear() {
        localValue = [];
      },
      submit() {
        if (isDirty) dispatch("change", localValue);

        return "View";
      },
      cancel() {
        anchor.blur();
        localValue = JSON.parse(originalValue);
        return "View";
      },
    },
  });

  $: relatedField = fieldSchema?.relatedField || "id";
  $: relatedTableId = fieldSchema?.tableId;
  $: relatedColumns = fieldSchema?.relatedColumns || [];

  $: pills = cellOptions.relViewMode == "pills";
  $: ownId = ownId || cellOptions?.ownId;

  $: if (!isLoading) {
    localValue = enrichValue(value);
  }

  $: inEdit = $cellState == "Editing";
  $: isDirty = inEdit && originalValue != JSON.stringify(localValue);
  $: simpleView = cellOptions.relViewMode == "text";
  $: inline = cellOptions.role == "inlineInput";

  $: placeholder = cellOptions.placeholder || "";
  $: readonly = cellOptions.readonly || cellOptions.disabled;

  const handleKeyboard = (e) => {
    if (e.key == "Escape") {
      if ($editorState == "Open") {
        editorState.close();
      } else {
        cellState.focusout(e);
      }
    } else if (e.keyCode == 32 && $cellState == "Editing") {
      editorState.toggle();
    } else if (e.key == "Tab" && $editorState == "Open") {
      cellState.focusout(e);
    } else if ($editorState == "Open") {
      pickerApi?.focus();
    }
  };

  const handleChange = (e) => {
    localValue = e.detail;

    if (!multi) {
      editorState.close();
      anchor.focus();
    }
  };

  const enrichValue = (x) => {
    if (Array.isArray(x) && multi) {
      // Enrich array of ids for multi-select, only fetch missing ones
      const existingIds = localValue
        ? localValue.map((v) => v[relatedField])
        : [];
      const missingIds = x.filter((id) => !existingIds.includes(id));
      if (missingIds.length > 0) {
        isLoading = true;
        API.fetchTableDefinition(relatedTableId).then((def) => {
          fieldSchema.primaryDisplay = def.primaryDisplay;
        });

        Promise.all(
          missingIds.map((id) => API.fetchRow(relatedTableId, id, true)),
        )
          .then((rows) => {
            const newEnriched = rows.map((row) => ({
              ...row,
              primaryDisplay: fieldSchema.primaryDisplay
                ? row[fieldSchema.primaryDisplay]
                : row.name || row.id,
            }));
            // Append new enriched items to existing localValue
            localValue = [...(localValue || []), ...newEnriched];
            // Dispatch enrich event with full row context
            dispatch("enrich", { rows: newEnriched });
            isLoading = false;
          })
          .catch((e) => {
            // On error, keep existing localValue
            isLoading = false;
          });
      }
      return localValue || [];
    } else if (x && !Array.isArray(x)) {
      // Enrich single id, only if not already enriched
      const existing =
        localValue && localValue.find((v) => v[relatedField] === x);
      if (!existing) {
        isLoading = true;
        API.fetchTableDefinition(relatedTableId).then((def) => {
          fieldSchema.primaryDisplay = def.primaryDisplay;
        });

        API.fetchRow(relatedTableId, x, true)
          .then((row) => {
            const enrichedRow = {
              ...row,
              primaryDisplay: fieldSchema.primaryDisplay
                ? row[fieldSchema.primaryDisplay]
                : row.name || row.id,
            };
            localValue = [enrichedRow];
            // Dispatch enrich event with full row context
            dispatch("enrich", { rows: [enrichedRow] });
            isLoading = false;
          })
          .catch((e) => {
            localValue = [];
            isLoading = false;
          });
      }
      return localValue || [];
    } else if (multi) {
      return value && Array.isArray(value) ? value : [];
    } else {
      return value ? [value] : [];
    }
  };
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="superCell has-popup"
  tabindex={cellOptions?.disabled ? -1 : 0}
  bind:this={anchor}
  class:isDirty={isDirty && cellOptions.showDirty}
  class:inEdit
  class:inline
  class:tableCell={cellOptions.role == "tableCell"}
  class:formInput={cellOptions.role == "formInput"}
  class:disabled={cellOptions.disabled}
  class:readonly
  class:open-popup={$editorState == "Open"}
  class:error={cellOptions.error}
  style:color={cellOptions.color}
  style:background={cellOptions.background}
  on:focusin={cellState.focus}
  on:keydown|self={handleKeyboard}
  on:mousedown={cellState.toggle}
  on:focusout={cellState.focusout}
>
  {#if !isLoading}
    {#if cellOptions?.icon}
      <i class={cellOptions.icon + " field-icon"}></i>
    {/if}

    <div class="value" class:placeholder={localValue?.length < 1}>
      {#if localValue?.length < 1}
        <span> {placeholder} </span>
      {:else if pills}
        <div
          class="items"
          class:pills
          class:withCount={localValue.length > 5}
          class:inEdit
        >
          {#each localValue as val, idx}
            {#if idx < 5}
              <div class="item">
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
  {/if}
</div>

{#if inEdit}
  <SuperPopover
    {anchor}
    useAnchorWidth={true}
    minWidth={cellOptions.pickerWidth || undefined}
    align="left"
    open={$editorState == "Open"}
    bind:popup
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
        {multi}
        on:change={handleChange}
      />
    {:else}
      <CellSQLLinkPicker
        {fieldSchema}
        {filter}
        {multi}
        value={localValue}
        bind:api={pickerApi}
        on:change={handleChange}
        on:focusout={cellState.popupfocusout}
      />
    {/if}
  </SuperPopover>
{/if}
