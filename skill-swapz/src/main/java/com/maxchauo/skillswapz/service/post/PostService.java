package com.maxchauo.skillswapz.service.post;

import com.maxchauo.skillswapz.data.form.post.CommentForm;
import com.maxchauo.skillswapz.data.form.post.PostBookmarkForm;
import com.maxchauo.skillswapz.data.form.post.PostForm;
import com.maxchauo.skillswapz.data.form.post.PostLikeForm;
import com.maxchauo.skillswapz.repository.post.*;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Log4j2
@Service
public class PostService {

    @Autowired
    private PostRepository postRepo;

    @Autowired
    private CommentRepository commentRepo;

    @Autowired
    private LikeRepository likeRepo;

    @Autowired
    private BookMarkRepository bookMarkRepo;

    @Autowired
    private PostSearchRepository searchRepo;

    public Integer getPostId(PostForm postForm) {
        Integer postId = null;

        switch (postForm.getType()) {
            case "交換技能":
                log.info("Inserting exchange post...");
                postId = postRepo.insertExchangeForm(postForm);
                break;

            case "找老師":
                log.info("Inserting find tutor post...");
                postId = postRepo.insertFindTutorForm(postForm);
                break;

            case "找學生":
                log.info("Inserting find student post...");
                postId = postRepo.insertFindStudentForm(postForm);
                break;

            case "讀書會":
                log.info("Inserting book club post...");
                postId = postRepo.insertFindBookClubForm(postForm);
                break;

            default:
                log.error("Invalid post type: " + postForm.getType());
                throw new IllegalArgumentException("Invalid post type: " + postForm.getType());
        }

        log.info("Post inserted with ID: " + postId);
        return postId;
    }

    public void insertComment(CommentForm commentForm) {
        commentRepo.insertComment(commentForm);
    }


    public String toggleBookMark(PostBookmarkForm bookmark) {
        if (bookMarkRepo.isBookMark(bookmark)) {

            bookMarkRepo.deleteBookMark(bookmark);
            postRepo.decrementLikeCount(bookmark.getPostId());
            return "BookMark removed successfully.";
        } else {

            bookMarkRepo.insertBookMark(bookmark);
            postRepo.incrementLikeCount(bookmark.getPostId());
            return "BookMark added successfully.";
        }
    }

    public String toggleLike(PostLikeForm likeForm) {
        if (likeRepo.isLiked(likeForm)) {

            likeRepo.deleteLike(likeForm);
            postRepo.decrementLikeCount(likeForm.getPostId());
            return "Like removed successfully.";
        } else {

            likeRepo.insertLike(likeForm);
            postRepo.incrementLikeCount(likeForm.getPostId());
            return "Like added successfully.";
        }
    }


    public List<PostForm> searchPost(String keyword, String sortType) {
        return searchRepo.searchPost(keyword, sortType);

    }
}

