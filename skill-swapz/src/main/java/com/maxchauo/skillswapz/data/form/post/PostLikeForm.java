package com.maxchauo.skillswapz.data.form.post;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class PostLikeForm {
    private Integer postId;
    private Integer userId;
}
