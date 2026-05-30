<script lang="ts">
  interface TextboxProps {
    value?: string | number;
    icon?: string;
    align?: "left" | "center" | "right";
    disabled?: boolean;
    copyIcon?: "onhover" | "always";
    copyLabel?: string;
    copiedLabel?: string;
    wrap?: boolean;
    monospace?: boolean;
    oncopy?: (detail: { value: string }) => void;
  }

  let {
    value = "",
    icon,
    align = "left",
    disabled = false,
    copyIcon = "always",
    copyLabel = "Copy to clipboard",
    copiedLabel = "Copied !",
    wrap = false,
    monospace = false,
    oncopy,
  }: TextboxProps = $props();

  let justCopied = $state(false);
  let copyTimeout: ReturnType<typeof setTimeout> | undefined;

  let stringValue = $derived(String(value ?? "").trim());
  let effectiveIcon = $derived(icon ? `ph ph-${icon}` : null);
  let actionIcon = $derived(justCopied ? "ph ph-check" : "ph ph-copy");

  function copyToClipboard(e: MouseEvent) {
    if (disabled || !stringValue || justCopied) return;

    let selectedText = window.getSelection()?.toString() || "";

    if (!oncopy) {
      navigator.clipboard
        .writeText(selectedText || stringValue)
        .then(() => {
          justCopied = true;

          if (copyTimeout) clearTimeout(copyTimeout);
          copyTimeout = setTimeout(() => {
            justCopied = false;
            copyTimeout = undefined;
          }, 400);
        })
        .catch((err) => {
          console.error("Failed to copy to clipboard:", err);
        });
    } else {
      oncopy({ value: stringValue });
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (disabled) return;
    if ((e.key === "Enter" || e.key === " ") && !justCopied) {
      e.preventDefault();
      copyToClipboard();
    }
  }

  $effect(() => {
    // Cleanup any pending timeout when the component is destroyed
    return () => {
      if (copyTimeout) clearTimeout(copyTimeout);
    };
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore event_directive_deprecated -->
<span
  class="textbox value copyable"
  class:copied={justCopied}
  class:disabled
  class:monospace
  class:icon-on-hover={copyIcon === "onhover"}
  class:wrap
  role="button"
  tabindex={disabled ? -1 : 0}
  title={copyLabel}
  on:click={copyToClipboard}
  on:keydown={handleKeydown}
>
  {#if effectiveIcon}
    <i class={effectiveIcon + " textbox-icon"} aria-hidden="true"></i>
  {/if}

  <span class="textbox-text" class:wrap style="text-align: {align}">
    {stringValue}
  </span>

  <i
    class={actionIcon}
    class:copied={justCopied}
    class:copy-icon={true}
    aria-hidden="true"
  ></i>
</span>

<style>
  .textbox.value {
    flex: 1 0 100%;
    color: var(--spectrum-global-color-gray-800);
    border: 1px solid var(--spectrum-global-color-gray-200);
    border-radius: 0.25rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    background: rgb(from var(--spectrum-global-color-gray-50) r g b / 0.75);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 2rem;
  }

  .textbox-icon {
    margin-left: -0.25rem;
    color: var(--spectrum-global-color-gray-600);
  }
  .textbox.value.monospace {
    font-family: var(--spectrum-global-font-family-monospace);
  }

  .textbox.value.copyable {
    cursor: pointer;
    transition:
      background-color 0.1s ease,
      border-color 0.1s ease;
    min-width: 0;
    justify-content: space-between;
  }

  .textbox.value.copyable:hover:not(.disabled):not(.copied) {
    background-color: var(--spectrum-global-color-gray-100);
    border-color: var(--spectrum-global-color-gray-300);
  }

  .textbox:focus:not(.disabled) {
    outline: none;
    background-color: var(--spectrum-global-color-gray-100);
  }

  .textbox.value.copyable.copied {
    border-color: var(--spectrum-global-color-gray-400) !important;
    background-color: var(--spectrum-global-color-gray-75) !important;
    color: var(--spectrum-global-color-gray-600) !important;
  }

  .textbox.value.copyable.disabled {
    cursor: not-allowed;
    opacity: 0.6;
    pointer-events: none;
  }

  .copy-icon {
    opacity: 0;
    font-size: 15px;
    transition: color 0.15s ease;
  }

  .copy-icon.copied {
    color: var(--spectrum-global-color-green-700) !important;
  }

  .textbox.value .copy-icon {
    opacity: 0.45;
    transition: opacity 0.15s ease;
    flex-shrink: 0;
    color: var(--spectrum-global-color-gray-600);
    display: flex;
    align-items: center;
    margin-left: 0.5rem;
  }
  .textbox.value.icon-on-hover .copy-icon {
    opacity: 0;
  }

  .textbox.value.copyable:hover:not(.disabled) .copy-icon {
    opacity: 0.85;
  }

  .textbox.value.copyable:focus:not(.disabled) .copy-icon {
    opacity: 0.85;
  }

  .textbox.value.copyable:hover:not(.disabled) .copy-icon:hover {
    opacity: 1;
  }

  .textbox-text {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Ensure the icon never shrinks and always has space when text is truncated */
  .textbox.value .copy-icon {
    flex-shrink: 0;
  }

  .textbox-text.wrap {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
    word-break: break-word;
  }
</style>
