import { pgTable, uuid, text, timestamp, integer, jsonb, primaryKey } from "drizzle-orm/pg-core"

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey(),
  nickname: text("nickname").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  youtubeUrl: text("youtube_url").notNull(),
  videoTitle: text("video_title"),
  videoThumbnail: text("video_thumbnail"),
  channelName: text("channel_name"),
  videoDurationSeconds: integer("video_duration_seconds"),
  videoViews: integer("video_views"),
  videoDescription: text("video_description"),
  video_id: text("video_id"), // ADDED: video_id column
  recipeName: text("recipe_name"),
  noRecipeFoundMessage: text("no_recipe_found_message"),
  summary: text("summary"),
  difficulty: text("difficulty"),
  cookingTimeMinutes: integer("cooking_time_minutes"),
  ingredients: jsonb("ingredients"),
  steps: jsonb("steps"),
  tips: jsonb("tips"),
  personalNotes: text("personal_notes").default(null),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

export const folders = pgTable("folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

export const recipeFolders = pgTable(
  "recipe_folders",
  {
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id")
      .notNull()
      .references(() => folders.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    pk: primaryKey(t.recipeId, t.folderId),
  }),
)

export const dailyUsage = pgTable("daily_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})
