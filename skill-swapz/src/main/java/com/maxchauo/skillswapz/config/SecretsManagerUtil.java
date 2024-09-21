package com.maxchauo.skillswapz.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueResponse;

import java.io.IOException;

@Component
public class SecretsManagerUtil {

    private static final String SECRET_NAME = "ss-rds-secret";
    private static final Region REGION = Region.AP_NORTHEAST_1;

    public DatabaseConfig getDatabaseConfig() {
        try {
            String secretString = getSecret();
            System.out.println("Secret string retrieved: " + secretString);
            if (secretString == null || secretString.isEmpty()) {
                throw new RuntimeException("Retrieved secret string is null or empty");
            }
            return parseSecretString(secretString);
        } catch (Exception e) {
            System.err.println("Error retrieving database configuration: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error retrieving database configuration", e);
        }
    }

    private String getSecret() {
        try (SecretsManagerClient client = SecretsManagerClient.builder()
                .region(REGION)
                .build()) {

            GetSecretValueRequest getSecretValueRequest = GetSecretValueRequest.builder()
                    .secretId(SECRET_NAME)
                    .build();

            GetSecretValueResponse getSecretValueResponse = client.getSecretValue(getSecretValueRequest);
            return getSecretValueResponse.secretString();
        }
    }

    private DatabaseConfig parseSecretString(String secretString) throws IOException {
        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode jsonNode = objectMapper.readTree(secretString);

        String host = getTextOrThrow(jsonNode, "host");
        String port = getTextOrThrow(jsonNode, "port");
        String dbname = getTextOrThrow(jsonNode, "dbname");
        String username = getTextOrThrow(jsonNode, "username");
        String password = getTextOrThrow(jsonNode, "password");

        return new DatabaseConfig(host, port, dbname, username, password);
    }

    private String getTextOrThrow(JsonNode node, String fieldName) {
        if (node.has(fieldName)) {
            String value = node.get(fieldName).asText();
            if (value != null && !value.isEmpty()) {
                return value;
            }
        }
        throw new RuntimeException("Missing or empty required field: " + fieldName);
    }
}