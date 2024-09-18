package com.maxchauo.skillswapz.repository.post;

import com.maxchauo.skillswapz.data.form.post.PostLikeForm;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Log4j2
@Repository
public class LikeRepository {

    @Autowired
    NamedParameterJdbcTemplate template;

    public boolean isLiked(PostLikeForm postLikeForm) {
        String sql = "SELECT COUNT(*) FROM `post_like` WHERE post_id = :postId AND user_id = :userId";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", postLikeForm.getPostId())
                .addValue("userId", postLikeForm.getUserId());

        Integer count = template.queryForObject(sql, params, Integer.class);
        log.info("count:{}", count);
        return count != null && count > 0;
    }

    public void insertLike(PostLikeForm postLikeForm) {
        String sql = "INSERT INTO `post_like` (post_id, user_id) VALUES (:postId, :userId)";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", postLikeForm.getPostId())
                .addValue("userId", postLikeForm.getUserId());

        template.update(sql, params);
    }

    public void deleteLike(PostLikeForm postLikeForm) {
        String sql = "DELETE FROM `post_like` WHERE post_id = :postId AND user_id = :userId";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", postLikeForm.getPostId())
                .addValue("userId", postLikeForm.getUserId());

        template.update(sql, params);
    }

    public int getLikeCount(int postId) {
        String sql = "SELECT COUNT(*) FROM `post_like` WHERE post_id = :postId";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", postId);

        return template.queryForObject(sql, params, Integer.class);
    }


    public List<Integer> findLikedPostIdsByUserId(Integer userId) {
        String sql = "SELECT post_id FROM post_like WHERE user_id = :userId";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("userId", userId);
        return template.queryForList(sql, params, Integer.class);
    }
}
