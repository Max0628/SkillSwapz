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

import org.springframework.dao.DataAccessException;
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
    private final ObjectMapper objectMapper;
    private static final String REDIS_KEY = "latestPosts";
    public PostService(
            PostRepository postRepo,
            CommentRepository commentRepo,
            LikeRepository likeRepo,
            BookMarkRepository bookMarkRepo,
            BookMarkRepository bookMarkRepository,
            PostSearchRepository postSearchRepository,
            LikeRepository likeRepository,
            CategoryRepository categoryRepository,
            PostSearchRepository searchRepo,
            RedisTemplate<String, Object> redisTemplate,
            ObjectMapper objectMapper) {
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
        this.objectMapper = objectMapper;
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
        redisTemplate
                .opsForZSet()
                .add(
                        REDIS_KEY,
                        postIdString,
                        postForm.getCreatedAt().minusHours(8).toEpochSecond(ZoneOffset.UTC));
        log.info("Added post to Redis with postId: {} and score: {}", postIdString, postForm.getCreatedAt().toEpochSecond(ZoneOffset.UTC));
        Long zCard = redisTemplate.opsForZSet().zCard(REDIS_KEY);
        log.info("Current number of posts in Redis: {}", zCard);
        if (zCard != null) {
            log.info("Current number of posts in Redis: {}", zCard);
            if (zCard > 30) {
            redisTemplate.opsForZSet().removeRange(REDIS_KEY, 0, 0);
            log.info("Removed oldest post, keeping only the latest 30.");
            }
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

    public int getLikeCountByPostId(int postId) {
        return likeRepository.getLikeCount(postId);
    }


    public List<PostForm> searchPost(String keyword, String sortType,int page,int size) {
        return searchRepo.searchPost(keyword, sortType,page,size);
    }


    public List<PostForm> getPostsByIds(List<Integer> postIds) {
        return searchRepo.findPostsByIds(postIds);
    }

    public PostForm getPostDetail(int postId) throws Exception {
        PostForm post ;
        try {
            post = getPostFromRedis(postId);
            if (post == null) {
                post = searchRepo.findPostById(postId);
                if (post == null) {
                    log.error("Post not found in database with id: {}", postId);
                    throw new Exception("Post not found with id: " + postId);
                }

                redisTemplate.opsForValue().set("post:" + postId, post);
                log.info("Stored post in Redis: post:{}", postId);
            } else {
                log.info("Post retrieved from Redis with postId: {}", postId);
            }

            int likeCount = searchRepo.getLikeCountByPostId(postId);
            post.setLikeCount(likeCount);

            int commentCount = searchRepo.getCommentCountByPostId(postId);
            post.setCommentCount(commentCount);

            List<CommentForm> comments = searchRepo.findCommentsByPostId(postId);
            post.setComments(comments);

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
                redisTemplate.opsForZSet().remove(REDIS_KEY, String.valueOf(postId));
                log.info("Deleted post from Redis with postId: {}", postId);

                redisTemplate.delete("post:" + postId);
                log.info("Deleted post content from Redis for postId: {}", postId);

                Long zCard = redisTemplate.opsForZSet().zCard(REDIS_KEY);
                log.info("Current number of posts in Redis after deletion: {}", zCard);

                if (zCard != null && zCard < 30) {
                    Set<Object> lastPostIds = redisTemplate.opsForZSet().reverseRange(REDIS_KEY, -1, -1);
                    if (lastPostIds != null && !lastPostIds.isEmpty()) {
                        int lastPostId = Integer.parseInt(lastPostIds.iterator().next().toString());
                        PostForm lastPost = getPostFromRedis(lastPostId);
                        if (lastPost != null) {
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
        long startTime = System.currentTimeMillis();         long start = (long) page * size;
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

            Set<Object> lastPostIds = redisTemplate.opsForZSet().reverseRange(REDIS_KEY, -1, -1);
            if (lastPostIds != null && !lastPostIds.isEmpty()) {
                int lastPostId = Integer.parseInt(lastPostIds.iterator().next().toString());
                PostForm lastPost = getPostFromRedis(lastPostId);
                if (lastPost != null) {
                    List<PostForm> additionalPosts = postRepo.findPostsBefore(lastPost.getCreatedAt(), remaining);
                    savePostsToRedis(additionalPosts);
                    log.info("Saved {} additional posts to Redis", additionalPosts.size());

                    Long zCard = redisTemplate.opsForZSet().zCard(REDIS_KEY);
                    if (zCard > 30) {
                        redisTemplate.opsForZSet().removeRange(REDIS_KEY, 0, zCard - 31);
                        log.info("Trimmed Redis to keep only the latest 30 posts");
                    }
                    validPostIds.addAll(additionalPosts.stream().map(PostForm::getId).toList());
                }
            }
        }
        long duration = System.currentTimeMillis() - startTime;
        log.info("Total time taken to fetch latest posts for page {}: {} ms", page, duration);
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
        long startTime = System.currentTimeMillis();
        try {
            Object redisData = redisTemplate.opsForValue().get("post:" + postId);
            long duration = System.currentTimeMillis() - startTime;
            log.info("Time taken to fetch postId {} from Redis: {} ms", postId, duration);

            if (redisData != null) {
                if (redisData instanceof LinkedHashMap) {

                    ObjectMapper objectMapper = new ObjectMapper();
                    objectMapper.registerModule(new JavaTimeModule());
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

        public void updatePost(int postId, PostForm postForm) {
        try {
            if (postForm == null) {
                throw new IllegalArgumentException("Post form data cannot be null");
            }

            String type = postForm.getType();
            if (type == null || type.isEmpty()) {
                throw new IllegalArgumentException("Post type cannot be null or empty");
            }

            switch (type) {
                case "交換技能":
                    postRepo.updateExchangePost(postId, postForm);
                    break;
                case "找老師":
                    postRepo.updateFindTutorPost(postId, postForm);
                    break;
                case "找學生":
                    postRepo.updateFindStudentPost(postId, postForm);
                    break;
                case "讀書會":
                    postRepo.updateBookClubPost(postId, postForm);
                    break;
                default:
                    throw new IllegalArgumentException("Unknown post type: " + type);
            }

            String redisKey = "post:" + postId;
            Object redisPostObj = redisTemplate.opsForValue().get(redisKey);

            if (redisPostObj != null) {
                PostForm existingPost;
                if (redisPostObj instanceof LinkedHashMap) {
                    existingPost = objectMapper.convertValue(redisPostObj, PostForm.class);
                } else if (redisPostObj instanceof String) {
                    existingPost = objectMapper.readValue((String) redisPostObj, PostForm.class);
                } else {
                    throw new ClassCastException("Unsupported Redis data type for post: " + redisPostObj.getClass().getName());
                }

                if (postForm.getUserId() == null) {
                    postForm.setUserId(existingPost.getUserId());
                }
                if (postForm.getCreatedAt() == null) {
                    postForm.setCreatedAt(existingPost.getCreatedAt());
                }
                if (postForm.getLocation() == null) {
                    postForm.setLocation(existingPost.getLocation());
                }
                if (postForm.getSkillOffered() == null) {
                    postForm.setSkillOffered(existingPost.getSkillOffered());
                }
                if (postForm.getSkillWanted() == null) {
                    postForm.setSkillWanted(existingPost.getSkillWanted());
                }
                if (postForm.getSalary() == null) {
                    postForm.setSalary(existingPost.getSalary());
                }
                if (postForm.getBookClubPurpose() == null) {
                    postForm.setBookClubPurpose(existingPost.getBookClubPurpose());
                }
                if (postForm.getContent() == null) {
                    postForm.setContent(existingPost.getContent());
                }
                if (postForm.getTag() == null || postForm.getTag().isEmpty()) {
                    postForm.setTag(existingPost.getTag());
                }

                String updatedPostJson = objectMapper.writeValueAsString(postForm);
                redisTemplate.opsForValue().set(redisKey, updatedPostJson);
                log.info("Updated post in Redis: postId = {}", postId);
            } else {
                log.info("Post not found in Redis, skipping Redis update: postId = {}", postId);
            }

        } catch (IllegalArgumentException e) {
            log.error("Invalid input for updating post: {}", e.getMessage());
            throw e;
        } catch (DataAccessException e) {
            log.error("Database error occurred while updating post: {}", e.getMessage());
            throw new RuntimeException("Failed to update post in database", e);
        } catch (Exception e) {
            log.error("Unexpected error occurred while updating post: {}", e.getMessage());
        }
    }

    public List<Map<String, Object>> getPopularTags() {
        return postRepo.getPopularTags();
    }

}

