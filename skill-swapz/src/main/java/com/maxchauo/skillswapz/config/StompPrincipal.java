package com.maxchauo.skillswapz.config;

import java.security.Principal;

public class StompPrincipal implements Principal {
    private final String userId;

    public StompPrincipal(String userId) {
        this.userId = userId;
    }

    @Override
    public String getName() {
        return userId;
    }
}
