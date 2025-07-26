import { pgTable, uuid, text, timestamp, integer, jsonb, primaryKey, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"


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


export const dailyUsage = pgTable("daily_usage_limits", {
  userId: uuid("user_id").notNull(),
  usageDate: text("usage_date").notNull(),
  count: integer("count").notNull().default(0),
}, (t) => ({
  pk: primaryKey(t.userId, t.usageDate),
}))

export const popularRecipesDaily = pgTable("popular_recipes_daily", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeName: text("recipe_name").notNull(),
  saveDate: text("save_date").notNull().default(sql`CURRENT_DATE`),
  yearMonth: text("year_month").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const popularRecipesSummary = pgTable(
  "popular_recipes_summary",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeName: text("recipe_name").notNull(),
    yearMonth: text("year_month").notNull(),
    recentCount: integer("recent_count").notNull().default(0),
    oldCount: integer("old_count").notNull().default(0),
    weightedScore: integer("weighted_score").notNull().default(0),
    lastUpdated: text("last_updated").default(sql`CURRENT_DATE`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    // 복합 유니크 키
    uniqueRecipeMonth: unique().on(t.recipeName, t.yearMonth),
  })
)

export const recentlyViewedRecipes = pgTable("recently_viewed_recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  videoTitle: text("video_title").notNull(),
  channelName: text("channel_name").notNull(),
  youtubeUrl: text("youtube_url").notNull(),
  videoThumbnail: text("video_thumbnail"),
  summary: text("summary"),
  viewedAt: timestamp("viewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }),
  recipeName: text("recipe_name").notNull(),
  difficulty: text("difficulty"),
  cookingTimeMinutes: integer("cooking_time_minutes"),
  ingredients: jsonb("ingredients"),
  steps: jsonb("steps"),
  tips: jsonb("tips"),
  videoDescription: text("video_description"),
  noRecipeFoundMessage: text("no_recipe_found_message"),
  videoDurationSeconds: integer("video_duration_seconds"),
  videoViews: integer("video_views"),
  personalNotes: text("personal_notes"),
  savedRecipeId: uuid("saved_recipe_id").references(() => recipes.id),
})


