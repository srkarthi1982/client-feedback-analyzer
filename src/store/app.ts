import {
  CATEGORY_OPTIONS,
  FEEDBACK_DRAFT_STORAGE_KEY,
  PRIORITY_OPTIONS,
  SENTIMENT_OPTIONS,
  buildCurrentSummaryText,
  buildFullReportText,
  createEmptyDraft,
  createFeedbackItem,
  filterFeedbackItems,
  getSentimentCounts,
  normalizeDraft,
  type FeedbackDraft,
  type FeedbackItem,
} from "../lib/feedback";

const defaultDraft = createEmptyDraft();

function safeJsonParse(value: string | null) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function copyText(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    throw new Error("Clipboard is unavailable in this environment.");
  }

  await navigator.clipboard.writeText(text);
}

export type FeedbackStore = {
  draft: FeedbackDraft;
  itemForm: FeedbackItem;
  editingItemId: string | null;
  copyStatus: string;
  showResetConfirm: boolean;
  sentimentOptions: typeof SENTIMENT_OPTIONS;
  categoryOptions: typeof CATEGORY_OPTIONS;
  priorityOptions: typeof PRIORITY_OPTIONS;
  init: () => void;
  saveDraft: () => void;
  resetItemForm: () => void;
  upsertFeedbackItem: () => void;
  editItem: (itemId: string) => void;
  deleteItem: (itemId: string) => void;
  filteredItems: () => FeedbackItem[];
  counts: () => ReturnType<typeof getSentimentCounts>;
  copyCurrentSummary: () => Promise<void>;
  copyFullReport: () => Promise<void>;
  confirmResetWorkspace: () => void;
  resetWorkspace: () => void;
};

export function createFeedbackStore(): FeedbackStore {
  return {
    draft: structuredClone(defaultDraft),
    itemForm: createFeedbackItem(),
    editingItemId: null,
    copyStatus: "",
    showResetConfirm: false,
    sentimentOptions: SENTIMENT_OPTIONS,
    categoryOptions: CATEGORY_OPTIONS,
    priorityOptions: PRIORITY_OPTIONS,

    init() {
      const saved = safeJsonParse(localStorage.getItem(FEEDBACK_DRAFT_STORAGE_KEY));
      this.draft = normalizeDraft(saved);
    },

    saveDraft() {
      localStorage.setItem(FEEDBACK_DRAFT_STORAGE_KEY, JSON.stringify(this.draft));
    },

    resetItemForm() {
      this.itemForm = createFeedbackItem();
      this.editingItemId = null;
    },

    upsertFeedbackItem() {
      const text = this.itemForm.text.trim();
      if (!text) return;

      const normalizedItem: FeedbackItem = {
        ...this.itemForm,
        text,
        source: this.itemForm.source.trim(),
      };

      if (this.editingItemId) {
        this.draft.feedbackItems = this.draft.feedbackItems.map((item) =>
          item.id === this.editingItemId ? normalizedItem : item
        );
      } else {
        this.draft.feedbackItems = [normalizedItem, ...this.draft.feedbackItems];
      }

      this.resetItemForm();
      this.saveDraft();
    },

    editItem(itemId) {
      const item = this.draft.feedbackItems.find((entry) => entry.id === itemId);
      if (!item) return;

      this.itemForm = { ...item };
      this.editingItemId = itemId;
    },

    deleteItem(itemId) {
      this.draft.feedbackItems = this.draft.feedbackItems.filter((entry) => entry.id !== itemId);

      if (this.editingItemId === itemId) {
        this.resetItemForm();
      }

      this.saveDraft();
    },

    filteredItems() {
      return filterFeedbackItems(this.draft.feedbackItems, this.draft.filters);
    },

    counts() {
      return getSentimentCounts(this.draft.feedbackItems);
    },

    async copyCurrentSummary() {
      const text = buildCurrentSummaryText(this.draft, this.filteredItems());
      await copyText(text);
      this.copyStatus = "Current summary copied.";
      setTimeout(() => {
        this.copyStatus = "";
      }, 2400);
    },

    async copyFullReport() {
      const text = buildFullReportText(this.draft);
      await copyText(text);
      this.copyStatus = "Full report copied.";
      setTimeout(() => {
        this.copyStatus = "";
      }, 2400);
    },

    confirmResetWorkspace() {
      this.showResetConfirm = true;
    },

    resetWorkspace() {
      this.draft = createEmptyDraft();
      this.resetItemForm();
      this.copyStatus = "Workspace reset.";
      this.showResetConfirm = false;
      this.saveDraft();
    },
  };
}
