CREATE TYPE "public"."auth_provider" AS ENUM('FIREBASE', 'LEGACY');--> statement-breakpoint
CREATE TYPE "public"."host_status_enum" AS ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."host_application_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."post_type" AS ENUM('GENERAL', 'ACHIEVEMENT', 'TOURNAMENT_UPDATE');