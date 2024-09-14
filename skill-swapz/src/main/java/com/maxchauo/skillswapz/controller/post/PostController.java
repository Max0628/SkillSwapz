package com.maxchauo.skillswapz.controller.post;

import com.maxchauo.skillswapz.data.form.post.CommentForm;
import com.maxchauo.skillswapz.data.form.post.PostBookmarkForm;
import com.maxchauo.skillswapz.data.form.post.PostForm;
import com.maxchauo.skillswapz.data.form.post.PostLikeForm;
import com.maxchauo.skillswapz.service.post.PostService;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Log4j2
@CrossOrigin
@RestController
@RequestMapping("api/1.0/post")
public class PostController {

    @Autowired
    private PostService service;

    @PostMapping
    public ResponseEntity<?> insertPost(@RequestBody PostForm postForm) {
        Integer postId = service.getPostId(postForm);
        return ResponseEntity.ok().body("Post created successfully with ID: " + postId);
    }

    @PostMapping("/comment")
    public ResponseEntity<?> insertComment(@RequestBody CommentForm commentForm) {
        service.insertComment(commentForm);
        return ResponseEntity.ok().body("Comment created successfully.");
    }


    @PostMapping("/bookMark")
    public ResponseEntity<?> toggleBookMark(@RequestBody PostBookmarkForm bookmark) {
        String message = service.toggleBookMark(bookmark);
        return ResponseEntity.ok().body(message);
    }

    @PostMapping("/like")
    public ResponseEntity<?> toggleLike(@RequestBody PostLikeForm likeForm) {
        String message = service.toggleLike(likeForm);
        return ResponseEntity.ok().body(message);
    }

    @GetMapping
    public ResponseEntity<List<PostForm>> getPosts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "date") String sort) {

        List<PostForm> posts = service.searchPost(keyword, sort);
        return ResponseEntity.ok().body(posts);
    }
}


