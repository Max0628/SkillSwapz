package com.maxchauo.skillswapz.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
    @EnableWebSocketMessageBroker
    public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
        @Override
        public void configureMessageBroker(MessageBrokerRegistry config) {
            config.enableSimpleBroker("/queue", "/topic");
            config.setUserDestinationPrefix("/user");
            config.setApplicationDestinationPrefixes("/app");
        }

        @Override
        public void registerStompEndpoints(StompEndpointRegistry registry) {
            registry.addEndpoint("/ws")
                    .setAllowedOrigins(
                            "https://skillswapz.com",
                            "https://www.skillswapz.com",
                            "http://skillswapz.com",
                            "http://www.skillswapz.com",
                            "http://localhost:8080"
                    )
                    .addInterceptors(new UserHandshakeInterceptor())
                    .setHandshakeHandler(new UserHandshakeHandler())
                    .withSockJS();
        }
    }
