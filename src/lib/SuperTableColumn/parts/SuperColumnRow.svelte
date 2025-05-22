<script>
  import { getContext, createEventDispatcher, onMount, tick } from "svelte";

  const { Provider, processStringSync, ContextScopes } = getContext("sdk");

  const dispatch = createEventDispatcher();
  const columnSettings = getContext("stColumnOptions");
  const columnState = getContext("stColumnState");
  const rowCellOptions = getContext("stRowCellOptions");
  const rowMetadata = getContext("stbRowMetadata");
  const stbHovered = getContext("stbHovered");
  const stbSelected = getContext("stbSelected");
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

  $: meta = $rowMetadata?.[index] ?? {};
  $: id = row?.[idField] ?? index;
  $: value = deepGet(row, field);
  $: isHovered = $stbHovered == index || $stbMenuID == index;
  $: isSelected = $stbSelected.includes(id);
  $: hasChildren = $columnSettings.hasChildren > 0;

  const getCellValue = (value) => {
    return $columnSettings.template
      ? processStringSync($columnSettings.template, { value })
      : undefined;
  };

  const patchRow = async (change) => {
    let patch = {
      ...row,
      [field]: change,
    };
    try {
      let patched_row = await stbAPI.patchRow(patch);
      row = patched_row;
    } catch (ex) {
      console.log(ex);
    } finally {
    }
  };

  const handleSize = async () => {
    if (mounted) {
      await tick();
      if (
        $columnSettings.superColumn &&
        viewport &&
        viewport.scrollHeight > meta.height
      ) {
        dispatch("resize", viewport.scrollHeight);
      } else if (
        $columnSettings.superColumn &&
        viewport &&
        !hasChildren &&
        viewport.scrollHeight > rowHeight
      )
        dispatch("resize", rowHeight);
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
  class:isLast
  style:height={meta.height + "px"}
  style:color={meta.color}
  style:background-color={meta.bgcolor}
  style:justify-content={$columnSettings.align}
  on:mouseenter={() => ($stbHovered = index)}
  on:mouseleave={() => ($stbHovered = undefined)}
  on:click={() =>
    stbState.handleRowClick(index, field, deepGet(row, field), id)}
  on:dblclick={() => stbAPI.executeRowOnDblClickAction(id)}
  on:contextmenu|preventDefault={() => {
    stbAPI.showContextMenu(index, viewport);
  }}
>
  {#if !hasChildren}
    <svelte:component
      this={$columnSettings.cellComponent}
      cellOptions={{ ...$rowCellOptions, disabled }}
      fieldSchema={$columnSettings.schema}
      {value}
      on:enteredit={() => columnState.enteredit(index)}
      on:exitedit={columnState.exitedit}
      on:change={(e) => patchRow(e.detail)}
      on:linkClick={(e) => {
        stbAPI.executeOnLinkClickAction(field, e.detail);
      }}
    />
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
