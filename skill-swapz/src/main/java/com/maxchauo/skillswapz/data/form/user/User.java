package com.maxchauo.skillswapz.data.form.user;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class User {
    private  Integer id;
    private String username;
    private String email;
    private String password;
    private String avatarUrl;
    private String jobTitle;
    private String bio;
}
