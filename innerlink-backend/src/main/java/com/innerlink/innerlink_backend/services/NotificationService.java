package com.innerlink.innerlink_backend.services;

import io.vertx.core.Vertx;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonObject;
import io.vertx.core.json.JsonArray;
import io.vertx.sqlclient.Row;
import io.vertx.sqlclient.Tuple;
import com.innerlink.innerlink_backend.config.DatabaseConfig;

import java.util.UUID;

public class NotificationService {
  private final Vertx vertx;

  public NotificationService(Vertx vertx) {
    this.vertx = vertx;
  }

  public Future<JsonArray> getUnreadNotifications(String token) {
    Promise<JsonArray> promise = Promise.promise();

    DatabaseConfig.getClient()
      .preparedQuery("""
                SELECT n.* FROM notifications n
                JOIN sessions s ON n.user_id = s.user_id
                WHERE s.token = ? AND n.is_read = 0
                ORDER BY n.created_at DESC
            """)
      .execute(Tuple.of(token))
      .onSuccess(rows -> {
        JsonArray result = new JsonArray();
        rows.forEach(row -> result.add(notificationToJson(row)));
        promise.complete(result);
      })
      .onFailure(promise::fail);

    return promise.future();
  }

  public Future<Void> markAsRead(String id) {
    Promise<Void> promise = Promise.promise();

    DatabaseConfig.getClient()
      .preparedQuery("UPDATE notifications SET is_read = 1 WHERE id = ?")
      .execute(Tuple.of(id))
      .onSuccess(v -> promise.complete())
      .onFailure(promise::fail);

    return promise.future();
  }

  public Future<Void> markAllAsRead(String token) {
    Promise<Void> promise = Promise.promise();

    DatabaseConfig.getClient()
      .preparedQuery("""
                UPDATE notifications n
                JOIN sessions s ON n.user_id = s.user_id
                SET n.is_read = 1
                WHERE s.token = ?
            """)
      .execute(Tuple.of(token))
      .onSuccess(v -> promise.complete())
      .onFailure(promise::fail);

    return promise.future();
  }

  public Future<Void> createNotification(String userId, String type, String message) {
    Promise<Void> promise = Promise.promise();

    String id = UUID.randomUUID().toString();

    DatabaseConfig.getClient()
      .preparedQuery("INSERT INTO notifications (id, user_id, type, message) VALUES (?, ?, ?, ?)")
      .execute(Tuple.of(id, userId, type, message))
      .onSuccess(v -> promise.complete())
      .onFailure(promise::fail);

    return promise.future();
  }

  private JsonObject notificationToJson(Row row) {
    JsonObject json = new JsonObject();
    json.put("id", row.getString("id"));
    json.put("type", row.getString("type"));
    json.put("message", row.getString("message"));
    json.put("isRead", row.getInteger("is_read") == 1);
    json.put("createdAt", row.getLocalDateTime("created_at").toString());
    return json;
  }
}
