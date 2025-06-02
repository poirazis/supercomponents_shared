<script>
  import {
    createEventDispatcher,
    getContext,
    onMount,
    onDestroy,
  } from "svelte";
  import fsm from "svelte-fsm";
  const dispatch = createEventDispatcher();
  const { processStringSync } = getContext("sdk");

  export let value;
  export let formattedValue;
  export let cellOptions = {
    role: "formInput",
    initialState: "Editing",
    debounce: 250,
  };
  export let autofocus;

  let timer;
  let originalValue;

  let editor;
  let lastEdit;
  let localValue = value;

  export let cellState = fsm(cellOptions?.initialState ?? "View", {
    "*": {
      goTo(state) {
        return state;
      },
      reset() {
        localValue = value;
        lastEdit = undefined;
        return "View";
      },
    },
    View: {
      _enter() {
        localValue = value;
      },
      focus() {
        if (!cellOptions.readonly && !cellOptions.disabled) return "Editing";
      },
    },
    Editing: {
      _enter() {
        originalValue = value;
        dispatch("enteredit");
      },
      _exit() {
        originalValue = undefined;
        dispatch("exitedit");
        dispatch("focusout");
      },
      clear() {
        if (cellOptions.debounce) dispatch("change", null);
        lastEdit = new Date();
        localValue = null;
      },
      focusout(e) {
        this.submit();
      },
      submit() {
        if (isDirty) {
          dispatch("change", localValue);
        }
        return "View";
      },
      cancel() {
        value = originalValue;
        dispatch("cancel");
        return "View";
      },
      debounce(e) {
        localValue = e.target.value;
        lastEdit = new Date();
        if (cellOptions?.debounce) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            dispatch("change", localValue);
          }, cellOptions.debounce ?? 0);
        }
      },
      handleKeyboard(e) {
        if (e.key == "Enter") this.submit();
        if (e.key == "Escape") this.cancel();
      },
    },
  });

  $: cellState.reset(value);
  $: inEdit = $cellState == "Editing";
  $: isDirty = lastEdit && originalValue != localValue;
  $: formattedValue =
    !formattedValue && cellOptions?.template
      ? processStringSync(cellOptions.template, {
          value,
        })
      : formattedValue;

  $: placeholder =
    cellOptions.readonly || cellOptions.disabled
      ? ""
      : cellOptions.placeholder || "";

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

  $: if (inEdit)
    console.log(
      "Entering edit mode for cell",
      value,
      localValue,
      originalValue
    );
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
  class:error={cellOptions.error}
  style:color={cellOptions.color}
  style:background={cellOptions.background}
  style:font-weight={cellOptions.fontWeight}
>
  {#if cellOptions.icon}
    <i class={cellOptions.icon + " icon"}></i>
  {/if}

  {#if inEdit}
    <input
      bind:this={editor}
      tabindex="0"
      class="editor"
      class:with-icon={cellOptions.icon}
      class:placeholder={!value && !formattedValue && !localValue}
      value={localValue ?? ""}
      placeholder={cellOptions?.placeholder ?? ""}
      style:text-align={cellOptions.align == "center"
        ? "center"
        : cellOptions.align == "flex-end"
          ? "right"
          : "left"}
      style:padding-right={cellOptions.align != "flex-start"
        ? "2rem"
        : "0.75rem"}
      on:input={cellState.debounce}
      on:focusout={cellState.focusout}
      on:keydown={cellState.handleKeyboard}
      use:focus
    />
    {#if localValue && cellOptions?.clearIcon !== false}
      <i
        class="ri-close-line clearIcon"
        on:mousedown|self|preventDefault={cellState.clear}
      />
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
        {formattedValue || value || placeholder}
      </span>
    </div>
  {/if}
</div>
