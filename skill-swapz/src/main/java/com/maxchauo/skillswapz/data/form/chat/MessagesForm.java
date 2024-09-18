package com.maxchauo.skillswapz.data.form.chat;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class MessagesForm {
    private Integer senderId;
    private Integer receiverId;
    private String content;
}
