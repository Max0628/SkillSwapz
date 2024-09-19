package com.maxchauo.skillswapz.controller.chat;

import com.maxchauo.skillswapz.data.dto.chat.ChatMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.HashMap;
import java.util.Map;

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
        if (chatUuid == null || chatUuid.isEmpty()) {
            throw new IllegalArgumentException("Chat UUID is required");
        }

        // 使用用戶特定的目的地前綴發送消息
        messagingTemplate.convertAndSendToUser(
                chatMessage.getReceiver_id().toString(),
                "/queue/private/" + chatUuid,
                chatMessage);
    }

//    @MessageMapping("/startChat")
//    public void startChat(@Payload ChatMessage chatMessage) {
//        // 發送通知給接收者
//        Map<String, Object> notification = new HashMap<>();
//        notification.put("type", "newChat");
//        notification.put("senderId", chatMessage.getSender_id());
//        notification.put("chatUuid", chatMessage.getChatUuid());
//
//        messagingTemplate.convertAndSendToUser(
//                chatMessage.getReceiver_id().toString(),
//                "/queue/notifications",
//                notification
//        );
//    }

}