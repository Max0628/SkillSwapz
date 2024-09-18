package com.maxchauo.skillswapz.repository.chat;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository
public class ChatRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    @Autowired
    public ChatRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public String createOrGetChatChannel(Integer userId1, Integer userId2) {

        String sqlCheck = "SELECT chat_uuid FROM chat_channel " +
                "WHERE (user_id_1 = :user_id_1 AND user_id_2 = :user_id_2) " +
                "OR (user_id_1 = :user_id_2 AND user_id_2 = :user_id_1)";

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("user_id_1", userId1)
                .addValue("user_id_2", userId2);

        List<String> results = jdbcTemplate.queryForList(sqlCheck, params, String.class);
        if (!results.isEmpty()) {
            return results.get(0);
        }

        String chatUuid = UUID.randomUUID().toString();
        String sqlInsert = "INSERT INTO chat_channel (user_id_1, user_id_2, chat_uuid) " +
                "VALUES (:user_id_1, :user_id_2, :chat_uuid)";
        params.addValue("chat_uuid", chatUuid);

        jdbcTemplate.update(sqlInsert, params);
        return chatUuid;
    }


    public Integer saveMessage(String chatUuid, Integer senderId, Integer receiverId, String content) {
        String sqlInsert = "INSERT INTO `chat_message` (chat_uuid, sender_id, receiver_id, content) VALUES (:chat_uuid, :sender_id, :receiver_id, :content)";
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("chat_uuid", chatUuid)
                .addValue("sender_id", senderId)
                .addValue("receiver_id", receiverId)
                .addValue("content", content);

        jdbcTemplate.update(sqlInsert, params);

        String sqlGetMessageId = "SELECT LAST_INSERT_ID()";
        return jdbcTemplate.queryForObject(sqlGetMessageId, params, Integer.class);
    }

    public List<Map<String, Object>> getMessagesByChatUuid(String chatUuid) {
        String sql = "SELECT id, sender_id, receiver_id, content, created_at FROM message WHERE chat_uuid = :chat_uuid ORDER BY created_at ASC";
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("chat_uuid", chatUuid);

        return jdbcTemplate.query(sql, params, (rs, rowNum) -> {
            Map<String, Object> message = new HashMap<>();
            message.put("id", rs.getInt("id"));
            message.put("sender_id", rs.getInt("sender_id"));
            message.put("receiver_id", rs.getInt("receiver_id"));
            message.put("content", rs.getString("content"));
            message.put("created_at", rs.getTimestamp("created_at").toString());
            return message;
        });
    }
}

