package com.innerlink.innerlink_backend.services;

import io.vertx.core.Vertx;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonObject;
import io.vertx.core.json.JsonArray;
import io.vertx.sqlclient.Row;
import io.vertx.sqlclient.Tuple;
import com.innerlink.innerlink_backend.config.DatabaseConfig;

import java.util.ArrayList;
import java.util.List;

public class UserService {
  private final Vertx vertx;

  public UserService(Vertx vertx) {
    this.vertx = vertx;
  }

  public Future<JsonObject> getUserById(String userId) {
    Promise<JsonObject> promise = Promise.promise();

    DatabaseConfig.getClient()
      .preparedQuery("SELECT * FROM users WHERE id = ?")
      .execute(Tuple.of(userId))
      .onSuccess(rows -> {
        if (rows.size() == 0) {
          promise.fail("User not found");
          return;
        }
        Row row = rows.iterator().next();
        promise.complete(userToJson(row));
      })
      .onFailure(promise::fail);

    return promise.future();
  }

  public Future<JsonObject> updateUser(String userId, JsonObject data) {
    Promise<JsonObject> promise = Promise.promise();

    List<String> updates = new ArrayList<>();
    List<Object> params = new ArrayList<>();

    if (data.containsKey("alias")) {
      updates.add("alias = ?");
      params.add(data.getString("alias"));
    }
    if (data.containsKey("currentMood")) {
      updates.add("current_mood = ?");
      params.add(data.getString("currentMood"));
    }
    if (data.containsKey("isAnonymous")) {
      updates.add("is_anonymous = ?");
      params.add(data.getBoolean("isAnonymous") ? 1 : 0);
    }
    if (data.containsKey("avatarUrl")) {
      updates.add("avatar_url = ?");
      params.add(data.getString("avatarUrl"));
    }

    if (updates.isEmpty()) {
      promise.complete(new JsonObject().put("success", true));
      return promise.future();
    }

    String query = "UPDATE users SET " + String.join(", ", updates) + " WHERE id = ?";
    params.add(userId);

    DatabaseConfig.getClient()
      .preparedQuery(query)
      .execute(Tuple.from(params))
      .onSuccess(v -> {
        // Fetch updated user
        getUserById(userId)
          .onSuccess(user -> promise.complete(user))
          .onFailure(promise::fail);
      })
      .onFailure(promise::fail);

    return promise.future();
  }

  public Future<JsonObject> getProfile(String userId) {
    return getUserById(userId);
  }

  public Future<JsonObject> toggleAvailability(String userId, boolean isAvailable) {
    Promise<JsonObject> promise = Promise.promise();

    DatabaseConfig.getClient()
      .preparedQuery("UPDATE users SET is_available = ? WHERE id = ?")
      .execute(Tuple.of(isAvailable ? 1 : 0, userId))
      .onSuccess(v -> promise.complete(new JsonObject().put("success", true).put("isAvailable", isAvailable)))
      .onFailure(promise::fail);

    return promise.future();
  }

  public Future<JsonArray> getAllVolunteers() {
    Promise<JsonArray> promise = Promise.promise();

    DatabaseConfig.getClient()
      .preparedQuery("SELECT * FROM users WHERE role = 'volunteer'")
      .execute()
      .onSuccess(rows -> {
        JsonArray result = new JsonArray();
        rows.forEach(row -> result.add(userToJson(row)));
        promise.complete(result);
      })
      .onFailure(promise::fail);

    return promise.future();
  }

  public Future<JsonArray> getAvailableVolunteers() {
    Promise<JsonArray> promise = Promise.promise();

    DatabaseConfig.getClient()
      .preparedQuery("SELECT * FROM users WHERE role = 'volunteer' AND is_available = 1")
      .execute()
      .onSuccess(rows -> {
        JsonArray result = new JsonArray();
        rows.forEach(row -> result.add(userToJson(row)));
        promise.complete(result);
      })
      .onFailure(promise::fail);

    return promise.future();
  }

