package com.maxchauo.skillswapz.data.form.user;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class User {
    private  Integer id;
    private String avatarUrl;
    private String jobTitle;
    private String bio;
}
