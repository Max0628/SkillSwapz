package com.maxchauo.skillswapz.config;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class DatabaseConfig {
    private final String host;
    private final String port;
    private final String dbName;
    private final String username;
    private final String password;

    public String getJdbcUrl() {
        return String.format("jdbc:mysql://%s:%s/%s?useSSL=false&serverTimezone=UTC", host, port, dbName);
    }
}