use actix::{Actor, AsyncContext, Context};

use std::time::{Duration, Instant};

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
