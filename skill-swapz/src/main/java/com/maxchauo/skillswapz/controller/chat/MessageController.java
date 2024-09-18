package com.maxchauo.skillswapz.controller.chat;

import com.maxchauo.skillswapz.data.dto.chat.ChatMessage;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Controller
public class MessageController {

    private final SimpMessagingTemplate messagingTemplate;

    public MessageController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/triggerSubscription")
    public void triggerSubscription(@Payload ChatMessage chatMessage) {
        String chatUuid = chatMessage.getChatUuid();


        if (chatUuid == null || chatUuid.isEmpty()) {
            chatUuid = UUID.randomUUID().toString();
        }

        String privateChatRoom = "/queue/private/" + chatUuid;


        Map<String, Object> notification = new HashMap<>();
        notification.put("privateChatRoom", privateChatRoom);
        notification.put("sender", chatMessage.getSender_id());
        notification.put("chatUuid", chatUuid);


        messagingTemplate.convertAndSendToUser(
                chatMessage.getReceiver_id().toString(),
                "/queue/subscribe",
                notification);

        messagingTemplate.convertAndSendToUser(
                chatMessage.getSender_id().toString(),
                "/queue/subscribe",
                notification);
    }


    @MessageMapping("/sendMessage")
    public void sendMessage(@Payload ChatMessage chatMessage) {
        String chatUuid = chatMessage.getChatUuid();
        if (chatUuid == null || chatUuid.isEmpty()) {
            throw new IllegalArgumentException("Chat UUID is required");
        }
        String privateChatRoom = "/queue/private/" + chatUuid;
        messagingTemplate.convertAndSend(privateChatRoom, chatMessage);
    }

}
