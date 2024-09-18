package com.maxchauo.skillswapz.repository.user;

import com.maxchauo.skillswapz.data.form.user.User;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {
    private final NamedParameterJdbcTemplate jdbcTemplate;

    public UserRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public User findById(Integer id) {
        String sql = "SELECT * FROM user WHERE id = :id";
        MapSqlParameterSource params = new MapSqlParameterSource("id", id);
        return jdbcTemplate.queryForObject(sql, params, new BeanPropertyRowMapper<>(User.class));
    }

    public void updateProfile(User user) {
        String sql = "UPDATE user SET  job_title = :jobTitle, bio = :bio, avatar_url = :avatarUrl WHERE id = :id";
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("jobTitle", user.getJobTitle())
                .addValue("bio", user.getBio())
                .addValue("avatarUrl", user.getAvatarUrl());
        jdbcTemplate.update(sql, params);
    }
}
