package com.maxchauo.skillswapz.repository.post;

import com.maxchauo.skillswapz.data.form.post.CommentForm;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class CommentRepository {

    final NamedParameterJdbcTemplate template;

    public CommentRepository(NamedParameterJdbcTemplate template) {
        this.template = template;
    }

    public void insertComment(CommentForm commentForm) {

        String sql = "INSERT INTO `comment` (post_id,user_id,content) VALUES (:postId,:userId,:content)";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", commentForm.getPostId())
                .addValue("userId", commentForm.getUserId())
                .addValue("content", commentForm.getContent());

        template.update(sql, params);
    }

    public List<CommentForm> getCommentsForPost(int postId) {
        String sql = "SELECT * FROM comment WHERE post_id = :postId";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", postId);
        return template.query(sql, params, new BeanPropertyRowMapper<>(CommentForm.class));
    }

}
