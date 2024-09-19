package com.maxchauo.skillswapz.repository.auth;

import com.maxchauo.skillswapz.data.form.auth.UserDto;
import com.maxchauo.skillswapz.middleware.JwtTokenUtil;
import com.maxchauo.skillswapz.rowmapper.UserRowMapper;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Repository;

import java.util.Collections;

@Log4j2
@Repository
public class AuthRepository {
    @Autowired
    private NamedParameterJdbcTemplate template;

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    public UserDto getUserByEmail(String email) {
        String sql = "SELECT * FROM `user` WHERE email=:email";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("email", email);
        try {
            return template.queryForObject(sql, params, new UserRowMapper());
        } catch (EmptyResultDataAccessException e) {
            return null;
        }
    }

    public UserDto getUserById(Integer id) {
        String sql = "SELECT * FROM `user` WHERE id = :id";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("id", id);
        return template.queryForObject(sql, params, new UserRowMapper());
    }

    public Integer saveUser(UserDto user) {
        String sql = "INSERT INTO `user` (username,email,password,avatar_url,job_title,bio)" +
                "VALUES(:username,:email,:password,:avatar_url,:job_title,:bio)";

        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("username", user.getUsername())
                .addValue("email", user.getEmail())
                .addValue("password", user.getPassword())
                .addValue("avatar_url", user.getAvatar_url())
                .addValue("job_title", user.getJob_title())
                .addValue("bio", user.getBio());
        return template.update(sql, params);
    }

    public UserDetails getUserDetailsByToken(String token) {
        String username = jwtTokenUtil.getUsernameFromToken(token);
        UserDto user = getUserByEmail(username);
        if (user == null) {
            throw new UsernameNotFoundException("User not found with token: " + token);
        }

        return User.builder()
                .username(user.getEmail())
                .password(user.getPassword())
                .authorities(Collections.emptyList())
                .build();
    }
}