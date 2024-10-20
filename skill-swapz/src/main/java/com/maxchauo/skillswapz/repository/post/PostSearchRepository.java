package com.maxchauo.skillswapz.repository.post;


import com.maxchauo.skillswapz.data.form.post.CommentForm;
import com.maxchauo.skillswapz.data.form.post.PostForm;
import lombok.extern.log4j.Log4j2;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Log4j2
@Repository
public class PostSearchRepository {

    final NamedParameterJdbcTemplate template;

    final CommentRepository commentRepository;

    public PostSearchRepository(NamedParameterJdbcTemplate template, CommentRepository commentRepository) {
        this.template = template;
        this.commentRepository = commentRepository;
    }

    public List<PostForm> searchPost(String keyword, String sortType, int page, int size) {
        String sql = "SELECT * FROM post WHERE (:keyword IS NULL OR " +
                "(location LIKE CONCAT('%', :keyword, '%') " +
                "OR type LIKE CONCAT('%', :keyword, '%') " +
                "OR skill_offered LIKE CONCAT('%', :keyword, '%') " +
                "OR skill_wanted LIKE CONCAT('%', :keyword, '%') " +
                "OR salary LIKE CONCAT('%', :keyword, '%') " +
                "OR book_club_purpose LIKE CONCAT('%', :keyword, '%') " +
                "OR content LIKE CONCAT('%', :keyword, '%') " +
                "OR tag LIKE CONCAT('%', :keyword, '%'))) " +
                "ORDER BY CASE WHEN :sort = 'likes' THEN like_count ELSE created_at END DESC " +
                "LIMIT :size OFFSET :offset";

        int offset = page * size;
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("keyword", keyword)
                .addValue("sort", sortType)
                .addValue("size", size)
                .addValue("offset", offset);

        List<PostForm> posts = template.query(sql, params, new BeanPropertyRowMapper<>(PostForm.class));

        for (PostForm post : posts) {
            List<CommentForm> comments = commentRepository.getCommentsForPost(post.getId());
            post.setComments(comments);
        }

        return posts;
    }


    public PostForm findPostById(int postId) {
        String sql = "SELECT * FROM post WHERE id = :postId";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", postId);

        try {
            return template.queryForObject(sql, params, new BeanPropertyRowMapper<>(PostForm.class));
        } catch (EmptyResultDataAccessException e) {
            return null;
        }
    }

    public List<PostForm> findPostsByIds(List<Integer> postIds) {
        if (postIds.isEmpty()) {
            return List.of();
        }

        String sql = "SELECT * FROM post WHERE id IN (:postIds)";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postIds", postIds);
        return template.query(sql, params, new BeanPropertyRowMapper<>(PostForm.class));
    }

    public List<PostForm> findPostsByUserId(Integer userId) {
        String sql = "SELECT * FROM `post` WHERE user_id = :userId";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("userId", userId);

        List<PostForm> posts = template.query(sql, params, new BeanPropertyRowMapper<>(PostForm.class));

        for (PostForm post : posts) {
            int likeCount = getLikeCountByPostId(post.getId());
            post.setLikeCount(likeCount);

            int commentCount = getCommentCountByPostId(post.getId());
            post.setCommentCount(commentCount);

            List<CommentForm> comments = commentRepository.getCommentsForPost(post.getId());
            post.setComments(comments);
        }

        return posts;
    }


    public List<CommentForm> findCommentsByPostId(int postId) {
        String sql = "SELECT * FROM comment WHERE post_id = :postId ORDER BY created_at ASC"; // 由舊到新
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", postId);

        return template.query(sql, params, new BeanPropertyRowMapper<>(CommentForm.class));
    }


    public int getLikeCountByPostId(int postId) {
        String sql = "SELECT like_count FROM post WHERE id = :postId";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", postId);
        return template.queryForObject(sql, params, Integer.class);
    }

    public int getCommentCountByPostId(int postId) {
        String sql = "SELECT COUNT(*) FROM comment WHERE post_id = :postId";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", postId);
        return template.queryForObject(sql, params, Integer.class);
    }
}
