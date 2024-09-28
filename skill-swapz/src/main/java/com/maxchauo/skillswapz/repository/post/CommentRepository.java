package com.maxchauo.skillswapz.repository.post;

import com.maxchauo.skillswapz.data.form.post.CommentForm;

import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Time;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class CommentRepository {

    final NamedParameterJdbcTemplate template;

    public CommentRepository(NamedParameterJdbcTemplate template) {
        this.template = template;
    }

    public CommentForm insertComment(CommentForm commentForm) {
        // 插入評論
        String sql =
                "INSERT INTO `comment` (post_id, user_id, content) VALUES (:postId, :userId, :content)";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", commentForm.getPostId())
                .addValue("userId", commentForm.getUserId())
                .addValue("content", commentForm.getContent());

        KeyHolder keyHolder = new GeneratedKeyHolder();
        template.update(sql, params, keyHolder, new String[] {"id"});

        Integer commentId = keyHolder.getKey().intValue();
        commentForm.setId(commentId);

        String fetchSql = "SELECT created_at FROM `comment` WHERE id = :commentId";
        MapSqlParameterSource fetchParams = new MapSqlParameterSource();
        fetchParams.addValue("commentId", commentId);

        try {
            LocalDateTime createdAt = template.queryForObject(fetchSql, fetchParams, LocalDateTime.class);
            commentForm.setCreatedAt(createdAt);
        } catch (EmptyResultDataAccessException e) {
            System.err.println("Failed to fetch created_at for commentId: " + commentId);
            commentForm.setCreatedAt(null);
        }

        return commentForm;
    }

    public Optional<CommentForm> findById(Integer commentId) {
        String sql = "SELECT * FROM comment WHERE id = :commentId";
        MapSqlParameterSource params = new MapSqlParameterSource().addValue("commentId", commentId);
        List<CommentForm> comments =
                template.query(sql, params, new BeanPropertyRowMapper<>(CommentForm.class));
        if (comments.isEmpty()) {
            return Optional.empty();
        } else {
            return Optional.of(comments.get(0));
        }
    }

    public void deleteById(Integer commentId) {
        String sql = "DELETE FROM comment WHERE id = :commentId";
        MapSqlParameterSource params = new MapSqlParameterSource().addValue("commentId", commentId);
        template.update(sql, params);
    }

    public List<CommentForm> getCommentsForPost(int postId) {
        String sql = "SELECT * FROM comment WHERE post_id = :postId";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", postId);
        return template.query(sql, params, new BeanPropertyRowMapper<>(CommentForm.class));
    }
    }

    
