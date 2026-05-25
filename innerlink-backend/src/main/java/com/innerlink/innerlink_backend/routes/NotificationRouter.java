package com.innerlink.innerlink_backend.routes;

import io.vertx.core.Vertx;
import io.vertx.ext.web.Router;
import com.innerlink.innerlink_backend.controllers.NotificationController;

public class NotificationRouter {
  private final NotificationController notificationController;

  public NotificationRouter(Vertx vertx) {
    this.notificationController = new NotificationController(vertx);
  }

  public void setupRoutes(Router router) {
    router.get("/api/notifications/unread").handler(notificationController::getUnread);
    router.put("/api/notifications/:id/read").handler(notificationController::markAsRead);
    router.put("/api/notifications/read-all").handler(notificationController::markAllAsRead);
    System.out.println("✅ Notification routes setup");
  }
}
