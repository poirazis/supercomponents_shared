<script>
  export let labelPos;
  export let multirow;
  export let label;
  export let field;
  export let helpText;
  export let error;
  export let labelWidth;

  let showHelp;
  $: width = labelPos == "left" ? (labelWidth ? labelWidth : "5rem") : "auto";
</script>

<div class="super-field" class:left-label={labelPos == "left"} class:multirow>
  {#if labelPos}
    <div
      class="superlabel"
      class:left={labelPos == "left"}
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
  <div class="inline-cells">
    <slot></slot>
  </div>
</div>

<style>
  .super-field {
    min-width: 180px;
    width: 100%;
    display: flex;
    align-self: flex-start;
    justify-content: stretch;
    flex-direction: column;

    &.left-label {
      flex-direction: row;
      align-items: center;
      gap: 1rem;
    }
    &.multirow {
      align-items: stretch;

      & > .inline-cells {
        height: unset;
      }

      & > .superlabel {
        align-self: start;

        &.left {
          padding-top: 0.5rem;
        }
      }
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
    justify-content: stretch;
    height: 2rem;
    overflow: hidden;

    &.multirow {
      height: unset;
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
