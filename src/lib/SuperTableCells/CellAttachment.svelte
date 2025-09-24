<script>
  import { createEventDispatcher, getContext } from "svelte";
  import fsm from "svelte-fsm";
  import SuperPopover from "../SuperPopover/SuperPopover.svelte";
  import "./CellCommon.css";

  const dispatch = createEventDispatcher();
  const { API } = getContext("sdk");

  export let value;
  export let cellOptions;
  export let fieldSchema;
  export let tableid;

  let originalValue = value;
  let anchor;
  let picker;
  let open;
  let focusedOptionIdx;
  let fileInput; // Reference to hidden file input

  $: multi = fieldSchema?.type?.includes("single") !== true;
  $: localvalue = value && multi ? value : value ? [value] : [];
  $: inEdit = $cellState == "Editing";
  $: readonly = cellOptions.readonly;
  $: disabled = cellOptions.disabled;
  $: placeholder = cellOptions.placeholder ?? "";

  export let cellState = fsm(cellOptions.initialState ?? "View", {
    "*": {
      goTo(state) {
        return state;
      },
    },
    View: {
      _enter() {
        open = false;
      },
      focus() {
        if (!cellOptions.readonly) return "Editing";
      },
    },
    Hovered: {
      cancel: () => {
        return "View";
      },
    },
    Focused: {
      unfocus() {
        return "View";
      },
    },
    Error: { check: "View" },
    Editing: {
      _enter() {
        originalValue = value;
        dispatch("enteredit");
      },
      _exit() {
        dispatch("exitedit");
      },
      toggle() {
        open = !open;
      },
      focusout(e) {
        if (
          !anchor?.contains(e.relatedTarget) &&
          !picker?.contains(e.relatedTarget)
        ) {
          if (value !== originalValue) {
            dispatch("change", value);
          }
          return "View";
        }
      },
      change(e) {
        if (cellOptions.debounce) dispatch("change", value);
      },
      submit(e) {
        if (!picker.contains(e.relatedTarget)) {
          if (value !== originalValue) {
            dispatch("change", value);
          }
          dispatch("focusout");
          return "View";
        }
      },
      cancel() {
        value = originalValue;
        return "View";
      },
    },
  });

  // Process files using FormData, consistent with stock implementation
  const processFiles = async (fileList) => {
    let data = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      data.append("file", fileList[i]);
    }
    try {
      // @ts-ignore - API is a global in Budibase
      let res = await API.uploadAttachment(tableid, data);
      localvalue = [...localvalue, ...res];
      dispatch("change", [...localvalue]);
      return res;
    } catch (error) {
      console.error("Upload failed:", error);
      return [];
    }
  };

  // Handle file selection and upload
  function handleFileSelect(event) {
    const target = event.target;
    const files = Array.from(target.files || []);
    processFiles(files);
  }

  // Handle delete
  async function handleDelete(key) {
    localvalue.splice(key, 1);
    localvalue = localvalue;
    dispatch("change", localvalue);
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="superCell"
  bind:this={anchor}
  class:inEdit={$cellState == "Editing"}
  class:inline={cellOptions.role == "inlineInput"}
  class:tableCell={cellOptions.role == "tableCell"}
  class:formInput={cellOptions.role == "formInput"}
  class:disabled={cellOptions.disabled}
  class:readonly={cellOptions.readonly}
  style:color={cellOptions.color}
  style:background={cellOptions.background}
  on:focusin={cellState.focus}
  on:focusout={cellState.focusout}
  tabindex={cellOptions.readonly || cellOptions.disabled ? -1 : 0}
>
  <div
    style:padding-left={cellOptions.icon ? "32px" : cellOptions.padding}
    style:padding-right={cellOptions.clearValueIcon
      ? "32px"
      : cellOptions.padding}
    class="value"
    on:click={cellState.toggle}
    class:placeholder={localvalue.length < 1}
  >
    {#if localvalue.length || inEdit}
      <div class="items">
        {#each localvalue.slice(0, 5) as file}
          {#if file}
            <div
              class="item pill"
              style:border={"1px solid var(--spectrum-global-color-gray-300)"}
            >
              <span>{file?.extension?.toUpperCase()}</span>
            </div>
          {/if}
        {/each}
        {#if localvalue.length > 5}
          <span class="remaining-count">( + {localvalue.length - 5} )</span>
        {/if}
      </div>
    {:else}
      <span>{placeholder}</span>
    {/if}

    {#if !readonly && !disabled && cellOptions.role != "tableCell"}
      <i class="ph ph-caret-down action-icon"></i>
    {/if}
  </div>
</div>

{#if inEdit}
  <SuperPopover {anchor} {open} maxHeight={350} useAnchorWidth>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="attachments" bind:this={picker}>
      {#if localvalue?.length}
        {#each localvalue as attachment, idx (idx)}
          <!-- svelte-ignore missing-declaration -->
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="attachment"
            class:focused={focusedOptionIdx === idx}
            on:mouseenter={() => (focusedOptionIdx = idx)}
          >
            <button
              class="btn-delete"
              on:click={() => handleDelete(idx)}
              tabindex="-1"
              aria-label="Delete"
              title="Delete"
              type="button"
            >
              <i class="ph ph-download-simple"></i>
            </button>
            <div class="pill">{attachment.extension?.toUpperCase()}</div>

            <a href={attachment.url} class="filename" download
              >{attachment.name}</a
            >
            {#if !readonly}
              <button
                class="btn-delete"
                on:click={() => handleDelete(idx)}
                tabindex="-1"
                aria-label="Delete"
                title="Delete"
                type="button"
              >
                <i class="ph ph-trash-simple"></i>
              </button>
            {/if}
          </div>
        {/each}
      {/if}

      <button
        class="btn-upload-empty"
        on:click={() => fileInput?.click()}
        aria-label="Upload attachment"
        type="button"
        disabled={cellOptions.disabled || cellOptions.readonly}
      >
        <i class="ph ph-plus"></i> Add Attachment
      </button>

      <input
        bind:this={fileInput}
        type="file"
        multiple={multi}
        style="display: none;"
        on:change={handleFileSelect}
      />
    </div>
  </SuperPopover>
{/if}

<style>
  .pill {
    border: 1px solid var(--spectrum-global-color-gray-500);
    padding: 0rem 0.25rem;
    border-radius: 3px;
    font-size: 11px;
    display: flex;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    justify-content: center;
  }

  a.filename {
    width: 100%;
    line-height: 22px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    text-decoration: underline;
    color: var(--spectrum-global-color-blue-700);
  }

  .action-icon {
    display: flex;
    align-items: center;
    color: var(--spectrum-global-color-gray-600);
  }
  .action-icon:hover {
    aspect-ratio: 1;
    cursor: pointer;
    color: var(--spectrum-global-color-static-blue-800);
  }
  .attachment {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.25rem;
    cursor: pointer;
    border-bottom: 1px solid var(--spectrum-global-color-gray-200);
  }

  .attachment:last-child {
    border-bottom: none;
  }
  .attachment:hover {
    background-color: var(--spectrum-global-color-gray-100);
  }
  a.filename {
    flex: auto;
    line-height: 22px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    text-decoration: underline;
    color: var(--spectrum-global-color-blue-700);
    border: 1px;
  }

  .attachments {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    flex: auto;
    position: relative;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    padding: 0.25rem;
  }

  .btn-delete {
    aspect-ratio: 1;
    color: var(--spectrum-global-color-gray-500);
    background: none;
    border: 1px solid transparent;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 3px;
    transition: all 0.2s ease;
  }
  .btn-delete:hover {
    aspect-ratio: 1;
    cursor: pointer;
    border-color: var(--spectrum-global-color-red-500);
    color: var(--spectrum-global-color-red-500);
  }

  .btn-upload-empty {
    width: 100%;
    height: 3rem;
    background: none;
    border: 2px dashed var(--spectrum-global-color-gray-400);
    border-radius: 6px;
    padding: 1rem 2rem;
    cursor: pointer;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
    color: var(--spectrum-global-color-gray-600);
    font-size: 14px;
    justify-content: center;
    margin-top: 1rem;
  }
  .btn-upload-empty:hover:not(:disabled) {
    border-color: var(--spectrum-global-color-blue-500);
    color: var(--spectrum-global-color-blue-500);
    background-color: var(--spectrum-global-color-blue-50);
  }
  .btn-upload-empty:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .remaining-count {
    height: 100%;
    display: flex;
    align-items: center;
    color: var(--spectrum-global-color-gray-700);
    font-size: 12px;
    font-weight: 500;
    margin-left: 0.25rem;
    white-space: nowrap;
  }
</style>
