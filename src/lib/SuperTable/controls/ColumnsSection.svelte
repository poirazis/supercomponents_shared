<script>
  import SuperTableColumn from "../../SuperTableColumn/SuperTableColumn.svelte";
  export let superColumns;
  export let commonColumnOptions;
  export let stbSettings;

  export let columnsViewport;
  export let showActionColumn;
  export let canScroll;
  let overflow;
</script>

<div bind:this={columnsViewport} class="st-master-columns" tabIndex="-1">
  {#if $stbSettings.superColumnsPos == "first"}
    <slot />
  {/if}

  {#each $superColumns as column, idx (idx)}
    <SuperTableColumn
      columnOptions={{
        ...column,
        ...$commonColumnOptions,
        overflow,
        isFirst: idx == 0,
        isLast:
          idx == $superColumns.length - 1 && !showActionColumn && canScroll,
      }}
    />
  {/each}

  {#if $stbSettings.superColumnsPos == "last"}
    <slot />
  {/if}
</div>
