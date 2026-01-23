<script>
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  import fsm from "svelte-fsm";
  import {
    Masked,
    InputMask,
    createMask,
    MaskedPattern,
    MaskedRegExp,
    MaskedNumber,
    MaskedDate,
    MaskedEnum,
    MaskedRange,
    MaskedDynamic,
  } from "imask";

  // Register mask classes with Masked.overloads to ensure they're available for createMask
  // This is required for imask 6.x to properly handle pattern-based masks
  if (MaskedPattern && Masked.overloads) {
    // Ensure MaskedPattern is available as an overload
    if (!Masked.overloads.find((o) => o.mask === MaskedPattern)) {
      Masked.overloads.unshift({ mask: MaskedPattern });
    }
  }

  const dispatch = createEventDispatcher();

  export let value;
  export let cellOptions = {
    role: "formInput",
    initialState: "Editing",
    debounce: 250,
    placeholder: "",
  };
  export let autofocus;
  export let mask = ""; // IMask compatible mask pattern, e.g., "00/00/0000"

  let timer;
  let originalValue;
  let lastEdit;
  let localValue = value;
  let isDirty = false;
  let isComplete = false;
  let inputMask;
  let inputElement;

  function createMaskInstance(maskPattern) {
    if (!maskPattern) return null;
    try {
      // For imask 6.x, explicitly create a MaskedPattern instance
      // This avoids the "Masked class is not found" error by directly instantiating
      const mask = new MaskedPattern({
        mask: maskPattern,
        lazy: false,
        placeholderChar: "_",
      });
      return mask;
    } catch (patternError) {
      try {
        // Fallback: try as a regex pattern
        const mask = new MaskedRegExp({
          mask: new RegExp(maskPattern),
          lazy: false,
        });
        return mask;
      } catch (regexError) {
        try {
          // Last fallback: use generic createMask
          return createMask({
            mask: maskPattern,
            lazy: false,
          });
        } catch (createError) {
          console.error(
            "Failed to create mask - pattern:",
            maskPattern,
            "errors:",
            {
              patternError: patternError?.message,
              regexError: regexError?.message,
              createError: createError?.message,
            },
          );
          return null;
        }
      }
    }
  }

  function applyMask(rawValue) {
    if (!mask || !rawValue) return rawValue;
    const tempMask = createMaskInstance(mask);
    if (!tempMask) return rawValue;
    tempMask.unmaskedValue = rawValue;
    return tempMask.value;
  }

  function updateIsComplete() {
    if (!mask) {
      isComplete = false;
      return;
    }

    // Null is considered incomplete (empty input)
    if (!localValue) {
      isComplete = false;
      return;
    }

    const tempMask = createMaskInstance(mask);
    if (!tempMask) {
      isComplete = false;
      return;
    }
    tempMask.resolve(localValue);
    isComplete = tempMask.isComplete;
  }

  export let cellState = fsm(cellOptions?.initialState ?? "View", {
    "*": {
      reset(newValue) {
        localValue = value;
        updateIsComplete();
        if (inputMask) {
          inputMask.unmaskedValue = localValue || "";
        }
        if (!mask && inputElement) {
          inputElement.value = localValue || "";
        }
      },
    },
    View: {
      _enter() {
        localValue = value;
        updateIsComplete();
      },
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) return "Editing";
      },
    },
    Editing: {
      _enter() {
        originalValue = value;
        localValue = value;
        isDirty = false;
        updateIsComplete();
        dispatch("enteredit");
        // Sync IMask if initialized
        if (inputMask) {
          inputMask.unmaskedValue = localValue || "";
        }
        // Set input value for no mask case
        if (!mask && inputElement) {
          inputElement.value = localValue || "";
        }
      },
      _exit() {
        originalValue = undefined;
        dispatch("exitedit");
        dispatch("focusout");
      },
      clear() {
        localValue = null;
        updateIsComplete();
        isDirty = originalValue !== localValue;
        if (inputElement) {
          inputElement.value = localValue;
        }
      },
      focusout(e) {
        this.submit();
      },
      submit() {
        if (isDirty) {
          if (mask && localValue && !isComplete) {
            // If mask is defined but input is incomplete, do not submit
            localValue = originalValue;
            return "View";
          }
          dispatch("change", localValue);
        }
        return "View";
      },
      cancel() {
        localValue = originalValue;
        updateIsComplete();
        isDirty = false;
        dispatch("cancel");
        if (inputMask) {
          inputMask.unmaskedValue = localValue;
        }
        if (!mask && inputElement) {
          inputElement.value = localValue;
        }
        return "View";
      },
      handleKeyboard(e) {
        if (!e) return;

        isDirty = originalValue !== localValue;

        // When complete, only allow navigation and deletion keys
        const allowedKeysWhenComplete = [
          "Backspace",
          "Delete",
          "Enter",
          "Escape",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
        ];
        if (
          isComplete &&
          !allowedKeysWhenComplete.includes(e.key) &&
          e.key.length === 1
        ) {
          e.preventDefault();
          return;
        }

        if (e.key == "Enter") this.submit();
        if (e.key == "Escape") this.cancel();

        // For input validation, check if typed key is valid for mask
        if (e.key.length === 1 && mask) {
          // Check if key matches mask pattern (e.g., for "00000", only digits)
          const tempMask = createMaskInstance(mask);
          if (tempMask) {
            const currentLength = (localValue || "").length;
            // Get the expected pattern for this position
            // For simplicity, if mask contains only digits or specific chars, check if key matches
            const placeholder =
              tempMask.blocks?.[0]?.placeholder ||
              (tempMask.mask?.includes("0") ? "0" : null);
            if (placeholder === "0" && !/\d/.test(e.key)) {
              e.preventDefault();
              return;
            }
          }
        }
      },
    },
  });

  $: inEdit = $cellState == "Editing";
  $: isDirty = originalValue !== localValue;
  $: placeholder = cellOptions?.placeholder ? cellOptions.placeholder : mask;
  $: error = cellOptions?.error;
  $: icon = error ? "ph ph-warning" : cellOptions?.icon;
  $: cellState.reset(value);
  $: displayValue = inEdit ? localValue : applyMask(value);

  const focus = (node) => {
    node?.focus();
  };

  onMount(() => {
    if (autofocus)
      setTimeout(() => {
        cellState.focus();
      }, 50);
  });

  onDestroy(() => {
    clearTimeout(timer);
    cellState.reset();
  });

  // Setup IMask for the input to format as you type
  function initIMask(node, maskPattern) {
    if (!maskPattern) {
      // When no mask, bind input value directly to localValue
      const handleInput = (e) => {
        localValue = node.value;
        lastEdit = new Date();
      };

      node.addEventListener("input", handleInput);
      // Set initial value
      node.value = localValue || "";

      return {
        destroy() {
          node.removeEventListener("input", handleInput);
        },
      };
    }

    try {
      // Try to create mask instance using MaskedPattern first
      const maskInstance = createMaskInstance(maskPattern);
      if (maskInstance) {
        inputMask = new InputMask(node, { mask: maskPattern });
      } else {
        throw new Error("Failed to create mask instance");
      }

      inputMask.unmaskedValue = localValue || "";

      inputMask.on("accept", () => {
        localValue = inputMask.unmaskedValue;
        updateIsComplete();
        lastEdit = new Date();
      });

      inputMask.on("complete", () => {
        isComplete = true;
      });
    } catch (e) {
      console.error("Error initializing IMask:", e);
      // Fallback to plain input without masking
      const handleInput = (e) => {
        localValue = node.value;
        lastEdit = new Date();
      };
      node.addEventListener("input", handleInput);
      node.value = localValue || "";
      return {
        destroy() {
          node.removeEventListener("input", handleInput);
        },
      };
    }

    return {
      destroy() {
        if (inputMask) inputMask.destroy();
      },
    };
  }

  $: console.log(value, localValue, isComplete);
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="superCell"
  class:inEdit
  class:isDirty={isDirty && cellOptions.showDirty}
  class:focused={inEdit}
  class:inline={cellOptions.role == "inlineInput"}
  class:tableCell={cellOptions.role == "tableCell"}
  class:formInput={cellOptions.role == "formInput"}
  class:disabled={cellOptions.disabled}
  class:readonly={cellOptions.readonly}
  class:error={cellOptions.error || (localValue && mask && !isComplete)}
  class:complete={isComplete}
  style:color={cellOptions.color}
  style:background={$cellState == "Editing" && cellOptions.role != "inline"
    ? "var(--spectrum-global-color-gray-50)"
    : cellOptions.background}
  style:font-weight={cellOptions.fontWeight}
