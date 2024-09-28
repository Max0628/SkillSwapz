package com.maxchauo.skillswapz.controller.post;

import com.maxchauo.skillswapz.data.dto.post.CategoryDto;
import com.maxchauo.skillswapz.data.form.post.CommentForm;
import com.maxchauo.skillswapz.data.form.post.PostBookmarkForm;
import com.maxchauo.skillswapz.data.form.post.PostForm;
import com.maxchauo.skillswapz.data.form.post.PostLikeForm;
import com.maxchauo.skillswapz.repository.post.LikeRepository;
import com.maxchauo.skillswapz.service.post.PostService;

import lombok.extern.log4j.Log4j2;

import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Log4j2
@CrossOrigin
@RestController
@RequestMapping("api/1.0/post")
public class PostController {
    private final PostService service;
    private final LikeRepository likeRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public PostController(
            PostService service,
            LikeRepository likeRepository,
            SimpMessagingTemplate messagingTemplate) {
        this.service = service;
        this.likeRepository = likeRepository;
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



    @PostMapping("/bookMark")
    public ResponseEntity<?> toggleBookMark(@RequestBody PostBookmarkForm bookmark) {
        String message = service.toggleBookMark(bookmark);
        return ResponseEntity.ok().body(message);
    }

    @PostMapping("/like")
    public ResponseEntity<Map<String, Object>> toggleLike(@RequestBody PostLikeForm likeForm) {
        try {
            boolean isLiked = service.toggleLike(likeForm);
            int likeCount = likeRepository.getLikeCount(likeForm.getPostId());
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
    public ResponseEntity<List<PostForm>> getPosts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "date") String sort) {

        List<PostForm> posts = service.searchPost(keyword, sort);
        return ResponseEntity.ok().body(posts);
    }

    @GetMapping("/{postId}")
    public ResponseEntity<PostForm> getPostDetail(@PathVariable int postId) throws Exception {
        PostForm post = service.getPostDetail(postId);
        return ResponseEntity.ok(post);
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

}
