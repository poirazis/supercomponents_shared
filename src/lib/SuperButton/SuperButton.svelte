<script>
  import { onDestroy, onMount } from "svelte";
  import Tooltip from "../UI/elements/Tooltip.svelte";

  export let size = "M";
  export let menuItem = false;
  export let menuAlign = "right";
  export let icon = undefined;
  export let iconAfterText = undefined;
  export let iconColor = undefined;
  export let text = "";
  export let quiet = undefined;
  export let selected = undefined;
  export let disabled = undefined;
  export let onClick = undefined;
  export let buttonClass = "actionButton";
  export let type = "primary";
  export let tooltip;

  // Visibility Conditions
  export const conditions = []; // Array of condition objects {field, operator, value}

  export let actionsMode = "normal";
  export let condition = undefined; // For backward compatibility
  export let loopSource = undefined;
  export let loopDelay = 0;
  export let loopEvent = undefined;
  export let timerDuration = 60;

  export let fullWidth = undefined;
  export let iconOnly = undefined;

  // Events
  export let onTimer = undefined;
  export let onLoopStart = undefined;
  export let onLoopEnd = undefined;
  export let onTrueCondition = undefined;
  export let onFalseCondition = undefined;

  $: loop = safeParse(loopSource);
  $: icon_class = working
    ? "ph ph-spinner-gap ph-spin"
    : icon && !icon.startsWith("ri-")
      ? "ph ph-" + icon
      : icon
        ? icon
        : undefined;

  let working = false;
  let ui_timer = undefined;
  let elapsed = 0;

  let buttonElement;
  let tooltipShow = false;
  let tooltipTimer;

  const showTooltip = () => {
    if (disabled) return;
    if (tooltipTimer) clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(() => {
      tooltipShow = true;
    }, 750);
  };

  const hideTooltip = () => {
    if (tooltipTimer) {
      clearTimeout(tooltipTimer);
      tooltipTimer = null;
    }
    tooltipShow = false;
  };

  async function handleClick(e) {
    if (disabled || working || actionsMode == "timer") return;
    working = true;
    if (actionsMode == "loop") {
      if (onLoopStart) await onLoopStart({ iterations: loopSource?.length });
      if (Array.isArray(loop) && loopEvent) {
        for (var i = 0; i < loop.length; i++) {
          await loopEvent({ idx: i, value: loop[i] });
          await sleep(loopDelay);
        }
      }
      if (onLoopEnd) await onLoopEnd();
    } else if (actionsMode == "conditional") {
      if (condition == true) await onTrueCondition?.();
      else await onFalseCondition?.();
    } else if (onClick) {
      await onClick?.(e);
    }
    working = false;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const safeParse = (input) => {
    if (!input) return undefined;

    let res = [];
    try {
      res = JSON.parse(input);
      if (!Array.isArray(res)) res = [input];
    } catch (ex) {
      res = input?.split(",") ?? [input];
    }

    return res;
  };

  onMount(() => {
    if (actionsMode == "timer") {
      text = timerDuration;
      ui_timer = setInterval(() => {
        elapsed += 1;
        if (elapsed == timerDuration) {
          elapsed = 0;
          onTimer?.();
        }
        text = timerDuration - elapsed;
      }, 1000);
    }
  });

  onDestroy(() => {
    if (ui_timer) clearInterval(ui_timer);
    if (tooltipTimer) clearTimeout(tooltipTimer);
  });
</script>

<button
  bind:this={buttonElement}
  on:click={handleClick}
  on:mouseenter={showTooltip}
  on:mouseleave={hideTooltip}
  tabindex={disabled ? -1 : 0}
  class:super-button={true}
  class:xsmall={size == "XS"}
  class:small={size == "S"}
  class:large={size == "L"}
  class:is-selected={selected}
  class:cta={type == "cta" && !disabled}
  class:warning={type == "warning"}
  class:primary={type == "primary" && !menuItem}
  class:secondary={type == "secondary"}
  class:overBackground={type == "overBackground"}
  class:ink={type == "ink"}
  class:menu={type == "menu"}
  class:quiet
  class:icon={icon_class}
  class:iconOnly={iconOnly || !text}
  class:full-width={fullWidth}
  class:menu-item={menuItem}
  class:menu-item-right={menuItem && menuAlign == "right"}
  class={buttonClass == "actionButton"
    ? "spectrum-ActionButton spectrum-ActionButton--size" + size
    : "spectrum-Button spectrum-Button--size" + size}
  class:disabled
  class:working
>
  <i
    class={icon_class}
    style:order={iconAfterText ? 1 : 0}
    style:color={disabled ? "var(--spectrum-global-color-gray-400)" : iconColor}
  ></i>

  <span>{actionsMode !== "timer" ? text : elapsed + "s"}</span>
</button>

{#if tooltip}
  <Tooltip anchor={buttonElement} content={tooltip} show={tooltipShow} />
{/if}

<style>
  .super-button {
    border: 1px solid var(--spectrum-global-color-gray-400);
    background-color: var(--spectrum-global-color-gray-75);
    color: var(--spectrum-global-color-gray-800);
    display: flex;
    align-items: center;
    font-weight: 600;
    min-width: 5rem;
    padding: 0rem 0.75rem;
    gap: 0.5rem;
    height: 2rem;

    &.xsmall {
      height: 1.5rem;
      font-size: 10px;
      padding: 0rem 0.5rem;
      min-width: unset;
    }

    &.small {
      min-width: 4rem;
      padding: 0rem 0.5rem;
      gap: 0.5rem;
      height: 1.85rem;

      &.ink {
        height: 1.5rem;
      }
    }

    &.large {
      height: 2.25rem;
    }

    & > span {
      white-space: nowrap;
    }

    &.icon {
      & > i {
        display: block;
      }
    }

    &.iconOnly {
      min-width: unset;
      padding: 0rem 0.5rem;
      border-radius: 0.25rem;
      aspect-ratio: 1 / 1;
      & > span {
        display: none;
      }
    }
    & > i {
      display: none;
      opacity: 0.9;
    }
  }

  .full-width {
    width: 100%;
  }
  .menu-item {
    width: 100%;
    justify-content: flex-start;
    border: unset !important;
    border-radius: 0;
    background-color: transparent !important;
    font-weight: 500;

    &:hover {
      background-color: var(--spectrum-global-color-gray-200) !important;
      color: var(--spectrum-global-color-gray-900);
    }
  }
  .menu-item-right {
    width: 100%;
    justify-content: flex-end !important;
  }
  i {
    color: var(--iconColor);
    transition: all 230ms ease-in-out;
  }

  .cta {
    background-color: var(--spectrum-global-color-blue-400);
    border: 1px solid transparent;
    color: white;

    &.quiet {
      background-color: transparent;
      border: 1px solid var(--spectrum-global-color-blue-100);
      color: var(--spectrum-global-color-blue-700);
      &:hover {
        background-color: var(--spectrum-global-color-blue-400);
        color: white;
      }

      &:focus {
        border: 1px dashed var(--spectrum-global-color-blue-700);
        font-weight: bolder;
      }
    }
    &:hover {
      background-color: var(--spectrum-global-color-blue-600);
      border-color: var(--spectrum-global-color-blue-600);
    }

    &:active {
      border: 1px solid var(--spectrum-global-color-blue-700);
    }
  }
  .ink {
    background-color: var(--spectrum-global-color-gray-700);
    border: 1px solid var(--spectrum-global-color-gray-700);
    color: var(--spectrum-global-color-gray-50);
    font-weight: 700;
    opacity: 0.9;
    max-height: 1.35rem;

    &.quiet {
      border-color: transparent !important;
      background-color: transparent;
      color: var(--spectrum-global-color-gray-800);
      &:hover,
      &:focus {
        color: var(--spectrum-global-color-gray-50);
        background-color: var(--spectrum-global-color-gray-800);
      }
    }
    &:hover,
    &:focus {
      background-color: var(--spectrum-global-color-gray-800);
    }

    &:active {
      border: 1px solid var(--spectrum-global-color-blue-700);
    }
  }
  .primary {
    &:hover,
    &:focus {
      border: 1px solid var(--spectrum-global-color-gray-500);
      color: var(--spectrum-global-color-gray-900);
    }
    &:active {
      background-color: var(--spectrum-global-color-gray-100);
      border: 1px solid var(--spectrum-global-color-gray-600);
    }

    &.quiet {
      border-color: transparent;
      background-color: transparent;
      &:hover {
        background-color: var(--spectrum-global-color-gray-200);
        color: var(--spectrum-global-color-gray-900);
      }
    }
  }

  .secondary {
    background-color: var(--spectrum-global-color-gray-200);
    border-color: transparent;
    color: var(--spectrum-global-color-gray-700);
    font-weight: 500;

    &.quiet {
      border-color: transparent;
      background-color: transparent;

      &:hover {
        background-color: transparent;
        border-color: var(--spectrum-global-color-gray-400);
      }
    }

    &:hover {
      background-color: var(--spectrum-global-color-gray-300);
      color: var(--spectrum-global-color-gray-900);
    }
    &:focus {
      border: 1px dashed var(--spectrum-global-color-gray-400);
      color: var(--spectrum-global-color-gray-900);
    }
  }

  .warning {
    border: 1px solid transparent;
    background-color: var(--spectrum-global-color-red-400);
    color: white;
    &.quiet {
      border-color: transparent;
      background-color: transparent;
      color: var(--spectrum-global-color-red-400);

      &:hover {
        border-color: var(--spectrum-global-color-red-400);
        font-weight: bolder;
      }

      &:focus {
        border: 1px dashed var(--spectrum-global-color-red-700);
        font-weight: bolder;
      }
    }
    &:hover:not(.quiet) {
      background-color: var(--spectrum-global-color-red-700);
      font-weight: bolder;
    }
    &:focus {
      border: 1px dashed var(--spectrum-global-color-red-700);
      font-weight: bolder;
    }
  }

  .overBackground {
    background-color: transparent;

    &.quiet {
      border: unset;
    }
  }

  .menu {
    border: unset;
    background: transparent;
    padding-right: 0rem;
    color: var(--spectrum-global-color-gray-700);
  }

  .disabled {
    background-color: var(--spectrum-global-color-gray-200) !important;
    color: var(--spectrum-global-color-gray-400) !important;
    cursor: not-allowed;
    border-color: var(--spectrum-global-color-gray-300);
    &.quiet {
      background-color: unset !important;
      border: unset !important;
    }
  }

  .working {
    cursor: progress;
    border: 1px solid var(--spectrum-global-color-gray-300) !important;
    & > span {
      color: var(--spectrum-global-color-gray-600);
    }
    & > i {
      display: block;
      animation: spin 1s linear infinite;
      color: var(--spectrum-global-color-blue-700);
    }
  }
</style>
