use actix_http::HttpMessage;
use actix_web::{middleware, web, App, Error, HttpRequest, HttpResponse, HttpServer};
use actix_web_actors::ws;
use actix_web_httpauth::middleware::HttpAuthentication;
use dotenv::from_path;
use handlers::client::ClientActor;
use serde_json::json;

use std::{env, net::Ipv4Addr, path};

use crate::{
    db::{run_migrations, validator},
    handlers::contract_methods::set_default_attributes,
};

mod db;
mod handlers;
mod types;

lazy_static::lazy_static! {
    pub static ref ENV_PATH: path::PathBuf = {
        let mut abs_path = env::current_dir().unwrap();

        abs_path.pop();

        abs_path.join("client/.env").to_owned()
    };

    pub static ref SERVER_URL: (Ipv4Addr, u16) = {
        let url = env::var("SERVER_URL").expect("Error fetching database url");

        let args: Vec<&str> = url.split(":").collect();

        let ip = args.get(0).unwrap().parse::<Ipv4Addr>().unwrap();

        let port = args.get(1).unwrap().parse::<u16>().unwrap();

        (ip, port)
    };
}

async fn index(req: HttpRequest, stream: web::Payload) -> Result<HttpResponse, Error> {
    let ext = req.extensions();
    let act: ClientActor = ext.get::<ClientActor>().unwrap().to_owned();

    match ws::start(act, &req, stream) {
        Ok(res) => Ok(res),

        Err(e) => Err(e),
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Server Started");

    from_path(&*ENV_PATH).expect("Error fetching env variables");
    // run_migrations();

    // let attributes = json!({//must match PlayerAttributes type at game\entities\player.ts
    //     "attack_speed": 0.5,
    //     "hp": 100,
    //     "hp_regen": 1,
    //     "max_hp": 100,
    //     "max_mp": 100,
    //     "mp": 100,
    //     "mp_regen": 1,
    //     "speed": 200
    // });

    // match set_default_attributes(&attributes).await {
    //     Ok(res) => println!("attributes set"),
    //     Err(e) => println!("contract error {}", e),
    // }

    HttpServer::new(move || {
        App::new()
            .wrap(middleware::Logger::default())
            .wrap(HttpAuthentication::basic(validator))
            .route("/", web::get().to(index))
    })
    .bind(*SERVER_URL)?
    .run()
    .await?;

    Ok(())
}
