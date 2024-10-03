-- CreateTable
CREATE TABLE "__diesel_schema_migrations" (
    "version" VARCHAR(50) NOT NULL,
    "run_on" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "__diesel_schema_migrations_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "accounts" (
    "account_id" VARCHAR(50) NOT NULL,
    "user_id" VARCHAR(50) NOT NULL,
    "public_key" TEXT NOT NULL,
    "interactions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("account_id")
);

-- CreateTable
CREATE TABLE "games" (
    "game_id" VARCHAR(50) NOT NULL,
    "creator" VARCHAR(50) NOT NULL,
    "result" JSON,
    "pool_id" TEXT,
    "xp_required" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(6),
    "logs" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "games_pkey" PRIMARY KEY ("game_id")
);

-- CreateTable
CREATE TABLE "roles" (
    "user_id" VARCHAR(50) NOT NULL,
    "role" VARCHAR(255) NOT NULL,
    "grant_date" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("user_id","role")
);

-- CreateTable
CREATE TABLE "sessions" (
    "session_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "game_id" VARCHAR(50) NOT NULL,
    "creator" VARCHAR(50) NOT NULL,
    "password" VARCHAR(50),
    "private" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(6),
    "last_update" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "logs" JSONB NOT NULL DEFAULT '{}',
    "state" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "authtoken" TEXT NOT NULL,
    "session_id" UUID NOT NULL,
    "user_id" VARCHAR(50) NOT NULL,
    "player_info" JSONB NOT NULL,
    "started_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(6),

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("authtoken")
);

-- CreateTable
CREATE TABLE "user_stats" (
    "user_id" VARCHAR(50) NOT NULL,
    "play_time" interval NOT NULL DEFAULT '00:00:00',
    "player_kills" INTEGER NOT NULL DEFAULT 0,
    "mob_kills" INTEGER NOT NULL DEFAULT 0,
    "boss_kills" INTEGER NOT NULL DEFAULT 0,
    "xp_gained" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_stats_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" VARCHAR(50) NOT NULL,
    "password" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "whitelist" (
    "session_id" UUID NOT NULL,
    "user_id" VARCHAR(50) NOT NULL,

    CONSTRAINT "whitelist_pkey" PRIMARY KEY ("session_id","user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_creator_fkey" FOREIGN KEY ("creator") REFERENCES "accounts"("account_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_creator_fkey" FOREIGN KEY ("creator") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("game_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("session_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "whitelist" ADD CONSTRAINT "whitelist_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("session_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "whitelist" ADD CONSTRAINT "whitelist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
