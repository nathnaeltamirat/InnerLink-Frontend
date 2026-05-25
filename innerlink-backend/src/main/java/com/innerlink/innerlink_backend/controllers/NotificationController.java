package com.innerlink.innerlink_backend.controllers;

import io.vertx.core.Vertx;
import io.vertx.ext.web.RoutingContext;
import com.innerlink.innerlink_backend.services.NotificationService;

public class NotificationController {
  private final NotificationService notificationService;

  public NotificationController(Vertx vertx) {
    this.notificationService = new NotificationService(vertx);
  }

  public void getUnread(RoutingContext ctx) {
    String token = ctx.request().getHeader("Authorization");
    notificationService.getUnreadNotifications(token)
      .onSuccess(notifications -> ctx.json(notifications))
      .onFailure(err -> ctx.response().setStatusCode(500).end(err.getMessage()));
  }

  public void markAsRead(RoutingContext ctx) {
    String id = ctx.request().getParam("id");
    notificationService.markAsRead(id)
      .onSuccess(v -> ctx.response().setStatusCode(200).end())
      .onFailure(err -> ctx.response().setStatusCode(500).end(err.getMessage()));
  }

  public void markAllAsRead(RoutingContext ctx) {
    String token = ctx.request().getHeader("Authorization");
    notificationService.markAllAsRead(token)
      .onSuccess(v -> ctx.response().setStatusCode(200).end())
      .onFailure(err -> ctx.response().setStatusCode(500).end(err.getMessage()));
  }
}
