CREATE TABLE users (
	id VARCHAR ( 50 ) PRIMARY KEY,
	password VARCHAR NOT NULL,
	email VARCHAR UNIQUE NOT NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE TABLE accounts (
  account_id VARCHAR PRIMARY KEY,
  user_id VARCHAR( 50 ) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users,
  interactions INT NOT NULL DEFAULT 0 --number of contract interactions made through server
);

CREATE TABLE roles(
   user_id VARCHAR ( 50 ) NOT NULL,
   role VARCHAR,
   grant_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   PRIMARY KEY (user_id, role),
   FOREIGN KEY (user_id)
      REFERENCES users
);

CREATE TABLE user_sessions (
  auth_token text PRIMARY KEY,
  user_id VARCHAR( 50 ) NOT NULL,
  FOREIGN KEY(user_id)
    REFERENCES users,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  connection_created_at TIMESTAMP,
  connection_ended_at TIMESTAMP
);