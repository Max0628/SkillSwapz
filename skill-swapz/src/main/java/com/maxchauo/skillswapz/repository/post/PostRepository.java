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
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Set;
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
            e.printStackTrace();
            return false;
        } catch (Exception e) {
            System.err.println("Unexpected error occurred while deleting post with id " + postId + " and user_id " + userId);
            e.printStackTrace();
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

        String sql = "SELECT * FROM post WHERE id IN (:postIds) ORDER BY FIELD(id, :postIds)";
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
            post.setTag(Arrays.asList(rs.getString("tag").split(","))); // 假設 tag 是以逗號分隔的字符串
            post.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
            return post;
        }
    }

    public List<PostForm> findLatestPostsAfter(int offset, int limit) {
        String sql = "SELECT * FROM post ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("limit", limit)
                .addValue("offset", offset);
        return template.query(sql, params, new BeanPropertyRowMapper<>(PostForm.class));
    }
}
