package com.maxchauo.skillswapz.repository.post;

import com.maxchauo.skillswapz.data.form.post.PostForm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class PostRepository {
    @Autowired
    NamedParameterJdbcTemplate template;

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

    // 增加文章的點讚數
    public void incrementLikeCount(int postId) {
        String sql = "UPDATE `post` SET like_count = like_count + 1 WHERE id = :postId";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", postId);

        template.update(sql, params);
    }

    // 減少文章的點讚數
    public void decrementLikeCount(int postId) {
        String sql = "UPDATE `post` SET like_count = like_count - 1 WHERE id = :postId";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", postId);

        template.update(sql, params);
    }
}
