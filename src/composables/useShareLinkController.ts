import type { AppState } from "@/types/state";
import { ref, type Ref } from "vue";

const COPY_LINK_LABEL_IDLE = "Copy Link";
const COPY_LINK_LABEL_SUCCESS = "Link Copied";
const COPY_LINK_LABEL_ERROR = "Copy Failed";
const COPY_LABEL_RESET_DELAY_MS = 1800;

interface ShareLinkControllerOptions {
  state: AppState;
  buildShareUrl: (state: AppState, currentHref: string) => string;
}

/**
 * Share-link controller contract for copy-link UX flow.
 */
export interface ShareLinkController {
  copyLinkLabel: Ref<string>;
  handleCopyLink: () => Promise<void>;
  dispose: () => void;
}

function copyTextFallback(text: string): boolean {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

/**
 * Creates share-link copy handlers with transient status label management.
 */
export function useShareLinkController(options: ShareLinkControllerOptions): ShareLinkController {
  const { state, buildShareUrl } = options;
  const copyLinkLabel = ref(COPY_LINK_LABEL_IDLE);
  let copyLabelTimerId = 0;

  function resetCopyLinkLabelSoon(): void {
    if (copyLabelTimerId !== 0) {
      window.clearTimeout(copyLabelTimerId);
    }
    copyLabelTimerId = window.setTimeout(() => {
      copyLinkLabel.value = COPY_LINK_LABEL_IDLE;
      copyLabelTimerId = 0;
    }, COPY_LABEL_RESET_DELAY_MS);
  }

  return {
    copyLinkLabel,
    async handleCopyLink(): Promise<void> {
      const shareUrl = buildShareUrl(state, window.location.href);
      let copied = false;

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          copied = true;
        } catch {
          copied = false;
        }
      }

      if (!copied) {
        copied = copyTextFallback(shareUrl);
      }

      copyLinkLabel.value = copied ? COPY_LINK_LABEL_SUCCESS : COPY_LINK_LABEL_ERROR;
      resetCopyLinkLabelSoon();
    },
    dispose(): void {
      if (copyLabelTimerId !== 0) {
        window.clearTimeout(copyLabelTimerId);
      }
    }
  };
}
