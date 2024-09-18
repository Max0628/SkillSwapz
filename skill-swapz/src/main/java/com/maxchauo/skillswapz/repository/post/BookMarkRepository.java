package com.maxchauo.skillswapz.repository.post;

import com.maxchauo.skillswapz.data.form.post.PostBookmarkForm;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Log4j2
@Repository
public class BookMarkRepository {

    @Autowired
    NamedParameterJdbcTemplate template;

    public boolean isBookMark(PostBookmarkForm bookmark) {
        String sql = "SELECT COUNT(*) FROM `post_bookmark` WHERE post_id = :postId AND user_id = :userId";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", bookmark.getPostId())
                .addValue("userId", bookmark.getUserId());

        Integer count = template.queryForObject(sql, params, Integer.class);
        log.info("count:{}", count);
        return count != null && count > 0;
    }

    public void insertBookMark(PostBookmarkForm bookmark) {
        String sql = "INSERT INTO `post_bookmark` (post_id, user_id) VALUES (:postId, :userId)";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", bookmark.getPostId())
                .addValue("userId", bookmark.getUserId());

        template.update(sql, params);
    }

    public void deleteBookMark(PostBookmarkForm bookmark) {
        String sql = "DELETE FROM `post_bookmark` WHERE post_id = :postId AND user_id = :userId";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("postId", bookmark.getPostId())
                .addValue("userId", bookmark.getUserId());

        template.update(sql, params);
    }

    public List<Integer> findBookmarkedPostIdsByUserId(Integer userId) {
        String sql = "SELECT post_id FROM post_bookmark WHERE user_id = :userId";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("userId", userId);
        return template.queryForList(sql, params, Integer.class);
    }

}
