<script lang="ts">
  interface BaseCellProps {
    value?: any;
    field?: string;
    copyable?: boolean;
    copyLabel?: string;
    copiedLabel?: string;
  }

  import Textbox from "../UI/elements/Textbox.svelte";

  let {
    value,
    field,
    copyable = true,
    copyLabel,
    copiedLabel,
  }: BaseCellProps = $props();
</script>

<Textbox
  {value}
  copyLabel={copyLabel || "Copy"}
  copiedLabel={copiedLabel || "Copied!"}
  disabled={!copyable}
/>
