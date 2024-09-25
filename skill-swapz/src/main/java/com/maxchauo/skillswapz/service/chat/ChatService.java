package com.maxchauo.skillswapz.service.chat;

import com.maxchauo.skillswapz.repository.chat.ChatRepository;

import lombok.extern.log4j.Log4j2;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Log4j2
@Service
public class ChatService {
    private final ChatRepository chatRepo;

    @Autowired
    public ChatService(ChatRepository chatDao) {
        this.chatRepo = chatDao;
    }

    public String createOrGetChatChannel(Integer userId1, Integer userId2) {
        log.info("createOrGetChatChannel called for users {} and {}", userId1, userId2);
        if (userId1 > userId2) {
            Integer temp = userId1;
            userId1 = userId2;
            userId2 = temp;
        }
        String chatUuid = chatRepo.createOrGetChatChannel(userId1, userId2);
        log.info("Chat channel created/retrieved: {}", chatUuid);
        return chatUuid;
    }

    public Integer sendMessage(String chatUuid, Integer senderId, Integer receiverId, String content) {
        return chatRepo.saveMessage(chatUuid, senderId, receiverId, content);
    }

    public List<Map<String, Object>> getMessages(String chatUuid) {
        return chatRepo.getMessagesByChatUuid(chatUuid);
    }

    public List<Map<String, Object>> getChatListForUser(Integer userId) {
        return chatRepo.getChatListForUser(userId);
    }
}
