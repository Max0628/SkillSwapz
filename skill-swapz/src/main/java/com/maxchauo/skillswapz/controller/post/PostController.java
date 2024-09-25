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
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Log4j2
@CrossOrigin
@RestController
@RequestMapping("api/1.0/post")
public class PostController {

    private final PostService service;

    private final LikeRepository likeRepository;

    public PostController(PostService service, LikeRepository likeRepository) {
        this.service = service;
        this.likeRepository = likeRepository;
    }


    @PostMapping
    public ResponseEntity<?> insertPost(@ModelAttribute PostForm postForm) {
        Integer postId = service.getPostId(postForm);
        return ResponseEntity.ok().body("Post created successfully with ID: " + postId);
    }

    @PostMapping("/comment")
    public void insertComment(@RequestBody CommentForm commentForm) {
        service.insertComment(commentForm);
//        return ResponseEntity.ok().body("Comment created successfully.");
    }


    @PostMapping("/bookMark")
    public ResponseEntity<?> toggleBookMark(@RequestBody PostBookmarkForm bookmark) {
        String message = service.toggleBookMark(bookmark);
        return ResponseEntity.ok().body(message);
    }
    @PostMapping("/like")
    public ResponseEntity<Map<String, Object>> toggleLike(@RequestBody PostLikeForm likeForm) {
        boolean isLiked = service.toggleLike(likeForm);
        int likeCount = likeRepository.getLikeCount(likeForm.getPostId());

        Map<String, Object> response = new HashMap<>();
        response.put("message", isLiked ? "Like added successfully." : "Like removed successfully.");
        response.put("liked", isLiked);
        response.put("likeCount", likeCount);

        return ResponseEntity.ok().body(response);
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

    @DeleteMapping("/{postId}")
    public ResponseEntity<Map<String, String>> deletePost(@PathVariable int postId, @RequestParam int userId) {


        boolean deleted = service.deletePost(postId, userId);
        Map<String, String> response = new HashMap<>();
        if (deleted) {
            response.put("message", "Post deleted successfully");
            return ResponseEntity.ok(response);
        } else {
            response.put("message", "Failed to delete post");
            return ResponseEntity.badRequest().body(response);
        }
    }
}



