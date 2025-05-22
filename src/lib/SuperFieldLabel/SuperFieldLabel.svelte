<script>
  export let labelPos;
  export let labelWidth;
  export let label;
  export let helpText;
  export let error;
  export let fieldState;

  let showHelp;
  $: width = labelPos == "left" ? (labelWidth ? labelWidth : "5rem") : "auto";
  $: error = fieldState?.error;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if labelPos}
  <div
    class="superlabel"
    class:notForm={!fieldState}
    class:left={labelPos == "left"}
    class:error
    style:--label-width={width}
  >
    <div
      class="label"
      on:mouseenter={() => (showHelp = true)}
      on:mouseleave={() => (showHelp = false)}
    >
      {#if showHelp && helpText}
        {helpText}
      {:else}
        {label}
      {/if}
    </div>
    {#if error}
      <div class="error-message">
        {error}
      </div>
    {/if}
  </div>
{/if}

<style>
  .superlabel {
    flex: 0 0 auto;
    width: var(--label-width);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.65rem;
    color: var(--spectrum-global-color-gray-700);
    padding-left: 2px;
    gap: 1rem;
    transition: 130ms;

    &.notForm {
      font-size: 14px;
      padding-left: unset;
      padding-bottom: 4px;
    }

    &.left {
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      line-height: 1rem;
      gap: 0px;

      & > .label {
        width: var(--label-width);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    & > .label {
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    & > .error-message {
      color: var(--spectrum-global-color-red-400);
      font-size: 11px;
    }
  }
</style>
