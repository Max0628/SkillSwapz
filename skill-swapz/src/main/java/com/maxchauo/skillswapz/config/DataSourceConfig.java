package com.maxchauo.skillswapz.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.jdbc.DataSourceBuilder;
import javax.sql.DataSource;
import java.sql.Connection;

@Configuration
public class DataSourceConfig {

    private final SecretsManagerUtil secretsManagerUtil;
    private final Logger logger = LoggerFactory.getLogger(DataSourceConfig.class);

    public DataSourceConfig(SecretsManagerUtil secretsManagerUtil) {
        this.secretsManagerUtil = secretsManagerUtil;
    }

    @Bean
    public DataSource dataSource() {
        try {
            DatabaseConfig config = secretsManagerUtil.getDatabaseConfig();
            DataSource dataSource = DataSourceBuilder
                    .create()
                    .url(config.getJdbcUrl())
                    .username(config.getUsername())
                    .password(config.getPassword())
                    .driverClassName("com.mysql.cj.jdbc.Driver")
                    .build();

            // 測試連接
            try (Connection conn = dataSource.getConnection()) {
                logger.info("Database connection successful");
            }

            return dataSource;
        } catch (Exception e) {
            logger.error("Failed to create DataSource", e);
            throw new RuntimeException("Could not create DataSource", e);
        }
    }
}