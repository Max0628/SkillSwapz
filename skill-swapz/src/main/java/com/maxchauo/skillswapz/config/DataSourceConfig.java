package com.maxchauo.skillswapz.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.jdbc.DataSourceBuilder;
import javax.sql.DataSource;

@Configuration
public class DataSourceConfig {

    private final SecretsManagerUtil secretsManagerUtil;

    public DataSourceConfig(SecretsManagerUtil secretsManagerUtil) {
        this.secretsManagerUtil = secretsManagerUtil;
    }

    @Bean
    public DataSource dataSource() {
        DatabaseConfig config = secretsManagerUtil.getDatabaseConfig();
        return DataSourceBuilder
                .create()
                .url(config.getJdbcUrl())
                .username(config.getUsername())
                .password(config.getPassword())
                .driverClassName("com.mysql.cj.jdbc.Driver")
                .build();
    }
}