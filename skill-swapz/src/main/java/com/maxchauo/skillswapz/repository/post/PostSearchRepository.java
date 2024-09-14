package com.maxchauo.skillswapz.repository.post;


import com.maxchauo.skillswapz.data.form.post.PostForm;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Log4j2
@Repository
public class PostSearchRepository {

    @Autowired
    NamedParameterJdbcTemplate template;

    public List<PostForm> searchPost(String keyword, String sortType) {
        String sql = "SELECT * FROM post WHERE (:keyword IS NULL OR " +
                "(location LIKE CONCAT('%', :keyword, '%') " +
                "OR skill_offered LIKE CONCAT('%', :keyword, '%') " +
                "OR skill_wanted LIKE CONCAT('%', :keyword, '%') " +
                "OR salary LIKE CONCAT('%', :keyword, '%') " +
                "OR book_club_purpose LIKE CONCAT('%', :keyword, '%') " +
                "OR content LIKE CONCAT('%', :keyword, '%'))) " +
                "ORDER BY CASE WHEN :sort = 'likes' THEN like_count ELSE created_at END DESC";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("keyword", keyword)
                .addValue("sort", sortType);
        return template.query(sql, params, new BeanPropertyRowMapper<>(PostForm.class));
    }

}
