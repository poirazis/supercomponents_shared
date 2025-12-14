<script>
  import SuperTableColumn from "../../SuperTableColumn/SuperTableColumn.svelte";
  export let superColumns;
  export let commonColumnOptions;
  export let stbSettings;

  export let columnsViewport;
  export let showActionColumn;
  export let canScroll;
  export let stbData;
</script>

<div bind:this={columnsViewport} class="st-master-columns" tabIndex="-1">
  {#if $stbSettings.superColumnsPos == "first"}
    <slot />
  {/if}

  {#if $superColumns.length === 0}
    <div class="no-columns-placeholder">
      No columns defined. Please add columns to the Super Table.
    </div>
  {:else}
    {#each $superColumns as column, idx (idx)}
      <SuperTableColumn
        {stbData}
        columnOptions={{
          ...$commonColumnOptions,
          ...column,
          isFirst: idx == 0,
          isLast:
            idx == $superColumns.length - 1 && !showActionColumn && canScroll,
        }}
      />
    {/each}
  {/if}

  {#if $stbSettings.superColumnsPos == "last"}
    <slot />
  {/if}
</div>
