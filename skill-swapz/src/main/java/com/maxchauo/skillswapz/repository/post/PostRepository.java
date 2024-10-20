package com.maxchauo.skillswapz.repository.post;

import com.maxchauo.skillswapz.data.form.post.PostForm;
import lombok.extern.log4j.Log4j2;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
@Log4j2
@Repository
public class PostRepository {
    final NamedParameterJdbcTemplate template;

    public PostRepository(NamedParameterJdbcTemplate template) {
        this.template = template;
    }

    public PostForm insertExchangeForm(PostForm postForm) {
        String sql = "INSERT INTO post (type, user_id, location, skill_offered, skill_wanted, salary, content, tag) " +
                "VALUES (:type, :userId, :location, :skillOffered, :skillWanted, :salary, :content, :tag)";

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("type", postForm.getType())
                .addValue("userId", postForm.getUserId())
                .addValue("location", postForm.getLocation())
                .addValue("skillOffered", postForm.getSkillOffered())
                .addValue("skillWanted", postForm.getSkillWanted())
                .addValue("salary", postForm.getSalary())
                .addValue("content", postForm.getContent())
                .addValue("tag", String.join(",", postForm.getTag()));

        KeyHolder keyHolder = new GeneratedKeyHolder();
        template.update(sql, params, keyHolder, new String[] { "id" });

        Integer postId = keyHolder.getKey().intValue();
        postForm.setPostId(postId);
        postForm.setId(postId);
        // 查詢並設置 createdAt
        String fetchSql = "SELECT created_at FROM post WHERE id = :postId";
        MapSqlParameterSource fetchParams = new MapSqlParameterSource().addValue("postId", postId);
        LocalDateTime createdAt = template.queryForObject(fetchSql, fetchParams, LocalDateTime.class);
        postForm.setCreatedAt(createdAt);

        return postForm;
    }


    public PostForm insertFindTutorForm(PostForm postForm) {
        String sql = "INSERT INTO post (type, user_id, location, skill_offered, skill_wanted, salary, content, tag) " +
                "VALUES (:type, :userId, :location, :skillOffered, :skillWanted, :salary, :content, :tag)";

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("type", postForm.getType())
                .addValue("userId", postForm.getUserId())
                .addValue("location", postForm.getLocation())
                .addValue("skillOffered", postForm.getSkillOffered())
                .addValue("skillWanted", postForm.getSkillWanted())
                .addValue("salary", postForm.getSalary())
                .addValue("content", postForm.getContent())
                .addValue("tag", String.join(",", postForm.getTag()));

        KeyHolder keyHolder = new GeneratedKeyHolder();
        template.update(sql, params, keyHolder, new String[] { "id" });

        Integer postId = keyHolder.getKey().intValue();
        postForm.setPostId(postId);
        postForm.setId(postId);
        // 查詢並設置 createdAt
        String fetchSql = "SELECT created_at FROM post WHERE id = :postId";
        MapSqlParameterSource fetchParams = new MapSqlParameterSource().addValue("postId", postId);
        LocalDateTime createdAt = template.queryForObject(fetchSql, fetchParams, LocalDateTime.class);
        postForm.setCreatedAt(createdAt);

        return postForm;
    }

    public PostForm insertFindStudentForm(PostForm postForm) {
        String sql = "INSERT INTO post (type, user_id, location, skill_offered, skill_wanted, salary, content, tag) " +
                "VALUES (:type, :userId, :location, :skillOffered, :skillWanted, :salary, :content, :tag)";

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("type", postForm.getType())
                .addValue("userId", postForm.getUserId())
                .addValue("location", postForm.getLocation())
                .addValue("skillOffered", postForm.getSkillOffered())
                .addValue("skillWanted", postForm.getSkillWanted())
                .addValue("salary", postForm.getSalary())
                .addValue("content", postForm.getContent())
                .addValue("tag", String.join(",", postForm.getTag()));

        KeyHolder keyHolder = new GeneratedKeyHolder();
        template.update(sql, params, keyHolder, new String[] { "id" });

        Integer postId = keyHolder.getKey().intValue();
        postForm.setPostId(postId);
        postForm.setId(postId);
        // 查詢並設置 createdAt
        String fetchSql = "SELECT created_at FROM post WHERE id = :postId";
        MapSqlParameterSource fetchParams = new MapSqlParameterSource().addValue("postId", postId);
        LocalDateTime createdAt = template.queryForObject(fetchSql, fetchParams, LocalDateTime.class);
        postForm.setCreatedAt(createdAt);

        return postForm;
    }

