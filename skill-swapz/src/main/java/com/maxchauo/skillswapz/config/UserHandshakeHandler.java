package com.maxchauo.skillswapz.config;

import java.security.Principal;
import java.util.Map;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

public class UserHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(
            ServerHttpRequest request,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {

        String userId = (String) attributes.get("userId");
        if (userId == null) {
            throw new IllegalArgumentException("User ID not found in handshake attributes");
        }
        return new StompPrincipal(userId);
    }
}
