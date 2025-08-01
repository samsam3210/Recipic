# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Recipick is a Korean YouTube recipe extraction service built with Next.js that uses AI to extract recipes from YouTube cooking videos. The app allows users to save, organize, and track recipes with folder management and usage analytics.

## Key Technologies

- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL with Drizzle ORM 
- **Authentication**: Supabase Auth
- **AI**: Google Gemini AI for recipe extraction
- **UI**: Tailwind CSS with Radix UI components
- **Language**: TypeScript

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Architecture Overview

### Database Schema (`lib/db/schema.ts`)
- `profiles` - User profile information
- `recipes` - Recipe data with YouTube metadata and AI-extracted recipe content
- `folders` - User-created recipe folders
- `recipeFolders` - Many-to-many relationship between recipes and folders
- `dailyUsage` - User usage tracking
- `popularRecipesDaily` / `popularRecipesSummary` - Popular recipe analytics

### Core Data Flow
1. User submits YouTube URL via `/extract` page
2. YouTube metadata and transcript fetched via `/api/youtube` endpoints
3. AI recipe extraction via `/api/gemini/route.ts` using Google Gemini
4. Recipe saved to database with optional folder assignment
5. Users can view, organize, and manage recipes through dashboard

### Key Directories
- `/app` - Next.js App Router pages and API routes
- `/components` - Reusable UI components (main components + `/ui` shadcn components)
- `/lib/actions` - Server actions for database operations
- `/lib/db` - Database configuration and schema
- `/lib/supabase` - Supabase client/server setup
- `/contexts` - React context providers (user authentication)

### Authentication & User Management
- Supabase authentication handles user sessions
- `UserProvider` context provides user state throughout app
- Server actions validate user permissions before database operations
- User profiles created automatically on first login

### Recipe Processing Pipeline
- YouTube URL → metadata extraction → transcript fetching → AI processing → database storage
- AI prompt includes both video transcript with timestamps and video description
- Recipe extraction includes ingredients with quantities, step-by-step instructions with timestamps, and cooking tips

### Important Implementation Details
- All server actions validate user authentication via Supabase
- Recipe steps include `youtubeTimestampSecond` for video navigation
- Ingredients include quantity parsing and usage tracking per cooking step
- Popular recipes are tracked with weighted scoring system
- Daily usage limits are enforced per user

## Deployment Trigger
This comment is added to trigger Vercel deployment - 2025-08-01 15:30:00