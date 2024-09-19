package com.maxchauo.skillswapz.service.post;

import com.maxchauo.skillswapz.data.dto.post.CategoryDto;
import com.maxchauo.skillswapz.data.form.post.CommentForm;
import com.maxchauo.skillswapz.data.form.post.PostBookmarkForm;
import com.maxchauo.skillswapz.data.form.post.PostForm;
import com.maxchauo.skillswapz.data.form.post.PostLikeForm;
import com.maxchauo.skillswapz.repository.post.*;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;

import java.util.List;

@Log4j2
@Service
public class PostService {

    private final PostRepository postRepo;
    private final CommentRepository commentRepo;
    private final LikeRepository likeRepo;
    private final BookMarkRepository bookMarkRepo;
    private final PostSearchRepository searchRepo;
    private final CategoryRepository categoryRepository;
    private final LikeRepository likeRepository;
    private final BookMarkRepository bookMarkRepository;
    private final PostSearchRepository postSearchRepository;

    public PostService(PostRepository postRepo, CommentRepository commentRepo, LikeRepository likeRepo, BookMarkRepository bookMarkRepo, BookMarkRepository bookMarkRepository, PostSearchRepository postSearchRepository, LikeRepository likeRepository, CategoryRepository categoryRepository, PostSearchRepository searchRepo) {
        this.postRepo = postRepo;
        this.commentRepo = commentRepo;
        this.likeRepo = likeRepo;
        this.bookMarkRepo = bookMarkRepo;
        this.bookMarkRepository = bookMarkRepository;
        this.postSearchRepository = postSearchRepository;
        this.likeRepository = likeRepository;
        this.categoryRepository = categoryRepository;
        this.searchRepo = searchRepo;
    }

    public Integer getPostId(PostForm postForm) {
        Integer postId = switch (postForm.getType()) {
            case "交換技能" -> {
                log.info("Inserting exchange post...");
                yield postRepo.insertExchangeForm(postForm);
            }
            case "找老師" -> {
                log.info("Inserting find tutor post...");
                yield postRepo.insertFindTutorForm(postForm);
            }
            case "找學生" -> {
                log.info("Inserting find student post...");
                yield postRepo.insertFindStudentForm(postForm);
            }
            case "讀書會" -> {
                log.info("Inserting book club post...");
                yield postRepo.insertFindBookClubForm(postForm);
            }
            default -> {
                log.error("Invalid post type: {}", postForm.getType());
                throw new IllegalArgumentException("Invalid post type: " + postForm.getType());
            }
        };

        log.info("Post inserted with ID: {}", postId);
        return postId;
    }

    public void insertComment(CommentForm commentForm) {
        commentRepo.insertComment(commentForm);
    }


    public String toggleBookMark(PostBookmarkForm bookmark) {
        if (bookMarkRepo.isBookMark(bookmark)) {

            bookMarkRepo.deleteBookMark(bookmark);
            return "BookMark removed successfully.";
        } else {

            bookMarkRepo.insertBookMark(bookmark);
            return "BookMark added successfully.";
        }
    }

    public boolean toggleLike(PostLikeForm likeForm) {
        if (likeRepo.isLiked(likeForm)) {
            likeRepo.deleteLike(likeForm);
            postRepo.decrementLikeCount(likeForm.getPostId());
            return false;
        } else {
            likeRepo.insertLike(likeForm);
            postRepo.incrementLikeCount(likeForm.getPostId());
            return true;
        }
    }


    public List<PostForm> searchPost(String keyword, String sortType) {
        return searchRepo.searchPost(keyword, sortType);
    }


    public List<PostForm> getPostsByIds(List<Integer> postIds) {
        return searchRepo.findPostsByIds(postIds);
    }

    public PostForm getPostDetail(int postId) throws Exception {
        PostForm post = searchRepo.findPostById(postId);
        if (post == null) {
            throw new Exception("Post not found with id: " + postId);
        }

        List<CommentForm> comments = searchRepo.findCommentsByPostId(postId);
        post.setComments(comments);

        return post;
    }

    public List<PostForm> getPostsByUserId(Integer userId) {
        return postSearchRepository.findPostsByUserId(userId);
    }

    public List<CategoryDto> getCategoriesWithTags() {
        return categoryRepository.findAllCategoriesWithTags();
    }

    public List<Integer> getBookmarkedPostsByUserId(Integer userId) {
        return bookMarkRepository.findBookmarkedPostIdsByUserId(userId);
    }


    public List<Integer> getLikedPostsByUserId(Integer userId) {
        return likeRepository.findLikedPostIdsByUserId(userId);
    }
}

