package com.maxchauo.skillswapz.controller.post;

import com.maxchauo.skillswapz.data.dto.post.CategoryDto;
import com.maxchauo.skillswapz.data.form.post.CommentForm;
import com.maxchauo.skillswapz.data.form.post.PostBookmarkForm;
import com.maxchauo.skillswapz.data.form.post.PostForm;
import com.maxchauo.skillswapz.data.form.post.PostLikeForm;
import com.maxchauo.skillswapz.service.post.PostService;

import lombok.extern.log4j.Log4j2;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Log4j2
@CrossOrigin
@RestController
@RequestMapping("api/1.0/post")
public class PostController {
    private final PostService service;
    private final SimpMessagingTemplate messagingTemplate;

    public PostController(PostService service, SimpMessagingTemplate messagingTemplate) {
        this.service = service;
        this.messagingTemplate = messagingTemplate;
    }


    @PostMapping
    public ResponseEntity<?> insertPost(@ModelAttribute PostForm postForm) {
        try {
            Integer postId = service.getPostId(postForm);
            postForm.setPostId(postId);

            Map<String, Object> message = Map.of("type", "CREATE_POST", "content", postForm);
            messagingTemplate.convertAndSend("/topic/post", message);
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("type", "ERROR", "content", e.getMessage()));
        }
    }


    @DeleteMapping("/{postId}")
    public ResponseEntity<?> deletePost(@PathVariable int postId, @RequestParam int userId) {
        try {
            boolean deleted = service.deletePost(postId, userId);
            if (deleted) {
                Map<String, Object> message =
                        Map.of("type", "DELETE_POST", "content", Map.of("postId", postId));
                messagingTemplate.convertAndSend("/topic/post", message);
                return ResponseEntity.ok(message);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("type", "ERROR", "content", e.getMessage()));
        }
    }

    @PostMapping("/comment")
    public ResponseEntity<Map<String, Object>> insertComment(
            @RequestBody CommentForm commentForm) {
        try {
            CommentForm createdComment = service.insertComment(commentForm);
            System.out.println(commentForm);
            Map<String, Object> message =
                    Map.of("type", "CREATE_COMMENT", "content", createdComment);
            messagingTemplate.convertAndSend("/topic/post", message);
            System.out.println(message);
            return ResponseEntity.ok(message);

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("type", "ERROR", "content", e.getMessage()));
        }
    }

    @DeleteMapping("/comment/{commentId}")
    public ResponseEntity<?> deleteComment(@PathVariable int commentId, @RequestParam int userId) {
        try {
            Map<String, Object> messageContent = service.deleteComment(commentId, userId);
            if (messageContent != null) {
                Map<String, Object> message = Map.of(
                        "type", "DELETE_COMMENT",
                        "content", messageContent
                );
                messagingTemplate.convertAndSend("/topic/post", message);
                return ResponseEntity.ok(message);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("type", "ERROR", "content", e.getMessage()));
        }
    }

    @GetMapping("/{postId}/comments")
    public ResponseEntity<List<CommentForm>> getCommentsByPostId(@PathVariable int postId) {
        try {
            List<CommentForm> comments = service.getCommentsByPostId(postId);
            return ResponseEntity.ok(comments);
        } catch (Exception e) {
            log.error("Error fetching comments for postId: {}", postId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null);          }
    }


    @PostMapping("/bookMark")
    public ResponseEntity<?> toggleBookMark(@RequestBody PostBookmarkForm bookmark) {
        String message = service.toggleBookMark(bookmark);
        return ResponseEntity.ok().body(message);
    }

    @PostMapping("/like")
    public ResponseEntity<Map<String, Object>> toggleLike(@RequestBody PostLikeForm likeForm) {
        try {
            boolean isLiked = service.toggleLike(likeForm);
            int likeCount = service.getLikeCountByPostId(likeForm.getPostId());
            Map<String, Object> message;
            if (isLiked) {
                message =
                        Map.of(
                                "type",
                                "LIKE_POST",
                                "content",
                                Map.of("postId", likeForm.getPostId(), "likeCount", likeCount));
            } else {
                message =
                        Map.of(
                                "type",
                                "UNLIKE_POST",
                                "content",
                                Map.of("postId", likeForm.getPostId(), "likeCount", likeCount));
            }
            messagingTemplate.convertAndSend("/topic/post", message);
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            Map<String, Object> errorMessage = Map.of("type", "ERROR", "content", e.getMessage());
            return ResponseEntity.badRequest().body(errorMessage);
        }
    }

    @GetMapping
    public ResponseEntity<?> getPosts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "date") String sortType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "11") int size
    ) {
        try {
            List<PostForm> posts;

            if (keyword != null && !keyword.trim().isEmpty()) {
                log.info("Searching posts with keyword: {}, sortType: {}, page: {}, size: {}", keyword, sortType, page, size);
                posts = service.searchPost(keyword, sortType, page, size);
            } else {
                log.info("Fetching latest posts for page: {}, size: {}", page, size);
                posts = service.getLatestPosts(page, size);
            }

            if (posts.isEmpty()) {
                log.info("No posts found");
                return ResponseEntity.noContent().build();
            }

            log.info("Returning {} posts", posts.size());
            return ResponseEntity.ok(posts);
        } catch (Exception e) {
            log.error("Error fetching posts", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching posts: " + e.getMessage());
        }
    }

    @GetMapping("/{postId}")
    public ResponseEntity<?> getPostDetail(@PathVariable int postId) {
        try {
            PostForm post = service.getPostDetail(postId);
            return ResponseEntity.ok(post);
        } catch (IllegalArgumentException e) {
            log.error("Error retrieving post with postId: {}", postId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Serialization issue occurred for postId: " + postId));
        } catch (Exception e) {
            log.error("Error fetching post with postId: {}", postId, e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<PostForm>> getPostsByUserId(@PathVariable Integer userId) {
        List<PostForm> userPosts = service.getPostsByUserId(userId);
        return ResponseEntity.ok(userPosts);
    }

    @GetMapping("/user/{userId}/bookmarks")
    public ResponseEntity<List<PostForm>> getBookmarkedPostsByUserId(@PathVariable Integer userId) {

        List<Integer> bookmarkedPostIds = service.getBookmarkedPostsByUserId(userId);

        List<PostForm> bookmarkedPosts = service.getPostsByIds(bookmarkedPostIds);

        return ResponseEntity.ok(bookmarkedPosts);
    }


    @GetMapping("category")
    public ResponseEntity<List<CategoryDto>> getAllCategoriesWithTags() {
        List<CategoryDto> categories = service.getCategoriesWithTags();
        return ResponseEntity.ok(categories);
    }

    @PostMapping("/likes")
    public ResponseEntity<List<Integer>> getLikedPosts(@RequestBody Map<String, Integer> request) {
        Integer userId = request.get("userId");
        List<Integer> likedPosts = service.getLikedPostsByUserId(userId);
        return ResponseEntity.ok(likedPosts);
    }

    @PostMapping("/bookmarks")
    public ResponseEntity<List<Integer>> getBookmarkedPosts(@RequestBody Map<String, Integer> request) {
        Integer userId = request.get("userId");
        List<Integer> bookmarkedPosts = service.getBookmarkedPostsByUserId(userId);
        return ResponseEntity.ok(bookmarkedPosts);
    }
    //update
    @PatchMapping("/{postId}")
    public ResponseEntity<?> updatePost(@PathVariable int postId, @RequestBody PostForm postForm) {
        try {
            service.updatePost(postId, postForm);
            Map<String, Object> message = Map.of(
                    "type", "UPDATE_POST",
                    "content", postForm
            );
            messagingTemplate.convertAndSend("/topic/post", message);
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("type", "ERROR", "content", e.getMessage()));
        }
    }

    @GetMapping("/tags/popular")
    public ResponseEntity<List<Map<String, Object>>> getPopularTags() {
        try {
            List<Map<String, Object>> popularTags = service.getPopularTags();
            return ResponseEntity.ok(popularTags);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.emptyList());
        }
    }

}
