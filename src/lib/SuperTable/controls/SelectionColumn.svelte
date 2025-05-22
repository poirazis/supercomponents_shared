<script>
  import { getContext } from "svelte";

  const stbState = getContext("stbState");
  const stbSettings = getContext("stbSettings");
  const stbData = getContext("stbData");
  const stbHorizontalScrollPos = getContext("stbHorizontalScrollPos");
  const stbHovered = getContext("stbHovered");
  const stbMenuID = getContext("stbMenuID");
  const stbSelected = getContext("stbSelected");
  const stbEditing = getContext("stbEditing");
  const stbAPI = getContext("stbAPI");
  const rowMetadata = getContext("stbRowMetadata");
  const stbVisibleRows = getContext("stbVisibleRows");

  export let sticky;
  export let hideSelectionColumn;

  $: idColumn = $stbSettings.data.idColumn;
  $: partialSelection = $stbSelected.length;
  $: fullSelection =
    $stbSelected.length == $stbData.rows?.length && $stbData.rows?.length > 0;

  $: numbering = $stbSettings.appearance.numberingColumn;
  $: checkBoxes = $stbSettings.features.canSelect && !hideSelectionColumn;
  $: canDelete = $stbSettings.features.canDelete;
  $: sticky = $stbHorizontalScrollPos > 0;

  $: visible = numbering || checkBoxes || canDelete;
  $: zebra = $stbSettings.appearance.zebraColors;
  $: quiet = $stbSettings.appearance.quiet;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
{#if visible}
  <div class="super-column control-column" class:sticky>
    {#if $stbSettings?.showHeader}
      <div class="control-column-header">
        {#if numbering}
          <div class="row-number"></div>
        {/if}

        {#if canDelete}
          {#if $stbSelected.length > 1}
            <i
              class="ri-delete-bin-line"
              on:click={stbAPI.deleteSelectedRows}
            />
          {:else}
            <div class="row-number"></div>
          {/if}
        {/if}

        {#if $stbSettings.features.canSelect && $stbSettings.features.maxSelected != 1 && !hideSelectionColumn}
          {#if fullSelection}
            <i class="ri-check-line" on:click={stbAPI.selectAllRows} />
          {:else if partialSelection}
            <i
              class="ri-checkbox-indeterminate-line"
              on:click={stbAPI.selectAllRows}
            ></i>
          {:else}
            <i
              class="ri-checkbox-blank-line"
              style:color={"var(--spectrum-global-color-gray-500)"}
              on:click={stbAPI.selectAllRows}
            />
          {/if}
        {/if}
      </div>
    {/if}

    <div
      class="super-column-body"
      class:zebra
      class:quiet
      class:sticky
      style:margin-top={"var(--super-column-top-offset)"}
    >
      {#each $stbVisibleRows as visibleRow}
        {@const row = $stbData?.rows?.[visibleRow]}
        {#if row}
          <div
            class="super-row selection"
            class:is-selected={$stbSelected?.includes(
              row[idColumn] ?? visibleRow
            )}
            class:is-hovered={$stbHovered == visibleRow ||
              $stbMenuID == visibleRow}
            class:is-editing={$stbEditing == row[idColumn]}
            style:min-height={$rowMetadata[visibleRow]?.height}
            on:mouseenter={() => ($stbHovered = visibleRow)}
            on:mouseleave={() => ($stbHovered = null)}
          >
            {#if numbering}
              <span class="row-number">
                {#if $stbEditing == row[idColumn]}
                  <i
                    class="ri-edit-line"
                    style:font-size={"14px"}
                    style:color={"lime"}
                  />
                {:else}
                  {visibleRow + 1}
                {/if}
              </span>
            {/if}

            {#if canDelete}
              <i
                class="ri-delete-bin-line delete"
                on:click={(e) => stbAPI.deleteRow(visibleRow)}
              />
            {/if}

            {#if $stbSettings.features.canSelect && !hideSelectionColumn}
              {#if $stbSelected?.includes(row[idColumn] ?? visibleRow)}
                <i
                  class="ri-check-line"
                  style:color={"var(--spectrum-global-color-gray-800)"}
                  on:click={() => stbAPI.selectRow(visibleRow)}
                />
              {:else}
                <i
                  class="ri-checkbox-blank-line"
                  on:click={() => stbAPI.selectRow(visibleRow)}
                />
              {/if}
            {/if}
          </div>
        {/if}
      {/each}

      {#if $stbState == "Inserting"}
        <div class="add-row" style="padding: unset;"></div>
      {/if}
    </div>

    {#if $stbSettings.showFooter}
      <div class="super-column-footer" style:padding={"unset"}></div>
    {/if}
  </div>
{/if}

<style>
  .selection {
    flex: auto;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    gap: 1rem;
    font-size: 14px;
    font-weight: 500;
    align-items: center;
    &.is-hovered > .delete {
      color: var(--spectrum-global-color-red-700);
    }
    &.is-selected > .delete {
      color: var(--spectrum-global-color-red-700);
    }
    &.is-hovered > i {
      color: var(--spectrum-global-color-gray-700);
    }
  }

  i {
    font-size: 16px;
    color: var(--spectrum-global-color-gray-500);

    &:hover {
      cursor: pointer;
    }
  }
</style>
