<script lang="ts">
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  interface TextboxProps {
    value?: string | number;
    disabled?: boolean;
    copyLabel?: string;
    copiedLabel?: string;
    title?: string;
    wrap?: boolean;
    monospace?: boolean;
    oncopy?: (detail: { value: string }) => void;
  }

  let {
    value = "",
    disabled = false,
    copyLabel = "Copy to clipboard",
    copiedLabel = "Copied !",
    title,
    wrap = false,
    monospace = true,
    oncopy,
  }: TextboxProps = $props();

  let justCopied = $state(false);
  let copyTimeout: ReturnType<typeof setTimeout> | undefined;

  let stringValue = $derived(String(value ?? "").trim());

  let displayValue = $derived(
    justCopied && copiedLabel?.trim() ? copiedLabel : stringValue || "",
  );

  function copyToClipboard() {
    if (disabled || !stringValue || justCopied) return;

    navigator.clipboard
      .writeText(stringValue)
      .then(() => {
        justCopied = true;
        const detail = { value: stringValue };

        dispatch("copy", detail);
        oncopy?.(detail);

        if (copyTimeout) clearTimeout(copyTimeout);
        copyTimeout = setTimeout(() => {
          justCopied = false;
          copyTimeout = undefined;
        }, 800);
      })
      .catch((err) => {
        console.error("Failed to copy to clipboard:", err);
      });
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
  role="button"
  tabindex={disabled ? -1 : 0}
  title={justCopied ? "" : (title ?? (stringValue ? copyLabel : ""))}
  on:click={copyToClipboard}
  on:keydown={handleKeydown}
>
  <span class="textbox-text" class:wrap>
    {displayValue}
  </span>

  {#key justCopied}
    {#if justCopied}
      <i class="ph ph-check copy-icon" aria-hidden="true"></i>
    {:else}
      <i class="ph ph-copy copy-icon" aria-hidden="true"></i>
    {/if}
  {/key}
</span>

<style>
  .textbox.value {
    color: var(--spectrum-global-color-gray-700);
    border: 1px solid var(--spectrum-global-color-gray-300);
    border-radius: 0.25rem;
    padding: 0.5rem 0.75rem;
    background: rgb(from var(--spectrum-global-color-gray-50) r g b / 0.5);
    font-family: monospace;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .textbox.value:not(.monospace) {
    font-family: var(
      --spectrum-global-font-family,
      system-ui,
      -apple-system,
      sans-serif
    );
    font-size: 13px;
  }

  .textbox.value.copyable {
    cursor: pointer;
    transition:
      background-color 0.1s ease,
      border-color 0.1s ease;
    min-width: 0;
    justify-content: space-between;
  }

  .textbox.value.copyable:hover:not(.disabled) {
    background-color: var(--spectrum-global-color-gray-100);
  }

  .textbox.value.copyable:focus:not(.disabled) {
    outline: 1px solid var(--spectrum-global-color-gray-500);
    background-color: var(--spectrum-global-color-gray-100);
    outline-offset: 1px;
  }

  .textbox.value.copyable.copied {
    border-color: var(--spectrum-global-color-gray-500);
    background-color: var(--spectrum-global-color-gray-100);
    color: var(--spectrum-global-color-gray-600);
    font-weight: 600;
  }

  .textbox.value.copyable.disabled {
    cursor: not-allowed;
    opacity: 0.6;
    pointer-events: none;
  }

  .copy-icon {
    font-size: 16px;
  }

  .textbox.value .copy-icon {
    opacity: 0;
    transition: opacity 0.15s ease;
    flex-shrink: 0;
    color: var(--spectrum-global-color-gray-600);
    display: flex;
    align-items: center;
  }

  .textbox.value.copyable:hover:not(.disabled) .copy-icon {
    opacity: 0.65;
  }

  .textbox.value.copyable:focus:not(.disabled) .copy-icon {
    opacity: 0.65;
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
