-- daily_usage_limits table
CREATE TABLE IF NOT EXISTS daily_usage_limits (
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    usage_date DATE NOT NULL, -- KST 기준 날짜 (YYYY-MM-DD)
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, usage_date) -- user_id와 날짜별로 고유
);

-- RLS policies for daily_usage_limits
ALTER TABLE daily_usage_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own daily usage." ON daily_usage_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own daily usage." ON daily_usage_limits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own daily usage." ON daily_usage_limits FOR UPDATE USING (auth.uid() = user_id);
