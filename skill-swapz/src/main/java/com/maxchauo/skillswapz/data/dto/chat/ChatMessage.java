package com.maxchauo.skillswapz.data.dto.chat;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class ChatMessage {
    private Integer sender_id;
    private Integer receiver_id;
    private String content;
    private String chatUuid;
}
