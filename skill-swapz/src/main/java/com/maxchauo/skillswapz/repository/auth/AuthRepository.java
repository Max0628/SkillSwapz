package com.maxchauo.skillswapz.repository.auth;

import com.maxchauo.skillswapz.data.form.auth.UserDto;
import com.maxchauo.skillswapz.middleware.JwtTokenUtil;

import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Repository;

import java.util.Collections;

@Repository
public class AuthRepository {
    private final NamedParameterJdbcTemplate template;

    private final JwtTokenUtil jwtTokenUtil;

    public AuthRepository(NamedParameterJdbcTemplate template, JwtTokenUtil jwtTokenUtil) {
        this.template = template;
        this.jwtTokenUtil = jwtTokenUtil;
    }

    public UserDto getUserByEmail(String email) {
        String sql = "SELECT * FROM `user` WHERE email=:email";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("email", email);
        try {
            return template.queryForObject(sql, params, new BeanPropertyRowMapper<>(UserDto.class));
        } catch (EmptyResultDataAccessException e) {
            return null;
        }
    }


    public void saveUser(UserDto user) {
        String sql = "INSERT INTO `user` (username,email,password,avatar_url,job_title,bio)" +
                "VALUES(:username,:email,:password,:avatar_url,:job_title,:bio)";

        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("username", user.getUsername())
                .addValue("email", user.getEmail())
                .addValue("password", user.getPassword())
                .addValue("avatar_url", user.getAvatarUrl())
                .addValue("job_title", user.getJobTitle())
                .addValue("bio", user.getBio());
        template.update(sql, params);
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
