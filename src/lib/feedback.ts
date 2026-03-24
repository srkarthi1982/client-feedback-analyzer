export const SENTIMENT_OPTIONS = ["Positive", "Neutral", "Negative"] as const;
export const CATEGORY_OPTIONS = [
  "Product",
  "Service",
  "Communication",
  "Delivery",
  "Pricing",
  "Other",
] as const;
export const PRIORITY_OPTIONS = ["Low", "Medium", "High"] as const;

export type Sentiment = (typeof SENTIMENT_OPTIONS)[number];
export type Category = (typeof CATEGORY_OPTIONS)[number];
export type Priority = (typeof PRIORITY_OPTIONS)[number];

export type FeedbackItem = {
  id: string;
  text: string;
  source: string;
  sentiment: Sentiment;
  category: Category;
  priority: Priority;
  createdAt: string;
};

export type FeedbackBasics = {
  projectName: string;
  clientName: string;
  owner: string;
  reviewPeriod: string;
  overallNotes: string;
};

export type InsightSummary = {
  keyStrengths: string;
  mainConcerns: string;
  recommendedActions: string;
};

export type FeedbackFilters = {
  sentiment: Sentiment | "All";
  category: Category | "All";
  priority: Priority | "All";
};

export type FeedbackDraft = {
  basics: FeedbackBasics;
  feedbackItems: FeedbackItem[];
  filters: FeedbackFilters;
  summary: InsightSummary;
};

export const FEEDBACK_DRAFT_STORAGE_KEY = "ansiversa.client-feedback-analyzer.v1";

export function createFeedbackItem(): FeedbackItem {
  return {
    id: crypto.randomUUID(),
    text: "",
    source: "",
    sentiment: "Neutral",
    category: "Product",
    priority: "Medium",
    createdAt: new Date().toISOString(),
  };
}

export function createEmptyDraft(): FeedbackDraft {
  return {
    basics: {
      projectName: "",
      clientName: "",
      owner: "",
      reviewPeriod: "",
      overallNotes: "",
    },
    feedbackItems: [],
    filters: {
      sentiment: "All",
      category: "All",
      priority: "All",
    },
    summary: {
      keyStrengths: "",
      mainConcerns: "",
      recommendedActions: "",
    },
  };
}

export function normalizeDraft(input: Partial<FeedbackDraft> | null | undefined): FeedbackDraft {
  const base = createEmptyDraft();

  const feedbackItems = Array.isArray(input?.feedbackItems)
    ? input!.feedbackItems
        .filter((item): item is FeedbackItem => Boolean(item && item.id && item.text))
        .map((item) => ({
          ...createFeedbackItem(),
          ...item,
          sentiment: SENTIMENT_OPTIONS.includes(item.sentiment) ? item.sentiment : "Neutral",
          category: CATEGORY_OPTIONS.includes(item.category) ? item.category : "Other",
          priority: PRIORITY_OPTIONS.includes(item.priority) ? item.priority : "Medium",
        }))
    : base.feedbackItems;

  return {
    basics: {
      ...base.basics,
      ...(input?.basics ?? {}),
    },
    feedbackItems,
    filters: {
      ...base.filters,
      ...(input?.filters ?? {}),
    },
    summary: {
      ...base.summary,
      ...(input?.summary ?? {}),
    },
  };
}

export function filterFeedbackItems(items: FeedbackItem[], filters: FeedbackFilters): FeedbackItem[] {
  return items.filter((item) => {
    if (filters.sentiment !== "All" && item.sentiment !== filters.sentiment) return false;
    if (filters.category !== "All" && item.category !== filters.category) return false;
    if (filters.priority !== "All" && item.priority !== filters.priority) return false;
    return true;
  });
}

export function getSentimentCounts(items: FeedbackItem[]) {
  const counts: Record<Sentiment, number> = {
    Positive: 0,
    Neutral: 0,
    Negative: 0,
  };

  for (const item of items) {
    counts[item.sentiment] += 1;
  }

  return counts;
}

function multilineOrFallback(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function section(title: string, content: string) {
  return `${title}\n${content}`;
}

export function buildCurrentSummaryText(draft: FeedbackDraft, filteredItems: FeedbackItem[]): string {
  const counts = getSentimentCounts(draft.feedbackItems);
  const feedbackSnapshot = filteredItems
    .slice(0, 6)
    .map(
      (item, index) =>
        `${index + 1}. [${item.sentiment} | ${item.category} | ${item.priority}] ${item.text} (${item.source || "Source not provided"})`
    )
    .join("\n");

  return [
    `Project / Batch: ${draft.basics.projectName || "Untitled Review"}`,
    `Client: ${draft.basics.clientName || "Not specified"}`,
    `Review Period: ${draft.basics.reviewPeriod || "Not specified"}`,
    `Owner: ${draft.basics.owner || "Not specified"}`,
    "",
    "Feedback Overview",
    `- Total items: ${draft.feedbackItems.length}`,
    `- Positive: ${counts.Positive}`,
    `- Neutral: ${counts.Neutral}`,
    `- Negative: ${counts.Negative}`,
    "",
    section("Key strengths", multilineOrFallback(draft.summary.keyStrengths, "No strengths drafted yet.")),
    "",
    section("Main concerns", multilineOrFallback(draft.summary.mainConcerns, "No concerns drafted yet.")),
    "",
    section(
      "Recommended actions",
      multilineOrFallback(draft.summary.recommendedActions, "No recommended actions drafted yet.")
    ),
    "",
    section(
      "Recent / filtered feedback items",
      feedbackSnapshot || "No feedback items match the current filters."
    ),
  ].join("\n");
}

export function buildFullReportText(draft: FeedbackDraft): string {
  const counts = getSentimentCounts(draft.feedbackItems);
  const allItems = draft.feedbackItems
    .map(
      (item, index) =>
        `${index + 1}. [${item.sentiment} | ${item.category} | ${item.priority}] ${item.text}\n   Source: ${item.source || "Source not provided"}`
    )
    .join("\n");

  return [
    "Client Feedback Analyzer Report",
    "===============================",
    `Project / Batch: ${draft.basics.projectName || "Untitled Review"}`,
    `Client / Company: ${draft.basics.clientName || "Not specified"}`,
    `Reviewer / Owner: ${draft.basics.owner || "Not specified"}`,
    `Review Period: ${draft.basics.reviewPeriod || "Not specified"}`,
    "",
    section("Overall notes", multilineOrFallback(draft.basics.overallNotes, "No overall notes added.")),
    "",
    "Feedback overview",
    `- Total items: ${draft.feedbackItems.length}`,
    `- Positive: ${counts.Positive}`,
    `- Neutral: ${counts.Neutral}`,
    `- Negative: ${counts.Negative}`,
    "",
    section("Key strengths", multilineOrFallback(draft.summary.keyStrengths, "No strengths drafted yet.")),
    "",
    section("Main concerns", multilineOrFallback(draft.summary.mainConcerns, "No concerns drafted yet.")),
    "",
    section(
      "Recommended actions",
      multilineOrFallback(draft.summary.recommendedActions, "No recommended actions drafted yet.")
    ),
    "",
    section("Feedback items", allItems || "No feedback items added yet."),
  ].join("\n");
}
