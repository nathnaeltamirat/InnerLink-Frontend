package com.innerlink.innerlink_backend.models;

public class Post {
  private String id;
  private String userId;
  private String userAlias;
  private String content;
  private String imageUrl;
  private String postType;
  private String createdAt;

  public Post() {}

  public Post(String id, String userId, String content, String postType) {
    this.id = id;
    this.userId = userId;
    this.content = content;
    this.postType = postType;
  }

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getUserId() { return userId; }
  public void setUserId(String userId) { this.userId = userId; }
  public String getUserAlias() { return userAlias; }
  public void setUserAlias(String userAlias) { this.userAlias = userAlias; }
  public String getContent() { return content; }
  public void setContent(String content) { this.content = content; }
  public String getImageUrl() { return imageUrl; }
  public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
  public String getPostType() { return postType; }
  public void setPostType(String postType) { this.postType = postType; }
  public String getCreatedAt() { return createdAt; }
  public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
