package com.maxchauo.skillswapz.repository.post;

import com.maxchauo.skillswapz.data.form.post.CommentForm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CommentRepository {

    @Autowired
    NamedParameterJdbcTemplate template;

    public void insertComment(CommentForm commentForm) {

        String sql = "INSERT INTO `comment` (post_id,user_id,content) VALUES (:postId,:userId,:content)";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", commentForm.getPostId())
                .addValue("userId", commentForm.getUserId())
                .addValue("content", commentForm.getContent());

        template.update(sql, params);
    }

}
