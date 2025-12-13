<script>
  import { getContext } from "svelte";

  const stbState = getContext("stbState");
  const stbSettings = getContext("stbSettings");
  const stbHorizontalScrollPos = getContext("stbHorizontalScrollPos");
  const stbHovered = getContext("stbHovered");
  const stbMenuID = getContext("stbMenuID");
  const stbSelected = getContext("stbSelected");
  const stbAPI = getContext("stbAPI");
  const stbVisibleRows = getContext("stbVisibleRows");
  const stbRowMetadata = getContext("stbRowMetadata");

  export let sticky;
  export let hideSelectionColumn;
  export let stbData;

  $: partialSelection =
    $stbSelected.length && $stbSelected.length != $stbData?.rows?.length;

  $: fullSelection =
    $stbSelected.length == $stbData?.rows?.length && $stbData?.rows?.length > 0;

  $: numbering = $stbSettings.appearance.numberingColumn;
  $: checkBoxes = $stbSettings.features.canSelect && !hideSelectionColumn;
  $: canDelete = $stbSettings.features.canDelete;
  $: sticky = $stbHorizontalScrollPos > 0;
  $: visible = numbering || checkBoxes || canDelete;
  $: zebra = $stbSettings.appearance.zebraColors;
  $: quiet = $stbSettings.appearance.quiet;

  $: console.log("stbRowMetadata", $stbRowMetadata);
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
{#if visible}
  <div class="super-column control-column" class:sticky>
    {#if $stbSettings?.showHeader}
      <div class="control-column-header" style:gap={"1rem"}>
        {#if numbering}
          <span class="row-number"></span>
        {/if}

        {#if checkBoxes && $stbSettings.features.maxSelected != 1 && $stbVisibleRows.length > 0}
          <div
            class="checkbox"
            class:selected={fullSelection}
            class:partialSelection
            on:click={stbAPI.selectAllRows}
          >
            <i class="ri-check-line" style:visibility={"hidden"} />
          </div>
        {/if}

        {#if canDelete}
          {#if $stbSelected.length}
            <i
              class="ri-delete-bin-line delete"
              on:click={stbAPI.deleteSelectedRows}
            />
          {:else}
            <i class="ri-delete-bin-line disabled" />
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
      {#each $stbVisibleRows as visibleRow (visibleRow)}
        {@const selected = $stbRowMetadata[visibleRow]?.selected}
        <div
          class="super-row selection"
          class:is-selected={selected}
          class:is-hovered={$stbHovered == visibleRow ||
            $stbMenuID == visibleRow}
          class:is-disabled={$stbRowMetadata[visibleRow]?.disabled}
          style:min-height={$stbRowMetadata[visibleRow]?.height}
          on:mouseenter={() => ($stbHovered = visibleRow)}
          on:mouseleave={() => ($stbHovered = null)}
        >
          {#if numbering}
            <div class="row-number">
              {visibleRow + 1}
            </div>
          {/if}

          {#if $stbSettings.features.canSelect && !hideSelectionColumn}
            <div
              class="checkbox"
              class:selected
              on:click={() => stbAPI.selectRow(visibleRow)}
            >
              <i class="ri-check-line" style:visibility={"hidden"} />
            </div>
          {/if}

          {#if canDelete}
            <i
              class="ri-delete-bin-line delete"
              class:selected
              on:click={(e) => stbAPI.deleteRow(visibleRow)}
            />
          {/if}
        </div>
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
    font-size: 13px;
    font-weight: 500;
    align-items: center;
    &.is-hovered > .delete {
      color: var(--spectrum-global-color-red-700) !important;
    }
    &.is-selected > .delete {
      color: var(--spectrum-global-color-red-400);
    }
    &.is-hovered > i:not(.delete) {
      color: var(--spectrum-global-color-gray-700);
    }
  }

  i {
    font-size: 14px;
    color: var(--spectrum-global-color-gray-500);

    &.disabled {
      color: var(--spectrum-global-color-gray-100);
    }

    &.delete {
      &.selected {
        color: var(--spectrum-global-color-red-400);
      }

      &:hover {
        color: var(--spectrum-global-color-red-700);
      }
    }

    &.full {
      color: var(--spectrum-global-color-gray-900);
    }

    &:hover:not(.disabled) {
      cursor: pointer;
    }
  }

  .checkbox {
    width: 14px;
    height: 14px;
    border: 1px solid var(--spectrum-global-color-gray-500);
    background-color: var(--spectrum-global-color-gray-50);
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &.selected {
      border: 1px solid var(--spectrum-global-color-gray-600);
      & > i {
        visibility: visible !important;
        color: var(--spectrum-global-color-gray-700);
      }
    }

    &.partialSelection {
      border-color: var(--spectrum-global-color-green-700);
    }
  }
</style>
