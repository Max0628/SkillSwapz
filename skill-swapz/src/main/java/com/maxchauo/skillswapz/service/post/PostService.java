package com.maxchauo.skillswapz.service.post;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
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
        addToRedisSortedSet(createdPostForm);
        redisTemplate.opsForValue().set("post:" + createdPostForm.getId(), createdPostForm);
        return createdPostForm.getId();
    }

    private void addToRedisSortedSet(PostForm postForm) {
        Integer postId = postForm.getId();
        if (postId == null) {
            log.error("Attempting to add null postId to Redis");
            return;
        }

        String postIdString = postId.toString().replaceAll("^\"|\"$", "");
        // redisTemplate.opsForZSet().add(REDIS_KEY, postIdString,
        // postForm.getCreatedAt().toEpochSecond(ZoneOffset.UTC));
        redisTemplate
                .opsForZSet()
                .add(
                        REDIS_KEY,
                        postIdString,
                        postForm.getCreatedAt().minusHours(8).toEpochSecond(ZoneOffset.UTC));
        log.info("Added post to Redis with postId: {} and score: {}", postIdString, postForm.getCreatedAt().toEpochSecond(ZoneOffset.UTC));
        Long zCard = redisTemplate.opsForZSet().zCard(REDIS_KEY);
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
        PostForm post = null;
        try {
            // 先从 Redis 获取
            post = getPostFromRedis(postId);
            if (post != null) {
                log.info("Post retrieved from Redis with postId: {}", postId);
                return post;
            }

            // 如果 Redis 没有，从数据库中获取
            post = searchRepo.findPostById(postId);
            if (post == null) {
                log.error("Post not found in database with id: {}", postId);
                throw new Exception("Post not found with id: " + postId);
            }

            // 获取评论并添加到 post 中
            List<CommentForm> comments = searchRepo.findCommentsByPostId(postId);
            post.setComments(comments);

            // 将 post 保存到 Redis 中
            redisTemplate.opsForValue().set("post:" + postId, post);
            log.info("Stored post in Redis: post:{}", postId);
        } catch (IllegalArgumentException e) {
            log.error("Error in serializing/deserializing PostForm for postId: {}", postId, e);
            throw new Exception("Serialization issue occurred while retrieving post with id: " + postId);
        } catch (Exception e) {
            log.error("Failed to get post with postId: {}. Error: {}", postId, e.getMessage());
            throw e;
        }
        return post;
    }

    public List<CommentForm> getCommentsByPostId(int postId) {
        return postSearchRepository.findCommentsByPostId(postId);
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

    public boolean deletePost(int postId, int userId) {
        boolean deleted = postRepo.deletePost(postId, userId);

        if (deleted) {
            try {
                // 刪除 Redis sorted set 中的文章ID
                redisTemplate.opsForZSet().remove(REDIS_KEY, String.valueOf(postId));
                log.info("Deleted post from Redis with postId: {}", postId);

                // 刪除 Redis 中具體的文章數據
                redisTemplate.delete("post:" + postId);
                log.info("Deleted post content from Redis for postId: {}", postId);

                // 檢查 Redis 中剩下的文章數量
                Long zCard = redisTemplate.opsForZSet().zCard(REDIS_KEY);
                log.info("Current number of posts in Redis after deletion: {}", zCard);

                // 如果文章數量少於 30，從資料庫中補充文章
                if (zCard != null && zCard < 30) {
                    // 獲取 Redis 中最後一篇文章
                    Set<Object> lastPostIds = redisTemplate.opsForZSet().reverseRange(REDIS_KEY, -1, -1);
                    if (lastPostIds != null && !lastPostIds.isEmpty()) {
                        Integer lastPostId = Integer.parseInt(lastPostIds.iterator().next().toString());
                        PostForm lastPost = getPostFromRedis(lastPostId);
                        if (lastPost != null) {
                            // 根據最後一篇文章的 createdAt 補充更早的文章
                            List<PostForm> additionalPosts = postRepo.findPostsBefore(lastPost.getCreatedAt(), 30 - zCard.intValue());
                            savePostsToRedis(additionalPosts);
                            log.info("Added new posts to Redis after deletion to maintain 30 posts.");
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Failed to delete post from Redis with postId: {}. Error: {}", postId, e.getMessage());
            }
        } else {
            log.warn("Failed to delete post from DB with postId: {} and userId: {}", postId, userId);
        }
        return deleted;
    }


    public List<PostForm> getLatestPosts(int page, int size) {
        long start = (long) page * size;
        long end = (long) (page + 1) * size - 1;
        Set<Object> postIds = redisTemplate.opsForZSet().reverseRange(REDIS_KEY, start, Math.min(end, 29));
        log.info("Fetched postIds from Redis: {}", postIds);
        assert postIds != null;
        List<Integer> validPostIds = postIds.stream()
                .filter(Objects::nonNull)
                .map(id -> {
                    try {
                        return Integer.parseInt(id.toString());
                    } catch (NumberFormatException e) {
                        log.error("Failed to parse postId: {}", id);
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        if (validPostIds.size() < size) {
            int remaining = size - validPostIds.size();
            long totalCount = redisTemplate.opsForZSet().size(REDIS_KEY);

            // 獲取 Redis 最後一篇文章的 createdAt
            Set<Object> lastPostIds = redisTemplate.opsForZSet().reverseRange(REDIS_KEY, -1, -1);
            if (lastPostIds != null && !lastPostIds.isEmpty()) {
                Integer lastPostId = Integer.parseInt(lastPostIds.iterator().next().toString());
                PostForm lastPost = getPostFromRedis(lastPostId);
                if (lastPost != null) {
                    // 根據 createdAt 補充更早的文章
                    List<PostForm> additionalPosts = postRepo.findPostsBefore(lastPost.getCreatedAt(), remaining);
                    savePostsToRedis(additionalPosts);
                    log.info("Saved {} additional posts to Redis", additionalPosts.size());

                    Long zCard = redisTemplate.opsForZSet().zCard(REDIS_KEY);
                    if (zCard > 30) {
                        redisTemplate.opsForZSet().removeRange(REDIS_KEY, 0, zCard - 31);
                        log.info("Trimmed Redis to keep only the latest 30 posts");
                    }
                    validPostIds.addAll(additionalPosts.stream().map(PostForm::getId).collect(Collectors.toList()));
                }
            }
        }

        return postRepo.getPostsByIds(validPostIds);
    }


    private void savePostsToRedis(List<PostForm> posts) {
        for (PostForm post : posts) {
            Integer postId = post.getId();
            if (postId != null) {
                redisTemplate.opsForZSet().add(REDIS_KEY, postId.toString(), post.getCreatedAt().toEpochSecond(ZoneOffset.UTC));
                log.info("Saved post ID to Redis Sorted Set: {}", postId);
                redisTemplate.opsForValue().set("post:" + postId, post);
                log.info("Saved post content to Redis: post:{}", postId);
            } else {
                log.warn("Attempted to save post with null id to Redis. Post content: {}", post);
            }
        }
    }

    public PostForm getPostFromRedis(int postId) {
        try {
            Object redisData = redisTemplate.opsForValue().get("post:" + postId);
            if (redisData != null) {
                if (redisData instanceof LinkedHashMap) {
                    // 避免 Redis 返回的非 PostForm 数据
                    ObjectMapper objectMapper = new ObjectMapper();
                    objectMapper.registerModule(new JavaTimeModule());  // 确保支持 Java 8 时间
                    PostForm post = objectMapper.convertValue(redisData, PostForm.class);
                    log.info("Converted LinkedHashMap to PostForm from Redis: post:{}", postId);
                    return post;
                } else if (redisData instanceof PostForm) {
                    log.info("Post retrieved from Redis: post:{}", postId);
                    return (PostForm) redisData;
                } else {
                    log.warn("Unexpected data type in Redis for postId {}: {}", postId, redisData.getClass().getName());
                }
            } else {
                log.info("No post found in Redis for postId: {}", postId);
            }
        } catch (Exception e) {
            log.error("Error retrieving post from Redis for postId: {}", postId, e);
        }
        return null;
    }
}

