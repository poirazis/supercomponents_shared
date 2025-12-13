<script>
  import {
    getContext,
    createEventDispatcher,
    onMount,
    onDestroy,
  } from "svelte";

  const { Provider, ContextScopes } = getContext("sdk");

  const dispatch = createEventDispatcher();
  const columnSettings = getContext("stColumnOptions");
  const columnState = getContext("stColumnState");
  const rowCellOptions = getContext("stRowCellOptions");
  const rowMetadata = getContext("stbRowMetadata");
  const stbHovered = getContext("stbHovered");
  const stbSelected = getContext("stbSelected");
  const stbEditing = getContext("stbEditing");
  const stbAPI = getContext("stbAPI");
  const stbState = getContext("stbState");
  const stbMenuID = getContext("stbMenuID");

  export let index;
  export let row;
  export let field;
  export let idField;
  export let isEditing;
  export let isLast;
  export let disabled;

  // the default height
  export let rowHeight;
  let mounted;
  let viewport;
  let info;

  $: meta = $rowMetadata?.[index] ?? {};
  $: id = row?.[idField] ?? index;
  $: value = deepGet(row, field);
  $: isHovered = $stbHovered == index || $stbMenuID == index;
  $: isSelected = $stbSelected.includes(stbAPI.getRowId(row, index));
  $: hasChildren = $columnSettings.hasChildren > 0;

  const patchRow = async (change) => {
    let patch = {
      ...row,
      [field]: change,
    };

    try {
      value = "";
      let patched_row = await stbAPI.patchRow(patch);
      row = { ...patched_row };
    } catch (ex) {
      if (ex.json.validationErrors) {
        info = ex.json.validationErrors[field][0];
      } else {
        info = ex.message;
      }

      setTimeout(() => {
        info = undefined;
      }, 2250);
    } finally {
      value = deepGet(row, field);
    }
  };

  const deepGet = (obj, path) => {
    if (obj && path?.includes(".")) {
      for (var i = 0, path = path.split("."), len = path.length; i < len; i++) {
        if (obj[path[i]])
          if (Array.isArray(obj[path[i]])) obj = obj[path[i]][0];
          else obj = obj[path[i]];
        else {
          obj = null;
          break;
        }
      }
      return obj;
    } else return obj[path] ?? undefined;
  };
  onMount(() => (mounted = $columnSettings.superColumn));

  onDestroy(() => {
    if ($stbEditing == index) {
      columnState.exitedit();
    }
  });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
  bind:this={viewport}
  class="super-row"
  class:is-selected={isSelected}
  class:is-hovered={isHovered}
  class:is-editing={isEditing}
  class:is-disabled={meta.disabled}
  class:isLast
  style:height={meta.height + "px"}
  style:color={meta.color}
  style:background-color={meta.bgcolor}
  style:justify-content={$columnSettings.align}
  on:mouseenter={() => ($stbHovered = index)}
  on:mouseleave={() => ($stbHovered = undefined)}
  on:click={() =>
    stbState.handleRowClick(index, field, deepGet(row, field), id)}
  on:contextmenu|preventDefault={() => {
    stbAPI.showContextMenu(index, viewport);
  }}
>
  {#if !hasChildren}
    <svelte:component
      this={$columnSettings.cellComponent}
      cellOptions={{ ...$rowCellOptions, disabled, error: info }}
      fieldSchema={$columnSettings.schema}
      ownId={row[idField]}
      {value}
      on:enteredit={() => columnState.enteredit(index)}
      on:exitedit={columnState.exitedit}
      on:change={(e) => patchRow(e.detail)}
      on:linkClick={(e) => {
        stbAPI.executeOnLinkClickAction(field, e.detail);
      }}
    />
    {#if info}
      <div class="info" class:bottom={index == 0}>{info}</div>
    {/if}
  {:else}
    <Provider
      data={{
        id,
        value: row[field],
        row,
        index,
      }}
      scope={ContextScopes.Local}
    >
      <slot />
    </Provider>
  {/if}
</div>

<style>
  .info {
    position: absolute;
    top: -26px;
    font-size: 11px;
    background-color: var(--spectrum-global-color-red-400);
    border-radius: 4px;
    padding: 4px;

    &.bottom {
      top: unset;
      bottom: -26px;
    }
  }
</style>
