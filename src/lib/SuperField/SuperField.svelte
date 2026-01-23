<script>
  import Tooltip from "../UI/elements/Tooltip.svelte";

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

  let showTooltip = false;
  let labelElement;
  let tooltipTimer;
  let isLabelTruncated = false;
  let tooltipContent = "";

  const checkIfTruncated = () => {
    return labelElement && labelElement.scrollWidth > labelElement.offsetWidth;
  };

  const buildTooltipContent = () => {
    const parts = [];
    if (checkIfTruncated()) {
      parts.push(label || field);
    }

    if (helpText) {
      parts.push(helpText);
    }

    return parts.join(" - ");
  };

  const showHelpTooltip = () => {
    if (!helpText && !isLabelTruncated) return;
    if (tooltipTimer) clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(() => {
      tooltipContent = buildTooltipContent();
      showTooltip = true;
    }, 500);
  };

  const hideHelpTooltip = () => {
    if (tooltipTimer) {
      clearTimeout(tooltipTimer);
      tooltipTimer = null;
    }
    showTooltip = false;
  };

  $: width = labelPos == "left" ? (labelWidth ? labelWidth : "5rem") : "auto";
  $: isLabelTruncated = checkIfTruncated(labelElement);
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
        bind:this={labelElement}
        class="label"
        class:has-interaction={helpText || isLabelTruncated}
        on:mouseenter={showHelpTooltip}
        on:mouseleave={hideHelpTooltip}
      >
        {label || field}
      </div>
      {#if (helpText || checkIfTruncated()) && showTooltip}
        <Tooltip
          anchor={labelElement}
          content={tooltipContent}
          show={showTooltip}
          align="top"
        />
      {/if}
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
    min-width: 80px;
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

      &.has-interaction {
        cursor: help;
      }
    }

    & > .error-message {
      color: var(--spectrum-global-color-red-400);
      font-size: 11px;
    }
  }
</style>
