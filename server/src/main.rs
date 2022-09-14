use actix::{Actor, Addr};
use actix_web::{web, App, Error, HttpRequest, HttpResponse, HttpServer};
use actix_web_actors::ws as ws_actors;
use lobby::Lobby;
use ws::HTTPActor;

mod game;
mod lobby;
mod messages;
mod ws;

lazy_static::lazy_static! {
    pub static ref LOBBY: Addr<Lobby> = lobby::Lobby::default().start();
}
async fn index(req: HttpRequest, stream: web::Payload) -> Result<HttpResponse, Error> {
    let resp = ws_actors::start(HTTPActor::new(), &req, stream);
    resp
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Server Started");

    HttpServer::new(move || App::new().route("/", web::get().to(index)))
        .bind(("127.0.0.1", 42069))?
        .run()
        .await?;

    Ok(())
}
