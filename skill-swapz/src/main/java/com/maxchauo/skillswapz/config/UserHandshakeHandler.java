package com.maxchauo.skillswapz.config;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;

public class UserHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(
            ServerHttpRequest request,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {

        String userId = (String) attributes.get("user_id");
        if (userId == null) {
            throw new IllegalArgumentException("User ID not found in handshake attributes");
        }
        return new StompPrincipal(userId);
    }
}
