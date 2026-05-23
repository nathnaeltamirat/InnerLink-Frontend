package com.innerlink.innerlink_backend;
import io.vertx.ext.web.handler.BodyHandler;

import io.vertx.core.AbstractVerticle;
import io.vertx.ext.web.Router;

public class MainVerticle extends AbstractVerticle {

  @Override
  public void start() {
    Router mainRouter  = Router.router(vertx);
    mainRouter.route().handler(BodyHandler.create());
     vertx.createHttpServer().requestHandler(mainRouter).listen(8888).onSuccess(server -> 
      System.out.println("HTTP server started on port " + server.actualPort())
    ).onFailure(err->System.out.println("Failed to start HTTP server: " + err.getMessage()));
  }
}
