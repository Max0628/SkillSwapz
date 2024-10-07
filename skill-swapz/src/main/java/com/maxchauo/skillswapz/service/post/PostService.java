package com.maxchauo.skillswapz.service.post;

import com.maxchauo.skillswapz.data.dto.post.CategoryDto;
import com.maxchauo.skillswapz.data.form.post.CommentForm;
import com.maxchauo.skillswapz.data.form.post.PostBookmarkForm;
import com.maxchauo.skillswapz.data.form.post.PostForm;
import com.maxchauo.skillswapz.data.form.post.PostLikeForm;
import com.maxchauo.skillswapz.repository.post.*;

import lombok.extern.log4j.Log4j2;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

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
    private final RedisTemplate<String, Object> redisTemplate;
    private static final String REDIS_KEY = "latestPosts"; // Redis Key

    public PostService(PostRepository postRepo, CommentRepository commentRepo, LikeRepository likeRepo, BookMarkRepository bookMarkRepo, BookMarkRepository bookMarkRepository, PostSearchRepository postSearchRepository, LikeRepository likeRepository, CategoryRepository categoryRepository, PostSearchRepository searchRepo, RedisTemplate<String, Object> redisTemplate) {
        this.postRepo = postRepo;
        this.commentRepo = commentRepo;
        this.likeRepo = likeRepo;
        this.bookMarkRepo = bookMarkRepo;
        this.bookMarkRepository = bookMarkRepository;
        this.postSearchRepository = postSearchRepository;
        this.likeRepository = likeRepository;
        this.categoryRepository = categoryRepository;
        this.searchRepo = searchRepo;
        this.redisTemplate = redisTemplate;
    }

    public Integer getPostId(PostForm postForm) {
        PostForm createdPostForm = switch (postForm.getType()) {
            case "交換技能" -> postRepo.insertExchangeForm(postForm);
            case "找老師" -> postRepo.insertFindTutorForm(postForm);
            case "找學生" -> postRepo.insertFindStudentForm(postForm);
            case "讀書會" -> postRepo.insertFindBookClubForm(postForm);
            default -> throw new IllegalArgumentException("Invalid post type: " + postForm.getType());
        };

        log.info("Post inserted with ID: {}", createdPostForm.getId());

        // 将文章加入 Redis Sorted Set
        addToRedisSortedSet(createdPostForm);

        // 将文章内容存入 Redis，键为 "post:<postId>"
        redisTemplate.opsForValue().set("post:" + createdPostForm.getId(), createdPostForm);

        return createdPostForm.getId();
    }


    // 新增方法，將文章加入 Redis Sorted Set
    private void addToRedisSortedSet(PostForm postForm) {
        Integer postId = postForm.getId();
        if (postId == null) {
            log.error("Attempting to add null postId to Redis");
            return;
        }

        // 移除 postId 前後的雙引號（如果有的話）
        String postIdString = postId.toString().replaceAll("^\"|\"$", "");

        redisTemplate.opsForZSet().add(REDIS_KEY, postIdString, postForm.getCreatedAt().toEpochSecond(ZoneOffset.UTC));

        log.info("Added post to Redis with postId: {} and score: {}", postIdString, postForm.getCreatedAt().toEpochSecond(ZoneOffset.UTC));

        // 保留最新的 30 篇文章
        Long zCard = redisTemplate.opsForZSet().zCard(REDIS_KEY);  // 查詢 Redis 目前的數量
        log.info("Current number of posts in Redis: {}", zCard);

        if (zCard > 30) {
            redisTemplate.opsForZSet().removeRange(REDIS_KEY, 0, 0);
            log.info("Removed oldest post, keeping only the latest 30.");
        }
    }



    public CommentForm insertComment(CommentForm commentForm) {
        return commentRepo.insertComment(commentForm);
    }

    public Map<String, Object> deleteComment(Integer commentId, Integer userId) {
        Optional<CommentForm> comment = commentRepo.findById(commentId);
        if (comment.isPresent() && comment.get().getUserId().equals(userId)) {
            Integer postId = comment.get().getPostId();
            commentRepo.deleteById(commentId);

            // 構建返回的訊息內容
            Map<String, Object> messageContent = new HashMap<>();
            messageContent.put("commentId", commentId);
            messageContent.put("postId", postId);

            return messageContent;
        }
        return null;
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


    public List<PostForm> searchPost(String keyword, String sortType,int page,int size) {
        return searchRepo.searchPost(keyword, sortType,page,size);
    }


    public List<PostForm> getPostsByIds(List<Integer> postIds) {
        return searchRepo.findPostsByIds(postIds);
    }

    public PostForm getPostDetail(int postId) throws Exception {
        // 首先尝试从 Redis 中获取文章
        PostForm post = getPostFromRedis(postId);
        if (post != null) {
            return post;
        }

        // 如果 Redis 中没有，查询数据库
        post = searchRepo.findPostById(postId);
        if (post == null) {
            throw new Exception("Post not found with id: " + postId);
        }

        List<CommentForm> comments = searchRepo.findCommentsByPostId(postId);
        post.setComments(comments);

        // 将从数据库中获取到的文章存入 Redis
        redisTemplate.opsForValue().set("post:" + postId, post);
        log.info("Stored post in Redis: post:{}", postId);

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

    // 刪除文章時，從 Redis Sorted Set 移除文章
    public boolean deletePost(int postId, int userId) {
        boolean deleted = postRepo.deletePost(postId, userId);

        if (deleted) {
            try {
                // 嘗試從 Redis 中刪除文章
                redisTemplate.opsForZSet().remove(REDIS_KEY, String.valueOf(postId));  // 將 postId 轉換為字串
                log.info("Deleted post from Redis with postId: {}", postId);

                // 檢查 Redis 中的文章數量
                Long zCard = redisTemplate.opsForZSet().zCard(REDIS_KEY);
                log.info("Current number of posts in Redis after deletion: {}", zCard);

                // 如果 Redis 中的文章數量少於 30，從資料庫補充最新的文章
                if (zCard != null && zCard < 30) {
                    // 查詢最新的文章補充到 Redis
                    List<PostForm> additionalPosts = postRepo.findLatestPostsAfter(0, 1); // 查詢最新的一篇文章
                    if (!additionalPosts.isEmpty()) {
                        savePostsToRedis(additionalPosts); // 將補充的文章存入 Redis
                        log.info("Added new post to Redis after deletion to maintain 30 posts.");
                    } else {
                        log.info("No more posts available in the database to add to Redis.");
                    }
                }
            } catch (Exception e) {
                // 捕獲異常並記錄錯誤信息
                log.error("Failed to delete post from Redis with postId: {}. Error: {}", postId, e.getMessage());
            }
        } else {
            log.warn("Failed to delete post from DB with postId: {} and userId: {}", postId, userId);
        }

        return deleted;
    }



    // 取得 Redis 中的最新文章，如果 Redis 沒有，從 MySQL 拿取
    public List<PostForm> getLatestPosts(int page, int size) {
        long start = page * size;
        long end = (page + 1) * size - 1;

        // 從 Redis 取出文章，只取 Redis 前 30 篇
        Set<Object> postIds = redisTemplate.opsForZSet().reverseRange(REDIS_KEY, start, Math.min(end, 29));
        log.info("Fetched postIds from Redis: {}", postIds);

        // 將 Object 轉換為 String，然後嘗試轉換為 Integer
        List<Integer> validPostIds = postIds.stream()
                .filter(Objects::nonNull)
                .map(id -> {
                    try {
                        return Integer.parseInt(id.toString());  // 將 String 轉為 Integer
                    } catch (NumberFormatException e) {
                        log.error("Failed to parse postId: {}", id);
                        return null; // 處理無法轉換的情況
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        // 如果 Redis 中的文章數量不足，從 MySQL 補充
        if (validPostIds.size() < size) {
            int remaining = size - validPostIds.size();
            long totalCount = redisTemplate.opsForZSet().size(REDIS_KEY);

            List<PostForm> additionalPosts;
            if (start >= 30) {
                // 如果需要查詢超過 30 篇，直接從 MySQL 查詢後續的文章，不存入 Redis
                additionalPosts = postRepo.findLatestPostsAfter((int) (start), remaining);
            } else {
                // 如果 Redis 中文章不夠，從 MySQL 補充文章
                additionalPosts = postRepo.findLatestPostsAfter((int) totalCount, remaining);

                // 將補充的文章存入 Redis，只保留最新的 30 篇文章
                savePostsToRedis(additionalPosts);
                log.info("Saved {} additional posts to Redis", additionalPosts.size());

                // 確保 Redis 中只保留最新的 30 篇文章
                Long zCard = redisTemplate.opsForZSet().zCard(REDIS_KEY);
                if (zCard > 30) {
                    redisTemplate.opsForZSet().removeRange(REDIS_KEY, 0, zCard - 31); // 移除超過 30 篇的部分
                    log.info("Trimmed Redis to keep only the latest 30 posts");
                }
            }

            // 將補充的文章 id 加入到結果列表中
            validPostIds.addAll(additionalPosts.stream().map(PostForm::getId).collect(Collectors.toList()));
        }

        return postRepo.getPostsByIds(validPostIds);
    }


    // 新增方法，將文章列表存入 Redis
    private void savePostsToRedis(List<PostForm> posts) {
        for (PostForm post : posts) {
            Integer postId = post.getId();
            if (postId != null) {
                // 将文章 ID 和创建时间戳存入 Sorted Set
                redisTemplate.opsForZSet().add(REDIS_KEY, postId.toString(), post.getCreatedAt().toEpochSecond(ZoneOffset.UTC));
                log.info("Saved post ID to Redis Sorted Set: {}", postId);

                // 将文章内容存入 Redis，键为 post:<postId>
                redisTemplate.opsForValue().set("post:" + postId, post);
                log.info("Saved post content to Redis: post:{}", postId);
            } else {
                log.warn("Attempted to save post with null id to Redis. Post content: {}", post);
            }
        }
    }

    public PostForm getPostFromRedis(int postId) {
        // 从 Redis 中获取文章的详细内容
        PostForm post = (PostForm) redisTemplate.opsForValue().get("post:" + postId);
        if (post != null) {
            log.info("Retrieved post from Redis: post:{}", postId);
        } else {
            log.warn("Post not found in Redis: post:{}", postId);
        }
        return post;
    }


}

