<script>
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";
  import { createEventDispatcher } from "svelte";

  export let value;
  export let size = "M";
  export let spectrumTheme;
  export let offset;
  export let align;
  export let cellState;
  export let cellOptions = {};

  let open = false;
  let preview;
  let inEdit = false;

  $: customValue = getCustomValue(value);
  $: checkColor = getCheckColor(value);
  $: allowCustom = cellOptions?.allowCustom;
  $: circle = cellOptions?.swatch === "circle";
  $: readonly = cellOptions?.readonly || cellOptions?.disabled;
  $: customColors = cellOptions?.customColors || [];
  $: showTheme = cellOptions?.themeColors !== false;
  $: showStatic = cellOptions?.staticColors !== false;
  $: categories = generateCategories(showTheme, showStatic);
  $: customCategory = generateCustomCategory(customColors);

  const dispatch = createEventDispatcher();

  function generateCategories(showTheme, showStatic) {
    return [
      ...(showTheme
        ? [
            {
              label: "Theme colors",
              colors: [
                "red-100",
                "orange-100",
                "yellow-100",
                "green-100",
                "seafoam-100",
                "blue-100",
                "indigo-100",
                "magenta-100",
                "red-400",
                "orange-400",
                "yellow-400",
                "green-400",
                "seafoam-400",
                "blue-400",
                "indigo-400",
                "magenta-400",
                "red-500",
                "orange-500",
                "yellow-500",
                "green-500",
                "seafoam-500",
                "blue-500",
                "indigo-500",
                "magenta-500",
                "red-600",
                "orange-600",
                "yellow-600",
                "green-600",
                "seafoam-600",
                "blue-600",
                "indigo-600",
                "magenta-600",
                "red-700",
                "orange-700",
                "yellow-700",
                "green-700",
                "seafoam-700",
                "blue-700",
                "indigo-700",
                "magenta-700",
                "gray-50",
                "gray-75",
                "gray-100",
                "gray-200",
                "gray-300",
                "gray-400",
                "gray-500",
                "gray-600",
                "gray-700",
                "gray-800",
                "gray-900",
              ],
            },
          ]
        : []),
      ...(showStatic
        ? [
            {
              label: "Static colors",
              colors: [
                "static-red-400",
                "static-orange-400",
                "static-yellow-400",
                "static-green-400",
                "static-seafoam-400",
                "static-blue-400",
                "static-indigo-400",
                "static-magenta-400",
                "static-red-800",
                "static-orange-800",
                "static-yellow-800",
                "static-green-800",
                "static-seafoam-800",
                "static-blue-800",
                "static-indigo-800",
                "static-magenta-800",
                "static-red-1200",
                "static-orange-1200",
                "static-yellow-1200",
                "static-green-1200",
                "static-seafoam-1200",
                "static-blue-1200",
                "static-indigo-1200",
                "static-magenta-1200",
                "static-white",
                "static-black",
              ],
            },
          ]
        : []),
    ];
  }

  function generateCustomCategory(customColors) {
    return {
      label: "Palette",
      colors: customColors.map((color) => color.value),
      customLabels: customColors.reduce((acc, color) => {
        acc[color.value] = color.label;
        return acc;
      }, {}),
    };
  }

  const onChange = (newValue) => {
    const selectedValue = newValue === value ? null : newValue;
    value = selectedValue;
    dispatch("change", selectedValue);
    open = false;
    inEdit = false;
  };

  const getCustomValue = (value) => {
    if (!value) return value;
    const isThemeOrStatic = categories?.some((category) =>
      category.colors.some(
        (color) => `var(--spectrum-global-color-${color})` === value
      )
    );
    return isThemeOrStatic ? null : value;
  };

  const prettyPrint = (color, category) => {
    if (category.customLabels && category.customLabels[color]) {
      return category.customLabels[color];
    }
    return color.split("-").join(" ");
  };

  const getCheckColor = (value) => {
    if (!value) return "var(--spectrum-global-color-static-gray-900)";
    if (value.includes("-gray-")) {
      return /^.*(gray-(50|75|100|200|300|400|500))\)$/.test(value)
        ? "var(--spectrum-global-color-gray-900)"
        : "var(--spectrum-global-color-gray-50)";
    }
    if (value.includes("-100")) {
      return "var(--spectrum-global-color-gray-900)";
    }
    if (value.includes("static-black")) {
      return "var(--spectrum-global-color-static-gray-50)";
    }
    return "var(--spectrum-global-color-static-gray-900)";
  };

  const handleKeydown = (event, color, isCustom) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onChange(isCustom ? color : `var(--spectrum-global-color-${color})`);
    }
  };
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  bind:this={preview}
  class="preview-swatch size--{size || 'M'}"
  class:circle
  class:readonly
  on:click={!readonly
    ? () => {
        inEdit = true;
        open = !open;
      }
    : null}
  on:keydown={(event) => {
    if (event.key === "Enter" || (event.key === " " && !readonly)) {
      inEdit = true;
      open = !open;
    }
  }}
  role="button"
  tabindex="0"
>
  <div
    class="preview-fill {spectrumTheme || ''}"
    class:circle
    style={value ? `background: ${value};` : ""}
    class:placeholder={!value}
  />
</div>

