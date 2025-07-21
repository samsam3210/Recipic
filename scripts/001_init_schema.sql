-- Enable uuid-ossp extension for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- recipes table
CREATE TABLE recipes (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
user_id UUID REFERENCES auth.users(id) NOT NULL,
youtube_url TEXT NOT NULL,
video_title TEXT,
video_thumbnail TEXT,
channel_name TEXT,
video_duration_seconds INTEGER,
video_views INTEGER,
recipe_name TEXT,
no_recipe_found_message TEXT,
summary TEXT,
difficulty TEXT,
cooking_time_minutes INTEGER,
ingredients JSONB, -- Store as JSONB array of objects
steps JSONB,       -- Store as JSONB array of objects
tips JSONB,        -- Store as JSONB array of objects
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- folders table
CREATE TABLE folders (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
user_id UUID REFERENCES auth.users(id) NOT NULL,
name TEXT NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- recipe_folders (junction table for many-to-many relationship)
CREATE TABLE recipe_folders (
recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
PRIMARY KEY (recipe_id, folder_id)
);

-- RLS policies for recipes
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own recipes." ON recipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recipes." ON recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recipes." ON recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recipes." ON recipes FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for folders
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own folders." ON folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own folders." ON folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own folders." ON folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own folders." ON folders FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for recipe_folders
ALTER TABLE recipe_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own recipe_folders." ON recipe_folders FOR SELECT USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_folders.recipe_id AND recipes.user_id = auth.uid()));
CREATE POLICY "Users can insert their own recipe_folders." ON recipe_folders FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_folders.recipe_id AND recipes.user_id = auth.uid()));
CREATE POLICY "Users can delete their own recipe_folders." ON recipe_folders FOR DELETE USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_folders.recipe_id AND recipes.user_id = auth.uid()));
