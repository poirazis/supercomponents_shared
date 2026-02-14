<script>
  import { getContext, onDestroy } from "svelte";
  import { is } from "zod/v4/locales";

  const { Provider, ContextScopes } = getContext("sdk");

  const columnSettings = getContext("stColumnOptions");
  const columnState = getContext("stColumnState");
  const rowCellOptions = getContext("stRowCellOptions");
  const rowMetadata = getContext("stbRowMetadata");
  const stbHovered = getContext("stbHovered");
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

  let viewport;
  let info;

  // Get Row overrides from metadata or fallback to column settings
  $: color = $rowMetadata[index]?.color ?? "inherit";
  $: height = $rowMetadata[index]?.height;
  $: bgcolor = $rowMetadata[index]?.bgcolor ?? "inherit";

  $: id = row?.[idField] ?? index;
  $: value = deepGet(row, field);
  $: isHovered = $stbHovered == index || $stbMenuID == index;
  $: isSelected = $rowMetadata?.[index]?.selected ?? false;
  $: isDisabled = $rowMetadata?.[index]?.disabled ?? false;
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
      }, 3250);
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
  class:is-disabled={isDisabled}
  class:isLast
  style:height
  style:color
  style:background-color={bgcolor}
  style:justify-content={$columnSettings.align}
  on:mouseenter={() => ($stbHovered = index)}
  on:mouseleave={() => ($stbHovered = undefined)}
  on:click={() => {
    if (!meta.disabled)
      stbState.handleRowClick(index, field, deepGet(row, field), id);
  }}
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
        value,
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