{#if inEdit}
  <SuperPopover anchor={preview} {open} align="left" {offset}>
    <div class="container">
      {#each categories as category}
        <div class="category">
          <div class="heading">{category.label}</div>
          <div class="colors">
            {#each category.colors as color}
              <div
                on:click={() =>
                  onChange(`var(--spectrum-global-color-${color})`)}
                on:keydown={(event) => handleKeydown(event, color, false)}
                class="color-swatch"
                title={prettyPrint(color, category)}
                role="button"
                tabindex="0"
              >
                <div
                  class="color-fill {spectrumTheme || ''}"
                  style="background: var(--spectrum-global-color-{color});"
                >
                  {#if value === `var(--spectrum-global-color-${color})`}
                    <i class="ri-check-line" style="color: {checkColor};" />
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
      {#if customCategory.colors.length > 0}
        <div class="category">
          <div class="heading">
            <i class="ri-palette-line heading-icon" />
            {customCategory.label}
          </div>
          <div class="colors">
            {#each customCategory.colors as color}
              <div
                on:click={() => onChange(color)}
                on:keydown={(event) => handleKeydown(event, color, true)}
                class="color-swatch"
                title={prettyPrint(color, customCategory)}
                role="button"
                tabindex="0"
              >
                <div
                  class="color-fill {spectrumTheme || ''}"
                  style="background: {color};"
                >
                  {#if value === color}
                    <i class="ri-check-line" style="color: {checkColor};" />
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
      {#if allowCustom}
        <div class="category category--custom">
          <div class="heading">Custom</div>
          <div class="custom">
            <input
              type="text"
              class="custom-input"
              bind:value={customValue}
              on:change={() => {
                if (customValue) onChange(customValue);
              }}
              placeholder="Enter custom color"
            />
            <button class="clear-value" on:click={() => onChange(null)}>
              <i class="ri-close-line" />
            </button>
          </div>
        </div>
      {/if}
    </div>
  </SuperPopover>
{/if}

<style>
  .container {
    position: relative;
    padding: 0.5rem 0.75rem 0.75rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 16px;
    background-color: var(--spectrum-global-color-gray-50);
  }

  /* Preview Swatch Styles */
  /* Spectrum CSS Swatch styles */
  .preview-swatch {
    position: relative;
    transition:
      transform 100ms ease-in-out,
      box-shadow 100ms ease-in-out;
    box-sizing: border-box;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid var(--spectrum-global-color-gray-300);
    background: var(--spectrum-global-color-gray-50);

    &.circle {
      border-radius: 50%;
    }

    &:hover {
      cursor: pointer;
    }
  }

  .preview-fill {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    display: grid;
    place-items: center;
    border-radius: inherit;
    border: 1px solid transparent;
    padding: 4px;

    &.circle {
      border-radius: 50%;
    }
  }

  .preview-fill.placeholder {
    --spectrum-swatch-checkerboard-light: var(--spectrum-global-color-gray-300);

    background-color: var(--spectrum-global-color-gray-50);
    background-image: linear-gradient(
        45deg,
        var(--spectrum-swatch-checkerboard-light) 25%,
        transparent 25%
      ),
      linear-gradient(
        -45deg,
        var(--spectrum-swatch-checkerboard-light) 25%,
        transparent 25%
      ),
      linear-gradient(
        45deg,
        transparent 75%,
        var(--spectrum-swatch-checkerboard-light) 75%
      ),
      linear-gradient(
        -45deg,
        transparent 75%,
        var(--spectrum-swatch-checkerboard-light) 75%
      );
    background-size: 20px 20px;
    background-position:
      0 0,
      0 10px,
      10px -10px,
      -10px 0px;
  }

  /* Size variants */
  .size--XS {
    width: 16px;
    height: 16px;
  }

  .size--S {
    width: 24px;
    height: 24px;
  }

  .size--M {
    width: 32px;
    height: 32px;
  }

  .size--L {
    width: 48px;
    height: 48px;
  }

  /* Color Swatch Styles */
  .colors {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
  }
  .color-swatch {
    height: 16px;
    width: 16px;
    border-radius: 50%;
    position: relative;
  }
  .color-swatch:hover {
    cursor: pointer;
    box-shadow: 0 0 2px 2px var(--spectrum-global-color-gray-300);
  }
  .color-fill {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    display: grid;
    place-items: center;
  }
  .ri-check-line {
    font-size: 12px;
    font-weight: bold;
  }
  .ri-palette-line {
    font-size: 12px;
    margin-right: 4px;
  }
  .heading-icon {
    vertical-align: middle;
  }

  /* Other Styles */
  .heading {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.14px;
    text-transform: uppercase;
    grid-column: 1 / 5;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
  }
  .custom {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 4px;
    justify-content: space-between;
  }
  .category--custom .heading {
    margin-bottom: 4px;
  }
  .custom-input {
    flex: 1;
    padding: 2px 4px;
    border: none;
    border-bottom: 1px solid var(--spectrum-global-color-gray-200);
    border-radius: 2px;
    font-size: 12px;
    height: 20px;
    width: 80px;
    background-color: inherit;
    color: var(--spectrum-global-color-gray-700);
    font-style: italic;
  }
  .custom-input:focus {
    outline: none;
    border-color: var(--spectrum-global-color-blue-500);
  }

  .clear-value {
    background: none;
    border: none;
    color: var(--spectrum-global-color-gray-900);
    cursor: pointer;
    font-size: 13px;
    padding: 0;
    margin: 0;
  }
</style>
