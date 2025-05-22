<script>
  import { getContext } from "svelte";
  const columnSettings = getContext("stColumnOptions");
  const rowCellOptions = getContext("stRowCellOptions");
  const stbState = getContext("stbState");

  export let row = {};
  export let isFirst;
  export let isLast;
  export let color;
</script>

<div
  class="super-row new-row"
  style:min-height={"2rem"}
  style:color
  class:isLast
>
  <svelte:component
    this={$columnSettings.cellComponent}
    cellOptions={{
      ...$rowCellOptions,
      readonly: false,
    }}
    autofocus={isFirst}
    fieldSchema={$columnSettings.schema}
    value={row.value}
    multi={$columnSettings.schema.type == "array"}
    on:change={(e) => {
      stbState.setValue($columnSettings.name, e.detail);
      row.value = e.detail;
    }}
  />
</div>
