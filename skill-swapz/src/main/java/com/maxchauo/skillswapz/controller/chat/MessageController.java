package com.maxchauo.skillswapz.controller.chat;

import com.maxchauo.skillswapz.data.dto.chat.ChatMessage;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class MessageController {

    private final SimpMessagingTemplate messagingTemplate;

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
        
        messagingTemplate.convertAndSendToUser(
                chatMessage.getReceiver_id().toString(),
                "/queue/private/" + chatUuid,
                chatMessage);
    }
}