package com.maxchauo.skillswapz.controller.chat;

import com.maxchauo.skillswapz.data.dto.chat.ChatMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class MessageController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public MessageController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/sendMessage")
    public void sendMessage(@Payload ChatMessage chatMessage) {
        String chatUuid = chatMessage.getChatUuid();
        System.out.println(chatMessage);
        if (chatUuid == null || chatUuid.isEmpty()) {
            throw new IllegalArgumentException("Chat UUID is required");
        }

        // 使用用戶特定的目的地前綴發送消息
        messagingTemplate.convertAndSendToUser(
                chatMessage.getReceiver_id().toString(),
                "/queue/private/" + chatUuid,
                chatMessage);
    }
}