>
  {#if icon}
    <i class={icon + " field-icon"} class:with-error={error}></i>
  {/if}

  {#if inEdit}
    <input
      bind:this={inputElement}
      tabindex="0"
      class="editor"
      class:with-icon={cellOptions.icon}
      {placeholder}
      style:color={!isComplete
        ? "var(--spectrum-global-color-gray-700)"
        : cellOptions.color}
      style:text-align={cellOptions.align == "center"
        ? "center"
        : cellOptions.align == "flex-end"
          ? "right"
          : "left"}
      style:padding-right={cellOptions.align != "flex-start"
        ? "2rem"
        : "0.75rem"}
      on:focusout={cellState.focusout}
      on:keydown={cellState.handleKeyboard}
      use:focus
      use:initIMask={mask}
    />
    {#if localValue && cellOptions?.clearIcon !== false}
      <i
        class="ri-close-line clearIcon"
        on:mousedown|self|preventDefault={cellState.clear}
      ></i>
    {/if}
  {:else}
    <div
      class="value"
      tabindex={cellOptions.readonly || cellOptions.disabled ? "-1" : "0"}
      class:with-icon={cellOptions.icon}
      class:placeholder={!value}
      style:justify-content={cellOptions.align}
      on:focusin={cellState.focus}
    >
      <span>
        {displayValue || placeholder}
      </span>
    </div>
  {/if}
</div>
