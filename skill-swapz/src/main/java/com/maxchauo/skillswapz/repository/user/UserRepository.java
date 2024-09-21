package com.maxchauo.skillswapz.repository.user;

import com.maxchauo.skillswapz.data.form.auth.UserDto;
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

    public UserDto findById(Integer userId) {
        String sql = "SELECT * FROM` `user`` WHERE id = :id";
        MapSqlParameterSource params = new MapSqlParameterSource().addValue("id", userId);
        return jdbcTemplate.queryForObject(sql, params, (rs, rowNum) -> {
            UserDto user = new UserDto();
            user.setId(rs.getInt("id"));
            user.setUsername(rs.getString("username"));
            user.setEmail(rs.getString("email"));
            user.setAvatar_url(rs.getString("avatar_url"));
            user.setJob_title(rs.getString("job_title"));
            user.setBio(rs.getString("bio"));
            return user;
        });
    }

    public void updateProfile(UserDto user) {
        String sql = "UPDATE `user` SET job_title = :jobTitle, bio = :bio, avatar_url = :avatarUrl WHERE id = :id";
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("id", user.getId())
                .addValue("jobTitle", user.getJob_title())
                .addValue("bio", user.getBio())
                .addValue("avatarUrl", user.getAvatar_url());
        jdbcTemplate.update(sql, params);
    }
}
