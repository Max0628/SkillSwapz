package com.maxchauo.skillswapz.data.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class ReadMessage {
    private String chatUuid;
    private Integer userId;
}
