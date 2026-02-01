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
        if (popup?.contains(e?.relatedTarget)) return;
        this.submit();
      },

      clear() {
        localValue = [];
      },
      submit() {
        if (isDirty) dispatch("change", localValue);

        return "View";
      },
      cancel() {
        return "View";
      },
    },
  });

  $: relatedField = fieldSchema?.relatedField || "id";
  $: relatedTableId = fieldSchema?.tableId;
  $: relatedColumns = fieldSchema?.relatedColumns || [];

  $: pills = cellOptions.relViewMode == "pills";
  $: ownId = ownId || cellOptions?.ownId;

  $: localValue = enrichValue(value);

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
      if (e.key === "ArrowUp") {
        e.preventDefault();
        pickerApi?.focusPrev();
        pickerApi?.scrollIntoView();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        pickerApi?.focusNext();
        pickerApi?.scrollIntoView();
      } else if (e.key.length == 1 && e.key.match(/\S/)) {
        pickerApi?.setSearch(e.key);
      }
    }
  };

  const handleChange = (e) => {
    localValue = e.detail;

    if (!multi) {
      editorState.close();
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
        API.fetchTableDefinition(relatedTableId).then((def) => {
          fieldSchema.primaryDisplay = def.primaryDisplay;
        });

        Promise.all(
          missingIds.map((id) => API.fetchRow(relatedTableId, id, true)),
        )
          .then((rows) => {
            const newEnriched = rows.map((row) => ({
              [relatedField]: row[relatedField],
              primaryDisplay: fieldSchema.primaryDisplay
                ? row[fieldSchema.primaryDisplay]
                : row.name || row.id,
            }));
            // Append new enriched items to existing localValue
            localValue = [...(localValue || []), ...newEnriched];
          })
          .catch((e) => {
            // On error, keep existing localValue
          });
      }
      return localValue || [];
    } else if (x && !Array.isArray(x)) {
      // Enrich single id, only if not already enriched
      const existing =
        localValue && localValue.find((v) => v[relatedField] === x);
      if (!existing) {
        API.fetchTableDefinition(relatedTableId).then((def) => {
          fieldSchema.primaryDisplay = def.primaryDisplay;
        });

        API.fetchRow(relatedTableId, x, true)
          .then((row) => {
            localValue = [
              {
                [relatedField]: row[relatedField],
                primaryDisplay: fieldSchema.primaryDisplay
                  ? row[fieldSchema.primaryDisplay]
                  : row.name || row.id,
              },
            ];
          })
          .catch((e) => {
            localValue = [];
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
  style:font-weight={cellOptions.fontWeight}
  on:focusin={cellState.focus}
  on:keydown|self={handleKeyboard}
  on:mousedown={inEdit ? editorState.toggle : () => {}}
  on:focusout={cellState.focusout}
>
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
</div>

{#if inEdit}
  <SuperPopover
    {anchor}
    useAnchorWidth
    open={$editorState == "Open"}
    bind:popup
    on:close={(e) => {
      editorState.close();
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
      />
    {/if}
  </SuperPopover>
{/if}
