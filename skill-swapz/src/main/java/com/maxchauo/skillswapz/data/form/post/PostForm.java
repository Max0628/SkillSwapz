package com.maxchauo.skillswapz.data.form.post;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@NoArgsConstructor
@AllArgsConstructor
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PostForm {
    private Integer id;
    private Integer userId;
    private Integer postId;
    private String type;
    private String location;
    private String skillOffered;
    private String skillWanted;
    private String salary;
    private Integer likeCount;
    private String bookClubPurpose;
    private String content;
    private String messageUrl;
    private String profileUrl;
    private String postUrl;
    private List<String> tag;
    private List<CommentForm> comments;
}
