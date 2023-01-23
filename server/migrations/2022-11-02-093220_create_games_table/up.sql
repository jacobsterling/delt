CREATE TABLE games (
  id VARCHAR ( 50 ) PRIMARY KEY,
  creator VARCHAR NOT NULL,
  FOREIGN KEY(creator)
    REFERENCES users,
  config JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  expiry TIMESTAMP
);

CREATE TABLE pools (
  id TEXT PRIMARY KEY,
  result JSONB,
  registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id VARCHAR NOT NULL,
  FOREIGN KEY(game_id)
    REFERENCES games,
  pool_id TEXT,
  FOREIGN KEY(pool_id)
    REFERENCES pools,
  creator VARCHAR NOT NULL,
  FOREIGN KEY(creator)
    REFERENCES users,
  password VARCHAR,
  private BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logs JSONB NOT NULL DEFAULT '{}',
  state JSONB NOT NULL
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
  account_id VARCHAR,
  FOREIGN KEY(account_id)
    REFERENCES accounts,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  resolved_at TIMESTAMP,
  info JSONB
);
