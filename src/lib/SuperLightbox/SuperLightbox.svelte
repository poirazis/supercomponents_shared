<script>
  import { createEventDispatcher } from "svelte";

  // Props - simplified API
  export let items = [];
  export let currentIndex = 0;
  export let open = false;
  export let selectedIndices = new Set();
  export let canSelect = true;
  export let canDelete = false;

  const dispatch = createEventDispatcher();

  // Lightbox API object - exported for external binding
  export const lightboxAPI = {
    // Navigation functions
    navigateNext() {
      if (items?.length > 1) {
        currentIndex = (currentIndex + 1) % items.length;
      }
    },

    navigatePrev() {
      if (items?.length > 1) {
        currentIndex = (currentIndex - 1 + items.length) % items.length;
      }
    },

    navigateTo(index) {
      if (index >= 0 && index < items?.length) {
        currentIndex = index;
      }
    },

    // Selection functions
    toggleSelection(index) {
      const newSet = new Set(selectedIndices);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      selectedIndices = newSet;
    },

    // Modal control
    closeModal() {
      open = false;
      dispatch("close");
    },

    // Keyboard handling
    handleKeydown(event) {
      switch (event.key) {
        case "Escape":
          lightboxAPI.closeModal();
          break;
        case "ArrowLeft":
          event.preventDefault();
          lightboxAPI.navigatePrev();
          break;
        case "ArrowRight":
        case " ": // Space key for next
          event.preventDefault();
          lightboxAPI.navigateNext();
          break;
        case "Home":
          event.preventDefault();
          lightboxAPI.navigateTo(0); // Go to first image
          break;
        case "End":
          event.preventDefault();
          lightboxAPI.navigateTo(items?.length - 1 || 0); // Go to last image
          break;
        case "PageUp":
          event.preventDefault();
          lightboxAPI.navigatePrev(); // Same as ArrowLeft
          break;
        case "PageDown":
          event.preventDefault();
          lightboxAPI.navigateNext(); // Same as ArrowRight
          break;
        default:
          // Handle number keys 1-9 to jump to specific images
          if (event.key >= "1" && event.key <= "9") {
            const index = parseInt(event.key) - 1; // 1 = index 0, 2 = index 1, etc.
            if (index < (items?.length || 0)) {
              event.preventDefault();
              lightboxAPI.navigateTo(index);
            }
          }
          break;
      }
    },

    // Helper functions
    isImage(attachment) {
      const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
      return imageExtensions.includes(attachment?.extension?.toLowerCase());
    },
  };

  const focus = (node) => {
    node.focus();
  };

  // Computed properties
  $: hasPrev = items?.length > 1 && currentIndex > 0;
  $: hasNext = items?.length > 1 && currentIndex < (items?.length - 1 || 0);
  $: currentItem = items?.[currentIndex];
</script>

