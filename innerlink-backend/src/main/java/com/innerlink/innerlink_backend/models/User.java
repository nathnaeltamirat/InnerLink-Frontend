package com.innerlink.innerlink_backend.models;

public class User {
  private String id;
  private String email;
  private String alias;
  private String role;
  private String currentMood;
  private boolean isAnonymous;
  private boolean isAvailable;
  private int totalSoulsHelped;
  private String avatarUrl;
  private String createdAt;

  public User() {}

  public User(String id, String email, String alias, String role) {
    this.id = id;
    this.email = email;
    this.alias = alias;
    this.role = role;
  }

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public String getAlias() { return alias; }
  public void setAlias(String alias) { this.alias = alias; }
  public String getRole() { return role; }
  public void setRole(String role) { this.role = role; }
  public String getCurrentMood() { return currentMood; }
  public void setCurrentMood(String currentMood) { this.currentMood = currentMood; }
  public boolean isAnonymous() { return isAnonymous; }
  public void setAnonymous(boolean anonymous) { isAnonymous = anonymous; }
  public boolean isAvailable() { return isAvailable; }
  public void setAvailable(boolean available) { isAvailable = available; }
  public int getTotalSoulsHelped() { return totalSoulsHelped; }
  public void setTotalSoulsHelped(int totalSoulsHelped) { this.totalSoulsHelped = totalSoulsHelped; }
  public String getAvatarUrl() { return avatarUrl; }
  public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
  public String getCreatedAt() { return createdAt; }
  public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
