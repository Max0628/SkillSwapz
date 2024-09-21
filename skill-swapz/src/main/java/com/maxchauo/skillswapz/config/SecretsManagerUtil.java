package com.maxchauo.skillswapz.config;

import com.amazonaws.services.secretsmanager.AWSSecretsManager;
import com.amazonaws.services.secretsmanager.AWSSecretsManagerClientBuilder;
import com.amazonaws.services.secretsmanager.model.GetSecretValueRequest;
import com.amazonaws.services.secretsmanager.model.GetSecretValueResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class SecretsManagerUtil {

    private static final String SECRET_NAME = "ss-rds-secret";
    private static final String REGION = "ap-northeast-1";

    public DatabaseConfig getDatabaseConfig() {
        try {
            String secretString = getSecret();
            return parseSecretString(secretString);
        } catch (Exception e) {
            throw new RuntimeException("Error retrieving database configuration", e);
        }
    }

    private String getSecret() {
        AWSSecretsManager client = AWSSecretsManagerClientBuilder.standard()
                .withRegion(REGION)
                .build();

        GetSecretValueRequest getSecretValueRequest = new GetSecretValueRequest()
                .withSecretId(SECRET_NAME);

        GetSecretValueResult getSecretValueResult = client.getSecretValue(getSecretValueRequest);
        return getSecretValueResult.getSecretString();
    }

    private DatabaseConfig parseSecretString(String secretString) throws IOException {
        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode jsonNode = objectMapper.readTree(secretString);

        return new DatabaseConfig(
                jsonNode.get("host").asText(),
                jsonNode.get("port").asText(),
                jsonNode.get("dbname").asText(),
                jsonNode.get("username").asText(),
                jsonNode.get("password").asText()
        );
    }
}