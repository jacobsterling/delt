use actix::{Actor, ActorFutureExt, AsyncContext, Context, Handler, WrapFuture};
use chrono::Local;
use diesel::{prelude::*, update};

use std::time::{Duration, Instant};

use crate::{db::DB, types::UserId};

use super::{
    contract_methods::{give_xp, kill_character},
    messages::PlayerSessionResolve,
    schema,
};

const GLOBAL_TICK_INTERVAL: Duration = Duration::from_millis(1000 / 60);
pub struct GlobalActor {
    tick: Instant,
}

impl Default for GlobalActor {
    fn default() -> Self {
        Self {
            tick: Instant::now(),
        }
    }
}

impl Actor for GlobalActor {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        //load tasks from db and execute ?

        ctx.run_interval(GLOBAL_TICK_INTERVAL, |act, _ctx| {
            act.tick = Instant::now();
        });
    }
}

impl Handler<PlayerSessionResolve> for GlobalActor {
    type Result = ();

    fn handle(
        &mut self,
        PlayerSessionResolve {
            session_id,
            account_id,
            xp,
        }: PlayerSessionResolve,
        ctx: &mut Self::Context,
    ) {
        ctx.spawn(
            async move {
                match xp {
                    Some(xp) => match give_xp(&account_id, &xp).await {
                        Ok(_) => Ok(account_id),
                        Err(e) => Err(e),
                    },

                    None => match kill_character(&account_id).await {
                        Ok(_) => Ok(account_id),
                        Err(e) => Err(e),
                    },
                }
            }
            .into_actor(self)
            .map(move |res, _act, _ctx| match res {
                Ok(account_id) => {
                    let mut db = DB.get();

                    let conn = db.as_mut().unwrap();

                    use schema::accounts::dsl::{account_id as id, accounts, user_id};

                    match accounts
                        .filter(id.eq(account_id.to_string()))
                        .select(user_id)
                        .get_result::<UserId>(conn)
                    {
                        Ok(uid) => {
                            use schema::player_sessions::dsl::{
                                player_sessions, resolved_at, session_id as id, user_id,
                            };

                            match update(player_sessions)
                                .filter(id.eq(session_id).and(user_id.eq(uid)))
                                .set(resolved_at.eq(Local::now().naive_local()))
                                .execute(conn)
                            {
                                Ok(_) => {}

                                Err(e) => println!("[Server] DB Error: {}", e.to_string()),
                            }
                        }

                        Err(e) => println!("[Server] Internal Error: {}", e.to_string()),
                    }
                }
                Err(e) => println!("[Server] RPC Error: {}", e.to_string()),
            }),
        );
    }
}
