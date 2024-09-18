package com.maxchauo.skillswapz.rowmapper;

import com.maxchauo.skillswapz.data.form.auth.UserDto;
import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.sql.SQLException;

public class UserRowMapper implements RowMapper<UserDto> {
    @Override
    public UserDto mapRow(ResultSet rs, int rowNum) throws SQLException {
        UserDto userDto = new UserDto();
        userDto.setId(rs.getInt("id"));
        userDto.setEmail(rs.getString("email"));
        userDto.setPassword(rs.getString("password"));
        userDto.setUsername(rs.getString("username"));
        userDto.setJob_title(rs.getNString("job_title"));
        userDto.setBio(rs.getString("bio"));
        userDto.setAvatar_url(rs.getNString("avatar_url"));
        return userDto;
    }
}
