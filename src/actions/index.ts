import { defineAction, ActionError, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";
import {
  FeedbackEntries,
  FeedbackSources,
  FeedbackTags,
  and,
  db,
  eq,
  inArray,
} from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

async function getOwnedSource(sourceId: string, userId: string) {
  const [source] = await db
    .select()
    .from(FeedbackSources)
    .where(and(eq(FeedbackSources.id, sourceId), eq(FeedbackSources.userId, userId)));

  if (!source) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Feedback source not found.",
    });
  }

  return source;
}

async function getOwnedEntry(entryId: string, userId: string) {
  const [entry] = await db
    .select()
    .from(FeedbackEntries)
    .where(and(eq(FeedbackEntries.id, entryId), eq(FeedbackEntries.userId, userId)));

  if (!entry) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Feedback entry not found.",
    });
  }

  return entry;
}

export const server = {
  createFeedbackSource: defineAction({
    input: z.object({
      name: z.string().min(1),
      sourceType: z.string().optional(),
      description: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const [source] = await db
        .insert(FeedbackSources)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          name: input.name,
          sourceType: input.sourceType,
          description: input.description,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return {
        success: true,
        data: { source },
      };
    },
  }),

  updateFeedbackSource: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        name: z.string().min(1).optional(),
        sourceType: z.string().optional(),
        description: z.string().optional(),
      })
      .refine(
        (input) =>
          input.name !== undefined ||
          input.sourceType !== undefined ||
          input.description !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedSource(input.id, user.id);

      const [source] = await db
        .update(FeedbackSources)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.sourceType !== undefined ? { sourceType: input.sourceType } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          updatedAt: new Date(),
        })
        .where(eq(FeedbackSources.id, input.id))
        .returning();

      return {
        success: true,
        data: { source },
      };
    },
  }),

  listFeedbackSources: defineAction({
    input: z.object({}).optional(),
    handler: async (_input, context) => {
      const user = requireUser(context);

      const sources = await db
        .select()
        .from(FeedbackSources)
        .where(eq(FeedbackSources.userId, user.id));

      return {
        success: true,
        data: { items: sources, total: sources.length },
      };
    },
  }),

  createFeedbackEntry: defineAction({
    input: z.object({
      sourceId: z.string().min(1),
      channel: z.string().optional(),
      author: z.string().optional(),
      rating: z.number().optional(),
      rawText: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedSource(input.sourceId, user.id);

      const [entry] = await db
        .insert(FeedbackEntries)
        .values({
          id: crypto.randomUUID(),
          sourceId: input.sourceId,
          userId: user.id,
          channel: input.channel,
          author: input.author,
          rating: input.rating,
          rawText: input.rawText,
          createdAt: new Date(),
        })
        .returning();

      return {
        success: true,
        data: { entry },
      };
    },
  }),

  listFeedbackEntries: defineAction({
    input: z
      .object({
        sourceId: z.string().optional(),
      })
      .optional(),
    handler: async (input, context) => {
      const user = requireUser(context);
      const filters = [eq(FeedbackEntries.userId, user.id)];

      if (input?.sourceId) {
        await getOwnedSource(input.sourceId, user.id);
        filters.push(eq(FeedbackEntries.sourceId, input.sourceId));
      }

      const entries = await db
        .select()
        .from(FeedbackEntries)
        .where(and(...filters));

      return {
        success: true,
        data: { items: entries, total: entries.length },
      };
    },
  }),

  addFeedbackTag: defineAction({
    input: z.object({
      feedbackId: z.string().min(1),
      tag: z.string().min(1),
      sentiment: z.string().optional(),
      importance: z.number().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedEntry(input.feedbackId, user.id);

      const [feedbackTag] = await db
        .insert(FeedbackTags)
        .values({
          id: crypto.randomUUID(),
          feedbackId: input.feedbackId,
          tag: input.tag,
          sentiment: input.sentiment,
          importance: input.importance,
          createdAt: new Date(),
        })
        .returning();

      return {
        success: true,
        data: { tag: feedbackTag },
      };
    },
  }),

  listFeedbackTags: defineAction({
    input: z
      .object({
        feedbackId: z.string().optional(),
      })
      .optional(),
    handler: async (input, context) => {
      const user = requireUser(context);
      const filters = [];

      if (input?.feedbackId) {
        await getOwnedEntry(input.feedbackId, user.id);
        filters.push(eq(FeedbackTags.feedbackId, input.feedbackId));
      } else {
        const entries = await db
          .select({ id: FeedbackEntries.id })
          .from(FeedbackEntries)
          .where(eq(FeedbackEntries.userId, user.id));

        const ids = entries.map((row) => row.id);
        if (ids.length === 0) {
          return { success: true, data: { items: [], total: 0 } };
        }

        filters.push(inArray(FeedbackTags.feedbackId, ids));
      }

      const tags = await db
        .select()
        .from(FeedbackTags)
        .where(and(...filters));

      return {
        success: true,
        data: { items: tags, total: tags.length },
      };
    },
  }),
};
