<script>
  import { getContext } from "svelte";
  const { processStringSync } = getContext("sdk");

  export let value = null;
  export let formattedValue;
  export let cellOptions = {
    role: "formInput",
  };

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
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="superCell"
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
    <i class="{cellOptions.icon} icon"></i>
  {/if}

  <div
    class="value"
    class:with-icon={cellOptions.icon}
    class:placeholder={!value && !formattedValue}
    style:justify-content={cellOptions.align}
    style:text-align={cellOptions.align == "flex-start"
      ? "left"
      : cellOptions.align == "center"
        ? "center"
        : "right"}
  >
    {formattedValue || value || placeholder}
  </div>
</div>