    public PostForm insertFindBookClubForm(PostForm postForm) {
        String sql = "INSERT INTO post (type, user_id, location, skill_offered, skill_wanted, salary, book_club_purpose, content, tag) " +
                "VALUES (:type, :userId, :location, :skillOffered, :skillWanted, :salary, :bookClubPurpose, :content, :tag)";

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("type", postForm.getType())
                .addValue("userId", postForm.getUserId())
                .addValue("location", postForm.getLocation())
                .addValue("skillOffered", postForm.getSkillOffered())
                .addValue("skillWanted", postForm.getSkillWanted())
                .addValue("salary", postForm.getSalary())
                .addValue("bookClubPurpose",postForm.getBookClubPurpose())
                .addValue("content", postForm.getContent())
                .addValue("tag", String.join(",", postForm.getTag()));

        KeyHolder keyHolder = new GeneratedKeyHolder();
        template.update(sql, params, keyHolder, new String[] { "id" });

        Integer postId = keyHolder.getKey().intValue();
        postForm.setPostId(postId);
        postForm.setId(postId);
        // 查詢並設置 createdAt
        String fetchSql = "SELECT created_at FROM post WHERE id = :postId";
        MapSqlParameterSource fetchParams = new MapSqlParameterSource().addValue("postId", postId);
        LocalDateTime createdAt = template.queryForObject(fetchSql, fetchParams, LocalDateTime.class);
        postForm.setCreatedAt(createdAt);

        return postForm;
    }

    public void incrementLikeCount(int postId) {
        String sql = "UPDATE `post` SET like_count = like_count + 1 WHERE id = :postId";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", postId);

        template.update(sql, params);
    }

    public void decrementLikeCount(int postId) {
        String sql = "UPDATE `post` SET like_count = like_count - 1 WHERE id = :postId";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", postId);

        template.update(sql, params);
    }

    public boolean deletePost(int postId, int userId) {
        String sql = "DELETE FROM `post` WHERE id = :postId AND user_id = :userId";

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("postId", postId)
                .addValue("userId", userId);

        try {
            int rowsAffected = template.update(sql, params);
            if (rowsAffected > 0) {
                return true;
            } else {
                System.err.println("Failed to delete post: Post with id " + postId + " and user_id " + userId + " does not exist.");
                return false;
            }
        } catch (DataAccessException e) {
            System.err.println("Error occurred while deleting post with id " + postId + " and user_id " + userId);
            return false;
        } catch (Exception e) {
            System.err.println("Unexpected error occurred while deleting post with id " + postId + " and user_id " + userId);
            return false;
        }
    }


    public List<PostForm> findLatestPosts(int limit) {
        String sql = "SELECT * FROM post ORDER BY created_at DESC LIMIT :limit";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("limit", limit);
        return template.query(sql, params, new PostRowMapper());
    }

    public List<PostForm> getPostsByIds(List<Integer> postIds) {
        if (postIds.isEmpty()) return List.of();

        String sql = "SELECT p.*, (SELECT COUNT(*) FROM comment c WHERE c.post_id = p.id) AS comment_count " +
                "FROM post p WHERE p.id IN (:postIds) ORDER BY FIELD(p.id, :postIds)";

        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postIds", postIds);
        return template.query(sql, params, new PostRowMapper());
    }


    private static class PostRowMapper implements RowMapper<PostForm> {
        @Override
        public PostForm mapRow(ResultSet rs, int rowNum) throws SQLException, SQLException {
            PostForm post = new PostForm();
            post.setId(rs.getInt("id"));
            post.setPostId(rs.getInt("id")); // 設置 postId 為相同的值
            post.setUserId(rs.getInt("user_id"));
            post.setType(rs.getString("type"));
            post.setLocation(rs.getString("location"));
            post.setSkillOffered(rs.getString("skill_offered"));
            post.setSkillWanted(rs.getString("skill_wanted"));
            post.setSalary(rs.getString("salary"));
            post.setLikeCount(rs.getInt("like_count"));
            post.setBookClubPurpose(rs.getString("book_club_purpose"));
            post.setContent(rs.getString("content"));
            post.setMessageUrl(rs.getString("message_url"));
            post.setProfileUrl(rs.getString("profile_url"));
            post.setPostUrl(rs.getString("post_url"));
            post.setCommentCount(rs.getInt("comment_count"));
            post.setTag(Arrays.asList(rs.getString("tag").split(","))); // 假設 tag 是以逗號分隔的字符串
            post.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
            return post;
        }
    }

