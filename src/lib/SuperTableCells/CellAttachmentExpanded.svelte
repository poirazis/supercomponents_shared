<script lang="ts">
  import { createEventDispatcher, tick } from "svelte";
  import fsm from "svelte-fsm";
  import "./CellCommon.css";
  import SuperLightbox from "../SuperLightbox/SuperLightbox.svelte";

  export let value: any;
  export let cellOptions: any;
  export let fieldSchema: any;
  export let tableid: string;
  export let API;
  export let height = "auto";
  export let inBuilder;

  const dispatch = createEventDispatcher();

  let originalValue: any = value;
  let anchor: any;
  let picker: any;
  let open: any;
  let focusedOptionIdx: number | undefined;
  let fileInput: any; // Reference to hidden file input
  let selectedIndices: Set<number> = new Set(); // Track selected item indices
  // New: Carousel state and helpers
  let currentIndex = 0;

  // Modal state
  let showModal = false;
  let modalImageIndex = 0;

  $: multi = fieldSchema?.type?.includes("single") !== true;
  $: localvalue = value && multi ? value : value ? [value] : [];
  $: controlType = cellOptions.controlType || "list";
  $: imageRatio = cellOptions.imageRatio || "landscape";
  $: gridColumns = cellOptions.gridColumns || 4;
  $: canAdd = !cellOptions.readonly && !cellOptions.disabled;
  $: isGallery = cellOptions.isGallery;
  $: disabled = cellOptions.disabled;
  $: readonly = cellOptions.readonly;
  $: onClickAction = cellOptions.onClickAction;
  $: inEdit = $cellState == "Editing";
  $: canSelect = !readonly && !disabled && !isGallery;
  $: canDelete = !readonly && !disabled && !isGallery;
  $: slotted = cellOptions.slotted;

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
    Editing: {
      _enter() {
        originalValue = value;
        anchor?.focus();
        dispatch("enteredit");
      },
      _exit() {
        dispatch("exitedit");
      },
      focousout(e) {
        if (!anchor?.contains(e.relatedTarget)) {
          return "View";
        }
      },
      change(e) {
        if (cellOptions.debounce) dispatch("change", value);
      },
      submit(e) {
        if (!picker?.contains(e.relatedTarget)) {
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
      dispatch("change", [...localvalue, ...res]);
      return res;
    } catch (error) {
      console.error("Upload failed:", error);
      return [];
    }
  };

  // Handle delete
  function handleDelete(key: number) {
    localvalue.splice(key, 1);
    localvalue = [...localvalue];
    dispatch("change", localvalue);
  }

  // Selection functions for grid mode
  function toggleSelection(index: number) {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    selectedIndices = newSet;
  }

  function selectAll() {
    selectedIndices = new Set(localvalue.map((_: any, idx: number) => idx));
  }

  function clearSelection() {
    selectedIndices = new Set();
  }

  function deleteSelected() {
    if (selectedIndices.size === 0) return;

    // Sort indices in descending order to delete from end to start
    const indicesToDelete = Array.from(selectedIndices).sort((a, b) => b - a);

    indicesToDelete.forEach((idx) => {
      localvalue.splice(idx, 1);
    });

    localvalue = localvalue;
    clearSelection();
    dispatch("change", localvalue);
  }

  // Upload new attachments
  function uploadNewAttachment() {
    if (fileInput) {
      fileInput.click();
    }
  }

  // Handle file upload for carousel
  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files || []);

    processFiles(files);
  }

  // Open modal with specific image
  function openModal(index: number) {
    if (
      !disabled &&
      !inBuilder &&
      localvalue?.[index] &&
      isImage(localvalue[index])
    ) {
      modalImageIndex = index;
      showModal = true;
    }
  }

  // Close modal
  function closeModal() {
    showModal = false;
    anchor?.focus();
  }

  // Carousel API object to encapsulate carousel functionality
  const carouselAPI = {
    // Navigate to next attachment in carousel
    next() {
      if (localvalue?.length > 1) {
        currentIndex = (currentIndex + 1) % localvalue.length;
        dispatch("view", {
          attachment: localvalue[currentIndex],
          index: currentIndex,
        });
      }
    },

    // Navigate to previous attachment in carousel
    prev() {
      if (localvalue?.length > 1) {
        currentIndex =
          (currentIndex - 1 + localvalue.length) % localvalue.length;
        dispatch("view", {
          attachment: localvalue[currentIndex],
          index: currentIndex,
        });
      }
    },

    // Jump to specific attachment in carousel
    goTo(index: number) {
      if (index >= 0 && index < localvalue?.length) {
        currentIndex = index;
        dispatch("view", {
          attachment: localvalue[currentIndex],
          index: currentIndex,
        });
      }
    },

    // Handle keyboard navigation for carousel
    handleKeydown(event: KeyboardEvent) {
      if (controlType === "carousel" && localvalue?.length > 1) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          this.prev();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          this.next();
        }
      }
    },
  };

  // Helper to check if attachment is an image
  function isImage(attachment: any) {
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
    return imageExtensions.includes(attachment.extension?.toLowerCase());
  }

  // Unified click handler for items in carousel and grid modes
  function onItemClick(index: number) {
    if (!onClickAction || onClickAction === "none") {
      return;
    } else if (onClickAction === "view") {
      openModal(index);
    } else if (onClickAction === "select") {
      toggleSelection(index);
    } else if (onClickAction === "custom") {
      let item = localvalue[index];
      cellOptions.onItemClick?.({ item, index });
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="superCell"
  bind:this={anchor}
  class:multirow={true}
  class:inEdit={$cellState == "Editing"}
  class:inline={cellOptions.role == "tableCell"}
  class:tableCell={cellOptions.role == "tableCell"}
  class:formInput={cellOptions.role == "formInput"}
  class:disabled={cellOptions.disabled}
  class:readonly={cellOptions.readonly}
  style:color={cellOptions.color}
  style:background={cellOptions.background}
  on:keydown={(e) => {
    carouselAPI.handleKeydown(e);
  }}
  on:focusin={cellState.focus}
  on:focusout={cellState.focousout}
  tabindex="0"
>
  {#if controlType == "list"}
    <div class="attachments">
      {#if localvalue?.length}
        {#each localvalue as attachment, idx (idx)}
          <div
            class="attachment"
            class:focused={focusedOptionIdx === idx}
            class:selected={selectedIndices.has(idx)}
            on:mouseenter={() => (focusedOptionIdx = idx)}
            on:click={() => toggleSelection(idx)}
          >
            <button
              class="btn-download"
              on:click={() => handleDelete(idx)}
              tabindex="-1"
              aria-label="Download {attachment.name}"
              title="Download {attachment.name}"
              type="button"
            >
              <i class="ph ph-download-simple"></i>
            </button>

            <a href={attachment.url} class="filename">{attachment.name}</a>
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

      {#if canAdd}
        <button
          class="btn-upload-empty list"
          style:margin-top={localvalue?.length ? "0.5rem" : "0"}
          on:click={uploadNewAttachment}
          aria-label="Upload attachment"
          type="button"
          disabled={cellOptions.disabled || cellOptions.readonly}
        >
          <i class="ph ph-plus"></i> Add Attachment
        </button>
      {/if}
    </div>
  {:else if controlType == "carousel"}
    <div class="carousel">
      {#if localvalue?.length}
        <div class="carousel-content">
          {#if isImage(localvalue[currentIndex])}
            <div
              class="carousel-image"
              class:selected={selectedIndices.has(currentIndex)}
              style="background-image: url('{localvalue[currentIndex].url}')"
              aria-label={localvalue[currentIndex].name}
              on:click={() => {
                if (inEdit) onItemClick(localvalue[currentIndex], currentIndex);
              }}
            >
              {#if localvalue.length > 1 || canAdd}
                <div class="carousel-controls">
                  {#if localvalue.length > 1}
                    <button
                      class="btn-nav"
                      on:click|stopPropagation={carouselAPI.prev}
                      aria-label="Previous attachment"
                      type="button"
                      disabled={cellOptions.disabled}
                    >
                      <i class="ph ph-caret-left"></i>
                    </button>
                    <div class="indicators">
                      {#each localvalue as _, idx}
                        <button
                          class="indicator"
                          class:active={idx === currentIndex}
                          on:click|stopPropagation={() => carouselAPI.goTo(idx)}
                          aria-label="Go to attachment {idx + 1}"
                          type="button"
                          disabled={cellOptions.disabled}
                        ></button>
                      {/each}
                    </div>
                    <button
                      class="btn-nav"
                      on:click|stopPropagation={carouselAPI.next}
                      aria-label="Next attachment"
                      type="button"
                      disabled={cellOptions.disabled}
                    >
                      <i class="ph ph-caret-right"></i>
                    </button>
                    <button
                      class="btn-nav"
                      style="align-self: flex-end;"
                      on:click|stopPropagation={() => openModal(currentIndex)}
                      aria-label="Full Screen"
                      type="button"
                      disabled={cellOptions.disabled}
                    >
                      <i class="ph ph-arrows-out-simple"></i>
                    </button>
                  {/if}
                  {#if canAdd}
                    <button
                      class="btn-nav add"
                      style="align-self: flex-end;"
                      on:click|stopPropagation={uploadNewAttachment}
                      aria-label="Next attachment"
                      type="button"
                    >
                      <i class="ph ph-upload"></i>
                    </button>
                  {/if}
                </div>
              {/if}
            </div>
          {:else if !isGallery}
            <div class="carousel-fallback">
              <div class="pill">
                {localvalue[currentIndex].extension?.toUpperCase()}
              </div>
              <span class="filename">{localvalue[currentIndex].name}</span>
            </div>
          {/if}
        </div>
      {:else if !isGallery}
        <div class="carousel-placeholder">
          {#if canAdd}
            <button
              class="btn-upload-empty"
              on:click={uploadNewAttachment}
              aria-label="Upload attachment"
              type="button"
              disabled={cellOptions.disabled || cellOptions.readonly}
            >
              <i class="ph ph-plus"></i>
              Upload Attachment
            </button>
          {/if}
        </div>
      {/if}
    </div>
  {:else if controlType == "grid"}
    <div class="attachment-grid-wrapper">
      <div class="attachment-grid" style:--grid-columns={gridColumns}>
        {#if localvalue?.length}
          {#each localvalue as attachment, idx (idx)}
            {#if isImage(attachment)}
              <div
                class="grid-item"
                class:focused={focusedOptionIdx === idx}
                class:selected={selectedIndices.has(idx)}
                style="aspect-ratio: {imageRatio === 'landscape'
                  ? '4 / 3'
                  : imageRatio === 'square'
                    ? '1 / 1'
                    : '3 / 4'}"
              >
                <div
                  class="grid-image"
                  style="background-image: url('{attachment.url}');"
                  role="button"
                  tabindex="0"
                  aria-label={attachment.name}
                  on:click={() => onItemClick(attachment, idx)}
                  on:keydown={(e) => e.key === "Enter" && toggleSelection(idx)}
                >
                  {#if slotted}
                    <div class="slot-container">
                      <slot />
                    </div>
                  {/if}
                  {#if !isGallery && !readonly}
                    <div class="grid-overlay-top">
                      <button
                        class="btn-grid-download"
                        on:click={() => {
                          const link = document.createElement("a");
                          link.href = attachment.url;
                          link.download = attachment.name;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        tabindex="-1"
                        aria-label="Download {attachment.name}"
                        type="button"
                      >
                        <i class="ph ph-download-simple"></i>
                      </button>
                      <button
                        class="btn-grid-delete"
                        on:click={() => handleDelete(idx)}
                        tabindex="-1"
                        aria-label="Delete {attachment.name}"
                        type="button"
                      >
                        <i class="ph ph-trash-simple"></i>
                      </button>
                    </div>
                  {/if}
                </div>
              </div>
            {:else if !isGallery}
              <div
                class="grid-item"
                class:focused={focusedOptionIdx === idx}
                class:selected={selectedIndices.has(idx)}
                style="aspect-ratio: {imageRatio === 'landscape'
                  ? '4 / 3'
                  : imageRatio === 'square'
                    ? '1 / 1'
                    : '3 / 4'}"
              >
                <div class="grid-fallback">
                  <div class="pill">{attachment.extension?.toUpperCase()}</div>
                  <span class="filename">{attachment.name}</span>
                </div>
              </div>
            {/if}
          {/each}

          {#if canAdd}
            <div
              class="grid-item grid-add-item"
              style="aspect-ratio: {imageRatio === 'landscape'
                ? '4 / 3'
                : imageRatio === 'square'
                  ? '1 / 1'
                  : '3 / 4'}"
            >
              <button
                class="btn-upload-empty grid"
                on:click={uploadNewAttachment}
                aria-label="Upload attachment"
                type="button"
                disabled={cellOptions.disabled || cellOptions.readonly}
              >
                <i class="ph ph-plus"></i>
                <span>Add Images</span>
              </button>
            </div>
          {/if}
        {:else}
          <div class="grid-empty">
            {#if canAdd}
              <button
                class="btn-upload-empty grid"
                on:click={uploadNewAttachment}
                aria-label="Upload attachment"
                type="button"
                disabled={cellOptions.disabled || cellOptions.readonly}
              >
                <i class="ph ph-plus"></i>
                <span>Add Images</span>
              </button>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if selectedIndices.size > 0 && controlType === "grid" && !readonly && !isGallery}
    <div class="bulk-actions-overlay">
      <button
        class="btn-bulk-action btn-close"
        on:click={clearSelection}
        type="button"
        title="Clear Selection"
      >
        <i class="ph ph-x"></i>
      </button>
      <span class="selection-count">
        {selectedIndices.size == 1
          ? selectedIndices.size + " Item "
          : selectedIndices.size + " Items "} Selected
      </span>
      <button
        class="btn-bulk-action btn-bulk-delete"
        on:click={deleteSelected}
        type="button"
        title="Delete Selected"
      >
        <i class="ph ph-trash-simple"></i>
      </button>
    </div>
  {/if}

  <!-- File input for uploading attachments, hidden from view -->
  <input
    type="file"
    bind:this={fileInput}
    on:change={handleFileSelect}
    multiple={multi}
    style="display: none"
  />

  <!-- SuperLightbox for image preview -->
  <SuperLightbox
    bind:items={localvalue}
    bind:open={showModal}
    bind:currentIndex
    bind:selectedIndices
    on:close={() => console.log("closed")}
    {canSelect}
    {canDelete}
  />
</div>

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

  .filename {
    flex: auto;
    line-height: 22px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    color: var(--spectrum-global-color-gray-700);
    font-size: 12px;
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

  .btn-download {
    aspect-ratio: 1;
    color: var(--spectrum-global-color-gray-500);
    background: none;
    border: 1px solid transparent;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 3px;
    transition: all 0.2s ease;
  }

  .btn-download:hover {
    aspect-ratio: 1;
    cursor: pointer;
    border-color: var(--spectrum-global-color-blue-500);
    color: var(--spectrum-global-color-blue-500);
  }

  .attachment {
    box-sizing: content-box;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0rem 0.25rem;
    min-height: 30px;
    cursor: pointer;
    border-bottom: 1px solid var(--spectrum-global-color-gray-200);
  }

  .attachment:last-child {
    border-bottom: none;
  }
  .attachment:hover {
    background-color: var(--spectrum-global-color-gray-100);
  }
  .attachment.selected {
    background-color: var(--spectrum-global-color-blue-100);
  }

  .attachments {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    position: relative;
    width: 100%;
    height: 100%;
    overflow-y: auto;
  }

  /* New carousel styles */
  .carousel {
    position: relative;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    min-width: 8rem;
    height: 100%;
  }

  .carousel:hover .carousel-controls {
    opacity: 1;
  }

  .carousel-content {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
  }

  .carousel-image {
    width: 100%;
    height: 100%;
    min-width: 8rem;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border-radius: 4px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 1;
    transform: scale(1) translateX(0);
    cursor: pointer;
  }

  .carousel-image.selected::after {
    content: "\2713";
    position: absolute;
    top: 1rem;
    left: 1rem;
    width: 1.5rem;
    height: 1.5rem;
    background: var(--spectrum-global-color-blue-600);
    border-radius: 4px;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1rem;
    font-weight: bold;
  }

  .carousel-fallback {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .carousel-fallback .filename {
    font-size: 14px;
    color: var(--spectrum-global-color-gray-700);
    text-align: center;
  }

  .carousel-controls {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 1rem;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 10;
    opacity: 0.65;
    transition: opacity 0.2s ease;
  }

  .btn-nav {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 50%;
    width: 1.5rem;
    height: 1.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    color: white;
    font-size: 12px;
  }
  .btn-nav:hover:not(:disabled) {
    background-color: var(--spectrum-global-color-gray-100);
    border-color: var(--spectrum-global-color-gray-400);
    color: var(--spectrum-global-color-gray-800);
  }
  .btn-nav:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .indicators {
    display: flex;
    gap: 0.25rem;
  }

  .indicator {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--spectrum-global-color-gray-400);
    border: none;
    cursor: pointer;
    transition: background 0.2s ease;
  }
  .indicator.active {
    background: var(--spectrum-global-color-static-blue-600);
  }
  .indicator:disabled {
    cursor: not-allowed;
  }

  .carousel-placeholder {
    flex: 1;
    width: 100%;
    height: 100%;
    color: var(--spectrum-global-color-gray-500);
    font-style: italic;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    /* Add padding for centered spacing around the button */
    padding: 2rem;
  }

  .btn-upload-empty {
    /* Prevent stretching to full height; use fixed height for consistent borders */
    flex: none;
    height: 4rem; /* Fixed height to ensure borders are visible */
    background: none;
    border: 2px dashed var(--spectrum-global-color-gray-400);
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
    color: var(--spectrum-global-color-gray-600);
    font-size: 14px;
    justify-content: center;
    padding: 2rem;
  }

  .btn-upload-empty.list {
    flex: none;
    height: 2rem;
    background: none;
    border: 2px dashed var(--spectrum-global-color-gray-400);
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
    color: var(--spectrum-global-color-gray-600);
    font-size: 14px;
    justify-content: center;
    padding: unset;
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

  .attachment-grid-wrapper {
    flex: auto;
    position: relative;
    width: 100%;
    height: 100%;
    overflow-y: auto;
  }

  /* New grid styles */
  .attachment-grid {
    flex: auto;
    display: grid;
    grid-template-columns: repeat(var(--grid-columns), 1fr);
    grid-auto-rows: 1fr;
    gap: 0.25rem;
    padding: 0.25rem;
    min-width: 15rem;
    overflow-y: auto;
    min-height: 13rem;
  }

  .grid-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    border: 1px solid transparent;
    border-radius: 4px;
    transition: border-color 0.2s ease;
    overflow: hidden;
  }

  .grid-item.focused {
    border-color: var(--spectrum-global-color-blue-500);
  }

  .grid-item.selected {
    border-color: var(--spectrum-global-color-blue-600);
  }

  .grid-item.selected::after {
    content: "\2713";
    position: absolute;
    top: 1rem;
    left: 1rem;
    width: 1.5rem;
    height: 1.5rem;
    background: var(--spectrum-global-color-blue-600);
    border-radius: 4px;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1rem;
    font-weight: bold;
  }

  .grid-image {
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    filter: grayscale(50%);
    padding: 1rem;
  }
  .grid-image:hover {
    filter: grayscale(0%);
  }

  .grid-fallback {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border: 1px solid var(--spectrum-global-color-gray-300);
    background-color: var(--spectrum-global-color-gray-100);
    padding: 1rem;
  }

  .grid-fallback .filename {
    font-size: 14px;
    color: var(--spectrum-global-color-gray-700);
    text-align: center;
  }

  .grid-overlay-top {
    position: absolute;
    bottom: 0.25rem;
    left: 0.25rem;
    right: 0.25rem;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 1rem;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border-top: none;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .grid-item:hover .grid-overlay-top {
    opacity: 1;
  }

  .grid-image:hover .slot-container {
    opacity: 1;
  }

  .btn-grid-download,
  .btn-grid-delete {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 50%;
    width: 1.5rem;
    height: 1.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    color: rgba(255, 255, 255, 0.7);
    font-size: 12px;
  }

  .btn-grid-download:hover:not(:disabled) {
    color: var(--spectrum-global-color-blue-700);
    border-color: var(--spectrum-global-color-static-blue-600);
  }

  .btn-grid-delete:hover:not(:disabled) {
    border-color: var(--spectrum-global-color-gray-400);
    color: var(--spectrum-global-color-gray-800);
  }

  .btn-grid-download:disabled,
  .btn-grid-delete:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .btn-grid-delete:hover:not(:disabled) {
    border-color: var(--spectrum-global-color-red-500);
    color: var(--spectrum-global-color-red-700);
  }

  /* New bulk action styles */
  .bulk-actions-overlay {
    position: absolute;
    bottom: 1.25rem;
    left: 1.25rem;
    height: 36px;
    border-radius: 4px;
    background: var(--spectrum-global-color-gray-200);
    border: 1px solid var(--spectrum-global-color-gray-400);
    color: var(--spectrum-global-color-gray-700);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0 0.75rem 0 0.75rem;
    transition: all 230ms;
    z-index: 100;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  }

  .bulk-actions-overlay:hover {
    border-color: var(--spectrum-global-color-gray-500);
  }

  .selection-count {
    margin-right: 1.5rem;
    font-size: 13px;
    font-weight: 400;
    color: var(--spectrum-global-color-gray-700);
  }

  .btn-bulk-action {
    background: none;
    border: none;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    transition: all 0.2s ease;
    color: var(--spectrum-global-color-gray-700);
    font-size: 13px;
    font-weight: 400;
  }
  .btn-bulk-action:hover:not(:disabled) {
    background: var(--spectrum-global-color-gray-300);
    color: var(--spectrum-global-color-gray-800);
  }
  .btn-bulk-action:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-bulk-delete {
    color: var(--spectrum-global-color-red-600);
  }
  .btn-bulk-delete:hover:not(:disabled) {
    background: var(--spectrum-global-color-red-100);
    color: var(--spectrum-global-color-red-700);
  }

  .btn-close {
    padding: 0.125rem;
    margin-right: 0.25rem;
    border-radius: 2px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .btn-close:hover:not(:disabled) {
    background: var(--spectrum-global-color-gray-400);
    color: var(--spectrum-global-color-gray-800);
  }

  /* Grid-specific empty state container (when no attachments) */
  .grid-empty {
    flex: 1;
    width: 100%;
    height: 100%;
    color: var(--spectrum-global-color-gray-500);
    font-style: italic;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    /* Ensure it fits within the grid wrapper without overflow */
    min-height: 8rem; /* Match carousel-content for consistency */
  }

  /* Grid-specific upload button: Fill the grid item like other items */
  .btn-upload-empty.grid {
    flex: none; /* Prevent stretching beyond the grid item */
    width: 100%;
    height: 100%;
    background: none;
    border: 2px dashed var(--spectrum-global-color-gray-400);
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
    color: var(--spectrum-global-color-gray-600);
    font-size: 14px;
    /* Ensure it fills the grid item fully, like .grid-fallback */
    padding: 1rem; /* Add padding for better spacing inside the border */
  }

  .btn-upload-empty.grid:hover:not(:disabled) {
    border-color: var(--spectrum-global-color-blue-500);
    color: var(--spectrum-global-color-blue-500);
    background-color: var(--spectrum-global-color-blue-50);
  }

  .btn-upload-empty.grid:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .slot-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: stretch;
    justify-content: stretch;
    pointer-events: none; /* Ensure it doesn't block clicks */
    background-color: rgba(0, 0, 0, 0.5);
    opacity: 0;
    transition: all 0.2s ease;
    border-radius: 8px;
  }
</style>
