package com.maxchauo.skillswapz.data.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class NotificationMessage {
    private String type;
    private Long senderId;
    private String chatUuid;
}
