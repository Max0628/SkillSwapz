package com.maxchauo.skillswapz.data.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class ChatStartRequest {
    private Long sender_id;
    private Long receiver_id;
    private String chatUuid;
}