{#if open}
  <!-- Image modal for previewing images in full size -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="image-modal"
    on:click={lightboxAPI.closeModal}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
  >
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="image-modal-content"
      on:click|stopPropagation
      on:keydown={lightboxAPI.handleKeydown}
      use:focus
      tabindex="0"
    >
      <div
        class="modal-image-container"
        class:selected={selectedIndices.has(currentIndex)}
        aria-label="Image {currentIndex + 1} of {items?.length ||
          1}. Use arrow keys to navigate, Home/End for first/last, numbers 1-9 to jump to images, Space for next, Escape to close."
      >
        <button
          class="modal-close"
          on:click={lightboxAPI.closeModal}
          aria-label="Close modal"
          type="button">&times;</button
        >
        {#if lightboxAPI.isImage(currentItem)}
          <img
            src={currentItem.url}
            alt={currentItem.name}
            class="modal-image"
          />
        {:else}
          <div class="modal-fallback">
            <div class="pill">
              {currentItem?.extension?.toUpperCase()}
            </div>
            <span class="filename">{currentItem?.name}</span>
          </div>
        {/if}
        <div class="modal-controls">
          <div class="modal-navigation">
            <button
              class="btn-nav large"
              on:click={lightboxAPI.navigatePrev}
              aria-label="Previous image"
              type="button"
              disabled={!hasPrev}
            >
              <i class="ph ph-caret-left"></i>
            </button>
            {#if items?.length > 1}
              <div class="modal-indicators">
                {#each items as _, idx}
                  <button
                    class="indicator large"
                    class:active={idx === currentIndex}
                    on:click={() => lightboxAPI.navigateTo(idx)}
                    aria-label="Go to image {idx + 1}"
                    type="button"
                  ></button>
                {/each}
              </div>
            {/if}
            <button
              class="btn-nav large"
              on:click={lightboxAPI.navigateNext}
              aria-label="Next image"
              type="button"
              disabled={!hasNext}
            >
              <i class="ph ph-caret-right"></i>
            </button>
          </div>
          <div class="modal-actions">
            {#if canSelect}
              <button
                class="btn-nav large btn-modal-select"
                class:selected={selectedIndices.has(currentIndex)}
                on:click={() => lightboxAPI.toggleSelection(currentIndex)}
                aria-label={selectedIndices.has(currentIndex)
                  ? "Deselect"
                  : "Select"}
                type="button"
              >
                <i
                  class="ph {selectedIndices.has(currentIndex)
                    ? 'ph-check-square'
                    : 'ph-square'}"
                ></i>
              </button>
            {/if}
            {#if canDelete}
              <button
                class="btn-nav large btn-modal-delete"
                on:click={() =>
                  dispatch("delete", {
                    index: currentIndex,
                    item: items[currentIndex],
                  })}
                aria-label="Delete"
                type="button"
              >
                <i class="ph ph-trash-simple"></i>
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .image-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100000;
    cursor: pointer;
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }

  .image-modal-content {
    position: relative;
    width: 80vw;
    height: 80vh;
    background: transparent;
    border-radius: 0;
    overflow: hidden;
    cursor: default;
    outline: none;
    box-shadow: none;
    border: none;
    display: flex;
    align-items: stretch;
  }

  .modal-close {
    position: absolute;
    top: 1.75rem;
    right: 1.75rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 50%;
    padding: 0.75rem;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    transition: all 0.2s ease;
    color: white;
  }

  .modal-close:hover {
    background: rgba(0, 0, 0, 0.9);
  }

  .modal-image-container {
    flex: auto;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background: black;
    min-height: 200px;
  }

  .modal-image-container.selected::after {
    content: "✓";
    position: absolute;
    top: 20px;
    left: 20px;
    width: 40px;
    height: 40px;
    background: var(--spectrum-global-color-blue-500);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
    font-weight: bold;
    z-index: 1001;
  }

  .modal-image {
    max-width: 100%;
    max-height: 75vh;
    object-fit: contain;
    display: block;
  }

  .modal-fallback {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    background: var(--spectrum-global-color-gray-100);
    min-height: 400px;
    min-width: 400px;
    border-radius: 8px;
    margin: 2rem;
  }

  .modal-controls {
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

  .modal-navigation {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn-nav.large {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 50%;
    padding: 0.75rem;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    min-width: 48px;
    min-height: 48px;
    transition: all 0.2s ease;
    color: white;
  }

  .btn-nav.large:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.9);
    transform: scale(1.05);
  }

  .btn-nav.large:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  .modal-indicators {
    display: flex;
    gap: 0.5rem;
  }

  .indicator.large {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.7);
    background: transparent;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .indicator.large:hover {
    border-color: rgba(255, 255, 255, 0.9);
    transform: scale(1.2);
  }

  .indicator.large.active {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(255, 255, 255, 0.9);
  }

  .btn-modal-select.selected {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.9);
    color: white;
  }

  .btn-modal-delete {
    color: rgba(255, 255, 255, 0.9);
    border-color: rgba(255, 255, 255, 0.7);
  }

  .btn-modal-delete:hover:not(:disabled) {
    background: rgba(255, 0, 0, 0.2);
    border-color: rgba(255, 255, 255, 0.9);
  }

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
    margin-top: 0.5rem;
    font-size: 0.9rem;
    color: var(--spectrum-global-color-gray-700);
    text-align: center;
  }
</style>
