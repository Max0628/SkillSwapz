package com.maxchauo.skillswapz.data.form.post;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class TagForm {
    private Integer categoryId;
    private String tagName;
}
