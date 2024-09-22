package com.maxchauo.skillswapz.repository.post;

import com.maxchauo.skillswapz.data.form.post.PostForm;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class PostRepository {
    final NamedParameterJdbcTemplate template;

    public PostRepository(NamedParameterJdbcTemplate template) {
        this.template = template;
    }

    public Integer insertExchangeForm(PostForm postForm) {
        String sql = "INSERT INTO `post` (type,user_id,location,skill_offered,skill_wanted,content,tag)" +
                "VALUES (:type,:user_id,:location,:skill_offered,:skill_wanted,:content,:tag)";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("type", postForm.getType())
                .addValue("user_id", postForm.getUserId())
                .addValue("location", postForm.getLocation())
                .addValue("skill_offered", postForm.getSkillOffered())
                .addValue("skill_wanted", postForm.getSkillWanted())
                .addValue("content", postForm.getContent())
                .addValue("tag", String.join(",", postForm.getTag()));
        KeyHolder keyHolder = new GeneratedKeyHolder();
        template.update(sql, params, keyHolder, new String[]{"id"});
        return keyHolder.getKey().intValue();
    }

    public Integer insertFindTutorForm(PostForm postForm) {
        String sql = "INSERT INTO `post` (type,user_id,location,skill_wanted,salary,content,tag)" +
                "VALUES (:type,:user_id,:location,:skill_wanted,:salary,:content,:tag)";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("type", postForm.getType())
                .addValue("user_id", postForm.getUserId())
                .addValue("location", postForm.getLocation())
                .addValue("skill_wanted", postForm.getSkillWanted())
                .addValue("salary", postForm.getSalary())
                .addValue("content", postForm.getContent())
                .addValue("tag", String.join(",", postForm.getTag()));
        KeyHolder keyHolder = new GeneratedKeyHolder();
        template.update(sql, params, keyHolder, new String[]{"id"});
        return keyHolder.getKey().intValue();
    }

    public Integer insertFindStudentForm(PostForm postForm) {
        String sql = "INSERT INTO `post` (type,user_id,location,skill_offered,salary,content,tag)" +
                "VALUES (:type,:user_id,:location,:skill_offered,:salary,:content,:tag)";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("type", postForm.getType())
                .addValue("user_id", postForm.getUserId())
                .addValue("location", postForm.getLocation())
                .addValue("skill_offered", postForm.getSkillOffered())
                .addValue("salary", postForm.getSalary())
                .addValue("content", postForm.getContent())
                .addValue("tag", String.join(",", postForm.getTag()));
        KeyHolder keyHolder = new GeneratedKeyHolder();
        template.update(sql, params, keyHolder, new String[]{"id"});
        return keyHolder.getKey().intValue();
    }

    public Integer insertFindBookClubForm(PostForm postForm) {
        String sql = "INSERT INTO `post` (type,user_id,location,book_club_purpose,content,tag)" +
                "VALUES (:type,:user_id,:location,:book_club_purpose,:content,:tag)";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("type", postForm.getType())
                .addValue("user_id", postForm.getUserId())
                .addValue("location", postForm.getLocation())
                .addValue("book_club_purpose", postForm.getBookClubPurpose())
                .addValue("content", postForm.getContent())
                .addValue("tag", String.join(",", postForm.getTag()));
        KeyHolder keyHolder = new GeneratedKeyHolder();
        template.update(sql, params, keyHolder, new String[]{"id"});
        return keyHolder.getKey().intValue();
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
