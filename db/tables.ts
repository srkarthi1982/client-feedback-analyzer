import { defineTable, column, NOW } from "astro:db";

export const FeedbackSources = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),                        // owner of this feedback collection
    name: column.text(),                          // e.g. "Website feedback form", "App Store reviews"
    sourceType: column.text({ optional: true }),  // "survey", "email", "nps", "review", etc.
    description: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const FeedbackEntries = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    sourceId: column.text({
      references: () => FeedbackSources.columns.id,
    }),
    userId: column.text(),                        // same owner as source, for easier querying
    channel: column.text({ optional: true }),     // "email", "web", "play-store", etc.
    author: column.text({ optional: true }),      // customer name or identifier
    rating: column.number({ optional: true }),    // e.g. 1-5 stars or NPS
    rawText: column.text(),                       // original feedback text
    createdAt: column.date({ default: NOW }),
  },
});

export const FeedbackTags = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    feedbackId: column.text({
      references: () => FeedbackEntries.columns.id,
    }),
    tag: column.text(),                           // "pricing", "support", "performance", etc.
    sentiment: column.text({ optional: true }),   // "positive", "neutral", "negative"
    importance: column.number({ optional: true }),// e.g. 1-3 or 1-5
    createdAt: column.date({ default: NOW }),
  },
});

export const tables = {
  FeedbackSources,
  FeedbackEntries,
  FeedbackTags,
} as const;
