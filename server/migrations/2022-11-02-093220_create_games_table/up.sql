CREATE TABLE games (
  id VARCHAR ( 50 ) PRIMARY KEY,
  creator VARCHAR NOT NULL,
  FOREIGN KEY(creator)
    REFERENCES users,
  result JSON,
  pool_id TEXT UNIQUE,
  lvl_required INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  logs JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id VARCHAR NOT NULL,
  FOREIGN KEY(game_id)
    REFERENCES games,
  creator VARCHAR NOT NULL,
  FOREIGN KEY(creator)
    REFERENCES users,
  password VARCHAR,
  private BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logs JSONB NOT NULL DEFAULT '{}',
  state JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE whitelist (
  session_id uuid,
  user_id VARCHAR( 50 ),
  PRIMARY KEY(session_id, user_id),
  FOREIGN KEY(session_id)
    REFERENCES sessions,
  FOREIGN KEY(user_id)
    REFERENCES users
);

CREATE TABLE player_sessions(
  session_id uuid NOT NULL,
  user_id VARCHAR (50) NOT NULL,
  PRIMARY KEY(session_id, user_id),
  FOREIGN KEY(session_id)
    REFERENCES sessions,
  FOREIGN KEY(user_id)
    REFERENCES users,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  info JSONB NOT NULL
);