  public Future<JsonArray> getWaitingSupportRequests() {
    Promise<JsonArray> promise = Promise.promise();

    DatabaseConfig.getClient()
      .preparedQuery("SELECT * FROM support_requests WHERE status = 'waiting' ORDER BY created_at DESC")
      .execute()
      .onSuccess(rows -> {
        JsonArray result = new JsonArray();
        rows.forEach(row -> result.add(supportRequestToJson(row)));
        promise.complete(result);
      })
      .onFailure(promise::fail);

    return promise.future();
  }

  public Future<Void> acceptSupportRequest(String id, String token) {
    Promise<Void> promise = Promise.promise();

    // Get volunteer ID from token
    DatabaseConfig.getClient()
      .preparedQuery("SELECT user_id FROM sessions WHERE token = ?")
      .execute(Tuple.of(token))
      .onSuccess(rows -> {
        if (rows.size() == 0) {
          promise.fail("Invalid token");
          return;
        }
        String volunteerId = rows.iterator().next().getString("user_id");

        // Update support request
        DatabaseConfig.getClient()
          .preparedQuery("UPDATE support_requests SET status = 'accepted', volunteer_id = ?, accepted_at = NOW() WHERE id = ?")
          .execute(Tuple.of(volunteerId, id))
          .onSuccess(v -> promise.complete())
          .onFailure(promise::fail);
      })
      .onFailure(promise::fail);

    return promise.future();
  }

  public Future<JsonObject> getRippleStats() {
    Promise<JsonObject> promise = Promise.promise();

    DatabaseConfig.getClient()
      .preparedQuery("SELECT COUNT(*) as waiting FROM support_requests WHERE status = 'waiting'")
      .execute()
      .compose(rows -> {
        int waiting = rows.iterator().next().getInteger("waiting");

        return DatabaseConfig.getClient()
          .preparedQuery("SELECT SUM(total_souls_helped) as total FROM users WHERE role = 'volunteer'")
          .execute()
          .map(rows2 -> {
            int total = rows2.iterator().next().getInteger("total");
            JsonObject result = new JsonObject();
            result.put("waitingCount", waiting);
            result.put("soulsHelped", total);
            result.put("globalListeners", 1240); // Fixed for demo
            return result;
          });
      })
      .onSuccess(promise::complete)
      .onFailure(promise::fail);

    return promise.future();
  }

  private JsonObject supportRequestToJson(Row row) {
    JsonObject json = new JsonObject();
    json.put("id", row.getString("id"));
    json.put("requesterId", row.getString("requester_id"));
    json.put("volunteerId", row.getString("volunteer_id"));
    json.put("urgencyLevel", row.getString("urgency_level"));
    json.put("openingMessage", row.getString("opening_message"));
    json.put("tags", row.getString("tags"));
    json.put("status", row.getString("status"));
    json.put("createdAt", row.getLocalDateTime("created_at").toString());
    json.put("acceptedAt", row.getLocalDateTime("accepted_at") != null ? row.getLocalDateTime("accepted_at").toString() : null);
    return json;
  }

  private JsonObject userToJson(Row row) {
    JsonObject json = new JsonObject();
    json.put("id", row.getString("id"));
    json.put("email", row.getString("email"));
    json.put("alias", row.getString("alias"));
    json.put("role", row.getString("role"));
    json.put("currentMood", row.getString("current_mood") != null ? row.getString("current_mood") : "Meditative");
    json.put("isAnonymous", row.getInteger("is_anonymous") == 1);
    json.put("isAvailable", row.getInteger("is_available") != null && row.getInteger("is_available") == 1);
    json.put("totalSoulsHelped", row.getInteger("total_souls_helped") != null ? row.getInteger("total_souls_helped") : 0);
    json.put("avatarUrl", row.getString("avatar_url"));
    return json;
  }
}
