package com.maxchauo.skillswapz.repository.user;

import com.maxchauo.skillswapz.data.form.auth.UserDto;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {
    private final NamedParameterJdbcTemplate template;

    public UserRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.template = jdbcTemplate;
    }

    public UserDto findById(Integer userId) {
        String sql = "SELECT * FROM `user` WHERE id = :id";
        MapSqlParameterSource params = new MapSqlParameterSource().addValue("id", userId);
        return template.queryForObject(sql, params, (rs, rowNum) -> {
            UserDto user = new UserDto();
            user.setId(rs.getInt("id"));
            user.setUsername(rs.getString("username"));
            user.setEmail(rs.getString("email"));
            user.setAvatarUrl(rs.getString("avatar_url"));
            user.setJobTitle(rs.getString("job_title"));
            user.setBio(rs.getString("bio"));
            return user;
        });
    }

    public void updateProfile(UserDto user) {
        String sql = "UPDATE `user` SET username = :username, job_title = :jobTitle, bio = :bio WHERE id = :id";
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("id", user.getId())
                .addValue("username", user.getUsername())
                .addValue("jobTitle", user.getJobTitle())
                .addValue("bio", user.getBio());

        try {
            int rowsAffected = template.update(sql, params);
            if (rowsAffected == 0) {
                throw new RuntimeException("No rows updated, user might not exist.");
            }
        } catch (DataAccessException e) {
            System.err.println("Database error occurred while updating user profile: " + e.getMessage());
            throw new RuntimeException("Error updating user profile", e);
        } catch (Exception e) {
            System.err.println("Unexpected error occurred: " + e.getMessage());
            throw new RuntimeException("Unexpected error occurred while updating profile", e);
        }
    }


    public void updateAvatarUrl(Integer userId, String avatarUrl) {
        String sql = "UPDATE `user` SET avatar_url = :avatarUrl WHERE id = :id";
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("id", userId)
                .addValue("avatarUrl", avatarUrl);

        try {
            int rowsAffected = template.update(sql, params);
            if (rowsAffected == 0) {
                throw new RuntimeException("No rows updated, user might not exist.");
            }
        } catch (DataAccessException e) {
            System.err.println("Database error occurred while updating avatar URL: " + e.getMessage());
            throw new RuntimeException("Error updating avatar URL", e);
        } catch (Exception e) {
            System.err.println("Unexpected error occurred: " + e.getMessage());
            throw new RuntimeException("Unexpected error occurred while updating avatar URL", e);
        }
    }

}
