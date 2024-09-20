package com.maxchauo.skillswapz.data.dto.chat;


import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@NoArgsConstructor
@AllArgsConstructor
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatMessage {
    private Integer id;
    private Integer sender_id;
    private Integer receiver_id;
    private String content;
    private String chatUuid;
    @JsonProperty("created_at")
    private LocalDateTime createdAt;
}
