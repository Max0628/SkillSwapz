package com.maxchauo.skillswapz.repository.post;

import com.maxchauo.skillswapz.data.form.post.PostForm;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

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

}
