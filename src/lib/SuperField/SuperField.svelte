<script>
  export let labelPos;
  export let multirow;
  export let tall;
  export let label;
  export let field;
  export let helpText;
  export let error;
  export let labelWidth;
  export let height;
  export let maxHeight;

  let showHelp;
  $: width = labelPos == "left" ? (labelWidth ? labelWidth : "5rem") : "auto";
</script>

<div
  class="super-field"
  class:left-label={labelPos == "left"}
  class:multirow
  class:tall
  style:--height={height}
  style:--max-height={maxHeight}
>
  {#if labelPos}
    <div
      class="superlabel"
      class:left={labelPos == "left"}
      class:tall
      class:error
      style:--label-width={width}
    >
      <!-- svelte-ignore missing-declaration -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="label"
        class:showHelp
        on:mouseenter={helpText ? () => (showHelp = true) : null}
        on:mouseleave={helpText ? () => (showHelp = false) : null}
      >
        {#if showHelp && helpText}
          {helpText}
        {:else}
          {label || field}
        {/if}
      </div>
      {#if error}
        <div class="error-message">
          {error}
        </div>
      {/if}
    </div>
  {/if}

  <div class="inline-cells" class:multirow>
    <slot></slot>
  </div>
</div>

<style>
  .super-field {
    min-width: 120px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    overflow: hidden;
    min-height: var(--height);

    &.multirow {
      max-height: var(--height);
    }

    &.left-label {
      flex-direction: row;
      align-items: center;
      gap: 1rem;
    }
    &.tall {
      height: 100%;
      justify-content: stretch;
    }

    &.tall.left-label {
      flex-direction: row;
      align-items: stretch;
    }

    &:focus-within {
      & > .superlabel {
        color: var(--spectrum-global-golor-gray-700);
      }
    }
  }

  .inline-cells {
    flex: auto;
    display: flex;
    align-items: stretch;
    min-height: 2rem;
    overflow: hidden;

    &.multirow {
      flex-direction: column;
      align-items: stretch;
      justify-content: flex;
    }
  }

  .superlabel {
    flex: 0 0 auto;
    width: var(--label-width);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 400;
    line-height: 1.65rem;
    color: var(--spectrum-global-color-gray-700);
    gap: 1rem;
    transition: 130ms;

    &.left {
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      line-height: 1rem;
      gap: 0px;

      &.tall {
        justify-content: flex-start;
        padding-top: 0.5rem;
      }

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
      font-size: 12px;

      &.showHelp {
        font-style: italic;
      }
    }

    & > .error-message {
      color: var(--spectrum-global-color-red-400);
      font-size: 11px;
    }
  }
</style>