    public List<PostForm> findPostsBefore(LocalDateTime createdAt, int limit) {
        String sql = "SELECT * FROM post WHERE created_at < :createdAt ORDER BY created_at DESC LIMIT :limit";
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("createdAt", createdAt)
                .addValue("limit", limit);
        try{
            return template.query(sql, params, new BeanPropertyRowMapper<>(PostForm.class));
        }catch (Exception e){
            log.error("Error occurred while finding posts before createdAt: {} with limit: {}. Error: {}", createdAt, limit, e.getMessage(), e);
        }
        return null;
    }


    //update
    public void updateExchangePost(int postId, PostForm postForm) {
        String sql = "UPDATE post SET location = :location, skill_offered = :skillOffered, skill_wanted = :skillWanted, " +
                "content = :content, tag = :tags WHERE id = :postId";
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("location", postForm.getLocation())
                .addValue("skillOffered", postForm.getSkillOffered())
                .addValue("skillWanted", postForm.getSkillWanted())
                .addValue("content", postForm.getContent())
                .addValue("tags", String.join(",", postForm.getTag()))
                .addValue("postId", postId);
        template.update(sql, params);
    }

    public void updateFindTutorPost(int postId, PostForm postForm) {
        String sql = "UPDATE post SET location = :location, skill_wanted = :skillWanted, salary = :salary, " +
                "content = :content, tag = :tags WHERE id = :postId";
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("location", postForm.getLocation())
                .addValue("skillWanted", postForm.getSkillWanted())
                .addValue("salary", postForm.getSalary())
                .addValue("content", postForm.getContent())
                .addValue("tags", String.join(",", postForm.getTag()))
                .addValue("postId", postId);
        template.update(sql, params);
    }

    public void updateFindStudentPost(int postId, PostForm postForm) {
        String sql = "UPDATE post SET location = :location, skill_offered = :skillOffered, salary = :salary, " +
                "content = :content, tag = :tags WHERE id = :postId";
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("location", postForm.getLocation())
                .addValue("skillOffered", postForm.getSkillOffered())
                .addValue("salary", postForm.getSalary())
                .addValue("content", postForm.getContent())
                .addValue("tags", String.join(",", postForm.getTag()))
                .addValue("postId", postId);
        template.update(sql, params);
    }

    public void updateBookClubPost(int postId, PostForm postForm) {
        String sql = "UPDATE post SET location = :location, book_club_purpose = :bookClubPurpose, " +
                "content = :content, tag = :tags WHERE id = :postId";
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("location", postForm.getLocation())
                .addValue("bookClubPurpose", postForm.getBookClubPurpose())
                .addValue("content", postForm.getContent())
                .addValue("tags", String.join(",", postForm.getTag()))
                .addValue("postId", postId);
        template.update(sql, params);
    }

    public List<Map<String, Object>> getPopularTags() {
        String sql = "WITH RECURSIVE tag_split AS (" +
                "  SELECT id, SUBSTRING_INDEX(tag, ',', 1) AS tag, " +
                "    SUBSTRING(tag, LOCATE(',', tag) + 1) AS rest_tags " +
                "  FROM post WHERE tag IS NOT NULL " +
                "  UNION ALL " +
                "  SELECT id, SUBSTRING_INDEX(rest_tags, ',', 1), " +
                "    IF(LOCATE(',', rest_tags) > 0, SUBSTRING(rest_tags, LOCATE(',', rest_tags) + 1), NULL) " +
                "  FROM tag_split WHERE rest_tags != '' " +
                ") " +
                "SELECT LOWER(TRIM(tag)) AS tag, COUNT(*) AS count " +
                "FROM tag_split " +
                "GROUP BY tag " +
                "ORDER BY count DESC " +
                "LIMIT 7";

        return template.query(sql, (rs, rowNum) -> {
            Map<String, Object> tagMap = new HashMap<>();
            tagMap.put("tag", rs.getString("tag"));
            tagMap.put("count", rs.getInt("count"));
            return tagMap;
        });
    }

}
