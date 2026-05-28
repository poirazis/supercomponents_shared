<script>
  import { onDestroy, onMount, getContext } from "svelte";
  import Tooltip from "../UI/elements/Tooltip.svelte";

  const { enrichButtonActions } = getContext("sdk");
  const context = getContext("context");

  export let size = "M";
  export let menuItem = false;
  export let menuAlign = "right";
  export let icon = undefined;
  export let iconAfterText = undefined;
  export let iconColor = undefined;
  export let filledIcon = undefined;
  export let text = "";
  export let quiet = undefined;
  export let selected = undefined;
  export let disabled = undefined;
  export let onClick;
  export let buttonClass = "actionButton";
  export let type = "primary";
  export let tooltip;
  export let confirm = false;
  export let condition = undefined;
  // Visibility Conditions
  export const conditions = []; // Array of condition objects {field, operator, value}

  export let actionsMode = "normal";
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
  export let workingState;

  $: enrichedAction = Array.isArray(onClick)
    ? enrichButtonActions(onClick, $context)
    : onClick;

  $: loop = safeParse(loopSource);
  $: buttonText = confirmMode
    ? "Confirm"
    : text || (actionsMode == "timer" ? timerDuration : "");
  $: icon_class =
    working || workingState
      ? "ph ph-spinner-gap ph-spin"
      : icon && !icon.startsWith("ri-")
        ? "ph ph-" + icon
        : icon
          ? icon
          : actionsMode == "timer"
            ? "ph ph-timer"
            : undefined;

  let working = false;
  let ui_timer = undefined;
  let elapsed = 0;
  let confirmMode = false;

  let buttonElement;
  let tooltipShow = false;
  let tooltipTimer;

  const showTooltip = () => {
    if (disabled || tooltipShow || !tooltip) return;
    if (tooltipTimer) clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(() => {
      tooltipShow = true;
    }, 500);
  };

  const hideTooltip = (e) => {
    if (tooltipTimer) {
      clearTimeout(tooltipTimer);
    }
    tooltipShow = false;
    confirmMode = false;
  };

  async function handleClick(e) {
    if (disabled || actionsMode == "timer") return;

    // Handle confirmation flow
    if (confirm && !confirmMode) {
      confirmMode = true;
      return;
    }

    // Reset confirm mode after executing action
    confirmMode = false;
    working = true;
    tooltipShow = false;
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
    } else if (enrichedAction) {
      await enrichedAction?.(e);
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
  on:click={(e) => {
    handleClick(e);
  }}
  on:mouseenter={showTooltip}
  on:mouseleave={hideTooltip}
  on:blur={() => {
    confirmMode = false;
  }}
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
  class:working={working || workingState}
>
  <i
    class={confirmMode ? "ph ph-check" : icon_class}
    class:ph-fill={filledIcon}
    style:order={iconAfterText ? 1 : 0}
    style:color={disabled ? "var(--spectrum-global-color-gray-400)" : iconColor}
  ></i>

  <span>{buttonText}</span>
</button>

{#if tooltip}
  <Tooltip anchor={buttonElement} content={tooltip} show={tooltipShow} />
{/if}

<style>
  .super-button {
    border: 1px solid var(--spectrum-global-color-gray-400);
    background-color: var(--spectrum-global-color-gray-50);
    color: var(--spectrum-global-color-gray-800);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0rem 1rem;
    min-width: 4rem;
    gap: 0.75rem;
    height: 2rem;
    transition: all 150ms ease-in-out;

    &.spectrum-ActionButton {
      padding: 0rem 0.75rem !important;
      border-radius: 4px !important;
    }
    &.spectrum-ActionButton.xsmall {
      padding: 0rem 0.5rem !important;
      border-radius: 4px !important;
    }
    &.xsmall {
      height: 1.5rem;
      padding: 0rem 0.75rem;
      min-width: unset;
      gap: 0.5rem;
      font-size: 12px;
      border-radius: 1rem;
    }

    &.small {
      min-width: 4rem;
      padding: 0rem 0.75rem;
      gap: 0.5rem;
      height: 1.75rem;
      font-size: 13px;
    }

    &.large {
      height: 2.25rem;
      font-size: 16px;
      padding: 0rem 1.25rem;

      & > i {
        font-size: 18px;
      }
    }

    & > span {
      white-space: nowrap;
      font-weight: 600;
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
    background-color: var(--spectrum-global-color-gray-800);
    border: 1px solid transparent;
    color: var(--spectrum-global-color-gray-50);

    &.quiet {
      border-color: transparent !important;
      background-color: transparent;
      color: var(--spectrum-global-color-gray-800);
      &:hover,
      &:focus {
        color: var(--spectrum-global-color-gray-50);
        background-color: var(--spectrum-global-color-gray-900);
      }
    }
    &:hover,
    &:focus:not(.working) {
      background-color: var(--spectrum-global-color-gray-900);
    }
  }
  .primary {
    &:hover,
    &:focus {
      border: 1px solid var(--spectrum-global-color-gray-500);
      background-color: var(--spectrum-global-color-gray-200);
      color: var(--spectrum-global-color-gray-900);
    }
    &:active {
      background-color: var(--spectrum-global-color-gray-100);
      border: 1px solid var(--spectrum-global-color-gray-500);
    }

    &.quiet {
      border-color: transparent;
      background-color: transparent;
      &:hover {
        background-color: var(--spectrum-global-color-gray-400);
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
      background-color: transparent;

      &:hover {
        background-color: var(--spectrum-global-color-gray-300);
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
        background-color: var(--spectrum-global-color-red-400);
        color: white;
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
    border: 1px solid var(--spectrum-global-color-gray-400) !important;
    background-color: var(--spectrum-global-color-gray-300) !important;
    & > span {
      color: var(--spectrum-global-color-gray-600) !important;
    }
    & > i {
      display: block;
      animation: spin 1s linear infinite;
      color: var(--spectrum-global-color-gray-700) !important;
    }
  }
</style>
