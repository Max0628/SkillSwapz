package com.maxchauo.skillswapz.repository.chat;

import lombok.extern.log4j.Log4j2;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Log4j2
@Repository
public class ChatRepository {

    private final NamedParameterJdbcTemplate template;

    @Autowired
    public ChatRepository(NamedParameterJdbcTemplate template) {
        this.template = template;
    }

    public String createOrGetChatChannel(Integer userId1, Integer userId2) {
        log.info("Repository: createOrGetChatChannel called for users {} and {}", userId1, userId2);
        String sqlCheck = "SELECT chat_uuid FROM chat_channel " +
                "WHERE (user_id_1 = :user_id_1 AND user_id_2 = :user_id_2) " +
                "OR (user_id_1 = :user_id_2 AND user_id_2 = :user_id_1)";

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("user_id_1", userId1)
                .addValue("user_id_2", userId2);

        List<String> results = template.queryForList(sqlCheck, params, String.class);
        if (!results.isEmpty()) {
            log.info("Existing chat channel found: {}", results.get(0));
            return results.get(0);
        }


        String chatUuid = UUID.randomUUID().toString();
        log.info("New chat channel created: {}", chatUuid);
        String sqlInsert = "INSERT INTO chat_channel (user_id_1, user_id_2, chat_uuid) " +
                "VALUES (:user_id_1, :user_id_2, :chat_uuid)";
        params.addValue("chat_uuid", chatUuid);

        template.update(sqlInsert, params);
        return chatUuid;
    }


    public Integer saveMessage(String chatUuid, Integer senderId, Integer receiverId, String content) {
        String sqlInsert = "INSERT INTO `chat_messages` (chat_uuid, sender_id, receiver_id, content) " +
                "VALUES (:chatUuid, :senderId, :receiverId, :content)";

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("chatUuid", chatUuid)
                .addValue("senderId", senderId)
                .addValue("receiverId", receiverId)
                .addValue("content", content);

        KeyHolder keyHolder = new GeneratedKeyHolder();

        try {
            template.update(sqlInsert, params, keyHolder, new String[]{"id"});
            return keyHolder.getKey().intValue();
        } catch (DataAccessException e) {
            // 記錄詳細的錯誤信息
            System.err.println("SQL Error: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to save message", e);
        }
    }

    public List<Map<String, Object>> getMessagesByChatUuid(String chatUuid) {
        String sql = "SELECT id, sender_id, receiver_id, content, created_at FROM `chat_messages` WHERE chat_uuid = :chat_uuid ORDER BY created_at ASC";
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("chat_uuid", chatUuid);

        return template.query(sql, params, (rs, rowNum) -> {
            Map<String, Object> message = new HashMap<>();
            message.put("id", rs.getInt("id"));
            message.put("sender_id", rs.getInt("sender_id"));
            message.put("receiver_id", rs.getInt("receiver_id"));
            message.put("content", rs.getString("content"));
            message.put("created_at", rs.getTimestamp("created_at").toString());
            return message;
        });
    }

    public List<Map<String, Object>> getChatListForUser(Integer userId) {
        String sql = "SELECT cc.*, cm.content as last_message, cm.created_at as last_message_time, " +
                "CASE WHEN cc.user_id_1 = :userId THEN cc.user_id_2 ELSE cc.user_id_1 END as other_user_id " +
                "FROM chat_channel cc " +
                "LEFT JOIN (SELECT chat_uuid, MAX(created_at) as max_created_at FROM chat_messages GROUP BY chat_uuid) latest " +
                "ON cc.chat_uuid = latest.chat_uuid " +
                "LEFT JOIN chat_messages cm ON latest.chat_uuid = cm.chat_uuid AND latest.max_created_at = cm.created_at " +
                "WHERE cc.user_id_1 = :userId OR cc.user_id_2 = :userId " +
                "ORDER BY cm.created_at DESC";

        MapSqlParameterSource params = new MapSqlParameterSource().addValue("userId", userId);

        return template.query(sql, params, (rs, rowNum) -> {
            Map<String, Object> chat = new HashMap<>();
            chat.put("chat_uuid", rs.getString("chat_uuid"));
            chat.put("other_user_id", rs.getInt("other_user_id"));
            chat.put("last_message", rs.getString("last_message"));
            chat.put("last_message_time", rs.getTimestamp("last_message_time"));
            return chat;
        });
    }

    //根據使用者的id尋找未讀的信息數量
    public int countUnreadMessagesForUser(int userId) {
        String sql = "SELECT COUNT(*) FROM chat_messages WHERE receiver_id = :userId AND is_read = 0";
        return template.queryForObject(sql, new MapSqlParameterSource("userId", userId), Integer.class);
    }

    //將使用者id作為接收者id,配合聊天室uuid名稱，搜尋尚未讀取的信息數量
    public int countUnreadMessagesForChat(String chatUuid, int userId) {
        String sql = "SELECT COUNT(*) FROM chat_messages WHERE chat_uuid = :chatUuid AND receiver_id = :userId AND is_read = 0";
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("chatUuid", chatUuid)
                .addValue("userId", userId);
        return template.queryForObject(sql, params, Integer.class);
    }

    //根據使用者id作為接收者id,當試用者閱讀過信息後，把相對應的聊天室信息改為已讀
    public void markMessagesAsRead(String chatUuid, int userId) {
        String sql = "UPDATE chat_messages SET is_read = 1 WHERE chat_uuid = :chatUuid AND receiver_id = :userId AND is_read = 0";
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("chatUuid", chatUuid)
                .addValue("userId", userId);
        template.update(sql, params);
    }

    //
    public List<Map<String, Object>> getUnreadMessageCountsForUser(int userId) {
        String sql = "SELECT chat_uuid, COUNT(*) as unread_count FROM chat_messages " +
                "WHERE receiver_id = :userId AND is_read = 0 GROUP BY chat_uuid";
        return template.queryForList(sql, new MapSqlParameterSource("userId", userId));
    }
}
